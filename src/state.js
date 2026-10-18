import { GRID_W, GRID_D, KEEP_W, KEEP_D, KEEP_I0, KEEP_J0, CELL, MAX_LEVEL, inGrid, cellX, cellZ, lineX, lineZ } from './config.js';
import { byId } from './catalog.js';

export const edgeKey = (o, i, j) => `${o}:${i}:${j}`;
export function parseEdge(k) {
  const [o, i, j] = k.split(':');
  return { o, i: +i, j: +j };
}
export const edgeValid = (o, i, j) =>
  o === 'h' ? i >= 0 && i < GRID_W && j >= 0 && j <= GRID_D : i >= 0 && i <= GRID_W && j >= 0 && j < GRID_D;

// Wide pieces cover several edges in a row. The first (anchor) edge holds {t, f, span};
// each further edge holds {t: 'cover', a: anchorKey}.
export const spanEdges = (o, i, j, span) =>
  Array.from({ length: span }, (_, k) => (o === 'h' ? [o, i + k, j] : [o, i, j + k]));
// world-space centre of an edge piece of the given span
export const edgeCenter = (o, i, j, span = 1) =>
  o === 'h' ? [cellX(i) + ((span - 1) * CELL) / 2, lineZ(j)] : [lineX(i), cellZ(j) + ((span - 1) * CELL) / 2];

// Footprint size after rotation
export function footprint(t, r) {
  const it = byId[t];
  const [w, d] = it.size || [1, 1];
  return r % 2 ? [d, w] : [w, d];
}

const SETTINGS_KEYS = ['name', 'landscape', 'time', 'light'];

export function emptyData() {
  return { v: 1, name: 'Untitled dungeon', landscape: 'meadow', time: 15.5, light: 1, floors: {}, heights: {}, edges: {}, objects: [], nextId: 1 };
}

export class DungeonState {
  constructor() {
    this.data = emptyData();
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
    this.settingListeners = new Set();
    this.dirty = false;
  }

  onChange(fn) { this.listeners.add(fn); }
  onSetting(fn) { this.settingListeners.add(fn); }

  snapshot() {
    const { floors, heights, edges, objects, nextId } = this.data;
    return JSON.stringify({ floors, heights, edges, objects, nextId });
  }

