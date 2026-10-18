import * as THREE from 'three';
import { CELL, GRID_W, GRID_D, FLOOR_Y, KEEP_I0, KEEP_J0, KEEP_W, KEEP_D, cellX, cellZ, lineX, lineZ, worldToCell, inGrid } from './config.js';
import { byId } from './catalog.js';
import { parseEdge, footprint, edgeCenter } from './state.js';
import { heldGear } from './models.js';

const R = 0.85; // player radius (ft)
const STEP = 1.7; // tallest ledge you can step up without stairs (ft)
const DAMAGE = { goblin: 2, skeleton: 3, cultist: 3, ooze: 3, orc: 4, wraith: 4, spider: 4, ogre: 6, dragon: 9 };
const EYE = 5.6;

function distPointSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export class Walker {
  constructor({ camera, dom, state, world, env, onPrompt, onToast, onExit, onGold, onSound, onHealth }) {
    Object.assign(this, { camera, dom, state, world, env, onPrompt, onToast, onExit, onGold, onSound: onSound || (() => {}), onHealth: onHealth || (() => {}) });
    this.maxHp = 24;
    this.hp = this.maxHp;
    this.peaceful = false;
    this.cooldowns = new Map();
    this.gear = heldGear();
    this.gear.visible = false;
    camera.add(this.gear);
    this.gearTorch = this.gear.getObjectByName('torch');
    this.gearSword = this.gear.getObjectByName('sword');
    this.swordRest = this.gearSword.rotation.clone();
    this.active = false;
    this.yaw = 0;
    this.pitch = 0;
    this.pos = new THREE.Vector3();
    this.vy = 0;
    this.keys = new Set();
    this.gold = 0;
    this.bob = 0;
    this.target = null;
    this.dragging = false;
    this.handLight = new THREE.PointLight(0xffb070, 0, 26, 2);
    this.handOn = true;
    camera.parent?.add?.(this.handLight);

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.dom && this.active && this.lockedOnce) this.exit();
    });
    dom.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      const locked = document.pointerLockElement === this.dom;
      if (!locked && !this.dragging) return;
      // Chrome can report one huge delta right after pointer lock engages
      if (Math.abs(e.movementX) > 160 || Math.abs(e.movementY) > 160) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    dom.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      if (document.pointerLockElement !== this.dom) {
        this.dragging = true;
        this.requestLock();
      } else if (e.button === 0) this.interact();
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); this.interact(); }
      if (e.code === 'KeyF') { this.handOn = !this.handOn; this.onToast(this.handOn ? 'Torch lit.' : 'Torch doused.'); }
      if (e.code === 'KeyP') { this.peaceful = !this.peaceful; this.onToast(this.peaceful ? 'Peaceful: creatures will not attack.' : 'Creatures fight back again.'); this.onHealth(this.hp, this.maxHp, this.peaceful); }
      if (e.code === 'Escape') this.exit();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  requestLock() {
    try {
      const p = this.dom.requestPointerLock?.();
      if (p && p.catch) p.then(() => { this.lockedOnce = true; }).catch(() => {});
      else this.lockedOnce = true;
    } catch { /* drag-look fallback */ }
  }

  spawnPoint() {
    const d = this.state.data;
    // in front of the keep's entrance if present
    if (this.state.hasKeep()) {
      const i = KEEP_I0 + KEEP_W / 2, j = KEEP_J0 + KEEP_D;
      const sp = { x: cellX(i) - 1.5, z: lineZ(j) + 9, yaw: 0 };
      if (!this.collides(sp.x, sp.z)) return sp;
    }
    // otherwise nearest open floor to centre, or the centre
    let best = null, bd = Infinity;
    for (const k in d.floors) {
      const [i, j] = k.split(',').map(Number);
      if (this.cellSolid(i, j)) continue;
      const dd = Math.hypot(cellX(i), cellZ(j) - 20);
      if (dd < bd) { bd = dd; best = [i, j]; }
    }
    if (best) return { x: cellX(best[0]), z: cellZ(best[1]), yaw: 0 };
    return { x: 0, z: lineZ(GRID_D) + 6, yaw: 0 };
  }

  enter(from) {
    this.voidEdges = this.env.styleId === 'void' && Object.keys(this.state.data.floors).length > 0;
    this.active = true;
    this.lockedOnce = false;
    const sp = from || this.spawnPoint();
    this.pos.set(sp.x, 0, sp.z);
    this.yaw = sp.yaw ?? 0;
    this.pitch = 0;
    this.gold = 0;
    this.xp = 0;
    this.noticed = new Set();
    this.hp = this.maxHp;
    this.cooldowns.clear();
    this.onGold(0, 0);
    this.onHealth(this.hp, this.maxHp, this.peaceful);
    this.gear.visible = true;
    this.world.resetRuntime();
    this.camera.fov = 72;
    this.camera.near = 0.15;
    this.camera.updateProjectionMatrix();
    this.requestLock();
    this.groundY = this.floorHeight(this.pos.x, this.pos.z);
    this.fallFrom = null;
    this.fallV = 0;
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.world.lookAt = null;
    this.keys.clear();
    this.handLight.intensity = 0;
    this.gear.visible = false;
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
    this.onPrompt(null);
    this.world.resetRuntime();
    this.onExit();
  }

  cellSolid(i, j) {
    if (!inGrid(i, j)) return false;
    const f = this.state.floorAt(i, j);
    // in the void there is nothing under a square without a floor
    if (!f && this.voidEdges) return true;
    if (f && (byId[f].pit || f === 'lava')) return true;
    return this.world.cellBlocks(i, j);
  }

  floorHeight(x, z) {
    const [i, j] = worldToCell(x, z);
    if (inGrid(i, j)) {
      const ramp = this.world.stairHeight(x, z);
      if (ramp !== null) return ramp;
      const base = this.state.topAt(i, j);
      const f = this.state.floorAt(i, j);
      if (f === 'water') return base - 0.9;
      return base + (f ? FLOOR_Y : 0);
    }
    return Math.max(this.env.heightAt(x, z), -0.5);
  }

  // Can the player step from where they stand to (x, z)? Ledges taller than a stair step need stairs.
  climbBlocked(x, z, dx, dz) {
    const here = this.floorHeight(this.pos.x, this.pos.z);
    const lx = x + Math.sign(dx) * R * 0.9, lz = z + Math.sign(dz) * R * 0.9;
    // on a flight of stairs the slope is steady, so judge by the very next stride instead of the look-ahead
    if (this.world.stairHeight(lx, lz) !== null || this.world.stairHeight(x, z) !== null) return this.floorHeight(x, z) - here > STEP + Math.hypot(dx, dz);
    return this.floorHeight(lx, lz) - here > STEP;
  }

  collides(x, z) {
    const [ci, cj] = worldToCell(x, z);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      // edges around cell (i,j): north h(i,j) and west v(i,j); neighbours cover the rest
      if (this.world.edgeBlocks('h', i, j)) {
        if (distPointSeg(x, z, lineX(i) - 0.3, lineZ(j), lineX(i + 1) + 0.3, lineZ(j)) < R + 0.3) return true;
      }
      if (this.world.edgeBlocks('v', i, j)) {
        if (distPointSeg(x, z, lineX(i), lineZ(j) - 0.3, lineX(i), lineZ(j + 1) + 0.3) < R + 0.3) return true;
      }
      if (this.cellSolid(i, j)) {
        const x0 = lineX(i) + 0.35, x1 = lineX(i + 1) - 0.35, z0 = lineZ(j) + 0.35, z1 = lineZ(j + 1) - 0.35;
        const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
        if (Math.hypot(dx, dz) < R) return true;
      }
    }
    // door jambs: treat posts at vertices of door edges as solid
    return false;
  }

  findTarget() {
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    let best = null, bs = Infinity;
    const consider = (kind, ref, x, z, label, reach = 0) => {
      const dx = x - this.pos.x, dz = z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 6.5 + reach || d < 0.01) return;
      const cos = (dx * fwd.x + dz * fwd.z) / d;
      if (cos < 0.55) return;
      const score = d * (2 - cos);
      if (score < bs) { bs = score; best = { kind, ref, label }; }
    };
    const [ci, cj] = worldToCell(this.pos.x, this.pos.z);
    for (let i = ci - 4; i <= ci + 4; i++) for (let j = cj - 4; j <= cj + 4; j++) {
      for (const o of ['h', 'v']) {
        const e = this.state.edgeRaw(o, i, j);
        if (!e || e.t === 'cover' || !byId[e.t].door) continue;
        const k = `${o}:${i}:${j}`;
        const span = e.span || 1;
        const [x, z] = edgeCenter(o, i, j, span);
        const open = this.world.isDoorOpen(k);
        const nm = byId[e.t].secret ? 'the loose stone' : byId[e.t].name.toLowerCase();
        consider('door', k, x, z, `${open ? 'Close' : 'Open'} ${nm}`, (span - 1) * 1.5);
      }
      for (const ob of this.state.objectsAt(i, j)) {
        const it = byId[ob.t];
        if (ob.i !== i || ob.j !== j) continue;
        if (it.cat === 'creature') {
          if (this.world.defeated.has(ob.id)) continue;
          const [w, d] = footprint(ob.t, ob.r);
          const cx = lineX(ob.i) + (w * CELL) / 2, cz = lineZ(ob.j) + (d * CELL) / 2;
          consider('creature', ob, cx, cz, `Attack the ${it.name.toLowerCase()}`, (w - 1) * 1.5 + 1);
          continue;
        }
        if ((ob.t === 'fountain' || ob.t === 'well')) {
          const [w, d] = footprint(ob.t, ob.r);
          consider('heal', ob, lineX(ob.i) + (w * CELL) / 2, lineZ(ob.j) + (d * CELL) / 2, `Drink from the ${it.name.toLowerCase()}`, (w - 1) * 1.5 + 0.5);
          continue;
        }
        if (ob.t === 'potions' && !this.world.consumed.has(ob.id)) {
          consider('potion', ob, cellX(ob.i), cellZ(ob.j), 'Drink a potion');
          continue;
        }
        if (!it.interact) continue;
        if (this.world.openChests.has(ob.id)) continue;
        const [w, d] = footprint(ob.t, ob.r);
        consider('chest', ob, lineX(ob.i) + (w * CELL) / 2, lineZ(ob.j) + (d * CELL) / 2, `Open ${it.name.toLowerCase().replace('mimic', 'chest')}`);
      }
    }
    return best;
  }

  interact() {
    const t = this.target;
    if (!t) return;
    if (t.kind === 'door') {
      // don't close a door on yourself
      const { o, i, j } = parseEdge(t.ref);
      if (this.world.isDoorOpen(t.ref)) {
        const span = this.state.edgeRaw(o, i, j)?.span || 1;
        const [x, z] = edgeCenter(o, i, j, span);
        const along = o === 'h' ? Math.abs(this.pos.x - x) : Math.abs(this.pos.z - z);
        const across = o === 'h' ? Math.abs(this.pos.z - z) : Math.abs(this.pos.x - x);
        if (across < 2.2 && along < (span * CELL) / 2 + 0.5) { this.onToast('Step out of the doorway first.'); return; }
      }
      this.world.toggleDoor(t.ref);
      this.onSound('door', this.world.isDoorOpen(t.ref));
    } else if (t.kind === 'creature') {
      const it = byId[t.ref.t];
      const nm = it.name.toLowerCase();
      const r = this.world.hitCreature(t.ref.id, t.ref.t);
      this.onSound('hit');
      if (r.defeated) {
        this.xp += it.xp || 0;
        this.onGold(this.gold, this.xp);
        this.onToast(`The ${nm} falls. +${(it.xp || 0).toLocaleString()} XP`, 'gold');
      } else {
        const lines = [`You strike the ${nm}.`, `The ${nm} staggers.`, `A solid hit on the ${nm}.`, `The ${nm} reels back.`];
        this.onToast(`${lines[(this.swings = (this.swings || 0) + 1) % lines.length]} ${r.hpLeft} more ${r.hpLeft === 1 ? 'blow' : 'blows'} should do it.`);
      }
      this.swing = 0.25;
    } else if (t.kind === 'heal') {
      const before = this.hp;
      this.hp = this.maxHp;
      this.onHealth(this.hp, this.maxHp, this.peaceful);
      this.onToast(before < this.maxHp ? 'Cool water. You feel restored.' : 'Cool water. You were already in good health.');
    } else if (t.kind === 'potion') {
      this.world.consume(t.ref.id);
      this.hp = Math.min(this.maxHp, this.hp + 12);
      this.onHealth(this.hp, this.maxHp, this.peaceful);
      this.onSound('coins');
      this.onToast('You drink a potion. +12 health.', 'gold');
    } else if (t.kind === 'chest') {
      const it = byId[t.ref.t];
      this.world.openChest(t.ref.id);
      if (it.interact === 'mimic') {
        this.onToast('The chest bares its teeth. It was a mimic!', 'danger');
        this.onSound('growl', false);
        this.shake = 0.6;
      } else {
        this.gold += it.gp || 0;
        this.onGold(this.gold, this.xp);
        this.onSound('coins');
        this.onToast(`You found ${(it.gp || 0).toLocaleString()} gp.`, 'gold');
      }
    }
  }

  update(dt) {
    if (!this.active) return;
    const k = this.keys;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const mv = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) mv.add(fwd);
    if (k.has('KeyS') || k.has('ArrowDown')) mv.sub(fwd);
    if (k.has('KeyD') || k.has('ArrowRight')) mv.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) mv.sub(right);
    if (k.has('KeyQ')) this.yaw += dt * 2;
    const [ci, cj] = worldToCell(this.pos.x, this.pos.z);
    const inWater = inGrid(ci, cj) && this.state.floorAt(ci, cj) === 'water';
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 20 : 11) * (inWater ? 0.5 : 1);
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(speed * dt);
      const nx = this.pos.x + mv.x;
      if (!this.collides(nx, this.pos.z) && !this.climbBlocked(nx, this.pos.z, mv.x, 0)) this.pos.x = nx;
      const nz = this.pos.z + mv.z;
      if (!this.collides(this.pos.x, nz) && !this.climbBlocked(this.pos.x, nz, 0, mv.z)) this.pos.z = nz;
      this.bob += dt * speed * 0.9;
    }
    const [bx, bz] = this.env.walkBounds();
    this.pos.x = Math.max(-bx, Math.min(bx, this.pos.x));
    this.pos.z = Math.max(-bz, Math.min(bz, this.pos.z));
    const gy = this.floorHeight(this.pos.x, this.pos.z);
    if (gy < this.groundY - STEP) {
      // falling: accelerate, and land hard from more than 9 ft
      if (this.fallFrom === null) this.fallFrom = this.groundY;
      this.fallV = (this.fallV || 0) + 64 * dt;
      this.groundY = Math.max(gy, this.groundY - this.fallV * dt);
    } else {
      if (this.fallFrom !== null && this.fallFrom !== undefined) this.land(this.fallFrom - gy);
      this.fallFrom = null;
      this.fallV = 0;
      this.groundY += (gy - this.groundY) * Math.min(1, dt * 10);
    }
    const bobY = Math.sin(this.bob) * 0.12;
    this.camera.position.set(this.pos.x, this.groundY + EYE + bobY, this.pos.z);
    let shakeX = 0;
    if (this.shake > 0) { this.shake -= dt; shakeX = Math.sin(this.shake * 60) * this.shake * 0.08; }
    this.camera.rotation.set(this.pitch, this.yaw + shakeX, 0, 'YXZ');

    this.handLight.position.copy(this.camera.position).addScaledVector(fwd, 0.9).add(new THREE.Vector3(0, -0.1, 0)).addScaledVector(right, -0.5);
    const want = this.handOn ? 10 * (1 + Math.sin(performance.now() / 90) * 0.04) : 0;
    this.handLight.intensity = want;

    this.world.lookAt = this.pos;
    this.noticeTimer = (this.noticeTimer || 0) - dt;
    if (this.noticeTimer <= 0) {
      this.noticeTimer = 0.5;
      for (const ob of this.state.data.objects) {
        const it = byId[ob.t];
        if (it.cat !== 'creature' || this.noticed.has(ob.id) || this.world.defeated.has(ob.id)) continue;
        const [w, d] = footprint(ob.t, ob.r);
        const cx = lineX(ob.i) + (w * CELL) / 2, cz = lineZ(ob.j) + (d * CELL) / 2;
        if (Math.hypot(cx - this.pos.x, cz - this.pos.z) < 18 + w * 1.5) {
          this.noticed.add(ob.id);
          const cries = { skeleton: 'bones rattle as the skeleton turns toward you', goblin: 'a goblin hisses and grips its knife', orc: 'an orc bellows a challenge', cultist: 'a cultist begins to chant', wraith: 'the air goes cold; a wraith drifts closer', ooze: 'something wet shivers in the dark', spider: 'eight legs tap across the stone', ogre: 'an ogre grunts and lifts its club', dragon: 'the dragon opens one burning eye' };
          const msg = cries[ob.t] || `a ${it.name.toLowerCase()} sees you`;
          this.onToast(msg.charAt(0).toUpperCase() + msg.slice(1) + '.', ob.t === 'dragon' ? 'danger' : '');
          if (ob.t === 'dragon') this.shake = 0.5;
          this.onSound('growl', ['dragon', 'ogre'].includes(ob.t));
          break;
        }
      }
    }
    this.creaturesAttack(dt);
    this.animateGear(dt);
    const t = this.findTarget();
    this.target = t;
    this.onPrompt(t ? t.label : null, t ? t.kind : null);
  }

  land(drop) {
    if (drop > 9.5) {
      const dmg = Math.max(1, Math.round(drop / 3) - 2);
      this.hp = Math.max(1, this.hp - dmg);
      this.shake = 0.4;
      this.onSound('hit');
      this.onHealth(this.hp, this.maxHp, this.peaceful, true);
      this.onToast(`You drop ${Math.round(drop)} ft and land hard (−${dmg}).`, 'danger');
    } else if (drop > 2.5) this.shake = 0.15;
  }

  creaturesAttack(dt) {
    if (this.peaceful || this.hp <= 0) return;
    const now = performance.now() / 1000;
    for (const ob of this.state.data.objects) {
      const it = byId[ob.t];
      if (it.cat !== 'creature' || !this.noticed.has(ob.id) || this.world.defeated.has(ob.id)) continue;
      const [w, d] = footprint(ob.t, ob.r);
      const cx = lineX(ob.i) + (w * CELL) / 2, cz = lineZ(ob.j) + (d * CELL) / 2;
      const reach = (w * CELL) / 2 + (ob.t === 'dragon' ? 6 : ob.t === 'cultist' ? 9 : 2.8);
      if (Math.hypot(cx - this.pos.x, cz - this.pos.z) > reach) continue;
      const next = this.cooldowns.get(ob.id) ?? now + 0.9; // a moment to react
      if (!this.cooldowns.has(ob.id)) { this.cooldowns.set(ob.id, next); continue; }
      if (now < next) continue;
      this.cooldowns.set(ob.id, now + 1.4 + Math.random() * 1.2);
      const dmg = DAMAGE[ob.t] || 3;
      this.hp = Math.max(0, this.hp - dmg);
      this.shake = 0.35;
      this.onSound('hit');
      this.onHealth(this.hp, this.maxHp, this.peaceful, true);
      const verbs = { cultist: 'hurls witchfire at you', dragon: 'breathes fire over you', wraith: 'drains your warmth', ooze: 'burns you with acid', spider: 'bites you', ogre: 'clubs you', goblin: 'stabs you', orc: 'cleaves at you', skeleton: 'slashes you' };
      if (this.hp <= 0) {
        this.onToast(`The ${it.name.toLowerCase()} ${verbs[ob.t] || 'hits you'}. You fall… and wake at the entrance.`, 'danger');
        const sp = this.spawnPoint();
        this.pos.set(sp.x, 0, sp.z);
        this.yaw = sp.yaw ?? 0;
        this.groundY = this.floorHeight(sp.x, sp.z);
        this.fallFrom = null;
        this.hp = this.maxHp;
        this.cooldowns.clear();
        this.noticed.clear();
        this.onHealth(this.hp, this.maxHp, this.peaceful);
      } else {
        this.onToast(`The ${it.name.toLowerCase()} ${verbs[ob.t] || 'hits you'} (−${dmg}).`, 'danger');
      }
      break;
    }
  }

  animateGear(dt) {
    const t = performance.now() / 1000;
    this.gearTorch.visible = this.handOn;
    const sway = Math.sin(this.bob) * 0.02;
    this.gear.position.set(sway, Math.abs(Math.cos(this.bob)) * 0.015, 0);
    if (this.swing > 0) this.swing -= dt;
    const s = Math.max(0, this.swing || 0) / 0.25;
    const arc = Math.sin(s * Math.PI);
    this.gearSword.rotation.set(this.swordRest.x - arc * 1.3, this.swordRest.y - arc * 0.4, this.swordRest.z + arc * 0.9);
    this.gearTorch.children.forEach((c) => { if (c.userData.flame) { const k = 1 + Math.sin(t * 13) * 0.1; c.scale.set(1, k, 1); } });
  }
}

export { GRID_W };
