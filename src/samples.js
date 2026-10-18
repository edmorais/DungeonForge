import { KEEP_I0, KEEP_J0, KEEP_W, KEEP_D, GRID_W, GRID_D } from './config.js';

// Programmatic sample maps. Coordinates in the crypt are relative to the keep's corner.

function helpers(state, i0, j0) {
  const F = (a0, b0, a1, b1, t) => { for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) state.setFloor(i0 + a, j0 + b, t); };
  const HW = (a0, a1, b, t = 'stoneWall') => { for (let a = a0; a <= a1; a++) state.setEdge('h', i0 + a, j0 + b, { t }); };
  const VW = (a, b0, b1, t = 'stoneWall') => { for (let b = b0; b <= b1; b++) state.setEdge('v', i0 + a, j0 + b, { t }); };
  const D = (o, a, b, t = 'woodDoor', f = 'stoneWall') => state.setEdge(o, i0 + a, j0 + b, { t, f });
  const O = (t, a, b, r = 0) => state.addObject(t, i0 + a, j0 + b, r);
  return { F, HW, VW, D, O };
}

export function sunkenCrypt(state) {
  state.clearAll();
  state.placeKeep();
  const { F, HW, VW, D, O } = helpers(state, KEEP_I0, KEEP_J0);

  // --- Great hall (a 14..25, b 8..19) ---
  F(14, 8, 25, 19, 'marble');
  HW(14, 25, 8);
  VW(14, 8, 19);
  VW(26, 8, 19);
  state.setWideEdge('h', KEEP_I0 + 19, KEEP_J0 + 8, { t: 'greatDoors', f: 'stoneWall' }, 2);
  D('v', 14, 14, 'ironDoor');
  D('v', 26, 14, 'archway');
  for (const b of [10, 13, 16]) { O('pillar', 16, b); O('pillar', 23, b); }
  O('rug', 19, 12);
  O('throne', 19, 9, 0);
  O('brazier', 17, 9);
  O('brazier', 22, 9);
  O('banner', 15, 8, 0);
  O('banner', 24, 8, 0);
  O('chandelier', 19, 15);
  O('chandelier', 20, 11);
  O('statue', 15, 18, 0);
  O('statue', 24, 18, 0);
  O('torch', 18, 19, 2);
  O('torch', 21, 19, 2);
  O('torch', 14, 11, 1);
  O('torch', 25, 11, 3);

  // --- Chapel (a 14..25, b 0..7) ---
  F(14, 0, 25, 7, 'flagstone');
  VW(14, 0, 7);
  VW(26, 0, 7);
  O('altar', 19, 1, 0);
  O('candelabra', 17, 1);
  O('candelabra', 22, 1);
  for (const b of [3, 5]) { O('bench', 16, b); O('bench', 22, b); }
  state.setEdge('h', KEEP_I0 + 17, KEEP_J0, { t: 'stainedWindow', f: 'stoneWall' });
  state.setEdge('h', KEEP_I0 + 22, KEEP_J0, { t: 'stainedWindow', f: 'stoneWall' });
  O('blueBanner', 14, 3, 1);
  O('blueBanner', 25, 3, 3);
  O('hangLantern', 19, 5);

  // --- Library (a 0..13, b 0..7) ---
  F(0, 0, 13, 7, 'planks');
  HW(0, 13, 8);
  D('v', 14, 4, 'woodDoor');
  for (let a = 1; a <= 12; a++) if (a !== 6 && a !== 7) O('bookshelf', a, 0, 0);
  O('bookshelf', 0, 3, 1);
  O('bookshelf', 0, 4, 1);
  O('rug', 5, 3);
  O('table', 5, 4, 0);
  O('candles', 5, 4);
  O('potions', 6, 4);
  O('chair', 5, 5, 2);
  O('chair', 6, 3, 0);
  O('lectern', 10, 5, 2);
  O('alchemy', 2, 6, 0);
  O('candelabra', 12, 3);
  O('torch', 13, 6, 3);
  state.setEdge('h', KEEP_I0 + 3, KEEP_J0, { t: 'window', f: 'stoneWall' });
  state.setEdge('h', KEEP_I0 + 10, KEEP_J0, { t: 'window', f: 'stoneWall' });

  // --- Barracks (a 0..13, b 8..19) ---
  F(0, 8, 13, 19, 'planks');
  D('h', 7, 8, 'woodDoor');
  for (let a = 1; a <= 11; a += 3) O('bed', a, 17, 0);
  O('bed', 1, 10, 0);
  O('weaponRack', 0, 13, 1);
  O('weaponRack', 0, 14, 1);
  O('table', 6, 12, 0);
  O('chair', 6, 11, 2);
  O('chair', 7, 13, 0);
  O('candles', 7, 12);
  O('coins', 6, 12);
  O('barrel', 12, 9);
  O('barrel', 12, 10);
  O('crates', 11, 9);
  O('chest', 4, 9, 2);
  O('roundTable', 10, 13);
  O('brazier', 9, 15);
  O('torch', 3, 8, 0);
  O('torch', 13, 16, 3);
  O('shield', 4, 19, 2);
  O('shield', 10, 19, 2);

  // --- Prison (a 26..39, b 12..19) ---
  F(26, 12, 39, 19, 'cobble');
  HW(26, 39, 12);
  for (const [a0, a1] of [[27, 30], [31, 34], [35, 38]]) {
    HW(a0, a1, 16, 'bars');
    VW(a1 + 1, 16, 19, 'stoneWall');
    D('h', a0 + 1, 16, 'portcullis');
  }
  VW(27, 16, 19);
  F(27, 16, 38, 19, 'dirt');
  O('bones', 28, 18);
  O('cage', 33, 18);
  O('bones', 36, 17);
  O('hay', 37, 19);
  O('torch', 30, 12, 0);
  O('torch', 36, 12, 0);
  O('barrel', 39, 13);
  O('weaponRack', 39, 15, 3);

  // --- Crypt (a 26..39, b 0..11) ---
  F(26, 0, 39, 11, 'mossy');
  D('h', 33, 12, 'ironDoor');
  for (const a of [28, 31]) for (const b of [2, 7]) O('sarcophagus', a, b, 0);
  O('candles', 29, 5);
  O('spiritBrazier', 34, 5);
  O('cobweb', 26, 0, 0);
  O('cobweb', 35, 11, 2);
  O('glowShrooms', 27, 10);
  O('bones', 33, 9);
  O('urn', 26, 6);
  O('urn', 35, 1);
  F(29, 9, 31, 10, 'water');
  O('spikes', 35, 3);
  // secret vault (a 36..39, b 0..5)
  VW(36, 0, 5);
  HW(36, 39, 6);
  D('v', 36, 3, 'secretDoor');
  F(36, 0, 39, 5, 'marble');
  O('hoard', 37, 2);
  O('ornateChest', 37, 0, 2);
  O('mimic', 39, 5, 3);
  O('crown', 39, 0);
  O('gems', 36, 5);
  O('crystal', 36, 0);
  O('amethyst', 39, 2);
  // inhabitants
  O('skeleton', 30, 5, 2);
  O('skeleton', 33, 3, 1);
  O('wraith', 38, 4, 1);
  O('cultist', 18, 3, 0);
  O('cultist', 21, 3, 0);
  O('orc', 9, 11, 2);
  O('goblin', 2, 12, 1);
  O('ooze', 32, 13);
  O('spider', 33, 6, 1);

  // outside the keep
  const ent = KEEP_I0 + KEEP_W / 2;
  for (let j = KEEP_J0 + KEEP_D; j < GRID_D; j++) for (const di of [-1, 0]) state.setFloor(ent + di, j, 'cobble');
  state.addObject('lanternPost', ent - 3, KEEP_J0 + KEEP_D + 1, 0);
  state.addObject('lanternPost', ent + 2, KEEP_J0 + KEEP_D + 1, 2);
  state.addObject('grave', KEEP_I0 - 4, KEEP_J0 + 4, 0);
  state.addObject('grave', KEEP_I0 - 6, KEEP_J0 + 5, 0);
  state.addObject('grave', KEEP_I0 - 4, KEEP_J0 + 7, 0);
  state.addObject('deadTree', KEEP_I0 - 7, KEEP_J0 + 9);
  state.addObject('oak', KEEP_I0 + KEEP_W + 4, KEEP_J0 + 5);
  state.addObject('oak', KEEP_I0 + KEEP_W + 6, KEEP_J0 + 12);
  state.addObject('boulder', KEEP_I0 + KEEP_W + 3, KEEP_J0 + 17);
  state.addObject('well', ent + 6, KEEP_J0 + KEEP_D + 5);
  state.data.name = 'The sunken crypt';
}

