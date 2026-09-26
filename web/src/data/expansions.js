'use strict';
// Bigger outdoor maps. Each outdoor map gets a new area attached to one side (the original layout is
// kept intact and shifted if the new land is to the west or north). New areas are generated from a
// biome recipe: winding trails, cliffs with stairs, ponds with fishing spots, ruins, monster dens with
// elites, camps, shrines that grant blessings, hidden chests, mimics and a few easter eggs.
// Finding a new area for the first time gives discovery XP.
(function (R) {
  const U = R.U, FX = R.FX, G = R.G;
  const S = 16;
  R.MapOffsets = {}; // id -> {ox, oy} tiles the original layout moved by (old saves are adjusted)

  // ================================================================== offset builder
  // Lets an original map's build() run unchanged inside a bigger map, shifted by (ox, oy).
  function offsetBuilder(M, ox, oy, ow, oh) {
    const P = Object.create(M);
    const sx = (x) => x + ox, sy = (y) => y + oy;
    P.__root = M.__root || M; P.__ox = (M.__ox || 0) + ox; P.__oy = (M.__oy || 0) + oy; // for code that edits the real map directly
    P.w = ow; P.h = oh;
    P.inb = (x, y) => x >= 0 && y >= 0 && x < ow && y < oh;
    P.set = (x, y, t) => { if (P.inb(x | 0, y | 0)) M.set(sx(x), sy(y), t); };
    P.get = (x, y) => (P.inb(x | 0, y | 0) ? M.get(sx(x), sy(y)) : 'void');
    P.fill = (t) => M.fill(t);
    P.rect = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.set(i, j, t); };
    P.outline = (x, y, w, h, t) => M.outline(sx(x), sy(y), w, h, t);
    P.circle = (cx, cy, r, t, ragged) => {
      for (let j = Math.floor(cy - r - 2); j <= cy + r + 2; j++) for (let i = Math.floor(cx - r - 2); i <= cx + r + 2; i++) {
        const d = Math.hypot(i - cx, j - cy) + (ragged ? (M.noise(i * 0.3, j * 0.3) - 0.5) * ragged : 0);
        if (d <= r) P.set(i, j, t);
      }
    };
    P.line = (x0, y0, x1, y1, t, w) => M.line(sx(x0), sy(y0), sx(x1), sy(y1), t, w);
    P.path = (pts, t, w, wig) => M.path(pts.map(([x, y]) => [sx(x), sy(y)]), t, w, wig);
    P.noiseFill = (scale, fn, area) => {
      const [ax, ay, aw, ah] = area || [0, 0, ow, oh];
      for (let y = ay; y < ay + ah; y++) for (let x = ax; x < ax + aw; x++) { const t = fn(M.noise(x * scale, y * scale), x, y); if (t) P.set(x, y, t); }
    };
    P.border = (t, thick, gaps) => {
      thick = thick || 1;
      for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
        if (x < thick || y < thick || x >= ow - thick || y >= oh - thick) {
          if (gaps && gaps.some(([gx, gy, gw, gh]) => x >= gx && x < gx + gw && y >= gy && y < gy + gh)) continue;
          P.set(x, y, t);
        }
      }
    };
    P.blockRect = (x, y, w, h) => M.blockRect(sx(x), sy(y), w, h);
    P.reserve = (x, y, w, h) => M.reserve(sx(x), sy(y), w, h);
    P.reserved = (x, y) => M.reserved(sx(x), sy(y));
    P.prop = (pid, x, y, v) => M.prop(pid, sx(x), sy(y), v);
    P.scatter = (pid, n, o) => {
      o = Object.assign({}, o || {});
      const [ax, ay, aw, ah] = o.area || [1, 1, ow - 2, oh - 2];
      o.area = [sx(ax), sy(ay), aw, ah];
      if (o.test) { const t = o.test; o.test = (x, y) => t(x - ox, y - oy); }
      return M.scatter(pid, n, o);
    };
    P.npc = (id, x, y) => M.npc(id, sx(x), sy(y));
    P.spawn = (id, x, y, o) => M.spawn(id, sx(x), sy(y), o);
    P.boss = (id, x, y, o) => M.boss(id, sx(x), sy(y), o);
    P.chest = (id, x, y, o) => M.chest(id, sx(x), sy(y), o);
    P.exit = (x, y, w, h, to, at, o) => M.exit(sx(x), sy(y), w, h, to, Array.isArray(at) ? at : at, o);
    P.point = (n, x, y) => M.point(n, sx(x), sy(y));
    P.sign = (x, y, t) => M.sign(sx(x), sy(y), t);
    P.light = (x, y, r, c, f) => M.light(sx(x), sy(y), r, c, f);
    P.zone = (n, x, y, r, fn) => M.zone(n, sx(x), sy(y), r, fn);
    P.waypoint = (id, x, y, n) => M.waypoint(id, sx(x), sy(y), n);
    P.interact = (o) => M.interact(Object.assign({}, o, { x: sx(o.x), y: sy(o.y) }));
    P.node = (k, x, y) => M.node(k, sx(x), sy(y));
    P.station = (x, y) => M.station(sx(x), sy(y));
    P.raise = (inside, top, style) => M.raise((x, y) => x >= ox && y >= oy && x < ox + ow && y < oy + oh && inside(x - ox, y - oy), top, style);
    P.plateau = (x, y, w, h, top, style, rag) => M.plateau(sx(x), sy(y), w, h, top, style, rag);
    P.stairs = (x, y, w, h, st) => M.stairs(sx(x), sy(y), w, h, st);
    P.waterfall = (x, y, w, h) => M.waterfall(sx(x), sy(y), w, h);
    return P;
  }

  // ================================================================== items for the new content
  const add = R.addItem;
  add({ id: 'fish', name: 'Grilled Fish', slot: 'consumable', level: 1, price: 18, use: { heal: 70 }, icon: { shape: 'food', color: '#8aa0b0' }, desc: 'Restores 70 HP. Smells like the lake.' });
  add({ id: 'silver_trout', name: 'Silver Trout', slot: 'material', price: 65, icon: { shape: 'food', color: '#c0d0e0', color2: '#ffffff' }, desc: 'A beautiful catch. Merchants pay well for it.' });
  add({ id: 'ancient_carp', name: 'Ancient Carp', slot: 'material', rarity: 'legendary', price: 999, icon: { shape: 'food', color: '#ffd040', color2: '#ff8020' }, desc: 'Legends say it has lived in this pond since before the Ember Crown. It is winking at you.' });
  add({ id: 'rubber_duck', name: 'Sir Quackington', slot: 'amulet', rarity: 'epic', level: 1, price: 250, stats: { dodge: 4, hpRegen: 1, spd: 0.03 }, icon: { shape: 'amulet', color: '#ffe040', color2: '#ff8020' }, desc: 'A small yellow knight of unshakable courage. Quack.', noDrop: true, noShop: true });
  add({ id: 'carrot', name: "Frosty's Carrot", slot: 'consumable', level: 1, price: 1, use: { heal: 25, buff: { stat: 'spd', amt: 0.1, dur: 60 } }, icon: { shape: 'food', color: '#ff8020' }, desc: 'He said you could have his nose. He insisted.' });
  add({ id: 'golden_feather', name: 'Golden Hen Feather', slot: 'material', rarity: 'rare', price: 150, icon: { shape: 'feather', color: '#ffd040', color2: '#fff4a0' }, desc: 'Proof that you survived the wrath of the hens. Barely.' });

  // ================================================================== critters & mimics
  const M = R.Monsters, sh = U.shade;
  M.chicken = {
    w: 16, h: 16, ax: 8, ay: 14, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main || '#f4f0e8', d = sh(m, -0.25);
      const bob = anim === 'walk' ? [0, -1, 0, -1][f] : anim === 'idle' ? f : 0;
      const y = 5 + bob;
      P.rect(6, y + 7, 1, 3, '#e0a020'); P.rect(9, y + 7, 1, 3 - (anim === 'walk' ? f % 2 : 0), '#e0a020');
      P.ellipse(8, y + 4, 5, 3, m); P.rect(3, y + 2, 3, 3, d); P.px(3, y + 1, d);
      P.rect(10, y - 1, 3, 4, m); P.px(13, y + 1, '#e0a020'); P.px(12, y, '#140c1c');
      P.rect(10, y - 2, 2, 1, p.comb || '#e03030'); P.px(11, y + 3, p.comb || '#e03030');
      if (anim === 'attack' || anim === 'windup') { P.rect(5, y + 1, 4, 1, sh(m, 0.2)); P.px(12, y, '#ff2020'); }
    },
  };
  M.mimic = {
    w: 24, h: 24, ax: 12, ay: 22, frames: { idle: 2, walk: 4, windup: 1, attack: 2 },
    draw(P, p, anim, f) {
      const wood = '#8a5a30', band = '#6a6a6a';
      const open = anim === 'attack' ? (f ? 7 : 4) : anim === 'windup' ? 3 : anim === 'walk' ? [1, 3, 1, 2][f] : f;
      const y = 8;
      P.rect(3, y + 5, 18, 9, wood); P.rect(3, y + 13, 18, 1, sh(wood, -0.35)); P.rect(5, y + 5, 2, 9, band); P.rect(17, y + 5, 2, 9, band);
      P.rect(4, y + 5 - open, 16, 3, '#2a0a10'); P.rect(6, y + 6 - open, 12, 2, '#e04060'); // tongue
      for (let x = 4; x < 20; x += 2) { P.px(x, y + 5 - open, '#f4ecd8'); P.px(x + 1, y + 4, '#f4ecd8'); }
      P.rect(3, y - open, 18, 5, wood); P.rect(3, y - open, 18, 1, sh(wood, 0.3)); P.rect(5, y - open, 2, 5, band); P.rect(17, y - open, 2, 5, band);
      P.px(9, y + 1 - open, '#ffe040'); P.px(14, y + 1 - open, '#ffe040');
      if (anim === 'walk') { P.rect(4 + (f % 2), y + 14, 2, 2, wood); P.rect(18 - (f % 2), y + 14, 2, 2, wood); }
    },
  };
  R.mob('hen', 'Hen', 1, { hp: 0.5, atk: 0.05, xp: 0.1, spd: 30, r: 5, height: 10, sprite: 'chicken', pal: { main: '#f4f0e8' }, update: (e, dt, sm) => critterAI(e, dt, sm), gold: [0, 0], potion: 0, gearChance: 0, tags: ['critter'], blood: '#ffffff' });
  R.mob('angry_hen', 'Vengeful Hen', 1, { hp: 99, atk: 0.2, xp: 0, spd: 95, r: 5, height: 10, sprite: 'chicken', pal: { main: '#fff4e0', comb: '#ff1010' }, ai: 'swarm', attack: { cd: 0.5, mult: 1 }, gold: [0, 0], potion: 0, gearChance: 0, tags: ['critter', 'flying'], blood: '#ffffff', knockResist: 1, dodge: 0, flee: 0, drops: [{ item: 'golden_feather', chance: 0.02 }] });
  for (const [lv, lvId] of [[4, 'mimic_1'], [9, 'mimic_2'], [13, 'mimic_3'], [17, 'mimic_4'], [21, 'mimic_5']]) {
    R.mob(lvId, 'Mimic', lv, { hp: 2.6, atk: 1.5, def: 6, xp: 4, spd: 58, r: 9, height: 18, sprite: 'mimic', pal: { main: '#8a5a30' }, ai: 'leaper', aggro: 60, attack: { range: 110, windup: 0.35, leapT: 0.35, radius: 18, cd: 1.4, mult: 1.4, color: '#ff4060' }, knockResist: 0.8, gold: [lv * 12, lv * 25], potion: 0.5, gearChance: 1, tags: ['construct'], blood: '#e04060', dodge: 0, flee: 0, uniqueChance: 0 });
  }
  // Wandering farm animals: stroll about, scurry off when hit. Hit a hen too often and... well.
  function critterAI(e, dt, sm) {
    const m = e.mem, p = R.World.player;
    if (e.lastHit < 1.2 && p) { e.moveAngle(U.angle(p.x, p.y, e.x, e.y), 90 * sm, dt); e.anim = 'walk'; return; }
    m.t = (m.t == null ? U.rand(1, 3) : m.t) - dt;
    if (m.t <= 0) { m.t = U.rand(1.5, 4); m.a = Math.random() < 0.55 ? U.rand(0, U.TAU) : null; }
    if (m.a != null && U.dist(e.x, e.y, e.home.x, e.home.y) < 70) { e.moveAngle(m.a, (e.def.spd || 30) * sm, dt); e.anim = 'walk'; }
    else if (m.a != null) { e.moveToward(e.home.x, e.home.y, (e.def.spd || 30) * sm, dt); e.anim = 'walk'; }
    else e.anim = 'idle';
    if (Math.random() < dt * 0.15) FX.text(e.x, e.y - 16, U.choose(['BOK', 'BOK BOK', 'CLUCK']), '#fff4c0');
  }
  // The hens remember.
  R.events.on('kill', (ev) => { if (ev.enemy === 'hen') henWrath(ev.entity); });
  let henHits = 0;
  const origDamage = R.Combat.damage;
  R.Combat.damage = function (t, amount, o) {
    if (t && t.def && t.def.id === 'hen' && !t.dead && o && o.source === R.World.player) { if (++henHits >= 7) { henHits = 0; henWrath(t); } }
    return origDamage.apply(this, arguments);
  };
  function henWrath(near) {
    const W = R.World;
    if (W.flags._henWrathT > W.time) return;
    W.flags._henWrathT = W.time + 25;
    W.flags.henWraths = (W.flags.henWraths || 0) + 1;
    R.UI.banner('THE HENS', 'have had enough.');
    R.Audio.play('bossRoar', { pitch: 2.4 });
    const p = W.player;
    for (let i = 0; i < 14; i++) W.later(i * 0.18, () => {
      const a = U.rand(0, U.TAU), x = p.x + Math.cos(a) * 170, y = p.y + Math.sin(a) * 110;
      const h = W.spawnEnemy('angry_hen', x, y, 1);
      if (h) h.state = 'chase';
    });
    W.later(18, () => { for (const e of W.enemies) if (e.id === 'angry_hen' && !e.dead) { FX.burst(e.x, e.y - 6, { n: 10, color: '#ffffff', speed: 50, life: 0.5 }); e.remove = true; } R.UI.toast('The hens have made their point.', 'quest'); });
  }
  R.Props.rubberduck = { w: 12, h: 10, ax: 6, ay: 8, box: null, anim: 2, draw(P, r, ctx, f) { const b = f || 0; P.ellipse(6, 6 - b, 4, 2, '#ffe040'); P.circle(8, 3 - b, 2, '#ffe040'); P.px(10, 3 - b, '#ff8020'); P.px(8, 2 - b, '#140c1c'); P.rect(2, 8, 8, 1, 'rgba(200,230,255,0.6)'); } };
  R.Props.fishspot = { w: 16, h: 10, ax: 8, ay: 6, box: null, anim: 4, outline: false, draw(P, r, ctx, f) { const k = f || 0; ctx.globalAlpha = 0.7; P.ellipse(8, 5, 3 + k, 1 + (k >> 1), 'rgba(230,245,255,0.8)'); P.ellipse(8, 5, 1 + (k >> 1), 1, '#2f6fb0'); ctx.globalAlpha = 1; P.px(8 + (k % 2), 4, '#ffffff'); } };

  // Mirage: a shimmering oasis that fades away as you get close.
  // (built on first use: the Entity base class loads after the data files)
  let Mirage = null;
  function makeMirage() { if (Mirage) return Mirage; Mirage = class extends R.Entity {
    constructor(x, y) { super(x, y); this.solid = false; this.t = 0; }
    get sortY() { return this.y - 40; }
    update(dt) { this.t += dt; const p = R.World.player; this.a = p ? U.clamp((U.dist(p.x, p.y, this.x, this.y) - 60) / 140, 0, 0.8) : 0.8; if (p && this.a < 0.05 && !this.told) { this.told = true; R.UI.toast('...it was a mirage.', 'quest'); } }
    draw(ctx) {
      if (this.a <= 0.01) return;
      ctx.save(); ctx.globalAlpha = this.a * (0.8 + Math.sin(this.t * 3) * 0.2);
      const pond = G.glow(40, '#60c0ff'); ctx.drawImage(pond, this.x - 40, this.y - 30);
      const palm = R.Props.sprite('palm', 0, 0); ctx.drawImage(palm, this.x - 30, this.y - 50); ctx.drawImage(palm, this.x + 4, this.y - 46);
      ctx.restore();
    }
  }; return Mirage; }

  // ================================================================== new-area generator
  // Extensions: side, size (tiles), name, lv (enemy level), biome recipe.
  const LOOT_BAND = (lv) => Object.values(R.Items).filter((it) => R.SLOTS.includes(it.slot) && !it.dropsFrom && !it.noDrop && it.level >= lv - 3 && it.level <= lv + 3 && it.rarity !== 'common');
  function potionFor(lv) { return lv < 5 ? 'potion_small' : lv < 10 ? 'potion' : lv < 17 ? 'potion_large' : 'potion_super'; }

  const EXT = {
    town: {
      side: 'west', size: 32, name: 'Havenbrook Outskirts', lv: 1, safe: true, base: 'grass', alt: 'darkgrass', path: 'path', wall: 'canopy', water: 'water', cliff: 'rock',
      trees: ['autumntree', 'tree'], deco: ['flowers', 'bush', 'rock', 'stump', 'log'], treeN: 55, pois: ['farm', 'duckpond', 'orchard', 'lookout', 'shrine'], spawns: [],
    },
    forest: {
      side: 'south', size: 38, name: 'Fernhollow Glades', lv: 4, base: 'grass', alt: 'darkgrass', alt2: 'dirt', path: 'path', wall: 'canopy', water: 'water', cliff: 'rock',
      trees: ['tree', 'pine'], deco: ['bush', 'mushroom', 'flowers', 'log', 'stump', 'rock'], treeN: 160,
      pois: ['cliff', 'ruins', 'den', 'pond', 'camp', 'mimic', 'cowsign', 'graves'], spawns: [['wolf', 4], ['boar', 4], ['goblin', 4], ['mushroom', 3], ['slime', 3], ['goblin_archer', 4]], den: 'wolf', camp: 'goblin',
    },
    marsh: {
      side: 'east', size: 34, name: 'The Drowned Hamlet', lv: 8, base: 'swamp', alt: 'murk', alt2: 'mud', path: 'mud', wall: 'canopy', water: 'bog', cliff: 'rock',
      trees: ['swamptree', 'mangrove', 'deadtree'], deco: ['reeds', 'lily', 'bigshroom', 'log'], treeN: 90,
      pois: ['sunken', 'sunken', 'den', 'pond', 'cliff', 'mimic', 'shrine', 'camp'], spawns: [['bog_zombie', 8], ['drowned', 8], ['bog_witch', 9], ['lizardman', 8], ['wisp', 8], ['swamp_frog', 7]], den: 'lizardman', camp: 'bog_witch',
    },
    desert: {
      side: 'south', size: 38, name: 'The Glass Canyons', lv: 12, base: 'sand', alt: 'dune', path: 'path', wall: 'sandcliff', water: 'water', cliff: 'sand',
      trees: ['cactus', 'palm'], deco: ['dunebush', 'skull', 'rock', 'sandcolumn'], treeN: 60,
      pois: ['cliff', 'cliff', 'ruins', 'camp', 'mirage', 'den', 'mimic', 'shrine'], spawns: [['scorpion', 11], ['sand_wraith', 12], ['mummy', 12], ['desert_bandit', 12], ['bandit_archer', 12], ['vulture', 11], ['sand_worm', 13]], den: 'scorpion', camp: 'desert_bandit',
    },
    peaks: {
      side: 'north', size: 34, name: 'Skyreach Glacier', lv: 16, base: 'snow', alt: 'ice', path: 'snowpath', wall: 'snowcliff', water: 'frozenlake', cliff: 'snow',
      trees: ['snowpine'], deco: ['snowrock', 'icecrystal', 'icespike'], treeN: 110,
      pois: ['cliff', 'frozenruins', 'snowman', 'den', 'camp', 'shrine', 'mimic'], spawns: [['ice_wolf', 15], ['yeti', 16], ['frost_wraith', 16], ['snow_harpy', 15], ['ice_golem', 17]], den: 'yeti', camp: 'ice_wolf',
    },
    volcano: {
      side: 'south', size: 34, name: 'The Ashen Wastes', lv: 20, base: 'ash', alt: 'volcrock', alt2: 'lavacrack', path: 'volcrock', wall: 'volcwall', water: 'lava', cliff: 'dark',
      trees: ['charredtree'], deco: ['obspike', 'lavarock', 'vent', 'bones'], treeN: 60,
      pois: ['cliff', 'ruins', 'camp', 'den', 'shrine', 'mimic', 'lavapool'], spawns: [['fire_imp', 19], ['salamander', 19], ['hellhound', 20], ['magma_golem', 20], ['ember_cultist', 20]], den: 'hellhound', camp: 'ember_cultist',
    },
    coast: {
      side: 'west', size: 30, name: 'Gull Downs', lv: 7, base: 'grass', alt: 'darkgrass', path: 'path', wall: 'canopy', water: 'water', cliff: 'coast',
      trees: ['tree', 'palm'], deco: ['flowers', 'bush', 'rock', 'driftwood'], treeN: 70,
      pois: ['cliff', 'ruins', 'camp', 'pond', 'mimic', 'shrine'], spawns: [['gull', 6], ['pirate', 7], ['pirate_gunner', 8], ['crab', 6], ['wolf', 6]], den: 'crab', camp: 'pirate',
    },
    thornwood: {
      side: 'west', size: 34, name: 'Wildheart Thicket', lv: 19, base: 'feygrass', alt: 'feymoss', path: 'mossstone', wall: 'thornwall', water: 'water', cliff: 'fey',
      trees: ['feytree', 'tree'], deco: ['thornbush', 'bluebells', 'mushroom', 'hollowlog'], treeN: 90,
      pois: ['cliff', 'ruins', 'den', 'pond', 'shrine', 'mimic', 'fairyshrine'], spawns: [['treant', 19], ['pixie', 18], ['fey_wolf', 18], ['briar_archer', 19], ['bramble', 18]], den: 'fey_wolf', camp: 'briar_archer',
    },
    oasis: {
      side: 'south', size: 22, name: 'Palm Gardens', lv: 9, safe: true, base: 'sand', alt: 'grass', path: 'sandstone', wall: 'sandcliff', water: 'water', cliff: 'sand',
      trees: ['palm'], deco: ['dunebush', 'flowers'], treeN: 35, pois: ['pond', 'orchard', 'shrine'], spawns: [],
    },
  };

  function extendMap(id, cfg) {
    const def = R.Maps[id];
    if (!def) return;
    const orig = def.build, ow = def.w, oh = def.h;
    const horiz = cfg.side === 'east' || cfg.side === 'west';
    const ox = cfg.side === 'west' ? cfg.size : 0, oy = cfg.side === 'north' ? cfg.size : 0;
    def.w = ow + (horiz ? cfg.size : 0); def.h = oh + (horiz ? 0 : cfg.size);
    if (ox || oy) R.MapOffsets[id] = { ox, oy };
    def.build = function (Mb) {
      orig.call(this, offsetBuilder(Mb, ox, oy, ow, oh));
      buildArea(Mb, id, cfg, { ox, oy, ow, oh });
    };
  }

  function buildArea(M, mapId, cfg, o) {
    const rng = U.rng('ext:' + mapId);
    const horiz = cfg.side === 'east' || cfg.side === 'west';
    // the new rectangle
    let E;
    if (cfg.side === 'west') E = [0, 0, cfg.size, M.h];
    else if (cfg.side === 'east') E = [o.ow, 0, cfg.size, M.h];
    else if (cfg.side === 'north') E = [0, 0, M.w, cfg.size];
    else E = [0, o.oh, M.w, cfg.size];
    const [ex, ey, ew, eh] = E;
    const inE = (x, y) => x >= ex && y >= ey && x < ex + ew && y < ey + eh;
    // ground
    for (let y = ey; y < ey + eh; y++) for (let x = ex; x < ex + ew; x++) {
      const n = M.noise(x * 0.09, y * 0.09);
      M.set(x, y, n > 0.66 ? cfg.alt : cfg.alt2 && n < 0.3 ? cfg.alt2 : cfg.base);
      if (x < 2 || y < 2 || x >= M.w - 2 || y >= M.h - 2) M.set(x, y, cfg.wall); // outer edge of the world
    }
    // openings through the old border into the new area
    const openings = [];
    const along = horiz ? [4, M.h - 5] : [4, M.w - 5];
    const walk = (x, y) => { const t = R.Tiles[M.get(x, y)]; return t && !t.solid; };
    for (let tries = 0; tries < 60 && openings.length < 3; tries++) {
      const k = Math.round(U.lerp(along[0], along[1], (openings.length + 0.5 + rng.range(-0.3, 0.3)) / 3));
      const pos = k + rng.int(-6, 6);
      let inner, outer;
      if (cfg.side === 'west') { inner = [ex + ew + 4, pos]; outer = [ex + ew - 3, pos]; }
      else if (cfg.side === 'east') { inner = [ex - 5, pos]; outer = [ex + 2, pos]; }
      else if (cfg.side === 'north') { inner = [pos, ey + eh + 4]; outer = [pos, ey + eh - 3]; }
      else { inner = [pos, ey - 5]; outer = [pos, ey + 2]; }
      if (!walk(inner[0], inner[1])) continue;
      if (openings.some((p) => Math.abs((horiz ? p.inner[1] : p.inner[0]) - pos) < 10)) continue;
      openings.push({ inner, outer });
    }
    for (const op of openings) {
      M.path([op.inner, op.outer], cfg.path, 3);
      clearProps(M, Math.min(op.inner[0], op.outer[0]) - 2, Math.min(op.inner[1], op.outer[1]) - 2, Math.abs(op.inner[0] - op.outer[0]) + 5, Math.abs(op.inner[1] - op.outer[1]) + 5);
    }
    // points of interest spread through the new area
    const spots = [];
    for (let tries = 0; tries < 400 && spots.length < cfg.pois.length; tries++) {
      const x = rng.int(ex + 8, ex + ew - 9), y = rng.int(ey + 8, ey + eh - 9);
      if (spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 13)) continue;
      spots.push([x, y]);
    }
    // trails: from each opening, then between points of interest
    const hub = spots[0] || [ex + ew / 2 | 0, ey + eh / 2 | 0];
    for (const op of openings) M.path([op.outer, hub], cfg.path, 2, 4);
    for (let i = 1; i < spots.length; i++) M.path([spots[i - 1], spots[i]], cfg.path, 2, 4);
    // area name + discovery
    const cx = ex + ew / 2 | 0, cy = ey + eh / 2 | 0;
    M.zone('area:' + cfg.name, cx, cy, Math.min(ew, eh) / 2 - 3, (W) => discover(W, cfg.name, cfg.lv));
    for (const op of openings) M.zone('area:' + cfg.name, op.outer[0], op.outer[1], 3, (W) => discover(W, cfg.name, cfg.lv));
    let n = 0;
    const lv = cfg.lv;
    const band = LOOT_BAND(Math.max(3, lv));
    const gearId = () => (band.length ? band[rng.int(0, band.length - 1)].id : potionFor(lv));
    const chestId = () => 'x_' + mapId + '_' + (n++);
    const wall = (x, y) => { const t = R.Tiles[M.get(x, y)]; return !t || t.solid; };
    const env = { rng, lv, mapId, chestId, gearId };
    cfg.pois.forEach((kind, i) => { const sp = spots[i]; if (sp) placePOI(M, kind, sp[0], sp[1], cfg, env); });
    // plants, rocks, trees in the new area only
    const area = [ex + 2, ey + 2, ew - 4, eh - 4];
    M.scatter(cfg.trees[0], Math.round(cfg.treeN * 0.6), { on: [cfg.base, cfg.alt], area, minDist: 2.2 });
    if (cfg.trees[1]) M.scatter(cfg.trees[1], Math.round(cfg.treeN * 0.4), { on: [cfg.base, cfg.alt], area, minDist: 2.2 });
    for (const d of cfg.deco) M.scatter(d, 12, { area, on: d === 'lily' ? ['water', 'bog'] : d === 'reeds' ? ['swamp', 'murk'] : undefined });
    // extra monster groups roaming the new area
    if (!cfg.safe) for (let k = 0; k < 6 && cfg.spawns.length; k++) {
      const [sid, slv] = cfg.spawns[k % cfg.spawns.length];
      for (let t = 0; t < 30; t++) {
        const x = rng.int(ex + 5, ex + ew - 6), y = rng.int(ey + 5, ey + eh - 6);
        if (wall(x, y) || spots.some(([a, b]) => Math.hypot(a - x, b - y) < 7)) continue;
        M.spawn(sid, x, y, { count: rng.int(2, 4), radius: 3, level: slv, elite: 0.12 });
        break;
      }
    }
    M.sign(hub[0] + 2, hub[1] + 1, cfg.name + (cfg.safe ? '' : '\n(Level ' + (lv - 1) + '-' + (lv + 2) + ')'));
  }
  // One point of interest at tile (x, y). env: {rng, lv, mapId, chestId(), gearId()}
  function placePOI(M, kind, x, y, cfg, env) {
    const { rng, lv, mapId, chestId, gearId } = env;
    switch (kind) {
      case 'cliff': {
        const w = rng.int(7, 10), h = rng.int(5, 7), px = x - (w >> 1), py = y - h;
        if (cfg.water !== 'lava') { M.circle(x - 1, py + h + 4, 2.2, cfg.water === 'bog' ? 'murk' : 'shallow'); }
        M.plateau(px, py, w, h, cfg.base, cfg.cliff);
        M.stairs(px + w - 4, py + h, 3, 2, cfg.cliff);
        if (cfg.water === 'water' || cfg.water === 'frozenlake') { M.path([[x - 1, py + 1], [x - 1, py + h - 1]], 'water', 1); M.waterfall(x - 2, py + h, 2, 2); M.circle(x - 1, py + h + 3, 1.6, 'water'); }
        M.chest(chestId(), px + 1, py + 1, { loot: [gearId(), potionFor(lv)], gold: 20 + lv * 12, tier: 'iron' });
        M.reserve(px - 1, py - 1, w + 2, h + 5);
        if (!cfg.safe && cfg.spawns.length) { const [sid, slv] = cfg.spawns[rng.int(0, cfg.spawns.length - 1)]; M.spawn(sid, px + (w >> 1), py + (h >> 1), { count: 2, radius: 2, level: slv + 1, elite: 0.3 }); }
        break;
      }
      case 'ruins': {
        const col = cfg.cliff === 'sand' ? 'sandcolumn' : 'pillar';
        for (let k = 0; k < 6; k++) { const a = k / 6 * U.TAU; M.prop(k % 2 ? 'ruinwall' : col, x + Math.round(Math.cos(a) * 4), y + Math.round(Math.sin(a) * 3), rng.int(0, 1)); }
        M.prop('statue', x, y - 1);
        M.chest(chestId(), x + 1, y + 1, { loot: [gearId(), potionFor(lv)], gold: 30 + lv * 15, tier: 'iron' });
        M.sign(x - 2, y + 2, U.choose(['These stones remember a kingdom\nno one else does.', 'Carved into the base:\n"The flame endures."', 'A worn inscription:\n"Turn back." Someone has added: "no :)"']));
        M.reserve(x - 5, y - 4, 11, 8);
        if (!cfg.safe && cfg.spawns.length) { const [sid, slv] = cfg.spawns[rng.int(0, cfg.spawns.length - 1)]; M.spawn(sid, x, y + 3, { count: 3, radius: 3, level: slv }); }
        break;
      }
      case 'den': {
        M.circle(x, y, 4.5, cfg.alt2 || cfg.alt, 1.5);
        for (let k = 0; k < 5; k++) M.prop(k % 2 ? 'bones' : 'skullpile', x + rng.int(-3, 3), y + rng.int(-3, 3));
        M.chest(chestId(), x, y - 3, { loot: [gearId(), gearId(), potionFor(lv)], gold: 50 + lv * 20, tier: 'gold' });
        M.spawn(cfg.den, x, y, { count: 4, radius: 3, level: lv + 1, elite: 0.6, respawn: 180 });
        M.reserve(x - 5, y - 5, 11, 11);
        break;
      }
      case 'camp': {
        M.circle(x, y, 4, cfg.path, 1);
        M.prop('tent', x - 3, y - 1, rng.int(0, 1)); M.prop('tent', x + 3, y - 1, rng.int(0, 1)); M.prop('campfire', x, y + 1); M.prop('crate', x + 3, y + 3); M.prop('barrel', x - 3, y + 3);
        M.chest(chestId(), x, y - 3, { loot: [gearId(), potionFor(lv)], gold: 40 + lv * 14, tier: 'iron' });
        M.spawn(cfg.camp, x, y + 2, { count: 3, radius: 3, level: lv, elite: 0.25 });
        M.reserve(x - 5, y - 4, 11, 9);
        break;
      }
      case 'pond': case 'duckpond': case 'lavapool': {
        const liquid = kind === 'lavapool' ? 'lava' : cfg.water === 'bog' ? 'bog' : 'water';
        if (liquid !== 'lava') M.circle(x, y, 4.6, cfg.water === 'bog' ? 'murk' : 'shallow', 1.2);
        M.circle(x, y, 3.2, liquid, 1);
        if (liquid === 'lava') { M.light(x, y, 90, '#ff6020', 0.15); M.prop('lavapillar', x + 5, y - 2); break; }
        M.prop('fishspot', x, y);
        M.interact({ x, y: y + 3, r: 34, label: 'Fish', fn: () => fish(mapId + ':' + x + ',' + y) });
        if (kind === 'duckpond') { M.prop('rubberduck', x - 1, y - 1); M.interact({ x: x - 1, y: y + 2, r: 26, label: 'Inspect the duck', fn: duck }); M.prop('bench', x + 5, y + 2); }
        for (let k = 0; k < 4; k++) M.prop(cfg.water === 'bog' ? 'reeds' : 'lily', x + rng.int(-3, 3), y + rng.int(-2, 2));
        M.reserve(x - 5, y - 5, 11, 11);
        break;
      }
      case 'sunken': {
        M.rect(x - 4, y - 3, 9, 7, 'planks');
        M.prop('stilthut', x - 2, y, rng.int(0, 1)); M.prop('barrel', x + 3, y + 2); M.prop('crate', x + 2, y + 3);
        M.chest(chestId(), x + 3, y - 2, { loot: [gearId(), potionFor(lv)], gold: 30 + lv * 12 });
        if (cfg.spawns.length) M.spawn(cfg.spawns[rng.int(0, cfg.spawns.length - 1)][0], x, y + 4, { count: 3, radius: 3, level: lv });
        M.reserve(x - 5, y - 4, 11, 9);
        break;
      }
      case 'shrine': case 'fairyshrine': {
        M.circle(x, y, 2.6, cfg.path, 0);
        M.prop(kind === 'fairyshrine' ? 'fairyring' : 'statue', x, y);
        for (let k = 0; k < 4; k++) M.prop(kind === 'fairyshrine' ? 'standingstone' : 'lamp', x + [-3, 3, -3, 3][k], y + [-2, -2, 2, 2][k], k % 3);
        M.interact({ x, y: y + 2, r: 30, label: 'Pray', fn: () => bless(mapId + ':' + x) });
        M.reserve(x - 4, y - 3, 9, 7);
        break;
      }
      case 'mimic': {
        // looks exactly like any other chest...
        const mid = lv < 7 ? 'mimic_1' : lv < 11 ? 'mimic_2' : lv < 15 ? 'mimic_3' : lv < 19 ? 'mimic_4' : 'mimic_5';
        M.chest(chestId(), x, y, { loot: [], gold: 0, mimic: mid });
        M.prop('bones', x - 2, y + 1); M.prop('bones', x + 2, y + 1);
        M.reserve(x - 2, y - 1, 5, 3);
        break;
      }
      case 'farm': {
        M.rect(x - 6, y - 3, 12, 7, 'farmland');
        for (let yy = y - 2; yy < y + 4; yy += 2) for (let xx = x - 5; xx < x + 6; xx += 2) M.prop('crops', xx, yy, rng.int(0, 2));
        M.prop('mill', x - 9, y - 2); M.prop('haystack', x + 8, y - 2); M.prop('scarecrow', x, y + 1);
        for (let xx = x - 6; xx < x + 6; xx++) M.prop('fence', xx, y + 5);
        M.prop('hut', x + 9, y + 3, 0);
        M.spawn('hen', x + 6, y + 7, { count: 5, radius: 3, level: 1, respawn: 60, critter: true });
        M.sign(x - 7, y + 5, 'Please do not bother the hens.\nWe mean it.\n— Management');
        M.reserve(x - 10, y - 4, 22, 13);
        break;
      }
      case 'orchard': {
        for (let yy = -2; yy <= 2; yy += 2) for (let xx = -4; xx <= 4; xx += 4) M.prop(cfg.trees[0], x + xx, y + yy, rng.int(0, 3));
        M.prop('cart', x + 6, y + 3); M.prop('crate', x - 6, y + 3);
        M.chest(chestId(), x, y + 4, { loot: ['elixir_speed', potionFor(Math.max(5, lv))], gold: 40 });
        M.reserve(x - 7, y - 3, 15, 9);
        break;
      }
      case 'lookout': {
        M.plateau(x - 4, y - 5, 9, 5, cfg.base, cfg.cliff);
        M.stairs(x - 1, y, 3, 2, cfg.cliff);
        M.prop('bench', x, y - 3); M.prop('lamp', x - 3, y - 4); M.prop('telescope' in R.Props ? 'telescope' : 'sign', x + 3, y - 4);
        M.chest(chestId(), x + 3, y - 2, { loot: ['elixir_might', 'potion'], gold: 80, tier: 'iron' });
        M.reserve(x - 5, y - 6, 11, 9);
        break;
      }
      case 'cowsign': {
        M.sign(x, y, 'There is no cow level.');
        M.interact({ x: x + 1, y: y + 1, r: 20, label: 'Look closer', fn: () => cowLevel(x, y) });
        M.reserve(x - 1, y - 1, 3, 3);
        break;
      }
      case 'graves': {
        const jokes = ['Here lies Steve.\nHe tried to punch a tree.', 'Here lies Gary.\nHe said "What does this lever do?"', 'Here lies a slime.\nIt was very, very round.', 'R.I.P. Sir Rollsalot.\nForgot to dodge.', 'Here lies the hero\'s pet rock.\nIt never moved on.'];
        for (let k = 0; k < jokes.length; k++) { M.prop('grave', x - 4 + k * 2, y); M.interact({ x: x - 4 + k * 2, y: y + 1, r: 12, label: 'Read', fn: () => R.UI.dialog([{ speaker: 'Gravestone', text: jokes[k] }]) }); }
        M.prop('deadtree', x - 6, y - 1); M.prop('candles', x + 6, y);
        M.reserve(x - 7, y - 2, 15, 4);
        break;
      }
      case 'frozenruins': {
        for (let k = 0; k < 5; k++) M.prop('frozenknight', x - 4 + k * 2, y + (k % 2));
        M.chest(chestId(), x, y - 3, { loot: [gearId(), 'ether_large'], gold: 60 + lv * 15, tier: 'iron' });
        M.sign(x - 5, y + 2, 'An army frozen mid-charge.\nSomeone has put a hat on one of them.');
        M.reserve(x - 6, y - 4, 13, 8);
        break;
      }
      case 'snowman': {
        M.prop('snowman', x, y);
        M.interact({ x, y: y + 1, r: 22, label: 'Talk', fn: frosty });
        M.reserve(x - 1, y - 1, 3, 3);
        break;
      }
      case 'mirage': {
        { const root = M.__root || M; root.extrasEntities = (root.extrasEntities || []).concat([{ kind: 'mirage', x: (x + (M.__ox || 0)) * S + 8, y: (y + (M.__oy || 0)) * S + 8 }]); }
        break;
      }
    }
  }
  function clearProps(M, x, y, w, h) {
    const root = M.__root || M; x += M.__ox || 0; y += M.__oy || 0;
    root.props = root.props.filter((p) => { const tx = Math.floor(p.x / S), ty = Math.floor(p.y / S); return !(tx >= x && tx < x + w && ty >= y && ty < y + h); });
  }

  // ================================================================== interactions
  function discover(W, name, lv) {
    const key = 'found:' + name;
    if (W.flags[key]) return;
    W.flags[key] = 1;
    const p = W.player;
    const xp = Math.round(R.xpForLevel(Math.max(1, Math.min(p.level, lv + 2))) * 0.12);
    R.UI.zoneBanner(name, 'New area discovered!  +' + xp + ' XP');
    R.Audio.play('quest', { pitch: 1.3 });
    p.gainXp(xp);
  }
  const fishCd = {};
  function fish(key) {
    const W = R.World, p = W.player;
    if ((fishCd[key] || 0) > W.time) { R.UI.toast('The fish are spooked. Give it a moment.'); return; }
    fishCd[key] = W.time + 4;
    p.castT = p.castDur = 0.6;
    R.Audio.play('dodge', { pitch: 1.6 });
    FX.burst(p.x + Math.cos(p.aim) * 30, p.y + Math.sin(p.aim) * 20, { n: 10, color: '#c0e8ff', speed: 30, life: 0.5 });
    W.later(0.8, () => {
      const r = Math.random();
      if (r < 0.01 || (W.flags.fishCasts = (W.flags.fishCasts || 0) + 1) === 50) { p.addItem('ancient_carp'); R.UI.lootToast(R.Items.ancient_carp, 1); R.UI.banner('LEGENDARY CATCH!', 'The Ancient Carp!'); R.Audio.play('levelup'); }
      else if (r < 0.11) { p.addItem('silver_trout'); R.UI.lootToast(R.Items.silver_trout, 1); R.Audio.play('pickup'); }
      else if (r < 0.5) { p.addItem('fish'); R.UI.lootToast(R.Items.fish, 1); R.Audio.play('pickup'); }
      else if (r < 0.53) R.UI.toast('You caught... an old boot. You throw it back.');
      else if (r < 0.55) R.UI.toast('Something HUGE pulls on the line... and snaps it. The one that got away.', 'quest');
      else R.UI.toast('Nothing bites.');
    });
  }
  function duck() {
    const W = R.World, p = W.player;
    W.flags.duckPokes = (W.flags.duckPokes || 0) + 1;
    const k = W.flags.duckPokes;
    if (k < 3) { R.UI.toast('The rubber duck regards you solemnly. Quack.'); R.Audio.play('talk', { pitch: 2 }); return; }
    if (!W.flags.duckGiven) {
      W.flags.duckGiven = 1;
      R.UI.dialog([{ speaker: 'Sir Quackington', text: 'QUACK. (You have proven your persistence. Sir Quackington will join your quest.)' }]);
      p.addItem('rubber_duck'); R.UI.lootToast(R.Items.rubber_duck, 1); R.Audio.play('levelup', { pitch: 2 });
    } else R.UI.toast('Sir Quackington is with you in spirit. (And in your bag.)');
  }
  const blessCd = {};
  function bless(key) {
    const W = R.World, p = W.player;
    if ((blessCd[key] || -1e9) > R.playtime) { R.UI.toast('The shrine is quiet. Come back later.'); return; }
    blessCd[key] = R.playtime + 120;
    const b = U.choose([['atk', 0.2, true, 'Blessing of Might'], ['def', 12, false, 'Blessing of Stone'], ['spd', 0.2, false, 'Blessing of Wind'], ['hpRegen', 4, false, 'Blessing of Life'], ['mag', 0.2, true, 'Blessing of Stars']]);
    p.addBuff(b[0], b[1], 120, b[2], b[3]);
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    FX.pillar(p.x, p.y, '#ffe070', 1, 16); R.Audio.play('heal');
    R.UI.toast(b[3] + ' for 2 minutes. You feel restored.', 'good');
  }
  function frosty() {
    const W = R.World, p = W.player;
    W.flags.frosty = (W.flags.frosty || 0) + 1;
    const lines = ['The snowman stares at you with coal eyes.', 'The snowman is definitely staring at you.', '"Do you want to build a—" The snowman stops itself. "No. Too soon."', '"Take my nose. I insist. I have been waiting years to be useful."'];
    const k = Math.min(W.flags.frosty, lines.length) - 1;
    R.UI.dialog([{ speaker: 'Frosty', text: lines[k] }]);
    if (k === 3 && !W.flags.frostyNose) { W.flags.frostyNose = 1; p.addItem('carrot'); R.UI.lootToast(R.Items.carrot, 1); }
  }
  function cowLevel(x, y) {
    const W = R.World;
    W.flags.cowLook = (W.flags.cowLook || 0) + 1;
    if (W.flags.cowLook < 3) { R.UI.toast(W.flags.cowLook === 1 ? 'The sign insists there is no cow level.' : 'The sign is VERY insistent.'); return; }
    if (W.npcs.some((n) => n.id === 'cow')) { R.UI.toast('Moo.'); return; }
    R.UI.toast('...you hear a distant "Moo."', 'quest');
    const n = W.add(new R.NPC(R.NPCs.cow, x * S + 40, y * S + 12));
    FX.burst(n.x, n.y - 8, { n: 30, colors: ['#ffffff', '#202020'], speed: 60, glow: true });
  }
  R.addNPC({ id: 'cow', name: 'Definitely Not a Cow', title: 'Secret', wander: 20, appearance: null,
    drawSprite(ctx, n) {
      const f = Math.floor(n.animT * 3) % 2, x = Math.round(n.x), y = Math.round(n.y);
      ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 11, y - 14, 22, 12);
      ctx.fillStyle = '#f4f0e8'; ctx.fillRect(x - 10, y - 13, 20, 10); ctx.fillStyle = '#202020'; ctx.fillRect(x - 6, y - 12, 5, 4); ctx.fillRect(x + 3, y - 9, 4, 4);
      ctx.fillStyle = '#f4f0e8'; ctx.fillRect(x + 8, y - 16, 6, 6); ctx.fillStyle = '#ffb0c0'; ctx.fillRect(x + 11, y - 12, 3, 2); ctx.fillStyle = '#140c1c'; ctx.fillRect(x + 10, y - 15, 1, 1);
      ctx.fillStyle = '#e0d8c8'; for (const lx of [-8, -4, 3, 7]) ctx.fillRect(x + lx, y - 3, 2, 3 + ((lx + f) % 2));
    },
    lines: ['Moo.', 'Moo?', 'There is no cow level. Moo.', '*chews thoughtfully*'] });

  // ================================================================== easter egg: the Konami code
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let kpos = 0;
  window.addEventListener('keydown', (e) => {
    kpos = e.code === KONAMI[kpos] ? kpos + 1 : e.code === KONAMI[0] ? 1 : 0;
    if (kpos < KONAMI.length) return;
    kpos = 0;
    R.settings.secrets = true; R.Save.saveSettings();
    R.Audio.play('levelup');
    R.UI.banner('+30 LIVES', '(Just kidding. But golden colours are now unlocked in the character creator.)');
    const C = R.Character;
    for (const [list, extra] of [[C.SKINS, ['#ffd700', '#f0f0ff']], [C.HAIR_COLORS, ['#ffd700', '#ff00ff']], [C.EYE_COLORS, ['#ffd700']], [C.OUTFIT_COLORS, ['#ffd700']]]) for (const c of extra) if (!list.includes(c)) list.push(c);
    if (R.UI.current === 'create' || R.UI.current === 'wardrobe') R.UI.refresh();
  });
  if (R.settings && R.settings.secrets) { const C = R.Character; for (const [list, extra] of [[C.SKINS, ['#ffd700', '#f0f0ff']], [C.HAIR_COLORS, ['#ffd700', '#ff00ff']], [C.EYE_COLORS, ['#ffd700']], [C.OUTFIT_COLORS, ['#ffd700']]]) for (const c of extra) if (!list.includes(c)) list.push(c); }

  // ================================================================== mimic chests + mirages
  // (hooked into the world after it loads a map)
  R.events.on('chest', (ev) => {
    const W = R.World;
    const c = W.map.chests.find((x) => x.id === ev.id);
    if (!c || !c.mimic) return;
    const e = W.spawnEnemy(c.mimic, c.x, c.y - 2);
    if (e) { e.state = 'chase'; e.popIn = 0; }
    for (const ent of W.entities) if (ent instanceof R.Chest && ent.cid === ev.id) ent.remove = true;
    R.UI.toast('The chest has TEETH!', 'bad'); R.Audio.play('bossRoar', { pitch: 1.8 }); FX.shake(4, 0.3);
  });
  R.events.on('enter', () => {
    const W = R.World, M = W.map;
    for (const x of M.extrasEntities || []) if (x.kind === 'mirage') W.add(new (makeMirage())(x.x, x.y));
  });

  // ================================================================== apply
  for (const [id, cfg] of Object.entries(EXT)) extendMap(id, cfg);
  // shared with the wilderness generator (data/wilds.js)
  R.Ext = { EXT, offsetBuilder, placePOI, clearProps, discover, potionFor, LOOT_BAND, fish, bless };
})(window.RPG);
