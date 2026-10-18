import * as THREE from 'three';
import { CELL, WALL_H, FLOOR_Y, GRID_W, GRID_D, cellX, cellZ, lineX, lineZ, hash2, inGrid } from './config.js';
import { G, add, BX } from './geom.js';
import { updateMask } from './heightmask.js';
import { byId, POSTS, POST_RANK, framePost } from './catalog.js';
import { splitPrototype, InstancedSet } from './geom.js';
import { cutPlane } from './materials.js';
import { footprint, parseEdge, edgeKey, edgeCenter } from './state.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

// one 3 ft block of foundation masonry or earth, bottom at y = 0
const COLUMN_MAT = { earth: 'earthBank', rock: 'pitRock', stone: 'foundation' };
const buildColumn = (m) => () => {
  const g = G();
  add(g, BX(CELL, CELL, CELL, 3), m, 0, CELL / 2, 0);
  return g;
};

function mtx(x, y, z, ry, sx = 1, sy = 1, sz = 1) {
  _q.setFromAxisAngle(UP, ry);
  _v.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_v, _q, _s);
}

export class World {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.root = new THREE.Group();
    this.root.name = 'dungeon';
    scene.add(this.root);
    this.protos = new Map();
    this.sets = new Map(); // key -> InstancedSet
    this.setLayer = new Map(); // key -> layer for visibility toggles
    this.dynEdges = new Map(); // edgeKey -> {key, group, nodes}
    this.dynObjs = new Map(); // id -> {sig, group, flames, lids, ...}
    this.lights = [];
    this.flames = [];
    this.openDoors = new Set();
    this.openChests = new Set();
    this.defeated = new Set();
    this.consumed = new Set();
    this.creatureHp = new Map();
    this.lookAt = null; // player position in walk mode
    this.cutHeight = Infinity;
    this.walkMode = false;
    this.needsShadow = true;
    this.time = 0;

