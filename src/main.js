import * as THREE from 'three';
import { FrameGate, SHADOW_ONLY_LAYER } from './perf.js'; // first: patches shader chunks before any material compiles
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import './style.css';
import { WALL_H, CELL, worldToCell, GRID_W, GRID_D } from './config.js';
import { byId } from './catalog.js';
import { DungeonState } from './state.js';
import { World } from './world.js';
import { Environment, LANDSCAPES } from './environment.js';
import { LightPool } from './lights.js';
import { Editor } from './editor.js';
import { Walker } from './walk.js';
import { buildUI } from './ui.js';
import { renderThumbnails } from './thumbs.js';
import { Ambience } from './audio.js';
import { isDesktop, saveWithDialog } from './desktop.js';
import { sunkenCrypt, banditCamp, ruinedShrine, randomKeep, ziggurat, deepMine, sunkenArena, lichSpires, cragTower } from './samples.js';

const SAVE_KEY = 'dungeon-forge:autosave:v1';
const CUTS = [{ h: WALL_H + 1, label: 'full' }, { h: 6, label: '6 ft' }, { h: 2.6, label: '3 ft' }];

// ---------- renderer ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // what three.js r186 uses for PCFSoft anyway
// The shadow pass runs every frame, but each light re-renders its map only when its own
// shadow.needsUpdate is set (see markShadows): the sun when the hour or the land changes,
// a pooled torch light when it moves to another flame, all of them when the dungeon changes.
renderer.shadowMap.autoUpdate = true;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 9000);
camera.position.set(0, 120, 150);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- systems ----------
const state = new DungeonState();
const env = new Environment(renderer, scene);
const world = new World(scene, state);
const pool = new LightPool(scene, 18, 4);
env.sun.shadow.autoUpdate = false;
let sunShadowDirty = true;
let lastSunShadow = 0;
// ask every shadow-casting light to re-render its shadow map on the next frame
function markShadows() {
  env.sun.shadow.needsUpdate = true;
  for (const L of pool.lights) if (L.castShadow) L.shadow.needsUpdate = true;
}
let quality = 'high';
let playing = false;
let cutIndex = 0;
let gridOn = true;
let mode = 'edit';
let editorCam = null;

const H = { // UI handlers, the rest filled below
  hasAutosave: () => { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } },
};
let ui; // built once handlers exist

const editor = new Editor({
  camera, dom: canvas, scene, state, world,
  onHover: (info) => ui.setHover(info),
  onToast: (m) => ui.toast(m),
  onPick: (id) => { selectItem(id); ui.toast(`Picked ${byId[id].name.toLowerCase()}.`); },
});

editor.onSelect = (ob) => {
  if (ob) ui.setTip(`${byId[ob.t].name} selected · drag to move · R turns · Delete removes · Esc deselects`);
  else if (editor.tool === 'select') ui.setTip('Click a placed piece · drag to move · R turns · Delete removes');
};

const walker = new Walker({
  camera, dom: canvas, state, world, env,
  onPrompt: (t, kind) => ui.setPrompt(t, kind),
  onToast: (m, k) => ui.toast(m, k),
  onGold: (g, xp = 0) => ui.setPurse(g, xp),
  onExit: () => exitWalk(),
  onSound: (kind, arg) => audio[kind]?.(arg),
  onHealth: (hp, max, peaceful, hit) => ui.setHealth(hp, max, peaceful, hit),
});
const audio = new Ambience();
scene.add(walker.handLight);

// ---------- state reactions ----------
function refreshStats() {
  const d = state.data;
  let xp = 0;
  for (const o of d.objects) xp += byId[o.t].xp || 0;
  ui.setStats({ floors: Object.keys(d.floors).length, walls: Object.keys(d.edges).length, objects: d.objects.length, gp: state.treasure(), xp });
  ui.setUndo(state.undoStack.length > 0, state.redoStack.length > 0);
}
let lastPlaceSound = 0;
state.onChange(() => {
  if (performance.now() - lastPlaceSound > 90) { lastPlaceSound = performance.now(); audio.place(); }
  pool.invalidate();
  editor.updateSelBox();
  refreshStats();
});
state.onSetting((k, v) => {
  if (k === 'landscape') { env.setStyle(v); ui.setLandscape(v); sunShadowDirty = true; }
  if (k === 'time') { env.setTime(v); ui.setTime(v, playing); sunShadowDirty = true; }
  if (k === 'name') ui.setName(v);
  if (k === 'light') { env.setLightLevel(v); ui.setLight(v); }
});

