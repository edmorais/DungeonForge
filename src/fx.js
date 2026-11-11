import * as THREE from 'three';

// Short-lived effects for the game in walk mode: bolts that fly, bursts that swell and fade,
// sparks that scatter. All of them are glowing balls taken from one fixed pool, so nothing is
// created or compiled while playing; when the pool is full the oldest effect is reused.
const POOL = 96;
const GRAVITY = 22;

export class Fx {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'fx';
    scene.add(this.group);
    const ball = new THREE.SphereGeometry(1, 10, 8);
    this.items = [];
    for (let k = 0; k < POOL; k++) {
      const m = new THREE.Mesh(ball, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 6;
      this.group.add(m);
      this.items.push({ m, kind: null, age: 0, life: 1, size: 1, glow: 3, vel: new THREE.Vector3(), to: new THREE.Vector3(), then: null, trail: 0, hue: 0 });
    }
    this.next = 0;
  }

  take(kind, at, hue, size, life, glow = 3) {
    let it = this.items.find((x) => !x.kind);
    if (!it) { it = this.items[this.next]; this.next = (this.next + 1) % POOL; }
    it.kind = kind; it.age = 0; it.life = life; it.size = size; it.hue = hue; it.glow = glow; it.then = null; it.trail = 0;
    it.m.position.copy(at);
    it.m.material.color.setHex(hue).multiplyScalar(glow);
    it.m.material.opacity = 1;
    it.m.scale.setScalar(size);
    it.m.visible = true;
    return it;
  }

  // a glowing ball that flies from one point to another, leaving sparks, and may call back on arrival
  bolt(from, to, hue, { speed = 60, size = 0.26, then = null, delay = 0 } = {}) {
    const it = this.take('bolt', from, hue, size, from.distanceTo(to) / speed + delay, 4);
    it.to.copy(to);
    it.vel.subVectors(to, from).normalize().multiplyScalar(speed);
    it.then = then;
    it.age = -delay;
    it.m.visible = delay <= 0;
    return it;
  }

  // a ball of light that swells and fades
  burst(at, hue, { size = 1.4, life = 0.32, glow = 2.5 } = {}) {
    return this.take('burst', at, hue, size, life, glow);
  }

  // small bits thrown outwards that fall and fade
  sparks(at, hue, n = 8, { spread = 5, up = 4, life = 0.6, size = 0.08 } = {}) {
    for (let k = 0; k < n; k++) {
      const it = this.take('spark', at, hue, size * (0.7 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), 3.5);
      it.vel.set((Math.random() - 0.5) * 2 * spread, Math.random() * up + up * 0.3, (Math.random() - 0.5) * 2 * spread);
    }
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.kind) continue;
      it.age += dt;
      if (it.age < 0) continue; // a bolt waiting for its moment
      const m = it.m, f = it.age / it.life;
      if (it.kind === 'bolt') {
        m.visible = true;
        m.position.addScaledVector(it.vel, dt);
        it.trail -= dt;
        if (it.trail <= 0) { it.trail = 0.025; this.take('spark', m.position, it.hue, it.size * 0.55, 0.22, 2).vel.set(0, 0.6, 0); }
        if (f >= 1) {
          const then = it.then;
          m.position.copy(it.to);
          it.kind = null; m.visible = false;
          this.burst(it.to, it.hue, { size: it.size * 4.5, life: 0.26 });
          if (then) then();
        }
        continue;
      }
      if (f >= 1) { it.kind = null; m.visible = false; continue; }
      if (it.kind === 'burst') {
        m.scale.setScalar(it.size * (0.25 + 0.75 * Math.sqrt(f)));
        m.material.opacity = (1 - f) * (1 - f);
      } else {
        it.vel.y -= GRAVITY * dt;
        m.position.addScaledVector(it.vel, dt);
        m.material.opacity = 1 - f;
      }
    }
  }

  clear() {
    for (const it of this.items) { it.kind = null; it.m.visible = false; }
  }
}
