import { GRID_W, GRID_D } from './config.js';
import { levelHelpers } from './samples.js';
import { addAdventure } from './adventure.js';

// Eight more finished maps for the welcome screen. Coordinates are squares relative to each map's
// corner (see levelHelpers). Heights are in levels of 2.5 ft. Every map ends with addAdventure,
// which adds a start, an exit, a lock and key where the route allows, and two traps.

function kit(state, i0, j0) {
  const k = levelHelpers(state, i0, j0);
  // a wide door or arch over `span` lines
  const W = (o, a, b, t, f, span) => state.setWideEdge(o, i0 + a, j0 + b, { t, f }, span);
  // take a wall away again
  const cut = (o, a, b) => state.setEdge(o, i0 + a, j0 + b, null);
  // a floored rectangle with a wall on every side
  const room = (a0, b0, a1, b1, floor, wall = 'stoneWall') => {
    k.F(a0, b0, a1, b1, floor);
    k.HW(a0, a1, b0, wall); k.HW(a0, a1, b1 + 1, wall);
    k.VW(a0, b0, b1, wall); k.VW(a1 + 1, b0, b1, wall);
  };
  // a wall wherever a floored square meets one without a floor, inside the box: caves and burrows
  const enclose = (wall, a0, b0, a1, b1) => {
    const f = (a, b) => !!state.floorAt(i0 + a, j0 + b);
    for (let a = a0; a <= a1 + 1; a++) for (let b = b0; b <= b1 + 1; b++) {
      if (f(a, b) !== f(a, b - 1) && !state.edgeAt('h', i0 + a, j0 + b)) state.setEdge('h', i0 + a, j0 + b, { t: wall });
      if (f(a, b) !== f(a - 1, b) && !state.edgeAt('v', i0 + a, j0 + b)) state.setEdge('v', i0 + a, j0 + b, { t: wall });
    }
  };
  return { ...k, W, cut, room, enclose };
}
const centre = () => [Math.floor(GRID_W / 2), Math.floor(GRID_D / 2)];

// ---------------------------------------------------------------------------------------------
// A cave in the hills: a guard cave, a fungus grotto, a larder full of cages and a chief's hall
// raised 5 ft up a pair of stairs.
export function goblinWarren(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L, D, enclose, cut } = kit(state, cx - 18, cz - 13);
  F(16, 19, 17, 25, 'dirt'); // the tunnel in from the cave mouth
  F(11, 13, 22, 18, 'dirt'); // guard cave
  F(7, 15, 10, 16, 'dirt'); F(1, 8, 6, 18, 'mossy'); F(2, 9, 3, 11, 'water'); // west tunnel and grotto
  F(16, 8, 17, 12, 'dirt'); F(10, 1, 25, 7, 'dirt'); L(10, 1, 25, 7, 2); // north tunnel and the chief's hall
  F(23, 15, 27, 16, 'dirt'); F(28, 9, 35, 21, 'dirt'); // east tunnel and larder
  enclose('caveWall', 0, 0, 36, 26);
  cut('h', 16, 26); cut('h', 17, 26); // the cave mouth
  O('stairs', 16, 8, 0); O('stairs', 17, 8, 0); // up into the hall
  D('v', 28, 15, 'woodDoor', 'caveRock'); D('v', 28, 16, 'woodDoor', 'caveRock');
  // guard cave
  O('campfire', 14, 15); O('bedroll', 12, 13, 0); O('bedroll', 20, 13, 0); O('logPile', 11, 17);
  O('crates', 21, 17); O('barrel', 22, 17); O('weaponRack', 11, 13, 0); O('torch', 18, 13, 0);
  O('goblin', 15, 14, 2); O('goblin', 19, 16, 1); O('goblin', 13, 17, 0);
  // grotto
  for (const [a, b] of [[1, 13], [5, 9], [4, 16], [6, 12]]) O('glowShrooms', a, b);
  O('mushrooms', 2, 15); O('amethyst', 1, 8); O('crystal', 6, 17); O('bones', 3, 17); O('chest', 1, 17, 1); O('ooze', 4, 12, 1);
  // the chief's hall
  O('throne', 17, 1, 0); O('rug', 16, 3, 0); O('brazier', 14, 2); O('brazier', 21, 2);
  O('banner', 15, 1, 0); O('banner', 20, 1, 0); O('shield', 12, 1, 0);
  O('ogre', 19, 3, 2); O('goblin', 13, 5, 2); O('goblin', 22, 5, 2);
  O('ornateChest', 24, 1, 3); O('chest', 11, 1, 1); O('coins', 23, 2); O('hoard', 24, 5);
  // larder
  O('cage', 29, 10); O('cage', 31, 10); O('cage', 33, 10); O('bones', 30, 12); O('bones', 34, 12);
  O('spider', 32, 17, 0); O('cobweb', 35, 9, 0); O('cobweb', 28, 21, 2);
  O('barrel', 35, 14); O('barrel', 35, 15); O('crates', 35, 16); O('crates', 34, 20); O('hay', 29, 19); O('hay', 30, 20);
  O('mimic', 28, 9, 1); O('goblin', 30, 15, 3);
  // the hillside
  for (const [a, b] of [[12, 24], [22, 23], [9, 21], [25, 21], [3, 22], [31, 24]]) O('pine', a, b);
  O('boulder', 14, 25); O('boulder', 20, 25); O('standingStone', 5, 25); O('rocks', 19, 23); O('bush', 13, 22);
  addAdventure(state);
  state.data.name = 'The Goblin Warren';
}