function selectItem(id) {
  editor.select(id);
  ui.setTool('place');
  ui.setSelected(id);
  const it = byId[id];
  const tips = {
    floor: 'Drag to fill a rectangle · Alt+click to copy · Esc to deselect',
    edge: it.framed ? 'Click a wall line to set this into it · drag for a run · R flips its side' : 'Drag along grid lines to draw walls · R flips the side · Erase with X',
    obj: it.layer === 'wall' ? 'Point near a wall side; it snaps there' : `R rotates · drag to paint several · ${(it.size || [1, 1])[0] * CELL} × ${(it.size || [1, 1])[1] * CELL} ft`,
  };
  ui.setTip(tips[it.kind]);
}

function setTool(t) {
  editor.setTool(t);
  ui.setTool(t);
  ui.setTip({
    room: 'Drag a rectangle. It uses your last floor and wall choices.',
    erase: 'Click to remove the top piece or a wall · drag to clear an area',
    pick: 'Click anything to select that piece',
    select: 'Click a placed piece · drag to move · R turns · Delete removes',
    place: 'Choose a piece from the palette',
    view: 'Drag to move the view · right-drag turns · scroll zooms · choose a piece to build',
    height: 'Click or drag squares to raise them 3 ft · Shift does the opposite · up to 30 ft either way',
  }[t]);
}

// ---------- handlers ----------
Object.assign(H, {
  setName: (n) => state.setSetting('name', n),
  setLight: (v) => state.setSetting('light', Math.max(0, Math.min(2, Math.round(v * 20) / 20))),
  nudgeLight: (dv) => { H.setLight((state.data.light ?? 1) + dv); ui.toast(`Light ${Math.round((state.data.light ?? 1) * 100)}%`); },
  setLandscape: (id) => state.setSetting('landscape', id),
  setTime: (t) => state.setSetting('time', t),
  nudgeTime: (dt) => state.setSetting('time', (state.data.time + dt + 24) % 24),
  togglePlay: () => { playing = !playing; ui.setTime(state.data.time, playing); },
  cycleCut: () => {
    cutIndex = (cutIndex + 1) % CUTS.length;
    world.setCut(CUTS[cutIndex].h);
    ui.setCut(CUTS[cutIndex].label);
  },
  toggleSound: () => { audio.setEnabled(!audio.enabled); ui.setSound(audio.enabled); ui.toast(audio.enabled ? 'Sound on.' : 'Sound off.'); },
  soundOn: () => audio.enabled,
  toggleGrid: () => { gridOn = !gridOn; editor.setGridVisible(gridOn); ui.setGrid(gridOn); },
  undo: () => { if (state.undo()) ui.toast('Undone.'); },
  redo: () => { if (state.redo()) ui.toast('Redone.'); },
  walk: () => enterWalk(),
  select: (id) => selectItem(id),
  setTool,
  lastFloor: () => editor.lastFloor,
  roomTheme: () => editor.roomTheme,
  heightMode: () => editor.heightMode,
  heightLevel: () => editor.heightLevel,
  setHeightMode: (m) => { editor.heightMode = m; editor.refreshPreview(); },
  setHeightLevel: (l) => { editor.heightLevel = l; },
  setRoomTheme: (t) => { editor.roomTheme = t; },
  lastWall: () => editor.lastWall,
  newDungeon: () => ui.showStart(),
  openFile: () => openFile(),
  saveFile: () => saveFile(),
  screenshot: () => screenshot(),
  battleMap: () => battleMap(true),
  topView: () => toggleTopView(),
  clearMap: () => { state.checkpoint(); state.clearAll(); state.emit(); ui.toast('Map cleared. Ctrl+Z brings it back.'); },
  toggleQuality: () => setQuality(quality === 'high' ? 'low' : 'high'),
  help: () => ui.showHelp(),
  start: (kind) => { startedAt = performance.now(); startDungeon(kind); ui.showCoach(); },
  generate: () => {
    state.checkpoint();
    const rooms = randomKeep(state);
    state.emit();
    ui.setName(state.data.name);
    ui.toast(`Generated ${state.data.name}: ${rooms} rooms. Ctrl+Z restores your map.`);
  },
});

ui = buildUI(document.getElementById('ui'), H);

