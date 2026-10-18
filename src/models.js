import * as THREE from 'three';
import { CELL, WALL_H, WALL_T, mulberry } from './config.js';
import { mat, clipMat } from './materials.js';
import { G, add, BX, CY, SP, CO, TO, LA, ICO, extrudeWall, dyn, noShadow } from './geom.js';

const H = CELL / 2;
const PI = Math.PI;

// ---------- shared bits ----------
export function flame(scale = 1, kind = 'flame') {
  const f = dyn(G(), { flame: true });
  const outer = add(f, CO(0.22 * scale, 0.75 * scale, 8), kind === 'blue' ? 'blueFlame' : kind === 'green' ? 'greenFlame' : 'flame', 0, 0.36 * scale, 0);
  add(f, CO(0.11 * scale, 0.42 * scale, 6), 'flameCore', 0, 0.22 * scale, 0);
  void outer;
  return noShadow(f);
}

function candle(parent, x, y, z, h = 0.5, r = 0.07) {
  add(parent, CY(r, r, h, 8), 'wax', x, y + h / 2, z);
  const f = flame(0.35);
  f.position.set(x, y + h, z);
  parent.add(f);
}

// ======================= FLOORS =======================
export function floorTile(matName) {
  const g = G();
  add(g, BX(CELL, 0.24, CELL, 3), matName, 0, -0.12 + 0.12, 0);
  return g;
}

export function waterTile(kind) {
  const g = G();
  add(g, BX(CELL, 0.1, CELL), 'darkStone', 0, -1.2, 0);
  if (kind === 'lava') {
    add(g, BX(CELL, 0.05, CELL), 'lava', 0, -0.05, 0);
  } else {
    const s = add(g, new THREE.PlaneGeometry(CELL, CELL), 'water', 0, 0.0, 0, -PI / 2);
    s.userData.noShadow = true;
  }
  return g;
}

export function pitTile() {
  const g = G();
  const depth = 5;
  add(g, BX(CELL, 0.1, CELL), 'pitBlack', 0, -depth, 0);
  const side = new THREE.PlaneGeometry(CELL, depth);
  add(g, side, 'darkStone', 0, -depth / 2, -H, 0, 0, 0);
  add(g, side, 'darkStone', 0, -depth / 2, H, 0, PI, 0);
  add(g, side, 'darkStone', -H, -depth / 2, 0, 0, PI / 2, 0);
  add(g, side, 'darkStone', H, -depth / 2, 0, 0, -PI / 2, 0);
  return g;
}

// ======================= WALLS (edge, along x) =======================
export function plainWall(m, h = WALL_H, t = WALL_T) {
  const g = G();
  add(g, BX(CELL, h, t, 3), clipMat(m), 0, h / 2, 0);
  return g;
}

export function caveWall() {
  const g = G();
  const geo = new THREE.BoxGeometry(CELL + 0.3, WALL_H, 1.3, 6, 12, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(y * 1.7 + x * 0.9) * 0.18 + Math.sin(y * 3.1 - x * 2.3) * 0.1 + Math.cos(x * 4.7 + y * 0.5) * 0.08;
    if (Math.abs(z) > 0.5) p.setZ(i, z + Math.sign(z) * n);
    if (y > WALL_H / 2 - 0.1) p.setY(i, y + Math.sin(x * 3) * 0.3);
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.1, uv.getY(i) * WALL_H / 3);
  add(g, geo, clipMat('caveRock'), 0, WALL_H / 2, 0);
  return g;
}

export function palisade() {
  const g = G();
  const rand = mulberry(7);
  for (let k = 0; k < 5; k++) {
    const x = -H + 0.3 + k * 0.6;
    const h = 8.6 + rand() * 1.2;
    add(g, CY(0.3, 0.32, h, 8), clipMat('log'), x, h / 2, 0, 0, rand() * 6, 0);
    add(g, CO(0.3, 0.9, 8), clipMat('log'), x, h + 0.45, 0);
  }
  add(g, BX(CELL, 0.3, 0.2), clipMat('darkWood'), 0, 2.5, 0.35);
  add(g, BX(CELL, 0.3, 0.2), clipMat('darkWood'), 0, 6.8, 0.35);
  return g;
}

export function ironBars() {
  const g = G();
  add(g, BX(CELL, 0.6, WALL_T, 3), clipMat('stoneWall'), 0, 0.3, 0);
  add(g, BX(CELL, 1.2, WALL_T, 3), clipMat('stoneWall'), 0, WALL_H - 0.6, 0);
  for (let k = 0; k < 7; k++) add(g, CY(0.06, 0.06, WALL_H - 1.8, 6), clipMat('blackIron'), -H + 0.21 + k * 0.43, WALL_H / 2 - 0.3, 0);
  add(g, BX(CELL, 0.12, 0.16), clipMat('blackIron'), 0, 4.5, 0);
  return g;
}

export function lowWall() {
  const g = G();
  add(g, BX(CELL, 3, 0.8, 3), clipMat('stoneWall'), 0, 1.5, 0);
  add(g, BX(CELL + 0.1, 0.25, 1.0, 3), clipMat('darkStone'), 0, 3.1, 0);
  return g;
}

export function crumbledWall() {
  const g = G();
  add(g, BX(CELL, 2.2, 0.8, 3), clipMat('stoneWall'), 0, 1.1, 0);
  add(g, BX(1.4, 2.0, 0.8, 3), clipMat('stoneWall'), -0.8, 3.2, 0);
  add(g, BX(0.7, 1.2, 0.8, 3), clipMat('stoneWall'), -1.15, 4.8, 0);
  add(g, ICO(0.4, 0, 0.3, 3), 'rock', 0.9, 0.3, 0.8);
  add(g, ICO(0.3, 0, 0.3, 4), 'rock', 0.3, 0.2, 0.9);
  return g;
}

export function woodFence() {
  const g = G();
  add(g, BX(CELL, 0.25, 0.15), 'darkWood', 0, 1.4, 0);
  add(g, BX(CELL, 0.25, 0.15), 'darkWood', 0, 2.9, 0);
  for (const x of [-0.75, 0, 0.75]) add(g, BX(0.35, 3.2, 0.1), 'wood', x, 1.8, 0.1);
  return g;
}

export function hedgeWall() {
  const g = G();
  add(g, BX(CELL, 5, 1.6, 3), clipMat('hedge'), 0, 2.5, 0);
  return g;
}

// ---------- posts at grid vertices ----------
export function post(m, w, h) {
  const g = G();
  add(g, BX(w, h, w, 3), clipMat(m), 0, h / 2, 0);
  return g;
}
export function logPost() {
  const g = G();
  add(g, CY(0.36, 0.38, 10.4, 8), clipMat('log'), 0, 5.2, 0);
  add(g, CO(0.36, 1, 8), clipMat('log'), 0, 10.9, 0);
  return g;
}
export function fencePost() {
  const g = G();
  add(g, BX(0.35, 3.6, 0.35), 'darkWood', 0, 1.8, 0);
  add(g, CO(0.26, 0.4, 4), 'darkWood', 0, 3.8, 0, 0, PI / 4, 0);
  return g;
}
export function cavePost() {
  const g = G();
  add(g, ICO(1.0, 1, 0.25, 9).scale(1, 5.2, 1), clipMat('caveRock'), 0, 5, 0);
  return g;
}

// ======================= DOORS / OPENINGS =======================
const OPEN_W = 2.2, OPEN_H = 7.2;

function doorFrame(g, f, trim = true) {
  const jw = (CELL - OPEN_W) / 2;
  add(g, BX(jw, WALL_H, WALL_T, 3), clipMat(f), -H + jw / 2, WALL_H / 2, 0);
  add(g, BX(jw, WALL_H, WALL_T, 3), clipMat(f), H - jw / 2, WALL_H / 2, 0);
  add(g, BX(OPEN_W, WALL_H - OPEN_H, WALL_T, 3), clipMat(f), 0, (WALL_H + OPEN_H) / 2, 0);
  if (trim) {
    const t = WALL_T + 0.16;
    add(g, BX(0.22, OPEN_H + 0.1, t), clipMat('darkStone'), -OPEN_W / 2 - 0.06, OPEN_H / 2, 0);
    add(g, BX(0.22, OPEN_H + 0.1, t), clipMat('darkStone'), OPEN_W / 2 + 0.06, OPEN_H / 2, 0);
    add(g, BX(OPEN_W + 0.56, 0.32, t), clipMat('darkStone'), 0, OPEN_H + 0.1, 0);
  }
}

function leaf(w, h, leafMat, studs) {
  const l = G();
  add(l, BX(w, h, 0.22, 3), clipMat(leafMat), w / 2, h / 2, 0);
  for (const y of [1.2, h - 1.2]) add(l, BX(w - 0.1, 0.22, 0.28), clipMat('blackIron'), w / 2, y, 0);
  add(l, TO(0.16, 0.035, 6, 12), clipMat('brass'), w - 0.35, 3.4, 0.16);
  add(l, TO(0.16, 0.035, 6, 12), clipMat('brass'), w - 0.35, 3.4, -0.16);
  if (studs) for (let a = 0; a < 4; a++) for (let b = 0; b < 6; b++) add(l, SP(0.05, 6, 4), clipMat('blackIron'), 0.3 + a * (w - 0.6) / 3, 0.8 + b * (h - 1.6) / 5, 0.12);
  return l;
}

export function swingDoor(f, leafMat = 'planks', studs = false) {
  const g = G();
  doorFrame(g, f);
  const pivot = dyn(G(), { door: 'swing', open: -1.75 });
  pivot.position.set(-OPEN_W / 2, 0.02, 0);
  pivot.add(leaf(OPEN_W, OPEN_H - 0.05, leafMat, studs));
  g.add(pivot);
  return g;
}

export function doubleDoor(f) {
  const g = G();
  doorFrame(g, f);
  const w = OPEN_W / 2;
  const p1 = dyn(G(), { door: 'swing', open: -1.65 });
  p1.position.set(-OPEN_W / 2, 0.02, 0);
  p1.add(leaf(w, OPEN_H - 0.05, 'darkWood', true));
  const p2 = dyn(G(), { door: 'swing', open: 1.65 });
  p2.position.set(OPEN_W / 2, 0.02, 0);
  const l2 = leaf(w, OPEN_H - 0.05, 'darkWood', true);
  l2.scale.x = -1;
  p2.add(l2);
  g.add(p1, p2);
  return g;
}

export function portcullis(f) {
  const g = G();
  doorFrame(g, f);
  const grid = dyn(G(), { door: 'slide', open: 6.4 });
  for (let k = 0; k < 6; k++) {
    const x = -OPEN_W / 2 + 0.18 + k * (OPEN_W - 0.36) / 5;
    add(grid, CY(0.07, 0.07, OPEN_H, 6), clipMat('blackIron'), x, OPEN_H / 2, 0);
    add(grid, CO(0.09, 0.3, 6), clipMat('blackIron'), x, -0.1, 0, PI, 0, 0);
  }
  for (const y of [1.5, 3.5, 5.5]) add(grid, BX(OPEN_W, 0.12, 0.12), clipMat('blackIron'), 0, y, 0);
  g.add(grid);
  return g;
}

function archShape(halfW, springY, wallH = WALL_H) {
  const s = new THREE.Shape();
  s.moveTo(-H, 0);
  s.lineTo(-halfW, 0);
  s.lineTo(-halfW, springY);
  s.absarc(0, springY, halfW, PI, 0, true);
  s.lineTo(halfW, 0);
  s.lineTo(H, 0);
  s.lineTo(H, wallH);
  s.lineTo(-H, wallH);
  s.lineTo(-H, 0);
  return s;
}

export function archway(f) {
  const g = G();
  add(g, extrudeWall(archShape(1.15, 6.0), WALL_T), clipMat(f), 0, 0, 0);
  const trimShape = new THREE.Shape();
  trimShape.absarc(0, 0, 1.4, 0, PI, false);
  trimShape.lineTo(-1.15, 0);
  trimShape.absarc(0, 0, 1.15, PI, 0, true);
  trimShape.lineTo(1.4, 0);
  const trim = extrudeWall(trimShape, WALL_T + 0.2);
  add(g, trim, clipMat('darkStone'), 0, 6.0, 0);
  add(g, BX(0.25, 6.0, WALL_T + 0.2), clipMat('darkStone'), -1.27, 3.0, 0);
  add(g, BX(0.25, 6.0, WALL_T + 0.2), clipMat('darkStone'), 1.27, 3.0, 0);
  add(g, BX(0.5, 0.7, WALL_T + 0.3), clipMat('darkStone'), 0, 7.4, 0);
  return g;
}

