import * as THREE from 'three';

// GPU savings that leave every picture exactly as it was.
// Imported before anything builds a material, so every shader is compiled with these chunks.

// 1. Point lights: three.js shades every pixel with every point light in the pool, even where a
//    light's range ends long before the pixel. Beyond its range a light's colour is exactly zero, so
//    its shadow lookup and its full specular/diffuse BRDF add nothing. Skipping them with a branch
//    gives the same result; neighbouring pixels share the same lights, so the GPU skips whole blocks.
const chunk = THREE.ShaderChunk.lights_fragment_begin;
const from = /getPointLightInfo\( pointLight, geometryPosition, directLight \);([\s\S]*?)RE_Direct\( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight \);/;
const m = chunk.match(from);
if (m) {
  const shadow = m[1].replace('( directLight.visible && receiveShadow ) ?', 'receiveShadow ?');
  THREE.ShaderChunk.lights_fragment_begin = chunk.replace(from,
    'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tif ( directLight.visible ) {' +
    shadow +
    'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n\t\t}');
} else {
  console.warn('perf: point light chunk not patched (three.js changed)');
}

// Draw order hints. Opaque objects with a higher renderOrder draw later, so the depth test can
// reject their hidden pixels before they are shaded.
export const ORDER = {
  ground: 1, // terrain, water and lava planes: large, mostly covered by the dungeon and plants
  sky: 3, //    the sky shader (scattering and clouds) only where nothing else covers the screen
};

// Layer for meshes that only cast the sun's shadow and are never drawn by a camera.
export const SHADOW_ONLY_LAYER = 2;

// On 120, 144 or 240 Hz displays the browser asks for a frame that many times a second. Drawing
// every second (or fourth) one keeps 60 to 80 evenly paced frames a second for half the GPU work.
// Displays up to 100 Hz draw every frame as before.
export class FrameGate {
  constructor() { this.interval = 16.7; this.last = 0; this.n = 0; }
  // true when this animation frame should be drawn
  pass(t) {
    const d = t - this.last;
    this.last = t;
    if (d > 2 && d < 50) this.interval = this.interval * 0.95 + d * 0.05; // smoothed display interval
    const every = this.interval < 9.5 ? Math.max(1, Math.floor(16.9 / this.interval)) : 1;
    return ++this.n % every === 0;
  }
}