// ---------------------------------------------------------------------------------------------
// A forest temple on a platform 5 ft up: a nave between two water channels, priests' cells,
// a library, a treasury and an armoury.
export function serpentTemple(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L, D, HW, VW, W } = kit(state, cx - 12, cz - 15);
  F(4, 20, 19, 29, 'grass'); F(10, 22, 13, 29, 'cobble'); F(11, 20, 12, 21, 'cobble');
  L(2, 2, 21, 19, 2);
  F(7, 2, 16, 19, 'marble'); F(8, 4, 8, 16, 'water'); F(15, 4, 15, 16, 'water');
  F(2, 2, 6, 9, 'flagstone'); F(2, 10, 6, 19, 'planks'); F(17, 2, 21, 9, 'marble'); F(17, 10, 21, 19, 'flagstone');
  HW(2, 21, 2); HW(2, 21, 20); VW(2, 2, 19); VW(22, 2, 19);
  VW(7, 2, 19); VW(17, 2, 19); HW(2, 6, 10); HW(17, 21, 10);
  W('h', 11, 20, 'grandArch', 'stoneWall', 2);
  O('grandStairs', 11, 20, 0);
  D('v', 7, 6, 'woodDoor'); D('v', 7, 15, 'woodDoor'); D('v', 17, 6, 'ironDoor'); D('v', 17, 15, 'woodDoor');
  D('h', 9, 2, 'stainedWindow'); D('h', 14, 2, 'stainedWindow');
  // the nave
  O('altar', 11, 3, 0); O('candelabra', 10, 3); O('candelabra', 13, 3); O('statue', 9, 3, 2); O('statue', 14, 3, 2);
  for (const b of [7, 10, 13, 16]) { O('pillar', 9, b); O('pillar', 14, b); }
  O('spiritBrazier', 10, 11); O('spiritBrazier', 13, 11); O('rug', 11, 13, 0); O('chandelier', 11, 10); O('chandelier', 12, 16);
  O('cultist', 10, 5, 2); O('cultist', 13, 5, 2); O('cultist', 12, 9, 2);
  // priests' cells
  O('bed', 3, 3, 0); O('bed', 5, 3, 0); O('table', 4, 6, 0); O('candles', 4, 6); O('chair', 4, 7, 0);
  O('chest', 3, 8, 1); O('torch', 2, 5, 1); O('skeleton', 5, 8, 1);
  // library
  for (const a of [3, 4, 5]) O('bookshelf', a, 10, 0);
  for (const b of [13, 14, 15]) O('bookshelf', 2, b, 1);
  O('lectern', 4, 15, 2); O('table', 3, 18, 0); O('candles', 3, 18); O('potions', 4, 18); O('spider', 5, 12, 3); O('cobweb', 6, 19, 2);
  // treasury
  O('crown', 19, 3); O('gems', 18, 5); O('coins', 20, 6); O('urn', 17, 2); O('ornateChest', 21, 2, 3); O('chest', 21, 8, 3);
  O('mimic', 18, 8, 2); O('wraith', 19, 6, 1);
  // armoury
  for (const a of [18, 19, 20]) O('weaponRack', a, 10, 0);
  O('weaponRack', 21, 14, 3); O('barrel', 21, 18); O('barrel', 21, 19); O('crates', 20, 19); O('anvil', 18, 17);
  O('orc', 19, 15, 1); O('orc', 18, 13, 2);
  // the plaza and the forest
  for (const [a, b] of [[5, 22], [18, 22], [5, 26], [18, 26]]) O('ruinColumn', a, b);
  O('statue', 9, 23, 2); O('statue', 14, 23, 2); O('brazier', 9, 21); O('brazier', 14, 21);
  O('skeleton', 7, 25, 0); O('skeleton', 16, 25, 0);
  for (const [a, b] of [[1, 25], [22, 27], [0, 21], [23, 22], [-2, 8], [25, 12], [-1, 15], [24, 4]]) O('oak', a, b);
  O('bush', 3, 28); O('bush', 20, 28); O('flowers', 8, 27); O('flowers', 15, 28);
  addAdventure(state);
  state.data.name = 'Temple of the Coiled Serpent';
}

