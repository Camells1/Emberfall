'use strict';
// Low-poly 3D models for props in HD-2D (trees, rocks, crystals, mushrooms, barrels...).
// A model is a list of parts [geometry, material, colour, matrix, sway]. Colours are read from the
// prop's own pixel art, so every biome's palette (autumn leaves, snow, lava rock...) carries over.
(function (R) {
  const MD = R.HD2DModels = {};
  let T = null;
  const geos = {};
  MD.geo = function (k) {
    if (geos[k]) return geos[k];
    T = window.THREE; let g;
    switch (k) {
      case 'cyl': g = new T.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0); break;
      case 'taper': g = new T.CylinderGeometry(0.32, 0.5, 1, 7).translate(0, 0.5, 0); break;
      case 'cone': g = new T.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0); break;
      case 'shard': g = new T.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0); break;
      case 'blob': g = new T.IcosahedronGeometry(0.5, 1); break;
      case 'rock': g = new T.DodecahedronGeometry(0.5, 0); break;
      case 'box': g = new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); break;
      case 'dome': g = new T.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2); break;
    }
    if (g.index) g = g.toNonIndexed();
    g.computeVertexNormals(); // non-indexed -> faceted, low-poly shading
    return (geos[k] = g);
  };

  // ---- colours from the sprite -------------------------------------------------------------
  const pals = new Map();
  const lum = (c) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
  MD.shade = (c, k) => { const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255); };
  function palette(id, v) {
    const key = id + '|' + v; let p = pals.get(key);
    if (p) return p;
    const d = R.Props[id], spr = R.Props.sprite(id, v, 0), w = spr.width, h = spr.height;
    const px = spr.getContext('2d').getImageData(0, 0, w, h).data;
    const ax = d.ax + 1, ay = d.ay + 1;
    const regions = { top: new Map(), base: new Map(), all: new Map() };
    let light = 0, lightL = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (px[i + 3] < 128) continue;
      const c = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2], L = lum(c);
      if (L < 32) continue; // outline
      const q = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
      const add = (m) => { const b = m.get(q) || [0, 0, 0, 0]; b[0] += px[i]; b[1] += px[i + 1]; b[2] += px[i + 2]; b[3]++; m.set(q, b); };
      add(regions.all);
      if (y < ay * 0.6) add(regions.top);
      if (y > ay - 9 && Math.abs(x - ax) <= 3) add(regions.base);
      if (L > lightL) { lightL = L; light = c; }
    }
    const best = (m, fb) => { let b = null; for (const v2 of m.values()) if (!b || v2[3] > b[3]) b = v2; return b ? (Math.round(b[0] / b[3]) << 16) | (Math.round(b[1] / b[3]) << 8) | Math.round(b[2] / b[3]) : fb; };
    const all = best(regions.all, 0x808080);
    p = { all, top: best(regions.top, all), base: best(regions.base, all), light };
    pals.set(key, p);
    return p;
  }

  // ---- model builders (units: world pixels; y is up, z is the map's y) -----------------------
  const BARK = 0x6a4a2c;
  const isGreenish = (c) => ((c >> 8) & 255) > ((c >> 16) & 255) + 12;
  const trunkCol = (p) => (isGreenish(p.base) ? BARK : p.base);
  const tree = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.2, g = p.top, cy = H * 0.6, R0 = W * 0.4;
    add('taper', 'l', trunkCol(p), 0, 0, 0, W * 0.2, H * 0.6, W * 0.2);
    add('blob', 'l', MD.shade(g, -0.14), 0, cy, 0, R0 * 2, R0 * 1.6, R0 * 2, 0, r() * 6, 0, 0.6);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + r() * 0.8;
      add('blob', 'l', MD.shade(g, (r() - 0.5) * 0.18), Math.cos(a) * W * 0.24, cy + r() * H * 0.1, Math.sin(a) * W * 0.2, R0 * 1.3, R0 * 1.15, R0 * 1.3, r(), r() * 6, 0, 0.8);
    }
    add('blob', 'l', MD.shade(g, 0.1), 0, H * 0.84, 0, R0 * 1.3, R0 * 1.1, R0 * 1.3, 0, r() * 6, 0, 1);
  };
  const pine = (snow) => (d, p, r, add) => {
    const W = d.w, H = d.h * 1.2, g = snow ? (isGreenish(p.top) ? p.top : 0x2a5a3a) : p.top;
    add('cyl', 'l', BARK, 0, 0, 0, W * 0.16, H * 0.3, W * 0.16);
    for (let i = 0; i < 3; i++) {
      const yb = H * (0.16 + i * 0.22), rad = W * (0.56 - i * 0.14), ht = H * (0.42 - i * 0.05), yaw = r() * 6;
      add('cone', 'l', MD.shade(g, i * 0.07), 0, yb, 0, rad * 2, ht, rad * 2, 0, yaw, 0, 0.3 + i * 0.25);
      if (snow) add('cone', 'l', 0xf2f6ff, 0, yb + ht * 0.44, 0, rad * 1.26, ht * 0.58, rad * 1.26, 0, yaw, 0, 0.3 + i * 0.25);
    }
  };
  const bare = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.15, c = p.all;
    add('taper', 'l', c, 0, 0, 0, W * 0.2, H * 0.62, W * 0.2);
    for (let i = 0; i < 5; i++) add('taper', 'l', MD.shade(c, (r() - 0.5) * 0.2), 0, H * (0.3 + r() * 0.28), 0, W * 0.07, H * (0.25 + r() * 0.15), W * 0.07, 0.5 + r() * 0.5, i * 1.25 + r() * 0.6, 0, 0.4);
  };
  const palm = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.2, seg = 6, lean = (r() - 0.5) * W * 0.3;
    let x = 0;
    for (let i = 0; i < seg; i++) { x = lean * Math.sin(i / seg * 1.4); add('cyl', 'l', MD.shade(p.base, i % 2 ? -0.1 : 0.05), x, H * 0.72 * i / seg, 0, W * 0.13, H * 0.72 / seg + 1, W * 0.13); }
    const tx = lean * Math.sin(1.4), ty = H * 0.72;
    for (let i = 0; i < 7; i++) add('box', 'l', MD.shade(0x3a8a3a, (r() - 0.5) * 0.25), tx, ty, 0, 4, W * 0.5, 1.2, Math.PI / 2 + 0.25 + r() * 0.3, i * 0.9 + r() * 0.3, 0, 1);
    add('blob', 'l', 0x6a4020, tx, ty - 1, 0, 5, 5, 5);
  };
  const bush = (k) => (d, p, r, add) => {
    const W = d.w * k, g = p.top;
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); add('blob', 'l', MD.shade(g, (r() - 0.5) * 0.2), Math.cos(a) * W * 0.18, W * 0.26 + i * 1.5, Math.sin(a) * W * 0.12, W * 0.55, W * 0.45, W * 0.55, r(), r() * 6, 0, 0.3); }
  };
  const rock = (tall, cap) => (d, p, r, add) => {
    const W = d.w, H = tall ? d.h * 1.1 : d.h * 0.8, c = p.all;
    add('rock', 'l', c, 0, H * 0.4, 0, W * 0.85, H * 0.95, W * 0.65, (r() - 0.5) * 0.3, r() * 6, 0);
    if (W > 26 || tall) add('rock', 'l', MD.shade(c, 0.08), W * (r() - 0.5) * 0.4, H * (tall ? 0.8 : 0.3), W * 0.2, W * 0.45, H * 0.45, W * 0.4, r(), r() * 6, 0);
    if (cap) add('rock', 'l', 0xf2f6ff, 0, H * 0.78, 0, W * 0.7, H * 0.3, W * 0.5, 0, r() * 6, 0);
  };
  const slab = (d, p, r, add) => add('box', 'l', p.all, 0, 0, 0, d.w * 0.75, d.h * 1.05, d.w * 0.45, (r() - 0.5) * 0.12, (r() - 0.5) * 0.5, (r() - 0.5) * 0.1);
  const crystal = (mat) => (d, p, r, add) => {
    const W = d.w, H = d.h * 1.15, c = p.all;
    add('shard', mat, c, 0, 0, 0, W * 0.34, H * 0.9, W * 0.34, (r() - 0.5) * 0.2, r() * 6, 0);
    for (let i = 0; i < 3; i++) add('shard', mat, MD.shade(c, (r() - 0.3) * 0.4), (r() - 0.5) * W * 0.5, 0, (r() - 0.5) * W * 0.3, W * 0.24, H * (0.35 + r() * 0.25), W * 0.24, 0.35 + r() * 0.3, i * 2.1 + r(), 0);
  };
  const spike = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.15, c = p.all;
    add('cone', 'l', c, 0, 0, 0, W * 0.7, H, W * 0.7, 0, r() * 6, 0);
    add('cone', 'l', MD.shade(c, -0.1), W * 0.3, 0, W * 0.1, W * 0.35, H * 0.45, W * 0.35, 0, r() * 6, 0);
  };
  const shroom = (mat, n) => (d, p, r, add) => {
    for (let i = 0; i < n; i++) {
      const k = i ? 0.55 : 1, W = d.w * (n > 1 ? 0.6 : 1) * k, H = d.h * 1.1 * k, ox = i ? (r() - 0.5) * d.w * 0.7 : 0, oz = i ? (r() - 0.3) * 6 : 0;
      add('cyl', 'l', 0xe8dcc0, ox, 0, oz, W * 0.24, H * 0.55, W * 0.24);
      add('dome', mat, p.top, ox, H * 0.5, oz, W * 0.95, H * 0.55, W * 0.95, 0, r() * 6, 0);
    }
  };
  const cactus = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.15, c = p.all;
    add('cyl', 'l', c, 0, 0, 0, W * 0.32, H * 0.85, W * 0.32); add('dome', 'l', c, 0, H * 0.85, 0, W * 0.32, W * 0.2, W * 0.32);
    add('cyl', 'l', c, -W * 0.28, H * 0.35, 0, W * 0.2, W * 0.28, W * 0.2, 0, 0, Math.PI / 2); add('cyl', 'l', c, -W * 0.36, H * 0.35, 0, W * 0.2, H * 0.3, W * 0.2);
    add('cyl', 'l', c, W * 0.26, H * 0.48, 0, W * 0.2, W * 0.24, W * 0.2, 0, 0, -Math.PI / 2); add('cyl', 'l', c, W * 0.33, H * 0.48, 0, W * 0.2, H * 0.22, W * 0.2);
  };
  const stump = (d, p, r, add) => { add('taper', 'l', p.all, 0, 0, 0, d.w * 0.62, d.h * 0.55, d.w * 0.62); add('cyl', 'l', 0xc8a070, 0, d.h * 0.55, 0, d.w * 0.4, 0.6, d.w * 0.4); };
  const log = (d, p, r, add) => { const L = d.w * 0.95, D = d.h * 0.72; add('cyl', 'l', p.all, L / 2, D / 2, 0, D, L, D, 0, (r() - 0.5) * 0.3, Math.PI / 2); };
  const barrel = (d, p, r, add) => {
    const W = d.w * 0.8, H = d.h * 0.95;
    add('cyl', 'l', p.all, 0, 0, 0, W, H, W);
    for (const y of [0.18, 0.72]) add('cyl', 'l', 0x3a3038, 0, H * y, 0, W * 1.05, 1.4, W * 1.05);
  };
  const crate = (d, p, r, add) => add('box', 'l', p.all, 0, 0, 0, d.w * 0.85, d.h * 0.8, d.w * 0.8, 0, (r() - 0.5) * 0.4, 0);
  const hay = (d, p, r, add) => add('dome', 'l', p.all, 0, 0, 0, d.w * 0.95, d.h * 1.5, d.w * 0.85, 0, r() * 6, 0);
  const pillar = (d, p, r, add) => {
    const W = d.w, H = d.h * 1.1, c = p.all;
    add('box', 'l', MD.shade(c, -0.1), 0, 0, 0, W * 0.9, 3, W * 0.9);
    add('cyl', 'l', c, 0, 3, 0, W * 0.62, H - 6, W * 0.62);
    add('box', 'l', MD.shade(c, 0.08), 0, H - 3, 0, W * 0.9, 3, W * 0.9);
  };
  const fence = (d, p, r, add) => {
    const c = p.all;
    for (const x of [-6, 6]) add('box', 'l', c, x, 0, 0, 2.5, 13, 2.5);
    for (const y of [4, 9]) add('box', 'l', MD.shade(c, 0.1), 0, y, 0, 16, 1.6, 1.4);
  };
  const stakes = (d, p, r, add) => {
    for (let x = -6; x <= 6; x += 4) { const h = 22 + r() * 5; add('cyl', 'l', p.all, x, 0, 0, 3.6, h, 3.6); add('cone', 'l', MD.shade(p.all, 0.1), x, h, 0, 3.6, 4, 3.6); }
  };

  const BUILD = {
    tree: tree, autumntree: tree, feytree: tree, mangrove: tree, swamptree: tree,
    pine: pine(false), snowpine: pine(true), deadtree: bare, charredtree: bare, palm: palm,
    bush: bush(1), thornbush: bush(0.9), dunebush: bush(1),
    rock: rock(false), boulder: rock(false), lavarock: rock(false), snowrock: rock(false, true), seastack: rock(true), floatrock: rock(true),
    standingstone: slab, grave: slab, obelisk: slab,
    crystal: crystal('g'), voidcrystal: crystal('g'), icecrystal: crystal('l'),
    stalagmite: spike, icespike: spike, obspike: spike,
    mushroom: shroom('l', 1), bigshroom: shroom('l', 1), glowshroom: shroom('g', 1), shroomcluster: shroom('l', 3),
    cactus: cactus, stump: stump, log: log, hollowlog: log, driftwood: log,
    barrel: barrel, crate: crate, haystack: hay,
    pillar: pillar, sandcolumn: pillar, citpillar: pillar, starpillar: pillar,
    fence: fence, palisade: stakes,
  };
  MD.has = (id) => !!BUILD[id];

  // Parts for one placed prop, with the placement baked into each matrix.
  MD.parts = function (pr) {
    if (pr._m3) return pr._m3;
    T = window.THREE;
    const d = R.Props[pr.id], p = palette(pr.id, pr.v || 0), r = R.U.rng('m3:' + Math.round(pr.x) + ',' + Math.round(pr.y));
    const out = [], e = new T.Euler(0, 0, 0, 'YXZ'), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
    BUILD[pr.id](d, p, r, (geo, mat, col, x, y, z, sx, sy, sz, rx, ry, rz, sway) => {
      e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e);
      const m = new T.Matrix4().compose(v.set(pr.x + x, y, pr.y + z), q, s.set(sx, sy, sz));
      out.push({ geo, mat, col: new T.Color(col), m, sway: sway || 0, h: y + sy });
    });
    return (pr._m3 = out);
  };
})(window.RPG);
