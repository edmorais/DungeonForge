import { sunkenCrypt, banditCamp, ruinedShrine, ziggurat, deepMine, sunkenArena, lichSpires, cragTower } from './samples.js';
import { goblinWarren, serpentTemple, frozenBarrow, undercitySewers, dragonsCaldera, blackwoodManor, dwarfHall, crossroadsInn } from './moreSamples.js';

// Every finished map on the welcome screen, in the order shown. `land` and `time` set the scene,
// `view` is [camera position, target] framed for 3 ft squares (main.js scales it), `tags` are the
// short labels on each card.
export const PRESETS = [
  { id: 'crypt', title: 'The sunken crypt', text: 'A keep with a throne hall, chapel, library, prison and a hidden vault.', tags: ['Keep', 'Swamp'], land: 'swamp', time: 19.4, build: sunkenCrypt },
  { id: 'inn', title: 'The Crossroads Inn', text: 'A roadside inn on the gaming table, with rooms to rent and trouble in the cellar.', tags: ['Starter', 'Tabletop'], land: 'tabletop', time: 14, build: crossroadsInn },
  { id: 'warren', title: 'The Goblin Warren', text: 'Caves in the hills: a guard cave, a fungus grotto, a larder and the chief’s hall.', tags: ['Caves', 'Highlands'], land: 'highlands', time: 15, build: goblinWarren },
  { id: 'camp', title: 'Bandit camp', text: 'A palisade fort in the forest with tents, a campfire and stolen loot.', tags: ['Outdoors', 'Forest'], land: 'forest', time: 18.3, build: banditCamp },
  { id: 'manor', title: 'Blackwood Manor', text: 'A haunted house in the marsh, a shrine behind a secret door and a garden of graves.', tags: ['House', 'Swamp'], land: 'swamp', time: 22, light: 1.2, build: blackwoodManor },
  { id: 'temple', title: 'Temple of the Coiled Serpent', text: 'A forest temple 5 ft up, with water channels in the nave and a guarded treasury.', tags: ['Temple', 'Forest'], land: 'forest', time: 17.4, build: serpentTemple },
  { id: 'barrow', title: 'The Frozen Barrow', text: 'A burial mound dug into the tundra, its chamber 7.5 ft below the snow.', tags: ['Tomb', 'Tundra'], land: 'tundra', time: 9, build: frozenBarrow },
  { id: 'sewers', title: 'The Undercity Sewers', text: 'Brick tunnels round a water channel: a thieves’ guild, a prison and a spider’s nest.', tags: ['Underground'], land: 'underdark', time: 12, light: 1.8, build: undercitySewers },
  { id: 'hall', title: 'The Dwarf-King’s Hall', text: 'A hold taken by orcs: a castle gate, a great hall, a forge and a vault 5 ft down.', tags: ['Hold', 'Highlands'], land: 'highlands', time: 15.5, build: dwarfHall },
  { id: 'shrine', title: 'Drowned shrine', text: 'Ruined columns and a fountain on a desert dune at dusk.', tags: ['Ruins', 'Desert'], land: 'desert', time: 17.7, build: ruinedShrine },
  { id: 'caldera', title: 'The Dragon’s Caldera', text: 'A crater rim 5 ft up, a lake of lava and a dragon asleep on its hoard.', tags: ['Lair', 'Volcanic'], land: 'volcanic', time: 19.5, build: dragonsCaldera },
  { id: 'ziggurat', title: 'Ziggurat of the Dawn Sun', text: 'A stepped temple rising 20 ft from the sand, with a stair up every face.', tags: ['Heights', 'Desert'], land: 'desert', time: 7.2, view: [[-44, 82, 104], [2, 4, 6]], build: ziggurat },
  { id: 'mine', title: 'The Deepdelve Mine', text: 'A yard in the hills, then drifts 7.5, 12.5 and 20 ft down to a forge over lava.', tags: ['Depths', 'Highlands'], land: 'highlands', time: 17.2, view: [[-30, 92, 96], [4, -8, 2]], build: deepMine },
  { id: 'arena', title: 'Sunken Arena of Varn', text: 'Seating tiers stepping 10 ft down to a sand floor, with a royal box.', tags: ['Depths', 'Meadow'], land: 'meadow', time: 16.4, view: [[-26, 66, 78], [3, -6, 4]], build: sunkenArena },
  { id: 'crag', title: 'Watchtower on the Grey Crag', text: 'Snowy terraces up to a tower 17.5 ft above the plain, and a cave below.', tags: ['Heights', 'Tundra'], land: 'tundra', time: 9.4, view: [[-40, 70, 80], [0, 8, 2]], build: cragTower },
  { id: 'spires', title: 'Spires of the Pale Lich', text: 'Platforms on stone pillars in the dark, climbing to a spire 25 ft up.', tags: ['Heights', 'Void'], land: 'void', time: 21, light: 1.35, view: [[-52, 70, 70], [-4, 10, 0]], build: lichSpires },
];
export const presetById = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
