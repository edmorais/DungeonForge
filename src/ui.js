import { CATEGORIES, ITEMS, byId } from './catalog.js';
import { LANDSCAPES } from './environment.js';
import { ROOM_THEMES } from './samples.js';

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};

const ICONS = {
  height: '<svg viewBox="0 0 24 24"><path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M7 4l2-2 2 2M9 2v6"/></svg>',
  view: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11.5v-8a1.5 1.5 0 013 0V12M14 11.5V5a1.5 1.5 0 013 0v7M17 12V8.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.8-2.4L4.2 14a1.5 1.5 0 012.3-1.9L8 13.5"/></svg>',
  place: '<svg viewBox="0 0 24 24"><path d="M5 3l13 8-6 1.5L9 19z"/></svg>',
  room: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14"/><path d="M4 12h6M14 12h6"/></svg>',
  erase: '<svg viewBox="0 0 24 24"><path d="M4 16l9-9 6 6-6 6H8z"/><path d="M11 9l6 6M8 19h12"/></svg>',
  pick: '<svg viewBox="0 0 24 24"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/></svg>',
  select: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
  keep: '<svg viewBox="0 0 52 52"><rect x="6" y="16" width="40" height="26"/><path d="M6 16V9h6v4h6V9h6v4h4V9h6v4h6V9h6v7M22 42v-9a4 4 0 018 0v9"/></svg>',
  open: '<svg viewBox="0 0 52 52"><path d="M4 40c8-10 14-12 22-6s14 2 22-8"/><path d="M14 31V19M10 23l4-6 4 6M38 26V12M33 18l5-8 5 8"/><circle cx="40" cy="8" r="0.5"/></svg>',
};