export function windowWall(f, stained = false) {
  const g = G();
  const s = new THREE.Shape();
  s.moveTo(-H, 0); s.lineTo(H, 0); s.lineTo(H, WALL_H); s.lineTo(-H, WALL_H); s.lineTo(-H, 0);
  const hole = new THREE.Path();
  const hw = 0.7, y0 = 3.4, ys = 6.6;
  hole.moveTo(-hw, y0);
  hole.lineTo(hw, y0);
  hole.lineTo(hw, ys);
  hole.absarc(0, ys, hw, 0, PI, false);
  hole.lineTo(-hw, y0);
  s.holes.push(hole);
  add(g, extrudeWall(s, WALL_T), clipMat(f), 0, 0, 0);
  add(g, BX(1.8, 0.2, WALL_T + 0.35), clipMat('darkStone'), 0, y0 - 0.1, 0);
  if (stained) {
    const gs = new THREE.Shape();
    gs.moveTo(-hw, y0); gs.lineTo(hw, y0); gs.lineTo(hw, ys); gs.absarc(0, ys, hw, 0, PI, false); gs.lineTo(-hw, y0);
    const glass = add(g, new THREE.ShapeGeometry(gs), clipMat('stainedGlass'), 0, 0, 0);
    glass.userData.noShadow = true;
    add(g, BX(0.06, ys + hw - y0, 0.08), clipMat('blackIron'), 0, (y0 + ys + hw) / 2, 0);
    add(g, BX(hw * 2, 0.06, 0.08), clipMat('blackIron'), 0, 5.0, 0);
  } else {
    for (const x of [-0.35, 0, 0.35]) add(g, CY(0.045, 0.045, ys + hw - y0, 6), clipMat('blackIron'), x, (y0 + ys + hw) / 2, 0);
    add(g, BX(hw * 2, 0.08, 0.1), clipMat('blackIron'), 0, 5.2, 0);
  }
  return g;
}

export function secretDoor(f) {
  const g = G();
  doorFrame(g, f, false);
  const pivot = dyn(G(), { door: 'swing', open: 1.57 });
  pivot.position.set(0, 0, 0);
  add(pivot, BX(OPEN_W, OPEN_H, WALL_T * 0.95, 3), clipMat(f), 0, OPEN_H / 2, 0);
  g.add(pivot);
  return g;
}

// ======================= LIGHTS =======================
export function wallTorch() {
  const g = G();
  const z = -H + WALL_T / 2;
  add(g, BX(0.35, 0.6, 0.1), 'blackIron', 0, 5.6, z + 0.05);
  add(g, BX(0.08, 0.08, 0.5), 'blackIron', 0, 5.6, z + 0.3);
  const handle = G();
  add(handle, CY(0.07, 0.05, 1.3, 6), 'darkWood', 0, 0, 0);
  add(handle, CY(0.11, 0.08, 0.3, 6), 'rope', 0, 0.55, 0);
  handle.position.set(0, 6.0, z + 0.55);
  handle.rotation.x = 0.35;
  g.add(handle);
  const f = flame(0.9);
  f.position.set(0, 6.75, z + 0.82);
  g.add(f);
  return g;
}

export function brazier(kind = 'flame') {
  const g = G();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * PI * 2;
    add(g, CY(0.05, 0.05, 3.0, 6), 'blackIron', Math.cos(a) * 0.45, 1.4, Math.sin(a) * 0.45, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
  }
  add(g, LA([[0.05, 0], [0.55, 0.15], [0.8, 0.5], [0.85, 0.6], [0.75, 0.6], [0.5, 0.25], [0.0, 0.2]]), 'blackIron', 0, 2.6, 0);
  add(g, SP(0.45, 8, 4), 'ember', 0, 2.95, 0).scale.y = 0.3;
  const f = flame(1.7, kind);
  f.position.set(0, 3.0, 0);
  g.add(f);
  return g;
}

export function candelabra() {
  const g = G();
  add(g, LA([[0.0, 0], [0.5, 0], [0.45, 0.1], [0.12, 0.3], [0.06, 0.5], [0.06, 4.3], [0.0, 4.3]]), 'brass', 0, 0, 0);
  add(g, TO(0.55, 0.04, 6, 16, PI), 'brass', 0, 4.3, 0, 0, 0, 0);
  for (const x of [-0.55, 0, 0.55]) {
    add(g, CY(0.12, 0.08, 0.12, 8), 'brass', x, x === 0 ? 4.9 : 4.36, 0);
    candle(g, x, x === 0 ? 4.96 : 4.42, 0, 0.55);
  }
  add(g, CY(0.05, 0.05, 0.6, 6), 'brass', 0, 4.6, 0);
  return g;
}

export function candles() {
  const g = G();
  add(g, CY(0.45, 0.5, 0.06, 12), 'brass', 0, 0.03, 0);
  candle(g, 0, 0.06, 0, 0.6, 0.08);
  candle(g, 0.22, 0.06, 0.15, 0.4, 0.07);
  candle(g, -0.2, 0.06, 0.12, 0.3, 0.07);
  add(g, SP(0.08, 6, 4), 'wax', 0.05, 0.08, -0.25).scale.y = 0.4;
  return g;
}

export function chandelier() {
  const g = G();
  const y = 7.6;
  add(g, CY(0.04, 0.04, WALL_H - y, 4), 'blackIron', 0, (WALL_H + y) / 2, 0);
  add(g, TO(1.1, 0.07, 6, 24), 'blackIron', 0, y, 0, PI / 2, 0, 0);
  add(g, TO(0.4, 0.05, 6, 16), 'blackIron', 0, y - 0.4, 0, PI / 2, 0, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * PI * 2;
    const x = Math.cos(a) * 1.1, z = Math.sin(a) * 1.1;
    add(g, CY(0.1, 0.06, 0.1, 6), 'blackIron', x, y + 0.08, z);
    candle(g, x, y + 0.12, z, 0.45);
  }
  return g;
}

export function hangingLantern() {
  const g = G();
  const y = 6.6;
  add(g, CY(0.03, 0.03, WALL_H - y - 1, 4), 'blackIron', 0, (WALL_H + y + 1) / 2, 0);
  lantern(g, 0, y, 0);
  return g;
}

function lantern(g, x, y, z) {
  add(g, CY(0.3, 0.3, 0.08, 6), 'blackIron', x, y, z);
  add(g, CY(0.05, 0.32, 0.35, 6), 'blackIron', x, y + 1.05, z);
  add(g, TO(0.12, 0.025, 4, 10), 'blackIron', x, y + 1.3, z);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * PI * 2;
    add(g, CY(0.025, 0.025, 0.85, 4), 'blackIron', x + Math.cos(a) * 0.27, y + 0.45, z + Math.sin(a) * 0.27);
  }
  const gl = add(g, CY(0.25, 0.25, 0.8, 6), 'glass', x, y + 0.45, z);
  gl.userData.noShadow = true;
  const f = flame(0.5);
  f.position.set(x, y + 0.2, z);
  g.add(f);
}

export function lanternPost() {
  const g = G();
  add(g, BX(0.4, 7.5, 0.4), 'darkWood', 0, 3.75, 0);
  add(g, BX(1.6, 0.25, 0.25), 'darkWood', 0.6, 7.3, 0);
  add(g, BX(0.18, 1.2, 0.18), 'darkWood', 0.2, 6.6, 0, 0, 0, 0.8);
  add(g, CY(0.02, 0.02, 0.4, 4), 'blackIron', 1.15, 7.0, 0);
  lantern(g, 1.15, 5.55, 0);
  add(g, ICO(0.5, 0, 0.3, 2), 'rock', 0.1, 0.15, 0.1).scale.y = 0.5;
  return g;
}

export function campfire() {
  const g = G();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * PI * 2;
    add(g, ICO(0.28, 0, 0.3, k + 1), 'rock', Math.cos(a) * 1.0, 0.15, Math.sin(a) * 1.0).scale.y = 0.65;
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * PI * 2 + 0.4;
    add(g, CY(0.12, 0.14, 1.6, 6), 'log', Math.cos(a) * 0.3, 0.35, Math.sin(a) * 0.3, 0, -a, PI / 2 - 0.35).rotation.order = 'YXZ';
  }
  add(g, SP(0.5, 8, 4), 'ember', 0, 0.1, 0).scale.y = 0.3;
  const f = flame(1.6);
  f.position.set(0, 0.2, 0);
  g.add(f);
  return g;
}

export function crystalCluster(m = 'crystal') {
  const g = G();
  const rand = mulberry(m.length * 13);
  add(g, ICO(0.6, 0, 0.3, 5), 'darkStone', 0, 0.1, 0).scale.y = 0.4;
  for (let k = 0; k < 7; k++) {
    const h = 1 + rand() * 2.4;
    const c = add(g, CY(0.0, 0.22 + rand() * 0.12, h, 6), m, (rand() - 0.5) * 0.9, h / 2, (rand() - 0.5) * 0.9);
    c.rotation.set((rand() - 0.5) * 0.7, rand() * 3, (rand() - 0.5) * 0.7);
  }
  return g;
}

export function glowShrooms() {
  const g = G();
  const rand = mulberry(77);
  for (let k = 0; k < 9; k++) {
    const x = (rand() - 0.5) * 2.2, z = (rand() - 0.5) * 2.2, h = 0.3 + rand() * 1.4, r = 0.18 + rand() * 0.45;
    add(g, CY(0.05 + r * 0.15, 0.08 + r * 0.2, h, 6), 'bone', x, h / 2, z);
    const cap = add(g, SP(r, 10, 6, 0), 'mushroomGlow', x, h, z);
    cap.scale.y = 0.45;
  }
  return g;
}

// ======================= FURNITURE =======================
export function table(w = 2) {
  const g = G();
  const L = w * CELL - 0.6, D = CELL - 0.6, y = 2.6;
  add(g, BX(L, 0.2, D, 3), 'planks', 0, y, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, BX(0.25, y, 0.25), 'darkWood', sx * (L / 2 - 0.3), y / 2, sz * (D / 2 - 0.3));
  add(g, BX(L - 0.6, 0.2, 0.12), 'darkWood', 0, 0.6, 0);
  return g;
}

export function roundTable() {
  const g = G();
  add(g, CY(1.2, 1.2, 0.18, 20), 'wood', 0, 2.6, 0);
  add(g, CY(0.15, 0.2, 2.5, 8), 'darkWood', 0, 1.3, 0);
  add(g, CY(0.6, 0.7, 0.15, 12), 'darkWood', 0, 0.08, 0);
  return g;
}

export function chair() {
  const g = G();
  add(g, BX(1.4, 0.15, 1.4), 'wood', 0, 1.6, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, BX(0.15, 1.6, 0.15), 'darkWood', sx * 0.6, 0.8, 0.1 + sz * 0.6);
  for (const sx of [-1, 1]) add(g, BX(0.15, 1.9, 0.15), 'darkWood', sx * 0.6, 2.55, -0.5);
  add(g, BX(1.35, 0.5, 0.1), 'wood', 0, 3.0, -0.5);
  add(g, BX(1.35, 0.2, 0.1), 'wood', 0, 2.2, -0.5);
  return g;
}

export function bench() {
  const g = G();
  add(g, BX(5.4, 0.22, 1.2, 3), 'planks', 0, 1.6, 0);
  for (const x of [-2.2, 2.2]) add(g, BX(0.25, 1.5, 1.0), 'darkWood', x, 0.75, 0);
  return g;
}

export function bed() {
  const g = G();
  add(g, BX(2.6, 0.9, 5.6, 3), 'darkWood', 0, 0.75, 0);
  add(g, BX(2.4, 0.5, 5.3, 3), 'linen', 0, 1.35, 0.05);
  add(g, BX(2.5, 0.25, 3.4, 3), 'redCloth', 0, 1.55, 0.95);
  add(g, BX(1.6, 0.35, 0.8, 3), 'linen', 0, 1.75, -2.1);
  add(g, BX(2.6, 2.8, 0.25, 3), 'darkWood', 0, 1.4, -2.8);
  add(g, BX(2.6, 1.6, 0.2, 3), 'darkWood', 0, 0.8, 2.8);
  for (const x of [-1.2, 1.2]) add(g, CY(0.12, 0.12, 3.4, 6), 'darkWood', x, 1.7, -2.8);
  return g;
}

export function bookshelf() {
  const g = G();
  const z = -H + 0.85 + WALL_T / 2;
  const rand = mulberry(31);
  add(g, BX(2.8, 7, 0.12), 'darkWood', 0, 3.5, z - 0.6);
  for (const x of [-1.35, 1.35]) add(g, BX(0.12, 7, 1.3), 'darkWood', x, 3.5, z);
  const books = ['redCloth', 'blueCloth', 'greenCloth', 'purpleCloth', 'canvas', 'parchment'];
  for (let s = 0; s < 5; s++) {
    const y = 0.25 + s * 1.5;
    add(g, BX(2.7, 0.12, 1.25), 'darkWood', 0, y, z);
    let x = -1.25;
    while (x < 1.15) {
      const w = 0.12 + rand() * 0.14, h = 0.8 + rand() * 0.45;
      if (rand() < 0.08) { x += 0.3; continue; }
      const b = add(g, BX(w, h, 0.85), books[Math.floor(rand() * books.length)], x + w / 2, y + 0.06 + h / 2, z + 0.1);
      if (rand() < 0.1) b.rotation.z = 0.25;
      x += w + 0.01;
    }
  }
  add(g, BX(2.8, 0.15, 1.35), 'darkWood', 0, 7.05, z);
  return g;
}

