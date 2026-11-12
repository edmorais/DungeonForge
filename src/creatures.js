import * as THREE from 'three';
import { G, add, BX, CY, SP, CO, TO, LA, dyn, noShadow } from './geom.js';
import { flame, skullAt } from './models.js';

// The creatures, each built from the same few parts: tapered limbs with rounded joints, a turned
// torso, a head with a face. Every creature faces +z and is one moving group (`creature`), which
// turns to watch the walker; inside it the weapon arm is a second moving part (`arm`), swung when
// the creature attacks. world.js merges the rigid pieces of each part per material, so the detail
// here costs few draw calls.
const PI = Math.PI;
// the upper part of a ball: helmets, shoulder plates
const DOME = (r, part = 0.5) => new THREE.SphereGeometry(r, 12, 6, 0, PI * 2, 0, PI * part);

function creature() {
  const g = G();
  const body = dyn(G(), { creature: true });
  g.add(body);
  return [g, body];
}

// An arm hanging from a shoulder at (x, y): upper arm, elbow, forearm, hand. `up` swings the whole
// arm forward (negative) from the shoulder, `bend` folds the elbow. Returns { root, hand }; things
// held go into `hand`, whose +z points along the knuckles (up and forward for a raised arm).
function arm(parent, { x, y, z = 0, len, r, skin, cuff = skin, up = 0, bend = -0.3, out = 0.1 }) {
  const root = G();
  root.position.set(x, y, z);
  add(root, SP(r * 1.3, 8, 6), cuff, 0, 0, 0);
  add(root, CY(r, r * 0.86, len / 2, 8), skin, 0, -len / 4, 0);
  const fore = G();
  fore.position.set(0, -len / 2, 0);
  fore.rotation.x = bend;
  add(fore, SP(r * 0.92, 8, 6), skin, 0, 0, 0);
  add(fore, CY(r * 0.84, r * 0.68, len / 2, 8), skin, 0, -len / 4, 0);
  const hand = G();
  hand.position.set(0, -len / 2, 0);
  add(hand, SP(r * 1.08, 8, 6), skin, 0, 0, 0);
  fore.add(hand);
  root.add(fore);
  root.rotation.set(up, 0, Math.sign(x) * out); // out: away from the body
  parent.add(root);
  return { root, hand };
}

// Legs, torso, neck, head and two arms. Sizes in feet: `hip` is the leg length, `torso` the trunk,
// `sw` half the shoulder width, `lr` and `ar` the leg and arm thickness, `hr` the head's radius.
// Returns { head, handR, handL, top } so each creature can add its face, clothes and weapon.
function biped(b, { skin, hip, torso, sw, lr, ar, hr, wear = skin, legs = skin, belly = 1, bare = false, fwd = 0.06, armLen = torso * 1.05 }) {
  const top = hip + torso;
  for (const s of [-1, 1]) {
    const x = s * sw * 0.48;
    add(b, CY(lr, lr * 0.82, hip * 0.5, 8), legs, x, hip * 0.75, 0);
    add(b, SP(lr * 0.9, 8, 6), legs, x, hip * 0.5, 0.03);
    add(b, CY(lr * 0.78, lr * 0.6, hip * 0.46, 8), legs, x, hip * 0.27, 0);
    add(b, BX(lr * 1.7, lr * 0.85, lr * 3.2), legs, x, lr * 0.43, lr * 0.75);
  }
  if (!bare) {
    // hips, waist, chest, shoulders: one turned shape, flattened front to back
    add(b, LA([[0, 0], [sw * 0.74, 0.02], [sw * 0.68 * belly, torso * 0.32], [sw * 0.98, torso * 0.72], [sw * 0.86, torso * 0.93], [hr * 0.45, torso], [0, torso]], 12), wear, 0, hip - 0.05, 0).scale.z = 0.68;
    add(b, CY(hr * 0.42, hr * 0.5, hr * 0.5, 8), skin, 0, top + hr * 0.12, fwd * 0.5);
  }
  const head = G();
  head.position.set(0, top + hr * 0.95, fwd);
  add(head, SP(hr, 12, 10), skin, 0, 0, 0);
  b.add(head);
  const sy = top - ar * 0.5;
  const left = arm(b, { x: -(sw + ar * 0.3), y: sy, len: armLen, r: ar, skin, cuff: wear, up: 0.12, bend: -0.35 });
  // the weapon arm: raised, elbow bent, ready to strike
  const right = arm(b, { x: sw + ar * 0.3, y: sy, len: armLen, r: ar, skin, cuff: wear, up: -0.75, bend: -0.7 });
  dyn(right.root, { arm: true });
  return { head, handR: right.hand, handL: left.hand, top };
}

