import * as THREE from 'three';

// A fixed pool of point lights reassigned to the nearest light sources.
// Constant light count means shaders never recompile as the dungeon grows.
export class LightPool {
  constructor(scene, count = 14, shadowCount = 4) {
    this.scene = scene;
    this.build(count, shadowCount);
    this.timer = 0;
    this.master = 1;
  }

  build(count, shadowCount) {
    const scene = this.scene;
    for (const L of this.lights || []) { scene.remove(L); L.dispose(); }
    this.lights = [];
    for (let k = 0; k < count; k++) {
      const L = new THREE.PointLight(0xffaa66, 0, 30, 2);
      if (k < shadowCount) {
        L.castShadow = true;
        L.shadow.mapSize.set(512, 512);
        L.shadow.camera.near = 0.3;
        L.shadow.camera.far = 45;
        L.shadow.bias = -0.004;
        L.shadow.normalBias = 0.05;
        L.shadow.radius = 3;
        L.shadow.camera.layers.set(1); // dungeon geometry only, not the landscape
        L.shadow.autoUpdate = false; // re-rendered only when this light moves to another flame
        L.shadow.needsUpdate = true;
      }
      L.userData.src = null;
      scene.add(L);
      this.lights.push(L);
    }
    this.shadowCount = shadowCount;
    this.timer = 0;
  }

  // returns true when assignments changed; shadowed lights that moved flag their own shadow map
  update(sources, focus, dt, time, force = false) {
    this.timer -= dt;
    let changed = false;
    if (this.timer <= 0 || force) {
      this.timer = 0.3;
      const ranked = sources
        .map((s) => ({ s, d: s.pos.distanceToSquared(focus) - s.intensity * 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.lights.length)
        .map((r) => r.s);
      const shadowSet = ranked.slice(0, this.shadowCount);
      const rest = ranked.slice(this.shadowCount);
      const assign = (lights, list) => {
        const remaining = new Set(list);
        // keep existing assignments
        for (const L of lights) if (L.userData.src && remaining.has(L.userData.src)) remaining.delete(L.userData.src);
        for (const L of lights) {
          if (L.userData.src && list.includes(L.userData.src)) continue;
          const next = remaining.values().next().value || null;
          if (next) remaining.delete(next);
          if (L.userData.src !== next) {
            changed = true;
            if (L.castShadow) L.shadow.needsUpdate = true;
          }
          L.userData.src = next;
          if (next) {
            L.position.copy(next.pos);
            L.color.setHex(next.color);
            L.distance = next.distance;
          }
        }
      };
      assign(this.lights.slice(0, this.shadowCount), shadowSet);
      assign(this.lights.slice(this.shadowCount), rest);
    }
    for (const L of this.lights) {
      const s = L.userData.src;
      if (!s) { L.intensity = 0; continue; }
      const f = s.flicker;
      const ph = s.phase;
      const fl = 1 + f * (Math.sin(time * 13 + ph) * 0.07 + Math.sin(time * 29 + ph * 1.7) * 0.05 + Math.sin(time * 5.3 + ph * 3) * 0.05);
      L.intensity = s.intensity * fl * this.master;
    }
    return changed;
  }

  invalidate() {
    for (const L of this.lights) L.userData.src = null;
    this.timer = 0;
  }
}
