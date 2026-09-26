'use strict';
// Difficulty levels and boss tiers.
//
// Difficulty (Settings): scales every enemy's health and damage, and rewards.
// Bosses:
//   - always scale up to at least your level, hit through half your armor, and are much tougher
//     than regular enemies (see bossBrain in data/content.js for their phases, shields and enrage);
//   - once beaten, a Challenge Sigil appears where they fell. Each rematch is one TIER higher:
//     more health, harder hits, faster attacks, more reinforcements, and bigger rewards. Tiers never stop.
(function (R) {
  const U = R.U, FX = R.FX, G = R.G;
  R.DIFFICULTIES = [
    { id: 'story', name: 'Story', desc: 'Relaxed: enemies have less health and hit softer.', hp: 0.65, dmg: 0.55, xp: 1, gold: 1 },
    { id: 'normal', name: 'Normal', desc: 'The intended challenge.', hp: 1, dmg: 1, xp: 1, gold: 1 },
    { id: 'hard', name: 'Hard', desc: 'Enemies are tougher and hit harder. +25% XP and gold.', hp: 1.45, dmg: 1.35, xp: 1.25, gold: 1.25 },
    { id: 'nightmare', name: 'Nightmare', desc: 'For veterans. +60% XP and gold.', hp: 2.1, dmg: 1.8, xp: 1.6, gold: 1.6 },
    { id: 'hell', name: 'Hell', desc: 'You will die. A lot. Double XP and gold.', hp: 3, dmg: 2.4, xp: 2, gold: 2 },
  ];
  const D = R.Difficulty = { pendingTier: null };
  D.cur = () => R.DIFFICULTIES.find((d) => d.id === (R.settings && R.settings.difficulty)) || R.DIFFICULTIES[1];

  // Boss tier bookkeeping (stored in world flags so it saves with your game).
  D.wins = (bossId) => { const W = R.World; const n = W.flags['bosswins:' + bossId] || 0; return n || (W.flags['boss:' + bossId] ? 1 : 0); };
  D.nextTier = (bossId) => D.wins(bossId) + 1;
  D.TIER = { hp: 1.55, dmg: 1.22, cadence: 0.92, levels: 2 };

  // Rough damage-per-second estimate for the player's current gear (before enemy armor).
  // Bosses use it so over-geared heroes still get a real fight.
  D.playerDps = function (p) {
    if (!p || !p.stats) return 0;
    const s = p.stats, wt = p.weaponType(), w = p.weapon(), eff = p.weaponEffect ? p.weaponEffect() : (w && w.effect) || {};
    const base = wt.kind === 'magic' ? s.mag : s.atk;
    const aps = (1 + (s.atkSpd || 0)) / (wt.cd || 0.5);
    const shots = (eff.multishot || 1) * (wt.pierce || eff.pierce ? 1.1 : 1);
    const critF = 1 + Math.min(0.9, s.crit / 100) * (s.critDmg - 1);
    const fx = (eff.explode ? 1.35 : 1) * (eff.shock || eff.element === 'lightning' ? 1.25 : 1) * (eff.burn || eff.poison ? 1.15 : 1) * (1 + (s.lifesteal || 0));
    return base * (wt.mult || 1) * aps * shots * critF * fx;
  };
  D.BOSS_SECONDS = 30; // boss health >= estimated DPS x this (x tier, x difficulty)

  // Called from the Enemy constructor.
  D.applyEnemy = function (e) {
    const d = D.cur(), def = e.def;
    e.xpMult = d.xp; e.goldMult = d.gold;
    if (!e.boss) {
      e.maxHp = e.hp = Math.round(e.maxHp * d.hp);
      e.atk *= d.dmg;
      return;
    }
    const tier = D.pendingTier || 1;
    D.pendingTier = null;
    const p = R.World && R.World.player;
    const lvl = Math.max(def.level || 1, p ? p.level : 1) + (tier - 1) * D.TIER.levels;
    const lf = lvl - (def.level || 1);
    e.tier = tier;
    e.level = lvl;
    const baseHp = def.hp * 1.8 * (1 + lf * 0.15);
    const gearHp = D.playerDps(p) * D.BOSS_SECONDS;
    e.gearScaled = gearHp > baseHp;
    e.maxHp = e.hp = Math.round(Math.max(baseHp, gearHp) * Math.pow(D.TIER.hp, tier - 1) * d.hp);
    e.atk = def.atk * 1.4 * (1 + lf * 0.1) * Math.pow(D.TIER.dmg, tier - 1) * d.dmg;
    e.cadence = Math.max(0.45, Math.pow(D.TIER.cadence, tier - 1) * (d.id === 'hell' ? 0.8 : d.id === 'nightmare' ? 0.88 : d.id === 'hard' ? 0.94 : 1));
    e.armorPierce = 0.5;
    e.armor = (def.def || 0) + (tier - 1) * 3;
    e.xpMult = d.xp * (1 + 0.5 * (tier - 1));
  };

  // ---------------------------------------------------------------- challenge sigil
  // Glowing rune circle left where a boss fell. Interact to fight it again, one tier higher.
  class BossSigil extends R.Entity {
    constructor(b) {
      super(b.x, b.y + 6);
      this.b = b; this.solid = false; this.r = 10; this.interactR = 30;
      this.def0 = R.Enemies[b.id];
      this.col = (this.def0.light && this.def0.light.color) || (this.def0.pal && (this.def0.pal.eye || this.def0.pal.main)) || '#ff4060';
      this.t = Math.random() * 10;
    }
    get sortY() { return this.y - 20; }
    update(dt) { this.t += dt; if (Math.random() < dt * 8) FX.particle({ x: this.x + U.rand(-14, 14), y: this.y - U.rand(0, 6), vy: -25, life: 0.8, color: this.col, glow: true }); }
    interactLabel() { return R.World.boss ? null : 'Challenge ' + this.def0.name + ' (Tier ' + D.nextTier(this.b.id) + ')'; }
    interact() {
      const W = R.World;
      if (W.boss) return;
      const tier = D.nextTier(this.b.id);
      this.remove = true;
      D.pendingTier = tier;
      const e = W.spawnEnemy(this.b.id, this.b.x, this.b.y, this.b.level);
      if (!e) return;
      e.bossFlag = this.b.flag; e.popIn = 0.6; e.invuln = 0.8;
      FX.pillar(this.x, this.y, this.col, 1.2, 30); FX.shake(6, 0.5); FX.flash(this.col, 0.4);
      R.UI.banner('TIER ' + tier, this.def0.name + ' returns, stronger than before');
      W.startBoss(e);
    }
    draw(ctx) {
      const t = this.t, x = Math.round(this.x), y = Math.round(this.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1;
      ctx.drawImage(G.glow(26, this.col), x - 26, y - 20);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = this.col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, U.TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, 12, 6, 0, 0, U.TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = t * 0.8 + i / 6 * U.TAU; ctx.fillStyle = i % 2 ? '#ffffff' : this.col; ctx.fillRect(Math.round(x + Math.cos(a) * 15), Math.round(y + Math.sin(a) * 7.5), 2, 2); }
      ctx.restore();
      // tier number floating above
      const img = G.pixelText('TIER ' + D.nextTier(this.b.id), this.col);
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 30 + Math.sin(t * 2) * 2));
    }
  }
  R.BossSigil = BossSigil;
})(window.RPG);
