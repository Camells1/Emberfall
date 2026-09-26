'use strict';
// Class skills.
//
// { id, name, cls, desc(lv) -> string, mp (number or fn(lv)), cd (number or fn(lv)), castTime?, noCastAnim?,
//   icon: {color, draw(P, col)}, maxLv: 5,
//   cast(pl, aim, lv, aimPt) -> false to cancel (no cost) }
// pl = the Player. aim = angle toward the cursor. aimPt = {x, y} cursor world position.
(function (R) {
  const U = R.U, FX = R.FX, C = R.Combat;
  const S = R.Skills = {};
  R.addSkill = function (s) { s.maxLv = s.maxLv || 5; S[s.id] = s; return s; };
  const add = R.addSkill;
  const clampPt = (pl, pt, max) => {
    const d = U.dist(pl.x, pl.y, pt.x, pt.y), a = U.angle(pl.x, pl.y, pt.x, pt.y);
    const k = Math.min(d, max);
    return { x: pl.x + Math.cos(a) * k, y: pl.y + Math.sin(a) * k };
  };

  // ======================= WARRIOR =======================
  add({
    id: 'whirlwind', name: 'Whirlwind', cls: 'warrior', mp: 12, cd: (lv) => 6 - lv * 0.4, castTime: 0.5,
    desc: (lv) => `Spin with your weapon, hitting all nearby enemies ${3} times for ${Math.round(60 + lv * 15)}% damage each.`,
    icon: { color: '#e05a3a', draw(P) { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; P.px(9 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, '#ffffff'); } P.rect(8, 3, 2, 12, '#d0d8e0'); P.rect(4, 8, 10, 2, '#c8a040'); } },
    cast(pl, aim, lv) {
      let n = 0;
      const spin = () => {
        if (pl.dead) return;
        FX.add({ layer: 'top', life: 0.18, draw(ctx, t) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = U.rgba('#ffffff', 0.8 * (1 - t)); ctx.lineWidth = 4 * (1 - t) + 1; ctx.beginPath(); ctx.arc(pl.x, pl.y - 10, 30, t * 6.28 + n, t * 6.28 + n + 4); ctx.stroke(); ctx.restore(); } });
        R.Audio.play('swing', { pitch: 0.8 + n * 0.1 });
        C.hitCircle(pl.x, pl.y - 10, 32, 'player', (e) => { const r = C.roll(pl, 0.6 + lv * 0.15); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 80, angle: U.angle(pl.x, pl.y, e.x, e.y) }); });
        FX.burst(pl.x, pl.y, { n: 8, color: '#c8b090', speed: 60, life: 0.3, size: 2 });
        n++;
        if (n < 3) R.World.later(0.16, spin);
      };
      spin();
      pl.castDur = pl.castT = 0.48;
      pl.invuln = Math.max(pl.invuln, 0.2);
    },
  });
  add({
    id: 'charge', name: 'Shield Charge', cls: 'warrior', mp: 15, cd: (lv) => 7 - lv * 0.5, noCastAnim: true,
    desc: (lv) => `Dash forward, smashing through enemies for ${Math.round(120 + lv * 25)}% damage and stunning them for ${(0.8 + lv * 0.2).toFixed(1)}s.`,
    icon: { color: '#c08040', draw(P) { P.rect(3, 5, 7, 8, '#8a5a30'); P.rect(4, 6, 5, 6, '#c8a040'); for (let i = 0; i < 3; i++) P.rect(11 + i * 2, 6 + i * 2, 3, 1, '#ffffff'); } },
    cast(pl, aim, lv) {
      const hit = [];
      let t = 0;
      pl.invuln = Math.max(pl.invuln, 0.35);
      FX.shake(2, 0.1);
      R.Audio.play('dodge', { pitch: 0.6 });
      const step = () => {
        if (pl.dead) return;
        t += 1 / 60;
        const moved = R.World.moveEntity(pl, Math.cos(aim) * 5, Math.sin(aim) * 5);
        pl.ghosts.push({ x: pl.x, y: pl.y, t: 0.2, rot: 0 });
        FX.particle({ x: pl.x, y: pl.y, vx: U.rand(-20, 20), vy: U.rand(-20, 0), life: 0.3, color: '#c8b090', size: 2 });
        C.hitCircle(pl.x + Math.cos(aim) * 8, pl.y - 8 + Math.sin(aim) * 8, 14, 'player', (e) => {
          if (hit.includes(e)) return;
          hit.push(e);
          const r = C.roll(pl, 1.2 + lv * 0.25);
          C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 220, angle: aim, status: { stun: { dur: 0.8 + lv * 0.2 } } });
          FX.shake(3, 0.15);
        });
        if (t < 0.25 && moved) R.World.later(1 / 60, step);
        else if (!moved) { FX.shake(4, 0.2); FX.burst(pl.x + Math.cos(aim) * 8, pl.y - 6, { n: 12, color: '#c0c0c0', speed: 70 }); }
      };
      step();
    },
  });
  add({
    id: 'warcry', name: 'War Cry', cls: 'warrior', mp: 20, cd: 18, castTime: 0.5,
    desc: (lv) => `Let loose a mighty roar: +${15 + lv * 5}% attack and +${4 + lv * 2} defense for 10s. Nearby enemies are slowed.`,
    icon: { color: '#ff8030', draw(P) { P.circle(7, 9, 4, '#f5c9a0'); P.rect(9, 8, 3, 3, '#140c1c'); for (let i = 0; i < 3; i++) P.rect(13, 5 + i * 3, 3, 1, '#ffd040'); } },
    cast(pl, aim, lv) {
      pl.addBuff('atk', 0.15 + lv * 0.05, 10, true, 'War Cry');
      pl.addBuff('def', 4 + lv * 2, 10, false, 'War Cry Def');
      R.Audio.play('bossRoar', { pitch: 1.4 });
      FX.ring(pl.x, pl.y, 4, 70, '#ff8030', 0.5, 5);
      FX.ring(pl.x, pl.y, 4, 50, '#ffd040', 0.4, 3);
      FX.shake(4, 0.3);
      FX.burst(pl.x, pl.y - 20, { n: 25, colors: ['#ff8030', '#ffd040'], speed: 80, life: 0.6, glow: true });
      C.hitCircle(pl.x, pl.y, 80, 'player', (e) => C.applyStatus(e, { slow: { amt: 0.5, dur: 3 } }));
    },
  });
  add({
    id: 'earthshatter', name: 'Earthshatter', cls: 'warrior', mp: 30, cd: (lv) => 14 - lv, castTime: 0.6,
    desc: (lv) => `Slam the ground, sending a wave of shattered earth forward that deals ${Math.round(200 + lv * 40)}% damage and knocks enemies back.`,
    icon: { color: '#a07040', draw(P) { P.rect(2, 12, 14, 4, '#6a4a2a'); P.rect(4, 8, 3, 4, '#a08060'); P.rect(9, 6, 3, 6, '#a08060'); P.rect(13, 9, 3, 3, '#a08060'); } },
    cast(pl, aim, lv) {
      FX.shake(6, 0.3);
      R.Audio.play('explode', { pitch: 0.7 });
      const hit = [];
      for (let i = 1; i <= 7; i++) {
        R.World.later(i * 0.06, () => {
          const x = pl.x + Math.cos(aim) * i * 16, y = pl.y + Math.sin(aim) * i * 16;
          if (R.World.solidAt(x, y)) return;
          FX.burst(x, y, { n: 10, colors: ['#8a6a4a', '#a08060', '#6a5040'], speed: 50, life: 0.6, size: [2, 3], grav: 300, vz: 120 });
          FX.ring(x, y, 2, 14, '#c8a070', 0.3, 3);
          FX.add({ x, y, life: 0.5, layer: 'ground', draw(ctx, t) { ctx.fillStyle = U.rgba('#3a2a1a', 0.5 * (1 - t)); ctx.fillRect(x - 6, y - 3, 12, 6); ctx.fillStyle = U.rgba('#a08060', 1 - t); for (let k = 0; k < 3; k++) ctx.fillRect(x - 6 + k * 5, y - 5 - (1 - t) * 6, 3, 5); } });
          C.hitCircle(x, y, 16, 'player', (e) => { if (hit.includes(e)) return; hit.push(e); const r = C.roll(pl, 2 + lv * 0.4); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 250, angle: aim, status: { stun: { dur: 0.6 } } }); });
        });
      }
    },
  });

  // ======================= RANGER =======================
  add({
    id: 'multishot', name: 'Multishot', cls: 'ranger', mp: 10, cd: (lv) => 4 - lv * 0.3, noCastAnim: false, castTime: 0.2,
    desc: (lv) => `Fire a fan of ${4 + lv} arrows, each dealing ${Math.round(70 + lv * 10)}% damage.`,
    icon: { color: '#5fbf4a', draw(P) { for (let i = -1; i <= 1; i++) { P.line(3, 9, 14, 9 + i * 5, '#e0d0b0'); P.px(14, 9 + i * 5, '#ffffff'); } } },
    cast(pl, aim, lv) {
      const n = 4 + lv, w = R.Items[pl.equip.weapon], L = w && w.look;
      R.Audio.play('arrow'); R.Audio.play('arrow', { pitch: 1.2 });
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * 0.12;
        const r = C.roll(pl, 0.7 + lv * 0.1);
        C.projectile({ x: pl.x, y: pl.y, z: 10, angle: a, speed: 340, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'arrow', r: 3, life: 0.8, knock: 60, glow: (L && L.glow) || '#a0ff80' });
      }
    },
  });
  add({
    id: 'piercing_shot', name: 'Piercing Shot', cls: 'ranger', mp: 16, cd: (lv) => 6 - lv * 0.4, castTime: 0.45,
    desc: (lv) => `Charge a glowing arrow that pierces every enemy in a line for ${Math.round(250 + lv * 50)}% damage.`,
    icon: { color: '#80e0ff', draw(P) { P.line(2, 15, 15, 2, '#ffffff'); P.line(3, 15, 16, 2, '#80e0ff'); P.rect(12, 2, 4, 2, '#ffffff'); } },
    cast(pl, aim, lv) {
      FX.burst(pl.x + Math.cos(aim) * 10, pl.y - 10 + Math.sin(aim) * 10, { n: 15, color: '#80e0ff', speed: 40, glow: true });
      R.World.later(0.3, () => {
        if (pl.dead) return;
        const r = C.roll(pl, 2.5 + lv * 0.5);
        R.Audio.play('zap', { pitch: 1.5 });
        FX.shake(2, 0.1);
        C.projectile({ x: pl.x, y: pl.y, z: 10, angle: aim, speed: 520, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'arrow', r: 5, life: 0.7, pierce: 99, knock: 140, glow: '#80e0ff', color: '#ffffff', noCollide: false });
        FX.beam(pl.x, pl.y - 10, pl.x + Math.cos(aim) * 60, pl.y - 10 + Math.sin(aim) * 60, '#80e0ff', 0.2, 5);
      });
    },
  });
  add({
    id: 'trap', name: 'Explosive Trap', cls: 'ranger', mp: 18, cd: 9,
    desc: (lv) => `Throw a trap at the cursor. When an enemy steps on it, it explodes for ${Math.round(200 + lv * 45)}% damage and roots nearby foes.`,
    icon: { color: '#e0a040', draw(P) { P.circle(9, 10, 5, '#6a6a6a'); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; P.px(9 + Math.cos(a) * 6, 10 + Math.sin(a) * 6, '#c0c0c0'); } P.rect(8, 9, 2, 2, '#ff4020'); } },
    cast(pl, aim, lv, pt) {
      const p = clampPt(pl, pt, 120);
      if (R.World.solidAt(p.x, p.y)) return false;
      const trap = { x: p.x, y: p.y, armed: 0.4, dead: false };
      R.Audio.play('equip');
      FX.add({
        life: 20, layer: 'ground', x: p.x, y: p.y,
        update(fx, dt) {
          if (trap.dead) { fx.t = fx.life; return; }
          trap.armed -= dt;
          if (trap.armed > 0) return;
          const n = C.hitCircle(p.x, p.y, 12, 'player', () => {});
          if (n > 0) {
            trap.dead = true;
            C.explode(p.x, p.y, 44, () => C.roll(pl, 2 + lv * 0.45).dmg, 'player', { color: '#ffa040', source: pl, status: { stun: { dur: 1.2 } } });
          }
        },
        draw(ctx, t, fx) {
          const blink = trap.armed <= 0 && Math.floor(fx.t * 4) % 2 === 0;
          ctx.fillStyle = '#140c1c'; ctx.fillRect(p.x - 6, p.y - 3, 12, 6);
          ctx.fillStyle = '#6a6a6a'; ctx.fillRect(p.x - 5, p.y - 2, 10, 4);
          ctx.fillStyle = '#c0c0c0'; for (let i = -5; i <= 4; i += 3) { ctx.fillRect(p.x + i, p.y - 4, 1, 2); ctx.fillRect(p.x + i, p.y + 2, 1, 2); }
          ctx.fillStyle = blink ? '#ff4020' : '#801010'; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        },
      });
    },
  });
  add({
    id: 'arrow_rain', name: 'Rain of Arrows', cls: 'ranger', mp: 35, cd: (lv) => 16 - lv, castTime: 0.5,
    desc: (lv) => `Call down a storm of arrows at the cursor for 2.5s, each dealing ${Math.round(50 + lv * 12)}% damage.`,
    icon: { color: '#40a060', draw(P) { for (let i = 0; i < 4; i++) { P.line(3 + i * 4, 2, 3 + i * 4, 10, '#e0d0b0'); P.px(3 + i * 4, 11, '#ffffff'); } P.rect(1, 14, 16, 2, '#6a4a2a'); } },
    cast(pl, aim, lv, pt) {
      const p = clampPt(pl, pt, 180);
      const rad = 40;
      FX.add({ x: p.x, y: p.y, life: 2.6, layer: 'ground', draw(ctx, t) { ctx.strokeStyle = U.rgba('#80ff80', 0.4 * (1 - t)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * 0.6, 0, 0, U.TAU); ctx.stroke(); } });
      for (let i = 0; i < 24; i++) {
        R.World.later(0.1 + i * 0.1, () => {
          const a = U.rand(0, U.TAU), d = Math.sqrt(Math.random()) * rad;
          const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.6;
          FX.add({ life: 0.18, layer: 'top', draw(ctx, t) { ctx.fillStyle = '#e0d0b0'; ctx.fillRect(Math.round(x), Math.round(y - 80 * (1 - t) - 8), 1, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y - 80 * (1 - t)), 1, 2); } });
          R.World.later(0.18, () => {
            FX.burst(x, y, { n: 4, color: '#c8b090', speed: 30, life: 0.25 });
            if (i % 3 === 0) R.Audio.play('arrow', { pitch: 1.4 });
            C.hitCircle(x, y, 10, 'player', (e) => { const r = C.roll(pl, 0.5 + lv * 0.12); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 30, angle: -Math.PI / 2 }); });
          });
        });
      }
    },
  });

  // ======================= MAGE =======================
  add({
    id: 'fireball', name: 'Fireball', cls: 'mage', mp: 12, cd: (lv) => 2.2 - lv * 0.15, castTime: 0.25,
    desc: (lv) => `Hurl an exploding fireball for ${Math.round(160 + lv * 35)}% magic damage in an area. Sets enemies ablaze.`,
    icon: { color: '#ff6020', draw(P) { P.circle(10, 8, 4, '#ff7020'); P.circle(10, 8, 2, '#ffe080'); P.line(2, 15, 7, 11, '#ffb040'); P.line(3, 15, 8, 12, '#ff7020'); } },
    cast(pl, aim, lv) {
      R.Audio.play('fire');
      const r = C.roll(pl, 1.6 + lv * 0.35, { magic: true });
      C.projectile({
        x: pl.x + Math.cos(aim) * 10, y: pl.y + Math.sin(aim) * 10, z: 12, angle: aim, speed: 250, dmg: 0, team: 'player', kind: 'fireball', r: 5, size: 5, life: 1.1,
        onHit(p) { p.expire(); return false; },
        onExpire(p) { C.explode(p.x, p.y, 34 + lv * 3, r.dmg, 'player', { color: '#ff7020', crit: r.crit, source: pl, status: { burn: { dps: Math.max(3, r.dmg * 0.12), dur: 3 } } }); },
      });
    },
  });
  add({
    id: 'frost_nova', name: 'Frost Nova', cls: 'mage', mp: 20, cd: (lv) => 9 - lv * 0.6, castTime: 0.35,
    desc: (lv) => `Blast frost outward, dealing ${Math.round(100 + lv * 25)}% magic damage and freezing enemies for ${(1.2 + lv * 0.3).toFixed(1)}s.`,
    icon: { color: '#80d0ff', draw(P) { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; P.line(9, 9, 9 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, i % 2 ? '#80d0ff' : '#ffffff'); } } },
    cast(pl, aim, lv) {
      R.Audio.play('ice');
      FX.ring(pl.x, pl.y, 4, 70, '#80d0ff', 0.5, 6);
      FX.ring(pl.x, pl.y, 4, 60, '#ffffff', 0.35, 2);
      for (let i = 0; i < 24; i++) { const a = i / 24 * U.TAU; FX.particle({ x: pl.x, y: pl.y - 6, vx: Math.cos(a) * 160, vy: Math.sin(a) * 100, life: 0.45, color: U.choose(['#c0f0ff', '#80d0ff', '#ffffff']), glow: true, size: 2, drag: 0.92 }); }
      FX.light(pl.x, pl.y, 120, '#80d0ff', 0.4);
      C.hitCircle(pl.x, pl.y, 64, 'player', (e) => { const r = C.roll(pl, 1 + lv * 0.25, { magic: true }); C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 60, color: '#80d0ff', status: { freeze: { dur: 1.2 + lv * 0.3 } } }); });
    },
  });
  add({
    id: 'chain_lightning', name: 'Chain Lightning', cls: 'mage', mp: 22, cd: (lv) => 5 - lv * 0.3, castTime: 0.3,
    desc: (lv) => `Lightning arcs to the nearest enemy and jumps up to ${3 + lv} times for ${Math.round(140 + lv * 30)}% magic damage.`,
    icon: { color: '#a0c0ff', draw(P) { P.line(12, 1, 6, 8, '#ffffff'); P.line(6, 8, 11, 9, '#ffffff'); P.line(11, 9, 5, 16, '#ffffff'); P.line(13, 1, 7, 8, '#a0c0ff'); } },
    cast(pl, aim, lv, pt) {
      let first = C.nearestHostile(pt.x, pt.y, 'player', 60) || C.nearestHostile(pl.x + Math.cos(aim) * 60, pl.y + Math.sin(aim) * 60, 'player', 110);
      if (!first) { R.UI.toast('No target in range', 'bad'); return false; }
      const hit = [];
      let from = { x: pl.x + Math.cos(aim) * 8, y: pl.y - 14 }, cur = first, n = 0;
      const jump = () => {
        if (!cur || cur.dead) return;
        FX.lightning(from.x, from.y, cur.x, cur.y - 8, '#9fd8ff');
        R.Audio.play('zap', { pitch: 1 + n * 0.1 });
        const r = C.roll(pl, (1.4 + lv * 0.3) * Math.pow(0.9, n), { magic: true });
        C.damage(cur, r.dmg, { source: pl, crit: r.crit, knock: 40, color: '#9fd8ff', status: Math.random() < 0.3 ? { stun: { dur: 0.5 } } : null });
        hit.push(cur);
        from = { x: cur.x, y: cur.y - 8 };
        n++;
        if (n <= 3 + lv) { cur = C.nearestHostile(from.x, from.y, 'player', 100, hit); if (cur) R.World.later(0.08, jump); }
      };
      jump();
    },
  });
  add({
    id: 'meteor', name: 'Meteor', cls: 'mage', mp: 45, cd: (lv) => 18 - lv, castTime: 0.7,
    desc: (lv) => `Call a meteor down on the cursor after a short delay. Deals ${Math.round(400 + lv * 80)}% magic damage and leaves burning ground.`,
    icon: { color: '#ff4020', draw(P) { P.circle(11, 11, 4, '#ff6020'); P.circle(11, 11, 2, '#ffe080'); P.line(2, 2, 8, 8, '#ffb040'); P.line(4, 2, 9, 7, '#ff7020'); } },
    cast(pl, aim, lv, pt) {
      const p = clampPt(pl, pt, 200);
      const rad = 50;
      const r = C.roll(pl, 4 + lv * 0.8, { magic: true });
      R.Audio.play('fire', { pitch: 0.6 });
      FX.add({ x: p.x, y: p.y, life: 1, layer: 'ground', draw(ctx, t) { ctx.fillStyle = U.rgba('#ff4020', 0.1 + t * 0.2); ctx.beginPath(); ctx.ellipse(p.x, p.y, rad * t, rad * 0.6 * t, 0, 0, U.TAU); ctx.fill(); ctx.strokeStyle = U.rgba('#ff8040', 0.7); ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * 0.6, 0, 0, U.TAU); ctx.stroke(); } });
      FX.add({
        life: 1, layer: 'top', draw(ctx, t) {
          const x = p.x - 120 * (1 - t), y = p.y - 220 * (1 - t);
          const g = R.G.glow(18, '#ff7020');
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(g, x - 18, y - 18); ctx.restore();
          ctx.fillStyle = '#4a2a1a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, U.TAU); ctx.fill();
          ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.arc(x + 1, y + 1, 4, 0, U.TAU); ctx.fill();
        },
        update(fx) { const t = fx.t / fx.life; for (let i = 0; i < 3; i++) FX.particle({ x: p.x - 120 * (1 - t) + U.rand(-4, 4), y: p.y - 220 * (1 - t) + U.rand(-4, 4), life: 0.4, color: U.choose(['#ff7020', '#ffb040', '#4a3a3a']), glow: true, size: 2 }); },
      });
      R.World.later(1, () => {
        C.explode(p.x, p.y, rad, r.dmg, 'player', { color: '#ff6020', crit: r.crit, source: pl, shake: 10, status: { burn: { dps: Math.max(5, r.dmg * 0.1), dur: 4 } }, knock: 260 });
        FX.flash('#ff8040', 0.2);
        // burning ground
        FX.add({
          x: p.x, y: p.y, life: 4, layer: 'ground', tick: 0,
          update(fx, dt) { fx.tick += dt; if (Math.random() < 0.6) FX.particle({ x: p.x + U.rand(-rad, rad) * 0.8, y: p.y + U.rand(-rad, rad) * 0.45, vy: -20, life: 0.5, color: U.choose(['#ff6020', '#ffb040']), glow: true }); if (fx.tick > 0.5) { fx.tick = 0; C.hitCircle(p.x, p.y, rad * 0.8, 'player', (e) => C.applyStatus(e, { burn: { dps: Math.max(4, r.dmg * 0.08), dur: 2 } })); } },
          draw(ctx, t) { ctx.fillStyle = U.rgba('#3a1a10', 0.5 * (1 - t)); ctx.beginPath(); ctx.ellipse(p.x, p.y, rad * 0.8, rad * 0.45, 0, 0, U.TAU); ctx.fill(); },
        });
      });
    },
  });

  // ======================= ROGUE =======================
  add({
    id: 'shadow_step', name: 'Shadow Step', cls: 'rogue', mp: 12, cd: (lv) => 5 - lv * 0.4, noCastAnim: true,
    desc: (lv) => `Vanish and reappear behind the enemy nearest the cursor, striking for ${Math.round(150 + lv * 30)}% damage (guaranteed critical).`,
    icon: { color: '#8050c0', draw(P) { P.circle(6, 9, 4, '#2a1a3a'); P.circle(12, 9, 4, '#8050c0'); P.px(11, 8, '#ffffff'); P.px(13, 8, '#ffffff'); } },
    cast(pl, aim, lv, pt) {
      const t = C.nearestHostile(pt.x, pt.y, 'player', 80) || C.nearestHostile(pl.x, pl.y, 'player', 150);
      if (!t) { R.UI.toast('No target in range', 'bad'); return false; }
      FX.burst(pl.x, pl.y - 10, { n: 20, colors: ['#2a1a3a', '#8050c0'], speed: 60, life: 0.5 });
      const a = U.angle(pl.x, pl.y, t.x, t.y);
      const nx = t.x + Math.cos(a) * (t.r + 10), ny = t.y + Math.sin(a) * (t.r + 10);
      if (!R.World.solidAt(nx, ny)) { pl.x = nx; pl.y = ny; } else { pl.x = t.x - Math.cos(a) * (t.r + 10); pl.y = t.y - Math.sin(a) * (t.r + 10); }
      pl.aim = U.angle(pl.x, pl.y, t.x, t.y);
      pl.dir = R.dirFromAngle(pl.aim);
      FX.burst(pl.x, pl.y - 10, { n: 20, colors: ['#2a1a3a', '#8050c0'], speed: 60, life: 0.5 });
      R.Audio.play('dodge', { pitch: 1.4 });
      const r = C.roll(pl, 1.5 + lv * 0.3, { critBonus: 100 });
      FX.slash(t.x, t.y - 10, pl.aim + Math.PI, 2.5, 18, '#b070ff', 0.2, 6);
      C.damage(t, r.dmg, { source: pl, crit: true, knock: 60, angle: pl.aim });
      pl.invuln = Math.max(pl.invuln, 0.3);
    },
  });
  add({
    id: 'fan_of_knives', name: 'Fan of Knives', cls: 'rogue', mp: 16, cd: (lv) => 5 - lv * 0.3, castTime: 0.25,
    desc: (lv) => `Throw ${10 + lv * 2} spinning knives in every direction for ${Math.round(70 + lv * 15)}% damage each.`,
    icon: { color: '#c0c0d0', draw(P) { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; P.line(9 + Math.cos(a) * 2, 9 + Math.sin(a) * 2, 9 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, '#e0e0e8'); } } },
    cast(pl, aim, lv) {
      const n = 10 + lv * 2;
      R.Audio.play('swing', { pitch: 1.5 });
      for (let i = 0; i < n; i++) {
        const a = i / n * U.TAU;
        const r = C.roll(pl, 0.7 + lv * 0.15);
        C.projectile({ x: pl.x, y: pl.y, z: 10, angle: a, speed: 260, dmg: r.dmg, crit: r.crit, team: 'player', kind: 'dagger', spin: true, r: 3, life: 0.45, knock: 40, status: pl.hasBuff('Venom Coat') ? { poison: { dps: pl.venomDps || 6, dur: 3 } } : null });
      }
    },
  });
  add({
    id: 'poison_blade', name: 'Venom Coat', cls: 'rogue', mp: 18, cd: 16, castTime: 0.4,
    desc: (lv) => `Coat your blades in venom for 10s: all hits poison for ${6 + lv * 4} damage/s and you gain +${10 + lv * 3}% crit chance.`,
    icon: { color: '#60c040', draw(P) { P.rect(8, 2, 2, 10, '#d8dce0'); P.rect(6, 12, 6, 2, '#806040'); P.rect(8, 14, 2, 2, '#3a2a20'); P.px(7, 5, '#80ff40'); P.px(10, 8, '#80ff40'); P.px(7, 10, '#80ff40'); } },
    cast(pl, aim, lv) {
      pl.addBuff('crit', 10 + lv * 3, 10, false, 'Venom Coat');
      pl.venomDps = 6 + lv * 4;
      R.Audio.play('magic', { pitch: 0.6 });
      FX.burst(pl.x, pl.y - 12, { n: 30, colors: ['#80ff40', '#40a020'], speed: 50, life: 0.8, up: 20 });
    },
  });
  add({
    id: 'death_mark', name: 'Death Mark', cls: 'rogue', mp: 30, cd: (lv) => 20 - lv, castTime: 0.3,
    desc: (lv) => `Mark the enemy nearest the cursor for 8s: it takes +${30 + lv * 10}% damage from everything. If it dies while marked you recover 30 MP.`,
    icon: { color: '#e02040', draw(P) { P.circle(9, 9, 6, '#e02040'); P.circle(9, 9, 4, '#2a0a10'); P.rect(8, 4, 2, 10, '#e02040'); P.rect(4, 8, 10, 2, '#e02040'); } },
    cast(pl, aim, lv, pt) {
      const t = C.nearestHostile(pt.x, pt.y, 'player', 80) || C.nearestHostile(pl.x, pl.y, 'player', 160);
      if (!t) { R.UI.toast('No target in range', 'bad'); return false; }
      C.applyStatus(t, { mark: { amt: 0.3 + lv * 0.1, dur: 8 } });
      R.Audio.play('bossRoar', { pitch: 2 });
      FX.ring(t.x, t.y, 2, 20, '#e02040', 0.5, 3);
      FX.beam(pl.x, pl.y - 12, t.x, t.y - 10, '#e02040', 0.25, 2);
      const handler = R.events.on('kill', (ev) => {
        if (ev.entity === t) { R.events.off('kill', handler); if (t.status && t.status.mark !== undefined) { pl.mp = Math.min(pl.stats.maxMp, pl.mp + 30); FX.text(pl.x, pl.y - 30, '+30 MP', '#6080ff'); } }
      });
      R.World.later(8.2, () => R.events.off('kill', handler));
    },
  });

  // ======================= PALADIN =======================
  add({
    id: 'holy_strike', name: 'Holy Strike', cls: 'paladin', mp: 10, cd: (lv) => 3.5 - lv * 0.2, castTime: 0.3,
    desc: (lv) => `Smite enemies in front of you with radiant force for ${Math.round(170 + lv * 35)}% damage (double vs. undead) and heal for 20% of it.`,
    icon: { color: '#ffd24a', draw(P) { P.rect(8, 2, 2, 14, '#fff4c0'); P.rect(4, 6, 10, 2, '#fff4c0'); P.circle(9, 7, 2, '#ffd24a'); } },
    cast(pl, aim, lv) {
      R.Audio.play('magic', { pitch: 1.4 }); R.Audio.play('swing', { pitch: 0.7 });
      FX.slash(pl.x, pl.y - 10, aim, 2.4, 34, '#ffe070', 0.3, 10);
      FX.light(pl.x + Math.cos(aim) * 20, pl.y + Math.sin(aim) * 20, 80, '#ffe070', 0.3);
      let total = 0;
      C.hitArc(pl.x, pl.y - 10, aim, 2.4, 36, 'player', (e) => {
        const r = C.roll(pl, (1.7 + lv * 0.35) * (e.def.tags && e.def.tags.includes('undead') ? 2 : 1));
        total += C.damage(e, r.dmg, { source: pl, crit: r.crit, knock: 140, angle: aim, color: '#ffe070' });
        FX.pillar(e.x, e.y, '#ffe070', 0.4, 10);
      });
      if (total) C.heal(pl, total * 0.2);
    },
  });
  add({
    id: 'heal', name: 'Lay on Hands', cls: 'paladin', mp: 25, cd: (lv) => 12 - lv, castTime: 0.5,
    desc: (lv) => `Channel holy light to restore ${Math.round(25 + lv * 7)}% of your max HP and cleanse ailments.`,
    icon: { color: '#60ff80', draw(P) { P.rect(7, 3, 4, 12, '#ffffff'); P.rect(3, 7, 12, 4, '#ffffff'); P.rect(8, 4, 2, 10, '#60ff80'); P.rect(4, 8, 10, 2, '#60ff80'); } },
    cast(pl, aim, lv) {
      C.heal(pl, pl.stats.maxHp * (0.25 + lv * 0.07));
      pl.status = {};
      R.Audio.play('heal');
      FX.pillar(pl.x, pl.y, '#80ffa0', 1, 20);
      FX.ring(pl.x, pl.y, 4, 30, '#80ffa0', 0.6, 3);
      FX.burst(pl.x, pl.y - 12, { n: 30, colors: ['#80ffa0', '#ffffff', '#ffe070'], speed: 40, life: 1, up: 40, glow: true });
    },
  });
  add({
    id: 'consecration', name: 'Consecration', cls: 'paladin', mp: 28, cd: (lv) => 14 - lv, castTime: 0.5,
    desc: (lv) => `Sanctify the ground around you for 6s. Enemies inside take ${Math.round(40 + lv * 10)}% damage every half second; you regenerate HP while standing in it.`,
    icon: { color: '#ffe070', draw(P) { P.ellipse(9, 12, 7, 3, '#ffe070'); P.ellipse(9, 12, 5, 2, '#fff4c0'); for (let i = 0; i < 3; i++) P.rect(5 + i * 4, 4 + (i % 2) * 2, 1, 6, '#fff4c0'); } },
    cast(pl, aim, lv) {
      const x = pl.x, y = pl.y, rad = 48;
      R.Audio.play('heal', { pitch: 0.7 });
      FX.ring(x, y, 4, rad, '#ffe070', 0.5, 4);
      FX.add({
        x, y, life: 6, layer: 'ground', tick: 0,
        update(fx, dt) {
          fx.tick += dt;
          if (Math.random() < 0.5) FX.particle({ x: x + U.rand(-rad, rad) * 0.9, y: y + U.rand(-rad, rad) * 0.5, vy: -25, life: 0.7, color: U.choose(['#ffe070', '#ffffff']), glow: true });
          if (fx.tick >= 0.5) {
            fx.tick = 0;
            C.hitCircle(x, y, rad, 'player', (e) => { const r = C.roll(pl, 0.4 + lv * 0.1); C.damage(e, r.dmg * (e.def.tags && e.def.tags.includes('undead') ? 2 : 1), { source: pl, crit: r.crit, color: '#ffe070' }); });
            if (U.dist(pl.x, pl.y, x, y) < rad) C.heal(pl, pl.stats.maxHp * 0.015, true);
          }
        },
        draw(ctx, t) {
          const a = t > 0.9 ? (1 - t) * 10 : Math.min(1, t * 10);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.rgba('#ffe070', 0.18 * a); ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.6, 0, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = U.rgba('#fff4c0', 0.5 * a); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.6, 0, 0, U.TAU); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y, rad * 0.6, rad * 0.36, performance.now() / 1000, 0, U.TAU); ctx.stroke();
          ctx.restore();
        },
      });
    },
  });
  add({
    id: 'divine_shield', name: 'Divine Shield', cls: 'paladin', mp: 35, cd: (lv) => 24 - lv * 1.5, castTime: 0.4,
    desc: (lv) => `Wrap yourself in holy light that absorbs ${Math.round(30 + lv * 10)}% of your max HP in damage for 8s. When it breaks, it bursts for heavy damage.`,
    icon: { color: '#ffe070', draw(P) { P.rect(4, 3, 10, 9, '#ffe070'); P.rect(5, 12, 8, 2, '#ffe070'); P.rect(7, 14, 4, 2, '#ffe070'); P.rect(8, 5, 2, 7, '#ffffff'); P.rect(6, 7, 6, 2, '#ffffff'); } },
    cast(pl, aim, lv) {
      pl.shield = pl.stats.maxHp * (0.3 + lv * 0.1);
      R.Audio.play('heal', { pitch: 1.3 });
      FX.ring(pl.x, pl.y, 4, 40, '#ffe070', 0.5, 4);
      FX.burst(pl.x, pl.y - 12, { n: 25, colors: ['#ffe070', '#ffffff'], speed: 60, glow: true });
      const t0 = R.World.time;
      const check = () => {
        if (pl.dead) return;
        if (pl.shield <= 0) {
          C.explode(pl.x, pl.y, 60, C.roll(pl, 2 + lv * 0.4).dmg, 'player', { color: '#ffe070', colors: ['#ffe070', '#ffffff'], source: pl });
          return;
        }
        if (R.World.time - t0 > 8) { pl.shield = 0; return; }
        R.World.later(0.1, check);
      };
      R.World.later(0.1, check);
    },
  });
})(window.RPG);