// ---------------------------------------------------------------------------------------------
// A burial mound on the tundra, dug 5 ft into the ground: a pillared hall, two side niches and a
// burial chamber 2.5 ft deeper still.
export function frozenBarrow(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L, D, enclose, cut } = kit(state, cx - 14, cz - 11);
  F(8, 0, 19, 4, 'mossy'); L(8, 0, 19, 4, -3); // burial chamber
  F(13, 5, 13, 9, 'flagstone'); L(13, 5, 13, 9, -2); // corridor
  F(9, 10, 18, 17, 'flagstone'); L(9, 10, 18, 17, -2); // hall
  F(13, 18, 14, 19, 'flagstone'); L(13, 18, 14, 19, -2); // the way in
  F(8, 13, 8, 13, 'flagstone'); F(2, 11, 7, 16, 'mossy'); L(2, 11, 8, 16, -2); // west niche
  F(19, 13, 19, 13, 'flagstone'); F(20, 11, 25, 16, 'mossy'); L(19, 11, 25, 16, -2); // east niche
  enclose('stoneWall', 0, 0, 27, 22);
  cut('h', 13, 20); cut('h', 14, 20);
  O('stairs', 13, 18, 2); O('stairs', 14, 18, 2); O('steps', 13, 4, 2);
  D('h', 13, 5, 'ironDoor'); D('h', 13, 10, 'woodDoor'); D('v', 9, 13, 'woodDoor'); D('v', 19, 13, 'woodDoor');
  // burial chamber
  for (const a of [9, 11, 16, 18]) O('sarcophagus', a, 1, 0);
  O('altar', 13, 0, 0); O('crown', 12, 3); O('ornateChest', 19, 4, 3); O('spiritBrazier', 10, 4); O('spiritBrazier', 17, 4);
  O('urn', 8, 0); O('urn', 19, 0); O('cobweb', 8, 4, 2); O('wraith', 15, 3, 2);
  // hall
  for (const [a, b] of [[10, 11], [17, 11], [10, 16], [17, 16]]) O('pillar', a, b);
  O('statue', 11, 10, 2); O('statue', 16, 10, 2); O('torch', 9, 12, 1); O('torch', 18, 12, 3);
  O('skeleton', 12, 12, 2); O('skeleton', 15, 15, 0); O('bones', 11, 15); O('bones', 16, 12); O('chest', 18, 17, 3);
  // niches
  O('bones', 3, 12); O('bones', 5, 15); O('urn', 2, 11); O('urn', 2, 16); O('sarcophagus', 6, 11, 0); O('skeleton', 4, 13, 1);
  O('skeleton', 22, 14, 3); O('chest', 25, 11, 3); O('mimic', 25, 16, 3); O('bones', 21, 12); O('glowShrooms', 23, 16); O('ooze', 23, 12, 0);
  // the mound and the snow around it
  for (const [a, b] of [[4, 19], [8, 21], [19, 21], [23, 19], [26, 9], [1, 6], [25, 3]]) O('standingStone', a, b);
  O('grave', 10, 21); O('grave', 17, 22); O('deadTree', 2, 21); O('deadTree', 26, 21);
  for (const [a, b] of [[0, 1], [27, 0], [-2, 12], [29, 14]]) O('pine', a, b);
  O('boulder', 11, 22); O('boulder', 16, 21); O('rocks', 5, 1);
  addAdventure(state);
  state.data.name = 'The Frozen Barrow';
}

