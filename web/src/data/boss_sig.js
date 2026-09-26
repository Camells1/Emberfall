'use strict';
// Signature mechanics: every boss fights differently. Each gets its own movement, 2-4 signature
// attacks with their own animations, and its own phase lines. (Shared attacks from data/content.js
// still mix in on the off-turns.)
//
// Custom visuals go through FX.bfx(name, ...args) so co-op partners see them too (see net.js).
(function (R) {
  const U = R.U, FX = R.FX, K = R.BossKit;
  const W = () => R.World;
  const later = (t, fn) => W().later(t, fn);

  // ================================================================== replicable boss visuals
  const BFX = {
    // spikes (ice / bone / thorns) bursting out of the ground
    spikes(x, y, col, h, n) {
      n = n || 5; h = h || 18;
      const seeds = []; for (let i = 0; i < n; i++) seeds.push([U.rand(-9, 9), U.rand(-4, 4), U.rand(0.6, 1)]);
      FX.add({ x, y, life: 0.7, layer: 'top', draw(ctx, t) {
        const g = t < 0.2 ? U.easeOut(t / 0.2) : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        ctx.save();
        for (const [dx, dy, k] of seeds) {
          const hh = h * k * g, bx = Math.round(x + dx), by = Math.round(y + dy);
          ctx.fillStyle = U.shade(col, -0.35); ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx, by - hh); ctx.lineTo(bx + 4, by); ctx.fill();
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx - 2, by); ctx.lineTo(bx, by - hh); ctx.lineTo(bx + 1, by); ctx.fill();
        }
        ctx.restore();
      } });
      FX.burst(x, y, { n: 8, color: col, speed: 50, life: 0.4, grav: 200, vz: 60 });
    },
    // a chain / tether between two points
    chain(x0, y0, x1, y1, col, life) {
      FX.add({ life, layer: 'top', draw(ctx, t) {
        const n = Math.max(4, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 7));
        ctx.save(); ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
        for (let i = 0; i <= n; i++) {
          const k = i / n, wob = Math.sin(k * 12 + t * 30) * 2 * (1 - t);
          const px = U.lerp(x0, x1, k) + wob, py = U.lerp(y0, y1, k) - Math.sin(k * Math.PI) * 10;
          ctx.fillStyle = i % 2 ? col : U.shade(col, 0.4); ctx.fillRect(Math.round(px) - 2, Math.round(py) - 1, 4, 3);
        }
        ctx.restore();
      } });
    },
    // a falling meteor: shadow grows, ball comes down, boom
    meteor(x, y, r, delay, col) {
      FX.add({ x, y, life: delay, layer: 'ground', draw(ctx, t) { ctx.fillStyle = U.rgba('#000000', 0.15 + 0.35 * t); ctx.beginPath(); ctx.ellipse(x, y, r * t, r * 0.55 * t, 0, 0, U.TAU); ctx.fill(); ctx.strokeStyle = U.rgba(col, 0.6); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, U.TAU); ctx.stroke(); } });
      FX.add({ x, y, life: delay, layer: 'top', draw(ctx, t) {
        const h = (1 - t) * 260, bx = x + (1 - t) * 60, by = y - h;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < 6; i++) { ctx.fillStyle = U.rgba(col, 0.25 / i); ctx.beginPath(); ctx.arc(bx + i * 7, by - i * 20, 7 - i, 0, U.TAU); ctx.fill(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 7, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx - 2, by - 2, 3, 0, U.TAU); ctx.fill();
        ctx.restore();
      } });
    },
    // an expanding shockwave ring on the ground
    wavering(x, y, r0, r1, col, life) {
      FX.add({ x, y, life, layer: 'ground', draw(ctx, t) {
        const r = U.lerp(r0, r1, t);
        ctx.save(); ctx.lineWidth = 8 * (1 - t) + 3; ctx.strokeStyle = U.rgba(col, 0.75 * (1 - t) + 0.2);
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, U.TAU); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = U.rgba('#ffffff', 0.6 * (1 - t)); ctx.beginPath(); ctx.ellipse(x, y, r - 3, (r - 3) * 0.6, 0, 0, U.TAU); ctx.stroke();
        ctx.restore();
      } });
    },
    // a wall of water/sand crossing the arena
    tide(x, y, ang, width, dist, col, life, gap) {
      FX.add({ life, layer: 'top', draw(ctx, t) {
        const c = Math.cos(ang), s = Math.sin(ang), d = -dist / 2 + dist * t;
        const cx = x + c * d, cy = y + s * d;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + Math.PI / 2);
        for (let i = -width / 2; i < width / 2; i += 6) {
          if (gap != null && Math.abs(i - gap) < 22) continue;
          const h = 10 + Math.sin(i * 0.3 + t * 20) * 3;
          ctx.fillStyle = U.rgba(col, 0.85); ctx.fillRect(i, -h, 6, h + 4);
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(i, -h, 6, 2);
        }
        ctx.restore();
      } });
    },
    // a swirling rift
    vortex(x, y, r, life, col) {
      FX.add({ x, y, life, layer: 'ground', draw(ctx, t) {
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.6);
        const a0 = t * 18, g = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
        ctx.fillStyle = U.rgba('#08020e', 0.7 * g); ctx.beginPath(); ctx.arc(0, 0, r * 0.35 * g, 0, U.TAU); ctx.fill();
        for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 16; i++) {
          const k = i / 16, a = a0 + arm * Math.PI / 2 + k * 3, rr = r * k * g;
          ctx.fillStyle = U.rgba(col, (1 - k) * 0.8); ctx.fillRect(Math.cos(a) * rr - 1.5, Math.sin(a) * rr - 1.5, 3, 3);
        }
        ctx.restore();
      } });
    },
    // a big beam of light
    beam(x, y, ang, len, w, col, life) {
      FX.add({ life, layer: 'top', draw(ctx, t) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
        const f = (0.7 + Math.sin(t * 60) * 0.3) * (t > 0.8 ? (1 - t) * 5 : 1);
        ctx.fillStyle = U.rgba(col, 0.35 * f); ctx.fillRect(0, -w, len, w * 2);
        ctx.fillStyle = U.rgba(col, 0.8 * f); ctx.fillRect(0, -w * 0.5, len, w);
        ctx.fillStyle = U.rgba('#ffffff', 0.9 * f); ctx.fillRect(0, -w * 0.18, len, w * 0.36);
        ctx.restore();
      } });
    },
    // lingering cloud / puddle
    cloud(x, y, r, col, life) {
      const blobs = []; for (let i = 0; i < 7; i++) blobs.push([U.rand(-r * 0.6, r * 0.6), U.rand(-r * 0.3, r * 0.3), U.rand(r * 0.35, r * 0.6), U.rand(0, 6)]);
      FX.add({ x, y, life, layer: 'ground', draw(ctx, t) {
        const g = t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1;
        ctx.save();
        for (const [dx, dy, rr, ph] of blobs) { ctx.fillStyle = U.rgba(col, 0.28 * g); ctx.beginPath(); ctx.ellipse(x + dx + Math.sin(t * 8 + ph) * 3, y + dy, rr, rr * 0.6, 0, 0, U.TAU); ctx.fill(); }
        ctx.restore();
      } });
    },
    // shadow circle for something about to drop from above
    shadow(x, y, r, life) {
      FX.add({ x, y, life, layer: 'ground', draw(ctx, t) { ctx.fillStyle = U.rgba('#000000', 0.2 + t * 0.4); ctx.beginPath(); ctx.ellipse(x, y, r * (0.4 + t * 0.6), r * 0.55 * (0.4 + t * 0.6), 0, 0, U.TAU); ctx.fill(); } });
    },
    // petals / leaves / sand whirling around a point
    whirl(x, y, r, col, col2, life) {
      const ps = []; for (let i = 0; i < 40; i++) ps.push([U.rand(0, U.TAU), U.rand(r * 0.3, r), U.rand(-30, 0), Math.random() < 0.5]);
      FX.add({ x, y, life, layer: 'top', draw(ctx, t) {
        for (const [a, rr, h, c2] of ps) { const aa = a + t * 9; ctx.fillStyle = c2 ? col2 : col; ctx.fillRect(Math.round(x + Math.cos(aa) * rr), Math.round(y + Math.sin(aa) * rr * 0.6 + h * (1 - t)), 3, 2); }
      } });
    },
    // a crack running across the ground from a to b
    crack(x0, y0, x1, y1, col, life) {
      const pts = []; const n = Math.max(3, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 10));
      for (let i = 0; i <= n; i++) pts.push([U.lerp(x0, x1, i / n) + U.rand(-4, 4), U.lerp(y0, y1, i / n) + U.rand(-3, 3)]);
      FX.add({ life, layer: 'ground', draw(ctx, t) {
        ctx.save(); ctx.strokeStyle = U.rgba(col, 0.9 * (1 - t) + 0.1); ctx.lineWidth = 2;
        ctx.beginPath(); const k = Math.min(1, t * 3); const m = Math.floor(pts.length * k);
        for (let i = 0; i < m; i++) { if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); }
        ctx.stroke(); ctx.restore();
      } });
    },
  };
  FX.bfx = function (name) { const f = BFX[name]; if (f) f.apply(null, [].slice.call(arguments, 1)); };
  const bfx = FX.bfx;

  // ================================================================== helpers
  const hit = (e, x, y, r, mult, o) => R.Combat.hitCircle(x, y, r, 'enemy', (t) => e.hitPlayer(mult, o, t));
  const players = () => (R.Net && R.Net.active() ? R.Net.players() : [W().player]).filter((q) => q && !q.dead);
  const nearestP = (e) => players().sort((a, b) => U.dist(a.x, a.y, e.x, e.y) - U.dist(b.x, b.y, e.x, e.y))[0] || W().player;
  // Put the boss somewhere near (x, y) that isn't inside a wall.
  function place(e, x, y) { for (let i = 0; i < 12; i++) { const px = x + U.rand(-20, 20) * (i ? 1 : 0), py = y + U.rand(-14, 14) * (i ? 1 : 0); if (!W().collides(px, py, e.r)) { e.x = px; e.y = py; return true; } } return false; }
  // Hits along a line (beams, charges): once per target per `every` seconds.
  function lineHit(e, x, y, ang, len, w, mult, o, memo, every) {
    const now = W().time;
    for (let d = 0; d <= len; d += 12) R.Combat.hitCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, w, 'enemy', (t) => { if ((memo.get(t) || -9) > now - (every || 0.4)) return; memo.set(t, now); e.hitPlayer(mult, o, t); });
  }
  // A line of eruptions racing from (x, y) along ang.
  function eruptLine(e, x, y, ang, n, step, col, mult, o, kind) {
    for (let i = 1; i <= n; i++) later(i * 0.09, () => {
      if (e.dead) return;
      const px = x + Math.cos(ang) * i * step, py = y + Math.sin(ang) * i * step;
      if (W().solidAt(px, py)) return;
      bfx(kind || 'spikes', px, py, col, 18, 4);
      hit(e, px, py, 13, mult, o);
    });
  }
  function hide(e, on) { e.untargetable = on; e.alpha = on ? 0 : 1; }
  // Enemies drawn with alpha 0 are hidden (burrowed / up on the ceiling)
  const baseDraw = R.Enemy && R.Enemy.prototype.draw;
  function patchDraw() {
    const E = R.Enemy.prototype;
    if (E.__bossPatched) return;
    E.__bossPatched = true;
    const d = E.draw, u = E.drawUI;
    E.draw = function (ctx) { if (this.alpha === 0 && !this.dead) return; return d.call(this, ctx); };
    E.drawUI = function (ctx) { if (this.alpha === 0 && !this.dead) return; return u.call(this, ctx); };
  }
  R.events.on('enter', patchDraw);

  // ================================================================== minions used by signature moves
  const mob = R.mob;
  mob('spider_egg', 'Brood Egg', 8, { hp: 0.9, atk: 0, xp: 0.2, spd: 0, r: 7, height: 12, sprite: 'slime', pal: { main: '#e8e0c8', core: '#80ff40' }, gold: [0, 0], potion: 0, gearChance: 0, knockResist: 1, tags: ['insect'], blood: '#c0ff80',
    update(e, dt) {
      e.anim = 'idle'; e.mem.t = (e.mem.t || 0) + dt;
      if (e.mem.t > 3.4 && Math.random() < dt * 20) e.flash = 0.05;
      if (e.mem.t > 4.5 && !e.dead) { for (let i = 0; i < 2; i++) { const s = W().spawnEnemy('spiderling', e.x + U.rand(-8, 8), e.y + U.rand(-6, 6), e.level); if (s) { s.state = 'chase'; s.noLoot = true; } } FX.burst(e.x, e.y - 6, { n: 16, colors: ['#e8e0c8', '#80ff40'], speed: 60 }); e.remove = true; }
    } });
  mob('shadow_clone', 'Hollow Shade', 24, { hp: 0.35, atk: 1.1, xp: 0.1, spd: 95, r: 8, height: 34, scale: 1.3, sprite: 'knight', pal: { main: '#0a0a12', trim: '#c040ff', cloth: '#200830', shield: '#050508', horns: '#40404a', eye: '#ff40ff' }, ai: 'charger', gold: [0, 0], potion: 0, gearChance: 0, tags: ['undead'], blood: '#8020ff' });
  mob('rose_turret', 'Blood Rose', 19, { hp: 0.8, atk: 0.9, xp: 0.2, spd: 0, r: 8, height: 22, sprite: 'bramble', pal: { main: '#6a2a4a', leaf: '#40a040', flower: '#ff4080', thorn: '#ffe0f0' }, ai: 'turret', gold: [0, 0], potion: 0, gearChance: 0, knockResist: 1, tags: ['plant'], blood: '#ff60a0', attack: { cd: 1.3, speed: 120, color: '#ff80c0' } });
  mob('eye_orb', 'Watching Eye', 29, { hp: 0.3, atk: 0.9, xp: 0.1, spd: 40, r: 6, height: 20, scale: 0.8, sprite: 'voideye', pal: { main: '#3a1a5a', eye: '#ffffff', crown: '#c080ff' }, ai: 'turret', gold: [0, 0], potion: 0, gearChance: 0, tags: ['spirit', 'flying'], blood: '#c080ff', attack: { cd: 1.6, speed: 140, color: '#ff60ff' } });
  mob('mummy_guard', 'Tomb Guard', 13, { hp: 1.3, atk: 1.1, xp: 0.2, spd: 38, r: 7, height: 26, sprite: 'shambler', pal: { main: '#d8c8a0', style: 'mummy', eye: '#40ff80' }, gold: [0, 0], potion: 0, gearChance: 0, tags: ['undead'] });

  // ================================================================== the bosses
  const set = (id, cfg) => { const d = R.Enemies[id]; if (d) d.update = K.bossBrain(cfg); };

  // ---------------------------------------------------------------- Gloopus, the Slime King: bounces, leaves goo, splits
  const slime = R.Enemies.slime_king;
  if (slime) {
    const orig = slime.update;
    slime.update = function (e, dt, sm) {
      const m = e.mem;
      // goo puddles slow you
      m.gooT = (m.gooT || 0) - dt;
      if (m.act === 'jump' && m.jt + dt >= 0.9 && !m.gooed) { m.gooed = true; later(0.02, () => { bfx('cloud', e.x, e.y, 34, '#60e080', 5); for (let k = 0; k < 10; k++) later(k * 0.5, () => hit(e, e.x, e.y, 30, 0.05, { knock: 0, status: { slow: { amt: 0.5, dur: 0.8 } }, noText: true })); }); }
      if (m.act !== 'jump') m.gooed = false;
      // at half health it splits off two princes
      if (!m.split && e.hp < e.maxHp * 0.5) {
        m.split = true;
        R.UI.toast('Gloopus: "BLORP!" — he splits in two!', 'bad'); R.Audio.play('bossRoar', { pitch: 1.8 }); FX.shake(6, 0.4);
        for (const s of [-1, 1]) { const c = W().spawnEnemy('slime', e.x + s * 40, e.y, e.level); if (c) { c.maxHp = c.hp = Math.round(e.maxHp * 0.12); c.scale = 1.5; c.state = 'chase'; c.noLoot = true; } }
        bfx('whirl', e.x, e.y - 10, 40, '#60e080', '#c0ffd0', 0.6);
      }
      return orig(e, dt, sm);
    };
  }

  // ---------------------------------------------------------------- Mortis, the Bone Lich: blinks, chains your soul, bone prisons
  set('lich', {
    color: '#b070ff', keep: 100,
    moves: [K.ring('#b070ff', 12), K.spiral('#b070ff'), K.fan('#80ffff', 5, { slow: { amt: 0.4, dur: 2 } }), K.summon('skeleton', 2)],
    phaseText: { 2: 'Rise, my servants!', 3: 'Your soul will make a fine lantern.', 4: 'I... cannot... DIE!' },
    sig: [
      (e) => { // Soul Chains: tether everyone near; stay close and your life drains into him
        const targets = players().filter((q) => U.dist(q.x, q.y, e.x, e.y) < 260);
        for (const q of targets) bfx('chain', e.x, e.y - 30, q.x, q.y - 12, '#c080ff', 1.8);
        R.Audio.play('magic', { pitch: 0.4 }); R.UI.toast('Soul Chains! Run away from Mortis to break them!', 'bad');
        later(1.8, () => {
          if (e.dead) return;
          let drained = 0;
          for (const q of players()) if (U.dist(q.x, q.y, e.x, e.y) < 150) { e.hitPlayer(1.4, { knock: 60, trueDmg: false }, q); drained++; bfx('chain', q.x, q.y - 12, e.x, e.y - 30, '#ff40ff', 0.4); }
          if (drained) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * drained); FX.pillar(e.x, e.y, '#ff40ff', 0.8, 10); }
        });
        e.mem.cast = 1.9;
      },
      (e, p, ph) => { // Bone Prison: a ring of bone spikes erupts around you (one gap)
        const q = nearestP(e), cx = q.x, cy = q.y, n = 12, gap = U.rand(0, U.TAU);
        for (let i = 0; i < n; i++) {
          const a = i / n * U.TAU; if (Math.abs(U.angleDiff(a, gap)) < 0.5) continue;
          const x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 30;
          e.telegraph(x, y, 12, 0.8, () => { bfx('spikes', x, y, '#f0ece0', 24, 5); hit(e, x, y, 13, 0.9, { knock: 80 }); }, '#e0d0ff');
        }
        later(1.2, () => { if (e.dead) return; bfx('spikes', cx, cy, '#f0ece0', 30, 7); hit(e, cx, cy, 20, 1.1, { knock: 200 }); });
        if (ph >= 3) later(0.3, () => { for (let k = 0; k < 3; k++) eruptLine(e, e.x, e.y, U.angle(e.x, e.y, cx, cy) + (k - 1) * 0.5, 9, 18, '#f0ece0', 0.8, null); });
      },
    ],
    move(e, dt, sm, p, d) { // blinks around instead of walking
      const m = e.mem; m.blink = (m.blink == null ? 4 : m.blink) - dt;
      if (m.blink <= 0) {
        m.blink = U.rand(3.5, 6);
        FX.burst(e.x, e.y - 20, { n: 24, colors: ['#b070ff', '#20102a'], speed: 60, glow: true });
        const a = U.rand(0, U.TAU); place(e, p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 70);
        FX.burst(e.x, e.y - 20, { n: 24, colors: ['#b070ff', '#20102a'], speed: 60, glow: true }); R.Audio.play('portal', { pitch: 1.5 });
        return true;
      }
      return false;
    },
  });

  // ---------------------------------------------------------------- Vexa, the Broodmother: eggs, webs, drops from the ceiling
  set('broodmother', {
    color: '#80ff40', keep: 60,
    moves: [K.fan('#a0ff60', 5, { poison: { dps: 12, dur: 4 } }), K.blast('#80ff40', { poison: { dps: 14, dur: 4 } }), K.ring('#e0e0f0', 10)],
    phaseText: { 2: 'My children hunger!', 3: 'You will be WRAPPED and SAVED for later!', 4: 'Ssssso many legsss... and you have only TWO.' },
    sig: [
      (e, p, ph) => { // Egg clutch: eggs that hatch unless you smash them
        const n = 2 + (ph >= 3 ? 1 : 0);
        for (let i = 0; i < n; i++) { const a = U.rand(0, U.TAU); const x = e.x + Math.cos(a) * 60, y = e.y + Math.sin(a) * 40; if (W().collides(x, y, 7)) continue; const g = W().spawnEnemy('spider_egg', x, y, e.level); if (g) { g.noLoot = true; FX.burst(x, y - 6, { n: 10, color: '#e8e0c8', speed: 30 }); } }
        R.UI.toast('Vexa lays eggs! Smash them before they hatch!', 'bad'); R.Audio.play('slime', { pitch: 0.6 });
      },
      (e, p, ph) => { // Web shot: webs stick you in place
        const q = nearestP(e);
        for (let k = 0; k < 2 + ph; k++) {
          const x = q.x + U.rand(-50, 50) * (k ? 1 : 0), y = q.y + U.rand(-35, 35) * (k ? 1 : 0);
          e.telegraph(x, y, 26, 0.8, () => { bfx('cloud', x, y, 26, '#f0f0ff', 4); for (let j = 0; j < 8; j++) later(j * 0.5, () => hit(e, x, y, 24, 0.02, { knock: 0, status: { slow: { amt: 0.8, dur: 0.7 } }, noText: true })); }, '#e0e0ff');
        }
        R.Audio.play('whoosh', { pitch: 0.7 });
      },
      (e) => { // Ceiling drop: climbs out of reach, then lands on you
        hide(e, true); e.mem.drop = 2.2; e.mem.cast = 2.4;
        R.UI.toast('Vexa skitters up into the dark... watch the shadows!', 'bad'); R.Audio.play('whoosh', { pitch: 0.5 });
      },
    ],
    tick(e, dt) {
      const m = e.mem;
      if (!(m.drop > 0)) return false;
      m.drop -= dt;
      const q = nearestP(e);
      e.x = U.lerp(e.x, q.x, Math.min(1, dt * 3)); e.y = U.lerp(e.y, q.y, Math.min(1, dt * 3));
      if (Math.random() < dt * 8) bfx('shadow', e.x, e.y, 36, 0.3);
      if (m.drop <= 0) { hide(e, false); FX.shake(8, 0.4); bfx('wavering', e.x, e.y, 10, 70, '#80ff40', 0.5); hit(e, e.x, e.y, 46, 1.6, { knock: 260 }); R.Audio.play('explode', { pitch: 0.7 }); }
      return true;
    },
    move(e, dt, sm, p, d) { // skitters in bursts
      const m = e.mem; m.sk = (m.sk || 0) - dt;
      if (m.sk <= 0) { m.sk = U.rand(0.9, 1.6); m.ska = U.angle(e.x, e.y, p.x, p.y) + U.rand(-1.2, 1.2) + (d < 60 ? Math.PI : 0); }
      if (m.sk > 0.5) { e.moveAngle(m.ska, e.def.spd * 2.4 * sm, dt); e.anim = 'walk'; } else e.anim = 'idle';
      return true;
    },
  });

  // ---------------------------------------------------------------- Anhotep, the Sand King: sun beam, sandstorm, the tomb guard
  set('pharaoh', {
    color: '#ffd040', keep: 90,
    moves: [K.fan('#ffd040', 5, { burn: { dps: 20, dur: 3 } }), K.spiral('#e0c060'), K.blast('#ffb030', { burn: { dps: 24, dur: 3 } }), K.summon('scarab', 3)],
    phaseText: { 2: 'The sun obeys ME!', 3: 'Guards! Rise from your sleep!', 4: 'I will not return to the dark!' },
    sig: [
      (e, p, ph) => { // Sun Beam: a sweeping beam of sunlight
        const start = U.angle(e.x, e.y, p.x, p.y) - 1.2, dir = Math.random() < 0.5 ? 1 : -1, memo = new Map(), steps = 30;
        FX.lane(e.x, e.y - 20, start, 300, 10, '#ffe070', 0.7);
        e.mem.cast = 0.7 + steps * 0.05;
        R.Audio.play('magic', { pitch: 1.6 });
        for (let i = 0; i < steps; i++) later(0.7 + i * 0.05, () => {
          if (e.dead) return;
          const a = start + dir * i * (2.4 / steps);
          bfx('beam', e.x, e.y - 20, a, 300, 8, '#ffe070', 0.07);
          lineHit(e, e.x, e.y - 12, a, 300, 10, 0.9, { status: { burn: { dps: e.atk * 0.25, dur: 2 } } }, memo, 0.5);
          if (ph >= 3) { bfx('beam', e.x, e.y - 20, a + Math.PI, 300, 8, '#ffe070', 0.07); lineHit(e, e.x, e.y - 12, a + Math.PI, 300, 10, 0.9, null, memo, 0.5); }
        });
      },
      (e) => { // Sandstorm: whirling sand pulls everyone toward him while sand blasts in
        R.UI.toast('A sandstorm! Anhotep drags you closer!', 'bad'); R.Audio.play('whoosh', { pitch: 0.4 });
        bfx('whirl', e.x, e.y, 220, '#e0c080', '#fff0c0', 3.5);
        for (let k = 0; k < 14; k++) later(k * 0.25, () => {
          if (e.dead) return;
          for (const q of players()) { const a = U.angle(q.x, q.y, e.x, e.y); if (U.dist(q.x, q.y, e.x, e.y) > 40) e.hitPlayer(0.03, { knock: 70, angle: a, noText: true }, q); }
          const a2 = U.rand(0, U.TAU); e.shoot(a2, { speed: 90, color: '#e0c080', size: 3, dmg: e.atk * 0.4 });
        });
        e.mem.cast = 1;
      },
      (e) => { // Tomb guards rise out of the sand
        for (let i = 0; i < 2; i++) { const a = U.rand(0, U.TAU), x = e.x + Math.cos(a) * 70, y = e.y + Math.sin(a) * 45; bfx('whirl', x, y, 20, '#e0c080', '#8a6a30', 0.9); later(0.8, () => { if (e.dead) return; const g = W().spawnEnemy('mummy_guard', x, y, e.level - 1); if (g) { g.noLoot = true; g.state = 'chase'; } }); }
      },
    ],
  });

  // ---------------------------------------------------------------- Skaldr, the Frost Wyrm: spike lines, frozen orbs, burrows under the ice
  set('frost_wyrm', {
    color: '#a0e8ff', keep: 90,
    moves: [K.fan('#c0f0ff', 6, { slow: { amt: 0.45, dur: 2.5 } }), K.ring('#a0e8ff', 14), K.blast('#80d0ff', { freeze: { dur: 1 } })],
    phaseText: { 2: 'The cold sinks into your bones...', 3: 'The whole mountain is MY body!', 4: 'I will freeze the sun itself!' },
    sig: [
      (e, p, ph) => { // Glacial Spikes: lines of ice racing toward you
        const a = U.angle(e.x, e.y, p.x, p.y), k = ph >= 3 ? 5 : 3;
        for (let i = 0; i < k; i++) eruptLine(e, e.x, e.y, a + (i - (k - 1) / 2) * 0.35, 12, 18, '#c0f0ff', 0.85, { status: { slow: { amt: 0.5, dur: 1.5 } } });
        R.Audio.play('ice', { pitch: 0.7 });
      },
      (e, p, ph) => { // Frozen Orb: a slow orb that shatters into shards
        const a = U.angle(e.x, e.y, p.x, p.y);
        const orb = e.shoot(a, { speed: 60, color: '#e0f8ff', size: 8, dmg: e.atk * 1.2, life: 2.2, glow: true });
        later(2.1, () => { if (e.dead || !orb) return; const n = 12 + ph * 2; for (let i = 0; i < n; i++) e.shoot(i / n * U.TAU, { x: orb.x, y: orb.y, speed: 120, color: '#a0e8ff', size: 3, dmg: e.atk * 0.5, status: { slow: { amt: 0.4, dur: 1.5 } } }); bfx('spikes', orb.x, orb.y, '#e0f8ff', 20, 6); R.Audio.play('ice'); });
      },
      (e) => { // Burrow: dives under the ice; a crack follows you; bursts up
        hide(e, true); e.mem.burrow = 2.4; e.mem.cast = 2.6;
        R.UI.toast('Skaldr dives under the ice! Keep moving!', 'bad'); R.Audio.play('explode', { pitch: 0.5 });
      },
    ],
    tick(e, dt) {
      const m = e.mem;
      if (!(m.burrow > 0)) return false;
      m.burrow -= dt;
      const q = nearestP(e), ox = e.x, oy = e.y;
      e.moveToward(q.x, q.y, 120, dt);
      if (Math.random() < dt * 10) bfx('crack', ox, oy, e.x, e.y, '#c0f0ff', 1.2);
      if (m.burrow <= 0) { hide(e, false); bfx('spikes', e.x, e.y, '#c0f0ff', 34, 9); hit(e, e.x, e.y, 40, 1.5, { knock: 240, status: { freeze: { dur: 0.8 } } }); FX.shake(8, 0.4); }
      return true;
    },
    move(e, dt, sm, p, d, ph) { // slithers
      const m = e.mem; m.sl = (m.sl || 0) + dt;
      const a = U.angle(e.x, e.y, p.x, p.y) + (d < 90 ? Math.PI * 0.7 : 0) + Math.sin(m.sl * 3) * 0.9;
      e.moveAngle(a, e.def.spd * sm * (1 + ph * 0.12), dt); e.anim = 'walk';
      return true;
    },
  });

  // ---------------------------------------------------------------- Pyrrhus, the Molten Titan: meteors, lava waves, eruptions
  set('infernal', {
    color: '#ff6020', keep: 70,
    moves: [K.ring('#ff8030', 16), K.blast('#ff4010', { burn: { dps: 34, dur: 3 } }), K.summon('fire_imp', 3), K.charge('#ff6020')],
    phaseText: { 2: 'The mountain AWAKENS!', 3: 'BURN! EVERYTHING BURNS!', 4: 'I AM THE ERUPTION!' },
    sig: [
      (e, p, ph) => { // Meteor Storm
        const n = 5 + ph * 2;
        R.UI.toast('Meteors! Watch the shadows!', 'bad'); R.Audio.play('bossRoar', { pitch: 0.6 });
        for (let i = 0; i < n; i++) later(i * 0.22, () => {
          if (e.dead) return;
          const q = U.choose(players()), x = q.x + U.rand(-90, 90) * (i % 3 ? 1 : 0.2), y = q.y + U.rand(-60, 60) * (i % 3 ? 1 : 0.2);
          bfx('meteor', x, y, 26, 1.1, '#ff8030');
          later(1.1, () => { if (e.dead) return; R.Combat.explode(x, y, 30, e.atk * 1.3, 'enemy', { color: '#ff6020', colors: ['#ff6020', '#ffd060', '#ffffff'], shake: 3, source: e, status: { burn: { dps: e.atk * 0.3, dur: 3 } } }); bfx('cloud', x, y, 20, '#ff4010', 2.5); });
        });
      },
      (e) => { // Lava Wave: an expanding ring you have to roll through
        bfx('wavering', e.x, e.y, 20, 260, '#ff6020', 1.6);
        R.UI.toast('A wave of lava! Roll through it (Space)!', 'bad'); R.Audio.play('explode', { pitch: 0.4 }); FX.shake(5, 1.2);
        const hitOnce = new Set();
        for (let i = 0; i <= 32; i++) later(i * 0.05, () => {
          if (e.dead) return;
          const r = U.lerp(20, 260, i / 32);
          for (const q of players()) { if (hitOnce.has(q) || q.invuln > 0) continue; const dd = Math.hypot(q.x - e.x, (q.y - e.y) / 0.6); if (Math.abs(dd - r) < 10) { hitOnce.add(q); e.hitPlayer(1.5, { knock: 200, status: { burn: { dps: e.atk * 0.3, dur: 3 } } }, q); } }
        });
      },
      (e, p, ph) => { // Eruption: fire bursting out in a star
        const k = 6 + (ph >= 3 ? 2 : 0), a0 = U.rand(0, U.TAU);
        for (let i = 0; i < k; i++) eruptLine(e, e.x, e.y, a0 + i / k * U.TAU, 10, 20, '#ff8030', 0.9, { status: { burn: { dps: e.atk * 0.25, dur: 2 } } });
        R.Audio.play('explode', { pitch: 0.6 });
      },
    ],
    move(e, dt, sm, p, d) { // heavy stomps that shake the ground
      const m = e.mem; m.st = (m.st || 0) + dt;
      if (m.st > 0.7) { m.st = 0; FX.shake(2, 0.15); FX.burst(e.x, e.y, { n: 6, color: '#4a3030', speed: 30, life: 0.4 }); if (Math.random() < 0.3) bfx('crack', e.x - 10, e.y, e.x + 10, e.y + 4, '#ff6020', 1); }
      if (m.st < 0.35) { e.moveAngle(U.angle(e.x, e.y, p.x, p.y) + (d < 70 ? Math.PI * 0.6 : 0), e.def.spd * 1.6 * sm, dt); e.anim = 'walk'; } else e.anim = 'idle';
      return true;
    },
  });

  // ---------------------------------------------------------------- Malgrath, the Hollow King: shadow clones, void rift, orbiting blades, crown slam
  set('hollow_king', {
    color: '#c040ff', keep: 80,
    moves: [K.spiral('#c040ff'), K.fan('#ff40ff', 7, { slow: { amt: 0.35, dur: 2 } }), K.blast('#8020ff', null), K.summon('hollow_soldier', 2)],
    phaseText: { 2: 'Kneel!', 4: 'If I fall, I take this world with me!' },
    onPhase(e, ph) { if (ph === 3) R.UI.dialog([{ speaker: 'Malgrath', text: 'ENOUGH! Witness the true power of the Hollow Crown!' }]); },
    sig: [
      (e, p, ph) => { // Shadow Clones
        const n = ph >= 3 ? 3 : 2;
        for (let i = 0; i < n; i++) { const a = i / n * U.TAU; const c = W().spawnEnemy('shadow_clone', e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 28, e.level); if (c) { c.noLoot = true; c.state = 'chase'; FX.burst(c.x, c.y - 16, { n: 20, colors: ['#c040ff', '#0a0a12'], speed: 60, glow: true }); } }
        R.UI.toast('Malgrath splits into shadows!', 'bad'); R.Audio.play('portal', { pitch: 0.6 });
      },
      (e) => { // Void Rift: pulls everyone in, then explodes
        const q = nearestP(e), x = q.x, y = q.y;
        bfx('vortex', x, y, 90, 2.4, '#c040ff');
        R.UI.toast('A void rift opens! Get away from it!', 'bad'); R.Audio.play('portal', { pitch: 0.4 });
        for (let k = 0; k < 10; k++) later(0.2 + k * 0.2, () => { if (e.dead) return; for (const t of players()) { const dd = U.dist(t.x, t.y, x, y); if (dd < 140 && dd > 12) e.hitPlayer(0.02, { knock: 90, angle: U.angle(t.x, t.y, x, y), noText: true }, t); } });
        later(2.3, () => { if (e.dead) return; R.Combat.explode(x, y, 50, e.atk * 1.8, 'enemy', { color: '#c040ff', colors: ['#c040ff', '#ff80ff', '#ffffff'], shake: 7, source: e }); });
      },
      (e, p, ph) => { // Orbiting blades, then launched one by one
        const n = 6 + ph, blades = [];
        for (let i = 0; i < n; i++) blades.push(i / n * U.TAU);
        FX.add({ life: 1.2, layer: 'top', draw(ctx, t) { for (const b of blades) { const a = b + t * 8, x = e.x + Math.cos(a) * 34, y = e.y - 24 + Math.sin(a) * 20; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = '#e0c0ff'; ctx.fillRect(-1, -8, 3, 14); ctx.fillStyle = '#c040ff'; ctx.fillRect(-3, 5, 7, 2); ctx.restore(); } } });
        for (let i = 0; i < n; i++) later(1.2 + i * 0.12, () => { if (e.dead) return; const q = nearestP(e); const a0 = blades[i] + 1.2 * 8, sx = e.x + Math.cos(a0) * 34, sy = e.y + Math.sin(a0) * 20; e.shoot(U.angle(sx, sy, q.x, q.y - 10), { x: sx, y: sy, speed: 260, color: '#e0c0ff', size: 4, dmg: e.atk * 0.7 }); R.Audio.play('whoosh', { pitch: 1.4 }); });
        e.mem.cast = 1.3;
      },
      (e) => { // Crown Slam: leaps into the air and crashes down
        const q = nearestP(e), tx = q.x, ty = q.y, sx = e.x, sy = e.y;
        e.telegraph(tx, ty, 50, 0.9, () => {}, '#c040ff');
        e.mem.cast = 1.1;
        for (let i = 0; i <= 18; i++) later(i * 0.05, () => { if (e.dead) return; const k = i / 18; e.x = U.lerp(sx, tx, k); e.y = U.lerp(sy, ty, k); e.z = Math.sin(k * Math.PI) * 70; });
        later(0.95, () => { if (e.dead) return; e.z = 0; FX.shake(9, 0.5); bfx('wavering', tx, ty, 10, 90, '#c040ff', 0.6); hit(e, tx, ty, 50, 1.7, { knock: 280 }); for (let i = 0; i < 12; i++) e.shoot(i / 12 * U.TAU, { speed: 110, color: '#c040ff', dmg: e.atk * 0.5 }); });
      },
    ],
  });

  // ---------------------------------------------------------------- Clackjaw, the Tide Tyrant: shell spin, bubbles, tidal wave
  set('crab_king', {
    color: '#40c0ff', keep: 60,
    moves: [K.fan('#80e0ff', 5, { slow: { amt: 0.4, dur: 2 } }), K.blast('#40a0ff', { slow: { amt: 0.5, dur: 2 } }), K.summon('crab', 2), K.ring('#a0e0ff', 12)],
    phaseText: { 2: 'CLACK! MY SHELL IS HARDER THAN YOUR HEAD!', 3: 'THE TIDE COMES FOR YOU!', 4: 'CLACKCLACKCLACKCLACK!' },
    sig: [
      (e) => { // Shell Spin: hides in the shell and ricochets around
        e.mem.spin = 3; e.mem.spinA = U.rand(0, U.TAU); e.mem.cast = 3.1; e.mem.armor0 = e.armor; e.armor = e.armor * 4 + 40;
        R.UI.toast('Clackjaw spins in his shell — his armor is way up. Dodge!', 'bad'); R.Audio.play('whoosh', { pitch: 0.6 });
      },
      (e, p, ph) => { // Bubbles that drift toward you and pop
        const n = 6 + ph * 2;
        for (let i = 0; i < n; i++) later(i * 0.12, () => { if (e.dead) return; const q = nearestP(e); e.shoot(U.angle(e.x, e.y, q.x, q.y) + U.rand(-0.8, 0.8), { speed: 55, color: '#c0f0ff', size: 6, dmg: e.atk * 0.7, homing: 1.2, life: 4, glow: true, status: { slow: { amt: 0.4, dur: 1.5 } } }); });
        R.Audio.play('slime', { pitch: 1.6 });
      },
      (e) => { // Tidal Wave: a wall of water sweeps across the arena; find the gap
        const q = nearestP(e), ang = U.rand(0, U.TAU), gap = U.rand(-60, 60), width = 460, dist = 520, life = 2.4;
        bfx('tide', q.x, q.y, ang, width, dist, '#3080d0', life, gap);
        R.UI.toast('TIDAL WAVE! Find the gap!', 'bad'); R.Audio.play('whoosh', { pitch: 0.3 });
        const done = new Set();
        for (let i = 0; i <= 40; i++) later(i * life / 40, () => {
          if (e.dead) return;
          const d = -dist / 2 + dist * i / 40, c = Math.cos(ang), s = Math.sin(ang);
          for (const t of players()) { if (done.has(t)) continue; const rx = t.x - q.x, ry = t.y - q.y, along = rx * c + ry * s, across = -rx * s + ry * c; if (Math.abs(along - d) < 12 && Math.abs(across) < width / 2 && Math.abs(across - gap) > 22) { done.add(t); e.hitPlayer(1.3, { knock: 260, angle: ang }, t); } }
        });
      },
    ],
    tick(e, dt) {
      const m = e.mem;
      if (!(m.spin > 0)) return false;
      m.spin -= dt;
      const sp = 230 * dt, nx = e.x + Math.cos(m.spinA) * sp, ny = e.y + Math.sin(m.spinA) * sp;
      if (W().collides(nx, ny, e.r)) { m.spinA = m.spinA + Math.PI + U.rand(-0.6, 0.6); FX.shake(3, 0.1); R.Audio.play('hit', { pitch: 0.6 }); } else { e.x = nx; e.y = ny; }
      if (Math.random() < dt * 12) FX.particle({ x: e.x, y: e.y, vx: U.rand(-30, 30), vy: -20, life: 0.4, color: '#a0e0ff', size: 2 });
      m.spinHit = (m.spinHit || 0) - dt;
      if (m.spinHit <= 0) { m.spinHit = 0.3; hit(e, e.x, e.y, e.r + 6, 0.8, { knock: 200 }); }
      e.anim = 'attack';
      if (m.spin <= 0) e.armor = m.armor0 || e.armor;
      return true;
    },
    move(e, dt, sm, p, d) { // sideways scuttle
      const a = U.angle(e.x, e.y, p.x, p.y) + Math.PI / 2 * (Math.sin(W().time * 0.8) > 0 ? 1 : -1) + (d > 110 ? -0.6 : d < 50 ? 0.6 : 0);
      e.moveAngle(a, e.def.spd * 1.3 * sm, dt); e.anim = 'walk';
      return true;
    },
  });

  // ---------------------------------------------------------------- Mycelos, the Rot-Crowned: spore clouds, mushroom rings, pops up under you
  set('mycelord', {
    color: '#a0ff60', keep: 90,
    moves: [K.ring('#c0ff80', 14), K.summon('myconid', 2), K.blast('#80ff40', { poison: { dps: 18, dur: 4 } }), K.spiral('#c070ff')],
    phaseText: { 2: 'The spores remember you.', 3: 'Root and rot! Root and rot!', 4: 'WE... ARE... ONE!' },
    sig: [
      (e, p, ph) => { // Spore clouds that drift and poison
        for (let i = 0; i < 2 + ph; i++) {
          const q = nearestP(e); let x = q.x + U.rand(-70, 70), y = q.y + U.rand(-50, 50); const vx = U.rand(-12, 12), vy = U.rand(-8, 8);
          bfx('cloud', x, y, 30, '#b060d0', 6);
          for (let k = 0; k < 12; k++) later(k * 0.5, () => { if (e.dead) return; x += vx * 0.5; y += vy * 0.5; hit(e, x + vx * k * 0.5, y + vy * k * 0.5, 26, 0.03, { knock: 0, status: { poison: { dps: e.atk * 0.22, dur: 2 } }, noText: true }); });
        }
        R.Audio.play('slime', { pitch: 0.5 });
      },
      (e, p, ph) => { // Mushroom ring: mushrooms sprout around you and burst
        const q = nearestP(e), n = 10, gap = U.rand(0, U.TAU);
        for (let i = 0; i < n; i++) {
          const a = i / n * U.TAU; if (Math.abs(U.angleDiff(a, gap)) < 0.45) continue;
          const x = q.x + Math.cos(a) * 44, y = q.y + Math.sin(a) * 28;
          e.telegraph(x, y, 14, 1.1, () => { bfx('spikes', x, y, '#e060c0', 12, 3); R.Combat.explode(x, y, 18, e.atk * 0.8, 'enemy', { color: '#c0ff80', colors: ['#c0ff80', '#b060d0'], source: e, status: { poison: { dps: e.atk * 0.2, dur: 3 } } }); }, '#c0ff80');
        }
      },
      (e) => { // Burrow: sinks into the soil and pops up under you
        hide(e, true); e.mem.burrow = 1.8; e.mem.cast = 2;
        bfx('whirl', e.x, e.y, 30, '#6a4a3a', '#c0ff80', 0.6); R.Audio.play('slime', { pitch: 0.4 });
      },
    ],
    tick(e, dt) {
      const m = e.mem;
      if (!(m.burrow > 0)) return false;
      m.burrow -= dt;
      const q = nearestP(e); e.moveToward(q.x, q.y, 90, dt);
      if (Math.random() < dt * 6) bfx('spikes', e.x, e.y, '#a06040', 8, 2);
      if (m.burrow <= 0) { hide(e, false); bfx('spikes', e.x, e.y, '#c0ff80', 30, 8); hit(e, e.x, e.y, 40, 1.4, { knock: 240, status: { poison: { dps: e.atk * 0.25, dur: 3 } } }); FX.shake(6, 0.3); }
      return true;
    },
  });

  // ---------------------------------------------------------------- Queen Briarthorn: racing thorn vines, blood rose turrets, petal storm, root travel
  set('briar_queen', {
    color: '#ff70c0', keep: 100,
    moves: [K.fan('#ff90e0', 7, null), K.summon('pixie', 2), K.blast('#ff60c0', { slow: { amt: 0.5, dur: 2 } }), K.spiral('#c0ff60')],
    phaseText: { 2: 'Grow, my roses. Drink.', 3: 'The whole forest is my body!', 4: 'SLEEP BENEATH MY THORNS!' },
    sig: [
      (e, p, ph) => { // Thorn vines racing along the ground
        const q = nearestP(e), a = U.angle(e.x, e.y, q.x, q.y), k = 3 + (ph >= 3 ? 2 : 0);
        for (let i = 0; i < k; i++) eruptLine(e, e.x, e.y, a + (i - (k - 1) / 2) * 0.28, 14, 18, '#60a040', 0.8, { status: { slow: { amt: 0.7, dur: 1.2 } } });
        R.Audio.play('whoosh', { pitch: 0.8 });
      },
      (e) => { // Blood roses: little turrets that shoot petals
        if (W().enemies.filter((x) => x.id === 'rose_turret' && !x.dead).length >= 4) return;
        for (let i = 0; i < 2; i++) { const a = U.rand(0, U.TAU), x = e.x + Math.cos(a) * 90, y = e.y + Math.sin(a) * 60; if (W().collides(x, y, 8)) continue; bfx('whirl', x, y, 16, '#ff80c0', '#60a040', 0.7); later(0.6, () => { if (e.dead) return; const t = W().spawnEnemy('rose_turret', x, y, e.level - 1); if (t) t.noLoot = true; }); }
        R.UI.toast('Blood roses bloom! Cut them down!', 'bad');
      },
      (e, p, ph) => { // Petal storm
        bfx('whirl', e.x, e.y - 20, 90, '#ff90e0', '#ffe0f0', 2);
        const n = 26 + ph * 6;
        for (let i = 0; i < n; i++) later(i * 0.06, () => { if (e.dead) return; e.shoot(i * 0.42 + W().time, { speed: 100, color: i % 2 ? '#ff90e0' : '#ffe0f0', size: 3, dmg: e.atk * 0.45 }); });
        e.mem.cast = n * 0.06;
      },
    ],
    move(e, dt, sm, p, d) { // a tree: roots itself, now and then sinks and re-emerges elsewhere
      const m = e.mem; m.root = (m.root == null ? 6 : m.root) - dt;
      if (m.root <= 0) {
        m.root = U.rand(6, 9);
        bfx('spikes', e.x, e.y, '#60a040', 22, 6);
        const a = U.rand(0, U.TAU); place(e, p.x + Math.cos(a) * 130, p.y + Math.sin(a) * 80);
        bfx('spikes', e.x, e.y, '#60a040', 30, 8); hit(e, e.x, e.y, 36, 1.2, { knock: 220 }); FX.shake(5, 0.3); R.Audio.play('explode', { pitch: 0.6 });
      }
      e.anim = 'idle';
      return true;
    },
  });

  // ---------------------------------------------------------------- Ulthuun, the Watcher Beyond: tracking gaze, eye storm, starfall, blinks
  set('watcher', {
    color: '#c040ff', keep: 110,
    moves: [K.spiral('#ff60ff'), K.ring('#c080ff', 18), K.blast('#ff40ff', { slow: { amt: 0.4, dur: 2 } }), K.fan('#ffffff', 9, null), K.summon('voidling', 2)],
    phaseText: { 2: 'I SEE YOU.', 4: 'CLOSE YOUR EYES. IT WILL NOT HELP.' },
    onPhase(e, ph) { if (ph === 3) R.UI.dialog([{ speaker: 'Ulthuun', text: 'SEE WHAT LIES BETWEEN THE STARS, LITTLE FLAME. SEE IT AND DESPAIR.' }]); },
    sig: [
      (e, p, ph) => { // The Gaze: a beam that slowly tracks you
        const q = nearestP(e); let a = U.angle(e.x, e.y, q.x, q.y) + (Math.random() < 0.5 ? 0.9 : -0.9);
        const memo = new Map(), steps = 50, turn = 0.9 + ph * 0.25;
        FX.lane(e.x, e.y - 30, a, 340, 8, '#ff60ff', 0.6);
        R.UI.toast('THE GAZE follows you! Keep running around it!', 'bad'); R.Audio.play('magic', { pitch: 0.3 });
        for (let i = 0; i < steps; i++) later(0.6 + i * 0.06, () => {
          if (e.dead) return;
          const t = nearestP(e), want = U.angle(e.x, e.y - 30, t.x, t.y - 10);
          a += U.clamp(U.angleDiff(want, a), -turn * 0.06, turn * 0.06);
          bfx('beam', e.x, e.y - 30, a, 340, 9, '#ff60ff', 0.08);
          lineHit(e, e.x, e.y - 22, a, 340, 11, 0.7, null, memo, 0.35);
        });
        e.mem.cast = 0.6 + steps * 0.06;
      },
      (e, p, ph) => { // Eye storm: little eyes that orbit and shoot
        if (W().enemies.filter((x) => x.id === 'eye_orb' && !x.dead).length >= 5) return;
        for (let i = 0; i < 2 + (ph >= 3 ? 1 : 0); i++) { const a = U.rand(0, U.TAU); const o = W().spawnEnemy('eye_orb', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 40, e.level - 2); if (o) { o.noLoot = true; FX.burst(o.x, o.y - 10, { n: 14, color: '#ff60ff', speed: 50, glow: true }); } }
      },
      (e, p, ph) => { // Starfall
        for (let i = 0; i < 6 + ph * 2; i++) later(i * 0.18, () => { if (e.dead) return; const q = U.choose(players()), x = q.x + U.rand(-100, 100), y = q.y + U.rand(-70, 70); bfx('meteor', x, y, 22, 1, '#e0c0ff'); later(1, () => { if (!e.dead) R.Combat.explode(x, y, 26, e.atk * 1.1, 'enemy', { color: '#c080ff', colors: ['#c080ff', '#ffffff'], shake: 2, source: e }); }); });
      },
    ],
    move(e, dt, sm, p, d) { // floats in lazy loops, blinks when you get close
      const m = e.mem; m.fl = (m.fl || 0) + dt; m.bl = (m.bl == null ? 5 : m.bl) - dt;
      if (d < 70 && m.bl <= 0) { m.bl = 4; FX.burst(e.x, e.y - 30, { n: 30, colors: ['#c040ff', '#ffffff'], speed: 80, glow: true }); const a = U.rand(0, U.TAU); place(e, p.x + Math.cos(a) * 160, p.y + Math.sin(a) * 100); FX.burst(e.x, e.y - 30, { n: 30, colors: ['#c040ff', '#ffffff'], speed: 80, glow: true }); R.Audio.play('portal', { pitch: 1.8 }); return true; }
      const cx = p.x + Math.cos(m.fl * 0.6) * 120, cy = p.y + Math.sin(m.fl * 1.2) * 60;
      e.moveToward(cx, cy, e.def.spd * sm, dt); e.anim = 'walk';
      return true;
    },
  });
})(window.RPG);
