import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CELL, MAX_LEVEL, GRID_W, GRID_D, FLOOR_Y, WALL_H, cellX, cellZ, lineX, lineZ, worldToCell, inGrid } from './config.js';
import { byId } from './catalog.js';
import { footprint, edgeKey, edgeCenter } from './state.js';
import { furnishRoom } from './samples.js';
import { maskTexture, MASK_GLSL } from './heightmask.js';

const C_OK = new THREE.Color(0x5aa197);
const C_BAD = new THREE.Color(0xb4473b);
const C_ERASE = new THREE.Color(0xd0584a);
const C_LOWER = new THREE.Color(0xc98a4a);
const C_SET = new THREE.Color(0x8a9ad8);

function ghostMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x5aa197, emissive: 0x2a6a60, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.6 });
}

export class Editor {
  constructor({ camera, dom, scene, state, world, onHover, onToast, onPick }) {
    this.camera = camera;
    this.dom = dom;
    this.scene = scene;
    this.state = state;
    this.world = world;
    this.onHover = onHover || (() => {});
    this.onToast = onToast || (() => {});
    this.onPick = onPick || (() => {});
    this.enabled = true;
    this.tool = 'view'; // view (move the camera) | place | select | room | erase | pick
    this.item = null;
    this.rotation = 0;
    this.lastFloor = 'flagstone';
    this.lastWall = 'stoneWall';
    this.roomTheme = '';
    this.heightMode = 'raise'; // raise | lower | set
    this.heightLevel = 1;      // used by "set", in 3 ft levels
    this.drag = null;
    this.hover = null;
    this.keys = new Set();

    this.controls = new OrbitControls(camera, dom);
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.maxPolarAngle = 1.42;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 420;
    this.controls.screenSpacePanning = false;
    this.controls.zoomToCursor = true;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
    this.mouse = new THREE.Vector2();

    this.overlay = new THREE.Group();
    scene.add(this.overlay);
    this.buildGrid();
    this.ghostMat = ghostMaterial();
    this.ghost = null; // object ghost
    this.edgeGhosts = [];
    this.edgeGhostProto = null;
    this.rectMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x5aa197, transparent: true, opacity: 0.28, depthWrite: false }));
    this.rectMesh.rotation.x = -Math.PI / 2;
    this.rectMesh.renderOrder = 5;
    this.rectMesh.visible = false;
    this.overlay.add(this.rectMesh);
    const outline = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1));
    this.rectLine = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({ color: 0x9fe0d6, transparent: true, opacity: 0.9 }));
    this.rectLine.rotation.x = -Math.PI / 2;
    this.rectLine.visible = false;
    this.overlay.add(this.rectLine);
    this.cursor = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({ color: 0xe7dfcc, transparent: true, opacity: 0.85 }));
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.scale.set(CELL, CELL, 1);
    this.overlay.add(this.cursor);
    this.edgeMarker = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0xd0584a, transparent: true, opacity: 0.6, depthWrite: false }));
    this.edgeMarker.visible = false;
    this.overlay.add(this.edgeMarker);
    const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    selGeo.translate(0, 0.5, 0);
    this.selBox = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: 0xe2c07a, transparent: true, opacity: 0.95, depthTest: false }));
    this.selBox.renderOrder = 10;
    this.selBox.visible = false;
    this.overlay.add(this.selBox);
    this.selected = null;
    this.onSelect = () => {};

    this.bind();
  }

  buildGrid() {
    const pts = [];
    const y = FLOOR_Y + 0.025;
    for (let i = 0; i <= GRID_W; i++) pts.push(lineX(i), y, lineZ(0), lineX(i), y, lineZ(GRID_D));
    for (let j = 0; j <= GRID_D; j++) pts.push(lineX(0), y, lineZ(j), lineX(GRID_W), y, lineZ(j));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uCursor: { value: new THREE.Vector2(9999, 9999) }, uOpacity: { value: 0.1 }, uColor: { value: new THREE.Color(0xf0e6cc) }, uHeightMask: { value: maskTexture } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec2 uCursor; uniform float uOpacity; uniform vec3 uColor; varying vec3 vW;
        ${MASK_GLSL}
        void main(){
          // the flat grid steps aside wherever squares are raised or sunk
          float e = 0.06;
          if (heightMask(vW.xz + vec2(e, e), 1) + heightMask(vW.xz + vec2(-e, e), 1) + heightMask(vW.xz + vec2(e, -e), 1) + heightMask(vW.xz + vec2(-e, -e), 1) > 0.5) discard;
          float d = distance(vW.xz, uCursor); float near = 1.0 - smoothstep(6.0, 40.0, d);
          gl_FragColor = vec4(uColor, uOpacity * (0.45 + 2.2 * near)); }`,
    });
    this.grid = new THREE.LineSegments(g, this.gridMat);
    this.grid.renderOrder = 2;
    this.overlay.add(this.grid);
    // build-area border
    const b = [lineX(0), y, lineZ(0), lineX(GRID_W), y, lineZ(0), lineX(GRID_W), y, lineZ(0), lineX(GRID_W), y, lineZ(GRID_D), lineX(GRID_W), y, lineZ(GRID_D), lineX(0), y, lineZ(GRID_D), lineX(0), y, lineZ(GRID_D), lineX(0), y, lineZ(0)];
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(b, 3));
    this.border = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: 0xc9a35a, transparent: true, opacity: 0.6 }));
    this.overlay.add(this.border);
  }

  setGridVisible(v) { this.grid.visible = v; }
  setGridStrength(day) { this.gridMat.uniforms.uOpacity.value = 0.035 + day * 0.05; }

  setEnabled(on) {
    this.enabled = on;
    this.controls.enabled = on;
    this.overlay.visible = on;
    if (this.ghost) this.ghost.visible = on && !!this.hover;
    if (!on) this.cancelDrag();
  }

  // ---------- selection ----------
  select(id) {
    this.item = id ? byId[id] : null;
    if (this.item) {
      this.tool = 'place';
      this.applyToolControls();
      if (this.item.kind === 'floor') this.lastFloor = id;
      if (this.item.kind === 'edge' && !this.item.door && !this.item.framed) this.lastWall = id;
    }
    this.rebuildGhost();
  }

  // The Move tool hands left-drag and one-finger drag to the camera; every other tool builds with them.
  applyToolControls() {
    const view = this.tool === 'view';
    this.controls.mouseButtons.LEFT = view ? THREE.MOUSE.PAN : null;
    this.controls.touches.ONE = view ? THREE.TOUCH.PAN : null;
    this.dom.style.cursor = view ? 'grab' : 'crosshair';
  }

  setTool(t) {
    this.tool = t;
    this.applyToolControls();
    if (t !== 'select' && this.selected) { this.selected = null; this.onSelect(null); }
    if (t !== 'place') this.item = null;
    this.rebuildGhost();
    this.cancelDrag();
  }

  rebuildGhost() {
    if (this.ghost) { this.overlay.remove(this.ghost); this.ghost = null; }
    for (const g of this.edgeGhosts) this.overlay.remove(g);
    this.edgeGhosts = [];
    this.edgeGhostProto = null;
    const it = this.item;
    if (!it || it.kind === 'floor') return;
    const src = it.kind === 'edge' ? it.build('stoneWall') : it.build();
    src.traverse((o) => {
      if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; o.receiveShadow = false; }
    });
    if (it.kind === 'edge') { this.edgeGhostProto = src; return; }
    this.ghost = new THREE.Group();
    this.ghost.add(src);
    this.ghost.visible = false;
    this.overlay.add(this.ghost);
  }

  edgeGhost(n) {
    while (this.edgeGhosts.length < n) {
      const g = this.edgeGhostProto.clone(true);
      this.overlay.add(g);
      this.edgeGhosts.push(g);
    }
    this.edgeGhosts.forEach((g, k) => { g.visible = k < n; });
  }

  // ---------- picking ----------
  pickPoint(ev) {
    const r = this.dom.getBoundingClientRect();
    this.mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const p = new THREE.Vector3();
    const heights = this.state.data.heights;
    if (!heights || !Object.keys(heights).length) {
      if (!this.raycaster.ray.intersectPlane(this.plane, p)) return null;
      return p;
    }
    return this.marchToGround(this.raycaster.ray) || (this.raycaster.ray.intersectPlane(this.plane, p) ? p : null);
  }

  // Walk the ray down through the height range until it meets a square's top surface.
  marchToGround(ray) {
    let lo = 0, hi = 0;
    for (const v of Object.values(this.state.data.heights)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const yTop = hi * CELL + FLOOR_Y + 0.01, yBot = lo * CELL + FLOOR_Y - 0.01;
    const o = ray.origin, d = ray.direction;
    if (d.y >= -1e-4) return null;
    let t = o.y > yTop ? (yTop - o.y) / d.y : 0;
    const tEnd = (yBot - o.y) / d.y;
    const step = 0.4;
    const p = new THREE.Vector3();
    const groundAt = (x, z) => {
      const [i, j] = worldToCell(x, z);
      return (inGrid(i, j) ? this.state.topAt(i, j) : 0) + FLOOR_Y;
    };
    let prevT = t;
    for (; t <= tEnd + step; t += step) {
      p.copy(o).addScaledVector(d, t);
      const g = groundAt(p.x, p.z);
      if (p.y <= g) {
        // bisect between the last point above ground and this one
        let a = prevT, b = t;
        for (let k = 0; k < 8; k++) {
          const m = (a + b) / 2;
          p.copy(o).addScaledVector(d, m);
          if (p.y <= groundAt(p.x, p.z)) b = m; else a = m;
        }
        p.copy(o).addScaledVector(d, b);
        p.y = groundAt(p.x, p.z);
        return p;
      }
      prevT = t;
    }
    return null;
  }

  // top surface of a square, for previews
  topY(i, j) { return (inGrid(i, j) ? this.state.topAt(i, j) : 0) + FLOOR_Y; }
  rectTop(i0, j0, i1, j1) {
    let y = -Infinity;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) y = Math.max(y, this.topY(i, j));
    return Number.isFinite(y) ? y : FLOOR_Y;
  }

  nearestEdge(p) {
    const [i, j] = worldToCell(p.x, p.z);
    const fx = (p.x - lineX(i)) / CELL, fz = (p.z - lineZ(j)) / CELL;
    const opts = [
      [fz, 'h', i, j, 0],
      [1 - fz, 'h', i, j + 1, 2],
      [fx, 'v', i, j, 1],
      [1 - fx, 'v', i + 1, j, 3],
    ].sort((a, b) => a[0] - b[0]);
    const [dist, o, ei, ej, side] = opts[0];
    return { o, i: ei, j: ej, dist: dist * CELL, side };
  }

  // rotation for wall-mounted items: side 0=north 1=west 2=south 3=east of the cell
  autoMountRotation(p) {
    return this.nearestEdge(p).side;
  }

  wallSnapRotation(i, j) {
    // face away from an adjacent wall if there is one
    const checks = [['h', i, j, 0], ['v', i, j, 1], ['h', i, j + 1, 2], ['v', i + 1, j, 3]];
    for (const [o, a, b, r] of checks) if (this.state.edgeAt(o, a, b)) return r;
    return null;
  }

  // ---------- events ----------
  bind() {
    const el = this.dom;
    el.addEventListener('pointermove', (e) => this.onMove(e));
    el.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerleave', () => { this.hover = null; this.refreshPreview(); });
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  onMove(e) {
    if (!this.enabled) return;
    const p = this.pickPoint(e);
    this.hoverPoint = p;
    if (!p) { this.hover = null; this.refreshPreview(); return; }
    const [i, j] = worldToCell(p.x, p.z);
    this.hover = { i, j, p };
    this.gridMat.uniforms.uCursor.value.set(p.x, p.z);
    if (this.drag) {
      this.drag.cur = { i, j, p };
      if (this.tool === 'place' && this.item?.kind === 'obj') this.placeObjectAt(i, j, p);
      if (this.drag.move) this.moveSelected(this.drag);
    }
    this.refreshPreview();
    const info = this.describe(i, j);
    if (this.problem) info.problem = this.problem;
    this.onHover(info);
  }

  onDown(e) {
    if (!this.enabled || e.button !== 0) return;
    if (this.tool === 'view') { this.dom.style.cursor = 'grabbing'; return; }
    const p = this.pickPoint(e);
    if (!p) return;
    const [i, j] = worldToCell(p.x, p.z);
    if (e.altKey || this.tool === 'pick') { this.pickAt(i, j, p); return; }
    if (!this.item && this.tool === 'place') { this.onToast('Choose a piece from the palette on the left first.'); return; }
    if (this.tool === 'select') {
      const ob = this.topObjectAt(i, j);
      this.setSelected(ob ? ob.id : null);
      if (ob) {
        this.dom.setPointerCapture?.(e.pointerId);
        this.drag = { start: { i, j, p }, cur: { i, j, p }, move: { id: ob.id, i: ob.i, j: ob.j, moved: false } };
      }
      this.refreshPreview();
      return;
    }
    this.dom.setPointerCapture?.(e.pointerId);
    this.drag = { start: { i, j, p }, cur: { i, j, p }, placed: new Set() };
    if (this.tool === 'place' && this.item.kind === 'obj') {
      this.state.checkpoint();
      this.drag.dirty = false;
      this.placeObjectAt(i, j, p);
    }
    this.refreshPreview();
  }

  onUp(e) {
    if (this.tool === 'view' && this.enabled) this.dom.style.cursor = 'grab';
    if (!this.drag || e.button !== 0) return;
    const d = this.drag;
    this.drag = null;
    if (d.move) { if (d.move.moved) this.onToast(`Moved ${byId[this.selectedObj()?.t]?.name.toLowerCase() || 'piece'}.`); this.refreshPreview(); return; }
    if (this.tool === 'height') { this.commitHeight(d, e.shiftKey); this.refreshPreview(); return; }
    if (this.tool === 'erase') this.commitErase(d);
    else if (this.tool === 'room') this.commitRoom(d);
    else if (this.item?.kind === 'floor') this.commitFloors(d);
    else if (this.item?.kind === 'edge') this.commitEdges(d);
    else if (this.item?.kind === 'obj') { if (!d.dirty) this.state.undoStack.pop(); }
    this.refreshPreview();
  }

  cancelDrag() {
    this.drag = null;
    this.refreshPreview();
  }

  // ---------- previews ----------
  rect(d) {
    const a = d.start, b = d.cur;
    return [Math.max(0, Math.min(a.i, b.i)), Math.max(0, Math.min(a.j, b.j)), Math.min(GRID_W - 1, Math.max(a.i, b.i)), Math.min(GRID_D - 1, Math.max(a.j, b.j))];
  }

  showRect(i0, j0, i1, j1, color, y = this.rectTop(i0, j0, i1, j1) + 0.06) {
    const w = (i1 - i0 + 1) * CELL, dd = (j1 - j0 + 1) * CELL;
    const x = lineX(i0) + w / 2, z = lineZ(j0) + dd / 2;
    for (const m of [this.rectMesh, this.rectLine]) {
      m.position.set(x, y, z);
      m.scale.set(w, dd, 1);
      m.visible = true;
    }
    this.rectMesh.material.color.copy(color);
  }

  edgeLine(d) {
    const a = d.start.p, b = d.cur.p;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.hypot(dx, dz) < CELL * 0.6) {
      const e = this.nearestEdge(a);
      return [e];
    }
    const out = [];
    if (Math.abs(dx) >= Math.abs(dz)) {
      const j = Math.round(a.z / CELL + GRID_D / 2);
      const [i0] = worldToCell(Math.min(a.x, b.x), 0), [i1] = worldToCell(Math.max(a.x, b.x), 0);
      for (let i = i0; i <= i1; i++) out.push({ o: 'h', i, j });
    } else {
      const i = Math.round(a.x / CELL + GRID_W / 2);
      const [, j0] = worldToCell(0, Math.min(a.z, b.z)), [, j1] = worldToCell(0, Math.max(a.z, b.z));
      for (let j = j0; j <= j1; j++) out.push({ o: 'v', i, j });
    }
    return out.filter((e) => (e.o === 'h' ? e.i >= 0 && e.i < GRID_W && e.j >= 0 && e.j <= GRID_D : e.i >= 0 && e.i <= GRID_W && e.j >= 0 && e.j < GRID_D));
  }

  placeEdgeGhost(g, e, span = 1) {
    const [x, z] = edgeCenter(e.o, e.i, e.j, span);
    g.position.set(x, this.world.edgeBase(e.o, e.i, e.j, span), z);
    g.rotation.y = (e.o === 'h' ? 0 : Math.PI / 2) + (this.rotation % 2 && this.item?.kind === 'edge' ? Math.PI : 0);
  }

  // where wide pieces go: a click centres the piece on the pointed edge; a drag lays them end to end
  edgeTargets(d, h) {
    const span = this.item.span || 1;
    const edges = d ? this.edgeLine(d) : [this.nearestEdge(h.p)];
    if (span === 1) return edges;
    if (edges.length <= 1) {
      const e = edges[0];
      if (!e) return [];
      const sh = Math.floor((span - 1) / 2);
      return [e.o === 'h' ? { o: 'h', i: e.i - sh, j: e.j } : { o: 'v', i: e.i, j: e.j - sh }];
    }
    const out = [];
    for (let k = 0; k + span <= edges.length; k += span) out.push(edges[k]);
    return out.length ? out : [edges[0]];
  }

  objPlacement(i, j, p) {
    const it = this.item;
    let r = this.rotation;
    if (it.layer === 'wall') r = this.autoMountRotation(p);
    const [w, d] = footprint(it.id, r);
    const ai = i - Math.floor((w - 1) / 2), aj = j - Math.floor((d - 1) / 2);
    if (it.wallSnap && w === 1 && d === 1) {
      const ws = this.wallSnapRotation(ai, aj);
      if (ws !== null) r = ws;
    }
    return { i: ai, j: aj, r, w, d };
  }

  refreshPreview() {
    this.problem = null;
    this.updateSelBox();
    this.rectMesh.visible = this.rectLine.visible = false;
    this.edgeMarker.visible = false;
    if (this.ghost) this.ghost.visible = false;
    for (const g of this.edgeGhosts) g.visible = false;
    const h = this.hover;
    this.cursor.visible = !!h && inGrid(h?.i, h?.j);
    if (h) this.cursor.position.set(cellX(h.i), this.topY(h.i, h.j) + 0.05, cellZ(h.j));
    if (!h || !this.enabled) return;
    const d = this.drag;

    if (this.tool === 'view') { this.cursor.visible = false; return; }
    if (this.tool === 'height') {
      const [a, b, c, e] = d ? this.rect(d) : [h.i, h.j, h.i, h.j];
      const col = this.heightMode === 'lower' ? C_LOWER : this.heightMode === 'set' ? C_SET : C_OK;
      this.showRect(a, b, c, e, col);
      if (d) this.cursor.visible = false;
      return;
    }
    if (this.tool === 'select') return;
    if (this.tool === 'erase') {
      if (d) { const [a, b, c, e] = this.rect(d); this.showRect(a, b, c, e, C_ERASE); this.cursor.visible = false; }
      else {
        const e = this.nearestEdge(h.p);
        const anc = e.dist < 0.7 ? this.state.anchorOf(e.o, e.i, e.j) : null;
        if (anc) {
          const span = anc.e.span || 1;
          this.placeEdgeGhost(this.edgeMarker, anc, span);
          this.edgeMarker.scale.x = span;
          this.edgeMarker.position.y = 0.4;
          this.edgeMarker.visible = true;
        } else this.showRect(h.i, h.j, h.i, h.j, C_ERASE);
      }
      return;
    }
    if (this.tool === 'room') {
      if (d) { const [a, b, c, e] = this.rect(d); this.showRect(a, b, c, e, C_OK); this.cursor.visible = false; }
      return;
    }
    const it = this.item;
    if (!it) return;
    if (it.kind === 'floor') {
      if (d) { const [a, b, c, e] = this.rect(d); this.showRect(a, b, c, e, C_OK); this.cursor.visible = false; }
      else this.showRect(h.i, h.j, h.i, h.j, C_OK);
      return;
    }
    if (it.kind === 'edge') {
      const edges = this.edgeTargets(d, h);
      this.edgeGhost(edges.length);
      edges.forEach((e, k) => this.placeEdgeGhost(this.edgeGhosts[k], e, it.span || 1));
      this.ghostMat.color.copy(C_OK);
      return;
    }
    if (it.kind === 'obj' && this.ghost) {
      const pl = this.objPlacement(h.i, h.j, h.p);
      const ok = this.state.canPlace(it.id, pl.i, pl.j, pl.r);
      const x = lineX(pl.i) + (pl.w * CELL) / 2, z = lineZ(pl.j) + (pl.d * CELL) / 2;
      let y = this.world.floorTop(pl.i, pl.j);
      if (it.layer === 'item') {
        const under = this.state.objectAt(pl.i, pl.j, 'ground');
        if (under && byId[under.t].surface) y += byId[under.t].surface;
      }
      this.ghost.position.set(x, y + 0.02, z);
      this.ghost.rotation.y = pl.r * (Math.PI / 2);
      this.ghost.visible = true;
      this.ghostMat.color.copy(ok ? C_OK : C_BAD);
      this.ghostMat.emissive.copy(ok ? C_OK : C_BAD).multiplyScalar(0.5);
      this.showRect(pl.i, pl.j, pl.i + pl.w - 1, pl.j + pl.d - 1, ok ? C_OK : C_BAD);
      this.problem = ok ? null : this.state.placeProblem(it.id, pl.i, pl.j, pl.r);
      this.cursor.visible = false;
    }
  }

  // ---------- commits ----------
  commitFloors(d) {
    const [i0, j0, i1, j1] = this.rect(d);
    this.state.checkpoint();
    let n = 0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (this.state.setFloor(i, j, this.item.id)) n++;
      // liquids and pits displace furniture
      if (this.item.liquid || this.item.pit) for (const o of this.state.objectsAt(i, j)) if (['ground', 'rug'].includes(byId[o.t].layer)) this.state.removeObject(o.id);
    }
    if (n) this.state.emit(); else this.state.undoStack.pop();
  }

  commitEdges(d) {
    const it = this.item;
    const span = it.span || 1;
    const edges = d.cur && (d.cur.i !== d.start.i || d.cur.j !== d.start.j || span === 1) ? this.edgeTargets(d) : this.edgeTargets(null, d.start);
    this.state.checkpoint();
    let n = 0;
    for (const e of edges) {
      // a door or window takes the material of the wall it replaces
      const mid = e.o === 'h' ? [e.o, e.i + Math.floor(span / 2), e.j] : [e.o, e.i, e.j + Math.floor(span / 2)];
      const cur = this.state.edgeAt(...mid) || this.state.edgeAt(e.o, e.i, e.j);
      const val = { t: it.id };
      if (this.rotation % 2) val.flip = true;
      if (it.framed) {
        const curIt = cur && byId[cur.t];
        val.f = it.fixedFrame || (curIt ? curIt.frame || cur.f || 'stoneWall' : this.neighbourFrame(e, span) || 'stoneWall');
      }
      const ok = span > 1 ? this.state.setWideEdge(e.o, e.i, e.j, val, span) : this.state.setEdge(e.o, e.i, e.j, val);
      if (ok) n++;
    }
    if (n) this.state.emit();
    else {
      this.state.undoStack.pop();
      if (span > 1 && edges.length) this.onToast(`${it.name} needs ${span * 3} ft of wall line inside the build area.`);
    }
  }

  commitHeight(d, invert = false) {
    const [i0, j0, i1, j1] = this.rect(d);
    let mode = this.heightMode;
    if (invert && mode !== 'set') mode = mode === 'raise' ? 'lower' : 'raise';
    this.state.checkpoint();
    let n = 0, capped = 0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const cur = this.state.levelAt(i, j);
      const want = mode === 'raise' ? cur + 1 : mode === 'lower' ? cur - 1 : this.heightLevel;
      if (Math.abs(want) > MAX_LEVEL) { capped++; continue; }
      if (this.state.setLevel(i, j, want)) n++;
    }
    if (!n) {
      this.state.undoStack.pop();
      if (capped) this.onToast(`Squares go no higher than ${MAX_LEVEL * CELL} ft or deeper than ${MAX_LEVEL * CELL} ft.`);
      return;
    }
    this.state.emit();
    const sq = n === 1 ? '1 square' : `${n} squares`;
    const ft = (l) => (l > 0 ? `${l * CELL} ft up` : l < 0 ? `${-l * CELL} ft down` : 'ground level');
    if (mode === 'set') this.onToast(`Set ${sq} to ${ft(this.heightLevel)}.`);
    else this.onToast(`${mode === 'raise' ? 'Raised' : 'Lowered'} ${sq} by 3 ft${n === 1 ? ` (now ${ft(this.state.levelAt(i0, j0))})` : ''}.`);
  }

  neighbourFrame(e, span = 1) {
    const cand = e.o === 'h' ? [['h', e.i - 1, e.j], ['h', e.i + span, e.j]] : [['v', e.i, e.j - 1], ['v', e.i, e.j + span]];
    for (const [o, i, j] of cand) {
      const n = this.state.edgeAt(o, i, j);
      if (n) { const nit = byId[n.t]; return nit.frame || n.f; }
    }
    return null;
  }

  placeObjectAt(i, j, p) {
    const pl = this.objPlacement(i, j, p);
    const key = `${pl.i},${pl.j},${pl.r}`;
    if (this.drag.placed.has(key)) return;
    const ob = this.state.addObject(this.item.id, pl.i, pl.j, pl.r);
    if (ob) {
      this.drag.placed.add(key);
      this.drag.dirty = true;
      this.state.emit();
    } else if (!this.drag.dirty && !this.drag.warned) {
      this.drag.warned = true;
      this.onToast(this.state.placeProblem(this.item.id, pl.i, pl.j, pl.r) || 'That piece does not fit there.');
    }
  }

  commitRoom(d) {
    const [i0, j0, i1, j1] = this.rect(d);
    if (i1 - i0 < 1 || j1 - j0 < 1) { this.onToast('Drag out a room at least 2 squares on each side.'); return; }
    this.state.checkpoint();
    const floor = this.lastFloor, wall = this.lastWall;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.state.setFloor(i, j, floor);
    const setW = (o, i, j) => {
      const cur = this.state.edgeAt(o, i, j);
      if (cur && byId[cur.t].framed) return; // keep doors
      this.state.setEdge(o, i, j, { t: wall });
    };
    for (let i = i0; i <= i1; i++) { setW('h', i, j0); setW('h', i, j1 + 1); }
    for (let j = j0; j <= j1; j++) { setW('v', i0, j); setW('v', i1 + 1, j); }
    // clear interior walls
    for (let i = i0; i <= i1; i++) for (let j = j0 + 1; j <= j1; j++) this.state.setEdge('h', i, j, null);
    for (let i = i0 + 1; i <= i1; i++) for (let j = j0; j <= j1; j++) this.state.setEdge('v', i, j, null);
    const wft = (i1 - i0 + 1) * CELL, dft = (j1 - j0 + 1) * CELL;
    if (this.roomTheme) {
      // a door in the middle of the south wall unless the room already has one
      let hasDoor = false;
      for (let i = i0; i <= i1; i++) for (const j of [j0, j1 + 1]) if (byId[this.state.edgeAt('h', i, j)?.t]?.framed) hasDoor = true;
      for (let j = j0; j <= j1; j++) for (const i of [i0, i1 + 1]) if (byId[this.state.edgeAt('v', i, j)?.t]?.framed) hasDoor = true;
      if (!hasDoor) this.state.setEdge('h', Math.floor((i0 + i1) / 2), j1 + 1, { t: 'woodDoor', f: byId[wall].frame || 'stoneWall' });
      furnishRoom(this.state, [i0, j0, i1, j1], this.roomTheme);
      this.state.emit();
      this.onToast(`Furnished room built: ${wft} × ${dft} ft.`);
      return;
    }
    this.state.emit();
    this.onToast(`Room built: ${wft} × ${dft} ft. Add a door with the Doors tab.`);
  }

  commitErase(d) {
    const [i0, j0, i1, j1] = this.rect(d);
    const single = i0 === i1 && j0 === j1;
    this.state.checkpoint();
    let changed = false;
    if (single) {
      const p = d.start.p;
      const e = this.nearestEdge(p);
      if (e.dist < 0.7 && this.state.edgeAt(e.o, e.i, e.j)) {
        changed = this.state.setEdge(e.o, e.i, e.j, null);
      } else {
        const order = ['item', 'ceiling', 'wall', 'ground', 'rug'];
        const here = this.state.objectsAt(i0, j0);
        let target = null;
        for (const L of order) { target = here.find((o) => byId[o.t].layer === L); if (target) break; }
        if (target) changed = this.state.removeObject(target.id);
        else changed = this.state.setFloor(i0, j0, null) || this.state.setLevel(i0, j0, 0); // bare raised ground flattens last
      }
    } else {
      for (const o of [...this.state.data.objects]) {
        const [w, dd] = footprint(o.t, o.r);
        if (o.i >= i0 && o.j >= j0 && o.i + w - 1 <= i1 && o.j + dd - 1 <= j1) changed = this.state.removeObject(o.id) || changed;
      }
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        changed = this.state.setFloor(i, j, null) || changed;
        changed = this.state.setLevel(i, j, 0) || changed;
      }
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1 + 1; j++) changed = this.state.setEdge('h', i, j, null) || changed;
      for (let i = i0; i <= i1 + 1; i++) for (let j = j0; j <= j1; j++) changed = this.state.setEdge('v', i, j, null) || changed;
    }
    if (changed) this.state.emit(); else this.state.undoStack.pop();
  }

  pickAt(i, j, p) {
    const e = this.nearestEdge(p);
    let id = null;
    if (e.dist < 0.7 && this.state.edgeAt(e.o, e.i, e.j)) id = this.state.edgeAt(e.o, e.i, e.j).t;
    else {
      const order = ['item', 'ceiling', 'wall', 'ground', 'rug'];
      const here = this.state.objectsAt(i, j);
      for (const L of order) { const o = here.find((x) => byId[x.t].layer === L); if (o) { id = o.t; this.rotation = o.r; break; } }
      if (!id) id = this.state.floorAt(i, j);
    }
    if (id) { this.onPick(id); }
  }

  describe(i, j) {
    if (!inGrid(i, j)) return { text: 'Outside the build area', i, j };
    const parts = [];
    const lv = this.state.levelAt(i, j);
    if (lv) parts.push(lv > 0 ? `${lv * CELL} ft up` : `${-lv * CELL} ft down`);
    const f = this.state.floorAt(i, j);
    if (f) parts.push(byId[f].name);
    for (const o of this.state.objectsAt(i, j)) parts.push(byId[o.t].name);
    return { i, j, text: parts.join(', ') };
  }

  rotate(dir = 1) {
    if (this.tool === 'select' && this.selected) { this.rotateSelected(dir); return; }
    this.rotation = (this.rotation + dir + 4) % 4;
    this.refreshPreview();
  }

  // ---------- selection (Move tool) ----------
  topObjectAt(i, j) {
    const here = this.state.objectsAt(i, j);
    for (const L of ['item', 'ceiling', 'wall', 'ground', 'rug']) {
      const o = here.find((x) => byId[x.t].layer === L);
      if (o) return o;
    }
    return null;
  }
  selectedObj() { return this.state.data.objects.find((o) => o.id === this.selected) || null; }
  setSelected(id) {
    this.selected = id;
    this.onSelect(this.selectedObj());
    this.refreshPreview();
  }
  moveSelected(d) {
    const ob = this.selectedObj();
    if (!ob) return;
    const ni = d.move.i + (d.cur.i - d.start.i), nj = d.move.j + (d.cur.j - d.start.j);
    if (ni === ob.i && nj === ob.j) return;
    if (this.state.placeProblem(ob.t, ni, nj, ob.r, ob.id)) return;
    if (!d.move.moved) { this.state.checkpoint(); d.move.moved = true; }
    ob.i = ni; ob.j = nj;
    this.state.emit();
  }
  rotateSelected(dir) {
    const ob = this.selectedObj();
    if (!ob) return;
    for (let k = 1; k <= 3; k++) {
      const r = (ob.r + dir * k + 8) % 4;
      if (!this.state.placeProblem(ob.t, ob.i, ob.j, r, ob.id)) {
        this.state.checkpoint();
        ob.r = r;
        this.state.emit();
        return;
      }
    }
    this.onToast('There is no room to turn it here.');
  }
  duplicateSelected() {
    const ob = this.selectedObj();
    if (!ob) return false;
    const [w, d] = footprint(ob.t, ob.r);
    const tries = [[w, 0], [0, d], [-w, 0], [0, -d], [w, d], [-w, -d], [w, -d], [-w, d]];
    for (const [di, dj] of tries) {
      if (!this.state.placeProblem(ob.t, ob.i + di, ob.j + dj, ob.r)) {
        this.state.checkpoint();
        const copy = this.state.addObject(ob.t, ob.i + di, ob.j + dj, ob.r);
        this.state.emit();
        this.setSelected(copy.id);
        return true;
      }
    }
    this.onToast('No free space next to it for a copy.');
    return false;
  }
  deleteSelected() {
    const ob = this.selectedObj();
    if (!ob) return false;
    this.state.checkpoint();
    this.state.removeObject(ob.id);
    this.setSelected(null);
    this.state.emit();
    return true;
  }
  updateSelBox() {
    const ob = this.tool === 'select' ? this.selectedObj() : null;
    if (!ob) { this.selBox.visible = false; if (this.selected && !ob && this.tool === 'select') { this.selected = null; this.onSelect(null); } return; }
    const [w, d] = footprint(ob.t, ob.r);
    const L = byId[ob.t].layer;
    const y = L === 'ceiling' ? WALL_H - 3.5 : L === 'wall' ? 4.5 : 0.05;
    const h = L === 'rug' ? 0.4 : L === 'item' ? 1.6 : 3.4;
    this.selBox.position.set(lineX(ob.i) + (w * CELL) / 2, y, lineZ(ob.j) + (d * CELL) / 2);
    this.selBox.scale.set(w * CELL + 0.2, h, d * CELL + 0.2);
    this.selBox.visible = true;
  }

  update(dt) {
    if (!this.enabled) return;
    // keyboard panning
    const k = this.keys;
    const f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    f.y = 0; f.normalize();
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const mv = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) mv.add(f);
    if (k.has('KeyS') || k.has('ArrowDown')) mv.sub(f);
    if (k.has('KeyD') || k.has('ArrowRight')) mv.add(r);
    if (k.has('KeyA') || k.has('ArrowLeft')) mv.sub(r);
    if (mv.lengthSq() > 0) {
      const dist = this.camera.position.distanceTo(this.controls.target);
      mv.normalize().multiplyScalar(dt * Math.max(30, dist * 0.9) * (k.has('ShiftLeft') ? 2.2 : 1));
      this.camera.position.add(mv);
      this.controls.target.add(mv);
    }
    if (k.has('KeyQ') || k.has('KeyE')) {
      const ang = (k.has('KeyQ') ? 1 : -1) * dt * 1.4;
      const off = this.camera.position.clone().sub(this.controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      this.camera.position.copy(this.controls.target).add(off);
    }
    const t = this.controls.target;
    const lim = (v, a) => Math.max(-a, Math.min(a, v));
    const nx = lim(t.x, GRID_W * CELL * 0.75), nz = lim(t.z, GRID_D * CELL * 0.75);
    if (nx !== t.x || nz !== t.z) { this.camera.position.x += nx - t.x; this.camera.position.z += nz - t.z; t.x = nx; t.z = nz; }
    t.y = 0;
    this.controls.update();
  }
}

export { WALL_H, edgeKey };
