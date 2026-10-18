import * as THREE from 'three';
import { GRID_W, GRID_D, CELL } from './config.js';

// One texel per grid square.
//   red   = 255 where the square is sunk below ground: ground surfaces open up there
//   green = 255 where the square is raised or sunk: the flat build grid hides itself there
const data = new Uint8Array(GRID_W * GRID_D * 4);
export const maskTexture = new THREE.DataTexture(data, GRID_W, GRID_D, THREE.RGBAFormat, THREE.UnsignedByteType);
maskTexture.magFilter = maskTexture.minFilter = THREE.NearestFilter;
maskTexture.generateMipmaps = false;
maskTexture.needsUpdate = true;

export function updateMask(state) {
  data.fill(0);
  for (const [k, v] of Object.entries(state.data.heights || {})) {
    const [i, j] = k.split(',').map(Number);
    if (i < 0 || j < 0 || i >= GRID_W || j >= GRID_D || !v) continue;
    const o = (j * GRID_W + i) * 4;
    data[o] = v < 0 ? 255 : 0;
    data[o + 1] = 255;
    data[o + 3] = 255;
  }
  maskTexture.needsUpdate = true;
}

// GLSL: true when a world-space xz point lies over a square whose mask channel is set
export const MASK_GLSL = /* glsl */ `
uniform sampler2D uHeightMask;
float heightMask(vec2 wxz, int channel) {
  vec2 c = wxz / ${CELL.toFixed(1)} + vec2(${(GRID_W / 2).toFixed(1)}, ${(GRID_D / 2).toFixed(1)});
  if (c.x < 0.0 || c.y < 0.0 || c.x >= ${GRID_W.toFixed(1)} || c.y >= ${GRID_D.toFixed(1)}) return 0.0;
  vec4 t = texture2D(uHeightMask, (floor(c) + 0.5) / vec2(${GRID_W.toFixed(1)}, ${GRID_D.toFixed(1)}));
  return channel == 0 ? t.r : t.g;
}
`;

// Make a ground-like material (terrain, water, lava, battle mat, table) open up over sunken squares.
export function cutHoles(material) {
  if (!material || material.userData.holes) return material;
  material.userData.holes = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uHeightMask = { value: maskTexture };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHoleXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHoleXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHoleXZ;\n' + MASK_GLSL)
      .replace('void main() {', 'void main() {\n  if (heightMask(vHoleXZ, 0) > 0.5) discard;');
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => (key ? key() : '') + '|holes';
  material.needsUpdate = true;
  return material;
}