// ---------------------------------------------------------------------------------------------
// Brick sewers under a city: a water channel with walkways and two bridges, a thieves' guild,
// a fence's den, a flooded cistern, barracks, a prison and a spider's nest.
export function undercitySewers(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, D, HW, VW, room } = kit(state, cx - 20, cz - 12);
  F(0, 9, 39, 10, 'cobble'); F(0, 13, 39, 14, 'cobble'); F(0, 11, 39, 12, 'water');
  F(10, 11, 11, 12, 'planks'); F(28, 11, 29, 12, 'planks');
  HW(0, 39, 9, 'brickWall'); HW(0, 39, 15, 'brickWall'); VW(0, 9, 14, 'brickWall'); VW(40, 9, 14, 'brickWall');
  room(4, 0, 15, 8, 'planks', 'brickWall'); room(19, 3, 26, 8, 'flagstone', 'brickWall'); room(30, 0, 39, 8, 'mossy', 'brickWall');
  F(33, 2, 36, 5, 'water');
  room(2, 15, 11, 23, 'planks', 'brickWall'); room(14, 15, 23, 21, 'cobble', 'brickWall'); room(30, 15, 38, 22, 'dirt', 'brickWall');
  D('h', 9, 9, 'ironDoor', 'brick'); D('h', 22, 9, 'woodDoor', 'brick'); D('h', 34, 9, 'portcullis', 'brick');
  D('h', 6, 15, 'woodDoor', 'brick'); D('h', 18, 15, 'ironDoor', 'brick'); D('h', 34, 15, 'woodDoor', 'brick');
  // prison cells behind bars
  HW(14, 23, 18, 'bars'); VW(17, 18, 21, 'brickWall'); VW(20, 18, 21, 'brickWall');
  for (const a of [15, 18, 21]) D('h', a, 18, 'portcullis', 'brick');
  // walkways
  for (const a of [2, 17, 27]) O('torch', a, 9, 0);
  for (const a of [3, 25, 37]) O('torch', a, 14, 2);
  O('barrel', 0, 10); O('barrel', 39, 13); O('crates', 16, 13);
  // the thieves' guild
  O('throne', 9, 0, 0); O('orc', 9, 1, 2); O('rug', 9, 5, 0);
  O('table', 5, 3, 0); O('table', 12, 3, 0); O('coins', 5, 3); O('candles', 12, 3);
  O('chair', 5, 2, 0); O('chair', 6, 4, 2); O('chair', 12, 2, 0); O('chair', 13, 4, 2);
  O('roundTable', 13, 6); O('chair', 12, 6, 1); O('ornateChest', 15, 0, 3); O('chest', 4, 0, 1);
  O('weaponRack', 4, 5, 1); O('hangLantern', 7, 5); O('hangLantern', 12, 5); O('barrel', 15, 8);
  O('goblin', 6, 6, 0); O('goblin', 14, 2, 3);
  // the fence's den
  O('crates', 19, 3); O('crates', 20, 3); O('crates', 26, 3); O('barrel', 26, 8); O('barrel', 19, 8);
  O('table', 22, 4, 0); O('gems', 22, 4); O('idol', 23, 4); O('candelabra', 25, 7); O('chest', 26, 5, 3); O('cultist', 24, 6, 2);
  // the cistern
  O('ooze', 31, 2, 1); O('bones', 38, 1); O('bones', 31, 7); O('cobweb', 39, 0, 0); O('urn', 38, 7);
  O('glowShrooms', 32, 7); O('glowShrooms', 37, 6); O('skeleton', 38, 4, 3); O('chest', 30, 0, 1);
  // barracks
  for (const a of [3, 5, 8, 10]) O('bedroll', a, 16, 0);
  O('weaponRack', 2, 20, 1); O('table', 5, 21, 0); O('candles', 5, 21); O('chair', 5, 22, 2);
  O('barrel', 11, 23); O('barrel', 10, 23); O('chest', 2, 23, 1); O('goblin', 7, 20, 1); O('orc', 4, 19, 0);
  // prison
  O('table', 15, 16, 0); O('chair', 15, 17, 2); O('torch', 14, 16, 1); O('goblin', 20, 16, 2);
  O('bones', 15, 20); O('bones', 22, 21); O('hay', 19, 21); O('skeleton', 16, 20, 0);
  // the spider's nest
  O('spider', 33, 18, 0); O('cobweb', 30, 15, 0); O('cobweb', 38, 22, 2); O('cobweb', 38, 15, 3);
  O('bones', 31, 21); O('bones', 36, 17); O('bones', 35, 21); O('mushrooms', 37, 20); O('gems', 30, 22); O('chest', 38, 19, 3);
  addAdventure(state);
  state.data.name = 'The Undercity Sewers';
}

