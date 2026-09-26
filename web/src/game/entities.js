'use strict';
// Entity classes: Player, Enemy, NPC, Projectile, Pickup, Chest.
// All positions are world pixels; (x, y) is the point on the ground under the entity's feet.
(function (R) {
  const U = R.U, FX = R.FX, G = R.G, Input = R.Input;

  class Entity {
    constructor(x, y) {
      this.x = x; this.y = y; this.z = 0;
      this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
      this.r = 5; this.height = 20;
      this.dead = false; this.remove = false;
      this.flash = 0; this.status = {}; this.team = 'neutral';
      this.solid = true; this.invuln = 0; this.shield = 0;
      this.anim = 'idle'; this.frame = 0; this.animT = 0;
    }
    get sortY() { return this.y; }
    update() {}
    draw() {}
    die() { this.dead = true; }
    shadow(ctx, w) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(Math.round(this.x), Math.round(this.y), w || this.r + 2, (w || this.r + 2) * 0.45, 0, 0, U.TAU); ctx.fill();
    }
  }
  R.Entity = Entity;

  const W = () => R.World;
  const DIRS = ['right', 'down', 'left', 'up'];
  function dirFromAngle(a) { const i = Math.round(a / (Math.PI / 2)); return DIRS[((i % 4) + 4) % 4]; }
  R.dirFromAngle = dirFromAngle;

  // ============================================================================
  // PLAYER
  // ============================================================================
  class Player extends Entity {
    constructor(d) {
      super(d.x || 0, d.y || 0);
      this.team = 'player';
      this.r = 5; this.height = 24;
      this.name = d.name || 'Hero';
      this.cls = d.cls || 'warrior';
      this.race = d.race && R.Races && R.Races[d.race] ? d.race : 'human';
      this.appearance = d.appearance || R.Character.defaultAppearance();
      this.level = d.level || 1;
      this.xp = d.xp || 0;
      this.attrs = d.attrs || { str: 0, dex: 0, int: 0, vit: 0 };
      this.attrPoints = d.attrPoints || 0;
      this.skillPoints = d.skillPoints || 0;
      this.skillLv = d.skillLv || {};
      this.learned = d.learned || []; // extra skills learned from trainers and quests
      this.mounts = d.mounts || []; this.pets = d.pets || []; this.mount = d.mount || null; this.pet = d.pet || null; this.riding = false;
      this.equip = d.equip || {};
      this.ench = d.ench || {}; // enchantments on equipped gear, by slot: {id, lv}
      this.inv = d.inv || [];
      this.gold = d.gold || 0;
      this.hotbar = d.hotbar || null; // skill ids by slot (null = class default order)
      this.kills = d.kills || 0;
      this.dir = 'down'; this.aim = Math.PI / 2;
      this.atkCd = 0; this.atkT = 0; this.atkDur = 0; this.combo = 0; this.comboT = 0; this.pendingHit = null;
      this.rollT = 0; this.rollCd = 0; this.rollDir = 0;
      this.castT = 0; this.castDur = 0;
      this.skillCd = {}; this.potionCd = 0;
      this.buffs = [];
      this.stamina = 100; this.staminaT = 0; this.tired = false;
      this.stepT = 0;
      this.ghosts = [];
      this.recalc();
      this.hp = d.hp != null ? Math.min(d.hp, this.stats.maxHp) : this.stats.maxHp;
      this.mp = d.mp != null ? Math.min(d.mp, this.stats.maxMp) : this.stats.maxMp;
      if (this.hp <= 0) this.hp = this.stats.maxHp;
    }

    get sortY() { return this.air ? this.y + 60 : this.y; }
    recalc() {
      this.stats = R.Stats.compute(this);
      if (this.hp > this.stats.maxHp) this.hp = this.stats.maxHp;
      if (this.mp > this.stats.maxMp) this.mp = this.stats.maxMp;
    }

    // Gear looks for the character renderer
    gear() {
      const L = (slot) => { const it = R.Items[this.equip[slot]]; return it ? it.look : undefined; };
      const off = R.Items[this.equip.offhand];
      return { head: L('head'), chest: L('chest'), legs: L('legs'), feet: L('feet'), hands: L('hands'), cape: L('cape'), offhand: off && off.slot === 'offhand' && !off.type ? off.look : undefined };
    }
    weapon() { return R.Items[this.equip.weapon]; }
    // the weapon's on-hit effects, plus its enchantment's
    weaponEffect() {
      const w = this.weapon(), en = this.ench && this.ench.weapon;
      if (!en || !R.Crafting) return (w && w.effect) || {};
      const e = Object.assign({}, (w && w.effect) || {}), x = R.Crafting.effect(en, w);
      for (const k in x) e[k] = typeof x[k] === 'number' && typeof e[k] === 'number' ? e[k] + x[k] : x[k];
      return e;
    }
    weaponType() { const w = this.weapon(); return w ? R.WeaponTypes[w.type] : { kind: 'melee', arc: 1.6, range: 18, dur: 0.2, cd: 0.35, mult: 0.6, knock: 40 }; }

    skills() {
      const cls = R.Classes[this.cls];
      return this.hotbar || cls.skills;
    }
    skillLevel(id) { return this.skillLv[id] || 0; }

    // ---- inventory helpers --------------------------------------------------------
    count(id) { let n = 0; for (const s of this.inv) if (s.id === id) n += s.qty; return n; }
    addItem(id, qty) {
      qty = qty || 1;
      const it = R.Items[id];
      if (!it) { console.warn('unknown item', id); return false; }
      if (it.stack) {
        const s = this.inv.find((x) => x.id === id);
        if (s) s.qty += qty; else this.inv.push({ id, qty });
      } else {
        for (let i = 0; i < qty; i++) this.inv.push({ id, qty: 1 });
      }
      R.events.emit('pickup', { item: id, qty });
      return true;
    }
    // Add an inventory entry as-is (keeps enchantments on gear).
    addEntry(e) {
      const it = e && R.Items[e.id];
      if (!it) return false;
      if (it.stack || !e.ench) return this.addItem(e.id, e.qty || 1);
      this.inv.push({ id: e.id, qty: 1, ench: { id: e.ench.id, lv: e.ench.lv } });
      R.events.emit('pickup', { item: e.id, qty: 1 });
      return true;
    }
    removeItem(id, qty) {
      qty = qty || 1;
      for (let i = this.inv.length - 1; i >= 0 && qty > 0; i--) {
        const s = this.inv[i];
        if (s.id !== id) continue;
        const take = Math.min(qty, s.qty);
        s.qty -= take; qty -= take;
        if (s.qty <= 0) this.inv.splice(i, 1);
      }
      return qty === 0;
    }
    canEquip(it) {
      if (!it || !R.SLOTS.includes(it.slot)) return false;
      if (it.slot === 'weapon') {
        const cls = R.Classes[this.cls];
        if (!cls.weapons.includes(it.type)) return false;
      }
      if (it.classes && !it.classes.includes(this.cls)) return false;
      // armor weight: light / medium / heavy, limited per class (see data/classes.js)
      const wgt = it.weight || (it.look && it.look.weight);
      if (wgt && !R.Classes[this.cls].armor.includes(wgt)) return false;
      if (it.slot === 'offhand') {
        const w = this.weapon();
        if (w && R.WeaponTypes[w.type] && R.WeaponTypes[w.type].twoHanded) return false;
      }
      return true;
    }
    equipReason(it) {
      if (!it) return '';
      if (it.level > this.level) return 'Requires level ' + it.level;
      if (!this.canEquip(it)) {
        if (it.slot === 'offhand') { const w = this.weapon(); if (w && R.WeaponTypes[w.type] && R.WeaponTypes[w.type].twoHanded) return 'Your weapon needs both hands'; }
        const wgt = it.weight || (it.look && it.look.weight);
        if (wgt && !R.Classes[this.cls].armor.includes(wgt)) return R.Classes[this.cls].name + 's cannot wear ' + wgt + ' armor';
        return R.Classes[this.cls].name + 's cannot use this';
      }
      return '';
    }
    equipItem(invIndex) {
      const s = this.inv[invIndex];
      if (!s) return false;
      const it = R.Items[s.id];
      if (this.equipReason(it)) { R.UI && R.UI.toast(this.equipReason(it), 'bad'); R.Audio.play('error'); return false; }
      const slot = it.slot;
      const prev = this.equip[slot], prevEnch = this.ench[slot];
      this.inv.splice(invIndex, 1);
      if (prev) this.inv.splice(invIndex, 0, prevEnch ? { id: prev, qty: 1, ench: prevEnch } : { id: prev, qty: 1 });
      this.equip[slot] = s.id;
      if (s.ench) this.ench[slot] = s.ench; else delete this.ench[slot];
      // two-handed weapon: drop the off-hand into the bag
      if (slot === 'weapon' && R.WeaponTypes[it.type] && R.WeaponTypes[it.type].twoHanded && this.equip.offhand) {
        this.inv.push(this.ench.offhand ? { id: this.equip.offhand, qty: 1, ench: this.ench.offhand } : { id: this.equip.offhand, qty: 1 });
        delete this.equip.offhand; delete this.ench.offhand;
      }
      this.recalc();
      R.Audio.play('equip');
      R.events.emit('equip', { item: s.id });
      return true;
    }
    unequip(slot) {
      const id = this.equip[slot];
      if (!id) return;
      if (slot === 'weapon') { R.UI && R.UI.toast('You need a weapon equipped', 'bad'); return; }
      delete this.equip[slot];
      this.inv.push(this.ench[slot] ? { id, qty: 1, ench: this.ench[slot] } : { id, qty: 1 });
      delete this.ench[slot];
      this.recalc();
      R.Audio.play('equip');
    }
    useItem(invIndex) {
      const s = this.inv[invIndex];
      if (!s) return;
      const it = R.Items[s.id];
      if (R.SLOTS.includes(it.slot)) return this.equipItem(invIndex);
      if (!it.use) return;
      const u = it.use;
      if (u.heal && this.hp >= this.stats.maxHp && !u.mana && !u.buff) { R.UI && R.UI.toast('Already at full health'); return; }
      if (u.mana && !u.heal && this.mp >= this.stats.maxMp && !u.buff) { R.UI && R.UI.toast('Mana is already full'); return; }
      if (u.heal) { R.Combat.heal(this, u.heal); FX.burst(this.x, this.y - 12, { n: 14, colors: ['#60ff80', '#c0ffd0'], speed: 30, life: 0.7, up: 30, glow: true }); }
      if (u.mana) { this.mp = Math.min(this.stats.maxMp, this.mp + u.mana); FX.text(this.x, this.y - 30, '+' + u.mana + ' MP', '#60a0ff'); FX.burst(this.x, this.y - 12, { n: 14, colors: ['#6080ff', '#c0d0ff'], speed: 30, life: 0.7, up: 30, glow: true }); }
      if (u.buff) { this.addBuff(u.buff.stat, u.buff.amt, u.buff.dur, u.buff.mult, it.name); }
      if (u.cure) { this.status = {}; }
      if (u.xp) this.gainXp(u.xp);
      if (u.teleport && R.World.teleportHome) R.World.teleportHome();
      R.Audio.play(u.heal || u.mana ? 'heal' : 'magic');
      this.removeItem(s.id, 1);
      R.events.emit('use', { item: s.id });
    }
    hasBuff(name) { return this.buffs.some((b) => b.name === name); }
    addBuff(stat, amt, dur, mult, name) {
      this.buffs = this.buffs.filter((b) => b.name !== name);
      this.buffs.push({ stat, amt, t: dur, mult, name });
      this.recalc();
    }
    quickPotion(kind) {
      if (this.potionCd > 0) return;
      // best potion of the kind that you own
      let best = -1, bestPow = -1;
      this.inv.forEach((s, i) => { const it = R.Items[s.id]; if (it && it.use && it.use[kind] && it.use[kind] > bestPow) { best = i; bestPow = it.use[kind]; } });
      if (best < 0) { R.UI && R.UI.toast(kind === 'heal' ? 'No health potions!' : 'No mana potions!', 'bad'); R.Audio.play('error'); return; }
      this.useItem(best);
      this.potionCd = R.World.boss ? 3 : 1; // no chain-chugging mid boss fight
    }

    // ---- progression -------------------------------------------------------------
    gainXp(n) {
      if (this.level >= R.MAX_LEVEL) return;
      const rb = R.raceOf ? R.raceOf(this).bonus || {} : {};
      if (rb.xp) n = Math.round(n * (1 + rb.xp));
      this.xp += n;
      FX.text(this.x, this.y - 34, '+' + n + ' XP', '#c080ff');
      while (this.level < R.MAX_LEVEL && this.xp >= R.xpForLevel(this.level)) {
        this.xp -= R.xpForLevel(this.level);
        this.levelUp();
      }
    }
    levelUp() {
      this.level++;
      this.attrPoints += 3;
      this.skillPoints += 1;
      this.recalc();
      this.hp = this.stats.maxHp; this.mp = this.stats.maxMp;
      R.Audio.play('levelup');
      FX.pillar(this.x, this.y, '#ffd040', 1.2, 18);
      FX.ring(this.x, this.y, 4, 60, '#ffd040', 0.8, 4);
      FX.burst(this.x, this.y - 10, { n: 40, colors: ['#ffd040', '#fff4a0', '#ffffff'], speed: 90, life: 1, up: 40, glow: true });
      FX.text(this.x, this.y - 40, 'LEVEL UP!', '#ffd040', { big: true, life: 1.6 });
      R.UI && R.UI.toast('Level ' + this.level + '! +3 attribute points, +1 skill point', 'good');
      // auto-learn newly unlocked skill slot at level 1
      const sk = R.Classes[this.cls].skills;
      R.SKILL_UNLOCK.forEach((lv, i) => { if (this.level >= lv && sk[i] && !this.skillLv[sk[i]]) { this.skillLv[sk[i]] = 1; R.UI && R.UI.toast('New skill: ' + R.Skills[sk[i]].name, 'good'); } });
      R.events.emit('levelup', { level: this.level });
    }

    // ---- update -------------------------------------------------------------------
    update(dt) {
      const W = R.World;
      this.animT += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.dead) { this.anim = 'dead'; this.deadT = (this.deadT || 0) + dt; return; }
      R.Combat.tickStatus(this, dt);
      if (this.dead) return;
      // buffs
      if (this.buffs.length) {
        let changed = false;
        for (const b of this.buffs) { b.t -= dt; if (b.t <= 0) changed = true; }
        if (changed) { this.buffs = this.buffs.filter((b) => b.t > 0); this.recalc(); }
      }
      // regen (slower in combat)
      const inCombat = W.combatT > 0;
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.hpRegen * dt * (inCombat ? 0.4 : 2.5));
      this.mp = Math.min(this.stats.maxMp, this.mp + this.stats.mpRegen * dt * (inCombat ? 1 : 2));
      // timers
      this.atkCd -= dt; this.rollCd -= dt; this.potionCd -= dt; this.comboT -= dt;
      if (this.dodgeBuf > 0) { this.dodgeBuf -= dt; if (Input.hit('dodge')) this.dodgeBuf = 0.2; }
      if (this.ironSkinT > 0) this.ironSkinT -= dt;
      for (const k in this.skillCd) this.skillCd[k] -= dt;
      if (this.castT > 0) this.castT -= dt;

      // aim
      const padAim = Input.padAim();
      if (padAim != null) this.aim = padAim;
      else if (!Input.usingPad) this.aim = U.angle(this.x, this.y - 10, Input.mouse.x, Input.mouse.y);
      else { const mv = Input.move(); if (mv.x || mv.y) this.aim = Math.atan2(mv.y, mv.x); }

      const locked = W.cutscene || R.UI.blocking();
      const mv = locked ? { x: 0, y: 0 } : Input.move();
      const sm = R.Combat.speedMult(this);

      // stamina: rolls, sprinting and heavy attacks spend it; it refills shortly after you stop
      const maxSt = this.maxStamina();
      this.staminaT -= dt;
      if (this.staminaT <= 0 && this.rollT <= 0) this.stamina = Math.min(maxSt, this.stamina + (this.tired ? 22 : 38) * dt);
      if (this.tired && this.stamina >= maxSt * 0.35) this.tired = false;
      const wantSprint = !locked && Input.held('sprint') && Math.hypot(mv.x, mv.y) > 0.1 && this.atkT <= 0 && this.castT <= 0 && !this.tired;
      this.sprinting = wantSprint && this.stamina > 0;
      if (this.sprinting) {
        this.stamina -= 24 * dt; this.staminaT = 0.6;
        if (this.stamina <= 0) { this.stamina = 0; this.tired = true; FX.text(this.x, this.y - 30, 'TIRED', '#ffe070'); R.UI && (R.UI.staminaFlash = 0.6); }
        if (Math.random() < dt * 14) FX.particle({ x: this.x + U.rand(-3, 3), y: this.y, vx: -mv.x * 30, vy: -mv.y * 30 - 5, life: 0.3, color: W.map.dustColor || '#c8b090', size: 2 });
      }

      if (this.rollT > 0) {
        this.rollT -= dt;
        if (this.rollT <= 0) this.squash(1.2, 0.82, 0.14); // land
        const sp = 230;
        W.moveEntity(this, Math.cos(this.rollDir) * sp * dt, Math.sin(this.rollDir) * sp * dt);
        if (Math.random() < 0.8) FX.particle({ x: this.x + U.rand(-3, 3), y: this.y, vx: U.rand(-15, 15), vy: U.rand(-10, 0), life: 0.35, color: W.map.dustColor || '#c8b090', size: 2 });
        if (this.ghostT <= 0 || this.ghostT == null) { this.ghosts.push({ x: this.x, y: this.y, t: 0.25, rot: (1 - this.rollT / 0.32) * U.TAU * (Math.cos(this.rollDir) < 0 ? -1 : 1) }); this.ghostT = 0.05; }
        this.ghostT -= dt;
        this.anim = 'roll'; this.frame = 0;
      } else {
        // attacking slows you down
        const wk = this.weaponType().kind;
        const atkSlow = this.atkT > 0 ? (wk === 'melee' || wk === 'thrust' ? 0.62 : 0.78) : this.castT > 0 ? 0.5 : 1;
        const road = W.onRoad && W.onRoad(this.x, this.y) ? 1.15 : 1; // roads and trails are quicker to travel
        const speed = 78 * this.stats.spd * sm * atkSlow * road * (this.sprinting ? 1.5 : 1);
        // accelerate quickly, stop even quicker (no ice-skating)
        const accel = (mv.x || mv.y) ? 20 : 28;
        this.vx = U.lerp(this.vx, mv.x * speed, Math.min(1, dt * accel));
        this.vy = U.lerp(this.vy, mv.y * speed, Math.min(1, dt * accel));
        if (!mv.x && Math.abs(this.vx) < 2) this.vx = 0;
        if (!mv.y && Math.abs(this.vy) < 2) this.vy = 0;
        W.moveEntity(this, this.vx * dt + this.kx * dt, this.vy * dt + this.ky * dt);
        this.kx *= Math.pow(0.001, dt); this.ky *= Math.pow(0.001, dt);
        const moving = Math.hypot(mv.x, mv.y) > 0.1;
        // facing: towards aim while fighting, else movement
        if (this.atkT > 0 || this.castT > 0 || (W.combatT > 0 && !Input.usingPad)) this.dir = dirFromAngle(this.aim);
        else if (moving) this.dir = dirFromAngle(Math.atan2(mv.y, mv.x));
        if (this.castT > 0) this.anim = 'cast';
        else if (this.atkT > 0) this.anim = 'attack';
        else this.anim = moving ? 'walk' : 'idle';
        if (moving) {
          this.stepT -= dt;
          if (this.stepT <= 0) { this.stepT = this.sprinting ? 0.19 : 0.28; R.Audio.play('step'); if (W.map.dustColor) FX.particle({ x: this.x, y: this.y, vy: -5, life: 0.3, color: W.map.dustColor, size: 1 }); }
        }
        if (!locked && sm > 0) {
          if (Input.hit('dodge')) this.dodgeBuf = 0.2;
          if (this.dodgeBuf > 0 && this.rollCd <= 0) { this.dodgeBuf = 0; if (this.spend(25)) this.roll(moving ? Math.atan2(mv.y, mv.x) : this.aim); }
          else if (Input.hit('heavy') && this.atkCd <= 0 && this.castT <= 0) { if (this.spend(25)) this.attack(true); }
          else if (Input.held('attack') && !R.UI.pointerOverUI) this.attack();
          for (let i = 0; i < 4; i++) if (Input.hit('skill' + (i + 1))) this.castSkill(i);
          if (Input.hit('potion')) this.quickPotion('heal');
          if (Input.hit('manapotion')) this.quickPotion('mana');
        }
      }
      // attack timeline
      if (this.atkT > 0) {
        this.atkT -= dt;
        if (this.pendingHit) {
          this.pendingHit.t -= dt;
          if (this.pendingHit.t <= 0) { const h = this.pendingHit; this.pendingHit = null; h.fn(); }
        }
      }
      const wen = this.ench && this.ench.weapon && R.Crafting && R.Crafting.ENCH[this.ench.weapon.id];
      if (wen && R.settings.fancy !== false && Math.random() < dt * (3 + this.ench.weapon.lv * 2)) { const h = this.handPos(); FX.particle({ x: h.x + U.rand(-4, 4), y: h.y - U.rand(0, 10), vy: -12, life: 0.5, color: wen.color, glow: true, size: 1 }); }
      for (const g of this.ghosts) g.t -= dt;
      this.ghosts = this.ghosts.filter((g) => g.t > 0);
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.squashT > 0) this.squashT -= dt;
      // animation frames
      if (this.anim === 'walk' && this.sprinting) this.anim = 'run';
      if (this.anim !== this.prevAnim) {
        // starting to move kicks up a little dust; stopping settles with a tiny squash
        if ((this.anim === 'walk' || this.anim === 'run') && this.prevAnim === 'idle' && W.map.dustColor) FX.burst(this.x, this.y, { n: 4, color: W.map.dustColor, speed: 18, life: 0.3, size: [1, 2] });
        if (this.prevAnim === 'run' && this.anim === 'idle') this.squash(1.1, 0.9, 0.1);
        this.prevAnim = this.anim;
      }
      const moveAnim = this.anim === 'walk' || this.anim === 'run';
      if (moveAnim) this.walkPhase = (this.walkPhase || 0) + dt * (this.anim === 'run' ? 14 : 10) * Math.max(0.6, Math.min(1.4, Math.hypot(this.vx, this.vy) / 78));
      if (this.anim === 'idle') this.frame = Math.floor(this.animT * 4) % 8;
      else if (moveAnim) this.frame = Math.floor(this.walkPhase) % 6;
      else if (this.anim === 'attack') { const k = 1 - this.atkT / this.atkDur; this.frame = k < 0.3 ? 0 : k < 0.7 ? 1 : 2; }
      else if (this.anim === 'cast') this.frame = this.castT > this.castDur * 0.5 ? 0 : 1;
      else this.frame = 0;
      // flinch when hit (doesn't interrupt attacks or rolls)
      if (this.hurtT > 0 && this.anim !== 'attack' && this.anim !== 'cast' && this.rollT <= 0) { this.anim = 'hurt'; this.frame = 0; }
    }

    // Brief squash & stretch (sx, sy scale factors) for game feel.
    squash(sx, sy, dur) { this.sqX = sx; this.sqY = sy; this.squashT = this.squashMax = dur || 0.12; }
    squashScale() {
      if (!(this.squashT > 0)) return [1, 1];
      const k = this.squashT / this.squashMax;
      return [1 + (this.sqX - 1) * k, 1 + (this.sqY - 1) * k];
    }

    maxStamina() { return 100 + ((this.stats && this.stats.stamina) || 0); }
    // Spend stamina; false (with feedback) if there isn't enough.
    spend(n) {
      if (this.stamina < n) {
        if (!this.tiredMsgT || this.tiredMsgT < W().time) { FX.text(this.x, this.y - 30, 'TIRED', '#ffe070'); R.Audio.play('error', { pitch: 1.4 }); this.tiredMsgT = W().time + 0.6; }
        if (R.UI) R.UI.staminaFlash = 0.6;
        return false;
      }
      this.stamina -= n; this.staminaT = 0.8;
      return true;
    }

    roll(angle) {
      this.rollT = 0.32; this.rollCd = 0.65; this.rollDir = angle;
      this.invuln = Math.max(this.invuln, 0.34);
      this.atkT = 0; this.pendingHit = null; this.castT = 0;
      R.Audio.play('dodge');
      this.ghostT = 0;
      R.events.emit('dodge', {});
    }

    handPos() {
      const h = R.Character.handOffset(this.dir, this.anim, this.frame, this.appearance);
      return { x: this.x + h.x, y: this.y + h.y };
    }

    attack(heavy) {
      if (this.atkCd > 0 || this.castT > 0) return;
      const w = this.weapon();
      const wt = this.weaponType();
      const spdMul = 1 + (this.stats.atkSpd || 0);
      const aim = this.aim;
      this.combo = heavy ? 2 : this.comboT > 0 ? (this.combo + 1) % 3 : 0;
      const finisher = this.combo === 2;
      const hv = heavy ? 1.7 : 1; // heavy attack: stronger, slower, costs stamina
      this.atkCd = wt.cd / spdMul * (finisher ? 1.25 : 1) * (heavy ? 1.35 : 1);
      if (heavy) { FX.shake(1.5, 0.1); FX.burst(this.x, this.y - 10, { n: 10, colors: ['#ffe070', '#ffb040'], speed: 50, life: 0.3, glow: true }); }
      this.atkDur = this.atkT = wt.dur / spdMul;
      this.comboT = this.atkCd + 0.4;
      this.atkAngle = aim;
      this.dir = dirFromAngle(aim);
      this.squash(heavy || finisher ? 1.12 : 1.06, heavy || finisher ? 0.9 : 0.95, 0.12);
      const eff = this.weaponEffect();
      const cx = this.x, cy = this.y - 10;
      const L = w && w.look;
      const trail = (L && (L.glow || L.gem)) || '#ffffff';
      if (wt.kind === 'melee' || wt.kind === 'thrust') {
        R.Audio.play('swing', { pitch: finisher ? 0.8 : 1 + this.combo * 0.08 });
        const thrust = wt.kind === 'thrust';
        const arc = (wt.arc || 2) * (finisher && !thrust ? 1.35 : 1);
        const range = (wt.range || 24) * (finisher ? 1.15 : 1);
        // lunge forward a little
        this.kx += Math.cos(aim) * (finisher ? 90 : 45); this.ky += Math.sin(aim) * (finisher ? 90 : 45);
        this.pendingHit = {
          t: this.atkDur * (thrust ? 0.3 : 0.35), fn: () => {
            if (thrust) {
              FX.add({ layer: 'top', life: 0.12, draw: (ctx, t) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = U.rgba(trail, 0.8 * (1 - t)); ctx.lineWidth = 3 * (1 - t) + 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aim) * 8, cy + Math.sin(aim) * 8); ctx.lineTo(cx + Math.cos(aim) * range, cy + Math.sin(aim) * range); ctx.stroke(); ctx.restore(); } });
            } else {
              FX.slash(cx, cy, aim, arc, range, trail, finisher ? 0.25 : 0.18, finisher ? 9 : 6);
            }
            let hits = 0;
            R.Combat.hitArc(cx, cy, aim, arc, range, 'player', (e) => {
              const r = R.Combat.roll(this, wt.mult * (finisher ? 1.5 : 1) * hv, { critBonus: (wt.critBonus || 0) * 100 });
              const st = {};
              if (eff.burn) st.burn = { dps: eff.burn, dur: 3 };
              if (eff.poison) st.poison = { dps: eff.poison, dur: 4 };
              if (eff.freeze && Math.random() < 0.25) st.freeze = { dur: 1 };
              if (eff.slow) st.slow = { amt: 0.4, dur: 2 };
              if (this.hasBuff('Venom Coat')) st.poison = { dps: this.venomDps || 6, dur: 4 };
              if (wt.bleed && Math.random() < wt.bleed) st.bleed = { dps: Math.max(2, r.dmg * 0.2), dur: 3 };
              if (wt.stun && Math.random() < wt.stun + (finisher ? 0.2 : 0)) st.stun = { dur: 0.7 };
              R.Combat.damage(e, r.dmg, { source: this, crit: r.crit, knock: wt.knock * (finisher ? 1.6 : 1) * hv, angle: U.angle(cx, cy, e.x, e.y), status: st });
              if (eff.shock) { const n = R.Combat.nearestHostile(e.x, e.y, 'player', 70, [e]); if (n) { FX.lightning(e.x, e.y - 8, n.x, n.y - 8, '#9fd8ff'); R.Combat.damage(n, r.dmg * 0.5, { source: this, color: '#9fd8ff' }); } }
              hits++;
            });
            if (hits) { FX.hitstop(finisher ? 0.07 : 0.035); if (finisher) FX.shake(2.5, 0.12); }
            if (finisher && (wt === R.WeaponTypes.hammer || wt === R.WeaponTypes.greatsword)) {
              FX.ring(cx + Math.cos(aim) * range * 0.7, this.y + Math.sin(aim) * range * 0.7, 3, 26, '#e0d0b0', 0.3, 3);
              FX.burst(cx + Math.cos(aim) * range * 0.7, this.y + Math.sin(aim) * range * 0.7, { n: 14, colors: ['#8a7a6a', '#b0a090'], speed: 60, life: 0.5, grav: 200, vz: 60 });
            }
          },
        };
      } else if (wt.kind === 'ranged') {
        R.Audio.play('arrow');
        const n = eff.multishot || 1;
        for (let i = 0; i < n; i++) {
          const a = aim + (n > 1 ? (i - (n - 1) / 2) * 0.15 : 0) + U.rand(-0.03, 0.03);
          const r = R.Combat.roll(this, wt.mult * hv);
          R.Combat.projectile({
            x: cx + Math.cos(a) * 8, y: this.y + Math.sin(a) * 8, z: 10, angle: a, speed: wt.speed, dmg: r.dmg, crit: r.crit, team: 'player', kind: wt.projectile,
            r: 3, life: wt.range / wt.speed, pierce: (wt.pierce || 0) + (eff.pierce || 0) + (heavy ? 2 : 0), knock: wt.knock, glow: L && L.glow, color: L && L.tip,
            status: eff.burn ? { burn: { dps: eff.burn, dur: 3 } } : eff.poison ? { poison: { dps: eff.poison, dur: 4 } } : eff.freeze ? { slow: { amt: 0.5, dur: 1.5 } } : null,
            explode: eff.explode,
          });
        }
      } else if (wt.kind === 'magic') {
        R.Audio.play('magic');
        const el = eff.element || 'arcane';
        const col = (L && L.gem) || '#6fd8ff';
        const r = R.Combat.roll(this, wt.mult * hv, { magic: true });
        const kind = el === 'fire' ? 'fireball' : el === 'ice' ? 'ice' : wt.projectile;
        R.Combat.projectile({
          x: cx + Math.cos(aim) * 12, y: this.y + Math.sin(aim) * 12, z: 12, angle: aim, speed: wt.speed, dmg: r.dmg, crit: r.crit, team: 'player', kind,
          r: 4, life: wt.range / wt.speed, color: col, knock: wt.knock, homing: eff.homing || 0,
          status: el === 'fire' ? { burn: { dps: Math.max(2, r.dmg * 0.15), dur: 3 } } : el === 'ice' ? { slow: { amt: 0.5, dur: 2 } } : el === 'poison' ? { poison: { dps: Math.max(2, r.dmg * 0.2), dur: 4 } } : null,
          chain: el === 'lightning' ? 2 : 0, explode: eff.explode || (heavy ? { r: 24, mult: 0.5 } : null), size: heavy ? 5 : undefined,
        });
        FX.burst(cx + Math.cos(aim) * 14, cy + Math.sin(aim) * 14 + 10 - 12, { n: 6, color: col, speed: 40, life: 0.25, glow: true });
      }
    }

    castSkill(slot) {
      const id = this.skills()[slot];
      const sk = id && R.Skills[id];
      if (!sk) return;
      const lv = this.skillLevel(id);
      if (this.level < R.SKILL_UNLOCK[slot]) { R.UI.toast('Skill slot ' + (slot + 1) + ' unlocks at level ' + R.SKILL_UNLOCK[slot], 'bad'); R.Audio.play('error'); return; }
      if (lv <= 0) { R.UI.toast('Skill not learned', 'bad'); R.Audio.play('error'); return; }
      if ((this.skillCd[id] || 0) > 0) return;
      if (this.castT > 0) return;
      const cost = typeof sk.mp === 'function' ? sk.mp(lv) : sk.mp;
      if (this.mp < cost) { R.UI.toast('Not enough mana', 'bad'); R.Audio.play('error'); FX.text(this.x, this.y - 30, 'NO MANA', '#6080ff'); return; }
      const aimPt = { x: Input.usingPad ? this.x + Math.cos(this.aim) * 80 : Input.mouse.x, y: Input.usingPad ? this.y + Math.sin(this.aim) * 80 : Input.mouse.y };
      const ok = sk.cast(this, this.aim, lv, aimPt);
      if (ok === false) return;
      this.mp -= cost;
      const cd = (typeof sk.cd === 'function' ? sk.cd(lv) : sk.cd) * (1 - (this.stats.cdr || 0));
      this.skillCd[id] = cd;
      this.skillCdMax = this.skillCdMax || {};
      this.skillCdMax[id] = cd;
      if (!sk.noCastAnim) { this.castDur = this.castT = sk.castTime || 0.3; this.dir = dirFromAngle(this.aim); }
      R.events.emit('skill', { id });
    }

    die() {
      if (this.dead) return;
      this.dead = true; this.deadT = 0;
      this.hp = 0;
      R.Audio.play('death');
      FX.shake(6, 0.4);
      FX.burst(this.x, this.y - 10, { n: 30, colors: ['#c02030', '#801020'], speed: 80, life: 0.8, grav: 200, vz: 80 });
      R.events.emit('playerDeath', {});
    }

    // ---- draw ---------------------------------------------------------------------
    draw(ctx) {
      const a = this.appearance, gear = this.gear();
      const W = this.weapon();
      const look = W && W.look;
      // afterimages
      for (const g of this.ghosts) {
        R.Character.draw(ctx, g.x, g.y, a, gear, this.dir, 'idle', 0, { alpha: g.t * 1.6, rot: g.rot, flash: '#80c0ff' });
      }
      this.shadow(ctx, 7);
      if (this.dead) {
        // topple over: flinch, then fall sideways with a little bounce
        const t = this.deadT || 0;
        const k = Math.min(1, t / 0.4);
        const fall = U.easeIn(k) * Math.PI / 2 - (k >= 1 ? Math.max(0, Math.sin((t - 0.4) * 18) * 0.12 * Math.max(0, 1 - (t - 0.4) * 3)) : 0);
        R.Character.draw(ctx, this.x, this.y + 4 * k, a, gear, this.facingSide || 'right', 'hurt', 0, { rot: fall * (this.facingSide === 'left' ? -1 : 1) });
        return;
      }
      this.facingSide = this.dir === 'left' ? 'left' : this.dir === 'right' ? 'right' : this.facingSide;
      const blink = this.invuln > 0 && this.rollT <= 0 && Math.floor(this.invuln * 20) % 2 === 0;
      const [sqx, sqy] = this.squashScale();
      const opts = { flash: this.flash > 0 ? '#ffffff' : null, alpha: blink ? 0.5 : null, sx: sqx, sy: sqy };
      if (this.rollT > 0) {
        const p = 1 - this.rollT / 0.32;
        opts.rot = p * U.TAU * (Math.cos(this.rollDir) < 0 ? -1 : 1);
        R.Character.draw(ctx, this.x, this.y - Math.sin(p * Math.PI) * 4, a, gear, this.dir, 'roll', 0, opts);
        return;
      }
      const behind = this.dir === 'up' || (this.dir === 'left' && !(this.atkT > 0));
      if (behind) this.drawWeapon(ctx, look);
      R.Character.draw(ctx, this.x, this.y, a, gear, this.dir, this.anim, this.frame, opts);
      if (!behind) this.drawWeapon(ctx, look);
      // shield bubble
      if (this.shield > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba('#ffe080', 0.5 + 0.2 * Math.sin(performance.now() / 100)); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(this.x, this.y - 12, 13, 16, 0, 0, U.TAU); ctx.stroke(); ctx.restore();
      }
    }

    drawWeapon(ctx, look) {
      if (!look) return;
      const wt = this.weaponType();
      const h = this.handPos();
      let ang, ox = 0, oy = 0;
      const t = this.atkT > 0 ? 1 - this.atkT / this.atkDur : -1;
      const facingLeft = Math.cos(this.aim) < 0;
      if (t >= 0 && (wt.kind === 'melee')) {
        const sign = this.combo % 2 === 0 ? 1 : -1;
        const arc = (wt.arc || 2) * (this.combo === 2 ? 1.35 : 1);
        const e = t < 0.25 ? -0.1 * (t / 0.25) : U.easeOut(Math.min(1, (t - 0.25) / 0.45));
        ang = this.atkAngle + sign * (-arc / 2 + arc * e) * (facingLeft ? -1 : 1) * (facingLeft ? -1 : 1);
        ox = Math.cos(ang) * 3; oy = Math.sin(ang) * 3;
      } else if (t >= 0 && wt.kind === 'thrust') {
        ang = this.atkAngle;
        const e = Math.sin(Math.min(1, t * 1.4) * Math.PI);
        ox = Math.cos(ang) * (e * 10 - 2); oy = Math.sin(ang) * (e * 10 - 2);
      } else if (wt.kind === 'ranged') {
        ang = this.aim;
        const pull = t >= 0 ? Math.sin(t * Math.PI) * -3 : 0;
        ox = Math.cos(ang) * (4 + pull); oy = Math.sin(ang) * (4 + pull);
      } else if (wt.kind === 'magic') {
        if (t >= 0) { ang = this.atkAngle; ox = Math.cos(ang) * (2 + Math.sin(t * Math.PI) * 5); oy = Math.sin(ang) * (2 + Math.sin(t * Math.PI) * 5); }
        else { ang = -Math.PI / 2 + (facingLeft ? -0.2 : 0.2); ox = facingLeft ? -2 : 2; oy = 8; }
        if (this.castT > 0) { ang = -Math.PI / 2; oy = 2; }
      } else {
        // resting pose: blade up and slightly outward
        ang = -Math.PI / 2 + (facingLeft ? -0.55 : 0.55) + Math.sin(this.animT * 2) * 0.03;
        if (this.anim === 'walk') ang += Math.sin(this.animT * 10) * 0.08;
        if (this.castT > 0) ang = -Math.PI / 2;
      }
      R.Weapons.draw(ctx, h.x + ox, h.y + oy, look, ang);
    }
  }
  R.Player = Player;

  // ============================================================================
  // ENEMY
  // ============================================================================
  class Enemy extends Entity {
    constructor(def, x, y, level) {
      super(x, y);
      this.def = def;
      this.id = def.id;
      this.team = 'enemy';
      this.level = level || def.level || 1;
      const sc = 1 + (this.level - (def.level || 1)) * 0.12;
      this.maxHp = this.hp = Math.round(def.hp * Math.max(0.5, sc));
      this.atk = def.atk * Math.max(0.5, 1 + (this.level - (def.level || 1)) * 0.09);
      this.armor = def.def || 0;
      this.spd = def.spd || 40;
      this.r = def.r || 6;
      this.height = def.height || 18;
      this.knockResist = def.knockResist || 0;
      this.immune = def.immune;
      this.boss = !!def.boss;
      if (R.Difficulty) R.Difficulty.applyEnemy(this); // difficulty, boss scaling and tiers
      this.home = { x, y };
      this.state = 'idle'; this.stateT = U.rand(0.5, 2);
      this.face = 1;
      this.atkCd = U.rand(0.5, 1.5);
      this.boss = !!def.boss;
      this.elite = !!def.elite;
      this.lastHit = 99;
      this.frameRate = def.frameRate || 8;
      this.popIn = 0; this.staggerT = 0; this.age = 0;
      this.mem = {}; // scratch space for AI / bosses
      if (def.init) def.init(this);
    }
    update(dt) {
      if (this.flash > 0) this.flash -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      this.lastHit += dt; this.age += dt;
      if (this.popIn > 0) this.popIn -= dt;
      if (this.dead) { this.deadT += dt; this.z = Math.max(0, this.z - dt * 60); if (this.deadT > 0.9) this.remove = true; return; }
      R.Combat.tickStatus(this, dt);
      if (this.dead) return;
      // knockback
      if (Math.abs(this.kx) + Math.abs(this.ky) > 1) {
        R.World.moveEntity(this, this.kx * dt, this.ky * dt);
        this.kx *= Math.pow(0.0005, dt); this.ky *= Math.pow(0.0005, dt);
      }
      const sm = R.Combat.speedMult(this);
      if (this.staggerT > 0) {
        // knocked off balance by a heavy hit: the attack it was winding up is lost
        this.staggerT -= dt; this.anim = 'idle';
        if (this.staggerT <= 0 && this.state !== 'idle' && this.state !== 'wander') this.state = 'chase';
      } else if (sm > 0) {
        const ai = (this.def.update) || R.AI[this.def.ai || 'melee'] || R.AI.melee;
        // co-op: the AI code thinks in terms of "the player"; point it at this monster's target
        const Wd = R.World, tgt = R.Net && R.Net.authority && R.Net.remoteCount() ? R.Net.pickTarget(this) : null, saved = Wd.player;
        if (tgt) Wd.player = tgt;
        try {
          if (!(R.AI.pre && R.AI.pre(this, dt, sm))) ai(this, dt, sm);
          if (R.AI.after) R.AI.after(this, dt, sm);
        } finally { Wd.player = saved; }
      } else this.anim = 'idle';
      this.animT += dt * (sm > 0 ? 1 : 0);
      const M = R.Monsters[this.def.sprite] || R.Monsters.slime;
      const n = (M.frames && M.frames[this.anim]) || 1;
      this.frame = Math.floor(this.animT * this.frameRate) % n;
    }
    // Move toward/away helpers used by AI
    moveToward(tx, ty, speed, dt) {
      const a = U.angle(this.x, this.y, tx, ty);
      const d = U.dist(this.x, this.y, tx, ty);
      const step = Math.min(d, speed * dt);
      R.World.moveEntity(this, Math.cos(a) * step, Math.sin(a) * step);
      if (Math.abs(Math.cos(a)) > 0.15) this.face = Math.cos(a) > 0 ? 1 : -1;
      return d;
    }
    moveAngle(a, speed, dt) {
      const moved = R.World.moveEntity(this, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
      if (Math.abs(Math.cos(a)) > 0.15) this.face = Math.cos(a) > 0 ? 1 : -1;
      return moved;
    }
    // Enemy damage to player (applies player defense)
    hitPlayer(mult, o, target) {
      const p = target || R.World.player;
      if (!p || p.dead) return 0;
      return R.Combat.damage(p, this.atk * (mult || 1) * U.rand(0.9, 1.1), Object.assign({ source: this, angle: U.angle(this.x, this.y, p.x, p.y), knock: 120 }, o || {}));
    }
    shoot(angle, o) {
      o = o || {};
      return R.Combat.projectile(Object.assign({ x: this.x + Math.cos(angle) * 6, y: this.y + Math.sin(angle) * 6, z: this.height * 0.5, angle, speed: 130, dmg: this.atk, team: 'enemy', kind: 'enemy', r: 3, life: 2.5, color: (this.def.pal && this.def.pal.shot) || '#ff4060', source: this }, o));
    }
    // Telegraphed area attack: red circle fills, then fn() fires.
    telegraph(x, y, radius, delay, fn, color) {
      const col = color || '#ff3030';
      FX.tele(x, y, radius, delay, col); // (a plain effect, so co-op partners see it too)
      R.World.later(delay, () => { if (!this.dead || this.boss) fn(); });
    }
    die(killer) {
      if (this.dead) return;
      this.dead = true; this.deadT = 0;
      if (R.AI && R.AI.release) R.AI.release(this);
      this.fallDir = this.kx > 0 ? 1 : this.kx < 0 ? -1 : -this.face;
      const W = R.World, p = W.player;
      R.Audio.play('enemyDie');
      const col = (this.def.pal && this.def.pal.main) || '#a0a0a0';
      FX.burst(this.x, this.y - this.height / 2, { n: this.boss ? 80 : 18, colors: [col, U.shade(col, 0.3), U.shade(col, -0.3), '#ffffff'], speed: this.boss ? 140 : 90, life: 0.7, size: [1, 3], grav: 250, vz: 90 });
      FX.ring(this.x, this.y, 2, this.r * 3, '#ffffff', 0.3, 2);
      const xp = Math.round((this.def.xp || 5) * (this.boss ? 1 : (1 + (this.level - (this.def.level || 1)) * 0.15)) * (this.elite ? 2 : 1) * (this.xpMult || 1));
      if (p && !p.dead) { p.gainXp(xp); p.kills++; }
      if (R.Net) R.Net.onEnemyDeath(this, xp); // co-op: everyone gets their own XP and loot
      W.dropLoot(this);
      if (this.def.onDeath) this.def.onDeath(this);
      R.events.emit('kill', { enemy: this.def.id, tags: this.def.tags || [], boss: this.boss, map: W.map.id, entity: this });
      if (this.boss) R.events.emit('boss:defeat', { id: this.def.id });
    }
    draw(ctx) {
      if (this.dead) {
        this.alpha = Math.max(0, 1 - Math.max(0, this.deadT - 0.35) / 0.55);
        if (this.alpha <= 0) return;
      }
      if (this.popIn > 0) {
        const k = 1 - this.popIn / 0.35;
        const w = (this.def.shadow || this.r + 2) * Math.max(0, k);
        if (w > 0.5) this.shadow(ctx, w);
      } else this.shadow(ctx, Math.max(2, (this.def.shadow || this.r + 2) * (1 - Math.min(0.5, this.z / 60))));
      if (this.def.draw) this.def.draw(ctx, this);
      else R.Monsters.draw(ctx, this);
      // boss damage shield
      if (this.shield > 0 && !this.dead) {
        const t = performance.now() / 1000, rr = this.r + 10;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba('#a0e0ff', 0.55 + Math.sin(t * 8) * 0.2); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(this.x, this.y - this.height * 0.45 - this.z, rr, rr * 1.1, 0, 0, U.TAU); ctx.stroke();
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#80c0ff'; ctx.fill();
        ctx.restore();
      }
      // status tint overlays
      if (this.status.freeze) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(G.glow(this.r * 2 + 6, '#80d0ff'), this.x - this.r * 2 - 6, this.y - this.height / 2 - this.r * 2 - 6); ctx.restore(); }
      if (this.status.mark) { ctx.fillStyle = '#ff3050'; ctx.fillRect(Math.round(this.x) - 1, Math.round(this.y - this.height - 10 - this.z), 3, 3); }
    }
    drawUI(ctx) {
      if (this.dead || this.boss) return;
      if (this.lastHit < 4 || this.elite) {
        const w = Math.max(14, this.r * 3), x = Math.round(this.x - w / 2), y = Math.round(this.y - this.height - 6 - this.z);
        ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
        ctx.fillStyle = '#5a1020'; ctx.fillRect(x, y, w, 2);
        ctx.fillStyle = this.elite ? '#ffb030' : '#e03040'; ctx.fillRect(x, y, Math.round(w * this.hp / this.maxHp), 2);
        if (this.elite) { const img = G.pixelText('ELITE', '#ffb030'); ctx.drawImage(img, Math.round(this.x - img.width / 2), y - 8); }
      }
    }
  }
  R.Enemy = Enemy;

  // ============================================================================
  // NPC
  // ============================================================================
  class NPC extends Entity {
    constructor(def, x, y) {
      super(x, y);
      this.def = def; this.id = def.id; this.team = 'npc';
      this.r = 6; this.height = 24;
      this.dir = def.dir || 'down';
      this.home = { x, y };
      this.wanderT = U.rand(1, 4);
      this.target = null;
      this.talkT = 0;
    }
    update(dt) {
      this.animT += dt;
      const p = R.World.player;
      const near = p && U.dist(p.x, p.y, this.x, this.y) < 40;
      if (this.talkT > 0) this.talkT -= dt;
      if (near && !this.def.static) {
        this.dir = R.dirFromAngle(U.angle(this.x, this.y, p.x, p.y));
        this.target = null; this.anim = 'idle';
      } else if (this.def.wander) {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = U.rand(2, 5);
          this.target = Math.random() < 0.6 ? { x: this.home.x + U.rand(-1, 1) * this.def.wander, y: this.home.y + U.rand(-1, 1) * this.def.wander } : null;
        }
        if (this.target) {
          const a = U.angle(this.x, this.y, this.target.x, this.target.y);
          const d = U.dist(this.x, this.y, this.target.x, this.target.y);
          if (d < 2) { this.target = null; this.anim = 'idle'; }
          else { const moved = R.World.moveEntity(this, Math.cos(a) * 25 * dt, Math.sin(a) * 25 * dt); this.dir = R.dirFromAngle(a); this.anim = 'walk'; if (!moved) this.target = null; }
        } else this.anim = 'idle';
      }
      this.frame = this.anim === 'walk' ? Math.floor(this.animT * 8) % 6 : Math.floor(this.animT * 3 + this.home.x) % 8;
      if (this.def.update) this.def.update(this, dt);
      if (R.Chatter) R.Chatter.update(this, dt, near);
    }
    draw(ctx) {
      this.shadow(ctx, 7);
      if (this.def.drawSprite) { this.def.drawSprite(ctx, this); return; }
      R.Character.draw(ctx, this.x, this.y, this.def.appearance, this.def.gear || {}, this.dir, this.anim, this.frame);
      if (this.def.weapon) {
        const h = R.Character.handOffset(this.dir, this.anim, this.frame, this.def.appearance);
        R.Weapons.draw(ctx, this.x + h.x, this.y + h.y, this.def.weapon, -Math.PI / 2 + (this.dir === 'left' ? -0.5 : 0.5) + Math.sin(this.animT * 1.5) * 0.04);
      }
    }
    drawUI(ctx) {
      const m = R.QuestLog ? R.QuestLog.markerFor(this.id) : null;
      const bob = Math.round(Math.sin(this.animT * 4) * 1.5);
      const y = this.y - 38 + bob;
      if (m) {
        const img = G.pixelText(m === 'ready' ? '?' : '!', m === 'ready' ? '#ffe040' : m === 'main' ? '#ffb020' : '#ffe040', 2);
        // '?' isn't in the font, so draw it by hand
        if (m === 'ready') {
          ctx.fillStyle = '#140c1c'; ctx.fillRect(this.x - 4, y - 1, 9, 13);
          ctx.fillStyle = '#ffe040';
          ctx.fillRect(this.x - 3, y, 7, 2); ctx.fillRect(this.x + 2, y, 2, 5); ctx.fillRect(this.x - 1, y + 4, 4, 2); ctx.fillRect(this.x - 1, y + 5, 2, 3); ctx.fillRect(this.x - 1, y + 9, 2, 2);
        } else ctx.drawImage(img, Math.round(this.x - img.width / 2), y);
      }
      const p = R.World.player;
      if (p && U.dist(p.x, p.y, this.x, this.y) < 60) {
        const img = G.pixelText(this.def.name, '#ffffff');
        ctx.globalAlpha = 0.85;
        ctx.drawImage(img, Math.round(this.x - img.width / 2), Math.round(this.y - 34 + (m ? -12 : 0)));
        ctx.globalAlpha = 1;
      }
    }
  }
  R.NPC = NPC;

  // ============================================================================
  // PROJECTILE
  // ============================================================================
  // p: {x,y,z,angle,speed,dmg,crit,team,kind,r,life,pierce,knock,status,color,glow,homing,chain,explode,
  //     onHit(p,target), onExpire(p), gravity(arc), size, source, noCollide}
  class Projectile extends Entity {
    constructor(p) {
      super(p.x, p.y);
      Object.assign(this, p);
      this.z = p.z || 8;
      this.solid = false;
      this.age = 0;
      this.life = p.life || 2;
      this.hitList = [];
      this.pierce = p.pierce || 0;
      this.vx = Math.cos(p.angle) * p.speed; this.vy = Math.sin(p.angle) * p.speed;
    }
    update(dt) {
      this.age += dt;
      if (this.age >= this.life) { this.expire(); return; }
      if (this.homing) {
        const t = R.Combat.nearestHostile(this.x, this.y, this.team, 140, this.hitList);
        if (t) {
          const want = U.angle(this.x, this.y, t.x, t.y - 8);
          this.angle += U.clamp(U.angleDiff(this.angle, want), -this.homing * dt, this.homing * dt);
          this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        }
      }
      if (this.accel) { this.speed += this.accel * dt; this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      const K = R.ProjectileKinds[this.kind];
      if (K && K.trail) K.trail(this, dt);
      if (this.update2) this.update2(this, dt);
      // walls
      if (!this.noCollide && R.World.solidAt(this.x, this.y, true)) { this.expire(true); return; }
      // hits
      const list = R.Combat.hostiles(this.team);
      const py = this.y - this.z * 0.3;
      for (const e of list) {
        if (e.dead || e.untargetable || (e.remote && this.team !== 'player') || this.hitList.includes(e)) continue; // other players judge their own hits (except PvP shots)
        let hit;
        if (this.team === 'player') {
          // enemies are hit anywhere along their body (a vertical capsule from feet to head),
          // so shots at a tall boss's legs or head land too
          const top = e.y - (e.height || 16) * 0.9 - (e.z || 0), bot = e.y - 2 - (e.z || 0);
          const cy = py < top ? top : py > bot ? bot : py;
          hit = U.dist(this.x, py, e.x, cy) < this.r + (e.r || 6) + 2;
        } else hit = U.dist(this.x, py, e.x, e.y - (e.height || 16) / 2) < this.r + (e.r || 6) + 2;
        if (hit) {
          this.hitList.push(e);
          this.hit(e);
          if (this.remove) return;
          if (this.pierce-- <= 0) { this.remove = true; this.expire(); return; }
        }
      }
    }
    hit(e) {
      if (this.onHit && this.onHit(this, e) === false) return;
      if (this.dmg) R.Combat.damage(e, this.dmg, { source: this.source || (this.team === 'player' ? R.World.player : null), crit: this.crit, knock: this.knock || 60, angle: this.angle, status: this.status, color: this.textColor });
      FX.burst(this.x, this.y - this.z, { n: 6, color: this.color || '#ffffff', speed: 50, life: 0.25, glow: true });
      if (this.chain > 0) {
        const n = R.Combat.nearestHostile(e.x, e.y, this.team, 90, this.hitList);
        if (n) {
          FX.lightning(e.x, e.y - 8, n.x, n.y - 8, this.color || '#9fd8ff');
          R.Audio.play('zap');
          this.hitList.push(n);
          R.Combat.damage(n, this.dmg * 0.7, { source: this.source, color: '#9fd8ff' });
        }
      }
    }
    expire(wall) {
      if (this.expired) return;
      this.expired = true;
      this.remove = true;
      if (this.explode) R.Combat.explode(this.x, this.y, this.explode.r || 30, (this.explode.mult || 0.7) * this.dmg, this.team, { color: this.explode.color || this.color || '#ff8030', source: this.source });
      else if (wall) FX.burst(this.x, this.y - this.z, { n: 4, color: '#c0c0c0', speed: 30, life: 0.2 });
      if (this.onExpire) this.onExpire(this);
    }
    draw(ctx) {
      if (this.z > 2 && !this.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(Math.round(this.x - 2), Math.round(this.y), 4, 2); }
      const K = R.ProjectileKinds[this.kind] || R.ProjectileKinds.orb;
      K.draw(ctx, this);
    }
  }
  R.Projectile = Projectile;

  // ============================================================================
  // PICKUP (loot on the ground)
  // ============================================================================
  class Pickup extends Entity {
    constructor(x, y, o) {
      super(x, y);
      this.item = o.item; this.qty = o.qty || 1; this.gold = o.gold || 0; this.ench = o.ench || null;
      this.solid = false;
      const a = U.rand(0, U.TAU), s = U.rand(20, 60);
      this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s * 0.6; this.vz = U.rand(70, 110); this.z = 4;
      this.age = 0;
      this.r = 4;
    }
    update(dt) {
      this.age += dt;
      if (this.z > 0 || this.vz > 0) {
        this.vz -= 320 * dt; this.z += this.vz * dt;
        R.World.moveEntity(this, this.vx * dt, this.vy * dt);
        if (this.z <= 0) { this.z = 0; if (Math.abs(this.vz) > 40) this.vz = -this.vz * 0.35; else this.vz = 0; this.vx *= 0.5; this.vy *= 0.5; }
      }
      const p = R.World.player;
      if (!p || p.dead || this.age < 0.45) return;
      const d = U.dist(p.x, p.y - 6, this.x, this.y);
      if (d < 36) { const a = U.angle(this.x, this.y, p.x, p.y - 6); const sp = 220 * (1 - d / 40) + 60; this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt; }
      if (d < 7) this.collect(p);
    }
    collect(p) {
      if (this.netUid) { if (R.Net) R.Net.claimDrop(this); return; } // co-op drop: first come, first served
      this.remove = true;
      if (this.gold) {
        p.gold += this.gold; R.Audio.play('coin');
        FX.text(this.x, this.y - 12, '+' + this.gold + 'G', '#ffd040');
        R.events.emit('gold', { amount: this.gold });
      } else {
        const it = R.Items[this.item];
        p.addEntry({ id: this.item, qty: this.qty, ench: this.ench });
        R.Audio.play('pickup');
        const col = G.RARITY[it.rarity] ? G.RARITY[it.rarity].color : '#fff';
        R.UI && R.UI.lootToast(it, this.qty);
        FX.burst(this.x, this.y - 6, { n: 8, color: col, speed: 40, life: 0.3, glow: true });
      }
    }
    draw(ctx) {
      const bob = this.z <= 0 ? Math.sin(this.age * 4) * 1.5 + 1.5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(this.x - 3), Math.round(this.y - 1), 7, 2);
      if (this.gold) {
        const n = Math.min(4, 1 + Math.floor(this.gold / 25));
        for (let i = 0; i < n; i++) {
          const x = Math.round(this.x - 2 + (i % 2) * 3 - 1), y = Math.round(this.y - this.z - 4 - bob - Math.floor(i / 2) * 2);
          ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 1, y - 1, 6, 5);
          ctx.fillStyle = '#e0a020'; ctx.fillRect(x, y, 4, 3); ctx.fillStyle = '#fff080'; ctx.fillRect(x, y, 2, 1);
        }
        return;
      }
      const it = R.Items[this.item];
      if (!it) return;
      const icon = R.Icons.item(it);
      const rar = G.RARITY[it.rarity] || G.RARITY.common;
      if (it.rarity !== 'common' && R.settings.fancy !== false) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(this.age * 5) * 0.2;
        ctx.drawImage(G.glow(12, rar.color), Math.round(this.x - 12), Math.round(this.y - this.z - 18 - bob));
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (['epic', 'legendary', 'mythic'].includes(it.rarity)) {
          const g = ctx.createLinearGradient(0, this.y - 60, 0, this.y);
          g.addColorStop(0, U.rgba(rar.color, 0)); g.addColorStop(1, U.rgba(rar.color, 0.35));
          ctx.fillStyle = g; ctx.fillRect(Math.round(this.x - 2), Math.round(this.y - 60), 4, 60);
        }
      }
      ctx.drawImage(icon, Math.round(this.x - icon.width / 2), Math.round(this.y - this.z - icon.height - bob));
    }
  }
  R.Pickup = Pickup;

  // ============================================================================
  // CHEST
  // ============================================================================
  class Chest extends Entity {
    constructor(o) {
      super(o.x, o.y);
      this.cid = o.id; this.loot = o.loot || []; this.gold = o.gold || 0; this.tier = o.tier || 'wood';
      this.opened = !!(R.World.flags['chest:' + o.id]);
      this.r = 7; this.openT = this.opened ? 1 : 0;
      this.box = [-7, -6, 14, 6];
    }
    interactLabel() { return this.opened ? null : 'Open'; }
    interact() {
      if (this.opened) return;
      this.opened = true;
      R.World.flags['chest:' + this.cid] = 1;
      R.Audio.play('chest');
      FX.burst(this.x, this.y - 8, { n: 25, colors: ['#ffd040', '#fff4a0', '#ffffff'], speed: 70, life: 0.8, up: 20, glow: true });
      FX.light(this.x, this.y - 6, 70, '#ffd040', 0.6);
      for (const l of this.loot) { const id = typeof l === 'string' ? l : l.item; const qty = l.qty || 1; R.World.add(new Pickup(this.x, this.y - 4, { item: id, qty })); }
      if (this.gold) R.World.add(new Pickup(this.x, this.y - 4, { gold: this.gold }));
      R.events.emit('chest', { id: this.cid });
    }
    update(dt) { if (this.opened && this.openT < 1) this.openT = Math.min(1, this.openT + dt * 5); }
    draw(ctx) {
      const tier = this.tier;
      const key = 'chest|' + tier + '|' + (this.openT >= 1 ? 1 : 0);
      const spr = G.sprite(key, 20, 18, (c) => {
        const P = G.painter(c);
        const wood = tier === 'gold' ? '#8a3a8a' : tier === 'iron' ? '#5a5a6a' : '#8a5a30', band = tier === 'gold' ? '#ffd040' : tier === 'iron' ? '#a0a0b0' : '#6a6a6a';
        P.rect(2, 8, 16, 9, wood); P.rect(2, 8, 16, 1, U.shade(wood, 0.25)); P.rect(2, 16, 16, 1, U.shade(wood, -0.35));
        P.rect(4, 8, 2, 9, band); P.rect(14, 8, 2, 9, band);
        if (this.openT >= 1) { P.rect(2, 3, 16, 5, U.shade(wood, -0.4)); P.rect(3, 8, 14, 2, '#140c1c'); P.rect(2, 1, 16, 3, wood); P.rect(4, 1, 2, 3, band); P.rect(14, 1, 2, 3, band); }
        else { P.rect(2, 4, 16, 5, wood); P.rect(2, 4, 16, 1, U.shade(wood, 0.3)); P.rect(4, 4, 2, 5, band); P.rect(14, 4, 2, 5, band); P.rect(9, 7, 2, 3, '#ffd040'); }
      }, { outline: true });
      ctx.drawImage(spr, Math.round(this.x - 10), Math.round(this.y - 17));
      if (!this.opened && R.settings.fancy !== false) {
        const t = performance.now() / 300;
        if (Math.sin(t * 1.7) > 0.95) FX.particle({ x: this.x + U.rand(-6, 6), y: this.y - U.rand(6, 14), life: 0.5, color: '#fff4a0', glow: true });
      }
    }
  }
  R.Chest = Chest;
})(window.RPG);
