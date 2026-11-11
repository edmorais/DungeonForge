import { GRID_W, GRID_D, KEEP_I0, KEEP_J0, KEEP_W, KEEP_D, inGrid } from './config.js';
import { byId } from './catalog.js';
import { footprint } from './state.js';

// Turn any map into a game by reading how it can be walked: a Start, an Exit as far from it as
// the map allows, a locked door on the only way there with its key somewhere before it, and two
// traps along the way. Whatever the map already has is left alone. Changes the state; the caller
// does checkpoint() and emit(). Returns what was added: { start, exit, lock, traps }.
export function addAdventure(state, { start = null, voidMap = false } = {}) {
  const d = state.data;
  const N = GRID_W * GRID_D;
  const at = (i, j) => j * GRID_W + i;
  const cell = (k) => [k % GRID_W, Math.floor(k / GRID_W)];
  const find = (flag) => d.objects.find((o) => byId[o.t][flag]);
  const added = { start: false, exit: false, lock: false, traps: 0 };

  // squares nobody can stand on, and squares with stairs
  const solid = new Uint8Array(N), stairs = new Uint8Array(N);
  const foes = [];
  for (const ob of d.objects) {
    const it = byId[ob.t];
    if (it.cat === 'creature') { foes.push(ob); continue; }
    const [w, dd] = footprint(ob.t, ob.r);
    for (let a = 0; a < w; a++) for (let b = 0; b < dd; b++) {
      if (!inGrid(ob.i + a, ob.j + b)) continue;
      if (it.block) solid[at(ob.i + a, ob.j + b)] = 1;
      if (it.stair) stairs[at(ob.i + a, ob.j + b)] = 1;
    }
  }
  for (let j = 0; j < GRID_D; j++) for (let i = 0; i < GRID_W; i++) {
    const f = state.floorAt(i, j);
    if (f ? byId[f].pit || f === 'lava' : voidMap) solid[at(i, j)] = 1;
  }
  // the wall line crossed by a step between two neighbouring squares
  const lineOf = (i, j, ni, nj) => (ni !== i ? ['v', Math.max(i, ni), j] : ['h', i, Math.max(j, nj)]);
  // Can the walker step from one square to the next? Doors open, walls do not; going up more
  // than one level (a jump) takes stairs; going down is always possible.
  const pass = (i, j, ni, nj, shut) => {
    if (!inGrid(ni, nj) || solid[at(ni, nj)]) return false;
    const a = state.anchorOf(...lineOf(i, j, ni, nj));
    if (a && (a.key === shut || (byId[a.e.t].blocks && !byId[a.e.t].door))) return false;
    return state.levelAt(ni, nj) - state.levelAt(i, j) <= 1 || !!stairs[at(i, j)] || !!stairs[at(ni, nj)];
  };
  // steps from a square to every square that can be reached from it; `shut` is a door kept closed
  const flood = (from, shut = null) => {
    const dist = new Int16Array(N).fill(-1), prev = new Int32Array(N).fill(-1);
    const open = [].concat(from); // one square, or several to measure from all of them at once
    for (const k of open) dist[k] = 0;
    for (let n = 0; n < open.length; n++) {
      const [i, j] = cell(open[n]);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = at(i + di, j + dj);
        if (!pass(i, j, i + di, j + dj, shut) || dist[k] >= 0) continue;
        dist[k] = dist[open[n]] + 1;
        prev[k] = open[n];
        open.push(k);
      }
    }
    return { dist, prev, count: open.length };
  };
  const clearOf = (i, j) => foes.reduce((m, ob) => Math.min(m, Math.max(Math.abs(ob.i - i), Math.abs(ob.j - j))), 12);

  // ---- where the walk starts ----
  let s = find('start'), from = -1;
  if (s) from = at(s.i, s.j);
  else if (start && inGrid(start[0], start[1]) && !solid[at(start[0], start[1])]) from = at(start[0], start[1]);
  else if (state.hasKeep()) from = at(KEEP_I0 + KEEP_W / 2 - 1, Math.min(GRID_D - 1, KEEP_J0 + KEEP_D + 3));
  else {
    // a floored square near the middle and away from creatures; of the few best, the one that
    // opens onto the most of the map
    const cands = [];
    for (const k in d.floors) {
      const [i, j] = k.split(',').map(Number);
      if (solid[at(i, j)] || stairs[at(i, j)] || !state.canPlace('startMark', i, j, 0)) continue; // dry and free
      cands.push([Math.hypot(i - GRID_W / 2, j - GRID_D / 2 - 7) + (12 - clearOf(i, j)) * 20, at(i, j)]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    let most = 0;
    const tried = new Uint8Array(N);
    for (let n = 0, tries = 0; n < cands.length && tries < 6; n++) {
      if (tried[cands[n][1]]) continue;
      tries++;
      const f = flood(cands[n][1]);
      for (let k = 0; k < N; k++) if (f.dist[k] >= 0) tried[k] = 1;
      if (f.count > most) { most = f.count; from = cands[n][1]; }
    }
  }
  if (from < 0) return added;
  const all = flood(from);

  // ---- the exit: the farthest square the walk can reach ----
  let x = find('exit'), to = -1;
  if (x) to = at(x.i, x.j);
  else {
    let far = 5;
    for (let k = 0; k < N; k++) {
      const [i, j] = cell(k);
      if (all.dist[k] <= far || stairs[k] || !state.floorAt(i, j) || !state.canPlace('exitMark', i, j, 0)) continue;
      far = all.dist[k]; to = k;
    }
    if (to >= 0) { x = state.addObject('exitMark', ...cell(to), 0); added.exit = !!x; }
  }
  // the way from start to exit, as squares
  const path = [];
  if (to >= 0 && all.dist[to] >= 0) for (let k = to; k >= 0; k = all.prev[k]) path.unshift(k);
  if (!s) {
    const [i, j] = cell(from);
    const nxt = path.length > 1 ? cell(path[1]) : [i, j - 1];
    const r = nxt[1] < j ? 0 : nxt[0] < i ? 1 : nxt[1] > j ? 2 : 3; // face the first step of the way
    if (state.canPlace('startMark', i, j, r)) { s = state.addObject('startMark', i, j, r); added.start = !!s; }
  }

  // ---- a locked door on the only way to the exit, and its key on the near side ----
  const used = new Set([from, to]);
  if (path.length > 6 && !find('key') && !Object.values(d.edges).some((e) => byId[e.t]?.locked)) {
    for (let n = path.length - 1; n > 0 && !added.lock; n--) {
      const a = state.anchorOf(...lineOf(...cell(path[n - 1]), ...cell(path[n])));
      if (!a || !['woodDoor', 'ironDoor'].includes(a.e.t)) continue;
      if (flood(from, a.key).dist[to] >= 0) continue; // there is another way round this door
      // the key goes as far off the way to the door as the map allows, so it has to be looked for
      const off = flood(path.slice(0, n), a.key);
      let keyAt = -1, far = 2;
      for (let k = 0; k < N; k++) {
        const [i, j] = cell(k);
        if (off.dist[k] <= far || used.has(k) || stairs[k] || !state.floorAt(i, j) || !state.canPlace('key', i, j, 0)) continue;
        far = off.dist[k]; keyAt = k;
      }
      if (keyAt < 0) continue;
      state.setEdge(a.o, a.i, a.j, { ...a.e, t: 'lockedDoor' });
      state.addObject('key', ...cell(keyAt), 0);
      used.add(keyAt);
      added.lock = true;
    }
  }

  // ---- two traps on the way ----
  if (path.length > 10 && !d.objects.some((o) => { const tr = byId[o.t].trap; return tr && tr.once; })) {
    for (const [t, share] of [['plate', 0.45], ['fireRune', 0.75]]) {
      const mid = Math.round((path.length - 1) * share);
      for (let off = 0; off < 6; off++) {
        const k = path[mid + (off % 2 ? -1 : 1) * Math.ceil(off / 2)];
        if (k === undefined || used.has(k) || stairs[k] || all.dist[k] < 3 || all.dist[to] - all.dist[k] < 2) continue;
        const [i, j] = cell(k);
        if (!state.floorAt(i, j) || !state.addObject(t, i, j, 0)) continue;
        used.add(k);
        added.traps++;
        break;
      }
    }
  }
  return added;
}

// what addAdventure did, in a sentence for a toast
export function describeAdventure(a) {
  const parts = [];
  if (a.start) parts.push('a start');
  if (a.exit) parts.push('an exit');
  if (a.lock) parts.push('a locked door and its key');
  if (a.traps) parts.push(a.traps === 1 ? 'a trap' : `${a.traps} traps`);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