export function banditCamp(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, HW, VW, D, O } = helpers(state, cx - 14, cz - 10);
  // palisade ring 28 x 20 squares
  HW(0, 27, 0, 'palisade');
  HW(0, 27, 20, 'palisade');
  VW(0, 0, 19, 'palisade');
  VW(28, 0, 19, 'palisade');
  state.setWideEdge('h', cx - 14 + 13, cz - 10 + 20, { t: 'palisadeGate', f: 'log' }, 2);
  // inner ground
  F(1, 1, 26, 18, 'dirt');
  for (let b = 12; b <= 19; b++) F(13, b, 14, b, 'cobble');
  // camp centre
  O('campfire', 13, 9);
  O('bench', 11, 7, 0);
  O('bench', 14, 11, 0);
  O('logPile', 16, 8);
  O('stump', 10, 10);
  // tents
  O('tent', 3, 2, 0);
  O('tent', 7, 2, 0);
  O('tent', 19, 2, 0);
  O('tent', 23, 2, 0);
  O('bedroll', 2, 7, 1);
  O('bedroll', 5, 8, 0);
  // chief's tent area
  O('rug', 21, 10, 1);
  O('table', 22, 11, 0);
  O('candles', 22, 11);
  O('coins', 23, 11);
  O('chair', 22, 12, 2);
  O('ornateChest', 26, 10, 3);
  O('chest', 26, 12, 3);
  O('lanternPost', 20, 14, 0);
  // stores and prisoner
  O('crates', 2, 14);
  O('crates', 3, 15);
  O('barrel', 2, 16);
  O('barrel', 3, 17);
  O('hay', 5, 17);
  O('cage', 8, 15);
  O('weaponRack', 1, 11, 1);
  O('anvil', 6, 12);
  O('brazier', 7, 12);
  O('well', 18, 16);
  O('lanternPost', 10, 18, 0);
  O('lanternPost', 16, 18, 2);
  O('mimic', 25, 17, 2);
  O('goblin', 12, 10, 1);
  O('goblin', 15, 9, 3);
  O('orc', 23, 12, 2);
  O('ogre', 11, 16, 2);
  // outside
  O('oak', -4, 4);
  O('oak', -6, 12);
  O('pine', 32, 3);
  O('pine', 33, 9);
  O('pine', 31, 16);
  O('boulder', -3, 18);
  O('flowers', 20, 23);
  O('flowers', 6, 22);
  O('standingStone', 34, 22);
  O('bush', -2, 22);
  state.data.name = 'Bandit camp at Greyford';
}

export function ruinedShrine(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, HW, VW, O } = helpers(state, cx - 8, cz - 6);
  F(0, 0, 15, 11, 'cobble');
  F(4, 3, 11, 8, 'marble');
  HW(0, 5, 0, 'ruinWall');
  HW(9, 15, 0, 'lowWall');
  VW(0, 0, 6, 'ruinWall');
  VW(16, 3, 11, 'lowWall');
  HW(2, 7, 12, 'lowWall');
  for (const [a, b] of [[3, 2], [12, 2], [3, 9], [12, 9]]) O('ruinColumn', a, b);
  O('pillar', 6, 3);
  O('pillar', 9, 3);
  O('fountain', 7, 5);
  O('statue', 7, 1, 0);
  O('statue', 8, 1, 0);
  O('standingStone', 1, 10);
  O('crystal', 14, 1);
  O('sword', 13, 6);
  O('flowers', 2, 4);
  O('flowers', 10, 10);
  O('rocks', 5, 10);
  O('mushrooms', 15, 9);
  O('urn', 4, 7);
  O('idol', 11, 8);
  O('bush', -2, 3);
  O('oak', -4, 8);
  O('oak', 20, 2);
  O('pine', 19, 11);
  O('dragon', 19, 5, 3);
  O('skeleton', 6, 9, 2);
  O('skeleton', 10, 2, 0);
  state.data.name = 'Shrine of the drowned saint';
}