function startDungeon(kind) {
  world.resetRuntime();
  if (kind === 'resume') {
    try { state.load(localStorage.getItem(SAVE_KEY)); } catch (e) { ui.toast('The saved map could not be read. Starting fresh.'); startDungeon('blank'); return; }
    frameCamera();
  } else {
    state.clearAll();
    state.undoStack.length = 0;
    state.redoStack.length = 0;
    let land = 'meadow', time = 15.5, name = 'Untitled dungeon', light = 1, view = null;
    if (kind === 'blank') { land = 'meadow'; time = 10.5; name = 'Untitled dungeon'; }
    if (kind === 'crypt') { sunkenCrypt(state); land = 'swamp'; time = 19.4; name = state.data.name; }
    if (kind === 'camp') { banditCamp(state); land = 'forest'; time = 18.3; name = state.data.name; }
    if (kind === 'random') { randomKeep(state); land = ['meadow', 'forest', 'highlands', 'tundra', 'swamp'][Math.floor(Math.random() * 5)]; time = 18.6; name = state.data.name; }
    if (kind === 'shrine') { ruinedShrine(state); land = 'desert'; time = 17.7; name = state.data.name; }
    if (kind === 'ziggurat') { ziggurat(state); land = 'desert'; time = 7.2; name = state.data.name; view = [[-44, 82, 104], [2, 4, 6]]; }
    if (kind === 'mine') { deepMine(state); land = 'highlands'; time = 17.2; name = state.data.name; view = [[-30, 92, 96], [4, -8, 2]]; }
    if (kind === 'arena') { sunkenArena(state); land = 'meadow'; time = 16.4; name = state.data.name; view = [[-26, 66, 78], [3, -6, 4]]; }
    if (kind === 'crag') { cragTower(state); land = 'tundra'; time = 9.4; name = state.data.name; view = [[-40, 70, 80], [0, 8, 2]]; }
    if (kind === 'spires') { lichSpires(state); land = 'void'; time = 21; light = 1.35; name = state.data.name; view = [[-52, 70, 70], [-4, 10, 0]]; }
    state.setSetting('landscape', land);
    state.setSetting('time', time);
    state.setSetting('name', name);
    state.setSetting('light', light);
    state.emit();
    frameCamera(view);
  }
  ui.setName(state.data.name);
  editor.select(null);
  ui.setSelected(null);
  setTool('view'); // nothing is placed until the user chooses a piece
}

function frameCamera(view = null) {
  const target = new THREE.Vector3(...(view ? view[1] : [0, 0, 0]));
  editor.controls.target.copy(target);
  camera.position.set(...(view ? view[0] : [-38, 105, 128]));
  camera.lookAt(target);
  editor.controls.update();
}

// ---------- quality ----------
function setQuality(q) {
  quality = q;
  const high = q === 'high';
  renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.75) : 1);
  env.sun.shadow.mapSize.set(high ? 4096 : 2048, high ? 4096 : 2048);
  env.sun.shadow.map?.dispose();
  env.sun.shadow.map = null;
  bloom.enabled = high;
  pool.build(high ? 18 : 8, high ? 4 : 1);
  onResize();
  world.needsShadow = true;
  ui.setQuality(q);
}

// ---------- walk mode ----------
function enterWalk() {
  if (mode === 'walk') return;
  mode = 'walk';
  editorCam = { pos: camera.position.clone(), target: editor.controls.target.clone() };
  editor.setEnabled(false);
  if (cutIndex !== 0) world.setCut(CUTS[0].h);
  world.setWalkMode(true);
  env.setWorkLight(0);
  ui.walkMode(true);
  applyViewOffset();
  walker.enter();
  ui.toast('Click to look around. Press Esc to return to the editor.');
}
function exitWalk() {
  if (mode !== 'walk') return;
  mode = 'edit';
  world.setWalkMode(false);
  if (cutIndex !== 0) world.setCut(CUTS[cutIndex].h);
  env.setWorkLight(0.8);
  ui.walkMode(false);
  editor.setEnabled(true);
  camera.fov = 50;
  camera.near = 0.5;
  applyViewOffset();
  camera.updateProjectionMatrix();
  if (editorCam) { camera.position.copy(editorCam.pos); editor.controls.target.copy(editorCam.target); camera.up.set(0, 1, 0); camera.lookAt(editorCam.target); }
  editor.controls.update();
  world.needsShadow = true;
}