export function throne() {
  const g = G();
  add(g, BX(2.8, 0.5, 2.8, 3), 'paleStone', 0, 0.25, 0);
  add(g, BX(2.2, 1.4, 2.0), 'gold', 0, 1.2, 0);
  add(g, BX(1.9, 0.3, 1.8), 'redCloth', 0, 2.05, 0.05);
  add(g, BX(2.2, 4.8, 0.4), 'gold', 0, 3.6, -0.8);
  add(g, BX(1.6, 3.8, 0.1), 'redCloth', 0, 3.6, -0.56);
  for (const x of [-1, 1]) {
    add(g, BX(0.3, 0.9, 1.8), 'gold', x * 1.0, 2.4, 0);
    add(g, SP(0.22, 8, 6), 'ruby', x * 1.0, 6.2, -0.8);
  }
  add(g, CO(0.5, 0.9, 4), 'gold', 0, 6.4, -0.8, 0, PI / 4, 0);
  return g;
}

export function barrel() {
  const g = G();
  add(g, LA([[0, 0], [0.75, 0], [0.92, 0.9], [0.95, 1.6], [0.92, 2.3], [0.75, 3.1], [0, 3.1]], 14), 'wood', 0, 0, 0);
  for (const y of [0.35, 1.0, 2.1, 2.75]) {
    const r = y < 0.6 || y > 2.6 ? 0.82 : 0.95;
    add(g, TO(r, 0.05, 4, 20), 'blackIron', 0, y, 0, PI / 2, 0, 0);
  }
  add(g, CY(0.72, 0.72, 0.04, 14), 'darkWood', 0, 3.1, 0);
  return g;
}

export function crates() {
  const g = G();
  const crate = (s, x, y, z, r) => {
    const c = G();
    add(c, BX(s, s, s, 2), 'wood', 0, s / 2, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) add(c, BX(0.12, s + 0.02, 0.12), 'darkWood', a * (s / 2 - 0.05), s / 2, b * (s / 2 - 0.05));
    add(c, BX(s * 1.3, 0.14, 0.08), 'darkWood', 0, s / 2, s / 2 + 0.02, 0, 0, Math.PI / 4);
    c.position.set(x, y, z);
    c.rotation.y = r;
    g.add(c);
  };
  crate(1.9, -0.25, 0, 0.1, 0.1);
  crate(1.3, 0.3, 1.9, 0.0, -0.3);
  return g;
}

export function altar() {
  const g = G();
  add(g, BX(5.2, 0.4, 2.4, 3), 'darkStone', 0, 0.2, 0);
  add(g, BX(4.6, 2.6, 1.8, 3), 'paleStone', 0, 1.7, 0);
  add(g, BX(5.0, 0.3, 2.2, 3), 'paleStone', 0, 3.15, 0);
  add(g, BX(1.2, 0.04, 2.3), 'redCloth', 0, 3.31, 0);
  add(g, BX(1.2, 1.4, 0.03), 'redCloth', 0, 2.6, 1.13);
  add(g, ICO(0.35, 1, 0.05, 1), 'runeGlow', 0, 2.0, 0.92).scale.set(1, 1, 0.1);
  candle(g, -2.0, 3.3, 0, 0.7);
  candle(g, 2.0, 3.3, 0, 0.7);
  candle(g, -1.6, 3.3, 0.5, 0.4);
  candle(g, 1.6, 3.3, -0.4, 0.5);
  add(g, LA([[0, 0], [0.3, 0.05], [0.35, 0.3], [0.08, 0.4], [0.08, 0.7], [0.3, 0.75], [0.35, 1.0], [0, 1.0]], 12), 'gold', 0.6, 3.3, -0.3);
  return g;
}

export function weaponRack() {
  const g = G();
  const z = -H + WALL_T / 2 + 0.4;
  for (const x of [-1.2, 1.2]) add(g, BX(0.2, 5.5, 0.3), 'darkWood', x, 2.75, z);
  add(g, BX(2.6, 0.2, 0.6), 'darkWood', 0, 0.5, z + 0.1);
  add(g, BX(2.6, 0.2, 0.3), 'darkWood', 0, 4.6, z);
  const sword = (x, r) => {
    const s = G();
    add(s, BX(0.18, 3.2, 0.04), 'steel', 0, 2.3, 0);
    add(s, BX(0.8, 0.12, 0.12), 'brass', 0, 0.65, 0);
    add(s, CY(0.06, 0.06, 0.6, 6), 'darkWood', 0, 0.3, 0);
    add(s, SP(0.1, 6, 4), 'brass', 0, 0, 0);
    s.position.set(x, 0.6, z + 0.25);
    s.rotation.z = r;
    g.add(s);
  };
  sword(-0.7, 0.05); sword(-0.2, -0.05);
  add(g, CY(0.05, 0.05, 5.4, 6), 'darkWood', 0.35, 2.9, z + 0.25);
  add(g, CO(0.12, 0.6, 4), 'steel', 0.35, 5.9, z + 0.25);
  const axe = G();
  add(axe, CY(0.06, 0.06, 4, 6), 'darkWood', 0, 2.2, 0);
  add(axe, BX(0.7, 0.8, 0.06), 'steel', 0.3, 3.8, 0);
  axe.position.set(0.85, 0.5, z + 0.25);
  g.add(axe);
  return g;
}

export function cauldron() {
  const g = G();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * PI * 2;
    add(g, CY(0.08, 0.1, 1.4, 6), 'log', Math.cos(a) * 0.35, 0.2, Math.sin(a) * 0.35, 0, -a, PI / 2 - 0.2).rotation.order = 'YXZ';
  }
  add(g, SP(0.35, 8, 4), 'ember', 0, 0.15, 0).scale.y = 0.4;
  add(g, LA([[0.0, 0.0], [0.6, 0.05], [1.0, 0.5], [1.05, 1.0], [0.9, 1.45], [0.95, 1.55], [0.85, 1.55], [0.8, 1.45], [0.0, 1.4]], 16), 'blackIron', 0, 0.55, 0);
  add(g, CY(0.82, 0.82, 0.05, 16), 'cauldronBrew', 0, 1.95, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * PI * 2;
    add(g, BX(0.12, 0.6, 0.12), 'blackIron', Math.cos(a) * 0.6, 0.35, Math.sin(a) * 0.6);
  }
  const bub = dyn(G(), { bubble: true });
  for (let k = 0; k < 4; k++) add(bub, SP(0.1 + k * 0.03, 6, 4), 'cauldronBrew', Math.cos(k * 2) * 0.4, 0, Math.sin(k * 2) * 0.4);
  bub.position.y = 2.0;
  noShadow(bub);
  g.add(bub);
  return g;
}

export function anvil() {
  const g = G();
  add(g, CY(0.6, 0.7, 1.4, 10), 'log', 0, 0.7, 0);
  add(g, BX(0.5, 0.6, 0.4), 'blackIron', 0, 1.7, 0);
  add(g, BX(1.6, 0.4, 0.6), 'blackIron', 0, 2.2, 0);
  add(g, CO(0.3, 0.9, 6), 'blackIron', 1.2, 2.2, 0, 0, 0, -PI / 2);
  add(g, BX(0.15, 0.6, 0.12), 'darkWood', -0.4, 2.7, 0.15, 0, 0, 0.4);
  add(g, BX(0.35, 0.18, 0.18), 'blackIron', -0.55, 2.95, 0.15, 0, 0, 0.4);
  return g;
}

export function banner(m = 'redCloth') {
  const g = G();
  const z = -H + WALL_T / 2 + 0.08;
  add(g, CY(0.06, 0.06, 2.4, 6), 'brass', 0, 8.6, z + 0.05, 0, 0, PI / 2);
  for (const x of [-1.2, 1.2]) add(g, SP(0.1, 6, 4), 'brass', x, 8.6, z + 0.05);
  const s = new THREE.Shape();
  s.moveTo(-0.95, 0); s.lineTo(0.95, 0); s.lineTo(0.95, -5.0); s.lineTo(0, -4.3); s.lineTo(-0.95, -5.0); s.lineTo(-0.95, 0);
  add(g, new THREE.ShapeGeometry(s), m, 0, 8.6, z + 0.12);
  const emb = new THREE.Shape();
  emb.moveTo(0, 0.6); emb.lineTo(0.5, 0.15); emb.lineTo(0.35, -0.5); emb.lineTo(0, -0.75); emb.lineTo(-0.35, -0.5); emb.lineTo(-0.5, 0.15); emb.lineTo(0, 0.6);
  add(g, new THREE.ShapeGeometry(emb), 'gold', 0, 6.6, z + 0.14);
  add(g, BX(1.9, 0.1, 0.02), 'gold', 0, 8.3, z + 0.14);
  return g;
}

export function shieldTrophy() {
  const g = G();
  const z = -H + WALL_T / 2 + 0.15;
  for (const s of [-1, 1]) {
    const sw = G();
    add(sw, BX(0.15, 3.0, 0.04), 'steel', 0, 0, 0);
    add(sw, BX(0.7, 0.1, 0.1), 'brass', 0, -1.4, 0);
    add(sw, CY(0.05, 0.05, 0.5, 6), 'darkWood', 0, -1.7, 0);
    sw.position.set(0, 6.2, z);
    sw.rotation.z = s * 0.75;
    g.add(sw);
  }
  const sh = new THREE.Shape();
  sh.moveTo(-0.85, 0.9); sh.lineTo(0.85, 0.9); sh.lineTo(0.85, 0.0); sh.quadraticCurveTo(0.8, -0.9, 0, -1.3); sh.quadraticCurveTo(-0.8, -0.9, -0.85, 0.0); sh.lineTo(-0.85, 0.9);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 1 });
  add(g, geo, 'blueCloth', 0, 6.2, z + 0.05);
  add(g, BX(0.18, 2.0, 0.05), 'gold', 0, 6.1, z + 0.28);
  add(g, BX(1.5, 0.18, 0.05), 'gold', 0, 6.5, z + 0.28);
  return g;
}

export function rug() {
  const g = G();
  const geo = new THREE.BoxGeometry(2 * CELL - 0.5, 0.05, 3 * CELL - 0.6);
  add(g, geo, 'rug', 0, 0.03, 0);
  for (const z of [-1, 1]) for (let k = 0; k < 10; k++) add(g, BX(0.05, 0.02, 0.35), 'linen', -2.4 + k * 0.53, 0.03, z * (4.2 + 0.18));
  return g;
}

export function statue() {
  const g = G();
  add(g, BX(2.4, 1.2, 2.4, 3), 'darkStone', 0, 0.6, 0);
  add(g, BX(2.0, 0.25, 2.0, 3), 'paleStone', 0, 1.3, 0);
  const body = LA([[0, 0], [0.75, 0], [0.7, 1.2], [0.55, 2.6], [0.62, 3.4], [0.5, 3.9], [0.22, 4.1], [0, 4.1]], 14);
  add(g, body, 'paleStone', 0, 1.4, 0);
  add(g, SP(0.35, 12, 8), 'paleStone', 0, 5.8, 0);
  add(g, CY(0.36, 0.42, 0.45, 10), 'paleStone', 0, 5.9, 0);
  add(g, BX(0.18, 3.6, 0.1), 'paleStone', 0, 3.3, 0.7);
  add(g, BX(1.0, 0.15, 0.2), 'paleStone', 0, 5.0, 0.7);
  for (const x of [-0.6, 0.6]) add(g, CY(0.14, 0.14, 1.6, 6), 'paleStone', x * 0.6, 4.4, 0.45, 0.5, 0, -x * 0.2);
  return g;
}

export function pillar() {
  const g = G();
  add(g, BX(2.2, 0.5, 2.2, 3), 'paleStone', 0, 0.25, 0);
  add(g, CY(0.9, 0.95, 0.4, 16), 'paleStone', 0, 0.7, 0);
  const shaft = CY(0.72, 0.8, WALL_H - 1.9, 16, 1);
  add(g, shaft, 'paleStone', 0, WALL_H / 2 - 0.05, 0);
  add(g, CY(0.95, 0.75, 0.5, 16), 'paleStone', 0, WALL_H - 0.95, 0);
  add(g, BX(2.2, 0.45, 2.2, 3), 'paleStone', 0, WALL_H - 0.45, 0);
  return g;
}

export function stairsUp() {
  const g = G();
  const steps = 10, run = (2 * CELL) / steps, rise = 0.7;
  for (let k = 0; k < steps; k++) add(g, BX(CELL - 0.2, rise * (k + 1), run, 3), 'stoneWall', 0, rise * (k + 1) / 2, CELL - run / 2 - k * run);
  for (const x of [-1, 1]) add(g, BX(0.2, 1, 2 * CELL), 'darkStone', x * (H - 0.1), rise * steps / 2 + 1, 0, -Math.atan(rise / run) * 0, 0, 0).scale.y = 1;
  return g;
}

export function trapdoor() {
  const g = G();
  add(g, BX(2.4, 0.08, 2.4, 3), 'planks', 0, 0.04, 0);
  add(g, BX(2.5, 0.06, 0.2), 'blackIron', 0, 0.08, -0.7);
  add(g, BX(2.5, 0.06, 0.2), 'blackIron', 0, 0.08, 0.7);
  add(g, TO(0.2, 0.04, 4, 10), 'blackIron', 0, 0.1, 1.0, PI / 2, 0, 0);
  return g;
}

