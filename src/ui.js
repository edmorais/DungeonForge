import { CATEGORIES, ITEMS, byId } from './catalog.js';
import { CELL, LEVEL } from './config.js';
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
  const walkBtn = h('button', { class: 'btn primary play', title: 'Play your dungeon in first person (V)', onclick: () => H.walk() }, h('span', { class: 'g', 'aria-hidden': 'true' }, '▶'), h('span', { class: 'play-label' }, 'Play'));

  const menu = h('div', { class: 'menu', role: 'menu' },
    h('div', { class: 'menu-title' }, 'Map'),
    h('button', { onclick: () => { closeMenu(); H.newDungeon(); } }, 'New dungeon…', h('kbd', {}, 'N')),
    h('button', { onclick: () => { closeMenu(); H.generate(); } }, 'Generate a random keep', h('kbd', {}, '')),
    h('button', { title: 'Adds a start, an exit, a locked door with its key and two traps, placed along the way through your map', onclick: () => { closeMenu(); H.makeGame(); } }, 'Make this map a game', h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.clearMap(); } }, 'Clear everything', h('kbd', {}, '')),
    h('hr'),
    h('div', { class: 'menu-title' }, 'Save and share'),
    h('button', { onclick: () => { closeMenu(); H.openFile(); } }, 'Import a map…', h('kbd', {}, 'Ctrl O')),
    h('button', { onclick: () => { closeMenu(); H.saveFile(); } }, 'Export this map…', h('kbd', {}, 'Ctrl S')),
    h('button', { onclick: () => { closeMenu(); H.screenshot(); } }, 'Take a picture', h('kbd', {}, '')),
    h('button', { onclick: () => { closeMenu(); H.battleMap(); } }, 'Export battle map…', h('kbd', {}, '')),
    h('hr'),
    h('div', { class: 'menu-title' }, 'View'),
    h('button', { onclick: () => { closeMenu(); H.topView(); } }, 'Top-down view', h('kbd', {}, 'T')),
    h('button', { onclick: () => { closeMenu(); H.toggleQuality(); } }, refs.qLabel = h('span', {}, 'Graphics: auto'), h('kbd', {}, '')),
    h('hr'),
    h('button', { onclick: () => { closeMenu(); H.help(); } }, 'Controls', h('kbd', {}, '?')));
  const menuBtn = h('button', { class: 'btn icon menu-btn', title: 'Menu', 'aria-label': 'Menu', 'aria-haspopup': 'true', onclick: (e) => { e.stopPropagation(); menu.classList.toggle('open'); } }, '☰');
  const closeMenu = () => menu.classList.remove('open');
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) closeMenu(); });

  const topbar = h('div', { class: 'topbar' },
    h('div', { class: 'wordmark' }, 'Dungeon Forge'),
    nameInput, h('div', { class: 'sep' }), landSel, h('div', { class: 'sep' }), timebox, lightbox,
    h('div', { class: 'spacer' }),
    h('div', { class: 'group', role: 'group', 'aria-label': 'Undo and redo' }, undoBtn, redoBtn),
    h('div', { class: 'group', role: 'group', 'aria-label': 'View' }, cutBtn, gridBtn, soundBtn),
    walkBtn, h('div', { class: 'menu-wrap' }, menuBtn, menu));

  // ---------- palette ----------
  const toolBtns = {};
  const tools = h('div', { class: 'tools' }, ...[
    ['view', 'Move', 'Drag to move the view without building (H or Esc)'],
    ['place', 'Place', 'Place the chosen piece'],
    ['select', 'Select', 'Select a placed piece to move, turn or delete it (M)'],
    ['height', 'Height', 'Raise or lower squares in 2.5 ft steps (L)'],
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
    creature: 'In play, creatures notice a hero 20 ft away and fight in turns, with dice.',
    game: 'These turn a walk into a game: a start, an exit, keys for locked doors (under Doors) and traps.',
    stairs: 'Stairs climb toward their back; R turns them. Raise the squares they lead to with the Height tool (L), 2.5 ft per level.',
  };

  // the list of pieces: a search box, the pieces used most recently, then a category or what was found
  const findIn = h('input', { type: 'search', placeholder: 'Find a piece…', 'aria-label': 'Find a piece', spellcheck: 'false',
    oninput: () => renderItems(), onkeydown: (e) => { e.stopPropagation(); if (e.key === 'Escape') { findIn.value = ''; renderItems(); findIn.blur(); } } });
  const findBox = h('div', { class: 'find' }, findIn, h('button', { title: 'Clear', 'aria-label': 'Clear the search', onclick: () => { findIn.value = ''; renderItems(); findIn.focus(); } }, '×'));
  const recentBox = h('div', { class: 'recent' });
  const listBox = h('div', {});
  itemsBox.append(findBox, recentBox, listBox);
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('dungeon-forge:recent') || '[]').filter((id) => byId[id]).slice(0, 5); } catch { /* none yet */ }
  const pic = (id) => (state.thumbs[id] ? h('img', { src: state.thumbs[id], alt: '' }) : h('div', { class: 'ph' }));
  function renderRecent() {
    recentBox.innerHTML = '';
    recentBox.hidden = !recent.length;
    if (!recent.length) return;
    recentBox.append(h('span', {}, 'Recent'), ...recent.map((id) => h('button', { class: state.selected === id ? 'on' : '', title: byId[id].name, 'aria-label': byId[id].name, 'data-id': id, onclick: () => H.select(id) }, pic(id))));
  }
  function noteUsed(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 5);
    try { localStorage.setItem('dungeon-forge:recent', JSON.stringify(recent)); } catch { /* not kept */ }
    renderRecent();
  }
  function renderItems() {
    const q = findIn.value.trim().toLowerCase();
    listBox.innerHTML = '';
    for (const k of Object.keys(cards)) delete cards[k];
    let list;
    if (q) {
      const words = q.split(/\s+/);
      list = ITEMS.filter((it) => { const text = `${it.name} ${it.desc} ${CATEGORIES.find((c) => c.id === it.cat).name}`.toLowerCase(); return words.every((w) => text.includes(w)); });
      listBox.append(h('h3', {}, list.length === 1 ? '1 piece found' : `${list.length} pieces found`));
      if (!list.length) listBox.append(h('p', { class: 'none' }, 'Nothing matches. Try a shorter word, such as door, chest or stair.'));
    } else {
      const c = CATEGORIES.find((x) => x.id === state.cat);
      list = ITEMS.filter((x) => x.cat === state.cat);
      listBox.append(h('h3', {}, c.name), h('p', { class: 'hint' }, CAT_HINT[state.cat]));
    }
    const grid = h('div', { class: 'grid' });
    for (const it of list) {
      const card = h('button', { class: 'card' + (state.selected === it.id ? ' on' : ''), title: it.desc,
        onclick: () => H.select(it.id), onmouseenter: () => showDesc(it), onmouseleave: () => showDesc(state.selected ? byId[state.selected] : null) },
      pic(it.id), h('span', {}, it.name),
      it.stair ? h('i', { class: 'gp wide' }, `↑${it.stair.rise} ft`) : it.span > 1 ? h('i', { class: 'gp wide' }, `${it.span * CELL} ft`) : it.gp ? h('i', { class: 'gp' }, it.gp >= 1000 ? `${it.gp / 1000}k` : `${it.gp}`) : null);
      cards[it.id] = card;
      grid.append(card);
    }
    listBox.append(grid);
  }
  function showCat(id) {
    state.cat = id;
    findIn.value = '';
    for (const [k, b] of Object.entries(catBtns)) { b.classList.toggle('on', k === id); b.setAttribute('aria-selected', k === id); }
    renderItems();
    renderRecent();
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
        height: ['Height', 'Click a square or drag across several. Squares go up to 30 ft high or 30 ft down, in 2.5 ft steps. Shift-click does the opposite.'],
      }[state.tool] || ['', ''];
      desc.append(h('b', {}, tips[0]), tips[1]);
      if (state.tool === 'height') {
        const mode = H.heightMode();
        const seg = h('div', { class: 'seg height-seg', role: 'group', 'aria-label': 'Height mode' },
          ...[['raise', 'Raise'], ['lower', 'Lower'], ['set', 'Set to']].map(([id, label]) =>
            h('button', { class: id === mode ? 'on' : '', 'aria-pressed': String(id === mode), onclick: () => { H.setHeightMode(id); showDesc(null); } }, label)));
        const lv = H.heightLevel();
        const fmt = (l) => (l > 0 ? `${l * LEVEL} ft up` : l < 0 ? `${-l * LEVEL} ft down` : 'Ground');
        const levelSel = h('select', { class: 'styled', id: 'height-level', disabled: mode !== 'set' ? 'disabled' : null, onchange: (e) => H.setHeightLevel(+e.target.value) },
          Array.from({ length: 25 }, (_, k) => 12 - k).map((l) => h('option', { value: String(l), selected: l === lv ? 'selected' : null }, fmt(l))));
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
  // the game: who the hero is, whose turn it is, the dice, and a short log
  const heroLine = h('div', { class: 'heroline' }, '');
  const torchIcon = h('div', { class: 'torch-icon on', title: 'Your torch (F)', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c2 3 4 4.500 4 7.500a4 4 0 01-8 0C8 7.500 10.500 6 12 2z"/><path d="M10 14h4l-1 8h-2z"/></svg>' });
  const banner = h('div', { class: 'banner', hidden: true });
  const turnbar = h('div', { class: 'turnbar', hidden: true });
  const dice = h('div', { class: 'dice', 'aria-live': 'polite' });
  const gamelog = h('div', { class: 'gamelog' });
  let rollTimer = 0, rollSpin = 0;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // touch: a stick to move, buttons to act; dragging the view looks around
  const nub = h('i', {});
  const stick = h('div', { class: 'stick', 'aria-label': 'Move' }, nub);
  let stickId = null;
  const stickSet = (e) => {
    const r = stick.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    nub.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
    H.walkStick(x, y);
  };
  const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; nub.style.transform = ''; H.walkStick(0, 0); };
  stick.addEventListener('pointerdown', (e) => { e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickSet(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickSet(e); });
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  const tbtn = (label, cls, fn) => h('button', { class: 'tbtn ' + cls, onpointerdown: (e) => { e.preventDefault(); fn(); } }, label);
  const specialBtn = tbtn('Special', 'special', () => H.walkSpecial());
  const endBtn = tbtn('End turn', 'end', () => H.walkEndTurn());
  const touch = h('div', { class: 'touch' }, stick,
    h('div', { class: 'tbtns' }, specialBtn, endBtn, tbtn('Jump', 'jump', () => H.walkJump()), tbtn('Act', 'act', () => H.walkAct())),
    tbtn('✕', 'leave', () => H.walkExit()));
  const touchOn = () => root.classList.add('touch-on');
  if (matchMedia('(pointer: coarse)').matches) touchOn();
  window.addEventListener('touchstart', touchOn, { passive: true, once: true });
  // numbers that float up from a creature when it is hit, and a health bar over each foe in a fight;
  // main.js moves them over the 3D view every frame
  const overlay = h('div', { class: 'overlay' });
  const bars = [];
  const walkhud = h('div', { class: 'walkhud' }, hurt, overlay, cross, prompt, purse, hpBar, heroLine, torchIcon, walkName, minimap, banner, dice, gamelog, turnbar, touch,
    h('div', { class: 'walkhelp' }, 'WASD move · mouse look · Shift run · Space jump · E or click to act · R special · F torch · Esc to return'));

  // ---------- choose a hero ----------
  const classBg = h('div', { class: 'modal-bg' });
  function pickClass(classes, last, onPick) {
    const close = () => classBg.classList.remove('open');
    const card = (id, c) => h('button', { class: 'start hero' + (id === last ? ' on' : ''), onclick: () => { close(); onPick(id); } },
      h('div', {}, h('b', {}, c.name), h('span', {}, c.blurb),
        h('span', { class: 'hero-stats' }, `${c.hp} health · AC ${c.ac} · moves ${c.speed * CELL} ft`),
        h('span', { class: 'hero-stats' }, `${c.attack.name}: +${c.attack.bonus} to hit, ${c.attack.dmg}`),
        h('span', {}, `${c.special.name} (${c.special.uses}): ${c.special.text}`)));
    classBg.innerHTML = '';
    classBg.append(h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose your hero' },
      h('h2', {}, 'Choose your hero'),
      h('p', { class: 'lede' }, 'Fights are played in turns. On your turn you move up to your speed and take one action; every attack is a d20 roll against armour class (AC). Find the exit to finish the run.'),
      h('div', { class: 'starts heroes' }, Object.entries(classes).map(([id, c]) => card(id, c))),
      h('div', { class: 'foot' },
        h('button', { class: 'btn', onclick: () => { close(); onPick(null); } }, 'Just look around'),
        h('button', { class: 'btn', onclick: close }, 'Cancel'))));
    classBg.classList.add('open');
  }

  // ---------- a paused walk ----------
  const resumeBg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === resumeBg) resumeBg.classList.remove('open'); } });
  function askResume(text, { resume, restart }) {
    const close = () => resumeBg.classList.remove('open');
    resumeBg.innerHTML = '';
    resumeBg.append(h('div', { class: 'modal summary won', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'A walk is paused' },
      h('h2', {}, 'A walk is paused'),
      h('p', { class: 'lede' }, `${text}. Resume it where you left it, or start again from the beginning. Changing the map resets a paused walk.`),
      h('div', { class: 'foot' },
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h('button', { class: 'btn', onclick: () => { close(); restart(); } }, 'Start again'),
        h('button', { class: 'btn primary', onclick: () => { close(); resume(); } }, 'Resume'))));
    resumeBg.classList.add('open');
  }

  // ---------- end of a run ----------
  const endBg = h('div', { class: 'modal-bg' });
  function showSummary(s, { again, back }) {
    const close = () => endBg.classList.remove('open');
    const won = s.result === 'escaped';
    const mins = `${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, '0')}`;
    endBg.innerHTML = '';
    endBg.append(h('div', { class: 'modal summary' + (won ? ' won' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': 'End of the run' },
      h('h2', {}, won ? `You escaped ${s.name}` : `You fell in ${s.name}`),
      h('p', { class: 'lede' }, won ? `The ${s.cls.toLowerCase()} walks out with ${s.hp} of ${s.max} health.` : `The ${s.cls.toLowerCase()} was brought down by ${s.cause}.`),
      h('div', { class: 'help-grid' },
        row('Time', mins), row('Experience', `${s.xp.toLocaleString()} XP`),
        row('Gold', `${s.gold.toLocaleString()} of ${s.goldTotal.toLocaleString()} gp`), row('Chests opened', `${s.chests} of ${s.chestsTotal}`),
        row('Creatures defeated', `${s.defeated} of ${s.foesTotal}`), row('Fights and rounds', `${s.fights} and ${s.rounds}`),
        row('Damage dealt', String(s.dealt)), row('Damage taken', String(s.taken)),
        row('Critical hits', String(s.crits)), row('Potions drunk', String(s.potions)),
        row('Traps sprung', String(s.trapsSprung)), row('Traps disarmed', String(s.trapsDisarmed))),
      h('div', { class: 'foot' },
        h('button', { class: 'btn', onclick: () => { close(); back(); } }, 'Back to the editor'),
        h('button', { class: 'btn primary', onclick: () => { close(); again(); } }, 'Play again'))));
    endBg.classList.add('open');
  }

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
      startCard(ICONS.open, 'Empty site', 'A blank 320 × 240 ft grid of 5 ft squares. Pick a landscape around it: wilderness, a dark void or a gaming table.', () => H.start('blank')),
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
      row('Play', 'V'), row('Move / run', 'WASD / Shift'), row('Jump (clears a trap, gains one 2.5 ft level)', 'Space'), row('Open doors, loot chests, attack', 'E or click'),
      row('Your class’s special action', 'R'), row('End your turn in a fight', 'Enter or T'), row('Torch', 'F'), row('Peaceful (creatures do not attack)', 'P'), row('Back to the editor', 'Esc'),
      row('Gamepad', 'Sticks move and look; A jump, X act, Y special, B end turn'), row('Touch', 'Stick moves, drag the view to look, buttons act')),
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
        h('li', {}, 'Tap Play to explore what you built.'))
      : h('ol', {},
        h('li', {}, 'With Move selected, drag to slide the view. Right-drag turns it, scroll zooms.'),
        h('li', {}, 'Choose a piece in the palette, then click the map to place it or drag to paint.'),
        h('li', {}, 'Press Esc to go back to Move.'),
        h('li', {}, 'Press Play (or V) to walk through what you built.'))),
    h('button', { class: 'btn primary', onclick: () => { coach.hidden = true; try { localStorage.setItem('dungeon-forge:coached', '1'); } catch { /* ignore */ } } }, 'Got it'));

  const loading = h('div', { class: 'loading' }, h('div', {}, 'Dungeon Forge', h('small', {}, 'Carving stone…')));

  root.append(topbar, palette, status, compass, toasts, walkhud, coach, startBg, helpBg, ioBg, classBg, resumeBg, endBg, loading);
  showCat('floor');
  showDesc(null);

  return {
    toast,
    setThumb(id, url) {
      state.thumbs[id] = url;
      const c = cards[id];
      if (c && c.firstChild && c.firstChild.tagName !== 'IMG') c.firstChild.replaceWith(h('img', { src: url, alt: '' }));
      const r = recentBox.querySelector(`[data-id="${id}"]`);
      if (r && r.firstChild.tagName !== 'IMG') r.firstChild.replaceWith(h('img', { src: url, alt: '' }));
    },
    setSelected(id) {
      state.selected = id;
      // show the piece's own category, unless it is already on screen in a search
      if (id && byId[id].cat !== state.cat && !cards[id]) showCat(byId[id].cat);
      if (id) noteUsed(id); else renderRecent();
      for (const [k, c] of Object.entries(cards)) c.classList.toggle('on', k === id);
      showDesc(id ? byId[id] : null);
    },
    setTool(t) {
      state.tool = t;
      palette.classList.toggle('placing', t === 'place'); // the pieces show only while placing
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
      where.textContent = !info ? '—' : info.problem ? info.problem : `Square ${info.i}, ${info.j} (${info.i * CELL}, ${info.j * CELL} ft)${info.text ? ' · ' + info.text : ''}`;
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
      hurt.classList.remove('on'); // showing the HUD again would replay the red flash
    },
    setPrompt(text, kind = null, sub = null) {
      cross.className = 'cross' + (kind ? ' ' + kind : '');
      if (!text) { prompt.style.display = 'none'; prompt._key = ''; return; }
      prompt.style.display = 'block';
      const key = text + '|' + (sub || '');
      if (prompt._key === key) return; // unchanged since the last frame
      prompt._key = key;
      prompt.innerHTML = '';
      prompt.append(h('span', { class: 'key' }, 'E'), text, sub ? h('small', {}, sub) : null);
    },
    // the game's state for the HUD (see Game.pushHud)
    setGame(g) {
      heroLine.textContent = g.cls ? `${g.cls} · AC ${g.ac}` + (g.keys ? ` · ${g.keys} ${g.keys === 1 ? 'key' : 'keys'}` : '') : 'Looking around';
      specialBtn.textContent = g.special ? `${g.special.name} (${g.special.uses})` : 'Special';
      specialBtn.hidden = !g.special;
      const c = g.combat;
      walkhud.classList.toggle('fighting', !!c);
      banner.hidden = turnbar.hidden = endBtn.hidden = !c;
      if (!c) return;
      const mine = c.turn === 'hero';
      banner.className = 'banner' + (mine ? ' mine' : '');
      banner.innerHTML = '';
      banner.append(h('b', {}, mine ? 'Your turn' : c.turn === 'mon' ? `${c.who}’s turn` : '…'), h('span', {}, `Round ${c.round}`),
        h('div', { class: 'order' }, c.order.map((o) => h('i', { class: o.current ? 'on' : '' }, o.name))));
      turnbar.innerHTML = '';
      if (mine) {
        turnbar.append(h('span', { class: c.moveLeft ? '' : 'spent' }, `Move ${c.moveLeft * CELL} ft`), h('span', { class: c.action ? '' : 'spent' }, c.action ? 'Action ready' : 'Action used'),
          g.special ? h('span', { class: g.special.uses ? '' : 'spent' }, h('kbd', {}, 'R'), `${g.special.name} (${g.special.uses})`) : null,
          h('span', {}, h('kbd', {}, 'Enter'), 'End turn'));
      } else turnbar.append(h('span', { class: 'spent' }, 'Wait for your turn'));
    },
    // one roll of the dice: { title, die (the d20, or null), sub, outcome, tone, lines }
    showRoll(r) {
      clearTimeout(rollTimer);
      clearInterval(rollSpin);
      const die = h('div', { class: 'die' + (r.die === 20 ? ' crit' : r.die === 1 ? ' fumble' : '') }, r.die === null ? '✦' : String(r.die));
      dice.className = 'dice on ' + (r.tone || '');
      dice.innerHTML = '';
      dice.append(die, h('div', { class: 'dice-text' }, h('b', {}, r.title), h('span', {}, r.sub), h('em', {}, r.outcome), r.lines.map((l) => h('span', { class: 'dmg' }, l))));
      if (r.die !== null && !calm) {
        // the die tumbles for a moment before it settles on the roll
        let n = 0;
        die.classList.add('rolling');
        rollSpin = setInterval(() => {
          die.textContent = String(1 + Math.floor(Math.random() * 20));
          if (++n > 6) { clearInterval(rollSpin); die.textContent = String(r.die); die.classList.remove('rolling'); }
        }, 45);
      }
      rollTimer = setTimeout(() => dice.classList.remove('on'), 3400);
    },
    log(msg, kind = '') {
      gamelog.append(h('div', { class: kind }, msg));
      while (gamelog.children.length > 5) gamelog.firstChild.remove();
    },
    clearGame() { gamelog.innerHTML = ''; dice.classList.remove('on'); hurt.classList.remove('on'); clearTimeout(rollTimer); clearInterval(rollSpin); },
    setTorch(on) { torchIcon.classList.toggle('on', on); },
    addFloat(text, kind) {
      const el = h('div', { class: 'float ' + kind }, text);
      overlay.append(el);
      return el;
    },
    // n health bars, kept from frame to frame: [{ el, fill, name }]
    foeBars(n) {
      while (bars.length < n) {
        const fill = h('i', {}), name = h('span', {}, '');
        const el = h('div', { class: 'foebar' }, name, h('div', {}, fill));
        overlay.append(el);
        bars.push({ el, fill, name });
      }
      for (let k = n; k < bars.length; k++) bars[k].el.style.display = 'none';
      return bars;
    },
    // a brief tint of the whole view: 'heal'
    flash(kind) {
      hurt.className = 'hurt';
      void hurt.offsetWidth;
      hurt.className = 'hurt on ' + kind;
    },
    pickClass,
    showSummary,
    askResume,
    // a walk waits to be resumed (text describes it), or none does (null)
    setPaused(text) {
      walkBtn.querySelector('.play-label').textContent = text ? 'Resume' : 'Play';
      walkBtn.title = text ? `A game is paused: ${text}. Changing the map resets it. (V)` : 'Play your dungeon in first person (V)';
    },
    minimap,
    setHealth(hp, max, peaceful, wasHit = false) {
      hpFill.style.width = (100 * hp / max) + '%';
      hpFill.classList.toggle('low', hp / max < 0.35);
      hpText.textContent = peaceful ? 'Peaceful' : `${hp} / ${max}`;
      if (wasHit) { hurt.className = 'hurt'; void hurt.offsetWidth; hurt.className = 'hurt on'; }
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
    modalOpen() { return [startBg, helpBg, ioBg, classBg, resumeBg, endBg].some((m) => m.classList.contains('open')); },
    closeModals() { for (const m of [helpBg, ioBg, classBg, resumeBg, endBg]) m.classList.remove('open'); },
    openIO,
    closeIO() { ioBg.classList.remove('open'); },
    selectIO() { ioArea.focus(); ioArea.select(); },
    doneLoading() { loading.classList.add('done'); setTimeout(() => loading.remove(), 600); },
    loadingText(t) { const s = loading.querySelector('small'); if (s) s.textContent = t; },
  };
}