const eyes = (head, m, x, y, z, r) => { for (const s of [-1, 1]) add(head, SP(r, 6, 4), m, s * x, y, z); };

// Held weapons are built along +y from the grip. In the raised hand they point up and a little
// back over the shoulder, not at the walker's face; the swing of the arm brings them forward.
function hold(hand, weapon, tilt = -0.38) {
  weapon.rotation.x = PI / 2 + tilt;
  hand.add(weapon);
  return weapon;
}
function blade(len, w, mat = 'steel', guard = 'blackIron') {
  const s = G();
  add(s, BX(w, len, 0.035), mat, 0, len / 2 + 0.12, 0);
  add(s, CO(w * 0.72, w * 1.6, 4), mat, 0, len + 0.12 + w * 0.8, 0).scale.z = 0.07;
  add(s, BX(w * 4.2, 0.07, 0.09), guard, 0, 0.1, 0);
  add(s, CY(0.035, 0.035, 0.34, 6), 'leather', 0, -0.1, 0);
  add(s, SP(0.06, 6, 4), guard, 0, -0.3, 0);
  return s;
}

export function goblin() {
  const [g, b] = creature();
  const { head, handR, handL } = biped(b, { skin: 'goblinSkin', hip: 1.2, torso: 1.05, sw: 0.4, lr: 0.14, ar: 0.1, hr: 0.4, wear: 'leather', legs: 'goblinSkin', belly: 1.15, fwd: 0.14 });
  // a wide, low head: long ears, hooked nose, a mouthful of teeth
  head.scale.set(1.18, 0.92, 1);
  for (const s of [-1, 1]) add(head, CO(0.13, 0.95, 4), 'goblinSkin', s * 0.6, 0.14, -0.06, 0.25, 0, -s * (PI / 2 - 0.35)).scale.z = 0.35;
  add(head, CO(0.09, 0.42, 5), 'goblinSkin', 0, -0.04, 0.5, PI / 2 + 0.25, 0, 0);
  add(head, BX(0.36, 0.05, 0.1), 'pitBlack', 0, -0.2, 0.31);
  for (let k = 0; k < 4; k++) add(head, CO(0.025, 0.08, 4), 'teeth', -0.12 + k * 0.08, -0.17, 0.35, k % 2 ? PI : 0, 0, 0);
  add(head, BX(0.52, 0.07, 0.08), 'goblinSkin', 0, 0.16, 0.31, 0.3, 0, 0); // brow
  eyes(head, 'eyeGreen', 0.15, 0.08, 0.33, 0.07);
  // rags, a belt with a pouch, a notched knife and a buckler
  add(b, CY(0.44, 0.52, 0.5, 8), 'leather', 0, 1.2, 0).scale.z = 0.72;
  add(b, TO(0.4, 0.045, 5, 12), 'rope', 0, 1.52, 0, PI / 2, 0, 0).scale.y = 0.72;
  add(b, BX(0.16, 0.2, 0.12), 'leather', 0.3, 1.38, 0.24);
  const knife = blade(0.62, 0.09, 'iron');
  add(knife, BX(0.05, 0.1, 0.04), 'pitBlack', 0.04, 0.5, 0);
  hold(handR, knife);
  const buckler = G();
  add(buckler, CY(0.36, 0.36, 0.05, 10), 'darkWood', 0, 0, 0);
  add(buckler, SP(0.1, 8, 6), 'iron', 0, 0.05, 0);
  buckler.rotation.set(0, 0, PI / 2);
  buckler.position.set(-0.1, 0, 0.05);
  handL.add(buckler);
  return g;
}

