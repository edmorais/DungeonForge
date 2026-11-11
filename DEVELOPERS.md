# Dungeon Forge: developer notes

How to build and package Dungeon Forge, how the code is organised, and the map file format. For what the app does and how to use it, see [README.md](README.md).

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm build          # static site in dist/
pnpm build:single   # one self-contained HTML file in dist-single/
pnpm build:artifact # that file reshaped for the claude.ai artifact viewer (dist-single/artifact.html)
pnpm desktop        # the game as a Windows/macOS/Linux desktop app (see Windows app below)
pnpm preview        # serve the dist/ build
```

Requires Node 18+ and pnpm. The only runtime dependency is `three`.

## Windows app (Tauri)

The same game can ship as a small Windows program. [Tauri](https://v2.tauri.app) opens the built game in a native window using WebView2, the browser engine built into Windows 10 and 11, so the app is a few MB rather than the ~100 MB of an Electron app. In the app, *Export this map*, *Download picture* and the battle map open a normal Windows Save dialog.

The Tauri project lives in `src-tauri/`:

| File | Role |
| --- | --- |
| `tauri.conf.json` | App name, window size (1440 × 900, minimum 1000 × 640), installer settings |
| `capabilities/default.json` | What the page may do: open a Save dialog and write the file the player picks (nothing else on disk) |
| `src/lib.rs`, `src/main.rs` | Starts the window with the dialog and file plugins |
| `icons/` | App icons, made from `app-icon.png` with `pnpm tauri icon app-icon.png` |

### Option A: let GitHub build it (no Rust needed)

1. Put the project in a GitHub repository.
2. Open the repository's **Actions** tab, pick **Windows app**, and press **Run workflow**. Pushing a tag such as `v1.0.0` also starts it.
3. When the run finishes (about 10 minutes the first time), download **dungeon-forge-windows** from the run's *Artifacts*. It holds the installer (`Dungeon Forge_1.0.0_x64-setup.exe`), an `.msi`, and the plain `dungeon-forge.exe`.

### Option B: build it on your Windows PC

One-time setup:

1. Install **Microsoft C++ Build Tools** from visualstudio.microsoft.com/visual-cpp-build-tools and tick **Desktop development with C++**.
2. Install **Rust** with `rustup-init.exe` from rustup.rs and keep the default (MSVC) choices.
3. Install **Node.js 18 or newer**, then run `corepack enable` to get pnpm.
4. WebView2 is already part of Windows 10 and 11, so there is nothing to install for it.

Then, in the project folder:

```bash
pnpm install
pnpm desktop          # opens the game in a desktop window; edits reload live
pnpm desktop:build    # makes the installer and the exe
```

The first build compiles a few hundred Rust crates and takes several minutes; later builds are much faster. The results are in `src-tauri/target/release/`:

- `dungeon-forge.exe`: runs on its own on any PC with WebView2.
- `bundle/nsis/Dungeon Forge_1.0.0_x64-setup.exe`: an installer that adds a Start menu entry and installs WebView2 if a PC lacks it.
- `bundle/msi/Dungeon Forge_1.0.0_x64_en-US.msi`: the same as an MSI package, for managed PCs.

### Good to know

- **SmartScreen warning.** Windows warns about apps that are not code-signed. Players click **More info → Run anyway**. Removing the warning needs a code-signing certificate.
- **Saves are separate.** The app keeps its own autosave, apart from any browser. Use *Export this map* and *Import a map* to move maps between them.
- **Fonts.** The interface fonts load from Google Fonts. With no internet connection the app falls back to system fonts and works the same.
- **Version number.** Change it in `src-tauri/tauri.conf.json` (`version`) before building a new release.

## How it is built

| File | Role |
| --- | --- |
| `src/config.js` | Grid constants (3 ft squares, 10 ft walls) and grid-to-world helpers |
| `src/textures.js` | Canvas-painted textures (flagstone, cobble, planks, marble, brick, rock, lava…) with matching bump maps |
| `src/materials.js` | Shared materials; structural materials carry the cutaway clipping plane |
| `src/models.js` | Procedural builders for every piece |
| `src/catalog.js` | The palette: names, categories, footprints, layers, lights, gold values |
| `src/state.js` | Map data, placement rules, undo/redo, save format |
| `src/world.js` | Turns map data into instanced meshes, including the blocks under raised and sunken squares. Doors, lids and flames are animated separately |
| `src/perf.js` | GPU savings that leave the picture unchanged: the point-light shader branch, draw-order hints, the shadow-only layer and the frame gate for fast displays |
| `src/heightmask.js` | A one-texel-per-square mask that opens holes in terrain, water and table surfaces over sunken squares |
| `src/lights.js` | A fixed pool of point lights (4 with shadows) reassigned to the nearest flames, so shaders never recompile |
| `src/environment.js` | Sky, sun and moon, landscapes, terrain, scattered vegetation and weather particles |
| `src/editor.js` | Camera, grid, ghost previews and the editing tools |
| `src/walk.js` | First-person movement, jumping, collision, what the walker aims at, and input (keyboard and mouse, gamepad, touch) |
| `src/rules.js` | Tabletop rules as plain data and dice: the four hero classes, creature stats, attack and saving rolls. Change the balance here |
| `src/game.js` | The game played in walk mode: noticing, initiative, turns, creature path-finding and attacks, traps, keys, the exit and the end-of-run summary |
| `src/samples.js` | The sample maps, the random keep generator and themed room furnishing |
| `src/audio.js` | Procedural ambience and sound effects (Web Audio) |
| `src/desktop.js` | Native Save dialog when running as the desktop app |
| `scripts/make-artifact.mjs` | Packages the single-file build for the artifact viewer without touching the script |
| `src/ui.js`, `src/style.css` | Interface |

### Performance notes

- Static geometry is merged per material and drawn with `InstancedMesh`. Moving parts (doors, lids, creatures) merge their rigid pieces per material too, and all flames of one colour draw as a single instanced batch (every flame shares two cone geometries and takes its size from the mesh scale). Mirrored parts, such as the second leaf of a double door, merge too, with their triangles turned. The crypt sample went from about 660 to 305 draw calls.
- Shadow maps re-render per light and only when that light's view changes: the sun when the hour or the landscape changes (at most 30 times a second while the day plays), a pooled torch light only when it moves to another flame, and every light after an edit or a door moving.
- Plants and rocks cast the sun's shadow from a copy cut into patches of land on a layer only the sun's shadow camera sees. The shadow map covers only the site, so it skips nearly all of them (the crypt's shadow pass fell from about 3.2 million triangles to under 0.3 million). The camera still draws them as one batch per part.
- Point lights are skipped per pixel beyond their range (`src/perf.js` patches three.js's light loop with a branch; the image is unchanged because those lights contribute exactly zero there).
- The sky (scattering and clouds) draws after everything opaque, and the terrain, lava and table after the dungeon and plants, so the depth test rejects hidden pixels before they are shaded.
- On 120 Hz and faster displays the app draws every second (or fourth) frame, giving 60 to 80 evenly paced frames a second. Displays up to 100 Hz draw every frame.
- Point-light shadows render dungeon geometry only. The landscape is excluded through render layers.
- **Graphics: auto** (menu, the default) changes the drawing resolution to follow the frame rate (`AutoScale` in `src/perf.js`). Two slow seconds in a row step it down (100, 85, 72, 60, 50 % of full, bloom off below 65 %); a calm stretch tries one step back up, and waits twice as long next time if that step was too much. If the lowest step is still below 24 frames a second it switches to the low preset; if the lower resolution gained nothing (the CPU or a capped display is the limit) it returns to full resolution and stops trying until the next map or walk. *Download picture* always draws at full resolution.
- **Graphics: high** keeps full resolution and never changes by itself. **Graphics: low** uses 8 lights, 1 shadowed light, no bloom and pixel ratio 1. Auto starts from the low preset on phones, on machines with 2 or fewer CPU cores and on GPUs with small shader limits, and any setting falls back to it when a shader fails to compile.
- Measured on an RTX 3060 laptop GPU at 1024 × 768: a frame of the crypt costs about 3 ms, nearly all of it CPU time submitting draw calls; game logic is under 0.3 ms. The GPU cost is per pixel, about 0.5 ms per megapixel in the editor and two to three times that in first person, which is what an integrated GPU runs out of first. It was not measured on an integrated GPU.
- Drawing errors and GPU resets show a visible message instead of a frozen canvas.

### Map file format

```json
{
  "v": 1, "name": "The sunken crypt", "landscape": "swamp", "time": 19.4, "light": 1,
  "floors":  { "12,14": "flagstone" },
  "heights": { "12,14": 2, "13,14": -3 },
  "edges":   { "h:32:34": { "t": "doubleDoor", "f": "stoneWall" },
               "h:12:20": { "t": "greatDoors", "f": "stoneWall", "span": 2 } },
  "objects": [ { "id": 1, "t": "throne", "i": 31, "j": 23, "r": 0 } ]
}
```

- **`floors`**: keyed by square `i,j`.
- **`heights`**: keyed by square `i,j`, in whole 3 ft levels from -10 to 10. Squares at ground level are left out. Older maps without it load flat.
- **`edges`**: keyed by `h:i:j`, a horizontal line at the north side of square (i, j), or `v:i:j`, a vertical line at its west side. `f` is the wall material a door is set into. A wide piece is stored on its first line with `span`; the lines it also covers hold a `cover` entry pointing back to it.
- **`objects`**: each has an anchor square `i, j` and a rotation `r` in quarter turns.