// ---------- files ----------
function slug(s) { return (s || 'dungeon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dungeon'; }
// Inside the claude.ai artifact viewer downloads go through its `downloads` capability;
// everywhere else a normal download link is used.
let downloadsApi;
async function download(name, blob) {
  if (isDesktop()) {
    try {
      const path = await saveWithDialog(name, blob);
      if (path) ui.toast(`Saved ${path.split(/[\\/]/).pop()}.`);
    } catch (e) {
      ui.toast(`The file could not be saved: ${e?.message || e}`, 'danger');
    }
    return;
  }
  if (downloadsApi === undefined) {
    downloadsApi = null;
    try { if (window.claude?.use) downloadsApi = await window.claude.use('downloads'); } catch { downloadsApi = null; }
  }
  if (downloadsApi) {
    try {
      await downloadsApi.save({ filename: name, data: blob });
      ui.toast(`Saved ${name}.`);
    } catch (e) {
      if (e?.code !== 'declined') ui.toast('This viewer could not save the file. Use Copy text instead.', 'danger');
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function copyText(text) {
  const ok = () => ui.toast('Copied to the clipboard.');
  try {
    navigator.clipboard.writeText(text).then(ok, () => { ui.selectIO(); ui.toast('Press Ctrl+C to copy the selected text.'); });
  } catch { ui.selectIO(); ui.toast('Press Ctrl+C to copy the selected text.'); }
}
function loadMap(text) {
  try {
    state.load(text);
    ui.closeIO();
    ui.hideStart();
    frameCamera();
    ui.toast(`Opened ${state.data.name}.`);
  } catch (e) {
    ui.toast(e instanceof SyntaxError ? 'That text is not a map file. Paste the whole file, including the braces.' : e.message, 'danger');
  }
}
function saveFile() {
  const json = state.toJSON();
  ui.openIO({
    title: 'Export this map',
    text: 'Download the map as a file, or copy its text to keep or share. Import brings it back.',
    value: json,
    actions: [
      { label: 'Copy text', fn: () => copyText(json) },
      { label: 'Download file', primary: true, fn: () => { download(`${slug(state.data.name)}.dungeon.json`, new Blob([json], { type: 'application/json' })); } },
    ],
  });
}
function openFile() {
  const pick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = async () => { const f = inp.files[0]; if (f) loadMap(await f.text()); };
    inp.click();
  };
  ui.openIO({
    title: 'Import a map',
    text: 'Choose a .dungeon.json file, or paste map text below and press Import text.',
    value: '',
    actions: [
      { label: 'Choose file…', fn: pick },
      { label: 'Import text', primary: true, fn: (v) => (v.trim() ? loadMap(v) : ui.toast('Paste the map text first.')) },
    ],
  });
}
function dataUrlToBlob(url) {
  const [head, b64] = url.split(',');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new Blob([bytes], { type: head.slice(5).split(';')[0] });
}
function screenshot() {
  const ov = editor.overlay.visible;
  editor.overlay.visible = false;
  composer.render();
  const url = canvas.toDataURL('image/png');
  editor.overlay.visible = ov;
  ui.openIO({
    title: 'Picture of your dungeon',
    text: 'Right-click the picture to copy or save it, or use Download.',
    img: url,
    actions: [{ label: 'Download picture', primary: true, fn: () => download(`${slug(state.data.name)}.png`, dataUrlToBlob(url)) }],
  });
}

// ---------- battle map export (top-down, fixed pixels per 3 ft square) ----------
function mapBounds() {
  const d = state.data;
  let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
  const add = (i, j) => { i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); };
  for (const k in d.floors) { const [i, j] = k.split(',').map(Number); add(i, j); }
  for (const k in d.heights || {}) { const [i, j] = k.split(',').map(Number); add(i, j); }
  for (const k in d.edges) { const [o, a, b] = k.split(':'); const i = +a, j = +b; if (o === 'h') { add(i, j - 1); add(i, j); } else { add(i - 1, j); add(i, j); } }
  for (const o of d.objects) { const it = byId[o.t]; const [w, dd] = o.r % 2 ? [it.size[1], it.size[0]] : it.size; add(o.i, o.j); add(o.i + w - 1, o.j + dd - 1); }
  if (!isFinite(i0)) return null;
  return [Math.max(0, i0 - 1), Math.max(0, j0 - 1), Math.min(GRID_W - 1, i1 + 1), Math.min(GRID_D - 1, j1 + 1)];
}
function renderBattleMap(px, withGrid) {
  const b = mapBounds();
  if (!b) return null;
  const [i0, j0, i1, j1] = b;
  const cols = i1 - i0 + 1, rows = j1 - j0 + 1;
  const maxSide = Math.min(renderer.capabilities.maxTextureSize || 4096, 8192);
  px = Math.max(10, Math.min(px, Math.floor(maxSide / Math.max(cols, rows))));
  const W = cols * px, Hh = rows * px;
  const wFt = cols * CELL, hFt = rows * CELL;
  const cx = (i0 - GRID_W / 2) * CELL + wFt / 2, cz = (j0 - GRID_D / 2) * CELL + hFt / 2;
  const cam = new THREE.OrthographicCamera(-wFt / 2, wFt / 2, hFt / 2, -hFt / 2, 1, 600);
  cam.up.set(0, 0, -1);
  cam.position.set(cx, 300, cz);
  cam.lookAt(cx, 0, cz);
  cam.layers.enableAll();
  cam.layers.disable(SHADOW_ONLY_LAYER); // shadow-only copies of the plants
  // prepare the scene: no cursor or ghosts, no roof or chandeliers, optional grid
  const saved = { pr: renderer.getPixelRatio(), w: window.innerWidth, h: window.innerHeight, part: env.particles?.visible };
  editor.overlay.visible = true;
  for (const o of editor.overlay.children) o.userData._v = o.visible, o.visible = withGrid && o === editor.grid;
  const g = editor.gridMat.uniforms;
  const gridSaved = [g.uOpacity.value, g.uCursor.value.clone()];
  g.uOpacity.value = 0.55; g.uCursor.value.set(1e5, 1e5);
  if (env.particles) env.particles.visible = false;
  world.setCeilingHidden(true);
  const fog = scene.fog;
  scene.fog = null; // the camera sits high above the map; fog would wash it out
  renderer.setPixelRatio(1);
  renderer.setSize(W, Hh, false);
  markShadows();
  renderer.render(scene, cam);
  const url = canvas.toDataURL('image/png');
  // restore
  scene.fog = fog;
  for (const o of editor.overlay.children) o.visible = o.userData._v;
  g.uOpacity.value = gridSaved[0]; g.uCursor.value.copy(gridSaved[1]);
  if (env.particles) env.particles.visible = saved.part;
  world.setCeilingHidden(false);
  renderer.setPixelRatio(saved.pr);
  onResize();
  world.needsShadow = true;
  return { url, cols, rows, px, W, H: Hh };
}
let mapPx = 70;
let mapDaylight = true;
function battleMap(withGrid = true, px = mapPx, daylight = mapDaylight) {
  mapPx = px;
  mapDaylight = daylight;
  const savedTime = state.data.time;
  if (daylight) {
    // even, nearly overhead light so walls don't throw long shadows across the rooms
    env.setTime(12.5);
    env.lightDir = new THREE.Vector3(0.12, 1, 0.08).normalize();
    env.sun.intensity = 2.8;
    env.placeSun(new THREE.Vector3());
  }
  const r = renderBattleMap(px, withGrid);
  if (daylight) { env.setTime(savedTime); env.placeSun(new THREE.Vector3()); }
  if (!r) { ui.toast('Build something first; the battle map covers what you have placed.'); return; }
  ui.openIO({
    title: 'Battle map',
    text: `${r.cols} × ${r.rows} squares at ${r.px} pixels per 3 ft square (${r.W} × ${r.H} px), seen from straight above ${daylight ? 'at midday' : 'at the current time of day'}. Set your virtual tabletop's grid to ${r.px} px.`,
    img: r.url,
    actions: [
      ...[50, 70, 100].filter((n) => n !== r.px).map((n) => ({ label: `${n} px squares`, fn: () => battleMap(withGrid, n, daylight) })),
      { label: withGrid ? 'Without grid' : 'With grid', fn: () => battleMap(!withGrid, r.px, daylight) },
      { label: daylight ? 'Current time of day' : 'Midday light', fn: () => battleMap(withGrid, r.px, !daylight) },
      { label: 'Download map', primary: true, fn: () => download(`${slug(state.data.name)}-battlemap-${r.px}px.png`, dataUrlToBlob(r.url)) },
    ],
  });
}

// ---------- top-down view ----------
let topView = null;
function toggleTopView() {
  const t = editor.controls.target;
  if (topView) {
    camera.position.copy(topView);
    topView = null;
  } else {
    topView = camera.position.clone();
    const dist = Math.max(60, camera.position.distanceTo(t));
    camera.position.set(t.x, t.y + dist, t.z + 0.01);
  }
  camera.lookAt(t);
  editor.controls.update();
}

function autosave() {
  if (!state.dirty) return;
  state.dirty = false;
  try { localStorage.setItem(SAVE_KEY, state.toJSON()); } catch { /* storage unavailable */ }
}
setInterval(autosave, 2500);
window.addEventListener('beforeunload', autosave);

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, select, textarea')) return;
  if (mode === 'walk') return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? H.redo() : H.undo(); return; }
  if (ctrl && e.code === 'KeyY') { e.preventDefault(); H.redo(); return; }
  if (ctrl && e.code === 'KeyS') { e.preventDefault(); saveFile(); return; }
  if (ctrl && e.code === 'KeyO') { e.preventDefault(); openFile(); return; }
  if (ctrl && e.code === 'KeyD') { e.preventDefault(); if (!editor.duplicateSelected()) ui.toast('Select a piece with the Move tool (M) to copy it.'); return; }
  if (ctrl) return;
  if (ui.modalOpen()) { if (e.code === 'Escape') ui.closeModals(); return; }
  switch (e.code) {
    case 'KeyR': editor.rotate(e.shiftKey ? -1 : 1); break;
    case 'Escape':
      if (editor.selected) { editor.setSelected(null); break; }
      editor.select(null); setTool('view'); ui.setSelected(null); break;
    case 'KeyH': setTool('view'); break;
    case 'Slash': case 'F1': e.preventDefault(); ui.showHelp(); break;
    case 'KeyM': setTool('select'); break;
    case 'KeyB': setTool('room'); break;
    case 'Delete': case 'Backspace': if (!editor.deleteSelected()) setTool('erase'); break;
    case 'KeyX': setTool('erase'); break;
    case 'KeyL': setTool('height'); break;
    case 'KeyI': setTool('pick'); break;
    case 'KeyC': H.cycleCut(); break;
    case 'KeyT': toggleTopView(); break;
    case 'KeyG': H.toggleGrid(); break;
    case 'KeyV': enterWalk(); break;
    case 'KeyN': ui.showStart(); break;
    case 'KeyP': H.togglePlay(); break;
    case 'Minus': H.nudgeLight(-0.1); break;
    case 'Equal': H.nudgeLight(0.1); break;
    case 'BracketLeft': H.nudgeTime(-1); break;
    case 'BracketRight': H.nudgeTime(1); break;
    default: return;
  }
});

