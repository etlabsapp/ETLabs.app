import * as THREE from "three";

export function buildETCurve(): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const z = (i: number) => Math.sin(i * 0.08) * 0.06;

  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3(-0.52, -0.38 + t * 0.78, z(i)));
  }
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector3(-0.52 + t * 0.32, 0.4, z(24 + i)));
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(-0.2 - t * 0.32, 0.4 - t * 0.22, z(38 + i)));
  }
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(-0.52 + t * 0.28, 0.12, z(48 + i)));
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(-0.24 - t * 0.28, 0.12 - t * 0.2, z(60 + i)));
  }
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(-0.52 + t * 0.3, -0.38, z(70 + i)));
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector3(-0.22 + t * 0.28, -0.38 + t * 0.78, z(82 + i)));
  }
  for (let i = 1; i <= 22; i++) {
    const t = i / 22;
    pts.push(new THREE.Vector3(0.18, -0.38 + t * 0.78, z(92 + i)));
  }
  for (let i = 1; i <= 18; i++) {
    const t = i / 18;
    pts.push(new THREE.Vector3(0.18 - t * 0.42, 0.4, z(114 + i)));
  }

  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
}
