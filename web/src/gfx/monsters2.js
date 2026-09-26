'use strict';
// Monster drawers for the new regions: crabs, myconids, treants, bramble turrets, pixies and
// void eyes. Same format as gfx/monsters.js (drawn facing right).
(function (R) {
  const U = R.U;
  const M = R.Monsters;
  const sh = U.shade, tri = M.tri, seg = M.seg;

  // ---------------------------------------------------------------- crab
  M.crab = {
    w: 36, h: 24, ax: 18, ay: 21, frames: { idle: 2, walk: 4, windup: 1, attack: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25);
      const bob = anim === 'walk' ? [0, -1, 0, -1][f] : anim === 'idle' ? f : 0;
      const y = 10 + bob;
      // legs scuttle sideways
      for (let i = 0; i < 3; i++) {
        const lf = anim === 'walk' ? ((f + i) % 2) * 2 : 0;
        seg(P, 10 + i * 3, y + 5, 5 + i * 3 - lf, y + 11, 2, d);
        seg(P, 24 - i * 3, y + 5, 29 - i * 3 + lf, y + 11, 2, d);
      }
      // shell
      P.ellipse(17, y + 3, 10, 6, d); P.ellipse(17, y + 2, 9, 5, m); P.ellipse(14, y, 4, 2, l);
      if (p.shell) { P.ellipse(17, y - 3, 7, 6, p.shell); P.ellipse(15, y - 5, 3, 2, sh(p.shell, 0.3)); P.px(20, y - 2, sh(p.shell, -0.3)); }
      for (let i = 0; i < 4; i++) P.px(11 + i * 4, y + 6, l);
      // eye stalks
      const ey = anim === 'windup' ? y - 6 : y - 4;
      P.rect(20, ey, 1, 4, d); P.rect(24, ey, 1, 4, d); P.rect(19, ey - 1, 3, 2, '#ffffff'); P.rect(23, ey - 1, 3, 2, '#ffffff'); P.px(21, ey - 1, '#101010'); P.px(25, ey - 1, '#101010');
      // claws: raised on windup, snap on attack
      const up = anim === 'windup' ? -6 : anim === 'attack' ? (f ? 2 : -2) : 0;
      const open = anim === 'windup' || (anim === 'attack' && !f);
      const claw = (x, yy) => { P.ellipse(x, yy, 4, 3, m); P.ellipse(x - 1, yy - 1, 2, 1, l); if (open) { P.rect(x + 2, yy - 4, 3, 2, m); P.rect(x + 2, yy + 2, 3, 2, m); } else P.rect(x + 3, yy - 1, 3, 3, d); };
      seg(P, 25, y + 2, 29, y - 2 + up, 3, d); claw(31, y - 3 + up);
      seg(P, 9, y + 2, 5, y - 1 + up / 2, 3, d); claw(4, y - 2 + up / 2);
      if (p.crown) { P.rect(13, y - 5, 8, 2, p.crown); P.px(13, y - 7, p.crown); P.px(17, y - 8, p.crown); P.px(20, y - 7, p.crown); P.px(17, y - 5, '#e03050'); }
    },
  };

  // ---------------------------------------------------------------- myconid (walking mushroom folk)
  M.myconid = {
    w: 30, h: 36, ax: 15, ay: 34, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 2 },
    draw(P, p, anim, f) {
      const cap = p.main, stem = p.stem || '#e0d8c8', d = sh(cap, -0.3), l = sh(cap, 0.3), sd = sh(stem, -0.25);
      const bob = anim === 'walk' ? [0, -1, 0, -1][f] : anim === 'idle' ? f : 0;
      const y = 8 + bob;
      const lp = anim === 'walk' ? [[0, 2], [0, 0], [2, 0], [0, 0]][f] : [0, 0];
      // stubby legs
      P.rect(10, y + 20, 4, 6 - lp[0], sd); P.rect(17, y + 20, 4, 6 - lp[1], stem);
      // stem body
      P.rect(9, y + 9, 13, 13, stem); P.rect(9, y + 9, 3, 13, sh(stem, 0.15)); P.rect(19, y + 9, 3, 13, sd);
      // face
      P.rect(15, y + 12, 2, 2, '#1a1418'); P.rect(19, y + 12, 2, 2, '#1a1418');
      if (p.eye) { P.px(15, y + 12, p.eye); P.px(19, y + 12, p.eye); }
      P.rect(16, y + 16, 3, 1, sd);
      // arms
      const up = anim === 'windup' ? -6 : anim === 'attack' ? 3 : anim === 'cast' ? -8 : 0;
      P.rect(6, y + 12, 3, 7, stem); P.rect(22, y + 12 + Math.min(0, up), 3, 7, stem);
      if (anim === 'cast') { P.circle(23, y + 3 - f, 3, p.accent || '#80ffb0'); P.px(22, y + 2 - f, '#ffffff'); }
      if (p.weapon === 'club') { P.rect(23, y + 1 + up, 3, 14, '#6a4a2a'); P.rect(22, y + up, 5, 5, '#8a6a42'); }
      // cap
      P.ellipse(15, y + 6, 14, 6, d); P.ellipse(15, y + 4, 13, 6, cap); P.ellipse(11, y + 1, 5, 2, l);
      for (const [x, yy] of [[6, 4], [13, 1], [20, 3], [24, 6], [9, 7]]) P.circle(x, y + yy, 1, p.spots || '#f8f0e0');
      P.rect(4, y + 9, 23, 1, sh(cap, -0.5));
      if (p.crown) { P.rect(10, y - 3, 10, 2, p.crown); P.px(10, y - 5, p.crown); P.px(15, y - 6, p.crown); P.px(19, y - 5, p.crown); }
      if (anim === 'windup') for (let i = 0; i < 3; i++) P.px(8 + i * 7, y - 2 - i % 2, p.accent || '#c0ff80');
    },
  };

  // ---------------------------------------------------------------- treant
  M.treant = {
    w: 48, h: 56, ax: 24, ay: 53, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f) {
      const bark = p.main, d = sh(bark, -0.3), l = sh(bark, 0.2), leaf = p.leaf || '#4a8a3a';
      const bob = anim === 'walk' ? [0, -1, 0, -1][f] : 0;
      const y = 10 + bob;
      const lp = anim === 'walk' ? [[0, 3], [0, 0], [3, 0], [0, 0]][f] : [0, 0];
      // root legs
      P.rect(15, y + 30, 6, 13 - lp[0], d); P.rect(26, y + 30, 6, 13 - lp[1], bark);
      P.rect(13, y + 42 - lp[0], 9, 2, d); P.rect(25, y + 42 - lp[1], 9, 2, bark);
      // trunk body
      P.rect(13, y + 8, 22, 24, bark); P.rect(13, y + 8, 4, 24, l); P.rect(31, y + 8, 4, 24, d);
      for (let i = 0; i < 5; i++) P.rect(17 + i * 3, y + 10 + (i % 2) * 5, 1, 14, d);
      // face knot
      P.rect(19, y + 14, 10, 7, d); P.rect(20, y + 15, 3, 2, p.eye || '#ffe060'); P.rect(25, y + 15, 3, 2, p.eye || '#ffe060'); P.rect(21, y + 19, 6, 1, '#140c1c');
      // arms: branches
      const up = anim === 'windup' ? -10 : anim === 'attack' ? 6 : anim === 'cast' ? -12 : 0;
      seg(P, 14, y + 12, 6, y + 24, 5, bark); seg(P, 6, y + 24, 4, y + 30, 3, d);
      seg(P, 34, y + 12, 42, y + 20 + up, 5, bark); seg(P, 42, y + 20 + up, 45, y + 26 + up, 3, d);
      // canopy
      for (const [x, yy, r] of [[24, y + 2, 12], [14, y + 6, 8], [34, y + 5, 8], [24, y - 5, 8]]) { P.circle(x, yy, r, sh(leaf, -0.2)); P.circle(x - 2, yy - 2, r - 3, leaf); }
      for (let i = 0; i < 8; i++) P.px(10 + ((i * 37) % 30), y - 8 + ((i * 13) % 18), sh(leaf, 0.35));
      if (p.flowers) for (let i = 0; i < 6; i++) P.px(12 + ((i * 29) % 26), y - 6 + ((i * 17) % 16), p.flowers);
      if (p.crown) { P.rect(18, y - 14, 12, 3, p.crown); P.px(18, y - 16, p.crown); P.px(24, y - 17, p.crown); P.px(29, y - 16, p.crown); P.px(24, y - 14, '#ff70c0'); }
    },
  };

  // ---------------------------------------------------------------- bramble (rooted turret plant)
  M.bramble = {
    w: 30, h: 30, ax: 15, ay: 27, frames: { idle: 2, walk: 2, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const g = p.main, d = sh(g, -0.3), l = sh(g, 0.25);
      const open = anim === 'windup' ? 2 : anim === 'attack' ? 4 : f;
      P.ellipse(15, 25, 11, 3, sh(g, -0.5));
      for (let i = 0; i < 6; i++) { const a = -Math.PI + i / 5 * Math.PI; seg(P, 15, 22, 15 + Math.cos(a) * (10 + open), 22 + Math.sin(a) * (8 + open), 3, i % 2 ? d : g); }
      // bulb mouth
      P.circle(15, 14, 7, g); P.circle(13, 12, 3, l);
      P.rect(10, 13, 10, 3 + open, '#2a0a14');
      for (let x = 10; x < 20; x += 2) { P.px(x, 13, '#f0e8d0'); P.px(x + 1, 15 + open, '#f0e8d0'); }
      for (let i = 0; i < 6; i++) P.px(6 + ((i * 7) % 18), 6 + ((i * 5) % 14), '#d8c8a0');
      if (p.flower) { P.circle(15, 5, 2, p.flower); P.px(15, 5, '#fff4a0'); }
    },
  };

  // ---------------------------------------------------------------- pixie
  M.pixie = {
    w: 22, h: 26, ax: 11, ay: 24, frames: { idle: 4, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f, ctx) {
      const m = p.main, wing = p.wing || 'rgba(220,240,255,0.7)';
      const flap = f % 2;
      const y = 6 + (f % 2);
      // wings
      ctx.globalAlpha = 0.75;
      P.ellipse(6, y + 4 - flap, 5, 3 + flap, wing); P.ellipse(16, y + 4 - flap, 5, 3 + flap, wing);
      P.ellipse(7, y + 9, 3, 2, wing); P.ellipse(15, y + 9, 3, 2, wing);
      ctx.globalAlpha = 1;
      // body
      P.rect(9, y + 6, 4, 6, m); P.rect(10, y + 12, 1, 3, sh(m, -0.2)); P.rect(12, y + 12, 1, 3, sh(m, -0.2));
      P.circle(11, y + 3, 3, p.skin || '#f0d0e0'); P.px(12, y + 3, '#1a1418'); P.px(10, y + 3, '#1a1418');
      P.rect(8, y - 1, 7, 2, p.hair || '#ff90d0'); P.px(8, y + 1, p.hair || '#ff90d0');
      if (anim === 'windup' || anim === 'cast') { P.circle(16, y + 7, 2, p.accent || '#fff4a0'); P.px(16, y + 7, '#ffffff'); }
      // sparkle trail
      P.px(4 + f * 3, y + 16, p.accent || '#fff4a0'); P.px(14 - f * 2, y + 18, '#ffffff');
    },
  };

  // ---------------------------------------------------------------- void eye (floating)
  M.voideye = {
    w: 38, h: 40, ax: 19, ay: 37, frames: { idle: 4, walk: 4, windup: 2, attack: 1, cast: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.3);
      const y = 12 + [0, -1, -2, -1][f % 4];
      // tentacles
      for (let i = 0; i < 5; i++) {
        const x = 9 + i * 5, wv = Math.round(Math.sin((f + i) * 1.3) * 2);
        seg(P, x, y + 8, x + wv, y + 18, 3, d); seg(P, x + wv, y + 18, x - wv, y + 24, 2, sh(d, -0.2));
      }
      // body orb
      P.circle(19, y + 2, 12, d); P.circle(19, y + 1, 11, m); P.circle(15, y - 4, 4, l);
      // eye
      const wide = anim === 'windup' || anim === 'cast';
      const er = wide ? 7 : 6;
      P.ellipse(20, y + 2, er, wide ? 6 : 4, '#f4f0ff');
      const px = anim === 'attack' ? 23 : 21;
      P.circle(px, y + 2, 3, p.eye || '#c040ff'); P.rect(px - 1, y, 2, 4, '#0a0610'); P.px(px + 1, y, '#ffffff');
      if (anim === 'idle' && f === 3) P.rect(13, y + 1, 14, 2, m); // blink
      for (let i = 0; i < 4; i++) P.px(8 + ((i * 11) % 22), y - 8 + ((i * 7) % 20), '#ffffff');
      if (p.crown) { for (let i = 0; i < 5; i++) seg(P, 11 + i * 4, y - 10, 11 + i * 4 + (i - 2), y - 16 - (i % 2) * 3, 2, p.crown); }
    },
  };
})(window.RPG);
