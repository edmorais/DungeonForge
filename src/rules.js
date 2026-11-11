// Tabletop rules for walk mode: dice, hero classes and creature stats.
// Distances are in squares (3 ft each). Nothing here touches the map or three.js.

export const d20 = () => 1 + Math.floor(Math.random() * 20);

// 'NdS+M' -> { n, sides, mod }
export function parseDice(spec) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(spec);
  return { n: +m[1], sides: +m[2], mod: +(m[3] || 0) };
}

// Roll a dice spec. A critical hit rolls the dice twice (the modifier counts once).
// Returns { total, text } where text reads like '1d8+3: 6 + 3 = 9'.
export function rollDice(spec, crit = false) {
  const { n, sides, mod } = parseDice(spec);
  const dice = [];
  for (let k = 0; k < n * (crit ? 2 : 1); k++) dice.push(1 + Math.floor(Math.random() * sides));
  const total = Math.max(1, dice.reduce((a, b) => a + b, 0) + mod);
  const parts = dice.join(' + ') + (mod > 0 ? ` + ${mod}` : mod < 0 ? ` − ${-mod}` : '');
  const name = crit ? `${n * 2}d${sides}${mod > 0 ? '+' + mod : mod < 0 ? mod : ''}` : spec;
  return { total, text: dice.length > 1 || mod ? `${name}: ${parts} = ${total}` : `${name}: ${total}` };
}

// One attack roll against an armour class. A natural 20 always hits and is a critical hit,
// a natural 1 always misses. With advantage two d20 are rolled and the higher one counts.
export function attackRoll(bonus, ac, advantage = false) {
  const rolls = advantage ? [d20(), d20()] : [d20()];
  const nat = Math.max(...rolls);
  const total = nat + bonus;
  const crit = nat === 20;
  return { rolls, nat, bonus, total, ac, crit, hit: crit || (nat !== 1 && total >= ac) };
}

// A saving throw against a difficulty class.
export function saveRoll(bonus, dc) {
  const nat = d20();
  return { rolls: [nat], nat, bonus, total: nat + bonus, dc, ok: nat + bonus >= dc };
}

// The four heroes. `speed` is squares per turn, `save` the bonus on saving throws against traps,
// `spot` how far (squares) the hero notices hidden traps without a roll.
// The numbers suit one seasoned hero walking a whole dungeon alone: a fight with two common
// creatures should cost about a third of a fighter's health.
export const CLASSES = {
  fighter: {
    name: 'Fighter', hp: 48, ac: 17, speed: 10, init: 1, save: 3, spot: 0, lockpick: null,
    attack: { name: 'Longsword', bonus: 7, dmg: '1d8+5', range: 1, verb: 'swing at' },
    special: { id: 'secondWind', name: 'Second wind', uses: 2, free: true, heal: '1d10+6', text: 'Regain 1d10+6 health. Does not use your action.' },
    blurb: 'Tough and well armoured. Best in a stand-up fight.',
  },
  rogue: {
    name: 'Rogue', hp: 36, ac: 15, speed: 12, init: 4, save: 5, spot: 2, lockpick: 6,
    attack: { name: 'Short sword', bonus: 7, dmg: '1d6+5', range: 1, verb: 'stab at' },
    special: { id: 'sneak', name: 'Sneak attack', uses: 3, free: false, extra: '3d6', text: 'An attack with two d20 (the higher counts) that deals 3d6 more.' },
    blurb: 'Fast. Spots traps, disarms them and picks locks.',
  },
  wizard: {
    name: 'Wizard', hp: 30, ac: 13, speed: 10, init: 2, save: 2, spot: 0, lockpick: null,
    attack: { name: 'Fire bolt', bonus: 7, dmg: '2d8', range: 20, verb: 'hurl fire at' },
    special: { id: 'missile', name: 'Magic missile', uses: 3, free: false, dmg: '3d4+6', text: 'Three darts that never miss: 3d4+6 damage, up to 60 ft away.' },
    blurb: 'Fragile, but strikes from 60 ft away.',
  },
  cleric: {
    name: 'Cleric', hp: 42, ac: 17, speed: 10, init: 0, save: 4, spot: 0, lockpick: null,
    attack: { name: 'Mace', bonus: 6, dmg: '1d8+4', range: 1, verb: 'swing at', undead: '1d8' },
    special: { id: 'cure', name: 'Cure wounds', uses: 3, free: false, heal: '2d8+5', text: 'Regain 2d8+5 health. Uses your action.' },
    blurb: 'Armoured healer. Deals 1d8 more to the undead.',
  },
};

// Creature stats by catalogue id. `speed` 0 means it holds its ground. `ranged` is used when the
// hero is out of reach but in sight; `breath` is the dragon's fire, used every `every` turns.
export const MONSTERS = {
  goblin: { ac: 13, hp: 7, init: 2, speed: 10, melee: { bonus: 4, dmg: '1d6+1', verb: 'stabs you' } },
  skeleton: { ac: 13, hp: 13, init: 2, speed: 10, undead: true, melee: { bonus: 4, dmg: '1d6+2', verb: 'slashes you' } },
  cultist: { ac: 12, hp: 11, init: 1, speed: 8, prefersRange: true, melee: { bonus: 3, dmg: '1d4+1', verb: 'strikes you with a staff' }, ranged: { bonus: 4, dmg: '1d8', range: 8, verb: 'hurls witchfire at you' } },
  ooze: { ac: 8, hp: 24, init: -2, speed: 4, melee: { bonus: 3, dmg: '1d6+2', verb: 'burns you with acid' } },
  orc: { ac: 13, hp: 15, init: 1, speed: 10, melee: { bonus: 5, dmg: '1d10+2', verb: 'cleaves at you' } },
  wraith: { ac: 13, hp: 26, init: 3, speed: 12, undead: true, melee: { bonus: 5, dmg: '2d6', verb: 'drains your warmth' } },
  spider: { ac: 14, hp: 22, init: 3, speed: 10, melee: { bonus: 5, dmg: '1d8+2', verb: 'bites you' }, ranged: { bonus: 4, dmg: '1d6', range: 5, verb: 'spits venom at you' } },
  ogre: { ac: 11, hp: 42, init: -1, speed: 8, reach: 2, melee: { bonus: 6, dmg: '2d8+2', verb: 'clubs you' }, ranged: { bonus: 4, dmg: '1d10', range: 6, verb: 'hurls a rock at you' } },
  dragon: { ac: 17, hp: 75, init: 0, speed: 0, reach: 2, melee: { bonus: 7, dmg: '2d10+3', verb: 'bites you' }, breath: { dmg: '4d6', range: 7, dc: 13, every: 3, verb: 'breathes fire over you' } },
};
export const FALLBACK_MONSTER = { ac: 12, hp: 10, init: 0, speed: 8, melee: { bonus: 4, dmg: '1d6+1', verb: 'hits you' } };

export const POTION = '4d4+4';
export const MIMIC_BITE = '1d8+2';
// one d6 for every 10 ft fallen, after the first 10 ft
export const fallDice = (feet) => Math.max(0, Math.floor(feet / 10));
