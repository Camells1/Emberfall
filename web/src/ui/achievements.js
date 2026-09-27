'use strict';
// Achievements (O, or Esc → Achievements). Unlocked once for this computer across all saves, like a
// store achievement list, with a gold pop-up when you earn one. Characters that used the admin code
// or admin cheats don't earn them.
(function (R) {
  const U = R.U, UI = R.UI, el = UI.el, S = UI.screens;
  const AC = R.Achievements = {};
  const KEY = 'emberfall.achievements';
  let store = { got: {}, stats: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.got) store = Object.assign({ got: {}, stats: {} }, s); } catch (e) { /* private window etc. */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };
  const st = store.stats;
  const W = () => R.World, P = () => R.World.player;
  const nBosses = () => Object.values(R.Enemies).filter((d) => d.boss).length;
  const count = (o) => (o ? Object.keys(o).length : 0);

  // id: [icon, name, how, test(player, stats), secret?]
  const LIST = AC.LIST = [
    ['first_blood', '⚔️', 'First Blood', 'Defeat your first enemy.', (p) => st.kills >= 1],
    ['hunter', '🗡️', 'Monster Hunter', 'Defeat 100 enemies.', () => st.kills >= 100],
    ['legend', '🏹', 'Legend of the Wilds', 'Defeat 1,000 enemies.', () => st.kills >= 1000],
    ['night_owl', '🦉', 'Night Owl', 'Defeat 25 enemies at night.', () => st.nightKills >= 25],
    ['giant', '💀', 'Giant Slayer', 'Defeat a boss.', () => count(st.bosses) >= 1],
    ['five_bosses', '👑', 'Tyrant Toppler', 'Defeat 5 different bosses.', () => count(st.bosses) >= 5],
    ['all_bosses', '💎', 'Crownbreaker', 'Defeat every boss in the realm.', () => count(st.bosses) >= nBosses()],
    ['oops', '🪦', 'Learning Experience', 'Fall in battle for the first time.', () => st.deaths >= 1],
    ['dodger', '💨', 'Untouchable', 'Dodge 200 times.', () => st.dodges >= 200],
    ['lv5', '⭐', 'Getting Started', 'Reach level 5.', (p) => p.level >= 5],
    ['lv10', '🌟', 'Seasoned', 'Reach level 10.', (p) => p.level >= 10],
    ['lv20', '✨', 'Veteran', 'Reach level 20.', (p) => p.level >= 20],
    ['lv30', '🔥', 'Champion of the Realm', 'Reach the level cap.', (p) => p.level >= R.MAX_LEVEL],
    ['quest1', '📜', 'Helping Hand', 'Complete a quest.', () => st.quests >= 1],
    ['quest25', '📚', 'Hero for Hire', 'Complete 25 quests.', () => st.quests >= 25],
    ['wander', '🧭', 'Wanderer', 'Visit 10 different places.', () => count(st.visited) >= 10],
    ['cartographer', '🗺️', 'Cartographer', 'Visit every place in the realm.', () => count(st.visited) >= Object.keys(R.Maps).length - 1],
    ['chests', '🧰', 'Treasure Hunter', 'Open 25 chests.', () => st.chests >= 25],
    ['rich', '💰', 'Deep Pockets', 'Carry 10,000 gold.', (p) => p.gold >= 10000],
    ['mount', '🐎', 'Saddle Up', 'Own a mount.', (p) => (p.mounts || []).length >= 1],
    ['sky', '🦅', 'Sky Rider', 'Take off on a flying mount.', () => st.flown >= 1],
    ['show_off', '🎠', 'Show-off', 'Use a mount ability 20 times.', () => st.mountAbilities >= 20],
    ['stable', '🏇', 'Stablemaster', 'Own every mount.', (p) => (p.mounts || []).length >= Object.keys(R.Companions.MOUNTS).length],
    ['pet', '🐾', 'Best Friend', 'Adopt a pet.', (p) => (p.pets || []).length >= 1],
    ['zoo', '🦊', 'Menagerie', 'Own every pet.', (p) => (p.pets || []).length >= Object.keys(R.Companions.PETS).length],
    ['craft', '🔨', 'Handy', 'Craft something.', () => st.crafts >= 1],
    ['artisan', '⚒️', 'Artisan', 'Craft 50 things.', () => st.crafts >= 50],
    ['enchant', '🔮', 'Enchanter', 'Enchant a piece of gear.', () => st.enchants >= 1],
    ['forager', '🌿', 'Forager', 'Gather 100 materials.', () => st.gathered >= 100],
    ['trout', '🐟', 'Big Catch', 'Catch a Silver Trout.', () => st.trout >= 1],
    ['carp', '🐉', 'Living Legend', 'Catch the Ancient Carp.', () => st.carp >= 1],
    ['student', '🎓', 'Student of the Blade', 'Learn 5 new skills from trainers and quests.', () => st.learned >= 5],
    ['gauntlet', '🏆', 'Gauntlet Champion', 'Clear the Gauntlet in the Crimson Colosseum.', () => st.gauntlet >= 1],
    ['coop', '🤝', 'Better Together', 'Play online with a friend.', () => st.coop >= 1],
    ['hen', '🐔', 'Chicken Whisperer', 'Earn the respect of the hens.', (p) => (p.mounts || []).includes('chicken'), true],
  ];
  AC.has = (id) => !!store.got[id];
  AC.count = () => count(store.got);

  const cheating = () => { const f = W().flags || {}; return !!(f.adminUnlocked || (f.adminCheats && Object.keys(f.adminCheats).length)); };
  function check() {
    const p = P(); if (!p || R.state !== 'play' || cheating()) return;
    for (const [id, icon, name, , test] of LIST) {
      if (store.got[id]) continue;
      let ok = false; try { ok = !!test(p, st); } catch (e) { ok = false; }
      if (ok) { store.got[id] = Date.now(); save(); popup(icon, name); }
    }
  }
  const bump = (k, n) => { if (cheating()) return; st[k] = (st[k] || 0) + (n || 1); dirty = true; };
  let dirty = false;

  // ---- stats from game events
  const ev = R.events;
  ev.on('kill', (e) => { if (!e || (e.entity && e.entity.team === 'player')) return; bump('kills'); if (R.DayNight && R.DayNight.isNight()) bump('nightKills'); });
  ev.on('boss:defeat', (e) => { if (cheating()) return; st.bosses = st.bosses || {}; st.bosses[e.id] = 1; dirty = true; check(); });
  ev.on('playerDeath', () => bump('deaths'));
  ev.on('dodge', () => bump('dodges'));
  ev.on('quest:complete', () => bump('quests'));
  ev.on('enter', (e) => { if (cheating() || !e || !e.map) return; st.visited = st.visited || {}; st.visited[e.map] = 1; dirty = true; });
  ev.on('chest', () => bump('chests'));
  ev.on('craft', (e) => bump('crafts', (e && e.qty) || 1));
  ev.on('enchant', () => bump('enchants'));
  ev.on('gather', (e) => bump('gathered', (e && e.qty) || 1));
  ev.on('pickup', (e) => { if (!e) return; if (e.item === 'silver_trout') bump('trout'); if (e.item === 'ancient_carp') bump('carp'); });
  ev.on('learn', () => bump('learned'));
  ev.on('gauntlet:win', () => bump('gauntlet'));
  ev.on('mountAbility', () => bump('mountAbilities'));
  let t = 0;
  ev.on('tick', (dt) => {
    t -= dt; if (t > 0) return; t = 1;
    const p = P();
    if (p && p.riding && p.air && !st.flown) bump('flown');
    if (R.Net && R.Net.active() && R.Net.peers.size > 0 && !st.coop) bump('coop');
    check();
    if (dirty) { dirty = false; save(); }
  });

  // ---- the gold pop-up
  let q = [], showing = false;
  function popup(icon, name) { q.push([icon, name]); if (!showing) next(); }
  function next() {
    const it = q.shift(); if (!it) { showing = false; return; }
    showing = true;
    const root = document.getElementById('ui'); if (!root) { showing = false; return; }
    const d = el('div', 'ach-pop', `<div class="ach-ic">${it[0]}</div><div><div class="ach-k">Achievement unlocked</div><div class="ach-n">${U.esc(it[1])}</div></div>`, root);
    R.Audio.play('levelup', { pitch: 1.25 });
    setTimeout(() => d.classList.add('out'), 3600);
    setTimeout(() => { d.remove(); next(); }, 4100);
  }

  // ---- the screen
  S.achievements = {
    build(m) {
      const body = UI.frame(m, `Achievements — ${AC.count()} / ${LIST.length}`, "ach-frame");
      if (cheating()) el('div', 'hint', 'This character used admin powers, so it can\'t earn achievements. Your other characters still can.', body);
      const bar = el('div', 'ach-bar', null, body); el('div', 'ach-fill', null, bar).style.width = Math.round(AC.count() / LIST.length * 100) + '%';
      const grid = el('div', 'ach-grid scroll', null, body);
      for (const [id, icon, name, how, , secret] of LIST) {
        const got = store.got[id];
        const c = el('div', 'ach-card' + (got ? ' got' : ''), null, grid);
        el('div', 'ach-ic', got || !secret ? icon : '❔', c);
        const info = el('div', 'ach-info', null, c);
        el('div', 'ach-n', got || !secret ? U.esc(name) : 'Secret', info);
        el('div', 'ach-d', got || !secret ? U.esc(how) : 'Keep playing to find out.', info);
        if (got) el('div', 'ach-date', '✓ ' + new Date(got).toLocaleDateString(), info);
      }
      const s = el('div', 'ach-stats', null, body);
      s.innerHTML = `Enemies defeated: <b>${st.kills || 0}</b> · Bosses: <b>${count(st.bosses)}</b> / ${nBosses()} · Quests: <b>${st.quests || 0}</b> · Chests: <b>${st.chests || 0}</b> · Places: <b>${count(st.visited)}</b>`;
    },
  };
  R.Input.bindings.achievements = ['KeyO'];
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyO' || R.state !== 'play' || (e.target && e.target.tagName === 'INPUT')) return;
    if (UI.current === 'achievements') UI.close(); else if (!UI.current && !UI.dialogOpen) UI.open('achievements');
  });
  const pb = S.pause.build;
  S.pause.build = function (m) {
    pb.call(this, m);
    const menu = m.querySelector('.title-menu'); if (!menu) return;
    const btns = [...menu.querySelectorAll('button')];
    const b = UI.button(menu, `Achievements <small>${AC.count()}/${LIST.length} · O</small>`, () => UI.open('achievements', { back: 'pause' }));
    menu.insertBefore(b, btns[Math.min(2, btns.length - 1)]);
  };
})(window.RPG);
