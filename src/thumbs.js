import * as THREE from 'three';
import { ITEMS } from './catalog.js';

// Render each catalogue item once into a small image for the palette.
export async function renderThumbnails(size = 112, onEach) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return {};
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x403830, 1.6));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(5, 9, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab8ff, 1.0);
  rim.position.set(-6, 4, -6);
  scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const out = {};
  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();
  for (const it of ITEMS) {
    let obj;
    try {
      obj = it.kind === 'edge' ? it.build('stoneWall') : it.build();
    } catch (e) {
      console.warn('thumb failed', it.id, e);
      continue;
    }
    const holder = new THREE.Group();
    holder.add(obj);
    scene.add(holder);
    box.setFromObject(holder);
    box.getBoundingSphere(sphere);
    const dir = it.kind === 'floor' ? new THREE.Vector3(0.6, 1.5, 1).normalize() : new THREE.Vector3(0.9, 0.7, 1.25).normalize();
    const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02;
    cam.position.copy(sphere.center).addScaledVector(dir, dist);
    cam.lookAt(sphere.center);
    cam.near = dist / 20;
    cam.far = dist * 4;
    cam.updateProjectionMatrix();
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, cam);
    out[it.id] = canvas.toDataURL('image/png');
    scene.remove(holder);
    onEach?.(it.id, out[it.id]);
    await new Promise((r) => setTimeout(r, 0));
  }
  renderer.dispose();
  renderer.forceContextLoss?.();
  return out;
}