export function skeletonWarrior() {
  const [g, b] = creature();
  const hip = 2.7, torso = 1.9;
  const { head, handR, handL, top } = biped(b, { skin: 'bone', hip, torso, sw: 0.56, lr: 0.075, ar: 0.06, hr: 0.34, bare: true, fwd: 0.05 });
  // pelvis, spine and a cage of ribs in place of a torso
  add(b, BX(0.7, 0.22, 0.34), 'bone', 0, hip, 0);
  add(b, CO(0.3, 0.4, 6), 'bone', 0, hip + 0.02, 0, PI, 0, 0).scale.z = 0.6;
  for (let k = 0; k < 7; k++) add(b, CY(0.075, 0.075, 0.2, 6), 'bone', 0, hip + 0.22 + k * 0.26, -0.08);
  for (let k = 0; k < 5; k++) {
    const r = 0.4 - Math.abs(k - 1.6) * 0.045;
    add(b, TO(r, 0.035, 4, 14, PI * 1.5), 'bone', 0, hip + 0.72 + k * 0.24, 0.04, PI / 2, 0, PI * 0.75).scale.y = 0.75;
  }
  add(b, BX(0.16, 1.0, 0.05), 'bone', 0, hip + 1.2, 0.33); // breastbone
  add(b, BX(1.15, 0.1, 0.12), 'bone', 0, top - 0.04, 0); // collar
  add(b, CY(0.06, 0.07, 0.3, 6), 'bone', 0, top + 0.12, 0);
  // the skull: hollow eyes with a red glow far back, a jaw, an old iron cap
  add(head, BX(0.42, 0.24, 0.36), 'bone', 0, -0.28, 0.08);
  for (const s of [-1, 1]) add(head, SP(0.1, 8, 6), 'pitBlack', s * 0.13, 0.02, 0.27);
  eyes(head, 'eyeRed', 0.13, 0.02, 0.3, 0.04);
  add(head, CO(0.05, 0.1, 3), 'pitBlack', 0, -0.1, 0.33, PI / 2, 0, 0);
  for (let k = 0; k < 5; k++) add(head, BX(0.05, 0.08, 0.03), 'teeth', -0.14 + k * 0.07, -0.24, 0.27);
  add(head, DOME(0.37), 'iron', 0, 0.04, 0);
  add(head, CY(0.42, 0.44, 0.04, 12), 'iron', 0, 0.05, 0);
  // rusted sword and a battered round shield
  hold(handR, blade(2.1, 0.13, 'iron'));
  const shield = G();
  add(shield, CY(0.82, 0.82, 0.08, 14), 'darkWood', 0, 0, 0);
  add(shield, TO(0.82, 0.05, 4, 18), 'iron', 0, 0.02, 0, PI / 2, 0, 0);
  add(shield, SP(0.17, 8, 6), 'blackIron', 0, 0.07, 0);
  shield.rotation.set(0, 0, PI / 2);
  shield.position.set(-0.12, 0.1, 0.1);
  handL.add(shield);
  return g;
}