// ---------- random keep generator ----------
import { mulberry } from './config.js';
import { byId } from './catalog.js';

const THEMES = {
  throne: { floor: 'marble', items: [['throne', 'northCenter'], ['rug', 'center'], ['brazier', 'any', 2], ['pillar', 'any', 4], ['statue', 'wall', 2], ['chandelier', 'ceiling', 2], ['banner', 'mount', 3], ['ogre', 'any']] },
  library: { floor: 'planks', items: [['bookshelf', 'wall', 7], ['table', 'center'], ['candles', 'onTable'], ['potions', 'onTable'], ['chair', 'any', 2], ['lectern', 'any'], ['candelabra', 'any'], ['wraith', 'any']] },
  barracks: { floor: 'planks', items: [['bed', 'wall', 4], ['weaponRack', 'wall', 2], ['chest', 'any'], ['barrel', 'any', 2], ['roundTable', 'center'], ['shield', 'mount', 2], ['orc', 'any', 2]] },
  treasury: { floor: 'marble', items: [['hoard', 'center'], ['ornateChest', 'wall'], ['chest', 'wall', 2], ['mimic', 'wall'], ['gems', 'any'], ['coins', 'any', 2], ['crown', 'any'], ['crystal', 'any'], ['spider', 'any']] },
  chapel: { floor: 'flagstone', items: [['altar', 'northCenter'], ['candelabra', 'any', 2], ['bench', 'any', 4], ['blueBanner', 'mount', 2], ['hangLantern', 'ceiling'], ['cultist', 'any', 2]] },
  storage: { floor: 'dirt', items: [['barrel', 'wall', 4], ['crates', 'wall', 4], ['hay', 'any', 2], ['urn', 'any'], ['cobweb', 'ceiling', 2], ['goblin', 'any', 2]] },
  prison: { floor: 'cobble', items: [['cage', 'any', 2], ['bones', 'any', 3], ['spikes', 'any', 2], ['weaponRack', 'wall'], ['ooze', 'any']] },
  crypt: { floor: 'mossy', items: [['sarcophagus', 'any', 4], ['urn', 'wall', 2], ['candles', 'any', 2], ['cobweb', 'ceiling', 3], ['spiritBrazier', 'any'], ['glowShrooms', 'any'], ['skeleton', 'any', 3]] },
  alchemy: { floor: 'flagstone', items: [['alchemy', 'wall'], ['cauldron', 'center'], ['bookshelf', 'wall', 2], ['potions', 'any'], ['candelabra', 'any'], ['crystal', 'any'], ['cultist', 'any']] },
};

export function randomKeep(state, seed = Date.now()) {
  const rand = mulberry(seed >>> 0);
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  state.clearAll();
  state.placeKeep();
  const I0 = KEEP_I0, J0 = KEEP_J0;
  const doorCells = new Set();
  const markDoor = (o, i, j) => {
    if (o === 'h') { doorCells.add(`${i},${j - 1}`); doorCells.add(`${i},${j}`); }
    else { doorCells.add(`${i - 1},${j}`); doorCells.add(`${i},${j}`); }
  };
  for (const di of [-1, 0, 1]) markDoor('h', I0 + KEEP_W / 2 + di, J0 + KEEP_D);

  // binary space partition into rooms (inclusive cell bounds, absolute)
  const leaves = [];
  const split = (a0, b0, a1, b1, depth) => {
    const w = a1 - a0 + 1, h = b1 - b0 + 1;
    const canV = w >= 10, canH = h >= 8;
    if ((!canV && !canH) || (depth > 2 && rand() < 0.3) || w * h < 40) { leaves.push([a0, b0, a1, b1]); return; }
    const vertical = canV && (!canH || w / h > 1.2 || (w / h > 0.8 && rand() < 0.5));
    const doorTypes = ['woodDoor', 'woodDoor', 'ironDoor', 'archway', 'doubleDoor', 'greatDoors', 'grandArch'];
    // a door on a partition; wide ones need two squares of wall that stay inside the room run
    const putDoor = (o, i, j, lo, hi) => {
      const t = doorTypes[ri(0, doorTypes.length - 1)];
      const span = byId[t].span || 1;
      const along = o === 'h' ? i : j;
      if (span > 1 && along + 1 <= hi) {
        state.setWideEdge(o, i, j, { t, f: 'stoneWall' }, span);
        markDoor(o, i, j);
        markDoor(o, o === 'h' ? i + 1 : i, o === 'h' ? j : j + 1);
      } else {
        state.setEdge(o, i, j, { t: span > 1 ? 'doubleDoor' : t, f: 'stoneWall' });
        markDoor(o, i, j);
      }
      void lo;
    };
    if (vertical) {
      const s = ri(a0 + 4, a1 - 4);
      for (let j = b0; j <= b1; j++) state.setEdge('v', s + 1, j, { t: 'stoneWall' });
      const dj = ri(b0 + 1, b1 - 1);
      putDoor('v', s + 1, dj, b0, b1 - 1);
      split(a0, b0, s, b1, depth + 1);
      split(s + 1, b0, a1, b1, depth + 1);
    } else {
      const s = ri(b0 + 3, b1 - 4);
      for (let i = a0; i <= a1; i++) state.setEdge('h', i, s + 1, { t: 'stoneWall' });
      const di = ri(a0 + 1, a1 - 1);
      putDoor('h', di, s + 1, a0, a1 - 1);
      split(a0, b0, a1, s, depth + 1);
      split(a0, s + 1, a1, b1, depth + 1);
    }
  };
  split(I0, J0, I0 + KEEP_W - 1, J0 + KEEP_D - 1, 0);

  // themes: biggest room is the throne hall, then a shuffled mix
  leaves.sort((p, q) => (q[2] - q[0] + 1) * (q[3] - q[1] + 1) - (p[2] - p[0] + 1) * (p[3] - p[1] + 1));
  const pool = ['library', 'barracks', 'treasury', 'chapel', 'storage', 'prison', 'crypt', 'alchemy'];
  for (let k = pool.length - 1; k > 0; k--) { const m = ri(0, k); [pool[k], pool[m]] = [pool[m], pool[k]]; }
  leaves.forEach((L, n) => {
    const theme = n === 0 ? 'throne' : pool[(n - 1) % pool.length];
    furnish(state, L, THEMES[theme], rand, doorCells);
  });

  // windows on the outer north wall, a path and lanterns outside
  for (let i = I0 + 3; i < I0 + KEEP_W - 2; i += ri(5, 8)) state.setEdge('h', i, J0, { t: 'window', f: 'stoneWall' });
  const ent = I0 + KEEP_W / 2;
  for (let j = J0 + KEEP_D; j < GRID_D; j++) for (const di of [-1, 0]) state.setFloor(ent + di, j, 'cobble');
  state.addObject('lanternPost', ent - 3, J0 + KEEP_D + 1, 0);
  state.addObject('lanternPost', ent + 2, J0 + KEEP_D + 1, 2);
  state.data.name = keepName(rand);
  return leaves.length;
}

