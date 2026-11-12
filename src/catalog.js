import { WALL_H } from './config.js';
import * as M from './models.js';

export const CATEGORIES = [
  { id: 'floor', name: 'Floors', glyph: '▦' },
  { id: 'wall', name: 'Walls', glyph: '▮' },
  { id: 'door', name: 'Doors', glyph: '⌂' },
  { id: 'stairs', name: 'Stairs', glyph: '⟋' },
  { id: 'light', name: 'Lights', glyph: '✦' },
  { id: 'furn', name: 'Furniture', glyph: '♜' },
  { id: 'decor', name: 'Dressing', glyph: '☗' },
  { id: 'loot', name: 'Loot', glyph: '◆' },
  { id: 'nature', name: 'Wilds', glyph: '♣' },
  { id: 'creature', name: 'Creatures', glyph: '☠' },
  { id: 'game', name: 'Adventure', glyph: '⚑' },
];

const WARM = 0xff8f3a;

// Wall post definitions (placed at grid vertices where walls meet)
export const POSTS = {
  stone: { build: () => M.post('stoneWall', 0.9, WALL_H + 0.3), h: WALL_H + 0.3, w: 0.9 },
  brick: { build: () => M.post('brick', 0.9, WALL_H + 0.3), h: WALL_H + 0.3, w: 0.9 },
  cave: { build: () => M.cavePost(), h: WALL_H, w: 1.6 },
  log: { build: () => M.logPost(), h: 11, w: 0.8 },
  fence: { build: () => M.fencePost(), h: 3.8, w: 0.35 },
  hedge: { build: () => M.post('hedge', 1.7, 5.3), h: 5.3, w: 1.7 },
  low: { build: () => M.post('stoneWall', 1.0, 3.4), h: 3.4, w: 1.0 },
  fortress: { build: () => M.fortressPost(), h: WALL_H + 2.2, w: 2.0 },
  column: { build: () => M.columnPost(), h: WALL_H, w: 1.3 },
};
export const POST_RANK = { stone: 5, brick: 5, cave: 6, fortress: 7, log: 4, column: 2.5, hedge: 3, low: 2, fence: 1 };

// frame material -> post style used by doors in that wall
const FRAME_POST = { stoneWall: 'stone', brick: 'brick', caveRock: 'cave', log: 'log', hedge: 'hedge' };
export const framePost = (f) => FRAME_POST[f] || 'stone';