// ---------- walk-mode minimap ----------
function drawMinimap() {
  const c = ui.minimap;
  const g = c.getContext('2d');
  const W = c.width, R = W / 2;
  const scale = 4; // px per foot
  const px = camera.position.x, pz = camera.position.z;
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip();
  g.translate(R, R);
  g.rotate(walker.yaw);
  g.translate(-px * scale, -pz * scale);
  const d = state.data;
  const sq = CELL * scale;
  const toX = (i) => (i - GRID_W / 2) * CELL * scale, toZ = (j) => (j - GRID_D / 2) * CELL * scale;
  const reach = R / scale / CELL + 2;
  const [ci, cj] = worldToCell(px, pz);
  // bare raised or sunken ground first, then floors; higher squares draw lighter, lower ones darker
  const shade = (hex, lvl) => {
    if (!lvl) return hex;
    const f = 1 + lvl * 0.07, n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  for (const k in d.heights || {}) {
    if (d.floors[k]) continue;
    const [i, j] = k.split(',').map(Number);
    if (Math.abs(i - ci) > reach || Math.abs(j - cj) > reach) continue;
    g.fillStyle = shade('#5a4c3c', d.heights[k]);
    g.fillRect(toX(i), toZ(j), sq + 0.5, sq + 0.5);
  }
  for (const k in d.floors) {
    const [i, j] = k.split(',').map(Number);
    if (Math.abs(i - ci) > reach || Math.abs(j - cj) > reach) continue;
    const t = d.floors[k];
    g.fillStyle = shade(t === 'water' ? '#2e5a66' : t === 'lava' ? '#a8401a' : t === 'pit' ? '#050505' : '#4a4540', d.heights?.[k] || 0);
    g.fillRect(toX(i), toZ(j), sq + 0.5, sq + 0.5);
  }
  // a thin dark line where the ground steps up or down
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (const k in d.heights || {}) {
    const [i, j] = k.split(',').map(Number);
    if (Math.abs(i - ci) > reach || Math.abs(j - cj) > reach) continue;
    const L = d.heights[k], lv = (a, b) => d.heights[`${a},${b}`] || 0;
    if (lv(i, j - 1) !== L) { g.moveTo(toX(i), toZ(j)); g.lineTo(toX(i + 1), toZ(j)); }
    if (!lv(i, j + 1)) { g.moveTo(toX(i), toZ(j + 1)); g.lineTo(toX(i + 1), toZ(j + 1)); }
    if (lv(i - 1, j) !== L) { g.moveTo(toX(i), toZ(j)); g.lineTo(toX(i), toZ(j + 1)); }
    if (!lv(i + 1, j)) { g.moveTo(toX(i + 1), toZ(j)); g.lineTo(toX(i + 1), toZ(j + 1)); }
  }
  g.stroke();
  for (const o of d.objects) {
    if (Math.abs(o.i - ci) > reach || Math.abs(o.j - cj) > reach) continue;
    const it = byId[o.t];
    if (it.layer !== 'ground') continue;
    g.fillStyle = it.cat === 'loot' ? (walker.world.openChests.has(o.id) ? '#6a5a3a' : '#e2c07a') : it.light ? '#ff9a4a' : '#7a7266';
    const [w, dd] = o.r % 2 ? [it.size[1], it.size[0]] : it.size;
    g.fillRect(toX(o.i) + 2, toZ(o.j) + 2, w * sq - 4, dd * sq - 4);
  }
  g.lineCap = 'round';
  for (const k in d.edges) {
    const [o, si, sj] = k.split(':');
    const i = +si, j = +sj;
    if (Math.abs(i - ci) > reach || Math.abs(j - cj) > reach) continue;
    const ent = d.edges[k];
    const ak = ent.t === 'cover' ? ent.a : k;
    const it = byId[d.edges[ak]?.t];
    if (!it) continue;
    const open = it.door && world.isDoorOpen(ak);
    g.strokeStyle = it.door ? (open ? '#5aa197' : '#c9a35a') : it.blocks ? '#e7dfcc' : '#8a8478';
    g.lineWidth = it.door ? 3 : 2.5;
    g.beginPath();
    if (o === 'h') { g.moveTo(toX(i), toZ(j)); g.lineTo(toX(i + 1), toZ(j)); }
    else { g.moveTo(toX(i), toZ(j)); g.lineTo(toX(i), toZ(j + 1)); }
    g.stroke();
  }
  g.restore();
  // player arrow (map rotates, so it always points up)
  g.fillStyle = '#e2c07a';
  g.beginPath(); g.moveTo(R, R - 8); g.lineTo(R + 6, R + 6); g.lineTo(R, R + 3); g.lineTo(R - 6, R + 6); g.closePath(); g.fill();
}

// ---------- resize ----------
function applyViewOffset() {
  // keep the scene centred in the space right of the palette while editing
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return;
  const pal = mode === 'edit' && w > 760 ? 330 : 0;
  if (pal) camera.setViewOffset(w, h, -pal / 2, 0, w, h);
  else camera.clearViewOffset();
}
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return; // a hidden frame reports 0 x 0; wait for a real size
  camera.aspect = w / h;
  applyViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  lastCanvasW = canvas.clientWidth; lastCanvasH = canvas.clientHeight;
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
}
window.addEventListener('resize', onResize);
// embedded frames sometimes change size without a window resize event
if (window.ResizeObserver) new ResizeObserver(() => { if (canvas.clientWidth !== lastCanvasW || canvas.clientHeight !== lastCanvasH) onResize(); }).observe(document.getElementById('app'));
let lastCanvasW = 0, lastCanvasH = 0;

