import * as THREE from 'three';
import { tex } from './textures.js';

// Shared clipping plane for the wall cutaway view (normal points down: keeps y < constant)
export const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);

const cache = new Map();

function std(params, texName, repeat = 1, bumpScale = 1) {
  const p = { roughness: 0.85, metalness: 0, ...params };
  if (texName) {
    const t = tex(texName);
    p.map = t.map;
    p.bumpMap = t.bump;
    p.bumpScale = bumpScale;
  }
  const m = new THREE.MeshStandardMaterial(p);
  if (repeat !== 1 && m.map) {
    // textures are shared, so per-material repeat is done via UVs instead
  }
  return m;
}

function emissive(color, intensity = 3) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1, toneMapped: false });
}

const DEFS = {
  flagstone: () => std({ roughness: 0.9 }, 'flagstone', 1, 2.5),
  cobble: () => std({ roughness: 0.9 }, 'cobble', 1, 3),
  planks: () => std({ roughness: 0.8 }, 'planks', 1, 1.5),
  marble: () => std({ roughness: 0.25, metalness: 0.05 }, 'marble', 1, 0.6),
  dirt: () => std({ roughness: 1 }, 'dirt', 1, 2),
  moss: () => std({ roughness: 0.95 }, 'moss', 1, 2.5),
  grassFloor: () => std({ roughness: 1 }, 'grass', 1, 1.5),
  sandFloor: () => std({ roughness: 1 }, 'sand', 1, 1),
  snowFloor: () => std({ roughness: 0.8 }, 'snow', 1, 0.8),
  foundation: () => std({ color: 0xa49c90, roughness: 0.95 }, 'stoneWall', 1, 3),
  earthBank: () => std({ color: 0x9a8a76, roughness: 1 }, 'dirt', 1, 3),
  pitRock: () => std({ color: 0x8e8780, roughness: 1 }, 'caveRock', 1, 2),
  stoneWall: () => std({ roughness: 0.92 }, 'stoneWall', 1, 3),
  brick: () => std({ roughness: 0.9 }, 'brick', 1, 2),
  caveRock: () => std({ roughness: 1 }, 'caveRock', 1, 4),
  stone: () => std({ color: 0xb8b0a4, roughness: 0.9 }, 'caveRock', 1, 1.5),
  paleStone: () => std({ color: 0xf2ece2, roughness: 0.65 }, 'limestone', 1, 0.5),
  darkStone: () => std({ color: 0x6a6460, roughness: 0.9 }, 'caveRock', 1, 2),
  wood: () => std({ roughness: 0.75 }, 'wood', 1, 1),
  darkWood: () => std({ roughness: 0.7 }, 'darkWood', 1, 1),
  log: () => std({ color: 0xa08060, roughness: 0.95 }, 'darkWood', 1, 2),
  iron: () => std({ roughness: 0.55, metalness: 0.8 }, 'iron', 1, 0.5),
  blackIron: () => std({ color: 0x555555, roughness: 0.5, metalness: 0.85 }, 'iron', 1, 0.3),
  gold: () => std({ color: 0xffd27a, roughness: 0.28, metalness: 1 }, 'gold', 1, 0.2),
  brass: () => std({ color: 0xc8a050, roughness: 0.35, metalness: 1 }),
  silver: () => std({ color: 0xd8dce4, roughness: 0.25, metalness: 1 }),
  steel: () => std({ color: 0xb0b6c0, roughness: 0.3, metalness: 1 }),
  redCloth: () => std({ color: 0x8c1d1d, roughness: 1 }, 'fabric', 1, 0.3),
  blueCloth: () => std({ color: 0x24366e, roughness: 1 }, 'fabric', 1, 0.3),
  greenCloth: () => std({ color: 0x2d5a34, roughness: 1 }, 'fabric', 1, 0.3),
  purpleCloth: () => std({ color: 0x4f2a66, roughness: 1 }, 'fabric', 1, 0.3),
  linen: () => std({ color: 0xd8ccb0, roughness: 1 }, 'fabric', 1, 0.3),
  canvas: () => std({ color: 0xc9b48a, roughness: 1 }, 'fabric', 1, 0.3),
  rug: () => std({ roughness: 1 }, 'rug', 1, 0.4),
  parchment: () => std({ roughness: 1 }, 'parchment'),
  hedge: () => std({ roughness: 1 }, 'hedge', 1, 3),
  leaf: () => std({ color: 0x4d7a30, roughness: 0.9, flatShading: true }),
  darkLeaf: () => std({ color: 0x2b4a26, roughness: 0.9, flatShading: true }),
  autumnLeaf: () => std({ color: 0xb5652a, roughness: 0.9, flatShading: true }),
  snowLeaf: () => std({ color: 0xe8eef5, roughness: 0.8, flatShading: true }),
  palmLeaf: () => std({ color: 0x5d8a35, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }),
  bark: () => std({ color: 0x8a6a4a, roughness: 1 }, 'darkWood', 1, 2),
  deadBark: () => std({ color: 0x7a7066, roughness: 1 }, 'darkWood', 1, 2),
  cactus: () => std({ color: 0x4f7a3a, roughness: 0.8, flatShading: true }),
  rock: () => std({ color: 0x9a948a, roughness: 1, flatShading: true }, 'caveRock', 1, 1),
  mossRock: () => std({ color: 0x7c8a66, roughness: 1, flatShading: true }, 'caveRock', 1, 1),
  sandstone: () => std({ color: 0xd2a874, roughness: 1, flatShading: true }, 'caveRock', 1, 1),
  iceRock: () => std({ color: 0xbcd4e6, roughness: 0.3, metalness: 0.1, flatShading: true }),
  basaltRock: () => std({ color: 0x3a3434, roughness: 1, flatShading: true }, 'caveRock', 1, 1),
  bone: () => std({ color: 0xe0d6bc, roughness: 0.7 }),
  wax: () => std({ color: 0xefe6cf, roughness: 0.5 }),
  straw: () => std({ color: 0xc9a85a, roughness: 1 }),
  rope: () => std({ color: 0x9c7a4c, roughness: 1 }),
  pitBlack: () => new THREE.MeshBasicMaterial({ color: 0x050403 }),
  water: () => new THREE.MeshStandardMaterial({ color: 0x2a6070, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, map: tex('water').map }),
  swampWater: () => new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.88 }),
  lava: () => new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: 0xff6a2a, emissiveMap: tex('lava').map, emissiveIntensity: 2.0, map: tex('lava').map, roughness: 0.9, toneMapped: true }),
  flame: () => emissive(0xff8a2a, 6),
  flameCore: () => emissive(0xffe08a, 9),
  blueFlame: () => emissive(0x5ab8ff, 6),
  greenFlame: () => emissive(0x6aff8a, 6),
  ember: () => emissive(0xff4a10, 2.5),
  crystal: () => new THREE.MeshStandardMaterial({ color: 0x4aa8ff, emissive: 0x2a7cff, emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }),
  amethyst: () => new THREE.MeshStandardMaterial({ color: 0xb06aff, emissive: 0x7a2aff, emissiveIntensity: 1.6, roughness: 0.15, flatShading: true }),
  ruby: () => new THREE.MeshStandardMaterial({ color: 0xff2a3a, emissive: 0x6a0010, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.2, flatShading: true }),
  emerald: () => new THREE.MeshStandardMaterial({ color: 0x2aff7a, emissive: 0x006a2a, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.2, flatShading: true }),
  sapphire: () => new THREE.MeshStandardMaterial({ color: 0x3a6aff, emissive: 0x001a7a, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.2, flatShading: true }),
  mushroomGlow: () => new THREE.MeshStandardMaterial({ color: 0x6affe8, emissive: 0x2affd0, emissiveIntensity: 2.2, roughness: 0.6 }),
  mushroomRed: () => std({ color: 0xb02a20, roughness: 0.6 }),
  potionRed: () => new THREE.MeshStandardMaterial({ color: 0xff3040, emissive: 0xa00010, emissiveIntensity: 1.5, roughness: 0.1, transparent: true, opacity: 0.9 }),
  potionBlue: () => new THREE.MeshStandardMaterial({ color: 0x40a0ff, emissive: 0x0040a0, emissiveIntensity: 1.5, roughness: 0.1, transparent: true, opacity: 0.9 }),
  potionGreen: () => new THREE.MeshStandardMaterial({ color: 0x50ff60, emissive: 0x10a020, emissiveIntensity: 1.5, roughness: 0.1, transparent: true, opacity: 0.9 }),
  glass: () => new THREE.MeshStandardMaterial({ color: 0xcfe6f0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
  stainedGlass: () => new THREE.MeshStandardMaterial({ color: 0x6a3aa0, emissive: 0x4a2080, emissiveIntensity: 0.6, roughness: 0.2, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  cauldronBrew: () => new THREE.MeshStandardMaterial({ color: 0x2a6a1a, emissive: 0x4aff2a, emissiveIntensity: 1.2, roughness: 0.3 }),
  web: () => new THREE.MeshBasicMaterial({ color: 0xcfcfcf, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  mimicTongue: () => std({ color: 0xa02a40, roughness: 0.5 }),
  teeth: () => std({ color: 0xf0ead8, roughness: 0.4 }),
  goblinSkin: () => std({ color: 0x6f8f3a, roughness: 0.7 }),
  orcSkin: () => std({ color: 0x5c6e48, roughness: 0.75 }),
  ogreSkin: () => std({ color: 0xa08868, roughness: 0.8 }),
  leather: () => std({ color: 0x5a3a22, roughness: 0.85 }, 'fabric', 1, 0.4),
  redScale: () => std({ color: 0x8e2a18, roughness: 0.45, metalness: 0.15, flatShading: true }),
  bellyScale: () => std({ color: 0xc89a5a, roughness: 0.6, flatShading: true }),
  wing: () => std({ color: 0x5a1a10, roughness: 0.7, side: THREE.DoubleSide }),
  horn: () => std({ color: 0xe8dcc0, roughness: 0.5 }),
  spiderBody: () => std({ color: 0x24201c, roughness: 0.55, flatShading: true }),
  eyeRed: () => emissive(0xff2a1a, 3),
  eyeGreen: () => emissive(0x7aff4a, 3),
  eyeBlue: () => emissive(0x8ad8ff, 3),
  ooze: () => new THREE.MeshStandardMaterial({ color: 0x6ad84a, emissive: 0x1a5a10, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
  wraith: () => new THREE.MeshStandardMaterial({ color: 0x9ac8ff, emissive: 0x2a5aa0, emissiveIntensity: 1.2, roughness: 0.6, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  dieRed: () => std({ color: 0xa3182a, roughness: 0.25, metalness: 0.05, flatShading: true }),
  dieBlue: () => std({ color: 0x1f4fa8, roughness: 0.25, metalness: 0.05, flatShading: true }),
  dieGreen: () => new THREE.MeshStandardMaterial({ color: 0x3ab07a, roughness: 0.1, transparent: true, opacity: 0.82, flatShading: true }),
  ivory: () => std({ color: 0xece2cc, roughness: 0.35 }),
  pip: () => std({ color: 0x1a1612, roughness: 0.6 }),
  ceramic: () => std({ color: 0x3c5a6e, roughness: 0.3, metalness: 0.05 }),
  coffee: () => std({ color: 0x2a160a, roughness: 0.05 }),
  pencil: () => std({ color: 0xe8b830, roughness: 0.6, flatShading: true }),
  graphite: () => std({ color: 0x2a2a2e, roughness: 0.4, metalness: 0.3 }),
  tableWood: () => std({ color: 0xb08a68, roughness: 0.55 }, 'wood', 1, 0.6),
  roomFloor: () => std({ color: 0x8a7060, roughness: 0.8 }, 'planks', 1, 0.6),
  roomWall: () => std({ color: 0x4a3a30, roughness: 1 }),
  battleMat: () => std({ color: 0x3e5240, roughness: 0.95 }, 'fabric', 1, 0.3),
  voidRock: () => std({ color: 0x2a2a34, roughness: 1, flatShading: true }, 'caveRock', 1, 1),
  shadowBlob: () => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  runeGlow: () => emissive(0x8a6aff, 2.5),
};

export function mat(name) {
  let m = cache.get(name);
  if (!m) {
    const f = DEFS[name];
    if (!f) throw new Error('no material ' + name);
    m = f();
    m.name = name;
    cache.set(name, m);
  }
  return m;
}

// Structural variants get the cutaway clip plane. Cached per base material.
const clipCache = new Map();
export function clipMat(name) {
  let m = clipCache.get(name);
  if (!m) {
    m = mat(name).clone();
    m.name = name + ':clip';
    m.clippingPlanes = [cutPlane];
    m.side = THREE.DoubleSide;
    m.shadowSide = THREE.FrontSide;
    clipCache.set(name, m);
  }
  return m;
}
