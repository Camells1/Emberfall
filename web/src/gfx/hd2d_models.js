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
      case 'petal': g = new T.SphereGeometry(0.5, 6, 4); break;
      case 'disc': g = new T.CylinderGeometry(0.5, 0.5, 1, 16); break;
      case 'prism': { g = new T.CylinderGeometry(0.5, 0.5, 1, 3, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 2); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -b.min.y, -(b.max.z + b.min.z) / 2); g.scale(1 / (b.max.x - b.min.x), 1 / (b.max.y - b.min.y), 1 / (b.max.z - b.min.z)); break; }
      case 'pyr': g = new T.ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0).scale(Math.SQRT2, 1, Math.SQRT2); break;
      case 'ring': g = new T.TorusGeometry(0.5, 0.08, 6, 20).rotateX(Math.PI / 2); break;
      case 'capsule': g = new T.CapsuleGeometry(0.5, 1, 3, 8).scale(1, 0.5, 1); break;
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
    // draw the prop's art into a CPU-side canvas (reading pixels back from a GPU canvas stalls a frame)
    const d = R.Props[id], w = d.w + 2, h = d.h + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cctx = cv.getContext('2d', { willReadFrequently: true }); cctx.translate(1, 1);
    try { d.draw(R.G.painter(cctx), R.U.rng(id + ':' + v), cctx, 0); } catch (e) { /* fall back to grey */ }
    const px = cctx.getImageData(0, 0, w, h).data;
    const ax = d.ax + 1, ay = d.ay + 1;
    const regions = { top: new Map(), base: new Map(), all: new Map(), low: new Map() };
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
      if (y > ay * 0.6 && y < ay - 2) add(regions.low);
      if (L > lightL) { lightL = L; light = c; }
    }
    const best = (m, fb) => { let b = null; for (const v2 of m.values()) if (!b || v2[3] > b[3]) b = v2; return b ? (Math.round(b[0] / b[3]) << 16) | (Math.round(b[1] / b[3]) << 8) | Math.round(b[2] / b[3]) : fb; };
    const all = best(regions.all, 0x808080);
    let sat = all, satV = -1;
    for (const v2 of regions.all.values()) { if (v2[3] < 2) continue; const r = v2[0] / v2[3], g = v2[1] / v2[3], b = v2[2] / v2[3], sv = Math.max(r, g, b) - Math.min(r, g, b) - (g > r && g > b ? 60 : 0); if (sv > satV) { satV = sv; sat = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b); } }
    p = { all, top: best(regions.top, all), base: best(regions.base, all), low: best(regions.low, all), light, sat };
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

  // small plants and bits
  const flowers = (bell) => (d, p, r, add) => {
    const cols = [p.sat, MD.shade(p.sat, 0.25), p.light];
    for (let i = 0; i < 5; i++) {
      const x = (r() - 0.5) * d.w * 0.8, z = (r() - 0.5) * 7, h = 3 + r() * 3, c = cols[i % 3];
      add('cyl', 'n', 0x4a8a3a, x, 0, z, 0.45, h, 0.45, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3, 0.3);
      if (bell) add('cone', 'l', c, x, h - 1.4, z, 1.6, 1.8, 1.6, Math.PI, 0, 0, 0.3);
      else { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + r(); add('petal', 'l', c, x + Math.cos(a) * 0.9, h, z + Math.sin(a) * 0.9, 1.6, 0.6, 1.1, 0, -a, 0, 0.3); } add('petal', 'g', 0xffe060, x, h + 0.2, z, 0.8, 0.6, 0.8, 0, 0, 0, 0.3); }
    }
  };
  const reeds = (d, p, r, add) => { for (let i = 0; i < 7; i++) { const x = (r() - 0.5) * d.w * 0.8, z = (r() - 0.5) * 6, h = d.h * (0.7 + r() * 0.5); add('cone', 'l', MD.shade(0x5a8a3a, (r() - 0.5) * 0.2), x, 0, z, 0.8, h, 0.6, (r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25, 0.8); if (r() < 0.5) add('cyl', 'l', 0x6a4a2a, x, h * 0.6, z, 0.7, 3, 0.7, 0, 0, 0, 0.8); } };
  const seaweed = (d, p, r, add) => { for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 2.5; let y = 0; for (let k = 0; k < 4; k++) { add('petal', 'l', MD.shade(0x3a8a5a, k * 0.06), x + Math.sin(k * 1.4 + i) * 1.2, y + 2, 0, 1.6, 4.4, 1, 0, 0, Math.sin(k + i) * 0.3, 0.6 + k * 0.2); y += 3.8; } } };
  const coral = (d, p, r, add) => { const c = p.sat; add('rock', 'l', 0x8a8070, 0, 1, 0, d.w * 0.5, 2.5, d.w * 0.4); for (let i = 0; i < 6; i++) { const a = i * 1.05 + r(); add('cone', 'l', MD.shade(c, (r() - 0.5) * 0.3), Math.cos(a) * 3, 1.5, Math.sin(a) * 2.5, 1.3, 6 + r() * 6, 1.3, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); add('petal', 'l', MD.shade(c, 0.2), Math.cos(a) * 4.5, 8 + r() * 4, Math.sin(a) * 3.8, 1.8, 1.8, 1.8); } };
  const lily = (d, p, r, add) => { add('disc', 'n', 0x3a8a4a, 0, 0.4, 0, d.w * 0.95, 0.4, d.w * 0.7); add('petal', 'l', 0xf0a0c0, 1, 1.3, 0, 1.6, 1.2, 1.6); add('petal', 'g', 0xffe060, 1, 1.9, 0, 0.6); };
  const sporepod = (d, p, r, add) => { const c = p.sat; add('cyl', 'l', 0x6a5a4a, 0, 0, 0, 2, 5, 2); add('dome', 'l', c, 0, 5, 0, 12, 9, 12); for (let i = 0; i < 6; i++) add('petal', 'g', 0xc0ff60, Math.cos(i) * 3.4, 7.5 + (i % 2) * 1.2, Math.sin(i) * 3.4, 1.2, 1.2, 1.2); };
  const bones = (d, p, r, add) => { for (let i = 0; i < 4; i++) add('cyl', 'l', 0xe8e0c8, (r() - 0.5) * d.w * 0.6, 0.8, (r() - 0.5) * 6, 1.2, d.w * 0.4, 1.2, Math.PI / 2, r() * 6, 0); add('petal', 'l', 0xf0ead8, 0, 2.5, 0, 5, 4.5, 5); };
  const skulls = (d, p, r, add) => { for (let i = 0; i < 5; i++) { const x = (i - 2) * 3.5, y = i === 2 ? 5 : 2; add('petal', 'l', 0xe8e0c8, x, y, (i % 2) * 2, 4.4, 4, 4.4, 0, r() - 0.5, 0); add('petal', 'n', 0x201818, x - 0.8, y + 0.3, (i % 2) * 2 + 1.8, 1, 1, 0.6); add('petal', 'n', 0x201818, x + 0.8, y + 0.3, (i % 2) * 2 + 1.8, 1, 1, 0.6); } };
  const shell = (d, p, r, add) => { add('dome', 'l', p.sat, 0, 0, 0, d.w * 0.9, d.h * 1.2, d.w * 0.8, 0, r() * 6, 0); };
  const crops = (d, p, r, add) => { for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * 5, z = (Math.floor(i / 3) - 0.5) * 6; add('cone', 'l', 0x5a9a3a, x, 0, z, 2.4, 5 + r() * 2, 2.4, 0, r() * 6, 0, 0.4); add('petal', 'l', p.sat, x, 1, z + 1, 1.8, 1.8, 1.8); } };
  const woodpile = (d, p, r, add) => { for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) add('cyl', 'l', MD.shade(0x8a5a30, (i + row) % 2 * 0.1), -7 + i * 4.6 + row * 2.3, 2.2 + row * 3.8, 0, 2.2, 12, 2.2, Math.PI / 2, 0, 0); };
  const rootpillar = (d, p, r, add) => { const c = p.all; for (let i = 0; i < 4; i++) add('taper', 'l', MD.shade(c, (i % 2) * 0.1), Math.cos(i * 1.6) * 2, 0, Math.sin(i * 1.6) * 2, d.w * 0.28, d.h * (1 - i * 0.1), d.w * 0.28, Math.sin(i * 1.6) * 0.15, 0, -Math.cos(i * 1.6) * 0.15); };

  // ---- buildings and objects ----------------------------------------------------------------
  const WARM = 0xffd890, DARK = 0x2a1a14, STONE = 0x8a8a92, WOOD = 0x7a5030, IRON = 0x5a5a64;
  // a house: stone footing, walls, gable roof, door, lit windows, chimney. Footprint = the collision box.
  const house = (o) => (d, p, r, add) => {
    const bx = d.box || [-d.w / 2, -20, d.w, 20], W = bx[2], D = Math.max(bx[3], 16), z0 = bx[1] + bx[3], cz = z0 - D / 2;
    const Hw = d.h * (o.wall || 0.42), Hr = d.h * (o.roof || 0.34), wall = o.wallCol || p.low, roof = o.roofCol || p.top;
    add('box', 'l', STONE, 0, 0, cz, W + 1.5, 2.2, D + 1.5);
    add('box', 'l', wall, 0, 2, cz, W, Hw - 2, D);
    for (const s of [-1, 1]) add('box', 'l', MD.shade(wall, -0.25), s * (W / 2 - 0.8), 2, z0 - 0.4, 1.8, Hw - 2, 1.2); // corner beams
    add('box', 'l', MD.shade(wall, -0.25), 0, Hw - 1.4, z0 - 0.4, W, 1.4, 1.2);
    add('prism', 'l', roof, 0, Hw - 0.5, cz, W + 5, Hr, D + 6);
    add('box', 'l', DARK, 0, 2, z0 + 0.1, Math.min(10, W * 0.2), Math.min(Hw * 0.62, 14), 1);
    add('box', 'l', MD.shade(WOOD, 0.1), 0, 2, z0 + 0.25, Math.min(8.4, W * 0.17), Math.min(Hw * 0.58, 13), 0.8);
    const nw = W > 70 ? 4 : 2;
    for (let i = 0; i < nw; i++) {
      const x = (i - (nw - 1) / 2) * (W / (nw + 0.4)); if (Math.abs(x) < 8) continue;
      add('box', 'l', MD.shade(wall, -0.35), x, Hw * 0.42, z0 + 0.1, 8, 7, 0.8);
      add('box', 'g', WARM, x, Hw * 0.42 + 0.8, z0 + 0.35, 6, 5.4, 0.6);
      add('box', 'l', MD.shade(wall, -0.35), x, Hw * 0.42 + 3.1, z0 + 0.5, 6.2, 0.6, 0.6);
    }
    if (o.chimney !== false) { add('box', 'l', STONE, W * 0.28, Hw, cz - D * 0.15, 5, Hr * 1.05, 5); add('box', 'l', MD.shade(STONE, -0.3), W * 0.28, Hw + Hr * 1.05, cz - D * 0.15, 5.6, 1.2, 5.6); }
    if (o.sign) { add('cyl', 'l', IRON, W * 0.36, Hw * 0.55, z0 + 3.5, 0.4, 5, 0.4, Math.PI / 2); add('box', 'l', o.sign, W * 0.36, Hw * 0.3, z0 + 6, 6, 5, 0.8); }
    if (o.anvil) { add('box', 'l', IRON, -W * 0.34, 0, z0 + 6, 6, 3.4, 3); add('box', 'l', MD.shade(IRON, 0.2), -W * 0.34, 3.4, z0 + 6, 8, 1.6, 3.4); }
  };
  const tower = (d, p, r, add) => { const R2 = d.w * 0.42, H = d.h * 0.72; add('taper', 'l', p.low, 0, 0, -R2 * 0.8, R2 * 2.1, H, R2 * 2.1); add('cyl', 'l', MD.shade(p.low, -0.2), 0, H, -R2 * 0.8, R2 * 2.3, 2, R2 * 2.3); add('cone', 'l', p.top, 0, H + 2, -R2 * 0.8, R2 * 2.5, d.h * 0.35, R2 * 2.5); for (const y of [0.35, 0.6]) add('box', 'g', WARM, 0, H * y, R2 * 0.2, 4, 6, 1); add('box', 'l', DARK, 0, 0, R2 * 0.25, 7, 11, 1); };
  const lighthouse = (d, p, r, add) => { const H = d.h * 0.78; for (let i = 0; i < 5; i++) add('taper', 'l', i % 2 ? 0xe03030 : 0xf4f0e8, 0, H * i / 5, -8, 20 - i * 1.6, H / 5 + 0.2, 20 - i * 1.6); add('cyl', 'l', IRON, 0, H, -8, 14, 2, 14); add('cyl', 'g', 0xfff0a0, 0, H + 2, -8, 9, 8, 9); add('cone', 'l', 0xe03030, 0, H + 10, -8, 13, 8, 13); };
  const hut = (stilts) => (d, p, r, add) => { const bx = d.box, W = bx[2], y0 = stilts ? 16 : 0, cz = bx[1] + bx[3] / 2 - (stilts ? 6 : 0); if (stilts) for (const x of [-1, 1]) for (const z of [-1, 1]) add('cyl', 'l', WOOD, x * W * 0.35, 0, cz + z * 8, 1.6, y0, 1.6); add('cyl', 'l', p.low, 0, y0, cz, W * 0.85, d.h * 0.28, W * 0.7); add('cone', 'l', p.top, 0, y0 + d.h * 0.28 - 1, cz, W * 1.1, d.h * 0.4, W * 0.95); add('box', 'l', DARK, 0, y0, cz + W * 0.34, 7, 10, 1); };
  const mill = (d, p, r, add) => { add('taper', 'l', p.low, 0, 0, -10, 30, d.h * 0.5, 26); add('cone', 'l', p.top, 0, d.h * 0.5, -10, 32, d.h * 0.22, 28); add('box', 'l', DARK, 0, 0, 3.4, 7, 11, 1); for (let i = 0; i < 4; i++) add('box', 'l', 0xe8e0d0, 0, d.h * 0.52, 5, 4.5, d.h * 0.42, 0.6, 0, 0, i * Math.PI / 2 + 0.4); add('cyl', 'l', WOOD, 0, d.h * 0.52, 3, 2.4, 3, 2.4, Math.PI / 2); };
  const temple = (d, p, r, add) => { const bx = d.box, W = bx[2], D = bx[3], cz = bx[1] + D / 2, H = d.h * 0.46; for (let i = 0; i < 3; i++) add('box', 'l', MD.shade(STONE, 0.1 - i * 0.05), 0, i * 2, cz + 3 - i * 1.5, W + 8 - i * 4, 2, D + 6 - i * 3); add('box', 'l', p.low, 0, 6, cz - 4, W - 10, H, D - 10); for (let i = 0; i < 6; i++) add('cyl', 'l', 0xe8e4dc, -W / 2 + 6 + i * (W - 12) / 5, 6, cz + D / 2 - 4, 3.6, H, 3.6); add('box', 'l', 0xe0dcd4, 0, 6 + H, cz, W + 2, 3, D + 2); add('prism', 'l', p.top, 0, 9 + H, cz, W + 2, d.h * 0.22, D + 2); add('box', 'l', DARK, 0, 6, cz + D / 2 - 9.5, 10, H * 0.7, 1); };
  const mausoleum = (d, p, r, add) => { const bx = d.box, W = bx[2], D = bx[3], cz = bx[1] + D / 2; add('box', 'l', STONE, 0, 0, cz, W, 3, D + 4); add('box', 'l', p.low, 0, 3, cz - 2, W - 8, d.h * 0.45, D - 4); for (const s of [-1, 1]) add('cyl', 'l', 0xd8d4cc, s * (W / 2 - 8), 3, cz + D / 2 - 1, 3.2, d.h * 0.45, 3.2); add('prism', 'l', p.top, 0, 3 + d.h * 0.45, cz, W, d.h * 0.2, D + 2); add('box', 'l', DARK, 0, 3, cz + D / 2 - 3.8, 12, d.h * 0.32, 1); add('shard', 'g', 0x80ff90, 0, 3 + d.h * 0.65, cz + D / 2, 2, 5, 2); };
  const pyramid = (d, p, r, add) => { const bx = d.box; add('pyr', 'l', p.all, 0, 0, bx[1] + bx[3] / 2 - 10, bx[2], d.h * 0.9, bx[2] * 0.75); add('box', 'l', DARK, 0, 0, bx[1] + bx[3] - 2, 14, 16, 4); };
  const stall = (d, p, r, add) => { const c = p.sat; for (const x of [-1, 1]) for (const z of [-1, 1]) add('cyl', 'l', WOOD, x * 20, 0, -6 + z * 5, 1, d.h * 0.62, 1); add('box', 'l', WOOD, 0, 0, -2, 40, 9, 8); for (let i = 0; i < 6; i++) add('petal', 'l', [0xe04030, 0xf0c030, 0x60c040, 0xf08030][i % 4], -15 + i * 6, 10, -1, 3.8, 3.2, 3.8); for (let i = 0; i < 6; i++) add('box', 'l', i % 2 ? 0xf4f0e8 : c, -17.5 + i * 7, d.h * 0.62, -4, 7, 1, 16, -0.25); };
  const tent = (d, p, r, add) => { add('prism', 'l', p.all, 0, 0, -6, d.w * 0.85, d.h * 0.85, 22); add('box', 'l', DARK, 0, 0, 5, 6, d.h * 0.5, 0.6, -0.3); };
  const pavilion = (d, p, r, add) => { const W = d.box[2]; for (const x of [-1, 1]) for (const z of [-1, 1]) add('cyl', 'l', 0xe8e0d0, x * (W / 2 - 3), 0, -9 + z * 8, 2, d.h * 0.5, 2); add('box', 'l', STONE, 0, 0, -9, W, 1.4, 22); add('pyr', 'l', p.top, 0, d.h * 0.5, -9, W + 6, d.h * 0.38, 28); };
  const gate = (d, p, r, add) => { for (const s of [-1, 1]) { add('box', 'l', STONE, s * 34, 0, -4, 18, d.h * 0.85, 16); add('cone', 'l', p.top, s * 34, d.h * 0.85, -4, 22, 14, 20); } add('box', 'l', MD.shade(STONE, 0.08), 0, d.h * 0.55, -4, 52, 10, 12); for (let i = 0; i < 5; i++) add('box', 'l', STONE, -20 + i * 10, d.h * 0.55 + 10, 1, 5, 4, 3); };
  const well = (d, p, r, add) => { add('cyl', 'l', STONE, 0, 0, -3, 20, 8, 16); add('disc', 'g', 0x3070c0, 0, 7.5, -3, 16, 0.4, 12.5); for (const s of [-1, 1]) add('box', 'l', WOOD, s * 9, 0, -3, 2, 22, 2); add('prism', 'l', p.top, 0, 20, -3, 24, 7, 18); add('cyl', 'l', WOOD, 0, 16, -3, 1.2, 18, 1.2, 0, 0, Math.PI / 2); };
  const fountain = (d, p, r, add) => { add('cyl', 'l', STONE, 0, 0, -6, 42, 6, 26); add('disc', 'g', 0x60a8ff, 0, 5.2, -6, 38, 0.6, 22); add('cyl', 'l', MD.shade(STONE, 0.1), 0, 0, -6, 6, 18, 6); add('cyl', 'l', STONE, 0, 16, -6, 16, 3, 12); add('disc', 'g', 0x80c0ff, 0, 18.7, -6, 13, 0.5, 9); add('cone', 'g', 0xc0e8ff, 0, 18, -6, 3, 9, 3); };
  const statue = (col) => (d, p, r, add) => { const c = col || p.all; add('box', 'l', STONE, 0, 0, 0, d.w * 0.75, 7, d.w * 0.6); add('capsule', 'l', c, 0, 17, 0, 8.8, 14, 6.8); add('petal', 'l', c, 0, d.h * 0.72, 0.5, 6, 6.4, 6); for (const s of [-1, 1]) add('capsule', 'l', c, s * 5.5, 17, 0.5, 3.2, 10, 3.2, 0, 0, s * 0.2); if (col === 0x1a1a24) { for (const s of [-1, 1]) add('cone', 'l', c, s * 1.8, d.h * 0.8, 0, 1.2, 7, 0.8); add('box', 'l', 0xe0b030, 0, 17, 3.2, 7, 2, 1); } };
  const lamp = (d, p, r, add) => { add('cyl', 'l', 0x2a2a30, 0, 0, 0, 1.4, d.h * 0.78, 1.4); add('box', 'l', 0x2a2a30, 0, d.h * 0.76, 0, 5, 1, 5); add('box', 'g', WARM, 0, d.h * 0.78, 0, 3.8, 5, 3.8); add('pyr', 'l', 0x2a2a30, 0, d.h * 0.78 + 5, 0, 5.4, 3, 5.4); };
  const flame = (add, x, y, z, s) => { add('cone', 'g', 0xff8020, x, y, z, 3 * s, 7 * s, 3 * s, 0, 0, 0, 0.6); add('cone', 'g', 0xffe060, x, y, z, 1.8 * s, 5 * s, 1.8 * s, 0, 0, 0, 0.6); };
  const torch = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 1.2, d.h * 0.8, 1.2); flame(add, 0, d.h * 0.8, 0, 0.8); };
  const brazier = (d, p, r, add) => { add('cyl', 'l', IRON, 0, 0, 0, 3, 8, 3); add('taper', 'l', IRON, 0, 12, 0, 12, 4, 12, Math.PI); flame(add, 0, 9, 0, 1.2); };
  const campfire = (d, p, r, add) => { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; add('rock', 'l', STONE, Math.cos(a) * 6, 1, Math.sin(a) * 4.5, 3, 2.4, 3); } for (let i = 0; i < 3; i++) add('cyl', 'l', WOOD, 0, 1, 0, 1.4, 10, 1.4, Math.PI / 2 - 0.3, i * 1.05, 0); flame(add, 0, 1.5, 0, 1.3); };
  const signpost = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 1.3, d.h * 0.85, 1.3); add('box', 'l', MD.shade(WOOD, 0.2), 0, d.h * 0.5, 0.8, d.w * 0.95, 7, 1); };
  const notice = (d, p, r, add) => { for (const s of [-1, 1]) add('cyl', 'l', WOOD, s * 12, 0, 0, 1.4, d.h * 0.85, 1.4); add('box', 'l', MD.shade(WOOD, 0.15), 0, d.h * 0.3, 0.6, 28, 16, 1); add('prism', 'l', MD.shade(WOOD, -0.1), 0, d.h * 0.85, 0.3, 32, 4, 4); for (let i = 0; i < 4; i++) add('box', 'l', 0xf0e8d0, -8 + i * 5.5, d.h * 0.35 + (i % 2) * 5, 1.2, 4, 5, 0.3); };
  const banner = (d, p, r, add) => { add('cyl', 'l', 0x3a3a40, 0, 0, 0, 1, d.h, 1); add('box', 'l', p.sat, 3.5, d.h * 0.35, 0, 7, d.h * 0.55, 0.5, 0, 0, 0, 0.5); add('petal', 'l', 0xe0b030, 0, d.h, 0, 1.6, 1.6, 1.6); };
  const bench = (d, p, r, add) => { add('box', 'l', WOOD, 0, 4, 0, d.w * 0.85, 1.4, 6); for (const s of [-1, 1]) add('box', 'l', MD.shade(WOOD, -0.2), s * d.w * 0.35, 0, 0, 1.6, 4, 5); add('box', 'l', WOOD, 0, 4, -2.8, d.w * 0.85, 5, 1); };
  const table = (d, p, r, add) => { add('box', 'l', WOOD, 0, 8, -3, d.w * 0.9, 1.5, 14); for (const x of [-1, 1]) for (const z of [-1, 1]) add('box', 'l', MD.shade(WOOD, -0.2), x * d.w * 0.38, 0, -3 + z * 5.5, 1.6, 8, 1.6); add('cyl', 'l', 0xe8e0d0, -4, 9.5, -3, 3, 1, 3); add('cyl', 'l', 0xc0a060, 5, 9.5, -2, 1.6, 3, 1.6); };
  const bed = (d, p, r, add) => { add('box', 'l', WOOD, 0, 0, -12, 16, 5, 25); add('box', 'l', p.sat, 0, 5, -10, 15, 2, 20); add('box', 'l', 0xf4f0e8, 0, 6.5, -21, 11, 2.4, 4.4); add('box', 'l', MD.shade(WOOD, -0.1), 0, 0, -24.5, 16, 12, 1.6); };
  const shelf = (d, p, r, add) => { add('box', 'l', WOOD, 0, 0, -4, d.w * 0.95, d.h * 0.9, 7); for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) add('box', 'l', [0xa03030, 0x3050a0, 0x40803a, 0xc09040, 0x6a3a8a][(i + row) % 5], -9 + i * 3.6, 3 + row * 9, -0.3, 2.6, 7, 1); };
  const anvil = (d, p, r, add) => { add('box', 'l', WOOD, 0, 0, 0, 8, 5, 6); add('box', 'l', IRON, 0, 5, 0, 5, 3, 4); add('box', 'l', MD.shade(IRON, 0.2), 1, 8, 0, 14, 3, 5); add('cone', 'l', MD.shade(IRON, 0.2), -7, 9.5, 0, 2.4, 5, 2.4, 0, 0, Math.PI / 2); };
  const forge = (d, p, r, add) => { add('box', 'l', STONE, 0, 0, -3, 30, 16, 14); add('box', 'g', 0xff7020, 0, 6, 4.2, 12, 6, 0.6); add('box', 'l', STONE, 6, 16, -6, 7, d.h * 0.5, 7); flame(add, 0, 16, -3, 0.8); };
  const cauldron = (d, p, r, add) => { add('petal', 'l', 0x2a2a30, 0, 7, 0, 18, 13, 18); add('disc', 'g', p.sat || 0x80ff60, 0, 12.5, 0, 14, 0.5, 14); for (let i = 0; i < 3; i++) add('petal', 'g', 0xc0ff90, -3 + i * 3, 13.5, (i - 1) * 2, 2, 2, 2, 0, 0, 0, 0.5); };
  const weaponrack = (d, p, r, add) => { for (const s of [-1, 1]) add('box', 'l', WOOD, s * 12, 0, 0, 2, 18, 2); add('box', 'l', WOOD, 0, 15, 0, 26, 2, 2); for (let i = 0; i < 4; i++) add('box', 'l', 0xc8ccd4, -8 + i * 5.3, 2, 1.4, 1.2, 16, 0.4, 0.1); };
  const armorstand = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 1.2, 20, 1.2); add('capsule', 'l', 0x9aa0aa, 0, 17, 0, 9, 9, 6); add('petal', 'l', 0x9aa0aa, 0, 26, 0, 6, 6.4, 6); add('box', 'l', WOOD, 0, 0, 0, 10, 1.6, 6); };
  const cart = (d, p, r, add) => { add('box', 'l', WOOD, 0, 6, -2, d.w * 0.7, 8, 16); for (const s of [-1, 1]) add('cyl', 'l', MD.shade(WOOD, -0.25), s * d.w * 0.36, 7, -2, 12, 1.6, 12, 0, 0, Math.PI / 2); add('cyl', 'l', WOOD, d.w * 0.35, 7, -2, 1, 16, 1, 0, 0, -Math.PI / 2 + 0.2); };
  const boat = (d, p, r, add) => { add('petal', 'l', WOOD, 0, 3, -4, d.w * 0.9, 8, 18); add('box', 'l', MD.shade(WOOD, 0.2), 0, 5, -4, d.w * 0.75, 1, 12); };
  const post = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 3, d.h * 0.9, 3); add('ring', 'l', 0xc8b080, 0, d.h * 0.6, 0, 3.6, 6, 3.6); };
  const anchor = (d, p, r, add) => { add('box', 'l', IRON, 0, 0, 0, 2, 18, 2); add('box', 'l', IRON, 0, 14, 0, 10, 1.8, 1.8); add('ring', 'l', IRON, 0, 3, 0, 14, 16, 14, Math.PI / 2); };
  const buoy = (d, p, r, add) => { add('petal', 'l', 0xe03030, 0, 4, 0, 9, 8, 9); add('cone', 'l', 0xf4f0e8, 0, 6, 0, 5, 9, 5); add('petal', 'g', WARM, 0, 15, 0, 2, 2, 2); };
  const fishrack = (d, p, r, add) => { for (const s of [-1, 1]) add('box', 'l', WOOD, s * 13, 0, 0, 1.6, 20, 1.6); add('cyl', 'l', WOOD, 14, 18, 0, 1, 28, 1, 0, 0, Math.PI / 2); for (let i = 0; i < 4; i++) add('petal', 'l', 0x9ab0c0, -9 + i * 6, 12, 0, 2.6, 7, 1.4); };
  const crabtrap = (d, p, r, add) => { add('box', 'l', WOOD, 0, 0, 0, 14, 8, 10); for (let i = 0; i < 4; i++) add('box', 'l', 0xc8b080, -6 + i * 4, 0, 5.2, 0.6, 8, 0.4); };
  const shipwreck = (d, p, r, add) => { add('petal', 'l', WOOD, 0, 6, -8, d.w * 0.85, 20, 30, 0, 0.4, 0.3); add('cyl', 'l', MD.shade(WOOD, 0.1), 6, 6, -10, 2, d.h * 0.8, 2, 0.2, 0, -0.4); add('box', 'l', 0xe0d8c0, 14, d.h * 0.45, -10, 1, 18, 12, 0, 0, -0.4); };
  const ruinwall = (d, p, r, add) => { const c = p.all; for (let i = 0; i < 4; i++) add('box', 'l', MD.shade(c, (i % 2) * 0.08), -12 + i * 8, 0, -3, 7.6, d.h * (0.9 - (i % 3) * 0.2), 7); add('rock', 'l', c, 8, 1.5, 4, 4, 3, 4); };
  const castlewall = (d, p, r, add) => { const c = p.all; add('box', 'l', c, 0, 0, -6, d.w, d.h * 0.8, 12); for (let i = 0; i < 4; i++) add('box', 'l', MD.shade(c, 0.08), -18 + i * 12, d.h * 0.8, -1, 7, 6, 4); };
  const throne = (d, p, r, add) => { add('box', 'l', STONE, 0, 0, -3, 30, 4, 20); add('box', 'l', p.sat, 0, 4, -3, 16, 8, 12); add('box', 'l', 0xe0b030, 0, 4, -9, 18, d.h * 0.8, 3); for (const s of [-1, 1]) add('shard', 'l', 0xe0b030, s * 8, d.h * 0.8, -9, 3, 7, 3); };
  const altar = (d, p, r, add) => { add('box', 'l', STONE, 0, 0, -3, 30, 11, 14); add('box', 'l', MD.shade(STONE, 0.12), 0, 11, -3, 32, 2, 16); add('shard', 'g', p.sat, 0, 13, -3, 3, 8, 3); for (const s of [-1, 1]) add('cyl', 'g', WARM, s * 12, 13, -3, 1, 3, 1); };
  const coffin = (d, p, r, add) => { add('box', 'l', p.all, 0, 0, -11, 13, 6, 26); add('box', 'l', MD.shade(p.all, 0.15), 0, 6, -11, 14, 1.4, 27); add('box', 'l', 0xd8c890, 0, 7.4, -8, 1.4, 0.4, 10); add('box', 'l', 0xd8c890, 0, 7.4, -6, 6, 0.4, 1.4); };
  const urn = (d, p, r, add) => { add('petal', 'l', p.all, 0, 6, 0, 11, 12, 11); add('cyl', 'l', MD.shade(p.all, 0.1), 0, 10, 0, 4.5, 5, 4.5); };
  const goldpile = (d, p, r, add) => { for (let i = 0; i < 9; i++) add('petal', 'l', 0xf0c030, (r() - 0.5) * 16, 1 + (i % 3) * 1.5, (r() - 0.5) * 8, 5 - (i % 3), 3, 5 - (i % 3)); add('box', 'l', 0xe0b030, 4, 3, 1, 5, 4, 4, 0, 0.5, 0); };
  const candles = (d, p, r, add) => { for (let i = 0; i < 4; i++) { const x = -5 + i * 3.4, h = 4 + (i % 3) * 2; add('cyl', 'l', 0xf4ecd8, x, 0, (i % 2) * 2, 1.8, h, 1.8); add('cone', 'g', 0xffd060, x, h, (i % 2) * 2, 0.8, 2, 0.8, 0, 0, 0, 0.4); } };
  const cross = (d, p, r, add) => { add('box', 'l', p.all, 0, 0, 0, 2.4, d.h * 0.95, 2); add('box', 'l', p.all, 0, d.h * 0.62, 0, 10, 2.2, 2); };
  const snowman = (d, p, r, add) => { add('petal', 'l', 0xf4f8ff, 0, 5, 0, 16, 12, 14); add('petal', 'l', 0xf4f8ff, 0, 14, 0, 11, 10, 10); add('petal', 'l', 0xf4f8ff, 0, 21, 0, 8, 8, 8); add('cone', 'l', 0xf08020, 0, 21, 3.5, 1, 4, 1, Math.PI / 2); add('cyl', 'l', 0x202028, 0, 24, 0, 6, 5, 6); add('cyl', 'l', 0x202028, 0, 24, 0, 9, 0.8, 9); };
  const iceblock = (d, p, r, add) => { add('box', 'l', 0x6a7080, 0, 0, 0, 10, 28, 7); add('petal', 'l', 0x6a7080, 0, 32, 0, 8, 8, 8); add('box', 'f', 0xc0e8ff, 0, 0, 0, 20, d.h, 14); };
  const cage = (d, p, r, add) => { add('box', 'l', IRON, 0, 0, 0, 18, 2, 12); add('box', 'l', IRON, 0, d.h * 0.85, 0, 18, 2, 12); for (let i = 0; i < 5; i++) for (const z of [-5, 5]) add('cyl', 'l', IRON, -8 + i * 4, 0, z, 0.6, d.h * 0.85, 0.6); };
  const eggsac = (d, p, r, add) => { for (let i = 0; i < 5; i++) add('petal', 'l', 0xe8e0c8, (i % 3 - 1) * 5, 3 + Math.floor(i / 3) * 4, (i % 2) * 3, 7, 7, 7); add('petal', 'g', 0x80ff40, 0, 5, 3, 2, 2, 2); };
  const cocoon = (d, p, r, add) => { add('capsule', 'l', 0xe8e4d8, 0, 12, 0, 10, 20, 9); for (let i = 0; i < 4; i++) add('ring', 'l', 0xd8d0c0, 0, 6 + i * 4, 0, 10, 6, 9); };
  const rune = (d, p, r, add) => { add('disc', 'g', p.sat, 0, 0.3, -2, 30, 0.3, 18); add('disc', 'l', STONE, 0, 0, -2, 34, 0.25, 21); };
  const portal = (d, p, r, add) => { add('ring', 'g', p.sat, 0, d.h * 0.45, 0, d.w * 0.8, d.w * 0.8, 16, Math.PI / 2); add('disc', 'f', MD.shade(p.sat, -0.3), 0, d.h * 0.45, 0, d.w * 0.75, 0.5, d.w * 0.75, Math.PI / 2); add('box', 'l', STONE, 0, 0, 0, d.w * 0.9, 3, 10); };
  const fairyring = (d, p, r, add) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add('cyl', 'l', 0xf0e8d0, Math.cos(a) * 16, 0, Math.sin(a) * 9, 1.2, 3, 1.2); add('dome', 'g', i % 2 ? 0xff80e0 : 0xc0a0ff, Math.cos(a) * 16, 3, Math.sin(a) * 9, 4, 3, 4); } };
  const scarecrow = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 1.4, d.h * 0.95, 1.4); add('cyl', 'l', WOOD, 9, d.h * 0.6, 0, 1.2, 18, 1.2, 0, 0, Math.PI / 2); add('capsule', 'l', 0x8a6a3a, 0, d.h * 0.55, 0.5, 8, 9, 6); add('petal', 'l', 0xe0c070, 0, d.h * 0.85, 0.5, 6, 6, 6); add('cone', 'l', 0x6a4a2a, 0, d.h * 0.95, 0.5, 9, 5, 9); };
  const dummy = (d, p, r, add) => { add('cyl', 'l', WOOD, 0, 0, 0, 1.4, 12, 1.4); add('capsule', 'l', 0xc8a870, 0, 17, 0, 10, 12, 8); add('petal', 'l', 0xc8a870, 0, 28, 0, 6, 6, 6); add('cyl', 'l', 0xc8a870, 8, 21, 0, 1.4, 16, 1.4, 0, 0, Math.PI / 2); };
  const bedroll = (d, p, r, add) => { add('box', 'l', p.sat, 0, 0, -10, 12, 1.6, 22); add('capsule', 'l', MD.shade(p.sat, -0.2), 0, 2, -20, 4.8, 12, 4.8, 0, 0, Math.PI / 2); };
  const ribcage = (d, p, r, add) => { add('cyl', 'l', 0xe8e0c8, d.w * 0.45, 3, -2, 2, d.w * 0.9, 2, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) add('ring', 'l', 0xe8e0c8, -16 + i * 6.4, 3, -2, 2, 24 - Math.abs(i - 2.5) * 4, 14 - Math.abs(i - 2.5) * 2, 0, 0, Math.PI / 2); };
  const vent = (d, p, r, add) => { add('taper', 'l', 0x3a3038, 0, 0, 0, 16, 16, 16); add('disc', 'g', 0xff7020, 0, 16, 0, 7, 0.4, 7); };
  const lavapillar = (d, p, r, add) => { add('taper', 'l', 0x3a2a28, 0, 0, 0, 14, d.h * 0.95, 14); for (let i = 0; i < 3; i++) add('box', 'g', 0xff6020, (i - 1) * 3, 6 + i * 7, 5.5, 0.8, 7, 0.6, 0, 0, (i - 1) * 0.4); };
  const doorway = (dark) => (d, p, r, add) => { add('box', 'l', p.all, 0, 0, -6, d.w * 0.95, d.h * 0.85, 10); add('box', 'l', dark, 0, 0, -0.8, d.w * 0.5, d.h * 0.6, 1); };
  const stairs = (d, p, r, add) => { for (let i = 0; i < 4; i++) add('box', 'l', MD.shade(STONE, -i * 0.12), 0, -i * 2, -3 - i * 4, d.w * 0.8, 2, 4); add('box', 'l', STONE, 0, 0, -8, d.w, 1.5, 20); };

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
    flowers: flowers(false), bluebells: flowers(true), reeds: reeds, seaweed: seaweed, coral: coral, lily: lily, sporepod: sporepod,
    bones: bones, skullpile: skulls, skull: skulls, shell: shell, crops: crops, woodpile: woodpile, rootpillar: rootpillar,
    house: house({}), bighouse: house({ wall: 0.4 }), shop: house({ sign: 0xc8a040 }), inn: house({ wall: 0.44, sign: 0x8a3a2a }), smithy: house({ anvil: true }),
    tower: tower, lighthouse: lighthouse, hut: hut(false), stilthut: hut(true), mill: mill, temple: temple, mausoleum: mausoleum, pyramid: pyramid,
    stall: stall, tent: tent, pavilion: pavilion, gate: gate, well: well, fountain: fountain,
    statue: statue(null), anubis: statue(0x1a1a24), gargoyle: statue(0x6a6a72), frozenknight: iceblock,
    lamp: lamp, torch: torch, brazier: brazier, campfire: campfire, sign: signpost, noticeboard: notice, banner: banner, warbanner: banner,
    bench: bench, table: table, bed: bed, bookshelf: shelf, anvil: anvil, forge: forge, cauldron: cauldron, weaponrack: weaponrack, armorstand: armorstand,
    cart: cart, boat: boat, dockpost: post, anchor: anchor, buoy: buoy, fishrack: fishrack, crabtrap: crabtrap, shipwreck: shipwreck,
    ruinwall: ruinwall, castlewall: castlewall, throne: throne, altar: altar, coffin: coffin, sarcophagus: coffin, urn: urn, goldpile: goldpile,
    candles: candles, cross: cross, snowman: snowman, cage: cage, eggsac: eggsac, cocoon: cocoon, rune: rune, portal: portal, riftportal: portal,
    fairyring: fairyring, scarecrow: scarecrow, dummy: dummy, bedroll: bedroll, ribcage: ribcage, vent: vent, lavapillar: lavapillar,
    tomb_door: doorway(0x100a08), cavemouth: doorway(0x050304), stairsdown: stairs,
  };
  const STRUCT = {};
  for (const id of 'house bighouse shop inn smithy tower lighthouse hut stilthut mill temple mausoleum pyramid stall tent pavilion gate well fountain statue anubis gargoyle frozenknight lamp torch brazier sign noticeboard banner warbanner bench table bed bookshelf anvil forge cauldron weaponrack armorstand cart boat dockpost anchor buoy fishrack crabtrap shipwreck ruinwall castlewall throne altar coffin sarcophagus urn cross snowman cage cocoon portal riftportal scarecrow dummy vent lavapillar tomb_door cavemouth barrel crate pillar sandcolumn citpillar starpillar fence palisade standingstone grave obelisk'.split(' ')) STRUCT[id] = 1;
  MD.has = (id) => !!BUILD[id];

  // Parts for one placed prop, with the placement baked into each matrix.
  MD.parts = function (pr) {
    if (pr._m3) return pr._m3;
    T = window.THREE;
    const d = R.Props[pr.id], p = palette(pr.id, pr.v || 0), r = R.U.rng('m3:' + Math.round(pr.x) + ',' + Math.round(pr.y));
    const out = [], e = new T.Euler(0, 0, 0, 'YXZ'), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();
    // buildings and objects stand taller than their sprite's pixel height (the camera looks down, which squashes height)
    const yk = STRUCT[pr.id] ? 1.9 : 1, stretch = new T.Matrix4().makeScale(1, yk, 1);
    BUILD[pr.id](d, p, r, (geo, mat, col, x, y, z, sx, sy, sz, rx, ry, rz, sway) => {
      e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e);
      const m = new T.Matrix4().compose(v.set(pr.x + x, y, pr.y + z), q, s.set(sx, sy, sz));
      if (yk !== 1) m.premultiply(stretch);
      out.push({ geo, mat, col: new T.Color(col), m, sway: sway || 0, h: y + sy });
    });
    return (pr._m3 = out);
  };
})(window.RPG);
