import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GRID_W, GRID_D, CELL, hash2, mulberry } from './config.js';
import { tex } from './textures.js';
import { cutHoles } from './heightmask.js';
import { mat } from './materials.js';
import { splitPrototype, InstancedSet, G, add, BX, CY, SP, LA, TO, CO } from './geom.js';
import * as M from './models.js';
import { ORDER, SHADOW_ONLY_LAYER } from './perf.js';

const HX = (GRID_W * CELL) / 2, HZ = (GRID_D * CELL) / 2;
const TERRAIN = 2600, SEG = 260;
// the gaming table under a tabletop map (feet at model scale)
const TABLE_W = 380, TABLE_D = 290, TABLE_H = 260;

// ---------- world-space value noise ----------
const sm = (t) => t * t * (3 - 2 * t);
function noise2(x, z, s = 0) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = sm(x - ix), fz = sm(z - iz);
  const a = hash2(ix, iz, s), b = hash2(ix + 1, iz, s), c = hash2(ix, iz + 1, s), d = hash2(ix + 1, iz + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm2(x, z, oct = 4, s = 0) {
  let v = 0, a = 0.5, t = 0;
  for (let o = 0; o < oct; o++) { v += noise2(x, z, s + o * 7) * a; t += a; a *= 0.5; x *= 2.03; z *= 2.03; }
  return v / t;
}
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = (h) => new THREE.Color(h);

// ---------- landscape definitions ----------
export const LANDSCAPES = {
  meadow: {
    name: 'Verdant meadow', pal: [0x5c8a33, 0x7c9c3e, 0x9a8a50, 0x8a8580], amp: 9, hills: 60, clouds: 0.35,
    fog: 0xc8d8e4, fogNear: 260, fogFar: 1300, particles: 'pollen', hemiGround: 0x4a5a2a,
    scatter: [
      { b: (k) => M.oak(k + 1), n: 260, var: 4, s: [0.8, 1.4] },
      { b: (k) => M.oak(k + 7, 'autumnLeaf'), n: 40, var: 2, s: [0.8, 1.2] },
      { b: (k) => M.bush(k + 1), n: 260, var: 3, s: [0.7, 1.5] },
      { b: (k) => M.boulder(k + 2, 'mossRock'), n: 90, var: 3, s: [0.6, 2.2] },
      { b: (k) => M.flowers(k + 3), n: 500, var: 3, s: [0.8, 1.4], near: true },
      { b: (k) => M.grassTuft(k + 1, 'leaf'), n: 1600, var: 3, s: [0.8, 1.6], near: true },
    ],
  },
  forest: {
    name: 'Dark forest', pal: [0x34502a, 0x44562a, 0x5a4630, 0x6a6a60], amp: 14, hills: 70, clouds: 0.55,
    fog: 0x7a8a7a, fogNear: 80, fogFar: 650, particles: 'fireflies', hemiGround: 0x2a3420,
    scatter: [
      { b: (k) => M.pine(k + 1, 'darkLeaf', 18 + k * 4), n: 1500, var: 4, s: [0.8, 1.6] },
      { b: (k) => M.oak(k + 11, 'darkLeaf'), n: 260, var: 3, s: [0.9, 1.5] },
      { b: (k) => M.deadTree(k + 3), n: 60, var: 2, s: [0.8, 1.3] },
      { b: (k) => M.bush(k + 4, 'darkLeaf'), n: 400, var: 3, s: [0.7, 1.4] },
      { b: (k) => M.redMushrooms(), n: 140, var: 1, s: [0.8, 1.6], near: true },
      { b: (k) => M.boulder(k + 9, 'mossRock'), n: 120, var: 3, s: [0.6, 2] },
      { b: (k) => M.grassTuft(k + 4, 'darkLeaf'), n: 900, var: 2, s: [0.8, 1.4], near: true },
    ],
  },
  desert: {
    name: 'Desert dunes', pal: [0xd6b273, 0xe6c88e, 0xc09460, 0xb07c58], amp: 22, hills: 90, dunes: true, clouds: 0.08,
    fog: 0xe8d4b0, fogNear: 300, fogFar: 1600, particles: 'dust', hemiGround: 0x9a7a50,
    scatter: [
      { b: (k) => M.cactus(k + 1), n: 160, var: 4, s: [0.7, 1.3] },
      { b: (k) => M.palm(k + 1), n: 50, var: 3, s: [0.9, 1.3], low: true },
      { b: (k) => M.boulder(k + 3, 'sandstone'), n: 140, var: 4, s: [0.8, 3.5] },
      { b: (k) => M.rocks(k + 3, 'sandstone'), n: 200, var: 2, s: [1, 1.8], near: true },
      { b: (k) => M.deadTree(k + 8), n: 25, var: 2, s: [0.6, 0.9] },
    ],
  },
  tundra: {
    name: 'Frozen tundra', pal: [0xe6edf5, 0xd4dee9, 0xa8b6c4, 0x6e7884], amp: 12, hills: 70, clouds: 0.7,
    fog: 0xd4dde8, fogNear: 120, fogFar: 900, particles: 'snow', hemiGround: 0xb8c4d0,
    scatter: [
      { b: (k) => M.pine(k + 2, 'snowLeaf', 16 + k * 3), n: 420, var: 3, s: [0.7, 1.4] },
      { b: (k) => M.pine(k + 5, 'darkLeaf', 14 + k * 3), n: 160, var: 2, s: [0.7, 1.2] },
      { b: (k) => M.boulder(k + 4, 'iceRock'), n: 160, var: 3, s: [0.7, 2.6] },
      { b: (k) => M.deadTree(k + 2), n: 60, var: 2, s: [0.7, 1.2] },
    ],
  },
  volcanic: {
    name: 'Volcanic wastes', pal: [0x2c2626, 0x3c3230, 0x5a2a1a, 0x1c1818], amp: 18, hills: 80, lava: true, clouds: 0.75,
    fog: 0x5a3028, fogNear: 120, fogFar: 900, particles: 'embers', hemiGround: 0x3a1a10,
    scatter: [
      { b: (k) => M.deadTree(k + 5), n: 160, var: 3, s: [0.7, 1.3] },
      { b: (k) => M.boulder(k + 6, 'basaltRock'), n: 320, var: 4, s: [0.8, 3.5] },
      { b: (k) => M.rocks(k + 7, 'basaltRock'), n: 300, var: 2, s: [1, 2], near: true },
      { b: (k) => M.crystalCluster('ruby'), n: 30, var: 1, s: [0.8, 1.4] },
    ],
  },
  swamp: {
    name: 'Haunted swamp', pal: [0x4a5232, 0x5a6238, 0x3a3a26, 0x5a5a48], amp: 5, hills: 40, water: -0.55, clouds: 0.65,
    fog: 0x8a9a7a, fogNear: 50, fogFar: 520, particles: 'fireflies', hemiGround: 0x3a4028,
    scatter: [
      { b: (k) => M.deadTree(k + 1), n: 360, var: 4, s: [0.8, 1.6] },
      { b: (k) => M.oak(k + 21, 'darkLeaf'), n: 70, var: 2, s: [0.8, 1.2] },
      { b: (k) => M.reeds(k + 1), n: 700, var: 3, s: [0.8, 1.4], shore: true, near: true },
      { b: (k) => M.glowShrooms(), n: 60, var: 1, s: [0.6, 1.2], near: true },
      { b: (k) => M.boulder(k + 13, 'mossRock'), n: 60, var: 2, s: [0.5, 1.5] },
    ],
  },
  highlands: {
    name: 'Mountain highlands', pal: [0x6c7f40, 0x8a8a58, 0x7a5c6c, 0x8a8a88], amp: 55, hills: 140, snowline: 95, clouds: 0.45,
    fog: 0xb8c8d8, fogNear: 300, fogFar: 1700, particles: null, hemiGround: 0x5a5a40,
    scatter: [
      { b: (k) => M.pine(k + 3, 'darkLeaf', 16 + k * 3), n: 380, var: 3, s: [0.7, 1.3] },
      { b: (k) => M.boulder(k + 15, 'rock'), n: 380, var: 4, s: [0.8, 4] },
      { b: (k) => M.standingStone(k), n: 14, var: 1, s: [0.9, 1.2], near: true },
      { b: (k) => M.grassTuft(k + 9, 'leaf'), n: 900, var: 2, s: [0.8, 1.4], near: true },
      { b: (k) => M.bush(k + 9, 'darkLeaf'), n: 160, var: 2, s: [0.6, 1.2] },
    ],
  },
  void: {
    name: 'Dark void', void: true, enclosed: true, flat: true, pal: [0x000000, 0x000000, 0x000000, 0x000000], amp: 0, hills: 1, clouds: 0,
    fog: 0x04050a, fogNear: 220, fogFar: 1300, particles: 'motes', hemiGround: 0x050508, scatter: [],
  },
  tabletop: {
    name: 'Tabletop', tabletop: true, enclosed: true, flat: true, pal: [0x000000, 0x000000, 0x000000, 0x000000], amp: 0, hills: 1, clouds: 0,
    fog: 0x140d08, fogNear: 700, fogFar: 3200, particles: 'roomdust', hemiGround: 0x3a2618, scatter: [],
  },
  underdark: {
    name: 'Underdark cavern', pal: [0x3a3632, 0x2e2a28, 0x403a50, 0x2a2624], amp: 10, hills: 50, cave: true, clouds: 0,
    fog: 0x231d36, fogNear: 90, fogFar: 640, particles: 'spores', hemiGround: 0x201828,
    scatter: [
      { b: () => stalagmite(1), n: 700, var: 3, s: [0.6, 2.2] },
      { b: () => M.crystalCluster('crystal'), n: 90, var: 1, s: [0.8, 2.2] },
      { b: () => M.crystalCluster('amethyst'), n: 90, var: 1, s: [0.8, 2.2] },
      { b: () => M.glowShrooms(), n: 260, var: 1, s: [0.8, 2.0], near: true },
      { b: (k) => M.boulder(k + 17, 'rock'), n: 220, var: 3, s: [0.8, 3] },
    ],
  },
};

function stalagmite() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 7), mat('rock'));
  m.position.y = 4.5;
  g.add(m);
  const m2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5, 6), mat('rock'));
  m2.position.set(1.4, 2.5, 0.5);
  g.add(m2);
  return g;
}