export function well() {
  const g = G();
  add(g, LA([[1.05, 0], [1.1, 0.2], [1.1, 2.4], [1.2, 2.5], [1.2, 2.7], [0.85, 2.7], [0.85, 0.3], [0, 0.3]], 18), 'stone', 0, 0, 0);
  add(g, CY(0.85, 0.85, 0.02, 16), 'pitBlack', 0, 2.2, 0);
  for (const x of [-1.05, 1.05]) add(g, BX(0.22, 5.2, 0.22), 'darkWood', x, 2.6, 0);
  add(g, CY(0.1, 0.1, 2.3, 6), 'darkWood', 0, 4.2, 0, 0, 0, PI / 2);
  add(g, CY(0.02, 0.02, 1.2, 4), 'rope', 0, 3.5, 0);
  add(g, CY(0.22, 0.18, 0.4, 8), 'wood', 0, 2.8, 0);
  const roof = G();
  add(roof, BX(3.0, 0.12, 1.6, 3), 'planks', 0, 0, 0.55, 0.65, 0, 0);
  add(roof, BX(3.0, 0.12, 1.6, 3), 'planks', 0, 0, -0.55, -0.65, 0, 0);
  roof.position.y = 5.4;
  g.add(roof);
  return g;
}

export function fountain() {
  const g = G();
  add(g, LA([[2.7, 0], [2.8, 0.1], [2.8, 1.3], [2.95, 1.4], [2.95, 1.6], [2.5, 1.6], [2.5, 0.25], [0, 0.25]], 28), 'paleStone', 0, 0, 0);
  const w = add(g, CY(2.5, 2.5, 0.04, 28), 'water', 0, 1.25, 0);
  w.userData.noShadow = true;
  add(g, LA([[0.5, 0], [0.35, 1.5], [0.25, 2.5], [1.1, 2.6], [1.15, 2.85], [0.2, 2.85], [0.16, 3.8], [0.6, 3.9], [0.62, 4.05], [0.1, 4.05], [0.1, 4.6], [0.25, 4.8], [0, 5.0]], 20), 'paleStone', 0, 0.25, 0);
  const s = dyn(G(), { spout: true });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * PI * 2;
    const st = add(s, CY(0.02, 0.04, 1.4, 4), 'water', Math.cos(a) * 1.05, 2.4, Math.sin(a) * 1.05);
    st.userData.noShadow = true;
  }
  g.add(noShadow(s));
  return g;
}

export function sarcophagus() {
  const g = G();
  add(g, BX(2.5, 2.4, 5.6, 3), 'darkStone', 0, 1.2, 0);
  add(g, BX(2.7, 0.35, 5.8, 3), 'paleStone', 0, 2.55, 0);
  const fig = G();
  add(fig, LA([[0, 0], [0.55, 0], [0.5, 2.6], [0.35, 3.2], [0, 3.3]], 10), 'paleStone', 0, 0, 0);
  add(fig, SP(0.3, 10, 8), 'paleStone', 0, 3.6, 0);
  fig.rotation.x = PI / 2;
  fig.position.set(0, 2.85, 2.0);
  fig.scale.set(1, 1, 0.45);
  g.add(fig);
  add(g, BX(0.12, 2.2, 0.1), 'paleStone', 0, 2.95, -0.2, PI / 2, 0, 0);
  return g;
}

export function cage() {
  const g = G();
  add(g, CY(1.2, 1.2, 0.15, 12), 'blackIron', 0, 0.08, 0);
  add(g, CY(1.2, 1.2, 0.12, 12), 'blackIron', 0, 6, 0);
  add(g, CO(1.25, 1.0, 12), 'blackIron', 0, 6.55, 0);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * PI * 2;
    add(g, CY(0.04, 0.04, 6, 4), 'blackIron', Math.cos(a) * 1.15, 3, Math.sin(a) * 1.15);
  }
  add(g, TO(1.15, 0.05, 4, 20), 'blackIron', 0, 3, 0, PI / 2, 0, 0);
  skullAt(g, 0.3, 0.2, 0.2, 0.9);
  add(g, CY(0.05, 0.05, 1.3, 5), 'bone', -0.3, 0.2, -0.2, 0, 0.7, PI / 2);
  return g;
}

export function tent() {
  const g = G();
  const shape = new THREE.Shape();
  shape.moveTo(-2.6, 0); shape.lineTo(0, 4.6); shape.lineTo(2.6, 0); shape.lineTo(-2.6, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 5.2, bevelEnabled: false });
  geo.translate(0, 0, -2.6);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  add(g, geo, 'canvas', 0, 0, 0);
  add(g, new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.9, 0); s.lineTo(0, 2.6); s.lineTo(0.9, 0); s.lineTo(-0.9, 0); return s; })()), 'pitBlack', 0, 0, 2.62);
  add(g, CY(0.08, 0.08, 5.2, 6), 'darkWood', 0, 2.6, 2.75);
  add(g, CY(0.08, 0.08, 5.2, 6), 'darkWood', 0, 2.6, -2.75);
  return g;
}

function skullAt(g, x, y, z, s = 1) {
  const k = G();
  add(k, SP(0.22, 10, 8), 'bone', 0, 0.2, 0);
  add(k, BX(0.24, 0.16, 0.2), 'bone', 0, 0.06, 0.08);
  add(k, SP(0.05, 6, 4), 'pitBlack', -0.08, 0.2, 0.18);
  add(k, SP(0.05, 6, 4), 'pitBlack', 0.08, 0.2, 0.18);
  k.position.set(x, y - 0.05, z);
  k.scale.setScalar(s);
  k.rotation.y = x;
  g.add(k);
}

export function bones() {
  const g = G();
  skullAt(g, 0.2, 0, 0.3, 1.1);
  const rand = mulberry(3);
  for (let k = 0; k < 6; k++) {
    const b = add(g, CY(0.05, 0.05, 0.7 + rand() * 0.6, 5), 'bone', (rand() - 0.5) * 1.8, 0.06, (rand() - 0.5) * 1.8, PI / 2, rand() * 3, 0);
    b.rotation.order = 'YXZ';
  }
  add(g, TO(0.3, 0.04, 4, 10, PI), 'bone', -0.6, 0.06, -0.4, -PI / 2, 0, 0.4);
  return g;
}

export function cobweb() {
  const g = G();
  const web = G();
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(1.8, 0); s.quadraticCurveTo(0.8, -0.8, 0, -1.8); s.lineTo(0, 0);
  add(web, new THREE.ShapeGeometry(s), 'web', 0, 0, 0);
  web.position.set(-H + WALL_T / 2 + 0.02, WALL_H - 0.05, -H + WALL_T / 2 + 0.02);
  web.rotation.set(0, PI / 4, 0);
  const inner = web.children[0];
  inner.rotation.set(0, 0, 0);
  web.lookAt(0, WALL_H - 1.2, 0);
  noShadow(web);
  g.add(web);
  return g;
}

export function spikeTrap() {
  const g = G();
  add(g, BX(2.6, 0.12, 2.6, 3), 'blackIron', 0, 0.06, 0);
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) add(g, CO(0.08, 0.5, 4), 'steel', -1.0 + a * 0.5, 0.35, -1.0 + b * 0.5);
  return g;
}

export function lectern() {
  const g = G();
  add(g, CY(0.6, 0.7, 0.2, 8), 'darkWood', 0, 0.1, 0);
  add(g, CY(0.15, 0.2, 3.2, 8), 'darkWood', 0, 1.7, 0);
  add(g, BX(1.6, 0.12, 1.1), 'darkWood', 0, 3.4, 0.1, -0.4, 0, 0);
  const book = G();
  add(book, BX(0.75, 0.06, 1.0), 'parchment', -0.38, 0, 0, 0, 0, 0.08);
  add(book, BX(0.75, 0.06, 1.0), 'parchment', 0.38, 0, 0, 0, 0, -0.08);
  add(book, BX(1.6, 0.04, 1.05), 'redCloth', 0, -0.05, 0);
  book.position.set(0, 3.55, 0.15);
  book.rotation.x = -0.4;
  g.add(book);
  add(g, SP(0.12, 8, 6), 'runeGlow', 0.3, 3.75, 0.1);
  return g;
}

export function alchemyTable() {
  const g = table(2);
  const y = 2.7;
  add(g, LA([[0, 0], [0.35, 0.05], [0.4, 0.4], [0.1, 0.7], [0.08, 1.1], [0.12, 1.15], [0, 1.15]], 10), 'glass', -1.8, y, 0.1);
  add(g, SP(0.33, 10, 8), 'potionGreen', -1.8, y + 0.3, 0.1);
  add(g, CY(0.15, 0.15, 0.6, 8), 'potionBlue', -0.9, y + 0.3, 0.5);
  add(g, CY(0.12, 0.12, 0.8, 8), 'potionRed', -0.5, y + 0.4, -0.3);
  add(g, BX(1.0, 0.1, 0.8), 'parchment', 0.8, y + 0.05, 0.2, 0, 0.3, 0);
  add(g, SP(0.3, 10, 8), 'bone', 1.9, y + 0.3, -0.2);
  candle(g, 2.3, y, 0.6, 0.5);
  add(g, CY(0.06, 0.06, 0.8, 6), 'brass', 0.0, y + 0.4, -0.5);
  add(g, TO(0.25, 0.03, 4, 12), 'brass', 0.0, y + 0.65, -0.5, PI / 2, 0, 0);
  return g;
}

export function bedroll() {
  const g = G();
  add(g, BX(2.0, 0.25, 5.0, 3), 'greenCloth', 0, 0.13, 0.3);
  add(g, CY(0.35, 0.35, 2.0, 10), 'greenCloth', 0, 0.35, -2.4, 0, 0, PI / 2);
  add(g, BX(1.0, 0.8, 0.6), 'canvas', 0.9, 0.4, -2.4);
  return g;
}

export function hayBale() {
  const g = G();
  add(g, BX(2.4, 1.4, 1.6, 2), 'straw', 0, 0.7, 0);
  add(g, BX(2.42, 0.08, 1.62), 'rope', 0.5, 0.7, 0, 0, 0, PI / 2).scale.set(1, 1, 1);
  return g;
}

// ======================= LOOT =======================
export function chest(ornate = false, mimic = false) {
  const g = G();
  const bodyMat = ornate ? 'darkWood' : 'wood';
  const trim = ornate ? 'gold' : 'blackIron';
  add(g, BX(2.4, 1.3, 1.6, 2), bodyMat, 0, 0.65, 0);
  for (const x of [-1.0, 1.0]) add(g, BX(0.16, 1.32, 1.64), trim, x, 0.65, 0);
  add(g, BX(2.44, 0.14, 1.64), trim, 0, 0.1, 0);
  if (!mimic) add(g, BX(2.3, 0.15, 1.5), 'gold', 0, 1.25, 0);
  if (!mimic) for (let k = 0; k < 8; k++) add(g, CY(0.12, 0.12, 0.04, 8), 'gold', -0.8 + k * 0.23, 1.33 + (k % 2) * 0.03, (k % 3) * 0.3 - 0.3, 0.3, 0, 0.2 * k);
  const lid = dyn(G(), { lid: true, mimic });
  lid.position.set(0, 1.3, -0.8);
  const lidBody = G();
  const dome = (r, len) => {
    const geo = new THREE.CylinderGeometry(r, r, len, 14, 1, false, 0, PI);
    geo.rotateZ(PI / 2);
    geo.scale(1, 0.55, 1);
    return geo;
  };
  add(lidBody, dome(0.8, 2.4), bodyMat, 0, 0, 0.8);
  for (const x of [-1.0, 1.0]) add(lidBody, dome(0.83, 0.16), trim, x, 0, 0.8);
  add(lidBody, BX(0.3, 0.4, 0.1), trim, 0, -0.05, 1.62);
  if (ornate) add(lidBody, SP(0.12, 8, 6), 'ruby', 0, 0.15, 1.65);
  if (mimic) {
    for (let k = 0; k < 9; k++) add(lidBody, CO(0.08, 0.35, 4), 'teeth', -1.0 + k * 0.25, -0.12, 1.5, PI, 0, 0);
    add(lidBody, BX(0.6, 0.08, 1.2), 'mimicTongue', 0, -0.2, 0.9);
  }
  lid.add(lidBody);
  g.add(lid);
  if (mimic) for (let k = 0; k < 9; k++) add(g, CO(0.08, 0.3, 4), 'teeth', -1.0 + k * 0.25, 1.42, 0.7);
  return g;
}

export function coinPile() {
  const g = G();
  add(g, LA([[0, 0], [0.9, 0], [0.7, 0.2], [0.3, 0.45], [0, 0.5]], 14), 'gold', 0, 0, 0);
  const rand = mulberry(5);
  for (let k = 0; k < 14; k++) add(g, CY(0.12, 0.12, 0.03, 8), 'gold', (rand() - 0.5) * 1.8, 0.03 + rand() * 0.25, (rand() - 0.5) * 1.8, rand(), 0, rand());
  return g;
}

export function gems() {
  const g = G();
  const m = ['ruby', 'emerald', 'sapphire', 'amethyst'];
  const rand = mulberry(8);
  add(g, BX(0.9, 0.5, 0.7), 'darkWood', 0, 0.25, 0);
  for (let k = 0; k < 10; k++) {
    const gm = add(g, new THREE.OctahedronGeometry(0.12 + rand() * 0.1, 0), m[k % 4], (rand() - 0.5) * 1.5, 0.1 + rand() * 0.1, (rand() - 0.5) * 1.5);
    gm.rotation.set(rand(), rand(), rand());
  }
  for (let k = 0; k < 4; k++) add(g, new THREE.OctahedronGeometry(0.13, 0), m[k], (k - 1.5) * 0.18, 0.6, 0);
  return g;
}