function furnish(state, [a0, b0, a1, b1], theme, rand, doorCells) {
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  for (let i = a0; i <= a1; i++) for (let j = b0; j <= b1; j++) state.setFloor(i, j, theme.floor);
  const blocksDoor = (t, i, j, r) => {
    const [w, d] = footprintOf(t, r);
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) if (doorCells.has(`${i + x},${j + z}`)) return true;
    return false;
  };
  const inRoom = (t, i, j, r) => {
    const [w, d] = footprintOf(t, r);
    return i >= a0 && j >= b0 && i + w - 1 <= a1 && j + d - 1 <= b1;
  };
  // a spot against a random wall; every model's back is -z, so r = wall side faces it into the room
  const wallSpot = (t) => {
    const side = ri(0, 3);
    const [w, d] = footprintOf(t, side);
    if (side === 0) return [ri(a0, a1 - w + 1), b0, 0];
    if (side === 2) return [ri(a0, a1 - w + 1), b1 - d + 1, 2];
    if (side === 1) return [a0, ri(b0, b1 - d + 1), 1];
    return [a1 - w + 1, ri(b0, b1 - d + 1), 3];
  };
  const place = (t, i, j, r, layer) => {
    if (!inRoom(t, i, j, r)) return null;
    if (layer === 'ground' && blocksDoor(t, i, j, r)) return null;
    return state.addObject(t, i, j, r);
  };
  // torches on the walls
  const nT = Math.max(2, Math.round((a1 - a0 + b1 - b0) / 5));
  let lit = 0;
  for (let k = 0; k < 40 && lit < nT; k++) { const [i, j, r] = wallSpot('torch'); if (place('torch', i, j, r, 'wall')) lit++; }
  const cx = Math.floor((a0 + a1) / 2), cz = Math.floor((b0 + b1) / 2);
  let tableCell = null;
  for (const [t, where, count = 1] of theme.items) {
    const layer = t === 'rug' ? 'rug' : ['banner', 'blueBanner', 'shield', 'torch'].includes(t) ? 'wall' : ['chandelier', 'hangLantern', 'cobweb'].includes(t) ? 'ceiling' : ['candles', 'potions', 'coins', 'gems', 'bones'].includes(t) ? 'item' : 'ground';
    for (let c = 0; c < count; c++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        let i, j, r = ri(0, 3);
        if (where === 'northCenter') { r = 0; i = cx - (t === 'altar' ? 1 : 0) + (attempt ? ri(-1, 1) : 0); j = b0 + (attempt > 3 ? 1 : 0); }
        else if (where === 'center') { r = t === 'rug' ? 0 : r; const [w, d] = footprintOf(t, r); i = cx - Math.floor((w - 1) / 2) + (attempt ? ri(-1, 1) : 0); j = cz - Math.floor((d - 1) / 2) + (attempt ? ri(-1, 1) : 0); }
        else if (where === 'wall' || where === 'mount') { [i, j, r] = wallSpot(t); }
        else if (where === 'onTable') { if (!tableCell) break; [i, j] = tableCell; r = 0; tableCell = [tableCell[0] + 1, tableCell[1]]; }
        else { i = ri(a0 + 1, Math.max(a0 + 1, a1 - 1)); j = ri(b0 + 1, Math.max(b0 + 1, b1 - 1)); }
        const ob = place(t, i, j, r, layer);
        if (ob) { if (t === 'table') tableCell = [i, j]; break; }
        if (where === 'onTable') break;
      }
    }
  }
}

import { footprint as footprintOf } from './state.js';

const NAMES_A = ['Hollow', 'Sunken', 'Ashen', 'Gloam', 'Iron', 'Raven', 'Thorn', 'Ember', 'Weeping', 'Silent', 'Bleak', 'Gilded'];
const NAMES_B = ['keep', 'hold', 'bastion', 'vault', 'citadel', 'tower', 'priory', 'barrow'];
function keepName(rand) {
  const a = NAMES_A[Math.floor(rand() * NAMES_A.length)], b = NAMES_B[Math.floor(rand() * NAMES_B.length)];
  return `The ${a.toLowerCase()} ${b}`.replace(/^the (\w)/, (m, c) => 'The ' + c);
}

