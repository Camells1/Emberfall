'use strict';
// HD-2D monsters and bosses as 3D creatures. Every enemy in the game uses one of the sprite types in
// gfx/monsters.js (slime, wolf, goblin, knight, golem, treant...) plus a colour palette; this builds a
// matching 3D model for each type from the same palette, so every variant and every boss (a bigger,
// crowned version of a type) gets one. Animated from the enemy state: walk, wind-up, attack, cast,
// flying, jumping, hit flash, freeze tint, death topple, elite glow. Game logic is untouched.
(function (R) {
  const U = R.U;
  const MB = R.HD2DMonsters = {};
  const PI = Math.PI, TAU = PI * 2;
  const sh = (c, k) => U.shade(c || '#888888', k);
  let T = null;

  // ---------------------------------------------------------------- helpers
  const glowEyes = (k, par, x, y, z, r, col) => { for (const s of [-1, 1]) { k.add(par, 'sph', k.mat(col || '#ff3030', true), s * x, y, z, r, r * 1.1, r * 0.7); } };
  const darkEyes = (k, par, x, y, z, r) => { for (const s of [-1, 1]) { k.add(par, 'sph', '#140c1c', s * x, y, z, r); k.add(par, 'sph', k.mat('#ffffff', true), s * x + r * 0.3, y + r * 0.35, z + r * 0.7, r * 0.3); } };
  function legs4(k, g, pos, len, r, col, foot) {
    return pos.map(([x, z]) => { const L = k.grp(g, x, len, z); k.add(L, 'cap:1', col, 0, -len / 2 + 0.3, 0, r, (len - 0.6) / 3, r); if (foot) k.add(L, 'sph', foot, 0, -len + 0.6, 0.3, r * 1.15, r * 0.8, r * 1.4); return L; });
  }
  // weapons held along +z from the hand
  function held(k, par, type, col, len) {
    const W = k.grp(par, 0, 0, 0), m = k.mat(col || '#c8ccd4', false, true), wood = '#6a4a2c';
    len = len || 12;
    if (type === 'bow') { const a = k.add(W, 'arc', wood, 0, 0, 0, 1, len * 0.6, len * 0.6, 0, PI / 2, 0); a.castShadow = true; }
    else if (type === 'staff' || type === 'ankh') { k.add(W, 'cyl', wood, 0, 0, -len * 0.5, 0.5, len * 1.6, 0.5, PI / 2); k.add(W, type === 'ankh' ? 'ring' : 'sph', k.mat(col || '#80e0ff', true), 0, 0, len * 1.15, type === 'ankh' ? 1.4 : 1.3, type === 'ankh' ? 5 : 1.3, 1.3, PI / 2); }
    else if (type === 'scythe') { k.add(W, 'cyl', wood, 0, 0, -len * 0.5, 0.45, len * 1.7, 0.45, PI / 2); k.add(W, 'axehead', m, 0, 0, len * 1.1, len * 0.55, 2, 3, PI / 2, 0, PI); }
    else if (type === 'club') { k.add(W, 'cap:1', wood, 0, 0, len * 0.4, 0.9, len * 0.28, 0.9, PI / 2); k.add(W, 'sph', sh(wood, 0.1), 0, 0, len * 0.8, 1.8); }
    else if (type === 'trident') { k.add(W, 'cyl', m, 0, 0, -len * 0.4, 0.4, len * 1.5, 0.4, PI / 2); for (const x of [-1.3, 0, 1.3]) k.add(W, 'cone', m, x, 0, len * 1.1, 0.4, 2.6, 0.4, PI / 2); k.add(W, 'box', m, 0, 0, len * 1.08, 3, 0.4, 0.4); }
    else if (type === 'axe') { k.add(W, 'cyl', wood, 0, 0, -1, 0.5, len, 0.5, PI / 2); k.add(W, 'axehead', m, 0.3, 0, len * 0.75, 3.8, 4, 3, PI / 2, 0, 0); }
    else { k.add(W, 'cyl', wood, 0, 0, -1.4, 0.45, 2.6, 0.45, PI / 2); k.add(W, 'box', m, 0, 0, 1.3, 2.8, 0.5, 0.5); k.add(W, 'blade', m, 0, 0, 1.5, 1.2, len, 1, PI / 2); }
    return W;
  }

  // Generic humanoid: o = { h, skin, top, bottom, bulk, hunch, robe, head(k, headGroup, r), weapon, wcol, shield, cape, tail, wings, feet, arms }
  function humanoid(k, g, o) {
    const r = { legs: [], arms: [], wings: [], kind: 'biped' };
    const H = o.h, bulk = o.bulk || 1, leg = H * 0.19, hip = leg * 2, hr = H * 0.13 * (o.headK || 1);
    const top = o.top || o.skin, bottom = o.bottom || (typeof top === 'string' ? sh(top, -0.3) : top);
    const body = r.body = k.grp(g, 0, 0, 0);
    if (!o.float) for (const s of [-1, 1]) {
      const L = k.grp(body, s * H * 0.07 * bulk, hip, 0);
      k.add(L, 'limb', bottom, 0, -leg / 2, 0, H * 0.06 * bulk, leg / 2 + 0.3, H * 0.062 * bulk);
      const kn = k.grp(L, 0, -leg, 0); L.userData.knee = kn;
      k.add(kn, 'calf', o.shin || bottom, 0, -leg / 2, 0, H * 0.052 * bulk, leg / 2 + 0.2, H * 0.054 * bulk);
      if (o.feet === 'claw') for (const a of [-0.5, 0, 0.5]) k.add(kn, 'cone', o.footCol || '#e0b040', Math.sin(a) * 1.2, -leg + 0.2, 1, 0.45, 3, 0.4, PI / 2 - 0.2, a);
      else k.add(kn, 'shoe', o.footCol || (typeof bottom === 'string' ? sh(bottom, -0.3) : '#2a2a30'), 0, -leg - 0.1, H * 0.022, H * 0.048 * bulk, H * 0.036, H * 0.07);
      r.legs.push(L);
    }
    const tor = r.torso = k.grp(body, 0, o.float ? H * 0.28 : hip, 0);
    tor.rotation.x = o.hunch || 0;
    k.add(tor, 'torso', top, 0, 0, 0, H * 0.032 * bulk, H * 0.03, H * 0.024 * bulk);
    if (o.robe) k.add(body, 'skirt', o.robe, 0, hip + 0.5, 0, H * 0.036 * bulk, (hip + 0.5) / 11.2, H * 0.03 * bulk);
    if (o.belly) k.add(tor, 'sph', o.belly, 0, H * 0.12, H * 0.05 * bulk, H * 0.075 * bulk, H * 0.1, H * 0.035);
    // head
    const head = r.head = k.grp(tor, 0, H * 0.34 + hr * 0.85, H * 0.01);
    if (o.head) o.head(k, head, hr); else { k.add(head, 'sph', o.skin, 0, 0, 0, hr); }
    // arms
    for (const s of [-1, 1]) {
      const A = k.grp(tor, s * H * 0.13 * bulk, H * 0.29, 0);
      const al = H * 0.15 * (o.armK || 1);
      k.add(A, 'sph', o.sleeve || top, 0, 0, 0, H * 0.05 * bulk);
      k.add(A, 'limb', o.sleeve || top, 0, -al / 2, 0, H * 0.045 * bulk, al / 2 + 0.2, H * 0.045 * bulk);
      const el = k.grp(A, 0, -al, 0); A.userData.elbow = el;
      k.add(el, 'calf', o.fore || o.skin, 0, -al / 2, 0, H * 0.04 * bulk, al / 2 + 0.2, H * 0.04 * bulk);
      const hand = k.grp(el, 0, -al - 0.4, 0.2); A.userData.hand = hand;
      if (o.claws) for (const a of [-0.4, 0, 0.4]) k.add(hand, 'cone', o.claws, Math.sin(a) * 0.9, -0.5, 0.3, 0.35, 2.6, 0.35, PI - 0.3, 0, a);
      else k.add(hand, 'sph', o.hand || o.skin, 0, 0, 0, H * 0.035 * bulk, H * 0.042, H * 0.03);
      r.arms.push(A);
    }
    if (o.weapon) r.weapon = held(k, r.arms[1].userData.hand, o.weapon, o.wcol, o.wlen || H * 0.4);
    if (o.shield) { const sg = k.grp(r.arms[0].userData.hand, -0.8, 1, 0.8); k.add(sg, 'cyl', o.shield, 0, 0, 0, H * 0.13, 0.8, H * 0.14, 0, 0, PI / 2); k.add(sg, 'ring', k.mat(o.trim || sh(o.shield, 0.4), false, true), -0.85, 0, 0, H * 0.13, 3, H * 0.14, 0, 0, PI / 2); }
    if (o.cape) { const C = k.grp(tor, 0, H * 0.32, -H * 0.07); const cl = hip + H * 0.28; k.add(C, 'box', o.cape, 0, -cl / 2, 0, H * 0.24 * bulk, cl, 0.5); r.cape = C; }
    if (o.tail) { const tl = k.grp(tor, 0, H * 0.02, -H * 0.06); k.add(tl, 'cone', o.tail, 0, 0, 0, H * 0.05, H * 0.5, H * 0.05, -PI / 2 - 0.5); r.tail = tl; }
    if (o.wings) for (const s of [-1, 1]) { const w = k.grp(tor, s * H * 0.06, H * 0.26, -H * 0.07); k.add(w, 'sph', o.wings, s * H * 0.16, H * 0.05, -1, H * 0.17, 0.6, H * 0.09, 0, 0, -s * 0.3); k.add(w, 'sph', typeof o.wings === 'string' ? sh(o.wings, 0.12) : o.wings, s * H * 0.3, H * 0.12, -1.8, H * 0.11, 0.5, H * 0.07, 0, -s * 0.3, -s * 0.5); r.wings.push(w); }
    r.hipY = o.float ? H * 0.28 : hip;
    return r;
  }

  // ---------------------------------------------------------------- the creature types
  // Each: (k, g, p) -> parts. Sizes are roughly the 2D sprite's pixel size.
  const B = {};
  B.slime = (k, g, p) => {
    const m = p.main || '#60d080', r = { kind: 'blob' };
    const bm = k.mat(m); bm.transparent = true; bm.opacity = 0.86; bm.userData.keepAlpha = 0.86;
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'sph', bm, 0, 7, 0, 9.5, 7.5, 9.5);
    k.add(b, 'sph', k.mat(sh(m, 0.35), true), -3, 11, 3.5, 2, 1.2, 1.2);
    if (p.core) k.add(b, 'sph', k.mat(p.core, true), 0, 6, 0, 2.4);
    for (const s of [-1, 1]) { k.add(b, 'sph', p.eye || '#101018', s * 2.8, 8.5, 8.4, 1.1, 1.6, 0.8); k.add(b, 'sph', k.mat('#ffffff', true), s * 2.8 + 0.4, 9.3, 9.1, 0.4); }
    if (p.crown) { k.add(b, 'cyl', k.mat(p.crown, false, true), 0, 13.4, 0, 3.6, 2.2, 3.6); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(b, 'cone', k.mat(p.crown, false, true), Math.sin(a) * 3.2, 15.4, Math.cos(a) * 3.2, 0.8, 2.4, 0.8); } }
    if (p.spikes) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(b, 'cone', p.spikes, Math.sin(a) * 5, 12, Math.cos(a) * 5, 1.2, 3.4, 1.2, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); }
    return r;
  };
  B.wolf = (k, g, p) => {
    const m = p.main || '#7a7a82', r = { kind: 'quad' };
    r.legs = legs4(k, g, [[-2.6, 6], [2.6, 6], [-2.6, -6], [2.6, -6]], 9, 1.35, m, sh(m, -0.25));
    k.add(g, 'cap:1', m, 0, 11.5, 0, 4.3, 5, 4.6, PI / 2);
    if (p.belly) k.add(g, 'cap:1', p.belly, 0, 10.4, 0.5, 3.4, 4, 3.4, PI / 2);
    if (p.stripe) for (let i = 0; i < 3; i++) k.add(g, 'box', p.stripe, 0, 15.6, -4 + i * 4, 6, 0.6, 1.2);
    const mn = p.mane || sh(m, -0.2);
    k.add(g, 'cap:1', mn, 0, 14, 5.5, 3.8, 1.3, 3.5, PI / 2 - 0.45);
    const hd = r.head = k.grp(g, 0, 15, 9.5);
    k.add(hd, 'sph', m, 0, 0, 0, 3.5, 3.1, 3.7);
    k.add(hd, 'cone', sh(m, 0.12), 0, -0.9, 2.2, 1.8, 4.4, 1.5, PI / 2);
    k.add(hd, 'sph', '#140c1c', 0, -0.7, 6.4, 0.7);
    for (const s of [-1, 1]) k.add(hd, 'cone', mn, s * 1.9, 2.4, -0.6, 1.2, 3.4, 0.8, -0.15, 0, -s * 0.25);
    glowEyes(k, hd, 1.6, 0.9, 2.8, 0.55, p.eye || '#ffe060');
    const tl = r.tail = k.grp(g, 0, 13, -7);
    k.add(tl, 'cap:1', mn, 0, 1.5, -3, 1.6, 2.2, 1.6, -1.1);
    if (p.frost) k.add(g, 'sph', k.mat('#c0f0ff', true), 0, 16, 2, 1.2);
    return r;
  };
  B.boar = (k, g, p) => {
    const m = p.main || '#6a4a3a', r = { kind: 'quad' };
    r.legs = legs4(k, g, [[-3.4, 5], [3.4, 5], [-3.4, -5], [3.4, -5]], 6, 1.6, sh(m, -0.1), '#2a1a10');
    k.add(g, 'sph', m, 0, 11, 0, 7, 6.5, 10);
    for (let i = 0; i < 6; i++) k.add(g, 'cone', p.bristle || sh(m, -0.35), 0, 16.5, 5 - i * 2.2, 0.9, 3, 0.7, -0.3);
    const hd = r.head = k.grp(g, 0, 11, 9);
    k.add(hd, 'sph', m, 0, 0, 0, 4.5, 4.2, 4.2);
    k.add(hd, 'cyl', sh(m, 0.2), 0, -1, 3, 2.2, 3, 1.8, PI / 2);
    k.add(hd, 'sph', '#3a2020', 0, -1, 6, 1.9, 1.6, 0.6);
    for (const s of [-1, 1]) { k.add(hd, 'cone', p.tusk || '#f0ead8', s * 1.9, -1.8, 4.4, 0.55, 3.2, 0.55, 0.9, 0, s * 0.35); k.add(hd, 'cone', sh(m, -0.1), s * 2.6, 3, -1, 1.2, 2.6, 0.7, -0.2, 0, -s * 0.5); }
    glowEyes(k, hd, 2.2, 1.4, 3.3, 0.5, p.eye || '#ff3030');
    const tl = r.tail = k.grp(g, 0, 13, -9.5); k.add(tl, 'cap:1', m, 0, -1, -0.6, 0.5, 1, 0.5, -0.5);
    return r;
  };
  B.bat = (k, g, p) => {
    const m = p.main || '#4a3a5a', r = { kind: 'fly', hover: 16, wings: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'sph', m, 0, 0, 0, 3.6, 3.8, 3.4);
    for (const s of [-1, 1]) {
      k.add(b, 'cone', m, s * 1.8, 3.4, 0, 1.1, 3, 0.7, 0, 0, -s * 0.3);
      const w = k.grp(b, s * 2.5, 1, 0);
      k.add(w, 'sph', sh(m, -0.15), s * 6, 0, -0.5, 7, 0.45, 4); k.add(w, 'cone', sh(m, -0.3), s * 12.5, 0, -1, 0.4, 3, 0.4, PI / 2, 0, 0);
      r.wings.push(w);
    }
    glowEyes(k, b, 1.3, 1, 3, 0.55, p.eye || '#ff4040');
    for (const s of [-1, 1]) k.add(b, 'cone', '#ffffff', s * 0.6, -1.2, 3, 0.25, 1, 0.25, PI);
    if (p.frost) k.add(b, 'sph', k.mat('#c0f0ff', true), 0, 3, -1, 1);
    return r;
  };
  B.frog = (k, g, p) => {
    const m = p.main || '#50a050', r = { kind: 'hop', legs: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'sph', m, 0, 5.5, 0, 7, 5, 7.5);
    k.add(b, 'sph', p.belly || sh(m, 0.4), 0, 4.5, 3, 5.5, 3.6, 4.6);
    for (const s of [-1, 1]) {
      k.add(b, 'sph', m, s * 3.5, 10, 3.5, 2.4); k.add(b, 'sph', '#ffffff', s * 3.5, 10.5, 5.2, 1.4); k.add(b, 'sph', '#140c1c', s * 3.6, 10.6, 6.3, 0.8, 1.1, 0.4);
      const L = k.grp(b, s * 5.5, 4, -3); k.add(L, 'sph', m, 0, 0, 0, 2.8, 2.2, 4); k.add(L, 'sph', sh(m, -0.1), s * 0.5, -2.5, 2.5, 1.6, 0.8, 2.6); r.legs.push(L);
      k.add(b, 'cap:1', m, s * 4, 2.5, 5, 0.9, 1.2, 0.9, 0.3);
    }
    k.add(b, 'box', sh(m, -0.4), 0, 5.2, 7.4, 6, 0.4, 0.4);
    if (p.warts) for (let i = 0; i < 6; i++) k.add(b, 'sph', p.warts, Math.sin(i * 2) * 4, 9 + (i % 2), -Math.cos(i * 2) * 4, 0.7);
    return r;
  };
  // jointed arthropod legs: an upper segment rising out from the body, a knee, then a lower segment down to the ground
  function bug(k, g, p, n, len, legR, hipY, zc, spread, fanK) {
    const r = { kind: 'bug', legs: [] }, m = p.main || '#3a2a3a';
    hipY = hipY || 5;
    const up = len * 0.5, lo = (hipY + up * Math.cos(PI - 2.05)) / Math.cos(0.3); // the foot lands on the ground
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const L = k.grp(g, s * (zc ? 2.2 : 3), hipY, (zc || 0) + ((n - 1) / 2 - i) * (spread || 2.6));
      L.rotation.y = L.userData.fan = s * ((i - (n - 1) / 2) * -(fanK || 0.38)); // front legs reach forward, back legs back
      const U2 = k.grp(L, 0, 0, 0); U2.rotation.z = s * 2.05;           // up and out
      k.add(U2, 'cap:1', sh(m, 0.06), 0, -up / 2, 0, legR, up / 3, legR);
      k.add(U2, 'sph', sh(m, 0.1), 0, -up, 0, legR * 1.25);
      const K = k.grp(U2, 0, -up, 0); K.rotation.z = -s * 1.75;          // knee: bend back down to the ground
      k.add(K, 'cap:1', sh(m, -0.08), 0, -lo / 2, 0, legR * 0.8, lo / 3, legR * 0.8);
      k.add(K, 'cone', sh(m, -0.2), 0, -lo, 0, legR * 0.7, legR * 2.2, legR * 0.7, Math.PI);
      r.legs.push(L);
    }
    return r;
  }
  B.spider = (k, g, p) => {
    const m = p.main || '#3a2a3a', r = bug(k, g, p, 4, 15, 0.6, 7, 2.6, 1.1, 0.62);
    k.add(g, 'sph', m, 0, 7.5, -6, 7, 5.8, 8);
    if (p.mark) k.add(g, 'sph', k.mat(p.mark), 0, 12.8, -6, 3, 0.6, 3.6);
    if (p.hair) for (let i = 0; i < 8; i++) k.add(g, 'cone', p.hair, Math.sin(i) * 5, 9 + (i % 3), -6 + Math.cos(i * 1.7) * 5, 0.3, 2, 0.3, Math.cos(i) * 0.6, 0, Math.sin(i) * 0.6);
    const hd = r.head = k.grp(g, 0, 6, 3); k.add(hd, 'sph', sh(m, 0.08), 0, 0, 0, 4.4, 3.8, 4.2);
    for (let i = 0; i < 6; i++) k.add(hd, 'sph', k.mat(p.eye || '#ff3030', true), (i % 3 - 1) * 1.3, 1.2 + Math.floor(i / 3) * 1.1, 3.6, i < 3 ? 0.6 : 0.45);
    for (const s of [-1, 1]) k.add(hd, 'cone', '#1a0a10', s * 1, -2, 3.2, 0.5, 2.2, 0.5, PI - 0.3);
    if (p.drip) k.add(hd, 'sph', k.mat(p.drip, true), 0, -3.4, 3.4, 0.5, 1, 0.5);
    return r;
  };
  B.scarab = (k, g, p) => {
    const m = p.main || '#3a6a8a', r = bug(k, g, p, 3, 6, 0.45, 3.5);
    k.add(g, 'dome:0.5', k.mat(m, false, true), 0, 4, -1, 6, 4.2, 7.5);
    k.add(g, 'box', p.wing || sh(m, -0.4), 0, 8.2, -1, 0.4, 0.6, 14);
    const hd = r.head = k.grp(g, 0, 4.5, 6); k.add(hd, 'sph', sh(m, -0.2), 0, 0, 0, 2.6, 2, 2.2); k.add(hd, 'cone', sh(m, -0.3), 0, 1, 1.5, 0.6, 3.5, 0.6, 0.8);
    glowEyes(k, hd, 1.3, 0.5, 1.8, 0.4, p.eye || '#ffe040');
    return r;
  };
  B.scorpion = (k, g, p) => {
    const m = p.main || '#a06a30', r = bug(k, g, p, 3, 9, 0.6, 5);
    k.add(g, 'sph', m, 0, 6, 0, 6, 3.6, 8);
    const hd = r.head = k.grp(g, 0, 6, 7); glowEyes(k, hd, 1.2, 1.4, 1.2, 0.5, p.eye || '#ff3030');
    for (const s of [-1, 1]) { const c = k.grp(g, s * 5, 6, 8); k.add(c, 'cap:1', m, 0, 0, 2, 1, 1.4, 1, PI / 2 - 0.3, s * 0.4); k.add(c, 'sph', sh(m, 0.1), s * 1.5, 0.5, 6, 2.4, 1.6, 3); k.add(c, 'cone', sh(m, 0.1), s * 2.2, 0.6, 8.4, 0.8, 2.4, 0.6, PI / 2); }
    const tl = r.tail = k.grp(g, 0, 7, -7);
    let y = 0, z = 0; for (let i = 0; i < 5; i++) { const a = i / 4 * 2.2; y += Math.sin(a) * 3; z -= Math.cos(a) * 3; k.add(tl, 'sph', sh(m, i * 0.04), 0, y, z, 2.2 - i * 0.2); }
    k.add(tl, 'cone', p.sting || '#e0e0c0', 0, y + 1.5, z + 2.5, 0.8, 3.4, 0.8, 2.2);
    return r;
  };
  B.crab = (k, g, p) => {
    const m = p.main || '#c05030', r = bug(k, g, p, 3, 10, 0.8, 6);
    k.add(g, 'sph', m, 0, 6.5, 0, 10, 4.3, 7.5);
    k.add(g, 'dome:0.5', p.shell || sh(m, 0.2), 0, 7.5, 0, 9.2, 4.6, 7.2);
    for (const s of [-1, 1]) {
      const cl = k.grp(g, s * 8, 6.5, 7); k.add(cl, 'sph', m, 0, 0, 0, 3.4, 2.6, 3.8);
      k.add(cl, 'cone', sh(m, 0.1), s * 0.8, 0.4, 3, 1.3, 3.6, 1, PI / 2 - 0.2); k.add(cl, 'cone', sh(m, -0.1), -s * 0.8, -0.4, 3, 1.1, 3, 0.9, PI / 2 + 0.2);
      k.add(g, 'cyl', m, s * 2.5, 9, 5.5, 0.5, 3.6, 0.5, 0.3); k.add(g, 'sph', '#ffffff', s * 2.5, 12.6, 6.7, 1.2); k.add(g, 'sph', '#140c1c', s * 2.5, 12.7, 7.8, 0.6);
    }
    if (p.crown) { k.add(g, 'cyl', k.mat(p.crown, false, true), 0, 11.5, -1, 3.5, 2, 3.5); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(g, 'cone', k.mat(p.crown, false, true), Math.sin(a) * 3.1, 13.4, -1 + Math.cos(a) * 3.1, 0.8, 2.4, 0.8); } }
    r.head = k.grp(g, 0, 8, 6);
    return r;
  };
  B.vulture = (k, g, p) => {
    const m = p.main || '#4a3a3a', r = { kind: 'fly', hover: 18, wings: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'sph', m, 0, 0, 0, 4.4, 4, 6);
    const hd = r.head = k.grp(b, 0, 3, 5.5); k.add(hd, 'sph', p.skin || '#e8b0a0', 0, 0, 0, 2.2); k.add(hd, 'cone', '#e0c060', 0, -0.4, 2, 0.8, 2.6, 0.7, PI / 2 + 0.4);
    darkEyes(k, hd, 1.1, 0.6, 1.5, 0.4);
    k.add(b, 'ring', sh(m, 0.3), 0, 2.2, 4.4, 2.8, 8, 2.8, 0.5);
    for (const s of [-1, 1]) { const w = k.grp(b, s * 3.5, 1, 0); k.add(w, 'sph', sh(m, -0.1), s * 8, 0, -0.5, 9, 0.6, 4.2); for (let f = 0; f < 3; f++) k.add(w, 'sph', sh(m, -0.25), s * (12 + f * 2.5), -0.2, -2.5 - f, 2, 0.4, 3.5, 0, -s * 0.4, 0); r.wings.push(w); }
    k.add(b, 'cone', sh(m, -0.2), 0, 0, -6, 2.5, 5, 0.6, -PI / 2);
    return r;
  };
  B.salamander = (k, g, p) => {
    const m = p.main || '#c04020', r = { kind: 'quad' };
    r.legs = legs4(k, g, [[-4, 5], [4, 5], [-4, -5], [4, -5]], 4.5, 1.3, m, sh(m, -0.2));
    r.legs.forEach((L, i) => { L.rotation.z = (i % 2 ? -1 : 1) * 0.6; });
    k.add(g, 'cap:1', m, 0, 6, 0, 3.8, 4.5, 3, PI / 2);
    if (p.belly) k.add(g, 'cap:1', p.belly, 0, 5, 0, 3, 4, 2, PI / 2);
    const hd = r.head = k.grp(g, 0, 6.5, 9); k.add(hd, 'sph', m, 0, 0, 1, 3.2, 2.4, 4.2); glowEyes(k, hd, 2, 1.4, 2.5, 0.6, p.eye || '#ffe040');
    const tl = r.tail = k.grp(g, 0, 6, -7); k.add(tl, 'cone', m, 0, 0, 0, 2.6, 16, 2, -PI / 2 - 0.1);
    if (p.flame) for (let i = 0; i < 5; i++) k.add(g, 'cone', k.mat(i % 2 ? p.flame : '#ffd040', true), 0, 8.5, 5 - i * 2.5, 1, 3.6 - Math.abs(i - 2) * 0.5, 0.8, -0.2);
    return r;
  };
  // humanoid-ish families
  const goblinHead = (p, ears) => (k, h, r) => {
    const s = p.main || '#6aa040';
    k.add(h, 'head', s, 0, 0, 0, r / 5, r / 5, r / 5);
    for (const q of [-1, 1]) k.add(h, 'cone', s, q * r * 0.95, 0, -0.2, r * 0.22, r * (ears || 1.1), r * 0.14, 0, 0, -q * 1.3);
    k.add(h, 'sph', sh(s, -0.1), 0, -r * 0.2, r * 0.95, r * 0.22, r * 0.3, r * 0.3);
    glowEyes(k, h, r * 0.35, r * 0.12, r * 0.8, r * 0.14, p.eye || '#ffe040');
    k.add(h, 'box', '#2a1010', 0, -r * 0.5, r * 0.82, r * 0.5, r * 0.08, r * 0.1);
    if (p.helm) k.add(h, 'dome:0.5', k.mat(p.helm, false, true), 0, r * 0.15, 0, r * 1.08, r * 1.05, r * 1.08, -0.2);
    if (p.hood) k.add(h, 'dome:0.62', p.hood, 0, r * 0.1, -r * 0.1, r * 1.12, r * 1.2, r * 1.12, -0.4);
    if (p.feathers) for (let i = 0; i < 3; i++) k.add(h, 'cone', p.feathers, (i - 1) * r * 0.3, r * 0.9, -r * 0.4, r * 0.12, r * 0.9, r * 0.06, -0.4, 0, (i - 1) * 0.3);
    if (p.bone) k.add(h, 'cap:1', p.bone, 0, r * 0.95, 0, r * 0.08, r * 0.25, r * 0.08, 0, 0, PI / 2);
  };
  B.goblin = (k, g, p) => humanoid(k, g, { h: 26, skin: p.main || '#6aa040', top: p.cloth || '#7a5a3a', bottom: sh(p.cloth || '#7a5a3a', -0.25), head: goblinHead(p), headK: 1.35, weapon: p.weapon === 'bow' ? 'bow' : p.weapon === 'staff' ? 'staff' : 'sword', wcol: p.accent, hunch: 0.2, sleeve: p.main || '#6aa040' });
  const skull = (bone, eye, extra) => (k, h, r) => {
    k.add(h, 'head', bone, 0, 0, 0, r / 5.2, r / 5.4, r / 5.2);
    for (const q of [-1, 1]) { k.add(h, 'sph', '#140c1c', q * r * 0.36, r * 0.05, r * 0.72, r * 0.26, r * 0.3, r * 0.15); k.add(h, 'sph', k.mat(eye || '#80e0ff', true), q * r * 0.36, r * 0.05, r * 0.82, r * 0.1); }
    k.add(h, 'box', sh(bone, -0.2), 0, -r * 0.75, r * 0.4, r * 0.7, r * 0.3, r * 0.6);
    for (let i = 0; i < 4; i++) k.add(h, 'box', '#f4f0e0', (i - 1.5) * r * 0.16, -r * 0.55, r * 0.78, r * 0.1, r * 0.14, r * 0.06);
    if (extra) extra(k, h, r);
  };
  B.skeleton = (k, g, p) => {
    const bone = p.main || '#e8e0c8';
    const r = humanoid(k, g, { h: 30, skin: bone, top: p.armor || sh(bone, -0.1), bottom: bone, bulk: 0.7, head: skull(bone, p.eye, (k2, h, rr) => { if (p.helm) k2.add(h, 'dome:0.55', k2.mat(p.helm, false, true), 0, rr * 0.15, 0, rr * 1.1, rr * 1.1, rr * 1.1, -0.2); if (p.crown) { k2.add(h, 'cyl', k2.mat(p.crown, false, true), 0, rr * 0.7, 0, rr * 0.8, rr * 0.4, rr * 0.8); } }), weapon: p.weapon === 'bow' ? 'bow' : p.weapon === 'staff' ? 'staff' : 'sword', wcol: p.accent, shield: p.shield, sleeve: bone });
    for (let i = 0; i < 3; i++) k.add(r.torso, 'ring', bone, 0, 4 + i * 1.8, 0.2, 3.4 - i * 0.1, 5, 2.5);
    if (p.cloth) k.add(r.body, 'flare', p.cloth, 0, r.hipY - 3, 0, 3.4, 4, 2.8);
    return r;
  };
  B.ghoul = (k, g, p) => humanoid(k, g, { h: 28, skin: p.main || '#8a9a80', top: p.cloth || '#4a4a3a', bottom: sh(p.cloth || '#4a4a3a', -0.2), hunch: 0.55, claws: p.claw || '#e0e0c0', armK: 1.3, sleeve: p.main || '#8a9a80', head: (k2, h, rr) => { k2.add(h, 'head', p.main || '#8a9a80', 0, 0, 0, rr / 5, rr / 5.2, rr / 5); glowEyes(k2, h, rr * 0.34, 0, rr * 0.82, rr * 0.13, p.eye || '#ffe040'); k2.add(h, 'box', '#2a1010', 0, -rr * 0.5, rr * 0.82, rr * 0.6, rr * 0.2, rr * 0.1); if (p.hair) k2.add(h, 'dome:0.4', p.hair, 0, rr * 0.2, -rr * 0.3, rr * 1.05, rr * 1.05, rr * 1.05, -0.6); } });
  B.shambler = (k, g, p) => {
    const mummy = p.style === 'mummy', skin = p.main || '#7a9a70';
    const r = humanoid(k, g, { h: 30, skin, top: mummy ? skin : p.cloth || '#4a4a5a', bottom: mummy ? skin : sh(p.cloth || '#4a4a5a', -0.2), hunch: 0.3, sleeve: mummy ? skin : p.cloth, armK: 1.1, head: (k2, h, rr) => { k2.add(h, 'head', skin, 0, 0, 0, rr / 5, rr / 5, rr / 5); glowEyes(k2, h, rr * 0.34, 0, rr * 0.82, rr * 0.13, p.eye || '#c0ff80'); if (mummy) for (let i = 0; i < 4; i++) k2.add(h, 'ring', sh(skin, -0.12), 0, -rr * 0.6 + i * rr * 0.45, 0, rr * 1.02, 2, rr * 1.02, 0.15 * (i % 2 ? 1 : -1)); if (p.hair) k2.add(h, 'dome:0.4', p.hair, 0, rr * 0.2, -rr * 0.3, rr * 1.05, rr * 1.05, rr * 1.05, -0.6); } });
    if (mummy) for (let i = 0; i < 5; i++) k.add(r.torso, 'ring', sh(skin, -0.12), 0, 1 + i * 1.8, 0, 3.9, 3, 3, 0.15 * (i % 2 ? 1 : -1));
    if (p.drip) k.add(r.torso, 'sph', k.mat(p.drip, true), 1, 3, 2.6, 0.5, 1.2, 0.5);
    r.zombie = true;
    return r;
  };
  B.robed = (k, g, p) => {
    const m = p.main || '#3a2a5a', skin = p.skin || '#c8a080';
    const headFn = (k2, h, rr) => {
      const hd = p.head;
      if (hd === 'skull') skull(p.bone || '#e8e0c8', p.eye, null)(k2, h, rr);
      else { k2.add(h, 'head', p.face || skin, 0, 0, 0, rr / 5, rr / 5, rr / 5); glowEyes(k2, h, rr * 0.34, 0.1, rr * 0.82, rr * 0.12, p.eye || '#80e0ff'); }
      if (hd === 'hood' || !hd || hd === 'skull') k2.add(h, 'dome:0.66', m, 0, rr * 0.1, -rr * 0.12, rr * 1.18, rr * 1.25, rr * 1.2, -0.45);
      if (hd === 'hat' || p.hat) { k2.add(h, 'cyl', p.hat || m, 0, rr * 0.55, 0, rr * 1.8, 0.6, rr * 1.8); k2.add(h, 'cone', p.hat || m, 0, rr * 0.6, -rr * 0.2, rr * 1.05, rr * 2.4, rr * 1.05, -0.25); }
      if (p.horns) for (const q of [-1, 1]) k2.add(h, 'cone', p.horns, q * rr * 0.6, rr * 0.7, 0, rr * 0.2, rr * 1.2, rr * 0.2, -0.3, 0, -q * 0.4);
      if (p.mask) k2.add(h, 'sph', p.mask, 0, 0, rr * 0.55, rr * 0.8, rr * 0.9, rr * 0.5);
      if (p.hair) k2.add(h, 'cap:1', p.hair, 0, -rr * 0.8, -rr * 0.7, rr * 0.8, rr * 0.5, rr * 0.3);
    };
    const r = humanoid(k, g, { h: 32, skin, top: m, robe: m, sleeve: m, head: headFn, weapon: p.staff === 'scythe' || p.weapon === 'scythe' ? 'scythe' : p.staff === 'ankh' || p.weapon === 'ankh' ? 'ankh' : 'staff', wcol: p.accent || '#80e0ff', wlen: 13 });
    if (p.trim) { k.add(r.body, 'ring', p.trim, 0, 0.9, 0, 6.3, 4, 5.3); k.add(r.torso, 'box', p.trim, 0, 5, 3.3, 0.8, 7, 0.3); }
    if (p.belt) k.add(r.torso, 'ring', p.belt, 0, 1, 0, 3.9, 7, 3.1);
    return r;
  };
  B.lizardman = (k, g, p) => {
    const m = p.main || '#4a8a4a';
    return humanoid(k, g, { h: 32, skin: m, top: p.armor || sh(m, -0.1), bottom: m, belly: p.belly, tail: m, feet: 'claw', footCol: sh(m, -0.2), weapon: 'trident', wcol: p.tip || '#c8ccd4', sleeve: m, head: (k2, h, rr) => { k2.add(h, 'sph', m, 0, 0, 0, rr * 0.85, rr * 0.8, rr * 0.9); k2.add(h, 'cap:1', m, 0, -rr * 0.25, rr * 0.9, rr * 0.45, rr * 0.35, rr * 0.4, PI / 2); glowEyes(k2, h, rr * 0.5, rr * 0.3, rr * 0.6, rr * 0.13, p.eye || '#ffe040'); if (p.crest) for (let i = 0; i < 4; i++) k2.add(h, 'cone', p.crest, 0, rr * 0.7 - i * rr * 0.2, -i * rr * 0.4, rr * 0.12, rr * 0.8, rr * 0.3, -0.5); } });
  };
  B.bandit = (k, g, p) => {
    const skin = p.skin || '#c8906a';
    return humanoid(k, g, { h: 30, skin, top: p.main || '#6a4a3a', bottom: p.pants || '#3a3040', weapon: p.weapon === 'bow' ? 'bow' : 'sword', head: (k2, h, rr) => { k2.add(h, 'head', skin, 0, 0, 0, rr / 5, rr / 5, rr / 5); darkEyes(k2, h, rr * 0.33, rr * 0.05, rr * 0.8, rr * 0.11); k2.add(h, 'dome:0.5', p.turban || '#3a2a20', 0, rr * 0.1, -rr * 0.05, rr * 1.06, rr * 1.1, rr * 1.06, -0.35); if (p.scarf) k2.add(h, 'dome:0.5', p.scarf, 0, -rr * 0.15, rr * 0.05, rr * 1.04, rr * 0.9, rr * 1.04, PI); if (p.turban) k2.add(h, 'ring', p.turban, 0, rr * 0.45, 0, rr * 1.05, 10, rr * 1.05, -0.2); } });
  };
  B.knight = (k, g, p) => {
    const m = p.main || '#8a929a', trim = p.trim || '#c8a040';
    const M = k.mat(m, false, true);
    const r = humanoid(k, g, { h: 36, skin: m, top: M, bottom: M, sleeve: M, fore: M, hand: M, bulk: 1.15, weapon: 'sword', wcol: p.blade || '#e0e4ec', wlen: 15, shield: p.shield || sh(m, -0.2), trim, cape: p.cape || p.cloth, head: (k2, h, rr) => {
      k2.add(h, 'sph', M, 0, 0, 0, rr * 1.02, rr * 1.12, rr * 1.05); k2.add(h, 'box', '#08060c', 0, 0, rr * 0.95, rr * 1.2, rr * 0.18, rr * 0.3);
      glowEyes(k2, h, rr * 0.3, 0, rr * 1.02, rr * 0.09, p.eye || (p.hollow ? '#c040ff' : '#ffe0a0'));
      if (p.plume) k2.add(h, 'cap:1', p.plume, 0, rr * 1.2, -rr * 0.3, rr * 0.25, rr * 0.5, rr * 0.8, -0.6);
      if (p.horns) for (const q of [-1, 1]) k2.add(h, 'cone', p.horns, q * rr * 0.9, rr * 0.5, 0, rr * 0.22, rr * 1.4, rr * 0.22, -0.2, 0, -q * 0.9);
      k2.add(h, 'ring', k2.mat(trim, false, true), 0, rr * 0.35, 0, rr * 1.03, 4, rr * 1.05);
    } });
    for (const s of [-1, 1]) k.add(r.torso, 'dome:0.5', k.mat(sh(m, 0.1), false, true), s * 4.6, 10.2, 0, 2.6, 2.1, 2.5);
    k.add(r.torso, 'box', trim, 0, 6, 4.3, 1, 7, 0.4);
    if (p.cloth) k.add(r.body, 'flare', p.cloth, 0, r.hipY - 4.5, 0, 4.4, 5, 3.6);
    return r;
  };
  B.anubis = (k, g, p) => {
    const m = p.main || '#2a2a38', gold = p.gold || '#ffd040';
    const r = humanoid(k, g, { h: 44, skin: m, top: m, bottom: p.cloth || '#e0d0a0', sleeve: m, bulk: 1.05, weapon: 'staff', wcol: gold, wlen: 18, head: (k2, h, rr) => {
      k2.add(h, 'sph', m, 0, 0, 0, rr * 0.9); k2.add(h, 'cap:1', m, 0, -rr * 0.3, rr * 1, rr * 0.4, rr * 0.4, rr * 0.4, PI / 2 + 0.2);
      for (const q of [-1, 1]) k2.add(h, 'cone', m, q * rr * 0.45, rr * 0.7, -rr * 0.2, rr * 0.3, rr * 1.8, rr * 0.16, -0.15, 0, -q * 0.2);
      glowEyes(k2, h, rr * 0.4, rr * 0.25, rr * 0.75, rr * 0.13, p.eye || '#ffe040');
      k2.add(h, 'dome:0.5', gold, 0, -rr * 0.2, -rr * 0.2, rr * 1.05, rr * 1.3, rr * 1.05, PI + 0.2);
    } });
    k.add(r.torso, 'ring', k.mat(gold, false, true), 0, 11.8, 0.3, 4.6, 8, 3.4); k.add(r.body, 'flare', p.cloth || '#e0d0a0', 0, r.hipY - 6, 0, 6.2, 6.5, 5); k.add(r.body, 'box', gold, 0, r.hipY - 3, 5.1, 1.6, 6, 0.4);
    return r;
  };
  B.wraith = (k, g, p) => {
    const m = p.main || '#3a3a5a', r = { kind: 'float', hover: 5, arms: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    const cm = k.mat(m); cm.transparent = true; cm.opacity = 0.9; cm.userData.keepAlpha = 0.9;
    k.add(b, 'cone', cm, 0, 22, 0, 6.5, 22, 5.5, PI);
    const hd = r.head = k.grp(b, 0, 26, 0.5); k.add(hd, 'dome:0.7', cm, 0, 0, 0, 5, 6, 5, -0.4); k.add(hd, 'sph', '#050308', 0, -0.5, 2.2, 3.6, 3.8, 2.4);
    glowEyes(k, hd, 1.4, 0, 4, 0.7, p.eye || '#80e0ff');
    for (const s of [-1, 1]) { const A = k.grp(b, s * 5, 19, 1); k.add(A, 'cone', cm, 0, -5, 0, 2, 9, 2, PI); for (const a of [-0.4, 0, 0.4]) k.add(A, 'cone', p.claw || '#d0d0e0', Math.sin(a), -9.5, 0.5, 0.3, 2.6, 0.3, PI, 0, a); r.arms.push(A); }
    if (p.chain) for (let i = 0; i < 4; i++) k.add(b, 'ring', k.mat(p.chain, false, true), (i - 1.5) * 2.2, 12 - Math.abs(i - 1.5) * 1.2, 3.8, 0.9, 3, 0.9, PI / 2);
    if (p.frost) k.add(b, 'sph', k.mat('#c0f0ff', true), 0, 16, 3.5, 1.2);
    return r;
  };
  B.wisp = (k, g, p) => {
    const m = p.main || '#80e0ff', r = { kind: 'fly', hover: 12 };
    const b = r.body = k.grp(g, 0, 0, 0);
    const gm = k.mat(m, true); gm.transparent = true; gm.opacity = 0.85; gm.userData.keepAlpha = 0.85;
    k.add(b, 'sph', gm, 0, 0, 0, 4.5); k.add(b, 'sph', k.mat('#ffffff', true), 0, 0.5, 0.5, 2.6);
    k.add(b, 'cone', gm, 0, -2, -1, 2.8, 9, 2.8, PI + 0.4);
    if (p.eye || p.face) darkEyes(k, b, 1.3, 0.6, 3.8, 0.55);
    return r;
  };
  B.golem = (k, g, p) => {
    const m = p.main || '#7a7a82', core = p.core || p.lava, r = { kind: 'biped', legs: [], arms: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    for (const s of [-1, 1]) { const L = k.grp(b, s * 6, 14, 0); k.add(L, 'rockish', sh(m, -0.1), 0, -7, 0, 4.2, 7.5, 4.2); r.legs.push(L); }
    const tor = r.torso = k.grp(b, 0, 15, 0);
    k.add(tor, 'rockish', m, 0, 11, 0, 11, 11, 8.5);
    if (core) k.add(tor, 'sph', k.mat(core, true), 0, 12, 7.2, 3, 3, 1.4);
    if (p.crack || p.lava) for (let i = 0; i < 4; i++) k.add(tor, 'box', k.mat(p.crack || p.lava, true), (i - 1.5) * 3.5, 7 + (i % 2) * 7, 7.8, 0.6, 5, 0.5, 0, 0, (i - 1.5) * 0.4);
    if (p.crystals) for (let i = 0; i < 5; i++) k.add(tor, 'cone', k.mat(p.crystals, true), (i - 2) * 3.4, 19 + (i % 2) * 2, -3, 1.3, 5 + (i % 3), 1.3, -0.3, 0, (i - 2) * 0.25);
    const hd = r.head = k.grp(tor, 0, 23, 3); k.add(hd, 'rockish', sh(m, 0.08), 0, 0, 0, 5, 4.2, 4.5); glowEyes(k, hd, 1.8, 0.4, 3.9, 0.7, p.eye || core || '#ffe040');
    for (const s of [-1, 1]) { const A = k.grp(tor, s * 12, 17, 0); k.add(A, 'rockish', sh(m, -0.05), 0, -3, 0, 4.2, 5, 4.2); const el = k.grp(A, 0, -7, 0); A.userData.elbow = el; k.add(el, 'rockish', sh(m, 0.05), 0, -3.5, 1, 4.8, 5.2, 4.8); r.arms.push(A); }
    r.heavy = true;
    return r;
  };
  B.harpy = (k, g, p) => { const skin = p.skin || '#e0b090'; const r = humanoid(k, g, { h: 30, skin, top: p.main || '#8a5a3a', bottom: p.main || '#8a5a3a', feet: 'claw', wings: p.main || '#8a5a3a', sleeve: p.main, head: (k2, h, rr) => { k2.add(h, 'head', skin, 0, 0, 0, rr / 5, rr / 5, rr / 5); glowEyes(k2, h, rr * 0.33, 0, rr * 0.82, rr * 0.12, p.eye || '#ffe040'); k2.add(h, 'dome:0.5', p.hair || '#3a2020', 0, rr * 0.1, -rr * 0.2, rr * 1.1, rr * 1.1, rr * 1.1, -0.4); k2.add(h, 'cap:1', p.hair || '#3a2020', 0, -rr * 0.9, -rr * 0.8, rr * 0.8, rr * 0.6, rr * 0.3); } }); r.kind = 'fly'; r.hover = 10; return r; };
  B.imp = (k, g, p) => { const m = p.main || '#c03030'; const r = humanoid(k, g, { h: 24, skin: m, top: m, bottom: sh(m, -0.2), tail: m, wings: p.wing || sh(m, -0.3), weapon: 'trident', wcol: p.trident || '#c8ccd4', headK: 1.3, sleeve: m, head: (k2, h, rr) => { k2.add(h, 'head', m, 0, 0, 0, rr / 5, rr / 5, rr / 5); for (const q of [-1, 1]) k2.add(h, 'cone', p.horns || '#2a1a1a', q * rr * 0.55, rr * 0.75, 0, rr * 0.18, rr * 0.9, rr * 0.18, -0.3, 0, -q * 0.4); glowEyes(k2, h, rr * 0.33, 0.1, rr * 0.82, rr * 0.13, p.eye || '#ffe040'); } }); if (p.fire) k.add(r.head, 'cone', k.mat(p.fire, true), 0, 6, -1, 1.5, 4, 1.5); r.kind = 'fly'; r.hover = 8; return r; };
  B.gargoyle = (k, g, p) => { const m = p.main || '#6a6a72'; const r = humanoid(k, g, { h: 34, skin: m, top: m, bottom: m, bulk: 1.15, hunch: 0.45, claws: sh(m, -0.3), wings: sh(m, -0.1), tail: m, feet: 'claw', footCol: sh(m, -0.2), sleeve: m, head: (k2, h, rr) => { k2.add(h, 'head', m, 0, 0, 0, rr / 5, rr / 5, rr / 5); k2.add(h, 'cap:1', m, 0, -rr * 0.3, rr * 0.8, rr * 0.35, rr * 0.3, rr * 0.35, PI / 2); for (const q of [-1, 1]) k2.add(h, 'cone', p.horns || sh(m, -0.3), q * rr * 0.6, rr * 0.7, -rr * 0.2, rr * 0.2, rr * 1.3, rr * 0.2, -0.6, 0, -q * 0.35); glowEyes(k2, h, rr * 0.34, rr * 0.1, rr * 0.8, rr * 0.13, p.eye || '#ff6020'); } }); r.kind = 'fly'; r.hover = 6; return r; };
  B.worm = (k, g, p) => {
    const m = p.main || '#c0a070', r = { kind: 'worm', segs: [] };
    k.add(g, 'dome:0.5', p.sand || '#c8b080', 0, 0, 0, 12, 3, 12);
    let y = 1; for (let i = 0; i < 6; i++) { const s = k.grp(g, 0, y, 0); k.add(s, 'sph', sh(m, (i % 2) * 0.08), 0, 0, 0, 6.5 - i * 0.35, 4.5, 6.5 - i * 0.35); k.add(s, 'ring', sh(m, -0.2), 0, 0, 0, 6.3 - i * 0.35, 5, 6.3 - i * 0.35); r.segs.push(s); y += 6.5; }
    const hd = r.head = k.grp(g, 0, y + 1, 1.5);
    k.add(hd, 'sph', m, 0, 0, 0, 6.2, 5.4, 6.2); k.add(hd, 'sph', p.gum || '#8a2a3a', 0, -0.5, 4.8, 4.2, 3.6, 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(hd, 'cone', '#f4f0e0', Math.cos(a) * 3.3, -0.5 + Math.sin(a) * 2.8, 5.4, 0.5, 1.8, 0.5, PI / 2, 0, 0); }
    glowEyes(k, hd, 3.5, 3, 3.6, 0.6, p.eye || '#ffe040');
    return r;
  };
  B.mushroom = (k, g, p) => {
    const cap = p.main || '#d04040', stem = p.stem || '#f0e6d0', r = { kind: 'biped', legs: [] };
    for (const s of [-1, 1]) { const L = k.grp(g, s * 2.6, 4, 0); k.add(L, 'cap:1', stem, 0, -2, 0.4, 1.4, 1, 1.5); r.legs.push(L); }
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'flare', stem, 0, 3.5, 0, 5.5, 10, 5.5, PI); // stem (wide at the bottom)
    k.add(b, 'cyl', stem, 0, 3.5, 0, 4.2, 10, 4.2);
    darkEyes(k, b, 1.6, 9.5, 4, 0.9); k.add(b, 'box', '#5a2a20', 0, 7.5, 4.1, 1.6, 0.35, 0.3);
    const hd = r.head = k.grp(b, 0, 13, 0); k.add(hd, 'dome:0.5', cap, 0, 0, 0, 11, 8, 11); k.add(hd, 'cyl', sh(stem, -0.1), 0, -0.4, 0, 10.4, 0.6, 10.4);
    for (let i = 0; i < 7; i++) { const a = i * 1.3; k.add(hd, 'sph', p.spots || '#ffffff', Math.sin(a) * (3 + (i % 3) * 2.2), 5 + (i % 2), Math.cos(a) * (3 + (i % 3) * 2.2), 1.5, 0.6, 1.5); }
    return r;
  };
  B.myconid = (k, g, p) => { const m = p.main || '#b05060'; const r = humanoid(k, g, { h: 32, skin: p.stem || '#e8dcc4', top: p.stem || '#e8dcc4', bottom: sh(p.stem || '#e8dcc4', -0.1), weapon: p.weapon === 'club' ? 'club' : 'staff', wcol: p.accent, head: (k2, h, rr) => { k2.add(h, 'sph', p.stem || '#e8dcc4', 0, -rr * 0.2, 0, rr * 0.7); glowEyes(k2, h, rr * 0.28, -rr * 0.1, rr * 0.6, rr * 0.12, p.eye || '#ffe060'); k2.add(h, 'dome:0.5', m, 0, rr * 0.25, 0, rr * 1.7, rr * 1.2, rr * 1.7); for (let i = 0; i < 6; i++) { const a = i * 1.1; k2.add(h, 'sph', p.spots || '#ffffff', Math.sin(a) * rr, rr * 1.1, Math.cos(a) * rr, rr * 0.22, rr * 0.1, rr * 0.22); } if (p.crown) k2.add(h, 'cyl', k2.mat(p.crown, false, true), 0, rr * 1.25, 0, rr * 0.6, rr * 0.4, rr * 0.6); } }); return r; };
  B.treant = (k, g, p) => {
    const bark = p.main || '#5a4a3a', leaf = p.leaf || '#4a7a3a', r = { kind: 'biped', legs: [], arms: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    for (const s of [-1, 1]) { const L = k.grp(b, s * 5, 16, 0); k.add(L, 'taperx', bark, 0, -16, 0, 3.5, 16, 3.8); for (const a of [-0.6, 0.6]) k.add(L, 'cap:1', sh(bark, -0.1), a * 2, -15, 2, 0.9, 1.2, 0.9, 1.2, a); r.legs.push(L); }
    const tor = r.torso = k.grp(b, 0, 16, 0);
    k.add(tor, 'taperx', bark, 0, 0, 0, 7, 22, 6);
    k.add(tor, 'box', sh(bark, -0.35), 0, 13, 5.4, 6, 1.3, 1); // mouth
    glowEyes(k, tor, 2.4, 17, 5.2, 0.9, p.eye || '#ffe040');
    const hd = r.head = k.grp(tor, 0, 24, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(hd, 'sph', sh(leaf, (i % 2) * 0.1), Math.sin(a) * 7, 2 + (i % 2) * 3, Math.cos(a) * 6 - 1, 7); }
    k.add(hd, 'sph', leaf, 0, 7, -1, 8);
    if (p.flowers) for (let i = 0; i < 7; i++) k.add(hd, 'sph', k.mat(p.flowers, true), Math.sin(i * 1.7) * 9, 4 + (i % 3) * 3, Math.cos(i * 1.7) * 8, 1.1);
    if (p.crown) { k.add(hd, 'cyl', k.mat(p.crown, false, true), 0, 14, -1, 4, 2.5, 4); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(hd, 'cone', k.mat(p.crown, false, true), Math.sin(a) * 3.6, 16.5, -1 + Math.cos(a) * 3.6, 0.9, 2.6, 0.9); } }
    for (const s of [-1, 1]) { const A = k.grp(tor, s * 7, 19, 0); k.add(A, 'taperx', bark, 0, -12, 0, 1.8, 12, 1.8); const el = k.grp(A, 0, -12, 0); A.userData.elbow = el; for (const a of [-0.5, 0, 0.5]) k.add(el, 'cone', sh(bark, 0.05), Math.sin(a) * 1.5, -0.5, 0.5, 0.7, 5, 0.7, PI - 0.3, 0, a); k.add(A, 'sph', leaf, s * 1, -6, 0, 3); r.arms.push(A); }
    r.heavy = true;
    return r;
  };
  B.bramble = (k, g, p) => {
    const m = p.main || '#4a6a2a', r = { kind: 'plant' };
    const b = r.body = k.grp(g, 0, 0, 0);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; k.add(b, 'cap:1', sh(m, (i % 2) * 0.1), Math.cos(a) * 6, 3, Math.sin(a) * 6, 1.6, 2.4, 1.6, Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); for (let t = 0; t < 2; t++) k.add(b, 'cone', '#e0e0b0', Math.cos(a) * (4 + t * 3), 4 + t * 2, Math.sin(a) * (4 + t * 3), 0.35, 1.6, 0.35, Math.sin(a), 0, -Math.cos(a)); }
    const st = k.grp(b, 0, 0, 0); k.add(st, 'cap:1', m, 0, 8, 0, 1.8, 3, 1.8);
    const hd = r.head = k.grp(b, 0, 17, 1);
    k.add(hd, 'sph', sh(m, -0.1), 0, 0, 0, 3.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(hd, 'sph', p.flower || '#ff70b0', Math.cos(a) * 3.6, Math.sin(a) * 3.6, 2, 2.6, 2.6, 1, 0, 0, a); }
    k.add(hd, 'sph', '#2a0a10', 0, 0, 2.6, 2.2, 2.2, 0.8); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(hd, 'cone', '#f4f0e0', Math.cos(a) * 1.8, Math.sin(a) * 1.8, 3, 0.3, 1.2, 0.3, PI / 2, 0, 0); }
    return r;
  };
  B.pixie = (k, g, p) => { const skin = p.skin || '#f0d0c0'; const w = k.mat(p.wing || '#c0f0ff'); w.transparent = true; w.opacity = 0.7; w.userData.keepAlpha = 0.7; const r = humanoid(k, g, { h: 18, skin, top: p.main || '#e060c0', bottom: p.main || '#e060c0', wings: w, headK: 1.3, head: (k2, h, rr) => { k2.add(h, 'head', skin, 0, 0, 0, rr / 5, rr / 5, rr / 5); darkEyes(k2, h, rr * 0.33, 0, rr * 0.8, rr * 0.12); k2.add(h, 'sph', p.hair || '#ff90e0', 0, rr * 0.3, -rr * 0.2, rr * 1.1, rr * 1.05, rr * 1.1); for (const q of [-1, 1]) k2.add(h, 'cone', skin, q * rr * 0.95, 0, 0, rr * 0.15, rr * 0.7, rr * 0.1, 0, 0, -q * 1.1); } }); r.kind = 'fly'; r.hover = 12; if (p.accent) k.add(r.body, 'sph', k.mat(p.accent, true), 3, 8, 3, 0.8); return r; };
  B.voideye = (k, g, p) => {
    const m = p.main || '#4a2a7a', r = { kind: 'fly', hover: 14, tent: [] };
    const b = r.body = k.grp(g, 0, 0, 0);
    k.add(b, 'sph', m, 0, 0, 0, 10);
    k.add(b, 'sph', '#f4f0f8', 0, 0.5, 5, 7, 7, 5.6);
    const ey = r.eye = k.grp(b, 0, 0.5, 9.6); k.add(ey, 'sph', k.mat(p.eye || '#ff40ff', true), 0, 0, 0, 3.6, 3.6, 1.3); k.add(ey, 'sph', '#050308', 0, 0, 0.7, 1.4, 2.4, 0.8);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, tg = k.grp(b, Math.cos(a) * 6, -7, Math.sin(a) * 6); k.add(tg, 'cone', sh(m, -0.1), 0, 0, 0, 1.6, 10, 1.6, PI); r.tent.push(tg); }
    if (p.crown) for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.4; k.add(b, 'cone', k.mat(p.crown, true), Math.sin(a) * 8, 7 + Math.cos(a) * 2, -1, 1.2, 5, 1.2, -0.2, 0, -Math.sin(a) * 0.6); }
    return r;
  };
  B.yeti = (k, g, p) => { const m = p.main || '#e8f0f8'; const r = humanoid(k, g, { h: 44, skin: m, top: m, bottom: m, bulk: 1.45, hunch: 0.25, armK: 1.25, claws: '#3a3a4a', sleeve: m, fore: m, hand: m, head: (k2, h, rr) => { k2.add(h, 'sph', m, 0, 0, 0, rr * 1.05); k2.add(h, 'sph', p.skin || '#8090b0', 0, -rr * 0.15, rr * 0.55, rr * 0.7, rr * 0.7, rr * 0.55); glowEyes(k2, h, rr * 0.3, rr * 0.05, rr * 1.02, rr * 0.12, p.eye || '#40c0ff'); k2.add(h, 'box', '#2a2030', 0, -rr * 0.45, rr * 1.03, rr * 0.6, rr * 0.12, rr * 0.1); if (p.horns) for (const q of [-1, 1]) k2.add(h, 'cone', p.horns, q * rr * 0.8, rr * 0.5, 0, rr * 0.25, rr * 1.3, rr * 0.25, -0.3, 0, -q * 0.9); } }); r.heavy = true; return r; };
  B.brute = (k, g, p) => { const m = p.main || '#7a8a5a'; const r = humanoid(k, g, { h: 42, skin: m, top: p.accent || '#5a4030', bottom: sh(p.accent || '#5a4030', -0.2), bulk: 1.5, hunch: 0.2, sleeve: m, weapon: 'club', wlen: 18, head: (k2, h, rr) => { k2.add(h, 'head', m, 0, 0, 0, rr / 5, rr / 5.3, rr / 5); glowEyes(k2, h, rr * 0.33, rr * 0.05, rr * 0.8, rr * 0.12, p.eye || '#ff4020'); for (const q of [-1, 1]) k2.add(h, 'cone', '#f0ead8', q * rr * 0.35, -rr * 0.6, rr * 0.75, rr * 0.1, rr * 0.4, rr * 0.1); if (p.horns) for (const q of [-1, 1]) k2.add(h, 'cone', p.horns, q * rr * 0.7, rr * 0.6, 0, rr * 0.22, rr * 1, rr * 0.22, -0.2, 0, -q * 0.6); } }); r.heavy = true; return r; };
  B.chicken = (k, g, p) => {
    const m = p.main || '#f4f0e8', r = { kind: 'biped', legs: [], wings: [] };
    k.add(g, 'sph', m, 0, 6, 0, 4, 3.8, 4.8);
    for (const s of [-1, 1]) { const L = k.grp(g, s * 1.4, 3, 0); k.add(L, 'cyl', '#f0b030', 0, -3, 0, 0.35, 3, 0.35); k.add(L, 'box', '#f0b030', 0, -2.9, 0.6, 1.2, 0.3, 1.6); r.legs.push(L); const w = k.grp(g, s * 3.6, 6.5, -0.3); k.add(w, 'sph', sh(m, -0.08), 0, 0, 0, 0.9, 2.2, 3); r.wings.push(w); }
    const hd = r.head = k.grp(g, 0, 10.5, 3); k.add(hd, 'sph', m, 0, 0, 0, 2.2); k.add(hd, 'cone', '#f0b030', 0, -0.2, 1.9, 0.6, 1.5, 0.5, PI / 2); k.add(hd, 'sph', p.comb || '#e03030', 0, 2.1, 0.3, 0.7, 1, 1.4); k.add(hd, 'sph', p.comb || '#e03030', 0, -1.3, 1.8, 0.5, 0.8, 0.4);
    darkEyes(k, hd, 1.2, 0.5, 1.5, 0.35);
    k.add(g, 'cone', sh(m, -0.05), 0, 9, -4, 1.5, 3.5, 0.6, -0.6);
    return r;
  };
  B.mimic = (k, g, p) => {
    const m = p.main || '#8a5a30', r = { kind: 'mimic', legs: [] };
    k.add(g, 'box', m, 0, 5, 0, 16, 9, 11); k.add(g, 'box', k.mat('#c8a040', false, true), 0, 5, 0, 16.4, 1.4, 11.4);
    const lid = r.lid = k.grp(g, 0, 9.5, -5.5);
    k.add(lid, 'box', m, 0, 2.2, 5.5, 16.2, 4.4, 11.2); k.add(lid, 'box', k.mat('#c8a040', false, true), 0, 2.2, 11.2, 3, 3, 0.6);
    for (let i = 0; i < 7; i++) { k.add(g, 'cone', '#f4f0e0', -6.6 + i * 2.2, 9.4, 4.8, 0.7, 2.2, 0.7); k.add(lid, 'cone', '#f4f0e0', -6.6 + i * 2.2, -0.2, 10.3, 0.7, 2.2, 0.7, PI); }
    k.add(g, 'cap:1', '#c02040', 0, 9.5, 5, 2, 1.6, 1, 1.2);
    glowEyes(k, lid, 3.5, 2.5, 11.3, 0.9, p.eye || '#ffe040');
    for (const s of [-1, 1]) for (const z of [-3.5, 3.5]) { const L = k.grp(g, s * 7, 1.5, z); k.add(L, 'cone', sh(m, -0.3), 0, -1.5, 0, 1, 3, 1, PI); r.legs.push(L); }
    r.head = k.grp(g, 0, 10, 5);
    return r;
  };

  // ---------------------------------------------------------------- registry + per-frame posing
  const rigs = new Map();
  MB.has = (e) => !!(e && e.def && B[e.def.sprite || 'slime'] && !e.def.draw && R.Enemy && e instanceof R.Enemy);
  const SIZE = 1.45; // 3D units per sprite pixel (the camera looks down, so things need a bit more height)

  function makeRig(e) {
    const CH = R.HD2DChars; T = window.THREE;
    const rig = CH.newRig(); rig.outline = 0.4;
    const k = CH.kit(rig), d = e.def, pal = e.pal || d.pal || {};
    rig.root.rotation.x = -CH.TILT * 0.7; rig.root.scale.setScalar(SIZE * (d.scale || 1) * (e.elite ? 1.12 : 1));
    rig.yawG = k.grp(rig.root, 0, 0, 0);
    rig.lift = k.grp(rig.yawG, 0, 0, 0);
    const parts = B[d.sprite || 'slime'](k, rig.lift, pal) || {};
    rig.parts = parts;
    if (e.elite) { const ring = k.add(rig.yawG, 'ring', k.mat('#ffc040', true), 0, 0.3, 0, 9, 6, 9); ring.castShadow = false; ring.userData.keep = true; rig.eliteRing = ring; }
    return CH.bake(rig, 'mon|' + (d.sprite || 'slime') + '|' + R.Monsters.palKey(pal) + (e.elite ? 'E' : ''));
  }

  const FROST = { r: 0.6, g: 0.85, b: 1 }, WHITE = { r: 1, g: 1, b: 1 };
  MB.draw = function (e, scene, util, now) {
    let rig = rigs.get(e);
    const key = (e.def.sprite || 'slime') + '|' + R.Monsters.palKey(e.pal || e.def.pal || {}) + (e.elite ? 'E' : '');
    if (!rig || rig.key !== key) {
      if (rig) MB.remove(e, scene);
      rig = makeRig(e); rig.key = key; rig.t = now; rig.yaw = null;
      rig.shadow = util.shadowMesh(); scene.add(rig.root); rigs.set(e, rig);
    }
    const dt = Math.min(0.1, Math.max(0.001, (now - rig.t) / 1000)); rig.t = now;
    // real movement, measured from how far it moved (the AI moves enemies directly, without a velocity)
    if (rig.px == null) { rig.px = e.x; rig.py = e.y; rig.vx = 0; rig.vy = 0; }
    const k = Math.min(1, dt * 12), jump = Math.hypot(e.x - rig.px, e.y - rig.py) > 60;
    rig.vx += ((jump ? 0 : (e.x - rig.px) / dt) - rig.vx) * k; rig.vy += ((jump ? 0 : (e.y - rig.py) / dt) - rig.vy) * k;
    rig.px = e.x; rig.py = e.y;
    pose(rig, e, dt);
    rig.root.position.set(e.x, (e.z || 0), e.y);
    const s = (e.def.shadow || e.r + 2) * 2.2 * (1 - Math.min(0.5, (e.z || 0) / 60));
    rig.shadow.scale.set(s * 1.6, s, 1); rig.shadow.position.set(e.x, 0.4, e.y + 1); rig.shadow.visible = !(e.dead && e.alpha < 0.3) && e.alpha !== 0;
    return true;
  };

  function pose(rig, e, dt) {
    const P = rig.parts, t = (e.animT || 0), an = e.anim || 'idle', W = R.World, pl = W.player;
    const spd = Math.hypot(rig.vx, rig.vy), moving = spd > 6 || an === 'walk';
    // facing, all the way round: at its target while winding up / attacking / casting, else where it's
    // going, else at its target while it's fighting, else it keeps looking where it was
    const tg = (e.target && !e.target.dead && e.target.x != null) ? e.target : pl;
    const fighting = e.state && !['idle', 'wander', 'return'].includes(e.state) && tg && Math.hypot(tg.x - e.x, tg.y - e.y) < 260;
    let ang = null;
    if ((an === 'windup' || an === 'attack' || an === 'cast' || e.state === 'windup' || e.state === 'strike' || e.state === 'charge' || e.state === 'cast') && tg) ang = Math.atan2(tg.y - e.y, tg.x - e.x);
    else if (spd > 6) ang = Math.atan2(rig.vy, rig.vx);
    else if (fighting) ang = Math.atan2(tg.y - e.y, tg.x - e.x);
    else if (rig.yaw == null) ang = e.face < 0 ? PI : 0;
    if (ang != null) { const want = Math.atan2(Math.cos(ang), Math.sin(ang)); if (rig.yaw == null) rig.yaw = want; rig.yaw += R.HD2DChars.angDiff(rig.yaw, want) * Math.min(1, dt * 10); }
    rig.yawG.rotation.y = rig.yaw || 0;
    const ph = t * (P.heavy ? 6 : 10), s1 = Math.sin(ph), sw = moving ? 0.6 : 0;
    const L = rig.lift; L.position.set(0, 0, 0); L.rotation.set(0, 0, 0); L.scale.set(1, 1, 1);
    // hovering flyers
    if (P.kind === 'fly' || P.kind === 'float') L.position.y = (P.hover || 0) + Math.sin(t * 3 + e.x * 0.05) * 1.5;
    // legs
    if (P.legs) {
      if (P.kind === 'quad') { const off = [0, PI, PI, 0]; P.legs.forEach((g, i) => { g.rotation.x = moving ? Math.sin(ph + off[i]) * 0.7 : 0; }); }
      else if (P.kind === 'bug') P.legs.forEach((g, i) => { g.rotation.y = (g.userData.fan || 0) + (moving ? Math.sin(ph * 1.3 + i * 1.7) * 0.3 : 0); });
      else if (P.kind === 'hop') { const h = moving ? Math.abs(Math.sin(ph * 0.6)) : 0; L.position.y += h * 6; P.legs.forEach((g) => { g.rotation.x = h * 0.8; }); }
      else P.legs.forEach((g, i) => { g.rotation.x = (i ? 1 : -1) * s1 * sw; const kn = g.userData.knee; if (kn) kn.rotation.x = moving ? sw * 1.1 * Math.max(0, Math.sin(ph + (i ? PI : 0) + 1.2)) : 0; });
    }
    if (P.arms) P.arms.forEach((A, i) => { A.rotation.set((i ? -1 : 1) * s1 * sw * 0.8, 0, (i ? 0.12 : -0.12)); const el = A.userData.elbow; if (el) el.rotation.x = -0.25 - sw * 0.3; });
    if (P.zombie && P.arms) P.arms.forEach((A) => { A.rotation.x = -1.4 + Math.sin(t * 2 + A.position.x) * 0.1; });
    if (P.wings) P.wings.forEach((w, i) => { const s = i ? -1 : 1, fly = P.kind === 'fly'; w.rotation.z = s * (fly ? Math.sin(t * (P.hover > 12 ? 14 : 9)) * 0.55 + 0.15 : 0.35 + Math.sin(t * 2) * 0.05); });
    if (P.tail) P.tail.rotation.y = Math.sin(t * (moving ? 8 : 2.5)) * 0.3;
    if (P.head) P.head.rotation.set(0, moving ? 0 : Math.sin(t * 0.8 + e.x) * 0.2, 0);
    if (P.torso) P.torso.rotation.y = moving ? s1 * 0.06 : 0;
    if (P.body && P.kind === 'blob') { const q = Math.sin(t * (moving ? 12 : 4)); P.body.scale.set(1 + q * 0.08, 1 - q * 0.1, 1 + q * 0.08); if (moving) L.position.y += Math.abs(q) * 2; }
    if (P.segs) P.segs.forEach((sg, i) => { sg.position.x = Math.sin(t * 2.5 + i * 0.7) * i * 0.5; });
    if (P.tent) P.tent.forEach((tg, i) => { tg.rotation.x = Math.sin(t * 3 + i) * 0.35; tg.rotation.z = Math.cos(t * 2.5 + i) * 0.3; });
    if (P.eye && pl) { P.eye.position.x = Math.max(-2, Math.min(2, (pl.x - e.x) * 0.02)); }
    if (P.lid) P.lid.rotation.x = -(an === 'windup' ? 0.9 : an === 'attack' ? 0.2 : 0.35 + Math.abs(Math.sin(t * 4)) * 0.3);
    if (P.kind === 'plant' && P.head) P.head.rotation.x = Math.sin(t * 2) * 0.15;
    // wind-up / attack / cast
    const R2 = P.arms && P.arms[1];
    if (an === 'windup') {
      L.rotation.x = -0.15; L.scale.set(0.95, 1.06, 0.95);
      if (R2) { R2.rotation.x = -2.6; R2.rotation.z = 0.4; }
      if (P.kind === 'quad' || P.kind === 'bug') L.position.z = -1.5;
    } else if (an === 'attack') {
      L.rotation.x = 0.18; L.position.z = 2.5; L.scale.set(1.06, 0.95, 1.06);
      if (R2) { R2.rotation.x = -0.4; R2.rotation.z = -0.3; }
      if (P.arms && P.arms[0] && P.heavy) P.arms[0].rotation.x = -0.6;
    } else if (an === 'cast') {
      if (P.arms) P.arms.forEach((A, i) => { A.rotation.set(-2.5, 0, (i ? 0.4 : -0.4)); });
      L.position.y += Math.sin(t * 8) * 0.5;
    }
    if (e.popIn > 0) { const k = U.clamp(1 - e.popIn / 0.35, 0, 1), b = U.easeOutBack ? U.easeOutBack(k) : k; L.scale.multiplyScalar(Math.max(0.01, b)); }
    if (e.staggerT > 0) L.rotation.z = Math.sin(e.staggerT * 40) * 0.12;
    if (e.flash > 0) { const k = e.flash / 0.12; L.scale.x *= 1 + 0.1 * k; L.scale.y *= 1 - 0.1 * k; }
    // death: tall things topple, squat things flatten, flyers drop
    if (e.dead) {
      const k = U.clamp((e.deadT || 0) / 0.35, 0, 1);
      if (P.kind === 'fly' || P.kind === 'float') { L.position.y *= 1 - k; L.rotation.z = k * 1.2; }
      else if (P.kind === 'biped' || P.kind === 'float') { L.rotation.z = (e.fallDir || 1) * k * PI / 2 * 0.95; }
      else { L.scale.y *= 1 - k * 0.6; L.scale.x *= 1 + k * 0.2; L.scale.z *= 1 + k * 0.2; }
    }
    // elite ring pulse
    if (rig.eliteRing) { rig.eliteRing.visible = !e.dead; const q = 1 + Math.sin(t * 4) * 0.08; rig.eliteRing.scale.set(9 * q, 6, 9 * q); if (Math.random() < 0.12) R.FX.particle({ x: e.x + U.rand(-e.r, e.r), y: e.y - U.rand(0, e.height || 20), vy: -20, life: 0.6, color: '#ffc040', glow: true }); }
    if (e.def.glow && Math.random() < 0.08 && !e.dead) R.FX.particle({ x: e.x + U.rand(-e.r, e.r), y: e.y - U.rand(4, e.height || 20), vy: -15, life: 0.5, color: e.def.glow, glow: true, size: 1 });
    // flash, freeze tint, fade
    const flash = e.flash > 0 || (e.dead && (e.deadT || 0) < 0.12), frozen = !!(e.status && e.status.freeze);
    const alpha = Math.max(0, (e.alpha != null ? e.alpha : 1) * (e.def.alpha != null ? e.def.alpha : 1));
    if (flash !== rig.flash || alpha !== rig.alpha || frozen !== rig.frozen) {
      for (const m of rig.mats) {
        if (m.userData.base) m.color.copy(m.userData.base);
        if (frozen) m.color.lerp(FROST, 0.55);
        if (m.emissive) m.emissive.setScalar(flash ? 0.65 : 0); else if (flash) m.color.lerp(WHITE, 0.75);
        const keep = m.userData.keepAlpha, op = alpha * (keep || 1), tr = op < 1;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op;
      }
      rig.flash = flash; rig.alpha = alpha; rig.frozen = frozen;
    }
    rig.root.visible = alpha > 0.02;
  }

  MB.remove = function (e, scene) {
    const rig = rigs.get(e); if (!rig) return;
    scene.remove(rig.root); scene.remove(rig.shadow); rig.shadow.material.dispose();
    R.HD2DChars.dispose(rig);
    rigs.delete(e);
  };
  MB.sweep = function (seen, scene) { for (const e of [...rigs.keys()]) if (!seen.has(e) || e.remove) MB.remove(e, scene); };
  MB.yawOf = (e) => (rigs.get(e) ? rigs.get(e).yaw : null);
  MB.clear = function (scene) { for (const e of [...rigs.keys()]) MB.remove(e, scene); };
  // what the 2D drawer painted on top of the sprite: boss shields, blocking shimmer, mark
  MB.overlay = function (ctx, e) {
    if (!rigs.has(e) || e.dead) return;
    const t = performance.now() / 1000, h = (e.height || 20) * 1.3;
    if (e.shield > 0) {
      const rr = e.r + 10;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba('#a0e0ff', 0.55 + Math.sin(t * 8) * 0.2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - h * 0.45 - (e.z || 0), rr, rr * 1.1, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#80c0ff'; ctx.fill(); ctx.restore();
    }
    if (e.blocking) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba('#a0d0ff', 0.5 + Math.sin(t * 12) * 0.2); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(e.x, e.y - h * 0.5, e.r + 8, e.face > 0 ? -0.9 : PI - 0.9, e.face > 0 ? 0.9 : PI + 0.9); ctx.stroke(); ctx.restore();
    }
    if (e.status && e.status.mark) { ctx.fillStyle = '#ff3050'; ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y - h - 10 - (e.z || 0)), 3, 3); }
  };
})(window.RPG);
