'use strict';
// Skills screen (K): your four-slot skill bar plus every skill you know, and the trainer screen
// where NPCs teach new ones.
(function (R) {
  const U = R.U, UI = R.UI, el = UI.el, S = UI.screens, SL = R.SkillLearn;
  let pick = null; // skill id waiting to be placed on the bar

  const statLine = (s, lv) => {
    const mp = typeof s.mp === 'function' ? s.mp(Math.max(1, lv)) : s.mp;
    const cd = typeof s.cd === 'function' ? s.cd(Math.max(1, lv)) : s.cd;
    return `${mp} MP · ${cd.toFixed(1)}s cooldown`;
  };
  S.skills = {
    build(m) {
      const p = R.World.player;
      const body = UI.frame(m, 'Skills', 'skills-frame');
      el('div', 'skill-points', p.skillPoints ? `You have <b>${p.skillPoints}</b> skill point${p.skillPoints > 1 ? 's' : ''} to spend.` : 'Gain levels to earn skill points.', body);
      // ---- the bar
      el('div', 'sec-title', 'Skill Bar' + (pick ? ` — <span class="sb-pick">click a slot to put ${U.esc(R.Skills[pick].name)} there</span>` : ''), body);
      const bar = el('div', 'sb-bar', null, body);
      const cur = p.skills().slice();
      for (let i = 0; i < 4; i++) {
        const locked = p.level < R.SKILL_UNLOCK[i];
        const s = R.Skills[cur[i]];
        const c = el('div', 'sb-slot' + (locked ? ' locked' : '') + (pick && !locked ? ' target' : ''), null, bar);
        el('span', 'sb-key', String(i + 1), c);
        if (locked) el('span', 'sb-lock', '🔒 Lv ' + R.SKILL_UNLOCK[i], c);
        else if (s) { c.appendChild(UI.pix(R.Icons.skill(s), 3)); el('span', 'sb-name', U.esc(s.name), c); }
        else el('span', 'sb-lock', 'empty', c);
        if (s) UI.bindTip(c, () => `<div class="tt-name" style="color:${s.icon.color}">${U.esc(s.name)}</div><div class="tt-desc">${U.esc(s.desc(Math.max(1, p.skillLevel(s.id))))}</div>`);
        c.onclick = () => {
          if (!pick || locked) return;
          const bar2 = p.skills().slice(); const was = bar2.indexOf(pick);
          if (was >= 0) bar2[was] = bar2[i]; // swap if it was already on the bar
          bar2[i] = pick; p.hotbar = bar2; pick = null;
          R.Audio.play('equip'); UI.refresh();
        };
      }
      // ---- everything you know
      el('div', 'sec-title', 'Known Skills', body);
      const list = el('div', 'skill-list scroll', null, body);
      const known = SL.known(p);
      for (const id of known) {
        const s = R.Skills[id]; if (!s) continue;
        const lv = p.skillLevel(id);
        const row = el('div', 'skill-row' + (pick === id ? ' picking' : ''), null, list);
        row.appendChild(UI.pix(R.Icons.skill(s), 3));
        const info = el('div', 'skill-info', null, row);
        const slot = cur.indexOf(id);
        el('div', 'skill-name', `<span style="color:${s.icon.color}">${U.esc(s.name)}</span> <small>${slot >= 0 ? '[' + (slot + 1) + '] · ' : ''}Rank ${lv} / ${s.maxLv} · ${statLine(s, lv)}${s.cls === 'any' ? ' · any class' : ''}</small>`, info);
        el('div', 'skill-desc', U.esc(s.desc(Math.max(1, lv))), info);
        if (lv > 0 && lv < s.maxLv) el('div', 'skill-next', 'Next rank: ' + U.esc(s.desc(lv + 1)), info);
        const pips = el('div', 'pips', null, info);
        for (let k = 0; k < s.maxLv; k++) el('span', 'pip' + (k < lv ? ' on' : ''), null, pips);
        const btns = el('div', 'sb-btns', null, row);
        if (p.skillPoints > 0 && lv < s.maxLv) UI.button(btns, lv ? 'Upgrade' : 'Learn', () => { p.skillLv[id] = lv + 1; p.skillPoints--; R.Audio.play('levelup', { pitch: 1.5 }); UI.refresh(); }, 'primary small');
        if (slot < 0) UI.button(btns, pick === id ? 'Cancel' : 'Put on bar', () => { pick = pick === id ? null : id; UI.refresh(); }, 'small');
      }
      // ---- what's still out there
      const cls = R.Classes[p.cls];
      const unknown = Object.values(R.Skills).filter((s) => SL.canUse(p, s) && !known.includes(s.id) && (s.learn || cls.skills.includes(s.id)));
      if (unknown.length) {
        el('div', 'sec-title', 'Not Learned Yet', body);
        const ul = el('div', 'sb-unknown', null, body);
        for (const s of unknown) {
          const where = cls.skills.includes(s.id) ? `Level ${R.SKILL_UNLOCK[cls.skills.indexOf(s.id)]}` : s.learn.quest ? `Quest: ${U.esc((R.Quests[s.learn.quest] || {}).name || '?')}` : `${U.esc((R.NPCs[s.learn.trainer] || {}).name || 'a trainer')} · Lv ${s.learn.level}`;
          const c = el('div', 'sb-u', null, ul);
          c.appendChild(UI.pix(R.Icons.skill(s), 2));
          el('span', null, `<b>${U.esc(s.name)}</b><small>${where}</small>`, c);
          UI.bindTip(c, () => `<div class="tt-name" style="color:${s.icon.color}">${U.esc(s.name)}</div><div class="tt-desc">${U.esc(s.desc(1))}</div><div class="tt-line dim">Learn from: ${where}</div>`);
        }
      }
      el('div', 'hint', 'Skill slots unlock at levels 1, 3, 6 and 10. Learn more skills from trainers (Havenbrook\'s weapons trainer, Orin the arcanist, the innkeeper, the Arena Master) and from quests.', body);
    },
    close() { pick = null; },
  };

  // ------------------------------------------------------------------ trainer
  S.trainer = {
    build(m, nid) {
      const p = R.World.player, npc = R.NPCs[nid] || { name: 'Trainer' };
      const body = UI.frame(m, `${npc.name} — Training`, 'skills-frame');
      const offers = SL.offers(nid, p);
      if (!offers.length) el('div', 'hint', 'I have nothing to teach someone of your calling. Try another trainer.', body);
      const list = el('div', 'skill-list scroll', null, body);
      for (const s of offers) {
        const knows = (p.learned || []).includes(s.id), L = s.learn;
        const row = el('div', 'skill-row' + (knows ? ' known' : p.level < L.level ? ' locked' : ''), null, list);
        row.appendChild(UI.pix(R.Icons.skill(s), 3));
        const info = el('div', 'skill-info', null, row);
        el('div', 'skill-name', `<span style="color:${s.icon.color}">${U.esc(s.name)}</span> <small>${statLine(s, 1)}${s.cls === 'any' ? ' · any class' : ''}</small>`, info);
        el('div', 'skill-desc', U.esc(s.desc(1)), info);
        if (knows) { el('div', 'sb-known', '✓ Learned', row); continue; }
        if (p.level < L.level) { el('div', 'sb-known locked', `Requires level ${L.level}`, row); continue; }
        UI.button(row, `Learn <small><span class="coin"></span>${L.gold}</small>`, () => {
          if (p.gold < L.gold) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
          p.gold -= L.gold; SL.learn(p, s.id); UI.refresh();
        }, p.gold >= L.gold ? 'primary' : '');
      }
      el('div', 'bag-foot', `<span class="coin"></span> ${U.fmt(p.gold)} gold`, body);
      UI.button(body, '← Back', () => UI.close());
    },
  };
})(window.RPG);
