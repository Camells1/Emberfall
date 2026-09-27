'use strict';
// Save / load. Three manual slots plus the autosave, stored in localStorage
// (inside Electron this lives in the app's user-data folder, so it persists).
(function (R) {
  const KEY = 'emberfall.save.';
  const SETTINGS = 'emberfall.settings';
  const Save = R.Save = {};

  R.settings = Object.assign({ dayNight: true, fancy: true, shake: true, autosave: true, guide: true, master: 0.7, sfx: 0.8, music: 0.45, showFps: false, muteUnfocused: true, chatter: true, fullscreen: false, difficulty: 'normal', hd2d: true }, load(SETTINGS) || {});
  function load(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.error(e); return false; } }
  Save.saveSettings = () => store(SETTINGS, R.settings);

  Save.snapshot = function () {
    const W = R.World, p = W.player;
    return {
      v: 1, layout: 3, time: Date.now(), playtime: Math.round(R.playtime || 0),
      map: W.map.id, x: Math.round(p.x), y: Math.round(p.y),
      player: {
        name: p.name, cls: p.cls, race: p.race, appearance: p.appearance, level: p.level, xp: p.xp, attrs: p.attrs, attrPoints: p.attrPoints,
        skillPoints: p.skillPoints, skillLv: p.skillLv, learned: p.learned, mounts: p.mounts, pets: p.pets, mount: p.mount, pet: p.pet, equip: p.equip, ench: p.ench, inv: p.inv, gold: p.gold, hp: Math.round(p.hp), mp: Math.round(p.mp), kills: p.kills, hotbar: p.hotbar,
      },
      quests: R.QuestLog.state, tracked: R.QuestLog.tracked, questCooldowns: R.QuestLog.cooldowns, questRepeats: R.QuestLog.repeats, flags: W.flags, waypoints: W.waypoints, visited: W.visited,
    };
  };
  Save.save = function (slot) {
    const ok = store(KEY + slot, Save.snapshot());
    return ok;
  };
  Save.autosave = function () { if (R.World.player && !R.World.player.dead && !R.World.boss) Save.save('auto'); };
  Save.info = function (slot) {
    const d = load(KEY + slot);
    if (!d) return null;
    return { name: d.player.name, cls: d.player.cls, race: d.player.race, level: d.player.level, map: d.map, time: d.time, playtime: d.playtime, appearance: d.player.appearance };
  };
  Save.exists = (slot) => !!load(KEY + slot);
  Save.latest = function () {
    let best = null;
    for (const s of ['auto', 1, 2, 3]) { const i = Save.info(s); if (i && (!best || i.time > best.time)) best = Object.assign({ slot: s }, i); }
    return best;
  };
  Save.remove = (slot) => { try { localStorage.removeItem(KEY + slot); } catch (e) { /* ignore */ } };
  Save.load = function (slot) {
    const d = load(KEY + slot);
    if (!d) return false;
    R.startGame(d);
    return true;
  };
})(window.RPG);