// ---------- loop ----------
let lastT = performance.now();
let startedAt = 0;
const focus = new THREE.Vector3();
let elapsed = 0;
let statsTimer = 0;
let mapTimer = 0;
const perf = { ms: 0, frames: 0 };
let loopFailures = 0;
const _camDir = new THREE.Vector3();
const ORIGIN = new THREE.Vector3();
const gate = new FrameGate();
function frame(t) {
  requestAnimationFrame(frame);
  if (!gate.pass(t)) return; // fast displays: draw every other frame (see perf.js)
  try {
    step();
    loopFailures = 0;
  } catch (e) {
    loopFailures++;
    console.error(e);
    if (loopFailures === 1) reportProblem(`Something went wrong while drawing: ${e.message}`);
    if (loopFailures === 3 && quality === 'high') setQuality('low');
  }
}
// If the first seconds of drawing are slow, drop to the low graphics preset once.
const fpsProbe = { t: 0, frames: 0, done: false };
function watchFrameRate(dt) {
  if (fpsProbe.done || mode !== 'edit' || document.hidden || !window.__thumbsDone) return;
  fpsProbe.t += dt; fpsProbe.frames++;
  if (fpsProbe.t < 4) return;
  fpsProbe.done = true;
  const fps = fpsProbe.frames / fpsProbe.t;
  if (fps < 24 && quality === 'high') {
    setQuality('low');
    ui.toast(`Drawing at ${Math.round(fps)} frames a second, so Graphics is now low. Switch back in the menu.`);
  }
}
function step() {
  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  elapsed += dt;
  if (startedAt && now - startedAt > 2500) watchFrameRate(dt);
  if (playing) {
    const t = (state.data.time + dt * (24 / 120)) % 24; // a day every two minutes
    state.setSetting('time', t);
  }
  if (mode === 'edit') {
    editor.update(dt);
    focus.copy(editor.controls.target);
    const dir = camera.getWorldDirection(_camDir);
    ui.setCompass(Math.atan2(dir.x, -dir.z) * -1);
  } else {
    walker.update(dt);
    focus.copy(camera.position);
    mapTimer -= dt;
    if (mapTimer <= 0) { mapTimer = 0.1; drawMinimap(); }
  }
  world.update(dt, elapsed);
  editor.setGridStrength(env.dayFactor ?? 1);
  const night = env.nightFactor ?? 0;
  bloom.threshold = 1.0 + (1 - night) * 4.5;
  bloom.strength = 0.25 + night * 0.45;
  env.update(dt, elapsed, mode === 'walk' ? camera.position : focus);
  env.placeSun(ORIGIN);
  pool.update(world.lights, focus, dt, elapsed); // flags the shadow maps of lights that moved
  updateAmbience(mode === 'walk' ? camera.position : focus);
  if (world.needsShadow) {
    markShadows();
    world.needsShadow = false;
  }
  // while the day plays the sun creeps a fraction of a degree per frame; 30 shadow updates a second is plenty
  if (sunShadowDirty && (!playing || now - lastSunShadow > 30)) {
    env.sun.shadow.needsUpdate = true;
    sunShadowDirty = false;
    lastSunShadow = now;
  }
  const t0 = performance.now();
  composer.render();
  perf.ms = perf.ms * 0.9 + (performance.now() - t0) * 0.1;
  perf.frames++;
  statsTimer -= dt;
}

