'use strict';
// Ground tiles and props (trees, houses, rocks...). All drawn procedurally.
//
//   RPG.Tiles[id] = { color, solid?, water?, liquid?, pri (edge priority), draw(P, rng) }   16x16
//   RPG.Props[id] = { w, h, ax, ay (anchor = base point inside sprite), box:[x,y,w,h] collision
//                     relative to anchor (px) or null, light?:{r,color,flicker}, draw(P, rng, ctx),
//                     variants?: n, anim?: frames, blocksView? }
(function (R) {
  const U = R.U, G = R.G;
  const T = R.Tiles = {};
  const PR = R.Props = {};

  // ---- tiles -----------------------------------------------------------------
  function base(P, c, rng, spots) {
    P.rect(0, 0, 16, 16, c);
    for (const [col, n] of spots) P.speckle(0, 0, 16, 16, col, n, rng);
  }
  T.grass = {
    color: '#4f8a3a', pri: 3, draw(P, r) {
      base(P, '#4f8a3a', r, [['#5c9a42', 14], ['#437a31', 10]]);
      for (let i = 0; i < 4; i++) { const x = r.int(1, 14), y = r.int(2, 14); P.px(x, y, '#6fb050'); P.px(x, y - 1, '#6fb050'); P.px(x + 1, y - 1, '#5c9a42'); }
      if (r.chance(0.12)) { const x = r.int(2, 13), y = r.int(2, 13); const fc = r.pick(['#f0e060', '#e87080', '#ffffff', '#80b0ff']); P.px(x, y, fc); P.px(x - 1, y, U.shade(fc, -0.2)); P.px(x + 1, y, U.shade(fc, -0.2)); P.px(x, y - 1, U.shade(fc, -0.2)); P.px(x, y + 1, '#3a6a28'); }
    },
  };
  T.darkgrass = { color: '#2f5a2a', pri: 3, draw(P, r) { base(P, '#2f5a2a', r, [['#386a30', 14], ['#244a20', 12]]); for (let i = 0; i < 3; i++) { const x = r.int(1, 14), y = r.int(2, 14); P.px(x, y, '#4a7a3a'); P.px(x, y - 1, '#4a7a3a'); } } };
  T.dirt = { color: '#8a6a44', pri: 2, draw(P, r) { base(P, '#8a6a44', r, [['#7a5c3a', 18], ['#9a7a52', 10], ['#6a4c30', 4]]); } };
  T.path = { color: '#b09468', pri: 2, draw(P, r) { base(P, '#b09468', r, [['#a08458', 16], ['#c0a478', 10]]); if (r.chance(0.3)) P.rect(r.int(2, 12), r.int(2, 12), 2, 1, '#8a7048'); } };
  T.sand = { color: '#dcc58a', pri: 2, draw(P, r) { base(P, '#dcc58a', r, [['#ccb57a', 20], ['#ecd59a', 10]]); if (r.chance(0.4)) { const y = r.int(3, 12); P.rect(r.int(1, 6), y, 5, 1, '#c8b070'); } } };
  T.cobble = {
    color: '#8a8a8a', pri: 4, draw(P, r) {
      P.rect(0, 0, 16, 16, '#5a5a62');
      const stones = [[0, 0, 7, 5], [8, 0, 8, 5], [0, 6, 5, 4], [6, 6, 10, 4], [0, 11, 9, 5], [10, 11, 6, 5]];
      for (const [x, y, w, h] of stones) { const c = r.pick(['#8a8a90', '#94949a', '#80808a', '#9a9aa0']); P.rect(x + 1, y + 1, w - 1, h - 1, c); P.rect(x + 1, y + 1, w - 1, 1, U.shade(c, 0.2)); }
    },
  };
  T.stone = { color: '#6a6a72', pri: 4, draw(P, r) { base(P, '#6a6a72', r, [['#5e5e66', 20], ['#76767e', 12]]); if (r.chance(0.3)) P.line(r.int(0, 8), r.int(0, 15), r.int(8, 15), r.int(0, 15), '#55555c'); } };
  T.wood = { color: '#9a6a3a', pri: 5, draw(P, r) { P.rect(0, 0, 16, 16, '#9a6a3a'); for (let y = 0; y < 16; y += 4) { P.rect(0, y, 16, 1, '#6a4422'); P.rect(r.int(0, 12), y + 2, 3, 1, '#8a5a2e'); } P.px(r.int(0, 15), r.int(0, 15), '#b07a44'); } };
  T.carpet = { color: '#8a2a3a', pri: 6, draw(P) { P.rect(0, 0, 16, 16, '#8a2a3a'); P.rect(0, 0, 16, 1, '#c0a040'); P.rect(0, 15, 16, 1, '#c0a040'); for (let i = 2; i < 16; i += 4) P.rect(i, 7, 2, 2, '#c0a040'); } };
  T.water = {
    color: '#2f6fb0', solid: true, water: true, pri: 1, draw(P, r) {
      base(P, '#2f6fb0', r, [['#3a80c0', 14], ['#28609c', 10]]);
      for (let i = 0; i < 2; i++) { const x = r.int(0, 11), y = r.int(1, 14); P.rect(x, y, 4, 1, '#6aa8e0'); }
    },
  };
  T.deepwater = { color: '#1f4f8a', solid: true, water: true, pri: 0, draw(P, r) { base(P, '#1f4f8a', r, [['#24589a', 14], ['#1a4478', 12]]); } };
  T.shallow = { color: '#5a9ac8', pri: 1, water: true, draw(P, r) { base(P, '#5a9ac8', r, [['#68a8d4', 14], ['#4a8ab8', 8]]); } };
  T.snow = { color: '#e8eef6', pri: 3, draw(P, r) { base(P, '#e8eef6', r, [['#d4dcea', 16], ['#ffffff', 10]]); if (r.chance(0.2)) P.rect(r.int(1, 12), r.int(1, 14), 3, 1, '#c4ccda'); } };
  T.ice = { color: '#a8d8f0', pri: 2, draw(P, r) { base(P, '#a8d8f0', r, [['#b8e4f8', 10]]); P.line(r.int(0, 6), r.int(0, 6), r.int(8, 15), r.int(8, 15), '#e0f4ff'); } };
  T.lava = { color: '#d8501a', solid: true, liquid: true, pri: 0, draw(P, r) { base(P, '#d8501a', r, [['#f07020', 20], ['#b03810', 12]]); for (let i = 0; i < 3; i++) P.rect(r.int(0, 12), r.int(0, 15), 3, 1, '#ffb040'); } };
  T.cave = { color: '#4a4046', pri: 2, draw(P, r) { base(P, '#4a4046', r, [['#40363c', 20], ['#564c52', 10]]); if (r.chance(0.2)) P.px(r.int(0, 15), r.int(0, 15), '#6a6070'); } };
  T.cavewall = {
    color: '#2a2228', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#2a2228');
      P.speckle(0, 0, 16, 16, '#342a32', 20, r); P.speckle(0, 0, 16, 16, '#1e181c', 14, r);
      if (r.chance(0.15)) { const x = r.int(2, 13), y = r.int(2, 13); P.px(x, y, '#6fd8ff'); P.px(x + 1, y, '#3a8aaa'); }
    },
  };
  T.wall = { color: '#5a4a44', solid: true, wall: true, pri: 9, draw(P, r) { P.rect(0, 0, 16, 16, '#4a3c38'); for (let y = 0; y < 16; y += 4) { const o = (y / 4) % 2 ? 4 : 0; for (let x = -o; x < 16; x += 8) { P.rect(x + 1, y + 1, 7, 3, r.pick(['#6a5a54', '#62524c', '#72625a'])); } } } };
  T.darkstone = { color: '#2e2a3a', pri: 4, draw(P, r) { P.rect(0, 0, 16, 16, '#2e2a3a'); P.rect(0, 0, 16, 1, '#3a3648'); P.rect(0, 0, 1, 16, '#3a3648'); P.speckle(1, 1, 15, 15, '#26222e', 12, r); if (r.chance(0.1)) P.px(r.int(2, 13), r.int(2, 13), '#8a40c0'); } };
  T.void = { color: '#08060c', solid: true, pri: 10, draw(P) { P.rect(0, 0, 16, 16, '#08060c'); } };
  T.swamp = { color: '#3e5a38', pri: 2, draw(P, r) { base(P, '#3e5a38', r, [['#4a6a40', 14], ['#34503a', 12], ['#5a7a4a', 4]]); if (r.chance(0.3)) P.rect(r.int(1, 10), r.int(2, 13), 4, 2, '#2e4a40'); } };
  T.bridge = { color: '#8a5a30', pri: 7, draw(P, r) { P.rect(0, 0, 16, 16, '#8a5a30'); for (let x = 0; x < 16; x += 4) { P.rect(x, 0, 1, 16, '#5a3a1a'); } P.rect(0, 0, 16, 1, '#6a4420'); P.rect(0, 15, 16, 1, '#6a4420'); P.px(r.int(0, 15), r.int(1, 14), '#a8784a'); } };
  T.ash = { color: '#4a4040', pri: 2, draw(P, r) { base(P, '#4a4040', r, [['#3e3434', 16], ['#5a4e4a', 10], ['#8a3a20', 2]]); } };
  T.obsidian = { color: '#1e1824', pri: 5, draw(P, r) { base(P, '#1e1824', r, [['#2a2232', 12]]); P.line(r.int(0, 15), 0, r.int(0, 15), 15, '#3a2a48'); if (r.chance(0.25)) { const x = r.int(1, 14); P.rect(x, r.int(1, 14), 1, 1, '#ff6020'); } } };

  // ---- world tiles (zones) --------------------------------------------------------
  // helper: brick rows. bh = brick height, bw = brick width
  function bricks(P, r, mortar, cols, bh, bw, tx, ty) {
    P.rect(0, 0, 16, 16, mortar);
    for (let y = 0, row = 0; y < 16; y += bh, row++) {
      const o = ((row + (ty || 0) * Math.ceil(16 / bh)) % 2) ? bw / 2 : 0;
      for (let x = -o; x < 16; x += bw) {
        const c = r.pick(cols);
        P.rect(x + 1, y + 1, bw - 1, bh - 1, c);
        P.rect(x + 1, y + 1, bw - 1, 1, U.shade(c, 0.14));
      }
    }
  }
  T.canopy = {
    color: '#1d3a21', solid: true, pri: 8, draw(P, r) {
      P.rect(0, 0, 16, 16, '#16301b');
      for (let i = 0; i < 5; i++) {
        const x = r.int(0, 15), y = r.int(0, 15), rad = r.int(3, 5), g = r.pick(['#244a28', '#2a5230', '#1f4224', '#2f5a2e']);
        P.circle(x, y, rad, g); P.circle(x - 1, y - 1, rad - 2, U.shade(g, 0.18));
      }
      P.speckle(0, 0, 16, 16, '#3a6a3a', 6, r); P.speckle(0, 0, 16, 16, '#10241a', 8, r);
    },
  };
  T.cliff = {
    color: '#6a5a4a', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#4e4238');
      for (let i = 0; i < 4; i++) { const x = r.int(-2, 12), y = r.int(0, 13), w = r.int(5, 9), c = r.pick(['#6a5a4a', '#74644f', '#5e5042']); P.rect(x, y, w, 4, c); P.rect(x, y, w, 1, U.shade(c, 0.22)); P.rect(x, y + 3, w, 1, U.shade(c, -0.25)); }
      if (r.chance(0.3)) P.rect(r.int(1, 12), r.int(1, 12), 3, 1, '#4a6a3a');
    },
  };
  T.farmland = { color: '#6a4a2c', pri: 2, draw(P, r) { P.rect(0, 0, 16, 16, '#6a4a2c'); for (let y = 1; y < 16; y += 4) { P.rect(0, y, 16, 1, '#4e3620'); P.rect(0, y + 1, 16, 1, '#7e5c38'); } P.speckle(0, 0, 16, 16, '#5a3e24', 10, r); } };
  T.gravel = { color: '#8a8680', pri: 2, draw(P, r) { base(P, '#86827a', r, [['#9a968e', 18], ['#6e6a64', 16], ['#aaa69e', 6]]); } };
  T.mud = { color: '#5a4a32', pri: 2, draw(P, r) { base(P, '#5a4a32', r, [['#4e4028', 18], ['#665638', 10]]); if (r.chance(0.35)) { const x = r.int(1, 10), y = r.int(2, 12); P.ellipse(x + 2, y, 3, 1, '#3e3a26'); P.px(x + 1, y, '#8a8a6a'); } } };
  T.bog = {
    color: '#2e3f2a', solid: true, water: true, pri: 0, draw(P, r) {
      base(P, '#2e3f2a', r, [['#34482e', 14], ['#263626', 12]]);
      if (r.chance(0.4)) { const x = r.int(2, 12), y = r.int(2, 12); P.ellipse(x, y, 3, 1, '#4a6a34'); P.px(x - 1, y, '#6a8a44'); }
      if (r.chance(0.3)) { P.px(r.int(1, 14), r.int(1, 14), '#8aa070'); }
    },
  };
  T.murk = { color: '#4a5a3a', water: true, pri: 1, draw(P, r) { base(P, '#465838', r, [['#52643e', 14], ['#3c4c32', 10]]); if (r.chance(0.3)) P.rect(r.int(1, 10), r.int(2, 13), 4, 1, '#6a7c4c'); } };
  T.planks = { color: '#7a5a34', pri: 7, draw(P, r) { P.rect(0, 0, 16, 16, '#7a5a34'); for (let y = 0; y < 16; y += 4) { P.rect(0, y + 3, 16, 1, '#4a3418'); P.rect(0, y, 16, 1, '#8e6a40'); P.px(r.int(0, 15), y + 1, '#5a3e20'); } P.px(2, 1, '#3a2a18'); P.px(13, 9, '#3a2a18'); } };
  T.web = {
    color: '#4a4448', pri: 3, draw(P, r) {
      base(P, '#443e44', r, [['#3a343a', 18], ['#524a52', 10]]);
      if (r.chance(0.55)) { const c = 'rgba(220,220,230,0.55)'; const x = r.int(0, 15), y = r.int(0, 15); P.line(x, y, r.int(0, 15), r.chance(0.5) ? 0 : 15, c); P.line(x, y, r.chance(0.5) ? 0 : 15, r.int(0, 15), c); P.line(x, y, r.int(0, 15), r.int(0, 15), c); }
    },
  };
  T.cryptfloor = {
    color: '#4a4a54', pri: 4, draw(P, r, x, y) {
      P.rect(0, 0, 16, 16, '#2e2e36');
      const o = (y % 2) * 8;
      for (const [sx, sy, w, h] of [[-o, 0, 16, 8], [16 - o, 0, 16, 8], [0, 8, 8, 8], [8, 8, 8, 8]]) { const c = r.pick(['#4a4a54', '#50505a', '#46464e']); P.rect(sx + 1, sy + 1, w - 1, h - 1, c); P.rect(sx + 1, sy + 1, w - 1, 1, U.shade(c, 0.15)); }
      if (r.chance(0.2)) P.line(r.int(1, 7), r.int(1, 14), r.int(8, 14), r.int(1, 14), '#34343c');
      if (r.chance(0.12)) P.speckle(0, 0, 16, 16, '#3e5a3a', 5, r);
    },
  };
  T.cryptwall = { color: '#2a2a34', solid: true, wall: true, pri: 9, draw(P, r, x, y) { bricks(P, r, '#18181e', ['#2e2e38', '#34343e', '#2a2a32'], 4, 8, x, y); if (r.chance(0.08)) { P.rect(6, 5, 4, 5, '#101014'); P.px(7, 7, '#e0d8c8'); P.px(8, 7, '#e0d8c8'); } } };
  T.sandstone = {
    color: '#c8a870', pri: 4, draw(P, r) {
      P.rect(0, 0, 16, 16, '#9a7c4c');
      for (const [sx, sy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { const c = r.pick(['#c8a870', '#c09e66', '#d0b07a']); P.rect(sx + 1, sy + 1, 7, 7, c); P.rect(sx + 1, sy + 1, 7, 1, U.shade(c, 0.12)); }
      P.speckle(0, 0, 16, 16, '#dcc58a', 6, r);
    },
  };
  T.sandwall = {
    color: '#a07a48', solid: true, wall: true, pri: 9, draw(P, r, x, y) {
      bricks(P, r, '#6a4e2c', ['#a8804c', '#b08a54', '#9a7444'], 5, 8, x, y);
      if (r.chance(0.18)) { const c = '#5a3e20'; const k = r.int(0, 3); P.rect(5, 5, 6, 1, c); if (k === 0) { P.circle(8, 9, 2, c); P.px(8, 9, '#b08a54'); } else if (k === 1) { P.rect(7, 7, 2, 5, c); P.rect(5, 9, 6, 1, c); } else if (k === 2) { P.line(5, 12, 8, 7, c); P.line(8, 7, 11, 12, c); } else { P.rect(6, 7, 1, 5, c); P.rect(9, 7, 1, 5, c); P.px(7, 8, c); P.px(8, 9, c); } }
    },
  };
  T.sandcliff = {
    color: '#b0804a', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#9a6c3c');
      for (let y = 0; y < 16; y += 4) { const c = r.pick(['#b8864e', '#a8783e', '#c09058']); P.rect(0, y, 16, 3, c); P.rect(0, y, 16, 1, U.shade(c, 0.18)); P.rect(r.int(0, 12), y + 2, r.int(2, 5), 1, U.shade(c, -0.25)); }
    },
  };
  T.dune = { color: '#d4b06a', pri: 1, draw(P, r) { base(P, '#d4b06a', r, [['#c8a45e', 16], ['#e0bc78', 10]]); for (let i = 0; i < 2; i++) { const y = r.int(2, 13), x = r.int(0, 8); P.rect(x, y, 6, 1, '#b8945a'); P.rect(x + 1, y - 1, 4, 1, '#e8c888'); } } };
  T.tombfloor = {
    color: '#6a5234', pri: 4, draw(P, r, x, y) {
      P.rect(0, 0, 16, 16, '#3e3020');
      P.rect(1, 1, 15, 15, r.pick(['#6a5234', '#705838', '#644c30']));
      P.rect(1, 1, 15, 1, '#806644');
      if ((x + y) % 4 === 0) { P.rect(6, 6, 4, 4, '#b08a3a'); P.rect(7, 7, 2, 2, '#e0c060'); }
      P.speckle(1, 1, 15, 15, '#5a4428', 8, r);
    },
  };
  T.snowpath = { color: '#c8d2e0', pri: 2, draw(P, r) { base(P, '#c8d2e0', r, [['#b8c4d4', 18], ['#dce4ee', 10]]); if (r.chance(0.35)) { const x = r.int(3, 10), y = r.int(2, 10); P.rect(x, y, 2, 3, '#a8b4c6'); P.rect(x + 3, y + 4, 2, 3, '#a8b4c6'); } } };
  T.snowcliff = {
    color: '#6a7080', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#4e5462');
      for (let i = 0; i < 4; i++) { const x = r.int(-2, 12), y = r.int(3, 13), w = r.int(5, 9), c = r.pick(['#6a7080', '#727a8a', '#5e6474']); P.rect(x, y, w, 4, c); P.rect(x, y, w, 1, U.shade(c, 0.25)); }
      P.rect(0, 0, 16, 3, '#e8eef6'); for (let i = 0; i < 16; i += 2) P.rect(i, 3, 1, r.int(0, 3), '#e8eef6');
    },
  };
  T.icewall = {
    color: '#5a8ab8', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#3a6a98');
      for (let i = 0; i < 4; i++) { const x = r.int(0, 12), y = r.int(0, 12), c = r.pick(['#5a8ab8', '#6a9ac8', '#4e7eac']); P.rect(x, y, r.int(3, 6), r.int(3, 6), c); P.px(x, y, '#c8ecff'); }
      P.line(r.int(0, 15), 0, r.int(0, 15), 15, '#a8d8f8');
    },
  };
  T.frozenlake = {
    color: '#9fd0ec', pri: 1, draw(P, r) {
      base(P, '#9fd0ec', r, [['#b0dcf4', 10], ['#90c4e4', 8]]);
      if (r.chance(0.5)) P.line(r.int(0, 15), r.int(0, 15), r.int(0, 15), r.int(0, 15), '#e4f6ff');
      if (r.chance(0.25)) { const x = r.int(2, 12), y = r.int(2, 12); P.line(x, y, x + 3, y + 2, '#6aa0c8'); P.line(x + 3, y + 2, x + 2, y + 5, '#6aa0c8'); }
    },
  };
  T.icefloor = { color: '#7aa8c8', pri: 2, draw(P, r) { base(P, '#7aa8c8', r, [['#88b4d2', 14], ['#6a98ba', 12]]); if (r.chance(0.3)) P.line(r.int(0, 8), r.int(0, 15), r.int(8, 15), r.int(0, 15), '#b8e0f8'); } };
  T.volcrock = { color: '#3a3034', pri: 2, draw(P, r) { base(P, '#3a3034', r, [['#443a3e', 16], ['#2e2628', 14]]); if (r.chance(0.12)) P.px(r.int(1, 14), r.int(1, 14), '#c04818'); } };
  T.volcwall = {
    color: '#241c20', solid: true, wall: true, pri: 9, draw(P, r) {
      P.rect(0, 0, 16, 16, '#1e171a');
      for (let i = 0; i < 4; i++) { const x = r.int(-2, 12), y = r.int(0, 13), w = r.int(5, 9), c = r.pick(['#2e2428', '#342a2e', '#281f22']); P.rect(x, y, w, 4, c); P.rect(x, y, w, 1, U.shade(c, 0.25)); }
      if (r.chance(0.25)) { const x = r.int(2, 12), y = r.int(2, 12); P.line(x, y, x + 3, y + 2, '#b03810'); P.px(x + 1, y, '#ff7020'); }
    },
  };
  T.lavacrack = {
    color: '#3a2a2a', pri: 3, draw(P, r) {
      base(P, '#342a2c', r, [['#3e3234', 14], ['#2a2224', 12]]);
      let x = r.int(0, 15), y = r.int(0, 15);
      for (let i = 0; i < 6; i++) { const nx = U.clamp(x + r.int(-4, 4), 0, 15), ny = U.clamp(y + r.int(-4, 4), 0, 15); P.line(x, y, nx, ny, '#c04010'); x = nx; y = ny; }
      P.px(x, y, '#ffb040'); P.speckle(0, 0, 16, 16, '#ff7020', 2, r);
    },
  };
  T.citfloor = {
    color: '#2a2436', pri: 4, draw(P, r, x, y) {
      P.rect(0, 0, 16, 16, '#16121e');
      const c = (x + y) % 2 ? '#2a2436' : '#241f30';
      P.rect(1, 1, 15, 15, c); P.rect(1, 1, 15, 1, U.shade(c, 0.2)); P.rect(1, 1, 1, 15, U.shade(c, 0.1));
      if (r.chance(0.25)) { P.line(r.int(2, 8), r.int(2, 14), r.int(8, 14), r.int(2, 14), '#4a2a6a'); }
      if (r.chance(0.06)) P.px(r.int(3, 12), r.int(3, 12), '#b060ff');
    },
  };
  T.citwall = {
    color: '#1a1622', solid: true, wall: true, pri: 9, draw(P, r, x, y) {
      bricks(P, r, '#0c0a10', ['#1e1a28', '#231e2e', '#1a1622'], 8, 8, x, y);
      if (r.chance(0.1)) { P.rect(6, 4, 4, 1, '#9040e0'); P.rect(7, 5, 2, 4, '#9040e0'); P.px(7, 6, '#e0b0ff'); }
    },
  };
  T.royalcarpet = {
    color: '#5a1a3a', pri: 6, draw(P, r, x, y) {
      P.rect(0, 0, 16, 16, '#5a1a3a');
      P.speckle(0, 0, 16, 16, '#4a1430', 10, r);
      const d = '#b08a3a';
      P.line(8, 2, 14, 8, d); P.line(14, 8, 8, 14, d); P.line(8, 14, 2, 8, d); P.line(2, 8, 8, 2, d);
      P.rect(7, 7, 2, 2, '#e0c060');
    },
  };
  T.stonebridge = { color: '#5a5460', pri: 7, draw(P, r) { P.rect(0, 0, 16, 16, '#5a5460'); for (let y = 0; y < 16; y += 4) P.rect(0, y, 16, 1, '#46404c'); P.speckle(0, 0, 16, 16, '#6a6470', 10, r); P.rect(0, 0, 2, 16, '#3a3440'); P.rect(14, 0, 2, 16, '#3a3440'); } };
  T.tilefloor = { color: '#b8a888', pri: 5, draw(P, r, x, y) { const c = (x + y) % 2 ? '#b8a888' : '#a89878'; P.rect(0, 0, 16, 16, c); P.rect(0, 0, 16, 1, U.shade(c, 0.15)); P.rect(0, 15, 16, 1, U.shade(c, -0.2)); P.speckle(0, 0, 16, 16, U.shade(c, -0.1), 6, r); } };

  // Pre-render a whole tile layer to one big canvas, with dithered edges between tiles.
  T.render = function (map) {
    const S = G.TILE;
    const cv = G.canvas(map.w * S, map.h * S);
    const ctx = cv.getContext('2d');
    const P = G.painter(ctx);
    const rng = U.rng('tiles:' + map.id);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const id = map.tiles[y * map.w + x];
      const t = T[id] || T.grass;
      ctx.save(); ctx.translate(x * S, y * S);
      t.draw(P, rng, x, y);
      ctx.restore();
    }
    // edges: higher-priority neighbour bleeds jagged pixels into lower tiles
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const id = map.tiles[y * map.w + x], t = T[id] || T.grass;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
        const nid = map.tiles[ny * map.w + nx];
        if (nid === id) continue;
        const n = T[nid] || T.grass;
        if ((n.pri || 0) <= (t.pri || 0) || n.wall) continue;
        const c = n.color;
        ctx.fillStyle = c;
        for (let i = 0; i < 16; i++) {
          const depth = rng.int(0, 2) + (i % 3 === 0 ? 1 : 0);
          for (let d = 0; d < depth; d++) {
            const px = dx === 1 ? 15 - d : dx === -1 ? d : i;
            const py = dy === 1 ? 15 - d : dy === -1 ? d : i;
            ctx.fillRect(x * S + px, y * S + py, 1, 1);
          }
        }
      }
      // wall tiles get a lit top face and a dark base when the tile below is floor
      if (t.wall && y + 1 < map.h) {
        const below = T[map.tiles[(y + 1) * map.w + x]];
        if (below && !below.wall) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x * S, y * S + 12, 16, 4); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x * S, (y + 1) * S, 16, 3); }
      }
      if (t.water && !t.solid === false) { /* noop */ }
      if ((t.water || t.liquid) && y > 0) {
        const above = T[map.tiles[(y - 1) * map.w + x]];
        if (above && !above.water && !above.liquid) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x * S, y * S, 16, 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x * S, y * S + 3, 16, 1); }
      }
    }
    return cv;
  };

  // ---- props -----------------------------------------------------------------
  function trunk(P, x, y, h, c) { P.rect(x, y, 4, h, c || '#6a4424'); P.rect(x, y, 1, h, U.shade(c || '#6a4424', 0.2)); P.rect(x + 3, y, 1, h, U.shade(c || '#6a4424', -0.3)); }
  function blob(P, cx, cy, r, c, rng) {
    P.circle(cx, cy, r, c);
    const l = U.shade(c, 0.18), d = U.shade(c, -0.22);
    P.circle(cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.round(r * 0.55), l);
    for (let i = 0; i < r * 2; i++) { const a = rng() * U.TAU, rr = r * (0.5 + rng() * 0.45); P.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rng() < 0.5 ? d : U.shade(l, 0.15)); }
  }
  PR.tree = {
    w: 32, h: 44, ax: 16, ay: 41, box: [-4, -4, 8, 5], variants: 4,
    draw(P, r) {
      trunk(P, 14, 26, 15);
      const g = r.pick(['#3f7a33', '#4a8a3a', '#3a7040', '#56913c']);
      blob(P, 16, 22, 10, U.shade(g, -0.15), r);
      blob(P, 11, 16, 8, g, r); blob(P, 21, 15, 8, g, r); blob(P, 16, 9, 8, U.shade(g, 0.08), r);
      if (r.chance(0.3)) for (let i = 0; i < 4; i++) P.px(r.int(8, 24), r.int(6, 24), '#e04040');
    },
  };
  PR.pine = {
    w: 28, h: 46, ax: 14, ay: 43, box: [-3, -4, 6, 5], variants: 3,
    draw(P, r, ctx, snow) {
      trunk(P, 12, 34, 9, '#5a3a20');
      const g = r.pick(['#2a5a3a', '#2f6440', '#285236']);
      for (let i = 0; i < 4; i++) {
        const y = 6 + i * 7, w = 5 + i * 3;
        for (let j = 0; j < 9; j++) P.rect(14 - Math.floor(w * j / 9), y + j, Math.floor(w * j / 9) * 2 + 1, 1, j < 3 ? U.shade(g, 0.15) : g);
        P.rect(14 - w + 1, y + 8, w, 1, U.shade(g, -0.3));
        if (snow) P.rect(14 - Math.floor(w * 3 / 9), y + 2, Math.floor(w * 3 / 9) * 2 + 1, 2, '#f4f8ff');
      }
      if (snow) P.rect(13, 5, 3, 3, '#ffffff');
    },
  };
  PR.snowpine = { w: 28, h: 46, ax: 14, ay: 43, box: [-3, -4, 6, 5], variants: 3, draw(P, r, ctx) { PR.pine.draw(P, r, ctx, true); } };
  PR.deadtree = {
    w: 28, h: 40, ax: 14, ay: 37, box: [-3, -4, 6, 5], variants: 3,
    draw(P, r) {
      const c = '#5a4a40';
      trunk(P, 12, 16, 21, c);
      P.line(13, 18, 5, 8, c); P.line(14, 18, 6, 8, c); P.line(15, 14, 22, 5, c); P.line(15, 15, 23, 6, c);
      P.line(8, 11, 4, 12, c); P.line(19, 9, 22, 12, c); P.line(14, 16, 14, 4, c); P.line(15, 16, 15, 4, U.shade(c, -0.2));
    },
  };
  PR.palm = {
    w: 36, h: 48, ax: 18, ay: 45, box: [-3, -4, 6, 5], variants: 2,
    draw(P, r) {
      for (let i = 0; i < 28; i++) P.rect(16 + Math.round(Math.sin(i / 9) * 3), 17 + i, 4, 1, i % 4 ? '#9a7040' : '#7a5028');
      const g = '#3a8a3a';
      for (const [dx, dy] of [[-14, 6], [14, 6], [-10, -6], [10, -6], [0, -9]]) { P.line(18, 16, 18 + dx, 16 + dy, g); P.line(18, 17, 18 + dx, 17 + dy, U.shade(g, -0.2)); P.line(18 + dx * 0.5, 15 + dy * 0.5, 18 + dx, 18 + dy + 2, g); }
      P.circle(17, 18, 2, '#6a4020'); P.px(20, 19, '#6a4020');
    },
  };
  PR.bush = {
    w: 20, h: 16, ax: 10, ay: 14, box: [-6, -4, 12, 4], variants: 3,
    draw(P, r) { const g = r.pick(['#3f7a33', '#4a8a3a', '#56913c']); blob(P, 7, 9, 5, g, r); blob(P, 13, 9, 5, g, r); blob(P, 10, 6, 5, U.shade(g, 0.08), r); if (r.chance(0.4)) for (let i = 0; i < 3; i++) P.px(r.int(4, 16), r.int(4, 12), r.pick(['#e04060', '#4060e0', '#f0f0f0'])); },
  };
  PR.rock = {
    w: 20, h: 16, ax: 10, ay: 14, box: [-7, -5, 14, 5], variants: 3,
    draw(P, r) { const c = r.pick(['#8a8a90', '#7a7a82', '#90887a']); P.ellipse(10, 9, 8, 5, U.shade(c, -0.3)); P.ellipse(10, 8, 7, 5, c); P.ellipse(8, 6, 4, 2, U.shade(c, 0.25)); P.px(13, 10, U.shade(c, -0.2)); },
  };
  PR.boulder = {
    w: 32, h: 28, ax: 16, ay: 25, box: [-12, -8, 24, 8], variants: 2,
    draw(P, r) { const c = r.pick(['#7a7a82', '#827a72']); P.ellipse(16, 16, 14, 10, U.shade(c, -0.3)); P.ellipse(16, 14, 13, 10, c); P.ellipse(12, 10, 6, 4, U.shade(c, 0.22)); P.line(18, 8, 22, 18, U.shade(c, -0.25)); if (r.chance(0.5)) { P.rect(6, 18, 5, 2, '#4a7a3a'); } },
  };
  PR.crystal = {
    w: 20, h: 28, ax: 10, ay: 25, box: [-5, -4, 10, 4], variants: 3, light: { r: 40, color: '#6fd8ff', flicker: 0.1 },
    draw(P, r) {
      const c = r.pick(['#6fd8ff', '#b070ff', '#70ffb0']);
      const shards = [[10, 4, 4, 22], [5, 12, 3, 13], [15, 10, 3, 15]];
      for (const [x, y, w, h] of shards) { P.rect(x - 1, y, w, h, c); P.rect(x - 1, y, 1, h, U.shade(c, 0.5)); P.rect(x + w - 2, y + 2, 1, h - 2, U.shade(c, -0.3)); P.px(x, y - 1, U.shade(c, 0.3)); }
      P.rect(3, 24, 14, 2, '#3a3440');
    },
  };
  PR.stalagmite = { w: 14, h: 22, ax: 7, ay: 20, box: [-4, -3, 8, 3], variants: 2, draw(P, r) { const c = '#5a5058'; for (let y = 0; y < 18; y++) { const w = Math.round(1 + y / 3); P.rect(7 - w, 2 + y, w * 2, 1, y % 5 ? c : U.shade(c, 0.15)); } P.rect(6, 2, 1, 16, U.shade(c, 0.25)); } };
  PR.cactus = { w: 18, h: 26, ax: 9, ay: 24, box: [-3, -3, 6, 3], variants: 2, draw(P, r) { const g = '#4a9a4a'; P.rect(7, 4, 5, 20, g); P.rect(7, 4, 1, 20, U.shade(g, 0.25)); P.rect(2, 10, 3, 7, g); P.rect(2, 15, 5, 2, g); P.rect(14, 8, 3, 6, g); P.rect(12, 12, 5, 2, g); for (let i = 0; i < 6; i++) P.px(r.int(7, 11), r.int(5, 22), '#e8e0a0'); if (r.chance(0.4)) P.rect(8, 2, 3, 2, '#ff70a0'); } };
  PR.bones = { w: 16, h: 10, ax: 8, ay: 8, box: null, variants: 2, draw(P, r) { P.rect(2, 5, 10, 2, '#e8e0d0'); P.rect(1, 4, 2, 4, '#e8e0d0'); P.rect(11, 4, 2, 4, '#e8e0d0'); if (r.chance(0.6)) { P.circle(12, 3, 2, '#e8e0d0'); P.px(11, 3, '#302830'); P.px(13, 3, '#302830'); } } };
  PR.grave = { w: 14, h: 18, ax: 7, ay: 16, box: [-5, -3, 10, 3], variants: 2, draw(P, r) { const c = '#8a8a92'; P.rect(2, 4, 10, 12, c); P.rect(3, 2, 8, 2, c); P.rect(2, 4, 1, 12, U.shade(c, 0.2)); P.rect(6, 6, 2, 6, U.shade(c, -0.3)); P.rect(4, 8, 6, 2, U.shade(c, -0.3)); P.rect(1, 15, 12, 2, '#4a6a3a'); } };
  PR.fence = { w: 16, h: 14, ax: 8, ay: 12, box: [-8, -3, 16, 3], draw(P) { const c = '#8a6038'; P.rect(1, 2, 3, 11, c); P.rect(12, 2, 3, 11, c); P.rect(0, 4, 16, 2, U.shade(c, 0.1)); P.rect(0, 9, 16, 2, U.shade(c, 0.1)); P.rect(1, 2, 3, 1, U.shade(c, 0.3)); P.rect(12, 2, 3, 1, U.shade(c, 0.3)); } };
  PR.lamp = {
    w: 12, h: 30, ax: 6, ay: 28, box: [-2, -2, 4, 2], light: { r: 70, color: '#ffc870', flicker: 0.08 },
    draw(P) { P.rect(5, 8, 2, 20, '#3a3a44'); P.rect(3, 26, 6, 2, '#3a3a44'); P.rect(2, 3, 8, 6, '#3a3a44'); P.rect(3, 4, 6, 4, '#ffd080'); P.rect(4, 5, 2, 2, '#ffffff'); P.rect(1, 2, 10, 1, '#2a2a34'); },
  };
  PR.torch = {
    w: 10, h: 20, ax: 5, ay: 18, box: [-2, -2, 4, 2], light: { r: 60, color: '#ff9a40', flicker: 0.2 }, anim: 3,
    draw(P, r, ctx, f) { P.rect(4, 8, 2, 10, '#5a3a20'); P.rect(3, 7, 4, 2, '#3a3a3a'); const h = [4, 5, 3][f || 0]; P.rect(3, 7 - h, 4, h, '#ff7020'); P.rect(4, 8 - h, 2, h - 1, '#ffd040'); P.px(4 + ((f || 0) % 2), 6 - h, '#ff9a40'); },
  };
  PR.brazier = {
    w: 16, h: 20, ax: 8, ay: 18, box: [-5, -3, 10, 3], light: { r: 80, color: '#ff8a30', flicker: 0.2 }, anim: 3,
    draw(P, r, ctx, f) { P.rect(3, 9, 10, 4, '#4a4a52'); P.rect(2, 8, 12, 1, '#6a6a72'); P.rect(5, 13, 6, 3, '#3a3a42'); P.rect(3, 16, 10, 2, '#3a3a42'); const h = [5, 7, 6][f || 0]; P.rect(4, 8 - h, 8, h, '#ff6020'); P.rect(6, 9 - h, 4, h - 1, '#ffc040'); P.px(7, 7 - h, '#ffe080'); },
  };
  PR.barrel = { w: 14, h: 16, ax: 7, ay: 14, box: [-5, -4, 10, 4], draw(P) { const c = '#8a5a30'; P.rect(2, 2, 10, 13, c); P.rect(1, 4, 12, 9, c); P.rect(2, 4, 10, 1, '#4a4a4a'); P.rect(2, 11, 10, 1, '#4a4a4a'); P.rect(3, 2, 1, 13, U.shade(c, 0.2)); P.rect(10, 2, 1, 13, U.shade(c, -0.25)); P.rect(3, 1, 8, 1, U.shade(c, 0.3)); } };
  PR.crate = { w: 16, h: 16, ax: 8, ay: 14, box: [-7, -5, 14, 5], draw(P) { const c = '#a0763e'; P.rect(1, 2, 14, 13, c); P.rect(1, 2, 14, 2, U.shade(c, 0.25)); P.rect(1, 2, 2, 13, U.shade(c, -0.2)); P.rect(13, 2, 2, 13, U.shade(c, -0.2)); P.rect(1, 13, 14, 2, U.shade(c, -0.2)); P.line(3, 4, 12, 12, U.shade(c, -0.25)); } };
  PR.sign = { w: 16, h: 18, ax: 8, ay: 16, box: [-2, -2, 4, 2], draw(P) { P.rect(7, 8, 2, 9, '#6a4424'); P.rect(1, 2, 14, 8, '#a0763e'); P.rect(1, 2, 14, 1, '#c0965e'); P.rect(3, 4, 10, 1, '#5a3a1a'); P.rect(3, 6, 8, 1, '#5a3a1a'); } };
  PR.well = { w: 28, h: 30, ax: 14, ay: 27, box: [-11, -8, 22, 8], draw(P) { P.ellipse(14, 20, 11, 6, '#7a7a82'); P.ellipse(14, 19, 8, 4, '#1a2a4a'); P.rect(3, 6, 2, 16, '#6a4424'); P.rect(23, 6, 2, 16, '#6a4424'); P.rect(1, 3, 26, 4, '#8a3a2a'); P.rect(1, 3, 26, 1, '#aa5a3a'); P.rect(13, 7, 2, 8, '#8a8a8a'); P.rect(12, 14, 4, 3, '#6a4424'); } };
  PR.anvil = { w: 20, h: 14, ax: 10, ay: 12, box: [-7, -4, 14, 4], draw(P) { const c = '#4a4a55'; P.rect(3, 2, 14, 4, c); P.rect(1, 2, 4, 2, c); P.rect(7, 6, 6, 4, c); P.rect(4, 10, 12, 3, c); P.rect(3, 2, 14, 1, '#7a7a88'); } };
  PR.stall = {
    w: 48, h: 40, ax: 24, ay: 37, box: [-22, -12, 44, 12], variants: 3,
    draw(P, r) {
      const c = r.pick(['#c03a3a', '#3a6ac0', '#3a9a4a', '#c09a2a']);
      P.rect(4, 8, 2, 29, '#6a4424'); P.rect(42, 8, 2, 29, '#6a4424');
      for (let i = 0; i < 44; i += 6) { P.rect(2 + i, 4, 6, 8, (i / 6) % 2 ? c : '#f0e8d8'); P.rect(2 + i, 12, 6, 2, U.shade((i / 6) % 2 ? c : '#f0e8d8', -0.2)); }
      P.rect(2, 24, 44, 12, '#8a5a30'); P.rect(2, 24, 44, 2, '#a8784a');
      for (let i = 0; i < 6; i++) P.circle(8 + i * 6, 22, 2, r.pick(['#e04040', '#f0c040', '#60c040', '#e08040', '#a060e0']));
    },
  };
  PR.tent = { w: 40, h: 32, ax: 20, ay: 29, box: [-17, -10, 34, 10], variants: 2, draw(P, r) { const c = r.pick(['#b89a6a', '#8a6a9a', '#6a8aa0']); for (let y = 0; y < 26; y++) { const w = Math.round(2 + y * 0.72); P.rect(20 - w, 3 + y, w * 2, 1, y < 4 ? U.shade(c, 0.2) : c); } P.rect(17, 14, 6, 15, '#2a1a14'); P.rect(20, 3, 1, 26, U.shade(c, -0.2)); P.px(20, 1, '#8a6a4a'); P.px(20, 2, '#8a6a4a'); } };
  PR.pillar = { w: 16, h: 40, ax: 8, ay: 37, box: [-6, -5, 12, 5], variants: 2, draw(P, r) { const c = r.pick(['#a8a8b0', '#6a6480']); P.rect(2, 34, 12, 4, U.shade(c, -0.2)); P.rect(3, 6, 10, 28, c); P.rect(3, 6, 2, 28, U.shade(c, 0.25)); P.rect(11, 6, 2, 28, U.shade(c, -0.25)); P.rect(1, 2, 14, 4, U.shade(c, 0.1)); if (r.chance(0.5)) { P.rect(6, 12, 1, 10, U.shade(c, -0.35)); P.rect(7, 18, 3, 1, U.shade(c, -0.35)); } } };
  PR.statue = { w: 24, h: 44, ax: 12, ay: 41, box: [-9, -6, 18, 6], draw(P) { const c = '#9a9aa6'; P.rect(3, 32, 18, 10, U.shade(c, -0.25)); P.rect(3, 32, 18, 2, c); P.rect(8, 12, 8, 20, c); P.circle(12, 8, 4, c); P.rect(16, 6, 2, 22, U.shade(c, 0.2)); P.rect(14, 8, 6, 2, U.shade(c, 0.1)); P.rect(8, 12, 2, 20, U.shade(c, 0.2)); P.rect(4, 14, 4, 2, c); } };
  PR.portal = {
    w: 32, h: 44, ax: 16, ay: 41, box: null, light: { r: 90, color: '#b070ff', flicker: 0.15 }, anim: 4,
    draw(P, r, ctx, f) {
      P.rect(3, 6, 5, 35, '#5a5a6a'); P.rect(24, 6, 5, 35, '#5a5a6a'); P.rect(1, 2, 30, 6, '#6a6a7a'); P.rect(1, 2, 30, 1, '#8a8a9a');
      const cols = ['#6a30c0', '#8a50e0', '#b070ff', '#d0a0ff'];
      for (let i = 0; i < 4; i++) P.rect(8 + i, 8 + i, 16 - i * 2, 33 - i, cols[(i + (f || 0)) % 4]);
      P.px(16, 20 + ((f || 0) * 3) % 12, '#ffffff');
    },
  };
  PR.flowers = { w: 16, h: 10, ax: 8, ay: 8, box: null, variants: 4, draw(P, r) { for (let i = 0; i < 5; i++) { const x = r.int(2, 13), y = r.int(2, 7), c = r.pick(['#f0e060', '#e87080', '#ffffff', '#80b0ff', '#ff9a40']); P.px(x, y + 1, '#3a6a28'); P.px(x, y + 2, '#3a6a28'); P.px(x, y, c); P.px(x - 1, y, c); P.px(x + 1, y, c); P.px(x, y - 1, c); } } };
  PR.mushroom = { w: 12, h: 12, ax: 6, ay: 10, box: null, variants: 2, light: { r: 22, color: '#70ffb0', flicker: 0.05 }, draw(P, r) { const c = r.pick(['#e04040', '#a060e0', '#40c0a0']); P.rect(5, 5, 2, 5, '#e8e0d0'); P.ellipse(6, 4, 4, 2, c); P.px(4, 3, '#ffffff'); P.px(7, 4, '#ffffff'); } };
  PR.lily = { w: 12, h: 8, ax: 6, ay: 6, box: null, draw(P) { P.ellipse(6, 4, 5, 2, '#3a8a4a'); P.px(6, 4, '#2a6a3a'); P.px(5, 3, '#f0a0c0'); P.px(6, 2, '#ffffff'); } };
  PR.icecrystal = { w: 20, h: 26, ax: 10, ay: 23, box: [-5, -4, 10, 4], variants: 2, light: { r: 30, color: '#a0e0ff', flicker: 0.05 }, draw(P, r) { const c = '#b8e8ff'; P.rect(8, 4, 5, 19, c); P.rect(8, 4, 1, 19, '#ffffff'); P.rect(3, 12, 4, 11, c); P.rect(14, 9, 4, 14, U.shade(c, -0.15)); P.px(10, 3, '#ffffff'); } };
  PR.lavarock = { w: 20, h: 16, ax: 10, ay: 14, box: [-7, -5, 14, 5], variants: 2, light: { r: 26, color: '#ff6020', flicker: 0.2 }, draw(P, r) { P.ellipse(10, 9, 8, 5, '#2a2028'); P.ellipse(10, 8, 7, 5, '#3a2e34'); P.line(5, 7, 12, 11, '#ff6020'); P.line(9, 5, 14, 8, '#ffa040'); } };
  PR.skullpile = { w: 20, h: 14, ax: 10, ay: 12, box: [-7, -4, 14, 4], draw(P) { for (const [x, y] of [[5, 9], [10, 9], [15, 9], [7, 5], [13, 5], [10, 2]]) { P.circle(x, y, 2, '#e0d8c8'); P.px(x - 1, y, '#302830'); P.px(x + 1, y, '#302830'); } } };
  PR.banner = { w: 12, h: 30, ax: 6, ay: 28, box: [-2, -2, 4, 2], variants: 3, draw(P, r) { const c = r.pick(['#a02a2a', '#2a4aa0', '#6a2a8a']); P.rect(5, 2, 2, 26, '#5a4a3a'); P.rect(1, 3, 10, 1, '#c0a040'); P.rect(2, 4, 8, 14, c); P.rect(2, 18, 3, 2, c); P.rect(7, 18, 3, 2, c); P.rect(5, 8, 2, 5, '#e0c050'); } };
  PR.bed = { w: 18, h: 28, ax: 9, ay: 26, box: [-8, -24, 16, 24], draw(P) { P.rect(1, 2, 16, 24, '#6a4424'); P.rect(2, 3, 14, 6, '#f0f0f0'); P.rect(2, 9, 14, 16, '#3a6ac0'); P.rect(2, 9, 14, 2, '#5a8ae0'); } };
  PR.table = { w: 28, h: 20, ax: 14, ay: 17, box: [-13, -10, 26, 10], draw(P) { P.rect(1, 3, 26, 8, '#8a5a30'); P.rect(1, 3, 26, 2, '#a8784a'); P.rect(2, 11, 3, 7, '#6a4424'); P.rect(23, 11, 3, 7, '#6a4424'); P.rect(10, 1, 4, 3, '#e8e0d0'); P.px(18, 2, '#c03030'); } };
  PR.bookshelf = { w: 24, h: 32, ax: 12, ay: 30, box: [-12, -8, 24, 8], draw(P, r) { P.rect(0, 0, 24, 31, '#5a3a1e'); for (let s = 0; s < 3; s++) { P.rect(2, 3 + s * 9, 20, 7, '#2a1a10'); for (let i = 0; i < 9; i++) P.rect(2 + i * 2 + (i > 4 ? 1 : 0), 4 + s * 9 + (i % 3 === 0 ? 1 : 0), 2, 6 - (i % 3 === 0 ? 1 : 0), r.pick(['#a02a2a', '#2a5aa0', '#2a8a4a', '#a08a2a', '#6a2a8a'])); } } };

  // Buildings: box covers the house body; doors are handled by map exits.
  function house(P, r, o) {
    const W = o.w, wall = o.wall, roof = o.roof;
    const roofH = o.roofH;
    // walls
    P.rect(4, roofH, W - 8, o.h - roofH - 2, wall);
    P.rect(4, roofH, W - 8, 2, U.shade(wall, -0.25));
    for (let y = roofH + 5; y < o.h - 4; y += 5) P.rect(4, y, W - 8, 1, U.shade(wall, -0.12));
    P.rect(4, roofH, 2, o.h - roofH - 2, U.shade(wall, 0.15));
    // timber frame
    if (o.timber) { P.rect(4, roofH, 2, o.h - roofH - 2, '#5a3a20'); P.rect(W - 6, roofH, 2, o.h - roofH - 2, '#5a3a20'); P.rect(4, roofH + 10, W - 8, 2, '#5a3a20'); }
    // roof
    for (let y = 0; y < roofH; y++) {
      const inset = Math.max(0, Math.round((roofH - y) * 0.35) - 2);
      P.rect(inset, y, W - inset * 2, 1, y % 3 === 0 ? U.shade(roof, -0.2) : roof);
    }
    for (let x = 0; x < W; x += 6) P.rect(x, 2, 1, roofH - 2, U.shade(roof, -0.1));
    P.rect(0, roofH - 1, W, 2, U.shade(roof, -0.35));
    // chimney
    if (o.chimney) { P.rect(W - 14, 0, 5, 8, '#7a6a64'); P.rect(W - 15, 0, 7, 2, '#5a4a44'); }
    // door
    const dx = Math.floor(W / 2) - 5;
    P.rect(dx, o.h - 16, 10, 14, '#4a2a14'); P.rect(dx + 1, o.h - 15, 8, 13, '#6a4020'); P.rect(dx + 4, o.h - 15, 1, 13, '#4a2a14'); P.px(dx + 7, o.h - 9, '#e0c050');
    P.rect(dx - 1, o.h - 17, 12, 1, U.shade(wall, -0.3));
    // windows
    for (const wx of [8, W - 18]) {
      P.rect(wx, roofH + 5, 10, 8, '#3a2a1a'); P.rect(wx + 1, roofH + 6, 8, 6, '#ffd890'); P.rect(wx + 1, roofH + 6, 3, 2, '#fff4d0'); P.rect(wx + 4, roofH + 6, 1, 6, '#3a2a1a'); P.rect(wx + 1, roofH + 9, 8, 1, '#3a2a1a');
      P.rect(wx - 1, roofH + 13, 12, 2, '#6a4a2a');
      if (o.flowers) for (let i = 0; i < 4; i++) P.px(wx + 1 + i * 3, roofH + 12, r.pick(['#e04060', '#f0d040', '#ffffff']));
    }
    if (o.sign) { P.rect(W - 12, o.h - 26, 10, 7, '#a0763e'); P.rect(W - 11, o.h - 25, 8, 5, o.sign); }
  }
  PR.house = { w: 64, h: 60, ax: 32, ay: 58, box: [-28, -30, 56, 30], variants: 4, draw(P, r) { house(P, r, { w: 64, h: 60, roofH: 26, wall: r.pick(['#d8c8a0', '#c8b890', '#e0d0b0']), roof: r.pick(['#a03a2a', '#3a5a8a', '#5a7a3a', '#7a4a8a']), timber: r.chance(0.6), chimney: true, flowers: r.chance(0.6) }); } };
  PR.bighouse = { w: 96, h: 72, ax: 48, ay: 70, box: [-44, -36, 88, 36], variants: 2, draw(P, r) { house(P, r, { w: 96, h: 72, roofH: 32, wall: '#c8b8a0', roof: r.pick(['#6a3a2a', '#2a4a6a']), timber: true, chimney: true, flowers: true }); } };
  PR.smithy = { w: 72, h: 60, ax: 36, ay: 58, box: [-32, -30, 64, 30], draw(P, r) { house(P, r, { w: 72, h: 60, roofH: 24, wall: '#8a7a70', roof: '#4a4a52', chimney: true, sign: '#6a6a78' }); P.rect(62, 50, 6, 4, '#ff6020'); } };
  PR.shop = { w: 64, h: 60, ax: 32, ay: 58, box: [-28, -30, 56, 30], variants: 2, draw(P, r) { house(P, r, { w: 64, h: 60, roofH: 26, wall: '#e0d0b0', roof: r.pick(['#3a8a6a', '#8a6a2a']), timber: true, flowers: true, sign: r.pick(['#c04040', '#4060c0']) }); } };
  PR.inn = { w: 96, h: 72, ax: 48, ay: 70, box: [-44, -36, 88, 36], draw(P, r) { house(P, r, { w: 96, h: 72, roofH: 32, wall: '#d8c090', roof: '#8a3a2a', timber: true, chimney: true, flowers: true, sign: '#e0a040' }); } };
  PR.temple = {
    w: 96, h: 80, ax: 48, ay: 78, box: [-44, -40, 88, 40],
    draw(P) {
      const c = '#d8d8e0';
      P.rect(4, 30, 88, 46, c); P.rect(4, 30, 88, 3, U.shade(c, -0.2));
      for (let x = 10; x < 90; x += 16) { P.rect(x, 34, 6, 40, '#f0f0f8'); P.rect(x + 4, 34, 2, 40, U.shade(c, -0.15)); }
      for (let y = 0; y < 28; y++) { const w = Math.round(48 * y / 28); P.rect(48 - w, 2 + y, w * 2, 1, y % 4 ? '#b8b8c8' : '#a0a0b0'); }
      P.circle(48, 18, 5, '#f0d060'); P.circle(48, 18, 3, '#fff0a0');
      P.rect(40, 56, 16, 20, '#3a2a1a'); P.rect(41, 57, 14, 19, '#5a4020'); P.rect(0, 74, 96, 4, U.shade(c, -0.3));
    },
  };
  PR.tower = {
    w: 48, h: 96, ax: 24, ay: 93, box: [-18, -20, 36, 20],
    draw(P) {
      const c = '#6a6078';
      P.rect(6, 24, 36, 70, c); for (let y = 28; y < 92; y += 6) for (let x = 6 + ((y / 6) % 2) * 4; x < 42; x += 8) P.rect(x, y, 7, 5, U.shade(c, (x + y) % 3 ? 0.08 : -0.08));
      for (let y = 0; y < 24; y++) { const w = Math.round(22 * y / 24) + 2; P.rect(24 - w, y, w * 2, 1, y % 3 ? '#4a3a6a' : '#3a2a5a'); }
      P.rect(18, 40, 12, 14, '#20182a'); P.rect(19, 41, 10, 12, '#b070ff'); P.rect(18, 78, 12, 16, '#2a1a10');
    },
  };
  PR.ruinwall = { w: 32, h: 30, ax: 16, ay: 28, box: [-16, -8, 32, 8], variants: 3, draw(P, r) { const c = '#8a847a'; const top = r.int(4, 12); for (let x = 0; x < 32; x += 8) { const h = r.int(top, 26); for (let y = 28 - h; y < 28; y += 4) P.rect(x, y, 7, 3, U.shade(c, r.range(-0.15, 0.1))); } P.rect(0, 26, 32, 2, '#4a6a3a'); } };
  PR.castlewall = { w: 48, h: 48, ax: 24, ay: 46, box: [-24, -14, 48, 14], draw(P) { const c = '#4a4458'; P.rect(0, 10, 48, 36, c); for (let y = 12; y < 46; y += 5) for (let x = (y % 2) * 5; x < 48; x += 10) P.rect(x, y, 9, 4, U.shade(c, ((x + y) % 7) / 40)); for (let x = 0; x < 48; x += 12) P.rect(x, 2, 7, 9, c); P.rect(20, 22, 8, 12, '#1a1424'); P.rect(22, 24, 4, 8, '#ff5030'); } };

  // ==========================================================================
  // World props (zones)
  // ==========================================================================
  PR.autumntree = {
    w: 32, h: 44, ax: 16, ay: 41, box: [-4, -4, 8, 5], variants: 4,
    draw(P, r) {
      trunk(P, 14, 26, 15, '#5a3a22');
      const g = r.pick(['#c8622a', '#d8903a', '#b8442a', '#a8a03a']);
      blob(P, 16, 22, 10, U.shade(g, -0.2), r);
      blob(P, 11, 16, 8, g, r); blob(P, 21, 15, 8, g, r); blob(P, 16, 9, 8, U.shade(g, 0.1), r);
    },
  };
  PR.hut = { w: 52, h: 48, ax: 26, ay: 46, box: [-22, -20, 44, 20], variants: 2, draw(P, r) { house(P, r, { w: 52, h: 48, roofH: 22, wall: '#8a6a44', roof: r.pick(['#6a7a3a', '#7a6a3a']), timber: true, flowers: false }); } };
  PR.stilthut = {
    w: 60, h: 66, ax: 30, ay: 64, box: [-26, -10, 52, 10], variants: 2,
    draw(P, r, ctx) {
      for (const x of [6, 20, 38, 52]) { P.rect(x, 40, 3, 26, '#4a3420'); P.rect(x, 40, 1, 26, '#6a4a2c'); }
      P.rect(2, 42, 56, 4, '#6a4a2c'); P.rect(2, 42, 56, 1, '#8a6a40');
      ctx.save(); ctx.translate(0, -4);
      house(P, r, { w: 60, h: 48, roofH: 22, wall: r.pick(['#7a6a4a', '#6a5a3a']), roof: '#5a6a3a', timber: true, flowers: false });
      ctx.restore();
      P.rect(24, 46, 12, 2, '#5a3e22'); P.rect(26, 48, 8, 16, 'rgba(0,0,0,0)');
      for (let y = 48; y < 64; y += 3) P.rect(26, y, 8, 1, '#6a4a2c');
    },
  };
  PR.mill = {
    w: 72, h: 96, ax: 36, ay: 93, box: [-18, -16, 36, 16],
    draw(P, r) {
      const c = '#8a847a';
      for (let y = 30; y < 94; y++) { const w = Math.round(12 + (y - 30) * 0.12); P.rect(36 - w, y, w * 2, 1, (y % 6) ? c : U.shade(c, -0.2)); }
      for (let y = 34; y < 90; y += 6) for (let x = 26; x < 46; x += 7) P.rect(x + (y % 12 ? 3 : 0), y, 1, 5, U.shade(c, -0.18));
      for (let y = 18; y < 32; y++) { const w = Math.round((y - 18) * 1.1); P.rect(36 - w, y, w * 2, 1, y % 3 ? '#6a3a2a' : '#5a2e20'); }
      P.rect(32, 72, 8, 22, '#2a1a10'); P.rect(33, 52, 6, 7, '#1a1410');
      // broken sails
      P.circle(36, 34, 3, '#4a3420');
      const sail = (x1, y1) => { P.line(36, 34, x1, y1, '#5a3e22'); P.line(37, 34, x1 + 1, y1, '#5a3e22'); };
      sail(8, 8); sail(62, 12); sail(58, 58); sail(22, 60);
      for (let i = 0; i < 6; i++) { P.rect(14 + i * 3, 12 + i * 3, 6, 2, '#b8a888'); P.rect(52 - i * 2, 16 + i * 2, 6, 2, '#b8a888'); }
      P.rect(46, 50, 6, 2, '#b8a888'); P.rect(50, 53, 5, 2, '#a89878');
      P.rect(10, 88, 14, 5, '#4a6a3a'); P.rect(48, 90, 16, 4, '#4a6a3a');
    },
  };
  PR.mausoleum = {
    w: 72, h: 66, ax: 36, ay: 63, box: [-32, -22, 64, 18],
    draw(P) {
      const c = '#7a7a86', d = U.shade(c, -0.3), l = U.shade(c, 0.2);
      P.rect(2, 58, 68, 6, d); P.rect(4, 56, 64, 3, c);
      P.rect(8, 24, 56, 33, c); P.rect(8, 24, 56, 2, l);
      for (let y = 28; y < 56; y += 5) P.rect(8, y, 56, 1, U.shade(c, -0.12));
      for (const x of [10, 22, 44, 56]) { P.rect(x, 26, 6, 31, U.shade(c, 0.12)); P.rect(x, 26, 1, 31, l); P.rect(x + 5, 26, 1, 31, d); }
      for (let y = 0; y < 22; y++) { const w = Math.round(34 * y / 22); P.rect(36 - w, 2 + y, w * 2, 1, y % 5 ? c : d); }
      P.rect(0, 22, 72, 3, d); P.rect(0, 22, 72, 1, l);
      P.circle(36, 14, 4, '#e0d8c8'); P.px(34, 14, '#202028'); P.px(37, 14, '#202028'); P.rect(35, 17, 3, 1, '#202028');
      P.rect(29, 34, 14, 23, '#0e0c12'); P.rect(28, 33, 16, 2, d); P.rect(30, 35, 12, 1, '#2a2436');
      P.speckle(8, 24, 56, 34, '#4e6a44', 30, U.rng('maus'));
    },
  };
  PR.gate = {
    w: 88, h: 64, ax: 44, ay: 61, box: null,
    draw(P) {
      const w = '#6a4a2c', d = '#4a3018', l = '#8a6a40';
      for (const x0 of [2, 70]) { P.rect(x0, 10, 16, 52, w); for (let x = x0; x < x0 + 16; x += 4) { P.rect(x, 10, 1, 52, d); P.rect(x + 1, 6, 2, 4, w); P.px(x + 1, 5, l); } P.rect(x0, 20, 16, 2, d); P.rect(x0, 48, 16, 2, d); P.rect(x0 + 5, 26, 6, 6, '#20160e'); }
      P.rect(10, 4, 68, 8, w); P.rect(10, 4, 68, 2, l); P.rect(10, 11, 68, 1, d);
      for (let x = 12; x < 78; x += 6) P.rect(x, 5, 1, 6, d);
      P.rect(36, 12, 16, 8, '#a0763e'); P.rect(38, 14, 12, 1, '#5a3a1a'); P.rect(38, 16, 9, 1, '#5a3a1a');
    },
  };
  PR.palisade = { w: 16, h: 28, ax: 8, ay: 26, box: [-8, -4, 16, 4], draw(P, r) { for (let x = 0; x < 16; x += 4) { const h = r.int(20, 24); P.rect(x, 26 - h, 4, h, '#6a4a2c'); P.rect(x, 26 - h, 1, h, '#8a6a40'); P.rect(x + 3, 26 - h, 1, h, '#4a3018'); P.rect(x + 1, 25 - h, 2, 1, '#8a6a40'); } P.rect(0, 10, 16, 2, '#4a3018'); } };
  PR.campfire = {
    w: 22, h: 18, ax: 11, ay: 15, box: [-5, -3, 10, 3], light: { r: 80, color: '#ff9040', flicker: 0.25 }, anim: 3,
    draw(P, r, ctx, f) {
      for (const [x, y] of [[3, 13], [7, 15], [13, 15], [17, 13], [5, 11], [16, 11]]) { P.rect(x, y, 3, 2, '#6a6a72'); P.px(x, y, '#8a8a92'); }
      P.rect(5, 12, 12, 2, '#5a3a20'); P.line(6, 14, 15, 10, '#6a4424');
      const h = [6, 8, 7][f || 0];
      P.rect(8, 12 - h, 6, h, '#ff6020'); P.rect(9, 13 - h, 4, h - 1, '#ffb040'); P.rect(10, 14 - h, 2, h - 3, '#fff0a0'); P.px(10 + (f % 2), 10 - h, '#ff9040');
    },
  };
  PR.cart = {
    w: 42, h: 30, ax: 21, ay: 27, box: [-18, -8, 36, 8], variants: 2,
    draw(P, r) {
      P.rect(4, 8, 30, 12, '#8a5a30'); P.rect(4, 8, 30, 2, '#a8784a'); for (let x = 8; x < 34; x += 6) P.rect(x, 10, 1, 10, '#6a4424');
      P.rect(34, 16, 8, 2, '#6a4424');
      if (r.chance(0.5)) { P.circle(12, 7, 4, '#c8a050'); P.circle(20, 6, 4, '#d8b060'); P.circle(27, 7, 4, '#c8a050'); } else { P.rect(8, 2, 10, 7, '#a0763e'); P.rect(20, 4, 10, 5, '#8a6a3a'); }
      for (const x of [9, 29]) { P.circle(x, 22, 5, '#4a3018'); P.circle(x, 22, 3, '#6a4a2c'); P.px(x, 22, '#2a1a10'); }
    },
  };
  PR.haystack = { w: 26, h: 22, ax: 13, ay: 19, box: [-10, -5, 20, 5], draw(P) { P.ellipse(13, 13, 11, 7, '#b8943a'); P.ellipse(13, 10, 9, 7, '#d0ac4a'); P.ellipse(11, 7, 5, 3, '#e8c870'); for (let i = 0; i < 8; i++) P.px(4 + i * 2, 16 - (i % 3), '#8a6a2a'); } };
  PR.woodpile = { w: 26, h: 18, ax: 13, ay: 15, box: [-11, -5, 22, 5], draw(P) { for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const x = 3 + row * 3 + i * 6, y = 11 - row * 4; P.circle(x + 2, y + 2, 3, '#7a5030'); P.circle(x + 2, y + 2, 1, '#c8a070'); } } };
  PR.crops = {
    w: 16, h: 16, ax: 8, ay: 14, box: null, variants: 3,
    draw(P, r, ctx, f) {
      const v = r.int(0, 2);
      if (v === 0) { for (let i = 0; i < 5; i++) { const x = 2 + i * 3; P.rect(x, 4, 1, 10, '#a89040'); P.rect(x - 1, 2, 3, 3, '#e0c060'); } }
      else if (v === 1) { for (const [x, y] of [[4, 6], [11, 5], [7, 11]]) { P.circle(x, y, 3, '#5aa04a'); P.circle(x, y, 1, '#8ad070'); } }
      else { for (const [x, y] of [[5, 9], [11, 10]]) { P.ellipse(x, y, 3, 2, '#e07a20'); P.px(x, y - 3, '#4a8a3a'); P.px(x - 1, y - 1, '#f0a040'); } P.line(2, 12, 14, 12, '#3a6a28'); }
    },
  };
  PR.scarecrow = {
    w: 22, h: 34, ax: 11, ay: 31, box: [-2, -2, 4, 2],
    draw(P) { P.rect(10, 8, 2, 24, '#6a4424'); P.rect(2, 12, 18, 2, '#6a4424'); P.rect(6, 12, 10, 10, '#7a5a8a'); P.rect(6, 20, 10, 2, '#5a3a6a'); P.circle(11, 7, 4, '#d8c080'); P.px(9, 6, '#202020'); P.px(12, 6, '#202020'); P.rect(5, 1, 12, 2, '#6a5a2a'); P.rect(8, -1, 6, 3, '#6a5a2a'); for (const x of [2, 19]) P.rect(x, 14, 1, 3, '#e0c060'); },
  };
  PR.dummy = { w: 18, h: 30, ax: 9, ay: 27, box: [-4, -3, 8, 3], draw(P) { P.rect(8, 10, 2, 18, '#6a4424'); P.rect(2, 12, 14, 2, '#6a4424'); P.ellipse(9, 16, 5, 6, '#c8a870'); P.rect(4, 14, 10, 1, '#8a6a3a'); P.rect(4, 18, 10, 1, '#8a6a3a'); P.circle(9, 6, 4, '#c8a870'); P.px(7, 5, '#5a3a1a'); P.px(10, 5, '#5a3a1a'); P.circle(9, 16, 2, '#c03030'); } };
  PR.log = { w: 34, h: 14, ax: 17, ay: 12, box: [-15, -5, 30, 5], variants: 2, draw(P, r) { P.rect(3, 4, 28, 7, '#6a4424'); P.rect(3, 4, 28, 2, '#8a6038'); P.rect(3, 10, 28, 1, '#4a3018'); P.ellipse(3, 7, 2, 3, '#a07a4a'); P.px(3, 7, '#6a4424'); P.ellipse(31, 7, 2, 3, '#8a6038'); if (r.chance(0.6)) { P.rect(10, 3, 6, 2, '#4a7a3a'); P.px(22, 4, '#e04040'); P.px(21, 3, '#e8e0d0'); } } };
  PR.stump = { w: 18, h: 14, ax: 9, ay: 12, box: [-5, -3, 10, 3], draw(P) { P.rect(3, 4, 12, 8, '#6a4424'); P.rect(2, 10, 14, 2, '#5a3a1a'); P.ellipse(9, 4, 6, 2, '#b08a5a'); P.ellipse(9, 4, 3, 1, '#8a6038'); P.px(9, 4, '#6a4424'); } };
  PR.reeds = { w: 14, h: 20, ax: 7, ay: 18, box: null, variants: 3, draw(P, r) { for (let i = 0; i < 5; i++) { const x = r.int(1, 12), h = r.int(9, 16); P.rect(x, 18 - h, 1, h, r.pick(['#5a7a3a', '#6a8a3a', '#4a6a2a'])); if (r.chance(0.6)) P.rect(x - 1, 18 - h, 3, 4, '#6a4424'); } } };
  PR.mangrove = {
    w: 44, h: 50, ax: 22, ay: 47, box: [-5, -6, 10, 6], variants: 2,
    draw(P, r) {
      const c = '#4a3e30';
      for (const dx of [-14, -8, 8, 14]) { P.line(22, 32, 22 + dx, 47, c); P.line(23, 32, 23 + dx, 47, U.shade(c, -0.2)); }
      trunk(P, 20, 20, 16, c);
      const g = r.pick(['#3a5a34', '#34522e', '#40603a']);
      blob(P, 22, 16, 13, U.shade(g, -0.2), r); blob(P, 14, 12, 9, g, r); blob(P, 30, 12, 9, g, r); blob(P, 22, 7, 8, U.shade(g, 0.1), r);
      for (let i = 0; i < 6; i++) { const x = r.int(8, 36); P.rect(x, r.int(18, 24), 1, r.int(4, 9), '#6a7a4a'); }
    },
  };
  PR.swamptree = {
    w: 38, h: 50, ax: 19, ay: 47, box: [-4, -4, 8, 5], variants: 3,
    draw(P, r) {
      trunk(P, 17, 22, 25, '#3e362c');
      P.line(19, 26, 8, 18, '#3e362c'); P.line(20, 24, 31, 16, '#3e362c');
      const g = r.pick(['#4a5a30', '#3e5030', '#56603a']);
      blob(P, 19, 14, 11, g, r); blob(P, 9, 17, 7, U.shade(g, -0.1), r); blob(P, 29, 16, 7, U.shade(g, -0.1), r);
      for (let i = 0; i < 12; i++) { const x = r.int(4, 34), y = r.int(16, 22); P.rect(x, y, 1, r.int(5, 16), r.pick(['#7a8a5a', '#6a7a4a', '#8a9a6a'])); }
    },
  };
  PR.bigshroom = {
    w: 30, h: 34, ax: 15, ay: 31, box: [-4, -3, 8, 3], variants: 3, light: { r: 44, color: '#60e0c0', flicker: 0.06 },
    draw(P, r) {
      P.rect(12, 14, 6, 17, '#d8d0c0'); P.rect(12, 14, 2, 17, '#f0e8d8'); P.rect(11, 29, 8, 2, '#b8b0a0');
      const c = r.pick(['#40b0a0', '#8a50c0', '#c04a4a']);
      P.ellipse(15, 12, 13, 7, U.shade(c, -0.25)); P.ellipse(15, 10, 12, 7, c); P.ellipse(11, 7, 5, 2, U.shade(c, 0.3));
      for (let i = 0; i < 5; i++) P.circle(r.int(5, 25), r.int(6, 13), 1, '#f0f0e0');
    },
  };
  PR.web = {
    w: 42, h: 38, ax: 21, ay: 36, box: null, variants: 2, outline: false,
    draw(P, r) {
      const c = 'rgba(230,230,240,0.7)', cx = 21 + r.int(-3, 3), cy = 17 + r.int(-3, 3);
      const spokes = 8, pts = [];
      for (let i = 0; i < spokes; i++) { const a = i / spokes * U.TAU + r.range(-0.2, 0.2); const len = r.range(14, 19); pts.push([a, len]); P.line(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, c); }
      for (let k = 1; k <= 4; k++) for (let i = 0; i < spokes; i++) { const [a0, l0] = pts[i], [a1, l1] = pts[(i + 1) % spokes]; const f = k / 4.5; P.line(cx + Math.cos(a0) * l0 * f, cy + Math.sin(a0) * l0 * f, cx + Math.cos(a1) * l1 * f, cy + Math.sin(a1) * l1 * f, 'rgba(210,210,225,0.5)'); }
    },
  };
  PR.eggsac = {
    w: 22, h: 20, ax: 11, ay: 18, box: [-7, -4, 14, 4], variants: 2, light: { r: 30, color: '#a0ff60', flicker: 0.1 },
    draw(P, r) { for (const [x, y, s] of [[7, 12, 5], [15, 13, 4], [11, 7, 5]]) { P.circle(x, y, s, '#c8d0a0'); P.circle(x - 1, y - 1, s - 2, '#e8f0c0'); P.circle(x, y, 1, '#80c040'); } P.line(2, 18, 20, 18, 'rgba(230,230,240,0.6)'); },
  };
  PR.cocoon = { w: 16, h: 26, ax: 8, ay: 24, box: [-4, -3, 8, 3], variants: 2, draw(P, r) { P.line(8, 0, 8, 4, '#d8d8e0'); P.ellipse(8, 14, 5, 10, '#c8c8d0'); P.ellipse(7, 12, 3, 7, '#e0e0e8'); for (let y = 6; y < 24; y += 3) P.line(3, y, 13, y + 2, '#a8a8b8'); if (r.chance(0.5)) { P.rect(6, 8, 4, 3, '#e8b088'); P.px(7, 9, '#202020'); } } };
  PR.obelisk = {
    w: 22, h: 58, ax: 11, ay: 55, box: [-7, -5, 14, 5],
    draw(P, r) { const c = '#c8a870'; P.rect(2, 50, 18, 6, '#9a7c4c'); for (let y = 6; y < 50; y++) { const w = Math.round(4 + (y - 6) * 0.1); P.rect(11 - w, y, w * 2, 1, c); } P.rect(7, 6, 2, 44, '#dcc08a'); for (let y = 0; y < 7; y++) P.rect(11 - Math.round(y * 0.7), y, Math.round(y * 1.4) + 1, 1, '#e0c060'); for (let y = 12; y < 46; y += 7) { P.rect(10, y, 3, 1, '#7a5a30'); P.px(11, y + 2, '#7a5a30'); P.rect(9, y + 4, 5, 1, '#7a5a30'); } },
  };
  PR.pyramid = {
    w: 176, h: 112, ax: 88, ay: 109, box: [-84, -42, 168, 38],
    draw(P) {
      for (let s = 0; s < 12; s++) {
        const y = 100 - s * 8, hw = 86 - s * 7;
        const c = s % 2 ? '#c8a468' : '#bc9860';
        P.rect(88 - hw, y, hw * 2, 8, c); P.rect(88 - hw, y, hw * 2, 1, '#dcc08a'); P.rect(88 - hw, y + 7, hw * 2, 1, '#9a7a48');
        P.rect(88, y, hw, 8, U.shade(c, -0.12));
        for (let x = 88 - hw + 6; x < 88 + hw - 4; x += 12) P.rect(x + (s % 2) * 6, y + 1, 1, 6, '#9a7a48');
      }
      P.rect(80, 4, 16, 8, '#e0c060'); P.rect(80, 4, 8, 8, '#f0d880');
      P.rect(74, 78, 28, 30, '#8a6a3a'); P.rect(78, 82, 20, 26, '#120c08'); P.rect(74, 76, 28, 3, '#e0c060');
      P.rect(84, 70, 8, 5, '#c8a040'); P.circle(88, 72, 2, '#40c0ff');
    },
  };
  PR.sandcolumn = { w: 18, h: 42, ax: 9, ay: 39, box: [-6, -5, 12, 5], variants: 3, draw(P, r) { const c = '#c8a870', h = r.pick([34, 24, 14]); P.rect(1, 36, 16, 4, '#9a7c4c'); P.rect(3, 38 - h, 12, h, c); P.rect(3, 38 - h, 2, h, '#dcc08a'); P.rect(12, 38 - h, 3, h, '#a8885a'); for (let y = 40 - h; y < 36; y += 5) P.rect(3, y, 12, 1, '#a8885a'); if (h === 34) { P.rect(1, 2, 16, 4, '#d0b07a'); P.rect(1, 2, 16, 1, '#e8cc98'); } else { P.px(5, 38 - h - 1, c); P.px(9, 38 - h - 2, c); P.px(12, 38 - h - 1, c); P.rect(r.int(12, 16), 36, 3, 2, c); } } };
  PR.skull = { w: 24, h: 14, ax: 12, ay: 12, box: null, draw(P) { P.ellipse(12, 7, 6, 4, '#e8e0cc'); P.rect(10, 10, 5, 2, '#d8d0bc'); P.px(9, 7, '#302820'); P.px(14, 7, '#302820'); P.line(6, 5, 1, 1, '#e8e0cc'); P.line(18, 5, 23, 1, '#e8e0cc'); P.line(6, 6, 2, 3, '#d8d0bc'); P.line(18, 6, 22, 3, '#d8d0bc'); } };
  PR.ribcage = { w: 52, h: 32, ax: 26, ay: 29, box: [-20, -4, 40, 4], draw(P) { const c = '#e0d8c4'; P.rect(4, 26, 44, 3, c); for (let i = 0; i < 6; i++) { const x = 8 + i * 7, h = 22 - Math.abs(i - 2.5) * 3; P.line(x, 27, x - 3, 27 - h, c); P.line(x + 1, 27, x - 2, 27 - h, U.shade(c, -0.15)); P.line(x - 3, 27 - h, x + 2, 27 - h - 3, c); } P.circle(48, 24, 4, c); P.px(49, 23, '#302820'); } };
  PR.sarcophagus = {
    w: 22, h: 34, ax: 11, ay: 31, box: [-9, -24, 18, 24], variants: 2,
    draw(P, r) {
      const gold = r.int(0, 1) === 1, c = gold ? '#c8a040' : '#7a7a84';
      P.rect(1, 6, 20, 26, U.shade(c, -0.3)); P.rect(2, 4, 18, 26, c); P.rect(2, 4, 18, 2, U.shade(c, 0.25));
      P.ellipse(11, 11, 5, 4, gold ? '#e8c860' : '#9a9aa4'); P.px(9, 11, '#202028'); P.px(13, 11, '#202028');
      P.rect(7, 16, 8, 10, U.shade(c, -0.12)); P.rect(6, 18, 10, 2, gold ? '#40a0e0' : '#5a5a64'); P.rect(10, 16, 2, 10, U.shade(c, 0.15));
    },
  };
  PR.urn = { w: 14, h: 18, ax: 7, ay: 16, box: [-4, -3, 8, 3], variants: 3, draw(P, r) { const c = r.pick(['#a0602a', '#8a7a5a', '#6a8a9a']); P.ellipse(7, 10, 5, 6, c); P.rect(4, 2, 6, 3, c); P.rect(3, 1, 8, 2, U.shade(c, 0.2)); P.ellipse(5, 8, 1, 3, U.shade(c, 0.3)); P.rect(3, 10, 8, 1, '#e0c060'); P.rect(5, 15, 4, 1, U.shade(c, -0.3)); } };
  PR.goldpile = { w: 24, h: 14, ax: 12, ay: 12, box: null, light: { r: 26, color: '#ffd040', flicker: 0.05 }, draw(P, r) { P.ellipse(12, 9, 10, 4, '#b08a20'); P.ellipse(12, 7, 8, 4, '#e0b030'); for (let i = 0; i < 10; i++) P.px(r.int(4, 20), r.int(4, 11), r.pick(['#fff080', '#c89020'])); P.rect(15, 3, 3, 4, '#40c0ff'); } };
  PR.coffin = { w: 18, h: 30, ax: 9, ay: 28, box: [-7, -22, 14, 22], draw(P) { const c = '#5a3a24'; P.rect(4, 2, 10, 4, c); P.rect(2, 6, 14, 10, c); P.rect(4, 16, 10, 12, c); P.rect(3, 6, 1, 10, '#7a5a3a'); P.rect(8, 7, 2, 10, '#c8a040'); P.rect(6, 10, 6, 2, '#c8a040'); } };
  PR.candles = { w: 16, h: 14, ax: 8, ay: 12, box: null, light: { r: 40, color: '#ffb060', flicker: 0.2 }, anim: 2, draw(P, r, ctx, f) { for (const [x, h] of [[3, 6], [7, 9], [11, 5], [13, 7]]) { P.rect(x, 12 - h, 2, h, '#e8e0c8'); P.px(x + (f && x % 2 ? 1 : 0), 11 - h, '#ffc040'); P.px(x, 10 - h, '#ff8020'); } P.rect(1, 11, 14, 2, '#d8d0b8'); } };
  PR.cross = { w: 14, h: 22, ax: 7, ay: 20, box: [-3, -3, 6, 3], variants: 2, draw(P, r) { const c = r.pick(['#8a8a92', '#6a4a2c']); P.rect(6, 2, 3, 18, c); P.rect(2, 6, 11, 3, c); P.rect(6, 2, 1, 18, U.shade(c, 0.2)); P.rect(3, 19, 9, 2, '#4a6a3a'); } };
  PR.icespike = { w: 18, h: 28, ax: 9, ay: 26, box: [-5, -3, 10, 3], variants: 3, light: { r: 22, color: '#a0e0ff', flicker: 0.04 }, draw(P, r) { for (const [x, h, w] of [[9, r.int(18, 24), 3], [4, r.int(8, 14), 2], [14, r.int(10, 16), 2]]) { for (let y = 0; y < h; y++) { const ww = Math.max(1, Math.round(w * y / h)); P.rect(x - ww, 26 - h + y, ww * 2, 1, y % 4 ? '#b8e8ff' : '#98d0f0'); } P.px(x - 1, 27 - h, '#ffffff'); } } };
  PR.snowman = { w: 20, h: 26, ax: 10, ay: 24, box: [-6, -3, 12, 3], draw(P) { P.circle(10, 18, 6, '#f0f4fa'); P.circle(10, 9, 4, '#ffffff'); P.px(9, 8, '#202020'); P.px(11, 8, '#202020'); P.rect(11, 9, 3, 1, '#e07020'); P.rect(6, 3, 8, 2, '#2a2a34'); P.rect(7, 0, 6, 3, '#2a2a34'); P.line(4, 15, 0, 11, '#6a4424'); P.line(16, 15, 19, 11, '#6a4424'); P.rect(7, 12, 6, 1, '#c03030'); P.px(10, 16, '#303030'); P.px(10, 19, '#303030'); } };
  PR.frozenknight = { w: 26, h: 42, ax: 13, ay: 39, box: [-9, -5, 18, 5], draw(P) { P.rect(2, 4, 22, 36, 'rgba(160,220,255,0.55)'); P.rect(9, 10, 8, 20, '#6a7a8a'); P.rect(10, 5, 6, 6, '#7a8a9a'); P.rect(7, 12, 12, 4, '#5a6a7a'); P.rect(10, 30, 2, 8, '#5a6a7a'); P.rect(14, 30, 2, 8, '#5a6a7a'); P.rect(19, 8, 2, 22, '#a0a8b8'); P.rect(2, 4, 2, 36, 'rgba(255,255,255,0.6)'); P.line(4, 6, 12, 2, '#ffffff'); P.rect(1, 38, 24, 3, '#e8eef6'); } };
  PR.snowrock = { w: 24, h: 18, ax: 12, ay: 16, box: [-9, -5, 18, 5], variants: 2, draw(P, r) { const c = '#6a7080'; P.ellipse(12, 11, 10, 6, U.shade(c, -0.3)); P.ellipse(12, 10, 9, 6, c); P.ellipse(11, 6, 8, 3, '#f0f4fa'); P.px(16, 12, U.shade(c, -0.2)); } };
  PR.vent = { w: 22, h: 30, ax: 11, ay: 27, box: [-6, -3, 12, 3], light: { r: 44, color: '#ff7020', flicker: 0.3 }, anim: 3, draw(P, r, ctx, f) { P.ellipse(11, 23, 9, 4, '#2a2024'); P.ellipse(11, 22, 5, 2, '#ff6020'); P.ellipse(11, 22, 3, 1, '#ffc040'); const k = f || 0; for (let i = 0; i < 3; i++) P.circle(11 + ((i + k) % 3) - 1, 16 - i * 5 - k * 1, 3 - (i === 2 ? 1 : 0), i ? 'rgba(90,80,80,0.6)' : 'rgba(120,100,90,0.7)'); } };
  PR.obspike = { w: 20, h: 32, ax: 10, ay: 29, box: [-6, -4, 12, 4], variants: 3, draw(P, r) { for (const [x, h, w] of [[10, r.int(22, 28), 4], [4, r.int(10, 16), 3], [16, r.int(12, 18), 3]]) { for (let y = 0; y < h; y++) { const ww = Math.max(1, Math.round(w * y / h)); P.rect(x - ww, 29 - h + y, ww * 2, 1, '#1e1824'); P.px(x - ww, 29 - h + y, '#4a3a5a'); } P.px(x, 29 - h + 3, '#ff5020'); } } };
  PR.charredtree = { w: 28, h: 40, ax: 14, ay: 37, box: [-3, -4, 6, 5], variants: 2, draw(P, r) { const c = '#241c1c'; trunk(P, 12, 14, 23, c); P.line(13, 16, 4, 6, c); P.line(15, 12, 23, 4, c); P.line(14, 14, 13, 2, c); P.line(8, 10, 5, 12, c); for (let i = 0; i < 5; i++) P.px(r.int(12, 16), r.int(16, 34), '#ff5020'); P.px(5, 6, '#ff9040'); } };
  PR.throne = {
    w: 42, h: 56, ax: 21, ay: 53, box: [-16, -10, 32, 10],
    draw(P) {
      const c = '#1e1a28', g = '#8a40c0';
      P.rect(6, 2, 30, 44, c); for (let x = 6; x < 36; x += 6) { P.rect(x, 0, 3, 5, c); P.px(x + 1, 0, g); }
      P.rect(10, 8, 22, 30, '#3a1a3a'); P.rect(12, 10, 18, 26, '#5a1a3a'); P.circle(21, 14, 3, g); P.px(21, 14, '#e0b0ff');
      P.rect(2, 30, 8, 16, c); P.rect(32, 30, 8, 16, c); P.rect(2, 30, 8, 2, '#4a3a5a'); P.rect(32, 30, 8, 2, '#4a3a5a');
      P.rect(8, 38, 26, 8, '#2a2436'); P.rect(0, 46, 42, 8, '#16121e'); P.rect(0, 46, 42, 1, '#3a3448');
    },
  };
  PR.gargoyle = { w: 26, h: 34, ax: 13, ay: 31, box: [-8, -5, 16, 5], variants: 2, draw(P, r) { const c = '#4a4658'; P.rect(4, 26, 18, 6, U.shade(c, -0.3)); P.ellipse(13, 18, 6, 8, c); P.circle(13, 9, 4, c); P.px(11, 9, '#ff3030'); P.px(15, 9, '#ff3030'); P.rect(10, 4, 1, 3, c); P.rect(16, 4, 1, 3, c); for (const s of [-1, 1]) { P.line(13 + s * 5, 14, 13 + s * 12, 6, c); P.line(13 + s * 12, 6, 13 + s * 11, 20, c); P.line(13 + s * 6, 18, 13 + s * 11, 20, c); } P.ellipse(11, 15, 2, 3, U.shade(c, 0.2)); } };
  PR.chains = { w: 12, h: 30, ax: 6, ay: 28, box: null, variants: 2, draw(P, r) { for (const x of [3, 8]) { const n = r.int(4, 7); for (let i = 0; i < n; i++) { P.rect(x, i * 4, 2, 3, '#6a6a74'); P.px(x, i * 4, '#9a9aa4'); } } } };
  PR.warbanner = { w: 16, h: 38, ax: 8, ay: 36, box: [-2, -2, 4, 2], variants: 2, draw(P, r) { const c = r.pick(['#2a1a3a', '#1a1a22']); P.rect(7, 2, 2, 34, '#3a3440'); P.rect(1, 3, 14, 1, '#8a6a3a'); P.rect(2, 4, 12, 20, c); for (let x = 2; x < 14; x += 3) P.rect(x, 24, 2, 3, c); P.rect(5, 9, 6, 1, '#b060ff'); P.px(5, 8, '#b060ff'); P.px(8, 7, '#b060ff'); P.px(10, 8, '#b060ff'); P.rect(6, 11, 4, 5, '#10101a'); P.px(7, 12, '#ff4040'); P.px(8, 12, '#ff4040'); } };
  PR.altar = { w: 34, h: 26, ax: 17, ay: 23, box: [-14, -8, 28, 8], light: { r: 70, color: '#ff9a40', flicker: 0.15 }, anim: 3, draw(P, r, ctx, f) { const c = '#8a8a96'; P.rect(3, 12, 28, 11, c); P.rect(3, 12, 28, 2, U.shade(c, 0.25)); P.rect(1, 21, 32, 3, U.shade(c, -0.3)); P.rect(8, 15, 18, 5, U.shade(c, -0.15)); P.rect(12, 16, 10, 3, '#c8a040'); const h = [3, 5, 4][f || 0]; P.circle(17, 9 - h / 2, 3, '#ff8030'); P.rect(16, 5 - h, 3, 3, '#ffd060'); P.px(17, 3 - h, '#ffffff'); } };
  PR.bedroll = { w: 16, h: 26, ax: 8, ay: 24, box: null, variants: 3, draw(P, r) { const c = r.pick(['#8a3a3a', '#3a5a8a', '#5a7a3a']); P.rect(2, 4, 12, 20, c); P.rect(2, 4, 12, 5, '#e8e0d0'); P.rect(2, 12, 12, 1, U.shade(c, -0.3)); P.rect(2, 4, 1, 20, U.shade(c, 0.2)); } };
  PR.boat = { w: 46, h: 20, ax: 23, ay: 17, box: null, draw(P) { P.ellipse(23, 10, 21, 7, '#5a3a20'); P.ellipse(23, 9, 19, 5, '#8a5a30'); P.ellipse(23, 9, 16, 3, '#6a4424'); P.rect(12, 7, 2, 5, '#5a3a20'); P.rect(32, 7, 2, 5, '#5a3a20'); P.line(20, 8, 44, 2, '#a8784a'); } };
  PR.cauldron = { w: 22, h: 20, ax: 11, ay: 18, box: [-7, -4, 14, 4], light: { r: 40, color: '#80ff60', flicker: 0.15 }, anim: 3, draw(P, r, ctx, f) { P.ellipse(11, 12, 8, 6, '#2a2a30'); P.ellipse(11, 7, 8, 2, '#3a3a44'); P.ellipse(11, 7, 6, 1, '#60e040'); P.ellipse(8, 10, 2, 3, '#4a4a54'); P.rect(4, 16, 2, 3, '#2a2a30'); P.rect(16, 16, 2, 3, '#2a2a30'); const k = f || 0; P.circle(8 + k * 2, 4 - k, 1, '#a0ff80'); P.px(13 - k, 2 + k, '#c0ffa0'); P.rect(7, 18, 8, 2, '#ff6020'); } };
  PR.forge = { w: 34, h: 36, ax: 17, ay: 33, box: [-14, -8, 28, 8], light: { r: 70, color: '#ff7020', flicker: 0.2 }, anim: 3, draw(P, r, ctx, f) { const c = '#6a5a54'; P.rect(3, 10, 28, 24, c); for (let y = 12; y < 34; y += 4) for (let x = 3 + (y % 8 ? 0 : 3); x < 31; x += 7) P.rect(x, y, 6, 3, U.shade(c, ((x + y) % 3 - 1) * 0.08)); P.rect(12, 0, 10, 11, '#5a4a44'); P.rect(10, 18, 14, 10, '#1a1010'); const k = f || 0; P.rect(11, 22 - k, 12, 6 + k, '#ff6020'); P.rect(13, 24 - k, 8, 4 + k, '#ffc040'); P.px(15 + k, 21 - k, '#fff0a0'); } };
  PR.weaponrack = { w: 30, h: 26, ax: 15, ay: 23, box: [-13, -4, 26, 4], draw(P) { P.rect(2, 20, 26, 3, '#6a4424'); P.rect(2, 6, 26, 2, '#6a4424'); P.rect(3, 6, 2, 17, '#5a3a1a'); P.rect(25, 6, 2, 17, '#5a3a1a'); P.rect(8, 1, 2, 20, '#c8d0d8'); P.rect(7, 16, 4, 1, '#c8a040'); P.rect(14, 3, 2, 18, '#8a6038'); P.rect(12, 3, 6, 4, '#a0a8b0'); P.rect(20, 0, 2, 21, '#8a6038'); P.px(21, 0, '#d0d8e0'); P.px(20, 1, '#d0d8e0'); } };
  PR.armorstand = { w: 18, h: 32, ax: 9, ay: 30, box: [-5, -3, 10, 3], draw(P) { P.rect(8, 8, 2, 22, '#6a4424'); P.rect(4, 28, 10, 2, '#6a4424'); P.rect(3, 9, 12, 12, '#8a929a'); P.rect(3, 9, 12, 2, '#aab2ba'); P.rect(8, 11, 2, 9, '#6a727a'); P.rect(5, 1, 8, 7, '#8a929a'); P.rect(6, 4, 6, 1, '#202028'); } };
  PR.fountain = { w: 50, h: 38, ax: 25, ay: 35, box: [-21, -14, 42, 14], anim: 3, draw(P, r, ctx, f) { const c = '#9a9aa6'; P.ellipse(25, 26, 23, 10, U.shade(c, -0.3)); P.ellipse(25, 25, 22, 9, c); P.ellipse(25, 25, 19, 7, '#3a7ac0'); P.ellipse(20, 24, 6, 2, '#6aa8e0'); P.rect(22, 8, 6, 17, c); P.rect(22, 8, 2, 17, U.shade(c, 0.2)); P.ellipse(25, 8, 7, 2, c); const k = f || 0; P.rect(24, 2 - k, 2, 6 + k, '#a8d8ff'); P.px(20 - k, 6 + k, '#a8d8ff'); P.px(30 + k, 6 + k, '#a8d8ff'); P.px(18 - k, 12 + k, '#a8d8ff'); P.px(32 + k, 12 + k, '#a8d8ff'); } };
  PR.bench = { w: 30, h: 16, ax: 15, ay: 13, box: [-12, -3, 24, 3], draw(P) { P.rect(2, 4, 26, 3, '#8a5a30'); P.rect(2, 4, 26, 1, '#a8784a'); P.rect(2, 8, 26, 2, '#7a4a28'); P.rect(4, 10, 2, 4, '#4a4a52'); P.rect(24, 10, 2, 4, '#4a4a52'); } };
  PR.rune = { w: 36, h: 22, ax: 18, ay: 18, box: null, light: { r: 50, color: '#b070ff', flicker: 0.15 }, anim: 3, outline: false, draw(P, r, ctx, f) { const c = ['#8a50e0', '#a070ff', '#c090ff'][f || 0]; ctx.globalAlpha = 0.9; for (let a = 0; a < 64; a++) { const t = a / 64 * U.TAU; P.px(18 + Math.cos(t) * 16, 11 + Math.sin(t) * 9, c); P.px(18 + Math.cos(t) * 11, 11 + Math.sin(t) * 6, c); } for (let i = 0; i < 6; i++) { const t = i / 6 * U.TAU + (f || 0) * 0.2; P.rect(18 + Math.cos(t) * 13.5, 11 + Math.sin(t) * 7.5, 2, 2, '#e0c0ff'); } ctx.globalAlpha = 1; } };
  PR.pavilion = {
    w: 76, h: 56, ax: 38, ay: 53, box: [-32, -18, 64, 16],
    draw(P) {
      const c = '#e8dcc0', s = '#b83a3a';
      for (let y = 0; y < 22; y++) { const w = Math.round(8 + y * 1.4); P.rect(38 - w, 4 + y, w * 2, 1, (Math.floor(y / 3) % 2) ? c : s); }
      P.rect(6, 26, 64, 26, c); for (let x = 6; x < 70; x += 8) P.rect(x, 26, 4, 26, U.shade(c, -0.08));
      P.rect(6, 26, 64, 3, s); for (let x = 6; x < 70; x += 4) P.rect(x, 29, 2, 2, '#e0c060');
      P.rect(28, 32, 20, 20, '#5a1a1a'); P.rect(30, 32, 16, 20, '#2a0e0e'); P.line(28, 32, 24, 50, c); P.line(48, 32, 52, 50, c);
      P.rect(37, 0, 2, 5, '#6a4424'); P.rect(39, 0, 6, 3, '#40a0e0');
    },
  };
  PR.dunebush = { w: 16, h: 12, ax: 8, ay: 10, box: null, variants: 2, draw(P, r) { const c = r.pick(['#9a8a4a', '#8a7a3a']); for (let i = 0; i < 9; i++) P.line(8, 10, r.int(1, 15), r.int(1, 6), i % 2 ? c : U.shade(c, -0.2)); } };
  PR.anubis = { w: 26, h: 46, ax: 13, ay: 43, box: [-9, -6, 18, 6], draw(P) { const c = '#2a2a34', g = '#c8a040'; P.rect(2, 36, 22, 8, '#8a6a3a'); P.rect(2, 36, 22, 1, '#b08a4a'); P.rect(7, 16, 12, 20, c); P.rect(9, 20, 8, 3, g); P.rect(8, 8, 10, 9, c); P.rect(15, 11, 6, 3, c); P.rect(8, 2, 2, 7, c); P.rect(14, 2, 2, 7, c); P.px(13, 11, g); P.rect(7, 24, 2, 10, g); P.rect(17, 24, 2, 10, g); } };
  PR.citpillar = { w: 18, h: 46, ax: 9, ay: 43, box: [-7, -5, 14, 5], light: { r: 34, color: '#b060ff', flicker: 0.12 }, draw(P) { const c = '#1e1a28'; P.rect(1, 38, 16, 6, '#14101a'); P.rect(3, 6, 12, 32, c); P.rect(3, 6, 2, 32, '#3a3448'); P.rect(13, 6, 2, 32, '#100c16'); P.rect(1, 2, 16, 5, '#2a2436'); for (let y = 12; y < 36; y += 8) { P.rect(8, y, 2, 4, '#9040e0'); P.px(8, y + 1, '#e0b0ff'); } } };
  PR.cage = { w: 22, h: 30, ax: 11, ay: 27, box: [-8, -4, 16, 4], draw(P, r) { P.rect(3, 6, 16, 2, '#4a4a52'); P.rect(3, 26, 16, 2, '#4a4a52'); for (let x = 3; x < 20; x += 3) P.rect(x, 6, 1, 20, '#5a5a64'); P.rect(10, 0, 2, 6, '#4a4a52'); if (r.chance(0.5)) { P.circle(10, 22, 2, '#e0d8c8'); P.rect(7, 24, 8, 2, '#d8d0c0'); } } };
  PR.noticeboard = {
    w: 34, h: 34, ax: 17, ay: 31, box: [-14, -4, 28, 4],
    draw(P) {
      P.rect(4, 12, 3, 20, '#5a3a1a'); P.rect(27, 12, 3, 20, '#5a3a1a');
      P.rect(1, 3, 32, 20, '#8a5a30'); P.rect(1, 3, 32, 2, '#a8784a'); P.rect(3, 6, 28, 15, '#6a4424');
      P.rect(5, 7, 8, 9, '#e8dcb0'); P.rect(6, 9, 6, 1, '#5a3a1a'); P.rect(6, 11, 5, 1, '#5a3a1a'); P.rect(8, 13, 2, 2, '#c03030');
      P.rect(15, 8, 7, 11, '#f0e8d0'); P.circle(18, 11, 2, '#6a4a2a'); P.rect(16, 15, 5, 1, '#5a3a1a'); P.rect(16, 17, 4, 1, '#5a3a1a');
      P.rect(24, 7, 6, 7, '#e0d0a0'); P.rect(25, 9, 4, 1, '#5a3a1a'); P.px(9, 7, '#c03030'); P.px(18, 8, '#3050c0'); P.px(27, 7, '#c03030');
      P.rect(1, 1, 32, 2, '#6a3a1a');
    },
  };
  PR.tomb_door = { w: 48, h: 40, ax: 24, ay: 37, box: null, draw(P) { const c = '#a8804c'; P.rect(2, 4, 44, 34, c); P.rect(2, 4, 44, 3, '#c8a060'); P.rect(10, 12, 28, 26, '#0e0a06'); P.rect(8, 10, 32, 3, '#e0c060'); P.rect(4, 8, 5, 30, '#9a7444'); P.rect(39, 8, 5, 30, '#9a7444'); P.circle(24, 7, 3, '#40c0ff'); } };
  PR.cavemouth = {
    w: 56, h: 40, ax: 28, ay: 37, box: null, variants: 3,
    draw(P, r) {
      const c = r.pick(['#6a6a72', '#7a6a5a', '#5a6272']);
      P.ellipse(28, 24, 27, 16, U.shade(c, -0.25)); P.ellipse(28, 22, 26, 15, c);
      P.ellipse(20, 14, 10, 5, U.shade(c, 0.2)); P.ellipse(38, 12, 8, 4, U.shade(c, 0.15));
      P.ellipse(28, 30, 15, 11, '#0a080c'); P.rect(13, 30, 30, 8, '#0a080c');
      for (let i = 0; i < 5; i++) { const x = 16 + i * 6; P.rect(x, 19, 2, r.int(3, 6), U.shade(c, -0.1)); }
    },
  };
  PR.stairsdown = { w: 34, h: 26, ax: 17, ay: 23, box: null, draw(P) { P.rect(1, 2, 32, 22, '#3a3440'); for (let i = 0; i < 5; i++) { P.rect(3 + i, 4 + i * 4, 28 - i * 2, 3, U.shade('#6a6474', -i * 0.14)); P.rect(3 + i, 4 + i * 4, 28 - i * 2, 1, U.shade('#8a8494', -i * 0.14)); } P.rect(8, 22, 18, 2, '#0a080c'); } };
  PR.lavapillar = { w: 20, h: 34, ax: 10, ay: 31, box: [-7, -4, 14, 4], light: { r: 40, color: '#ff6020', flicker: 0.2 }, draw(P, r) { const c = '#2a2024'; P.rect(3, 6, 14, 26, c); P.rect(3, 6, 2, 26, '#4a3a3a'); for (let i = 0; i < 4; i++) P.line(r.int(4, 15), r.int(8, 28), r.int(4, 15), r.int(8, 28), '#ff6020'); P.ellipse(10, 6, 7, 3, '#ff8030'); P.ellipse(10, 6, 4, 1, '#ffd060'); } };

  // Render a prop (cached by variant/frame).
  PR.sprite = function (id, variant, frame) {
    const p = PR[id];
    if (!p) return null;
    return G.sprite('prop|' + id + '|' + variant + '|' + (frame || 0), p.w + 2, p.h + 2, (ctx) => {
      ctx.translate(1, 1);
      const P = G.painter(ctx);
      p.draw(P, U.rng(id + ':' + variant), ctx, frame || 0);
    }, { outline: p.outline === false ? null : true });
  };
})(window.RPG);
