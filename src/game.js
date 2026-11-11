import { CELL, GRID_W, GRID_D, inGrid, worldToCell, lineX, lineZ, cellX, cellZ } from './config.js';
import { byId } from './catalog.js';
import { footprint } from './state.js';
import { CLASSES, MONSTERS, FALLBACK_MONSTER, POTION, MIMIC_BITE, d20, rollDice, attackRoll, saveRoll, fallDice } from './rules.js';

// The game played in walk mode: a hero of one class, turn-based fights on the grid with visible
// dice, traps, keys, an exit and a summary at the end. It reads the map and drives the world's
// walk-mode state (creature places, doors, traps); it never changes the saved map.
// `out` is how it talks to the interface: toast, roll, log, hud, health, purse, sound, end.

const NOTICE = 6; // squares at which a creature notices the hero
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const signed = (n) => (n >= 0 ? `+ ${n}` : `− ${-n}`);

export class Game {
  constructor({ state, world, out }) {
    Object.assign(this, { state, world, out });
    this.active = false;
    this.over = false;
    this.cls = null;
    this.combat = null;
    this.mons = new Map();
  }

  // classId null = just looking around: no fights, no traps, every door opens
  start(classId, walker) {
    this.walker = walker;
    this.classId = classId || null;
    this.cls = classId ? CLASSES[classId] : null;
    this.hero = { max: this.cls ? this.cls.hp : 24, hp: this.cls ? this.cls.hp : 24, ac: this.cls ? this.cls.ac : 10, uses: this.cls ? this.cls.special.uses : 0 };
    this.peaceful = !this.cls;
    this.keys = 0; this.gold = 0; this.xp = 0;
    this.mons = new Map();
    for (const ob of this.world.creatures) {
      const [w, d] = footprint(ob.t, ob.r);
      const st = MONSTERS[ob.t] || FALLBACK_MONSTER;
      this.mons.set(ob.id, { id: ob.id, t: ob.t, name: byId[ob.t].name.toLowerCase(), st, hp: st.hp, i: ob.i, j: ob.j, w, d, active: false, dead: false, turns: 0 });
    }
    this.combat = null; this.turn = null; this.turnName = ''; this.moveLeft = 0; this.action = false;
    this.queue = [];
    this.safe = new Set(); // traps made safe
    this.looked = new Set(); // hidden traps the hero has had a chance to notice
    this.pickTried = new Set(); // locks the hero already failed to pick
    this.readyAt = 0; this.hintAt = 0; this.noticeT = 0.6;
    this.dying = false; this.over = false; this.active = true;
    this.t0 = performance.now();
    this.stats = { rounds: 0, fights: 0, dealt: 0, taken: 0, crits: 0, defeated: 0, chests: 0, trapsSprung: 0, trapsDisarmed: 0, potions: 0, doors: 0 };
    let goldTotal = 0, chestsTotal = 0;
    // squares no creature can stand on: solid pieces, pits, lava, and gaps in a floor over the void
    this.blocked = new Uint8Array(GRID_W * GRID_D);
    this.stairs = new Uint8Array(GRID_W * GRID_D);
    const mark = (grid, ob) => { const [w, d] = footprint(ob.t, ob.r); for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) if (inGrid(ob.i + a, ob.j + b)) grid[(ob.j + b) * GRID_W + ob.i + a] = 1; };
    for (const ob of this.state.data.objects) {
      const it = byId[ob.t];
      if (it.interact === 'chest') { goldTotal += it.gp || 0; chestsTotal++; }
      if (it.cat === 'creature') continue;
      if (it.block) mark(this.blocked, ob);
      if (it.stair) mark(this.stairs, ob);
    }
    for (let j = 0; j < GRID_D; j++) for (let i = 0; i < GRID_W; i++) {
      const f = this.state.floorAt(i, j);
      if (f ? byId[f].pit || f === 'lava' : walker.voidEdges) this.blocked[j * GRID_W + i] = 1;
    }
    this.totals = { foes: this.mons.size, gold: goldTotal, chests: chestsTotal };
    this.out.health(this.hero.hp, this.hero.max, this.peaceful);
    this.out.purse(0, 0, 0);
    this.pushHud();
  }

  stop() { this.active = false; this.combat = null; this.queue = []; }

  // ---------- small helpers ----------
  after(seconds, fn) { this.queue.push({ t: seconds, fn }); }
  log(msg, kind = '') { this.out.log(msg, kind); }
  heroCell() { return worldToCell(this.walker.pos.x, this.walker.pos.z); }
  foes() { return [...this.mons.values()].filter((m) => m.active && !m.dead); }
  centre(m) { return [lineX(m.i) + (m.w * CELL) / 2, lineZ(m.j) + (m.d * CELL) / 2]; }
  // squares between a footprint and the hero's square, counting diagonals as one (0 = same square)
  footDist(i, j, w, d, hi, hj) { return Math.max(i - hi, hi - (i + w - 1), j - hj, hj - (j + d - 1), 0); }
  distTo(m) { const [hi, hj] = this.heroCell(); return this.footDist(m.i, m.j, m.w, m.d, hi, hj); }
  sees(m, shutDoors = false) { const [x, z] = this.centre(m); return !this.world.segmentBlocked(x, z, this.walker.pos.x, this.walker.pos.z, true, shutDoors); }
  // no wall or closed door between the hero and the nearest square of a footprint
  reachableFrom(i, j, m) {
    const [hi, hj] = this.heroCell();
    return !this.world.segmentBlocked(cellX(clamp(hi, i, i + m.w - 1)), cellZ(clamp(hj, j, j + m.d - 1)), cellX(hi), cellZ(hj), false);
  }
  describe(m) { return `AC ${m.st.ac} · ${m.hp} of ${m.st.hp} hp`; }

  pushHud() {
    const c = this.combat;
    this.out.hud({
      cls: this.cls ? this.cls.name : null,
      ac: this.hero.ac,
      keys: this.keys,
      special: this.cls ? { name: this.cls.special.name, uses: this.hero.uses } : null,
      combat: c ? {
        round: c.round, turn: this.turn, who: this.turnName, moveLeft: this.moveLeft, action: this.action,
        order: c.order.filter((e) => e.hero || !this.mons.get(e.id).dead).map((e) => ({ name: e.hero ? 'You' : cap(this.mons.get(e.id).name), current: e === c.order[c.idx] })),
      } : null,
    });
  }

  // ---------- every frame ----------
  update(dt) {
    if (!this.active || this.over) return;
    if (this.queue.length) {
      const q = this.queue[0];
      q.t -= dt;
      if (q.t <= 0) { this.queue.shift(); q.fn(); }
    }
    this.noticeT -= dt;
    if (this.noticeT <= 0 && !this.over) { this.noticeT = 0.25; this.lookAround(); }
  }

  lookAround() {
    if (!this.cls) return;
    const [hi, hj] = this.heroCell();
    for (const ob of this.state.data.objects) {
      const tr = byId[ob.t].trap;
      if (!tr || !tr.hidden || this.world.spotted.has(ob.id) || this.world.sprung.has(ob.id)) continue;
      const dist = Math.max(Math.abs(ob.i - hi), Math.abs(ob.j - hj));
      if (dist === 0 || dist > Math.max(1, this.cls.spot)) continue;
      // a keen-eyed hero always notices; the others get one roll when they come next to it
      let seen = dist <= this.cls.spot;
      if (!seen && !this.looked.has(ob.id)) { this.looked.add(ob.id); seen = d20() + this.cls.save >= 13; }
      if (seen) {
        this.world.spotTrap(ob.id);
        this.out.toast(`You notice a ${byId[ob.t].name.toLowerCase()} in the floor.`);
        this.log(`You notice a ${byId[ob.t].name.toLowerCase()}.`);
      }
    }
    if (this.peaceful || this.dying) return;
    const fresh = [];
    // a creature behind a closed gate cannot get at the hero, so it does not start a fight
    for (const m of this.mons.values()) if (!m.dead && !m.active && this.distTo(m) <= NOTICE + (m.st.ranged ? 2 : 0) && this.sees(m, true)) fresh.push(m);
    if (!fresh.length) return;
    if (this.combat) this.join(fresh); else this.startCombat(this.pack(fresh), false);
  }

  // creatures standing close to one that joins a fight join with it
  pack(list) {
    const out = [...list];
    for (const m of this.mons.values()) {
      if (m.dead || m.active || out.includes(m)) continue;
      const [x, z] = this.centre(m);
      if (list.some((f) => { const [fx, fz] = this.centre(f); return Math.hypot(fx - x, fz - z) <= 4 * CELL && !this.world.segmentBlocked(fx, fz, x, z, true); })) out.push(m);
    }
    return out;
  }

  // ---------- turns ----------
  startCombat(list, surprise) {
    for (const m of list) m.active = true;
    const order = list.map((m) => ({ id: m.id, init: d20() + m.st.init }));
    const nat = d20();
    const hero = { hero: true, init: surprise ? 99 : nat + this.cls.init };
    order.push(hero);
    order.sort((a, b) => b.init - a.init || (a.hero ? -1 : 1));
    this.combat = { round: 1, order, idx: -1 };
    this.stats.fights++;
    this.stats.rounds++;
    const names = list.length === 1 ? `the ${list[0].name}` : list.length === 2 ? `the ${list[0].name} and the ${list[1].name}` : `${list.length} creatures`;
    this.out.sound('growl', list.some((m) => m.t === 'dragon' || m.t === 'ogre'));
    if (surprise) {
      this.out.toast(`You catch ${names} off guard.`);
      this.log(`You catch ${names} off guard and act first.`);
    } else {
      const first = order[0].hero ? 'You act first' : `The ${this.mons.get(order[0].id).name} acts first`;
      this.out.toast(`${cap(names)} ${list.length > 1 ? 'attack' : 'attacks'}!`, 'danger');
      this.out.roll({ title: 'Roll for initiative', die: nat, sub: `${nat} ${signed(this.cls.init)} = ${nat + this.cls.init}`, outcome: first, tone: order[0].hero ? 'good' : 'bad', lines: [] });
      this.log(`A fight begins with ${names}. ${first}.`);
    }
    if (surprise) this.nextTurn(); else { this.turn = 'wait'; this.pushHud(); this.after(1.1, () => this.nextTurn()); }
  }

  join(list) {
    for (const m of list) {
      m.active = true;
      this.combat.order.push({ id: m.id, init: 0 });
      this.log(`The ${m.name} joins the fight.`, 'bad');
    }
    this.out.toast(list.length === 1 ? `The ${list[0].name} joins the fight.` : `${list.length} more creatures join the fight.`, 'danger');
    this.pushHud();
  }

  nextTurn() {
    const c = this.combat;
    if (!c || this.over || this.dying) return;
    if (!this.foes().length) return this.endCombat('won');
    for (let n = 0; n <= c.order.length; n++) {
      c.idx++;
      if (c.idx >= c.order.length) {
        c.idx = 0; c.round++; this.stats.rounds++;
        // out of sight and far away from every foe at the end of a round: the hero got away
        if (this.foes().every((m) => this.distTo(m) > 10 && !this.sees(m))) return this.endCombat('fled');
      }
      const e = c.order[c.idx];
      if (e.hero) return this.heroTurn();
      const m = this.mons.get(e.id);
      if (m && !m.dead) return this.monsterTurn(m);
    }
  }

  heroTurn() {
    this.turn = 'hero'; this.turnName = 'You';
    this.moveLeft = this.cls.speed;
    this.action = true;
    this.pushHud();
  }

  endTurn() {
    if (!this.combat || this.turn !== 'hero' || this.over) return;
    this.turn = 'wait';
    this.pushHud();
    this.after(0.15, () => this.nextTurn());
  }

  // nothing left to do this turn: move on without making the player press a key
  maybeAutoEnd() {
    if (this.combat && this.turn === 'hero' && !this.action && this.moveLeft <= 0) this.after(0.9, () => this.endTurn());
  }

  endCombat(how) {
    if (!this.combat) return;
    for (const m of this.mons.values()) m.active = false;
    this.combat = null; this.turn = null;
    this.out.toast(how === 'won' ? 'The fight is over.' : 'You slip away.', how === 'won' ? 'gold' : '');
    this.log(how === 'won' ? 'The fight is over.' : 'You slip away from the fight.', 'good');
    this.pushHud();
  }

  // ---------- creatures ----------
  monsterTurn(m) {
    this.turn = 'mon'; this.turnName = `The ${m.name}`;
    m.turns++;
    this.pushHud();
    this.after(0.5, () => this.monsterAct(m));
  }

  monsterAct(m) {
    if (m.dead || this.over || this.dying || !this.combat) return this.nextTurn();
    const st = m.st, reach = st.reach || 1;
    const canMelee = () => this.distTo(m) <= reach && this.reachableFrom(m.i, m.j, m);
    const canShoot = (a) => !!a && this.distTo(m) <= a.range && this.sees(m);
    if (st.breath && m.turns % st.breath.every === 1 && canShoot(st.breath)) return this.breathe(m);
    if (canMelee()) return this.monAttack(m, st.melee);
    if (st.prefersRange && canShoot(st.ranged)) return this.monAttack(m, st.ranged);
    const steps = st.speed ? this.pathToward(m, reach).slice(0, st.speed) : [];
    const then = () => {
      if (this.over || this.dying) return;
      if (canMelee()) return this.monAttack(m, st.melee);
      if (canShoot(st.ranged)) return this.monAttack(m, st.ranged);
      this.log(steps.length ? `The ${m.name} closes in.` : `The ${m.name} holds its ground.`);
      this.after(0.3, () => this.nextTurn());
    };
    if (!steps.length) return then();
    [m.i, m.j] = steps[steps.length - 1];
    this.world.moveCreature(m.id, { i: m.i, j: m.j }, steps.map(([i, j]) => [lineX(i) + (m.w * CELL) / 2, this.world.floorTop(i, j), lineZ(j) + (m.d * CELL) / 2]));
    this.after((steps.length * CELL) / 13 + 0.2, then);
  }

  // may a creature of this size step from (i, j) one square in a direction?
  canMove(m, i, j, di, dj, hi, hj) {
    const ni = i + di, nj = j + dj;
    const level = this.state.levelAt(ni, nj);
    for (let a = 0; a < m.w; a++) for (let b = 0; b < m.d; b++) {
      const ci = ni + a, cj = nj + b;
      if (!inGrid(ci, cj) || this.blocked[cj * GRID_W + ci] || (ci === hi && cj === hj)) return false;
      if (this.state.levelAt(ci, cj) !== level) return false;
      if (this.world.creatureInCell(ci, cj, m.id)) return false;
    }
    // a change of level needs stairs under the creature
    if (level !== this.state.levelAt(i, j) && !this.stairs[j * GRID_W + i] && !this.stairs[nj * GRID_W + ni]) return false;
    for (let a = 0; a < (di ? m.d : m.w); a++) {
      if (di > 0 && this.world.edgeBlocks('v', i + m.w, j + a)) return false;
      if (di < 0 && this.world.edgeBlocks('v', i, j + a)) return false;
      if (dj > 0 && this.world.edgeBlocks('h', i + a, j + m.d)) return false;
      if (dj < 0 && this.world.edgeBlocks('h', i + a, j)) return false;
    }
    return true;
  }

  // The shortest way to a square from which the creature can strike the hero, as a list of
  // squares. If there is none, the way to the square that gets it closest.
  pathToward(m, reach) {
    const [hi, hj] = this.heroCell();
    const key = (i, j) => j * GRID_W + i;
    const prev = new Map([[key(m.i, m.j), null]]);
    const open = [[m.i, m.j]];
    let best = open[0], bestD = this.footDist(m.i, m.j, m.w, m.d, hi, hj);
    for (let n = 0; n < open.length && n < 3000; n++) {
      const [i, j] = open[n];
      const dd = this.footDist(i, j, m.w, m.d, hi, hj);
      if (dd <= reach && this.reachableFrom(i, j, m)) { best = open[n]; break; }
      if (dd < bestD) { bestD = dd; best = open[n]; }
      for (const [di, dj] of DIRS) {
        const k = key(i + di, j + dj);
        if (prev.has(k) || !this.canMove(m, i, j, di, dj, hi, hj)) continue;
        prev.set(k, open[n]);
        open.push([i + di, j + dj]);
      }
    }
    const path = [];
    for (let c = best; c && prev.get(key(c[0], c[1])); c = prev.get(key(c[0], c[1]))) path.unshift(c);
    return path;
  }

  monAttack(m, atk) {
    const r = attackRoll(atk.bonus, this.hero.ac);
    let dmg = 0;
    const lines = [];
    if (r.hit) { const d = rollDice(atk.dmg, r.crit); dmg = d.total; lines.push(`${d.text} damage`); }
    this.out.roll({ title: `The ${m.name} attacks`, die: r.nat, sub: `${r.nat} ${signed(r.bonus)} = ${r.total} vs your AC ${r.ac}`, outcome: r.crit ? 'Critical hit' : r.hit ? 'Hit' : 'Miss', tone: r.hit ? 'bad' : 'good', lines });
    this.log(r.hit ? `The ${m.name} ${atk.verb} for ${dmg}.` : `The ${m.name} misses you.`, r.hit ? 'bad' : '');
    if (dmg) this.hurt(dmg, `the ${m.name}`); else this.out.sound('miss');
    this.after(1.15, () => this.nextTurn());
  }

  breathe(m) {
    const b = m.st.breath;
    const r = saveRoll(this.cls.save, b.dc);
    const d = rollDice(b.dmg);
    const dmg = r.ok ? Math.floor(d.total / 2) : d.total;
    this.out.roll({ title: `The ${m.name} breathes fire`, die: r.nat, sub: `Your save: ${r.nat} ${signed(r.bonus)} = ${r.total} vs DC ${r.dc}`, outcome: r.ok ? 'Saved: half damage' : 'Failed', tone: 'bad', lines: [`${d.text}${r.ok ? ', halved' : ''}: ${dmg} damage`] });
    this.log(`The ${m.name} ${b.verb} for ${dmg}.`, 'bad');
    this.out.sound('growl', true);
    this.hurt(dmg, `the ${m.name}'s fire`);
    this.after(1.3, () => this.nextTurn());
  }

  // ---------- the hero ----------
  hurt(n, cause) {
    if (this.dying || this.over) return;
    this.hero.hp = Math.max(0, this.hero.hp - n);
    this.stats.taken += n;
    this.out.health(this.hero.hp, this.hero.max, this.peaceful, true);
    this.out.sound('hit');
    this.walker.shake = 0.35;
    if (this.hero.hp <= 0) {
      this.dying = true;
      this.queue = [];
      this.out.toast('You fall.', 'danger');
      this.after(1.4, () => this.finish('fell', cause));
    }
  }

  heal(d, label) {
    const before = this.hero.hp;
    this.hero.hp = Math.min(this.hero.max, this.hero.hp + d.total);
    this.out.health(this.hero.hp, this.hero.max, this.peaceful);
    this.out.roll({ title: label, die: null, sub: d.text, outcome: `+${this.hero.hp - before} health`, tone: 'good', lines: [] });
    this.log(`${label}: +${this.hero.hp - before} health.`, 'good');
  }

  // may the hero do something that takes an action now? Says why not.
  canAct() {
    if (this.over || this.dying) return false;
    if (!this.combat) {
      if (performance.now() < this.readyAt) return false;
      return true;
    }
    if (this.turn !== 'hero') { this.out.toast('It is not your turn.'); return false; }
    if (!this.action) { this.out.toast('You have used your action. Press Enter to end your turn.'); return false; }
    return true;
  }
  spendAction() {
    this.readyAt = performance.now() + 450;
    if (this.combat) this.action = false;
  }
  afterAction() {
    this.pushHud();
    if (!this.combat) return;
    if (!this.foes().length) { this.after(0.9, () => this.endCombat('won')); return; }
    this.maybeAutoEnd();
  }

  // the fight starts with the hero's own move
  engage(m) {
    if (this.peaceful) { this.peaceful = false; this.out.health(this.hero.hp, this.hero.max, false); }
    if (!this.combat) this.startCombat(this.pack([m]), true);
    else if (!m.active) this.join([m]);
  }

  inRange(m, range) {
    return range <= 1 ? this.distTo(m) <= 1 && this.reachableFrom(m.i, m.j, m) : this.distTo(m) <= range && this.sees(m);
  }

  attack(m, opt = {}) {
    if (!this.cls || m.dead || !this.canAct()) return false;
    const atk = this.cls.attack;
    if (!this.inRange(m, atk.range)) {
      this.out.toast(atk.range <= 1 ? `The ${m.name} is out of reach.` : `You have no clear shot at the ${m.name}.`);
      return false;
    }
    this.engage(m);
    this.spendAction();
    const r = attackRoll(atk.bonus, m.st.ac, !!opt.advantage);
    const lines = [];
    let total = 0;
    if (r.hit) {
      const d = rollDice(atk.dmg, r.crit); total += d.total; lines.push(d.text);
      if (opt.extra) { const e = rollDice(opt.extra, r.crit); total += e.total; lines.push(`Sneak attack ${e.text}`); }
      if (atk.undead && m.st.undead) { const e = rollDice(atk.undead, r.crit); total += e.total; lines.push(`Against the undead ${e.text}`); }
      lines.push(`${total} damage`);
      if (r.crit) this.stats.crits++;
    }
    const dice = r.rolls.length > 1 ? `${r.rolls.join(' and ')}: ${r.nat}` : `${r.nat}`;
    this.out.roll({ title: `You ${atk.verb} the ${m.name}`, die: r.nat, sub: `${dice} ${signed(r.bonus)} = ${r.total} vs AC ${r.ac}`, outcome: r.crit ? 'Critical hit' : r.hit ? 'Hit' : 'Miss', tone: r.hit ? 'good' : 'bad', lines: lines.length === 2 ? [`${lines[0]} damage`] : lines });
    this.walker.swing = 0.25;
    this.out.sound(r.hit ? 'hit' : 'miss');
    this.log(r.hit ? `You hit the ${m.name} for ${total}.` : `You miss the ${m.name}.`, r.hit ? 'good' : '');
    if (r.hit) this.damage(m, total);
    this.afterAction();
    return true;
  }

  damage(m, n) {
    const res = this.world.damageCreature(m.id, n, m.st.hp);
    m.hp = res.hp;
    this.stats.dealt += n;
    if (!res.defeated) return;
    m.dead = true;
    this.stats.defeated++;
    const xp = byId[m.t].xp || 0;
    this.xp += xp;
    this.out.purse(this.gold, this.xp, this.keys);
    this.out.toast(`The ${m.name} falls. +${xp.toLocaleString()} XP`, 'gold');
    this.log(`The ${m.name} falls.`, 'good');
  }

  // the class's special action; `m` is the creature the hero is aiming at, if any
  special(m) {
    if (!this.cls || this.over || this.dying) return;
    const sp = this.cls.special;
    if (this.hero.uses <= 0) { this.out.toast(`No ${sp.name.toLowerCase()} left. Rest at a fountain or a well.`); return; }
    if (sp.id === 'secondWind' || sp.id === 'cure') {
      if (this.hero.hp >= this.hero.max) { this.out.toast('You are not hurt.'); return; }
      if (this.combat && this.turn !== 'hero') { this.out.toast('It is not your turn.'); return; }
      if (!sp.free) { if (!this.canAct()) return; this.spendAction(); }
      this.heal(rollDice(sp.heal), sp.name);
    } else if (sp.id === 'sneak') {
      if (!m) { this.out.toast('Aim at a creature first.'); return; }
      if (!this.attack(m, { advantage: true, extra: sp.extra })) return;
    } else if (sp.id === 'missile') {
      if (!m) { this.out.toast('Aim at a creature first.'); return; }
      if (!this.canAct()) return;
      if (!this.inRange(m, 20)) { this.out.toast(`You have no clear shot at the ${m.name}.`); return; }
      this.engage(m);
      this.spendAction();
      const d = rollDice(sp.dmg);
      this.out.roll({ title: `Magic missile strikes the ${m.name}`, die: null, sub: 'Three darts that never miss', outcome: `${d.total} damage`, tone: 'good', lines: [d.text] });
      this.out.sound('hit');
      this.log(`Magic missile hits the ${m.name} for ${d.total}.`, 'good');
      this.damage(m, d.total);
    }
    this.hero.uses--;
    this.afterAction();
  }

  // ---------- things the hero uses (the walker's target) ----------
  use(t) {
    if (this.over || this.dying) return;
    const it = t.ref && t.ref.t ? byId[t.ref.t] : null;
    if (t.kind === 'creature') { this.attack(t.mon); return; }
    if (t.kind === 'key') { this.takeKey(t.ref); return; }
    if (t.kind === 'exit') {
      if (!this.cls) { this.out.toast('A run ends here when you play as a hero.'); return; }
      if (this.combat) { this.out.toast('Finish the fight first.'); return; }
      this.finish('escaped');
      return;
    }
    if (t.kind === 'heal') {
      if (this.combat) { this.out.toast('Not while you are fighting.'); return; }
      const hurt = this.hero.hp < this.hero.max, spent = this.cls && this.hero.uses < this.cls.special.uses;
      this.hero.hp = this.hero.max;
      if (this.cls) this.hero.uses = this.cls.special.uses;
      this.out.health(this.hero.hp, this.hero.max, this.peaceful);
      this.out.toast(hurt || spent ? 'Cool water. You feel restored.' : 'Cool water. You were already in good health.');
      this.pushHud();
      return;
    }
    if (t.kind === 'trap') { this.disarm(t.ref); return; }
    // the rest take the hero's action during a fight
    if (this.combat && !this.canAct()) return;
    if (t.kind === 'potion') {
      this.world.consume(t.ref.id);
      this.stats.potions++;
      this.out.sound('coins');
      this.heal(rollDice(POTION), 'You drink a potion');
    } else if (t.kind === 'chest') {
      this.world.openChest(t.ref.id);
      if (it.interact === 'mimic') {
        this.out.toast('The chest bares its teeth. It was a mimic!', 'danger');
        this.out.sound('growl', false);
        if (this.cls) { const d = rollDice(MIMIC_BITE); this.log(`The mimic bites you for ${d.total}.`, 'bad'); this.hurt(d.total, 'a mimic'); }
      } else {
        this.gold += it.gp || 0;
        this.stats.chests++;
        this.out.purse(this.gold, this.xp, this.keys);
        this.out.sound('coins');
        this.out.toast(`You found ${(it.gp || 0).toLocaleString()} gp.`, 'gold');
      }
    }
    this.spendAction();
    this.afterAction();
  }

  takeKey(ob) {
    if (this.world.consumed.has(ob.id)) return;
    this.world.consume(ob.id);
    this.keys++;
    this.out.purse(this.gold, this.xp, this.keys);
    this.out.sound('coins');
    this.out.toast('You pick up a key.', 'gold');
    this.pushHud();
  }

  // may this door be opened now? A locked one takes a key, or a rogue's one try at the lock.
  tryDoor(k, it) {
    if (!it.locked || !this.cls || this.world.unlocked.has(k)) return true;
    if (this.keys > 0) {
      this.keys--;
      this.world.unlocked.add(k);
      this.stats.doors++;
      this.out.purse(this.gold, this.xp, this.keys);
      this.out.toast('The key turns. The door is unlocked.', 'gold');
      this.pushHud();
      return true;
    }
    if (this.cls.lockpick !== null && !this.pickTried.has(k)) {
      this.pickTried.add(k);
      const r = saveRoll(this.cls.lockpick, 14);
      this.out.roll({ title: 'You work at the lock', die: r.nat, sub: `${r.nat} ${signed(r.bonus)} = ${r.total} vs DC ${r.dc}`, outcome: r.ok ? 'The lock opens' : 'The lock holds', tone: r.ok ? 'good' : 'bad', lines: [] });
      if (r.ok) { this.world.unlocked.add(k); this.stats.doors++; return true; }
      this.out.toast('The lock holds. You need a key.');
      return false;
    }
    this.out.toast(this.cls.lockpick !== null ? 'You could not pick this lock. You need a key.' : 'Locked. You need a key.');
    return false;
  }

  // ---------- traps ----------
  trapLive(ob) {
    const tr = byId[ob.t].trap;
    return !!tr && !!this.cls && !this.safe.has(ob.id) && !(tr.once && this.world.sprung.has(ob.id));
  }

  trigger(ob) {
    if (!this.trapLive(ob)) return;
    const tr = byId[ob.t].trap;
    this.world.springTrap(ob.id);
    this.stats.trapsSprung++;
    const r = saveRoll(this.cls.save, tr.dc);
    const d = rollDice(tr.dmg);
    const dmg = r.ok ? (tr.half ? Math.floor(d.total / 2) : 0) : d.total;
    this.out.roll({ title: `${tr.what}!`, die: r.nat, sub: `Your save: ${r.nat} ${signed(r.bonus)} = ${r.total} vs DC ${r.dc}`, outcome: r.ok ? (tr.half ? 'Saved: half damage' : 'Saved: no damage') : 'Failed', tone: r.ok && !dmg ? 'good' : 'bad', lines: dmg ? [`${d.text}${r.ok ? ', halved' : ''}: ${dmg} damage`] : [] });
    this.log(dmg ? `${tr.what}: ${dmg} damage.` : `${tr.what}, and you dodge.`, dmg ? 'bad' : 'good');
    if (dmg) this.hurt(dmg, `a ${byId[ob.t].name.toLowerCase()}`); else this.out.sound('miss');
  }

  disarm(ob) {
    if (!this.trapLive(ob)) return;
    if (this.combat && !this.canAct()) return;
    if (!this.combat && performance.now() < this.readyAt) return;
    this.spendAction();
    const r = saveRoll(this.cls.lockpick !== null ? this.cls.lockpick : 1, 12);
    this.out.roll({ title: `You work on the ${byId[ob.t].name.toLowerCase()}`, die: r.nat, sub: `${r.nat} ${signed(r.bonus)} = ${r.total} vs DC ${r.dc}`, outcome: r.ok ? 'Disarmed' : 'It goes off', tone: r.ok ? 'good' : 'bad', lines: [] });
    if (r.ok) {
      this.safe.add(ob.id);
      this.world.springTrap(ob.id, true);
      this.stats.trapsDisarmed++;
      this.log(`You disarm the ${byId[ob.t].name.toLowerCase()}.`, 'good');
      this.afterAction();
    } else {
      this.after(0.9, () => { this.trigger(ob); this.afterAction(); });
    }
  }

  // ---------- movement, as the walker reports it ----------
  // may the hero cross into another square now?
  canStep() {
    if (this.over || this.dying) return false;
    if (!this.combat) return true;
    if (this.turn === 'hero' && this.moveLeft > 0) return true;
    if (this.turn === 'hero' && performance.now() > this.hintAt) {
      this.hintAt = performance.now() + 3000;
      this.out.toast('No movement left. Press Enter to end your turn.');
    }
    return false;
  }
  // the hero crossed into square (i, j); `grounded` is false while jumping over it
  stepped(i, j, grounded) {
    if (this.combat && this.turn === 'hero') { this.moveLeft--; this.pushHud(); this.maybeAutoEnd(); }
    if (grounded) this.standOn(i, j);
  }
  landed(i, j, drop) {
    const n = this.cls ? fallDice(drop) : 0;
    if (n) {
      const d = rollDice(`${n}d6`);
      this.out.roll({ title: `You fall ${Math.round(drop)} ft`, die: null, sub: 'One d6 for every 10 ft', outcome: `${d.total} damage`, tone: 'bad', lines: [d.text] });
      this.log(`You fall ${Math.round(drop)} ft and take ${d.total}.`, 'bad');
      this.hurt(d.total, 'a fall');
    }
    this.standOn(i, j);
  }
  standOn(i, j) {
    for (const ob of this.state.objectsAt(i, j)) {
      const it = byId[ob.t];
      if (it.key) this.takeKey(ob);
      if (it.trap) this.trigger(ob);
    }
  }

  togglePeaceful() {
    if (!this.cls) return;
    this.peaceful = !this.peaceful;
    if (this.peaceful && this.combat) this.endCombat('fled');
    this.out.toast(this.peaceful ? 'Peaceful: creatures will not attack.' : 'Creatures fight back again.');
    this.out.health(this.hero.hp, this.hero.max, this.peaceful);
  }

  // ---------- the end ----------
  finish(result, cause = '') {
    if (this.over) return;
    this.over = true;
    this.out.end({
      result, cause, cls: this.cls ? this.cls.name : '', classId: this.classId, name: this.state.data.name,
      seconds: Math.round((performance.now() - this.t0) / 1000),
      gold: this.gold, goldTotal: this.totals.gold, xp: this.xp, foesTotal: this.totals.foes, chestsTotal: this.totals.chests,
      hp: this.hero.hp, max: this.hero.max, ...this.stats,
    });
  }
}