// ---------- time of day ----------
const SUN_COLORS = [
  [-0.1, col(0xff6a3a)], [0.0, col(0xff7a40)], [0.08, col(0xffa060)], [0.25, col(0xffd9b0)], [0.5, col(0xfff3e4)], [1, col(0xfffaf2)],
];
function lerpStops(stops, x) {
  if (x <= stops[0][0]) return stops[0][1].clone();
  for (let k = 1; k < stops.length; k++) if (x <= stops[k][0]) {
    const [a, ca] = stops[k - 1], [b, cb] = stops[k];
    return ca.clone().lerp(cb, (x - a) / (b - a));
  }
  return stops[stops.length - 1][1].clone();
}
// horizon/fog colour by sun elevation
const SKY_STOPS = [[-0.3, col(0x0a0e1a)], [-0.12, col(0x141c30)], [-0.03, col(0x4a3a50)], [0.02, col(0xd88a5a)], [0.12, col(0xe8c0a0)], [0.3, col(0xc8dcec)], [1, col(0xb8d4ec)]];

export class Environment {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.styleId = null;
    this.time = 15.5;
    this.lightLevel = 1; // overall light multiplier set by the user
    this.workLight = 0.8; // fill light while editing
    this.scatterSets = [];

    // sky
    this.sky = new Sky();
    this.sky.scale.setScalar(4800);
    this.sky.renderOrder = ORDER.sky; // shaded only where nothing else covers the screen
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 3;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    u.cloudElevation.value = 0.55;

