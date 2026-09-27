'use strict';
// HD-2D mounts and pets as smooth 3D animals (colours from their data in companions.js), with gallops,
// wing flaps, tail wags, hops and wobbles. Mounts are carried by the rider's figure (hd2d_chars.js);
// pets are their own figures that trot after their owner.
(function (R) {
  const U = R.U;
  const B = R.HD2DBeasts = {};
  const PI = Math.PI, TAU = PI * 2;
  const sh = (c, k) => U.shade(c || '#888888', k);

  // ---------------------------------------------------------------- shared bits
  function eyes(k, par, x, y, z, r, col, glow) {
    for (const s of [-1, 1]) {
      k.add(par, 'sph', glow ? k.mat(col, true) : (col || '#140c1c'), s * x, y, z, r);
      k.add(par, 'sph', k.mat('#ffffff', true), s * x + r * 0.3, y + r * 0.35, z + r * 0.75, r * 0.3);
    }
  }
  function quadLegs(k, g, pos, len, r, col, foot) {
    return pos.map(([x, z]) => {
      const L = k.grp(g, x, len, z);
      k.add(L, 'cap:1', col, 0, -len / 2 + 0.4, 0, r, (len - 0.6) / 3, r);
      if (foot) k.add(L, 'sph', foot, 0, -len + 0.8, 0.3, r * 1.2, r * 0.85, r * 1.4);
      return L;
    });
  }
  function saddle(k, g, y, z, w, trim) {
    k.add(g, 'box', trim || '#8a2a2a', 0, y - 0.6, z, w + 1.4, 0.8, 8.4);
    k.add(g, 'box', '#5a3020', 0, y, z, w, 1.4, 7);
    k.add(g, 'box', '#3a2010', 0, y + 1, z - 3, w * 0.7, 1.4, 1.4);
  }

  // ---------------------------------------------------------------- mounts
  function horseLike(k, g, m, kind) {
    const b = m.body, mane = m.mane || sh(b, -0.3), hoof = m.hoof || '#2a1a10';
    const wolf = kind === 'wolf', L = wolf ? 8.5 : 11, bodyY = wolf ? 11.5 : 14.5;
    const r = { legs: quadLegs(k, g, [[-2.8, 6.2], [2.8, 6.2], [-2.8, -6.2], [2.8, -6.2]], L, wolf ? 1.45 : 1.55, sh(b, -0.06), wolf ? sh(b, -0.2) : hoof), seat: bodyY + (wolf ? 5.2 : 6.4) };
    k.add(g, 'cap:1', b, 0, bodyY, 0, wolf ? 4.4 : 5.2, wolf ? 5.2 : 6, wolf ? 4.8 : 5.6, PI / 2);
    if (m.armor) { k.add(g, 'cap:1', m.armor, 0, bodyY + 0.8, 0, 5.6, 5.4, 5.3, PI / 2); k.add(g, 'ring', m.trim || '#c8a040', 0, bodyY + 0.8, 7.2, 4.8, 6, 4.6, PI / 2); }
    // neck + head
    const nk = r.neck = k.grp(g, 0, bodyY + 2.5, wolf ? 7 : 8);
    k.add(nk, 'cap:1', b, 0, wolf ? 2 : 3.5, 0, wolf ? 3 : 2.9, wolf ? 1.8 : 2.8, wolf ? 3.2 : 3.3, wolf ? 0.9 : 0.55);
    const hd = r.head = k.grp(nk, 0, wolf ? 4 : 7.5, wolf ? 3.5 : 4);
    if (wolf) {
      k.add(hd, 'sph', b, 0, 0, 0, 3.4, 3, 3.6);
      k.add(hd, 'cone', sh(b, 0.1), 0, -0.8, 2.2, 1.8, 4.2, 1.5, PI / 2);
      k.add(hd, 'sph', '#140c1c', 0, -0.6, 6.2, 0.7);
      for (const s of [-1, 1]) k.add(hd, 'cone', mane, s * 1.9, 2.4, -0.5, 1.2, 3.4, 0.8, -0.15, 0, -s * 0.25);
      eyes(k, hd, 1.6, 0.9, 2.6, 0.6, m.eye || '#ffe060', true);
      k.add(g, 'cap:1', mane, 0, bodyY + 3.3, 5.5, 3.6, 1.2, 3.3, PI / 2 - 0.4); // ruff
    } else {
      k.add(hd, 'cap:1', b, 0, 0, 2, 2.5, 2.1, 2.9, PI / 2 + 0.55);
      k.add(hd, 'sph', sh(b, -0.2), 0, -1.9, 5.3, 2.3, 2, 2.2);
      for (const s of [-1, 1]) { k.add(hd, 'cone', b, s * 1.3, 2.3, -0.5, 0.8, 2.6, 0.6, -0.2); k.add(hd, 'sph', '#140c1c', s * 0.9, -2.2, 7.1, 0.35); }
      eyes(k, hd, 2.3, 0.8, 1.5, 0.62, m.eye || '#140c1c', !!m.eye);
      k.add(nk, 'box', mane, 0, 4.5, -2.2, 1.3, 9, 2.4, 0.55);
      k.add(hd, 'sph', mane, 0, 2.2, 1.2, 1.2, 1.4, 1.6);
      if (m.armor) k.add(hd, 'box', m.armor, 0, 0.9, 3.4, 3.4, 1.5, 5.4, 0.55);
    }
    if (m.horn) k.add(hd, 'cone', k.mat(m.horn, true), 0, 2.4, 2.4, 0.7, 5.2, 0.7, 0.9);
    if (m.antler) for (const s of [-1, 1]) {
      k.add(hd, 'cyl', m.antler, s * 1.3, 2.2, 0, 0.45, 6.5, 0.45, -0.2, 0, -s * 0.45);
      k.add(hd, 'cyl', m.antler, s * 3.4, 6.5, -0.4, 0.4, 3.6, 0.4, 0.4, 0, -s * 1.1);
      k.add(hd, 'cyl', m.antler, s * 2.8, 7.4, -1, 0.4, 3, 0.4, -0.6, 0, s * 0.2);
    }
    // tail
    const tl = r.tail = k.grp(g, 0, bodyY + (wolf ? 1.5 : 1.5), wolf ? -7.5 : -9);
    if (wolf) k.add(tl, 'cap:1', mane, 0, 2.5, -2.5, 1.8, 2.2, 1.8, -0.9);
    else k.add(tl, 'cap:1', mane, 0, -4, -1.5, 1.5, 2.6, 1.5, -0.35);
    saddle(k, g, r.seat - 0.9, wolf ? -0.5 : -0.5, wolf ? 5.4 : 6.2, m.trim);
    return r;
  }
  function raptor(k, g, m) {
    const b = m.body, r = { legs: [], seat: 20 };
    k.add(g, 'cap:1', b, 0, 15, 0, 4.3, 3.8, 5, PI / 2 - 0.2);
    k.add(g, 'sph', sh(b, 0.25), 0, 13.5, 2.5, 3.4, 3, 3.5);
    for (const s of [-1, 1]) {
      const L = k.grp(g, s * 3, 14, -0.5);
      k.add(L, 'cap:1', b, 0, -3.5, 0.5, 2.3, 2.3, 2.6, 0.3);
      k.add(L, 'cap:1', sh(b, -0.15), 0, -9, -0.5, 1.1, 2, 1.1, -0.3);
      k.add(L, 'box', sh(b, -0.3), 0, -13.4, 1.2, 2.4, 1.2, 4);
      r.legs.push(L);
    }
    const tl = r.tail = k.grp(g, 0, 15.5, -6);
    k.add(tl, 'cone', b, 0, 0, 0, 2.6, 13, 2.2, -PI / 2 - 0.12);
    const hd = r.head = k.grp(g, 0, 21, 8.5);
    k.add(g, 'cap:1', b, 0, 18.3, 6.5, 2.2, 1.6, 2.3, 0.7);
    k.add(hd, 'cap:1', b, 0, 0, 2, 2.6, 1.9, 2.8, PI / 2 + 0.1);
    k.add(hd, 'cap:1', sh(b, -0.2), 0, -1.4, 2.6, 2.1, 1.6, 1.8, PI / 2 + 0.25);
    for (let i = 0; i < 4; i++) k.add(hd, 'cone', m.mane || '#8a3a2a', 0, 2 - i * 0.2, 0.5 - i * 1.6, 0.9, 2.4 - i * 0.3, 0.5, -0.6);
    eyes(k, hd, 1.9, 1, 3, 0.6, m.eye, true);
    for (const s of [-1, 1]) k.add(g, 'cap:1', b, s * 3, 15, 5.5, 0.7, 1.2, 0.7, 1);
    saddle(k, g, 19.2, -0.5, 5.6);
    return r;
  }
  function crab(k, g, m) {
    const r = { legs: [], seat: 14.5 };
    k.add(g, 'sph', m.body, 0, 8, 0, 10, 4.6, 8);
    k.add(g, 'dome:0.5', m.shell || sh(m.body, 0.2), 0, 9.2, 0, 9.4, 4.6, 7.4);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const L = k.grp(g, s * 8, 8, -3.5 + i * 3.5);
        k.add(L, 'cap:1', sh(m.body, -0.1), s * 3, 0.5, 0, 1.1, 1.6, 1.1, 0, 0, -s * 1.1);
        k.add(L, 'cap:1', sh(m.body, -0.1), s * 5.5, -3.8, 0, 0.9, 1.8, 0.9, 0, 0, -s * 0.3);
        r.legs.push(L);
      }
      const cl = k.grp(g, s * 7, 8, 8);
      k.add(cl, 'sph', m.body, 0, 0, 0, 3.4, 2.6, 3.8);
      k.add(cl, 'cone', sh(m.body, 0.1), s * 0.8, 0.4, 3, 1.3, 3.6, 1, PI / 2 - 0.2);
      k.add(cl, 'cone', sh(m.body, -0.1), -s * 0.8, -0.4, 3, 1.1, 3, 0.9, PI / 2 + 0.2);
      k.add(g, 'cyl', m.body, s * 2.5, 11, 6, 0.5, 4, 0.5, 0.3);
      k.add(g, 'sph', m.eye || '#ffffff', s * 2.5, 15, 7.2, 1.3);
      k.add(g, 'sph', '#140c1c', s * 2.5, 15.1, 8.3, 0.6);
    }
    saddle(k, g, 14, -1, 6);
    return r;
  }
  function chicken(k, g, m) {
    const b = m.body, r = { legs: [], seat: 22.5, wings: [] };
    k.add(g, 'sph', b, 0, 16, 0, 8, 7.6, 9.4);
    k.add(g, 'sph', sh(b, 0.05), 0, 15, 5.5, 5.6, 5.4, 4);
    for (const s of [-1, 1]) {
      const L = k.grp(g, s * 3, 9, 0);
      k.add(L, 'cyl', '#f0b030', 0, -9, 0, 0.8, 9, 0.8);
      for (const a of [-0.5, 0, 0.5]) k.add(L, 'cone', '#f0b030', Math.sin(a) * 1.2, -8.8, 1, 0.5, 2.6, 0.4, PI / 2 - 0.1, a);
      r.legs.push(L);
      const w = k.grp(g, s * 7.4, 17, -0.5);
      k.add(w, 'sph', sh(b, -0.08), s * 0.8, -1, 0, 1.6, 4.6, 6); r.wings.push(w);
    }
    const hd = r.head = k.grp(g, 0, 24, 7);
    k.add(hd, 'sph', b, 0, 0, 0, 3.8);
    k.add(hd, 'cone', '#f0b030', 0, -0.4, 3.2, 1.1, 2.6, 0.8, PI / 2);
    for (let i = 0; i < 3; i++) k.add(hd, 'sph', m.comb || '#e03030', 0, 3.8 - Math.abs(i - 1) * 0.6, 1.5 - i * 1.5, 1.2);
    k.add(hd, 'sph', m.comb || '#e03030', 0, -2.4, 3, 0.9, 1.4, 0.8);
    eyes(k, hd, 2.3, 0.8, 2.4, 0.6);
    for (let i = 0; i < 3; i++) k.add(g, 'sph', sh(b, -0.05 * i), (i - 1) * 2, 21, -8, 1.2, 5, 2.4, -0.5 - i * 0.1, 0, (i - 1) * 0.3);
    saddle(k, g, 22, -1.5, 6);
    return r;
  }
  function dragon(k, g, m, pet) {
    const b = m.body, belly = m.belly || sh(b, 0.3), wing = m.wing || sh(b, -0.3), gry = m.name && /gryphon/i.test(m.name);
    const sc = pet ? 0.42 : 1, r = { legs: [], wings: [], seat: 20.5, fly: true };
    const G2 = pet ? k.grp(g, 0, 0, 0) : g; if (pet) G2.scale.setScalar(sc);
    r.legs = quadLegs(k, G2, [[-2.8, 5.5], [2.8, 5.5], [-2.8, -5.5], [2.8, -5.5]], 10, 1.6, sh(b, -0.08), gry ? '#e0b040' : sh(b, -0.3));
    k.add(G2, 'cap:1', b, 0, 14, 0, 4.9, 5.2, 5.2, PI / 2);
    k.add(G2, 'cap:1', belly, 0, 12.6, 0.5, 4, 4.4, 4, PI / 2);
    const nk = k.grp(G2, 0, 16.5, 7);
    k.add(nk, 'cap:1', gry ? belly : b, 0, 3, 0.5, 2.6, 2.4, 2.8, 0.45);
    const hd = r.head = k.grp(nk, 0, 7, 2.6);
    if (gry) {
      k.add(hd, 'sph', belly, 0, 0, 0, 3.6, 3.4, 3.8);
      k.add(hd, 'cone', '#e0b040', 0, -0.6, 3, 1.4, 3.6, 1.2, PI / 2 + 0.35);
      for (const s of [-1, 1]) k.add(hd, 'cone', b, s * 1.6, 2.6, -1.4, 0.8, 3.4, 0.5, -0.8);
    } else {
      k.add(hd, 'cap:1', b, 0, 0, 1.8, 2.6, 1.9, 2.7, PI / 2 + 0.2);
      k.add(hd, 'cap:1', belly, 0, -1.4, 2.4, 1.8, 1.5, 1.6, PI / 2 + 0.35);
      for (const s of [-1, 1]) k.add(hd, 'cone', belly, s * 1.6, 1.8, -1.2, 0.8, 4.8, 0.7, -1.1, 0, -s * 0.2);
    }
    eyes(k, hd, 1.9, 1, 2.2, 0.6, m.eye || '#ffe040', true);
    for (const s of [-1, 1]) {
      const w = k.grp(G2, s * 4, 18, 2);
      k.add(w, 'sph', wing, s * 6.5, 0, -0.5, 7, 0.7, 4.6, 0, -s * 0.15, 0);
      k.add(w, 'sph', sh(wing, 0.12), s * 12, -0.3, -2.4, 5, 0.55, 3.4, 0, -s * 0.45, 0);
      for (let f = 0; f < 3; f++) k.add(w, 'sph', sh(wing, gry ? 0.25 : -0.1), s * (8 + f * 3), -0.4, -4 - f * 0.6, 1.6, 0.4, 3.2, 0, -s * (0.3 + f * 0.2), 0);
      k.add(w, 'cap:1', sh(b, -0.2), s * 6, 0.2, 3, 0.7, 4, 0.7, 0, 0, -s * PI / 2);
      r.wings.push(w);
    }
    const tl = r.tail = k.grp(G2, 0, 14.5, -7);
    k.add(tl, 'cone', b, 0, 0, 0, 2.6, 14, 2.4, -PI / 2 - 0.15);
    k.add(tl, gry ? 'sph' : 'cone', gry ? sh(b, -0.3) : belly, 0, gry ? -2.2 : -2, -14, gry ? 1.6 : 1.6, gry ? 2.2 : 3, gry ? 1.6 : 0.6, gry ? 0 : -PI / 2);
    if (!pet) saddle(k, g, 19.6, -0.5, 6);
    return r;
  }

  // ---------------------------------------------------------------- pets (small, rig units)
  function quadPet(k, g, p) {
    const b = p.body, dk = p.dark || sh(b, -0.3), bel = p.belly || sh(b, 0.2), r = { legs: [] };
    r.legs = quadLegs(k, g, [[-1.4, 1.6], [1.4, 1.6], [-1.4, -1.6], [1.4, -1.6]], 2.8, 0.8, b, dk);
    k.add(g, 'cap:1', b, 0, 4.2, 0, 2.5, 1.5, 2.4, PI / 2);
    k.add(g, 'sph', bel, 0, 3.4, 0.8, 1.8, 1.4, 2.2);
    const hd = r.head = k.grp(g, 0, 6.8, 3);
    k.add(hd, 'sph', b, 0, 0, 0, 2.9, 2.7, 2.7);
    k.add(hd, 'sph', bel, 0, -0.9, 2.1, 1.4, 1.05, 1.2);
    k.add(hd, 'sph', '#140c1c', 0, -0.5, 3.25, 0.4, 0.32, 0.3);
    eyes(k, hd, 1.1, 0.4, 2.2, 0.55);
    for (const s of [-1, 1]) {
      if (p.ears === 'flop') k.add(hd, 'sph', dk, s * 2.6, -0.4, -0.2, 0.8, 1.9, 1.3, 0, 0, s * 0.3);
      else if (p.ears === 'bunny') { k.add(hd, 'cap:1', b, s * 1, 4.2, -0.5, 0.75, 1.4, 0.45, -0.15, 0, -s * 0.15); k.add(hd, 'cap:1', '#f0a0b0', s * 1, 4.2, -0.2, 0.4, 1.1, 0.25, -0.15, 0, -s * 0.15); }
      else { k.add(hd, 'cone', dk, s * 1.6, 1.9, -0.2, 1, 2.2, 0.6, 0, 0, -s * 0.35); k.add(hd, 'cone', '#f0a0b0', s * 1.55, 2, 0.15, 0.55, 1.4, 0.3, 0, 0, -s * 0.35); }
    }
    const tl = r.tail = k.grp(g, 0, 4.8, -2.6);
    if (p.tail) { k.add(tl, 'cap:1', b, 0, 1.2, -2, 1.2, 1.3, 1.2, -1); k.add(tl, 'sph', '#ffffff', 0, 2.4, -3.6, 1.05); }
    else if (p.ears === 'bunny') k.add(tl, 'sph', '#ffffff', 0, 0, -0.4, 1.1);
    else if (p.ears === 'cat') k.add(tl, 'cap:1', b, 0, 2, -0.8, 0.45, 1.6, 0.45, -0.4);
    else k.add(tl, 'cap:1', b, 0, 1, -0.6, 0.55, 0.7, 0.55, -0.6);
    return r;
  }
  function birdPet(k, g, p) {
    const b = p.body, dk = p.dark || sh(b, -0.25), bel = p.belly || sh(b, 0.3), r = { legs: [], wings: [] };
    const owl = !!p.eye && p.eye === '#ffe060', peng = !!p.belly && p.body === '#20202a';
    k.add(g, 'sph', b, 0, 4.4, 0, 3.2, 3.8, 3.1);
    k.add(g, 'sph', bel, 0, 4, 1.3, 2.4, 3, 2);
    const hd = r.head = k.grp(g, 0, 8.4, 0.5);
    k.add(hd, 'sph', b, 0, 0, 0, 2.6, 2.5, 2.5);
    k.add(hd, 'cone', p.beak || (owl ? '#e0a030' : '#f0b030'), 0, -0.4, 2.2, 0.7, 1.6, 0.5, PI / 2 + (owl ? 0.6 : 0));
    if (owl) { for (const s of [-1, 1]) { k.add(hd, 'sph', '#ffffff', s * 1.1, 0.4, 2, 1.05); k.add(hd, 'sph', k.mat(p.eye, true), s * 1.1, 0.4, 2.7, 0.75, 0.75, 0.5); k.add(hd, 'sph', '#140c1c', s * 1.1, 0.4, 3.05, 0.4, 0.4, 0.3); k.add(hd, 'cone', dk, s * 1.5, 2, -0.2, 0.6, 1.6, 0.4, 0, 0, -s * 0.4); } }
    else eyes(k, hd, 1.1, 0.5, 2.1, 0.45, p.eye && p.eye !== '#140c1c' && p.eye !== '#ffffff' ? p.eye : null, !!p.glow);
    if (p.glow) for (let i = 0; i < 3; i++) k.add(hd, 'cone', k.mat(i % 2 ? p.body : (p.dark || '#ffd040'), true), (i - 1) * 0.8, 2, -0.6 - i * 0.3, 0.5, 2.4 - Math.abs(i - 1) * 0.6, 0.35, -0.5, 0, (i - 1) * 0.35);
    for (const s of [-1, 1]) {
      const w = k.grp(g, s * 3, 5.8, 0);
      k.add(w, 'sph', dk, s * 0.4, -1.4, -0.2, 0.7, peng ? 2.6 : 2.3, 2);
      r.wings.push(w);
      const L = k.grp(g, s * 1.2, 1.2, 0.4);
      k.add(L, 'cyl', '#f0a030', 0, -1.2, 0, 0.3, 1.2, 0.3);
      k.add(L, 'box', '#f0a030', 0, -1.1, 0.6, 1.2, 0.35, 1.4);
      r.legs.push(L);
    }
    k.add(g, 'cone', dk, 0, 3.8, -2.6, 1.3, 2.4, 0.5, -PI / 2 - 0.5);
    return r;
  }
  function blobPet(k, g, p) {
    const r = { blob: true, fly: !!(p.ghost || p.big) };
    const bodyM = k.mat(p.body, !!p.ghost);
    if (p.ghost || p.id === 'gloopy') { bodyM.transparent = true; bodyM.opacity = p.ghost ? 0.72 : 0.85; bodyM.userData.keepAlpha = bodyM.opacity; }
    const bd = r.body = k.grp(g, 0, 0, 0);
    if (p.big) {
      k.add(bd, 'sph', bodyM, 0, 4.5, 0, 4.2);
      k.add(bd, 'sph', '#f0ecf4', 0, 4.6, 2.2, 3, 3, 2.6);
      k.add(bd, 'sph', k.mat(p.eye, true), 0, 4.6, 4.1, 1.8, 1.8, 1.1);
      k.add(bd, 'sph', '#140c1c', 0, 4.6, 4.9, 0.9, 1.2, 0.5);
      for (let i = 0; i < 4; i++) k.add(bd, 'cone', bodyM, Math.cos(i * 1.6) * 3, 1, Math.sin(i * 1.6) * 3 - 1, 0.6, 3, 0.6, PI, 0, 0);
      return r;
    }
    k.add(bd, 'sph', bodyM, 0, 3.2, 0, 3.8, 3.3, 3.8);
    if (p.ghost) k.add(bd, 'cone', bodyM, 0, 0.8, -1.6, 2.2, 3.4, 1.8, PI + 0.5);
    for (const s of [-1, 1]) { k.add(bd, 'sph', p.eye === '#ffffff' ? k.mat('#ffffff', true) : (p.eye || '#140c1c'), s * 1.3, 3.8, 3.3, 0.6, 0.85, 0.4); }
    k.add(bd, 'sph', k.mat('#ffffff', true), 1.8, 5.2, 2.4, 0.7, 0.5, 0.4); // shine
    if (p.crown) { k.add(bd, 'cyl', p.crown, 0, 6, 0, 1.8, 1, 1.8); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(bd, 'cone', p.crown, Math.sin(a) * 1.5, 7, Math.cos(a) * 1.5, 0.45, 1.2, 0.45); } }
    if (p.cap) { k.add(bd, 'dome:0.5', p.cap, 0, 4.4, 0, 4.4, 3.2, 4.4); for (let i = 0; i < 5; i++) { const a = i * 1.3; k.add(bd, 'sph', p.spots || '#ffffff', Math.sin(a) * 2.8, 6.3 + (i % 2) * 0.5, Math.cos(a) * 2.8, 0.6, 0.35, 0.6); } }
    return r;
  }
  function bugPet(k, g, p) {
    const r = { legs: [] }, b = p.body;
    if (p.claws) {
      k.add(g, 'sph', b, 0, 2.4, 0, 3.4, 1.8, 2.7);
      for (const s of [-1, 1]) {
        k.add(g, 'sph', b, s * 3, 2.6, 2.8, 1.4, 1.1, 1.6); k.add(g, 'cone', sh(b, 0.1), s * 3.2, 2.7, 4.2, 0.6, 1.6, 0.5, PI / 2);
        k.add(g, 'cyl', b, s * 1, 3.5, 1.8, 0.25, 1.6, 0.25); k.add(g, 'sph', '#ffffff', s * 1, 5.2, 1.8, 0.6); k.add(g, 'sph', '#140c1c', s * 1, 5.25, 2.3, 0.3);
        for (let i = 0; i < 3; i++) { const L = k.grp(g, s * 3, 2.2, -1.3 + i * 1.2); k.add(L, 'cap:1', sh(b, -0.1), s * 1, -0.6, 0, 0.35, 0.8, 0.35, 0, 0, -s * 0.9); r.legs.push(L); }
      }
      return r;
    }
    k.add(g, 'sph', b, 0, 3.4, -1.6, 3, 2.6, 3.4);
    k.add(g, 'sph', sh(b, 0.1), 0, 2.9, 1.6, 1.9, 1.7, 1.9);
    for (let i = 0; i < 4; i++) k.add(g, 'sph', k.mat(p.eye || '#80ff40', true), (i % 2 ? 1 : -1) * (0.5 + (i > 1 ? 0.6 : 0)), 3.6 + (i > 1 ? -0.5 : 0), 3.2, 0.4);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const L = k.grp(g, s * 1.3, 3, 1.8 - i * 1.2);
      k.add(L, 'cap:1', sh(b, 0.05), s * 1.6, 0.6, 0, 0.3, 0.9, 0.3, 0, (i - 1.5) * 0.3 * s, -s * 1.2);
      k.add(L, 'cap:1', sh(b, 0.05), s * 3, -1.3, 0, 0.28, 1, 0.28, 0, 0, -s * 0.3);
      r.legs.push(L);
    }
    return r;
  }
  function golemPet(k, g, p) {
    const b = p.body, dk = p.dark || sh(b, -0.3), r = { legs: [] };
    k.add(g, 'rockish', b, 0, 5.4, 0, 4.4, 4.2, 3.6);
    k.add(g, 'rockish', sh(b, 0.08), 0, 9.6, 0.4, 2.8, 2.4, 2.6);
    eyes(k, g, 0.9, 9.8, 2.5, 0.5, p.eye || '#60e0ff', true);
    for (const s of [-1, 1]) { k.add(g, 'rockish', dk, s * 3.8, 5.2, 0.5, 1.7, 2.8, 1.7); const L = k.grp(g, s * 1.6, 2.6, 0); k.add(L, 'rockish', dk, 0, -1.2, 0, 1.4, 1.7, 1.5); r.legs.push(L); }
    k.add(g, 'sph', '#5aa040', -1.6, 7.6, 1.8, 1, 0.5, 0.8);
    return r;
  }

  // ---------------------------------------------------------------- builders
  B.buildMount = function (id, k) {
    const m = R.Companions && R.Companions.MOUNTS[id]; if (!m) return null;
    const g = new window.THREE.Group();
    const st = m.style;
    const r = st === 'horse' || st === 'elk' ? horseLike(k, g, m, st) : st === 'wolf' ? horseLike(k, g, m, 'wolf') : st === 'raptor' ? raptor(k, g, m) : st === 'crab' ? crab(k, g, m) : st === 'chicken' ? chicken(k, g, m) : dragon(k, g, m);
    r.g = g; r.def = m; r.fly = !!m.fly; r.style = st;
    return r;
  };
  B.buildPet = function (id, k) {
    const p0 = R.Companions && R.Companions.PETS[id]; if (!p0) return null;
    const p = Object.assign({ id }, p0), g = new window.THREE.Group();
    const st = p.style;
    const r = st === 'quad' ? quadPet(k, g, p) : st === 'bird' ? birdPet(k, g, p) : st === 'blob' ? blobPet(k, g, p) : st === 'bug' ? bugPet(k, g, p) : st === 'golem' ? golemPet(k, g, p) : dragon(k, g, p, true);
    r.g = g; r.def = p; r.style = st;
    if (st === 'bird' && p.glow) r.fly = true;
    return r;
  };

  // gallop / trot / flap / wobble. moving: 0..1, t: seconds
  B.animate = function (r, moving, t, flying) {
    const st = r.style, fast = r.def && r.def.spd ? 13 : 11, ph = t * fast;
    const legs = r.legs || [];
    if (st === 'raptor' || st === 'chicken' || (st === 'bird' && !r.fly)) {
      legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(ph + i * PI) * 0.8 : 0; });
    } else if (st === 'crab' || st === 'bug') {
      legs.forEach((L, i) => { L.rotation.y = moving ? Math.sin(ph * 1.4 + i) * 0.35 : 0; });
    } else {
      const order = [0, PI, PI + 0.6, 0.6];
      legs.forEach((L, i) => { L.rotation.x = flying ? -0.5 : moving ? Math.sin(ph + (order[i] || 0)) * 0.75 : 0; });
    }
    if (r.head) r.head.rotation.x = moving ? Math.sin(ph * 2) * 0.06 : Math.sin(t * 1.3) * 0.05;
    if (r.neck) r.neck.rotation.x = moving ? Math.sin(ph) * 0.06 : 0;
    if (r.tail) { r.tail.rotation.y = Math.sin(t * (moving ? 9 : 3)) * (st === 'quad' ? 0.6 : 0.25); r.tail.rotation.x = moving && st !== 'quad' ? 0.15 : 0; }
    if (r.wings) r.wings.forEach((w, i) => { const s = i ? -1 : 1, f = flying || r.fly ? Math.sin(t * 7) * 0.45 + 0.1 : moving && st === 'chicken' ? Math.sin(t * 14) * 0.3 : 0.05; w.rotation.z = s * f; if (r.style === 'dragon' && !flying && !r.fly) w.rotation.z = s * 0.55; });
    if (r.blob && r.body) { const q = Math.sin(t * (moving ? 12 : 4)); r.body.scale.set(1 + q * 0.07, 1 - q * 0.09, 1 + q * 0.07); r.body.position.y = moving ? Math.abs(q) * 1.2 : 0; }
    r.g.position.y = moving && !flying && (st === 'horse' || st === 'elk' || st === 'wolf') ? Math.abs(Math.sin(ph)) * 0.8 : 0;
  };

  // ---------------------------------------------------------------- pet entities
  const pets = new Map();
  B.drawPet = function (e, scene, util, now) {
    const CH = R.HD2DChars, T = window.THREE;
    let rec = pets.get(e);
    if (!rec || rec.id !== e.pid) {
      if (rec) B.removePet(e, scene);
      const rig = CH.newRig(), k = CH.kit(rig);
      const r = B.buildPet(e.pid, k); if (!r) return false;
      rig.root.rotation.x = -CH.TILT; rig.root.scale.setScalar(CH.SCALE * 1.05);
      rig.yawG = k.grp(rig.root, 0, 0, 0); rig.yawG.add(r.g);
      CH.bake(rig, 'pet|' + e.pid);
      rec = { id: e.pid, rig, r, yaw: null, px: e.x, py: e.y, t: now, shadow: util.shadowMesh() };
      scene.add(rig.root); pets.set(e, rec);
    }
    const dt = Math.min(0.1, Math.max(0.001, (now - rec.t) / 1000)); rec.t = now;
    const vx = (e.x - rec.px) / dt, vy = (e.y - rec.py) / dt; rec.px = e.x; rec.py = e.y;
    if (Math.hypot(vx, vy) > 8) { const want = Math.atan2(vx, vy); if (rec.yaw == null) rec.yaw = want; let d = (want - rec.yaw) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; rec.yaw += d * Math.min(1, dt * 12); }
    if (rec.yaw == null) rec.yaw = 0;
    rec.rig.yawG.rotation.y = rec.yaw;
    const t = e.t || 0, pd = rec.r.def, hover = rec.r.fly ? (pd.glow ? 6 : 8) + Math.sin(t * 3.5) * 1.6 : 0;
    B.animate(rec.r, e.moving ? 1 : 0, t, false);
    rec.rig.root.position.set(e.x, hover, e.y);
    rec.shadow.scale.set(12, 8, 1); rec.shadow.position.set(e.x, 0.4, e.y + 1);
    return true;
  };
  B.removePet = function (e, scene) {
    const rec = pets.get(e); if (!rec) return;
    scene.remove(rec.rig.root); scene.remove(rec.shadow); rec.shadow.material.dispose();
    R.HD2DChars.dispose(rec.rig);
    pets.delete(e);
  };
  B.sweep = function (seen, scene) { for (const e of [...pets.keys()]) if (!seen.has(e) || e.remove) B.removePet(e, scene); };
  B.clear = function (scene) { for (const e of [...pets.keys()]) B.removePet(e, scene); };
})(window.RPG);