export function potions() {
  const root = G();
  const g = dyn(G(), { pickup: true }); // dynamic so it can vanish when drunk in walk mode
  root.add(g);
  const bottle = (x, z, m, s) => {
    add(g, SP(0.22 * s, 10, 8), m, x, 0.24 * s, z);
    add(g, CY(0.07 * s, 0.07 * s, 0.3 * s, 6), 'glass', x, 0.55 * s, z);
    add(g, CY(0.08 * s, 0.07 * s, 0.1 * s, 6), 'wood', x, 0.72 * s, z);
  };
  bottle(-0.3, 0, 'potionRed', 1.1);
  bottle(0.2, 0.25, 'potionBlue', 0.9);
  add(g, CY(0.13, 0.13, 0.7, 8), 'potionGreen', 0.25, 0.35, -0.25);
  add(g, CY(0.06, 0.06, 0.15, 6), 'wood', 0.25, 0.78, -0.25);
  return root;
}

// first-person hands: torch on the left, sword on the right
export function heldGear() {
  const g = G();
  const torch = G();
  add(torch, CY(0.035, 0.03, 0.9, 6), 'darkWood', 0, 0, 0);
  add(torch, CY(0.06, 0.045, 0.16, 6), 'rope', 0, 0.42, 0);
  const f = flame(0.32);
  f.position.y = 0.5;
  torch.add(f);
  torch.scale.setScalar(0.55);
  torch.position.set(-0.62, -0.5, -1.35);
  torch.rotation.set(0.3, 0, 0.22);
  torch.name = 'torch';
  const sword = G();
  add(sword, BX(0.06, 1.1, 0.015), 'steel', 0, 0.62, 0);
  add(sword, BX(0.32, 0.04, 0.05), 'brass', 0, 0.06, 0);
  add(sword, CY(0.025, 0.025, 0.2, 6), 'leather', 0, -0.06, 0);
  add(sword, SP(0.035, 6, 4), 'brass', 0, -0.17, 0);
  sword.scale.setScalar(0.6);
  sword.position.set(0.64, -0.6, -1.35);
  sword.rotation.set(-0.75, 0.15, -0.45);
  sword.name = 'sword';
  g.add(torch, sword);
  // drawn last and on top, so the hands never clip into walls
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.renderOrder = 20;
      o.material = o.material.clone();
      o.material.depthTest = false;
      o.material.depthWrite = false;
    }
  });
  return g;
}

export function hoard() {
  const g = G();
  add(g, LA([[0, 0], [2.8, 0], [2.3, 0.4], [1.4, 1.1], [0.6, 1.5], [0, 1.6]], 22), 'gold', 0, 0, 0);
  const rand = mulberry(17);
  for (let k = 0; k < 40; k++) {
    const a = rand() * PI * 2, r = rand() * 2.6;
    const y = Math.max(0.03, 1.6 * (1 - r / 2.8) - 0.05);
    add(g, CY(0.13, 0.13, 0.03, 8), 'gold', Math.cos(a) * r, y, Math.sin(a) * r, rand(), 0, rand());
  }
  const m = ['ruby', 'emerald', 'sapphire', 'amethyst'];
  for (let k = 0; k < 10; k++) {
    const a = rand() * PI * 2, r = rand() * 2.2;
    add(g, new THREE.OctahedronGeometry(0.15, 0), m[k % 4], Math.cos(a) * r, 1.6 * (1 - r / 2.8), Math.sin(a) * r);
  }
  add(g, LA([[0, 0], [0.25, 0.04], [0.06, 0.15], [0.06, 0.5], [0.3, 0.6], [0.35, 0.9], [0, 0.85]], 12), 'gold', 0.9, 0.8, 0.6, 0.3, 0, 0.2);
  const crown = G();
  add(crown, CY(0.35, 0.35, 0.25, 12, 1, true), 'gold', 0, 0, 0);
  for (let k = 0; k < 6; k++) add(crown, CO(0.07, 0.25, 4), 'gold', Math.cos(k) * 0.35, 0.22, Math.sin(k) * 0.35);
  crown.position.set(-0.3, 1.65, -0.2);
  crown.rotation.z = 0.2;
  g.add(crown);
  return g;
}

export function crownPedestal() {
  const g = G();
  add(g, BX(1.4, 0.3, 1.4), 'darkStone', 0, 0.15, 0);
  add(g, CY(0.45, 0.5, 2.6, 10), 'paleStone', 0, 1.6, 0);
  add(g, BX(1.2, 0.25, 1.2), 'paleStone', 0, 3.0, 0);
  add(g, BX(0.9, 0.08, 0.9), 'redCloth', 0, 3.16, 0);
  const crown = G();
  const band = add(crown, new THREE.CylinderGeometry(0.38, 0.34, 0.3, 14, 1, true), 'gold', 0, 0.15, 0);
  band.material = band.material.clone();
  band.material.side = THREE.DoubleSide;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * PI * 2;
    add(crown, CO(0.08, 0.3, 4), 'gold', Math.cos(a) * 0.37, 0.43, Math.sin(a) * 0.37);
    add(crown, SP(0.05, 6, 4), k % 2 ? 'sapphire' : 'ruby', Math.cos(a) * 0.38, 0.15, Math.sin(a) * 0.38);
  }
  crown.position.y = 3.2;
  g.add(crown);
  return g;
}

export function swordInStone() {
  const g = G();
  add(g, ICO(1.1, 1, 0.22, 21), 'rock', 0, 0.5, 0).scale.set(1.1, 0.75, 1);
  const s = G();
  add(s, BX(0.22, 3.0, 0.05), 'steel', 0, 0, 0);
  add(s, BX(1.0, 0.15, 0.18), 'gold', 0, 1.55, 0);
  add(s, CY(0.07, 0.07, 0.8, 6), 'blueCloth', 0, 2.0, 0);
  add(s, SP(0.14, 8, 6), 'sapphire', 0, 2.45, 0);
  s.position.set(0, 1.9, 0);
  s.rotation.z = 0.08;
  g.add(s);
  return g;
}

export function idol() {
  const g = G();
  add(g, BX(0.6, 0.2, 0.6), 'gold', 0, 0.1, 0);
  add(g, LA([[0, 0], [0.25, 0], [0.22, 0.4], [0.28, 0.6], [0.15, 0.75], [0, 0.78]], 10), 'gold', 0, 0.2, 0);
  add(g, SP(0.17, 10, 8), 'gold', 0, 1.12, 0);
  add(g, SP(0.04, 6, 4), 'emerald', -0.06, 1.15, 0.15);
  add(g, SP(0.04, 6, 4), 'emerald', 0.06, 1.15, 0.15);
  return g;
}

export function urn() {
  const g = G();
  add(g, LA([[0, 0], [0.4, 0], [0.7, 0.6], [0.72, 1.0], [0.5, 1.5], [0.32, 1.7], [0.4, 1.9], [0.0, 1.9]], 14), 'sandstone', 0, 0, 0);
  add(g, TO(0.7, 0.03, 4, 20), 'gold', 0, 0.9, 0, PI / 2, 0, 0);
  return g;
}

// ======================= NATURE =======================
export function oak(seed = 1, leafMat = 'leaf') {
  const g = G();
  const rand = mulberry(seed);
  add(g, CY(0.45, 0.75, 7, 8), 'bark', 0, 3.5, 0);
  for (let k = 0; k < 3; k++) {
    const a = rand() * PI * 2;
    add(g, CY(0.18, 0.3, 3.5, 6), 'bark', Math.cos(a) * 0.8, 6.5, Math.sin(a) * 0.8, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
  }
  for (let k = 0; k < 7; k++) {
    const a = rand() * PI * 2, r = k === 0 ? 0 : 1.8 + rand() * 1.4;
    add(g, ICO(2.2 + rand() * 1.0, 1, 0.18, k + seed), leafMat, Math.cos(a) * r, 8.5 + rand() * 2.5 - (k === 0 ? -1.5 : 0), Math.sin(a) * r);
  }
  return g;
}

export function pine(seed = 1, leafMat = 'darkLeaf', h = 16) {
  const g = G();
  const rand = mulberry(seed);
  add(g, CY(0.3, 0.5, h * 0.35, 7), 'bark', 0, h * 0.175, 0);
  const tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers;
    const r = (1 - t) * 3.6 + 0.6;
    const c = add(g, CO(r, h * 0.36, 9), leafMat, 0, h * 0.25 + t * h * 0.62 + h * 0.18, 0);
    c.rotation.y = rand() * 3;
  }
  return g;
}

export function deadTree(seed = 1) {
  const g = G();
  const rand = mulberry(seed);
  add(g, CY(0.3, 0.6, 8, 7), 'deadBark', 0, 4, 0, 0.05, 0, 0.06);
  for (let k = 0; k < 5; k++) {
    const a = rand() * PI * 2, y = 4 + rand() * 4, len = 2 + rand() * 3;
    const b = add(g, CY(0.06, 0.2, len, 5), 'deadBark', Math.cos(a) * len * 0.35, y + len * 0.3, Math.sin(a) * len * 0.35);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
  }
  return g;
}

export function palm(seed = 1) {
  const g = G();
  const rand = mulberry(seed);
  const lean = 0.25;
  for (let k = 0; k < 8; k++) add(g, CY(0.32 - k * 0.015, 0.36 - k * 0.015, 1.5, 7), 'bark', k * k * 0.03, 0.75 + k * 1.45, 0, 0, 0, -lean * (k / 8));
  const top = new THREE.Vector3(2.0, 12, 0);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * PI * 2 + rand() * 0.3;
    const f = add(g, new THREE.PlaneGeometry(1.2, 5.5, 1, 4), 'palmLeaf', top.x, top.y, top.z);
    const p = f.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -(((y + 2.75) / 5.5) ** 2) * 1.8); }
    f.geometry.computeVertexNormals();
    f.geometry.translate(0, 2.75, 0);
    f.rotation.set(-1.0, a, 0, 'YXZ');
  }
  return g;
}

export function cactus(seed = 1) {
  const g = G();
  const rand = mulberry(seed);
  const h = 5 + rand() * 4;
  add(g, CY(0.55, 0.6, h, 10), 'cactus', 0, h / 2, 0);
  add(g, SP(0.55, 10, 6), 'cactus', 0, h, 0);
  for (let k = 0; k < 2; k++) {
    const s = k ? 1 : -1, y = 2 + rand() * (h - 4);
    add(g, CY(0.35, 0.35, 1.2, 8), 'cactus', s * 0.9, y, 0, 0, 0, PI / 2);
    add(g, CY(0.35, 0.35, 2.2, 8), 'cactus', s * 1.4, y + 1.1, 0);
    add(g, SP(0.35, 8, 6), 'cactus', s * 1.4, y + 2.2, 0);
  }
  return g;
}

export function boulder(seed = 1, m = 'rock') {
  const g = G();
  add(g, ICO(1.3, 1, 0.3, seed), m, 0, 0.6, 0).scale.set(1, 0.75, 0.9);
  return g;
}

export function rocks(seed = 2, m = 'rock') {
  const g = G();
  const rand = mulberry(seed);
  for (let k = 0; k < 5; k++) add(g, ICO(0.25 + rand() * 0.3, 0, 0.35, k + seed), m, (rand() - 0.5) * 2, 0.1, (rand() - 0.5) * 2).scale.y = 0.6;
  return g;
}

export function bush(seed = 1, m = 'leaf') {
  const g = G();
  const rand = mulberry(seed);
  for (let k = 0; k < 5; k++) add(g, ICO(0.7 + rand() * 0.5, 1, 0.2, k + seed), m, (rand() - 0.5) * 1.6, 0.7 + rand() * 0.4, (rand() - 0.5) * 1.6);
  return g;
}

export function redMushrooms() {
  const g = G();
  const rand = mulberry(41);
  for (let k = 0; k < 6; k++) {
    const x = (rand() - 0.5) * 2, z = (rand() - 0.5) * 2, h = 0.3 + rand() * 0.5, r = 0.2 + rand() * 0.25;
    add(g, CY(0.06, 0.09, h, 6), 'bone', x, h / 2, z);
    add(g, SP(r, 10, 6, 0, PI * 2, 0, PI / 2), 'mushroomRed', x, h - 0.02, z);
  }
  return g;
}

export function standingStone(seed = 3) {
  const g = G();
  const st = add(g, BX(1.4, 8, 0.9, 3), 'mossRock', 0, 3.8, 0);
  st.rotation.set(0.04, 0.2, -0.05);
  const p = st.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.75); }
  st.geometry.computeVertexNormals();
  add(g, ICO(0.5, 0, 0.3, seed), 'mossRock', 0.8, 0.2, 0.5).scale.y = 0.5;
  add(g, BX(0.6, 0.6, 0.05), 'runeGlow', 0, 4.5, 0.47);
  return g;
}