// ---------------------------------------------------------------------------------------------
// A volcano's crater: a rim 5 ft up, a lake of lava, and an island where a young dragon sleeps on
// its hoard, reached by two causeways.
export function dragonsCaldera(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L } = kit(state, cx - 16, cz - 15);
  for (const [a0, b0, a1, b1] of [[0, 0, 31, 3], [0, 24, 31, 27], [0, 4, 3, 23], [28, 4, 31, 23]]) { L(a0, b0, a1, b1, 2); F(a0, b0, a1, b1, 'dirt'); }
  F(4, 4, 27, 23, 'lava');
  F(11, 9, 20, 16, 'flagstone'); F(15, 4, 16, 8, 'cobble'); F(15, 17, 16, 23, 'cobble');
  F(14, 28, 17, 31, 'cobble');
  O('stairs', 15, 22, 2); O('stairs', 16, 22, 2); // causeway up to the south rim
  O('stairs', 15, 4, 0); O('stairs', 16, 4, 0); // and to the north rim
  O('stairs', 15, 28, 0); O('stairs', 16, 28, 0); // the way up from the plain
  // the cult's shrine on the north rim
  O('altar', 15, 0, 0); O('spiritBrazier', 12, 1); O('spiritBrazier', 19, 1); O('cultist', 13, 2, 2); O('cultist', 18, 2, 2);
  O('urn', 10, 0); O('urn', 21, 0);
  // the rim
  for (const [a, b] of [[2, 2], [29, 1], [1, 26], [30, 26], [2, 15], [29, 11]]) O('boulder', a, b);
  O('deadTree', 0, 8); O('deadTree', 31, 18);
  O('tent', 0, 10, 1); O('campfire', 2, 13); O('bedroll', 1, 17, 0);
  O('orc', 6, 25, 1); O('orc', 25, 25, 3); O('goblin', 2, 19, 0); O('goblin', 29, 6, 0);
  O('ogre', 13, 24, 2); O('brazier', 17, 26); O('brazier', 14, 27);
  // the island
  O('dragon', 14, 10, 2); O('hoard', 17, 13); O('ornateChest', 11, 9, 1); O('chest', 20, 16, 3);
  O('gems', 12, 15); O('gems', 19, 10); O('crown', 13, 14); O('sword', 20, 9); O('bones', 11, 16); O('bones', 18, 9);
  addAdventure(state);
  state.data.name = "The Dragon's Caldera";
}