// Furnish one rectangular room by theme (used by the Room tool).
export const ROOM_THEMES = [['', 'Empty'], ['throne', 'Throne hall'], ['library', 'Library'], ['barracks', 'Barracks'], ['treasury', 'Treasury'], ['chapel', 'Chapel'], ['storage', 'Storeroom'], ['prison', 'Prison'], ['crypt', 'Crypt'], ['alchemy', 'Alchemy lab']];
export function furnishRoom(state, rect, themeId, seed = Date.now()) {
  const theme = THEMES[themeId];
  if (!theme) return;
  const [a0, b0, a1, b1] = rect;
  // keep doorways clear: squares on both sides of any door on the room's outline
  const doorCells = new Set();
  const mark = (o, i, j) => {
    const e = state.edgeAt(o, i, j);
    if (!e || !byId[e.t].framed) return;
    if (o === 'h') { doorCells.add(`${i},${j - 1}`); doorCells.add(`${i},${j}`); } else { doorCells.add(`${i - 1},${j}`); doorCells.add(`${i},${j}`); }
  };
  for (let i = a0; i <= a1; i++) { mark('h', i, b0); mark('h', i, b1 + 1); }
  for (let j = b0; j <= b1; j++) { mark('v', a0, j); mark('v', a1 + 1, j); }
  furnish(state, rect, theme, mulberry(seed >>> 0), doorCells);
}

// ---------- presets built on raised and sunken ground ----------
// Straight stairs climb toward: r 0 north, r 1 west, r 2 south, r 3 east.
// A flight stands on the lower squares and rises by its own height (steps and ramps 3 ft, stairs 6 ft, long stairs and spirals 9 ft).
function levelHelpers(state, i0, j0) {
  const base = helpers(state, i0, j0);
  const L = (a0, b0, a1, b1, level) => { for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) state.setLevel(i0 + a, j0 + b, level); };
  const lv = (a, b) => state.levelAt(i0 + a, j0 + b);
  // a parapet wall on every side of the rectangle that drops away, except where `open` says ("a,b,side" with side n/s/e/w)
  const rim = (a0, b0, a1, b1, t, open = new Set()) => {
    const setEdge = (o, i, j, v) => { if (!state.edgeAt(o, i, j)) state.setEdge(o, i, j, v); };
    for (let a = a0; a <= a1; a++) {
      if (!open.has(`${a},${b0},n`) && lv(a, b0 - 1) < lv(a, b0)) setEdge('h', i0 + a, j0 + b0, { t });
      if (!open.has(`${a},${b1},s`) && lv(a, b1 + 1) < lv(a, b1)) setEdge('h', i0 + a, j0 + b1 + 1, { t });
    }
    for (let b = b0; b <= b1; b++) {
      if (!open.has(`${a0},${b},w`) && lv(a0 - 1, b) < lv(a0, b)) setEdge('v', i0 + a0, j0 + b, { t });
      if (!open.has(`${a1},${b},e`) && lv(a1 + 1, b) < lv(a1, b)) setEdge('v', i0 + a1 + 1, j0 + b, { t });
    }
  };
  return { ...base, L, lv, rim };
}

// A stepped temple of four tiers rising 24 ft out of the desert, with a stair up every face.
export function ziggurat(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, L, O, rim } = levelHelpers(state, cx - 11, cz - 13); // base spans a 0..21, b 0..21
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const a0 = 2 * t, a1 = 21 - 2 * t;
    L(a0, a0, a1, a1, 2 * (t + 1));
    F(a0, a0, a1, a1, t === tiers - 1 ? 'marble' : 'flagstone');
  }
  // grand processional stair on the south face, plain stairs on the others
  for (let t = 0; t < tiers; t++) {
    const s = 21 - 2 * t; // south edge row of this tier's ring... the ring is rows s-1, s
    if (t < tiers - 1) {
      O('grandStairs', 10, s - 1, 0);
      O('stairs', 10, 2 * t, 2);
      O('stairs', s - 1, 10, 1);
      O('stairs', 2 * t, 11, 3);
    }
  }
  // the first flights stand on the sand around the base
  F(10, 22, 11, 23, 'flagstone');
  O('grandStairs', 10, 22, 0);
  F(10, -2, 10, -1, 'flagstone'); O('stairs', 10, -2, 2);
  F(22, 10, 23, 10, 'flagstone'); O('stairs', 22, 10, 1);
  F(-2, 11, -1, 11, 'flagstone'); O('stairs', -2, 11, 3);
  // shrine of the sun on the summit (a 6..15, b 6..15)
  rim(6, 6, 15, 15, 'colonnade', new Set(['10,15,s', '11,15,s', '10,6,n', '15,10,e', '6,11,w']));
  O('altar', 10, 9, 0);
  O('idol', 10, 8);
  O('crown', 11, 8);
  O('spiritBrazier', 8, 8);
  O('spiritBrazier', 13, 8);
  O('rug', 10, 10, 0);
  O('statue', 7, 7, 2);
  O('statue', 14, 7, 2);
  O('gems', 9, 9);
  O('coins', 12, 9);
  O('cultist', 9, 12, 0);
  O('cultist', 12, 12, 0);
  O('urn', 7, 14);
  O('urn', 14, 14);
  // fire bowls at the corners of each tier
  for (let t = 0; t < tiers - 1; t++) {
    const a0 = 2 * t, a1 = 21 - 2 * t;
    for (const [a, b] of [[a0, a0], [a1, a0], [a0, a1], [a1, a1]]) O('brazier', a, b);
  }
  // processional way with reflecting pools
  F(10, 24, 11, 35, 'cobble');
  for (let b = 25; b <= 34; b += 3) { O('statue', 9, b, 0); O('statue', 12, b, 0); }
  L(4, 25, 7, 33, -1); F(4, 25, 7, 33, 'water');
  L(14, 25, 17, 33, -1); F(14, 25, 17, 33, 'water');
  for (const [a, b] of [[3, 24], [8, 24], [13, 24], [18, 24], [3, 34], [8, 34], [13, 34], [18, 34]]) O('palm', a, b);
  for (const [a, b] of [[-6, 4], [-8, 15], [27, 3], [29, 18], [-4, 28], [25, 30]]) O('cactus', a, b);
  for (const [a, b] of [[-5, 9], [26, 12], [24, -4], [-3, -3]]) O('rocks', a, b);
  O('ruinColumn', -3, 21);
  O('ruinColumn', 25, 22);
  O('skeleton', 21, 27, 1);
  O('lanternPost', 9, 35, 0);
  O('lanternPost', 12, 35, 0);
  state.data.name = 'Ziggurat of the Dawn Sun';
}