export const ITEMS = [
  // ---------------- floors ----------------
  { id: 'flagstone', name: 'Flagstones', cat: 'floor', kind: 'floor', build: () => M.floorTile('flagstone'), desc: 'Worn slabs, the dungeon standard.' },
  { id: 'cobble', name: 'Cobblestones', cat: 'floor', kind: 'floor', build: () => M.floorTile('cobble'), desc: 'Rounded setts for courtyards and streets.' },
  { id: 'planks', name: 'Wood planks', cat: 'floor', kind: 'floor', build: () => M.floorTile('planks'), desc: 'Tavern boards and cabin floors.' },
  { id: 'marble', name: 'Checkered marble', cat: 'floor', kind: 'floor', build: () => M.floorTile('marble'), desc: 'For throne rooms and temples.' },
  { id: 'mossy', name: 'Mossy stone', cat: 'floor', kind: 'floor', build: () => M.floorTile('moss'), desc: 'Damp, forgotten halls.' },
  { id: 'dirt', name: 'Packed earth', cat: 'floor', kind: 'floor', build: () => M.floorTile('dirt'), desc: 'Mines, cellars and caves.' },
  { id: 'grass', name: 'Grass', cat: 'floor', kind: 'floor', build: () => M.floorTile('grassFloor'), desc: 'Lawns, gardens and courtyards.' },
  { id: 'sand', name: 'Sand', cat: 'floor', kind: 'floor', build: () => M.floorTile('sandFloor'), desc: 'Arenas, beaches and desert ruins.' },
  { id: 'snow', name: 'Snow', cat: 'floor', kind: 'floor', build: () => M.floorTile('snowFloor'), desc: 'Drifts for frozen courtyards.' },
  { id: 'water', name: 'Shallow water', cat: 'floor', kind: 'floor', liquid: true, build: () => M.waterTile('water'), desc: 'Knee-deep pools. Slows the party.' },
  { id: 'lava', name: 'Lava', cat: 'floor', kind: 'floor', liquid: true, light: { c: 0xff5a1a, i: 18, d: 18, p: [0, 1.2, 0], f: 0.15 }, build: () => M.waterTile('lava'), desc: 'Molten rock. Glows in the dark.' },
  { id: 'pit', name: 'Open pit', cat: 'floor', kind: 'floor', pit: true, build: () => M.pitTile(), desc: 'A drop into darkness.' },

  // ---------------- walls (edges) ----------------
  { id: 'stoneWall', name: 'Stone wall', cat: 'wall', kind: 'edge', post: 'stone', frame: 'stoneWall', blocks: true, cap: 'full', capT: 0.6, h: WALL_H, build: () => M.plainWall('stoneWall'), desc: 'Dressed blocks, ten feet high.' },
  { id: 'brickWall', name: 'Brick wall', cat: 'wall', kind: 'edge', post: 'brick', frame: 'brick', blocks: true, cap: 'full', capT: 0.6, h: WALL_H, build: () => M.plainWall('brick'), desc: 'Fired clay, for town cellars.' },
  { id: 'caveWall', name: 'Cave wall', cat: 'wall', kind: 'edge', post: 'cave', frame: 'caveRock', blocks: true, cap: 'full', capT: 1.4, h: WALL_H, build: () => M.caveWall(), desc: 'Raw rock, rough and uneven.' },
  { id: 'palisade', name: 'Palisade', cat: 'wall', kind: 'edge', post: 'log', frame: 'log', blocks: true, cap: null, h: 9.6, build: () => M.palisade(), desc: 'Sharpened logs for camps and forts.' },
  { id: 'bars', name: 'Iron bars', cat: 'wall', kind: 'edge', post: 'stone', frame: 'stoneWall', blocks: true, seeThrough: true, cap: null, h: WALL_H, build: () => M.ironBars(), desc: 'Cell bars. Blocks bodies, not eyes.' },
  { id: 'lowWall', name: 'Low wall', cat: 'wall', kind: 'edge', post: 'low', frame: 'stoneWall', blocks: true, seeThrough: true, cap: null, h: 3.2, build: () => M.lowWall(), desc: 'Waist-high stone. Good cover.' },
  { id: 'ruinWall', name: 'Crumbled wall', cat: 'wall', kind: 'edge', post: 'low', frame: 'stoneWall', blocks: true, seeThrough: true, cap: null, h: 5.4, build: () => M.crumbledWall(), desc: 'Broken masonry from an older age.' },
  { id: 'hedge', name: 'Hedge', cat: 'wall', kind: 'edge', post: 'hedge', frame: 'hedge', blocks: true, cap: null, h: 5, build: () => M.hedgeWall(), desc: 'Garden mazes and estate grounds.' },
  { id: 'fortressWall', name: 'Fortress wall', cat: 'wall', kind: 'edge', post: 'fortress', frame: 'stoneWall', blocks: true, cap: 'full', capT: 1.6, h: WALL_H + 2, build: () => M.fortressWall(), desc: 'Thick curtain wall with battlements and arrow slits.' },
  { id: 'greatWindow', name: 'Great window', cat: 'wall', kind: 'edge', span: 2, framed: true, blocks: true, seeThrough: true, cap: 'full', h: WALL_H, build: (f) => M.greatWindow(f), desc: 'A tall arched window, 10 ft wide.' },
  { id: 'alcoveWall', name: 'Wall with alcove', cat: 'wall', kind: 'edge', span: 2, framed: true, blocks: true, cap: 'full', h: WALL_H, light: { c: 0xffb060, i: 10, d: 12, p: [0, 2.2, -0.6], f: 0.5 }, build: (f) => M.alcoveWall(f), desc: 'A 10 ft wall with a candlelit shrine niche.' },
  { id: 'buttressWall', name: 'Buttressed wall', cat: 'wall', kind: 'edge', span: 2, framed: true, blocks: true, cap: 'full', h: WALL_H, build: (f) => M.buttressedWall(f), desc: 'A 10 ft wall braced by stone buttresses.' },
  { id: 'colonnade', name: 'Colonnade', cat: 'wall', kind: 'edge', span: 2, post: 'column', blocks: false, cap: null, h: WALL_H, build: () => M.colonnade(), desc: 'Columns under a lintel, 10 ft wide. Walk between them.' },
  { id: 'fence', name: 'Wooden fence', cat: 'wall', kind: 'edge', post: 'fence', frame: 'stoneWall', blocks: true, seeThrough: true, cap: null, h: 3.4, build: () => M.woodFence(), desc: 'Pens, paddocks and farmyards.' },

  // ---------------- doors / openings (edges) ----------------
  { id: 'woodDoor', name: 'Wooden door', cat: 'door', kind: 'edge', door: true, framed: true, blocks: true, cap: 'jambs', h: WALL_H, build: (f) => M.swingDoor(f, 'planks', false), desc: 'Planked oak. Press E to open in walk mode.' },
  { id: 'ironDoor', name: 'Iron-bound door', cat: 'door', kind: 'edge', door: true, framed: true, blocks: true, cap: 'jambs', h: WALL_H, build: (f) => M.swingDoor(f, 'darkWood', true), desc: 'Studded and heavy. Keeps things in.' },
  { id: 'doubleDoor', name: 'Double door', cat: 'door', kind: 'edge', door: true, framed: true, blocks: true, cap: 'jambs', h: WALL_H, build: (f) => M.doubleDoor(f), desc: 'Twin leaves for great halls.' },
  { id: 'portcullis', name: 'Portcullis', cat: 'door', kind: 'edge', door: true, framed: true, blocks: true, seeThrough: true, cap: 'jambs', h: WALL_H, build: (f) => M.portcullis(f), desc: 'An iron gate that lifts into the wall.' },
  { id: 'archway', name: 'Archway', cat: 'door', kind: 'edge', framed: true, blocks: false, cap: 'jambs', h: WALL_H, build: (f) => M.archway(f), desc: 'An open, vaulted passage.' },
  { id: 'greatDoors', name: 'Great doors', cat: 'door', kind: 'edge', span: 2, door: true, framed: true, blocks: true, cap: 'jambs', jamb: 1.2, h: WALL_H, build: (f) => M.greatDoors(f), desc: 'Iron-banded double doors, 10 ft wide.' },
  { id: 'grandArch', name: 'Grand archway', cat: 'door', kind: 'edge', span: 2, framed: true, blocks: false, cap: 'jambs', jamb: 1.3, h: WALL_H, build: (f) => M.grandArch(f), desc: 'An open vaulted arch, 10 ft wide.' },
  { id: 'castleGate', name: 'Castle gate', cat: 'door', kind: 'edge', span: 3, door: true, framed: true, blocks: true, seeThrough: true, cap: 'jambs', jamb: 1.7, h: WALL_H, build: (f) => M.castleGate(f), desc: 'A 15 ft portcullis between buttresses.' },
  { id: 'palisadeGate', name: 'Palisade gate', cat: 'door', kind: 'edge', span: 2, door: true, framed: true, fixedFrame: 'log', blocks: true, cap: null, h: 10, build: () => M.palisadeGate(), desc: 'Log gates for a palisade fort, 10 ft wide.' },
  { id: 'lockedDoor', name: 'Locked door', cat: 'door', kind: 'edge', door: true, locked: true, framed: true, blocks: true, cap: 'jambs', h: WALL_H, build: (f) => M.lockedDoor(f), desc: 'Needs a key in walk mode. A rogue can try to pick it.' },
  { id: 'secretDoor', name: 'Secret door', cat: 'door', kind: 'edge', door: true, secret: true, framed: true, blocks: true, cap: 'full', h: WALL_H, build: (f) => M.secretDoor(f), desc: 'Looks like the wall. Pivots open.' },
  { id: 'window', name: 'Barred window', cat: 'door', kind: 'edge', framed: true, blocks: true, seeThrough: true, cap: 'full', h: WALL_H, build: (f) => M.windowWall(f, false), desc: 'Lets daylight into the halls.' },
  { id: 'stainedWindow', name: 'Stained glass', cat: 'door', kind: 'edge', framed: true, blocks: true, cap: 'full', h: WALL_H, build: (f) => M.windowWall(f, true), desc: 'Coloured glass for chapels.' },
  { id: 'steps', name: 'Steps', cat: 'stairs', kind: 'obj', layer: 'ground', size: [1, 1], stair: { rise: 2.5 }, build: () => M.stoneStairs(1, 2.5), desc: 'Climbs 2.5 ft in one square. Raise the square behind it one level.' },
  { id: 'stairs', name: 'Stone stairs', cat: 'stairs', kind: 'obj', layer: 'ground', size: [1, 2], stair: { rise: 5 }, build: () => M.stoneStairs(2, 5), desc: 'Climbs 5 ft over two squares. Raise the square behind it two levels.' },
  { id: 'stairsLong', name: 'Long stairs', cat: 'stairs', kind: 'obj', layer: 'ground', size: [1, 3], stair: { rise: 7.5 }, build: () => M.stoneStairs(3, 7.5), desc: 'Climbs 7.5 ft over three squares: three levels.' },
  { id: 'grandStairs', name: 'Grand stairs', cat: 'stairs', kind: 'obj', layer: 'ground', size: [2, 2], stair: { rise: 5 }, build: () => M.grandStairs(), desc: 'Marble stairs with balustrades and a runner, 10 ft wide, climbing 5 ft: two levels.' },
  { id: 'woodStairs', name: 'Wooden stairs', cat: 'stairs', kind: 'obj', layer: 'ground', size: [1, 2], stair: { rise: 5 }, build: () => M.woodenStairs(), desc: 'Open plank stairs with a handrail, climbing 5 ft: two levels.' },
  { id: 'spiralStairs', name: 'Spiral stair', cat: 'stairs', kind: 'obj', layer: 'ground', size: [2, 2], stair: { rise: 7.5, spiral: true, sweep: Math.PI * 1.5 }, build: () => M.spiralStair(), desc: 'Winds three-quarters of a turn round a pillar and leaves on its left, 7.5 ft up: three levels.' },
  { id: 'ramp', name: 'Earth ramp', cat: 'stairs', kind: 'obj', layer: 'ground', size: [1, 2], stair: { rise: 2.5 }, build: () => M.earthRamp(), desc: 'A gentle slope climbing 2.5 ft over two squares: one level.' },

  // ---------------- lights ----------------
  { id: 'torch', name: 'Wall torch', cat: 'light', kind: 'obj', layer: 'wall', size: [1, 1], light: { c: WARM, i: 55, d: 34, p: [0, 7.1, -1.4], f: 1 }, build: () => M.wallTorch(), desc: 'Snaps to the nearest wall side.' },
  { id: 'brazier', name: 'Brazier', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: WARM, i: 85, d: 42, p: [0, 3.9, 0], f: 1 }, build: () => M.brazier(), desc: 'A bowl of burning coals.' },
  { id: 'spiritBrazier', name: 'Spirit brazier', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0x5ab0ff, i: 70, d: 38, p: [0, 3.9, 0], f: 0.7 }, build: () => M.brazier('blue'), desc: 'Cold blue witchfire.' },
  { id: 'candelabra', name: 'Candelabra', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0xffb060, i: 30, d: 26, p: [0, 5.3, 0], f: 0.5 }, build: () => M.candelabra(), desc: 'A tall brass candle stand.' },
  { id: 'candles', name: 'Candles', cat: 'light', kind: 'obj', layer: 'item', size: [1, 1], light: { c: 0xffb060, i: 14, d: 18, p: [0, 0.9, 0], f: 0.5 }, build: () => M.candles(), desc: 'Sits on tables and altars.' },
  { id: 'chandelier', name: 'Chandelier', cat: 'light', kind: 'obj', layer: 'ceiling', size: [1, 1], light: { c: 0xffb060, i: 90, d: 44, p: [0, 7.25, 0], f: 0.4 }, build: () => M.chandelier(), desc: 'Hangs from the ceiling.' },
  { id: 'hangLantern', name: 'Hanging lantern', cat: 'light', kind: 'obj', layer: 'ceiling', size: [1, 1], light: { c: 0xffa050, i: 40, d: 32, p: [0, 6.9, 0], f: 0.3 }, build: () => M.hangingLantern(), desc: 'A caged flame on a chain.' },
  { id: 'lanternPost', name: 'Lantern post', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0xffa050, i: 45, d: 34, p: [1.15, 5.9, 0], f: 0.3 }, build: () => M.lanternPost(), desc: 'Lights paths and camps.' },
  { id: 'campfire', name: 'Campfire', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: WARM, i: 95, d: 46, p: [0, 1.6, 0], f: 1.2 }, build: () => M.campfire(), desc: 'Stones, logs and a crackling fire.' },
  { id: 'crystal', name: 'Glow crystals', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0x4aa8ff, i: 35, d: 28, p: [0, 2.2, 0], f: 0.08 }, build: () => M.crystalCluster('crystal'), desc: 'Arcane quartz that hums softly.' },
  { id: 'amethyst', name: 'Amethyst geode', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0xb06aff, i: 30, d: 26, p: [0, 2.2, 0], f: 0.08 }, build: () => M.crystalCluster('amethyst'), desc: 'Violet light for Underdark caves.' },
  { id: 'glowShrooms', name: 'Glow mushrooms', cat: 'light', kind: 'obj', layer: 'ground', size: [1, 1], light: { c: 0x3affd8, i: 22, d: 22, p: [0, 1.3, 0], f: 0.05 }, build: () => M.glowShrooms(), desc: 'Bioluminescent fungi.' },

  // ---------------- furniture ----------------
  { id: 'table', name: 'Long table', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 1], block: true, surface: 2.7, build: () => M.table(2), desc: 'Seats a war council. Place items on top.' },
  { id: 'roundTable', name: 'Round table', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, surface: 2.69, build: () => M.roundTable(), desc: 'For card games and plotting.' },
  { id: 'chair', name: 'Chair', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], build: () => M.chair(), desc: 'Rotate with R.' },
  { id: 'bench', name: 'Bench', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 1], build: () => M.bench(), desc: 'Rough seating for a tavern.' },
  { id: 'bed', name: 'Bed', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 2], block: true, build: () => M.bed(), desc: 'Headboard faces the back.' },
  { id: 'bookshelf', name: 'Bookshelf', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, wallSnap: true, build: () => M.bookshelf(), desc: 'Snaps against the nearest wall.' },
  { id: 'throne', name: 'Throne', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.throne(), desc: 'Gilded seat of a dungeon lord.' },
  { id: 'alchemy', name: 'Alchemy bench', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 1], block: true, light: { c: 0xffb060, i: 12, d: 14, p: [2.3, 3.6, 0.6], f: 0.4 }, build: () => M.alchemyTable(), desc: 'Alembics, flasks and a skull.' },
  { id: 'lectern', name: 'Spellbook lectern', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 300, light: { c: 0x8a6aff, i: 8, d: 10, p: [0.3, 3.9, 0.1], f: 0.1 }, build: () => M.lectern(), desc: 'An open grimoire. Worth 300 gp.' },
  { id: 'altar', name: 'Altar', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 1], block: true, surface: 3.31, light: { c: 0xffb060, i: 22, d: 22, p: [0, 4.4, 0], f: 0.5 }, build: () => M.altar(), desc: 'Candles, a chalice and a rune.' },
  { id: 'weaponRack', name: 'Weapon rack', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, wallSnap: true, build: () => M.weaponRack(), desc: 'Swords, spear and axe.' },
  { id: 'cauldron', name: 'Cauldron', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0x5aff3a, i: 22, d: 18, p: [0, 2.4, 0], f: 0.3 }, build: () => M.cauldron(), desc: 'Something green is bubbling.' },
  { id: 'anvil', name: 'Anvil', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.anvil(), desc: 'Iron on a stump, hammer resting.' },
  { id: 'barrel', name: 'Barrel', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, surface: 3.12, build: () => M.barrel(), desc: 'Ale, salt pork, or worse.' },
  { id: 'crates', name: 'Crates', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.crates(), desc: 'Stacked supplies.' },
  { id: 'well', name: 'Well', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.well(), desc: 'Stone well with a roof.' },
  { id: 'fountain', name: 'Fountain', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 2], block: true, build: () => M.fountain(), desc: 'Tiered marble basin.' },
  { id: 'tent', name: 'Tent', cat: 'furn', kind: 'obj', layer: 'ground', size: [2, 2], block: true, build: () => M.tent(), desc: 'A canvas shelter for camps.' },
  { id: 'bedroll', name: 'Bedroll', cat: 'furn', kind: 'obj', layer: 'ground', size: [1, 2], build: () => M.bedroll(), desc: 'Where adventurers sleep.' },

  // ---------------- dressing ----------------
  { id: 'rug', name: 'Rug', cat: 'decor', kind: 'obj', layer: 'rug', size: [2, 3], build: () => M.rug(), desc: 'Furniture can stand on it.' },
  { id: 'banner', name: 'Banner', cat: 'decor', kind: 'obj', layer: 'wall', size: [1, 1], build: () => M.banner('redCloth'), desc: 'Snaps to the nearest wall side.' },
  { id: 'blueBanner', name: 'Blue banner', cat: 'decor', kind: 'obj', layer: 'wall', size: [1, 1], build: () => M.banner('blueCloth'), desc: 'Colours of a rival house.' },
  { id: 'shield', name: 'Shield trophy', cat: 'decor', kind: 'obj', layer: 'wall', size: [1, 1], build: () => M.shieldTrophy(), desc: 'Crossed swords behind a crest.' },
  { id: 'pillar', name: 'Pillar', cat: 'decor', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.pillar(), desc: 'Full-height marble column.' },
  { id: 'statue', name: 'Knight statue', cat: 'decor', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.statue(), desc: 'A stone guardian with a sword.' },
  { id: 'sarcophagus', name: 'Sarcophagus', cat: 'decor', kind: 'obj', layer: 'ground', size: [1, 2], block: true, build: () => M.sarcophagus(), desc: 'Sealed. Probably.' },
  { id: 'trapdoor', name: 'Trapdoor', cat: 'decor', kind: 'obj', layer: 'rug', size: [1, 1], build: () => M.trapdoor(), desc: 'Leads to a lower level.' },
  { id: 'spikes', name: 'Spike trap', cat: 'decor', kind: 'obj', layer: 'rug', size: [1, 1], trap: { dc: 12, dmg: '2d6', half: true, what: 'Spikes shoot up' }, build: () => M.spikeTrap(), desc: 'Spikes that shoot up when stepped on: 2d6, save for half. Jump over it.' },
  { id: 'cage', name: 'Iron cage', cat: 'decor', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.cage(), desc: 'Its last occupant is still inside.' },
  { id: 'bones', name: 'Bones', cat: 'decor', kind: 'obj', layer: 'item', size: [1, 1], build: () => M.bones(), desc: 'A skull and scattered remains.' },
  { id: 'cobweb', name: 'Cobweb', cat: 'decor', kind: 'obj', layer: 'ceiling', size: [1, 1], build: () => M.cobweb(), desc: 'Hangs in an upper corner.' },
  { id: 'hay', name: 'Hay bale', cat: 'decor', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.hayBale(), desc: 'For stables and barns.' },

  // ---------------- loot ----------------
  { id: 'chest', name: 'Chest', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 150, interact: 'chest', build: () => M.chest(false), desc: 'Holds 150 gp. Open it in walk mode.' },
  { id: 'ornateChest', name: 'Ornate chest', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 800, interact: 'chest', build: () => M.chest(true), desc: 'Gilded, with a ruby clasp. 800 gp.' },
  { id: 'mimic', name: 'Mimic', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 0, interact: 'mimic', build: () => M.chest(false, true), desc: 'Looks like a chest. It is not.' },
  { id: 'coins', name: 'Coin pile', cat: 'loot', kind: 'obj', layer: 'item', size: [1, 1], gp: 60, build: () => M.coinPile(), desc: 'Loose gold. 60 gp.' },
  { id: 'gems', name: 'Gemstones', cat: 'loot', kind: 'obj', layer: 'item', size: [1, 1], gp: 400, build: () => M.gems(), desc: 'Rubies, emeralds, sapphires. 400 gp.' },
  { id: 'potions', name: 'Potions', cat: 'loot', kind: 'obj', layer: 'item', size: [1, 1], gp: 150, build: () => M.potions(), desc: 'Healing, mana and something green.' },
  { id: 'idol', name: 'Golden idol', cat: 'loot', kind: 'obj', layer: 'item', size: [1, 1], gp: 1200, build: () => M.idol(), desc: 'Emerald eyes. Cursed? 1,200 gp.' },
  { id: 'urn', name: 'Funerary urn', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 40, build: () => M.urn(), desc: 'Ashes and a few coins. 40 gp.' },
  { id: 'crown', name: 'Crown on plinth', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 2500, build: () => M.crownPedestal(), desc: 'A royal crown. 2,500 gp.' },
  { id: 'sword', name: 'Sword in stone', cat: 'loot', kind: 'obj', layer: 'ground', size: [1, 1], block: true, gp: 1500, build: () => M.swordInStone(), desc: 'Only the worthy. 1,500 gp.' },
  { id: 'hoard', name: 'Dragon hoard', cat: 'loot', kind: 'obj', layer: 'ground', size: [2, 2], block: true, gp: 10000, build: () => M.hoard(), desc: 'A mountain of gold. 10,000 gp.' },

  // ---------------- wilds ----------------
  { id: 'oak', name: 'Oak tree', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.oak(3), desc: 'Broad canopy.' },
  { id: 'pine', name: 'Pine tree', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.pine(2), desc: 'Tall evergreen.' },
  { id: 'deadTree', name: 'Dead tree', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.deadTree(4), desc: 'Bare, twisted branches.' },
  { id: 'palm', name: 'Palm tree', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.palm(2), desc: 'For desert oases.' },
  { id: 'cactus', name: 'Cactus', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.cactus(3), desc: 'Saguaro with two arms.' },
  { id: 'boulder', name: 'Boulder', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.boulder(5), desc: 'A large rock.' },
  { id: 'rocks', name: 'Pebbles', cat: 'nature', kind: 'obj', layer: 'item', size: [1, 1], build: () => M.rocks(6), desc: 'Scattered stones.' },
  { id: 'bush', name: 'Bush', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], build: () => M.bush(2), desc: 'Leafy shrub.' },
  { id: 'reeds', name: 'Reeds', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], build: () => M.reeds(), desc: 'Cattails for marsh edges.' },
  { id: 'flowers', name: 'Wildflowers', cat: 'nature', kind: 'obj', layer: 'rug', size: [1, 1], build: () => M.flowers(), desc: 'A patch of colour.' },
  { id: 'mushrooms', name: 'Toadstools', cat: 'nature', kind: 'obj', layer: 'item', size: [1, 1], build: () => M.redMushrooms(), desc: 'Red caps. Do not eat.' },
  { id: 'standingStone', name: 'Standing stone', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, light: { c: 0x8a6aff, i: 6, d: 10, p: [0, 4.5, 0.8], f: 0.1 }, build: () => M.standingStone(), desc: 'A rune-carved menhir.' },
  { id: 'ruinColumn', name: 'Ruined column', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.ruinedColumn(), desc: 'Broken shaft and fallen drum.' },
  { id: 'grave', name: 'Gravestone', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.gravestone(2), desc: 'Here lies someone.' },
  { id: 'stump', name: 'Stump & axe', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.stump(), desc: 'A woodcutter was here.' },
  { id: 'logPile', name: 'Log pile', cat: 'nature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, build: () => M.logPile(), desc: 'Firewood for the winter.' },

  // ---------------- stairs: each climbs toward its back; raise the squares behind it by the same height ----------------

  // ---------------- creatures ----------------
  { id: 'skeleton', name: 'Skeleton', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 50, hp: 2, build: () => M.skeletonWarrior(), desc: 'Rattling guard with sword and shield. 50 XP.' },
  { id: 'goblin', name: 'Goblin', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 50, hp: 1, build: () => M.goblin(), desc: 'Small, sly and stabby. 50 XP.' },
  { id: 'orc', name: 'Orc', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 100, hp: 3, build: () => M.orc(), desc: 'Tusked raider with a great axe. 100 XP.' },
  { id: 'cultist', name: 'Cultist', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 100, hp: 2, light: { c: 0x6aff8a, i: 12, d: 14, p: [0.7, 7.3, 1.3], f: 0.6 }, build: () => M.cultist(), desc: 'Hooded, with a witchfire staff. 100 XP.' },
  { id: 'wraith', name: 'Wraith', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 450, hp: 3, light: { c: 0x8ac8ff, i: 14, d: 16, p: [0, 4.5, 0.3], f: 0.2 }, build: () => M.wraith(), desc: 'A drifting, glowing shade. 450 XP.' },
  { id: 'ooze', name: 'Ooze cube', cat: 'creature', kind: 'obj', layer: 'ground', size: [1, 1], block: true, xp: 450, hp: 3, build: () => M.oozeCube(), desc: 'A wobbling cube with a meal inside. 450 XP.' },
  { id: 'spider', name: 'Giant spider', cat: 'creature', kind: 'obj', layer: 'ground', size: [2, 2], block: true, xp: 200, hp: 3, build: () => M.giantSpider(), desc: 'Eight legs, six red eyes. 200 XP.' },
  { id: 'ogre', name: 'Ogre', cat: 'creature', kind: 'obj', layer: 'ground', size: [2, 2], block: true, xp: 450, hp: 5, build: () => M.ogre(), desc: 'Ten feet of trouble with a club. 450 XP.' },
  { id: 'dragon', name: 'Young dragon', cat: 'creature', kind: 'obj', layer: 'ground', size: [3, 3], block: true, xp: 5900, hp: 8, build: () => M.youngDragon(), desc: 'A red wyrmling guarding its lair. 5,900 XP.' },

  // ---------------- adventure: what turns a walk into a game ----------------
  { id: 'startMark', name: 'Start', cat: 'game', kind: 'obj', layer: 'rug', size: [1, 1], start: true, build: () => M.startMark(), desc: 'Where a walk begins. R turns the way the walker faces.' },
  { id: 'exitMark', name: 'Exit', cat: 'game', kind: 'obj', layer: 'rug', size: [1, 1], exit: true, light: { c: 0x8a6aff, i: 16, d: 16, p: [0, 1.2, 0], f: 0.15 }, build: () => M.exitMark(), desc: 'Reach it and press E to finish the run.' },
  { id: 'key', name: 'Key', cat: 'game', kind: 'obj', layer: 'item', size: [1, 1], key: true, light: { c: 0xffd27a, i: 5, d: 8, p: [0, 0.8, 0], f: 0.1 }, build: () => M.keyItem(), desc: 'Opens one locked door. Sits on the floor or on a table.' },
  { id: 'plate', name: 'Pressure plate', cat: 'game', kind: 'obj', layer: 'rug', size: [1, 1], trap: { dc: 13, dmg: '2d8', half: false, hidden: true, once: true, what: 'Darts fly from the walls' }, build: () => M.pressurePlate(), desc: 'A hidden dart trap: 2d8, save for none. The red mark shows only once it is noticed.' },
  { id: 'fireRune', name: 'Fire rune', cat: 'game', kind: 'obj', layer: 'rug', size: [1, 1], trap: { dc: 13, dmg: '3d6', half: true, once: true, what: 'The rune bursts into flame' }, light: { c: 0xff7a2a, i: 10, d: 12, p: [0, 0.8, 0], f: 0.4 }, build: () => M.fireRune(), desc: 'A glowing glyph that burns once: 3d6, save for half.' },
];