// ---------- ambience ----------
const WIND = { tundra: 0.95, highlands: 0.85, desert: 0.65, volcanic: 0.55, meadow: 0.35, forest: 0.3, swamp: 0.25, underdark: 0.12, void: 0.18, tabletop: 0.04 };
let ambTimer = 0;
function updateAmbience(listener) {
  ambTimer -= 1 / 60;
  if (ambTimer > 0) return;
  ambTimer = 0.2;
  const L = state.data.landscape;
  const [ci, cj] = worldToCell(listener.x, listener.z);
  // inside a walled space (a floored square) the wind drops and the halls drip
  const roofed = !!state.floorAt(ci, cj) && mode === 'walk';
  let nearest = Infinity;
  for (const s of world.lights) if (s.flicker >= 0.3) nearest = Math.min(nearest, s.pos.distanceTo(listener));
  const zoom = mode === 'walk' ? 1 : Math.max(0.15, 1 - (camera.position.distanceTo(editor.controls.target) - 30) / 200);
  const night = env.nightFactor ?? 0;
  audio.set({
    wind: (WIND[L] ?? 0.4) * (roofed ? 0.2 : 1),
    fire: Math.max(0, 1 - nearest / 26) * zoom,
    insects: ['meadow', 'forest', 'swamp'].includes(L) ? night * (roofed ? 0.15 : 1) : 0,
    drips: L === 'underdark' || L === 'void' ? 1 : roofed ? 0.5 : 0,
  });
}