// ---------------------------------------------------------------------------------------------
// A haunted house in the marsh: a hall, dining room, library, kitchen, bedroom and study, a
// shrine behind a secret door, and a garden of graves.
export function blackwoodManor(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, D, HW, VW, W, room, cut } = kit(state, cx - 14, cz - 13);
  room(2, 9, 9, 15, 'planks'); room(10, 9, 17, 15, 'marble'); room(18, 9, 25, 15, 'planks');
  room(2, 2, 8, 8, 'flagstone'); room(9, 2, 17, 8, 'planks'); room(18, 2, 21, 8, 'planks'); room(22, 2, 25, 8, 'mossy');
  W('h', 13, 16, 'greatDoors', 'stoneWall', 2);
  for (const a of [4, 7, 20, 23]) D('h', a, 16, 'window');
  for (const a of [5, 12, 15]) D('h', a, 2, 'window');
  D('v', 10, 12, 'doubleDoor'); D('v', 18, 12, 'doubleDoor'); D('h', 13, 9, 'woodDoor'); D('h', 5, 9, 'woodDoor');
  D('h', 19, 9, 'woodDoor'); D('v', 22, 5, 'secretDoor');
  // garden, hedges and a fence
  F(2, 17, 25, 26, 'grass'); F(13, 17, 14, 26, 'cobble');
  VW(13, 18, 25, 'hedge'); VW(15, 18, 25, 'hedge'); cut('v', 13, 21); cut('v', 15, 21);
  HW(2, 25, 27, 'fence'); VW(2, 17, 26, 'fence'); VW(26, 17, 26, 'fence'); cut('h', 13, 27); cut('h', 14, 27);
  O('fountain', 6, 20); O('statue', 10, 19, 1); O('bench', 6, 24, 0); O('flowers', 9, 22); O('flowers', 4, 18);
  for (const [a, b] of [[18, 19], [20, 21], [22, 19], [19, 24], [23, 24]]) O('grave', a, b);
  O('deadTree', 24, 22); O('deadTree', 3, 25); O('lanternPost', 12, 17, 0); O('lanternPost', 15, 17, 2);
  O('skeleton', 21, 23, 0);
  // dining room
  O('table', 4, 11, 0); O('table', 4, 13, 0); O('candles', 4, 11); O('candles', 5, 13);
  O('chair', 3, 11, 1); O('chair', 6, 11, 3); O('chair', 3, 13, 1); O('chair', 6, 13, 3);
  O('candelabra', 8, 10); O('chandelier', 5, 12); O('cobweb', 2, 9, 0); O('skeleton', 7, 14, 1);
  // hall
  O('rug', 13, 11, 0); O('chandelier', 13, 12); O('statue', 11, 10, 2); O('statue', 16, 10, 2);
  O('candelabra', 11, 14); O('candelabra', 16, 14); O('wraith', 15, 11, 2);
  // library
  for (const a of [20, 21, 22, 23, 24]) O('bookshelf', a, 9, 0);
  for (const b of [11, 12, 13]) O('bookshelf', 25, b, 3);
  O('lectern', 21, 13, 2); O('table', 23, 14, 0); O('candles', 23, 14); O('chair', 20, 14, 0); O('wraith', 22, 11, 1);
  // kitchen
  O('cauldron', 4, 4); O('table', 6, 4, 0); O('potions', 6, 4); O('barrel', 2, 2); O('barrel', 2, 3); O('crates', 8, 2);
  O('hangLantern', 5, 6); O('ooze', 3, 7, 0); O('bones', 7, 7);
  // bedroom
  O('bed', 10, 3, 0); O('bed', 16, 3, 0); O('chest', 11, 2, 0); O('rug', 12, 4, 0); O('candelabra', 17, 7);
  O('mimic', 9, 8, 1); O('wraith', 14, 5, 2);
  // study, and the shrine behind the secret door
  O('alchemy', 18, 2, 0); O('bookshelf', 21, 2, 0); O('lectern', 20, 6, 0); O('cultist', 19, 6, 3);
  O('altar', 23, 2, 0); O('idol', 23, 4); O('spiritBrazier', 22, 7); O('spiritBrazier', 25, 7);
  O('ornateChest', 25, 4, 3); O('skeleton', 24, 6, 0);
  // the marsh around
  for (const [a, b] of [[-2, 4], [28, 3], [-3, 18], [29, 15], [0, 28], [27, 28]]) O('deadTree', a, b);
  O('reeds', -1, 10); O('reeds', 28, 9); O('reeds', 1, 30);
  addAdventure(state, { start: [cx - 14 + 13, cz - 13 + 27] });
  state.data.name = 'Blackwood Manor';
}