export function ruinedColumn() {
  const g = G();
  add(g, BX(2.2, 0.5, 2.2, 3), 'paleStone', 0, 0.25, 0);
  const shaft = new THREE.CylinderGeometry(0.72, 0.8, 4.2, 16, 4);
  const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 2.0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 4) * 0.5 - 0.3);
  shaft.computeVertexNormals();
  add(g, shaft, 'paleStone', 0, 2.6, 0);
  add(g, CY(0.75, 0.75, 1.6, 16), 'paleStone', 1.2, 0.72, 0.7, PI / 2, 0.6, 0);
  return g;
}

export function gravestone(seed = 1) {
  const g = G();
  const s = new THREE.Shape();
  s.moveTo(-0.8, 0); s.lineTo(0.8, 0); s.lineTo(0.8, 2.2); s.absarc(0, 2.2, 0.8, 0, PI, false); s.lineTo(-0.8, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  geo.translate(0, 0, -0.17);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  add(g, geo, 'mossRock', 0, 0, -0.4, 0, 0, (seed % 3 - 1) * 0.06);
  add(g, BX(0.12, 0.9, 0.05), 'darkStone', 0, 2.1, -0.2);
  add(g, BX(0.6, 0.12, 0.05), 'darkStone', 0, 2.3, -0.2);
  add(g, BX(1.4, 0.15, 2.4), 'dirt', 0, 0.07, 0.8);
  return g;
}

export function stump() {
  const g = G();
  add(g, CY(0.8, 1.0, 1.2, 10), 'bark', 0, 0.6, 0);
  add(g, CY(0.78, 0.78, 0.02, 10), 'wood', 0, 1.21, 0);
  add(g, BX(0.12, 0.8, 0.12), 'darkWood', 0.2, 1.4, 0, 0, 0, 0.3);
  add(g, BX(0.6, 0.35, 0.05), 'steel', 0.4, 1.75, 0, 0, 0, 0.3);
  return g;
}

export function logPile() {
  const g = G();
  for (let k = 0; k < 3; k++) add(g, CY(0.35, 0.35, 2.6, 8), 'log', 0, 0.35, -0.8 + k * 0.7, 0, 0, PI / 2);
  for (let k = 0; k < 2; k++) add(g, CY(0.35, 0.35, 2.6, 8), 'log', 0, 0.95, -0.45 + k * 0.7, 0, 0, PI / 2);
  add(g, CY(0.35, 0.35, 2.6, 8), 'log', 0, 1.55, -0.1, 0, 0, PI / 2);
  return g;
}

export function reeds(seed = 4) {
  const g = G();
  const rand = mulberry(seed);
  for (let k = 0; k < 14; k++) {
    const h = 1.5 + rand() * 2.5;
    const r = add(g, CY(0.02, 0.05, h, 4), 'cactus', (rand() - 0.5) * 2.4, h / 2, (rand() - 0.5) * 2.4);
    r.rotation.set((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3);
    if (rand() < 0.4) add(g, CY(0.08, 0.08, 0.5, 6), 'darkWood', r.position.x, h * 0.85, r.position.z);
  }
  return g;
}

export function flowers(seed = 9) {
  const g = G();
  const rand = mulberry(seed);
  const cols = [0xf2d04a, 0xe86a8a, 0xffffff, 0x9a7aff];
  const mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  for (let k = 0; k < 12; k++) {
    const x = (rand() - 0.5) * 2.4, z = (rand() - 0.5) * 2.4, h = 0.4 + rand() * 0.5;
    add(g, CY(0.015, 0.015, h, 3), 'leaf', x, h / 2, z);
    add(g, SP(0.09, 6, 4), mats[k % 4], x, h, z);
  }
  return g;
}

export function grassTuft(seed = 1, m = 'leaf') {
  const g = G();
  const rand = mulberry(seed);
  for (let k = 0; k < 5; k++) {
    const b = add(g, CO(0.08, 0.9 + rand() * 0.6, 3), m, (rand() - 0.5) * 0.5, 0.45, (rand() - 0.5) * 0.5);
    b.rotation.set((rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6);
  }
  return g;
}

// helpers for direction constants used by catalog
export const HALF = H;

// ======================= CREATURES =======================
// Each creature is one dynamic group (it turns to watch the player in walk mode).
function creature(scale = 1) {
  const g = G();
  const body = dyn(G(), { creature: true });
  body.scale.setScalar(scale);
  g.add(body);
  return [g, body];
}
function limb(parent, m, x, y, z, len, r = 0.12, rx = 0, rz = 0) {
  const l = G();
  add(l, CY(r, r * 0.85, len, 6), m, 0, -len / 2, 0);
  l.position.set(x, y, z);
  l.rotation.set(rx, 0, rz);
  parent.add(l);
  return l;
}

export function skeletonWarrior() {
  const [g, b] = creature();
  limb(b, 'bone', -0.25, 2.7, 0, 2.6, 0.07, 0, 0.05);
  limb(b, 'bone', 0.25, 2.7, 0, 2.6, 0.07, 0, -0.05);
  add(b, BX(0.7, 0.2, 0.35), 'bone', 0, 2.75, 0);
  add(b, CY(0.06, 0.06, 1.6, 5), 'bone', 0, 3.6, -0.1);
  for (let k = 0; k < 4; k++) add(b, TO(0.32 - k * 0.03, 0.035, 4, 12, PI * 1.4), 'bone', 0, 3.3 + k * 0.28, 0.02, PI / 2, 0, PI * 0.8);
  add(b, BX(1.0, 0.12, 0.3), 'bone', 0, 4.4, 0);
  limb(b, 'bone', -0.55, 4.4, 0, 2.0, 0.06, -0.4, 0.15);
  limb(b, 'bone', 0.55, 4.4, 0, 2.0, 0.06, -0.6, -0.1);
  add(b, SP(0.36, 10, 8), 'bone', 0, 4.95, 0);
  add(b, BX(0.4, 0.22, 0.3), 'bone', 0, 4.7, 0.12);
  add(b, SP(0.08, 6, 4), 'eyeRed', -0.13, 5.0, 0.3);
  add(b, SP(0.08, 6, 4), 'eyeRed', 0.13, 5.0, 0.3);
  const sw = G();
  add(sw, BX(0.12, 2.4, 0.04), 'iron', 0, 1.2, 0);
  add(sw, BX(0.6, 0.1, 0.1), 'blackIron', 0, 0, 0);
  sw.position.set(0.75, 2.9, 1.1); sw.rotation.x = 1.1;
  b.add(sw);
  const sh = add(b, CY(0.75, 0.75, 0.1, 12), 'darkWood', -0.75, 3.4, 0.65, PI / 2, 0, 0.2);
  void sh;
  add(b, SP(0.15, 8, 6), 'blackIron', -0.77, 3.4, 0.72);
  return g;
}

export function goblin() {
  const [g, b] = creature();
  limb(b, 'goblinSkin', -0.2, 1.4, 0, 1.4, 0.11);
  limb(b, 'goblinSkin', 0.2, 1.4, 0, 1.4, 0.11);
  add(b, CY(0.42, 0.5, 1.2, 8), 'leather', 0, 1.9, 0);
  add(b, SP(0.42, 10, 8), 'goblinSkin', 0, 2.85, 0.05);
  add(b, CO(0.12, 0.45, 5), 'goblinSkin', 0, 2.8, 0.5, PI / 2, 0, 0);
  add(b, CO(0.13, 0.8, 4), 'goblinSkin', -0.55, 3.0, 0, 0, 0, PI / 2 + 0.3);
  add(b, CO(0.13, 0.8, 4), 'goblinSkin', 0.55, 3.0, 0, 0, 0, -PI / 2 - 0.3);
  add(b, SP(0.07, 6, 4), 'eyeGreen', -0.15, 2.95, 0.38);
  add(b, SP(0.07, 6, 4), 'eyeGreen', 0.15, 2.95, 0.38);
  limb(b, 'goblinSkin', -0.5, 2.4, 0, 1.0, 0.08, -0.5, 0.3);
  const arm = limb(b, 'goblinSkin', 0.5, 2.4, 0, 1.0, 0.08, -1.0, -0.2);
  add(arm, BX(0.08, 0.9, 0.03), 'steel', 0, -1.4, 0);
  return g;
}

export function orc() {
  const [g, b] = creature();
  limb(b, 'leather', -0.35, 2.6, 0, 2.6, 0.2);
  limb(b, 'leather', 0.35, 2.6, 0, 2.6, 0.2);
  add(b, CY(0.75, 0.6, 2.0, 10), 'orcSkin', 0, 3.6, 0);
  add(b, BX(1.6, 0.9, 1.1), 'blackIron', 0, 4.2, 0);
  add(b, SP(0.5, 10, 8), 'orcSkin', 0, 5.2, 0.1);
  add(b, BX(0.7, 0.3, 0.45), 'orcSkin', 0, 4.95, 0.35);
  add(b, CO(0.06, 0.3, 4), 'horn', -0.2, 5.15, 0.55);
  add(b, CO(0.06, 0.3, 4), 'horn', 0.2, 5.15, 0.55);
  add(b, SP(0.07, 6, 4), 'eyeRed', -0.17, 5.35, 0.52);
  add(b, SP(0.07, 6, 4), 'eyeRed', 0.17, 5.35, 0.52);
  limb(b, 'orcSkin', -0.95, 4.5, 0, 2.0, 0.18, -0.2, 0.2);
  const arm = limb(b, 'orcSkin', 0.95, 4.5, 0, 2.0, 0.18, -0.9, -0.2);
  const axe = G();
  add(axe, CY(0.07, 0.07, 3.4, 6), 'darkWood', 0, 0, 0);
  add(axe, BX(1.0, 1.0, 0.08), 'steel', 0.45, 1.3, 0);
  axe.position.set(0, -2.1, 0.3); axe.rotation.x = 1.2;
  arm.add(axe);
  return g;
}

export function cultist() {
  const [g, b] = creature();
  add(b, LA([[0, 0], [0.95, 0], [0.75, 1.5], [0.5, 3.6], [0.35, 4.2], [0, 4.3]], 12), 'purpleCloth', 0, 0, 0);
  add(b, CO(0.55, 1.1, 10), 'purpleCloth', 0, 4.6, -0.05);
  add(b, SP(0.3, 8, 6), 'pitBlack', 0, 4.35, 0.15);
  add(b, SP(0.06, 6, 4), 'eyeGreen', -0.1, 4.4, 0.42);
  add(b, SP(0.06, 6, 4), 'eyeGreen', 0.1, 4.4, 0.42);
  const arm = limb(b, 'purpleCloth', 0.55, 3.7, 0.1, 1.4, 0.16, -0.7, -0.2);
  void arm;
  add(b, CY(0.06, 0.06, 5.4, 6), 'darkWood', 0.85, 2.7, 0.75);
  add(b, SP(0.2, 8, 6), 'eyeGreen', 0.85, 5.5, 0.75);
  const f = flame(0.6, 'green');
  f.position.set(0.85, 5.6, 0.75);
  b.add(f);
  return g;
}

export function wraith() {
  const [g, b] = creature();
  b.userData.float = true;
  const robe = LA([[0.0, 0.3], [0.9, 0.0], [0.7, 1.2], [0.55, 3.0], [0.45, 4.0], [0, 4.4]], 12);
  add(b, robe, 'wraith', 0, 0.8, 0);
  add(b, CO(0.5, 1.0, 10), 'wraith', 0, 5.4, -0.05);
  add(b, SP(0.06, 6, 4), 'eyeBlue', -0.12, 5.15, 0.32);
  add(b, SP(0.06, 6, 4), 'eyeBlue', 0.12, 5.15, 0.32);
  limb(b, 'wraith', -0.55, 4.4, 0.2, 1.8, 0.12, -1.2, 0.4);
  limb(b, 'wraith', 0.55, 4.4, 0.2, 1.8, 0.12, -1.2, -0.4);
  noShadow(b);
  return g;
}

export function oozeCube() {
  const [g, b] = creature();
  b.userData.wobble = true;
  const cube = add(b, BX(2.8, 2.8, 2.8), 'ooze', 0, 1.4, 0);
  cube.userData.noShadow = true;
  skullAt(b, 0.2, 1.0, 0.1, 1.2);
  add(b, CY(0.05, 0.05, 1.2, 5), 'bone', -0.5, 0.6, -0.4, 0.4, 0, 1.2);
  add(b, BX(0.5, 0.06, 0.06), 'steel', 0.6, 1.8, -0.3, 0, 0.5, 0.7);
  add(b, CY(0.12, 0.12, 0.03, 8), 'gold', -0.6, 1.3, 0.5, 0.6, 0, 0.3);
  return g;
}

export function giantSpider() {
  const [g, b] = creature();
  add(b, SP(1.3, 12, 10), 'spiderBody', 0, 1.8, -1.0).scale.set(1, 0.85, 1.2);
  add(b, SP(0.75, 10, 8), 'spiderBody', 0, 1.6, 0.6);
  for (let k = 0; k < 6; k++) add(b, SP(0.08, 6, 4), 'eyeRed', -0.25 + (k % 3) * 0.25, 1.85 + Math.floor(k / 3) * 0.18, 1.3);
  add(b, CO(0.08, 0.4, 4), 'horn', -0.18, 1.3, 1.3, 1.2, 0, 0);
  add(b, CO(0.08, 0.4, 4), 'horn', 0.18, 1.3, 1.3, 1.2, 0, 0);
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
    const leg = G();
    const a = -0.9 + k * 0.6;
    const upper = G();
    add(upper, CY(0.09, 0.12, 2.0, 5), 'spiderBody', 0, 1.0, 0);
    upper.rotation.z = -side * 1.0;
    const lower = G();
    add(lower, CY(0.04, 0.09, 2.4, 5), 'spiderBody', 0, -1.2, 0);
    lower.position.set(-side * 1.68, 1.08, 0);
    lower.rotation.z = side * 0.35;
    leg.add(upper, lower);
    leg.position.set(side * 0.5, 1.6, 0.4 - k * 0.45);
    leg.rotation.y = side * a;
    b.add(leg);
  }
  return g;
}

export function ogre() {
  const [g, b] = creature();
  limb(b, 'ogreSkin', -0.7, 4.2, 0, 4.2, 0.42);
  limb(b, 'ogreSkin', 0.7, 4.2, 0, 4.2, 0.42);
  add(b, BX(2.0, 0.9, 1.4), 'leather', 0, 4.1, 0);
  add(b, SP(1.5, 14, 10), 'ogreSkin', 0, 6.2, 0.1).scale.set(1, 1.15, 0.85);
  add(b, SP(0.7, 10, 8), 'ogreSkin', 0, 8.3, 0.4);
  add(b, BX(1.1, 0.4, 0.5), 'ogreSkin', 0, 7.95, 0.85);
  add(b, SP(0.1, 6, 4), 'eyeRed', -0.25, 8.45, 1.0);
  add(b, SP(0.1, 6, 4), 'eyeRed', 0.25, 8.45, 1.0);
  limb(b, 'ogreSkin', -1.6, 7.3, 0, 3.6, 0.32, -0.15, 0.25);
  const arm = limb(b, 'ogreSkin', 1.6, 7.3, 0, 3.6, 0.32, -0.8, -0.2);
  const club = G();
  add(club, CY(0.25, 0.55, 4.2, 8), 'log', 0, 1.6, 0);
  for (let k = 0; k < 5; k++) add(club, CO(0.1, 0.4, 4), 'iron', Math.cos(k) * 0.5, 2.6 + k * 0.25, Math.sin(k) * 0.5, 0, 0, k);
  club.position.set(0, -3.6, 0.2); club.rotation.x = 1.0;
  arm.add(club);
  return g;
}

export function youngDragon() {
  const [g, b] = creature();
  // body
  add(b, SP(2.2, 14, 10), 'redScale', 0, 3.4, -0.6).scale.set(1, 0.85, 1.6);
  add(b, SP(1.7, 12, 8), 'bellyScale', 0, 3.0, 0.3).scale.set(0.9, 0.8, 1.2);
  // legs
  for (const [x, z] of [[-1.5, 1.6], [1.5, 1.6], [-1.6, -2.6], [1.6, -2.6]]) {
    limb(b, 'redScale', x, 3.0, z, 3.0, 0.45, 0, x > 0 ? -0.15 : 0.15);
    add(b, BX(0.8, 0.3, 1.1), 'redScale', x * 1.1, 0.15, z + 0.3);
  }
  // neck and head
  const neck = G();
  for (let k = 0; k < 6; k++) add(neck, SP(0.75 - k * 0.04, 10, 8), 'redScale', 0, k * 0.65, k * 0.35);
  neck.position.set(0, 4.4, 2.0);
  neck.rotation.x = -0.25;
  b.add(neck);
  const head = G();
  add(head, BX(1.2, 0.9, 2.0), 'redScale', 0, 0, 0.4);
  add(head, BX(0.9, 0.4, 1.4), 'redScale', 0, -0.45, 0.75);
  add(head, CO(0.18, 1.4, 6), 'horn', -0.4, 0.6, -0.7, -1.0, 0, 0.15);
  add(head, CO(0.18, 1.4, 6), 'horn', 0.4, 0.6, -0.7, -1.0, 0, -0.15);
  add(head, SP(0.13, 6, 4), 'eyeRed', -0.5, 0.2, 0.7);
  add(head, SP(0.13, 6, 4), 'eyeRed', 0.5, 0.2, 0.7);
  for (let k = 0; k < 5; k++) add(head, CO(0.06, 0.25, 4), 'teeth', -0.35 + k * 0.17, -0.3, 1.35, PI, 0, 0);
  head.position.set(0, 8.4, 4.4);
  b.add(head);
  // wings
  for (const side of [-1, 1]) {
    const w = new THREE.Shape();
    w.moveTo(0, 0); w.lineTo(5.5, 2.5); w.lineTo(6.5, -0.5); w.lineTo(4.6, -1.2); w.lineTo(3.4, -2.6); w.lineTo(2.0, -2.0); w.lineTo(0, -1.4); w.lineTo(0, 0);
    const wing = add(b, new THREE.ShapeGeometry(w), 'wing', side * 1.2, 5.2, -0.8);
    wing.scale.x = side;
    wing.rotation.set(-0.3, side * -0.35, side * 0.35);
    add(b, CY(0.12, 0.2, 6.0, 6), 'redScale', side * 3.6, 6.4, -1.2, 0, side * -0.35, side * (PI / 2 - 0.05) - side * 0.4);
  }
  // tail
  let tx = 0, tz = -3.6, ty = 3.0;
  for (let k = 0; k < 9; k++) {
    add(b, SP(0.8 - k * 0.08, 8, 6), 'redScale', tx, ty, tz);
    tz -= 0.75; tx += Math.sin(k * 0.6) * 0.35; ty = Math.max(0.6, ty - 0.3);
  }
  add(b, CO(0.35, 0.9, 4), 'redScale', tx, ty, tz - 0.3, -PI / 2, 0, 0);
  return g;
}

// ======================= WIDE EDGE PIECES =======================
// Built centred on the origin along x, `span` squares wide.

function wideFrame(g, f, span, openW, openH, trimMat = 'darkStone') {
  const W = span * CELL, hw = W / 2, jw = (W - openW) / 2;
  add(g, BX(jw, WALL_H, WALL_T, 3), clipMat(f), -hw + jw / 2, WALL_H / 2, 0);
  add(g, BX(jw, WALL_H, WALL_T, 3), clipMat(f), hw - jw / 2, WALL_H / 2, 0);
  add(g, BX(openW, WALL_H - openH, WALL_T, 3), clipMat(f), 0, (WALL_H + openH) / 2, 0);
  if (trimMat) {
    const t = WALL_T + 0.2;
    add(g, BX(0.3, openH + 0.1, t), clipMat(trimMat), -openW / 2 - 0.08, openH / 2, 0);
    add(g, BX(0.3, openH + 0.1, t), clipMat(trimMat), openW / 2 + 0.08, openH / 2, 0);
    add(g, BX(openW + 0.8, 0.45, t), clipMat(trimMat), 0, openH + 0.16, 0);
  }
}

function archOutline(outerHalf, halfW, springY, wallH = WALL_H) {
  const s = new THREE.Shape();
  s.moveTo(-outerHalf, 0);
  s.lineTo(-halfW, 0);
  s.lineTo(-halfW, springY);
  s.absarc(0, springY, halfW, PI, 0, true);
  s.lineTo(halfW, 0);
  s.lineTo(outerHalf, 0);
  s.lineTo(outerHalf, wallH);
  s.lineTo(-outerHalf, wallH);
  s.lineTo(-outerHalf, 0);
  return s;
}

function archTrim(g, halfW, springY, thick = 0.32) {
  const ring = new THREE.Shape();
  ring.absarc(0, 0, halfW + thick, 0, PI, false);
  ring.lineTo(-halfW, 0);
  ring.absarc(0, 0, halfW, PI, 0, true);
  ring.lineTo(halfW + thick, 0);
  add(g, extrudeWall(ring, WALL_T + 0.22), clipMat('darkStone'), 0, springY, 0);
  add(g, BX(thick, springY, WALL_T + 0.22), clipMat('darkStone'), -halfW - thick / 2, springY / 2, 0);
  add(g, BX(thick, springY, WALL_T + 0.22), clipMat('darkStone'), halfW + thick / 2, springY / 2, 0);
  add(g, BX(0.7, 0.9, WALL_T + 0.34), clipMat('darkStone'), 0, springY + halfW + 0.2, 0);
}

// 6 ft double doors under a stone lintel, iron-banded and studded
export function greatDoors(f) {
  const g = G();
  const openW = 4.8, openH = 8.4;
  wideFrame(g, f, 2, openW, openH);
  const w = openW / 2;
  const p1 = dyn(G(), { door: 'swing', open: -1.6 });
  p1.position.set(-openW / 2, 0.02, 0);
  p1.add(leaf(w, openH - 0.05, 'darkWood', true));
  const p2 = dyn(G(), { door: 'swing', open: 1.6 });
  p2.position.set(openW / 2, 0.02, 0);
  const l2 = leaf(w, openH - 0.05, 'darkWood', true);
  l2.scale.x = -1;
  p2.add(l2);
  for (const p of [p1, p2]) {
    add(p, TO(0.32, 0.06, 6, 14), clipMat('brass'), (p === p1 ? 1 : -1) * (w - 0.5), 3.8, 0.2);
    add(p, TO(0.32, 0.06, 6, 14), clipMat('brass'), (p === p1 ? 1 : -1) * (w - 0.5), 3.8, -0.2);
  }
  g.add(p1, p2);
  // a carved keystone shield over the doors
  add(g, CY(0.55, 0.55, WALL_T + 0.4, 6), clipMat('darkStone'), 0, openH + 0.85, 0, PI / 2, 0, 0);
  return g;
}

// an open 6 ft arch
export function grandArch(f) {
  const g = G();
  const halfW = 2.35, spring = 5.9;
  add(g, extrudeWall(archOutline(CELL, halfW, spring), WALL_T), clipMat(f), 0, 0, 0);
  archTrim(g, halfW, spring, 0.36);
  return g;
}

// a 9 ft portcullis gate with heavy stone surround
export function castleGate(f) {
  const g = G();
  const openW = 7.4, openH = 8.6;
  wideFrame(g, f, 3, openW, openH);
  const grid = dyn(G(), { door: 'slide', open: 7.6 });
  const nBars = 10;
  for (let k = 0; k < nBars; k++) {
    const x = -openW / 2 + 0.25 + k * (openW - 0.5) / (nBars - 1);
    add(grid, CY(0.08, 0.08, openH, 6), clipMat('blackIron'), x, openH / 2, 0);
    add(grid, CO(0.11, 0.38, 6), clipMat('blackIron'), x, -0.12, 0, PI, 0, 0);
  }
  for (const y of [1.6, 3.8, 6.0, 8.0]) add(grid, BX(openW, 0.16, 0.16), clipMat('blackIron'), 0, y, 0);
  g.add(grid);
  // flanking buttresses
  for (const sx of [-1, 1]) {
    add(g, BX(0.9, WALL_H + 0.6, WALL_T + 1.2, 3), clipMat('darkStone'), sx * (openW / 2 + 0.75), (WALL_H + 0.6) / 2, 0);
    add(g, BX(1.1, 0.4, WALL_T + 1.4), clipMat('darkStone'), sx * (openW / 2 + 0.75), WALL_H + 0.8, 0);
  }
  return g;
}

// a 6 ft gate of sharpened logs for palisade forts
export function palisadeGate() {
  const g = G();
  const W = 2 * CELL;
  const rand = mulberry(17);
  const half = (sign) => {
    const p = dyn(G(), { door: 'swing', open: sign * -1.5 });
    p.position.set(sign * -W / 2, 0, 0);
    for (let k = 0; k < 5; k++) {
      const x = sign * (0.3 + k * 0.6);
      const h = 8.2 + rand() * 0.8;
      add(p, CY(0.28, 0.3, h, 8), clipMat('log'), x, h / 2 + 0.1, 0);
      add(p, CO(0.28, 0.8, 8), clipMat('log'), x, h + 0.5, 0);
    }
    add(p, BX(2.9, 0.3, 0.22), clipMat('darkWood'), sign * 1.5, 2.2, 0.32);
    add(p, BX(2.9, 0.3, 0.22), clipMat('darkWood'), sign * 1.5, 6.6, 0.32);
    add(p, BX(0.24, 4.9, 0.2), clipMat('darkWood'), sign * 1.5, 4.4, 0.36, 0, 0, sign * 0.62);
    return p;
  };
  g.add(half(1), half(-1));
  add(g, CY(0.32, 0.32, W + 0.8, 8), clipMat('log'), 0, 10.2, 0, 0, 0, PI / 2);
  return g;
}

// a 6 ft arched window with mullions and a deep sill
export function greatWindow(f) {
  const g = G();
  const s = new THREE.Shape();
  s.moveTo(-CELL, 0); s.lineTo(CELL, 0); s.lineTo(CELL, WALL_H); s.lineTo(-CELL, WALL_H); s.lineTo(-CELL, 0);
  const hw = 1.9, y0 = 2.6, ys = 6.6;
  const hole = new THREE.Path();
  hole.moveTo(-hw, y0); hole.lineTo(hw, y0); hole.lineTo(hw, ys); hole.absarc(0, ys, hw, 0, PI, false); hole.lineTo(-hw, y0);
  s.holes.push(hole);
  add(g, extrudeWall(s, WALL_T), clipMat(f), 0, 0, 0);
  add(g, BX(hw * 2 + 0.8, 0.28, WALL_T + 0.6), clipMat('darkStone'), 0, y0 - 0.14, 0);
  archTrim(g, hw, ys, 0.26);
  for (const x of [-0.95, 0, 0.95]) add(g, BX(0.12, ys + hw - y0, 0.16), clipMat('darkStone'), x, (y0 + ys + hw) / 2, 0);
  add(g, BX(hw * 2, 0.12, 0.16), clipMat('darkStone'), 0, 5.4, 0);
  const gl = new THREE.Shape();
  gl.moveTo(-hw, y0); gl.lineTo(hw, y0); gl.lineTo(hw, ys); gl.absarc(0, ys, hw, 0, PI, false); gl.lineTo(-hw, y0);
  const glass = add(g, new THREE.ShapeGeometry(gl), clipMat('glass'), 0, 0, 0);
  glass.userData.noShadow = true;
  return g;
}

// a 6 ft wall with a candlelit niche holding a small statue
export function alcoveWall(f) {
  const g = G();
  const hw = 1.5, y0 = 1.4, ys = 4.9, depth = 1.6;
  const s = new THREE.Shape();
  s.moveTo(-CELL, 0); s.lineTo(CELL, 0); s.lineTo(CELL, WALL_H); s.lineTo(-CELL, WALL_H); s.lineTo(-CELL, 0);
  const hole = new THREE.Path();
  hole.moveTo(-hw, y0); hole.lineTo(hw, y0); hole.lineTo(hw, ys); hole.absarc(0, ys, hw, 0, PI, false); hole.lineTo(-hw, y0);
  s.holes.push(hole);
  add(g, extrudeWall(s, WALL_T), clipMat(f), 0, 0, 0);
  // the recess bulges out behind the wall (-z side)
  const back = -WALL_T / 2 - depth / 2;
  add(g, BX(hw * 2 + 0.6, ys + hw - y0 + 0.6, 0.4, 3), clipMat(f), 0, (y0 + ys + hw) / 2, -WALL_T / 2 - depth + 0.2);
  for (const sx of [-1, 1]) add(g, BX(0.3, ys + hw - y0 + 0.6, depth, 3), clipMat(f), sx * (hw + 0.15), (y0 + ys + hw) / 2, back);
  add(g, BX(hw * 2 + 0.6, 0.3, depth + WALL_T, 3), clipMat('darkStone'), 0, y0 - 0.15, back + WALL_T / 2);
  add(g, BX(hw * 2 + 0.6, 0.3, depth, 3), clipMat(f), 0, ys + hw + 0.15, back);
  archTrim(g, hw, ys, 0.24);
  // statue and candles inside
  add(g, BX(0.9, 0.4, 0.8), 'darkStone', 0, y0 + 0.2, -0.6);
  add(g, LA([[0, 0], [0.32, 0], [0.28, 0.8], [0.22, 1.5], [0.26, 1.8], [0.1, 2.0], [0, 2.0]], 10), 'paleStone', 0, y0 + 0.4, -0.6);
  add(g, SP(0.16, 10, 8), 'paleStone', 0, y0 + 2.55, -0.6);
  candle(g, -0.9, y0, -0.35, 0.45, 0.06);
  candle(g, 0.95, y0, -0.45, 0.3, 0.06);
  return g;
}

// a 6 ft wall braced by a stepped buttress on both faces
export function buttressedWall(f) {
  const g = G();
  add(g, BX(2 * CELL, WALL_H, WALL_T, 3), clipMat(f), 0, WALL_H / 2, 0);
  for (const sz of [-1, 1]) {
    add(g, BX(1.3, 4.2, 1.5, 3), clipMat(f), 0, 2.1, sz * (WALL_T / 2 + 0.75));
    add(g, BX(1.1, 3.4, 1.0, 3), clipMat(f), 0, 5.9, sz * (WALL_T / 2 + 0.5));
    add(g, BX(0.9, 2.4, 0.5, 3), clipMat(f), 0, 8.8, sz * (WALL_T / 2 + 0.25));
    add(g, BX(1.4, 0.25, 1.65), clipMat('darkStone'), 0, 4.3, sz * (WALL_T / 2 + 0.78));
    add(g, BX(1.2, 0.25, 1.15), clipMat('darkStone'), 0, 7.7, sz * (WALL_T / 2 + 0.55));
  }
  return g;
}

// a free-standing column used at the ends of colonnades
export function columnPost() {
  const g = G();
  add(g, BX(1.3, 0.4, 1.3, 3), clipMat('paleStone'), 0, 0.2, 0);
  add(g, CY(0.52, 0.58, 0.3, 14), clipMat('paleStone'), 0, 0.55, 0);
  add(g, CY(0.44, 0.5, WALL_H - 2.2, 14), clipMat('paleStone'), 0, (WALL_H - 2.2) / 2 + 0.7, 0);
  add(g, CY(0.62, 0.46, 0.4, 14), clipMat('paleStone'), 0, WALL_H - 1.3, 0);
  add(g, BX(1.3, 0.9, 1.3, 3), clipMat('paleStone'), 0, WALL_H - 0.45, 0);
  return g;
}

// a 6 ft run of columns under a lintel; you can walk between them
export function colonnade() {
  const g = G();
  const W = 2 * CELL;
  add(g, BX(W + 0.6, 0.9, 1.1, 3), clipMat('paleStone'), 0, WALL_H - 0.45, 0);
  add(g, BX(W + 0.8, 0.25, 1.3, 3), clipMat('paleStone'), 0, WALL_H - 0.95, 0);
  add(g, BX(1.3, 0.4, 1.3, 3), clipMat('paleStone'), 0, 0.2, 0);
  add(g, CY(0.52, 0.58, 0.3, 14), clipMat('paleStone'), 0, 0.55, 0);
  add(g, CY(0.44, 0.5, WALL_H - 2.2, 14), clipMat('paleStone'), 0, (WALL_H - 2.2) / 2 + 0.7, 0);
  add(g, CY(0.62, 0.46, 0.4, 14), clipMat('paleStone'), 0, WALL_H - 1.3, 0);
  return g;
}

// a thick fortress curtain wall with battlements
export function fortressWall() {
  const g = G();
  const T = 1.6;
  add(g, BX(CELL, WALL_H, T, 3), clipMat('stoneWall'), 0, WALL_H / 2, 0);
  add(g, BX(CELL + 0.02, 0.3, T + 0.2, 3), clipMat('darkStone'), 0, WALL_H + 0.15, 0);
  for (const x of [-0.85, 0.85]) add(g, BX(0.9, 1.3, T, 3), clipMat('stoneWall'), x, WALL_H + 0.95, 0);
  add(g, BX(0.25, 1.2, 0.3), clipMat('pitBlack'), 0, 5.5, T / 2 - 0.1);
  return g;
}
export function fortressPost() {
  const g = G();
  add(g, BX(2.0, WALL_H + 0.6, 2.0, 3), clipMat('stoneWall'), 0, (WALL_H + 0.6) / 2, 0);
  add(g, BX(2.3, 0.35, 2.3, 3), clipMat('darkStone'), 0, WALL_H + 0.75, 0);
  for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) add(g, BX(0.7, 1.3, 0.7, 3), clipMat('stoneWall'), x, WALL_H + 1.55, z);
  return g;
}

// ======================= STAIRS =======================
// Every stair rises toward its back (local -z) from the ground it stands on, by `rise` feet,
// so its top step meets the floor of a square raised by the same amount.
const STEP_RISE = 0.6;

function straightSteps(g, { w, L, rise, m, tread }) {
  const n = Math.max(2, Math.round(rise / STEP_RISE)), run = L / n, h = rise / n;
  for (let k = 0; k < n; k++) {
    const top = (k + 1) * h, z = L / 2 - run / 2 - k * run;
    add(g, BX(w, top, run + 0.01, 3), m, 0, top / 2, z);
    if (tread) add(g, BX(w + 0.04, 0.09, run + 0.08, 3), tread, 0, top - 0.02, z + 0.04);
  }
  return { n, run, h };
}

export function stoneStairs(lenCells, rise) {
  const g = G();
  const L = lenCells * CELL;
  straightSteps(g, { w: CELL - 0.1, L, rise, m: 'stoneWall', tread: 'stone' });
  return g;
}

export function grandStairs() {
  const g = G();
  const L = 2 * CELL, rise = 6, w = 2 * CELL - 0.9;
  const { n, run, h } = straightSteps(g, { w, L, rise, m: 'paleStone', tread: 'marble' });
  // a red runner up the middle
  for (let k = 0; k < n; k++) add(g, BX(1.6, 0.03, run + 0.02), 'redCloth', 0, (k + 1) * h + 0.035, L / 2 - run / 2 - k * run);
  // balustrades: cheek walls, balusters, a sloped handrail and newel posts
  for (const sx of [-1, 1]) {
    const x = sx * (CELL - 0.3);
    for (let k = 0; k < n; k++) add(g, BX(0.55, (k + 1) * h + 0.2, run + 0.01, 3), 'paleStone', x, ((k + 1) * h + 0.2) / 2, L / 2 - run / 2 - k * run);
    for (let k = 0; k < n; k++) add(g, CY(0.07, 0.09, 2.4, 8), 'paleStone', x, (k + 1) * h + 0.2 + 1.2, L / 2 - run / 2 - k * run);
    const len = Math.hypot(L, rise);
    add(g, BX(0.42, 0.24, len + 0.2), 'paleStone', x, rise / 2 + h + 2.55, 0, Math.atan2(rise, L), 0, 0);
    for (const [z, y] of [[L / 2 - 0.25, h], [-L / 2 + 0.25, rise]]) {
      add(g, BX(0.7, y + 3.4, 0.7, 3), 'paleStone', x, (y + 3.4) / 2, z);
      add(g, SP(0.32, 10, 8), 'paleStone', x, y + 3.65, z);
    }
  }
  return g;
}

export function woodenStairs() {
  const g = G();
  const L = 2 * CELL, rise = 6, w = CELL - 0.4;
  const n = Math.round(rise / STEP_RISE), run = L / n, h = rise / n;
  for (let k = 0; k < n; k++) add(g, BX(w, 0.16, run + 0.12, 3), 'planks', 0, (k + 1) * h - 0.08, L / 2 - run / 2 - k * run);
  const len = Math.hypot(L, rise), ang = Math.atan2(rise, L);
  for (const sx of [-1, 1]) add(g, BX(0.18, 0.9, len), 'darkWood', sx * (w / 2 + 0.05), rise / 2 - 0.2, 0, ang, 0, 0);
  // one handrail on posts
  const x = w / 2 + 0.05;
  for (let k = 0; k < n; k += 3) add(g, BX(0.14, 3.2, 0.14), 'darkWood', x, (k + 1) * h + 1.6, L / 2 - run / 2 - k * run);
  add(g, BX(0.14, 3.2, 0.14), 'darkWood', x, rise + 1.6, -L / 2 + run / 2);
  add(g, BX(0.16, 0.16, len + 0.3), 'wood', x, rise / 2 + 3.25, 0, ang, 0, 0);
  return g;
}

export function earthRamp() {
  const g = G();
  const L = 2 * CELL, rise = 3, w = CELL - 0.05;
  const s = new THREE.Shape();
  s.moveTo(L / 2, 0); s.lineTo(-L / 2, 0); s.lineTo(-L / 2, rise); s.lineTo(L / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2, 0, 0);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  add(g, geo, 'earthBank', 0, 0, 0);
  // a few flat stones set into the slope
  for (let k = 0; k < 4; k++) {
    const z = L / 2 - 0.9 - k * 1.35, y = rise * (L / 2 - z) / L;
    add(g, BX(1.5 + (k % 2) * 0.4, 0.12, 0.8), 'stone', (k % 2 ? 0.25 : -0.2), y + 0.02, z, Math.atan2(rise, L), 0, 0);
  }
  return g;
}

export function spiralStair() {
  const g = G();
  const rise = 9, sweep = Math.PI * 1.5, n = 15;
  add(g, CY(0.5, 0.58, rise + 1.2, 12), 'stone', 0, (rise + 1.2) / 2, 0);
  add(g, CY(0.75, 0.75, 0.3, 12), 'darkStone', 0, rise + 1.35, 0);
  const posts = [];
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * sweep;
    const top = ((k + 1) / n) * rise;
    const step = add(g, BX(2.35, 0.3, 1.05, 3), 'stoneWall', Math.sin(a) * 1.6, top - 0.15, Math.cos(a) * 1.6);
    step.rotation.y = a - Math.PI / 2;
    const px = Math.sin(a) * 2.75, pz = Math.cos(a) * 2.75;
    add(g, CY(0.05, 0.05, 3, 6), 'blackIron', px, top + 1.5, pz);
    posts.push(new THREE.Vector3(px, top + 3, pz));
  }
  // iron handrail following the turn
  for (let k = 0; k < posts.length - 1; k++) {
    const a = posts[k], b = posts[k + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const rail = add(g, CY(0.06, 0.06, dir.length() + 0.05, 6), 'blackIron', mid.x, mid.y, mid.z);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }
  return g;
}