// ---------- graphics problems ----------
let problemShown = false;
function reportProblem(msg) {
  if (problemShown) return;
  problemShown = true;
  const el = document.createElement('div');
  el.className = 'problem';
  el.setAttribute('role', 'alert');
  el.innerHTML = '<b>Graphics problem</b><span></span><button class="btn">Dismiss</button>';
  el.querySelector('span').textContent = msg;
  el.querySelector('button').onclick = () => { el.remove(); problemShown = false; };
  document.getElementById('ui').append(el);
}
let shaderFallbackDone = false;
renderer.debug.onShaderError = (gl, program, vs, fs) => {
  const log = (gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(program) || '').trim().split('\n')[0];
  console.error('Shader compile failed:', log);
  if (!shaderFallbackDone && quality === 'high') {
    shaderFallbackDone = true;
    setQuality('low');
    ui.toast('Your graphics card needed simpler lighting, so Graphics is now set to low.');
  } else {
    reportProblem(`This device could not build a shader (${log || 'no details'}). Try another browser, or update graphics drivers.`);
  }
};
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  reportProblem('The graphics card reset. The map is safe; it will redraw when the browser restores graphics, or reload the page.');
});
canvas.addEventListener('webglcontextrestored', () => { world.needsShadow = true; env.envDirty = true; });

// pick a light budget the GPU can actually compile
function gpuIsLimited() {
  const gl = renderer.getContext();
  const varyings = gl.getParameter(gl.MAX_VARYING_VECTORS);
  const units = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  const fragUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
  return varyings < 20 || units < 16 || fragUniforms < 512;
}

// ---------- boot ----------
async function boot() {
  ui.loadingText('Raising the landscape…');
  await new Promise((r) => setTimeout(r, 30));
  let initial = 'meadow';
  state.setSetting('landscape', initial);
  env.setStyle(initial);
  env.setTime(state.data.time);
  ui.setTime(state.data.time, false);
  env.setLightLevel(state.data.light ?? 1);
  ui.setLight(state.data.light ?? 1);
  ui.setLandscape(initial);
  ui.loadingText('Carving stone…');
  await new Promise((r) => setTimeout(r, 30));
  // phones and very small machines start low; everyone else is checked by the frame-rate probe
  let weak = (navigator.hardwareConcurrency || 8) <= 2 || /Mobi|Android/i.test(navigator.userAgent);
  try { weak = weak || gpuIsLimited(); } catch { /* keep the guess */ }
  if (weak) setQuality('low');
  onResize();
  startDungeon('blank');
  refreshStats();
  ui.setCut('full');
  requestAnimationFrame(frame);
  ui.doneLoading();
  ui.showStart();
  if (new URLSearchParams(location.search).has('nothumbs')) window.__thumbsDone = true;
  else renderThumbnails(112, (id, url) => ui.setThumb(id, url)).then(() => { window.__thumbsDone = true; });
  window.__df = { composer, bloom, step, toScreen: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [Math.round((v.x + 1) / 2 * window.innerWidth), Math.round((1 - v.y) / 2 * window.innerHeight)]; }, perf, state, world, env, editor, walker, camera, renderer, scene, pool, H, ui, startDungeon, enterWalk, exitWalk, LANDSCAPES };
}
boot();