// A mine sunk into the hills: a surface yard, then drifts at 9, 15 and 24 ft down, ending in a forge over lava.
export function deepMine(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, O, L, HW, VW, D } = levelHelpers(state, cx - 20, cz - 15); // a 0..39, b 0..31
  // surface yard behind a palisade
  F(0, 20, 15, 31, 'dirt');
  HW(0, 15, 32, 'palisade');
  VW(0, 20, 31, 'palisade');
  VW(16, 21, 31, 'palisade');
  state.setWideEdge('h', cx - 20 + 4, cz - 15 + 32, { t: 'palisadeGate', f: 'log' }, 2);
  O('tent', 9, 26, 0);
  O('tent', 12, 26, 0);
  O('campfire', 10, 29);
  O('bench', 8, 30, 0);
  O('logPile', 2, 29);
  O('logPile', 3, 29);
  O('crates', 1, 23);
  O('crates', 2, 23);
  O('barrel', 1, 25);
  O('barrel', 1, 26);
  O('anvil', 13, 22);
  O('weaponRack', 14, 21, 0);
  O('lanternPost', 5, 21, 0);
  O('lanternPost', 15, 30, 0);
  O('hay', 14, 30);
  O('well', 7, 30);

  // upper drift, 9 ft down
  L(2, 6, 17, 17, -3); F(2, 6, 17, 17, 'dirt');
  L(6, 18, 6, 20, -3); F(6, 18, 6, 20, 'dirt');
  O('stairsLong', 6, 18, 2); // climbs south into the yard
  O('crates', 3, 7);
  O('crates', 4, 7);
  O('barrel', 3, 8);
  O('rocks', 15, 7);
  O('rocks', 9, 15);
  O('boulder', 16, 16);
  O('crystal', 12, 8);
  O('brazier', 8, 9);
  O('brazier', 14, 14);
  O('table', 4, 12, 0);
  O('candles', 4, 12);
  O('chair', 4, 13, 2);
  O('chest', 2, 16, 1);
  O('goblin', 10, 11, 2);
  O('goblin', 12, 13, 3);
  O('bones', 7, 14);

  // crystal cavern, 15 ft down
  L(20, 2, 33, 15, -5); F(20, 2, 33, 15, 'mossy');
  L(18, 10, 19, 10, -5); F(18, 10, 19, 10, 'mossy');
  O('woodStairs', 18, 10, 1); // climbs west to the upper drift
  for (const [a, b] of [[22, 3], [25, 5], [31, 3], [32, 9], [23, 13], [29, 13]]) O(b % 2 ? 'amethyst' : 'crystal', a, b);
  for (const [a, b] of [[21, 7], [27, 3], [30, 7], [26, 11], [33, 14], [20, 14]]) O('glowShrooms', a, b);
  O('mushrooms', 24, 9);
  O('spider', 28, 8, 2);
  O('ooze', 22, 11, 0);
  O('cobweb', 30, 4);
  O('gems', 32, 5);
  O('skeleton', 25, 14, 1);
  O('sword', 26, 14);

  // the shaft down to the forge, 24 ft down
  L(26, 16, 26, 18, -8); F(26, 16, 26, 18, 'cobble');
  O('stairsLong', 26, 16, 0); // climbs north into the cavern
  // forge hall
  L(16, 19, 37, 30, -8); F(16, 19, 37, 30, 'cobble');
  L(31, 25, 37, 30, -9); F(31, 25, 37, 30, 'lava');
  VW(23, 19, 23, 'caveWall'); VW(23, 26, 30, 'caveWall');
  D('v', 23, 24, 'ironDoor', 'caveRock');
  D('v', 23, 25, 'ironDoor', 'caveRock');
  O('anvil', 28, 21);
  O('anvil', 30, 21);
  O('cauldron', 27, 23);
  O('brazier', 25, 20);
  O('brazier', 32, 20);
  O('weaponRack', 35, 19, 0);
  O('weaponRack', 36, 19, 0);
  O('barrel', 37, 21);
  O('crates', 37, 22);
  O('ogre', 33, 22, 3);
  O('orc', 26, 27, 0);
  // the vault behind the iron doors
  O('hoard', 18, 22);
  O('ornateChest', 16, 20, 1);
  O('chest', 16, 27, 1);
  O('mimic', 20, 29, 2);
  O('coins', 21, 20);
  O('crown', 18, 25);
  O('dragon', 17, 26, 1);
  O('spiritBrazier', 22, 20);
  O('spiritBrazier', 22, 29);
  // a spiral back up to the cavern edge
  L(34, 16, 37, 18, -5); F(34, 16, 37, 18, 'mossy');
  L(34, 12, 37, 15, -5); F(34, 12, 37, 15, 'mossy');
  O('spiralStairs', 34, 19, 3);
  O('crystal', 36, 13);
  O('glowShrooms', 37, 17);
  // hills around
  for (const [a, b] of [[-3, 3], [-5, 14], [22, 34], [36, 34], [40, 4], [42, 20], [19, -3], [33, -3]]) O(b % 3 ? 'pine' : 'boulder', a, b);
  O('standingStone', -4, 26);
  O('deadTree', 38, 0);
  state.data.name = 'The Deepdelve Mine';
}

