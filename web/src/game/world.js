'use strict';
// The world: loads maps, owns entities, collision, camera, rendering (with lighting & weather).
//
// Map definitions (data/maps.js):
//   RPG.Maps[id] = { name, w, h, level, music, dark:0..1, ambient:'#hex', weather, dustColor, safe, outdoor,
//                    build(M) }  -- M is the builder API documented at makeBuilder() below.
(function (R) {
  const U = R.U, G = R.G, FX = R.FX, T = R.Tiles, PR = R.Props;
  const S = G.TILE;

  const W = R.World = {
    map: null, player: null, entities: [], enemies: [], npcs: [], props: [], interactables: [],
    flags: {}, time: 0, combatT: 0, timers: [], cam: { x: 0, y: 0 }, spawns: [], zones: [],
    fade: 0, fadeDir: 0, cutscene: false, boss: null, waypoints: {}, visited: {},
  };

  W.later = function (delay, fn) { W.timers.push({ t: W.time + delay, fn }); };

  W.add = function (e) {
    W.entities.push(e);
    if (e instanceof R.Enemy) W.enemies.push(e);
    if (e instanceof R.NPC) W.npcs.push(e);
    if (R.Net) R.Net.onAdd(e);
    return e;
  };

  // ==========================================================================
  // Map builder API
  // ==========================================================================
  function makeBuilder(def, id) {
    const w = def.w, h = def.h;
    const M = {
      id, def, w, h,
      tiles: new Array(w * h).fill('grass'),
      block: new Uint8Array(w * h),     // invisible walls
      keep: new Uint8Array(w * h),      // reserved (no random scatter)
      props: [], npcs: [], spawns: [], chests: [], exits: [], signs: [], lights: [], zones: [], points: {}, bosses: [], waypoints: [], extras: [],
      rng: U.rng('map:' + id),
      noise: U.noise2('noise:' + id),
    };
    M.inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    M.set = (x, y, t) => { x |= 0; y |= 0; if (M.inb(x, y)) M.tiles[y * w + x] = t; };
    M.get = (x, y) => (M.inb(x | 0, y | 0) ? M.tiles[(y | 0) * w + (x | 0)] : 'void');
    M.fill = (t) => M.tiles.fill(t);
    M.rect = (x, y, rw, rh, t) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) M.set(i, j, t); };
    M.outline = (x, y, rw, rh, t) => { for (let i = x; i < x + rw; i++) { M.set(i, y, t); M.set(i, y + rh - 1, t); } for (let j = y; j < y + rh; j++) { M.set(x, j, t); M.set(x + rw - 1, j, t); } };
    M.circle = (cx, cy, r, t, ragged) => {
      for (let j = Math.floor(cy - r - 2); j <= cy + r + 2; j++) for (let i = Math.floor(cx - r - 2); i <= cx + r + 2; i++) {
        const d = Math.hypot(i - cx, j - cy) + (ragged ? (M.noise(i * 0.3, j * 0.3) - 0.5) * ragged : 0);
        if (d <= r) M.set(i, j, t);
      }
    };
    // Thick line of tiles (roads, rivers)
    M.line = (x0, y0, x1, y1, t, width) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      const r = (width || 1) / 2;
      for (let i = 0; i <= n; i++) {
        const x = U.lerp(x0, x1, i / n), y = U.lerp(y0, y1, i / n);
        for (let j = Math.floor(y - r); j <= Math.ceil(y + r); j++) for (let k = Math.floor(x - r); k <= Math.ceil(x + r); k++) if (Math.hypot(k - x, j - y) <= r + 0.2) M.set(k, j, t);
      }
    };
    // Wiggly path through a list of points [[x,y],...]
    M.path = (pts, t, width, wiggle) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        let px = x0, py = y0;
        for (let s = 1; s <= steps; s++) {
          const k = s / steps;
          const off = wiggle ? (M.noise(s * 0.15 + i * 10, i) - 0.5) * wiggle : 0;
          const nx = U.lerp(x0, x1, k) + (y1 - y0) / steps * off * 0.0 + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? off : 0);
          const ny = U.lerp(y0, y1, k) + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : off);
          M.line(px, py, nx, ny, t, width);
          px = nx; py = ny;
        }
      }
    };
    // Fill using noise: fn(n, x, y) returns tile or null
    M.noiseFill = (scale, fn, area) => {
      const [ax, ay, aw, ah] = area || [0, 0, w, h];
      for (let y = ay; y < ay + ah; y++) for (let x = ax; x < ax + aw; x++) { const t = fn(M.noise(x * scale, y * scale), x, y); if (t) M.set(x, y, t); }
    };
    M.border = (t, thick, gaps) => {
      thick = thick || 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (x < thick || y < thick || x >= w - thick || y >= h - thick) {
          if (gaps && gaps.some(([gx, gy, gw, gh]) => x >= gx && x < gx + gw && y >= gy && y < gy + gh)) continue;
          M.set(x, y, t);
        }
      }
    };
    M.blockRect = (x, y, rw, rh) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (M.inb(i, j)) M.block[j * w + i] = 1; };
    M.reserve = (x, y, rw, rh) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (M.inb(i, j)) M.keep[j * w + i] = 1; };
    M.reserved = (x, y) => M.inb(x | 0, y | 0) && M.keep[(y | 0) * w + (x | 0)] === 1;
    // Props. (x, y) = tile coords; the prop's base sits at the bottom-centre of that tile.
    M.prop = (pid, x, y, variant) => {
      const p = PR[pid];
      if (!p) { console.warn('unknown prop', pid); return; }
      const v = variant != null ? variant : M.rng.int(0, (p.variants || 1) - 1);
      M.props.push({ id: pid, x: x * S + 8, y: y * S + 15, v });
      M.reserve(Math.floor(x), Math.floor(y), 1, 1);
    };
    // Scatter props randomly: opts {area:[x,y,w,h], on:[tiles], n, minDist (tiles), avoidPaths}
    M.scatter = (pid, n, o) => {
      o = o || {};
      const [ax, ay, aw, ah] = o.area || [1, 1, w - 2, h - 2];
      const placed = [];
      let tries = n * 12;
      while (placed.length < n && tries-- > 0) {
        const x = M.rng.int(ax, ax + aw - 1), y = M.rng.int(ay, ay + ah - 1);
        const t = M.get(x, y);
        if (o.on && !o.on.includes(t)) continue;
        if (!o.on && (T[t] && (T[t].solid || T[t].water))) continue;
        if (M.reserved(x, y)) continue;
        if (o.minDist && placed.some(([px, py]) => Math.hypot(px - x, py - y) < o.minDist)) continue;
        if (o.test && !o.test(x, y)) continue;
        placed.push([x, y]);
        M.prop(pid, x + (o.jitter === false ? 0 : M.rng.range(-0.3, 0.3)), y);
      }
      return placed;
    };
    M.npc = (nid, x, y) => { M.npcs.push({ id: nid, x: x * S + 8, y: y * S + 12 }); M.reserve(x | 0, y | 0, 1, 1); };
    // Enemy group. opts {count, radius (tiles), level, respawn (sec, 0 = never), elite}
    M.spawn = (eid, x, y, o) => { o = o || {}; M.spawns.push({ id: eid, x: x * S + 8, y: y * S + 8, count: o.count || 1, radius: (o.radius || 2) * S, level: o.level, respawn: o.respawn == null ? 60 : o.respawn, elite: o.elite, critter: o.critter, wild: o.wild }); };
    // Boss (spawned only while undefeated). opts {flag, level, onDefeat}
    M.boss = (eid, x, y, o) => { o = o || {}; M.bosses.push({ id: eid, x: x * S + 8, y: y * S + 8, flag: o.flag || 'boss:' + eid, level: o.level, requires: o.requires }); };
    // Chest; id must be unique game-wide. opts {loot:[itemId|{item,qty}], gold, tier:'wood'|'iron'|'gold'}
    M.chest = (cid, x, y, o) => { o = o || {}; M.chests.push({ id: cid, x: x * S + 8, y: y * S + 14, loot: o.loot || [], gold: o.gold || 0, tier: o.tier, requires: o.requires, mimic: o.mimic }); M.reserve(x | 0, y | 0, 1, 1); };
    // Exit region -> another map. to: map id. at: [tx, ty] tile coords or a named point in the target map.
    // opts {label, prompt (needs interact key), requires(flag/quest check fn), locked: 'message'}
    M.exit = (x, y, ew, eh, to, at, o) => { M.exits.push(Object.assign({ x: x * S, y: y * S, w: ew * S, h: eh * S, to, at }, o || {})); M.reserve(x, y, ew, eh); };
    M.point = (name, x, y) => { M.points[name] = { x: x * S + 8, y: y * S + 12 }; };
    M.sign = (x, y, text) => { M.prop('sign', x, y, 0); M.signs.push({ x: x * S + 8, y: y * S + 15, text }); };
    M.light = (x, y, r, color, flicker) => M.lights.push({ x: x * S + 8, y: y * S + 8, r, color: color || '#ffd9a0', flicker: flicker || 0 });
    // Named circular zone (quest 'reach' objectives, triggers). onEnter(world) optional.
    M.zone = (name, x, y, r, onEnter) => M.zones.push({ name, x: x * S + 8, y: y * S + 8, r: r * S, onEnter, inside: false });
    // Fast-travel waypoint
    M.waypoint = (wid, x, y, name) => { M.prop('portal', x, y, 0); M.waypoints.push({ id: wid, x: x * S + 8, y: y * S + 15, name: name || def.name }); M.point('wp:' + wid, x, y + 1); };
    // Custom interactable. o: {x, y (tiles), label, r, fn()}
    M.interact = (o) => M.extras.push(Object.assign({}, o, { x: o.x * S + 8, y: o.y * S + 12 }));
    if (R.Crafting) R.Crafting.extendBuilder(M); // M.node (gathering) and M.station (crafting)

    // ---- cliffs & plateaus ---------------------------------------------------------
    // Raise every tile where inside(x, y) is true into a plateau of `top` tiles. The ground just
    // south of the plateau becomes a two-row rock face (face + base), and the other borders get a
    // rocky rim, so you can only get up and down by stairs (M.stairs) or ramps.
    //   style: 'rock' | 'snow' | 'sand' | 'dark' | 'fey' | 'void' | 'coast' (see gfx/tiles2.js CLIFF_STYLES)
    M.raise = (inside, top, style) => {
      const sty = style || 'rock';
      const mask = new Uint8Array(w * h);
      const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? mask[y * w + x] : 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) { mask[y * w + x] = 1; if (top) M.tiles[y * w + x] = top; }
      const face = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (at(x, y)) continue;
        if (at(x, y - 1)) { M.set(x, y, 'cliff_' + sty); face.push([x, y]); if (!at(x, y + 1)) { M.set(x, y + 1, 'cliffbase_' + sty); face.push([x, y + 1]); } }
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (at(x, y)) continue;
        const t = M.tiles[y * w + x];
        if (t.startsWith('cliff')) continue;
        let near = false;
        for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if ((i || j) && at(x + i, y + j)) { near = true; break; }
        if (near) { M.set(x, y, 'cliffside_' + sty); face.push([x, y]); }
      }
      for (const [x, y] of face) M.reserve(x, y, 1, 1);
      M.cliffStyle = sty;
      return mask;
    };
    // Rectangular plateau (tiles). o: {top, style, ragged}
    M.plateau = (x, y, pw, ph, top, style, ragged) => M.raise((i, j) => {
      if (i < x || j < y || i >= x + pw || j >= y + ph) return false;
      if (!ragged) return true;
      const ex = Math.min(i - x, x + pw - 1 - i), ey = Math.min(j - y, y + ph - 1 - j);
      return Math.min(ex, ey) >= Math.floor(M.noise(i * 0.35, j * 0.35) * ragged);
    }, top, style);
    // Stairs cut into a cliff (walkable). Usually 3 wide and covering the face + base rows.
    M.stairs = (x, y, sw, sh, style) => { for (let j = y; j < y + (sh || 2); j++) for (let i = x; i < x + (sw || 3); i++) M.set(i, j, 'stairs_' + (style || M.cliffStyle || 'rock')); M.reserve(x, y, sw || 3, sh || 2); };
    // Waterfall pouring down a cliff face (solid, animated) into a pool below.
    M.waterfall = (x, y, fw, fh) => { for (let j = y; j < y + (fh || 2); j++) for (let i = x; i < x + (fw || 2); i++) M.set(i, j, 'waterfall'); M.reserve(x, y, fw || 2, fh || 2); };
    return M;
  }
  W.makeBuilder = makeBuilder;

  // ==========================================================================
  // Loading
  // ==========================================================================
  const built = {}; // cache of built map geometry (tiles, props, ground canvas) per map id

  // Ground layer drawn in chunks on demand (a 300x300-tile map would be a 100 MB image otherwise).
  const CH = 16, chunkCache = new Map(), CHUNK_MAX = 90;
  function makeGround(M) {
    const cols = Math.ceil(M.w / CH), rows = Math.ceil(M.h / CH), src = { id: M.id, w: M.w, h: M.h, tiles: M.tiles };
    const get = (cx, cy, now) => {
      const key = M.id + ':' + cx + ',' + cy;
      let c = chunkCache.get(key);
      if (c) { chunkCache.delete(key); chunkCache.set(key, c); return c; } // most recently used goes last
      if (!now) return null;
      c = T.renderRegion(src, cx * CH, cy * CH, CH, CH);
      chunkCache.set(key, c);
      if (chunkCache.size > CHUNK_MAX) chunkCache.delete(chunkCache.keys().next().value);
      return c;
    };
    return {
      width: M.w * S, height: M.h * S, CH, chunk: (cx, cy) => get(cx, cy, true),
      // draw the ground covering world rect (x, y, w, h)
      draw(ctx, x, y, w, h) {
        const PX = CH * S;
        const c0 = Math.max(0, Math.floor(x / PX)), c1 = Math.min(cols - 1, Math.floor((x + w) / PX));
        const r0 = Math.max(0, Math.floor(y / PX)), r1 = Math.min(rows - 1, Math.floor((y + h) / PX));
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) ctx.drawImage(get(cx, cy, true), cx * PX, cy * PX);
      },
      // render a few chunks around the view ahead of time, so walking never hitches
      prefetch(x, y, w, h, budget) {
        const PX = CH * S;
        const c0 = Math.max(0, Math.floor(x / PX) - 1), c1 = Math.min(cols - 1, Math.floor((x + w) / PX) + 1);
        const r0 = Math.max(0, Math.floor(y / PX) - 1), r1 = Math.min(rows - 1, Math.floor((y + h) / PX) + 1);
        for (let cy = r0; cy <= r1 && budget > 0; cy++) for (let cx = c0; cx <= c1 && budget > 0; cx++) if (!get(cx, cy, false)) { get(cx, cy, true); budget--; }
      },
    };
  }

  function buildMap(id) {
    if (built[id]) return built[id];
    const def = R.Maps[id];
    if (!def) throw new Error('Unknown map: ' + id);
    const M = makeBuilder(def, id);
    def.build(M);
    M.ground = makeGround(M);
    // solid grid
    M.solid = new Uint8Array(M.w * M.h);
    M.sight = new Uint8Array(M.w * M.h);
    for (let i = 0; i < M.tiles.length; i++) {
      const t = T[M.tiles[i]] || T.grass;
      M.solid[i] = t.solid || M.block[i] ? 1 : 0;
      M.sight[i] = t.wall ? 1 : 0;
    }
    // prop collision boxes, bucketed by tile
    M.boxes = new Map();
    for (const p of M.props) {
      const d = PR[p.id];
      if (!d.box) continue;
      const b = { x: p.x + d.box[0], y: p.y + d.box[1], w: d.box[2], h: d.box[3] };
      p.boxRef = b;
      for (let ty = Math.floor(b.y / S); ty <= Math.floor((b.y + b.h) / S); ty++)
        for (let tx = Math.floor(b.x / S); tx <= Math.floor((b.x + b.w) / S); tx++) {
          const k = ty * M.w + tx;
          if (!M.boxes.has(k)) M.boxes.set(k, []);
          M.boxes.get(k).push(b);
        }
    }
    // minimap image (1px per tile)
    const mm = G.canvas(M.w, M.h);
    const mctx = mm.getContext('2d');
    const img = mctx.createImageData(M.w, M.h);
    for (let i = 0; i < M.tiles.length; i++) {
      const [r, g, b] = U.hexToRgb((T[M.tiles[i]] || T.grass).color);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    mctx.putImageData(img, 0, 0);
    mctx.fillStyle = 'rgba(40,30,20,0.9)';
    for (const p of M.props) if (PR[p.id].box && PR[p.id].w >= 40) mctx.fillRect(Math.floor(p.x / S) - 2, Math.floor(p.y / S) - 2, 4, 2);
    M.minimap = mm;
    built[id] = M;
    return M;
  }
  W.buildMap = buildMap;

  W.load = function (id, at) {
    const M = buildMap(id);
    const def = M.def;
    const p = W.player;
    W.map = M; W.def = def;
    W.entities = []; W.enemies = []; W.npcs = []; W.timers = []; W.interactables = [];
    W.boss = null;
    if (R.UI && R.UI.bossBar) R.UI.bossBar(null);
    if (R.Nav) R.Nav.reset(M);
    if (R.AI && R.AI.resetTokens) R.AI.resetTokens();
    FX.reset();
    // player position
    let pos = null;
    if (typeof at === 'string') pos = M.points[at];
    else if (Array.isArray(at)) pos = { x: at[0] * S + 8, y: at[1] * S + 12 };
    else if (at && at.x != null) pos = at;
    if (!pos) pos = M.points.start || { x: M.w * S / 2, y: M.h * S / 2 };
    p.x = pos.x; p.y = pos.y; p.vx = p.vy = p.kx = p.ky = 0;
    W.add(p);
    // npcs
    for (const n of M.npcs) {
      const d = R.NPCs[n.id];
      if (!d) { console.warn('unknown npc', n.id); continue; }
      if (d.hidden && d.hidden()) continue;
      W.add(new R.NPC(d, n.x, n.y));
    }
    // chests
    for (const c of M.chests) { if (c.requires && !c.requires()) continue; W.add(new R.Chest(c)); }
    // enemy groups
    W.spawns = M.spawns.map((s) => Object.assign({}, s, { alive: [], timer: 0 }));
    // co-op: if another player already runs this area, their monsters are the real ones
    if (!R.Net || R.Net.claimMap()) W.populate();
    else for (const b of M.bosses) if (W.flags[b.flag] && R.BossSigil && (!b.requires || b.requires())) W.add(new R.BossSigil(b));
    // interactables: signs, waypoints, extras
    for (const s of M.signs) W.interactables.push({ x: s.x, y: s.y, r: 18, label: 'Read', fn: () => R.UI.dialog([{ speaker: 'Sign', text: s.text }]) });
    for (const wp of M.waypoints) {
      W.interactables.push({ x: wp.x, y: wp.y, r: 22, label: 'Waypoint', fn: () => { if (!W.waypoints[wp.id]) { W.waypoints[wp.id] = { map: id, name: wp.name }; R.UI.toast('Waypoint discovered: ' + wp.name, 'good'); R.Audio.play('portal'); FX.pillar(wp.x, wp.y, '#b070ff', 1, 20); } R.UI.open('waypoints'); } });
    }
    for (const x of M.extras) W.interactables.push(x);
    for (const z of M.zones) z.inside = false;
    // camera snap
    W.cam.x = p.x - G.W / 2; W.cam.y = p.y - G.H / 2; clampCam();
    R.Audio.music(def.music || null);
    W.visited[id] = 1;
    // auto-discover a waypoint you arrive next to
    R.events.emit('enter', { map: id });
    if (def.onEnter) def.onEnter(W);
    R.UI && R.UI.zoneBanner(def.name, def.subtitle || (def.level ? 'Level ' + def.level + (def.safe ? '' : ' area') : ''));
    if (R.Net) R.Net.onLoad();
  };

  // Spawn the area's monsters and bosses (beaten bosses leave a Challenge Sigil for a harder rematch).
  W.populate = function () {
    const M = W.map, def = M.def;
    for (const s of W.spawns) if ((!def.safe || s.critter || s.wild) && W.spawnActive(s)) fillSpawn(s, true);
    for (const b of M.bosses) {
      if (W.flags[b.flag]) { if (R.BossSigil && (!b.requires || b.requires()) && !W.entities.some((e) => e instanceof R.BossSigil && e.b === b)) W.add(new R.BossSigil(b)); continue; }
      if (b.requires && !b.requires()) continue;
      const e = W.spawnEnemy(b.id, b.x, b.y, b.level);
      if (e) { e.bossFlag = b.flag; e.state = 'idle'; e.popIn = 0; }
    }
  };
  // Big maps: monster groups only exist near a player (they appear as you approach).
  const ACTIVE_R = 44 * 16, SLEEP_R = 58 * 16;
  W.spawnActive = function (s) {
    if (!W.player) return true;
    for (const q of (R.Net && R.Net.active() ? R.Net.players() : [W.player])) if (Math.abs(q.x - s.x) < ACTIVE_R && Math.abs(q.y - s.y) < ACTIVE_R) return true;
    return false;
  };
  function fillSpawn(s, initial) {
    const def = R.Enemies[s.id];
    if (!def) { console.warn('unknown enemy', s.id); return; }
    s.alive = s.alive.filter((e) => !e.dead);
    s.filled = true;
    while (s.alive.length < s.count) {
      let x, y, tries = 20;
      do { x = s.x + U.rand(-s.radius, s.radius); y = s.y + U.rand(-s.radius, s.radius); } while (tries-- > 0 && W.collides(x, y, def.r || 6));
      if (tries <= 0) { x = s.x; y = s.y; }
      const e = W.spawnEnemy(s.id, x, y, s.level || (W.def && W.def.level));
      if (!e) break;
      if (initial) e.popIn = 0;
      e.spawnGroup = s;
      if (s.elite && Math.random() < s.elite) makeElite(e);
      s.alive.push(e);
      if (!initial) { FX.burst(x, y - 8, { n: 12, color: '#8040a0', speed: 40, life: 0.5, glow: true }); }
    }
  }
  function makeElite(e) {
    e.elite = true;
    e.maxHp = e.hp = Math.round(e.maxHp * 2.5);
    e.atk *= 1.4;
    e.armor += 4;
  }

  W.spawnEnemy = function (id, x, y, level) {
    const def = R.Enemies[id];
    if (!def) { console.warn('unknown enemy', id); return null; }
    const e = new R.Enemy(def, x, y, level || def.level);
    e.popIn = 0.35; // summoned / respawned enemies pop in
    W.add(e);
    return e;
  };

  // ==========================================================================
  // Collision
  // ==========================================================================
  W.tileAt = (x, y) => { const M = W.map; const tx = Math.floor(x / S), ty = Math.floor(y / S); if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return 'void'; return M.tiles[ty * M.w + tx]; };
  W.solidAt = function (x, y, projectile) {
    const M = W.map;
    const tx = Math.floor(x / S), ty = Math.floor(y / S);
    if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return true;
    const i = ty * M.w + tx;
    if (projectile) {
      if (M.sight[i]) return true;
    } else if (M.solid[i]) return true;
    const bs = M.boxes.get(i);
    if (bs) for (const b of bs) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return !projectile || b.h > 6;
    return false;
  };
  W.collides = function (x, y, r, flying) {
    const M = W.map;
    const hw = r, top = y - Math.max(2, r * 0.5), bot = y + 1;
    const x0 = Math.floor((x - hw) / S), x1 = Math.floor((x + hw) / S), y0 = Math.floor(top / S), y1 = Math.floor(bot / S);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return true;
      const i = ty * M.w + tx;
      if (M.solid[i] && !(flying && !M.sight[i] && !M.block[i])) return true;
      if (flying === 'air') continue; // flying mounts go over trees, rocks and houses
      const bs = M.boxes.get(i);
      if (bs) for (const b of bs) if (x + hw > b.x && x - hw < b.x + b.w && bot > b.y && top < b.y + b.h) return true;
    }
    return false;
  };
  const NUDGE = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7];
  const ROADS = new Set(['path', 'cobble', 'stonebridge', 'snowpath', 'sandstone', 'mossstone', 'planks', 'bridge']);
  W.onRoad = (x, y) => ROADS.has(W.tileAt(x, y - 2));
  // Moves with sliding; returns true if moved at all.
  W.moveEntity = function (e, dx, dy) {
    const flying = e.air ? 'air' : e.def && e.def.tags && e.def.tags.includes('flying');
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
    const sx = dx / steps, sy = dy / steps;
    const r = e.r || 5;
    let moved = false;
    for (let i = 0; i < steps; i++) {
      if (sx) {
        if (!W.collides(e.x + sx, e.y, r, flying)) { e.x += sx; moved = true; }
        else if (!sy) { // corner slide
          for (const n of NUDGE) if (!W.collides(e.x + sx, e.y + n, r, flying) && !W.collides(e.x, e.y + n, r, flying)) { const k = Math.min(Math.abs(n), Math.max(1, Math.abs(sx) * 0.8)); if (!W.collides(e.x, e.y + Math.sign(n) * k, r, flying)) e.y += Math.sign(n) * k; else e.y += Math.sign(n); moved = true; break; }
        }
      }
      if (sy) {
        if (!W.collides(e.x, e.y + sy, r, flying)) { e.y += sy; moved = true; }
        else if (!sx) {
          for (const n of NUDGE) if (!W.collides(e.x + n, e.y + sy, r, flying) && !W.collides(e.x + n, e.y, r, flying)) { const k = Math.min(Math.abs(n), Math.max(1, Math.abs(sy) * 0.8)); if (!W.collides(e.x + Math.sign(n) * k, e.y, r, flying)) e.x += Math.sign(n) * k; else e.x += Math.sign(n); moved = true; break; }
        }
      }
    }
    return moved;
  };
  W.lineOfSight = function (x0, y0, x1, y1) {
    const M = W.map;
    const d = U.dist(x0, y0, x1, y1), n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) {
      const x = U.lerp(x0, x1, i / n), y = U.lerp(y0, y1, i / n);
      const tx = Math.floor(x / S), ty = Math.floor(y / S);
      if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return false;
      if (M.sight[ty * M.w + tx]) return false;
    }
    return true;
  };

  // ==========================================================================
  // Loot
  // ==========================================================================
  // Global random-drop tables by level: enemy defs may add `dropTable: 'forest'` etc.
  R.LootTables = R.LootTables || {};
  W.dropLoot = function (e) {
    const def = e.def;
    const drops = [];
    if (def.gold) { const g = Math.round(U.randi(def.gold[0], def.gold[1]) * (e.elite ? 3 : 1) * (e.goldMult || 1)); if (g > 0) drops.push({ gold: g }); }
    for (const d of def.drops || []) {
      if (Math.random() >= d.chance * (e.elite ? 2 : 1)) continue;
      if (d.item) drops.push({ item: d.item, qty: d.qty ? U.randi(d.qty[0], d.qty[1]) : 1 });
      else if (d.rarity) { const it = W.randomGear(d.level || e.level, 0, d.rarity); if (it) drops.push({ item: it.id }); }
    }
    // items tagged dropsFrom: [enemyId] (unique boss loot). Bosses always drop one, preferring your class.
    const uniq = Object.values(R.Items).filter((it) => it.dropsFrom && it.dropsFrom.includes(def.id));
    if (uniq.length && (e.boss || Math.random() < (def.uniqueChance || 0.03))) {
      const p = W.player;
      const mine = uniq.filter((it) => p && p.canEquip(it));
      const pick = U.choose(mine.length ? mine : uniq);
      drops.push({ item: pick.id });
    }
    // generic equipment drops from level-appropriate pool
    const chance = e.boss ? 1 : e.elite ? 0.5 : (def.gearChance != null ? def.gearChance : 0.07);
    if (Math.random() < chance) {
      const it = W.randomGear(e.level, e.boss ? 1 : e.elite ? 0.5 : 0);
      if (it) drops.push({ item: it.id });
    }
    for (const d of drops) W.add(new R.Pickup(e.x, e.y - 4, d));
  };
  // Pick a random equippable item near a level; luck (0..1) shifts rarity up.
  const RW = { common: 60, uncommon: 28, rare: 10, epic: 2.5, legendary: 0.5, mythic: 0 };
  // rarity (optional) forces an exact rarity; falls back to any rarity if none fit.
  W.randomGear = function (level, luck, rarity) {
    let pool = Object.values(R.Items).filter((it) => R.SLOTS.includes(it.slot) && !it.noDrop && !it.dropsFrom && it.level <= level + 2 && it.level >= level - 6);
    if (rarity) {
      const exact = pool.filter((it) => it.rarity === rarity);
      if (exact.length) pool = exact;
      else { const any = Object.values(R.Items).filter((it) => R.SLOTS.includes(it.slot) && !it.noDrop && it.rarity === rarity && it.level <= level + 4); if (any.length) pool = any; }
    }
    if (!pool.length) return null;
    // prefer items the player can use (70%)
    const p = W.player;
    const usable = pool.filter((it) => p && p.canEquip(it));
    const src = usable.length && Math.random() < 0.7 ? usable : pool;
    let total = 0;
    const weights = src.map((it) => { let w = RW[it.rarity] || 1; if (luck && it.rarity !== 'common') w *= 1 + luck * 3; total += w; return w; });
    let r = Math.random() * total;
    for (let i = 0; i < src.length; i++) { r -= weights[i]; if (r <= 0) return src[i]; }
    return src[src.length - 1];
  };

  // ==========================================================================
  // Interaction
  // ==========================================================================
  W.interactTarget = function () {
    const p = W.player;
    let best = null, bd = 1e9;
    const consider = (o, x, y, r, label, fn) => { const d = U.dist(p.x, p.y, x, y); if (d < r && d < bd) { bd = d; best = { o, x, y, label, fn }; } };
    for (const n of W.npcs) consider(n, n.x, n.y, 24, 'Talk', () => R.UI.talk(n));
    for (const e of W.entities) {
      if (e instanceof R.Chest) { if (!e.opened) consider(e, e.x, e.y, 22, 'Open', () => e.interact()); }
      else if (e.interactLabel && !e.remove) { const l = e.interactLabel(); if (l) consider(e, e.x, e.y, e.interactR || 24, l, () => e.interact()); }
    }
    for (const i of W.interactables) if (!i.hidden || !i.hidden()) consider(i, i.x, i.y, i.r || 20, typeof i.label === 'function' ? i.label() : i.label, i.fn);
    for (const x of W.map.exits) if (x.prompt) { const cx = x.x + x.w / 2, cy = x.y + x.h / 2; consider(x, cx, cy, Math.max(x.w, x.h) / 2 + 14, x.label || 'Enter', () => W.useExit(x)); }
    return best;
  };

  W.useExit = function (x) {
    if (x.requires && !x.requires()) { R.UI.toast(x.locked || 'The way is blocked.', 'bad'); R.Audio.play('error'); return; }
    W.transition(x.to, x.at);
  };

  W.transition = function (to, at, force) {
    if (W.fadeDir) return;
    if (!force && R.Net && R.Net.blockTravel()) return;
    W.fadeDir = 1;
    W.fadeTarget = { to, at };
    R.Audio.play('portal', { pitch: 1.3 });
  };

  W.teleportHome = function () { W.transition('town', 'wp:town'); };

  // ==========================================================================
  // Update
  // ==========================================================================
  W.update = function (dt) {
    // fades
    if (W.fadeDir === 1) {
      W.fade = Math.min(1, W.fade + dt * 4);
      if (W.fade >= 1) { const f = W.fadeTarget; W.load(f.to, f.at); W.fadeDir = -1; if (R.Save && R.settings.autosave !== false) R.Save.autosave(); }
      return;
    }
    if (W.fadeDir === -1) { W.fade = Math.max(0, W.fade - dt * 3); if (W.fade <= 0) W.fadeDir = 0; }

    W.time += dt;
    if (W.combatT > 0) W.combatT -= dt;
    // timers
    if (W.timers.length) {
      const due = W.timers.filter((t) => t.t <= W.time);
      if (due.length) { W.timers = W.timers.filter((t) => t.t > W.time); for (const t of due) { try { t.fn(); } catch (err) { console.error(err); } } }
    }
    // entities
    for (let i = 0; i < W.entities.length; i++) {
      const e = W.entities[i];
      try { e.update(dt); } catch (err) { console.error('entity update', err); e.remove = true; }
    }
    // soft separation between living enemies and the player
    separate();
    // cleanup
    if (W.entities.some((e) => e.remove)) {
      W.entities = W.entities.filter((e) => !e.remove);
      W.enemies = W.enemies.filter((e) => !e.remove);
      W.npcs = W.npcs.filter((e) => !e.remove);
    }
    // respawns
    const p = W.player;
    if (!(R.Net && R.Net.active() && !R.Net.authority)) {
      W.spawnT = (W.spawnT || 0) - dt;
      const scan = W.spawnT <= 0;
      if (scan) W.spawnT = 0.5;
      for (const s of W.spawns) {
        if (W.def.safe && !s.critter && !s.wild) continue;
        s.alive = s.alive.filter((e) => !e.dead && !e.remove);
        if (scan) {
          const active = W.spawnActive(s);
          if (!active && s.alive.length && !s.alive.some((e) => e.state === 'chase' || e.state === 'attack' || e.hp < e.maxHp)) {
            // far from everyone and not fighting: tidy it away until someone comes back
            if (!s.alive.some((e) => U.dist(e.x, e.y, p.x, p.y) < SLEEP_R)) { for (const e of s.alive) e.remove = true; s.alive = []; s.slept = true; }
          } else if (active && s.slept) { s.slept = false; fillSpawn(s, true); }
          else if (active && !s.filled) fillSpawn(s, true); // first visit
        }
        if (!s.respawn || !s.filled) continue;
        if (s.alive.length < s.count && !s.slept) {
          s.timer += dt;
          if (s.timer > s.respawn && U.dist(p.x, p.y, s.x, s.y) > 240) { s.timer = 0; fillSpawn(s); }
        } else s.timer = 0;
      }
    }
    // bosses: detect engagement
    if (!W.boss) {
      const who = R.Net && R.Net.active() ? R.Net.players() : [p];
      for (const e of W.enemies) if (e.boss && !e.dead && who.some((q) => !q.dead && U.dist(e.x, e.y, q.x, q.y) < (e.def.aggro || 150))) { W.startBoss(e); break; }
    } else if (W.boss.dead) {
      W.endBoss();
    }
    // exits (non-prompt)
    if (!p.dead && !W.fadeDir) for (const x of W.map.exits) {
      if (x.prompt) continue;
      if (p.x > x.x && p.x < x.x + x.w && p.y > x.y && p.y < x.y + x.h) {
        if (x.requires && !x.requires()) {
          // remind every couple of seconds while you push against it
          if (!x._warnT || W.time > x._warnT) {
            R.UI.toast('🔒 ' + (x.locked || 'The way is blocked.'), 'bad');
            R.Audio.play('error');
            FX.text(p.x, p.y - 30, 'LOCKED', '#ff6060');
            x._warnT = W.time + 2.5;
          }
          // push back out of the exit
          const cx = x.x + x.w / 2, cy = x.y + x.h / 2;
          const a = x.w > x.h ? (p.y < cy ? -Math.PI / 2 : Math.PI / 2) : (p.x < cx ? Math.PI : 0);
          W.moveEntity(p, -Math.cos(a) * 60 * dt - p.vx * dt, -Math.sin(a) * 60 * dt - p.vy * dt);
        } else { W.useExit(x); }
        break;
      }
    }
    // zones
    for (const z of W.map.zones) {
      const inside = U.dist(p.x, p.y, z.x, z.y) < z.r;
      if (inside && !z.inside) { z.inside = true; R.events.emit('zone', { name: z.name, map: W.map.id }); if (z.onEnter) z.onEnter(W); }
      else if (!inside) z.inside = false;
    }
    // camera
    const tx = p.x - G.W / 2 + Math.cos(p.aim) * 12, ty = p.y - 12 - G.H / 2 + Math.sin(p.aim) * 8;
    W.cam.x = U.lerp(W.cam.x, tx, Math.min(1, dt * 9));
    W.cam.y = U.lerp(W.cam.y, ty, Math.min(1, dt * 9));
    if (Math.abs(W.cam.x - tx) < 0.35) W.cam.x = tx;
    if (Math.abs(W.cam.y - ty) < 0.35) W.cam.y = ty;
    clampCam();
    FX.update(dt);
    updateWeather(dt);
    if (R.Nav) R.Nav.update(dt);
    if (R.Guide) R.Guide.update(dt);
  };

  function separate() {
    const list = W.enemies;
    const p = W.player;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || a.boss || a.netProxy) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead || b.netProxy) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (min - d) / 2;
          const nx = dx / d, ny = dy / d;
          if (!b.boss) W.moveEntity(b, nx * push, ny * push);
          W.moveEntity(a, -nx * push, -ny * push);
        }
      }
      if (p && !p.dead && p.rollT <= 0) {
        const dx = p.x - a.x, dy = p.y - a.y, min = a.r + p.r - 2;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.01) { const d = Math.sqrt(d2), push = (min - d); W.moveEntity(a, -dx / d * push, -dy / d * push); }
      }
    }
  }

  function clampCam() {
    const M = W.map, mw = M.w * S, mh = M.h * S;
    W.cam.x = mw < G.W ? (mw - G.W) / 2 : U.clamp(W.cam.x, 0, mw - G.W);
    W.cam.y = mh < G.H ? (mh - G.H) / 2 : U.clamp(W.cam.y, 0, mh - G.H);
  }

  W.startBoss = function (e) {
    W.boss = e;
    e.state = 'chase';
    R.Audio.music(e.def.music || 'boss');
    R.Audio.play('bossRoar');
    FX.shake(5, 0.6);
    R.UI.bossBar(e);
    if (e.def.intro && !W.flags['intro:' + e.def.id]) {
      W.flags['intro:' + e.def.id] = 1;
      R.UI.dialog(e.def.intro.map((t) => (typeof t === 'string' ? { speaker: e.def.name, text: t } : t)));
    }
    R.events.emit('boss:start', { id: e.def.id });
  };
  W.endBoss = function () {
    const e = W.boss;
    W.boss = null;
    R.UI.bossBar(null);
    const tier = (e && e.tier) || 1;
    if (e && e.bossFlag) {
      W.flags[e.bossFlag] = 1;
      W.flags['bosswins:' + e.def.id] = Math.max(R.Difficulty ? R.Difficulty.wins(e.def.id) : 0, tier);
      // rematch rewards grow with the tier
      if (tier > 1) {
        const g = e.def.gold || [100, 200];
        W.add(new R.Pickup(e.x, e.y - 4, { gold: Math.round(U.randi(g[0], g[1]) * (tier - 1) * (e.goldMult || 1)) }));
        for (let i = 0; i < Math.min(6, tier - 1); i++) { const it = W.randomGear(e.level, Math.min(1, 0.4 + tier * 0.15)); if (it) W.add(new R.Pickup(e.x, e.y - 4, { item: it.id })); }
        if (tier >= 3 && R.Items.tome_xp) W.add(new R.Pickup(e.x, e.y - 4, { item: 'tome_xp' }));
      }
      // the sigil returns for the next tier
      const b = W.map.bosses.find((x) => x.flag === e.bossFlag);
      if (b && R.BossSigil) W.later(4, () => { if (!W.boss && !W.entities.some((x) => x instanceof R.BossSigil)) { const s = W.add(new R.BossSigil(b)); FX.pillar(s.x, s.y, s.col, 1, 20); R.UI.toast('A Challenge Sigil glows where ' + e.def.name + ' fell. Tier ' + R.Difficulty.nextTier(e.def.id) + ' awaits...', 'quest'); } });
    }
    // treasure that only appears once the boss is dead
    for (const c of W.map.chests) {
      if (!c.requires || !c.requires() || W.entities.some((x) => x instanceof R.Chest && x.cid === c.id)) continue;
      const ch = W.add(new R.Chest(c));
      FX.pillar(ch.x, ch.y, '#ffd040', 1, 16); FX.burst(ch.x, ch.y - 8, { n: 30, colors: ['#ffd040', '#fff4a0'], speed: 70, life: 0.8, glow: true });
    }
    R.Audio.music(W.def.music || null);
    FX.flash('#ffffff', 0.5);
    FX.hitstop(0.3);
    FX.shake(8, 0.8);
    if (e) { const t = Math.round((e.mem && e.mem.fightT) || 0); R.UI.banner('VICTORY', e.def.name + ' has fallen' + (tier > 1 ? ' · Tier ' + tier : '') + (t ? ' · ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') : '')); }
    if (R.Save && R.settings.autosave !== false) W.later(2, () => R.Save.autosave());
  };

  // ==========================================================================
  // Weather (screen-space particles)
  // ==========================================================================
  const weather = [];
  function updateWeather(dt) {
    const kind = W.def.weather;
    if (!kind || R.settings.fancy === false) { weather.length = 0; return; }
    const target = { rain: 140, snow: 90, ash: 60, leaves: 18, fireflies: 26, spores: 40, sand: 90, embers: 50, stars: 70 }[kind] || 0;
    while (weather.length < target) weather.push(newDrop(kind, true));
    for (const d of weather) {
      d.x += d.vx * dt; d.y += d.vy * dt; d.t += dt;
      if (kind === 'snow' || kind === 'leaves' || kind === 'spores') d.x += Math.sin(d.t * d.f + d.ph) * 12 * dt;
      if (kind === 'fireflies') { d.x += Math.sin(d.t * d.f + d.ph) * 15 * dt; d.y += Math.cos(d.t * d.f * 0.7 + d.ph) * 15 * dt; }
      if (d.y > G.H + 10 || d.x < -20 || d.x > G.W + 20 || d.y < -30 || ((kind === 'fireflies' || kind === 'stars') && d.t > d.life)) Object.assign(d, newDrop(kind, false));
    }
  }
  function newDrop(kind, anywhere) {
    const d = { x: U.rand(-10, G.W + 10), y: anywhere ? U.rand(-10, G.H) : -10, t: 0, f: U.rand(1, 3), ph: U.rand(0, 6), life: U.rand(3, 8) };
    if (kind === 'rain') { d.vx = -60; d.vy = U.rand(300, 380); }
    else if (kind === 'snow') { d.vx = U.rand(-10, 10); d.vy = U.rand(20, 45); d.s = U.chance(0.3) ? 2 : 1; }
    else if (kind === 'ash' || kind === 'embers') { d.vx = U.rand(-15, 15); d.vy = U.rand(-30, 30) + (kind === 'embers' ? -30 : 20); if (kind === 'embers' && !anywhere) d.y = G.H + 5; }
    else if (kind === 'sand') { d.vx = U.rand(160, 240); d.vy = U.rand(-10, 20); if (!anywhere) { d.x = -10; d.y = U.rand(0, G.H); } }
    else if (kind === 'leaves') { d.vx = U.rand(10, 30); d.vy = U.rand(15, 30); d.c = U.choose(['#c86a2a', '#e0a040', '#8aa040']); }
    else if (kind === 'fireflies') { d.vx = 0; d.vy = 0; d.y = U.rand(0, G.H); }
    else if (kind === 'spores') { d.vx = U.rand(-5, 5); d.vy = U.rand(-12, -4); if (!anywhere) d.y = G.H + 5; }
    else if (kind === 'stars') { d.vx = U.rand(-4, 4); d.vy = U.rand(-18, -6); d.y = U.rand(0, G.H); d.c = U.choose(['#ffffff', '#c0a0ff', '#ffe0a0', '#80a0ff']); }
    return d;
  }
  function drawWeather(ctx) {
    const kind = W.def.weather;
    if (!kind || !weather.length) return;
    if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(170,200,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of weather) { ctx.moveTo(Math.round(d.x), Math.round(d.y)); ctx.lineTo(Math.round(d.x - 2), Math.round(d.y + 7)); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,30,60,0.12)'; ctx.fillRect(0, 0, G.W, G.H);
    } else if (kind === 'snow') {
      ctx.fillStyle = '#ffffff';
      for (const d of weather) ctx.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s);
    } else if (kind === 'ash') {
      ctx.fillStyle = 'rgba(80,70,70,0.8)';
      for (const d of weather) ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
    } else if (kind === 'embers') {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of weather) { ctx.fillStyle = d.ph > 3 ? '#ff8030' : '#ffc040'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'sand') {
      ctx.fillStyle = 'rgba(230,200,140,0.6)';
      for (const d of weather) ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 1);
      ctx.fillStyle = 'rgba(200,160,90,0.08)'; ctx.fillRect(0, 0, G.W, G.H);
    } else if (kind === 'leaves') {
      for (const d of weather) { ctx.fillStyle = d.c; ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 1); ctx.fillRect(Math.round(d.x) + 1, Math.round(d.y) + 1, 1, 1); }
    } else if (kind === 'stars') {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of weather) {
        const a = Math.max(0, Math.sin(d.t / d.life * Math.PI)) * (0.6 + 0.4 * Math.sin(d.t * 8 + d.ph));
        ctx.globalAlpha = a; ctx.fillStyle = d.c;
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
        if (d.ph > 4.5) { ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y), 3, 1); ctx.fillRect(Math.round(d.x), Math.round(d.y) - 1, 1, 3); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'fireflies' || kind === 'spores') {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of weather) {
        const a = kind === 'fireflies' ? Math.max(0, Math.sin(d.t * 2 + d.ph)) : 0.7;
        ctx.globalAlpha = a;
        ctx.drawImage(G.glow(4, kind === 'fireflies' ? '#d0ff60' : '#80ffc0'), Math.round(d.x - 4), Math.round(d.y - 4));
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================
  let lightCanvas = null;
  W.draw = function (ctx) {
    if (R.HD2D && R.HD2D.on() && R.HD2D.draw(ctx)) { drawWeather(ctx); if (R.Guide) R.Guide.draw(ctx, Math.round(W.cam.x), Math.round(W.cam.y)); drawScreenFX(ctx); return; }
    const M = W.map, cam = W.cam;
    const [sx, sy] = FX.shakeOffset();
    const cx = Math.round(cam.x + sx), cy = Math.round(cam.y + sy);
    ctx.fillStyle = '#08060c';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.save();
    ctx.translate(-cx, -cy);
    // ground
    M.ground.draw(ctx, cx, cy, G.W + 2, G.H + 2);
    M.ground.prefetch(cx, cy, G.W, G.H, 1);
    drawAnimatedTiles(ctx, cx, cy);
    // exits glow
    for (const x of M.exits) if (x.glow !== false && !x.hidden) {
      const a = 0.25 + Math.sin(W.time * 3) * 0.1;
      const locked = x.requires && !x.requires();
      if (locked) {
        // red magic barrier with a lock
        ctx.fillStyle = U.rgba('#ff3040', 0.25 + Math.sin(W.time * 4) * 0.1);
        ctx.fillRect(x.x, x.y, x.w, x.h);
        ctx.fillStyle = U.rgba('#ff8090', 0.7);
        for (let i = 0; i < (x.w > x.h ? x.w : x.h); i += 6) { const o = (i + Math.floor(W.time * 12)) % 12 < 6 ? 1 : 0; if (x.w > x.h) ctx.fillRect(x.x + i, x.y + x.h / 2 - 1 + o, 3, 1); else ctx.fillRect(x.x + x.w / 2 - 1 + o, x.y + i, 1, 3); }
        const lx = Math.round(x.x + x.w / 2), ly = Math.round(x.y + x.h / 2 + (x.y < 16 ? 10 : 0));
        ctx.fillStyle = '#140c1c'; ctx.fillRect(lx - 5, ly - 5, 11, 11);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(lx - 4, ly - 1, 9, 6); ctx.fillRect(lx - 3, ly - 4, 1, 3); ctx.fillRect(lx + 3, ly - 4, 1, 3); ctx.fillRect(lx - 2, ly - 5, 5, 1);
        ctx.fillStyle = '#6a4a10'; ctx.fillRect(lx, ly + 1, 1, 2);
        continue;
      }
      ctx.fillStyle = U.rgba(x.color || '#ffffff', a * (x.prompt ? 0.5 : 0.35));
      if (!x.prompt) ctx.fillRect(x.x, x.y, x.w, x.h);
    }
    FX.drawEffects(ctx, 'ground');
    // y-sorted world
    const vis = [];
    const margin = 64;
    for (const p of M.props) if (p.x > cx - margin - 48 && p.x < cx + G.W + margin + 48 && p.y > cy - 10 && p.y < cy + G.H + 120) vis.push(p);
    for (const e of W.entities) if (e.x > cx - margin && e.x < cx + G.W + margin && e.y > cy - margin && e.y < cy + G.H + margin + 40) vis.push(e);
    vis.sort((a, b) => (a.sortY != null ? a.sortY : a.y) - (b.sortY != null ? b.sortY : b.y)); // (flyers draw above the treetops)
    const pl = W.player;
    for (const o of vis) {
      if (o instanceof R.Entity) o.draw(ctx);
      else drawProp(ctx, o, pl);
    }
    FX.drawParticles(ctx);
    FX.drawEffects(ctx, 'top');
    // entity overlays (hp bars, quest markers)
    for (const e of W.entities) if (e.drawUI) e.drawUI(ctx);
    FX.drawTexts(ctx);
    // interaction prompt
    const it = !pl.dead && !R.UI.blocking() ? W.interactTarget() : null;
    W.currentInteract = it;
    if (it && it.label) {
      const key = R.Input.usingPad ? 'Y' : R.Input.keyName(R.Input.bindings.interact[0]);
      const img = G.pixelText(key + ' ' + it.label, '#ffffff');
      const bx = Math.round(it.x - img.width / 2), by = Math.round(it.y - 44 + Math.sin(W.time * 5) * 1.5);
      ctx.fillStyle = 'rgba(20,12,28,0.75)'; ctx.fillRect(bx - 2, by - 1, img.width + 4, img.height + 2);
      ctx.drawImage(img, bx, by);
    }
    ctx.restore();
    // lighting
    drawLighting(ctx, cx, cy);
    drawWeather(ctx);
    if (R.Guide) R.Guide.draw(ctx, cx, cy);
    // screen flash
    if (FX.flashT > 0) { ctx.fillStyle = U.rgba(FX.flashC, 0.35 * FX.flashT / FX.flashMax); ctx.fillRect(0, 0, G.W, G.H); }
    // low-hp vignette
    if (pl && !pl.dead && pl.hp / pl.stats.maxHp < 0.3) {
      const a = (0.3 - pl.hp / pl.stats.maxHp) * 1.6 * (0.7 + 0.3 * Math.sin(W.time * 6));
      const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.W * 0.65);
      g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, U.rgba('#a00000', Math.min(0.6, a)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);
    }
    // fade
    if (W.fade > 0) { ctx.fillStyle = U.rgba('#000000', W.fade); ctx.fillRect(0, 0, G.W, G.H); }
  };

  // flash + low-health vignette + fade (shared by both renderers)
  function drawScreenFX(ctx) {
    const pl = W.player;
    if (FX.flashT > 0) { ctx.fillStyle = U.rgba(FX.flashC, 0.35 * FX.flashT / FX.flashMax); ctx.fillRect(0, 0, G.W, G.H); }
    if (pl && !pl.dead && pl.hp / pl.stats.maxHp < 0.3) { const a = (0.3 - pl.hp / pl.stats.maxHp) * 1.6 * (0.7 + 0.3 * Math.sin(W.time * 6)); const g = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.W * 0.65); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, U.rgba('#a00000', Math.min(0.6, a))); ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H); }
    if (W.fade > 0) { ctx.fillStyle = U.rgba('#000000', W.fade); ctx.fillRect(0, 0, G.W, G.H); }
  }
  function drawProp(ctx, p, pl) {
    const d = PR[p.id];
    const frame = d.anim ? Math.floor(W.time * 6 + p.x) % d.anim : 0;
    const spr = PR.sprite(p.id, p.v, frame);
    const x = Math.round(p.x - d.ax - 1), y = Math.round(p.y - d.ay - 1);
    // fade big props that hide the player
    let alpha = 1;
    if (pl && d.h > 28 && pl.y < p.y - 2 && pl.y > p.y - d.ay && Math.abs(pl.x - p.x) < d.w / 2 && pl.y > y) alpha = 0.55;
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr, x, y);
    ctx.globalAlpha = 1;
  }

  function drawAnimatedTiles(ctx, cx, cy) {
    const M = W.map;
    const x0 = Math.max(0, Math.floor(cx / S)), y0 = Math.max(0, Math.floor(cy / S));
    const x1 = Math.min(M.w - 1, Math.ceil((cx + G.W) / S)), y1 = Math.min(M.h - 1, Math.ceil((cy + G.H) / S));
    const t = W.time;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = M.tiles[y * M.w + x];
      const td = T[id];
      if (!td || !(td.water || td.liquid || td.fall)) continue;
      const h = (x * 73 + y * 151) % 16;
      const ph = t * 1.5 + h;
      if (td.fall) {
        // falling water: bright streaks scroll down, foam where it lands
        for (let i = 0; i < 4; i++) {
          const sx = x * S + ((h + i * 5) % 15), sy = y * S + ((Math.floor(t * 70) + i * 9 + h * 3) % 16);
          ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(190,230,255,0.5)';
          ctx.fillRect(sx, sy, 1, 4);
        }
        const below = T[M.tiles[Math.min(M.h - 1, y + 1) * M.w + x]];
        if (!below || !below.fall) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          for (let i = 0; i < 3; i++) ctx.fillRect(x * S + ((h + i * 6 + Math.floor(t * 8)) % 16), y * S + 15 + (i % 2), 3, 1);
          if (Math.random() < 0.03) FX.particle({ x: x * S + U.rand(0, 16), y: y * S + 17, vy: -12, vx: U.rand(-8, 8), life: 0.5, color: '#e8f8ff' });
        }
        continue;
      }
      if (td.liquid) {
        ctx.fillStyle = Math.sin(ph) > 0 ? 'rgba(255,200,60,0.5)' : 'rgba(255,120,30,0.35)';
        ctx.fillRect(x * S + (h % 12), y * S + ((h * 3 + Math.floor(t * 2)) % 14), 4, 1);
        if (Math.random() < 0.002) FX.particle({ x: x * S + 8, y: y * S + 8, vy: -20, life: 0.6, color: '#ffb040', glow: true });
      } else {
        const off = Math.floor((Math.sin(ph) + 1) * 3);
        ctx.fillStyle = 'rgba(200,230,255,0.35)';
        ctx.fillRect(x * S + ((h + off) % 13), y * S + ((h * 5) % 14), 3, 1);
      }
    }
  }

  function drawLighting(ctx, cx, cy) {
    const def = W.def;
    const DN = R.DayNight, dark = DN ? DN.dark(def) : def.dark || 0, gold = DN ? DN.golden() : 0;
    if (gold > 0.02) { ctx.fillStyle = U.rgba('#ff9040', 0.13 * gold); ctx.fillRect(0, 0, G.W, G.H); }
    if (dark <= 0) { if (def.tint) { ctx.fillStyle = def.tint; ctx.fillRect(0, 0, G.W, G.H); } return; }
    if (!lightCanvas) lightCanvas = G.canvas(G.W, G.H);
    const lc = lightCanvas.getContext('2d');
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, G.W, G.H);
    lc.fillStyle = U.rgba(DN ? DN.ambient(def) : def.ambient || '#05040a', dark);
    lc.fillRect(0, 0, G.W, G.H);
    lc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const g = lc.createRadialGradient(x - cx, y - cy, 0, x - cx, y - cy, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.fillRect(x - cx - r, y - cy - r, r * 2, r * 2);
    };
    const pl = W.player;
    const lights = [];
    lights.push({ x: pl.x, y: pl.y - 10, r: def.playerLight || 90, a: 1 });
    for (const l of W.map.lights) lights.push({ x: l.x, y: l.y, r: l.r * (1 + (l.flicker ? Math.sin(W.time * 13 + l.x) * l.flicker : 0)), a: 1, color: l.color });
    for (const p of W.map.props) { const d = PR[p.id]; if (d.light) lights.push({ x: p.x, y: p.y - d.ay * 0.6, r: d.light.r * (1 + Math.sin(W.time * 11 + p.x) * (d.light.flicker || 0)), a: 1, color: d.light.color }); }
    for (const l of FX.lights) lights.push({ x: l.x, y: l.y, r: l.r * (l.life / l.max), a: 1, color: l.color });
    for (const e of W.entities) if (e.def && e.def.light) lights.push({ x: e.x, y: e.y - 8, r: e.def.light.r, a: 1, color: e.def.light.color });
    for (const e of W.entities) if (e instanceof R.Projectile && e.team === 'player' && e.kind !== 'arrow' && e.kind !== 'dagger') lights.push({ x: e.x, y: e.y, r: 30, a: 0.8 });
    const vis = lights.filter((l) => l.x + l.r > cx && l.x - l.r < cx + G.W && l.y + l.r > cy && l.y - l.r < cy + G.H);
    for (const l of vis) hole(l.x, l.y, l.r, l.a);
    ctx.drawImage(lightCanvas, 0, 0);
    // coloured glow
    if (R.settings.fancy !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const l of vis) if (l.color) { ctx.globalAlpha = 0.18 * dark; const r = Math.round(l.r * 0.8); ctx.drawImage(G.glow(Math.min(128, r), l.color), l.x - cx - r, l.y - cy - r, r * 2, r * 2); }
      ctx.restore();
    }
  }
})(window.RPG);
