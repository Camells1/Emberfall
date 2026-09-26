'use strict';
// DOM user interface. The #ui layer is a fixed 1280x720 box scaled to cover the game canvas,
// so all sizes in styles.css are in "UI pixels" (2 per game pixel).
//
// Public API (used by gameplay code):
//   UI.toast(msg, kind)          kind: 'good' | 'bad' | undefined
//   UI.lootToast(item, qty)
//   UI.banner(title, sub)        big centred banner (quest complete, victory)
//   UI.zoneBanner(name, sub)
//   UI.questProgress(text, done)
//   UI.bossBar(enemy | null)
//   UI.dialog(lines, onDone)     lines: string | {speaker, text, portrait?, choices?:[{text, fn?, next?:lines}], action?}
//   UI.talk(npc)                 full NPC conversation (quests + shop + lines)
//   UI.open(screen, arg) / UI.close() / UI.blocking()
//   UI.screens[name] = {build(el, arg), update?(dt), close?(), pause?: bool}   (see ui/screens.js)
(function (R) {
  const U = R.U, G = R.G;
  const UI = R.UI = { screens: {}, current: null, pointerOverUI: false, dialogOpen: false };
  const $ = (sel, root) => (root || document).querySelector(sel);
  UI.$ = $;

  UI.el = function (tag, cls, html, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  // A scaled copy of a pixel canvas, as a DOM canvas element.
  UI.pix = function (src, scale, cls) {
    const c = document.createElement('canvas');
    c.width = src.width * scale; c.height = src.height * scale;
    c.className = 'pix ' + (cls || '');
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  };
  UI.itemIcon = (it, scale) => UI.pix(R.Icons.item(it), scale || 2, 'icon');
  UI.rarityColor = (it) => (G.RARITY[it.rarity] || G.RARITY.common).color;

  // ---- layout ------------------------------------------------------------------
  UI.init = function () {
    UI.root = $('#ui');
    UI.root.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-tl">
          <div class="hud-portrait"><canvas id="hud-face" width="48" height="44"></canvas><div class="hud-lv" id="hud-lv">1</div></div>
          <div class="hud-bars">
            <div class="hud-name" id="hud-name"></div>
            <div class="bar hp"><div class="fill" id="hp-fill"></div><div class="ghost" id="hp-ghost"></div><span id="hp-txt"></span></div>
            <div class="bar mp"><div class="fill" id="mp-fill"></div><span id="mp-txt"></span></div>
            <div class="bar st" id="st-bar"><div class="fill" id="st-fill"></div></div>
            <div class="bar xp"><div class="fill" id="xp-fill"></div></div>
          </div>
        </div>
        <div class="hud-buffs" id="hud-buffs"></div>
        <div class="party" id="party"></div>
        <div class="hud-tr">
          <div class="minimap"><canvas id="minimap" width="160" height="120"></canvas><div class="mm-name" id="mm-name"></div></div>
          <div class="hud-gold"><span class="coin"></span><span id="hud-gold">0</span></div>
        </div>
        <div class="tracker" id="tracker"></div>
        <div class="skillbar" id="skillbar"></div>
        <div class="hud-points hidden" id="hud-points"></div>
        <div class="bossbar hidden" id="bossbar"><div class="boss-name" id="boss-name"></div><div class="bar boss"><div class="fill" id="boss-fill"></div><div class="ghost" id="boss-ghost"></div><div class="shield" id="boss-shield"></div><span id="boss-phase"></span></div><div class="boss-title" id="boss-title"></div></div>
      </div>
      <div id="bubbles"></div>
      <div id="toasts"></div>
      <div id="loot"></div>
      <div id="banner" class="hidden"><div class="b-title"></div><div class="b-sub"></div></div>
      <div id="zone" class="hidden"><div class="z-name"></div><div class="z-sub"></div></div>
      <div id="dialog" class="hidden"><div class="d-portrait"></div><div class="d-body"><div class="d-speaker"></div><div class="d-text"></div><div class="d-choices"></div><div class="d-next">▼</div></div></div>
      <div id="modal" class="hidden"></div>
      <div id="tooltip" class="hidden"></div>
      <div id="fps" class="hidden"></div>`;
    // The #ui root ignores the mouse (pointer-events: none); only real widgets catch it,
    // so clicks on the game canvas never leak through menus.
    document.addEventListener('mousemove', (e) => {
      UI.mx = e.clientX; UI.my = e.clientY;
      if (!UI.tipEl.classList.contains('hidden')) UI.placeTip();
    });
    UI.tipEl = $('#tooltip');
    // quest panel: click a quest to follow it with the arrow, click the header to open the log (right-click: collapse)
    $('#tracker').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const q = e.target.closest('[data-q]');
      if (q) { R.QuestLog.tracked = q.dataset.q; if (R.Guide) R.Guide.t = 0; R.Audio.play('click'); return; }
      if (e.target.closest('[data-open]')) { if (e.button === 2) UI.trackerMin = !UI.trackerMin; else UI.open('quests'); }
    });
    $('#tracker').addEventListener('contextmenu', (e) => e.preventDefault());
    // dialog click to advance
    $('#dialog').addEventListener('mousedown', (e) => { if (!e.target.closest('.d-choice')) UI.dialogAdvance(); });
    // Buttons must never keep keyboard focus: Space (dodge) or Enter would "click" them again
    // after the menu is gone or while you play.
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); }, true);
    // clicking anywhere in the game world takes focus away from menus / inputs
    $('#game').addEventListener('mousedown', () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    UI.layout();
    window.addEventListener('resize', UI.layout);
  };

  UI.layout = function () {
    const cv = $('#game');
    const r = cv.getBoundingClientRect();
    const k = r.width / 1280;
    UI.scale = k;
    UI.root.style.transform = `scale(${k})`;
    UI.root.style.left = r.left + 'px';
    UI.root.style.top = r.top + 'px';
  };

  // ---- modal screens -----------------------------------------------------------
  UI.blocking = () => !!UI.current || UI.dialogOpen;
  // (in co-op the world never pauses: your friends are still playing)
  UI.pausesGame = () => !(R.Net && R.Net.active()) && ((UI.current && UI.screens[UI.current] && UI.screens[UI.current].pause !== false) || UI.dialogOpen);
  UI.open = function (name, arg) {
    const s = UI.screens[name];
    if (!s) { console.warn('no screen', name); return; }
    if (UI.current) UI.close(true);
    UI.hideTip();
    const m = $('#modal');
    m.innerHTML = '';
    m.className = 'screen-' + name;
    UI.current = name;
    UI.currentArg = arg;
    s.build(m, arg);
    R.Audio.play('open');
  };
  UI.refresh = function () {
    if (!UI.current) return;
    const n = UI.current, a = UI.currentArg; const s = UI.screens[n]; const m = $('#modal');
    const scroll = [...m.querySelectorAll('.scroll')].map((e) => e.scrollTop);
    const focusIdx = UI.navIndex();
    UI.hideTip(); // the element under the mouse is about to be replaced
    m.classList.add('refreshed'); // don't replay the pop-in animation on every click
    m.innerHTML = ''; s.build(m, a);
    [...m.querySelectorAll('.scroll')].forEach((e, i) => { e.scrollTop = scroll[i] || 0; });
    if (focusIdx >= 0) { const items = UI.navItems(); UI.navFocus(items[Math.min(focusIdx, items.length - 1)], true); }
    // re-show the tooltip for whatever is now under the mouse
    const under = UI.mx != null ? document.elementFromPoint(UI.mx, UI.my) : null;
    if (under && m.contains(under)) { const t = under.closest('[data-tip]'); if (t && t._tip) UI.tip(t._tip()); }
  };
  // Escape / B button: go back to the screen we came from, or close.
  UI.back = function () {
    if (!UI.current) return;
    const s = UI.screens[UI.current];
    if (s && s.back) { s.back(); return; }
    const b = UI.currentArg && UI.currentArg.back;
    if (b) UI.open(b);
    else if (R.state !== 'play') UI.open('title');
    else UI.close();
  };
  UI.close = function (silent) {
    if (!UI.current) return;
    const s = UI.screens[UI.current];
    if (s && s.close) s.close();
    UI.current = null;
    $('#modal').className = 'hidden';
    $('#modal').innerHTML = '';
    UI.hideTip();
    UI.pointerOverUI = false;
    if (!silent) R.Audio.play('close');
  };
  UI.toggle = function (name) { if (UI.current === name) UI.close(); else if (!UI.dialogOpen) UI.open(name); };

  // A standard framed window with a title and close button.
  UI.frame = function (parent, title, cls) {
    const f = UI.el('div', 'frame ' + (cls || ''), null, parent);
    const h = UI.el('div', 'frame-title', `<span>${U.esc(title)}</span>`, f);
    const x = UI.el('button', 'x', '✕', h);
    x.onclick = () => UI.close();
    return UI.el('div', 'frame-body', null, f);
  };
  UI.button = function (parent, label, fn, cls) {
    const b = UI.el('button', 'btn ' + (cls || ''), label, parent);
    b.onclick = (e) => { e.stopPropagation(); b.blur(); R.Audio.play('click'); fn(e); };
    return b;
  };

  // ---- tooltips ------------------------------------------------------------------
  UI.tip = function (html) { UI.tipEl.innerHTML = html; UI.tipEl.classList.remove('hidden'); UI.placeTip(); };
  UI.hideTip = function () { if (UI.tipEl) UI.tipEl.classList.add('hidden'); };
  UI.placeTip = function () {
    const k = UI.scale || 1, r = UI.root.getBoundingClientRect();
    let x = (UI.mx - r.left) / k + 18, y = (UI.my - r.top) / k + 12;
    const w = UI.tipEl.offsetWidth, h = UI.tipEl.offsetHeight;
    if (x + w > 1270) x = (UI.mx - r.left) / k - w - 14;
    if (y + h > 710) y = 710 - h;
    UI.tipEl.style.left = Math.max(4, x) + 'px'; UI.tipEl.style.top = Math.max(4, y) + 'px';
  };
  UI.bindTip = function (el, fn) {
    el._tip = typeof fn === 'function' ? fn : () => fn;
    el.dataset.tip = '1';
    el.addEventListener('mouseenter', () => UI.tip(el._tip()));
    el.addEventListener('mouseleave', UI.hideTip);
  };

  // ---- keyboard / gamepad menu navigation ------------------------------------------------
  // Arrow keys (or D-pad / left stick) move a highlight between clickable things in the open
  // menu; Enter/Space (or A) clicks it; Escape (or B) goes back.
  const NAV_SEL = 'button:not(.disabled):not(.x), .bag-slot:not(.empty), .eq-slot, .shop-row, .ql-item, .cc-class, .cc-race, .sw, .tab, input[type=range], input.cc-name';
  UI.navItems = function () {
    let root = null;
    if (UI.dialogOpen) root = $('#dialog .d-choices');
    else if (UI.current) root = $('#modal');
    if (!root) return [];
    return [...root.querySelectorAll(UI.dialogOpen ? '.d-choice' : NAV_SEL)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  };
  UI.navIndex = function () { return UI.navItems().findIndex((e) => e.classList.contains('kfocus')); };
  UI.navFocus = function (el, quiet) {
    document.querySelectorAll('.kfocus').forEach((e) => e.classList.remove('kfocus'));
    if (!el) return;
    el.classList.add('kfocus');
    el.scrollIntoView({ block: 'nearest' });
    if (el._tip) { const r = el.getBoundingClientRect(); UI.mx = r.right; UI.my = r.top + r.height / 2; UI.tip(el._tip()); } else UI.hideTip();
    if (!quiet) R.Audio.play('talk', { pitch: 1.6 });
  };
  // dir: 'up' | 'down' | 'left' | 'right'
  UI.nav = function (dir) {
    const items = UI.navItems();
    if (!items.length) return false;
    const cur = items.find((e) => e.classList.contains('kfocus'));
    if (!cur) { UI.navFocus(items[0]); return true; }
    if (cur.tagName === 'INPUT' && cur.type === 'range' && (dir === 'left' || dir === 'right')) {
      cur.value = Math.max(0, Math.min(1, +cur.value + (dir === 'left' ? -0.05 : 0.05))); if (cur.oninput) cur.oninput(); return true;
    }
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    let best = null, bs = 1e9;
    for (const e of items) {
      if (e === cur) continue;
      const r = e.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const dx = ex - cx, dy = ey - cy;
      const along = dx * vx + dy * vy;
      if (along <= 2) continue;
      const across = Math.abs(dx * vy) + Math.abs(dy * vx);
      const score = along + across * 2.5;
      if (score < bs) { bs = score; best = e; }
    }
    if (!best && (dir === 'down' || dir === 'up')) { // wrap around lists
      const i = items.indexOf(cur);
      best = items[(i + (dir === 'down' ? 1 : -1) + items.length) % items.length];
    }
    if (best) UI.navFocus(best);
    return true;
  };
  UI.navActivate = function () {
    const cur = UI.navItems().find((e) => e.classList.contains('kfocus'));
    if (!cur) return false;
    if (cur.tagName === 'INPUT' && cur.type !== 'range') { cur.focus(); return true; }
    cur.click();
    return true;
  };
  // Right-click equivalent for the focused element (drop / sell all).
  UI.navAlt = function () {
    const cur = UI.navItems().find((e) => e.classList.contains('kfocus'));
    if (cur && cur.oncontextmenu) { cur.oncontextmenu({ preventDefault() {}, shiftKey: true }); return true; }
    return false;
  };
  document.addEventListener('mousemove', () => { const k = document.querySelectorAll('.kfocus'); if (k.length) k.forEach((e) => e.classList.remove('kfocus')); }, { passive: true });

  const STAT_NAMES = { hp: 'Max HP', mp: 'Max MP', atk: 'Attack', mag: 'Magic', def: 'Defense', crit: 'Crit %', spd: 'Move Speed', hpRegen: 'HP Regen', mpRegen: 'MP Regen', str: 'Strength', dex: 'Dexterity', int: 'Intellect', vit: 'Vitality', lifesteal: 'Lifesteal', dodge: 'Dodge %', critDmg: 'Crit Damage', cdr: 'Cooldown Reduction', atkSpd: 'Attack Speed' };
  UI.STAT_NAMES = STAT_NAMES;
  const pctStats = ['spd', 'lifesteal', 'critDmg', 'cdr', 'atkSpd'];
  UI.fmtStat = (k, v) => (pctStats.includes(k) ? (v > 0 ? '+' : '') + Math.round(v * 100) + '%' : (v > 0 ? '+' : '') + (Math.round(v * 10) / 10));

  // Item tooltip HTML, with comparison against what's equipped.
  UI.itemTip = function (it, opts) {
    opts = opts || {};
    const p = R.World.player;
    const col = UI.rarityColor(it);
    let h = `<div class="tt-name" style="color:${col}">${U.esc(it.name)}</div>`;
    const rar = (G.RARITY[it.rarity] || G.RARITY.common).name;
    let kind = R.SLOT_NAMES[it.slot] || it.slot;
    if (it.slot === 'weapon') kind = (R.WeaponTypes[it.type] || {}).name || 'Weapon';
    h += `<div class="tt-sub">${rar} ${kind}${it.level > 1 ? ` · Level ${it.level}` : ''}</div>`;
    const eq = p && R.SLOTS.includes(it.slot) ? R.Items[p.equip[it.slot]] : null;
    const cmp = eq && eq !== it && !opts.equipped;
    if (it.dmg) {
      const diff = cmp && eq.dmg ? it.dmg - eq.dmg : 0;
      h += `<div class="tt-big">${it.dmg} <small>${R.WeaponTypes[it.type] && R.WeaponTypes[it.type].kind === 'magic' ? 'Magic' : ''} Damage</small>${diff ? ` <span class="${diff > 0 ? 'up' : 'down'}">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}</div>`;
      const wt = R.WeaponTypes[it.type];
      if (wt) h += `<div class="tt-line dim">${(1 / wt.cd).toFixed(1)} attacks/s · ${wt.twoHanded ? 'Two-handed' : 'One-handed'}</div>`;
    }
    const keys = new Set(Object.keys(it.stats || {}).concat(cmp ? Object.keys(eq.stats || {}) : []));
    for (const k of keys) {
      const v = (it.stats && it.stats[k]) || 0;
      const d = cmp ? v - ((eq.stats && eq.stats[k]) || 0) : 0;
      if (!v && !d) continue;
      h += `<div class="tt-line">${v ? `<b>${UI.fmtStat(k, v)}</b> ${STAT_NAMES[k] || k}` : `<span class="dim">${STAT_NAMES[k] || k}</span>`}${d ? ` <span class="${d > 0 ? 'up' : 'down'}">(${UI.fmtStat(k, d)})</span>` : ''}</div>`;
    }
    if (opts.ench && R.Crafting) h += R.Crafting.tipHTML(opts.ench, it);
    if (it.effect) {
      const e = it.effect, fx = [];
      if (e.burn) fx.push(`Burns for ${e.burn}/s`); if (e.poison) fx.push(`Poisons for ${e.poison}/s`); if (e.freeze) fx.push('Chance to freeze'); if (e.slow) fx.push('Slows enemies');
      if (e.shock) fx.push('Hits arc lightning to a nearby enemy'); if (e.pierce) fx.push(`Pierces ${e.pierce} enemies`); if (e.multishot) fx.push(`Fires ${e.multishot} projectiles`);
      if (e.explode) fx.push('Projectiles explode'); if (e.homing) fx.push('Seeks targets'); if (e.element && e.element !== 'arcane') fx.push(`${e.element[0].toUpperCase() + e.element.slice(1)} element`);
      if (e.text) fx.push(e.text);
      for (const f of fx) h += `<div class="tt-line fx">✦ ${U.esc(f)}</div>`;
    }
    if (it.set && R.ItemSets[it.set]) {
      const s = R.ItemSets[it.set];
      const have = p ? R.SLOTS.filter((sl) => { const e = R.Items[p.equip[sl]]; return e && e.set === it.set; }).length : 0;
      h += `<div class="tt-set">${U.esc(s.name)} (${have}/${s.pieces || '?'})</div>`;
      for (const n in s.bonus) h += `<div class="tt-line ${have >= +n ? 'fx' : 'dim'}">(${n}) ${Object.entries(s.bonus[n]).map(([k, v]) => UI.fmtStat(k, v) + ' ' + (STAT_NAMES[k] || k)).join(', ')}</div>`;
    }
    if (it.use) {
      const u = it.use, parts = [];
      if (u.heal) parts.push(`Restores ${u.heal} HP`); if (u.mana) parts.push(`Restores ${u.mana} MP`);
      if (u.buff) parts.push(`+${u.buff.mult ? Math.round(u.buff.amt * 100) + '%' : u.buff.amt} ${STAT_NAMES[u.buff.stat] || u.buff.stat} for ${u.buff.dur}s`);
      if (u.cure) parts.push('Cures ailments'); if (u.teleport) parts.push('Returns you to Havenbrook'); if (u.xp) parts.push(`Grants ${u.xp} XP`);
      h += `<div class="tt-line fx">Use: ${parts.join(', ')}</div>`;
    }
    if (it.desc) h += `<div class="tt-desc">${U.esc(it.desc)}</div>`;
    if (p) { const why = R.SLOTS.includes(it.slot) ? p.equipReason(it) : ''; if (why) h += `<div class="tt-line down">${U.esc(why)}</div>`; }
    if (opts.price != null) h += `<div class="tt-price">${opts.priceLabel || 'Price'}: <span class="coin"></span>${opts.price}</div>`;
    else if (it.price) h += `<div class="tt-price dim">Sells for <span class="coin"></span>${UI.sellPrice(it)}</div>`;
    if (opts.hint) h += `<div class="tt-hint">${opts.hint}</div>`;
    return h;
  };
  UI.sellPrice = (it) => Math.max(1, Math.floor((it.price || 0) * 0.35));

  // ---- toasts & banners -----------------------------------------------------------
  UI.toast = function (msg, kind) {
    const box = $('#toasts');
    if (!box) return;
    // de-dupe identical toasts
    const last = box.lastElementChild;
    if (last && last.dataset.msg === msg) { last.dataset.t = Date.now(); return; }
    const t = UI.el('div', 'toast ' + (kind || ''), U.esc(msg), box);
    t.dataset.msg = msg;
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
    while (box.children.length > 4) box.firstElementChild.remove();
  };
  UI.lootToast = function (it, qty) {
    if (!it) return;
    const box = $('#loot');
    const t = UI.el('div', 'loot-row', null, box);
    t.appendChild(UI.itemIcon(it, 2));
    UI.el('span', null, `<b style="color:${UI.rarityColor(it)}">${U.esc(it.name)}</b>${qty > 1 ? ' ×' + qty : ''}`, t);
    setTimeout(() => t.classList.add('out'), 3500);
    setTimeout(() => t.remove(), 4000);
    while (box.children.length > 6) box.firstElementChild.remove();
  };
  let bannerTimer = null;
  UI.banner = function (title, sub) {
    const b = $('#banner');
    b.querySelector('.b-title').textContent = title;
    b.querySelector('.b-sub').textContent = sub || '';
    b.classList.remove('hidden'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.add('hidden'), 3600);
  };
  let zoneTimer = null;
  UI.zoneBanner = function (name, sub) {
    const z = $('#zone');
    if (!z) return;
    z.querySelector('.z-name').textContent = name;
    z.querySelector('.z-sub').textContent = sub || '';
    z.classList.remove('hidden'); z.classList.remove('show'); void z.offsetWidth; z.classList.add('show');
    clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => z.classList.add('hidden'), 3200);
  };
  UI.questProgress = function (text, done) { UI.toast((done ? '✔ ' : '') + text, done ? 'good' : 'quest'); };

  // ---- boss bar -----------------------------------------------------------------------
  UI.bossBar = function (e) {
    UI.boss = e;
    const b = $('#bossbar');
    if (!e) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    $('#boss-name').textContent = e.def.name + (e.tier > 1 ? '  ·  Tier ' + e.tier : '');
    const dif = R.Difficulty ? R.Difficulty.cur() : null;
    $('#boss-title').textContent = (e.def.title || '') + (dif && dif.id !== 'normal' ? '  ·  ' + dif.name : '') + '  ·  Level ' + e.level;
    UI.bossGhost = 1;
  };

  // ---- dialogue ------------------------------------------------------------------------
  let dq = [], dDone = null, typing = null, typeT = 0, fullText = '', shown = 0, curLine = null;
  UI.dialog = function (lines, onDone) {
    dq = lines.slice();
    dDone = onDone || null;
    UI.dialogOpen = true;
    $('#dialog').classList.remove('hidden');
    UI.hideTip();
    nextLine();
  };
  function nextLine() {
    // run pure action entries
    while (dq.length && dq[0] && dq[0].action && !dq[0].text) { const a = dq.shift(); try { a.action(); } catch (e) { console.error(e); } }
    if (!dq.length) { endDialog(); return; }
    let l = dq.shift();
    if (typeof l === 'string') l = { text: l };
    if (typeof l === 'function') { l = l(); if (!l) return nextLine(); if (typeof l === 'string') l = { text: l }; }
    curLine = l;
    if (l.action) try { l.action(); } catch (e) { console.error(e); }
    const d = $('#dialog');
    d.querySelector('.d-speaker').textContent = l.speaker || UI.dSpeaker || '';
    const port = d.querySelector('.d-portrait');
    port.innerHTML = '';
    const P = l.portrait !== undefined ? l.portrait : UI.dPortrait;
    if (P) port.appendChild(UI.pix(P, 4)); else port.classList.add('empty');
    port.classList.toggle('empty', !P);
    fullText = l.text || ''; shown = 0; typeT = 0;
    d.querySelector('.d-text').textContent = '';
    d.querySelector('.d-choices').innerHTML = '';
    d.querySelector('.d-next').classList.add('hidden');
    typing = true;
  }
  function showChoices(l) {
    const box = $('#dialog .d-choices');
    box.innerHTML = '';
    if (l.choices) {
      l.choices.filter((c) => !c.hidden).forEach((c, i) => {
        const b = UI.el('button', 'd-choice' + (c.cls ? ' ' + c.cls : ''), `<span class="num">${i + 1}</span> ${U.esc(c.text)}`, box);
        b.onclick = (e) => { e.stopPropagation(); pickChoice(c); };
      });
      UI.choiceSel = 0;
      if (R.Input.usingPad) UI.navFocus(box.querySelector('.d-choice'), true);
    } else $('#dialog .d-next').classList.remove('hidden');
  }
  function pickChoice(c) {
    R.Audio.play('click');
    const nxt = c.next ? (typeof c.next === 'function' ? c.next() : c.next) : null;
    if (nxt) dq = nxt.concat(dq);
    if (c.fn) {
      const ret = c.fn();
      if (ret === 'close') { dq = []; endDialog(true); return; }
    }
    if (c.end) { dq = []; endDialog(); return; }
    nextLine();
  }
  UI.dialogAdvance = function () {
    if (!UI.dialogOpen) return;
    if (typing) { shown = fullText.length; return; }
    if (curLine && curLine.choices) return;
    nextLine();
  };
  UI.dialogKey = function (code) {
    if (!UI.dialogOpen) return false;
    if (curLine && curLine.choices && !typing) {
      const n = parseInt(code.replace('Digit', '').replace('Numpad', ''), 10);
      const vis = curLine.choices.filter((c) => !c.hidden);
      if (n >= 1 && n <= vis.length) { pickChoice(vis[n - 1]); return true; }
      if (code === 'Escape') { const last = vis[vis.length - 1]; pickChoice(last); return true; }
      if (code === 'ArrowUp' || code === 'KeyW') { UI.nav('up'); return true; }
      if (code === 'ArrowDown' || code === 'KeyS') { UI.nav('down'); return true; }
      if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'KeyF') { if (UI.navIndex() < 0) UI.nav('down'); else UI.navActivate(); return true; }
      return false;
    }
    if (['Space', 'Enter', 'KeyE', 'KeyF', 'mouse0'].includes(code)) { UI.dialogAdvance(); return true; }
    if (code === 'Escape') { dq = []; if (typing) typing = false; endDialog(); return true; }
    return false;
  };
  function endDialog(skipCb) {
    UI.dialogOpen = false;
    curLine = null;
    UI.dSpeaker = null; UI.dPortrait = null;
    $('#dialog').classList.add('hidden');
    const cb = dDone; dDone = null;
    if (cb && !skipCb) cb();
  }
  // Close any open dialogue without running its callback (loading a save, returning to title).
  UI.clearDialog = function () { if (UI.dialogOpen) { dq = []; typing = false; endDialog(true); } };
  UI.updateDialog = function (dt) {
    if (!UI.dialogOpen || !typing) return;
    typeT += dt;
    const before = shown;
    shown = Math.min(fullText.length, shown + dt * 60);
    if (Math.floor(shown / 3) > Math.floor(before / 3) && fullText[Math.floor(shown)] !== ' ') R.Audio.play('talk');
    $('#dialog .d-text').textContent = fullText.slice(0, Math.floor(shown));
    if (shown >= fullText.length) { typing = false; $('#dialog .d-text').textContent = fullText; showChoices(curLine); }
  };

  // ---- NPC conversation --------------------------------------------------------------
  // Builds the full conversation for an NPC: talk objectives, quest turn-ins, offers, then default lines.
  UI.talk = function (npc) {
    const def = npc.def;
    const QL = R.QuestLog;
    UI.dSpeaker = def.name;
    UI.dPortrait = def.appearance ? R.Character.portrait(def.appearance, def.gear || {}) : null;
    const L = [];
    const say = (t) => (typeof t === 'string' ? { speaker: def.name, text: t } : Object.assign({ speaker: def.name }, t));
    // 1. talk objectives
    for (const l of QL.onTalk(def.id)) L.push(l.action && !l.text ? l : say(l));
    // 2. turn-ins
    for (const q of QL.turnIns(def.id)) {
      const d = q.dialog || {};
      for (const t of d.complete || ['Well done!']) L.push(say(t));
      L.push({ action: () => QL.complete(q.id) });
    }
    // 3. custom talk
    const helper = UI.dialogHelper(npc);
    let custom = def.talk ? def.talk(helper) : null;
    if (custom) for (const t of custom) L.push(typeof t === 'function' || t.action ? t : say(t));
    // 4. offers
    const offers = QL.offers(def.id);
    const q = offers[0];
    if (q && !custom) {
      const d = q.dialog || {};
      const offer = (d.offer || [q.desc]).map(say);
      const last = offer.pop();
      last.choices = [
        { text: `Accept: ${q.name}`, cls: 'accept', fn: () => { QL.start(q.id); }, next: d.accept ? [say(d.accept)] : null },
        { text: 'Not right now.', next: d.decline ? [say(d.decline)] : null },
      ];
      offer.forEach((o) => L.push(o));
      L.push(last);
    } else if (!custom && !L.length) {
      // 5. progress or idle lines
      const prog = QL.inProgress(def.id);
      if (prog.length && prog[0].dialog && prog[0].dialog.progress) for (const t of prog[0].dialog.progress) L.push(say(t));
      else if (def.lines && def.lines.length) L.push(say(U.choose(def.lines)));
      else L.push(say('...'));
    }
    // 6. services menu
    const choices = [];
    if (def.shop) choices.push({ text: 'Let me see your wares.', fn: () => { R.World.later(0, () => UI.open('shop', npc)); return 'close'; } });
    if (def.services) for (const s of def.services) {
      if (s === 'inn') choices.push({ text: 'Rent a room (20 gold) — restore HP/MP', fn: () => UI.innRest() });
      if (s === 'respec') choices.push({ text: 'Reset my attribute points (100 gold)', fn: () => UI.respec() });
      if (s === 'style') choices.push({ text: 'I\'d like a new look. (30 gold)', fn: () => { R.World.later(0, () => UI.open('wardrobe')); return 'close'; } });
    }
    if (def.extraChoices) for (const c of def.extraChoices(helper)) choices.push(c);
    if (choices.length) {
      choices.push({ text: 'Goodbye.', end: true });
      L.push({ speaker: def.name, text: def.serviceLine || 'Anything else?', choices });
    }
    UI.dialog(L);
  };
  UI.innRest = function () {
    const p = R.World.player;
    if (p.gold < 20) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
    p.gold -= 20; p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    R.World.fade = 1; R.World.fadeDir = -1;
    R.Audio.play('heal'); UI.toast('You feel well rested.', 'good');
  };
  UI.respec = function () {
    const p = R.World.player;
    if (p.gold < 100) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
    p.gold -= 100;
    let n = 0; for (const k in p.attrs) { n += p.attrs[k]; p.attrs[k] = 0; }
    p.attrPoints += n; p.recalc();
    UI.toast('Attributes reset. ' + p.attrPoints + ' points to spend.', 'good');
  };
  // Helper object passed to NPC talk(Q) functions.
  UI.dialogHelper = function (npc) {
    const QL = R.QuestLog;
    return {
      npc, player: R.World.player, flags: R.World.flags,
      status: QL.status, active: QL.isActive, done: QL.isDone, start: (id) => QL.start(id), complete: (id) => QL.complete(id),
      flag: (f) => !!R.World.flags[f], setFlag: (f) => QL.setFlag(f), give: (id, n) => { R.World.player.addItem(id, n || 1); UI.lootToast(R.Items[id], n || 1); },
      take: (id, n) => R.World.player.removeItem(id, n || 1), has: (id, n) => R.World.player.count(id) >= (n || 1),
      gold: (n) => { R.World.player.gold += n; }, xp: (n) => R.World.player.gainXp(n), shop: () => UI.open('shop', npc),
      level: () => R.World.player.level, cls: () => R.World.player.cls,
    };
  };

  // ---- HUD -------------------------------------------------------------------------------
  const cache = {};
  function set(id, prop, val) {
    const k = id + prop;
    if (cache[k] === val) return;
    cache[k] = val;
    const e = document.getElementById(id);
    if (!e) return;
    if (prop === 'text') e.textContent = val; else if (prop === 'html') e.innerHTML = val; else e.style[prop] = val;
  }
  UI.showHUD = (on) => $('#hud').classList.toggle('hidden', !on);
  UI.resetHUD = function () { for (const k in cache) delete cache[k]; UI.buildSkillbar(); UI.drawFace(); };
  UI.drawFace = function () {
    const p = R.World.player; if (!p) return;
    const c = $('#hud-face'); const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 48, 44);
    ctx.drawImage(R.Character.portrait(p.appearance, p.gear()), 0, 0, 48, 44);
  };
  UI.buildSkillbar = function () {
    const p = R.World.player;
    const bar = $('#skillbar');
    bar.innerHTML = '';
    const sk = p.skills();
    sk.forEach((id, i) => {
      const s = R.Skills[id];
      const slot = UI.el('div', 'slot skill', null, bar);
      slot.id = 'sk' + i;
      if (s) slot.appendChild(UI.pix(R.Icons.skill(s), 3));
      UI.el('div', 'cd', null, slot).id = 'skcd' + i;
      UI.el('div', 'lock', '🔒', slot).id = 'sklock' + i;
      UI.el('div', 'key', R.Input.keyName(R.Input.bindings['skill' + (i + 1)][0]), slot);
      slot.onclick = () => p.castSkill(i);
      UI.bindTip(slot, () => {
        const lv = p.skillLevel(id);
        const mp = typeof s.mp === 'function' ? s.mp(Math.max(1, lv)) : s.mp;
        const cd = typeof s.cd === 'function' ? s.cd(Math.max(1, lv)) : s.cd;
        return `<div class="tt-name" style="color:${s.icon.color}">${U.esc(s.name)}</div><div class="tt-sub">${lv ? 'Rank ' + lv + '/' + s.maxLv : 'Unlocks at level ' + R.SKILL_UNLOCK[i]}</div><div class="tt-line">${mp} MP · ${cd.toFixed(1)}s cooldown</div><div class="tt-desc">${U.esc(s.desc(Math.max(1, lv)))}</div>`;
      });
    });
    UI.el('div', 'sep', null, bar);
    for (const [kind, key, label] of [['heal', 'potion', 'HP'], ['mana', 'manapotion', 'MP']]) {
      const slot = UI.el('div', 'slot potion ' + kind, null, bar);
      slot.id = 'pot-' + kind;
      UI.el('div', 'picon', null, slot).id = 'poticon-' + kind;
      UI.el('div', 'count', '0', slot).id = 'potn-' + kind;
      UI.el('div', 'key', R.Input.keyName(R.Input.bindings[key][0]), slot);
      slot.onclick = () => p.quickPotion(kind);
      UI.bindTip(slot, `<div class="tt-name">${label} Potion</div><div class="tt-desc">Drinks your strongest ${label === 'HP' ? 'health' : 'mana'} potion.</div>`);
    }
    const dodge = UI.el('div', 'slot dodge', '<div class="dodge-ico">»</div>', bar);
    UI.el('div', 'cd', null, dodge).id = 'dodgecd';
    UI.el('div', 'key', 'SPC', dodge);
    UI.bindTip(dodge, '<div class="tt-name">Dodge Roll</div><div class="tt-desc">Roll through danger. You are invulnerable while rolling.</div>');
  };

  let hpGhost = 1, lastPot = {};
  UI.updateHUD = function (dt) {
    const p = R.World.player;
    if (!p) return;
    const s = p.stats;
    const hpf = Math.max(0, p.hp / s.maxHp);
    set('hp-fill', 'width', (hpf * 100).toFixed(1) + '%');
    hpGhost = hpGhost > hpf ? Math.max(hpf, hpGhost - dt * 0.5) : hpf;
    set('hp-ghost', 'width', (hpGhost * 100).toFixed(1) + '%');
    set('hp-txt', 'text', Math.ceil(p.hp) + ' / ' + s.maxHp);
    set('mp-fill', 'width', (p.mp / s.maxMp * 100).toFixed(1) + '%');
    const maxSt = p.maxStamina ? p.maxStamina() : 100;
    set('st-fill', 'width', (Math.max(0, p.stamina) / maxSt * 100).toFixed(1) + '%');
    if (UI.staminaFlash > 0) UI.staminaFlash -= dt;
    const stb = document.getElementById('st-bar');
    if (stb) { stb.classList.toggle('tired', !!p.tired || UI.staminaFlash > 0); stb.classList.toggle('full', p.stamina >= maxSt); }
    set('mp-txt', 'text', Math.floor(p.mp) + ' / ' + s.maxMp);
    const need = R.xpForLevel(p.level);
    set('xp-fill', 'width', (p.level >= R.MAX_LEVEL ? 100 : p.xp / need * 100).toFixed(1) + '%');
    set('hud-lv', 'text', String(p.level));
    set('hud-name', 'text', p.name);
    set('hud-gold', 'text', U.fmt(p.gold));
    const pts = [];
    if (p.attrPoints) pts.push(`<span>+${p.attrPoints} attribute (C)</span>`);
    if (p.skillPoints) pts.push(`<span>+${p.skillPoints} skill (K)</span>`);
    set('hud-points', 'html', pts.join(''));
    $('#hud-points').classList.toggle('hidden', !pts.length);
    // skills
    const sk = p.skills();
    sk.forEach((id, i) => {
      const lv = p.skillLevel(id);
      const cd = p.skillCd[id] || 0, max = (p.skillCdMax && p.skillCdMax[id]) || 1;
      set('skcd' + i, 'height', cd > 0 ? (cd / max * 100).toFixed(1) + '%' : '0%');
      set('sklock' + i, 'display', lv ? 'none' : 'flex');
      const s = R.Skills[id];
      const cost = s ? (typeof s.mp === 'function' ? s.mp(Math.max(1, lv)) : s.mp) : 0;
      const el = document.getElementById('sk' + i);
      if (el) { el.classList.toggle('nomana', lv > 0 && p.mp < cost); el.classList.toggle('ready', lv > 0 && cd <= 0 && p.mp >= cost); }
    });
    set('dodgecd', 'height', p.rollCd > 0 ? (p.rollCd / 0.65 * 100).toFixed(1) + '%' : '0%');
    for (const kind of ['heal', 'mana']) {
      let n = 0, best = null;
      for (const st of p.inv) { const it = R.Items[st.id]; if (it && it.use && it.use[kind]) { n += st.qty; if (!best || it.use[kind] > best.use[kind]) best = it; } }
      set('potn-' + kind, 'text', String(n));
      const bid = best ? best.id : '';
      if (lastPot[kind] !== bid) { lastPot[kind] = bid; const ic = $('#poticon-' + kind); ic.innerHTML = ''; if (best) ic.appendChild(UI.itemIcon(best, 3)); }
      const el = document.getElementById('pot-' + kind);
      if (el) el.classList.toggle('empty', !n);
    }
    // buffs
    const bh = p.buffs.map((b) => `<div class="buff" title="${U.esc(b.name)}">${U.esc(b.name.slice(0, 1))}<small>${Math.ceil(b.t)}</small></div>`).join('') +
      Object.keys(p.status || {}).map((k) => `<div class="buff bad" title="${k}">${k.slice(0, 1).toUpperCase()}<small>${Math.ceil(p.status[k].t)}</small></div>`).join('') +
      (p.shield > 0 ? `<div class="buff shield">◈<small>${Math.ceil(p.shield)}</small></div>` : '');
    set('hud-buffs', 'html', bh);
    // quest panel: every active quest; the tracked one (followed by the arrow) is expanded
    const QL = R.QuestLog;
    const act = QL.activeList();
    const tracked = QL.tracked && act.includes(QL.tracked) ? QL.tracked : act[0];
    let th = `<div class="tq-head" data-open="1"><span>📜 Quests <small>(${act.length})</small></span><span class="tq-key">${UI.trackerMin ? '▸' : '▾'} L</span></div>`;
    if (!UI.trackerMin) {
      if (!act.length) th += '<div class="tq-empty">No quests yet. Talk to villagers with a <b>!</b> above their heads.</div>';
      for (const id of act.slice(0, 6)) {
        const q = R.Quests[id], st = QL.state[id];
        const isT = id === tracked;
        const ready = st.status === 'ready';
        const doneN = q.objectives.filter((o, i) => st.prog[i] >= (o.count || 1)).length;
        th += `<div class="tq ${q.type}${isT ? ' tracked' : ''}${ready ? ' ready' : ''}" data-q="${id}" title="${isT ? 'Followed by the quest arrow' : 'Click to follow with the quest arrow'}">`;
        th += `<div class="tq-name">${isT ? '➤ ' : ''}${q.type === 'main' ? '◆ ' : ''}${U.esc(q.name)}${!isT ? `<small> ${ready ? '✔' : doneN + '/' + q.objectives.length}</small>` : ''}</div>`;
        if (isT) {
          if (ready) th += `<div class="tq-obj done">✔ Return to ${U.esc((R.NPCs[q.turnIn || q.giver] || {}).name || '???')}</div>`;
          else q.objectives.forEach((o, i) => { const done = st.prog[i] >= (o.count || 1); th += `<div class="tq-obj ${done ? 'done' : ''}">${done ? '✔' : '•'} ${U.esc(QL.objText(q, o, i, st.prog[i]))}</div>`; });
        }
        th += '</div>';
      }
      if (act.length > 6) th += `<div class="tq-empty">+${act.length - 6} more in the quest log</div>`;
    }
    set('tracker', 'html', th);
    // boss
    if (UI.boss) {
      const e = UI.boss;
      const f = Math.max(0, e.hp / e.maxHp);
      set('boss-fill', 'width', (f * 100).toFixed(1) + '%');
      UI.bossGhost = UI.bossGhost > f ? Math.max(f, UI.bossGhost - dt * 0.3) : f;
      set('boss-ghost', 'width', (UI.bossGhost * 100).toFixed(1) + '%');
      set('boss-shield', 'width', e.shield > 0 ? Math.min(100, e.shield / e.maxHp * 100 * 4).toFixed(1) + '%' : '0%');
      const ph = (e.mem && e.mem.phase) || 1;
      set('boss-phase', 'text', (e.mem && e.mem.enraged ? 'ENRAGED · ' : '') + (e.def.update && e.mem && e.mem.fightT != null ? 'Phase ' + ph : '') + (e.shield > 0 ? ' · SHIELDED' : ''));
    }
    set('mm-name', 'text', R.World.def.name);
    set('party', 'html', R.Net ? R.Net.partyHTML() : '');
    UI.drawMinimap();
    UI.updateBubbles();
  };

  // NPC speech bubbles (see R.Chatter in game/ai.js). World px -> UI px is x2.
  const bubbleEls = new Map();
  UI.updateBubbles = function () {
    const W = R.World, box = $('#bubbles');
    if (!box) return;
    const live = new Set();
    if (R.settings.chatter !== false && !UI.current && !UI.dialogOpen) for (const n of W.npcs) {
      if (!n.bubble) continue;
      live.add(n);
      let el = bubbleEls.get(n);
      if (!el) { el = UI.el('div', 'bubble', U.esc(n.bubble.text), box); el._text = n.bubble.text; bubbleEls.set(n, el); }
      if (el._text !== n.bubble.text) { el.textContent = n.bubble.text; el._text = n.bubble.text; }
      const x = (n.x - W.cam.x) * 2, y = (n.y - 40 - W.cam.y) * 2;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      el.style.opacity = Math.min(1, n.bubble.t * 2);
    }
    for (const [n, el] of bubbleEls) if (!live.has(n)) { el.remove(); bubbleEls.delete(n); }
  };

  UI.drawMinimap = function () {
    const W = R.World, M = W.map, p = W.player;
    const c = $('#minimap');
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const scale = 2;
    const vw = c.width / scale, vh = c.height / scale;
    const px = p.x / 16, py = p.y / 16;
    let ox = U.clamp(px - vw / 2, 0, Math.max(0, M.w - vw)), oy = U.clamp(py - vh / 2, 0, Math.max(0, M.h - vh));
    if (M.w < vw) ox = (M.w - vw) / 2;
    if (M.h < vh) oy = (M.h - vh) / 2;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(M.minimap, -ox * scale, -oy * scale, M.w * scale, M.h * scale);
    if (W.def.dark) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, c.width, c.height); }
    const dot = (x, y, col, s) => { ctx.fillStyle = col; ctx.fillRect(Math.round((x / 16 - ox) * scale - s / 2), Math.round((y / 16 - oy) * scale - s / 2), s, s); };
    for (const x of M.exits) if (!x.hidden) dot(x.x + x.w / 2, x.y + x.h / 2, '#40c0ff', 4);
    for (const e of W.enemies) if (!e.dead) dot(e.x, e.y, e.boss ? '#ff40ff' : '#ff4040', e.boss ? 6 : 3);
    for (const n of W.npcs) { const m = R.QuestLog.markerFor(n.id); dot(n.x, n.y, m ? '#ffe040' : '#40ff80', m ? 5 : 3); }
    if (R.Net && R.Net.active()) for (const q of R.Net.peers.values()) if (q.ent && !q.ent.remove) dot(q.ent.x, q.ent.y, '#40d0ff', 4);
    const gt = R.Guide && R.Guide.cache;
    if (gt && R.settings.guide !== false) { const on = Math.floor(performance.now() / 250) % 2; dot(gt.x, gt.y + 20, on ? '#ffd040' : '#fff4b0', 7); }
    const blink = Math.floor(performance.now() / 300) % 2;
    dot(p.x, p.y, blink ? '#ffffff' : '#ffe080', 4);
  };
})(window.RPG);