// ---------------------------------------------------------------------------------------------
// A dwarf hold taken by orcs: a castle gate, an entrance hall, a great hall with a raised throne,
// a forge over lava and a vault 5 ft down behind an iron door.
export function dwarfHall(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L, D, W, room } = kit(state, cx - 18, cz - 16);
  room(12, 18, 23, 25, 'flagstone'); room(6, 4, 29, 17, 'marble'); room(0, 6, 5, 17, 'cobble'); room(30, 6, 35, 17, 'marble');
  L(30, 6, 35, 17, -2); L(15, 4, 20, 6, 1);
  F(1, 14, 2, 16, 'lava'); F(15, 26, 19, 32, 'cobble');
  W('h', 16, 26, 'castleGate', 'stoneWall', 3); W('h', 17, 18, 'greatDoors', 'stoneWall', 2);
  D('v', 6, 11, 'woodDoor'); D('v', 30, 11, 'ironDoor');
  O('steps', 17, 7, 0); O('steps', 18, 7, 0); O('stairs', 30, 11, 1);
  // the approach
  O('statue', 14, 27, 2); O('statue', 20, 27, 2); O('brazier', 15, 28); O('brazier', 19, 28);
  for (const [a, b] of [[8, 28], [26, 29], [4, 24], [31, 23]]) O('boulder', a, b);
  O('pine', 2, 30); O('pine', 33, 30);
  // entrance hall
  for (const [a, b] of [[13, 20], [22, 20], [13, 23], [22, 23]]) O('statue', a, b, 2);
  O('brazier', 15, 24); O('brazier', 20, 24); O('banner', 12, 21, 1); O('banner', 23, 21, 3); O('goblin', 17, 22, 0);
  // great hall
  O('throne', 17, 4, 0); O('chest', 18, 4, 0); O('banner', 14, 4, 0); O('banner', 21, 4, 0); O('brazier', 14, 6); O('brazier', 21, 6);
  for (const [a, b] of [[9, 8], [9, 12], [9, 15], [26, 8], [26, 12], [26, 15]]) O('pillar', a, b);
  for (const b of [10, 13]) { O('table', 11, b, 0); O('bench', 11, b + 1, 0); O('table', 23, b, 0); O('bench', 23, b + 1, 0); }
  O('chandelier', 17, 10); O('chandelier', 17, 14);
  O('ogre', 19, 11, 2); O('orc', 10, 6, 2); O('orc', 25, 6, 2); O('orc', 15, 15, 0); O('goblin', 8, 16, 1); O('goblin', 28, 9, 3);
  // forge
  O('anvil', 2, 8); O('anvil', 4, 8); O('cauldron', 2, 11); O('brazier', 4, 11);
  O('weaponRack', 0, 7, 1); O('weaponRack', 0, 9, 1); O('barrel', 5, 16); O('crates', 5, 6); O('goblin', 3, 13, 0);
  // vault
  O('hoard', 33, 8); O('ornateChest', 35, 6, 3); O('chest', 35, 16, 3); O('crown', 32, 6); O('sword', 34, 13);
  O('gems', 31, 15); O('coins', 33, 12); O('skeleton', 32, 9, 1); O('skeleton', 32, 14, 1);
  O('spiritBrazier', 30, 6); O('spiritBrazier', 30, 17);
  addAdventure(state, { start: [cx - 18 + 17, cz - 16 + 31] });
  state.data.name = "The Dwarf-King's Hall";
}

