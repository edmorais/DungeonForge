import * as THREE from 'three';
import { hash2, mulberry } from './config.js';

// ---------- tileable noise on the unit square ----------
const smooth = (t) => t * t * (3 - 2 * t);
const mod = (a, n) => ((a % n) + n) % n;

export function vnoise(u, v, p, seed = 0) {
  const x = u * p, y = v * p;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const x0 = mod(ix, p), x1 = mod(ix + 1, p), y0 = mod(iy, p), y1 = mod(iy + 1, p);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed), c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function fbm(u, v, p = 4, oct = 4, seed = 0) {
  let s = 0, amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    s += vnoise(u, v, p, seed + o * 17) * amp;
    tot += amp;
    amp *= 0.5;
    p *= 2;
  }
  return s / tot;
}

// ---------- painter ----------
// painter(u, v, out) writes out[0..2] rgb 0..255 and out[3] height 0..1
function paint(size, painter, opts = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const hc = document.createElement('canvas');
  hc.width = hc.height = size;
  const hctx = hc.getContext('2d');
  const himg = hctx.createImageData(size, size);
  const out = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[3] = 0.5;
      painter((x + 0.5) / size, (y + 0.5) / size, out);
      const k = (y * size + x) * 4;
      img.data[k] = out[0]; img.data[k + 1] = out[1]; img.data[k + 2] = out[2]; img.data[k + 3] = 255;
      const h = Math.max(0, Math.min(255, out[3] * 255));
      himg.data[k] = himg.data[k + 1] = himg.data[k + 2] = h; himg.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  hctx.putImageData(himg, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(hc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump, canvas: c };
}

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, t) => a + (b - a) * t;
function setCol(out, c, m = 1) { out[0] = c[0] * m; out[1] = c[1] * m; out[2] = c[2] * m; }
function mixCol(out, a, b, t, m = 1) {
  out[0] = mix(a[0], b[0], t) * m; out[1] = mix(a[1], b[1], t) * m; out[2] = mix(a[2], b[2], t) * m;
}

// Random rectangle subdivision of the unit square (non-wrapping tile)
function splitRects(rand, minSize) {
  const rects = [];
  const rec = (x, y, w, h, depth) => {
    const canW = w > minSize * 2, canH = h > minSize * 2;
    if ((!canW && !canH) || (depth > 1 && rand() < 0.25)) { rects.push([x, y, w, h, rand()]); return; }
    const vert = canW && (!canH || (w > h ? rand() < 0.75 : rand() < 0.25));
    if (vert) {
      const s = minSize + rand() * (w - minSize * 2);
      rec(x, y, s, h, depth + 1); rec(x + s, y, w - s, h, depth + 1);
    } else {
      const s = minSize + rand() * (h - minSize * 2);
      rec(x, y, w, s, depth + 1); rec(x, y + s, w, h - s, depth + 1);
    }
  };
  rec(0, 0, 1, 1, 0);
  return rects;
}

function rectAt(rects, u, v) {
  for (const r of rects) if (u >= r[0] && u < r[0] + r[2] && v >= r[1] && v < r[1] + r[3]) {
    const d = Math.min(u - r[0], r[0] + r[2] - u, v - r[1], r[1] + r[3] - v);
    return [r, d];
  }
  return [rects[0], 0];
}

// Wrapping voronoi points
function voronoiPts(rand, n) {
  const pts = [];
  for (let k = 0; k < n; k++) pts.push([rand(), rand(), rand()]);
  return pts;
}
function voronoi(pts, u, v) {
  let d1 = 9, d2 = 9, best = null;
  for (const p of pts) {
    let dx = Math.abs(u - p[0]); dx = Math.min(dx, 1 - dx);
    let dy = Math.abs(v - p[1]); dy = Math.min(dy, 1 - dy);
    const d = dx * dx + dy * dy;
    if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
  }
  return [best, Math.sqrt(d2) - Math.sqrt(d1), Math.sqrt(d1)];
}

// ---------- texture library ----------
const cache = new Map();
export function tex(name) {
  if (cache.has(name)) return cache.get(name);
  const fn = LIB[name];
  if (!fn) throw new Error('no texture ' + name);
  const t = fn();
  cache.set(name, t);
  return t;
}