    // env map scene
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(80);
    this.envScene.add(this.envSky);
    this.envSky.material.uniforms.showSunDisc.value = 0;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this.envDirty = true;
    this.envTimer = 0;

    // stars
    const starGeo = new THREE.BufferGeometry();
    const sp = [], ss = [];
    const rand = mulberry(99);
    for (let k = 0; k < 2600; k++) {
      const th = rand() * Math.PI * 2, ph = Math.acos(rand() * 0.95);
      sp.push(Math.sin(ph) * Math.cos(th) * 4000, Math.cos(ph) * 4000, Math.sin(ph) * Math.sin(th) * 4000);
      ss.push(rand());
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.renderOrder = -1;
    scene.add(this.stars);

    // moon
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false, transparent: true }));
    scene.add(this.moon);
    const glowTex = radialTex('rgba(200,215,255,0.55)', 'rgba(200,215,255,0)');
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.moonGlow.scale.setScalar(700);
    scene.add(this.moonGlow);

    // lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -135; sc.right = 135; sc.top = 135; sc.bottom = -135; sc.near = 10; sc.far = 1400;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.35;
    this.sun.shadow.camera.layers.enable(SHADOW_ONLY_LAYER); // plant shadow casters live there
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a5a2a, 1);
    scene.add(this.hemi);
    // soft fill so the map stays readable at night while editing (off in walk mode)
    this.work = new THREE.AmbientLight(0xa4b0cc, 0);
    scene.add(this.work);

    scene.fog = new THREE.Fog(0xc8d8e4, 200, 1300);

    // terrain
    this.detail = tex('detail').map.clone();
    this.detail.needsUpdate = true;
    this.detail.repeat.set(TERRAIN / 14, TERRAIN / 14);
    this.terrainMat = cutHoles(new THREE.MeshStandardMaterial({ map: this.detail, vertexColors: true, roughness: 0.97 }));
    this.terrain = null;
    this.water = null;
    this.dome = null;
    this.particles = null;
    this.lavaTex = null;
  }

  heightAt(x, z) {
    const L = LANDSCAPES[this.styleId];
    if (L.flat) return -0.04;
    const dx = Math.max(0, Math.abs(x) - (HX + 9)), dz = Math.max(0, Math.abs(z) - (HZ + 9));
    const d = Math.hypot(dx, dz);
    const blend = smoothstep(0, L.hills, d);
    let h = 0;
    const n = fbm2(x / 160, z / 160, 4, 3);
    if (L.dunes) {
      const warp = fbm2(x / 300, z / 300, 2, 9) * 6;
      h = (Math.sin(x / 55 + warp) * 0.5 + 0.5) * Math.pow(n, 0.8) * L.amp * 1.4 + n * L.amp * 0.5;
    } else {
      h = (n - 0.35) * L.amp * 2;
      if (L.water !== undefined) h = (fbm2(x / 70, z / 70, 3, 5) - 0.5) * L.amp * 2.2 + 0.2;
      if (L.lava) {
        const r = Math.abs(fbm2(x / 220, z / 220, 3, 21) - 0.5);
        if (r < 0.05) h -= (1 - r / 0.05) * 9;
      }
    }
    h *= blend;
    // flat building plateau sits slightly under the grid
    h += -0.04;
    // distant mountains ring
    const R = Math.hypot(x, z);
    const ring = smoothstep(420, 1100, R);
    if (ring > 0) {
      const m = fbm2(x / 260, z / 260, 5, 41);
      const ridge = 1 - Math.abs(m * 2 - 1);
      const height = L.cave ? 420 : L.id === 'desert' ? 160 : L.id === 'highlands' ? 520 : 330;
      h += ring * (ridge * 0.7 + m * 0.5) * height;
    }
    return h;
  }

  setStyle(id) {
    if (this.styleId === id) return;
    this.styleId = id;
    const L = LANDSCAPES[id];
    L.id = id;
    this.buildTerrain(L);
    this.buildScatter(L);
    this.buildExtras(L);
    this.applyTime();
    this.envDirty = true;
  }

  // how far walk mode may wander from the centre
  walkBounds() {
    const L = LANDSCAPES[this.styleId];
    if (L.void) return [HX + 4, HZ + 4];
    if (L.tabletop) return [TABLE_W / 2 - 4, TABLE_D / 2 - 4];
    return [700, 700];
  }

  buildTerrain(L) {
    if (this.terrain) { this.group.remove(this.terrain); this.terrain.geometry.dispose(); this.terrain = null; }
    if (L.flat) return; // the void has no ground; the tabletop builds its own table
    const geo = new THREE.PlaneGeometry(TERRAIN, TERRAIN, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const [cLow, cMid, cPatch, cRock] = L.pal.map(col);
    const snow = col(0xf2f5f8);
    const c = new THREE.Color();
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k);
      const h = this.heightAt(x, z);
      p.setY(k, h);
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), h = p.getY(k);
      const n1 = fbm2(x / 90, z / 90, 3, 61), n2 = fbm2(x / 25, z / 25, 2, 62);
      c.copy(cLow).lerp(cMid, smoothstep(0.3, 0.7, n1));
      c.lerp(cPatch, smoothstep(0.62, 0.8, n2) * 0.7);
      const slope = 1 - nrm.getY(k);
      c.lerp(cRock, smoothstep(0.18, 0.45, slope));
      if (L.snowline) c.lerp(snow, smoothstep(L.snowline, L.snowline + 40, h + n2 * 30));
      if (L.lava && h < -2.5) c.lerp(col(0x1a0a06), 0.8);
      if (L.water !== undefined && h < L.water + 0.6) c.lerp(col(0x2e3420), 0.6);
      if (L.cave) c.lerp(col(0x2a2624), smoothstep(80, 260, h));
      colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.terrain = new THREE.Mesh(geo, this.terrainMat);
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = false;
    this.terrain.name = 'terrain';
    this.terrain.renderOrder = ORDER.ground;
    this.group.add(this.terrain);
  }

  buildScatter(L) {
    for (const s of this.scatterSets) s.dispose();
    this.scatterSets = [];
    const rand = mulberry(1234 + Object.keys(LANDSCAPES).indexOf(L.id) * 77);
    for (const sc of L.scatter) {
      for (let v = 0; v < sc.var; v++) {
        const { parts } = splitPrototype(sc.b(v));
        const mats = [];
        const n = Math.round(sc.n / sc.var);
        let tries = 0;
        while (mats.length < n && tries < n * 12) {
          tries++;
          const maxR = sc.near ? 280 : 900;
          const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * maxR;
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          if (Math.abs(x) < HX + 14 && Math.abs(z) < HZ + 14) continue;
          const h = this.heightAt(x, z);
          if (L.water !== undefined) {
            if (sc.shore ? h < L.water - 0.4 || h > L.water + 1.2 : h < L.water + 0.1) continue;
          }
          if (L.lava && h < -1.5) continue;
          if (sc.low && h > 6) continue;
          const sl = this.slopeAt(x, z);
          if (sl > 0.5 && !L.cave) continue;
          if (L.cave && Math.hypot(x, z) > 700) continue;
          const s = sc.s[0] + rand() * (sc.s[1] - sc.s[0]);
          const m = new THREE.Matrix4().compose(
            new THREE.Vector3(x, h - 0.15, z),
            new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.08, rand() * Math.PI * 2, (rand() - 0.5) * 0.08)),
            new THREE.Vector3(s, s, s)
          );
          mats.push(m);
        }
        // Seen by the camera as one batch per part (few draw calls); the shadows come from a copy
        // cut into patches of land on a layer only the sun's shadow camera sees. The sun's shadow
        // map covers just the site, so it skips almost every patch instead of every plant on the map.
        const set = new InstancedSet(this.group, parts, { castShadow: false, receiveShadow: true });
        set.update(mats);
        this.scatterSets.push(set);
        const casters = parts.filter((pt) => pt.shadow);
        if (casters.length) for (const group of scatterPatches(mats)) {
          const sh = new InstancedSet(this.group, casters, { castShadow: true, receiveShadow: false });
          sh.update(group);
          for (const m of sh.meshes) m.layers.set(SHADOW_ONLY_LAYER);
          this.scatterSets.push(sh);
        }
      }
    }
  }

  slopeAt(x, z) {
    const e = 2;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(hx, hz) / (2 * e);
  }

  buildExtras(L) {
    for (const o of [this.water, this.dome, this.particles, this.setPiece]) if (o) this.group.remove(o);
    this.water = this.dome = this.particles = this.setPiece = null;
    this.tableFlame = null;
    if (L.void) this.setPiece = buildVoid();
    if (L.tabletop) { this.setPiece = buildTabletop(); this.tableFlame = this.setPiece.getObjectByName('candleFlame'); }
    if (this.setPiece) this.group.add(this.setPiece);
    if (L.water !== undefined) {
      this.water = new THREE.Mesh(new THREE.PlaneGeometry(TERRAIN, TERRAIN), cutHoles(mat('swampWater')));
      this.water.rotation.x = -Math.PI / 2;
      this.water.position.y = L.water;
      this.water.receiveShadow = true;
      this.group.add(this.water);
    }
    if (L.lava) {
      if (!this.lavaTex) {
        this.lavaTex = tex('lava').map.clone();
        this.lavaTex.needsUpdate = true;
        this.lavaTex.repeat.set(60, 60);
      }
      const m = cutHoles(new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: 0xff5a20, emissiveMap: this.lavaTex, emissiveIntensity: 1.6, map: this.lavaTex, roughness: 0.9 }));
      this.water = new THREE.Mesh(new THREE.PlaneGeometry(TERRAIN, TERRAIN), m);
      this.water.rotation.x = -Math.PI / 2;
      this.water.position.y = -3.2;
      this.water.renderOrder = ORDER.ground;
      this.group.add(this.water);
    }
    if (L.cave) {
      const geo = new THREE.SphereGeometry(760, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const n = fbm2(x / 80, z / 80 + y / 80, 3, 77);
        const f = 1 + (n - 0.5) * 0.25;
        p.setXYZ(k, x * f, y * 0.42 * f + 60, z * f);
      }
      geo.computeVertexNormals();
      const m = new THREE.MeshStandardMaterial({ color: 0x6a6070, map: this.detail, roughness: 1, side: THREE.BackSide, emissive: 0x120c1c });
      this.dome = new THREE.Mesh(geo, m);
      this.dome.renderOrder = ORDER.ground + 1;
      this.group.add(this.dome);
      // stalactites
      const proto = new THREE.ConeGeometry(4, 40, 6);
      proto.rotateX(Math.PI);
      proto.translate(0, -20, 0);
      const inst = new THREE.InstancedMesh(proto, mat('rock'), 160);
      const rand = mulberry(5);
      const mm = new THREE.Matrix4();
      for (let k = 0; k < 160; k++) {
        const a = rand() * Math.PI * 2, r = 160 + rand() * 480;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const yTop = Math.sqrt(Math.max(0, 760 * 760 - r * r)) * 0.42 + 50;
        const s = 0.5 + rand() * 1.5;
        mm.compose(new THREE.Vector3(x, yTop, z), new THREE.Quaternion(), new THREE.Vector3(s, s * (0.6 + rand()), s));
        inst.setMatrixAt(k, mm);
      }
      this.dome.add(inst);
    }
    this.sky.visible = !L.enclosed && !L.cave;
    this.stars.visible = !L.enclosed && !L.cave;
    this.moon.visible = this.moonGlow.visible = !L.enclosed && !L.cave;
    this.sky.material.uniforms.cloudCoverage.value = L.clouds;
    this.envSky.material.uniforms.cloudCoverage.value = L.clouds;
    this.particles = makeParticles(L.particles);
    if (this.particles) this.group.add(this.particles);
  }

  setTime(t) { this.time = t; this.applyTime(); this.envDirty = true; }
  setLightLevel(v) { this.lightLevel = v; this.applyTime(); }
  setWorkLight(v) { this.workLight = v; this.applyTime(); }

  applyTime() {
    const L = LANDSCAPES[this.styleId];
    if (!L) return;
    if (L.void || L.tabletop) { this.applyEnclosed(L); return; }
    const t = this.time;
    const phi = ((t - 5.75) / 13.25) * Math.PI; // 0 at sunrise 05:45 (east), PI at sunset 19:00 (west)
    const elev = Math.sin(phi) * 1.05; // >0 day
    const sunDir = new THREE.Vector3(Math.cos(phi), Math.max(-1, elev), 0.45 + Math.sin(phi) * 0.25).normalize();
    this.sunDir = sunDir;
    const moonPhi = phi - Math.PI;
    const moonElev = Math.sin(moonPhi);
    const moonDir = new THREE.Vector3(Math.cos(moonPhi), moonElev * 0.85, -0.35).normalize();
    const sunUp = sunDir.y;
    const day = smoothstep(-0.08, 0.2, sunUp);
    const night = 1 - smoothstep(-0.18, 0.02, sunUp);

    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(sunDir);
    this.envSky.material.uniforms.sunPosition.value.copy(sunDir);
    u.rayleigh.value = 1 + (1 - day) * 1.5;
    u.turbidity.value = L.id === 'desert' ? 5 : L.id === 'volcanic' ? 10 : 3;

    this.starMat.opacity = night * 0.95;
    this.moon.position.copy(moonDir).multiplyScalar(3900);
    this.moonGlow.position.copy(this.moon.position).multiplyScalar(0.98);
    this.moon.material.opacity = smoothstep(-0.05, 0.1, moonDir.y) * (0.35 + night * 0.65);
    this.moonGlow.material.opacity = night * smoothstep(-0.05, 0.1, moonDir.y);

    // directional light: sun by day, moon by night
    let lightDir, intensity, color;
    if (sunUp > -0.02) {
      lightDir = sunDir;
      intensity = 3.4 * smoothstep(-0.02, 0.18, sunUp);
      color = lerpStops(SUN_COLORS, sunUp);
    } else {
      lightDir = moonDir.y > 0 ? moonDir : new THREE.Vector3(0.3, 0.8, 0.2).normalize();
      intensity = 0.55 * night;
      color = col(0x8fa8ff);
    }
    if (L.cave) { intensity = 0; }
    if (L.id === 'volcanic' && sunUp > 0) color.lerp(col(0xff9a6a), 0.35);
    this.sun.color.copy(color);
    this.sun.intensity = intensity;
    this.lightDir = lightDir.clone();

    // hemisphere ambient
    const skyCol = col(0x3a4a78).lerp(col(0xa8c4f0), day);
    const groundCol = col(L.hemiGround).multiplyScalar(0.4 + day * 0.6);
    let hemiI = 0.18 + day * 0.95;
    this.work.intensity = (this.workLight || 0) * (0.18 + 0.82 * night) * (L.cave ? 0.6 : 1);
    if (L.cave) { skyCol.set(0x7a6ab0); groundCol.set(0x3a2a40); hemiI = 0.55; }
    this.hemi.color.copy(skyCol);
    this.hemi.groundColor.copy(groundCol);
    this.hemi.intensity = hemiI;

    // fog
    const horizon = lerpStops(SKY_STOPS, sunUp);
    const fogCol = horizon.clone().lerp(col(L.fog), 0.45 + 0.3 * day);
    if (night > 0.5) fogCol.lerp(col(0x0c1222), 0.6);
    if (L.cave) fogCol.set(L.fog);
    this.scene.fog.color.copy(fogCol);
    this.scene.fog.near = L.fogNear;
    this.scene.fog.far = L.fogFar * (0.75 + day * 0.25);
    this.scene.background = L.cave ? fogCol.clone() : null;
    this.renderer.toneMappingExposure = L.cave ? 1.5 : 0.95 + night * 0.45;
    this.scene.environmentIntensity = L.cave ? 0.15 : 0.12 + day * 0.4;

    if (this.particles) this.particles.userData.night = night;
    this.dayFactor = day;
    this.nightFactor = night;
    this.applyLevel();
  }

  // the user's overall light setting scales sun, sky, fill and reflections, never torches
  applyLevel() {
    const k = this.lightLevel;
    this.sun.intensity *= k;
    this.hemi.intensity *= k;
    this.work.intensity *= Math.min(1, k);
    this.scene.environmentIntensity *= k;
    // a little extra dark at 0% so the dungeon really is lit by flames alone
    if (k < 0.05) this.nightFactor = 1;
  }

  // the void and the tabletop have no sky: fixed key light, time of day only tints it
  applyEnclosed(L) {
    const phi = ((this.time - 5.75) / 13.25) * Math.PI;
    const sunUp = Math.sin(phi) * 1.05;
    const day = smoothstep(-0.08, 0.2, sunUp);
    let bg;
    if (L.void) {
      this.lightDir = new THREE.Vector3(0.45, 1, 0.3).normalize();
      this.sun.color.set(0x9aaeff);
      this.sun.intensity = 1.25;
      this.hemi.color.set(0x3a4470);
      this.hemi.groundColor.set(0x0a0a12);
      this.hemi.intensity = 0.6;
      this.work.intensity = (this.workLight || 0) * 0.55;
      bg = col(0x04050a);
      this.scene.fog.near = L.fogNear; this.scene.fog.far = L.fogFar;
      this.renderer.toneMappingExposure = 1.15;
      this.dayFactor = 0.25;
      this.nightFactor = 1;
    } else {
      // a warm lamp over the table; by day, window light mixes in from the side
      this.lightDir = new THREE.Vector3(0.3 + Math.cos(phi) * 0.35 * day, 1, 0.35).normalize();
      this.sun.color.copy(col(0xffc890).lerp(col(0xfff4e8), day));
      this.sun.intensity = 1.7 + day * 1.4;
      this.hemi.color.copy(col(0x9a7a5c).lerp(col(0xc8d0d8), day));
      this.hemi.groundColor.set(0x3a2618);
      this.hemi.intensity = 0.45 + day * 0.45;
      this.work.intensity = (this.workLight || 0) * 0.3;
      bg = col(0x120b07).lerp(col(0x30261e), day);
      this.scene.fog.near = L.fogNear; this.scene.fog.far = L.fogFar;
      this.renderer.toneMappingExposure = 1.0;
      this.dayFactor = 0.55 + day * 0.45;
      this.nightFactor = 0.7 * (1 - day);
    }
    this.scene.fog.color.copy(bg);
    this.scene.background = bg;
    this.scene.environmentIntensity = 0;
    this.starMat.opacity = 0;
    if (this.particles) this.particles.userData.night = 1;
    this.applyLevel();
  }

  // keep shadow camera centred on the build area
  placeSun(focus) {
    const d = this.lightDir || new THREE.Vector3(0, 1, 0);
    this.sun.target.position.set(focus.x * 0.5, 0, focus.z * 0.5);
    this.sun.position.copy(this.sun.target.position).addScaledVector(d, 600);
    this.sun.target.updateMatrixWorld();
  }

  update(dt, time, camPos) {
    this.sky.material.uniforms.time.value = time;
    if (this.lavaTex) this.lavaTex.offset.set(Math.sin(time * 0.05) * 0.2, time * 0.01);
    const lavaFloor = tex('lava').map;
    lavaFloor.offset.set(time * 0.01, Math.sin(time * 0.07) * 0.1);
    this.envTimer -= dt;
    const closed = LANDSCAPES[this.styleId].cave || LANDSCAPES[this.styleId].enclosed;
    if (this.tableFlame) { const f = 1 + Math.sin(time * 11) * 0.08 + Math.sin(time * 23) * 0.05; this.tableFlame.scale.set(1, f, 1); }
    if (this.setPiece?.userData.spin) {
      const { spin, shards } = this.setPiece.userData;
      spin.forEach((r, k) => {
        r.rotation.y += dt * r.userData.w;
        r.updateMatrix();
        shards?.setMatrixAt(k, r.matrix);
      });
      if (shards) shards.instanceMatrix.needsUpdate = true;
    }
    if (this.envDirty && this.envTimer <= 0 && !closed) {
      if (this.envRT) this.envRT.dispose();
      this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 200);
      this.scene.environment = this.envRT.texture;
      this.envDirty = false;
      this.envTimer = 0.35;
    } else if (closed && this.scene.environment) {
      this.scene.environment = null;
    }
    if (this.particles) updateParticles(this.particles, dt, time, camPos);
  }
}

