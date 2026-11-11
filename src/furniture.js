import { CELL, WALL_T, mulberry } from './config.js';
import { G, add, BX, CY, SP, CO, TO } from './geom.js';

// The everyday furniture, modelled at real size for 5 ft squares: turned legs, aprons and
// stretchers, not plain boxes. Every piece's back is -z, as elsewhere.
const H = CELL / 2;
const PI = Math.PI;

// a turned leg from the floor up to height h: foot, shaft with a swell, square block at the top
function leg(g, x, z, h, m = 'darkWood', r = 0.11) {
  add(g, CY(r * 0.75, r * 0.95, h * 0.16, 8), m, x, h * 0.08, z);
  add(g, CY(r * 1.25, r * 0.75, h * 0.3, 8), m, x, h * 0.31, z);
  add(g, CY(r * 0.8, r * 1.25, h * 0.3, 8), m, x, h * 0.61, z);
  add(g, BX(r * 2.3, h * 0.24, r * 2.3), m, x, h * 0.88, z);
}

// a long table for w squares: a plank top with battened ends on four legs, an apron and a stretcher
export function table(w = 2) {
  const g = G();
  const L = w * CELL - 1.4, D = 3.4, y = 2.6;
  add(g, BX(L, 0.2, D), 'planks', 0, y, 0);
  for (const s of [-1, 1]) add(g, BX(0.3, 0.24, D + 0.06), 'darkWood', s * (L / 2 - 0.12), y, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(g, sx * (L / 2 - 0.5), sz * (D / 2 - 0.4), y - 0.1, 'darkWood', 0.14);
  for (const sz of [-1, 1]) add(g, BX(L - 1.3, 0.34, 0.1), 'darkWood', 0, y - 0.3, sz * (D / 2 - 0.4));
  for (const sx of [-1, 1]) add(g, BX(0.1, 0.34, D - 1.1), 'darkWood', sx * (L / 2 - 0.5), y - 0.3, 0);
  add(g, BX(L - 1.2, 0.16, 0.2), 'darkWood', 0, 0.55, 0);
  for (const sx of [-1, 1]) add(g, BX(0.2, 0.16, D - 1.0), 'darkWood', sx * (L / 2 - 0.5), 0.55, 0);
  return g;
}

export function roundTable() {
  const g = G();
  add(g, CY(1.85, 1.85, 0.18, 24), 'wood', 0, 2.6, 0);
  add(g, CY(1.9, 1.9, 0.08, 24), 'darkWood', 0, 2.5, 0);
  add(g, CY(0.2, 0.3, 0.9, 10), 'darkWood', 0, 2.0, 0);
  add(g, CY(0.34, 0.2, 0.9, 10), 'darkWood', 0, 1.1, 0);
  add(g, SP(0.36, 10, 8), 'darkWood', 0, 1.55, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * PI * 2;
    add(g, BX(0.22, 0.3, 1.3), 'darkWood', Math.sin(a) * 0.7, 0.42, Math.cos(a) * 0.7, 0.35, a, 0);
    add(g, SP(0.16, 8, 6), 'darkWood', Math.sin(a) * 1.3, 0.14, Math.cos(a) * 1.3);
  }
  return g;
}

// a high-backed chair with a cushion
export function chair() {
  const g = G();
  const sh = 1.55; // seat height
  add(g, BX(1.5, 0.14, 1.45), 'wood', 0, sh, 0.05);
  add(g, BX(1.2, 0.12, 1.15), 'redCloth', 0, sh + 0.12, 0.08);
  for (const sx of [-1, 1]) leg(g, sx * 0.62, 0.62, sh - 0.07, 'darkWood', 0.08);
  for (const sx of [-1, 1]) {
    add(g, BX(0.17, sh + 2.1, 0.17), 'darkWood', sx * 0.62, (sh + 2.1) / 2, -0.58);
    add(g, SP(0.13, 8, 6), 'darkWood', sx * 0.62, sh + 2.2, -0.58);
    add(g, BX(0.08, 0.12, 1.1), 'darkWood', sx * 0.62, 0.55, 0.02);
  }
  add(g, BX(1.1, 0.12, 0.08), 'darkWood', 0, 0.55, 0.62);
  add(g, BX(1.14, 0.42, 0.09), 'wood', 0, sh + 1.75, -0.58);
  for (const x of [-0.3, 0, 0.3]) add(g, BX(0.16, 1.0, 0.07), 'wood', x, sh + 1.0, -0.58);
  add(g, BX(1.14, 0.16, 0.09), 'wood', 0, sh + 0.42, -0.58);
  return g;
}

// a trestle bench for two squares
export function bench() {
  const g = G();
  const L = 2 * CELL - 2.4;
  add(g, BX(L, 0.2, 1.3), 'planks', 0, 1.6, 0);
  for (const s of [-1, 1]) {
    const x = s * (L / 2 - 0.9);
    add(g, BX(0.22, 1.4, 1.1), 'darkWood', x, 0.8, 0);
    add(g, BX(0.3, 0.16, 1.4), 'darkWood', x, 0.08, 0);
    add(g, BX(0.9, 0.14, 0.14), 'darkWood', x - s * 0.4, 1.1, 0, 0, 0, s * 0.7);
  }
  add(g, BX(L - 1.8, 0.16, 0.2), 'darkWood', 0, 0.75, 0);
  return g;
}

// a bed for one square by two: posts, a panelled headboard, mattress, pillow and a folded blanket
export function bed() {
  const g = G();
  const W = 3.6, L = 7.0;
  add(g, BX(W, 0.5, L), 'darkWood', 0, 1.0, 0);
  add(g, BX(W - 0.3, 0.55, L - 0.5), 'linen', 0, 1.5, 0.05);
  add(g, BX(W - 0.2, 0.2, L * 0.56), 'redCloth', 0, 1.82, L * 0.19);
  add(g, BX(W - 0.16, 0.26, 0.7), 'linen', 0, 1.86, L * 0.19 - L * 0.28 - 0.3);
  add(g, BX(W * 0.62, 0.36, 1.1), 'linen', 0, 1.92, -L / 2 + 0.95);
  // head (taller) and foot
  add(g, BX(W, 2.4, 0.22), 'darkWood', 0, 2.2, -L / 2);
  add(g, BX(W - 0.8, 1.3, 0.1), 'wood', 0, 2.5, -L / 2 + 0.14);
  add(g, BX(W, 1.1, 0.2), 'darkWood', 0, 1.3, L / 2);
  for (const sx of [-1, 1]) {
    add(g, BX(0.3, 4.0, 0.3), 'darkWood', sx * (W / 2), 2.0, -L / 2);
    add(g, SP(0.2, 8, 6), 'darkWood', sx * (W / 2), 4.15, -L / 2);
    add(g, BX(0.3, 2.4, 0.3), 'darkWood', sx * (W / 2), 1.2, L / 2);
    add(g, SP(0.2, 8, 6), 'darkWood', sx * (W / 2), 2.55, L / 2);
  }
  return g;
}

// a tall case of books against the wall behind it
export function bookshelf() {
  const g = G();
  const W = CELL - 0.5, top = 7.2, D = 1.3;
  const z = -H + WALL_T / 2 + D / 2 + 0.1;
  const rand = mulberry(31);
  add(g, BX(W, top, 0.1), 'darkWood', 0, top / 2, z - D / 2 + 0.05);
  for (const s of [-1, 1]) add(g, BX(0.16, top, D), 'darkWood', s * (W / 2 - 0.08), top / 2, z);
  add(g, BX(W + 0.3, 0.2, D + 0.2), 'darkWood', 0, top + 0.1, z + 0.02);
  add(g, BX(W + 0.14, 0.3, D + 0.1), 'darkWood', 0, 0.15, z + 0.02);
  const books = ['redCloth', 'blueCloth', 'greenCloth', 'purpleCloth', 'canvas', 'parchment'];
  for (let s = 0; s < 5; s++) {
    const y = 0.3 + s * 1.38;
    add(g, BX(W - 0.3, 0.1, D - 0.1), 'darkWood', 0, y, z);
    let x = -W / 2 + 0.22, n = 0;
    while (x < W / 2 - 0.4) {
      const w = 0.13 + rand() * 0.15, h = 0.78 + rand() * 0.42;
      if (rand() < 0.07) { x += 0.34; continue; }
      // each book is pushed in a little differently, so no two fronts lie in one plane
      const dz = ((n++ * 7) % 5) * 0.016;
      const b = add(g, BX(w, h, 0.9 - dz), books[Math.floor(rand() * books.length)], x + w / 2, y + 0.05 + h / 2, z + 0.12 - dz / 2);
      if (rand() < 0.08) b.rotation.z = 0.22;
      x += w + 0.012;
    }
  }
  return g;
}

// a gilded seat on a stone dais, with a tall pointed back
export function throne() {
  const g = G();
  add(g, BX(4.2, 0.4, 4.0), 'paleStone', 0, 0.2, 0);
  add(g, BX(3.4, 0.36, 3.2), 'paleStone', 0, 0.58, -0.2);
  const y0 = 0.76;
  add(g, BX(2.5, 1.5, 2.2), 'gold', 0, y0 + 0.75, -0.3);
  add(g, BX(2.0, 0.3, 1.9), 'redCloth', 0, y0 + 1.62, -0.2);
  add(g, BX(2.5, 5.2, 0.45), 'gold', 0, y0 + 3.6, -1.25);
  add(g, BX(1.8, 3.9, 0.12), 'redCloth', 0, y0 + 3.5, -0.98);
  add(g, CO(1.3, 1.5, 4), 'gold', 0, y0 + 6.9, -1.25, 0, PI / 4, 0).scale.z = 0.3;
  add(g, SP(0.26, 10, 8), 'ruby', 0, y0 + 6.5, -0.98);
  for (const s of [-1, 1]) {
    add(g, BX(0.34, 1.1, 2.0), 'gold', s * 1.1, y0 + 2.0, -0.3);
    add(g, SP(0.24, 10, 8), 'ruby', s * 1.1, y0 + 2.65, 0.6);
    add(g, CY(0.14, 0.18, 6.2, 8), 'gold', s * 1.36, y0 + 3.1, -1.25);
    add(g, CO(0.2, 0.5, 6), 'gold', s * 1.36, y0 + 6.45, -1.25);
  }
  add(g, TO(0.5, 0.06, 6, 16), 'gold', 0, y0 + 5.1, -0.9);
  return g;
}