const LIB = {
  flagstone() {
    const rand = mulberry(11);
    const rects = splitRects(rand, 0.22);
    const A = hex(0x8a8478), B = hex(0x6c675f), mortar = hex(0x2c2a27);
    return paint(256, (u, v, o) => {
      const [r, d] = rectAt(rects, u, v);
      const n = fbm(u, v, 8, 4, 3);
      const gap = 0.012 + n * 0.008;
      if (d < gap) { setCol(o, mortar, 0.8 + n * 0.4); o[3] = 0.1; return; }
      const bevel = Math.min(1, (d - gap) / 0.03);
      const tone = 0.78 + r[4] * 0.32 + (fbm(u, v, 16, 3, 9) - 0.5) * 0.35;
      mixCol(o, A, B, r[4], tone);
      const crack = Math.abs(fbm(u + r[4], v, 6, 3, 5) - 0.5) < 0.008 ? 0.6 : 1;
      o[0] *= crack; o[1] *= crack; o[2] *= crack;
      o[3] = 0.35 + bevel * 0.45 + n * 0.2;
    });
  },
  cobble() {
    const pts = voronoiPts(mulberry(21), 34);
    const A = hex(0x7d776e), B = hex(0x5d5850), M = hex(0x37322c);
    return paint(256, (u, v, o) => {
      const [p, edge, d1] = voronoi(pts, u, v);
      const n = fbm(u, v, 12, 3, 4);
      if (edge < 0.018) { setCol(o, M, 0.7 + n * 0.5); o[3] = 0.05; return; }
      const dome = Math.min(1, edge / 0.08);
      mixCol(o, A, B, p[2], 0.75 + dome * 0.3 + (n - 0.5) * 0.3);
      o[3] = 0.2 + dome * 0.7;
    });
  },
  planks() {
    const C1 = hex(0x7a5232), C2 = hex(0x5a3a22), gapC = hex(0x241710);
    return paint(256, (u, v, o) => {
      const plank = Math.floor(u * 5);
      const lu = u * 5 - plank;
      const off = hash2(plank, 3, 7);
      const seg = Math.floor(v + off * 3) % 2;
      const vv = (v + off) % 1;
      const grain = fbm(lu * 0.2, vv, 4, 4, plank * 3 + seg) * 0.6 + Math.sin((lu * 6 + fbm(lu, vv, 3, 3, plank) * 8) * 3) * 0.08;
      const tone = 0.75 + hash2(plank, seg, 2) * 0.35;
      if (lu < 0.04 || lu > 0.96) { setCol(o, gapC); o[3] = 0.05; return; }
      const endJoint = Math.abs(((v + off * 3) % 1)) < 0.006;
      mixCol(o, C1, C2, grain + 0.2, endJoint ? 0.4 : tone);
      const nail = (Math.abs(lu - 0.5) < 0.05 && (Math.abs(vv - 0.08) < 0.012 || Math.abs(vv - 0.92) < 0.012));
      if (nail) setCol(o, [40, 40, 44]);
      o[3] = 0.55 + grain * 0.3;
    });
  },
  marble() {
    const W = hex(0xe8e2d6), K = hex(0x2b2b30);
    return paint(256, (u, v, o) => {
      const cx = Math.floor(u * 2), cy = Math.floor(v * 2);
      const white = (cx + cy) % 2 === 0;
      const lu = u * 2 - cx, lv = v * 2 - cy;
      const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 2 + fbm(u, v, 4, 5, white ? 1 : 2) * 3) * Math.PI)), 12);
      const base = white ? W : K;
      const vc = white ? [120, 116, 110] : [150, 140, 120];
      mixCol(o, base, vc, vein * 0.7, 0.92 + fbm(u, v, 16, 2, 8) * 0.12);
      const edge = Math.min(lu, 1 - lu, lv, 1 - lv);
      if (edge < 0.01) { setCol(o, [70, 66, 60]); o[3] = 0.2; return; }
      o[3] = 0.7;
    });
  },
  dirt() {
    const A = hex(0x6b5038), B = hex(0x4a3726);
    const pts = voronoiPts(mulberry(5), 40);
    return paint(256, (u, v, o) => {
      const n = fbm(u, v, 6, 5, 31);
      mixCol(o, A, B, n, 0.85 + fbm(u, v, 24, 2, 3) * 0.25);
      const [, , d] = voronoi(pts, u, v);
      if (d < 0.012) { setCol(o, [118, 108, 96]); o[3] = 0.8; return; }
      o[3] = 0.4 + n * 0.4;
    });
  },
  moss() {
    const base = tex('flagstone');
    const ctx = base.canvas.getContext('2d');
    const src = ctx.getImageData(0, 0, 256, 256).data;
    return paint(256, (u, v, o) => {
      const x = Math.floor(u * 256), y = Math.floor(v * 256), k = (y * 256 + x) * 4;
      const m = fbm(u, v, 5, 4, 77);
      const t = Math.max(0, Math.min(1, (m - 0.45) * 4));
      mixCol(o, [src[k], src[k + 1], src[k + 2]], [64, 92, 42], t * 0.85);
      o[3] = 0.4 + m * 0.3;
    });
  },
  stoneWall() {
    const rand = mulberry(42);
    const rows = 4;
    const rowData = [];
    for (let r = 0; r < rows; r++) {
      const n = 2 + Math.floor(rand() * 2);
      const cuts = [];
      let acc = 0;
      for (let k = 0; k < n; k++) { acc += 0.6 + rand(); cuts.push(acc); }
      const off = rand();
      rowData.push({ cuts: cuts.map((c) => c / acc), off, tones: cuts.map(() => rand()) });
    }
    const A = hex(0x8c857a), B = hex(0x655f57), M = hex(0x34302b);
    return paint(256, (u, v, o) => {
      const r = Math.floor(v * rows), lv = v * rows - r;
      const rd = rowData[r];
      const uu = (u + rd.off) % 1;
      let k = 0;
      while (k < rd.cuts.length - 1 && uu > rd.cuts[k]) k++;
      const left = k === 0 ? 0 : rd.cuts[k - 1], right = rd.cuts[k];
      const du = Math.min(uu - left, right - uu, uu + 1 - right, 1 - uu + left);
      const dv = Math.min(lv, 1 - lv) / rows;
      const d = Math.min(Math.abs(Math.min(uu - left, right - uu)), dv);
      const n = fbm(u, v, 8, 4, 12);
      if (d < 0.012 + n * 0.006) { setCol(o, M, 0.8 + n * 0.3); o[3] = 0.1; return; }
      const bevel = Math.min(1, d / 0.035);
      mixCol(o, A, B, rd.tones[k], 0.78 + bevel * 0.12 + (fbm(u, v, 20, 3, 4) - 0.5) * 0.35);
      o[3] = 0.3 + bevel * 0.5 + n * 0.2;
      void du;
    });
  },
  brick() {
    const R = hex(0x8a4a36), R2 = hex(0x6a3527), M = hex(0x9c958a);
    return paint(256, (u, v, o) => {
      const rows = 8, r = Math.floor(v * rows), lv = v * rows - r;
      const cols = 4, uu = (u * cols + (r % 2) * 0.5) % cols;
      const c = Math.floor(uu), lu = uu - c;
      const n = fbm(u, v, 16, 3, 2);
      if (lv < 0.1 || lu < 0.04) { setCol(o, M, 0.6 + n * 0.3); o[3] = 0.15; return; }
      mixCol(o, R, R2, hash2(c, r, 5), 0.8 + (n - 0.5) * 0.5);
      o[3] = 0.65 + n * 0.25;
    });
  },
  caveRock() {
    const A = hex(0x5f5a52), B = hex(0x3c3833);
    return paint(256, (u, v, o) => {
      const n = fbm(u, v, 4, 6, 99);
      const ridge = 1 - Math.abs(fbm(u, v, 3, 4, 7) * 2 - 1);
      mixCol(o, A, B, n, 0.8 + ridge * 0.35);
      o[3] = n * 0.6 + ridge * 0.4;
    });
  },
  wood() {
    const A = hex(0x6e4a2c), B = hex(0x4b301b);
    return paint(256, (u, v, o) => {
      const g = fbm(u * 0.25, v, 3, 5, 51);
      const ring = Math.sin((u * 20 + g * 14) * 1.0) * 0.5 + 0.5;
      mixCol(o, A, B, ring * 0.6 + g * 0.4, 0.85 + fbm(u, v, 32, 2, 4) * 0.2);
      o[3] = 0.5 + ring * 0.3;
    });
  },
  darkWood() {
    const A = hex(0x3d2818), B = hex(0x23160d);
    return paint(256, (u, v, o) => {
      const g = fbm(u * 0.25, v, 3, 5, 52);
      const ring = Math.sin((u * 26 + g * 14)) * 0.5 + 0.5;
      mixCol(o, A, B, ring * 0.6 + g * 0.4, 0.9 + fbm(u, v, 32, 2, 4) * 0.2);
      o[3] = 0.5 + ring * 0.3;
    });
  },
  iron() {
    const A = hex(0x4a4a4e), B = hex(0x2c2c30), Rust = hex(0x6e3e22);
    return paint(128, (u, v, o) => {
      const n = fbm(u, v, 6, 5, 61);
      const rust = Math.max(0, (fbm(u, v, 4, 4, 9) - 0.6) * 3);
      mixCol(o, A, B, n, 1);
      mixCol(o, [o[0], o[1], o[2]], Rust, Math.min(1, rust));
      o[3] = n;
    });
  },
  fabric() {
    return paint(128, (u, v, o) => {
      const w = (Math.sin(u * 128 * Math.PI) * Math.sin(v * 128 * Math.PI)) * 0.5 + 0.5;
      const n = fbm(u, v, 8, 3, 3);
      const g = Math.round(200 + w * 30 + n * 25);
      o[0] = o[1] = o[2] = g;
      o[3] = w;
    });
  },
  rug() {
    // Ornamental red/blue rug, painted at 2:3 ratio coordinates
    const red = hex(0x7c1f1c), blue = hex(0x1f2f5a), gold = hex(0xc49a45), cream = hex(0xd9c9a3);
    return paint(256, (u, v, o) => {
      const bx = Math.min(u, 1 - u), by = Math.min(v, 1 - v), b = Math.min(bx, by);
      const n = fbm(u, v, 32, 2, 3) * 0.15 + 0.92;
      if (b < 0.035) { setCol(o, blue, n); }
      else if (b < 0.05) { setCol(o, gold, n); }
      else if (b < 0.11) {
        const t = Math.sin((bx < by ? v : u) * 60) > 0.3;
        setCol(o, t ? cream : blue, n);
      } else if (b < 0.125) setCol(o, gold, n);
      else {
        const cx = u - 0.5, cy = v - 0.5;
        const dia = Math.abs(cx) + Math.abs(cy);
        if (dia < 0.12) setCol(o, gold, n);
        else if (dia < 0.17) setCol(o, blue, n);
        else if (Math.abs(dia - 0.28) < 0.015) setCol(o, cream, n);
        else {
          const pat = Math.sin(u * 50) * Math.sin(v * 50) > 0.6;
          setCol(o, pat ? [150, 50, 40] : red, n);
        }
      }
      o[3] = 0.5;
    });
  },
  parchment() {
    return paint(128, (u, v, o) => {
      const n = fbm(u, v, 5, 4, 9);
      mixCol(o, [222, 205, 160], [180, 150, 100], n, 1);
      o[3] = 0.5;
    });
  },
  hedge() {
    const A = hex(0x2f5a24), B = hex(0x1a3a14);
    const pts = voronoiPts(mulberry(9), 60);
    return paint(256, (u, v, o) => {
      const [p, e] = voronoi(pts, u, v);
      const n = fbm(u, v, 12, 3, 4);
      mixCol(o, A, B, p[2] * 0.6 + (1 - Math.min(1, e * 20)) * 0.5, 0.8 + n * 0.4);
      o[3] = Math.min(1, e * 15) * 0.7 + n * 0.3;
    });
  },
  lava() {
    return paint(256, (u, v, o) => {
      const n = fbm(u, v, 4, 5, 13);
      const crust = Math.abs(fbm(u, v, 6, 4, 2) - 0.5) * 2;
      const hot = 1 - Math.min(1, crust * 2.5);
      mixCol(o, [40, 18, 12], [255, 120 + n * 90, 20], hot);
      o[3] = 1 - hot;
    });
  },
  water() {
    return paint(256, (u, v, o) => {
      const n = fbm(u, v, 6, 4, 29);
      mixCol(o, [24, 60, 72], [52, 104, 112], n);
      o[3] = n;
    });
  },
  gold() {
    return paint(64, (u, v, o) => {
      const n = fbm(u, v, 8, 3, 19);
      mixCol(o, [255, 196, 70], [190, 120, 30], n);
      o[3] = n;
    });
  },
  limestone() {
    return paint(256, (u, v, o) => {
      const n = fbm(u, v, 5, 4, 71), m = fbm(u, v, 24, 2, 72);
      const vein = Math.pow(1 - Math.abs(Math.sin((u * 2 + v + fbm(u, v, 3, 4, 73) * 2) * Math.PI)), 16) * 0.25;
      mixCol(o, [236, 230, 216], [204, 196, 180], n * 0.8 + vein, 0.94 + m * 0.1);
      o[3] = 0.45 + n * 0.35;
    });
  },
  // neutral luminance detail for terrain (colour comes from vertex colours)
  detail() {
    const pts = voronoiPts(mulberry(55), 50);
    return paint(512, (u, v, o) => {
      const n1 = fbm(u, v, 4, 5, 201);
      const n2 = fbm(u, v, 16, 3, 202);
      const blade = fbm(u, v, 96, 2, 203);
      const [, e] = voronoi(pts, u, v);
      let g = 0.78 + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.2 + (blade - 0.5) * 0.25;
      if (e < 0.01) g *= 0.85;
      const c = Math.max(0, Math.min(255, g * 235));
      o[0] = o[1] = o[2] = c;
      o[3] = n1 * 0.5 + blade * 0.5;
    });
  },
  // ---- terrain ground textures (tile ~ 12 ft) ----
  grass() { return groundTex([0x4f7a2e, 0x3b6324, 0x6b8c3a], 0x5a4a30, 101); },
  forestFloor() { return groundTex([0x34482a, 0x2a3a20, 0x4b4a2a], 0x3d2e1c, 102); },
  sand() { return groundTex([0xd6b77d, 0xc7a46a, 0xe2c891], 0xb08d5a, 103, 0.4); },
  snow() { return groundTex([0xe9eef4, 0xd5dde8, 0xf6f8fb], 0xaab6c4, 104, 0.3); },
  basalt() { return groundTex([0x2e2a2a, 0x231f1f, 0x3d3533], 0x5a2a18, 105); },
  mud() { return groundTex([0x4a4a30, 0x3a3a24, 0x5a5236], 0x2c2a1c, 106); },
  highland() { return groundTex([0x6b7a42, 0x59683a, 0x7f7a5a], 0x6b6658, 107); },
  caveFloor() { return groundTex([0x3e3a36, 0x34302c, 0x4a4540], 0x2a2622, 108); },
};

function groundTex(cols, speck, seed, speckAmt = 1) {
  const C = cols.map(hex), S = hex(speck);
  return paint(256, (u, v, o) => {
    const n1 = fbm(u, v, 3, 5, seed);
    const n2 = fbm(u, v, 8, 3, seed + 5);
    const t = n1;
    if (t < 0.5) mixCol(o, C[0], C[1], t * 2, 0.9 + n2 * 0.2);
    else mixCol(o, C[1], C[2], (t - 0.5) * 2, 0.9 + n2 * 0.2);
    const blade = fbm(u, v, 64, 2, seed + 9);
    if (blade > 0.72 && speckAmt > 0.5) { o[0] *= 1.15; o[1] *= 1.15; o[2] *= 1.1; }
    if (n2 > 0.78) mixCol(o, [o[0], o[1], o[2]], S, (n2 - 0.78) * 4 * speckAmt);
    o[3] = n1 * 0.6 + blade * 0.4;
  });
}