function radialTex(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- weather particles ----------
const PCONF = {
  snow: { n: 5000, color: 0xffffff, size: 0.55, speed: [-6, -3], drift: 2, box: 220, h: 120, additive: false, opacity: 0.9 },
  embers: { n: 1600, color: 0xff6a20, size: 0.3, speed: [3, 7], drift: 2, box: 200, h: 90, additive: true, opacity: 1 },
  fireflies: { n: 900, color: 0xd8ff6a, size: 0.22, speed: [-0.3, 0.3], drift: 1, box: 180, h: 14, additive: true, opacity: 1, nightOnly: true },
  pollen: { n: 900, color: 0xfff6c0, size: 0.18, speed: [-0.2, 0.3], drift: 1.4, box: 180, h: 30, additive: true, opacity: 0.55 },
  dust: { n: 1400, color: 0xe8c890, size: 0.3, speed: [-0.4, 0.4], drift: 7, box: 220, h: 30, additive: false, opacity: 0.45 },
  motes: { n: 1200, color: 0x8a9cff, size: 0.18, speed: [-0.15, 0.25], drift: 0.6, box: 200, h: 60, additive: true, opacity: 0.5 },
  roomdust: { n: 700, color: 0xffe2b0, size: 0.35, speed: [-0.2, 0.2], drift: 0.8, box: 200, h: 90, additive: true, opacity: 0.35 },
  spores: { n: 1500, color: 0x7affe0, size: 0.22, speed: [0.2, 0.9], drift: 0.8, box: 200, h: 60, additive: true, opacity: 0.8 },
};

function makeParticles(kind) {
  if (!kind) return null;
  const C = PCONF[kind];
  const rand = mulberry(kind.length * 31);
  const pos = new Float32Array(C.n * 3), vel = new Float32Array(C.n), ph = new Float32Array(C.n);
  for (let k = 0; k < C.n; k++) {
    pos[k * 3] = (rand() - 0.5) * C.box * 2;
    pos[k * 3 + 1] = rand() * C.h;
    pos[k * 3 + 2] = (rand() - 0.5) * C.box * 2;
    vel[k] = C.speed[0] + rand() * (C.speed[1] - C.speed[0]);
    ph[k] = rand() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color: C.color, size: C.size * 3, map: radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true,
    opacity: C.opacity, depthWrite: false, blending: C.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  pts.userData = { C, vel, ph, night: 0 };
  return pts;
}

function updateParticles(pts, dt, time, cam) {
  const { C, vel, ph } = pts.userData;
  const p = pts.geometry.attributes.position;
  const a = p.array;
  const cx = cam ? cam.x : 0, cz = cam ? cam.z : 0;
  for (let k = 0; k < C.n; k++) {
    let x = a[k * 3], y = a[k * 3 + 1], z = a[k * 3 + 2];
    y += vel[k] * dt;
    x += Math.sin(time * 0.5 + ph[k]) * C.drift * dt;
    z += Math.cos(time * 0.4 + ph[k] * 1.3) * C.drift * dt;
    if (C.drift > 5) x += C.drift * dt;
    if (y < 0) y += C.h;
    if (y > C.h) y -= C.h;
    if (x - cx > C.box) x -= C.box * 2; else if (x - cx < -C.box) x += C.box * 2;
    if (z - cz > C.box) z -= C.box * 2; else if (z - cz < -C.box) z += C.box * 2;
    a[k * 3] = x; a[k * 3 + 1] = y; a[k * 3 + 2] = z;
  }
  p.needsUpdate = true;
  if (C.nightOnly) pts.material.opacity = C.opacity * (0.15 + pts.userData.night * 0.85) * (0.6 + 0.4 * Math.sin(time * 3));
}

// Split scattered plants and rocks into patches: four around the site, then rings of eight sectors.
const PATCH_RINGS = [[0, 220, 4], [220, 480, 8], [480, Infinity, 8]];
function scatterPatches(mats) {
  const groups = new Map();
  const v = new THREE.Vector3();
  for (const m of mats) {
    v.setFromMatrixPosition(m);
    const r = Math.hypot(v.x, v.z);
    const ring = PATCH_RINGS.findIndex(([r0, r1]) => r >= r0 && r < r1);
    const n = PATCH_RINGS[ring][2];
    const a = (Math.atan2(v.z, v.x) + Math.PI) / (Math.PI * 2);
    const key = ring * 16 + Math.min(n - 1, Math.floor(a * n));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  return [...groups.values()];
}

// ---------- the dark void: drifting rock shards fading into black ----------
function buildVoid() {
  const g = new THREE.Group();
  g.name = 'void';
  const rand = mulberry(404);
  const spin = [];
  // every shard has the same shape, so all 120 draw in one instanced call
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (p.getY(i) < 0 ? 2.2 : 0.6));
  geo.computeVertexNormals();
  const shards = new THREE.InstancedMesh(geo, mat('voidRock'), 120);
  shards.castShadow = shards.receiveShadow = false;
  for (let k = 0; k < 120; k++) {
    const a = rand() * Math.PI * 2, r = 170 + Math.pow(rand(), 0.7) * 650;
    const y = -40 - rand() * 420 + (r > 400 ? rand() * 300 : 0);
    const s = 3 + rand() * 18;
    const m = new THREE.Object3D(); // a stand-in that holds this shard's place and spin
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    m.scale.set(s, s, s * (0.7 + rand() * 0.6));
    m.rotation.set(rand() * 0.4, rand() * 6, rand() * 0.4);
    m.userData.w = (rand() - 0.5) * 0.05;
    m.updateMatrix();
    shards.setMatrixAt(k, m.matrix);
    spin.push(m);
  }
  shards.computeBoundingSphere();
  g.add(shards);
  g.userData.shards = shards;
  // a faint glow far below, so the dark has depth
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ map: radialTex('rgba(52,48,110,0.2)', 'rgba(52,48,110,0)'), transparent: true, depthWrite: false, fog: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1100;
  g.add(glow);
  g.userData.spin = spin;
  return g;
}

// ---------- the gaming table: the dungeon is a model mid-session ----------
function sheetTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 660;
  const x = c.getContext('2d');
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, 512, 660);
  x.strokeStyle = '#5a4630'; x.fillStyle = '#5a4630'; x.lineWidth = 3;
  x.font = 'bold 30px Georgia, serif'; x.fillText('Character Sheet', 40, 60);
  x.lineWidth = 2; x.beginPath(); x.moveTo(40, 78); x.lineTo(472, 78); x.stroke();
  const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  x.font = '16px Georgia, serif';
  stats.forEach((st, k) => {
    const yy = 110 + k * 78;
    x.strokeRect(40, yy, 80, 64);
    x.fillText(st, 62, yy + 20);
    x.font = 'bold 24px Georgia, serif'; x.fillText(String([16, 12, 14, 9, 13, 10][k]), 64, yy + 52); x.font = '16px Georgia, serif';
  });
  x.strokeRect(150, 110, 320, 90); x.fillText('Hit points', 165, 132);
  x.font = 'bold 34px Georgia, serif'; x.fillText('24 / 24', 180, 182); x.font = '16px Georgia, serif';
  x.fillText('Equipment', 150, 236);
  for (let k = 0; k < 10; k++) { x.beginPath(); x.moveTo(150, 262 + k * 30); x.lineTo(470, 262 + k * 30); x.stroke(); }
  x.font = 'italic 18px Georgia, serif';
  ['longsword', 'torch (6)', 'rope, 50 ft', 'healing potion'].forEach((t, k) => x.fillText(t, 158, 256 + k * 30));
  x.font = '16px Georgia, serif'; x.fillText('Notes', 40, 600);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function d20(r, m) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(m));
}

