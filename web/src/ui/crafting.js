'use strict';
// Crafting screen: Alchemy, Smithing, Enchanting and Salvage tabs. Press B anywhere to browse the
// recipes; making things needs you to stand at a Crafting Station.
(function (R) {
  const U = R.U, UI = R.UI, el = UI.el, CR = R.Crafting;
  const S = UI.screens;
  const st = { tab: 'alchemy', tier: 0, pick: null, mw: false, target: null, ench: null, elv: 1 };

  function matsHTML(p, mats, times) {
    const out = [];
    for (const k in mats) {
      if (!mats[k]) continue;
      const it = R.Items[k], need = mats[k] * (times || 1), have = p.count(k);
      out.push(`<span class="cr-mat ${have >= need ? 'ok' : 'no'}" data-mat="${k}">${it ? U.esc(it.name) : k} <b>${have}/${need}</b></span>`);
    }
    return out.join('');
  }
  // tooltip on each material chip: where to get it
  const WHERE = {
    meadowleaf: 'Herb patches in green meadows (Havenbrook wilds, Whisperwood, Gullwind Coast)', glowmoss: 'Glowing moss in the swamp, caves and Thornveil Grove', emberroot: 'Red roots in the desert and the Caldera',
    frostbloom: 'Icy flowers on Frostfang Peaks', timber: 'Fallen logs in any forest', iron_ore: 'Rust-red rocks in the early wilds', mithril_ore: 'Blue-veined rocks in the dunes and peaks',
    adamant_ore: 'Violet-veined rocks in the Caldera and Thornveil', starmetal: 'Glowing rocks deep in the late-game wilds', raw_gem: 'Gem clusters, and sometimes while mining any ore',
    arcane_dust: 'Salvage gear (Salvage tab)', arcane_shard: 'Salvage rare, epic or better gear', arcane_prism: 'Salvage legendary or mythic gear',
  };
  function bindMatTips(root) {
    root.querySelectorAll('.cr-mat').forEach((m) => {
      const id = m.dataset.mat, it = R.Items[id];
      UI.bindTip(m, () => `<div class="tt-name">${it ? U.esc(it.name) : id}</div>${it && it.desc ? `<div class="tt-desc">${U.esc(it.desc)}</div>` : ''}<div class="tt-line dim">${U.esc(WHERE[id] || 'Dropped by monsters')}</div>`);
    });
  }
  const canWork = () => CR.nearStation();
  function needStation(body) {
    if (canWork()) return false;
    el('div', 'cr-warn', '📜 You are browsing recipes. Stand at a <b>Crafting Station</b> to make things (Havenbrook near the smithy, the Oasis, and camps out in the wilds).', body);
    return true;
  }

  S.crafting = {
    build(m) {
      const p = R.World.player;
      const body = UI.frame(m, 'Crafting', 'cr-frame');
      const tabs = el('div', 'bag-tabs cr-tabs', null, body);
      for (const [k, label] of [['alchemy', '⚗ Alchemy'], ['smithing', '⚒ Smithing'], ['enchanting', '✧ Enchanting'], ['salvage', '♻ Salvage']]) {
        const t = el('button', 'tab' + (st.tab === k ? ' sel' : ''), label, tabs);
        t.onclick = () => { st.tab = k; UI.refresh(); };
      }
      const browse = needStation(body);
      const pane = el('div', 'cr-pane scroll', null, body);
      if (st.tab === 'alchemy') alchemy(pane, p, browse);
      else if (st.tab === 'smithing') smithing(pane, p, browse);
      else if (st.tab === 'enchanting') enchanting(pane, p, browse);
      else salvage(pane, p, browse);
      bindMatTips(body);
      el('div', 'bag-foot cr-gold', `<span class="coin"></span> ${U.fmt(p.gold)} gold`, body);
    },
    close() { CR.atStation = null; },
  };

  // ------------------------------------------------------------------ alchemy
  function alchemy(pane, p, browse) {
    for (const r of CR.ALCHEMY) {
      const it = R.Items[r.out];
      if (!it) continue;
      const locked = r.lv && p.level < r.lv;
      const row = el('div', 'cr-row' + (locked ? ' locked' : ''), null, pane);
      row.appendChild(UI.itemIcon(it, 2));
      el('div', 'cr-name', `<b>${U.esc(it.name)}${r.n > 1 ? ' ×' + r.n : ''}</b><small>${U.esc(it.desc || '')}</small>`, row);
      el('div', 'cr-mats', locked ? `<span class="cr-mat no">Requires level ${r.lv}</span>` : matsHTML(p, r.mats), row);
      UI.bindTip(row.firstChild, () => UI.itemTip(it, {}));
      if (locked) continue;
      const go = (times) => {
        if (browse || !canWork()) { UI.toast('Stand at a Crafting Station to brew.', 'bad'); return; }
        if (!CR.has(p, r.mats, times)) { UI.toast('Missing materials', 'bad'); R.Audio.play('error'); return; }
        CR.take(p, r.mats, times); p.addItem(r.out, r.n * times);
        R.Audio.play('heal'); UI.toast(`Brewed ${r.n * times}× ${it.name}`, 'good');
        R.FX.burst(p.x, p.y - 14, { n: 14, colors: ['#60ff90', '#c0ffe0'], speed: 30, life: 0.6, up: 20, glow: true });
        R.events.emit('craft', { item: r.out, qty: r.n * times });
        UI.refresh();
      };
      const b = el('div', 'cr-btns', null, row);
      UI.button(b, 'Brew', () => go(1), CR.has(p, r.mats) && !browse ? 'primary small' : 'small');
      if (CR.has(p, r.mats, 5)) UI.button(b, '×5', () => go(5), 'small');
    }
  }

  // ------------------------------------------------------------------ smithing
  function smithing(pane, p, browse) {
    const tt = el('div', 'cr-tiers', null, pane);
    CR.TIERS.forEach((t, i) => {
      const b = el('button', 'tab' + (st.tier === i ? ' sel' : '') + (p.level < t.lv - 2 ? ' dim' : ''), `${t.name} <small>Lv ${t.lv}</small>`, tt);
      b.onclick = () => { st.tier = i; st.pick = null; UI.refresh(); };
    });
    const tier = CR.TIERS[st.tier];
    if (p.level < tier.lv - 2) el('div', 'cr-warn', `You need to be level ${tier.lv - 2} to work ${tier.name}.`, pane);
    const list = CR.forgeList(p, tier);
    const grid = el('div', 'cr-forge', null, pane);
    for (const f of list) {
      const it = R.Items[st.mw ? f.mw : f.id];
      if (!it) continue;
      const c = el('div', 'bag-slot r-' + it.rarity + (st.pick === f.key ? ' sel' : ''), null, grid);
      c.appendChild(UI.itemIcon(it, 3));
      UI.bindTip(c, () => UI.itemTip(it, { hint: 'Click to choose' }));
      c.onclick = () => { st.pick = f.key; UI.refresh(); };
    }
    const mwRow = el('label', 'cr-mw', null, pane);
    const cb = el('input', null, null, mwRow); cb.type = 'checkbox'; cb.checked = st.mw; cb.onchange = () => { st.mw = cb.checked; UI.refresh(); };
    el('span', null, ' <b>Masterwork</b> — costs 2 Rough Gems + 2 Arcane Shards more, always makes the rare/set version (or adds an enchantment)', mwRow);
    const f = list.find((x) => x.key === st.pick);
    if (!f) { el('div', 'hint', 'Pick what to forge. You can only forge gear your class can use.', pane); return; }
    const it = R.Items[st.mw ? f.mw : f.id];
    const mats = Object.assign({}, f.kind === 'weapon' ? tier.weapon : tier.armor);
    if (st.mw) for (const k in CR.MASTERWORK) mats[k] = (mats[k] || 0) + CR.MASTERWORK[k];
    const gold = tier.gold * (st.mw ? 2 : 1);
    const row = el('div', 'cr-row big', null, pane);
    row.appendChild(UI.itemIcon(it, 3));
    el('div', 'cr-name', `<b style="color:${UI.rarityColor(it)}">${U.esc(it.name)}</b><small>${st.mw ? 'Masterwork' : 'Regular forging: 25% chance of the rare version'}</small>`, row);
    el('div', 'cr-mats', matsHTML(p, mats) + `<span class="cr-mat ${p.gold >= gold ? 'ok' : 'no'}"><span class="coin"></span> <b>${gold}</b></span>`, row);
    UI.bindTip(row.firstChild, () => UI.itemTip(it, {}));
    const ok = CR.has(p, mats) && p.gold >= gold && p.level >= tier.lv - 2;
    UI.button(row, '⚒ Forge', () => {
      if (browse || !canWork()) { UI.toast('Stand at a Crafting Station to forge.', 'bad'); return; }
      if (p.level < tier.lv - 2) { UI.toast(`You need to be level ${tier.lv - 2}`, 'bad'); return; }
      if (!CR.has(p, mats) || p.gold < gold) { UI.toast('Missing materials or gold', 'bad'); R.Audio.play('error'); return; }
      CR.take(p, mats); p.gold -= gold;
      const rare = st.mw || Math.random() < 0.25;
      const outId = rare ? f.mw : f.id;
      const entry = { id: outId, qty: 1 };
      if (st.mw && f.mwEnchant) { const opts = CR.enchantsFor(R.Items[outId]); entry.ench = { id: U.choose(opts), lv: 1 }; }
      p.addEntry(entry);
      R.Audio.play('hit', { pitch: 0.6 }); R.World.later(0.15, () => R.Audio.play('hit', { pitch: 0.8 })); R.World.later(0.3, () => R.Audio.play('levelup', { pitch: 1.5 }));
      R.FX.burst(p.x, p.y - 12, { n: 24, colors: ['#ffb040', '#fff0a0', '#ffffff'], speed: 70, life: 0.6, glow: true });
      R.UI.lootToast(R.Items[outId], 1);
      if (rare && !st.mw) UI.toast('A perfect strike! You forged the rare version!', 'good');
      R.events.emit('craft', { item: outId, qty: 1 });
      UI.refresh();
    }, ok && !browse ? 'primary' : '');
  }

  // ------------------------------------------------------------------ enchanting
  function gearList(p) {
    const out = [];
    for (const slot of R.SLOTS) if (p.equip[slot]) out.push({ where: 'eq', slot, it: R.Items[p.equip[slot]], get ench() { return p.ench[slot]; }, set: (e) => { if (e) p.ench[slot] = e; else delete p.ench[slot]; p.recalc(); } });
    p.inv.forEach((s, i) => { const it = R.Items[s.id]; if (it && R.SLOTS.includes(it.slot)) out.push({ where: 'inv', i, entry: s, it, get ench() { return s.ench; }, set: (e) => { if (e) s.ench = e; else delete s.ench; } }); });
    return out;
  }
  function enchanting(pane, p, browse) {
    el('div', 'hint', 'Each item holds one enchantment. Enchanting again replaces the old one. Get Arcane Dust and Shards by salvaging gear you don\'t need.', pane);
    const gear = gearList(p);
    const grid = el('div', 'cr-forge', null, pane);
    gear.forEach((g, k) => {
      const c = el('div', 'bag-slot r-' + g.it.rarity + (st.target === k ? ' sel' : '') + (g.ench ? ' ench' : ''), null, grid);
      c.appendChild(UI.itemIcon(g.it, 3));
      if (g.where === 'eq') el('span', 'qty eqd', 'E', c);
      UI.bindTip(c, () => UI.itemTip(g.it, { ench: g.ench, equipped: g.where === 'eq', hint: 'Click to choose' }));
      c.onclick = () => { st.target = k; st.ench = null; UI.refresh(); };
    });
    const g = gear[st.target];
    if (!g) return;
    const opts = CR.enchantsFor(g.it);
    const eg = el('div', 'cr-enchs', null, pane);
    for (const id of opts) {
      const e = CR.ENCH[id];
      const b = el('button', 'btn small cr-ench' + (st.ench === id ? ' sel' : ''), `<span style="color:${e.color}">✧ ${e.name}</span><small>${U.esc(e.text)}</small>`, eg);
      b.onclick = () => { st.ench = id; UI.refresh(); };
    }
    if (!st.ench) { el('div', 'hint', 'Choose an enchantment.', pane); return; }
    const lvRow = el('div', 'cr-tiers', null, pane);
    for (let lv = 1; lv <= 3; lv++) { const b = el('button', 'tab' + (st.elv === lv ? ' sel' : ''), CR.roman(lv), lvRow); b.onclick = () => { st.elv = lv; UI.refresh(); }; }
    const en = { id: st.ench, lv: st.elv };
    const cost = CR.enchantCost(g.it, st.elv);
    const row = el('div', 'cr-row big', null, pane);
    row.appendChild(UI.itemIcon(g.it, 3));
    el('div', 'cr-name', `<b>${U.esc(g.it.name)}</b>${CR.tipHTML(en, g.it)}${g.ench ? `<small class="bad">Replaces ${U.esc(CR.label(g.ench))}</small>` : ''}`, row);
    el('div', 'cr-mats', matsHTML(p, cost.mats) + `<span class="cr-mat ${p.gold >= cost.gold ? 'ok' : 'no'}"><span class="coin"></span> <b>${cost.gold}</b></span>`, row);
    const ok = CR.has(p, cost.mats) && p.gold >= cost.gold;
    UI.button(row, '✧ Enchant', () => {
      if (browse || !canWork()) { UI.toast('Stand at a Crafting Station to enchant.', 'bad'); return; }
      if (!CR.has(p, cost.mats) || p.gold < cost.gold) { UI.toast('Missing materials or gold', 'bad'); R.Audio.play('error'); return; }
      CR.take(p, cost.mats); p.gold -= cost.gold;
      // the item may have moved in the bag (materials used up): find it again by reference
      const fresh = gearList(p).find((x) => (g.where === 'eq' ? x.where === 'eq' && x.slot === g.slot : x.entry === g.entry));
      (fresh || g).set(en);
      const col = CR.ENCH[en.id].color;
      R.Audio.play('levelup', { pitch: 1.3 });
      R.FX.pillar(p.x, p.y, col, 1, 14); R.FX.burst(p.x, p.y - 14, { n: 30, colors: [col, '#ffffff'], speed: 60, life: 0.8, up: 30, glow: true });
      UI.toast(`${g.it.name} is now enchanted with ${CR.label(en)}!`, 'good');
      R.events.emit('enchant', { item: g.it.id, ench: en.id, lv: en.lv });
      UI.refresh(); UI.drawFace && UI.drawFace();
    }, ok && !browse ? 'primary' : '');
  }

  // ------------------------------------------------------------------ salvage
  function salvage(pane, p, browse) {
    el('div', 'hint', 'Break down gear from your bag into Arcane materials for enchanting. Equipped items are safe.', pane);
    const items = p.inv.map((s, i) => ({ s, i, it: R.Items[s.id] })).filter((x) => CR.canSalvage(x.it));
    if (!items.length) { el('div', 'hint', 'No gear in your bag to salvage.', pane); return; }
    const doSalvage = (list) => {
      if (browse || !canWork()) { UI.toast('Stand at a Crafting Station to salvage.', 'bad'); return; }
      const got = {};
      for (const x of list.sort((a, b) => b.i - a.i)) {
        const y = CR.salvageYield(x.it);
        p.inv.splice(x.i, 1);
        for (const k in y) { let n = Math.floor(y[k]); if (Math.random() < y[k] - n) n++; if (n > 0) { got[k] = (got[k] || 0) + n; } }
        if (x.s.ench) got.arcane_dust = (got.arcane_dust || 0) + 2 * x.s.ench.lv;
      }
      for (const k in got) { p.addItem(k, got[k]); R.UI.lootToast(R.Items[k], got[k]); }
      R.Audio.play('hit', { pitch: 1.4 }); R.FX.burst(p.x, p.y - 12, { n: 20, colors: ['#b080ff', '#ffffff'], speed: 50, life: 0.5, glow: true });
      UI.refresh();
    };
    const commons = items.filter((x) => (x.it.rarity === 'common' || x.it.rarity === 'uncommon') && !x.s.ench);
    const top = el('div', 'cr-btns', null, pane);
    if (commons.length) UI.button(top, `♻ Salvage all common & uncommon (${commons.length})`, () => doSalvage(commons), 'small');
    const grid = el('div', 'cr-forge', null, pane);
    for (const x of items) {
      const c = el('div', 'bag-slot r-' + x.it.rarity + (x.s.ench ? ' ench' : ''), null, grid);
      c.appendChild(UI.itemIcon(x.it, 3));
      const y = CR.salvageYield(x.it);
      const yl = Object.entries(y).map(([k, v]) => `${v < 1 ? Math.round(v * 100) + '% ' : Math.floor(v) + (v % 1 ? '+' : '') + '× '}${R.Items[k].name}`).join(', ');
      UI.bindTip(c, () => UI.itemTip(x.it, { ench: x.s.ench, hint: 'Click to salvage into: ' + yl }));
      c.onclick = () => { UI.hideTip(); doSalvage([x]); };
    }
  }

  // B opens the recipe book anywhere
  R.Input.bindings.craft = ['KeyB'];
  window.addEventListener('keydown', (e) => {
    if (R.state !== 'play' || UI.dialogOpen || (e.target && e.target.tagName === 'INPUT')) return;
    if (!R.Input.bindings.craft.includes(e.code) || (R.World.player && R.World.player.dead)) return;
    if (UI.current && UI.current !== 'crafting') return;
    UI.toggle('crafting');
  });
})(window.RPG);

// The mouse wheel always scrolls the menu section under the cursor (every menu, every screen size).
(function () {
  document.addEventListener('wheel', (e) => {
    const modal = e.target && e.target.closest && e.target.closest('#modal');
    if (!modal) return;
    for (let el = e.target; el && el !== modal.parentElement; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        const before = el.scrollTop;
        el.scrollTop += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
        if (el.scrollTop !== before) { e.preventDefault(); return; }
      }
    }
  }, { passive: false });
})();
