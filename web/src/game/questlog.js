'use strict';
// Quest engine.
//
// Quest definition (data/quests.js):
// { id, name, type:'main'|'side', giver: npcId, turnIn?: npcId (defaults to giver), level?: recommended,
//   requires?: [questIds], minLevel?, desc,
//   objectives: [
//     {type:'kill', target: enemyId | [ids], tag?: 'undead', count, text?, map?}
//     {type:'collect', item, count, consume?: true (removed on turn-in), text?}
//     {type:'talk', npc, text?, lines?: [dialogue lines shown when you talk to them]}
//     {type:'reach', zone: zoneName | map: mapId, text?}
//     {type:'boss', target: enemyId, text?}
//     {type:'flag', flag, text?}      (set with R.QuestLog.setFlag(name))
//     {type:'use', item, text?}       (consume an item)
//   ],
//   rewards: {xp, gold, items:[ids], choice?:[ids] (pick one)},
//   dialog: { offer:[lines], accept?: line, decline?: line, progress?:[lines], complete:[lines] },
//   onStart?(), onComplete?(), auto?: true (starts automatically when requirements are met, no giver) }
// A dialogue "line" is a string or {speaker, text}.
(function (R) {
  const U = R.U;
  const QL = R.QuestLog = { state: {}, tracked: null, cooldowns: {}, repeats: {} };
  R.Quests = R.Quests || {};
  // repeatable: true quests (bounties) go back on the board `cooldown` seconds of play after you turn them in.

  QL.reset = function () { QL.state = {}; QL.tracked = null; QL.cooldowns = {}; QL.repeats = {}; };

  QL.status = function (id) {
    const q = R.Quests[id];
    if (!q) return 'locked';
    const s = QL.state[id];
    if (s) return s.status;
    if (q.repeatable && (QL.cooldowns[id] || 0) > (R.playtime || 0)) return 'locked';
    if (q.requires && !q.requires.every((r) => QL.state[r] && QL.state[r].status === 'done')) return 'locked';
    if (q.requiresFlag && !R.World.flags[q.requiresFlag]) return 'locked';
    return 'available';
  };
  QL.isDone = (id) => QL.state[id] && QL.state[id].status === 'done';
  QL.isActive = (id) => QL.state[id] && (QL.state[id].status === 'active' || QL.state[id].status === 'ready');
  QL.levelOk = (id) => { const q = R.Quests[id]; return !q.minLevel || R.World.player.level >= q.minLevel; };

  QL.start = function (id, silent) {
    const q = R.Quests[id];
    if (!q || QL.state[id]) return;
    QL.state[id] = { status: 'active', prog: q.objectives.map(() => 0) };
    if (!QL.tracked || q.type === 'main') QL.tracked = id;
    if (q.onStart) q.onStart();
    QL.recount(id);
    if (!silent) {
      R.Audio.play('quest');
      R.UI.banner(q.type === 'main' ? 'MAIN QUEST' : 'NEW QUEST', q.name);
    }
    R.events.emit('quest:start', { quest: id });
    QL.check(id);
  };

  QL.objText = function (q, o, i, prog) {
    const n = prog != null ? prog : 0;
    let base = o.text;
    if (!base) {
      if (o.type === 'kill') { const t = Array.isArray(o.target) ? o.target[0] : o.target; base = 'Defeat ' + (o.tag ? o.tag : (R.Enemies[t] ? R.Enemies[t].name + (o.count > 1 ? 's' : '') : t)); }
      else if (o.type === 'collect') base = 'Collect ' + (R.Items[o.item] ? R.Items[o.item].name : o.item);
      else if (o.type === 'talk') base = 'Speak with ' + (R.NPCs[o.npc] ? R.NPCs[o.npc].name : o.npc);
      else if (o.type === 'reach') base = 'Travel to ' + (o.map && R.Maps[o.map] ? R.Maps[o.map].name : o.zone);
      else if (o.type === 'boss') base = 'Defeat ' + (R.Enemies[o.target] ? R.Enemies[o.target].name : o.target);
      else if (o.type === 'use') base = 'Use ' + (R.Items[o.item] ? R.Items[o.item].name : o.item);
      else base = o.type;
    }
    const need = o.count || 1;
    return need > 1 ? `${base} (${Math.min(n, need)}/${need})` : base;
  };

  QL.objDone = function (q, i) { const s = QL.state[q.id]; return s && s.prog[i] >= (q.objectives[i].count || 1); };

  // For collect objectives the progress is the inventory count.
  QL.recount = function (id) {
    const q = R.Quests[id], s = QL.state[id];
    if (!s || s.status === 'done') return;
    const p = R.World.player;
    q.objectives.forEach((o, i) => { if (o.type === 'collect' && p) s.prog[i] = Math.min(o.count || 1, p.count(o.item)); });
  };

  QL.check = function (id) {
    const q = R.Quests[id], s = QL.state[id];
    if (!s || s.status === 'done') return;
    const was = s.status;
    const all = q.objectives.every((o, i) => s.prog[i] >= (o.count || 1));
    s.status = all ? 'ready' : 'active';
    if (all && was !== 'ready') {
      R.Audio.play('quest', { pitch: 1.2 });
      const who = R.NPCs[q.turnIn || q.giver];
      R.UI.toast(q.name + ': complete! ' + (who ? 'Return to ' + who.name + '.' : ''), 'good');
      if (!q.turnIn && !q.giver) QL.complete(id);
    }
  };

  QL.advance = function (id, i, n) {
    const q = R.Quests[id], s = QL.state[id];
    if (!s || s.status === 'done') return;
    const need = q.objectives[i].count || 1;
    if (s.prog[i] >= need) return;
    s.prog[i] = Math.min(need, s.prog[i] + (n || 1));
    R.UI.questProgress(QL.objText(q, q.objectives[i], i, s.prog[i]), s.prog[i] >= need);
    R.events.emit('quest:progress', { quest: id });
    QL.check(id);
  };

  QL.complete = function (id) {
    const q = R.Quests[id], s = QL.state[id];
    if (!s || s.status === 'done') return;
    const p = R.World.player;
    q.objectives.forEach((o) => { if (o.type === 'collect' && o.consume !== false) p.removeItem(o.item, o.count || 1); });
    s.status = 'done';
    const rw = q.rewards || {};
    if (rw.gold) { p.gold += rw.gold; R.Audio.play('coin'); }
    for (const it of rw.items || []) p.addItem(it, 1);
    // rewards.gear: {rarity, level?} -> a random piece of gear your class can use
    const gearRewards = [];
    for (const g of [].concat(rw.gear || [])) {
      const it = QL.pickGear(g.level || q.level || p.level, g.rarity, g.slot);
      if (it) { p.addItem(it.id, 1); gearRewards.push(it); }
    }
    if (rw.xp) p.gainXp(rw.xp);
    R.Audio.play('quest');
    R.UI.banner('QUEST COMPLETE', q.name + (rw.gold ? '   +' + rw.gold + ' gold' : '') + (rw.xp ? '   +' + rw.xp + ' XP' : ''));
    for (const it of rw.items || []) R.UI.lootToast(R.Items[it], 1);
    for (const it of gearRewards) R.UI.lootToast(it, 1);
    if (q.onComplete) q.onComplete();
    if (q.repeatable) {
      // back on the board after a cooldown
      delete QL.state[id];
      QL.cooldowns[id] = (R.playtime || 0) + (q.cooldown || 240);
      QL.repeats[id] = (QL.repeats[id] || 0) + 1;
    }
    if (QL.tracked === id) QL.tracked = QL.activeList()[0] || null;
    R.events.emit('quest:complete', { quest: id });
    QL.autoStart();
    if (R.Save && R.settings.autosave !== false) R.Save.autosave();
  };

  QL.pickGear = function (level, rarity, slot) {
    const p = R.World.player;
    const all = Object.values(R.Items).filter((it) => R.SLOTS.includes(it.slot) && !it.dropsFrom && (!slot || it.slot === slot));
    const fit = (lo, hi, rar) => all.filter((it) => it.level >= lo && it.level <= hi && (!rar || it.rarity === rar) && p.canEquip(it));
    const c = fit(level - 3, level + 1, rarity).concat([]);
    const pool = c.length ? c : fit(level - 8, level + 3, rarity).length ? fit(level - 8, level + 3, rarity) : fit(0, level + 3, null);
    return pool.length ? U.choose(pool) : null;
  };

  QL.activeList = () => Object.keys(QL.state).filter((id) => QL.state[id].status !== 'done').sort((a, b) => (R.Quests[a].type === 'main' ? -1 : 1) - (R.Quests[b].type === 'main' ? -1 : 1));
  QL.doneList = () => Object.keys(QL.state).filter((id) => QL.state[id].status === 'done');

  // Quests an NPC can offer right now (story first, then side quests, then the most level-appropriate bounty)
  QL.offers = function (npcId) {
    const rank = (q) => (q.type === 'main' ? 0 : q.repeatable ? 2 : 1);
    return Object.values(R.Quests).filter((q) => q.giver === npcId && QL.status(q.id) === 'available' && QL.levelOk(q.id))
      .sort((a, b) => rank(a) - rank(b) || (a.repeatable ? (b.level || 0) - (a.level || 0) : 0));
  };
  QL.turnIns = function (npcId) {
    return Object.values(R.Quests).filter((q) => (q.turnIn || q.giver) === npcId && QL.status(q.id) === 'ready');
  };
  QL.inProgress = function (npcId) {
    return Object.values(R.Quests).filter((q) => (q.turnIn || q.giver) === npcId && QL.status(q.id) === 'active');
  };
  QL.markerFor = function (npcId) {
    if (QL.turnIns(npcId).length) return 'ready';
    const o = QL.offers(npcId);
    if (o.length) return o.some((q) => q.type === 'main') ? 'main' : 'side';
    return null;
  };

  // Called by the UI when the player talks to an NPC. Returns extra dialogue lines from talk objectives.
  QL.onTalk = function (npcId) {
    const lines = [];
    for (const id of QL.activeList()) {
      const q = R.Quests[id], s = QL.state[id];
      q.objectives.forEach((o, i) => {
        if (o.type === 'talk' && o.npc === npcId && s.prog[i] < 1) {
          // talk objectives only count once earlier objectives are complete
          const before = q.objectives.slice(0, i).every((oo, j) => s.prog[j] >= (oo.count || 1));
          if (!before) return;
          if (o.lines) for (const l of o.lines) lines.push(l);
          lines.push({ action: () => QL.advance(id, i) });
        }
      });
    }
    R.events.emit('talk', { npc: npcId });
    return lines;
  };

  QL.setFlag = function (flag) {
    R.World.flags[flag] = 1;
    R.events.emit('flag', { flag });
  };

  QL.autoStart = function () {
    for (const q of Object.values(R.Quests)) if (q.auto && QL.status(q.id) === 'available' && QL.levelOk(q.id)) QL.start(q.id);
  };

  // ---- event wiring -----------------------------------------------------------
  function each(fn) {
    for (const id of Object.keys(QL.state)) {
      const s = QL.state[id];
      if (s.status !== 'active') continue;
      const q = R.Quests[id];
      q.objectives.forEach((o, i) => fn(q, o, i, s));
    }
  }
  R.events.on('kill', (ev) => each((q, o, i) => {
    if (o.type === 'kill') {
      const targets = o.target ? (Array.isArray(o.target) ? o.target : [o.target]) : null;
      if ((targets && targets.includes(ev.enemy)) || (o.tag && ev.tags.includes(o.tag))) {
        if (o.map && o.map !== ev.map) return;
        QL.advance(q.id, i);
      }
    }
    if (o.type === 'boss' && o.target === ev.enemy) QL.advance(q.id, i);
  }));
  const recountAll = () => { for (const id of Object.keys(QL.state)) { const before = JSON.stringify(QL.state[id].prog); QL.recount(id); if (JSON.stringify(QL.state[id].prog) !== before) { const q = R.Quests[id]; q.objectives.forEach((o, i) => { if (o.type === 'collect') R.UI.questProgress(QL.objText(q, o, i, QL.state[id].prog[i]), QL.state[id].prog[i] >= o.count); }); } QL.check(id); } };
  R.events.on('pickup', () => setTimeout(recountAll, 0));
  R.events.on('use', (ev) => each((q, o, i) => { if (o.type === 'use' && o.item === ev.item) QL.advance(q.id, i); }));
  R.events.on('enter', (ev) => each((q, o, i) => { if (o.type === 'reach' && o.map === ev.map && !o.zone) QL.advance(q.id, i); }));
  R.events.on('zone', (ev) => each((q, o, i) => { if (o.type === 'reach' && o.zone === ev.name) QL.advance(q.id, i); }));
  R.events.on('flag', (ev) => each((q, o, i) => { if (o.type === 'flag' && o.flag === ev.flag) QL.advance(q.id, i); }));
  R.events.on('levelup', () => QL.autoStart());
})(window.RPG);
