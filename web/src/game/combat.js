'use strict';
// Stats, damage, status effects, hit detection and projectiles.
//
//   Combat.damage(target, amount, opts)  opts: {source, crit, angle, knock, element, status, noText, color, trueDmg}
//      status: {burn:{dps,dur}, poison:{dps,dur}, bleed:{dps,dur}, freeze:{dur}, slow:{amt,dur}, stun:{dur}, mark:{amt,dur}}
//   Combat.eachHostile(team, fn)            enemies of `team` that are alive
//   Combat.hitCircle(x, y, r, team, fn)     fn(target) for hostiles overlapping circle; returns count
//   Combat.hitArc(x, y, angle, arc, range, team, fn)
//   Combat.projectile(p)                    see Projectile in entities.js
//   Combat.roll(pl, mult, opts)             player damage roll -> {dmg, crit}
//   RPG.ProjectileKinds[kind] = { draw(ctx, p), trail?(p, dt), hit?(p, target), expire?(p) }
(function (R) {
  const U = R.U, FX = R.FX, G = R.G;
  const C = R.Combat = {};

  // ---- player stats ------------------------------------------------------------
  R.Stats = {
    gear(pl) {
      const g = {};
      for (const slot of R.SLOTS) {
        const id = pl.equip[slot];
        const it = id && R.Items[id];
        if (!it) continue;
        for (const k in it.stats) g[k] = (g[k] || 0) + it.stats[k];
      }
      // enchantments
      if (pl.ench && R.Crafting) for (const slot of R.SLOTS) {
        const en = pl.ench[slot], it = en && R.Items[pl.equip[slot]];
        if (!it) continue;
        const st = R.Crafting.stats(en, it);
        for (const k in st) g[k] = (g[k] || 0) + st[k];
      }
      // set bonuses
      if (R.ItemSets) {
        const counts = {};
        for (const slot of R.SLOTS) { const it = R.Items[pl.equip[slot]]; if (it && it.set) counts[it.set] = (counts[it.set] || 0) + 1; }
        for (const s in counts) {
          const set = R.ItemSets[s];
          if (!set) continue;
          for (const n in set.bonus) if (counts[s] >= +n) for (const k in set.bonus[n]) g[k] = (g[k] || 0) + set.bonus[n][k];
        }
      }
      return g;
    },
    compute(pl) {
      const cls = R.Classes[pl.cls];
      const g = R.Stats.gear(pl);
      const lv = pl.level;
      const a = {};
      const race = R.raceOf ? R.raceOf(pl) : null;
      const ra = (race && race.attrs) || {}, rb = (race && race.bonus) || {};
      for (const k of ['str', 'dex', 'int', 'vit']) a[k] = Math.max(0, (cls.attrs[k] || 0) + (pl.attrs[k] || 0) + (g[k] || 0) + (ra[k] || 0));
      const w = R.Items[pl.equip.weapon];
      const wt = w ? R.WeaponTypes[w.type] : null;
      const prim = a[cls.primary];
      const s = {
        attrs: a,
        maxHp: Math.round(cls.base.hp + cls.growth.hp * (lv - 1) + a.vit * 10 + a.str * 2 + (g.hp || 0)),
        maxMp: Math.round(cls.base.mp + cls.growth.mp * (lv - 1) + a.int * 6 + (g.mp || 0)),
        atk: Math.round(((w && w.dmg) || 3) + prim * 1.1 + lv * 0.8 + (g.atk || 0)),
        mag: Math.round((wt && wt.kind === 'magic' ? w.dmg : 0) + a.int * 1.4 + lv * 0.8 + (g.mag || 0)),
        def: Math.round(a.vit * 0.6 + (g.def || 0)),
        crit: Math.min(75, 5 + a.dex * 0.35 + (g.crit || 0) + (wt && wt.critBonus ? wt.critBonus * 100 : 0)),
        spd: Math.min(1.8, 1 + (g.spd || 0) + a.dex * 0.002),
        hpRegen: 0.4 + a.vit * 0.08 + (g.hpRegen || 0),
        mpRegen: 1 + a.int * 0.12 + (g.mpRegen || 0),
        lifesteal: (g.lifesteal || 0),
        dodge: Math.min(40, (g.dodge || 0) + a.dex * 0.1),
        critDmg: 1.75 + (g.critDmg || 0),
        cdr: Math.min(0.4, g.cdr || 0),
      };
      // racial (Bloodborn) bonuses
      s.maxHp += rb.hp || 0; s.maxMp += rb.mp || 0; s.def += rb.def || 0;
      s.crit = Math.min(75, s.crit + (rb.crit || 0)); s.spd = Math.min(1.8, s.spd + (rb.spd || 0));
      s.hpRegen += rb.hpRegen || 0; s.mpRegen += rb.mpRegen || 0; s.lifesteal += rb.lifesteal || 0;
      s.dodge = Math.min(40, s.dodge + (rb.dodge || 0)); s.critDmg += rb.critDmg || 0; s.cdr = Math.min(0.4, s.cdr + (rb.cdr || 0));
      // buffs
      if (pl.buffs) for (const b of pl.buffs) {
        if (b.stat in s) s[b.stat] = b.mult ? s[b.stat] * (1 + b.amt) : s[b.stat] + b.amt;
      }
      return s;
    },
  };

  C.roll = function (pl, mult, opts) {
    const s = pl.stats;
    const magic = opts && opts.magic;
    let base = (magic ? s.mag : s.atk) * (mult || 1);
    base *= U.rand(0.9, 1.1);
    let crit = Math.random() * 100 < s.crit + ((opts && opts.critBonus) || 0);
    if (crit) base *= s.critDmg;
    return { dmg: Math.max(1, Math.round(base)), crit };
  };

  // ---- damage -------------------------------------------------------------------
  C.damage = function (t, amount, o) {
    o = o || {};
    if (!t || t.dead || t.invuln > 0 || t.untargetable) return 0;
    if (t.netProxy) return R.Net.hitProxy(t, amount, o);   // co-op: the host's monster
    if (t.remote) return R.Net.hurtRemote(t, amount, o);   // co-op: another player
    const isPlayer = t === (R.World.localPlayer || R.World.player);
    if (isPlayer && t.stats && Math.random() * 100 < t.stats.dodge && !o.trueDmg) {
      FX.text(t.x, t.y - 26, 'MISS', '#c0c0c0');
      return 0;
    }
    let dmg = amount;
    if (!o.trueDmg) {
      const pierce = isPlayer && o.source && o.source.armorPierce ? 1 - o.source.armorPierce : 1; // bosses hit through armor
      const def = isPlayer ? t.stats.def * pierce : (t.armor || 0);
      dmg = amount * (isPlayer ? 60 / (60 + def) : 50 / (50 + def));
    }
    if (t.status && t.status.mark && !isPlayer) dmg *= 1 + t.status.mark.amt;
    if (t.shield > 0) {
      const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab;
      if (ab > 0 && (isPlayer || !o.noText)) FX.text(t.x, t.y - (isPlayer ? 30 : (t.height || 24) + 4), isPlayer ? 'BLOCK' : String(Math.round(ab)), '#80c0ff');
      if (!isPlayer && t.shield <= 0 && ab > 0) { FX.text(t.x, t.y - (t.height || 24) - 12, 'SHIELD BROKEN!', '#ffe070', { big: true }); FX.burst(t.x, t.y - (t.height || 24) / 2, { n: 30, colors: ['#a0e0ff', '#ffffff'], speed: 120, life: 0.6, glow: true }); R.Audio.play('crit'); }
      if (!isPlayer && dmg <= 0) { t.flash = 0.06; return 0; }
    }
    if (t.dmgTakenMult) dmg *= t.dmgTakenMult;
    dmg = Math.max(o.trueDmg ? 0 : 1, Math.round(dmg));
    t.hp -= dmg;
    t.flash = 0.12;
    t.lastHit = 0;
    // knockback
    if (o.knock && t.knockResist !== 1) {
      const a = o.angle != null ? o.angle : (o.source ? U.angle(o.source.x, o.source.y, t.x, t.y) : 0);
      const f = o.knock * (1 - (t.knockResist || 0));
      if (!(t.ironSkinT > 0)) { t.kx += Math.cos(a) * f; t.ky += Math.sin(a) * f; }
    }
    if (o.status) C.applyStatus(t, o.status);
    // feedback
    if (!o.noText) {
      const col = isPlayer ? '#ff5050' : o.crit ? '#ffd040' : (o.color || '#ffffff');
      FX.text(t.x, t.y - (t.height || 24), dmg + (o.crit ? '!' : ''), col, { crit: o.crit });
    }
    if (!isPlayer) {
      const bc = (t.def && t.def.blood) || (t.def && t.def.pal && t.def.pal.main) || '#c02030';
      FX.burst(t.x, t.y - 8, { n: o.crit ? 12 : 6, colors: [bc, U.shade(bc, -0.3), '#ffffff'], speed: 80, angle: o.angle, spread: 0.9, life: 0.4, size: [1, 2], grav: 200, vz: 60 });
      R.Audio.play(o.crit ? 'crit' : 'hit');
      if (o.crit) { FX.hitstop(0.05); FX.shake(2, 0.1); }
      // heavy hits and crits knock regular enemies out of their wind-up
      const heavy = o.crit || (o.knock || 0) >= (t.elite ? 260 : 150) || o.stagger;
      if (heavy && !t.boss && t.state === 'windup' && !(t.def && t.def.noStagger) && t.hp > dmg) {
        t.staggerT = 0.4; t.state = 'chase'; if (R.AI && R.AI.release) R.AI.release(t);
        t.atkCd = Math.max(t.atkCd || 0, 0.6);
        FX.text(t.x, t.y - (t.height || 24) - 8, 'STAGGER', '#ffe070');
      }
    } else {
      R.Audio.play('hurt');
      FX.shake(3, 0.15);
      FX.flash('#ff0000', 0.15);
      t.invuln = Math.max(t.invuln, 0.5);
      t.hurtT = 0.22;
    }
    if (o.source && o.source === R.World.player && R.World.player.stats.lifesteal > 0) {
      const heal = dmg * R.World.player.stats.lifesteal;
      R.World.player.hp = Math.min(R.World.player.stats.maxHp, R.World.player.hp + heal);
    }
    if (t.onDamaged) t.onDamaged(dmg, o);
    if (t.hp <= 0) { t.hp = 0; t.die(o.source); }
    return dmg;
  };

  C.heal = function (t, amt, silent) {
    if (!t || t.dead) return;
    const max = t.stats ? t.stats.maxHp : t.maxHp;
    const real = Math.min(max - t.hp, amt);
    t.hp += real;
    if (!silent && real > 0) FX.text(t.x, t.y - 28, '+' + Math.round(real), '#60ff80');
  };

  C.applyStatus = function (t, st) {
    if (t.netProxy) { R.Net.statusProxy(t, st); return; }
    if (t.remote) return;
    t.status = t.status || {};
    const rb = t === R.World.player && R.raceOf ? R.raceOf(t).bonus || {} : {};
    for (const k in st) {
      let s = st[k];
      if (!s) continue;
      if (t.immune && t.immune.includes(k)) continue;
      if (rb[k + 'Resist'] >= 1) continue; // immune (e.g. the Forged vs poison)
      if (rb[k + 'Resist'] && s.dps) s = Object.assign({}, s, { dps: s.dps * (1 - rb[k + 'Resist']) });
      else if (rb[k + 'Resist'] && s.dur) s = Object.assign({}, s, { dur: s.dur * (1 - rb[k + 'Resist']) });
      const cur = t.status[k];
      if (!cur || (s.dur || 0) > cur.t || (s.dps || 0) > (cur.dps || 0)) t.status[k] = { t: s.dur || 2, dps: s.dps || 0, amt: s.amt || 0, tick: 0, src: s.src };
    }
  };

  // Tick status effects; call once per frame per entity.
  const DOT_COL = { burn: '#ff8030', poison: '#80ff40', bleed: '#e02030' };
  C.tickStatus = function (t, dt) {
    const S = t.status;
    if (!S) return;
    for (const k in S) {
      const s = S[k];
      s.t -= dt;
      if (s.dps) {
        s.tick += dt;
        if (s.tick >= 0.5) {
          s.tick -= 0.5;
          C.damage(t, s.dps * 0.5, { trueDmg: true, color: DOT_COL[k] || '#fff', noText: false });
          if (t.dead) return;
        }
      }
      if (Math.random() < dt * 12) {
        if (k === 'burn') FX.particle({ x: t.x + U.rand(-5, 5), y: t.y - U.rand(4, 18), vy: -30, life: 0.4, color: U.choose(['#ff8030', '#ffd040']), glow: true });
        if (k === 'poison') FX.particle({ x: t.x + U.rand(-5, 5), y: t.y - U.rand(4, 18), vy: -15, life: 0.5, color: '#80ff40' });
        if (k === 'freeze') FX.particle({ x: t.x + U.rand(-6, 6), y: t.y - U.rand(4, 18), life: 0.5, color: '#c0f0ff', glow: true });
        if (k === 'stun' && Math.random() < 0.3) FX.particle({ x: t.x + U.rand(-5, 5), y: t.y - (t.height || 24) - 2, vx: U.rand(-20, 20), life: 0.4, color: '#ffff60', glow: true });
        if (k === 'bleed') FX.particle({ x: t.x + U.rand(-4, 4), y: t.y - U.rand(4, 14), vy: 20, life: 0.4, color: '#c02030' });
      }
      if (s.t <= 0) delete S[k];
    }
  };
  C.speedMult = function (t) {
    const S = t.status;
    if (!S) return 1;
    if (S.stun || S.freeze) return 0;
    let m = 1;
    if (S.slow) m *= 1 - S.slow.amt;
    if (S.chill) m *= 0.6;
    return m;
  };

  // ---- queries ------------------------------------------------------------------
  C.hostiles = function (team) {
    const W = R.World;
    if (team === 'player') return W.enemies;
    if (team === 'none') return []; // harmless visual projectiles (other players' shots)
    const me = W.localPlayer || W.player;
    const list = me && !me.dead ? [me] : [];
    if (R.Net && R.Net.authority) for (const p of R.Net.peers.values()) if (p.ent && !p.ent.remove && !p.ent.dead) list.push(p.ent);
    return list;
  };
  C.eachHostile = function (team, fn) { for (const e of C.hostiles(team).slice()) if (!e.dead && !e.untargetable) fn(e); };
  C.hitCircle = function (x, y, r, team, fn) {
    let n = 0;
    C.eachHostile(team, (e) => { if (U.dist(x, y, e.x, e.y - (e.height || 16) / 3) < r + (e.r || 6)) { fn(e); n++; } });
    return n;
  };
  C.hitArc = function (x, y, angle, arc, range, team, fn) {
    let n = 0;
    C.eachHostile(team, (e) => {
      const ex = e.x, ey = e.y - (e.height || 16) / 3;
      const d = U.dist(x, y, ex, ey);
      if (d > range + (e.r || 6)) return;
      if (d > (e.r || 6) + 4 && Math.abs(U.angleDiff(angle, U.angle(x, y, ex, ey))) > arc / 2 + Math.atan2(e.r || 6, d)) return;
      fn(e); n++;
    });
    return n;
  };
  C.nearestHostile = function (x, y, team, maxDist, exclude) {
    let best = null, bd = maxDist || 1e9;
    C.eachHostile(team, (e) => { if (exclude && exclude.includes(e)) return; const d = U.dist(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } });
    return best;
  };

  C.projectile = function (p) { const pr = new R.Projectile(p); R.World.add(pr); if (R.Net) R.Net.onProjectile(pr); return pr; };

  // Explosion helper (AOE damage + big effects)
  C.explode = function (x, y, radius, dmg, team, o) {
    o = o || {};
    const col = o.color || '#ff8030';
    FX.ring(x, y, 4, radius, col, 0.4, 5);
    FX.burst(x, y, { n: 30, colors: o.colors || [col, '#ffd040', '#ffffff'], speed: radius * 3, life: 0.5, size: [1, 3], glow: true });
    FX.burst(x, y, { n: 12, colors: ['#4a4040', '#6a6060'], speed: radius * 1.5, life: 0.8, size: [2, 3], up: 20 });
    FX.light(x, y, radius * 2.5, col, 0.35);
    FX.shake(o.shake || 4, 0.25);
    R.Audio.play(o.sound || 'explode');
    C.hitCircle(x, y, radius, team, (e) => C.damage(e, typeof dmg === 'function' ? dmg(e) : dmg, { source: o.source, crit: o.crit, knock: o.knock || 150, angle: U.angle(x, y, e.x, e.y), status: o.status, color: o.textColor }));
  };

  // ---- projectile looks --------------------------------------------------------------
  const PK = R.ProjectileKinds = {};
  function orb(ctx, p, r, col) {
    const g = G.glow(r * 3, col);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(g, Math.round(p.x - r * 3), Math.round(p.y - p.z - r * 3));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(p.x - r / 2), Math.round(p.y - p.z - r / 2), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)));
  }
  PK.arrow = {
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.angle);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-7, -0.5, 10, 1);
      ctx.fillStyle = p.color || '#d0d0d8'; ctx.fillRect(3, -1, 3, 2); ctx.fillRect(6, -0.5, 1, 1);
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-8, -1.5, 3, 1); ctx.fillRect(-8, 0.5, 3, 1);
      if (p.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(G.glow(6, p.glow), 0, -6); }
      ctx.restore();
    },
    trail(p) { if (p.glow && Math.random() < 0.6) FX.particle({ x: p.x, y: p.y - p.z, life: 0.25, color: p.glow, glow: true }); },
  };
  PK.bolt = {
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.angle);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-5, -1, 8, 2);
      ctx.fillStyle = p.color || '#b0b8c0'; ctx.fillRect(3, -1.5, 3, 3);
      ctx.restore();
    },
    trail(p) { if (Math.random() < 0.3) FX.particle({ x: p.x, y: p.y - p.z, life: 0.15, color: '#ffffff' }); },
  };
  PK.orb = {
    draw(ctx, p) { orb(ctx, p, p.size || 3, p.color || '#6fd8ff'); },
    trail(p) { FX.particle({ x: p.x + U.rand(-2, 2), y: p.y - p.z + U.rand(-2, 2), life: 0.3, color: p.color || '#6fd8ff', glow: true, size: 2 }); },
  };
  PK.bolt_magic = {
    draw(ctx, p) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(p.color || '#ff60c0', 0.9); ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.angle) * 8, p.y - p.z - Math.sin(p.angle) * 8); ctx.lineTo(p.x, p.y - p.z); ctx.stroke();
      ctx.restore(); orb(ctx, p, 2, p.color || '#ff60c0');
    },
  };
  PK.fireball = {
    draw(ctx, p) { orb(ctx, p, p.size || 4, '#ff7020'); ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - p.z - 1), 3, 3); },
    trail(p) {
      for (let i = 0; i < 2; i++) FX.particle({ x: p.x + U.rand(-3, 3), y: p.y - p.z + U.rand(-3, 3), vx: -p.vx * 0.1 + U.rand(-10, 10), vy: -p.vy * 0.1 - 10, life: 0.35, color: U.choose(['#ff7020', '#ffb040', '#ffe080']), glow: true, size: U.randi(1, 3) });
      FX.light(p.x, p.y, 50, '#ff8030', 0.05);
    },
  };
  PK.ice = {
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.angle);
      ctx.fillStyle = '#e0f8ff'; ctx.fillRect(-4, -1, 9, 2); ctx.fillStyle = '#80d0ff'; ctx.fillRect(-6, -2, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(3, -0.5, 3, 1);
      ctx.restore();
    },
    trail(p) { FX.particle({ x: p.x, y: p.y - p.z, life: 0.3, color: '#c0f0ff', glow: true }); },
  };
  PK.dagger = {
    draw(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.angle + (p.spin ? p.age * 25 : 0));
      ctx.fillStyle = '#d8dce0'; ctx.fillRect(-1, -1, 7, 2); ctx.fillStyle = '#3a2a20'; ctx.fillRect(-4, -1, 3, 2);
      ctx.restore();
    },
  };
  PK.enemy = {
    draw(ctx, p) { orb(ctx, p, p.size || 3, p.color || '#ff4060'); },
    trail(p) { if (Math.random() < 0.5) FX.particle({ x: p.x, y: p.y - p.z, life: 0.25, color: p.color || '#ff4060', glow: true }); },
  };
  PK.rock = {
    draw(ctx, p) { ctx.fillStyle = '#6a6060'; ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - p.z - 3), 6, 6); ctx.fillStyle = '#8a8080'; ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - p.z - 3), 3, 2); },
  };
  PK.web = {
    draw(ctx, p) { ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + p.age * 3; ctx.moveTo(p.x - Math.cos(a) * 4, p.y - p.z - Math.sin(a) * 4); ctx.lineTo(p.x + Math.cos(a) * 4, p.y - p.z + Math.sin(a) * 4); } ctx.stroke(); },
  };
  PK.none = { draw() {} };
})(window.RPG);