// A bowl of seating tiers sunk 12 ft into the ground around a sand floor.
export function sunkenArena(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, O, L, lv } = levelHelpers(state, cx, cz); // a and b measured from the centre
  const R = 13.6;
  const ring = (a, b) => Math.hypot(a + 0.5, b + 0.5);
  for (let a = -14; a < 14; a++) for (let b = -14; b < 14; b++) {
    const d = ring(a, b);
    if (d > R) continue;
    let level, floor;
    if (d < 6.4) { level = -4; floor = 'sand'; }
    else if (d < 7.7) { level = -3; floor = 'flagstone'; }
    else if (d < 9) { level = -2; floor = 'flagstone'; }
    else if (d < 10.3) { level = -1; floor = 'flagstone'; }
    else if (d < 11.8) { level = 0; floor = 'cobble'; }
    else { level = 2; floor = 'flagstone'; }
    L(a, b, a, b, level);
    F(a, b, a, b, floor);
  }
  // gates through the outer wall, east and west
  for (const s of [-1, 1]) for (let k = 11; k <= 14; k++) { L(s > 0 ? k : -k - 1, -1, s > 0 ? k : -k - 1, 0, 0); F(s > 0 ? k : -k - 1, -1, s > 0 ? k : -k - 1, 0, 'cobble'); }
  // aisles of steps down the tiers, north, south, east and west
  const climb = [[0, -1, 0], [-1, 0, 1], [0, 1, 2], [1, 0, 3]]; // [da, db, r] r climbs that way
  for (const [da, db, r] of climb) {
    for (let k = 0; k < 14; k++) {
      const a = da * k + (da === 0 ? -1 : 0), b = db * k + (db === 0 ? -1 : 0);
      for (const off of [0, 1]) {
        const aa = a + (da === 0 ? off : 0), bb = b + (db === 0 ? off : 0);
        if (lv(aa + da, bb + db) === lv(aa, bb) + 1 && lv(aa, bb) < 0) O('steps', aa, bb, r);
      }
    }
  }
  // benches on the tiers
  for (let a = -14; a < 14; a++) for (let b = -14; b < 14; b++) {
    const d = ring(a, b);
    if (d < 6.4 || d > 10.3 || Math.abs(a + 0.5) < 2.5 || Math.abs(b + 0.5) < 2.5) continue;
    const r = Math.abs(a + 0.5) > Math.abs(b + 0.5) ? 1 : 0;
    if ((a + b) % 3 !== 0 || !state.canPlace('bench', cx + a, cz + b, r)) continue;
    const [lo, hi] = state.footprintLevels('bench', cx + a, cz + b, r);
    if (lo === hi) O('bench', a, b, r);
  }
  // the floor of the pit
  O('cage', -4, -2);
  O('cage', 3, 1);
  O('spikes', -1, 3);
  O('spikes', 2, -4);
  O('weaponRack', -5, 1, 1);
  O('bones', 1, 2);
  O('ogre', -1, -1, 0);
  O('orc', 2, -2, 3);
  O('orc', -3, 2, 1);
  O('sword', 4, -1);
  // braziers on the lowest tier
  for (const [a, b] of [[-5, -5], [4, -5], [-5, 4], [4, 4]]) O('brazier', a, b);
  // lantern posts on the promenade
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2 + 0.26;
    const a = Math.floor(Math.cos(ang) * 11), b = Math.floor(Math.sin(ang) * 11);
    if (lv(a, b) === 0 && state.canPlace('lanternPost', cx + a, cz + b, 0)) O('lanternPost', a, b, 0);
  }
  // the royal box on the north rim
  L(-3, -14, 2, -12, 2);
  F(-3, -14, 2, -12, 'marble');
  O('rug', -1, -14, 0);
  O('throne', -1, -13, 0);
  O('throne', 0, -13, 0);
  O('spiritBrazier', -3, -12);
  O('spiritBrazier', 2, -12);
  O('candelabra', -3, -14);
  O('candelabra', 2, -14);
  // statues on the outer wall
  for (const [a, b] of [[-9, -9], [8, -9], [-9, 8], [8, 8]]) O('statue', a, b, 0);
  // around the arena
  for (const [a, b] of [[-18, -10], [-20, 6], [18, -12], [19, 9], [-6, 17], [7, 18], [-15, 16], [15, 17]]) O(b % 2 ? 'oak' : 'bush', a, b);
  O('tent', -20, -3, 1);
  O('tent', 17, -5, 3);
  O('crates', -19, 0);
  O('barrel', 18, 0);
  O('well', 20, 2);
  state.data.name = 'The Sunken Arena of Varn';
}