export function orc() {
  const [g, b] = creature();
  const { head, handR, top } = biped(b, { skin: 'orcSkin', hip: 2.3, torso: 2.15, sw: 0.92, lr: 0.27, ar: 0.22, hr: 0.48, wear: 'leather', legs: 'leather', belly: 1.1, fwd: 0.16 });
  // heavy jaw with tusks, a low brow, small red eyes, a topknot
  add(head, BX(0.7, 0.36, 0.5), 'orcSkin', 0, -0.26, 0.2);
  for (const s of [-1, 1]) add(head, CO(0.07, 0.34, 5), 'horn', s * 0.24, -0.1, 0.44, -0.15, 0, s * 0.12);
  add(head, BX(0.78, 0.1, 0.14), 'orcSkin', 0, 0.16, 0.38, 0.35, 0, 0);
  add(head, CO(0.09, 0.26, 5), 'orcSkin', 0, 0.0, 0.48, PI / 2, 0, 0);
  for (const s of [-1, 1]) add(head, CO(0.1, 0.4, 4), 'orcSkin', s * 0.5, 0.08, 0, 0, 0, -s * (PI / 2 - 0.5)).scale.z = 0.4;
  eyes(head, 'eyeRed', 0.18, 0.08, 0.42, 0.06);
  add(head, CY(0.1, 0.16, 0.5, 6), 'pitBlack', 0, 0.55, -0.12, -0.4, 0, 0);
  // iron breastplate, spiked pauldrons, belt with a skull, fur at the waist
  add(b, LA([[0, 0], [0.74, 0], [1.0, 0.9], [0.88, 1.25], [0, 1.3]], 12), 'blackIron', 0, 3.05, 0.02).scale.z = 0.74;
  for (const s of [-1, 1]) {
    add(b, DOME(0.42, 0.55), 'blackIron', s * 1.05, top - 0.02, 0);
    add(b, CO(0.09, 0.4, 5), 'iron', s * 1.15, top + 0.4, 0, 0, 0, -s * 0.35);
  }
  add(b, CY(0.78, 0.82, 0.3, 12), 'leather', 0, 2.5, 0).scale.z = 0.7;
  add(b, BX(0.3, 0.26, 0.1), 'brass', 0, 2.5, 0.58);
  for (let k = 0; k < 7; k++) add(b, CO(0.16, 0.7, 4), 'canvas', -0.6 + k * 0.2, 2.1, k % 2 ? 0.42 : -0.42, PI, 0, 0);
  // a great axe with a bearded blade and a back spike
  const axe = G();
  add(axe, CY(0.07, 0.08, 4.4, 6), 'darkWood', 0, 1.4, 0);
  add(axe, new THREE.CylinderGeometry(0.7, 0.7, 0.07, 10, 1, false, PI / 2 - 0.75, 1.5), 'steel', 0.05, 3.1, 0, PI / 2, 0, 0);
  add(axe, CO(0.12, 0.5, 4), 'iron', -0.3, 3.1, 0, 0, 0, PI / 2);
  add(axe, TO(0.1, 0.03, 4, 8), 'iron', 0, 2.6, 0, PI / 2, 0, 0);
  add(axe, SP(0.1, 6, 4), 'iron', 0, -0.82, 0);
  hold(handR, axe, -0.32);
  return g;
}

export function cultist() {
  const [g, b] = creature();
  // a long robe with a rope belt; nothing shows of the body but the hands
  add(b, LA([[0, 0], [1.0, 0], [0.92, 0.12], [0.72, 1.6], [0.56, 3.3], [0.66, 3.75], [0.5, 4.25], [0.2, 4.5], [0, 4.5]], 14), 'purpleCloth', 0, 0, 0);
  add(b, TO(0.6, 0.05, 5, 14), 'rope', 0, 2.95, 0, PI / 2, 0, 0);
  add(b, CY(0.04, 0.04, 0.9, 5), 'rope', 0.3, 2.5, 0.5);
  add(b, CY(0.14, 0.14, 0.03, 10), 'gold', 0, 3.7, 0.62, PI / 2, 0, 0); // amulet
  // a deep hood: darkness, and two green points in it
  const head = G();
  head.position.set(0, 4.95, 0.08);
  add(head, SP(0.52, 12, 10), 'purpleCloth', 0, 0, -0.06).scale.set(1, 1.12, 1.05);
  add(head, CO(0.3, 0.7, 8), 'purpleCloth', 0, 0.55, -0.3, -0.7, 0, 0);
  add(head, SP(0.38, 10, 8), 'pitBlack', 0, -0.06, 0.3).scale.set(0.95, 1.1, 0.7);
  eyes(head, 'eyeGreen', 0.12, -0.02, 0.56, 0.055);
  b.add(head);
  arm(b, { x: -0.62, y: 4.05, len: 1.9, r: 0.17, skin: 'purpleCloth', up: -0.45, bend: -1.1, out: -0.3 });
  const right = arm(b, { x: 0.62, y: 4.05, len: 1.9, r: 0.17, skin: 'purpleCloth', up: -0.6, bend: -0.5 });
  dyn(right.root, { arm: true });
  // a crooked staff that burns with witchfire
  const staff = G();
  add(staff, CY(0.05, 0.07, 7.2, 6), 'darkWood', 0, 0.78, 0); // long enough to stand on the floor
  for (let k = 0; k < 3; k++) add(staff, CO(0.05, 0.5, 4), 'darkWood', Math.cos(k * 2.1) * 0.16, 4.2, Math.sin(k * 2.1) * 0.16, Math.sin(k * 2.1) * 0.35, 0, -Math.cos(k * 2.1) * 0.35);
  add(staff, SP(0.17, 8, 6), 'eyeGreen', 0, 4.25, 0);
  const f = flame(0.55, 'green');
  f.position.set(0, 4.3, 0);
  staff.add(f);
  hold(right.hand, staff, -0.47); // upright
  return g;
}