// Pieces are real-sized. These were first drawn for 3 ft squares and are re-sized here to suit a
// 5 ft square: a bed that fills one square by two, floor pieces that fill their square, and so
// on. [x, y, z] (or one number) scales the model; a piece's surface height and light follow.
const FIT = {
  altar: [1.5, 1.1, 1.4], fountain: [1.5, 1.25, 1.5], tent: [1.6, 1.4, 1.6],
  bedroll: [1.35, 1.2, 1.5], sarcophagus: [1.4, 1.15, 1.5], hoard: [1.6, 1.4, 1.6], spider: 1.35, ooze: 1.55,
  spikes: [1.65, 1, 1.65], trapdoor: [1.6, 1, 1.6], plate: [1.65, 1, 1.65], fireRune: [1.7, 1, 1.7], startMark: [1.6, 1, 1.6], exitMark: [1.6, 1.3, 1.6],
  weaponRack: [1.5, 1, 1], banner: [1.4, 1.15, 1], blueBanner: [1.4, 1.15, 1], shield: [1.3, 1.3, 1],
  well: 1.3, cage: [1.25, 1.1, 1.25], pillar: [1.4, 1, 1.4], statue: 1.2,
  chest: 1.25, ornateChest: 1.25, mimic: 1.25, crates: 1.3, barrel: 1.15, anvil: 1.15, cauldron: 1.25, campfire: 1.35,
  brazier: 1.15, spiritBrazier: 1.15, hay: 1.3, lectern: 1.1, crown: 1.15, sword: 1.15, urn: 1.2,
  standingStone: 1.2, boulder: 1.3, grave: 1.2, stump: 1.2, logPile: 1.3, crystal: 1.2, amethyst: 1.2,
  coins: 1.2, gems: 1.2, potions: 1.2, idol: 1.2, bones: 1.25, candles: 1.15, rocks: 1.3, glowShrooms: 1.25, mushrooms: 1.25,
};
for (const it of ITEMS) {
  const f = FIT[it.id];
  if (!f) continue;
  const [sx, sy, sz] = Array.isArray(f) ? f : [f, f, f];
  const build = it.build;
  it.build = (...a) => { const g = build(...a); g.scale.set(sx, sy, sz); return g; };
  if (it.surface) it.surface *= sy;
  if (it.light) it.light = { ...it.light, p: [it.light.p[0] * sx, it.light.p[1] * sy, it.light.p[2] * sz] };
}

export const byId = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
export const LAYERS = ['rug', 'ground', 'item', 'wall', 'ceiling'];
