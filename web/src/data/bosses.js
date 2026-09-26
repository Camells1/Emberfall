'use strict';
// Bosses. Same shape as enemies (see data/enemies.js) plus:
//   boss: true, title: 'subtitle shown on the boss bar', music: 'boss',
//   phases: [hpFraction...] thresholds, update(e, dt, sm) custom brain,
//   intro?: lines shown when the fight starts
// Helpers available inside update: e.telegraph, e.shoot, e.hitPlayer, e.moveToward, e.moveAngle,
//   R.World.spawnEnemy(id, x, y, level), R.Combat.explode, R.FX.*
(function (R) {
  const U = R.U, FX = R.FX;

  // Example boss. More live in this file.
  R.addEnemy({
    id: 'slime_king', name: 'Gloopus', title: 'The Slime King', boss: true, level: 4,
    hp: 1100, atk: 17, def: 4, spd: 40, xp: 260, gold: [60, 90], r: 16, height: 30, scale: 2.2,
    sprite: 'slime', pal: { main: '#40c070', crown: '#ffd040', core: '#e04060' }, knockResist: 0.9, immune: ['stun'],
    drops: [{ item: 'potion', chance: 1, qty: [2, 3] }, { item: 'travel_cape', chance: 1 }],
    tags: ['slime', 'boss'],
    update(e, dt, sm) {
      const p = R.World.player;
      if (!p || p.dead) { e.anim = 'idle'; return; }
      R.World.combatT = 3;
      const m = e.mem;
      m.t = (m.t || 0) + dt;
      const phase2 = e.hp < e.maxHp * 0.6;
      e.face = p.x > e.x ? 1 : -1;
      m.cd = (m.cd == null ? 1.5 : m.cd) - dt * (1 / (e.cadence || 1));
      if (m.act === 'jump') {
        m.jt += dt;
        const T = 0.9;
        const k = Math.min(1, m.jt / T);
        e.x = U.lerp(m.sx, m.tx, k); e.y = U.lerp(m.sy, m.ty, k);
        e.z = Math.sin(k * Math.PI) * 60;
        e.anim = 'attack';
        if (k >= 1) {
          e.z = 0; m.act = null; m.cd = phase2 ? 0.55 : 1.0;
          R.Combat.explode(e.x, e.y, 44, e.atk * 1.6, 'enemy', { color: '#60e080', colors: ['#60e080', '#a0ffb0', '#ffffff'], shake: 6, source: e });
          if (phase2) for (let i = 0; i < 10; i++) e.shoot(i / 10 * U.TAU, { speed: 90, color: '#60e080', dmg: e.atk * 0.7 });
        }
        return;
      }
      if (m.cd <= 0) {
        const r = Math.random();
        if (r < 0.45) {
          // leap at the player, with a landing marker
          m.act = 'jump'; m.jt = 0; m.sx = e.x; m.sy = e.y; m.tx = p.x; m.ty = p.y;
          e.telegraph(p.x, p.y, 44, 0.9, () => {}, '#40ff80');
          R.Audio.play('bossRoar', { pitch: 1.6 });
        } else if (r < 0.75) {
          // spit a fan of goo
          const a = U.angle(e.x, e.y, p.x, p.y);
          const n = phase2 ? 7 : 5;
          for (let i = 0; i < n; i++) e.shoot(a + (i - (n - 1) / 2) * 0.22, { speed: 120, color: '#80ff60', size: 4, dmg: e.atk * 0.8, status: { slow: { amt: 0.4, dur: 1.5 } } });
          R.Audio.play('magic', { pitch: 0.5 });
          m.cd = phase2 ? 0.7 : 1.1;
        } else {
          // summon minions
          const n = phase2 ? 3 : 2;
          for (let i = 0; i < n; i++) R.World.spawnEnemy('slime', e.x + U.rand(-30, 30), e.y + U.rand(-20, 20), 3);
          FX.burst(e.x, e.y - 20, { n: 30, color: '#60e080', speed: 80, glow: true });
          m.cd = 1.6;
        }
      } else {
        e.moveToward(p.x, p.y, e.def.spd * sm * (phase2 ? 1.4 : 1), dt);
        e.anim = 'walk';
        if (U.dist(e.x, e.y, p.x, p.y) < e.r + 10) { m.touch = (m.touch || 0) - dt; if (m.touch <= 0) { e.hitPlayer(0.8); m.touch = 0.8; } }
      }
    },
  });
})(window.RPG);