export function ogre() {
  const [g, b] = creature();
  const { head, handR, top } = biped(b, { skin: 'ogreSkin', hip: 3.5, torso: 3.3, sw: 1.65, lr: 0.52, ar: 0.42, hr: 0.78, belly: 1.4, fwd: 0.35 });
  // a great belly, a hide kilt and a belt of rope
  add(b, SP(1.5, 14, 10), 'ogreSkin', 0, 4.5, 0.35).scale.set(1, 0.85, 0.8);
  add(b, CY(1.3, 1.5, 1.3, 12), 'leather', 0, 3.3, 0).scale.z = 0.75;
  add(b, TO(1.28, 0.1, 5, 14), 'rope', 0, 3.9, 0, PI / 2, 0, 0).scale.y = 0.76;
  for (let k = 0; k < 3; k++) skullAt(b, -0.7 + k * 0.7, 3.5, 1.02, 0.8);
  // small head on a thick neck: underbite, tusks, ears, one broken horn
  add(head, BX(1.05, 0.5, 0.7), 'ogreSkin', 0, -0.42, 0.34);
  for (const s of [-1, 1]) add(head, CO(0.09, 0.42, 5), 'horn', s * 0.36, -0.22, 0.66);
  add(head, SP(0.2, 8, 6), 'ogreSkin', 0, -0.02, 0.76);
  add(head, BX(1.2, 0.16, 0.2), 'ogreSkin', 0, 0.26, 0.62, 0.3, 0, 0);
  for (const s of [-1, 1]) add(head, SP(0.22, 8, 6), 'ogreSkin', s * 0.8, 0, 0).scale.set(0.5, 1, 0.9);
  add(head, CO(0.16, 0.5, 5), 'horn', 0.3, 0.75, 0.1, 0, 0, -0.3);
  eyes(head, 'eyeRed', 0.28, 0.12, 0.68, 0.09);
  add(b, DOME(0.6, 0.55), 'leather', -1.9, top - 0.05, 0);
  // a tree trunk with iron spikes for a club
  const club = G();
  add(club, CY(0.5, 0.2, 4.6, 8), 'log', 0, 2.0, 0);
  add(club, TO(0.42, 0.07, 4, 10), 'iron', 0, 3.4, 0, PI / 2, 0, 0);
  for (let k = 0; k < 7; k++) add(club, CO(0.1, 0.5, 4), 'iron', Math.cos(k * 1.9) * 0.5, 2.9 + k * 0.22, Math.sin(k * 1.9) * 0.5, Math.sin(k * 1.9) * 1.5, 0, -Math.cos(k * 1.9) * 1.5);
  hold(handR, club, -0.3);
  return g;
}