// ---------------------------------------------------------------------------------------------
// A roadside inn on the gaming table: a taproom, a kitchen, four rooms to rent, and a cellar 5 ft
// down where something has moved in.
export function crossroadsInn(state) {
  state.clearAll();
  const [cx, cz] = centre();
  const { F, O, L, D, room, cut } = kit(state, cx - 12, cz - 11);
  room(2, 6, 11, 13, 'planks'); room(12, 6, 17, 13, 'flagstone');
  room(2, 2, 5, 5, 'planks'); room(6, 2, 9, 5, 'planks'); room(10, 2, 13, 5, 'planks'); room(14, 2, 17, 5, 'planks');
  room(18, 4, 22, 13, 'dirt'); L(18, 4, 22, 13, -2);
  F(0, 14, 23, 19, 'grass'); F(0, 20, 23, 21, 'cobble'); F(6, 14, 7, 19, 'cobble');
  O('stairs', 20, 12, 2); cut('h', 20, 14);
  D('h', 3, 6, 'woodDoor'); D('h', 7, 6, 'woodDoor'); D('h', 11, 6, 'woodDoor'); D('h', 15, 6, 'woodDoor');
  D('v', 12, 10, 'woodDoor'); D('h', 6, 14, 'doubleDoor'); D('h', 3, 14, 'window'); D('h', 9, 14, 'window'); D('v', 2, 9, 'window');
  // taproom
  O('table', 8, 7, 0); O('table', 10, 7, 0); O('potions', 9, 7); O('coins', 10, 7); O('barrel', 11, 8);
  for (const [a, b] of [[4, 9], [4, 12], [8, 11]]) { O('roundTable', a, b); O('candles', a, b); }
  O('chair', 3, 9, 1); O('chair', 5, 9, 3); O('chair', 3, 12, 1); O('chair', 5, 12, 3); O('chair', 7, 11, 1); O('chair', 9, 11, 3);
  O('brazier', 2, 13); O('chandelier', 6, 10); O('banner', 5, 6, 0); O('shield', 2, 7, 1);
  // kitchen
  O('cauldron', 13, 8); O('table', 15, 9, 0); O('barrel', 17, 7); O('barrel', 17, 8); O('crates', 17, 12); O('crates', 16, 13); O('hangLantern', 14, 11);
  // rooms to rent
  O('bed', 2, 2, 0); O('chest', 4, 2, 0);
  O('bed', 6, 2, 0); O('mimic', 9, 2, 3);
  O('bed', 12, 2, 0); O('chest', 13, 4, 3); O('goblin', 11, 4, 2);
  O('bed', 17, 2, 0); O('candles', 14, 3);
  // cellar
  O('barrel', 18, 4); O('barrel', 19, 4); O('barrel', 22, 4); O('crates', 22, 6); O('crates', 22, 7); O('cobweb', 18, 4, 0);
  O('goblin', 19, 8, 2); O('goblin', 21, 9, 1); O('ooze', 19, 11, 0); O('chest', 22, 11, 3);
  // the yard and the road
  O('well', 14, 17); O('hay', 21, 17); O('hay', 22, 18); O('tent', 2, 16, 0); O('lanternPost', 8, 15, 0); O('lanternPost', 5, 15, 2);
  O('bench', 10, 16, 0); O('crates', 17, 15); O('crates', 18, 15); O('barrel', 19, 15);
  for (const [a, b] of [[-2, 3], [25, 2], [-3, 15], [26, 12]]) O('oak', a, b);
  O('bush', 0, 1); O('bush', 23, 0);
  addAdventure(state, { start: [cx - 12 + 6, cz - 11 + 20] });
  state.data.name = 'The Crossroads Inn';
}
