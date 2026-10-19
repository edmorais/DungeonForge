# Dungeon Forge

**Build a fantasy dungeon square by square, set the land and the hour around it, then walk its halls yourself.**

Dungeon Forge is a 3D map maker for tabletop role-playing games and anyone who likes building things. Everything snaps to a grid of 3 ft squares, the scale most tabletop games use. Lay out floors and walls, hang doors, light torches, furnish rooms and hide treasure (and a few monsters). Then set the landscape, choose the hour and the light, and step inside in first person. When you are done, export a top-down battle map for your virtual tabletop.

It runs in your web browser. Try it at <https://edmorais.github.io/DungeonForge/> !

You can also get a standalone Windows (x64) app from the releases page.

Made with Claude Opus 5.5.

---

## Contents

- [What you can make](#what-you-can-make)
- [Getting started](#getting-started)
- [The screen at a glance](#the-screen-at-a-glance)
- [Moving the camera](#moving-the-camera)
- [Building](#building)
- [Raising and sinking the ground](#raising-and-sinking-the-ground)
- [Stairs](#stairs)
- [Setting the scene](#setting-the-scene)
- [Walking through your dungeon](#walking-through-your-dungeon)
- [Saving, sharing and battle maps](#saving-sharing-and-battle-maps)
- [Keyboard, mouse and touch reference](#keyboard-mouse-and-touch-reference)
- [Tips and troubleshooting](#tips-and-troubleshooting)

---

## What you can make

- **Dungeons, keeps, camps, ruins and caves** on a site of 192 × 144 ft (64 × 48 squares).
- **125 pieces in ten groups.**

  | Group | Examples |
  | --- | --- |
  | Floors | Flagstones, cobblestones, wood planks, checkered marble, mossy stone, packed earth, grass, sand, snow, shallow water, lava, pits |
  | Walls | Stone, brick, cave rock, fortress, palisade, ruined and low walls, hedges, fences, bars, colonnades, great windows |
  | Doors | Wooden, iron-bound and double doors, portcullis, archways, great doors, castle and palisade gates, secret doors, windows, stained glass |
  | Stairs | Steps, stone stairs, long stairs, grand stairs, wooden stairs, a spiral stair, an earth ramp |
  | Lights | Wall torches, braziers, spirit braziers, candelabras, candles, chandeliers, lanterns, campfires, glowing crystals and mushrooms |
  | Furniture | Tables, chairs, beds, bookshelves, a throne, an altar, an alchemy bench, a forge, barrels, crates, a well, a fountain, tents |
  | Dressing | Rugs, banners, shields, pillars, statues, sarcophagi, trapdoors, spikes, cages, bones, cobwebs |
  | Loot | Chests, an ornate chest, a mimic, coins, gems, potions, an idol, a crown, a sword, a dragon's hoard |
  | Wilds | Oaks, pines, dead trees, palms, cacti, boulders, rocks, bushes, reeds, flowers, mushrooms, standing stones, graves |
  | Creatures | Skeleton, goblin, orc, cultist, wraith, ooze cube, giant spider, ogre and a young dragon |

- **Raised and sunken ground**: platforms, terraces, pits and cellars from 30 ft up to 30 ft down, joined by stairs.
- **Ten settings around your map**: verdant meadow, dark forest, desert dunes, frozen tundra, volcanic wastes, haunted swamp, mountain highlands, the Underdark cavern, a dark void, or a gaming table where your dungeon is a model beside dice and a character sheet.
- **Any hour of the day**, with a real sky, sun, moon and stars, and moving shadows.
- **A first-person walk** through what you built, with doors to open, chests to loot and monsters that fight back.
- **Battle maps**: top-down pictures of your map, ready for a virtual tabletop.

---

## Getting started

1. **Open Dungeon Forge** in a recent version of Chrome, Edge, Firefox or Safari. It needs a browser with WebGL 2, which almost all browsers from the last few years have. If you have the Windows app, start it like any other program.
2. **Choose how to start** on the welcome screen:
   - **Empty site**: a blank grid. You build everything.
   - **Random keep**: a new walled keep every time, already split into rooms with doors, furniture, loot and monsters.
   - **A finished map**: eight hand-made examples to explore or take apart:

     | Map | What it shows |
     | --- | --- |
     | Ziggurat of the Dawn Sun | A stepped temple rising 24 ft from the desert, with a stair up every face |
     | The Deepdelve Mine | A yard in the hills, then tunnels 9, 15 and 24 ft down to a forge over lava |
     | Sunken Arena of Varn | Seating tiers stepping 12 ft down to a sand floor, with a royal box |
     | Spires of the Pale Lich | Stone platforms in the dark void, climbing to a spire 30 ft up |
     | Watchtower on the Grey Crag | Snowy terraces up to a tower, with a spider's cave below |
     | The sunken crypt | A keep with a throne hall, chapel, library, prison and a hidden vault |
     | Bandit camp | A palisade fort in the forest with tents, a campfire and stolen loot |
     | Drowned shrine | Ruined columns and a fountain on a desert dune at dusk |

3. **Look around.** Drag to slide the view, right-drag to turn it, scroll to zoom.
4. **Build something.** Click a piece in the palette on the left, then click the map to place it. Press **Esc** when you are done.
5. **Walk through it.** Press **Walk through** (or **V**), click once to look around with the mouse, and use **W A S D** to move. Press **Esc** to come back.

Your work is saved in the browser as you go. Next time, choose **Continue where you left off** on the welcome screen. To see the welcome screen again, press **N** or choose **New dungeon…** in the ☰ menu.

> **Tip:** Press **?** at any time for the full list of controls.

---

## The screen at a glance

**Top bar, left to right**

| Control | What it does |
| --- | --- |
| Dungeon name | Click to rename your map. The name is used for exported files. |
| Landscape | The setting around your map (see [Setting the scene](#setting-the-scene)). |
| Time dial | Drag to set the hour. The sky, sun and shadows follow. |
| ▶ | Lets time pass: a full day in two minutes. |
| ☀ slider | Overall light, from 0% (only flames light the map) to 200%. |
| Walls | Cuts walls down to full height, 6 ft or 3 ft so you can see into rooms. |
| # | Shows or hides the grid. |
| ♪ | Sound on or off. |
| ↶ ↷ | Undo and redo. |
| **Walk through** | Enter the first-person walk. |
| ☰ | The menu: new dungeon, random keep, import and export, picture, battle map, top-down view, graphics quality, clear everything and the controls list. |

**Left panel**

- **Tools** at the top: Move, Place, Select, Height, Room, Erase and Pick (see [Building](#building)).
- **Groups** down the side: Floors, Walls, Doors, Stairs, Lights, Furniture, Dressing, Loot, Wilds and Creatures.
- **Pieces** of the chosen group. Small badges show a piece's width (wide walls and doors), how high it climbs (stairs) or its gold value (loot).
- **A description** of the chosen tool or piece at the bottom, with its options.

**Bottom bar.** A hint for what you are doing, and a running count of squares and pieces, the treasure on the map in gold pieces, and the experience points (XP) of all its foes.

**Compass.** The round dial at top right always points north.

---

## Moving the camera

| To… | Mouse | Keyboard | Touch |
| --- | --- | --- | --- |
| Slide the view | Left-drag (with the Move tool) or middle-drag | W A S D or arrow keys (Shift goes faster) | One finger (with the Move tool) |
| Turn the view | Right-drag | Q and E | Two fingers |
| Zoom | Scroll wheel | | Pinch |
| Look straight down | | T | Menu → Top-down view |

The **Move** tool (the hand) is selected when you start. With it, dragging only moves the view, so you never place anything by accident. This matters most on touch screens.

---

## Building

### Placing pieces

1. Choose a group on the left (for example **Furniture**), then a piece (for example **Table**).
2. A see-through preview follows the pointer. It turns red, with a reason in the bottom bar, where the piece cannot go.
3. Click to place it. **Drag** to place several in a row, or to fill a rectangle with floor.
4. Press **R** to turn the piece a quarter turn before placing it (**Shift+R** turns it back).
5. Press **Esc** to put the piece down and go back to the Move tool.

How the different kinds of pieces snap:

- **Floors** fill whole squares. Drag to fill a rectangle.
- **Walls, doors and windows** sit on the lines between squares. Drag along a line to draw a run of wall. Press **R** to flip which side faces out.
- **Doors, arches and windows** set into an existing wall take on that wall's stone, brick or rock.
- **Wide pieces** (great doors, castle gates, great windows, colonnades and more) cover two or three lines (6 or 9 ft).
- **Furniture, loot and creatures** fill whole squares. Their size is shown in the description (from 1 × 1 up to 3 × 3 squares).
- **Wall decorations** (torches, banners, shields) snap to the nearest wall side. Point near the wall you want.
- **Small items** (candles, potions, coins, gems) sit on top of tables, barrels and altars when you place them there.

### The tools

| Tool | Key | What it does |
| --- | --- | --- |
| **Move** | H or Esc | Moves the view only. Nothing is placed. |
| **Place** | | Chosen for you when you pick a piece. Click or drag to place. |
| **Select** | M | Click a placed piece to pick it up. Drag it to move it, press **R** to turn it, **Ctrl+D** to copy it, or **Delete** to remove it. |
| **Height** | L | Raises or lowers squares (see [Raising and sinking the ground](#raising-and-sinking-the-ground)). |
| **Room** | B | Drag a rectangle to get a floored, walled room in one go. It uses the floor and wall you last used. Choose a theme under *Furnish as* to get a door and furniture too: throne hall, library, barracks, treasury, chapel, storeroom, prison, crypt or alchemy lab. |
| **Erase** | X | Click or drag to remove pieces. Clicking bare raised or sunken ground levels it again. |
| **Pick** | I, or Alt+click | Click anything on the map to choose that same piece in the palette. |

Made a mistake? **Ctrl+Z** undoes it and **Ctrl+Shift+Z** redoes it.

### Seeing inside

Walls are 10 ft tall, so from above they hide your rooms. Press **C** (or the **Walls** button) to cut them down to 6 ft or 3 ft. This changes only the view, not your map. Chandeliers and other ceiling pieces are hidden while walls are cut down.

---

## Raising and sinking the ground

Any square can be raised or lowered in steps of 3 ft (one level), up to 30 ft high or 30 ft deep.

1. Choose the **Height** tool (**L**).
2. Pick a mode in the panel:
   - **Raise**: each click or drag lifts the squares one level (3 ft).
   - **Lower**: each click or drag sinks them one level.
   - **Set to**: makes every square you drag over exactly the height you choose. This is the quickest way to level a whole platform or pit.
3. Click a square, or drag over a rectangle.

> **Tip:** Hold **Shift** to do the opposite of the current mode: Shift-drag lowers while in Raise.

What happens to raised and sunken squares:

- **Raised squares** stand on blocks of masonry under stone floors, or on earth under grass, sand and snow.
- **Sunken squares** open a pit in the landscape, with earth near the top and rock further down.
- **Pieces sit on top of whatever square they stand on.** Walls, doors and furniture all follow the ground, and a wall along the edge of a ledge stands on the higher side, like a parapet.

---

## Stairs

Every flight of stairs climbs **toward its back**, starting from the square it stands on. Press **R** to turn it before placing it.

| Stair | Squares | Climbs |
| --- | --- | --- |
| Steps | 1 × 1 | 3 ft (1 level) |
| Stone stairs | 1 × 2 | 6 ft (2 levels) |
| Long stairs | 1 × 3 | 9 ft (3 levels) |
| Grand stairs (balustrades and a red runner) | 2 × 2 | 6 ft (2 levels) |
| Wooden stairs (with a handrail) | 1 × 2 | 6 ft (2 levels) |
| Spiral stair (three-quarters of a turn round a pillar, leaving on its left) | 2 × 2 | 9 ft (3 levels) |
| Earth ramp | 1 × 2 | 3 ft (1 level) |

**Example: a platform with stairs up to it**

1. With the Height tool in **Set to** mode at **6 ft up**, drag out the platform.
2. Choose **Stone stairs** (they climb 6 ft) and turn them with **R** until the preview climbs toward the platform.
3. Place them on the ground squares right next to the platform. The top step meets its edge exactly.

**Going down into a pit**: stand the flight on the *sunken* squares, facing up toward the edge.

---

## Setting the scene

### Landscape

Choose the setting around your map from the menu in the top bar:

| Landscape | Feel |
| --- | --- |
| Verdant meadow | Rolling grass, oaks, bushes and flowers, with pollen in the air |
| Dark forest | Pines, oaks and red mushrooms, with fireflies |
| Desert dunes | Sand, palms, cacti and blowing dust |
| Frozen tundra | Snowfields, pines and falling snow |
| Volcanic wastes | Black rock, crystals, lava and drifting embers |
| Haunted swamp | Murky water, reeds, dead trees, glowing mushrooms and fireflies |
| Mountain highlands | Steep hills, standing stones and snow on the peaks |
| Underdark cavern | A vast cave with glowing crystals, mushrooms and spores |
| Dark void | Your dungeon floats in black space among drifting rock |
| Tabletop | Your dungeon is a model on a gaming table, beside dice, a rulebook, a character sheet, a mug and a candle |

### Time and light

- **Drag the time dial** (or press **[** and **]**) to set the hour. Dawn, midday, dusk and night each change the sky, the colour of the light and the length of the shadows.
- **Press ▶** (or **P**) to let a whole day pass in two minutes.
- **Move the ☀ slider** (or press **-** and **=**) to set the overall light. It brightens or darkens the sun and sky but never the torches, so at 0% your map is lit by its flames alone.

The landscape, time and light are saved with your map.

### Sound

The ♪ button turns on ambient sound: wind that suits the landscape, crackling fires near flames, insects at night, dripping water in caves, and sounds for doors, loot, blows and growls.

---

## Walking through your dungeon

Press **Walk through** (or **V**). Click once to look around with the mouse.

| To… | Press |
| --- | --- |
| Move / run | W A S D / hold Shift |
| Look around | Move the mouse |
| Open or close a door, loot a chest, drink, fight | E, or click |
| Hold your torch up or down | F |
| Peaceful mode (creatures do not attack) | P |
| Back to the editor | Esc |

What to expect:

- **Doors** swing open and closed. Secret doors look like the wall until you open them.
- **Chests** hold gold, shown in your purse. One kind of chest is a mimic.
- **Creatures** breathe, float or wobble, turn to watch you and call out when they notice you. Stronger foes take more blows. They fight back: you have 24 health, and the screen flashes red when you are hit. If you fall, you wake at the entrance. Press **P** for peaceful mode if you only want to look around.
- **Healing.** Drink from a fountain or well to heal fully, or drink a potion for 12 health.
- **Climbing.** You can walk up stairs and ramps, and step up ledges up to about a foot and a half high. Anything taller needs stairs.
- **Falling.** If you walk off a ledge you fall, and drops of more than 9 ft hurt.
- **The minimap** in the corner shows the floors, walls and loot around you. Higher ground is lighter and lower ground darker.
- **In the dark void** you can only walk on squares that have a floor.

---

## Saving, sharing and battle maps

| What | How |
| --- | --- |
| **Autosave** | Your map is saved in this browser as you work. Choose *Continue where you left off* on the welcome screen to return to it. |
| **Export a map** | ☰ → *Export this map…* (Ctrl+S). Download it as a `.dungeon.json` file, or copy its text to paste into a message or a note. |
| **Import a map** | ☰ → *Import a map…* (Ctrl+O). Choose a `.dungeon.json` file, or paste map text and press *Import text*. |
| **Take a picture** | ☰ → *Take a picture* saves the current view as an image. |
| **Battle map** | ☰ → *Export battle map…* makes a top-down image of everything you built, at 50, 70 or 100 pixels per 3 ft square, with or without the grid. It uses even midday light unless you choose the current time of day. Set your virtual tabletop's grid to the same number of pixels and the squares line up. |
| **Start over** | ☰ → *Clear everything* empties the map. ☰ → *New dungeon…* brings back the welcome screen. |

> **Keep a copy of maps you care about.** The autosave lives in your browser, and clearing your browsing data deletes it. Export a file now and then.

---

## Keyboard, mouse and touch reference

### Editing

| Action | Input |
| --- | --- |
| Slide the view | Left-drag with Move, middle-drag, W A S D or arrow keys (Shift for faster) |
| Turn the view | Right-drag, or Q / E |
| Zoom | Scroll wheel |
| Place or paint | Choose a piece, then click or drag |
| Turn a piece; flip a wall or door | R (Shift+R turns back) |
| Move tool (view only) | H or Esc |
| Select tool | M |
| Height tool (Shift does the opposite) | L |
| Room tool | B |
| Erase tool | X |
| Pick a piece from the map | I, or Alt+click |
| Copy / delete the selected piece | Ctrl+D / Delete |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z |
| Cut walls down | C |
| Show or hide the grid | G |
| Top-down view | T |
| Time of day | [ and ] move one hour, P plays |
| Overall light | - and = |
| Welcome screen | N |
| Import / export a map | Ctrl+O / Ctrl+S |
| Walk through | V |
| All controls | ? |

### Walking

| Action | Input |
| --- | --- |
| Move / run | W A S D / Shift |
| Look | Mouse (click once to start) |
| Open, loot, drink, fight | E or click |
| Torch | F |
| Peaceful mode | P |
| Back to the editor | Esc |

### Touch screens

- With **Move** selected, one finger slides the view.
- With a building tool, tap or drag to build.
- Two fingers turn and zoom with any tool.

---

## Tips and troubleshooting

- **The view is slow or jerky.** Open ☰ and switch **Graphics: high** to **low**. Low uses fewer lights and shadows and no glow, and runs well on older laptops and phones. Dungeon Forge already switches to low by itself on phones, on small computers, and when the first seconds draw too slowly.
- **I placed something by accident.** Press Ctrl+Z, then press Esc to go back to the Move tool, where dragging never builds.
- **A piece will not go where I want.** Read the reason in the bottom bar: there may already be a piece of the same kind there, or the square may be water, lava or a pit.
- **I cannot see inside my rooms.** Press C to cut the walls down, or T for a top-down view.
- **My map is gone.** Autosave is kept per browser. A different browser, a private window or cleared browsing data starts empty. Import an exported copy to get it back.
- **The mouse does not look around in walk mode.** Click once on the view; the browser needs a click before it lets the game use the mouse. Press Esc to get the pointer back.
- **The Windows app shows a SmartScreen warning.** Windows warns about apps that are not code-signed. Choose **More info → Run anyway**. The app keeps its own autosave, apart from your browser; use Export and Import to move maps between them.

---

*Building or changing Dungeon Forge itself? See [DEVELOPERS.md](DEVELOPERS.md) for build instructions, the Windows app, how the code is organised and the map file format.*