export function wraith() {
  const [g, b] = creature();
  b.userData.float = true;
  // a hollow robe that tapers to nothing, with a ragged hem
  add(b, LA([[0.05, 0.0], [0.95, 0.35], [0.75, 1.5], [0.55, 3.2], [0.62, 3.9], [0.4, 4.5], [0, 4.6]], 12), 'wraith', 0, 0.5, 0);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * PI * 2 + 0.3;
    add(b, CO(0.24, 1.0 + (k % 3) * 0.3, 4), 'wraith', Math.cos(a) * 0.7, 0.45, Math.sin(a) * 0.7, PI, a, 0);
  }
  // a cowl with a pale skull deep inside
  add(b, SP(0.56, 12, 10), 'wraith', 0, 5.35, -0.05).scale.set(1, 1.15, 1.05);
  add(b, CO(0.32, 0.9, 8), 'wraith', 0, 5.95, -0.38, -0.8, 0, 0);
  add(b, SP(0.3, 10, 8), 'bone', 0, 5.28, 0.14).scale.set(0.85, 1, 0.8);
  add(b, SP(0.07, 6, 4), 'eyeBlue', -0.11, 5.32, 0.36);
  add(b, SP(0.07, 6, 4), 'eyeBlue', 0.11, 5.32, 0.36);
  // long arms reaching out, with bone fingers
  // (see-through pieces are each drawn on their own, so a sleeve is one cone, not a jointed arm)
  for (const s of [-1, 1]) {
    const sleeve = G();
    sleeve.position.set(s * 0.55, 4.55, 0.1);
    add(sleeve, CO(0.26, 2.3, 6), 'wraith', 0, -1.15, 0);
    for (let k = 0; k < 4; k++) add(sleeve, CO(0.028, 0.5, 4), 'bone', -0.12 + k * 0.08, -2.5, 0, PI + 0.25 * (k - 1.5), 0, 0);
    sleeve.rotation.set(-1.15, 0, s * 0.3);
    if (s > 0) dyn(sleeve, { arm: true });
    b.add(sleeve);
  }
  noShadow(b);
  return g;
}

export function oozeCube() {
  const [g, b] = creature();
  b.userData.wobble = true;
  add(b, BX(2.8, 2.8, 2.8), 'ooze', 0, 1.4, 0).userData.noShadow = true;
  add(b, BX(2.2, 2.2, 2.2), 'ooze', 0, 1.35, 0).userData.noShadow = true; // a denser heart
  // what it has not finished: a skull, bones, a helm, a sword, a few coins
  skullAt(b, 0.2, 1.0, 0.1, 1.2);
  add(b, CY(0.05, 0.05, 1.2, 5), 'bone', -0.5, 0.6, -0.4, 0.4, 0, 1.2);
  add(b, CY(0.05, 0.05, 0.9, 5), 'bone', 0.5, 1.9, 0.5, 1.1, 0.4, 0.3);
  for (let k = 0; k < 3; k++) add(b, TO(0.2 - k * 0.03, 0.025, 4, 10, PI), 'bone', -0.4, 1.7 + k * 0.14, 0.2, 0.3, 0.6, 0);
  add(b, DOME(0.3), 'iron', 0.6, 0.5, -0.5, 0.5, 0, 0.4);
  add(b, BX(0.07, 1.3, 0.02), 'steel', -0.2, 1.3, -0.7, 0.3, 0.5, 0.9);
  for (let k = 0; k < 4; k++) add(b, CY(0.1, 0.1, 0.025, 8), 'gold', -0.7 + k * 0.42, 0.7 + (k % 2) * 0.9, 0.55 - k * 0.3, 0.6 * k, 0, 0.4 * k);
  return g;
}