  // Call before a user action that mutates structure
  checkpoint() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 150) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  restore(snap) {
    Object.assign(this.data, { heights: {} }, JSON.parse(snap));
    this.emit();
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
    return true;
  }
  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
    return true;
  }

  emit() {
    this.dirty = true;
    for (const fn of this.listeners) fn();
  }

  setSetting(k, v) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    this.dirty = true;
    for (const fn of this.settingListeners) fn(k, v);
  }

  // ---------- floors ----------
  setFloor(i, j, t) {
    if (!inGrid(i, j)) return false;
    const k = `${i},${j}`;
    if (t) {
      if (this.data.floors[k] === t) return false;
      this.data.floors[k] = t;
    } else {
      if (!(k in this.data.floors)) return false;
      delete this.data.floors[k];
    }
    return true;
  }
  floorAt(i, j) { return this.data.floors[`${i},${j}`] || null; }

  // ---------- heights: whole levels of 3 ft, from -10 (30 ft down) to +10 (30 ft up) ----------
  levelAt(i, j) { return this.data.heights[`${i},${j}`] || 0; }
  topAt(i, j) { return this.levelAt(i, j) * CELL; }
  setLevel(i, j, level) {
    if (!inGrid(i, j)) return false;
    const k = `${i},${j}`;
    const v = Math.max(-MAX_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
    if ((this.data.heights[k] || 0) === v) return false;
    if (v) this.data.heights[k] = v; else delete this.data.heights[k];
    return true;
  }
  // the lowest and highest ground under a footprint
  footprintLevels(t, i, j, r) {
    const [w, d] = footprint(t, r);
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) { const l = this.levelAt(i + a, j + b); lo = Math.min(lo, l); hi = Math.max(hi, l); }
    return [lo, hi];
  }

  // ---------- edges ----------
  setEdge(o, i, j, val) {
    if (!edgeValid(o, i, j)) return false;
    const k = edgeKey(o, i, j);
    const cur = this.data.edges[k];
    if (val) {
      if (cur && cur.t === val.t && cur.f === val.f && !cur.span && !!cur.flip === !!val.flip) return false;
      if (cur) this.removeEdgeGroupAt(o, i, j);
      this.data.edges[k] = val;
    } else {
      if (!cur) return false;
      this.removeEdgeGroupAt(o, i, j);
    }
    return true;
  }

  // place a piece that covers `span` edges starting at (o, i, j)
  setWideEdge(o, i, j, val, span) {
    const keys = spanEdges(o, i, j, span);
    if (!keys.every(([a, b, c]) => edgeValid(a, b, c))) return false;
    const anchor = edgeKey(o, i, j);
    const cur = this.data.edges[anchor];
    if (cur && cur.t === val.t && cur.f === val.f && cur.span === span && !!cur.flip === !!val.flip) return false;
    for (const [a, b, c] of keys) this.removeEdgeGroupAt(a, b, c);
    this.data.edges[anchor] = { ...val, span };
    for (const [a, b, c] of keys.slice(1)) this.data.edges[edgeKey(a, b, c)] = { t: 'cover', a: anchor };
    return true;
  }

  // the anchor of whatever piece sits on this edge: { o, i, j, key, e }
  anchorOf(o, i, j) {
    const k = edgeKey(o, i, j);
    const e = this.data.edges[k];
    if (!e) return null;
    if (e.t !== 'cover') return { o, i, j, key: k, e };
    const a = this.data.edges[e.a];
    return a ? { ...parseEdge(e.a), key: e.a, e: a } : null;
  }

  removeEdgeGroupAt(o, i, j) {
    const k = edgeKey(o, i, j);
    const a = this.anchorOf(o, i, j);
    if (!a) { delete this.data.edges[k]; return; }
    for (const [x, y, z] of spanEdges(a.o, a.i, a.j, a.e.span || 1)) {
      const kk = edgeKey(x, y, z);
      if (kk === a.key || this.data.edges[kk]?.a === a.key) delete this.data.edges[kk];
    }
    delete this.data.edges[k];
  }

  // the piece on this edge (a wide piece reports its anchor's value)
  edgeAt(o, i, j) { return this.anchorOf(o, i, j)?.e || null; }
  edgeRaw(o, i, j) { return this.data.edges[edgeKey(o, i, j)] || null; }

  // ---------- objects ----------
  objectsAt(i, j) {
    const out = [];
    for (const ob of this.data.objects) {
      const [w, d] = footprint(ob.t, ob.r);
      if (i >= ob.i && i < ob.i + w && j >= ob.j && j < ob.j + d) out.push(ob);
    }
    return out;
  }
  objectAt(i, j, layer) {
    return this.objectsAt(i, j).find((o) => byId[o.t].layer === layer) || null;
  }

  canPlace(t, i, j, r, ignoreId = null) {
    return this.placeProblem(t, i, j, r, ignoreId) === null;
  }

  // Why a piece cannot go here, in words for the status bar; null when it can.
  placeProblem(t, i, j, r, ignoreId = null) {
    const it = byId[t];
    const [w, d] = footprint(t, r);
    for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) {
      if (!inGrid(i + a, j + b)) return 'That is outside the build area.';
      const here = this.objectsAt(i + a, j + b);
      for (const o of here) {
        if (o.id === ignoreId) continue;
        const L = byId[o.t].layer;
        if (L === it.layer) {
          if (L === 'wall' && o.r !== r) continue; // one mount per side
          return `${byId[o.t].name} is already there.`;
        }
      }
      if (it.layer === 'ground' || it.layer === 'rug') {
        const f = this.floorAt(i + a, j + b);
        if (f && (byId[f].liquid || byId[f].pit)) return `Nothing can stand on ${byId[f].name.toLowerCase()}.`;
      }
    }
    return null;
  }

  addObject(t, i, j, r) {
    if (!this.canPlace(t, i, j, r)) return null;
    const ob = { id: this.data.nextId++, t, i, j, r };
    this.data.objects.push(ob);
    return ob;
  }

  removeObject(id) {
    const n = this.data.objects.length;
    this.data.objects = this.data.objects.filter((o) => o.id !== id);
    return this.data.objects.length !== n;
  }

  clearAll() {
    this.data.floors = {};
    this.data.heights = {};
    this.data.edges = {};
    this.data.objects = [];
  }

  // ---------- presets ----------
  placeKeep() {
    const i0 = KEEP_I0, j0 = KEEP_J0, W = KEEP_W, D = KEEP_D;
    for (let i = i0; i < i0 + W; i++) for (let j = j0; j < j0 + D; j++) if (!this.floorAt(i, j)) this.setFloor(i, j, 'flagstone');
    for (let i = i0; i < i0 + W; i++) {
      this.setEdge('h', i, j0, { t: 'stoneWall' });
      this.setEdge('h', i, j0 + D, { t: 'stoneWall' });
    }
    for (let j = j0; j < j0 + D; j++) {
      this.setEdge('v', i0, j, { t: 'stoneWall' });
      this.setEdge('v', i0 + W, j, { t: 'stoneWall' });
    }
    this.setWideEdge('h', i0 + W / 2 - 1, j0 + D, { t: 'castleGate', f: 'stoneWall' }, 3);
  }

  hasKeep() {
    return !!this.edgeAt('h', KEEP_I0, KEEP_J0) && !!this.edgeAt('v', KEEP_I0 + KEEP_W, KEEP_J0 + 1);
  }

  // ---------- persistence ----------
  toJSON() { return JSON.stringify(this.data); }
  load(json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    if (!d || typeof d !== 'object' || !d.floors || !d.edges || !Array.isArray(d.objects)) throw new Error('This file is not a Dungeon Forge map.');
    const base = emptyData();
    const next = { ...base, ...d };
    next.objects = next.objects.filter((o) => byId[o.t]);
    for (const k of Object.keys(next.floors)) if (!byId[next.floors[k]]) delete next.floors[k];
    for (const k of Object.keys(next.edges)) {
      const e = next.edges[k];
      if (e.t === 'cover' ? !next.edges[e.a] : !byId[e.t]) delete next.edges[k];
    }
    next.heights = {};
    for (const [k, v] of Object.entries(d.heights || {})) {
      const n = Math.max(-MAX_LEVEL, Math.min(MAX_LEVEL, Math.round(+v || 0)));
      if (n) next.heights[k] = n;
    }
    next.nextId = Math.max(next.nextId || 1, ...next.objects.map((o) => o.id + 1), 1);
    this.data = next;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    for (const k of SETTINGS_KEYS) for (const fn of this.settingListeners) fn(k, this.data[k]);
    this.emit();
  }

  treasure() {
    let gp = 0;
    for (const o of this.data.objects) gp += byId[o.t].gp || 0;
    return gp;
  }
}
