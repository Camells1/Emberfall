'use strict';
// The Crimson Colosseum: a PvP arena just west of Havenbrook.
//   - In co-op, players inside the arena can hit each other (damage is scaled down so fights last).
//     Falling in the arena costs nothing: you're back on your feet in 3 seconds. Kills are announced
//     and counted on the scoreboard.
//   - Alone (or as a team) you can strike the gong for the Gauntlet: five waves of monsters at your level.
(function (R) {
  const U = R.U, S = 16;
  const PVP_DMG = 0.4;
  const A = R.Arena = { scores: {}, lastHitBy: null, lastHitT: 0 };

  // ================================================================== the arena map
  R.addMap('arena', {
    name: 'The Crimson Colosseum', subtitle: 'PvP Arena · The Gauntlet', w: 64, h: 52, level: 1, music: 'boss', pvp: true, dustColor: '#c8a870',
    build(M) {
      const cx = 32, cy = 23;
      M.fill('sandwall');
      // stands (spectators) and the arena floor
      M.noiseFill(1, (n, x, y) => { const d = Math.hypot((x - cx) / 29, (y - cy) / 21); return d < 1 ? 'cobble' : null; });
      M.noiseFill(1, (n, x, y) => { const d = Math.hypot((x - cx) / 24.5, (y - cy) / 17.5); return d < 1 ? 'sandwall' : null; });
      M.noiseFill(0.2, (n, x, y) => { const d = Math.hypot((x - cx) / 22, (y - cy) / 15.5); return d < 1 ? (n > 0.7 ? 'dirt' : 'sand') : null; });
      // the tunnel in from the south
      M.rect(30, 37, 5, 15, 'cobble');
      M.rect(24, 44, 17, 6, 'cobble');
      M.exit(29, 51, 7, 1, 'town', 'arena', { label: 'Back to Havenbrook', color: '#ffd040' });
      M.point('entrance', 32, 46);
      M.point('start', 32, 46);
      for (const x of [29, 35]) for (const y of [38, 42]) M.prop('pillar', x, y);
      M.prop('brazier', 25, 45); M.prop('brazier', 39, 45); M.light(25, 45, 80, '#ffb060', 0.2); M.light(39, 45, 80, '#ffb060', 0.2);
      M.sign(27, 47, 'THE CRIMSON COLOSSEUM\nInside the ring, players can fight each other.\nStrike the gong to face the Gauntlet.');
      M.npc('arena_master', 36, 46);
      // practice dummies
      for (const x of [25, 27, 37, 39]) M.prop('dummy', x, 49);
      // banners, braziers and statues around the ring
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * U.TAU; if (Math.sin(a) > 0.9) continue;
        const x = Math.round(cx + Math.cos(a) * 26.5), y = Math.round(cy + Math.sin(a) * 19.2);
        M.prop(k % 2 ? 'banner' : 'brazier', x, y, k % 3);
      }
      M.prop('statue', cx - 12, 4); M.prop('statue', cx + 12, 4);
      // the gong
      M.prop('warbanner', cx, 8);
      M.interact({ x: cx, y: 10, r: 26, label: () => (A.gauntlet ? 'The Gauntlet is on!' : 'Strike the gong (the Gauntlet)'), fn: startGauntlet });
      // spectators
      const seats = [];
      for (let k = 0; k < 26; k++) { const a = k / 26 * U.TAU; if (Math.sin(a) > 0.75) continue; seats.push([Math.round(cx + Math.cos(a) * 27.5), Math.round(cy + Math.sin(a) * 20)]); }
      seats.forEach(([x, y], i) => { if (M.get(x, y) === 'cobble') M.npc('spectator_' + (i % 8), x, y); });
      M.reserve(0, 0, 64, 52);
    },
  });

  // ================================================================== people
  const add = R.addNPC;
  add({
    id: 'arena_master', name: 'Varga the Red', title: 'Arena Master',
    appearance: { body: 'a', skin: '#b07050', hair: 'mohawk', hairColor: '#c02020', eyes: '#202020', beard: 'goatee', beardColor: '#c02020', outfit: '#8a2020', outfit2: '#e0c060' },
    gear: { chest: { style: 'plate', color: '#8a2a2a', trim: '#e0c060' }, cape: { style: 'cape', color: '#a02020', trim: '#e0c060' } },
    weapon: { type: 'greatsword', blade: '#d8e0e8', handle: '#3a2020' },
    lines: ['Blood and glory! Mostly glory. Some blood.', 'The crowd wants a show. Give them one!', 'Bring your friends and settle who is the strongest — in the ring, not in my tavern.'],
    extraChoices: () => [
      { text: 'How does the arena work?', next: [{ speaker: 'Varga the Red', text: 'In the ring, fighters can strike each other — that means YOU and your friends, if you came together. Nobody truly dies in my arena: fall, and you are back on your feet in three heartbeats.' }, { speaker: 'Varga the Red', text: 'No friends? Strike the gong at the north end. The Gauntlet sends five waves of beasts at you. Survive them all and the purse is yours.' }] },
      { text: 'Show me the scoreboard.', fn: () => { R.World.later(0, () => R.UI.dialog([{ speaker: 'Varga the Red', text: scoreText() }])); return 'close'; } },
    ],
  });
  const SPEC = [['#e8b088', 'short', '#6a3a1a'], ['#c98e62', 'long', '#1a1a1a'], ['#fde0c5', 'bob', '#d0a040'], ['#8a5a3a', 'buzz', '#101010'], ['#e8b088', 'ponytail', '#a04020'], ['#6a4030', 'afro', '#202020'], ['#f0c8a0', 'bald', '#000000'], ['#c98e62', 'braids', '#4a2a10']];
  const CHEERS = ['FIGHT! FIGHT! FIGHT!', 'Hit him with the pointy end!', 'I have twenty gold on the short one!', 'BOOOO!', 'Did you see that?!', '*throws a turnip*', 'Again! AGAIN!', 'My grandma hits harder!', 'Is this the Gauntlet? I love the Gauntlet!'];
  SPEC.forEach(([skin, hair, hc], i) => add({ id: 'spectator_' + i, name: 'Spectator', title: 'Crowd', wander: 0, chatter: CHEERS,
    appearance: { body: i % 2 ? 'b' : 'a', skin, hair, hairColor: hc, eyes: '#202020', beard: i % 3 ? 'none' : 'stubble', outfit: ['#8a2a2a', '#2a4a8a', '#6a6a2a', '#4a2a6a'][i % 4], outfit2: '#d8c8a0' },
    lines: CHEERS }));

  // ================================================================== the gate in Havenbrook
  // (placed after the wilds are built: just outside the west side of the village)
  const town = R.Maps.town;
  if (town) {
    const orig = town.build;
    town.build = function (M) {
      orig.call(this, M);
      const w = town.wild || { ox: 0, oy: 0, cw: M.w, ch: M.h };
      const gx = Math.max(12, w.ox - 14), gy = Math.round(w.oy + w.ch / 2);
      // clear the ground, pave a plaza and a road back to the village
      if (R.Ext) R.Ext.clearProps(M, gx - 9, gy - 8, 19, 16);
      M.spawns = M.spawns.filter((s) => Math.hypot(s.x / S - gx, s.y / S - gy) > 22);
      if (M.nodes) M.nodes = M.nodes.filter((n) => Math.hypot(n.x / S - gx, n.y / S - gy) > 10);
      M.circle(gx, gy + 1, 7, 'cobble', 0);
      M.path([[gx + 4, gy + 1], [w.ox + 3, gy + 1]], 'path', 3);
      for (let i = gx - 5; i <= gx + 5; i++) { M.set(i, gy - 5, 'sandwall'); M.set(i, gy - 6, 'sandwall'); }
      M.exit(gx - 1, gy - 4, 3, 1, 'arena', 'entrance', { label: 'Enter the Crimson Colosseum (PvP Arena)', prompt: true, color: '#ff4040' });
      M.prop('gate', gx, gy - 3);
      M.prop('warbanner', gx - 4, gy - 3); M.prop('warbanner', gx + 4, gy - 3);
      M.prop('brazier', gx - 6, gy); M.prop('brazier', gx + 6, gy);
      M.sign(gx + 3, gy + 3, 'THE CRIMSON COLOSSEUM\nPvP Arena — bring your friends!\nOr strike the gong and face the Gauntlet.');
      M.point('arena', gx, gy + 2);
      M.reserve(gx - 8, gy - 7, 17, 15);
    };
  }

  // ================================================================== PvP rules
  // Your attacks can hit other players while you're both in the arena.
  const inArena = () => R.World.def && R.World.def.pvp;
  A.active = () => inArena() && R.Net && R.Net.active();
  const hostiles = R.Combat.hostiles;
  R.Combat.hostiles = function (team) {
    const list = hostiles.call(this, team);
    if (team !== 'player' || !A.active()) return list;
    const extra = [];
    for (const p of R.Net.peers.values()) if (p.ent && !p.ent.remove && !p.ent.dead) extra.push(p.ent);
    return extra.length ? list.concat(extra) : list;
  };
  // hurtRemote tags player-vs-player hits so the other game scales them and knows who hit them
  const hurtRemote = R.Net && R.Net.hurtRemote;
  if (R.Net) {
    R.Net.hurtRemote = function (t, amount, o) {
      if (A.active() && o && o.source === R.World.player) {
        R.Net.sendTo(t.peer.id, { t: 'hurt', pv: 1, a: Math.round(amount * PVP_DMG * 10) / 10, k: Math.min(160, o.knock || 0), an: o.angle != null ? +o.angle.toFixed(2) : null, st: null, td: 0 });
        const est = Math.max(1, Math.round(amount * PVP_DMG));
        R.FX.text(t.x, t.y - 28, String(est), o.crit ? '#ffd040' : '#ff8080', { crit: o.crit });
        R.FX.burst(t.x, t.y - 10, { n: 6, colors: ['#c02030', '#ffffff'], speed: 60, angle: o.angle, spread: 0.9, life: 0.35 });
        R.Audio.play(o.crit ? 'crit' : 'hit');
        return est;
      }
      return hurtRemote.call(this, t, amount, o);
    };
    R.Net.onPvpHit = function (from) { A.lastHitBy = from; A.lastHitT = R.World.time; };
  }

  // Dying in the arena: announce it, then back on your feet in 3 seconds.
  let downT = 0, announced = false;
  R.events.on('tick', (dt) => {
    const W = R.World, p = W.player;
    if (!p || !inArena()) { downT = 0; announced = false; return; }
    if (!p.dead) { downT = 0; announced = false; return; }
    W.deathShown = true; // no death screen in the arena
    if (!announced) {
      announced = true;
      const killer = A.lastHitBy != null && W.time - A.lastHitT < 6 ? A.lastHitBy : null;
      const msg = { t: 'pvpkill', k: killer, v: R.Net && R.Net.active() ? R.Net.myId : 0, kn: killer != null && R.Net ? R.Net.nameOf(killer) : null, vn: p.name };
      if (R.Net && R.Net.active()) R.Net.broadcastPvp(msg);
      onKill(msg);
    }
    downT += dt;
    if (downT > 3) arenaRespawn();
  });
  function arenaRespawn() {
    const W = R.World, p = W.player;
    p.dead = false; p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.status = {}; p.shield = 0; p.deadT = 0; p.hurtT = 0; p.invuln = 2.5; p.stamina = p.maxStamina(); p.tired = false;
    const a = U.rand(0, U.TAU); p.x = 32 * S + Math.cos(a) * 200; p.y = 23 * S + Math.sin(a) * 140;
    W.deathShown = false; W.deathT = 0; downT = 0;
    R.FX.pillar(p.x, p.y, '#ffd040', 1, 14); R.Audio.play('heal');
    R.UI.toast('Back into the fight!', 'good');
  }
  function onKill(m) {
    if (m.k != null) A.scores[m.kn || '?'] = (A.scores[m.kn || '?'] || 0) + 1;
    const txt = m.kn ? `⚔ ${m.kn} defeated ${m.vn}!` : `⚔ ${m.vn} has fallen!`;
    R.UI.toast(txt, 'quest');
    R.Audio.play('bossRoar', { pitch: 1.4 });
  }
  A.onRemoteKill = onKill;
  function scoreText() {
    const e = Object.entries(A.scores).sort((a, b) => b[1] - a[1]);
    if (!e.length) return 'No blood spilled yet today. Go and change that!';
    return 'Victories today — ' + e.map(([n, k]) => `${n}: ${k}`).join(', ') + '.';
  }

  // ================================================================== the Gauntlet
  const EXCLUDE = new Set(['spider_egg', 'rose_turret', 'eye_orb', 'shadow_clone', 'mummy_guard', 'angry_hen', 'hen', 'spiderling']);
  function startGauntlet() {
    const W = R.World, p = W.player;
    if (A.gauntlet) { R.UI.toast('The Gauntlet is already underway!'); return; }
    if (R.Net && R.Net.active() && !R.Net.authority) { R.UI.toast('Whoever arrived first runs this arena — ask them to strike the gong.', 'bad'); return; }
    const lv = p.level;
    const pool = Object.values(R.Enemies).filter((d) => !d.boss && !EXCLUDE.has(d.id) && !/mimic/.test(d.id) && !(d.tags || []).includes('critter') && (d.level || 1) >= lv - 5 && (d.level || 1) <= lv + 3 && (d.spd || 0) > 0);
    if (!pool.length) { R.UI.toast('No challengers answer the gong today.'); return; }
    A.gauntlet = { wave: 0, pool, lv, alive: [] };
    R.Audio.play('bossRoar', { pitch: 0.5 }); R.FX.shake(5, 0.5);
    R.UI.banner('THE GAUNTLET', 'Survive five waves!');
    W.later(2, nextWave);
  }
  function nextWave() {
    const W = R.World, g = A.gauntlet;
    if (!g || !inArena()) { A.gauntlet = null; return; }
    g.wave++;
    const n = 2 + g.wave + (R.Net && R.Net.active() ? R.Net.remoteCount() : 0);
    R.UI.toast(`Wave ${g.wave} of 5!`, 'bad');
    g.alive = [];
    for (let i = 0; i < n; i++) {
      const d = g.pool[Math.floor(Math.random() * g.pool.length)];
      const a = i / n * U.TAU, x = 32 * S + Math.cos(a) * 220, y = 23 * S + Math.sin(a) * 150;
      const e = W.spawnEnemy(d.id, x, y, g.lv + Math.floor(g.wave / 2));
      if (!e) continue;
      e.state = 'chase'; e.noLoot = g.wave < 5; e.goldMult = 0.3;
      if (g.wave === 5 && i === 0) { e.elite = true; e.maxHp = e.hp = Math.round(e.maxHp * 3); e.atk *= 1.4; }
      g.alive.push(e);
    }
    const check = () => {
      if (A.gauntlet !== g) return;
      if (!inArena()) { A.gauntlet = null; return; }
      if (W.player.dead && !(R.Net && R.Net.active())) { R.UI.toast('The Gauntlet has beaten you. The crowd boos... politely.', 'bad'); A.gauntlet = null; for (const e of g.alive) e.remove = true; return; }
      if (g.alive.some((e) => !e.dead && !e.remove)) { W.later(0.5, check); return; }
      if (g.wave >= 5) { finish(); return; }
      R.Audio.play('quest'); W.later(2.5, nextWave);
    };
    W.later(1, check);
  }
  function finish() {
    const W = R.World, p = W.player, g = A.gauntlet;
    A.gauntlet = null;
    const gold = 40 * g.lv + 60, xp = Math.round(R.xpForLevel(p.level) * 0.2);
    p.gold += gold; p.gainXp(xp);
    W.flags.gauntletWins = (W.flags.gauntletWins || 0) + 1;
    R.events.emit('gauntlet:win', { wins: W.flags.gauntletWins });
    R.UI.banner('GAUNTLET CLEARED!', `+${gold} gold  +${xp} XP`);
    R.Audio.play('levelup'); R.FX.pillar(p.x, p.y, '#ffd040', 1.2, 20);
    if (Math.random() < 0.5) { const band = Object.values(R.Items).filter((it) => R.SLOTS.includes(it.slot) && !it.noDrop && !it.dropsFrom && it.level >= p.level - 3 && it.level <= p.level + 2 && ['rare', 'epic'].includes(it.rarity)); if (band.length) { const it = U.choose(band); p.addItem(it.id); R.UI.lootToast(it, 1); } }
  }
})(window.RPG);