export function giantSpider() {
  const [g, b] = creature();
  // a fat abdomen with a red mark, a smaller front part with eyes, fangs and feelers
  add(b, SP(1.35, 14, 10), 'spiderBody', 0, 1.9, -1.15).scale.set(1, 0.88, 1.25);
  add(b, SP(0.4, 8, 6), 'eyeRed', 0, 2.92, -1.3).scale.set(0.5, 0.25, 0.9);
  add(b, CO(0.2, 0.5, 6), 'spiderBody', 0, 1.7, -2.8, -PI / 2, 0, 0);
  add(b, SP(0.8, 12, 8), 'spiderBody', 0, 1.65, 0.6).scale.set(1, 0.8, 1.1);
  for (let k = 0; k < 8; k++) add(b, SP(k < 2 ? 0.12 : 0.07, 6, 4), 'eyeRed', (k % 2 ? 1 : -1) * (0.14 + Math.floor(k / 2) * 0.13), 1.95 - Math.floor(k / 2) * 0.07, 1.32 - Math.floor(k / 2) * 0.1);
  for (const s of [-1, 1]) {
    add(b, CY(0.1, 0.13, 0.5, 6), 'spiderBody', s * 0.22, 1.35, 1.35, 0.5, 0, 0);
    add(b, CO(0.07, 0.5, 5), 'horn', s * 0.2, 0.95, 1.5, PI - 0.3, 0, s * 0.2);
    add(b, CY(0.05, 0.07, 0.9, 5), 'spiderBody', s * 0.5, 1.5, 1.5, 1.1, 0, -s * 0.4);
  }
  // eight legs in three joints: up from the body, out, then down to a point
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const leg = G();
    const up = G();
    add(up, CY(0.1, 0.14, 1.9, 6), 'spiderBody', 0, 0.95, 0);
    add(up, SP(0.14, 6, 5), 'spiderBody', 0, 1.9, 0);
    up.rotation.z = -s * 0.85;
    const mid = G();
    add(mid, CY(0.07, 0.1, 1.7, 6), 'spiderBody', 0, -0.85, 0);
    add(mid, SP(0.1, 6, 5), 'spiderBody', 0, -1.7, 0);
    mid.position.set(s * 1.43, 1.25, 0);
    mid.rotation.z = s * 0.9;
    const tip = G();
    add(tip, CO(0.07, 1.75, 5), 'spiderBody', 0, -0.87, 0, PI, 0, 0);
    tip.position.set(s * 2.76, 0.19, 0);
    tip.rotation.z = s * 0.12;
    leg.add(up, mid, tip);
    leg.position.set(s * 0.5, 1.6, 0.55 - k * 0.5);
    leg.rotation.y = s * (-0.95 + k * 0.62);
    b.add(leg);
  }
  return g;
}

