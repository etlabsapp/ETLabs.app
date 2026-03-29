import gsap from "gsap";
import * as THREE from "three";
import { CONFIG } from "./constants";
import { buildETCurve } from "./curve";

export type RunLogoIntroParams = {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  labsRoot: HTMLElement | null;
  labsLetters: HTMLElement[];
  skipBtn: HTMLButtonElement | null;
  onFinish: (detail: { skipped: boolean; error?: boolean }) => void;
  markIntroSeen: () => void;
};

function makeReflectionEnv(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.Texture | null {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0a0a12);
  const g1 = new THREE.SphereGeometry(50, 32, 32);
  const m1 = new THREE.MeshBasicMaterial({ color: 0xff6b2c, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(g1, m1));
  const g2 = new THREE.SphereGeometry(40, 32, 32);
  const m2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    opacity: 0.15,
    transparent: true,
  });
  envScene.add(new THREE.Mesh(g2, m2));
  const rt = pmrem.fromScene(envScene, 0.04);
  scene.environment = rt.texture;
  pmrem.dispose();
  g1.dispose();
  g2.dispose();
  m2.dispose();
  m1.dispose();
  return rt.texture;
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: THREE.Material) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.dispose();
        m.dispose();
      });
    }
  });
}

type IntroState = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  mainTimeline: gsap.core.Timeline | null;
  resizeHandler: () => void;
  envMap: THREE.Texture | null;
  rafId: number | null;
  destroyed: boolean;
};

/**
 * Runs the ET ribbon + Labs sequence. Call only on the client.
 * Shows `overlay` with flex layout before sizing the WebGL canvas.
 */
