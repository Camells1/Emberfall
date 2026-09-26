'use strict';
// Learnable skills. Every class starts with its four class skills; more are learned from trainers
// (Havenbrook's weapons trainer, the Arena Master) or earned from quests. Any four known skills can
// be put on the skill bar (K).
//   learn: {trainer: npcId, level, gold} | {quest: questId}
(function (R) {
  const U = R.U, FX = R.FX, C = R.Combat, add = R.addSkill;
  const clampPt = (pl, pt, max) => { const d = U.dist(pl.x, pl.y, pt.x, pt.y), a = U.angle(pl.x, pl.y, pt.x, pt.y), k = Math.min(d, max); return { x: pl.x + Math.cos(a) * k, y: pl.y + Math.sin(a) * k }; };
  const free = (x, y) => !R.World.collides(x, y, 5);

  // ============================================================ WARRIOR
  add({ id: 'cleave', name: 'Cleave', cls: 'warrior', mp: 14, cd: (lv) => 5 - lv * 0.3, castTime: 0.35, learn: { trainer: 'trainer', level: 8, gold: 250 },
    desc: (lv) => `A huge sweeping blow in front of you for ${Math.round(180 + lv * 35)}% damage that knocks enemies back.`,
    icon: { color: '#ff5040', draw(P) { P.line(3, 14, 14, 3, '#d0d8e0'); P.line(4, 14, 15, 3, '#a0a8b0'); P.rect(2, 12, 4, 4, '#8a5a30'); for (let i = 0; i < 6; i++) P.px(6 + i * 2, 16 - i, '#ff5040'); } },
    cast(pl, aim, lv) {
      FX.slash(pl.x, pl.y - 10, aim, 2.6, 40, '#ff8060', 0.28, 10);
      R.Audio.play('swing', { pitch: 0.7 }); FX.shake(3, 0.15);
      C.hitArc(pl.x, pl.y - 10, aim, 2.6, 42, 'player', (e) => { const r = C.roll(pl, 1.8 + lv * 0.35); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 260, angle: U.angle(pl.x, pl.y, e.x, e.y) }); });
    } });
  add({ id: 'iron_skin', name: 'Iron Skin', cls: 'warrior', mp: 20, cd: 20, castTime: 0.4, learn: { quest: 'sq_masters_lesson' },
    desc: (lv) => `Your skin turns to iron for 8s: +${10 + lv * 6} defense and you can't be knocked back.`,
    icon: { color: '#a0a8b8', draw(P) { P.circle(9, 9, 6, '#80889a'); P.circle(9, 9, 4, '#b0b8c8'); P.rect(8, 4, 2, 10, '#e0e8f0'); P.rect(4, 8, 10, 2, '#e0e8f0'); } },
    cast(pl, aim, lv) {
      pl.addBuff('def', 10 + lv * 6, 8, false, 'Iron Skin');
      pl.ironSkinT = 8;
      R.Audio.play('equip', { pitch: 0.6 }); FX.ring(pl.x, pl.y, 4, 40, '#c0c8d8', 0.4, 4);
      FX.burst(pl.x, pl.y - 12, { n: 20, colors: ['#c0c8d8', '#ffffff'], speed: 50, life: 0.5 });
    } });
  add({ id: 'leap_slam', name: 'Leap Slam', cls: 'warrior', mp: 26, cd: (lv) => 11 - lv * 0.6, noCastAnim: true, learn: { trainer: 'trainer', level: 14, gold: 900 },
    desc: (lv) => `Leap to the cursor and smash down for ${Math.round(220 + lv * 40)}% damage around you, stunning enemies.`,
    icon: { color: '#ffb040', draw(P) { P.line(4, 14, 9, 3, '#ffffff'); P.line(9, 3, 14, 14, '#ffffff'); P.rect(2, 15, 14, 2, '#ffb040'); P.rect(7, 12, 4, 4, '#8a6a40'); } },
    cast(pl, aim, lv, pt) {
      const t = clampPt(pl, pt, 150);
      if (!free(t.x, t.y)) { R.UI.toast("Can't land there", 'bad'); return false; }
      const sx = pl.x, sy = pl.y;
      pl.invuln = Math.max(pl.invuln, 0.6); pl.castT = pl.castDur = 0.5;
      R.Audio.play('dodge', { pitch: 0.7 });
      for (let i = 1; i <= 10; i++) R.World.later(i * 0.04, () => { const k = i / 10; pl.x = U.lerp(sx, t.x, k); pl.y = U.lerp(sy, t.y, k); pl.jumpZ = Math.sin(k * Math.PI) * 30; });
      R.World.later(0.44, () => {
        pl.jumpZ = 0; FX.shake(7, 0.35); R.Audio.play('explode', { pitch: 0.8 });
        if (FX.bfx) FX.bfx('wavering', pl.x, pl.y, 8, 60, '#ffb040', 0.45);
        FX.burst(pl.x, pl.y, { n: 24, color: '#8a7a6a', speed: 80, life: 0.5, grav: 200, vz: 60 });
        C.hitCircle(pl.x, pl.y, 48, 'player', (e) => { const r = C.roll(pl, 2.2 + lv * 0.4); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 180, angle: U.angle(pl.x, pl.y, e.x, e.y), status: { stun: { dur: 0.8 + lv * 0.1 } } }); });
      });
    } });

  // ============================================================ RANGER
  add({ id: 'volley', name: 'Volley', cls: 'ranger', mp: 16, cd: (lv) => 6 - lv * 0.4, castTime: 0.3, learn: { trainer: 'trainer', level: 8, gold: 250 },
    desc: (lv) => `Loose three quick volleys of ${4 + Math.floor(lv / 2)} arrows in a cone, each for ${Math.round(55 + lv * 10)}% damage.`,
    icon: { color: '#a0e070', draw(P) { for (let i = -1; i <= 1; i++) { P.line(3, 9 + i * 4, 15, 9 + i * 2, '#e0d0a0'); P.px(15, 9 + i * 2, '#ffffff'); } } },
    cast(pl, aim, lv) {
      const n = 4 + Math.floor(lv / 2);
      for (let w = 0; w < 3; w++) R.World.later(w * 0.14, () => {
        R.Audio.play('arrow', { pitch: 1 + w * 0.1 });
        for (let i = 0; i < n; i++) { const a = aim + (i - (n - 1) / 2) * 0.14; const r = C.roll(pl, 0.55 + lv * 0.1); C.projectile({ x: pl.x + Math.cos(a) * 8, y: pl.y - 10 + Math.sin(a) * 8, z: 10, angle: a, speed: 330, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'arrow', r: 3, life: 0.6, knock: 30, source: pl }); }
      });
    } });
  add({ id: 'frost_arrow', name: 'Frost Arrow', cls: 'ranger', mp: 14, cd: (lv) => 5 - lv * 0.3, castTime: 0.3, learn: { quest: 'sq_masters_lesson' },
    desc: (lv) => `An icy arrow for ${Math.round(160 + lv * 30)}% damage that shatters on impact, freezing enemies nearby.`,
    icon: { color: '#80d8ff', draw(P) { P.line(2, 15, 14, 3, '#c0f0ff'); P.rect(12, 2, 4, 4, '#80d8ff'); P.px(13, 3, '#ffffff'); P.px(3, 14, '#80d8ff'); } },
    cast(pl, aim, lv) {
      R.Audio.play('ice');
      const r = C.roll(pl, 1.6 + lv * 0.3);
      C.projectile({ x: pl.x + Math.cos(aim) * 8, y: pl.y - 10 + Math.sin(aim) * 8, z: 10, angle: aim, speed: 360, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'ice', r: 4, life: 0.8, color: '#a0e8ff', glow: true, source: pl,
        onExpire(p) { FX.burst(p.x, p.y, { n: 20, colors: ['#c0f0ff', '#ffffff'], speed: 70, life: 0.5 }); if (FX.bfx) FX.bfx('spikes', p.x, p.y, '#c0f0ff', 16, 5); C.hitCircle(p.x, p.y, 30 + lv * 3, 'player', (e) => C.applyStatus(e, { freeze: { dur: 0.8 + lv * 0.15 } })); } });
    } });
  add({ id: 'hawk', name: 'Call the Hawk', cls: 'ranger', mp: 30, cd: (lv) => 18 - lv, castTime: 0.4, learn: { trainer: 'trainer', level: 14, gold: 900 },
    desc: (lv) => `A hawk circles above you for ${8 + lv}s, diving at the nearest enemy every second for ${Math.round(80 + lv * 20)}% damage.`,
    icon: { color: '#d0a060', draw(P) { P.line(2, 8, 9, 11, '#8a5a30'); P.line(16, 8, 9, 11, '#8a5a30'); P.line(3, 7, 9, 10, '#d0a060'); P.line(15, 7, 9, 10, '#d0a060'); P.rect(8, 9, 3, 5, '#6a4424'); P.px(9, 9, '#ffd040'); } },
    cast(pl, aim, lv) {
      const dur = 8 + lv; let t = 0;
      R.Audio.play('whoosh', { pitch: 1.5 });
      const hawk = FX.add({ life: dur, layer: 'top', draw(ctx, k) { const a = k * dur * 3, x = pl.x + Math.cos(a) * 26, y = pl.y - 46 + Math.sin(a * 2) * 6, f = Math.floor(k * dur * 10) % 2; ctx.fillStyle = '#6a4424'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = '#d0a060'; ctx.fillRect(Math.round(x) - 5, Math.round(y) - (f ? 2 : 0), 4, 1); ctx.fillRect(Math.round(x) + 2, Math.round(y) - (f ? 2 : 0), 4, 1); } });
      const strike = () => {
        t++; if (t > dur || pl.dead) return;
        const e = C.nearestHostile(pl.x, pl.y, 'player', 170);
        if (e) { FX.lightning && FX.burst(e.x, e.y - 14, { n: 10, color: '#d0a060', speed: 50, life: 0.3 }); const r = C.roll(pl, 0.8 + lv * 0.2); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 40 }); R.Audio.play('swing', { pitch: 1.8 }); }
        R.World.later(1, strike);
      };
      R.World.later(0.8, strike);
      return hawk ? undefined : undefined;
    } });

  // ============================================================ MAGE
  add({ id: 'arcane_missiles', name: 'Arcane Missiles', cls: 'mage', mp: 16, cd: (lv) => 4 - lv * 0.2, castTime: 0.35, learn: { trainer: 'arcanist', level: 8, gold: 250 },
    desc: (lv) => `Fire ${4 + lv} seeking missiles, each dealing ${Math.round(50 + lv * 10)}% magic damage.`,
    icon: { color: '#c080ff', draw(P) { for (let i = 0; i < 3; i++) { P.circle(5 + i * 4, 12 - i * 4, 2, '#c080ff'); P.px(5 + i * 4, 12 - i * 4, '#ffffff'); } } },
    cast(pl, aim, lv) {
      for (let i = 0; i < 4 + lv; i++) R.World.later(i * 0.08, () => {
        const a = aim + U.rand(-0.6, 0.6), r = C.roll(pl, 0.5 + lv * 0.1, { magic: true });
        C.projectile({ x: pl.x + Math.cos(a) * 8, y: pl.y - 10 + Math.sin(a) * 8, z: 12, angle: a, speed: 220, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'orb', r: 3, size: 3, life: 1.4, color: '#c080ff', glow: true, homing: 5, source: pl });
        R.Audio.play('magic', { pitch: 1.6 });
      });
    } });
  add({ id: 'blink', name: 'Blink', cls: 'mage', mp: 14, cd: (lv) => 7 - lv * 0.5, noCastAnim: true, learn: { quest: 'sq_masters_lesson' },
    desc: (lv) => `Teleport to the cursor (up to ${120 + lv * 15}px), leaving an arcane burst behind for ${Math.round(80 + lv * 20)}% magic damage.`,
    icon: { color: '#80c0ff', draw(P) { P.circle(5, 12, 3, '#4060c0'); P.circle(13, 5, 3, '#80c0ff'); for (let i = 0; i < 4; i++) P.px(7 + i * 1.5, 10 - i * 1.5, '#ffffff'); } },
    cast(pl, aim, lv, pt) {
      const t = clampPt(pl, pt, 120 + lv * 15);
      if (!free(t.x, t.y)) { R.UI.toast("Can't blink there", 'bad'); return false; }
      const r = C.roll(pl, 0.8 + lv * 0.2, { magic: true });
      C.explode(pl.x, pl.y, 30, r.dmg, 'player', { color: '#80c0ff', crit: r.crit, source: pl });
      FX.burst(pl.x, pl.y - 12, { n: 24, colors: ['#80c0ff', '#ffffff'], speed: 80, glow: true });
      pl.x = t.x; pl.y = t.y; pl.invuln = Math.max(pl.invuln, 0.35);
      FX.burst(pl.x, pl.y - 12, { n: 24, colors: ['#80c0ff', '#ffffff'], speed: 80, glow: true });
      R.Audio.play('portal', { pitch: 1.6 });
    } });
  add({ id: 'blizzard', name: 'Blizzard', cls: 'mage', mp: 40, cd: (lv) => 16 - lv, castTime: 0.6, learn: { trainer: 'arcanist', level: 14, gold: 900 },
    desc: (lv) => `A blizzard rages at the cursor for 4s: ${Math.round(40 + lv * 8)}% magic damage every half second and enemies inside are slowed.`,
    icon: { color: '#c0f0ff', draw(P) { P.ellipse(9, 6, 6, 3, '#e0f0ff'); for (let i = 0; i < 6; i++) P.px(4 + i * 2, 10 + (i % 3) * 2, '#80d8ff'); } },
    cast(pl, aim, lv, pt) {
      const t = clampPt(pl, pt, 220);
      if (FX.bfx) { FX.bfx('cloud', t.x, t.y, 44, '#e0f4ff', 4.2); FX.bfx('whirl', t.x, t.y - 10, 50, '#ffffff', '#a0e0ff', 4); }
      R.Audio.play('ice', { pitch: 0.6 });
      for (let i = 0; i < 8; i++) R.World.later(0.3 + i * 0.5, () => { const r = C.roll(pl, 0.4 + lv * 0.08, { magic: true }); C.hitCircle(t.x, t.y, 50, 'player', (e) => C.damage(e, r.dmg, { source: pl, crit: r.crit, color: '#a0e8ff', status: { slow: { amt: 0.5, dur: 1 } } })); });
    } });

  // ============================================================ ROGUE
  add({ id: 'smoke_bomb', name: 'Smoke Bomb', cls: 'rogue', mp: 18, cd: (lv) => 14 - lv, castTime: 0.2, learn: { trainer: 'trainer', level: 8, gold: 250 },
    desc: (lv) => `Vanish in smoke: enemies nearby are stunned for ${(1 + lv * 0.2).toFixed(1)}s and you gain +${10 + lv * 4}% dodge for 5s.`,
    icon: { color: '#8a8a9a', draw(P) { P.circle(9, 10, 5, '#5a5a6a'); P.circle(6, 7, 3, '#8a8a9a'); P.circle(12, 6, 3, '#a0a0b0'); P.rect(8, 2, 2, 3, '#ffb040'); } },
    cast(pl, aim, lv) {
      if (FX.bfx) FX.bfx('cloud', pl.x, pl.y, 50, '#8a8a9a', 2.5);
      FX.burst(pl.x, pl.y - 10, { n: 40, colors: ['#6a6a7a', '#a0a0b0'], speed: 70, life: 1 });
      R.Audio.play('explode', { pitch: 1.6 });
      C.hitCircle(pl.x, pl.y, 60, 'player', (e) => C.applyStatus(e, { stun: { dur: 1 + lv * 0.2 } }));
      pl.addBuff('dodge', 10 + lv * 4, 5, false, 'Smoke');
      pl.invuln = Math.max(pl.invuln, 0.5);
    } });
  add({ id: 'shuriken', name: 'Shuriken Storm', cls: 'rogue', mp: 14, cd: (lv) => 4.5 - lv * 0.25, castTime: 0.25, learn: { quest: 'sq_masters_lesson' },
    desc: (lv) => `Throw 3 spinning stars that pierce ${1 + Math.floor(lv / 2)} enemies, each for ${Math.round(90 + lv * 18)}% damage.`,
    icon: { color: '#d0d8e0', draw(P) { P.line(9, 2, 9, 16, '#d0d8e0'); P.line(2, 9, 16, 9, '#d0d8e0'); P.line(4, 4, 14, 14, '#a0a8b0'); P.line(14, 4, 4, 14, '#a0a8b0'); P.px(9, 9, '#140c1c'); } },
    cast(pl, aim, lv) {
      for (let i = -1; i <= 1; i++) { const a = aim + i * 0.18, r = C.roll(pl, 0.9 + lv * 0.18); C.projectile({ x: pl.x + Math.cos(a) * 8, y: pl.y - 10 + Math.sin(a) * 8, z: 10, angle: a, speed: 300, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'dagger', r: 4, life: 0.8, pierce: 1 + Math.floor(lv / 2), spin: 20, source: pl }); }
      R.Audio.play('swing', { pitch: 1.7 });
    } });
  add({ id: 'blade_flurry', name: 'Blade Flurry', cls: 'rogue', mp: 22, cd: (lv) => 8 - lv * 0.4, castTime: 0.6, learn: { trainer: 'trainer', level: 14, gold: 900 },
    desc: (lv) => `Six lightning-fast stabs in front of you, each for ${Math.round(55 + lv * 12)}% damage with +25% crit chance.`,
    icon: { color: '#ff6080', draw(P) { for (let i = 0; i < 3; i++) P.line(3 + i * 3, 15, 10 + i * 3, 3, i % 2 ? '#e0e0f0' : '#ff6080'); } },
    cast(pl, aim, lv) {
      for (let i = 0; i < 6; i++) R.World.later(i * 0.09, () => {
        const a = pl.aim + U.rand(-0.3, 0.3);
        FX.slash(pl.x, pl.y - 10, a, 0.9, 30, i % 2 ? '#ffffff' : '#ff6080', 0.12, 4);
        R.Audio.play('swing', { pitch: 1.3 + i * 0.05 });
        C.hitArc(pl.x, pl.y - 10, a, 1.0, 32, 'player', (e) => { const r = C.roll(pl, 0.55 + lv * 0.12, { critBonus: 25 }); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 20 }); });
      });
    } });

  // ============================================================ PALADIN
  add({ id: 'hammer_of_light', name: 'Hammer of Light', cls: 'paladin', mp: 16, cd: (lv) => 5 - lv * 0.3, castTime: 0.3, learn: { trainer: 'trainer', level: 8, gold: 250 },
    desc: (lv) => `Hurl a spinning hammer of light that explodes for ${Math.round(170 + lv * 30)}% damage and heals you for 5% of your max health.`,
    icon: { color: '#ffe070', draw(P) { P.rect(4, 4, 10, 5, '#ffe070'); P.rect(8, 9, 2, 7, '#c8a040'); P.px(6, 6, '#ffffff'); } },
    cast(pl, aim, lv) {
      const r = C.roll(pl, 1.7 + lv * 0.3);
      R.Audio.play('magic', { pitch: 1.2 });
      C.projectile({ x: pl.x + Math.cos(aim) * 8, y: pl.y - 10 + Math.sin(aim) * 8, z: 12, angle: aim, speed: 240, dmg: 0, team: 'player', kind: 'orb', r: 5, size: 5, life: 0.9, color: '#ffe070', glow: true, spin: 15, source: pl,
        onHit(p) { p.expire(); return false; },
        onExpire(p) { C.explode(p.x, p.y, 34, r.dmg, 'player', { color: '#ffe070', crit: r.crit, source: pl }); C.heal(pl, pl.stats.maxHp * 0.05); } });
    } });
  add({ id: 'aura_of_valor', name: 'Aura of Valor', cls: 'paladin', mp: 24, cd: 24, castTime: 0.5, learn: { quest: 'sq_masters_lesson' },
    desc: (lv) => `A holy aura for 12s: +${10 + lv * 5}% attack and +${1 + lv} HP regeneration.`,
    icon: { color: '#fff0a0', draw(P) { P.circle(9, 9, 6, '#c8a040'); P.circle(9, 9, 4, '#fff0a0'); P.rect(8, 5, 2, 8, '#ffffff'); P.rect(5, 8, 8, 2, '#ffffff'); } },
    cast(pl, aim, lv) {
      pl.addBuff('atk', 0.1 + lv * 0.05, 12, true, 'Valor'); pl.addBuff('hpRegen', 1 + lv, 12, false, 'Valor Regen');
      FX.pillar(pl.x, pl.y, '#fff0a0', 1, 14); FX.ring(pl.x, pl.y, 4, 50, '#ffe070', 0.5, 4); R.Audio.play('heal', { pitch: 0.8 });
    } });
  add({ id: 'judgement', name: 'Judgement', cls: 'paladin', mp: 34, cd: (lv) => 13 - lv * 0.7, castTime: 0.5, learn: { trainer: 'trainer', level: 14, gold: 900 },
    desc: (lv) => `A pillar of holy light slams down at the cursor after a moment: ${Math.round(300 + lv * 50)}% damage and a 1.5s stun.`,
    icon: { color: '#ffffff', draw(P) { P.rect(7, 1, 4, 14, '#fff8d0'); P.rect(8, 1, 2, 14, '#ffffff'); P.ellipse(9, 15, 6, 2, '#ffe070'); } },
    cast(pl, aim, lv, pt) {
      const t = clampPt(pl, pt, 200), r = C.roll(pl, 3 + lv * 0.5);
      FX.tele(t.x, t.y, 34, 0.6, '#ffe070');
      R.World.later(0.6, () => { FX.pillar(t.x, t.y, '#fff0a0', 1.2, 24); FX.shake(5, 0.3); R.Audio.play('explode', { pitch: 1.3 }); C.hitCircle(t.x, t.y, 36, 'player', (e) => C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 60, status: { stun: { dur: 1.5 } } })); });
    } });

  // ============================================================ ANY CLASS
  add({ id: 'second_wind', name: 'Second Wind', cls: 'any', mp: 10, cd: 30, castTime: 0.3, learn: { trainer: 'innkeeper', level: 4, gold: 120 },
    desc: (lv) => `Catch your breath: restore ${20 + lv * 4}% of your health over 4s and refill your stamina.`,
    icon: { color: '#60ff90', draw(P) { P.circle(9, 9, 6, '#3a8a5a'); P.rect(8, 5, 2, 8, '#c0ffd0'); P.rect(5, 8, 8, 2, '#c0ffd0'); } },
    cast(pl, aim, lv) {
      const total = pl.stats.maxHp * (0.2 + lv * 0.04);
      for (let i = 0; i < 8; i++) R.World.later(i * 0.5, () => { if (!pl.dead) C.heal(pl, total / 8, i > 0); });
      pl.stamina = pl.maxStamina(); pl.tired = false;
      FX.burst(pl.x, pl.y - 12, { n: 18, colors: ['#60ff90', '#c0ffd0'], speed: 30, life: 0.8, up: 30, glow: true }); R.Audio.play('heal');
    } });
  add({ id: 'dash', name: 'Wind Dash', cls: 'any', mp: 8, cd: (lv) => 6 - lv * 0.4, noCastAnim: true, learn: { quest: 'sq_wind_heels' },
    desc: (lv) => `Dash ${90 + lv * 10}px toward the cursor, untouchable while you move, then run ${10 + lv * 4}% faster for 3s.`,
    icon: { color: '#80f0e0', draw(P) { for (let i = 0; i < 3; i++) P.line(2, 5 + i * 4, 12, 5 + i * 4, i === 1 ? '#ffffff' : '#80f0e0'); P.line(12, 3, 16, 9, '#ffffff'); P.line(12, 15, 16, 9, '#ffffff'); } },
    cast(pl, aim, lv, pt) {
      const a = U.angle(pl.x, pl.y, pt.x, pt.y), dist = 90 + lv * 10;
      pl.invuln = Math.max(pl.invuln, 0.3);
      R.Audio.play('whoosh', { pitch: 1.6 });
      for (let i = 0; i < 8; i++) R.World.later(i * 0.025, () => { R.World.moveEntity(pl, Math.cos(a) * dist / 8, Math.sin(a) * dist / 8); pl.ghosts.push({ x: pl.x, y: pl.y, t: 0.2, rot: 0 }); });
      pl.addBuff('spd', 0.1 + lv * 0.04, 3, false, 'Wind Dash');
    } });
  add({ id: 'battle_shout', name: 'Battle Shout', cls: 'any', mp: 20, cd: 30, castTime: 0.4, learn: { trainer: 'arena_master', level: 12, gold: 600 },
    desc: (lv) => `A shout that rattles the arena: +${6 + lv * 3}% crit chance and +${10 + lv * 5}% crit damage for 12s.`,
    icon: { color: '#ff4040', draw(P) { P.circle(7, 9, 4, '#f5c9a0'); P.rect(9, 8, 3, 3, '#140c1c'); for (let i = 0; i < 3; i++) P.line(13, 5 + i * 4, 16, 3 + i * 5, '#ff4040'); } },
    cast(pl, aim, lv) {
      pl.addBuff('crit', 6 + lv * 3, 12, false, 'Battle Shout'); pl.addBuff('critDmg', 0.1 + lv * 0.05, 12, false, 'Battle Shout Dmg');
      R.Audio.play('bossRoar', { pitch: 1.6 }); FX.ring(pl.x, pl.y, 4, 70, '#ff4040', 0.5, 5); FX.shake(3, 0.2);
    } });

  // ============================================================ learning
  const SL = R.SkillLearn = {};
  SL.known = function (p) {
    const cls = R.Classes[p.cls], out = [];
    cls.skills.forEach((id, i) => { if (p.level >= R.SKILL_UNLOCK[i]) out.push(id); });
    for (const id of p.learned || []) if (R.Skills[id] && !out.includes(id)) out.push(id);
    return out;
  };
  SL.canUse = (p, s) => s.cls === 'any' || s.cls === p.cls;
  SL.learn = function (p, id, quiet) {
    const s = R.Skills[id];
    if (!s || !SL.canUse(p, s)) return false;
    p.learned = p.learned || [];
    if (!p.learned.includes(id)) p.learned.push(id);
    if (!p.skillLv[id]) p.skillLv[id] = 1;
    // put it straight on the bar if there's a free/locked-out slot, else tell them how
    const bar = p.skills().slice();
    const empty = bar.findIndex((x, i) => !x || (!p.skillLv[x] && p.level >= R.SKILL_UNLOCK[i]));
    if (empty >= 0) { bar[empty] = id; p.hotbar = bar; }
    if (!quiet) {
      R.Audio.play('levelup', { pitch: 1.2 }); FX.pillar(p.x, p.y, s.icon.color, 1, 16);
      R.UI.banner('NEW SKILL', s.name + (empty >= 0 ? '' : ' — press K to put it on your skill bar'));
    }
    R.events.emit('learn', { id });
    return true;
  };
  // What a trainer teaches this player
  SL.offers = (npcId, p) => Object.values(R.Skills).filter((s) => s.learn && s.learn.trainer === npcId && SL.canUse(p, s));
  // Trainers: a "Teach me" option on the right NPCs
  const trainers = { trainer: 'Weapons Training', arcanist: 'Arcane Studies', innkeeper: 'Survival Tips', arena_master: 'Arena Techniques' };
  let hooked = false;
  R.events.on('enter', () => { if (hooked) return; hooked = true; for (const [nid, label] of Object.entries(trainers)) hookTrainer(nid, label); });
  function hookTrainer(nid, label) {
    const d = R.NPCs[nid];
    if (!d) return;
    const prev = d.extraChoices;
    d.extraChoices = (h) => {
      const list = prev ? prev(h) : [];
      const p = R.World.player;
      if (SL.offers(nid, p).length) list.unshift({ text: `${label} (learn new skills)`, fn: () => { R.World.later(0, () => R.UI.open('trainer', nid)); return 'close'; } });
      return list;
    };
  }

  // ============================================================ quests that teach skills
  const Q = R.addQuest;
  Q({ id: 'sq_masters_lesson', name: "A Master's Lesson", type: 'side', giver: 'hermit', level: 4, minLevel: 3, region: 'The Whisperwood',
    desc: 'Old Bram once trained heroes. Prove you are worth teaching by thinning the beasts of the Whisperwood, and he will show you a technique of your class.',
    objectives: [{ type: 'kill', target: ['wolf', 'boar', 'goblin', 'goblin_archer'], count: 12, text: 'Defeat Whisperwood beasts' }],
    rewards: { xp: 260, gold: 60, skill: { warrior: 'iron_skin', ranger: 'frost_arrow', mage: 'blink', rogue: 'shuriken', paladin: 'aura_of_valor' } },
    dialog: { offer: ['Hm. You hold that weapon like a farmer holds a rake.', 'I taught heroes, once. Real ones. Clear twelve beasts from my woods and I will teach you something that will keep you alive.'], accept: 'Go on, then. I am old, not patient.', progress: ['Still here? The wolves are not going to hunt themselves.'], complete: ['Not bad. Not bad at all.', 'Now watch closely — I will only show you this once...'] } });
  Q({ id: 'sq_wind_heels', name: 'Wind at Your Heels', type: 'side', giver: 'cora', level: 7, minLevel: 6, region: 'Gullwind Coast',
    desc: 'Cora the lighthouse keeper moves like the sea wind. Drive the gulls off her cliffs and she will teach you how.',
    objectives: [{ type: 'kill', target: ['gull'], count: 10, text: 'Chase off the gulls' }],
    rewards: { xp: 480, gold: 90, skill: 'dash' },
    dialog: { offer: ['Those gulls have been stealing my supper for a month.', 'Chase off ten of them and I will teach you the Wind Dash. My mother taught it to me. She was a very fast woman.'], accept: 'Mind your step near the edge!', progress: ['Still squawking out there, I hear.'], complete: ['Peace and quiet at last!', 'Now — feet light, lean into the wind, and GO.'] } });

  // quest rewards can teach a skill (one per class, or the same for everyone)
  R.events.on('quest:complete', (ev) => {
    const q = R.Quests[ev && ev.quest]; if (!q || !q.rewards || !q.rewards.skill) return;
    const p = R.World.player, sk = typeof q.rewards.skill === 'string' ? q.rewards.skill : q.rewards.skill[p.cls];
    if (sk) SL.learn(p, sk);
  });
})(window.RPG);
