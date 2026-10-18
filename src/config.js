// World units are feet. One grid square = 3 ft.
export const CELL = 3;
export const MAX_LEVEL = 10; // squares rise or sink up to 10 levels of 3 ft (30 ft)
export const GRID_W = 64; // 192 ft east-west
export const GRID_D = 48; // 144 ft north-south
export const WALL_H = 10;
export const WALL_T = 0.6;
export const FLOOR_Y = 0.12; // top of floor tiles

// Indoor preset: 120 ft x 60 ft exterior wall (40 x 20 squares)
export const KEEP_W = 40;
export const KEEP_D = 20;
export const KEEP_I0 = Math.floor((GRID_W - KEEP_W) / 2);
export const KEEP_J0 = Math.floor((GRID_D - KEEP_D) / 2);

export const cellX = (i) => (i - GRID_W / 2) * CELL + CELL / 2;
export const cellZ = (j) => (j - GRID_D / 2) * CELL + CELL / 2;
export const lineX = (i) => (i - GRID_W / 2) * CELL;
export const lineZ = (j) => (j - GRID_D / 2) * CELL;
export const worldToCell = (x, z) => [Math.floor(x / CELL + GRID_W / 2), Math.floor(z / CELL + GRID_D / 2)];
export const inGrid = (i, j) => i >= 0 && j >= 0 && i < GRID_W && j < GRID_D;

export function hash2(i, j, s = 0) {
  let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
