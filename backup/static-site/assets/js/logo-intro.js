/**
 * ET Labs — cinematic logo intro (Three.js r134 + GSAP 3.12.5)
 *
 * - index.html only: checks pathname, sessionStorage `etlabs_logo_intro_v1` (once per session).
 * - Replay without devtools: open `index.html?replayIntro=1` (or `logoIntro=1`) — clears session flag; URL is cleaned via replaceState.
 * - `html.intro-pending` (set in <head> before paint) hides main site; removed on complete + `intro-complete` for fade-in.
 * Dispatches `logo-intro-complete` when the main site should be fully interactive.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'etlabs_logo_intro_v1';

  /** @type {boolean} */
  let destroyed = false;
  let THREE;
  let gsap;

  /** True for site root / index.html (adjust if you host under a subpath). */
  function isHomeIndexPage() {
    const path = (location.pathname || '').replace(/\/$/, '') || '/';
    return path === '/' || path === '/index.html' || /\/index\.html$/i.test(location.pathname);
  }

  /** Fade main site in (remove intro gate). */
  function releaseMainSiteChrome() {
    const html = document.documentElement;
    html.classList.remove('intro-pending');
    html.classList.add('intro-complete');
  }

  /** Remember intro for this tab session (complete or skip). */
  function markIntroSeen() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      /* private mode */
    }
  }

  function releaseMainSiteAndMarkSeen() {
    releaseMainSiteChrome();
    markIntroSeen();
  }

  function hideIntroOverlay() {
    const overlay = document.getElementById('logo-intro-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    }
    const canvas = document.getElementById('logo-canvas');
    if (canvas) canvas.style.display = 'none';
  }

  /** Remove ?replayIntro=1 / ?logoIntro=1 from the address bar (keeps other query params). */
  function stripReplayIntroQueryFromUrl() {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('replayIntro') !== '1' && u.searchParams.get('logoIntro') !== '1') return;
      u.searchParams.delete('replayIntro');
      u.searchParams.delete('logoIntro');
      const qs = u.searchParams.toString();
      const next = u.pathname + (qs ? '?' + qs : '') + u.hash;
      history.replaceState(null, '', next);
    } catch (e) {
      /* ignore */
    }
  }

  const CONFIG = {
    totalDuration: 5.2,
    etRibbonDuration: 2.2,
    labsStagger: 0.08,
    labsDuration: 0.45,
    zoomOutDuration: 1.1,
    settleFade: 0.55,
    tubeRadius: 0.068,
    tubeRadialSegments: 10,
    tubeMaxSegments: 180,
    tubeMaxSegmentsMobile: 96,
    skipFade: 0.25,
    /** Digital countdown: seconds between 03 → 00 ticks (broadcast-style beats). */
    countdownStep: 0.38,
  };

  /**
   * Build a single continuous 3D path that reads as stylized “ET”
   * (left vertical E with bars + T stem and crossbar). Slight Z wobble for depth.
   */
  function buildETCurve(THREE) {
    const pts = [];
    const z = (i) => Math.sin(i * 0.08) * 0.06;

    // E: up left edge
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector3(-0.52, -0.38 + t * 0.78, z(i)));
    }
    // E: top bar
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector3(-0.52 + t * 0.32, 0.4, z(24 + i)));
    }
    // E: back to mid
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(-0.2 - t * 0.32, 0.4 - t * 0.22, z(38 + i)));
    }
    // E: middle bar out
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(-0.52 + t * 0.28, 0.12, z(48 + i)));
    }
    // E: back in toward stem
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(-0.24 - t * 0.28, 0.12 - t * 0.2, z(60 + i)));
    }
    // E: bottom bar
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector3(-0.52 + t * 0.3, -0.38, z(70 + i)));
    }
    // Bridge to T
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(-0.22 + t * 0.28, -0.38 + t * 0.78, z(82 + i)));
    }
    // T: vertical stem (up)
    for (let i = 1; i <= 22; i++) {
      const t = i / 22;
      pts.push(new THREE.Vector3(0.18, -0.38 + t * 0.78, z(92 + i)));
    }
    // T: crossbar
    for (let i = 1; i <= 18; i++) {
      const t = i / 18;
      pts.push(new THREE.Vector3(0.18 - t * 0.42, 0.4, z(114 + i)));
    }

    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
  }

  /**
   * Cheap procedural environment for reflections (no external HDR).
   */
  function makeReflectionEnv(THREE, scene, renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0a0a12);
    const g1 = new THREE.SphereGeometry(50, 32, 32);
    const m1 = new THREE.MeshBasicMaterial({ color: 0xff6b2c, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(g1, m1));
    const g2 = new THREE.SphereGeometry(40, 32, 32);
    const m2 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, opacity: 0.15, transparent: true });
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

  /**
   * Hard-cut broadcast beats: split panels + digital ticks + white flashes (runs in parallel with WebGL ribbon).
   */
  function attachBroadcastBeats(tl, ctx) {
    const { digitsEl, countRoot, flash, leftPanel, rightPanel } = ctx;
    if (!digitsEl || !countRoot || !flash || !leftPanel || !rightPanel) return;

    const step = CONFIG.countdownStep;
    const seq = [
      { label: '03', leanLeft: true, flash: 0.12 },
      { label: '02', leanLeft: false, flash: 0.16 },
      { label: '01', leanLeft: true, flash: 0.18 },
      { label: '00', leanLeft: false, flash: 0.42, holdFlash: true },
    ];

    tl.set(countRoot, { visibility: 'visible', opacity: 1 }, 0);
    tl.set(flash, { opacity: 0 }, 0);
    tl.set([leftPanel, rightPanel], { opacity: 0 }, 0);

    seq.forEach((beat, i) => {
      const t = i * step;
      tl.call(
        () => {
          digitsEl.textContent = beat.label;
        },
        [],
        t
      );
      tl.fromTo(
        digitsEl,
        { scale: 1.4, opacity: 0.2 },
        { scale: 1, opacity: 1, duration: 0.085, ease: 'power4.out' },
        t
      );
      const L = beat.leanLeft;
      tl.fromTo(
        leftPanel,
        { opacity: 0, xPercent: L ? -14 : 0 },
        { opacity: L ? 0.72 : 0.14, xPercent: 0, duration: 0.05, ease: 'none' },
        t
      );
      tl.fromTo(
        rightPanel,
        { opacity: 0, xPercent: L ? 0 : 14 },
        { opacity: L ? 0.14 : 0.68, xPercent: 0, duration: 0.05, ease: 'none' },
        t
      );
      tl.to([leftPanel, rightPanel], { opacity: 0, duration: 0.22, ease: 'power1.in' }, t + 0.07);
      tl.fromTo(flash, { opacity: 0 }, { opacity: beat.flash, duration: 0.028, ease: 'none' }, t);
      tl.to(flash, { opacity: 0, duration: 0.14, ease: 'power2.in' }, t + 0.03);
      if (beat.holdFlash) {
        tl.to(flash, { opacity: 0.62, duration: 0.045, ease: 'none' }, t + 0.06);
        tl.to(flash, { opacity: 0, duration: 0.28, ease: 'power3.inOut' }, t + 0.11);
      }
    });

    const hideT = seq.length * step + 0.1;
    tl.to(countRoot, { autoAlpha: 0, duration: 0.055, ease: 'none' }, hideT);
  }

  function disposeObject3D(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  function cleanup(state) {
    if (destroyed) return;
    destroyed = true;

    const { renderer, scene, mainTimeline, resizeHandler, overlay, envMap, rafId } = state;
    if (mainTimeline) mainTimeline.kill();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (rafId != null) cancelAnimationFrame(rafId);
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
    if (scene) {
      disposeObject3D(scene);
      scene.clear();
    }
    if (envMap && envMap.dispose) envMap.dispose();

    const canvas = document.getElementById('logo-canvas');
    if (canvas) {
      canvas.style.display = 'none';
      canvas.width = 1;
      canvas.height = 1;
    }
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }
  }

  function finish(state, skipped) {
    cleanup(state);
    releaseMainSiteAndMarkSeen();
    window.dispatchEvent(
      new CustomEvent('logo-intro-complete', {
        detail: { skipped: !!skipped },
      })
    );
  }

  /**
   * Decide whether to run WebGL intro; otherwise tear down pending state and optional overlay.
   */
  function bootstrapLogoIntro() {
    if (!isHomeIndexPage()) {
      hideIntroOverlay();
      document.documentElement.classList.remove('intro-pending');
      return;
    }

    stripReplayIntroQueryFromUrl();

    const overlay = document.getElementById('logo-intro-overlay');
    if (!overlay) {
      document.documentElement.classList.remove('intro-pending');
      return;
    }

    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        document.documentElement.classList.remove('intro-pending');
        hideIntroOverlay();
        return;
      }
    } catch (e) {
      document.documentElement.classList.remove('intro-pending');
      hideIntroOverlay();
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      releaseMainSiteChrome();
      markIntroSeen();
      hideIntroOverlay();
      return;
    }

    runIntro();
  }

  function runIntro() {
    THREE = window.THREE;
    gsap = window.gsap;

    if (!THREE || !gsap) {
      console.error('[logo-intro] Load Three.js r134 and GSAP 3.12.5 before logo-intro.js');
      releaseMainSiteChrome();
      hideIntroOverlay();
      window.dispatchEvent(new CustomEvent('logo-intro-complete', { detail: { skipped: true, error: true } }));
      return;
    }

    const overlay = document.getElementById('logo-intro-overlay');
    const canvas = document.getElementById('logo-canvas');
    const skipBtn = document.getElementById('logo-intro-skip');
    const labsRoot = document.getElementById('logo-intro-labs');
    const labsLetters = labsRoot ? Array.from(labsRoot.querySelectorAll('.logo-intro-labs-char')) : [];
    const digitsEl = document.getElementById('logo-intro-countdown-digits');
    const countRoot = document.getElementById('logo-intro-countdown');
    const flashEl = overlay.querySelector('.logo-intro-hardflash');
    const leftPanel = overlay.querySelector('.logo-intro-split-panel--left');
    const rightPanel = overlay.querySelector('.logo-intro-split-panel--right');

    if (!overlay || !canvas) {
      console.warn('[logo-intro] Missing overlay or canvas — aborting.');
      releaseMainSiteChrome();
      markIntroSeen();
      hideIntroOverlay();
      window.dispatchEvent(new CustomEvent('logo-intro-complete', { detail: { skipped: true } }));
      return;
    }

    /* Overlay is `display:none` in CSS until here — otherwise clientWidth/Height stay 0 and WebGL draws nothing. */
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.setAttribute('aria-hidden', 'false');
    const broadcastRoot = document.getElementById('logo-intro-broadcast');
    if (broadcastRoot) broadcastRoot.setAttribute('aria-hidden', 'false');
    void overlay.offsetHeight;

    const isMobile = window.innerWidth < 768;
    const maxTubeSeg = isMobile ? CONFIG.tubeMaxSegmentsMobile : CONFIG.tubeMaxSegments;
    const dprCap = isMobile ? 1.15 : Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030308);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.position.set(0, 0.05, 2.35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(dprCap);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.physicallyCorrectLights = true;

    let envMap;
    try {
      envMap = makeReflectionEnv(THREE, scene, renderer);
    } catch (e) {
      console.warn('[logo-intro] PMREM fallback', e);
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
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    setSize();
    const resizeHandler = () => {
      if (!destroyed) setSize();
    };
    window.addEventListener('resize', resizeHandler);

    // Lights: cool fill + warm rim for orange/white glow
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

    const curve = buildETCurve(THREE);
    const ribbonGroup = new THREE.Group();
    scene.add(ribbonGroup);

    // Glowing metallic ribbon (standard material — reliable on all WebGL; transmission/glass often reads invisible).
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

    let tubeMesh = null;

    function rebuildTube(seg) {
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

    // Scan-line / digital feel: subtle moving plane behind ribbon
    const planeGeom = new THREE.PlaneGeometry(6, 4);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.85,
    });
    const bgPlane = new THREE.Mesh(planeGeom, planeMat);
    bgPlane.position.z = -0.8;
    scene.add(bgPlane);

    const state = {
      renderer,
      scene,
      camera,
      ribbonGroup,
      ribbonMat,
      curve,
      overlay,
      canvas,
      mainTimeline: null,
      resizeHandler,
      envMap: envMap || null,
      bgPlane,
      planeGeom,
      planeMat,
      rafId: null,
    };

    // Initial camera punch-in (24-style urgency)
    camera.position.set(0, 0.02, 1.45);
    ribbonGroup.scale.setScalar(0.92);

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        if (destroyed) return;
        gsap.to(overlay, {
          opacity: 0,
          duration: CONFIG.settleFade,
          ease: 'power2.inOut',
          onComplete: () => finish(state, false),
        });
      },
    });
    state.mainTimeline = tl;

    attachBroadcastBeats(tl, {
      digitsEl,
      countRoot,
      flash: flashEl,
      leftPanel,
      rightPanel,
    });

    // Phase A — grow tube segments + slight twist of group (liquid flow)
    const tubeState = { seg: 8 };
    tl.to(
      tubeState,
      {
        seg: maxTubeSeg,
        duration: CONFIG.etRibbonDuration,
        ease: 'power1.inOut',
        onUpdate: () => rebuildTube(tubeState.seg),
      },
      0
    )
      .to(
        ribbonGroup.rotation,
        { z: 0.08, y: 0.12, duration: CONFIG.etRibbonDuration * 0.6, ease: 'power2.out' },
        0
      )
      .to(
        ribbonGroup.rotation,
        { z: 0, y: 0, duration: CONFIG.etRibbonDuration * 0.45, ease: 'power2.inOut' },
        CONFIG.etRibbonDuration * 0.45
      );

    // Phase B — “Labs” assembly (DOM)
    const labsStart = CONFIG.etRibbonDuration + 0.05;
    if (labsLetters.length) {
      gsap.set(labsLetters, { opacity: 0, y: 28, scale: 0.6 });
      tl.to(
        labsLetters,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: CONFIG.labsDuration,
          stagger: CONFIG.labsStagger,
          ease: 'back.out(1.35)',
          onStart: () => {
            labsRoot.style.visibility = 'visible';
            labsRoot.classList.add('logo-intro-labs--glow');
          },
        },
        labsStart
      );
    }

    // Phase C — zoom out + settle (like pulling back to header)
    const zoomT = labsStart + CONFIG.labsDuration + CONFIG.labsStagger * 4 + 0.15;
    tl.to(
      camera.position,
      { z: 3.5, y: 0.12, duration: CONFIG.zoomOutDuration, ease: 'power3.inOut' },
      zoomT
    )
      .to(
        ribbonGroup.scale,
        { x: 0.72, y: 0.72, z: 0.72, duration: CONFIG.zoomOutDuration, ease: 'power3.inOut' },
        zoomT
      )
      .to(
        ribbonGroup.position,
        { x: -0.15, y: 0.35, duration: CONFIG.zoomOutDuration, ease: 'power3.inOut' },
        zoomT
      );

    // Phase D — brief hold (tension) then timeline onComplete fades overlay
    tl.to({}, { duration: 0.35 }, zoomT + CONFIG.zoomOutDuration);

    // Render loop
    const clock = new THREE.Clock();
    function tick() {
      if (destroyed) return;
      state.rafId = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      // Subtle iridescent-ish shimmer via emissive pulse (r134 has no built-in iridescence on MeshPhysicalMaterial)
      const base = 0.95;
      ribbonMat.emissiveIntensity =
        base + Math.sin(t * 3.2) * 0.2 + Math.sin(t * 5.1) * 0.1 + Math.sin(t * 1.7) * 0.06;
      renderer.render(scene, camera);
    }
    tick();

    function onSkip() {
      if (destroyed) return;
      tl.kill();
      gsap.killTweensOf(overlay);
      if (labsLetters.length) gsap.killTweensOf(labsLetters);
      const broadcastEls = [flashEl, leftPanel, rightPanel, countRoot, digitsEl].filter(Boolean);
      if (broadcastEls.length) gsap.killTweensOf(broadcastEls);
      if (countRoot) {
        countRoot.style.visibility = 'hidden';
        countRoot.style.opacity = '0';
      }
      if (flashEl) flashEl.style.opacity = '0';
      if (leftPanel) {
        leftPanel.style.opacity = '0';
        gsap.set(leftPanel, { clearProps: 'transform' });
      }
      if (rightPanel) {
        rightPanel.style.opacity = '0';
        gsap.set(rightPanel, { clearProps: 'transform' });
      }
      if (digitsEl) gsap.set(digitsEl, { clearProps: 'transform,opacity' });
      gsap.to(overlay, {
        opacity: 0,
        duration: CONFIG.skipFade,
        onComplete: () => finish(state, true),
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', onSkip);
      skipBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSkip();
        }
      });
    }

    requestAnimationFrame(() => {
      if (!destroyed) setSize();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapLogoIntro);
  } else {
    bootstrapLogoIntro();
  }
})();

/*
  --- HTML + CDN: see index.html comment block or README ---
*/
