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
  constructor() { this.interval = 16.7; this.fast = Infinity; this.last = 0; this.n = 0; }
  // true when this animation frame should be drawn
  pass(t) {
    const d = t - this.last;
    this.last = t;
    if (d > 2 && d < 50) this.interval = this.interval * 0.95 + d * 0.05; // smoothed display interval
    // The shortest gap seen is the display's own interval, even while slow frames stretch the
    // average. It creeps up very slowly, so a move to a slower monitor is noticed in time.
    if (d > 3.5) this.fast = Math.min(d, this.fast * 1.0002);
    const every = this.interval < 9.5 ? Math.max(1, Math.floor(16.9 / this.interval)) : 1;
    return ++this.n % every === 0;
  }
  // how long one drawn frame should take (ms) when the GPU keeps up: 60 to 100 frames a second
  get target() {
    if (!isFinite(this.fast)) return 16.7;
    return Math.min(20, this.fast * Math.max(1, Math.floor(16.9 / this.fast)));
  }
}

// Automatic resolution. Most of a frame's GPU cost here is per pixel (many lights, shadows), so
// drawing fewer pixels is the one saving that needs no shader rebuild and can change while playing.
// tick() is fed the time between drawn frames. Two slow seconds in a row step the resolution down;
// a calm stretch tries one step back up, and waits twice as long next time if that step was too much.
export class AutoScale {
  constructor(steps = [1, 0.85, 0.72, 0.6, 0.5]) {
    this.steps = steps;
    this.level = 0;
    this.reset();
  }
  // forget what was learned (new map, walk mode on or off, graphics setting changed)
  reset() {
    this.t = 0; this.n = 0; this.slow = 0;
    this.bad = 0; this.calm = 0; this.stuck = 0;
    this.sinceUp = Infinity; this.upWait = 6;
    this.avg = 0; this.avgAtFull = 0;
    this.paused = false;
  }
  get scale() { return this.steps[this.level]; }
  // returns -1 or 1 when the level changed, else 0
  tick(dt, target) {
    if (this.paused || dt > 250) return 0; // a gap that long is a hidden tab, not a slow frame
    this.t += dt; this.n++;
    if (dt > target * 1.4) this.slow++;
    if (this.t < 1000) return 0;
    const share = this.slow / this.n, secs = this.t / 1000;
    this.avg = this.t / this.n;
    this.t = 0; this.n = 0; this.slow = 0;
    this.sinceUp += secs;
    if (share >= 0.5) {
      this.calm = 0;
      if (++this.bad < 2) return 0; // one slow second is often an edit or a shader compile
      if (this.level === 0) this.avgAtFull = this.avg;
      if (this.sinceUp < 5) this.upWait = Math.min(120, this.upWait * 2);
      this.sinceUp = Infinity;
      if (this.level < this.steps.length - 1) { this.level++; this.bad = 0; this.stuck = 0; return -1; }
      this.stuck += secs;
      return 0;
    }
    this.bad = 0; this.stuck = 0;
    if (share > 0.05) { this.calm = 0; return 0; }
    this.calm += secs;
    if (this.level > 0 && this.calm >= this.upWait) { this.level--; this.calm = 0; this.sinceUp = 0; return 1; }
    return 0;
  }
  // at the lowest step and still slow: did the lower resolution gain anything?
  get gainedNothing() { return this.avgAtFull > 0 && this.avg > this.avgAtFull * 0.85; }
}