function buildTabletop() {
  cutHoles(mat('battleMat'));
  cutHoles(mat('tableWood'));
  const g = G();
  g.name = 'tabletop';
  const top = -0.06;
  // table, battle mat, legs, room
  const table = add(g, BX(TABLE_W, 8, TABLE_D, 48), 'tableWood', 0, top - 4, 0);
  table.receiveShadow = true;
  add(g, BX(TABLE_W + 6, 3, TABLE_D + 6, 48), 'darkWood', 0, top - 9, 0).receiveShadow = true;
  const matW = GRID_W * CELL + 24, matD = GRID_D * CELL + 24;
  const bm = add(g, BX(matW, 0.4, matD, 6), 'battleMat', 0, top - 0.18, 0);
  bm.receiveShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, BX(16, TABLE_H, 16, 20), 'darkWood', sx * (TABLE_W / 2 - 18), top - 8 - TABLE_H / 2, sz * (TABLE_D / 2 - 18));
  const floor = add(g, new THREE.PlaneGeometry(5000, 5000), 'roomFloor', 0, top - 8 - TABLE_H, 0, -Math.PI / 2);
  floor.geometry.attributes.uv.array.forEach((v, k, arr) => { arr[k] = v * 80; });
  floor.receiveShadow = true;
  for (const o of [table, bm, floor]) o.renderOrder = ORDER.ground;
  for (let k = 0; k < 4; k++) {
    const w = add(g, new THREE.PlaneGeometry(5000, 2400), 'roomWall', 0, 600, 0);
    w.renderOrder = ORDER.ground + 1;
    const a = (k * Math.PI) / 2;
    w.position.set(Math.sin(a) * 1600, top - 8 - TABLE_H + 1200, Math.cos(a) * 1600);
    w.rotation.y = a + Math.PI;
  }
  // props, kept off the battle mat
  const props = G();
  const y0 = top;
  // dice
  const die1 = d20(12, 'dieRed'); die1.position.set(150, y0 + 10, 108); die1.rotation.set(0.6, 0.3, 0.2); props.add(die1);
  const die2 = d20(9, 'dieBlue'); die2.position.set(172, y0 + 7.5, 78); die2.rotation.set(1.2, 0.8, 0.1); props.add(die2);
  const d8 = new THREE.Mesh(new THREE.OctahedronGeometry(9, 0), mat('dieGreen')); d8.position.set(128, y0 + 6.6, 128); d8.rotation.set(0.62, 0.4, 0.78); props.add(d8);
  const d6 = G();
  add(d6, BX(16, 16, 16), 'ivory', 0, 8, 0);
  for (const [px, pz] of [[-4, -4], [4, -4], [0, 0], [-4, 4], [4, 4]]) add(d6, SP(1.6, 8, 6), 'pip', px, 16.05, pz).scale.y = 0.3;
  d6.position.set(-150, y0, 112); d6.rotation.y = 0.5; props.add(d6);
  // character sheet with a pencil on it
  const sheetMat = new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: 0.9 });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(85, 110), sheetMat);
  sheet.rotation.set(-Math.PI / 2, 0, 0.12);
  sheet.position.set(148, y0 + 0.15, -78);
  sheet.receiveShadow = true;
  props.add(sheet);
  const pencil = G();
  add(pencil, CY(2.2, 2.2, 110, 6), 'pencil', 0, 0, 0);
  add(pencil, CO(2.2, 9, 6), 'tableWood', 0, 59.5, 0);
  add(pencil, CO(0.8, 3.2, 6), 'graphite', 0, 62.5, 0);
  add(pencil, CY(2.3, 2.3, 7, 6), 'brass', 0, -58, 0);
  pencil.rotation.set(0, 0.5, Math.PI / 2);
  pencil.position.set(150, y0 + 2.5, -40);
  props.add(pencil);
  // rule book
  const book = G();
  add(book, BX(110, 14, 150), 'redCloth', 0, 7, 0);
  add(book, BX(104, 12, 146), 'parchment', 3, 7, 0);
  add(book, BX(30, 0.5, 60), 'gold', 0, 14.3, -20);
  book.rotation.y = -0.2;
  book.position.set(-160, y0, -70);
  props.add(book);
  // mug of coffee
  const mug = G();
  add(mug, LA([[0, 0], [18, 0], [19, 2], [19, 40], [17.5, 40], [17.5, 3], [0, 3]], 24), 'ceramic', 0, 0, 0);
  add(mug, CY(17.4, 17.4, 0.4, 24), 'coffee', 0, 33, 0);
  add(mug, TO(10, 2.8, 8, 16, Math.PI * 1.2), 'ceramic', 21, 20, 0, 0, 0, -Math.PI * 0.6);
  mug.position.set(-168, y0, 20);
  props.add(mug);
  // candle on a dish
  const candle = G();
  add(candle, CY(16, 18, 2.5, 20), 'brass', 0, 1.25, 0);
  add(candle, CY(7, 7.5, 36, 14), 'wax', 0, 20, 0);
  const fl = G();
  fl.name = 'candleFlame';
  add(fl, CO(3.6, 13, 8), 'flame', 0, 6.5, 0);
  add(fl, CO(1.8, 7, 6), 'flameCore', 0, 3.6, 0);
  fl.position.y = 38.5;
  fl.traverse((o) => { o.castShadow = false; });
  candle.add(fl);
  candle.position.set(-130, y0, 128);
  props.add(candle);
  g.add(props);
  g.traverse((o) => { if (o.isMesh && o !== floor && !o.material.transparent && o.parent !== fl) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
