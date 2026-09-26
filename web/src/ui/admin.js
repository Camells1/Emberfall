'use strict';
// Admin panel (F10, or Esc → Admin Panel). Anyone can use the tools. The secret code maxes out
// the current character: level 30, the best gear for your class (enchanted), every skill, every
// mount and pet, all bosses beaten, all quests done, every waypoint, and a mountain of gold.
(function (R) {
  const U = R.U, UI = R.UI, el = UI.el, S = UI.screens;
  const A = R.Admin = { god: false, oneHit: false, fast: false, MIN_LEVEL: 30 };
  // Admin settings belong to each saved game (kept in the world flags, so they save with it).
  const KEYS = ['god', 'oneHit', 'fast'];
  const loadState = () => { const f = (R.World.flags && R.World.flags.adminCheats) || {}; for (const k of KEYS) A[k] = !!f[k]; };
  const saveState = () => { if (!R.World.flags) return; const f = {}; for (const k of KEYS) if (A[k]) f[k] = 1; if (Object.keys(f).length) R.World.flags.adminCheats = f; else delete R.World.flags.adminCheats; };
  let lastFlags = null;
  R.events.on('enter', () => { if (R.World.flags !== lastFlags) { lastFlags = R.World.flags; loadState(); } });
  // The code itself is not in the game files: only its SHA-256 fingerprint is, and we compare
  // the fingerprint of what you type against it.
  const CODE_HASH = '9e112d54efe9d4c19917856a1b93680381c9dc9fd447d9f5c68a28791e594ca0';
  async function checkCode(s) {
    const txt = 'emberfall-admin:' + String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === CODE_HASH;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ cheats applied every frame
  R.events.on('tick', () => {
    const p = R.World.player; if (!p || p.dead) return;
    if (R.World.flags !== lastFlags) { lastFlags = R.World.flags; loadState(); p.recalc(); } // another save was loaded
    if (p.level < A.MIN_LEVEL && (A.god || A.oneHit || A.fast)) { A.god = A.oneHit = A.fast = false; saveState(); p.recalc(); }
    if (A.god) { p.invuln = Math.max(p.invuln, 0.2); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.stamina = p.maxStamina(); p.tired = false; }
  });
  const dmg = R.Combat.damage;
  R.Combat.damage = function (t, amount, o) { if (A.oneHit && t && t.team === 'enemy' && o && o.source === R.World.player) amount = Math.max(amount, (t.hp || 0) + (t.shield || 0) + 1) * 3; return dmg.call(this, t, amount, o); };
  const compute = R.Stats.compute;
  R.Stats.compute = function (pl) { const s = compute.call(this, pl); if (A.fast && pl === R.World.player) s.spd *= 2; return s; };

  // ------------------------------------------------------------------ unlock everything
  const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
  const BEST_ENCH = { weapon: 'flame', offhand: 'vitality', head: 'vitality', chest: 'power', legs: 'swiftness', feet: 'swiftness', hands: 'precision', cape: 'evasion', ring: 'vampiric', amulet: 'haste' };
  A.unlockAll = function () {
    const W = R.World, p = W.player, QL = R.QuestLog;
    // level 30 with all the points that come with it
    const gained = R.MAX_LEVEL - p.level;
    if (gained > 0) { p.level = R.MAX_LEVEL; p.xp = 0; p.attrPoints += gained * 3; p.skillPoints += gained; }
    const cls = R.Classes[p.cls];
    for (const k of ['str', 'dex', 'int', 'vit']) p.attrs[k] = (p.attrs[k] || 0) + (k === cls.primary ? 20 : 8);
    // best gear per slot for this class
    for (const slot of R.SLOTS) {
      let best = null, bs = -1;
      for (const it of Object.values(R.Items)) {
        if (it.slot !== slot || !p.canEquip(it)) continue;
        const sc = (it.level || 1) * 10 + RANK[it.rarity || 'common'] * 25 + (it.dmg || 0) * 0.5;
        if (sc > bs) { bs = sc; best = it; }
      }
      if (!best) continue;
      if (slot === 'offhand' && p.weapon() && R.WeaponTypes[p.weapon().type] && R.WeaponTypes[p.weapon().type].twoHanded) continue;
      if (p.equip[slot] && p.equip[slot] !== best.id) p.inv.push(p.ench[slot] ? { id: p.equip[slot], qty: 1, ench: p.ench[slot] } : { id: p.equip[slot], qty: 1 }); // old gear goes to the bag
      p.equip[slot] = best.id;
      const en = R.Crafting && R.Crafting.enchantsFor(best).includes(BEST_ENCH[slot]) ? BEST_ENCH[slot] : R.Crafting && R.Crafting.enchantsFor(best)[0];
      if (en) p.ench[slot] = { id: en, lv: 3 };
    }
    // two-handed weapon picked after the off-hand? drop the off-hand
    const w = p.weapon(); if (w && R.WeaponTypes[w.type] && R.WeaponTypes[w.type].twoHanded) { delete p.equip.offhand; delete p.ench.offhand; }
    // every skill, maxed
    if (R.SkillLearn) for (const s of Object.values(R.Skills)) if (s.learn && R.SkillLearn.canUse(p, s)) R.SkillLearn.learn(p, s.id, true);
    for (const id of cls.skills) p.skillLv[id] = R.Skills[id].maxLv;
    for (const id of p.learned || []) p.skillLv[id] = R.Skills[id].maxLv;
    // mounts and pets
    if (R.Companions) { for (const id of Object.keys(R.Companions.MOUNTS)) R.Companions.give(p, 'mount', id, true); for (const id of Object.keys(R.Companions.PETS)) R.Companions.give(p, 'pet', id, true); p.mount = p.mount || 'drake'; p.pet = p.pet || 'dragonling'; }
    // quests: all done
    for (const [id, q] of Object.entries(R.Quests)) { if (q.repeatable) continue; QL.state[id] = { status: 'done', progress: (q.objectives || []).map((o) => o.count || 1) }; }
    QL.tracked = null;
    // bosses beaten, waypoints found, every area visited
    for (const id of Object.keys(R.Maps)) {
      if (id === 'title_bg') continue;
      const M = W.buildMap(id);
      for (const b of M.bosses) { W.flags[b.flag] = 1; W.flags['bosswins:' + b.id] = Math.max(W.flags['bosswins:' + b.id] || 0, 1); }
      for (const wp of M.waypoints) W.waypoints[wp.id] = { map: id, name: wp.name };
      W.visited[id] = 1;
    }
    for (const q of Object.values(R.Quests)) if (q.flag) W.flags[q.flag] = 1;
    // riches
    p.gold += 1000000;
    const give = (id, n) => { if (R.Items[id]) p.addItem(id, n); };
    give('potion_mythic', 30); give('ether_mythic', 30); give('potion_super', 20); give('elixir_might', 10); give('elixir_speed', 10);
    if (R.Crafting) for (const it of Object.values(R.Items)) if (it.craftMat) give(it.id, 50);
    give('tome_xp', 3);
    p.recalc(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    R.Audio.play('levelup'); R.FX.pillar(p.x, p.y, '#ffd040', 1.6, 30);
    R.UI.banner('EVERYTHING UNLOCKED', 'Level 30 · best gear · every skill, mount and pet · all bosses and quests done');
    UI.drawFace && UI.drawFace();
    W.flags.adminUnlocked = 1;
  };

  // ------------------------------------------------------------------ the panel
  let bossPick = null;
  S.admin = {
    build(m) {
      const W = R.World, p = W.player;
      const body = UI.frame(m, '⚙ Admin Panel', 'admin-frame');
      // secret code
      const codeRow = el('div', 'adm-code', '<b>Secret code</b><small>unlocks everything for this character</small>', body);
      const ci = el('input', 'cc-name', null, codeRow); ci.placeholder = 'Enter code'; ci.maxLength = 24; ci.type = 'password';
      const tryCode = async () => {
        if (!(await checkCode(ci.value))) { UI.toast('Wrong code.', 'bad'); R.Audio.play('error'); ci.value = ''; return; }
        ci.value = '';
        UI.close(true);
        R.World.later(0.05, A.unlockAll);
      };
      ci.onkeydown = (e) => { if (e.code === 'Enter') tryCode(); if (e.code === 'Escape') ci.blur(); };
      UI.button(codeRow, 'Unlock', tryCode, 'primary');
      if (W.flags.adminUnlocked) el('div', 'hint', '✓ This character already used the code.', body);
      // the tools are for level 30 characters only
      if (p.level < A.MIN_LEVEL) {
        el('div', 'adm-locked', `🔒 <b>The admin tools unlock at level ${A.MIN_LEVEL}.</b><br>You are level ${p.level}. Keep adventuring!`, body);
        return;
      }
      // toggles
      el('div', 'sec-title', 'Cheats', body);
      const tg = el('div', 'adm-grid', null, body);
      const toggle = (label, key) => UI.button(tg, `${label}: <b>${A[key] ? 'ON' : 'off'}</b>`, () => { A[key] = !A[key]; saveState(); p.recalc(); UI.refresh(); }, A[key] ? 'sel' : '');
      toggle('God mode', 'god'); toggle('One-hit kills', 'oneHit'); toggle('Double speed', 'fast');
      UI.button(tg, 'Full heal', () => { p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.status = {}; R.Audio.play('heal'); });
      UI.button(tg, '+1 level', () => { if (p.level < R.MAX_LEVEL) p.gainXp(R.xpForLevel(p.level) - p.xp + 1); UI.refresh(); });
      UI.button(tg, '+10,000 gold', () => { p.gold += 10000; R.Audio.play('coin'); UI.refresh(); });
      UI.button(tg, 'Kill nearby enemies', () => { for (const e of W.enemies) if (!e.dead && !e.netProxy && U.dist(e.x, e.y, p.x, p.y) < 300) { e.hp = 0; e.die && e.die(); } });
      UI.button(tg, 'All crafting materials ×20', () => { for (const it of Object.values(R.Items)) if (it.craftMat) p.addItem(it.id, 20); R.Audio.play('pickup'); });
      UI.button(tg, 'All mounts & pets', () => { for (const id of Object.keys(R.Companions.MOUNTS)) R.Companions.give(p, 'mount', id, true); for (const id of Object.keys(R.Companions.PETS)) R.Companions.give(p, 'pet', id, true); UI.toast('Every mount and pet is in your stable (N).', 'good'); });
      // teleport
      el('div', 'sec-title', 'Teleport', body);
      const tp = el('div', 'adm-grid small', null, body);
      for (const [id, d] of Object.entries(R.Maps)) {
        if (id === 'title_bg') continue;
        UI.button(tp, U.esc(d.name), () => { UI.close(); W.transition(id, R.World.buildMap(id).points.start ? 'start' : Object.keys(R.World.buildMap(id).points)[0], true); }, 'small');
      }
      // bosses
      el('div', 'sec-title', 'Fight a boss', body);
      const bs = el('div', 'adm-grid small', null, body);
      for (const d of Object.values(R.Enemies)) if (d.boss) UI.button(bs, U.esc(d.name), () => {
        if (R.Net && R.Net.active() && !R.Net.authority) { UI.toast('Someone else runs this area — spawn bosses where you arrived first.', 'bad'); return; }
        UI.close();
        const e = W.spawnEnemy(d.id, p.x + 90, p.y, Math.max(d.level, p.level));
        if (e) { e.state = 'chase'; e.noLoot = false; }
      }, 'small');
      el('div', 'hint', 'F10 opens this panel. Admin settings are saved with this game only, and they only change your own game.', body);
    },
  };
  // F10 anywhere in play
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F10' || R.state !== 'play') return;
    e.preventDefault();
    if (UI.current === 'admin') UI.close(); else if (!UI.dialogOpen) UI.open('admin');
  });
  // a button in the pause menu
  const pb = S.pause.build;
  S.pause.build = function (m) {
    pb.call(this, m);
    const menu = m.querySelector('.title-menu');
    const quit = [...menu.querySelectorAll('button')].pop();
    const lvOk = R.World.player && R.World.player.level >= A.MIN_LEVEL;
    const b = UI.button(menu, `Admin Panel <small>${lvOk ? 'F10' : '🔒 level ' + A.MIN_LEVEL}</small>`, () => UI.open('admin', { back: 'pause' }));
    menu.insertBefore(b, quit);
  };
})(window.RPG);