export function runLogoIntro(params: RunLogoIntroParams): () => void {
  const { canvas, overlay, labsRoot, labsLetters, skipBtn, onFinish, markIntroSeen } = params;

  const state: IntroState = {
    renderer: null,
    scene: null,
    mainTimeline: null,
    resizeHandler: () => {},
    envMap: null,
    rafId: null,
    destroyed: false,
  };

  function cleanup() {
    if (state.destroyed) return;
    state.destroyed = true;

    if (state.mainTimeline) state.mainTimeline.kill();
    window.removeEventListener("resize", state.resizeHandler);
    if (state.rafId != null) cancelAnimationFrame(state.rafId);
    const r = state.renderer;
    if (r) {
      r.dispose();
      r.forceContextLoss?.();
    }
    const sc = state.scene;
    if (sc) {
      disposeObject3D(sc);
      sc.clear();
    }
    if (state.envMap?.dispose) state.envMap.dispose();

    canvas.style.display = "none";
    canvas.width = 1;
    canvas.height = 1;
    overlay.style.display = "none";
    overlay.style.pointerEvents = "none";
  }

  function finish(skipped: boolean, error?: boolean) {
    cleanup();
    markIntroSeen();
    onFinish({ skipped, error });
  }

  overlay.style.display = "flex";
  overlay.style.opacity = "1";
  overlay.setAttribute("aria-hidden", "false");
  void overlay.offsetHeight;

  const isMobile = window.innerWidth < 768;
  const maxTubeSeg = isMobile ? CONFIG.tubeMaxSegmentsMobile : CONFIG.tubeMaxSegments;
  const dprCap = isMobile ? 1.15 : Math.min(window.devicePixelRatio || 1, 2);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);
  state.scene = scene;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  camera.position.set(0, 0.05, 2.35);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: "high-performance",
  });
  state.renderer = renderer;

  renderer.setPixelRatio(dprCap);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.physicallyCorrectLights = true;

  try {
    state.envMap = makeReflectionEnv(scene, renderer);
  } catch {
    /* PMREM optional */
  }

  function setSize() {
    let w = overlay.clientWidth;
    let h = overlay.clientHeight;
    if (w < 2 || h < 2) {
      w = window.innerWidth || 1;
      h = window.innerHeight || 1;
    }
    const scale = isMobile ? 0.92 : 1;
    const bw = Math.max(2, Math.floor(w * scale));
    const bh = Math.max(2, Math.floor(h * scale));
    renderer.setSize(bw, bh, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize();
  state.resizeHandler = () => {
    if (!state.destroyed) setSize();
  };
  window.addEventListener("resize", state.resizeHandler);

  scene.add(new THREE.AmbientLight(0x404060, 0.35));
  const key = new THREE.DirectionalLight(0xfff0e6, 1.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6b2c, 0.85);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const fill = new THREE.PointLight(0xaabbff, 0.4, 10);
  fill.position.set(0, -1, 2);
  scene.add(fill);

  const curve = buildETCurve();
  const ribbonGroup = new THREE.Group();
  scene.add(ribbonGroup);

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xffdcc4,
    metalness: 0.72,
    roughness: 0.2,
    emissive: new THREE.Color(0xff3d00),
    emissiveIntensity: 0.95,
    envMapIntensity: scene.environment ? 1.2 : 0,
    side: THREE.DoubleSide,
  });
  if (scene.environment) ribbonMat.envMap = scene.environment;

  let tubeMesh: THREE.Mesh | null = null;

  function rebuildTube(seg: number) {
    const s = Math.max(8, Math.min(maxTubeSeg, Math.floor(seg)));
    if (tubeMesh) {
      ribbonGroup.remove(tubeMesh);
      tubeMesh.geometry.dispose();
    }
    const geom = new THREE.TubeGeometry(curve, s, CONFIG.tubeRadius, CONFIG.tubeRadialSegments, false);
    tubeMesh = new THREE.Mesh(geom, ribbonMat);
    ribbonGroup.add(tubeMesh);
  }
  rebuildTube(8);

  const planeGeom = new THREE.PlaneGeometry(6, 4);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0x0a1628,
    transparent: true,
    opacity: 0.85,
  });
  const bgPlane = new THREE.Mesh(planeGeom, planeMat);
  bgPlane.position.z = -0.8;
  scene.add(bgPlane);

  camera.position.set(0, 0.02, 1.45);
  ribbonGroup.scale.setScalar(0.92);

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      if (state.destroyed) return;
      gsap.to(overlay, {
        opacity: 0,
        duration: CONFIG.settleFade,
        ease: "power2.inOut",
        onComplete: () => finish(false),
      });
    },
  });
  state.mainTimeline = tl;

  const tubeState = { seg: 8 };
  tl.to(
    tubeState,
    {
      seg: maxTubeSeg,
      duration: CONFIG.etRibbonDuration,
      ease: "power1.inOut",
      onUpdate: () => rebuildTube(tubeState.seg),
    },
    0
  )
    .to(
      ribbonGroup.rotation,
      { z: 0.08, y: 0.12, duration: CONFIG.etRibbonDuration * 0.6, ease: "power2.out" },
      0
    )
    .to(
      ribbonGroup.rotation,
      { z: 0, y: 0, duration: CONFIG.etRibbonDuration * 0.45, ease: "power2.inOut" },
      CONFIG.etRibbonDuration * 0.45
    );

  const labsStart = CONFIG.etRibbonDuration + 0.05;
  if (labsLetters.length && labsRoot) {
    gsap.set(labsLetters, { opacity: 0, y: 28, scale: 0.6 });
    tl.to(
      labsLetters,
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: CONFIG.labsDuration,
        stagger: CONFIG.labsStagger,
        ease: "back.out(1.35)",
        onStart: () => {
          labsRoot.style.visibility = "visible";
          labsRoot.classList.add("logo-intro-labs--glow");
        },
      },
      labsStart
    );
  }

  const zoomT = labsStart + CONFIG.labsDuration + CONFIG.labsStagger * 4 + 0.15;
  tl.to(
    camera.position,
    { z: 3.5, y: 0.12, duration: CONFIG.zoomOutDuration, ease: "power3.inOut" },
    zoomT
  )
    .to(
      ribbonGroup.scale,
      { x: 0.72, y: 0.72, z: 0.72, duration: CONFIG.zoomOutDuration, ease: "power3.inOut" },
      zoomT
    )
    .to(
      ribbonGroup.position,
      { x: -0.15, y: 0.35, duration: CONFIG.zoomOutDuration, ease: "power3.inOut" },
      zoomT
    );

  tl.to({}, { duration: 0.35 }, zoomT + CONFIG.zoomOutDuration);

  const clock = new THREE.Clock();
  function tick() {
    if (state.destroyed) return;
    state.rafId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const base = 0.95;
    ribbonMat.emissiveIntensity =
      base + Math.sin(t * 3.2) * 0.2 + Math.sin(t * 5.1) * 0.1 + Math.sin(t * 1.7) * 0.06;
    renderer.render(scene, camera);
  }
  tick();

  function onSkip() {
    if (state.destroyed) return;
    tl.kill();
    gsap.killTweensOf(overlay);
    if (labsLetters.length) gsap.killTweensOf(labsLetters);
    gsap.to(overlay, {
      opacity: 0,
      duration: CONFIG.skipFade,
      onComplete: () => finish(true),
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", onSkip);
    skipBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSkip();
      }
    });
  }

  requestAnimationFrame(() => {
    if (!state.destroyed) setSize();
  });

  return () => {
    if (!state.destroyed) {
      tl.kill();
      gsap.killTweensOf(overlay);
      if (labsLetters.length) gsap.killTweensOf(labsLetters);
      finish(true);
    }
  };
}
