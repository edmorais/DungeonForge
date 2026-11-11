import * as THREE from 'three';
import { CELL, GRID_D, FLOOR_Y, KEEP_I0, KEEP_J0, KEEP_W, KEEP_D, cellX, cellZ, lineX, lineZ, worldToCell, inGrid } from './config.js';
import { byId } from './catalog.js';
import { parseEdge, footprint, edgeCenter } from './state.js';
import { heldGear } from './models.js';

// First-person walk mode: movement, jumping, collision, what the walker is aiming at, and input
// from keyboard and mouse, a gamepad, or touch. The rules of the game (turns, dice, traps, keys)
// live in game.js; this file asks it before every step and hands it everything the walker uses.

const R = 0.85; // player radius (ft)
const STEP = 1.7; // tallest ledge you can step up without stairs (ft)
const EYE = 5.6;
const GRAVITY = 64; // ft/s²
const JUMP = 19; // take-off speed: a jump of about 2.8 ft, enough to gain one 3 ft level
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function distPointSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export class Walker {
  constructor({ camera, dom, state, world, env, game, onPrompt, onToast, onExit, onSound }) {
    Object.assign(this, { camera, dom, state, world, env, game, onPrompt, onToast, onExit, onSound: onSound || (() => {}) });
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
    this.y = 0; // height of the walker's feet
    this.vy = 0;
    this.onGround = true;
    this.keys = new Set();
    this.stick = { x: 0, y: 0 }; // on-screen stick (touch)
    this.pad = { x: 0, y: 0, run: false }; // gamepad left stick
    this.padWas = [];
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
      this.look(e.movementX * 0.0022, e.movementY * 0.0022);
    });
    dom.addEventListener('mousedown', (e) => {
      if (!this.active || this.touching) return;
      if (document.pointerLockElement !== this.dom) {
        this.dragging = true;
        this.requestLock();
      } else if (e.button === 0) this.act();
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    // touch: drag anywhere on the view to look around (the stick and buttons are in the HUD)
    const touches = new Map();
    dom.addEventListener('pointerdown', (e) => {
      if (!this.active || e.pointerType !== 'touch') return;
      this.touching = true;
      touches.set(e.pointerId, [e.clientX, e.clientY]);
    });
    dom.addEventListener('pointermove', (e) => {
      const last = touches.get(e.pointerId);
      if (!this.active || !last) return;
      this.look((e.clientX - last[0]) * 0.006, (e.clientY - last[1]) * 0.006);
      touches.set(e.pointerId, [e.clientX, e.clientY]);
    });
    for (const ev of ['pointerup', 'pointercancel']) dom.addEventListener(ev, (e) => touches.delete(e.pointerId));
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      this.keys.add(e.code);
      switch (e.code) {
        case 'KeyE': e.preventDefault(); this.act(); break;
        case 'Space': e.preventDefault(); this.jump(); break;
        case 'KeyR': this.special(); break;
        case 'Enter': case 'KeyT': e.preventDefault(); this.endTurn(); break;
        case 'KeyF': this.toggleTorch(); break;
        case 'KeyP': this.game.togglePeaceful(); break;
        case 'Escape': this.exit(); break;
        default:
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  // ---------- what every kind of input ends up calling ----------
  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch - dy, -1.45, 1.45);
  }
  setStick(x, y) { this.stick.x = x; this.stick.y = y; }
  act() { if (this.active) this.interact(); }
  jump() { if (this.active) this.wantJump = true; }
  special() { if (this.active) this.game.special(this.target && this.target.kind === 'creature' ? this.target.mon : null); }
  endTurn() { if (this.active) this.game.endTurn(); }
  toggleTorch() {
    this.handOn = !this.handOn;
    this.onToast(this.handOn ? 'Torch lit.' : 'Torch doused.');
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
    // on the map's Start piece, facing the way it points
    const start = d.objects.find((o) => byId[o.t].start);
    if (start) return { x: cellX(start.i), z: cellZ(start.j), yaw: start.r * (Math.PI / 2) };
    // in front of the keep's entrance if present
    if (this.state.hasKeep()) {
      const i = KEEP_I0 + KEEP_W / 2, j = KEEP_J0 + KEEP_D;
      const sp = { x: cellX(i) - 1.5, z: lineZ(j) + 9, yaw: 0 };
      if (!this.collides(sp.x, sp.z)) return sp;
    }
    // otherwise an open floor near the centre, but not within a few strides of a creature,
    // so a walk does not open in the middle of a fight
    let best = null, bd = Infinity;
    for (const k in d.floors) {
      const [i, j] = k.split(',').map(Number);
      if (this.cellSolid(i, j)) continue;
      let clear = 12;
      for (const ob of this.world.creatures) clear = Math.min(clear, Math.max(Math.abs(ob.i - i), Math.abs(ob.j - j)));
      const dd = Math.hypot(cellX(i), cellZ(j) - 20) + (12 - clear) * 60;
      if (dd < bd) { bd = dd; best = [i, j]; }
    }
    if (best) return { x: cellX(best[0]), z: cellZ(best[1]), yaw: 0 };
    return { x: 0, z: lineZ(GRID_D) + 6, yaw: 0 };
  }

  // classId: one of the hero classes, or null to just look around
  enter(classId = null) {
    this.voidEdges = this.env.styleId === 'void' && Object.keys(this.state.data.floors).length > 0;
    this.active = true;
    this.lockedOnce = false;
    this.touching = false;
    this.world.resetRuntime();
    const sp = this.spawnPoint();
    this.pos.set(sp.x, 0, sp.z);
    this.yaw = sp.yaw ?? 0;
    this.pitch = 0;
    this.keys.clear();
    this.stick.x = this.stick.y = 0;
    this.gear.visible = true;
    this.camera.fov = 72;
    this.camera.near = 0.15;
    this.camera.updateProjectionMatrix();
    this.requestLock();
    this.y = this.floorHeight(this.pos.x, this.pos.z);
    this.vy = 0;
    this.onGround = true;
    this.wantJump = false;
    this.shake = 0;
    [this.ci, this.cj] = worldToCell(this.pos.x, this.pos.z);
    this.game.start(classId, this);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.game.stop();
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

  // Can the walker get from where they are to (x, z)? Ledges taller than a stair step need
  // stairs, or a jump: in the air the ledge is judged against how high the feet are.
  climbBlocked(x, z, dx, dz) {
    const here = this.onGround ? this.floorHeight(this.pos.x, this.pos.z) : this.y;
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
    return false;
  }

  // the one thing the walker is aiming at and could act on: { kind, ref, label, sub, mon }
  findTarget() {
    const g = this.game;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let best = null, bs = Infinity;
    const consider = (kind, ref, x, z, label, reach = 0, more = null) => {
      const dx = x - this.pos.x, dz = z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 6.5 + reach || d < 0.01) return;
      const cos = (dx * fx + dz * fz) / d;
      if (cos < 0.55) return;
      const score = d * (2 - cos);
      if (score < bs) { bs = score; best = { kind, ref, label, ...more }; }
    };
    // creatures: anything the hero's attack can reach, when the view points at it
    if (g.cls) {
      const range = Math.max(6.5, g.cls.attack.range * CELL + 1.5);
      for (const m of g.mons.values()) {
        if (m.dead) continue;
        const p = this.world.creatureXZ(m.id);
        if (!p) continue;
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        const ahead = dx * fx + dz * fz;
        if (d > range + m.w * 1.5 || ahead <= 0) continue;
        // how far the view line passes from the creature's middle; nothing behind a wall is offered
        if (Math.abs(dx * fz - dz * fx) > m.w * 1.5 + 0.6 + d * 0.03 || !g.sees(m)) continue;
        const score = d * (2 - ahead / d) * 0.8;
        if (score < bs) { bs = score; best = { kind: 'creature', ref: m, mon: m, label: `Attack the ${m.name}`, sub: g.describe(m) }; }
      }
    }
    const [ci, cj] = worldToCell(this.pos.x, this.pos.z);
    for (let i = ci - 4; i <= ci + 4; i++) for (let j = cj - 4; j <= cj + 4; j++) {
      for (const o of ['h', 'v']) {
        const e = this.state.edgeRaw(o, i, j);
        if (!e || e.t === 'cover' || !byId[e.t].door) continue;
        const k = `${o}:${i}:${j}`;
        const span = e.span || 1;
        const [x, z] = edgeCenter(o, i, j, span);
        const open = this.world.isDoorOpen(k);
        const it = byId[e.t];
        const nm = it.secret ? 'the loose stone' : `the ${it.name.toLowerCase()}`;
        const locked = it.locked && g.cls && !this.world.unlocked.has(k);
        consider('door', k, x, z, `${open ? 'Close' : locked ? 'Unlock' : 'Open'} ${nm}`, (span - 1) * 1.5, locked ? { sub: g.keys ? 'Uses one key' : 'Needs a key' } : null);
      }
      for (const ob of this.state.objectsAt(i, j)) {
        const it = byId[ob.t];
        if (ob.i !== i || ob.j !== j || it.cat === 'creature') continue;
        const [w, d] = footprint(ob.t, ob.r);
        const x = lineX(ob.i) + (w * CELL) / 2, z = lineZ(ob.j) + (d * CELL) / 2;
        const nm = it.name.toLowerCase();
        if (ob.t === 'fountain' || ob.t === 'well') consider('heal', ob, x, z, `Drink from the ${nm}`, (w - 1) * 1.5 + 0.5);
        else if (ob.t === 'potions') { if (!this.world.consumed.has(ob.id)) consider('potion', ob, x, z, 'Drink a potion'); }
        else if (it.key) { if (!this.world.consumed.has(ob.id)) consider('key', ob, x, z, 'Take the key'); }
        else if (it.exit) consider('exit', ob, x, z, 'Leave the dungeon');
        else if (it.trap) {
          // a trap you know about and are not standing on can be made safe
          if (g.trapLive(ob) && (!it.trap.hidden || this.world.spotted.has(ob.id)) && (i !== ci || j !== cj)) consider('trap', ob, x, z, `Disarm the ${nm}`, 0, { sub: 'Or jump over it' });
        } else if (it.interact && !this.world.openChests.has(ob.id)) consider('chest', ob, x, z, `Open ${nm.replace('mimic', 'chest')}`);
      }
    }
    return best;
  }

  interact() {
    const t = this.target;
    if (!t) return;
    if (t.kind !== 'door') { this.game.use(t); return; }
    const { o, i, j } = parseEdge(t.ref);
    const e = this.state.edgeRaw(o, i, j);
    if (this.world.isDoorOpen(t.ref)) {
      // don't close a door on yourself
      const span = e?.span || 1;
      const [x, z] = edgeCenter(o, i, j, span);
      const along = o === 'h' ? Math.abs(this.pos.x - x) : Math.abs(this.pos.z - z);
      const across = o === 'h' ? Math.abs(this.pos.z - z) : Math.abs(this.pos.x - x);
      if (across < 2.2 && along < (span * CELL) / 2 + 0.5) { this.onToast('Step out of the doorway first.'); return; }
    } else if (!this.game.tryDoor(t.ref, byId[e.t])) return;
    this.world.toggleDoor(t.ref);
    this.onSound('door', this.world.isDoorOpen(t.ref));
  }

  // a connected gamepad: left stick moves, right stick looks, buttons act
  pollPad(dt) {
    this.pad.x = this.pad.y = 0;
    this.pad.run = false;
    let gp = null;
    try { for (const p of navigator.getGamepads ? navigator.getGamepads() : []) if (p && p.connected && (!gp || p.mapping === 'standard')) gp = p; } catch { return; }
    if (!gp) { this.padWas = []; return; }
    const dead = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    this.pad.x = dead(gp.axes[0] || 0);
    this.pad.y = dead(gp.axes[1] || 0);
    this.look(dead(gp.axes[2] || 0) * 2.6 * dt, dead(gp.axes[3] || 0) * 1.8 * dt);
    const down = gp.buttons.map((b) => b.pressed);
    const hit = (k) => down[k] && !this.padWas[k];
    if (!this.padSeen) { this.padSeen = true; this.onToast('Gamepad: A jump · X or RT act · Y special · B end turn · LB torch · Start leaves.'); }
    if (hit(0)) this.jump();
    if (hit(2) || hit(7)) this.act();
    if (hit(3)) this.special();
    if (hit(1)) this.endTurn();
    if (hit(4)) this.toggleTorch();
    if (hit(9)) { this.padWas = down; this.exit(); return; }
    this.pad.run = !!down[6] || !!down[10];
    this.padWas = down;
  }

  update(dt) {
    if (!this.active) return;
    this.pollPad(dt);
    if (!this.active) return; // the gamepad's Start button left walk mode
    const g = this.game;
    const k = this.keys;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    // how hard the walker pushes forward and sideways, from keys, the touch stick and the gamepad
    let ahead = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.stick.y - this.pad.y;
    let side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.stick.x + this.pad.x;
    const push = Math.min(1, Math.hypot(ahead, side));
    const mv = new THREE.Vector3().addScaledVector(fwd, ahead).addScaledVector(right, side);
    const inWater = inGrid(this.ci, this.cj) && this.state.floorAt(this.ci, this.cj) === 'water';
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') || this.pad.run ? 20 : 11) * (inWater ? 0.5 : 1) * push;
    if (push > 0.01 && !g.over && !g.dying) {
      mv.normalize().multiplyScalar(speed * dt);
      this.tryMove(this.pos.x + mv.x, this.pos.z, mv.x, 0);
      this.tryMove(this.pos.x, this.pos.z + mv.z, 0, mv.z);
      if (this.onGround) this.bob += dt * speed * 0.9;
    }
    const [bx, bz] = this.env.walkBounds();
    this.pos.x = clamp(this.pos.x, -bx, bx);
    this.pos.z = clamp(this.pos.z, -bz, bz);

    // feet: follow the floor, jump, fall
    const floor = this.floorHeight(this.pos.x, this.pos.z);
    if (this.onGround) {
      if (floor < this.y - STEP) { this.onGround = false; this.vy = 0; this.peak = this.y; }
      else this.y += (floor - this.y) * Math.min(1, dt * 10);
    }
    if (this.wantJump && this.onGround && !g.over && !g.dying) { this.onGround = false; this.vy = JUMP; this.peak = this.y; }
    this.wantJump = false;
    if (!this.onGround) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      this.peak = Math.max(this.peak, this.y);
      if (this.y <= floor && this.vy <= 0) {
        const drop = this.peak - floor;
        this.y = floor; this.vy = 0; this.onGround = true;
        if (drop > 2.2) this.shake = Math.max(this.shake, 0.15);
        g.landed(this.ci, this.cj, drop);
      }
    }
    const bobY = Math.sin(this.bob) * 0.12;
    this.camera.position.set(this.pos.x, this.y + EYE + bobY, this.pos.z);
    let shakeX = 0;
    if (this.shake > 0) { this.shake -= dt; shakeX = Math.sin(this.shake * 60) * this.shake * 0.08; }
    this.camera.rotation.set(this.pitch, this.yaw + shakeX, 0, 'YXZ');

    this.handLight.position.copy(this.camera.position).addScaledVector(fwd, 0.9).add(new THREE.Vector3(0, -0.1, 0)).addScaledVector(right, -0.5);
    this.handLight.intensity = this.handOn ? 10 * (1 + Math.sin(performance.now() / 90) * 0.04) : 0;

    this.world.lookAt = this.pos;
    g.update(dt);
    if (!this.active) return; // the game ended the run
    this.animateGear(dt);
    const t = g.over || g.dying ? null : this.findTarget();
    this.target = t;
    this.onPrompt(t ? t.label : null, t ? t.kind : null, t ? t.sub : null);
  }

  // one axis of a step; the game may refuse a step into another square (no movement left this turn)
  tryMove(nx, nz, dx, dz) {
    if (this.collides(nx, nz) || this.climbBlocked(nx, nz, dx, dz)) return;
    const [ni, nj] = worldToCell(nx, nz);
    const crossed = ni !== this.ci || nj !== this.cj;
    if (crossed && !this.game.canStep()) return;
    this.pos.x = nx; this.pos.z = nz;
    if (crossed) { this.ci = ni; this.cj = nj; this.game.stepped(ni, nj, this.onGround); }
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