function fmtTime(t) {
  const hh = Math.floor(t) % 24, mm = Math.floor((t % 1) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function phase(t) {
  if (t < 4.5) return 'Deep night';
  if (t < 6.3) return 'Dawn';
  if (t < 10) return 'Morning';
  if (t < 14) return 'Midday';
  if (t < 17.3) return 'Afternoon';
  if (t < 19) return 'Dusk';
  if (t < 21.5) return 'Evening';
  return 'Night';
}

export function buildUI(root, H) {
  const state = { cat: 'floor', thumbs: {}, selected: null, tool: 'place' };
  const refs = {};

  // ---------- top bar ----------
  const nameInput = h('input', { class: 'name-input', value: 'Untitled dungeon', 'aria-label': 'Dungeon name', spellcheck: 'false',
    onchange: (e) => H.setName(e.target.value.trim() || 'Untitled dungeon') });
  const landSel = h('select', { class: 'styled', 'aria-label': 'Landscape', onchange: (e) => H.setLandscape(e.target.value) },
    Object.entries(LANDSCAPES).map(([id, L]) => h('option', { value: id }, L.name)));

  const knob = h('div', { class: 'dial-knob' });
  const dial = h('div', { class: 'dial', tabindex: '0', role: 'slider', 'aria-label': 'Time of day', 'aria-valuemin': '0', 'aria-valuemax': '24' },
    h('div', { class: 'dial-track' }), h('div', { class: 'dial-ticks' }), knob);
  const timeRead = h('div', { class: 'time-read' }, h('b', {}, '15:30'), h('span', {}, 'Afternoon'));
  const playBtn = h('button', { class: 'btn icon', title: 'Let time pass (P)', 'aria-label': 'Let time pass', onclick: () => H.togglePlay() }, '▶');
  const dialSet = (e) => {
    const r = dial.getBoundingClientRect();
    const t = Math.max(0, Math.min(23.99, ((e.clientX - r.left) / r.width) * 24));
    H.setTime(t);
  };
  dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); dialSet(e); dial._drag = true; });
  dial.addEventListener('pointermove', (e) => { if (dial._drag) dialSet(e); });
  dial.addEventListener('pointerup', () => { dial._drag = false; });
  dial.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); H.nudgeTime(e.key === 'ArrowLeft' ? -0.5 : 0.5); }
  });
  const timebox = h('div', { class: 'timebox' }, dial, timeRead, playBtn);

  // overall light level, on top of the time of day (0 = only torches and fires)
  const lightIn = h('input', { type: 'range', id: 'light-level', min: '0', max: '200', step: '5', value: '100', 'aria-label': 'Overall light',
    oninput: (e) => H.setLight(+e.target.value / 100) });
  const lightRead = h('b', {}, '100%');
  const lightbox = h('label', { class: 'lightbox', for: 'light-level', title: 'Overall light on top of the time of day. At 0% only torches, fires and glowing things light the map. ( - and = )' },
    h('span', { class: 'lb-ico', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>' }),
    h('span', { class: 'lb-col' }, h('span', { class: 'lb-label' }, 'Light'), lightRead), lightIn);

  const cutBtn = h('button', { class: 'btn', title: 'Cut walls down to see inside (C)', onclick: () => H.cycleCut() }, h('span', { class: 'g' }, '▤'), h('span', { class: 'lbl' }, 'Walls: full'));
  const soundBtn = h('button', { class: 'btn icon' + (H.soundOn() ? ' on' : ''), title: 'Sound on or off', 'aria-label': 'Sound', onclick: () => H.toggleSound() }, '♪');
  const gridBtn = h('button', { class: 'btn icon on', title: 'Show grid (G)', 'aria-label': 'Show grid', onclick: () => H.toggleGrid() }, '#');
  const undoBtn = h('button', { class: 'btn icon', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: () => H.undo() }, '↶');
  const redoBtn = h('button', { class: 'btn icon', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: () => H.redo() }, '↷');
  const walkBtn = h('button', { class: 'btn primary', title: 'Explore your dungeon in first person (V)', onclick: () => H.walk() }, 'Walk through');

  const menu = h('div', { class: 'menu', role: 'menu' },
    h('button', { onclick: () => { closeMenu(); H.newDungeon(); } }, 'New dungeon…', h('kbd', {}, 'N')),
    h('button', { onclick: () => { closeMenu(); H.generate(); } }, 'Generate a random keep', h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.openFile(); } }, 'Import a map…', h('kbd', {}, 'Ctrl O')),
    h('button', { onclick: () => { closeMenu(); H.saveFile(); } }, 'Export this map…', h('kbd', {}, 'Ctrl S')),
    h('button', { onclick: () => { closeMenu(); H.screenshot(); } }, 'Take a picture', h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.battleMap(); } }, 'Export battle map…', h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.topView(); } }, 'Top-down view', h('kbd', {}, 'T')),
    h('hr'),
    h('button', { onclick: () => { closeMenu(); H.toggleQuality(); } }, refs.qLabel = h('span', {}, 'Graphics: high'), h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.clearMap(); } }, 'Clear everything', h('kbd', {}, '')),
    h('hr'),
    h('button', { onclick: () => { closeMenu(); H.help(); } }, 'Controls', h('kbd', {}, '?')));
  const menuBtn = h('button', { class: 'btn icon menu-btn', title: 'Menu', 'aria-label': 'Menu', 'aria-haspopup': 'true', onclick: (e) => { e.stopPropagation(); menu.classList.toggle('open'); } }, '☰');
  const closeMenu = () => menu.classList.remove('open');
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) closeMenu(); });

  const topbar = h('div', { class: 'topbar' },
    h('div', { class: 'wordmark' }, 'Dungeon Forge', h('small', {}, '3 ft squares')),
    nameInput, h('div', { class: 'sep' }), landSel, h('div', { class: 'sep' }), timebox, lightbox,
    h('div', { class: 'spacer' }), undoBtn, redoBtn, cutBtn, gridBtn, soundBtn, walkBtn, h('div', { class: 'menu-wrap' }, menuBtn, menu));

  // ---------- palette ----------
  const toolBtns = {};
  const tools = h('div', { class: 'tools' }, ...[
    ['view', 'Move', 'Drag to move the view without building (H or Esc)'],
    ['place', 'Place', 'Place the chosen piece'],
    ['select', 'Select', 'Select a placed piece to move, turn or delete it (M)'],
    ['height', 'Height', 'Raise or lower squares in 3 ft steps (L)'],
    ['room', 'Room', 'Drag out a floored, walled room (B)'],
    ['erase', 'Erase', 'Click to remove, drag to clear an area (X)'],
    ['pick', 'Pick', 'Copy a piece from the map (I or Alt+click)'],
  ].map(([id, label, title]) => (toolBtns[id] = h('button', { class: 'tool ' + id, title, html: ICONS[id] + `<span>${label}</span>`, onclick: () => H.setTool(id) }))));
  const catBtns = {};
  const cats = h('div', { class: 'cats', role: 'tablist' }, CATEGORIES.map((c) =>
    (catBtns[c.id] = h('button', { class: 'cat', role: 'tab', onclick: () => showCat(c.id) }, h('span', { class: 'g' }, c.glyph), c.name))));
  const itemsBox = h('div', { class: 'items' });
  const desc = h('div', { class: 'desc' });
  const palette = h('div', { class: 'palette' }, tools, cats, itemsBox, desc);
  const cards = {};

  const CAT_HINT = {
    floor: 'Drag to fill a rectangle of squares.',
    wall: 'Walls sit on the lines between squares. Drag to draw a straight run. Wide pieces are marked with their width.',
    door: 'Click an existing wall to set a door into it. Wide doors centre on the line you point at.',
    light: 'Torches snap to the nearest wall side.',
    furn: 'Press R to rotate before placing.',
    decor: 'Rugs sit under furniture. Wall pieces snap to sides.',
    loot: 'Chests open in walk mode. Values add to your treasure tally.',
    nature: 'Trees and stones for outdoor maps. Drag to scatter.',
    creature: 'Foes watch you in walk mode. Press E near one to fight it.',
    stairs: 'Stairs climb toward their back; R turns them. Raise the squares they lead to with the Height tool (L), 3 ft per level.',
  };

  function showCat(id) {
    state.cat = id;
    for (const [k, b] of Object.entries(catBtns)) { b.classList.toggle('on', k === id); b.setAttribute('aria-selected', k === id); }
    itemsBox.innerHTML = '';
    const c = CATEGORIES.find((x) => x.id === id);
    itemsBox.append(h('h3', {}, c.name), h('p', { class: 'hint' }, CAT_HINT[id]));
    const grid = h('div', { class: 'grid' });
    for (const it of ITEMS.filter((x) => x.cat === id)) {
      const img = state.thumbs[it.id] ? h('img', { src: state.thumbs[it.id], alt: '' }) : h('div', { class: 'ph' });
      const card = h('button', { class: 'card' + (state.selected === it.id ? ' on' : ''), title: it.desc,
        onclick: () => H.select(it.id), onmouseenter: () => showDesc(it), onmouseleave: () => showDesc(state.selected ? byId[state.selected] : null) },
      img, h('span', {}, it.name),
      it.stair ? h('i', { class: 'gp wide' }, `↑${it.stair.rise} ft`) : it.span > 1 ? h('i', { class: 'gp wide' }, `${it.span * 3} ft`) : it.gp ? h('i', { class: 'gp' }, it.gp >= 1000 ? `${it.gp / 1000}k` : `${it.gp}`) : null);
      cards[it.id] = card;
      grid.append(card);
    }
    itemsBox.append(grid);
  }

  function showDesc(it) {
    desc.innerHTML = '';
    if (!it) {
      const tips = {
        view: ['Move', 'Drag to slide the view; right-drag to turn it; scroll to zoom. Nothing is placed until you choose a piece.'],
        place: ['Pick a piece', 'Choose anything on the left, then click the map. Right-drag to orbit, scroll to zoom, WASD to pan.'],
        room: ['Room tool', `Drag a rectangle to lay floor and walls. Uses your last floor and wall: ${byId[H.lastFloor()].name.toLowerCase()} and ${byId[H.lastWall()].name.toLowerCase()}.`],
        erase: ['Erase', 'Click a piece to remove the topmost thing in that square, or a wall line. Drag to clear an area.'],
        pick: ['Pick', 'Click something on the map to select the same piece.'],
        select: ['Select', 'Click a placed piece to select it. Drag to move it, R turns it, Delete removes it.'],
        height: ['Height', 'Click a square or drag across several. Squares go up to 30 ft high or 30 ft down, in 3 ft steps. Shift-click does the opposite.'],
      }[state.tool] || ['', ''];
      desc.append(h('b', {}, tips[0]), tips[1]);
      if (state.tool === 'height') {
        const mode = H.heightMode();
        const seg = h('div', { class: 'seg height-seg', role: 'group', 'aria-label': 'Height mode' },
          ...[['raise', 'Raise'], ['lower', 'Lower'], ['set', 'Set to']].map(([id, label]) =>
            h('button', { class: id === mode ? 'on' : '', 'aria-pressed': String(id === mode), onclick: () => { H.setHeightMode(id); showDesc(null); } }, label)));
        const lv = H.heightLevel();
        const fmt = (l) => (l > 0 ? `${l * 3} ft up` : l < 0 ? `${-l * 3} ft down` : 'Ground');
        const levelSel = h('select', { class: 'styled', id: 'height-level', disabled: mode !== 'set' ? 'disabled' : null, onchange: (e) => H.setHeightLevel(+e.target.value) },
          Array.from({ length: 21 }, (_, k) => 10 - k).map((l) => h('option', { value: String(l), selected: l === lv ? 'selected' : null }, fmt(l))));
        desc.append(h('div', { class: 'height-row' }, seg, levelSel));
      }
      if (state.tool === 'room') {
        const sel = h('select', { class: 'styled', id: 'room-theme', onchange: (e) => H.setRoomTheme(e.target.value) },
          ROOM_THEMES.map(([id, name]) => h('option', { value: id, selected: id === H.roomTheme() ? 'selected' : null }, name)));
        desc.append(h('label', { class: 'theme-pick', for: 'room-theme' }, 'Furnish as', sel));
      }
      return;
    }
    desc.append(h('b', {}, it.name), it.desc);
  }

  // ---------- status ----------
  const where = h('div', { class: 'where' }, '—');
  const tip = h('div', { class: 'tip' }, 'Right-drag to orbit · scroll to zoom · WASD to pan · R rotates');
  const stats = h('div', { class: 'stats' });
  const status = h('div', { class: 'status' }, where, tip, stats);

  const needle = h('div', { class: 'needle' }, h('i', {}, 'N'));
  const compass = h('div', { class: 'compass', title: 'North' }, needle);

  // ---------- toasts ----------
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  function toast(msg, kind = '') {
    const t = h('div', { class: 'toast ' + kind }, msg);
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  // ---------- walk HUD ----------
  const prompt = h('div', { class: 'prompt' });
  const purse = h('div', { class: 'purse' }, '0 gp');
  const walkName = h('div', { class: 'walkname' }, '');
  const hpFill = h('i', {});
  const hpText = h('span', {}, '24 / 24');
  const hpBar = h('div', { class: 'hp', title: 'Health' }, h('div', { class: 'hp-track' }, hpFill), hpText);
  const hurt = h('div', { class: 'hurt' });
  const cross = h('div', { class: 'cross' });
  const minimap = h('canvas', { class: 'minimap', width: '220', height: '220', 'aria-hidden': 'true' });
  const walkhud = h('div', { class: 'walkhud' }, hurt, cross, prompt, purse, hpBar, walkName, minimap,
    h('div', { class: 'walkhelp' }, 'WASD move · mouse look · Shift run · E or click to act · F torch · P peaceful · Esc to return'));

  // ---------- start modal ----------
  const startBg = h('div', { class: 'modal-bg' });
  const hasSave = H.hasAutosave();
  const startCard = (icon, title, text, fn) => h('button', { class: 'start', onclick: () => { startBg.classList.remove('open'); fn(); } },
    h('div', { class: 'sg', html: icon }), h('div', {}, h('b', {}, title), h('span', {}, text)));
  const sampleCard = (title, text, fn) => h('button', { class: 'start', onclick: () => { startBg.classList.remove('open'); fn(); } }, h('div', {}, h('b', {}, title), h('span', {}, text)));
  startBg.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Start a dungeon' },
    h('h1', {}, 'Dungeon Forge'),
    h('p', { class: 'lede' }, 'Lay out a dungeon square by square. Every square is 3 feet. Set the land around it and the hour of the day, then walk the halls yourself.'),
    h('div', { class: 'starts' },
      startCard(ICONS.open, 'Empty site', 'A blank 192 × 144 ft grid of 3 ft squares. Pick a landscape around it: wilderness, a dark void or a gaming table.', () => H.start('blank')),
      startCard(ICONS.keep, 'Random keep', 'A new keep every time, with rooms, doors, furniture, loot and monsters laid out for you.', () => H.start('random'))),
    h('div', { class: 'samples-title' }, 'Or start from a finished map'),
    h('div', { class: 'starts samples' },
      sampleCard('Ziggurat of the Dawn Sun', 'A stepped temple rising 24 ft from the sand, with a stair up every face.', () => H.start('ziggurat')),
      sampleCard('The Deepdelve Mine', 'A yard in the hills, then drifts 9, 15 and 24 ft down to a forge over lava.', () => H.start('mine')),
      sampleCard('Sunken Arena of Varn', 'Seating tiers stepping 12 ft down to a sand floor, with a royal box.', () => H.start('arena')),
      sampleCard('Spires of the Pale Lich', 'Platforms on stone pillars in the dark, climbing to a spire 30 ft up.', () => H.start('spires')),
      sampleCard('Watchtower on the Grey Crag', 'Snowy terraces up to a tower 21 ft above the plain, and a cave below.', () => H.start('crag')),
      sampleCard('The sunken crypt', 'A keep with a throne hall, chapel, library, prison and a hidden vault.', () => H.start('crypt')),
      sampleCard('Bandit camp', 'A palisade fort in the forest with tents, a campfire and stolen loot.', () => H.start('camp')),
      sampleCard('Drowned shrine', 'Ruined columns and a fountain on a desert dune at dusk.', () => H.start('shrine'))),
    h('div', { class: 'foot' },
      hasSave ? h('button', { class: 'btn', onclick: () => { startBg.classList.remove('open'); H.start('resume'); } }, 'Continue where you left off') : h('span'),
      h('span', {}, 'Drag moves the view · right-drag turns · ? shows all controls'))));

  // ---------- help modal ----------
  const helpBg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === helpBg) helpBg.classList.remove('open'); } });
  const row = (a, b) => h('div', {}, h('span', {}, a), h('span', {}, b));
  helpBg.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Controls' },
    h('h2', {}, 'Controls'),
    h('div', { class: 'help-grid' },
      h('h3', {}, 'Camera'),
      row('Orbit', 'Right-drag, or Q / E'), row('Pan', 'WASD, arrows, or middle-drag'), row('Zoom', 'Scroll wheel'), row('Pan faster', 'Hold Shift'),
      h('h3', {}, 'Building'),
      row('Place', 'Left-click; drag to paint'), row('Rotate piece', 'R (Shift+R back)'), row('Room tool', 'B'), row('Erase tool', 'X, or Delete'),
      row('Move the view (no building)', 'H or Esc'), row('Select, move, turn, delete a placed piece', 'M, then click it'), row('Copy the selected piece', 'Ctrl+D'), row('Copy a piece', 'I, or Alt+click'), row('Deselect', 'Esc'), row('Undo / redo', 'Ctrl+Z / Ctrl+Shift+Z'), row('Cut walls down', 'C'),
      row('Height tool (Shift-click does the opposite)', 'L'), row('Grid', 'G'), row('Top-down view', 'T'), row('Overall light', '- and ='), row('Time of day', '[ and ] move an hour; P plays'),
      h('h3', {}, 'Walking'),
      row('Enter walk mode', 'V'), row('Move / run', 'WASD / Shift'), row('Open doors, loot chests, fight', 'E or click'), row('Torch', 'F'), row('Peaceful (creatures do not attack)', 'P'), row('Back to the editor', 'Esc')),
    h('div', { class: 'foot' }, h('span', {}, 'Your map saves itself in this browser as you work.'), h('button', { class: 'btn', onclick: () => helpBg.classList.remove('open') }, 'Close'))));

  // ---------- export / import dialog ----------
  const ioBg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === ioBg) ioBg.classList.remove('open'); } });
  const ioTitle = h('h2', {}, '');
  const ioText = h('p', { class: 'lede' }, '');
  const ioArea = h('textarea', { class: 'io-area', id: 'io-area', spellcheck: 'false', 'aria-label': 'Map data' });
  const ioImg = h('img', { class: 'io-img', alt: 'Picture of your dungeon' });
  const ioActions = h('div', { class: 'io-actions' });
  ioBg.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, ioTitle, ioText, ioArea, ioImg, ioActions));
  function openIO({ title, text, value = null, img = null, actions = [] }) {
    ioTitle.textContent = title;
    ioText.textContent = text;
    ioArea.hidden = value === null;
    ioArea.value = value ?? '';
    ioArea.readOnly = false;
    ioImg.hidden = !img;
    if (img) ioImg.src = img;
    ioActions.innerHTML = '';
    for (const a of actions) ioActions.append(h('button', { class: 'btn' + (a.primary ? ' primary' : ''), onclick: () => a.fn(ioArea.value) }, a.label));
    ioActions.append(h('button', { class: 'btn', onclick: () => ioBg.classList.remove('open') }, 'Close'));
    ioBg.classList.add('open');
  }

  // ---------- first-run hint ----------
  const coach = h('div', { class: 'coach', role: 'note', hidden: true },
    h('b', {}, 'How to build'),
    (matchMedia('(pointer: coarse)').matches
      ? h('ol', {},
        h('li', {}, 'With Move selected, drag to look around. Two fingers turn and zoom.'),
        h('li', {}, 'Choose a piece in the palette below, then tap the map to place it.'),
        h('li', {}, 'Tap Move again before dragging the view, so nothing is placed by accident.'),
        h('li', {}, 'Tap Walk through to explore what you built.'))
      : h('ol', {},
        h('li', {}, 'With Move selected, drag to slide the view. Right-drag turns it, scroll zooms.'),
        h('li', {}, 'Choose a piece in the palette, then click the map to place it or drag to paint.'),
        h('li', {}, 'Press Esc to go back to Move.'),
        h('li', {}, 'Press V to walk through what you built.'))),
    h('button', { class: 'btn primary', onclick: () => { coach.hidden = true; try { localStorage.setItem('dungeon-forge:coached', '1'); } catch { /* ignore */ } } }, 'Got it'));

  const loading = h('div', { class: 'loading' }, h('div', {}, 'Dungeon Forge', h('small', {}, 'Carving stone…')));

  root.append(topbar, palette, status, compass, toasts, walkhud, coach, startBg, helpBg, ioBg, loading);
  showCat('floor');
  showDesc(null);

  return {
    toast,
    setThumb(id, url) {
      state.thumbs[id] = url;
      const c = cards[id];
      if (c && c.firstChild && c.firstChild.tagName !== 'IMG') c.firstChild.replaceWith(h('img', { src: url, alt: '' }));
    },
    setSelected(id) {
      state.selected = id;
      if (id && byId[id].cat !== state.cat) showCat(byId[id].cat);
      for (const [k, c] of Object.entries(cards)) c.classList.toggle('on', k === id);
      showDesc(id ? byId[id] : null);
    },
    setTool(t) {
      state.tool = t;
      for (const [k, b] of Object.entries(toolBtns)) b.classList.toggle('on', k === t && (t !== 'place' || !!state.selected || true));
      if (t !== 'place') { state.selected = null; for (const c of Object.values(cards)) c.classList.remove('on'); }
      showDesc(state.selected ? byId[state.selected] : null);
    },
    setLight(v) { lightIn.value = String(Math.round(v * 100)); lightRead.textContent = `${Math.round(v * 100)}%`; },
    setLandscape(id) { landSel.value = id; },
    setName(n) { nameInput.value = n; walkName.textContent = n; },
    setTime(t, playing) {
      knob.style.left = (t / 24) * 100 + '%';
      const night = t < 5.8 || t > 18.6;
      knob.classList.toggle('moon', night);
      timeRead.firstChild.textContent = fmtTime(t);
      timeRead.lastChild.textContent = phase(t);
      dial.setAttribute('aria-valuenow', t.toFixed(1));
      dial.setAttribute('aria-valuetext', `${fmtTime(t)}, ${phase(t)}`);
      playBtn.textContent = playing ? '❚❚' : '▶';
    },
    setCut(label) { cutBtn.querySelector('.lbl').textContent = 'Walls: ' + label; cutBtn.classList.toggle('on', label !== 'full'); },
    setGrid(on) { gridBtn.classList.toggle('on', on); },
    setSound(on) { soundBtn.classList.toggle('on', on); },
    setQuality(q) { refs.qLabel.textContent = 'Graphics: ' + q; },
    setHover(info) {
      where.classList.toggle('bad', !!info?.problem);
      where.textContent = !info ? '—' : info.problem ? info.problem : `Square ${info.i}, ${info.j} (${info.i * 3}, ${info.j * 3} ft)${info.text ? ' · ' + info.text : ''}`;
    },
    setTip(t) { tip.textContent = t; },
    setStats(s) {
      stats.innerHTML = `${s.floors} squares · ${s.objects} pieces · treasure <b>${s.gp.toLocaleString()} gp</b>` + (s.xp ? ` · foes <b>${s.xp.toLocaleString()} XP</b>` : '');
    },
    setCompass(yaw) { needle.style.transform = `rotate(${yaw}rad)`; },
    setUndo(canU, canR) { undoBtn.disabled = !canU; redoBtn.disabled = !canR; undoBtn.style.opacity = canU ? 1 : 0.4; redoBtn.style.opacity = canR ? 1 : 0.4; },
    walkMode(on) {
      root.classList.toggle('walk-mode', on);
      walkhud.classList.toggle('on', on);
    },
    setPrompt(text, kind = null) {
      cross.className = 'cross' + (kind ? ' ' + kind : '');
      if (!text) { prompt.style.display = 'none'; return; }
      prompt.style.display = 'block';
      prompt.innerHTML = `<span class="key">E</span>${text}`;
    },
    minimap,
    setHealth(hp, max, peaceful, wasHit = false) {
      hpFill.style.width = (100 * hp / max) + '%';
      hpFill.classList.toggle('low', hp / max < 0.35);
      hpText.textContent = peaceful ? 'Peaceful' : `${hp} / ${max}`;
      if (wasHit) { hurt.classList.remove('on'); void hurt.offsetWidth; hurt.classList.add('on'); }
    },
    setPurse(gp, xp = 0) { purse.textContent = `${gp.toLocaleString()} gp` + (xp ? ` · ${xp.toLocaleString()} XP` : ''); },
    showStart() { startBg.classList.add('open'); },
    showCoach() {
      let seen = false;
      try { seen = localStorage.getItem('dungeon-forge:coached') === '1'; } catch { /* first run */ }
      if (!seen) coach.hidden = false;
    },
    hideStart() { startBg.classList.remove('open'); },
    showHelp() { helpBg.classList.toggle('open'); },
    modalOpen() { return [startBg, helpBg, ioBg].some((m) => m.classList.contains('open')); },
    closeModals() { helpBg.classList.remove('open'); ioBg.classList.remove('open'); },
    openIO,
    closeIO() { ioBg.classList.remove('open'); },
    selectIO() { ioArea.focus(); ioArea.select(); },
    doneLoading() { loading.classList.add('done'); setTimeout(() => loading.remove(), 600); },
    loadingText(t) { const s = loading.querySelector('small'); if (s) s.textContent = t; },
  };
}