// A young red dragon, about 14 ft from snout to rump with its wings half open. It fills three
// squares by three and does not walk; it turns its whole body to watch the walker.
export function youngDragon() {
  const [g, b] = creature();
  const R = 'redScale', Bl = 'bellyScale';
  // barrel of a body, paler underneath, a ridge of spines along the back
  add(b, SP(1, 16, 12), R, 0, 4.6, -0.6).scale.set(2.5, 2.2, 4.3);
  add(b, SP(1, 14, 10), Bl, 0, 3.9, -0.3).scale.set(2.0, 1.7, 3.7);
  for (let k = 0; k < 9; k++) add(b, CO(0.22, 0.9 - Math.abs(k - 4) * 0.08, 4), 'horn', 0, 6.9 - Math.abs(k - 3.5) * 0.09, -4.0 + k * 0.85, -0.25, 0, 0);
  // four legs: haunch, shin, a broad foot with three claws
  for (const [x, z, s] of [[-2.2, 2.2, 0.9], [2.2, 2.2, 0.9], [-2.4, -3.2, 1.15], [2.4, -3.2, 1.15]]) {
    add(b, SP(1, 10, 8), R, x * 0.92, 3.6, z).scale.set(0.95 * s, 1.5 * s, 1.25 * s);
    add(b, CY(0.42 * s, 0.5 * s, 2.3, 8), R, x * 1.05, 1.5, z + 0.25, 0.2, 0, 0);
    add(b, BX(1.1 * s, 0.45, 1.7 * s), R, x * 1.08, 0.24, z + 0.75);
    for (let c = -1; c <= 1; c++) add(b, CO(0.13, 0.6, 5), 'horn', x * 1.08 + c * 0.36 * s, 0.2, z + 1.75 * s, PI / 2 + 0.2, 0, 0);
  }
  // an S of a neck rising to the head
  const neck = [[4.0, 5.6], [4.9, 6.6], [5.5, 7.8], [5.8, 9.0], [5.9, 10.1]];
  neck.forEach(([z, y], k) => {
    add(b, SP(1.2 - k * 0.11, 10, 8), R, 0, y, z);
    add(b, SP(0.95 - k * 0.1, 8, 6), Bl, 0, y - 0.25, z + 0.35);
    add(b, CO(0.16, 0.6, 4), 'horn', 0, y + 1.15 - k * 0.1, z - 0.5, -0.5, 0, 0);
  });
  const head = G();
  head.position.set(0, 10.6, 6.6);
  head.rotation.x = 0.22;
  add(head, SP(1, 12, 10), R, 0, 0, 0).scale.set(0.95, 0.85, 1.25);
  add(head, BX(1.15, 0.7, 2.0), R, 0, -0.1, 1.5);
  add(head, BX(0.9, 0.5, 0.7), R, 0, 0.05, 2.6);
  add(head, BX(0.95, 0.3, 2.3), Bl, 0, -0.75, 1.35, 0.16, 0, 0); // the lower jaw, a little open
  for (const s of [-1, 1]) {
    add(head, CO(0.2, 1.9, 6), 'horn', s * 0.55, 0.85, -0.85, -1.15, 0, s * 0.22);
    add(head, CO(0.13, 0.9, 5), 'horn', s * 0.85, 0.3, -0.6, -1.3, 0, s * 0.6);
    add(head, SP(0.17, 8, 6), 'eyeRed', s * 0.62, 0.3, 0.75);
    add(head, BX(0.5, 0.14, 0.7), R, s * 0.6, 0.52, 0.7, 0, 0, s * 0.3); // brow
    add(head, SP(0.09, 6, 4), 'pitBlack', s * 0.28, 0.32, 2.9);
    for (let k = 0; k < 6; k++) {
      add(head, CO(0.07, 0.3, 4), 'teeth', s * 0.5, -0.5, 0.7 + k * 0.36, PI, 0, 0);
      add(head, CO(0.06, 0.24, 4), 'teeth', s * 0.42, -0.58, 0.85 + k * 0.33);
    }
  }
  b.add(head);
  // wings: an arm, three long fingers and the skin between them
  for (const s of [-1, 1]) {
    const wing = G();
    wing.position.set(s * 1.7, 6.2, 0.2);
    wing.rotation.set(-0.15, s * -0.3, s * 0.42);
    add(wing, CY(0.2, 0.3, 4.4, 6), R, s * 2.1, 0.5, 0, 0, 0, -s * 1.2);
    const tips = [[7.6, 3.2], [8.6, 0.4], [7.0, -2.4]];
    for (const [tx, ty] of tips) {
      const len = Math.hypot(tx - 4.1, ty - 1.3);
      add(wing, CY(0.07, 0.15, len, 5), R, s * (4.1 + (tx - 4.1) / 2), 1.3 + (ty - 1.3) / 2, 0, 0, 0, -s * Math.atan2(tx - 4.1, ty - 1.3));
    }
    const skin = new THREE.Shape();
    skin.moveTo(0, 0); skin.lineTo(4.1, 1.3); skin.lineTo(7.6, 3.2); skin.quadraticCurveTo(7.2, 1.6, 8.6, 0.4); skin.quadraticCurveTo(7.0, -0.6, 7.0, -2.4); skin.quadraticCurveTo(4.6, -1.4, 3.0, -2.6); skin.quadraticCurveTo(1.6, -1.4, 0, -1.6); skin.lineTo(0, 0);
    const m = add(wing, new THREE.ShapeGeometry(skin), 'wing', 0, 0, -0.03);
    m.scale.x = s;
    b.add(wing);
  }
  // a long tail curling to one side, ending in a blade
  let tx = 0, tz = -4.6, ty = 4.0;
  for (let k = 0; k < 11; k++) {
    add(b, SP(1.25 - k * 0.1, 8, 6), R, tx, ty, tz);
    if (k % 2 === 0) add(b, CO(0.15, 0.55, 4), 'horn', tx, ty + 1.2 - k * 0.1, tz);
    tz -= 0.95 - k * 0.03; tx += Math.sin(k * 0.45) * 0.55; ty = Math.max(0.5, ty - 0.42);
  }
  add(b, CO(0.6, 1.5, 4), 'horn', tx, ty, tz - 0.5, -PI / 2, 0, 0).scale.x = 0.3;
  return g;
}