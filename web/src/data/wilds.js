'use strict';
// The Wilds: every outdoor region is about ten times bigger. The hand-made map (plus its expansion
// area) sits inside a large generated wilderness:
//   - roads lead out of the old map through the wilds; the exits to neighbouring regions moved to
//     the far ends of those roads, so travelling between regions is a real journey
//   - four sectors per region, each with its own name, an outpost (waypoint + Crafting Station)
//   - lakes, thickets, cliffs, ruins, camps, forts, monster dens, champions, groves, quarries,
//     lumber sites, wishing wells, shrines, fishing ponds, hidden chests and mimics
//   - gathering nodes (herbs, ore, timber) for crafting
//   - monsters get tougher the further you go from the old map
// Everything is generated from a fixed seed, so the world is the same for everyone (co-op!).
(function (R) {
  const U = R.U, S = 16, X = R.Ext;
  R.MapOffsets3 = {}; // id -> {ox, oy}: saves from before the wilds shift by this much
  const SCALE = 3.15; // per side, so the area is about 10x

  const WILD = {
    town: { lv: 1, spawns: [['slime', 1], ['wolf', 2], ['boar', 2], ['mushroom', 2], ['goblin', 3]], den: 'wolf', camp: 'goblin', nodes: ['meadowleaf', 'meadowleaf', 'timber', 'iron_ore', 'glowmoss'], sectors: ['Sunny Meadows', 'Millbrook Fields', 'Willow Hollow', 'Bramble Hills'], safeCore: 18 },
    forest: { lv: 3, nodes: ['meadowleaf', 'meadowleaf', 'timber', 'timber', 'iron_ore', 'glowmoss'], sectors: ['The Deepwood', 'Mossy Vale', 'Old Oak Glade', 'Fox Hollow'] },
    coast: { lv: 7, anchor: [1, 1], margin: 10, nodes: ['meadowleaf', 'timber', 'iron_ore', 'iron_ore', 'gem'], sectors: ['Saltgrass Moors', 'Kestrel Heights', 'Wreckers\' Reach', 'Smugglers\' Heath'], sea: true },
    marsh: { lv: 7, nodes: ['glowmoss', 'glowmoss', 'meadowleaf', 'timber', 'iron_ore'], sectors: ['The Sunken Wood', 'Frogspawn Flats', 'Witchlight Mire', 'Rotting Reach'] },
    oasis: { lv: 9, lakes: 0.1, spawns: [['scorpion', 10], ['vulture', 10], ['desert_bandit', 10], ['bandit_archer', 10]], den: 'scorpion', camp: 'desert_bandit', nodes: ['emberroot', 'iron_ore', 'mithril_ore', 'meadowleaf'], sectors: ['Date Palm Rise', 'Caravan Road', 'Whispering Sands', 'Jackal Dunes'], safeCore: 16 },
    desert: { lv: 11, lakes: 0.07, nodes: ['emberroot', 'emberroot', 'iron_ore', 'mithril_ore', 'gem'], sectors: ['The Bone Flats', 'Sunspire Mesa', 'Scorpion Basin', 'The Endless Dunes'] },
    peaks: { lv: 15, nodes: ['frostbloom', 'frostbloom', 'mithril_ore', 'mithril_ore', 'timber', 'gem'], sectors: ['Howling Ridge', 'The Icefalls', 'Yeti Hollow', 'Glacier Steps'] },
    thornwood: { lv: 18, nodes: ['glowmoss', 'meadowleaf', 'timber', 'adamant_ore', 'gem'], sectors: ['The Briar Maze', 'Moonpetal Vale', 'Heartroot Deep', 'The Hushwood'] },
    volcano: { lv: 20, lakes: 0.12, nodes: ['emberroot', 'adamant_ore', 'adamant_ore', 'starmetal', 'gem'], sectors: ['Cinder Fields', 'The Slag Rivers', 'Ashfall Hollow', 'Obsidian Spires'] },
  };
  // points of interest scattered through the wilds (weights)
  const POIS = { camp: 3, ruins: 3, den: 2, pond: 2, shrine: 2, cliff: 3, mimic: 1, grove: 3, quarry: 3, lumber: 2, fort: 1, champion: 2, well: 1, stones: 1, cache: 2 };

  function wildify(id, wcfg) {
    const def = R.Maps[id], base = X.EXT[id];
    if (!def || !base) return;
    const cfg = Object.assign({}, base, wcfg);
    if (!cfg.spawns || !cfg.spawns.length) cfg.spawns = base.spawns;
    cfg.den = cfg.den || base.den || (cfg.spawns[0] && cfg.spawns[0][0]);
    cfg.camp = cfg.camp || base.camp || (cfg.spawns[1] && cfg.spawns[1][0]);
    const orig = def.build, cw = def.w, ch = def.h;
    const W = Math.round(cw * SCALE), H = Math.round(ch * SCALE);
    const an = cfg.anchor || [0.5, 0.5], mg = cfg.margin || 0;
    const ox = Math.round(mg + (W - cw - 2 * mg) * an[0]), oy = Math.round(mg + (H - ch - 2 * mg) * an[1]);
    def.w = W; def.h = H;
    R.MapOffsets3[id] = { ox, oy };
    def.wild = { ox, oy, cw, ch };
    def.build = function (M) {
      orig.call(this, X.offsetBuilder(M, ox, oy, cw, ch));
      buildWilds(M, id, cfg, { ox, oy, cw, ch });
    };
  }

  // ================================================================== generator
  function buildWilds(M, id, cfg, core) {
    const T = R.Tiles, rng = U.rng('wilds:' + id);
    const { ox, oy, cw, ch } = core;
    const Wd = M.w, Hd = M.h;
    const inCore = (x, y) => x >= ox && y >= oy && x < ox + cw && y < oy + ch;
    const coreDist = (x, y) => Math.max(ox - x, x - (ox + cw - 1), oy - y, y - (oy + ch - 1), 0); // tiles outside the core
    const maxDist = Math.max(ox, Wd - ox - cw, oy, Hd - oy - ch);
    const walkT = (t) => { const d = T[t]; return !!d && !d.solid; };
    const walk = (x, y) => walkT(M.get(x, y));
    const shallow = cfg.water === 'lava' ? 'volcrock' : cfg.water === 'bog' ? 'murk' : cfg.water === 'frozenlake' ? 'ice' : 'shallow';
    const lakeT = cfg.water === 'frozenlake' ? 'frozenlake' : cfg.water;
    const seaF = (x, y) => { const n = M.noise(x * 0.09, y * 0.09); return Math.max(x - ox - 94, (y - oy - 54) * 1.1) + (n - 0.5) * 10; };

    // ---------------------------------------------------------------- 1. terrain
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      if (inCore(x, y)) continue;
      const d = coreDist(x, y);
      if (cfg.sea) { const f = seaF(x, y); if (f > -4) { M.set(x, y, f > 4 ? 'sea' : f > 2 ? 'surf' : f > 0 ? 'wetsand' : 'beach'); continue; } }
      const n = M.noise(x * 0.08, y * 0.08);
      let t = n > 0.66 ? cfg.alt : cfg.alt2 && n < 0.3 ? cfg.alt2 : cfg.base;
      if (d > 7) {
        const nl = M.noise(x * 0.022 + 71, y * 0.022 + 71);
        const nt = M.noise(x * 0.035 + 913, y * 0.035 + 913);
        const lk = cfg.lakes == null ? 0.16 : cfg.lakes;
        if (nl < lk) t = lakeT; else if (nl < lk + 0.04) t = shallow;
        else if (nt > 0.76) t = cfg.wall;
      }
      if (x < 3 || y < 3 || x >= Wd - 3 || y >= Hd - 3) t = cfg.sea && M.get(x, y) === 'sea' ? 'sea' : cfg.wall;
      M.set(x, y, t);
    }
    // ---------------------------------------------------------------- 2. roads
    const road = (pts, width, wig) => carve(M, pts, cfg.path, width || 3, wig == null ? 3 : wig);
    const band = { n: oy, s: Hd - oy - ch, w: ox, e: Wd - ox - cw };
    const mid = (a, b) => Math.round((a + b) / 2);
    const hubs = {}; // sector hubs (outposts)
    if (band.n >= 30) hubs.n = [mid(ox, ox + cw), mid(3, oy)];
    if (band.e >= 30) hubs.e = [mid(ox + cw, Wd - 3), mid(oy, oy + ch)];
    if (band.s >= 30) hubs.s = [mid(ox, ox + cw), mid(oy + ch, Hd - 3)];
    if (band.w >= 30) hubs.w = [mid(3, ox), mid(oy, oy + ch)];
    const corners = {};
    if (hubs.n && hubs.e) corners.ne = [mid(ox + cw, Wd - 3), mid(3, oy)];
    if (hubs.e && hubs.s) corners.se = [mid(ox + cw, Wd - 3), mid(oy + ch, Hd - 3)];
    if (hubs.s && hubs.w) corners.sw = [mid(3, ox), mid(oy + ch, Hd - 3)];
    if (hubs.w && hubs.n) corners.nw = [mid(3, ox), mid(3, oy)];
    const cyc = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((k) => hubs[k] || corners[k]).filter(Boolean);
    const ringNodes = cyc.slice();
    for (let i = 0; i < cyc.length; i++) { const a = cyc[i], b = cyc[(i + 1) % cyc.length]; if (cyc.length > 2 || i === 0) road([a, b], 3, 5); }
    // move the exits on the old map's edge out to the new edge
    const exitsMoved = [];
    const cx0 = ox * S, cx1 = (ox + cw) * S, cy0 = oy * S, cy1 = (oy + ch) * S;
    for (const x of M.exits.slice()) {
      if (x.prompt) continue;
      const to = R.Maps[x.to];
      if (!to || !to.outdoor) continue;
      let side = null;
      if (x.x <= cx0 + 2) side = 'w'; else if (x.x + x.w >= cx1 - 2) side = 'e'; else if (x.y <= cy0 + 2) side = 's_n'; else if (x.y + x.h >= cy1 - 2) side = 's';
      if (!side) continue;
      if (side === 's_n') side = 'n';
      const tx = Math.floor((x.x + x.w / 2) / S), ty = Math.floor((x.y + x.h / 2) / S);
      const ew = Math.round(x.w / S), eh = Math.round(x.h / S);
      // road from the old gap straight out to the new edge
      let gate, end, nx, ny, nw, nh, px, py;
      if (side === 'w') { gate = [ox - 1, ty]; end = [1, clampY(ty + rng.int(-10, 10))]; nx = 0; ny = end[1] - (eh >> 1); nw = 1; nh = eh; px = 3; py = end[1]; }
      else if (side === 'e') { gate = [ox + cw, ty]; end = [Wd - 2, clampY(ty + rng.int(-10, 10))]; nx = Wd - 1; ny = end[1] - (eh >> 1); nw = 1; nh = eh; px = Wd - 4; py = end[1]; }
      else if (side === 'n') { gate = [tx, oy - 1]; end = [clampX(tx + rng.int(-10, 10)), 1]; nx = end[0] - (ew >> 1); ny = 0; nw = ew; nh = 1; px = end[0]; py = 3; }
      else { gate = [tx, oy + ch]; end = [clampX(tx + rng.int(-10, 10)), Hd - 2]; nx = end[0] - (ew >> 1); ny = Hd - 1; nw = ew; nh = 1; px = end[0]; py = Hd - 4; }
      // no sea road for the coast: leave those exits where they are
      if (cfg.sea && (side === 'e' || side === 's')) continue;
      const midp = [Math.round((gate[0] + end[0]) / 2 + rng.int(-6, 6)), Math.round((gate[1] + end[1]) / 2 + rng.int(-6, 6))];
      road([gate, midp, end], 3, 4);
      // the edge itself (opened wide enough for the exit)
      for (let j = ny - 1; j < ny + nh + 1; j++) for (let i = nx - 1; i < nx + nw + 1; i++) if (M.inb(i, j)) M.set(i, j, cfg.path);
      // move the exit and the arrival point that belonged to it
      M.exits.splice(M.exits.indexOf(x), 1);
      M.exit(nx, ny, nw, nh, x.to, x.at, { requires: x.requires, locked: x.locked, color: x.color, label: x.label });
      let bestP = null, bd = 1e9;
      for (const [name, p] of Object.entries(M.points)) { const d = Math.hypot(p.x / S - tx, p.y / S - ty); if (d < 7 && d < bd) { bd = d; bestP = name; } }
      if (bestP) M.point(bestP, px, py);
      M.sign(side === 'w' ? 4 : side === 'e' ? Wd - 5 : end[0] + 3, side === 'n' ? 4 : side === 's' ? Hd - 5 : end[1] + 2, 'To ' + to.name + '\n' + (to.subtitle || ''));
      exitsMoved.push({ gate, end });
      // join this road to the nearest ring road node
      const near = nearest(ringNodes, gate); if (near) road([gate, near], 3, 4);
    }
    function clampX(v) { return U.clamp(v, 6, Wd - 7); }
    function clampY(v) { return U.clamp(v, 6, Hd - 7); }
    // extra gaps through the old map's edge, each with a trail to the ring road
    const gaps = [];
    for (const side of ['n', 'e', 's', 'w']) {
      if (band[side] < 30) continue;
      for (let k = 0; k < 3; k++) {
        const along = side === 'n' || side === 's' ? cw : ch;
        const pos = Math.round(along * (k + 1) / 4 + rng.int(-5, 5));
        let inner, outer;
        if (side === 'n') { inner = [ox + pos, oy + 6]; outer = [ox + pos, oy - 4]; }
        else if (side === 's') { inner = [ox + pos, oy + ch - 7]; outer = [ox + pos, oy + ch + 3]; }
        else if (side === 'w') { inner = [ox + 6, oy + pos]; outer = [ox - 4, oy + pos]; }
        else { inner = [ox + cw - 7, oy + pos]; outer = [ox + cw + 3, oy + pos]; }
        if (!walk(inner[0], inner[1]) || M.reserved(inner[0], inner[1])) continue;
        let ok = true; // don't cut through buildings or other reserved bits
        for (let t = 0; t <= 10 && ok; t++) { const qx = Math.round(U.lerp(inner[0], outer[0], t / 10)), qy = Math.round(U.lerp(inner[1], outer[1], t / 10)); if (inCore(qx, qy) && M.reserved(qx, qy) && !walk(qx, qy)) ok = false; }
        if (!ok) continue;
        road([inner, outer], 3, 0);
        X.clearProps(M, Math.min(inner[0], outer[0]) - 2, Math.min(inner[1], outer[1]) - 2, Math.abs(inner[0] - outer[0]) + 5, Math.abs(inner[1] - outer[1]) + 5);
        gaps.push(outer);
        const near = nearest(ringNodes, outer); if (near) road([outer, near], 2, 4);
      }
    }
    // ---------------------------------------------------------------- 3. outposts (one per sector)
    const env = {
      rng, mapId: id, lv: cfg.lv,
      chestId: (() => { let n = 0; return () => 'w_' + id + '_' + (n++); })(),
      gearId: () => { const b = X.LOOT_BAND(Math.max(3, env.lv)); return b.length ? b[rng.int(0, b.length - 1)].id : X.potionFor(env.lv); },
    };
    const secNames = cfg.sectors || ['North', 'East', 'South', 'West'];
    const safeSpots = [];
    ['n', 'e', 's', 'w'].forEach((k, i) => {
      const h = hubs[k]; if (!h) return;
      const name = secNames[i];
      outpost(M, h[0], h[1], id + '_' + k, name, cfg);
      safeSpots.push([h[0], h[1], 14]);
      const lvS = sectorLevel(h[0], h[1]);
      M.zone('area:' + name, h[0], h[1], Math.min(40, (k === 'n' || k === 's' ? band[k] : band[k]) / 2 + 6), (Wr) => X.discover(Wr, name, lvS));
      M.sign(h[0] + 4, h[1] + 4, name + (cfg.safeCore && !cfg.spawns.length ? '' : '\n(Level ' + lvS + '-' + (lvS + 3) + ')'));
    });
    function sectorLevel(x, y) { return cfg.lv + Math.round(2.5 * coreDist(x, y) / maxDist); }
    // ---------------------------------------------------------------- 4. points of interest
    const roadAt = (x, y) => M.get(x, y) === cfg.path;
    const spots = [];
    const target = Math.round((Wd * Hd - cw * ch) / 1500);
    const kinds = []; for (const [k, w] of Object.entries(POIS)) for (let i = 0; i < w; i++) kinds.push(k);
    for (let tries = 0; tries < target * 30 && spots.length < target; tries++) {
      const x = rng.int(10, Wd - 11), y = rng.int(10, Hd - 11);
      if (coreDist(x, y) < 9) continue;
      if (spots.some(([a, b]) => Math.hypot(a - x, b - y) < 17)) continue;
      if (safeSpots.some(([a, b, r]) => Math.hypot(a - x, b - y) < r + 6)) continue;
      let open = 0; for (let j = -4; j <= 4; j += 2) for (let i = -4; i <= 4; i += 2) if (walk(x + i, y + j) && !roadAt(x + i, y + j)) open++;
      if (open < 20) continue;
      spots.push([x, y]);
    }
    const spawn0 = M.spawns.length;
    for (const [x, y] of spots) {
      let kind = kinds[rng.int(0, kinds.length - 1)];
      if (cfg.safeCore && coreDist(x, y) < cfg.safeCore && ['den', 'fort', 'champion', 'camp'].includes(kind)) kind = 'grove';
      if (kind === 'pond' && cfg.water === 'lava') kind = 'lavapool';
      env.lv = sectorLevel(x, y);
      const scfg = Object.assign({}, cfg, { spawns: cfg.spawns.map(([s, l]) => [s, l + (env.lv - cfg.lv)]), safe: false });
      if (X.placePOI && ['camp', 'ruins', 'den', 'pond', 'lavapool', 'shrine', 'cliff', 'mimic'].includes(kind)) { clearArea(M, x, y, 6); X.placePOI(M, kind, x, y, scfg, env); }
      else { clearArea(M, x, y, 7); extraPOI(M, kind, x, y, scfg, env); }
    }
    for (let i = spawn0; i < M.spawns.length; i++) M.spawns[i].wild = true; // POI monsters also appear around safe towns
    // ---------------------------------------------------------------- 5. connect everything
    connect(M, [...Object.values(M.points).map((p) => [Math.floor(p.x / S), Math.floor(p.y / S)]), ...ringNodes, ...gaps], spots.concat(Object.values(hubs)), cfg, inCore);
    // ---------------------------------------------------------------- 6. trees, plants, rocks, gathering nodes
    const occ = new Uint8Array(Wd * Hd); // 1 = something already here
    const free = (x, y) => { if (x < 3 || y < 3 || x >= Wd - 3 || y >= Hd - 3 || inCore(x, y)) return false; const i = y * Wd + x; return !occ[i] && !M.keep[i] && walk(x, y) && !roadAt(x, y) && !nearRoad(x, y); };
    const nearRoad = (x, y) => roadAt(x + 1, y) || roadAt(x - 1, y) || roadAt(x, y + 1) || roadAt(x, y - 1);
    const mark = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X2 = x + i, Y2 = y + j; if (X2 >= 0 && Y2 >= 0 && X2 < Wd && Y2 < Hd) occ[Y2 * Wd + X2] = 1; } };
    const ringArea = Wd * Hd - cw * ch;
    // trees: sparse everywhere, dense near the thickets
    const trees = cfg.trees || ['tree'];
    for (let k = 0; k < ringArea * 0.05; k++) {
      const x = rng.int(3, Wd - 4), y = rng.int(3, Hd - 4);
      if (!free(x, y)) continue;
      const nt = M.noise(x * 0.035 + 913, y * 0.035 + 913);
      const dens = nt > 0.62 ? 0.95 : nt > 0.5 ? 0.35 : 0.12;
      if (rng() > dens) continue;
      if (!onBiome(M.get(x, y))) continue;
      M.prop(trees[rng.int(0, trees.length - 1)], x + rng.range(-0.3, 0.3), y); mark(x, y, 1);
    }
    function onBiome(t) { return t === cfg.base || t === cfg.alt || t === cfg.alt2 || (cfg.sea && t === 'grass'); }
    for (const d of cfg.deco || []) for (let k = 0; k < ringArea * 0.004; k++) {
      const x = rng.int(3, Wd - 4), y = rng.int(3, Hd - 4);
      const t = M.get(x, y);
      if (d === 'lily') { if (t === 'water' && !inCore(x, y)) M.prop('lily', x, y); continue; }
      if (d === 'reeds') { if ((t === 'swamp' || t === 'murk') && !inCore(x, y) && !occ[y * Wd + x]) { M.prop('reeds', x, y); occ[y * Wd + x] = 1; } continue; }
      if (!free(x, y)) continue;
      M.prop(d, x, y); occ[y * Wd + x] = 1;
    }
    const nodes = cfg.nodes || ['meadowleaf'];
    let nNodes = 0;
    for (let k = 0; k < ringArea / 30 && nNodes < ringArea / 650; k++) {
      const x = rng.int(4, Wd - 5), y = rng.int(4, Hd - 5);
      if (!free(x, y) || coreDist(x, y) < 5) continue;
      let crowd = false; for (let j = -5; j <= 5 && !crowd; j++) for (let i = -5; i <= 5; i++) if (occ[(y + j) * Wd + x + i] === 2) { crowd = true; break; }
      if (crowd) continue;
      M.node(nodes[rng.int(0, nodes.length - 1)], x, y); occ[y * Wd + x] = 2; nNodes++;
    }
    // ---------------------------------------------------------------- 7. monsters
    const groups = Math.round(ringArea / 430);
    const placed = [];
    for (let k = 0, tries = 0; k < groups && tries < groups * 20; tries++) {
      const x = rng.int(6, Wd - 7), y = rng.int(6, Hd - 7);
      if (inCore(x, y) || !walk(x, y) || roadAt(x, y)) continue;
      const cd = coreDist(x, y);
      if (cd < (cfg.safeCore || 6)) continue;
      if (safeSpots.some(([a, b, r]) => Math.hypot(a - x, b - y) < r)) continue;
      if (placed.some(([a, b]) => Math.hypot(a - x, b - y) < 11)) continue;
      const f = cd / maxDist, lv = cfg.lv + Math.round(f * 2.5);
      const [sid, slv] = cfg.spawns[rng.int(0, cfg.spawns.length - 1)];
      M.spawn(sid, x, y, { count: rng.int(2, 4), radius: 3, level: slv + (lv - cfg.lv), elite: 0.08 + f * 0.15, wild: true, respawn: 120 });
      placed.push([x, y]); k++;
    }
  }

  // Carve a road through a list of points; bridges over water, cuts through walls.
  function carve(M, pts, tile, width, wig) {
    const T = R.Tiles, r = width / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
      const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
      for (let s = 0; s <= n; s++) {
        const k = s / n, off = wig ? (M.noise(s * 0.04 + i * 7 + x0, y0 * 0.1) - 0.5) * 2 * wig * Math.sin(k * Math.PI) : 0;
        const cx = U.lerp(x0, x1, k) + nx / nl * off, cy = U.lerp(y0, y1, k) + ny / nl * off;
        for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) for (let q = Math.floor(cx - r); q <= Math.ceil(cx + r); q++) {
          if (Math.hypot(q - cx, j - cy) > r + 0.2 || !M.inb(q, j)) continue;
          if (q < 1 || j < 1 || q >= M.w - 1 || j >= M.h - 1) continue;
          const t = M.get(q, j), d = T[t];
          if (d && (d.water || d.liquid || t === 'sea' || t === 'surf' || t === 'lava' || t === 'bog')) M.set(q, j, t === 'lava' ? 'volcrock' : 'bridge');
          else if (!(t && (t.startsWith('cliff') || t.startsWith('stairs') || t === 'waterfall'))) M.set(q, j, tile);
        }
      }
    }
  }
  function nearest(list, p) { let b = null, bd = 1e9; for (const q of list) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = q; } } return b; }
  function clearArea(M, x, y, r) { X.clearProps(M, x - r, y - r, r * 2 + 1, r * 2 + 1); }

  // Flood fill from the seeds; any point of interest that can't be reached gets a trail dug to it.
  function connect(M, seeds, targets, cfg) {
    const Wd = M.w, Hd = M.h, T = R.Tiles;
    const walkable = (i) => { const d = T[M.tiles[i]]; return !!d && !d.solid; };
    for (let pass = 0; pass < 2; pass++) {
      const seen = new Uint8Array(Wd * Hd), q = [];
      for (const [x, y] of seeds) { if (x < 0 || y < 0 || x >= Wd || y >= Hd) continue; const i = y * Wd + x; if (walkable(i) && !seen[i]) { seen[i] = 1; q.push(i); } }
      for (let h = 0; h < q.length; h++) {
        const i = q[h], x = i % Wd, y = (i / Wd) | 0;
        if (x > 0 && !seen[i - 1] && walkable(i - 1)) { seen[i - 1] = 1; q.push(i - 1); }
        if (x < Wd - 1 && !seen[i + 1] && walkable(i + 1)) { seen[i + 1] = 1; q.push(i + 1); }
        if (y > 0 && !seen[i - Wd] && walkable(i - Wd)) { seen[i - Wd] = 1; q.push(i - Wd); }
        if (y < Hd - 1 && !seen[i + Wd] && walkable(i + Wd)) { seen[i + Wd] = 1; q.push(i + Wd); }
      }
      let fixed = 0;
      for (const [tx, ty] of targets) {
        // any walkable tile near the target reached? then fine
        let ok = false;
        for (let j = -2; j <= 2 && !ok; j++) for (let i = -2; i <= 2; i++) { const X2 = tx + i, Y2 = ty + j; if (X2 >= 0 && Y2 >= 0 && X2 < Wd && Y2 < Hd && seen[Y2 * Wd + X2]) { ok = true; break; } }
        if (ok) continue;
        // walk outward in rings until we find a reached tile, then dig a trail to it
        let best = null;
        for (let r = 3; r < 90 && !best; r += 2) for (let a = 0; a < 32 && !best; a++) {
          const X2 = Math.round(tx + Math.cos(a / 32 * U.TAU) * r), Y2 = Math.round(ty + Math.sin(a / 32 * U.TAU) * r);
          if (X2 >= 3 && Y2 >= 3 && X2 < Wd - 3 && Y2 < Hd - 3 && seen[Y2 * Wd + X2]) best = [X2, Y2];
        }
        if (best) { carve(M, [[tx, ty], best], cfg.path, 2, 0); fixed++; }
      }
      if (!fixed) break;
    }
  }

  // ================================================================== wilderness points of interest
  function outpost(M, x, y, wid, name, cfg) {
    M.circle(x, y, 6.5, cfg.path, 1);
    for (let a = 0; a < 28; a++) { const ang = a / 28 * U.TAU; if (Math.abs(Math.sin(ang)) > 0.93) continue; M.prop('palisade', Math.round(x + Math.cos(ang) * 7), Math.round(y + Math.sin(ang) * 5.5)); }
    M.prop('campfire', x, y + 1); M.light(x, y + 1, 90, '#ffb060', 0.2);
    M.prop('tent', x - 4, y - 2, 0); M.prop('tent', x + 4, y - 2, 1);
    M.prop('bedroll', x - 2, y + 3); M.prop('woodpile', x + 4, y + 2);
    M.station(x - 5, y + 2);
    M.waypoint(wid, x, y - 3, name);
    M.prop('banner', x + 2, y - 4);
    M.reserve(x - 8, y - 7, 17, 14);
  }
  function herbFor(cfg) { return (cfg.nodes || []).find((n) => R.Crafting.NODES[n] && R.Crafting.NODES[n].type === 'herb') || 'meadowleaf'; }
  function oreFor(cfg) { return (cfg.nodes || []).filter((n) => R.Crafting.NODES[n] && R.Crafting.NODES[n].type === 'ore' && n !== 'gem').pop() || 'iron_ore'; }
  function extraPOI(M, kind, x, y, cfg, env) {
    const { rng, lv, chestId, gearId } = env;
    const pick = () => cfg.spawns[rng.int(0, cfg.spawns.length - 1)];
    switch (kind) {
      case 'grove': {
        M.circle(x, y, 5, cfg.alt || cfg.base, 1.5);
        const herb = herbFor(cfg);
        for (let k = 0; k < 6; k++) { const a = k / 6 * U.TAU + rng.range(0, 0.5); M.node(k === 5 ? 'glowmoss' : herb, Math.round(x + Math.cos(a) * 3.5), Math.round(y + Math.sin(a) * 2.5)); }
        M.prop(cfg.trees[0], x, y - 1);
        if (rng() < 0.5) { const [s, l] = pick(); M.spawn(s, x + 5, y + 4, { count: 2, radius: 2, level: l }); }
        M.reserve(x - 5, y - 4, 11, 9);
        break;
      }
      case 'quarry': {
        M.circle(x, y, 5.5, cfg.alt2 || 'dirt', 1.5);
        const ore = oreFor(cfg);
        for (let k = 0; k < 6; k++) { const a = k / 6 * U.TAU; M.node(k === 0 ? 'gem' : ore, Math.round(x + Math.cos(a) * 4), Math.round(y + Math.sin(a) * 3)); }
        M.prop('cart', x, y); M.prop('crate', x + 1, y + 2);
        const [s, l] = pick(); M.spawn(s, x, y + 3, { count: 3, radius: 3, level: l, elite: 0.2 });
        M.reserve(x - 6, y - 4, 13, 9);
        break;
      }
      case 'lumber': {
        for (let k = 0; k < 5; k++) M.node('timber', x - 4 + k * 2, y + (k % 2 ? 2 : -1));
        M.prop('woodpile', x - 3, y + 4); M.prop('stump', x + 3, y + 4); M.prop('stump', x + 5, y - 2); M.prop('log', x, y - 4);
        M.reserve(x - 6, y - 5, 13, 11);
        break;
      }
      case 'fort': {
        M.rect(x - 7, y - 5, 15, 11, cfg.path);
        for (let i = -7; i <= 7; i++) { M.prop('palisade', x + i, y - 5); if (Math.abs(i) > 1) M.prop('palisade', x + i, y + 5); }
        for (let j = -4; j <= 4; j++) { M.prop('palisade', x - 7, y + j); M.prop('palisade', x + 7, y + j); }
        M.prop('tent', x - 4, y - 2, 0); M.prop('tent', x + 4, y - 2, 1); M.prop('campfire', x, y); M.prop('warbanner', x, y - 3); M.prop('crate', x + 5, y + 3); M.prop('barrel', x - 5, y + 3);
        M.chest(chestId(), x, y - 3, { loot: [gearId(), gearId(), X.potionFor(lv)], gold: 80 + lv * 25, tier: 'gold' });
        M.spawn(cfg.camp, x - 2, y + 1, { count: 3, radius: 2, level: lv + 1, elite: 0.35 });
        M.spawn(cfg.camp, x + 3, y + 1, { count: 2, radius: 2, level: lv + 1, elite: 0.35 });
        M.light(x, y, 80, '#ffb060', 0.2);
        M.reserve(x - 8, y - 6, 17, 13);
        break;
      }
      case 'champion': {
        M.circle(x, y, 4, cfg.alt2 || cfg.alt, 1);
        for (let k = 0; k < 6; k++) M.prop(k % 2 ? 'bones' : 'skullpile', x + rng.int(-4, 4), y + rng.int(-3, 3));
        M.prop('warbanner', x - 3, y - 3); M.prop('warbanner', x + 3, y - 3);
        const [s, l] = pick();
        M.spawn(s, x, y, { count: 1, radius: 1, level: l + 4, elite: 1, respawn: 600 });
        M.chest(chestId(), x, y - 3, { loot: [gearId(), gearId(), 'raw_gem'], gold: 120 + lv * 30, tier: 'gold' });
        M.sign(x + 5, y + 2, 'A champion made its lair here.\nIts hoard is said to be worth the scars.');
        M.reserve(x - 5, y - 4, 11, 9);
        break;
      }
      case 'well': {
        M.circle(x, y, 2.5, cfg.path, 0);
        M.prop('well', x, y); M.prop('bench', x + 3, y + 1); M.prop('flowers', x - 3, y + 1);
        M.interact({ x, y: y + 1, r: 26, label: 'Toss a coin (10g)', fn: wish });
        M.reserve(x - 4, y - 2, 9, 5);
        break;
      }
      case 'stones': {
        for (let k = 0; k < 7; k++) { const a = k / 7 * U.TAU; M.prop('standingstone', Math.round(x + Math.cos(a) * 4), Math.round(y + Math.sin(a) * 3), k % 3); }
        M.prop('altar', x, y);
        M.interact({ x, y: y + 1, r: 24, label: 'Touch the altar', fn: () => stones(x + ',' + y) });
        M.reserve(x - 5, y - 4, 11, 8);
        break;
      }
      case 'cache': {
        // a lone hidden chest, tucked between two rocks
        M.prop('boulder', x - 1, y); M.prop('boulder', x + 1, y);
        M.chest(chestId(), x, y + 1, rng() < 0.12 ? { loot: [], mimic: lv < 7 ? 'mimic_1' : lv < 11 ? 'mimic_2' : lv < 15 ? 'mimic_3' : lv < 19 ? 'mimic_4' : 'mimic_5' } : { loot: [gearId(), X.potionFor(lv)], gold: 30 + lv * 10, tier: 'wood' });
        M.reserve(x - 2, y - 1, 5, 3);
        break;
      }
    }
  }
  // Wishing well: a coin for a chance at something nice.
  function wish() {
    const Wr = R.World, p = Wr.player;
    if (p.gold < 10) { R.UI.toast('You need 10 gold to make a wish.'); return; }
    p.gold -= 10; R.Audio.play('coin');
    Wr.flags.wishes = (Wr.flags.wishes || 0) + 1;
    const r = Math.random();
    R.World.later(0.8, () => {
      if (r < 0.01 || Wr.flags.wishes === 77) { p.gold += 777; R.UI.banner('JACKPOT!', 'The well coughs up 777 gold!'); R.Audio.play('levelup'); }
      else if (r < 0.06) { p.addItem('raw_gem', 1); R.UI.lootToast(R.Items.raw_gem, 1); R.UI.toast('Something glitters at the bottom of the well...', 'good'); }
      else if (r < 0.2) { p.gold += 40; R.UI.toast('The well gives back more than you gave. +40 gold!', 'good'); R.Audio.play('coin'); }
      else if (r < 0.4) { const b = U.choose([['spd', 0.15, false, 'Lucky Feet'], ['crit', 8, false, 'Fortune\'s Favour'], ['hpRegen', 3, false, 'Well Water']]); p.addBuff(b[0], b[1], 90, b[2], b[3]); R.UI.toast(b[3] + ' — your wish came true (for 90 seconds).', 'good'); R.Audio.play('heal'); }
      else R.UI.toast(U.choose(['*plink*', 'You hear a faint "thank you" from far below.', 'Nothing happens. The well seems pleased, though.', 'A frog in the well croaks at you.']));
    });
  }
  // Standing stones: touch the altar at night... or just touch it a few times.
  function stones(key) {
    const Wr = R.World, p = Wr.player, k = 'stones:' + key;
    Wr.flags[k] = (Wr.flags[k] || 0) + 1;
    if (Wr.flags[k] < 3) { R.UI.toast(Wr.flags[k] === 1 ? 'The stones hum quietly.' : 'The humming grows louder. The stones are listening.'); R.Audio.play('portal', { pitch: 0.6 + Wr.flags[k] * 0.2 }); return; }
    if (Wr.flags[k + ':done']) { R.UI.toast('The stones are silent now.'); return; }
    Wr.flags[k + ':done'] = 1;
    R.FX.pillar(p.x, p.y, '#b070ff', 1.2, 24); R.Audio.play('levelup', { pitch: 0.8 });
    const xp = Math.round(R.xpForLevel(p.level) * 0.15);
    p.gainXp(xp); p.addItem('arcane_shard', 1); R.UI.lootToast(R.Items.arcane_shard, 1);
    R.UI.banner('THE STONES SPEAK', 'Ancient knowledge floods your mind. +' + xp + ' XP');
  }

  // ================================================================== apply
  for (const [id, w] of Object.entries(WILD)) wildify(id, w);
})(window.RPG);
