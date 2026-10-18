import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './materials.js';

// Box with UVs scaled to world size (s = feet per texture repeat)
export function boxGeo(w, h, d, s = 3) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order px nx py ny pz nz, 4 verts each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const idx = f * 4 + k;
      uv.setXY(idx, uv.getX(idx) * dims[f][0] / s, uv.getY(idx) * dims[f][1] / s);
    }
  }
  return g;
}

export const G = () => new THREE.Group();

export function add(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

export const BX = (w, h, d, s = 3) => boxGeo(w, h, d, s);
export const CY = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const SP = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
export const CO = (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg);
export const TO = (r, t, rs = 8, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
export function LA(profile, seg = 16) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}
export function ICO(r, detail = 0, jitter = 0.25, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const map = new Map();
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let f = map.get(key);
    if (f === undefined) { f = 1 + (rnd() - 0.5) * 2 * jitter; map.set(key, f); }
    v.multiplyScalar(f);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Extruded wall panel from a 2D shape (x along wall, y up), centered on z, UVs scaled
export function extrudeWall(shape, depth, s = 3) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s);
  return g;
}

// Mark subtree as dynamic (not merged into instanced batches)
export function dyn(obj, data = {}) {
  obj.userData.dyn = true;
  Object.assign(obj.userData, data);
  return obj;
}

export function noShadow(obj) {
  obj.traverse((o) => { o.userData.noShadow = true; });
  return obj;
}

// ---------- prototype splitting ----------
// Returns { parts: [{geometry, material, shadow}], dynamic: Group|null }
export function splitPrototype(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  const dynRoot = new THREE.Group();
  const walk = (o) => {
    if (o !== root && o.userData.dyn) {
      const c = o.clone(true);
      o.matrixWorld.decompose(c.position, c.quaternion, c.scale);
      compactDynamic(c);
      dynRoot.add(c);
      return;
    }
    if (o.isMesh) {
      let geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      if (geo.index) geo = geo.toNonIndexed();
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geo.morphAttributes = {};
      const key = o.material.uuid + (o.userData.noShadow ? ':ns' : '');
      if (!byMat.has(key)) byMat.set(key, { material: o.material, geos: [], shadow: !o.userData.noShadow });
      byMat.get(key).geos.push(geo);
    }
    for (const ch of o.children) walk(ch);
  };
  walk(root);
  const parts = [];
  for (const { material, geos, shadow } of byMat.values()) {
    const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geometry.computeBoundingSphere();
    parts.push({ geometry, material, shadow });
  }
  return { parts, dynamic: dynRoot.children.length ? dynRoot : null };
}

// A moving part (door leaf, chest lid, creature body…) is built from many small meshes that never
// move relative to it. Merge those into one mesh per material, so each part costs a draw call or two
// instead of dozens. Nested moving parts stay separate; so do see-through and mirrored meshes,
// which must keep their own draw order and winding.
const _inv = new THREE.Matrix4();
const _rel = new THREE.Matrix4();
function compactDynamic(node) {
  if (node.userData.bubble) return; // its bubbles rise one by one
  node.updateMatrixWorld(true);
  _inv.copy(node.matrixWorld).invert();
  const byMat = new Map();
  const keep = [];
  const dropped = [];
  const walk = (o) => {
    for (const ch of o.children) {
      if (ch.userData.dyn) { keep.push(ch); continue; }
      if (ch.isMesh) {
        _rel.multiplyMatrices(_inv, ch.matrixWorld);
        const ok = !Array.isArray(ch.material) && !ch.material.transparent && ch.visible && _rel.determinant() > 0 && ch.children.length === 0;
        if (!ok) { keep.push(ch); continue; }
        const key = ch.material.uuid + (ch.userData.noShadow ? ':ns' : '');
        if (!byMat.has(key)) byMat.set(key, { material: ch.material, noShadow: !!ch.userData.noShadow, geos: [] });
        byMat.get(key).geos.push(cleanGeometry(ch.geometry, _rel));
        dropped.push(ch);
        continue;
      }
      if (ch.isObject3D && !ch.isMesh && ch.children.length) { dropped.push(ch); walk(ch); continue; }
      keep.push(ch);
    }
  };
  walk(node);
  // only worth it when meshes actually merge
  let saved = 0;
  for (const v of byMat.values()) saved += v.geos.length - 1;
  if (saved <= 0) { for (const k of keep) if (k.userData.dyn) compactDynamic(k); return; }
  for (const k of keep) if (k.parent !== node) node.attach(k);
  for (const ch of [...node.children]) if (!keep.includes(ch)) node.remove(ch);
  for (const { material, noShadow, geos } of byMat.values()) {
    const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geometry.computeBoundingSphere();
    const m = new THREE.Mesh(geometry, material);
    if (noShadow) m.userData.noShadow = true;
    node.add(m);
  }
  void dropped;
  for (const k of keep) if (k.userData.dyn) compactDynamic(k);
}

// a copy of a mesh geometry in another space, with exactly the attributes the batches use
function cleanGeometry(src, matrix) {
  let geo = src.clone();
  geo.applyMatrix4(matrix);
  if (geo.index) geo = geo.toNonIndexed();
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.morphAttributes = {};
  return geo;
}

// Instanced batch of one prototype's static parts
export class InstancedSet {
  constructor(parent, parts, { castShadow = true, receiveShadow = true, layer = 0 } = {}) {
    this.layer = layer;
    this.parent = parent;
    this.parts = parts;
    this.cap = 0;
    this.meshes = [];
    this.cast = castShadow;
    this.receive = receiveShadow;
  }
  _alloc(n) {
    for (const m of this.meshes) { this.parent.remove(m); m.dispose(); }
    this.cap = Math.max(8, 1 << Math.ceil(Math.log2(n + 1)));
    this.meshes = this.parts.map((p) => {
      const m = new THREE.InstancedMesh(p.geometry, p.material, this.cap);
      m.castShadow = this.cast && p.shadow;
      m.receiveShadow = this.receive;
      m.frustumCulled = true;
      if (this.layer) m.layers.enable(this.layer);
      this.parent.add(m);
      return m;
    });
  }
  update(matrices, tints = null) {
    const n = matrices.length;
    if (n > this.cap || this.meshes.length === 0) this._alloc(n);
    const c = new THREE.Color();
    for (const m of this.meshes) {
      for (let k = 0; k < n; k++) m.setMatrixAt(k, matrices[k]);
      if (tints) {
        for (let k = 0; k < n; k++) m.setColorAt(k, c.setScalar(tints[k]));
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      m.visible = n > 0;
      if (n > 0) m.computeBoundingSphere();
    }
  }
  setVisible(v) { for (const m of this.meshes) m.visible = v && m.count > 0; }
  dispose() { for (const m of this.meshes) { this.parent.remove(m); m.dispose(); } this.meshes = []; this.cap = 0; }
}

export { mergeGeometries };