    // cutaway caps
    this.capMat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 1 });
    this.capMesh = null;
    this.capCap = 0;

    state.onChange(() => this.sync());
  }

  proto(key, build) {
    let p = this.protos.get(key);
    if (!p) {
      p = splitPrototype(build());
      this.protos.set(key, p);
    }
    return p;
  }

  set(key, parts, layer) {
    let s = this.sets.get(key);
    if (!s) {
      s = new InstancedSet(this.root, parts, { layer: 1 });
      this.sets.set(key, s);
      this.setLayer.set(key, layer);
    }
    return s;
  }

  // height of the ground surface of a square (feet), not counting floor tiles
  groundTop(i, j) { return inGrid(i, j) ? this.state.topAt(i, j) : 0; }

  floorTop(i, j) {
    const g = this.groundTop(i, j);
    const f = this.state.floorAt(i, j);
    if (!f) return g;
    const it = byId[f];
    if (it.liquid || it.pit) return g;
    return g + FLOOR_Y;
  }

  // walls stand on the higher of the squares on either side of their line
  edgeBase(o, i, j, span = 1) {
    let b = -Infinity;
    for (let k = 0; k < span; k++) {
      const a = o === 'h' ? [i + k, j - 1] : [i - 1, j + k];
      const c = o === 'h' ? [i + k, j] : [i, j + k];
      b = Math.max(b, inGrid(...a) ? this.state.topAt(...a) : -Infinity, inGrid(...c) ? this.state.topAt(...c) : -Infinity);
    }
    return Number.isFinite(b) ? b : 0;
  }
  vertexBase(vi, vj) {
    let b = -Infinity;
    for (const [a, c] of [[vi - 1, vj - 1], [vi, vj - 1], [vi - 1, vj], [vi, vj]]) if (inGrid(a, c)) b = Math.max(b, this.state.topAt(a, c));
    return Number.isFinite(b) ? b : 0;
  }

  sync() {
    const d = this.state.data;
    const batches = new Map(); // key -> {parts, layer, mats: []}
    const push = (key, build, matrix, layer, tint = 1) => {
      let b = batches.get(key);
      if (!b) {
        const p = this.proto(key, build);
        b = { parts: p.parts, dynamic: p.dynamic, layer, mats: [], tints: [] };
        batches.set(key, b);
      }
      if (b.parts.length) { b.mats.push(matrix); b.tints.push(tint); }
      return b;
    };
    this.lights = [];

    // ---- floors ----
    for (const k in d.floors) {
      const [i, j] = k.split(',').map(Number);
      const t = d.floors[k];
      const it = byId[t];
      const rot = it.liquid || it.pit ? 0 : Math.floor(hash2(i, j, 5) * 4) * (Math.PI / 2);
      const gy = this.groundTop(i, j);
      push('f:' + t, it.build, mtx(cellX(i), gy, cellZ(j), rot), 'floor', it.liquid || it.pit ? 1 : 0.86 + hash2(i, j, 21) * 0.2);
      if (it.light && hash2(i, j, 9) < 0.34) this.addLight(it.light, mtx(cellX(i), gy, cellZ(j), 0));
    }

    // ---- raised and sunken ground: 3 ft blocks wherever a square's side is exposed ----
    updateMask(this.state);
    const EARTHY = new Set(['dirt', 'grass', 'sand', 'snow', 'mossy']);
    const hasHeights = Object.keys(d.heights || {}).length > 0;
    if (hasHeights) {
      for (let i = 0; i < GRID_W; i++) for (let j = 0; j < GRID_D; j++) {
        const T = this.groundTop(i, j);
        let B = T;
        for (const [a, c] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) B = Math.min(B, this.groundTop(a, c));
        const f = d.floors[`${i},${j}`];
        // bare raised or sunken ground still needs a top surface of its own
        if (!f && T !== 0 && B >= T) B = T - CELL;
        if (B >= T) continue;
        const earth = !f || EARTHY.has(f);
        // plain ground at level 0 sits just under the landscape so the grass still shows on top
        const yOff = !f && T === 0 ? -0.08 : 0;
        for (let y = B; y < T - 0.01; y += CELL) {
          // earth gives way to bedrock more than one block below the surface
          const kind = earth ? (y < -CELL - 0.01 ? 'rock' : 'earth') : 'stone';
          push('col:' + kind, buildColumn(COLUMN_MAT[kind]), mtx(cellX(i), y + yOff, cellZ(j), 0), 'floor', 0.82 + hash2(i * 7 + y, j, 41) * 0.22);
        }
      }
    }

    // ---- edges ----
    const vertexPosts = new Map(); // "vi,vj" -> postType
    const caps = [];
    const seenDyn = new Set();
    const cut = this.cutHeight;
    for (const k in d.edges) {
      const e = d.edges[k];
      if (e.t === 'cover') continue; // drawn by its anchor
      const it = byId[e.t];
      if (!it) continue;
      const { o, i, j } = parseEdge(k);
      const span = e.span || 1;
      const [x, z] = edgeCenter(o, i, j, span);
      const ry = (o === 'h' ? 0 : Math.PI / 2) + (e.flip ? Math.PI : 0); // R flips which side faces south/east
      const f = it.framed ? e.f || 'stoneWall' : '';
      const key = `e:${e.t}|${f}`;
      const base = this.edgeBase(o, i, j, span);
      const m = mtx(x, base, z, ry);
      const b = push(key, () => it.build(f), m, 'edge', 0.88 + hash2(i * 2 + (o === 'h' ? 0 : 1), j, 33) * 0.18);
      if (it.light) this.addLight(it.light, m);
      if (b.dynamic) {
        const sig = key + (e.flip ? '|flip' : '') + '|' + base;
        seenDyn.add(k);
        let de = this.dynEdges.get(k);
        if (de && de.sig !== sig) { this.root.remove(de.group); this.dynEdges.delete(k); de = null; }
        if (!de) {
          const g = b.dynamic.clone(true);
          g.applyMatrix4(m);
          this.root.add(g);
          de = { sig, group: g, nodes: [], t: 0 };
          g.traverse((n) => {
            n.layers.enable(1);
            if (n.userData.door) de.nodes.push({ n, kind: n.userData.door, open: n.userData.open, rot: n.rotation.y, y: n.position.y });
            if (n.isMesh) { n.castShadow = !n.userData.noShadow; n.receiveShadow = true; }
          });
          de.t = this.openDoors.has(k) ? 1 : 0;
          this.dynEdges.set(k, de);
          this.applyDoor(de);
        }
      }
      // posts at both outer endpoints
      const pt = it.framed ? framePost(f) : it.post;
      const ends = o === 'h' ? [[i, j], [i + span, j]] : [[i, j], [i, j + span]];
      for (const [vi, vj] of ends) {
        const vk = vi + ',' + vj;
        const cur = vertexPosts.get(vk);
        if (!cur || POST_RANK[pt] > POST_RANK[cur]) vertexPosts.set(vk, pt);
      }
      // cutaway caps
      if (cut < WALL_H && it.cap && base < cut && base + it.h > cut + 0.05) {
        const T = it.capT || 0.62;
        if (it.cap === 'full') caps.push(mtx(x, cut, z, ry, CELL * span, 0.08, T));
        else {
          const jamb = it.jamb || 0.4;
          const dx = (span * CELL) / 2 - jamb / 2;
          const ox = o === 'h' ? dx : 0, oz = o === 'h' ? 0 : dx;
          caps.push(mtx(x - ox, cut, z - oz, ry, jamb + 0.02, 0.08, T + 0.18));
          caps.push(mtx(x + ox, cut, z + oz, ry, jamb + 0.02, 0.08, T + 0.18));
        }
      }
    }
    for (const [k, de] of this.dynEdges) if (!seenDyn.has(k)) { this.root.remove(de.group); this.dynEdges.delete(k); this.openDoors.delete(k); }

    for (const [vk, pt] of vertexPosts) {
      const [vi, vj] = vk.split(',').map(Number);
      const P = POSTS[pt];
      const vb = this.vertexBase(vi, vj);
      push('p:' + pt, P.build, mtx(lineX(vi), vb, lineZ(vj), 0), 'edge');
      if (cut < WALL_H && vb < cut && vb + P.h > cut + 0.05 && (pt === 'stone' || pt === 'brick' || pt === 'cave' || pt === 'fortress')) caps.push(mtx(lineX(vi), cut + 0.005, lineZ(vj), 0, P.w + 0.02, 0.09, P.w + 0.02));
    }

    // ---- objects ----
    const surfaces = new Map();
    for (const ob of d.objects) {
      const it = byId[ob.t];
      if (it.surface) {
        const [w, dd] = footprint(ob.t, ob.r);
        for (let a = 0; a < w; a++) for (let b2 = 0; b2 < dd; b2++) surfaces.set(`${ob.i + a},${ob.j + b2}`, it.surface);
      }
    }
    const seenObj = new Set();
    for (const ob of d.objects) {
      const it = byId[ob.t];
      const [w, dd] = footprint(ob.t, ob.r);
      const x = lineX(ob.i) + (w * CELL) / 2;
      const z = lineZ(ob.j) + (dd * CELL) / 2;
      const [, hiLevel] = this.state.footprintLevels(ob.t, ob.i, ob.j, ob.r);
      const fl = this.state.floorAt(ob.i, ob.j);
      let y = hiLevel * CELL + (fl && !byId[fl].liquid && !byId[fl].pit ? FLOOR_Y : 0);
      if (it.layer === 'item') y += surfaces.get(`${ob.i},${ob.j}`) || 0;
      if (it.layer === 'rug') y += 0.005;
      const ry = ob.r * (Math.PI / 2);
      const m = mtx(x, y, z, ry);
      const b = push('o:' + ob.t, it.build, m, it.layer);
      if (it.light) this.addLight(it.light, m, ob.id);
      if (b.dynamic) {
        seenObj.add(ob.id);
        const sig = `${ob.t}|${x}|${y}|${z}|${ob.r}`;
        let dobj = this.dynObjs.get(ob.id);
        if (dobj && dobj.sig !== sig) { this.root.remove(dobj.group); this.dynObjs.delete(ob.id); dobj = null; }
        if (!dobj) {
          const g = b.dynamic.clone(true);
          g.applyMatrix4(m);
          g.userData.layer = it.layer;
          this.root.add(g);
          dobj = { sig, group: g, lids: [], misc: [], t: this.openChests.has(ob.id) ? 1 : 0, layer: it.layer };
          g.traverse((n) => {
            n.layers.enable(1);
            if (n.userData.lid) dobj.lids.push({ n, rot: n.rotation.x, mimic: n.userData.mimic });
            if (n.userData.bubble || n.userData.spout) dobj.misc.push({ n, kind: n.userData.bubble ? 'bubble' : 'spout', y: n.position.y });
            if (n.userData.pickup) dobj.pickup = n;
            if (n.userData.creature) dobj.creature = { n, y: n.position.y, ry, float: !!n.userData.float, wobble: !!n.userData.wobble, ph: (ob.id * 1.7) % 6.28, yaw: 0, fall: 0, hit: 0, id: ob.id };
            if (n.isMesh) { n.castShadow = !n.userData.noShadow; n.receiveShadow = true; }
          });
          this.dynObjs.set(ob.id, dobj);
        }
      }
    }
    for (const [id, dobj] of this.dynObjs) if (!seenObj.has(id)) { this.root.remove(dobj.group); this.dynObjs.delete(id); this.openChests.delete(id); }

    // ---- apply batches ----
    for (const [key, b] of batches) this.set(key, b.parts, b.layer).update(b.mats, b.layer === 'floor' || b.layer === 'edge' ? b.tints : null);
    for (const [key, s] of this.sets) if (!batches.has(key)) s.update([]);

    this.updateCaps(caps);
    this.collectFlames();
    this.applyLayerVisibility();
    this.needsShadow = true;
  }

  addLight(L, m, id = null) {
    const p = new THREE.Vector3(...L.p).applyMatrix4(m);
    this.lights.push({ pos: p, color: L.c, intensity: L.i, distance: L.d, flicker: L.f, phase: (p.x * 13.1 + p.z * 7.7) % 6.28, id });
  }

  collectFlames() {
    this.flames = [];
    const visit = (g) => g.traverse((n) => { if (n.userData.flame) this.flames.push({ n, ph: (n.position.x * 3.1 + n.position.z * 1.7) % 6.28 }); });
    for (const de of this.dynEdges.values()) visit(de.group);
    for (const dobj of this.dynObjs.values()) visit(dobj.group);
    this.batchFlames();
  }

  // Every torch, candle and brazier flame is the same couple of meshes. Draw each kind as one
  // instanced batch (a few draw calls instead of two per flame) that follows the flame nodes,
  // which still flicker, turn and hide exactly as before.
  batchFlames() {
    for (const b of this.flameBatches || []) { this.root.remove(b.mesh); b.mesh.dispose(); }
    this.flameBatches = [];
    const groups = new Map();
    for (const f of this.flames) {
      f.n.traverse((m) => {
        if (!m.isMesh || (!m.visible && !m.userData.flameBatched) || Array.isArray(m.material)) return;
        const key = m.geometry.uuid + '|' + m.material.uuid;
        if (!groups.has(key)) groups.set(key, { geometry: m.geometry, material: m.material, items: [] });
        groups.get(key).items.push({ m, f });
        m.userData.flameBatched = true;
        m.visible = false;
      });
    }
    for (const g of groups.values()) {
      const mesh = new THREE.InstancedMesh(g.geometry, g.material, g.items.length);
      mesh.frustumCulled = false; // a handful of small flames; cheaper than updating bounds as they flicker
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.root.add(mesh);
      this.flameBatches.push({ mesh, items: g.items });
    }
    this.syncFlames();
  }

  // copy each flame's current place into its batch; hidden flames (cutaway, ceiling) get no size
  syncFlames() {
    if (!this.flameBatches?.length) return;
    for (const f of this.flames) {
      let shown = true;
      for (let o = f.n; o && o !== this.root; o = o.parent) if (!o.visible) { shown = false; break; }
      f.shown = shown;
      if (shown) f.n.updateWorldMatrix(true, true);
    }
    for (const { mesh, items } of this.flameBatches) {
      items.forEach(({ m, f }, k) => mesh.setMatrixAt(k, f.shown ? m.matrixWorld : ZERO));
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  updateCaps(caps) {
    if (!this.capMesh || caps.length > this.capCap) {
      if (this.capMesh) { this.root.remove(this.capMesh); this.capMesh.dispose(); }
      this.capCap = Math.max(64, 1 << Math.ceil(Math.log2(caps.length + 1)));
      const geo = new THREE.BoxGeometry(1, 1, 1);
      geo.translate(0, 0.5, 0);
      this.capMesh = new THREE.InstancedMesh(geo, this.capMat, this.capCap);
      this.capMesh.receiveShadow = true;
      this.root.add(this.capMesh);
    }
    caps.forEach((m, k) => this.capMesh.setMatrixAt(k, m));
    this.capMesh.count = caps.length;
    this.capMesh.instanceMatrix.needsUpdate = true;
    this.capMesh.visible = caps.length > 0;
    if (caps.length) this.capMesh.computeBoundingSphere();
  }

  setWalkMode(on) {
    this.walkMode = on;
    this.applyLayerVisibility();
  }

  setCut(h) {
    this.cutHeight = h;
    cutPlane.constant = h >= WALL_H ? 1e6 : h;
    this.sync();
  }

  // used by the battle map export to look straight down past chandeliers
  setCeilingHidden(on) { this.ceilingHidden = on; this.applyLayerVisibility(); }

  applyLayerVisibility() {
    const hideHigh = (this.cutHeight < WALL_H && !this.walkMode);
    const hideCeil = hideHigh || this.ceilingHidden;
    for (const [key, s] of this.sets) {
      const L = this.setLayer.get(key);
      s.setVisible(!((hideHigh && L === 'wall') || (hideCeil && L === 'ceiling')));
    }
    for (const dobj of this.dynObjs.values()) dobj.group.visible = !((hideHigh && dobj.layer === 'wall') || (hideCeil && dobj.layer === 'ceiling'));
    this.syncFlames();
    this.needsShadow = true;
  }

  // ---------- interaction ----------
  isDoorOpen(k) { return this.openDoors.has(k); }
  toggleDoor(k) {
    const de = this.dynEdges.get(k);
    if (!de) return false;
    if (this.openDoors.has(k)) this.openDoors.delete(k); else this.openDoors.add(k);
    return true;
  }
  openChest(id) {
    if (this.openChests.has(id)) return false;
    this.openChests.add(id);
    return true;
  }
  resetRuntime() {
    this.openDoors.clear();
    this.openChests.clear();
    this.defeated.clear();
    this.consumed.clear();
    for (const d of this.dynObjs.values()) if (d.pickup) d.pickup.visible = true;
    this.creatureHp.clear();
    for (const d of this.dynObjs.values()) if (d.creature) { d.creature.fall = 0; d.creature.hit = 0; }
  }

  consume(id) {
    this.consumed.add(id);
    const d = this.dynObjs.get(id);
    if (d?.pickup) d.pickup.visible = false;
    this.needsShadow = true;
  }

  creatureAt(id) { return this.dynObjs.get(id)?.creature || null; }
  // one blow from the player; returns { hpLeft, defeated }
  hitCreature(id, t) {
    if (this.defeated.has(id)) return { hpLeft: 0, defeated: true, already: true };
    const max = byId[t].hp || 1;
    const hp = (this.creatureHp.has(id) ? this.creatureHp.get(id) : max) - 1;
    this.creatureHp.set(id, hp);
    const c = this.creatureAt(id);
    if (c) c.hit = 0.35;
    if (hp <= 0) this.defeated.add(id);
    return { hpLeft: Math.max(0, hp), defeated: hp <= 0 };
  }

  edgeBlocks(o, i, j) {
    const a = this.state.anchorOf(o, i, j);
    if (!a) return false;
    const it = byId[a.e.t];
    if (!it || !it.blocks) return false;
    if (it.door && this.openDoors.has(a.key)) return false;
    return true;
  }
  // Height of a stair or ramp surface at a world point, or null when no stair covers it.
  // Straight stairs climb toward their back (local -z); spiral stairs climb around their centre.
  stairHeight(x, z) {
    const [i, j] = [Math.floor(x / CELL + GRID_W / 2), Math.floor(z / CELL + GRID_D / 2)];
    for (const ob of this.state.objectsAt(i, j)) {
      const st = byId[ob.t].stair;
      if (!st) continue;
      const [w, d] = footprint(ob.t, ob.r);
      const cx = lineX(ob.i) + (w * CELL) / 2, cz = lineZ(ob.j) + (d * CELL) / 2;
      const ry = ob.r * (Math.PI / 2);
      const dx = x - cx, dz = z - cz;
      const lx = dx * Math.cos(ry) - dz * Math.sin(ry);
      const lz = dx * Math.sin(ry) + dz * Math.cos(ry);
      const [lo] = this.state.footprintLevels(ob.t, ob.i, ob.j, ob.r);
      const base = lo * CELL + FLOOR_Y;
      let t;
      if (st.spiral) {
        let a = Math.atan2(lx, lz);
        if (a < 0) a += Math.PI * 2;
        t = Math.min(1, a / st.sweep);
      } else {
        const L = (byId[ob.t].size || [1, 1])[1] * CELL;
        t = Math.max(0, Math.min(1, (L / 2 - lz) / L));
      }
      return base + st.rise * t;
    }
    return null;
  }

  cellBlocks(i, j) {
    if (i < 0 || j < 0 || i >= GRID_W || j >= GRID_D) return false;
    for (const ob of this.state.objectsAt(i, j)) if (byId[ob.t].block) return true;
    return false;
  }

  applyDoor(de) {
    const t = de.t;
    const e = t * t * (3 - 2 * t);
    for (const nd of de.nodes) {
      if (nd.kind === 'swing') nd.n.rotation.y = nd.rot + nd.open * e;
      else nd.n.position.y = nd.y + nd.open * e;
    }
  }

  update(dt, time) {
    this.time = time;
    let moving = false;
    for (const [k, de] of this.dynEdges) {
      const target = this.openDoors.has(k) ? 1 : 0;
      if (de.t !== target) {
        de.t += Math.sign(target - de.t) * Math.min(Math.abs(target - de.t), dt * 1.4);
        this.applyDoor(de);
        moving = true;
      }
    }
    for (const [id, dobj] of this.dynObjs) {
      const target = this.openChests.has(id) ? 1 : 0;
      if (dobj.t !== target) {
        dobj.t += Math.sign(target - dobj.t) * Math.min(Math.abs(target - dobj.t), dt * 2.2);
        moving = true;
      }
      for (const L of dobj.lids) {
        let a = -1.9 * (1 - Math.pow(1 - dobj.t, 3));
        if (L.mimic && dobj.t > 0.99) a += Math.sin(time * 14) * 0.25 - 0.2;
        L.n.rotation.x = L.rot + a;
      }
      const c = dobj.creature;
      if (c) {
        // idle motion doesn't refresh shadow maps (too costly every frame); falls and hits do
        const n = c.n;
        if (this.defeated.has(c.id)) {
          if (c.fall < 1) moving = true;
          c.fall = Math.min(1, c.fall + dt * 2.5);
          const e = 1 - Math.pow(1 - c.fall, 3);
          n.rotation.x = -1.45 * e;
          n.position.y = c.y + (c.float ? 0.3 : 0.25) * e;
        } else {
          const breathe = Math.sin(time * 2.2 + c.ph);
          n.position.y = c.y + (c.float ? 1.0 + breathe * 0.35 : breathe * 0.03);
          if (c.wobble) n.scale.set(1 + breathe * 0.04, 1 - breathe * 0.05, 1 + breathe * 0.04);
          let want = 0;
          if (this.lookAt) {
            const gp = dobj.group.position;
            const dx = this.lookAt.x - gp.x, dz = this.lookAt.z - gp.z;
            if (dx * dx + dz * dz < 40 * 40) want = Math.atan2(dx, dz) - c.ry;
          }
          let diff = ((want - c.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
          c.yaw += diff * Math.min(1, dt * 3);
          n.rotation.y = c.yaw;
          n.rotation.x = 0;
        }
        if (c.hit > 0) { c.hit -= dt; n.position.x = Math.sin(c.hit * 70) * 0.18 * (c.hit / 0.35); } else n.position.x = 0;
      }
      for (const m of dobj.misc) {
        if (m.kind === 'bubble') {
          m.n.children.forEach((c, k) => {
            const ph = (time * 0.8 + k * 0.25) % 1;
            c.position.y = ph * 0.25;
            c.scale.setScalar(0.4 + ph);
          });
        } else {
          m.n.scale.y = 1 + Math.sin(time * 6) * 0.05;
        }
      }
    }
    for (const f of this.flames) {
      const s = 1 + Math.sin(time * 11 + f.ph) * 0.12 + Math.sin(time * 23 + f.ph * 2) * 0.07;
      f.n.scale.set(1 - (s - 1) * 0.5, s, 1 - (s - 1) * 0.5);
      f.n.rotation.y = time * 2 + f.ph;
    }
    this.syncFlames();
    if (moving) this.needsShadow = true;
  }
}
