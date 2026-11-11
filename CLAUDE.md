# Dungeon Forge — notes for Claude Code

A browser 3D dungeon builder for tabletop RPGs: three.js 0.186 + Vite 8, plain ES modules, no framework, no external assets (every texture, model and sound is procedural). Player docs: `README.md`. Build, Tauri, file map and map format: `DEVELOPERS.md`. Read both before larger changes.

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:5173
pnpm build            # dist/
pnpm build:single     # dist-single/index.html, one self-contained file
pnpm build:artifact   # dist-single/artifact.html for the claude.ai artifact viewer
pnpm desktop          # Tauri dev window (needs Rust); desktop:build makes the Windows installer
```

There is no test runner, linter or type checker. Verify with `pnpm build` (must succeed with no errors) and by running the app.

## Architecture in one screen

- `config.js` grid: `CELL = 5` ft, `LEVEL = 2.5` ft (one height level), 64 × 48 squares, `WALL_H = 10`, `FLOOR_Y = 0.12`, `MAX_LEVEL = 12`. Cell (i, j) → world with `cellX/cellZ`, lines with `lineX/lineZ`.
- `state.js` is the single source of truth: `data = { floors, heights, edges, objects, ... }`. Mutate through its methods, call `state.checkpoint()` before a user action (undo) and `state.emit()` after. Never touch three.js objects to change the map.
- `world.js` rebuilds meshes from state on `emit`. Static geometry → `InstancedSet` batches (`geom.js`, `splitPrototype`). Nodes tagged `dyn(...)` in `models.js` (doors, lids, creatures, flames, pickups) stay separate so they can animate; `compactDynamic` merges their rigid children per material.
- `catalog.js` defines every piece (`id, cat, name, size, layer, light, gp, rise...`); `CATEGORIES` order = palette order. `models.js` has a builder per id.
- Edges: key `h:i:j` (north side of cell) / `v:i:j` (west side). Wide pieces store `{t, f, span}` on the anchor and `{t:'cover', a:anchorKey}` on the rest. `f` = wall material a door is framed in (must be a material name, e.g. `caveRock`, not a wall id).
- Heights: `data.heights["i,j"]` = integer level −12..12 (×`LEVEL`, 2.5 ft), 0 omitted. `heightmask.js` cuts holes in ground materials via `cutHoles(material)`; any new ground-like material needs it.
- Stairs: climb toward local −z. Rotation r: 0 north, 1 west, 2 south, 3 east. A flight rises from its own square's level by `rise` ft; `world.stairHeight(x, z)` gives walk height.
- `lights.js`: fixed pool of point lights (18 high / 8 low, 4 / 1 shadowed) reassigned to nearest flames, so shaders never recompile. Don't add `THREE.PointLight`s elsewhere.
- `environment.js`: landscapes (`LANDSCAPES`), sky, sun/moon, terrain, scatter, particles, void and tabletop set pieces.
- `editor.js` tools: view (default), place, select, height, room, erase, pick. `walk.js`: first-person mode, collision (`climbBlocked`, STEP 1.7 ft), jump, falling, input (keys, gamepad, touch); it asks `game.canStep()` before crossing into another square.
- `rules.js` + `game.js`: the turn-based game in walk mode. `rules.js` is data and dice only (`CLASSES`, `MONSTERS`); `game.js` runs turns through a small timed queue (`after(seconds, fn)`) and talks to the UI only through its `out` callbacks (wired in `main.js`). Walk-mode state lives in `world.js` and is wiped by `resetRuntime()`: `runtimePos` (where creatures walked to), `sprung`, `spotted`, `unlocked`, `openDoors`. The saved map is never changed by playing.
- Pausing: `Walker.exit()` hands a walk that is still going to `main.js` (`paused`) with `world.saveRuntime()`; the `Game` object simply keeps its state. `enterWalk(null, paused)` resumes through `world.restoreRuntime()`. Any `state.emit()` drops the paused walk, so never emit while one should survive.
- `adventure.js addAdventure(state)` places start, exit, lock, key and traps by flood-filling the walkable squares; it runs at the end of every sample builder except the hand-made crypt. `fx.js` is a fixed pool of additive balls (no allocation while playing); the game asks for effects through `out.fx(kind, data)` and `main.js gameFx` draws them, plus the floating numbers and foe health bars (DOM, projected each frame).
- Creatures (`creatures.js`): `biped()` builds the body, `arm()` an arm; the weapon arm is tagged `dyn(root, { arm: true })` and `world.creatureAttack(id)` swings it and lunges the body. See-through materials (wraith, ooze) are never merged, so keep their mesh count low.
- Game pieces are ordinary catalogue items with a flag: `start`, `exit`, `key`, `locked` (door), `trap: { dc, dmg, half, hidden, once }`. In a model, tag moving parts with `dyn(G(), { trap: 'spikes' | 'rune' })` or `{ trapMark: true }` (shown in walk mode only once spotted).
- `samples.js`: presets + random keep. Helpers `helpers()/levelHelpers()` take coordinates relative to an origin; wire new presets in `main.js startDungeon(kind)` and `ui.js` sample cards.
- `perf.js`: imported first in `main.js`; patches three's `lights_fragment_begin` chunk, render-order hints, `SHADOW_ONLY_LAYER`, `FrameGate`, `AutoScale` (Graphics: auto, resolution follows the frame rate; `main.js watchFrameRate/applyScale`). Shadows use per-light `shadow.needsUpdate`; after changing geometry set `world.needsShadow = true` (main calls `markShadows()`).

## Gotchas (learned the hard way)

- `scripts/make-artifact.mjs` must keep the inline script byte-for-byte. An earlier regex that stripped `<meta...>` also corrupted three's `<metalnessmap_pars_fragment>` include and blanked the app.
- Build the UI after handlers exist in `main.js` (init order bugs before).
- `-x ** 2` is a syntax error in JS; parenthesize.
- Call `camera.updateMatrixWorld()` before picking/projecting right after moving the camera.
- Materials are shared and cached (`mat(name)`); clone before per-instance changes.
- Two faces of different materials in the same plane flicker (z-fighting). Never end a trim, sill or inset flush with the surface it sits on: overlap or stand proud by at least 0.03 ft (`LIP` in `models.js`). In the editor the camera's near plane follows the viewing distance (`main.js step`), which keeps gaps that small stable when zoomed out; it does nothing for a gap of zero.
- Autosave key `dungeon-forge:autosave:v1` in localStorage; old maps without `heights` must keep loading.
- Keep the Move tool the default so touch drags never build.
- Squares are 5 ft wide and a height level is 2.5 ft: use `CELL` for anything across the floor and `LEVEL` for anything up or down, never one for the other. Models are real-sized; `FIT` in `catalog.js` re-sizes the ones first drawn for 3 ft squares. Maps saved before this change are not converted.
- The interface is parchment and ink: the last block of `style.css` redefines the colour variables for paper, and `.walkhud` restores the light-on-dark values because the play HUD sits over the 3D view. New editor UI must read on paper; new HUD parts go inside `.walkhud`.
- Wall and floor textures are painted in the last block of `textures.js` (`paintStone`: flat base, dark wash, dry-brushed lit edge) and override the plainer ones above it.
- Prefer plain, short user-facing text (toasts, hints), British-neutral English, "ft" units.

## Debugging hooks

- `?nothumbs` in the URL skips palette thumbnail rendering (fast startup for tests).
- `window.__df` exposes `state, world, env, editor, walker, game, camera, renderer, scene, pool, composer, H, ui, step, toScreen, startDungeon, beginWalk, enterWalk, exitWalk`. `__df.enterWalk('fighter')` starts a run without the class picker; `step()` in a tight loop has dt ≈ 0, so drive timed things with `walker.update(dt)` and `world.update(dt, t)`. E.g. `__df.H.start('ziggurat')`, `__df.renderer.info.render.calls`.
- Headless Chromium works with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (Playwright). It is a software GPU: screenshots fine, frame timings unreliable, thumbnails slow.

## Known open items

- Pit and terrace side walls (earth/rock column material) look flat; a stronger texture would help.
- Stair thumbnails render last-ish and slowly on weak GPUs.
- Cutaway clipping plane is absolute in height, so walls on raised ground may cut differently than expected.
- Frame cost was measured on an RTX 3060 laptop GPU only (crypt: about 3 ms a frame, mostly draw-call CPU time; GPU cost is per pixel). Never measured on an integrated GPU, the real target; `__df.auto` and `__df.gate` show what Graphics: auto is doing there.
- Flames batch by geometry + material uuid, so every flame must use the shared cones in `models.js flame()`; a flame with its own geometry becomes its own draw call.