// Stone platforms climbing on pillars out of the dark, up to the lich's spire 30 ft above.
export function lichSpires(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, O, L, rim } = levelHelpers(state, cx, cz);
  const plat = (a0, b0, a1, b1, level, floor) => { L(a0, b0, a1, b1, level); F(a0, b0, a1, b1, floor); };
  // landing on the ground
  plat(-15, -8, -11, -4, 0, 'marble');
  // platforms in a pinwheel, each higher than the last
  plat(-9, -9, -4, -4, 1, 'flagstone'); // A: the entry hall, 3 ft
  plat(3, -9, 8, -4, 3, 'planks'); //      B: the library, 9 ft
  plat(3, 3, 8, 8, 5, 'flagstone'); //     C: the laboratory, 15 ft
  plat(-9, 3, -4, 8, 7, 'mossy'); //       D: the crypt, 21 ft
  plat(-2, -2, 1, 1, 10, 'marble'); //     the spire, 30 ft
  // bridges and stairs between them
  F(-10, -6, -10, -6, 'marble'); O('steps', -10, -6, 3);
  plat(-3, -7, 0, -7, 1, 'flagstone'); plat(1, -7, 2, -7, 1, 'flagstone'); O('stairs', 1, -7, 3);
  plat(6, -3, 6, 0, 3, 'planks'); plat(6, 1, 6, 2, 3, 'planks'); O('stairs', 6, 1, 2);
  plat(-1, 6, 2, 6, 5, 'flagstone'); plat(-3, 6, -2, 6, 5, 'flagstone'); O('stairs', -3, 6, 1);
  plat(-3, 2, -1, 3, 7, 'mossy'); O('spiralStairs', -2, 2, 3);
  // parapets, open where the bridges meet the platforms
  rim(-9, -9, -4, -4, 'lowWall', new Set(['-9,-6,w', '-4,-7,e']));
  rim(3, -9, 8, -4, 'lowWall', new Set(['3,-7,w', '6,-4,s']));
  rim(3, 3, 8, 8, 'lowWall', new Set(['6,3,n', '3,6,w']));
  rim(-9, 3, -4, 8, 'lowWall', new Set(['-4,6,e', '-4,3,e', '-4,2,e']));
  rim(-2, -2, 1, 1, 'ruinWall', new Set(['-2,1,s', '-1,1,s']));
  // A: entry hall
  O('statue', -9, -9, 2);
  O('statue', -4, -9, 2);
  O('spiritBrazier', -8, -5);
  O('spiritBrazier', -5, -5);
  O('skeleton', -6, -7, 3);
  O('skeleton', -7, -8, 3);
  // B: library
  for (let a = 3; a <= 8; a++) if (a !== 6) O('bookshelf', a, -9, 0);
  O('lectern', 5, -6, 2);
  O('candelabra', 8, -7);
  O('table', 3, -5, 0);
  O('candles', 3, -5);
  O('potions', 4, -5);
  O('wraith', 7, -5, 1);
  // C: laboratory
  O('alchemy', 7, 8, 2);
  O('cauldron', 5, 5);
  O('potions', 8, 4);
  O('crystal', 4, 8);
  O('amethyst', 8, 6);
  O('candelabra', 3, 4);
  O('cultist', 5, 7, 0);
  O('ooze', 7, 4, 1);
  // D: crypt
  O('sarcophagus', -8, 4, 0);
  O('sarcophagus', -6, 4, 0);
  O('sarcophagus', -8, 7, 0);
  O('grave', -5, 7);
  O('urn', -9, 6);
  O('bones', -6, 7);
  O('glowShrooms', -4, 8);
  O('wraith', -7, 6, 3);
  // the spire
  O('altar', -1, -2, 0);
  O('crown', -1, -1);
  O('gems', 0, -1);
  O('spiritBrazier', -2, -2);
  O('spiritBrazier', 1, -2);
  O('crystal', 1, 1);
  O('wraith', 0, 0, 2);
  // the landing
  O('lanternPost', -15, -8, 0);
  O('lanternPost', -15, -4, 0);
  O('standingStone', -14, -6);
  O('bones', -12, -5);
  state.data.name = 'Spires of the Pale Lich';
}

// A watchtower on a snowy crag: terraces climbing 21 ft, joined by a ramp and stairs, with a cave dug in at its foot.
export function cragTower(state) {
  state.clearAll();
  const cx = Math.floor(GRID_W / 2), cz = Math.floor(GRID_D / 2);
  const { F, O, L, HW, VW, D, rim } = levelHelpers(state, cx, cz);
  const terrace = (a0, b0, a1, b1, level, floor) => {
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
      const corner = (a === a0 || a === a1) && (b === b0 || b === b1);
      if (corner) continue; // rounded corners read as rock, not masonry
      L(a, b, a, b, level);
      F(a, b, a, b, floor);
    }
  };
  terrace(-12, -9, 11, 9, 1, 'snow');
  terrace(-8, -7, 8, 6, 3, 'snow');
  terrace(-5, -5, 6, 4, 5, 'snow');
  L(-3, -4, 4, 2, 7); F(-3, -4, 4, 2, 'cobble');
  // the way up
  F(-1, 10, -1, 11, 'snow'); O('ramp', -1, 10, 0);
  O('stairs', 3, 7, 0);
  O('stairs', -7, 0, 3);
  O('stairs', 5, -1, 1);
  // the tower
  HW(-2, 3, -4, 'fortressWall'); HW(-2, 3, 2, 'fortressWall');
  VW(-2, -4, 1, 'fortressWall'); VW(4, -4, 1, 'fortressWall');
  D('v', 4, -1, 'ironDoor', 'stoneWall');
  state.setEdge('h', cx + 0, cz - 4, { t: 'window', f: 'stoneWall' });
  state.setEdge('h', cx + 1, cz + 2, { t: 'window', f: 'stoneWall' });
  O('table', 0, -2, 0);
  O('candles', 0, -2);
  O('chair', 0, -1, 2);
  O('bed', -2, -4, 0);
  O('weaponRack', 3, -4, 0);
  O('chest', 3, 1, 3);
  O('brazier', -2, 1);
  O('torch', 3, -2, 3);
  O('orc', 1, 0, 1);
  // the signal fire on the battlement outside the tower
  O('campfire', -3, 2);
  O('logPile', 4, 2);
  O('banner', -2, -4, 0);
  rim(-3, -4, 4, 2, 'lowWall', new Set(['4,-1,e']));
  // the slopes
  for (const [a, b] of [[-10, -6], [-11, 3], [9, -7], [10, 5], [-6, 8], [7, 8], [-7, -5], [6, -6], [-4, 5]]) O('pine', a, b);
  for (const [a, b] of [[-9, 7], [9, -2], [-2, -8], [5, 5], [-7, 3]]) O('boulder', a, b);
  O('rocks', 2, -6);
  O('rocks', -9, -2);
  O('goblin', 1, 8, 0);
  O('goblin', -6, -2, 3);
  O('lanternPost', 0, 9, 0);
  // a cave dug into the foot of the crag
  L(-17, -2, -13, 4, -2); F(-17, -2, -13, 4, 'dirt');
  O('stairs', -14, 3, 2);
  O('ornateChest', -17, -2, 1);
  O('bones', -15, -1);
  O('spider', -17, 1, 1);
  O('cobweb', -16, 3);
  O('glowShrooms', -13, -2);
  O('crystal', -16, -1);
  // around
  for (const [a, b] of [[-20, -10], [16, -12], [18, 4], [-19, 9], [14, 13]]) O('pine', a, b);
  O('standingStone', 15, -2);
  O('deadTree', -16, 10);
  state.data.name = 'Watchtower on the Grey Crag';
}
