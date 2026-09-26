'use strict';
// More terrain: cliffs & plateaus (with stairs and waterfalls) in several biome styles, plus the
// tiles and props for the coast, the fungal hollows, the fey grove and the starfall rift.
// Same formats as gfx/tiles.js.
(function (R) {
  const U = R.U;
  const T = R.Tiles, PR = R.Props;
  function base(P, c, rng, spots) {
    P.rect(0, 0, 16, 16, c);
    for (const [col, n] of spots) P.speckle(0, 0, 16, 16, col, n, rng);
  }
  function blob(P, cx, cy, r, c, rng) {
    P.circle(cx, cy, r, c);
    const l = U.shade(c, 0.18), d = U.shade(c, -0.22);
    P.circle(cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.round(r * 0.55), l);
    for (let i = 0; i < r * 2; i++) { const a = rng() * U.TAU, rr = r * (0.5 + rng() * 0.45); P.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rng() < 0.5 ? d : U.shade(l, 0.15)); }
  }

  // ================================================================== cliffs
  // rock = face colour, lip = colour of the ground on top of the plateau
  const CLIFF_STYLES = {
    rock: { rock: '#7a6a58', lip: '#4f8a3a', moss: '#3f7a33' },
    coast: { rock: '#9a8c7a', lip: '#6aa84a', moss: '#4a8a3a' },
    snow: { rock: '#6a7080', lip: '#e8eef6', moss: '#ffffff' },
    sand: { rock: '#b0804a', lip: '#dcc58a', moss: '#c8a870' },
    dark: { rock: '#3e343c', lip: '#4a4046', moss: '#5ae0c0' },
    fey: { rock: '#5a4a70', lip: '#4aa88a', moss: '#ff90d0' },
    void: { rock: '#2a2040', lip: '#3a2a5a', moss: '#c080ff' },
  };
  R.CLIFF_STYLES = CLIFF_STYLES;
  function strata(P, r, rock, y0, y1) {
    for (let y = y0; y < y1; y += 4) {
      const c = r.pick([rock, U.shade(rock, 0.08), U.shade(rock, -0.08)]);
      P.rect(0, y, 16, Math.min(4, y1 - y), c);
      P.rect(0, y, 16, 1, U.shade(c, 0.22));
      P.rect(r.int(0, 10), y + 3, r.int(3, 6), 1, U.shade(c, -0.3));
    }
    if (r.chance(0.5)) { const x = r.int(2, 13); P.line(x, y0 + 1, x + r.int(-2, 2), y1 - 1, U.shade(rock, -0.35)); }
  }
  for (const [st, C] of Object.entries(CLIFF_STYLES)) {
    const rock = C.rock, lip = C.lip;
    // upper face: the plateau's grassy lip hangs over the top of the rock
    T['cliff_' + st] = {
      color: U.shade(rock, -0.1), solid: true, wall: true, pri: 9, draw(P, r) {
        strata(P, r, rock, 0, 16);
        P.rect(0, 0, 16, 3, lip); P.rect(0, 3, 16, 1, U.shade(lip, -0.3));
        for (let i = 0; i < 5; i++) { const x = r.int(0, 15); P.rect(x, 3, 1, r.int(1, 4), C.moss); }
        if (st === 'void' && r.chance(0.6)) P.px(r.int(1, 14), r.int(5, 14), '#e0c0ff');
        if (st === 'dark' && r.chance(0.3)) { const x = r.int(2, 13), y = r.int(5, 13); P.px(x, y, '#6fd8ff'); }
      },
    };
    // lower face: darker rock, shadow and rubble at the foot of the cliff
    T['cliffbase_' + st] = {
      color: U.shade(rock, -0.25), solid: true, wall: true, pri: 9, draw(P, r) {
        strata(P, r, U.shade(rock, -0.12), 0, 14);
        P.rect(0, 12, 16, 4, U.shade(rock, -0.45));
        for (let i = 0; i < 4; i++) { const x = r.int(0, 13); P.rect(x, 13, 3, 2, U.shade(rock, -0.05)); P.px(x, 13, U.shade(rock, 0.2)); }
        if (st === 'void' && r.chance(0.4)) P.px(r.int(1, 14), r.int(2, 10), '#e0c0ff');
      },
    };
    // rim around the other sides of a plateau
    T['cliffside_' + st] = {
      color: U.shade(rock, -0.05), solid: true, wall: true, pri: 9, draw(P, r) {
        P.rect(0, 0, 16, 16, U.shade(rock, -0.3));
        for (let i = 0; i < 4; i++) { const x = r.int(-2, 12), y = r.int(0, 12), c = r.pick([rock, U.shade(rock, 0.1), U.shade(rock, -0.1)]); P.rect(x, y, r.int(5, 8), 4, c); P.rect(x, y, 4, 1, U.shade(c, 0.25)); }
        P.speckle(0, 0, 16, 16, lip, 10, r);
        if (r.chance(0.4)) P.rect(r.int(1, 12), r.int(1, 12), 3, 1, C.moss);
      },
    };
    // stairs cut into the rock
    T['stairs_' + st] = {
      color: U.shade(rock, 0.15), pri: 6, draw(P) {
        const c = U.shade(rock, 0.12);
        P.rect(0, 0, 16, 16, U.shade(rock, -0.35));
        for (let y = 0; y < 16; y += 4) { P.rect(1, y, 14, 3, c); P.rect(1, y, 14, 1, U.shade(c, 0.3)); P.rect(1, y + 3, 14, 1, U.shade(c, -0.4)); }
        P.rect(0, 0, 1, 16, U.shade(rock, -0.5)); P.rect(15, 0, 1, 16, U.shade(rock, -0.5));
      },
    };
  }
  T.waterfall = {
    color: '#5aa0e0', solid: true, water: true, fall: true, pri: 9, wall: false, draw(P, r) {
      P.rect(0, 0, 16, 16, '#3a80c8');
      for (let x = 0; x < 16; x += 2) P.rect(x, 0, 1, 16, r.pick(['#5aa0e0', '#78b8f0', '#4a90d8']));
      P.rect(0, 0, 1, 16, '#2a6aa8'); P.rect(15, 0, 1, 16, '#2a6aa8');
    },
  };

  // ================================================================== coast
  T.beach = { color: '#e6d3a0', pri: 2, draw(P, r) { base(P, '#e6d3a0', r, [['#d8c490', 18], ['#f2e2b8', 12]]); if (r.chance(0.25)) { const x = r.int(2, 12), y = r.int(2, 12); P.px(x, y, '#ffffff'); P.px(x + 1, y, '#f0b0a0'); } } };
  T.wetsand = { color: '#c8b48a', pri: 2, draw(P, r) { base(P, '#c8b48a', r, [['#b8a47a', 18], ['#d4c298', 8]]); if (r.chance(0.3)) P.rect(r.int(1, 10), r.int(2, 13), 5, 1, '#a8946a'); } };
  T.sea = {
    color: '#2a70a8', solid: true, water: true, pri: 0, draw(P, r) {
      base(P, '#2a70a8', r, [['#3280b8', 14], ['#245f94', 12]]);
      for (let i = 0; i < 2; i++) { const x = r.int(0, 10), y = r.int(1, 14); P.rect(x, y, 5, 1, '#5aa0d8'); P.rect(x + 1, y - 1, 3, 1, '#7ab8e8'); }
    },
  };
  T.surf = { color: '#78b8d8', water: true, pri: 1, draw(P, r) { base(P, '#6aaed0', r, [['#80c0e0', 14], ['#5a9ec4', 8]]); for (let i = 0; i < 2; i++) P.rect(r.int(0, 11), r.int(1, 14), 4, 1, '#e8f8ff'); } };
  T.wetstone = { color: '#4a5a60', pri: 3, draw(P, r) { base(P, '#4a5a60', r, [['#556870', 16], ['#3e4c52', 14]]); if (r.chance(0.3)) { const x = r.int(2, 12), y = r.int(2, 12); P.ellipse(x, y, 2, 1, '#6a8a98'); } if (r.chance(0.15)) P.px(r.int(1, 14), r.int(1, 14), '#80e0c0'); } };
  T.seawall = {
    color: '#26343a', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#26343a'); P.speckle(0, 0, 16, 16, '#30424a', 20, r); P.speckle(0, 0, 16, 16, '#1c282c', 12, r);
      if (r.chance(0.25)) { const x = r.int(1, 12); P.rect(x, r.int(4, 14), 3, 1, '#3a7a5a'); }
      if (r.chance(0.12)) { const x = r.int(2, 13), y = r.int(2, 13); P.px(x, y, '#e0a0c0'); P.px(x + 1, y, '#c07090'); }
    },
  };

  // ================================================================== fungal hollows
  T.glowmoss = {
    color: '#2e2a40', pri: 3, draw(P, r) {
      base(P, '#2e2a40', r, [['#36304c', 16], ['#262236', 12]]);
      for (let i = 0; i < 3; i++) if (r.chance(0.6)) P.px(r.int(1, 14), r.int(1, 14), r.pick(['#5ae0c0', '#a060ff', '#40c0ff']));
      if (r.chance(0.2)) { const x = r.int(2, 12), y = r.int(3, 12); P.rect(x, y, 3, 1, '#3a5a50'); }
    },
  };
  T.sporegrass = { color: '#3a4a5a', pri: 3, draw(P, r) { base(P, '#3a4a5a', r, [['#44586a', 16], ['#30404e', 10]]); for (let i = 0; i < 4; i++) { const x = r.int(1, 14), y = r.int(2, 14); P.px(x, y, '#6ab0a0'); P.px(x, y - 1, '#6ab0a0'); } if (r.chance(0.25)) P.px(r.int(1, 14), r.int(1, 14), '#ffe070'); } };
  T.fungalwall = {
    color: '#1e1a2a', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#1e1a2a'); P.speckle(0, 0, 16, 16, '#28223a', 22, r); P.speckle(0, 0, 16, 16, '#141020', 12, r);
      if (r.chance(0.3)) { const x = r.int(2, 12), y = r.int(6, 13), c = r.pick(['#40c0a0', '#a050e0', '#e05080']); P.rect(x + 1, y, 1, 3, '#d8d0c0'); P.rect(x, y - 1, 3, 1, c); P.px(x + 1, y - 2, U.shade(c, 0.3)); }
    },
  };

  // ================================================================== fey grove
  T.feygrass = {
    color: '#3f9a7a', pri: 3, draw(P, r) {
      base(P, '#3f9a7a', r, [['#4aa888', 14], ['#358a6c', 12]]);
      for (let i = 0; i < 3; i++) { const x = r.int(1, 14), y = r.int(2, 14); P.px(x, y, '#6ad0a8'); P.px(x, y - 1, '#6ad0a8'); }
      if (r.chance(0.18)) { const x = r.int(2, 13), y = r.int(2, 13), c = r.pick(['#ff90d0', '#a0c8ff', '#fff4a0']); P.px(x, y, c); P.px(x - 1, y, U.shade(c, -0.2)); P.px(x + 1, y, U.shade(c, -0.2)); }
    },
  };
  T.feymoss = { color: '#2e6a5a', pri: 3, draw(P, r) { base(P, '#2e6a5a', r, [['#367a68', 14], ['#26584a', 12]]); if (r.chance(0.3)) P.px(r.int(1, 14), r.int(1, 14), '#c0ffe0'); } };
  T.mossstone = { color: '#7a8a80', pri: 4, draw(P, r) { P.rect(0, 0, 16, 16, '#4a5a50'); for (const [sx, sy, w, h] of [[0, 0, 8, 7], [8, 0, 8, 7], [0, 7, 6, 9], [6, 7, 10, 9]]) { const c = r.pick(['#7a8a80', '#84948a', '#6e7e74']); P.rect(sx + 1, sy + 1, w - 1, h - 1, c); P.rect(sx + 1, sy + 1, w - 1, 1, U.shade(c, 0.2)); } P.speckle(0, 0, 16, 16, '#4a8a5a', 6, r); } };
  T.thornwall = {
    color: '#2a3a24', solid: true, wall: true, pri: 8, draw(P, r) {
      P.rect(0, 0, 16, 16, '#1e2a1a');
      for (let i = 0; i < 6; i++) { const x = r.int(-2, 14), y = r.int(-2, 14); P.line(x, y, x + r.int(-6, 6), y + r.int(3, 8), r.pick(['#3a4a2a', '#4a5a30', '#2e3a22'])); }
      for (let i = 0; i < 5; i++) P.px(r.int(0, 15), r.int(0, 15), '#c8b8a0');
      if (r.chance(0.3)) { const x = r.int(2, 13), y = r.int(2, 13); P.px(x, y, '#e04070'); P.px(x + 1, y, '#ff80a0'); }
    },
  };

  // ================================================================== starfall rift
  T.voidfloor = {
    color: '#221a36', pri: 4, draw(P, r, x, y) {
      P.rect(0, 0, 16, 16, '#1c1630');
      for (const [sx, sy, w, h] of [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]]) { const c = r.pick(['#2a2240', '#261e3a', '#302848']); P.rect(sx + 1, sy + 1, w - 1, h - 1, c); P.rect(sx + 1, sy + 1, w - 1, 1, U.shade(c, 0.2)); }
      if ((x * 7 + y * 13) % 9 === 0) { P.rect(6, 6, 4, 4, '#3a2a5a'); P.px(7, 7, '#c080ff'); P.px(8, 8, '#c080ff'); }
    },
  };
  T.voidrock = { color: '#3a2e52', pri: 3, draw(P, r) { base(P, '#3a2e52', r, [['#443860', 16], ['#302646', 12]]); if (r.chance(0.35)) P.px(r.int(1, 14), r.int(1, 14), '#ffffff'); if (r.chance(0.2)) P.line(r.int(0, 8), r.int(0, 15), r.int(8, 15), r.int(0, 15), '#6a40a0'); } };
  T.starvoid = {
    color: '#07050e', solid: true, pri: 10, draw(P, r) {
      P.rect(0, 0, 16, 16, '#07050e');
      for (let i = 0; i < 3; i++) if (r.chance(0.7)) P.px(r.int(0, 15), r.int(0, 15), r.pick(['#ffffff', '#c0a0ff', '#80a0ff', '#ffe0a0']));
      if (r.chance(0.06)) { const x = r.int(3, 12), y = r.int(3, 12); P.px(x, y, '#ffffff'); P.px(x - 1, y, '#8060c0'); P.px(x + 1, y, '#8060c0'); P.px(x, y - 1, '#8060c0'); P.px(x, y + 1, '#8060c0'); }
    },
  };

  // ================================================================== props
  // --- coast
  PR.shell = { w: 10, h: 8, ax: 5, ay: 6, box: null, variants: 3, draw(P, r) { const c = r.pick(['#f0c0b0', '#f8f0e0', '#e0a8d0']); P.ellipse(5, 4, 3, 2, c); for (let i = 3; i < 8; i += 2) P.px(i, 3, U.shade(c, -0.25)); P.px(5, 6, U.shade(c, -0.3)); } };
  PR.driftwood = { w: 28, h: 12, ax: 14, ay: 9, box: [-11, -3, 22, 3], variants: 2, draw(P, r) { const c = '#a8987a'; P.rect(2, 5, 24, 4, c); P.rect(2, 5, 24, 1, U.shade(c, 0.25)); P.rect(2, 8, 24, 1, U.shade(c, -0.3)); P.line(6, 5, 3, 1, c); P.line(20, 5, 24, 2, c); P.px(12, 6, U.shade(c, -0.3)); P.px(17, 7, U.shade(c, -0.3)); } };
  PR.lighthouse = {
    w: 40, h: 104, ax: 20, ay: 101, box: [-12, -10, 24, 10], light: { r: 150, color: '#fff0a0', flicker: 0.05 }, anim: 4,
    draw(P, r, ctx, f) {
      P.rect(6, 92, 28, 10, '#7a7a82'); P.rect(6, 92, 28, 2, '#9a9aa2');
      for (let y = 26; y < 92; y++) { const w = Math.round(9 + (y - 26) * 0.07); const band = Math.floor((y - 26) / 11) % 2; P.rect(20 - w, y, w * 2, 1, band ? '#c03030' : '#f0ece0'); P.px(20 - w, y, band ? '#801818' : '#c8c0b0'); }
      P.rect(16, 70, 8, 10, '#3a2a20'); P.rect(17, 71, 6, 8, '#1a1210');
      P.rect(8, 22, 24, 4, '#3a3a44'); P.rect(11, 8, 18, 14, '#2a2a34');
      P.rect(13, 10, 14, 10, '#ffe890'); P.rect(13 + (f || 0) * 3, 10, 3, 10, '#ffffff');
      P.rect(9, 5, 22, 4, '#c03030'); P.rect(12, 2, 16, 3, '#a02828'); P.rect(19, 0, 2, 2, '#3a3a44');
    },
  };
  PR.dockpost = { w: 8, h: 18, ax: 4, ay: 16, box: [-2, -2, 4, 2], draw(P) { P.rect(2, 2, 4, 15, '#6a4a2a'); P.rect(2, 2, 4, 1, '#8a6a42'); P.rect(1, 6, 6, 2, '#c8b890'); P.rect(2, 16, 4, 1, '#3a2a18'); } };
  PR.anchor = { w: 20, h: 22, ax: 10, ay: 20, box: [-6, -3, 12, 3], draw(P) { const c = '#5a5a64'; P.rect(9, 2, 2, 16, c); P.rect(6, 5, 8, 2, c); P.circle(10, 2, 2, c); P.px(10, 2, '#140c1c'); P.line(3, 14, 9, 19, c); P.line(17, 14, 11, 19, c); P.rect(2, 12, 3, 2, c); P.rect(15, 12, 3, 2, c); P.rect(9, 2, 1, 16, '#7a7a84'); } };
  PR.shipwreck = {
    w: 96, h: 60, ax: 48, ay: 55, box: [-40, -16, 80, 14],
    draw(P) {
      const w = '#6a4a2e', d = '#4a3220', l = '#8a6a44';
      for (let x = 6; x < 90; x++) { const k = (x - 48) / 42; const top = 26 + Math.round(k * k * 10) - (x > 70 ? (x - 70) : 0); P.rect(x, top, 1, 55 - top, x % 6 === 0 ? d : w); P.px(x, top, l); }
      for (let y = 30; y < 54; y += 5) P.rect(8, y, 80, 1, d);
      P.rect(40, 4, 3, 26, '#5a3a22'); P.line(41, 6, 58, 18, '#5a3a22'); P.rect(43, 8, 14, 12, '#d8d0b8'); P.rect(43, 8, 14, 1, '#f0e8d0'); P.line(46, 10, 54, 18, '#a8a088');
      P.rect(22, 38, 8, 6, '#140c1c'); P.rect(60, 36, 10, 8, '#140c1c');
      P.rect(0, 52, 96, 4, 'rgba(90,140,180,0.6)');
    },
  };
  PR.coral = { w: 20, h: 18, ax: 10, ay: 16, box: [-5, -3, 10, 3], variants: 3, draw(P, r) { const c = r.pick(['#ff7a80', '#ffa040', '#c070ff']); for (const [x, h] of [[5, 10], [9, 14], [13, 9], [16, 7]]) { P.rect(x, 17 - h, 2, h, c); P.px(x - 1, 17 - h + 2, c); P.px(x + 2, 17 - h + 4, c); P.px(x, 17 - h, U.shade(c, 0.35)); } } };
  PR.seaweed = { w: 12, h: 18, ax: 6, ay: 16, box: null, variants: 2, anim: 2, draw(P, r, ctx, f) { const c = '#3a8a5a'; for (const x of [3, 6, 9]) for (let y = 4; y < 17; y++) P.px(x + Math.round(Math.sin(y * 0.6 + (f || 0) * 1.5) * 1), y, y % 3 ? c : U.shade(c, 0.2)); } };
  PR.fishrack = { w: 32, h: 26, ax: 16, ay: 23, box: [-13, -3, 26, 3], draw(P) { P.rect(3, 4, 2, 20, '#6a4a2a'); P.rect(27, 4, 2, 20, '#6a4a2a'); P.rect(2, 4, 28, 2, '#8a6a42'); for (const x of [8, 13, 18, 23]) { P.rect(x, 6, 1, 3, '#c8c0a0'); P.ellipse(x, 12, 2, 4, '#8aa0b0'); P.px(x, 9, '#5a7080'); P.px(x - 1, 16, '#6a8090'); P.px(x + 1, 16, '#6a8090'); } } };
  PR.crabtrap = { w: 18, h: 14, ax: 9, ay: 12, box: [-7, -4, 14, 4], draw(P) { P.rect(2, 3, 14, 9, '#8a6a42'); for (let x = 3; x < 16; x += 3) P.rect(x, 3, 1, 9, '#5a3a22'); for (let y = 4; y < 12; y += 3) P.rect(2, y, 14, 1, '#5a3a22'); P.rect(2, 3, 14, 1, '#aa8a5a'); } };
  PR.buoy = { w: 12, h: 18, ax: 6, ay: 15, box: null, anim: 2, draw(P, r, ctx, f) { const b = (f || 0); P.rect(3, 6 + b, 6, 7, '#e04030'); P.rect(3, 9 + b, 6, 2, '#f0f0f0'); P.rect(5, 2 + b, 2, 4, '#3a3a44'); P.px(5, 1 + b, '#ffe070'); P.rect(1, 13, 10, 2, 'rgba(200,230,255,0.6)'); } };
  PR.seastack = { w: 30, h: 40, ax: 15, ay: 37, box: [-11, -8, 22, 8], variants: 2, draw(P, r) { const c = '#8a7e70'; P.ellipse(15, 36, 13, 4, 'rgba(230,245,255,0.7)'); P.rect(5, 10, 20, 26, c); P.rect(7, 4, 15, 8, c); P.rect(10, 1, 8, 4, c); P.rect(5, 10, 3, 26, U.shade(c, 0.2)); P.rect(22, 10, 3, 26, U.shade(c, -0.3)); for (let y = 12; y < 34; y += 5) P.rect(8, y, 14, 1, U.shade(c, -0.2)); P.rect(9, 1, 10, 2, '#e8e8e8'); P.px(12, 6, '#ffffff'); } };

  // --- fungal hollows
  PR.glowshroom = {
    w: 26, h: 42, ax: 13, ay: 39, box: [-3, -3, 6, 3], variants: 3, light: { r: 56, color: '#50e0c0', flicker: 0.08 },
    draw(P, r) {
      const c = r.pick(['#40d0b0', '#a060ff', '#ff60a0']);
      for (let y = 16; y < 40; y++) P.rect(12 + Math.round(Math.sin(y * 0.2) * 1), y, 3, 1, y % 5 ? '#d8d0e0' : '#b8b0c8');
      P.ellipse(13, 14, 12, 6, U.shade(c, -0.3)); P.ellipse(13, 12, 11, 6, c); P.ellipse(10, 9, 5, 2, U.shade(c, 0.4));
      for (let i = 0; i < 6; i++) P.px(r.int(4, 22), r.int(8, 15), '#ffffff');
      P.rect(6, 16, 14, 1, U.shade(c, -0.45)); for (let x = 7; x < 20; x += 2) P.px(x, 17, U.shade(c, -0.2));
    },
  };
  PR.sporepod = { w: 18, h: 18, ax: 9, ay: 16, box: [-5, -3, 10, 3], variants: 2, anim: 3, light: { r: 34, color: '#c0ff60', flicker: 0.2 }, draw(P, r, ctx, f) { const s = [0, 1, 2][f || 0]; const c = '#90d040'; P.ellipse(9, 11, 6 + (s > 1 ? 1 : 0), 5 + (s > 0 ? 1 : 0), U.shade(c, -0.3)); P.ellipse(9, 10, 5 + (s > 1 ? 1 : 0), 4 + (s > 0 ? 1 : 0), c); P.px(7, 8, '#f0ffc0'); P.px(11, 11, '#f0ffc0'); P.rect(4, 15, 10, 2, '#4a3a5a'); } };
  PR.shroomcluster = { w: 22, h: 16, ax: 11, ay: 14, box: null, variants: 3, light: { r: 24, color: '#60e0ff', flicker: 0.05 }, draw(P, r) { for (const [x, h] of [[5, 6], [10, 9], [15, 5], [18, 7]]) { const c = r.pick(['#40c0ff', '#40e0b0', '#c070ff']); P.rect(x, 15 - h, 1, h, '#d8d0c0'); P.ellipse(x, 15 - h, 3, 2, c); P.px(x - 1, 14 - h, '#ffffff'); } } };
  PR.rootpillar = { w: 22, h: 44, ax: 11, ay: 41, box: [-7, -5, 14, 5], variants: 2, draw(P, r) { const c = '#4a3a3a'; P.rect(5, 0, 12, 42, c); P.rect(5, 0, 3, 42, U.shade(c, 0.2)); for (let i = 0; i < 6; i++) { const y = r.int(2, 38); P.line(r.int(5, 16), y, r.int(0, 21), y + r.int(4, 10), U.shade(c, -0.3)); } P.line(5, 36, 0, 42, c); P.line(16, 36, 21, 42, c); P.px(9, r.int(6, 30), '#5ae0c0'); P.px(12, r.int(6, 30), '#a060ff'); } };

  // --- fey grove
  PR.feytree = {
    w: 52, h: 68, ax: 26, ay: 65, box: [-5, -5, 10, 5], variants: 3, light: { r: 50, color: '#ff90e0', flicker: 0.05 },
    draw(P, r) {
      const tc = '#6a5a80';
      P.rect(22, 34, 8, 32, tc); P.rect(22, 34, 2, 32, U.shade(tc, 0.25)); P.line(22, 64, 16, 66, tc); P.line(29, 64, 36, 66, tc);
      const g = r.pick(['#d070c0', '#7aa0f0', '#60c8a8']);
      blob(P, 26, 30, 17, U.shade(g, -0.2), r); blob(P, 16, 22, 12, g, r); blob(P, 36, 21, 12, g, r); blob(P, 26, 12, 12, U.shade(g, 0.12), r);
      for (let i = 0; i < 10; i++) P.px(r.int(10, 42), r.int(4, 40), r.pick(['#ffffff', '#fff4a0', '#ffd0f0']));
    },
  };
  PR.thornbush = { w: 24, h: 18, ax: 12, ay: 16, box: [-9, -5, 18, 5], variants: 3, draw(P, r) { const c = '#3a4a2a'; blob(P, 8, 10, 6, c, r); blob(P, 16, 10, 6, c, r); blob(P, 12, 7, 6, U.shade(c, 0.1), r); for (let i = 0; i < 10; i++) { const x = r.int(2, 22), y = r.int(2, 15); P.px(x, y, '#d8c8a0'); } if (r.chance(0.6)) for (let i = 0; i < 3; i++) P.px(r.int(5, 19), r.int(4, 13), '#e04070'); } };
  PR.standingstone = { w: 18, h: 36, ax: 9, ay: 33, box: [-6, -5, 12, 5], variants: 3, light: { r: 30, color: '#80ffd0', flicker: 0.1 }, draw(P, r) { const c = '#8a9098'; P.rect(3, 6, 12, 28, c); P.rect(4, 3, 10, 4, c); P.rect(3, 6, 2, 28, U.shade(c, 0.2)); P.rect(13, 6, 2, 28, U.shade(c, -0.3)); const g = r.pick(['#80ffd0', '#ff90e0', '#a0c0ff']); P.rect(8, 10, 2, 6, g); P.rect(6, 12, 6, 1, g); P.px(8, 20, g); P.px(9, 22, g); P.rect(7, 25, 4, 1, g); P.speckle(3, 20, 12, 14, '#4a8a5a', 6, r); } };
  PR.fairyring = { w: 40, h: 22, ax: 20, ay: 18, box: null, light: { r: 40, color: '#ffe0ff', flicker: 0.15 }, draw(P) { for (let i = 0; i < 12; i++) { const a = i / 12 * U.TAU, x = 20 + Math.cos(a) * 16, y = 11 + Math.sin(a) * 8; P.rect(x, y, 1, 3, '#e8e0d0'); P.ellipse(x, y, 2, 1, i % 2 ? '#ff70b0' : '#f0f0ff'); } P.px(18, 10, '#fff4a0'); P.px(23, 12, '#fff4a0'); } };
  PR.bluebells = { w: 14, h: 10, ax: 7, ay: 8, box: null, variants: 3, draw(P, r) { for (let i = 0; i < 5; i++) { const x = r.int(2, 11), y = r.int(2, 6); P.px(x, y + 1, '#3a7a4a'); P.px(x, y + 2, '#3a7a4a'); P.px(x, y, '#7a90ff'); P.px(x + 1, y, '#a0b0ff'); } } };
  PR.hollowlog = { w: 36, h: 18, ax: 18, ay: 15, box: [-15, -5, 30, 5], draw(P) { const c = '#6a5040'; P.rect(3, 5, 30, 10, c); P.rect(3, 5, 30, 2, U.shade(c, 0.2)); P.rect(3, 13, 30, 2, U.shade(c, -0.3)); P.ellipse(4, 10, 3, 5, '#8a7050'); P.ellipse(4, 10, 2, 3, '#2a1a14'); P.speckle(8, 5, 24, 4, '#4a9a6a', 10, () => Math.random()); } };

  // --- starfall rift
  PR.voidcrystal = { w: 22, h: 34, ax: 11, ay: 31, box: [-6, -4, 12, 4], variants: 3, light: { r: 48, color: '#b070ff', flicker: 0.12 }, draw(P, r) { const c = r.pick(['#b070ff', '#6a80ff', '#ff70d0']); for (const [x, y, w, h] of [[10, 2, 4, 28], [5, 12, 3, 18], [15, 8, 4, 22]]) { P.rect(x, y, w, h, c); P.rect(x, y, 1, h, U.shade(c, 0.5)); P.rect(x + w - 1, y + 2, 1, h - 2, U.shade(c, -0.35)); P.px(x + 1, y - 1, '#ffffff'); } P.rect(3, 29, 16, 2, '#1a1428'); } };
  PR.floatrock = { w: 30, h: 34, ax: 15, ay: 31, box: null, variants: 2, anim: 4, draw(P, r, ctx, f) { const b = [0, 1, 2, 1][f || 0]; P.ellipse(15, 30, 9, 2, 'rgba(0,0,0,0.3)'); const c = '#4a3e60'; P.ellipse(15, 12 - b, 11, 6, c); P.rect(8, 12 - b, 14, 5, U.shade(c, -0.2)); P.rect(11, 16 - b, 8, 4, U.shade(c, -0.3)); P.rect(14, 19 - b, 3, 3, U.shade(c, -0.4)); P.ellipse(12, 9 - b, 5, 2, U.shade(c, 0.25)); P.px(18, 8 - b, '#c080ff'); P.px(9, 11 - b, '#ffffff'); } };
  PR.starpillar = { w: 18, h: 44, ax: 9, ay: 41, box: [-6, -5, 12, 5], variants: 2, draw(P, r) { const c = '#5a4e78'; P.rect(3, 38, 12, 5, U.shade(c, -0.2)); P.rect(4, 8 + r.int(0, 8), 10, 32, c); P.rect(4, 8, 2, 32, U.shade(c, 0.25)); P.rect(12, 8, 2, 32, U.shade(c, -0.3)); for (let i = 0; i < 4; i++) P.px(r.int(5, 12), r.int(12, 36), '#e0c0ff'); P.line(6, 20, 11, 26, '#2a2040'); } };
  PR.riftportal = {
    w: 48, h: 60, ax: 24, ay: 57, box: null, light: { r: 110, color: '#c060ff', flicker: 0.2 }, anim: 4,
    draw(P, r, ctx, f) {
      P.rect(2, 8, 7, 50, '#3a2e52'); P.rect(39, 8, 7, 50, '#3a2e52'); P.rect(0, 2, 48, 8, '#4a3e62'); P.rect(0, 2, 48, 1, '#6a5e82');
      const cols = ['#2a0a4a', '#5a20a0', '#9040e0', '#d080ff', '#ffffff'];
      for (let i = 0; i < 5; i++) P.ellipse(24, 33, 14 - i * 3, 22 - i * 4, cols[(i + (f || 0)) % 5]);
      P.px(24 + ((f || 0) % 2 ? 3 : -3), 20 + (f || 0) * 5, '#ffffff');
    },
  };
})(window.RPG);
