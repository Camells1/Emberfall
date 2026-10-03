'use strict';
// Full-screen and windowed menus. Each: UI.screens[name] = {build(el, arg), update?(dt), close?(), back?(), pause?}
(function (R) {
  const U = R.U, G = R.G, UI = R.UI;
  const S = UI.screens;
  const el = UI.el;
  const C = () => R.Character;

  const isElectron = () => !!(window.electronAPI);

  // ============================================================================
  // TITLE
  // ============================================================================
  S.title = {
    pause: false,
    build(m) {
      const box = el('div', 'title-screen', null, m);
      el('div', 'logo', '<img class="logo-emblem" src="icon.png" alt=""><div class="logo-top">SHATTERCROWN</div><div class="logo-sub">Legends of the Shattered Crown</div>', box);
      const menu = el('div', 'title-menu', null, box);
      const latest = R.Save.latest();
      if (latest) UI.button(menu, `Continue <small>${U.esc(latest.name)} · Lv ${latest.level} ${raceName(latest.race)} ${R.Classes[latest.cls] ? R.Classes[latest.cls].name : ''}</small>`, () => { UI.close(true); R.Save.load(latest.slot); }, 'big');
      UI.button(menu, 'New Game', () => UI.open('create'), 'big');
      if (R.Net && R.Net.available()) UI.button(menu, 'Multiplayer <small>Play online with friends</small>', () => UI.open('saves', { mode: 'mp', back: 'title' }), 'big');
      UI.button(menu, 'Load Game', () => UI.open('saves', { mode: 'load', back: 'title' }));
      UI.button(menu, 'Settings', () => UI.open('settings', { back: 'title' }));
      UI.button(menu, 'Controls', () => UI.open('controls', { back: 'title' }));
      if (isElectron()) UI.button(menu, 'Quit', () => window.electronAPI.quit());
      // Camel Studios account (top right)
      const Acc = R.Account;
      if (Acc && Acc.available) {
        const chip = el('div', 'acct-chip', null, box);
        if (Acc.signedIn) {
          el('span', 'acct-who', `<i></i>${U.esc(Acc.label())}`, chip);
          UI.button(chip, 'Log out', async () => { await Acc.logout(); UI.toast('Logged out'); UI.refresh(); });
        } else {
          UI.button(chip, 'Log in', async () => {
            const u = await Acc.login();
            if (u) { UI.toast(`Signed in as ${Acc.label()}`, 'good'); UI.refresh(); }
          });
        }
      }
      el('div', 'title-foot', 'v1.8 · Built with love, procedurally drawn pixels and a lot of 3D · Arrow keys / gamepad work in menus', box);
    },
    back() {},
  };
  const raceName = (id) => (R.Races && R.Races[id] ? R.Races[id].name : '');

  // ============================================================================
  // APPEARANCE EDITOR (shared by the character creator and the stylist)
  // ============================================================================
  // st = {a: appearance (edited in place), tab, race}
  const EDIT_TABS = [['race', 'Bloodborn'], ['body', 'Body'], ['face', 'Face'], ['hair', 'Hair'], ['extras', 'Extras']];
  function appearanceEditor(parent, st, tabs) {
    const Ch = C();
    const tabBar = el('div', 'cc-tabs', null, parent);
    for (const [id, label] of EDIT_TABS) {
      if (!tabs.includes(id)) continue;
      const b = el('button', 'tab' + (st.tab === id ? ' sel' : ''), label, tabBar);
      b.onclick = () => { st.tab = id; R.Audio.play('click'); UI.refresh(); };
    }
    const panel = el('div', 'cc-panel scroll', null, parent);
    const a = st.a;
    const row = (label) => el('div', 'cc-row', `<label>${label}</label>`, panel);
    const cycler = (label, list, key) => {
      const r = row(label);
      const ctl = el('div', 'cc-cycle', null, r);
      const idx = Math.max(0, list.findIndex((x) => (x.id || x) === a[key]));
      const set = (i) => { a[key] = list[(i + list.length) % list.length].id; R.Audio.play('click'); UI.refresh(); };
      UI.button(ctl, '◀', () => set(idx - 1));
      el('span', null, `${U.esc(list[idx].name)} <small>${idx + 1}/${list.length}</small>`, ctl);
      UI.button(ctl, '▶', () => set(idx + 1));
    };
    const swatches = (label, list, key, opts) => {
      opts = opts || {};
      const r = row(label);
      const sw = el('div', 'cc-swatches', null, r);
      if (opts.none) { const s = el('div', 'sw none' + (!a[key] ? ' sel' : ''), '∅', sw); s.title = opts.none; s.onclick = () => { delete a[key]; R.Audio.play('click'); UI.refresh(); }; }
      const cols = [...new Set(list)];
      for (const col of cols) {
        const s = el('div', 'sw' + (a[key] === col ? ' sel' : ''), null, sw);
        s.style.background = col;
        s.onclick = () => { a[key] = col; R.Audio.play('click'); UI.refresh(); };
      }
      // any colour you like
      const cur = a[key] && !cols.includes(a[key]) ? a[key] : null;
      const lab = el('label', 'sw custom' + (cur ? ' sel' : ''), null, sw);
      lab.title = 'Custom colour';
      if (cur) lab.style.background = cur;
      const inp = el('input', null, null, lab);
      inp.type = 'color'; inp.value = cur || a[key] || '#888888';
      inp.oninput = () => { a[key] = inp.value; lab.style.background = inp.value; };
      inp.onchange = () => { a[key] = inp.value; UI.refresh(); };
    };
    if (st.tab === 'race') {
      const grid = el('div', 'cc-race-grid', null, panel);
      for (const id of R.RACE_ORDER) {
        const rc = R.Races[id];
        const card = el('div', 'cc-race' + (st.race === id ? ' sel' : ''), null, grid);
        card.style.setProperty('--rc', rc.color);
        const look = Object.assign({}, a, raceLook(rc, a));
        card.appendChild(UI.pix(Ch.portrait(look, {}), 2));
        el('div', 'cc-race-name', `<b>${rc.name}</b>`, card);
        card.onclick = () => { applyRace(st, id); R.Audio.play('click'); UI.refresh(); };
        UI.bindTip(card, () => `<div class="tt-name" style="color:${rc.color}">${U.esc(rc.name)}</div><div class="tt-sub">${U.esc(rc.title)}</div>${rc.traits.map((t) => `<div class="tt-line fx">✦ ${U.esc(t)}</div>`).join('')}`);
      }
      const rc = R.Races[st.race] || R.Races.human;
      const info = el('div', 'cc-race-info', null, panel);
      info.style.setProperty('--rc', rc.color);
      el('div', 'cc-race-title', `${U.esc(rc.name)} <small>— ${U.esc(rc.title)}</small>`, info);
      el('div', 'cc-race-desc', U.esc(rc.desc), info);
      el('div', 'cc-traits', rc.traits.map((t) => `<div>✦ ${U.esc(t)}</div>`).join(''), info);
      swatches(rc.name + ' Skin', rc.skins, 'skin');
    } else if (st.tab === 'body') {
      cycler('Build', Ch.BODIES, 'body');
      const rc = R.Races[st.race];
      swatches('Skin', (rc ? rc.skins : []).concat(Ch.SKINS), 'skin');
      swatches('Outfit', Ch.OUTFIT_COLORS, 'outfit');
      swatches('Outfit Trim', Ch.TRIM_COLORS, 'outfit2');
    } else if (st.tab === 'face') {
      cycler('Eyes', Ch.EYE_STYLES, 'eyeStyle');
      swatches('Eye Color', Ch.EYE_COLORS, 'eyes');
      cycler('Ears', Ch.EARS, 'ears');
      cycler('Markings', Ch.FACES, 'face');
      swatches('Marking Color', Ch.MARK_COLORS, 'faceColor');
    } else if (st.tab === 'hair') {
      cycler('Hairstyle', Ch.HAIR_STYLES, 'hair');
      swatches('Hair Color', Ch.HAIR_COLORS, 'hairColor');
      cycler('Beard', Ch.BEARDS, 'beard');
      swatches('Beard Color', Ch.HAIR_COLORS, 'beardColor', { none: 'Same as hair' });
    } else if (st.tab === 'extras') {
      cycler('Horns', Ch.HORNS, 'horns');
      swatches('Horn Color', Ch.HORN_COLORS, 'hornColor');
      cycler('Accessory', Ch.ACCESSORIES, 'accessory');
      swatches('Accessory Color', Ch.ACC_COLORS, 'accColor');
    }
  }
  // The look a race gives you, on top of an appearance (resetting the previous race's features).
  const RACIAL_KEYS = ['ears', 'horns', 'hornColor', 'face', 'eyeStyle', 'eyes', 'accessory', 'accColor', 'body', 'beard'];
  function raceLook(rc, a) {
    const out = {};
    for (const k of RACIAL_KEYS) if (k in rc.look) out[k] = rc.look[k];
    if (!rc.skins.includes(a.skin)) out.skin = rc.skins[0];
    return out;
  }
  function applyRace(st, id) {
    const prev = R.Races[st.race], next = R.Races[id];
    const D = C().defaultAppearance();
    if (prev) for (const k of Object.keys(prev.look)) if (!(k in next.look) && st.a[k] === prev.look[k]) st.a[k] = D[k];
    Object.assign(st.a, raceLook(next, st.a));
    st.race = id;
  }
  // Randomize within the chosen race.
  function randomizeFor(st) {
    const rc = R.Races[st.race] || R.Races.human;
    const a = C().randomAppearance();
    a.skin = U.choose(rc.skins);
    Object.assign(a, raceLook(rc, a));
    if (st.race === 'dwarf' && Math.random() < 0.8) a.beard = U.choose(['full', 'braided', 'long']);
    st.a = Object.assign(st.a, a);
  }

  // Draws a turning, animated preview of a character into a canvas.
  function drawPreview(cv, a, gear, weapon, dir, t, glow) {
    const ctx = cv.getContext('2d');
    const Wd = cv.width, Hd = cv.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, Wd, Hd);
    const cx = Wd / 2, fy = Hd - 28;
    if (glow) { const g = ctx.createRadialGradient(cx, fy - 30, 10, cx, fy - 30, Wd * 0.45); g.addColorStop(0, U.rgba(glow, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx, fy, Wd * 0.2, Wd * 0.055, 0, 0, U.TAU); ctx.fill();
    const cyc = Math.floor(t / 3) % 4;
    const anim = cyc === 1 ? 'walk' : cyc === 3 ? 'attack' : 'idle';
    const frame = anim === 'walk' ? Math.floor(t * 9) % 6 : anim === 'attack' ? Math.min(2, Math.floor((t % 3) * 4) % 3) : Math.floor(t * 4) % 8;
    const spr = C().sprite(a, gear, dir, anim, frame);
    const k = Math.floor(Hd / 44 * 2) / 2;
    const hx = C().handOffset(dir, anim, frame, a);
    const ox = cx - C().ANCHOR_X * k, oy = fy - C().ANCHOR_Y * k;
    const drawW = () => {
      if (!weapon) return;
      ctx.save(); ctx.translate(cx + hx.x * k, fy + hx.y * k); ctx.scale(k, k);
      const ang = weapon.type === 'bow' ? (dir === 'left' ? Math.PI : dir === 'up' ? -Math.PI / 2 : dir === 'down' ? Math.PI / 2 : 0) : -Math.PI / 2 + (dir === 'left' ? -0.55 : 0.55) + (anim === 'attack' ? (dir === 'left' ? -1 : 1) * [-0.6, 1.2, 0.8][frame] : 0);
      R.Weapons.draw(ctx, 0, 0, weapon, ang); ctx.restore();
    };
    if (dir === 'up' || dir === 'left') drawW();
    ctx.drawImage(spr, ox, oy, spr.width * k, spr.height * k);
    if (!(dir === 'up' || dir === 'left')) drawW();
  }

  // ============================================================================
  // CHARACTER CREATOR
  // ============================================================================
  let cc = null;
  S.create = {
    pause: false,
    build(m) {
      if (!cc) { cc = { name: '', cls: 'warrior', race: 'human', a: C().defaultAppearance(), dir: 0, t: 0, tab: 'race' }; }
      const box = el('div', 'creator', null, m);
      el('div', 'creator-title', 'Create Your Hero', box);
      const cols = el('div', 'creator-cols', null, box);
      // --- class list
      const left = el('div', 'cc-classes', null, cols);
      el('div', 'cc-col-title', 'Class', left);
      for (const id of R.CLASS_ORDER) {
        const c = R.Classes[id];
        const card = el('div', 'cc-class' + (cc.cls === id ? ' sel' : ''), null, left);
        card.style.setProperty('--cc', c.color);
        const prev = C().sprite(cc.a, classGear(id), 'down', 'idle', 0);
        card.appendChild(UI.pix(prev, 2));
        el('div', 'cc-cname', `<b>${c.name}</b><small>${c.title}</small>`, card);
        card.onclick = () => { cc.cls = id; R.Audio.play('click'); UI.refresh(); };
      }
      // --- preview
      const mid = el('div', 'cc-preview', null, cols);
      const pv = document.createElement('canvas');
      pv.width = 240; pv.height = 264; pv.className = 'pix cc-canvas';
      mid.appendChild(pv);
      cc.canvas = pv;
      const rot = el('div', 'cc-rot', null, mid);
      UI.button(rot, '⟲ Turn', () => { cc.dir = (cc.dir + 3) % 4; });
      UI.button(rot, '🎲 Randomize', () => { randomizeFor(cc); UI.refresh(); });
      UI.button(rot, 'Turn ⟳', () => { cc.dir = (cc.dir + 1) % 4; });
      const c = R.Classes[cc.cls], rc = R.Races[cc.race];
      const info = el('div', 'cc-info', null, mid);
      info.style.setProperty('--cc', c.color);
      el('div', 'cc-info-name', `${rc ? U.esc(rc.name) + ' ' : ''}${c.name} <small>— ${c.title}</small>`, info);
      el('div', 'cc-info-desc', U.esc(c.desc), info);
      const bars = el('div', 'cc-attrs', null, info);
      for (const [k, n] of [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['vit', 'VIT']]) {
        const base = c.attrs[k], bonus = (rc && rc.attrs[k]) || 0;
        el('div', 'cc-attr', `<span>${n}</span><div class="cc-bar"><div style="width:${Math.max(0, base + bonus) * 8}%"></div></div><em class="${bonus > 0 ? 'up' : bonus < 0 ? 'down' : 'dim'}">${base + bonus}${bonus ? ` (${bonus > 0 ? '+' : ''}${bonus})` : ''}</em>`, bars);
      }
      const skl = el('div', 'cc-skills', null, info);
      for (const sid of c.skills) { const s = R.Skills[sid]; if (!s) continue; const d = el('div', 'cc-skill', null, skl); d.appendChild(UI.pix(R.Icons.skill(s), 2)); UI.bindTip(d, () => `<div class="tt-name" style="color:${s.icon.color}">${U.esc(s.name)}</div><div class="tt-desc">${U.esc(s.desc(1))}</div>`); }
      // --- customisation
      const right = el('div', 'cc-custom', null, cols);
      const nameRow = el('div', 'cc-row', '<label>Name</label>', right);
      const inp = el('input', 'cc-name', null, nameRow);
      inp.maxLength = 16; inp.value = cc.name; inp.placeholder = 'Enter a name';
      inp.oninput = () => { cc.name = inp.value; };
      inp.onkeydown = (e) => { if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'ArrowDown') { inp.blur(); e.preventDefault(); } };
      appearanceEditor(right, cc, ['race', 'body', 'face', 'hair', 'extras']);
      const foot = el('div', 'cc-foot', null, box);
      UI.button(foot, '← Back', () => { mpAfterCreate = false; UI.open('title'); });
      UI.button(foot, 'Begin Adventure →', () => {
        const name = (cc.name || '').trim() || U.choose(['Aldric', 'Seren', 'Kael', 'Mira', 'Thorne', 'Lyra', 'Bram', 'Nyx']);
        const data = { player: { name, cls: cc.cls, race: cc.race, appearance: Object.assign({}, cc.a) }, isNew: true };
        cc = null;
        UI.close(true);
        R.startGame(data);
        if (mpAfterCreate) { mpAfterCreate = false; R.World.later(6, () => UI.toast('Ready for co-op? Press Esc → Multiplayer to host or join.', 'quest')); }
      }, 'primary big');
      if (!cc.focused) { cc.focused = true; setTimeout(() => { if (!R.Input.usingPad) inp.focus(); }, 50); }
    },
    update(dt) {
      if (!cc || !cc.canvas) return;
      cc.t += dt;
      const dir = ['down', 'left', 'up', 'right'][cc.dir];
      const cl = R.Classes[cc.cls];
      const w = R.Items[cl.start.weapon] && R.Items[cl.start.weapon].look;
      drawPreview(cc.canvas, cc.a, classGear(cc.cls), w, dir, cc.t, cl.color);
    },
    close() {},
    back() { UI.open('title'); },
  };
  function classGear(cls) {
    const c = R.Classes[cls];
    const L = (id) => (id && R.Items[id] ? R.Items[id].look : undefined);
    return { chest: L(c.start.chest), feet: L(c.start.feet), head: L(c.start.head), legs: L(c.start.legs), cape: L(c.start.cape), offhand: L(c.start.offhand) };
  }

  // ============================================================================
  // STYLIST (change your look after creation)
  // ============================================================================
  const STYLE_COST = 30;
  let ws = null;
  S.wardrobe = {
    build(m) {
      const p = R.World.player;
      if (!ws) ws = { a: Object.assign({}, C().norm(p.appearance)), race: p.race, tab: 'body', dir: 0, t: 0 };
      const body = UI.frame(m, 'The Stylist', 'wardrobe-frame');
      const cols = el('div', 'ward-cols', null, body);
      const mid = el('div', 'cc-preview', null, cols);
      const pv = document.createElement('canvas'); pv.width = 240; pv.height = 264; pv.className = 'pix cc-canvas';
      mid.appendChild(pv); ws.canvas = pv;
      const rot = el('div', 'cc-rot', null, mid);
      UI.button(rot, '⟲', () => { ws.dir = (ws.dir + 3) % 4; });
      UI.button(rot, '🎲', () => { const keepBody = ws.a.body; randomizeFor(ws); ws.a.body = keepBody; UI.refresh(); });
      UI.button(rot, 'Reset', () => { ws.a = Object.assign({}, C().norm(p.appearance)); UI.refresh(); });
      UI.button(rot, '⟳', () => { ws.dir = (ws.dir + 1) % 4; });
      el('div', 'hint', `Mirabel can change anything but your bloodline (${U.esc(raceName(p.race) || 'Human')}).`, mid);
      const right = el('div', 'cc-custom', null, cols);
      appearanceEditor(right, ws, ['body', 'face', 'hair', 'extras']);
      const foot = el('div', 'cc-foot', null, body);
      UI.button(foot, 'Cancel', () => UI.close());
      UI.button(foot, `Confirm new look <small><span class="coin"></span>${STYLE_COST}</small>`, () => {
        if (p.gold < STYLE_COST) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
        p.gold -= STYLE_COST; p.appearance = Object.assign({}, ws.a);
        R.Audio.play('buy'); UI.toast('Looking sharp!', 'good'); UI.drawFace();
        UI.close();
      }, 'primary');
    },
    update(dt) {
      if (!ws || !ws.canvas) return;
      ws.t += dt;
      const p = R.World.player, w = p.weapon();
      drawPreview(ws.canvas, ws.a, p.gear(), w && w.look, ['down', 'left', 'up', 'right'][ws.dir], ws.t, '#e8c060');
    },
    close() { ws = null; },
  };

  // ============================================================================
  // INVENTORY / CHARACTER
  // ============================================================================
  const SLOT_ICONS = { weapon: '⚔', offhand: '⛨', head: '⛑', chest: '👕', legs: '▥', feet: '👢', hands: '✋', cape: '⚑', ring: '◯', amulet: '◊' };
  let invFilter = 'all';
  // materials that an active quest still needs (never sold as "junk")
  function questNeeds() {
    const need = new Set();
    for (const id of R.QuestLog.activeList()) for (const o of R.Quests[id].objectives) if (o.type === 'collect') need.add(o.item);
    return need;
  }
  S.inventory = {
    build(m, arg) {
      const p = R.World.player;
      const body = UI.frame(m, 'Character & Inventory', 'inv-frame');
      const cols = el('div', 'inv-cols', null, body);
      // --- paper doll
      const doll = el('div', 'doll', null, cols);
      el('div', 'doll-name', `${U.esc(p.name)} <small>Level ${p.level} ${U.esc(raceName(p.race))} ${R.Classes[p.cls].name}</small>`, doll);
      const stage = el('div', 'doll-stage', null, doll);
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 180; cv.className = 'pix doll-canvas';
      stage.appendChild(cv);
      S.inventory.canvas = cv; S.inventory.t = S.inventory.t || 0;
      const slotPos = { head: [0, 0], amulet: [0, 1], chest: [0, 2], hands: [0, 3], ring: [0, 4], cape: [1, 0], weapon: [1, 1], offhand: [1, 2], legs: [1, 3], feet: [1, 4] };
      for (const slot of R.SLOTS) {
        const [side, row] = slotPos[slot];
        const s = el('div', 'eq-slot ' + (side ? 'r' : 'l'), null, stage);
        s.style.top = (row * 62 + 6) + 'px';
        const it = R.Items[p.equip[slot]];
        if (it) { s.appendChild(UI.itemIcon(it, 3)); s.style.borderColor = UI.rarityColor(it); s.classList.add('filled'); }
        else el('span', 'ph', SLOT_ICONS[slot], s);
        if (it && p.ench[slot]) s.classList.add('ench');
        UI.bindTip(s, () => (it ? UI.itemTip(it, { equipped: true, ench: p.ench[slot], hint: slot === 'weapon' ? 'Your weapon (equip another to swap)' : 'Click to unequip' }) : `<div class="tt-name">${R.SLOT_NAMES[slot]}</div><div class="tt-desc dim">Empty</div>`));
        s.onclick = () => { if (it) { p.unequip(slot); UI.refresh(); UI.drawFace(); } };
      }
      // --- stats
      const st = el('div', 'stats', null, cols);
      const s = p.stats;
      el('div', 'sec-title', 'Attributes' + (p.attrPoints ? ` <span class="pts">${p.attrPoints} points</span>` : ''), st);
      const attrDesc = { str: 'Strength — physical attack (Warrior, Paladin) and a little HP', dex: 'Dexterity — ranged/dagger attack, crit chance, dodge and speed', int: 'Intellect — magic power, mana and mana regeneration', vit: 'Vitality — max HP, defense and HP regeneration' };
      for (const k of ['str', 'dex', 'int', 'vit']) {
        const row = el('div', 'attr-row', `<span class="an">${k.toUpperCase()}</span><span class="av">${s.attrs[k]}</span>`, st);
        UI.bindTip(row, `<div class="tt-desc">${attrDesc[k]}</div>`);
        if (p.attrPoints > 0) UI.button(row, '+', (e) => { const n = e.shiftKey ? p.attrPoints : 1; p.attrs[k] = (p.attrs[k] || 0) + n; p.attrPoints -= n; p.recalc(); UI.refresh(); }, 'plus');
      }
      el('div', 'sec-title', 'Stats', st);
      const rows = [['Health', `${Math.ceil(p.hp)} / ${s.maxHp}`], ['Mana', `${Math.floor(p.mp)} / ${s.maxMp}`], ['Attack', s.atk], ['Magic', s.mag], ['Defense', s.def], ['Crit Chance', s.crit.toFixed(1) + '%'], ['Crit Damage', Math.round(s.critDmg * 100) + '%'], ['Dodge', s.dodge.toFixed(1) + '%'], ['Move Speed', Math.round(s.spd * 100) + '%'], ['HP Regen', s.hpRegen.toFixed(1) + '/s'], ['MP Regen', s.mpRegen.toFixed(1) + '/s']];
      if (s.lifesteal) rows.push(['Lifesteal', Math.round(s.lifesteal * 100) + '%']);
      if (s.cdr) rows.push(['Cooldowns', '-' + Math.round(s.cdr * 100) + '%']);
      const tbl = el('div', 'stat-table', null, st);
      for (const [a, b] of rows) el('div', 'stat-row', `<span>${a}</span><b>${b}</b>`, tbl);
      el('div', 'stat-row xp', `<span>Experience</span><b>${p.level >= R.MAX_LEVEL ? 'MAX' : U.fmt(p.xp) + ' / ' + U.fmt(R.xpForLevel(p.level))}</b>`, tbl);
      el('div', 'stat-row', `<span>Enemies slain</span><b>${p.kills}</b>`, tbl);
      const rc = R.raceOf(p);
      const rrow = el('div', 'stat-row race', `<span>Bloodborn</span><b style="color:${rc.color}">${U.esc(rc.name)}</b>`, tbl);
      UI.bindTip(rrow, () => `<div class="tt-name" style="color:${rc.color}">${U.esc(rc.name)}</div><div class="tt-sub">${U.esc(rc.title)}</div>${rc.traits.map((t) => `<div class="tt-line fx">✦ ${U.esc(t)}</div>`).join('')}`);
      // --- bag
      const bag = el('div', 'bag', null, cols);
      const tabs = el('div', 'bag-tabs', null, bag);
      for (const [f, label] of [['all', 'All'], ['gear', 'Gear'], ['use', 'Consumables'], ['misc', 'Materials']]) {
        const t = el('button', 'tab' + (invFilter === f ? ' sel' : ''), label, tabs);
        t.onclick = () => { invFilter = f; UI.refresh(); };
      }
      UI.button(tabs, 'Sort', () => { sortInv(p); UI.refresh(); }, 'small');
      const grid = el('div', 'bag-grid scroll', null, bag);
      p.inv.forEach((stack, i) => {
        const it = R.Items[stack.id];
        if (!it) return;
        if (invFilter === 'gear' && !R.SLOTS.includes(it.slot)) return;
        if (invFilter === 'use' && it.slot !== 'consumable') return;
        if (invFilter === 'misc' && !['material', 'quest'].includes(it.slot)) return;
        const c = el('div', 'bag-slot r-' + it.rarity, null, grid);
        c.appendChild(UI.itemIcon(it, 3));
        if (stack.qty > 1) el('span', 'qty', stack.qty, c);
        if (R.SLOTS.includes(it.slot) && p.equipReason(it)) c.classList.add('unusable');
        else if (R.SLOTS.includes(it.slot) && isUpgrade(p, it)) el('span', 'up-arrow', '▲', c);
        const hint = R.SLOTS.includes(it.slot) ? 'Click: equip · Right-click: drop' : it.use ? 'Click: use · Right-click: drop' : it.slot === 'quest' ? 'Quest item' : 'Right-click: drop';
        if (stack.ench) c.classList.add('ench');
        UI.bindTip(c, () => UI.itemTip(it, { hint, ench: stack.ench }));
        c.onclick = () => {
          UI.hideTip();
          const N = R.Net;
          if (N && N.giveTo != null && N.active()) {
            if (it.slot === 'quest') { UI.toast("Quest items can't be given away", 'bad'); return; }
            if (!N.peers.has(N.giveTo)) { N.giveTo = null; UI.refresh(); return; }
            p.inv.splice(i, 1);
            N.give(N.giveTo, stack);
            UI.toast(`Gave ${stack.qty > 1 ? stack.qty + '× ' : ''}${it.name} to ${N.nameOf(N.giveTo)}`, 'good'); R.Audio.play('coin');
            UI.refresh();
            return;
          }
          p.useItem(i); UI.refresh(); UI.drawFace();
        };
        c.oncontextmenu = (e) => {
          e.preventDefault();
          if (it.slot === 'quest') { UI.toast("You can't drop quest items", 'bad'); return; }
          UI.hideTip();
          p.inv.splice(i, 1);
          const x = p.x + U.rand(-8, 8), y = p.y + 6;
          // co-op: dropped items are shared with everyone in the area
          if (!(R.Net && R.Net.dropItem(stack, x, y))) R.World.add(new R.Pickup(x, y, { item: stack.id, qty: stack.qty, ench: stack.ench })).age = -2;
          UI.refresh();
        };
      });
      let empty = Math.max(0, 42 - grid.children.length);
      if ((grid.children.length + empty) % 7) empty += 7 - ((grid.children.length + empty) % 7);
      for (let i = 0; i < empty; i++) el('div', 'bag-slot empty', null, grid);
      const bf = el('div', 'bag-foot', `<span class="coin"></span> ${U.fmt(p.gold)} gold`, bag);
      // co-op: give items or gold straight to a friend
      const N = R.Net;
      if (N && N.active() && N.party().length) {
        const gv = el('div', 'give-row', N.giveTo != null ? `🎁 <b>Click an item to give it to ${U.esc(N.nameOf(N.giveTo))}</b>` : 'Give to:', bf);
        if (N.giveTo != null) UI.button(gv, 'Done', () => { N.giveTo = null; UI.refresh(); }, 'small');
        else for (const q of N.party()) UI.button(gv, U.esc(q.look.name), () => { N.giveTo = q.id; UI.refresh(); }, 'small');
        if (N.giveTo != null) {
          const gi = el('input', 'cc-name give-gold', null, gv); gi.type = 'number'; gi.min = 1; gi.placeholder = 'gold';
          UI.button(gv, 'Send gold', () => { const a = Math.floor(+gi.value || 0); if (N.giveGold(N.giveTo, a)) { UI.toast(`Sent ${a} gold to ${N.nameOf(N.giveTo)}`, 'good'); R.Audio.play('coin'); UI.refresh(); } else UI.toast('Type how much gold to send', 'bad'); }, 'small');
        }
      }
    },
    update(dt) {
      const cv = S.inventory.canvas;
      if (!cv) return;
      S.inventory.t += dt;
      const p = R.World.player;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 160, 180);
      const k = 4;
      const dir = 'down';
      const f = Math.floor(S.inventory.t * 4) % 8;
      const spr = C().sprite(p.appearance, p.gear(), dir, 'idle', f);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(80, 166, 34, 9, 0, 0, U.TAU); ctx.fill();
      ctx.drawImage(spr, 80 - C().ANCHOR_X * k, 166 - C().ANCHOR_Y * k, spr.width * k, spr.height * k);
      const w = p.weapon();
      if (w && w.look) { const h = C().handOffset(dir, 'idle', f, p.appearance); ctx.save(); ctx.translate(80 + h.x * k, 166 + h.y * k); ctx.scale(k, k); R.Weapons.draw(ctx, 0, 0, w.look, w.look.type === 'bow' ? Math.PI / 2 : -Math.PI / 2 + 0.55); ctx.restore(); }
    },
    close() { S.inventory.canvas = null; if (R.Net) R.Net.giveTo = null; },
  };
  function isUpgrade(p, it) {
    const eq = R.Items[p.equip[it.slot]];
    if (!eq) return true;
    const score = (x) => (x.dmg || 0) * 2 + Object.entries(x.stats || {}).reduce((a, [k, v]) => a + v * ({ hp: 0.2, mp: 0.15, spd: 40, crit: 1.5, lifesteal: 60, cdr: 60, critDmg: 20 }[k] || 1), 0);
    return score(it) > score(eq) * 1.02;
  }
  const RORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
  const SORDER = ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'cape', 'ring', 'amulet', 'consumable', 'material', 'quest'];
  function sortInv(p) {
    p.inv.sort((a, b) => {
      const A = R.Items[a.id], B = R.Items[b.id];
      if (!A || !B) return !A - !B;
      return SORDER.indexOf(A.slot) - SORDER.indexOf(B.slot) || RORDER[A.rarity] - RORDER[B.rarity] || B.level - A.level || A.name.localeCompare(B.name);
    });
  }
  UI.sortInv = sortInv;

  // ============================================================================
  // SKILLS
  // ============================================================================
  S.skills = {
    build(m) {
      const p = R.World.player;
      const body = UI.frame(m, 'Skills', 'skills-frame');
      el('div', 'skill-points', p.skillPoints ? `You have <b>${p.skillPoints}</b> skill point${p.skillPoints > 1 ? 's' : ''} to spend.` : 'Gain levels to earn skill points.', body);
      const list = el('div', 'skill-list', null, body);
      p.skills().forEach((id, i) => {
        const s = R.Skills[id];
        if (!s) return;
        const lv = p.skillLevel(id);
        const unlocked = p.level >= R.SKILL_UNLOCK[i];
        const row = el('div', 'skill-row' + (unlocked ? '' : ' locked'), null, list);
        row.appendChild(UI.pix(R.Icons.skill(s), 4));
        const info = el('div', 'skill-info', null, row);
        const mp = typeof s.mp === 'function' ? s.mp(Math.max(1, lv)) : s.mp;
        const cd = typeof s.cd === 'function' ? s.cd(Math.max(1, lv)) : s.cd;
        el('div', 'skill-name', `<span style="color:${s.icon.color}">${U.esc(s.name)}</span> <small>[${i + 1}] · ${unlocked ? 'Rank ' + lv + ' / ' + s.maxLv : 'Unlocks at level ' + R.SKILL_UNLOCK[i]} · ${mp} MP · ${cd.toFixed(1)}s</small>`, info);
        el('div', 'skill-desc', U.esc(s.desc(Math.max(1, lv))), info);
        if (lv > 0 && lv < s.maxLv) el('div', 'skill-next', 'Next rank: ' + U.esc(s.desc(lv + 1)), info);
        const pips = el('div', 'pips', null, info);
        for (let k = 0; k < s.maxLv; k++) el('span', 'pip' + (k < lv ? ' on' : ''), null, pips);
        if (unlocked && p.skillPoints > 0 && lv < s.maxLv) UI.button(row, lv ? 'Upgrade' : 'Learn', () => { p.skillLv[id] = lv + 1; p.skillPoints--; R.Audio.play('levelup', { pitch: 1.5 }); UI.refresh(); }, 'primary');
      });
      el('div', 'hint', 'Skills unlock at levels 1, 3, 6 and 10. Each level-up grants a skill point to rank them up.', body);
    },
  };

  // ============================================================================
  // QUEST LOG
  // ============================================================================
  let questSel = null;
  S.quests = {
    build(m) {
      const QL = R.QuestLog;
      const body = UI.frame(m, 'Quest Log', 'quest-frame');
      const cols = el('div', 'ql-cols', null, body);
      const list = el('div', 'ql-list scroll', null, cols);
      const act = QL.activeList(), done = QL.doneList();
      if (!questSel || !QL.state[questSel]) questSel = QL.tracked || act[0] || done[0];
      const addItem = (id, cls) => {
        const q = R.Quests[id];
        const e = el('div', 'ql-item ' + cls + (questSel === id ? ' sel' : '') + ' ' + q.type, `${q.type === 'main' ? '◆ ' : q.repeatable ? '↻ ' : ''}${U.esc(q.name)}${QL.state[id].status === 'ready' ? ' <span class="rdy">✔</span>' : ''}`, list);
        e.onclick = () => { questSel = id; UI.refresh(); };
      };
      el('div', 'ql-head', `Active (${act.length})`, list);
      act.forEach((id) => addItem(id, 'active'));
      if (!act.length) el('div', 'ql-empty', 'No active quests. Look for villagers with <b style="color:#ffe040">!</b> above their heads.', list);
      el('div', 'ql-head', `Completed (${done.length})`, list);
      done.forEach((id) => addItem(id, 'done'));
      const det = el('div', 'ql-detail', null, cols);
      if (questSel) {
        const q = R.Quests[questSel], st = QL.state[questSel];
        el('div', 'ql-title', `${U.esc(q.name)} <small>${q.type === 'main' ? 'Main Story' : q.repeatable ? 'Bounty (repeatable)' : 'Side Quest'}${q.level ? ' · Level ' + q.level : ''}${q.region ? ' · ' + U.esc(q.region) : ''}</small>`, det);
        el('div', 'ql-desc', U.esc(q.desc || ''), det);
        el('div', 'sec-title', 'Objectives', det);
        q.objectives.forEach((o, i) => { const dn = st.prog[i] >= (o.count || 1); el('div', 'ql-obj' + (dn ? ' done' : ''), `${dn ? '✔' : '•'} ${U.esc(QL.objText(q, o, i, st.prog[i]))}`, det); });
        if (st.status === 'ready') el('div', 'ql-obj ready', `➜ Return to ${U.esc((R.NPCs[q.turnIn || q.giver] || {}).name || '')}`, det);
        const rw = q.rewards || {};
        el('div', 'sec-title', 'Rewards', det);
        const rr = el('div', 'ql-rewards', `${rw.xp ? `<span class="rw">${rw.xp} XP</span>` : ''}${rw.gold ? `<span class="rw"><span class="coin"></span>${rw.gold}</span>` : ''}`, det);
        for (const g of [].concat(rw.gear || [])) el('span', 'rw', `<span style="color:${(R.G.RARITY[g.rarity] || R.G.RARITY.common).color}">${(R.G.RARITY[g.rarity] || R.G.RARITY.common).name} ${g.slot ? R.SLOT_NAMES[g.slot] : 'gear'} for your class</span>`, rr);
        for (const id of rw.items || []) { const it = R.Items[id]; if (!it) continue; const c = el('span', 'rw item', null, rr); c.appendChild(UI.itemIcon(it, 2)); el('span', null, `<span style="color:${UI.rarityColor(it)}">${U.esc(it.name)}</span>`, c); UI.bindTip(c, () => UI.itemTip(it)); }
        if (st.status !== 'done') UI.button(det, QL.tracked === questSel ? 'Tracking' : 'Track Quest', () => { QL.tracked = questSel; if (R.Guide) R.Guide.t = 0; UI.refresh(); }, QL.tracked === questSel ? 'sel' : '');
      }
    },
  };

  // ============================================================================
  // MAP
  // ============================================================================
  S.map = {
    build(m) {
      const W = R.World, M = W.map;
      const body = UI.frame(m, W.def.name, 'map-frame');
      const wrap = el('div', 'map-wrap', null, body);
      const scale = Math.max(1, Math.min(6, 1100 / M.w, 540 / M.h));
      const cv = document.createElement('canvas');
      cv.width = Math.round(M.w * scale); cv.height = Math.round(M.h * scale); cv.className = 'pix map-canvas';
      wrap.appendChild(cv);
      S.map.cv = cv; S.map.scale = scale;
      el('div', 'map-legend', '<span><i style="background:#fff"></i>You</span><span><i style="background:#ffe040"></i>Quest</span><span><i style="background:#40ff80"></i>Villager</span><span><i style="background:#ff4040"></i>Enemy</span><span><i style="background:#40c0ff"></i>Exit</span><span><i style="background:#b070ff"></i>Waypoint</span><span><i style="background:#ffd040;border-radius:50%"></i>Quest goal</span>', body);
    },
    update() {
      const cv = S.map.cv; if (!cv) return;
      const W = R.World, M = W.map, k = S.map.scale;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(M.minimap, 0, 0, cv.width, cv.height);
      const dot = (x, y, c, s) => { ctx.fillStyle = '#140c1c'; ctx.fillRect(Math.round(x / 16 * k - s / 2 - 1), Math.round(y / 16 * k - s / 2 - 1), s + 2, s + 2); ctx.fillStyle = c; ctx.fillRect(Math.round(x / 16 * k - s / 2), Math.round(y / 16 * k - s / 2), s, s); };
      for (const x of M.exits) if (!x.hidden) { dot(x.x + x.w / 2, x.y + x.h / 2, '#40c0ff', 8); const to = R.Maps[x.to]; if (to) { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText('→ ' + to.name, U.clamp((x.x + x.w / 2) / 16 * k, 60, cv.width - 60), U.clamp((x.y + x.h / 2) / 16 * k - 8, 14, cv.height - 4)); } }
      for (const wp of M.waypoints) dot(wp.x, wp.y, '#b070ff', 8);
      for (const e of W.enemies) if (!e.dead) dot(e.x, e.y, e.boss ? '#ff40ff' : '#ff4040', e.boss ? 10 : 4);
      for (const n of W.npcs) dot(n.x, n.y, R.QuestLog.markerFor(n.id) ? '#ffe040' : '#40ff80', 6);
      const g = R.Guide && R.Guide.cache;
      if (g && R.settings.guide !== false) { const on = Math.floor(performance.now() / 250) % 2; dot(g.x, g.y + 20, on ? '#ffd040' : '#fff4b0', 10); }
      if (Math.floor(performance.now() / 300) % 2) dot(W.player.x, W.player.y, '#ffffff', 8);
    },
    close() { S.map.cv = null; },
  };

  // ============================================================================
  // WAYPOINTS (fast travel)
  // ============================================================================
  S.waypoints = {
    build(m) {
      const W = R.World;
      const body = UI.frame(m, 'Waypoint', 'wp-frame');
      el('div', 'hint', 'Ancient portal stones link the realm. Travel to any waypoint you have discovered.', body);
      const list = el('div', 'wp-list scroll', null, body);
      for (const [id, wp] of Object.entries(W.waypoints)) {
        const here = wp.map === W.map.id;
        const lv = R.Maps[wp.map] && R.Maps[wp.map].subtitle ? ' · ' + R.Maps[wp.map].subtitle : '';
        UI.button(list, `${U.esc(wp.name)} <small>${U.esc(R.Maps[wp.map] ? R.Maps[wp.map].name : '')}${U.esc(lv)}</small>${here ? ' <small>(here)</small>' : ''}`, () => { if (here) return; UI.close(true); W.transition(wp.map, 'wp:' + id); }, here ? 'disabled' : '');
      }
    },
  };

  // ============================================================================
  // SHOP
  // ============================================================================
  let shopTab = 'buy';
  S.shop = {
    build(m, npc) {
      const p = R.World.player;
      const def = npc.def;
      const body = UI.frame(m, def.shop.title || def.name, 'shop-frame');
      const head = el('div', 'shop-head', null, body);
      const port = el('div', 'shop-port', null, head);
      if (def.appearance) port.appendChild(UI.pix(C().portrait(def.appearance, def.gear || {}), 4));
      el('div', 'shop-greet', `<b>${U.esc(def.name)}</b><br>${U.esc(def.shop.greeting || 'Take a look. Quality goods, fair prices.')}`, head);
      el('div', 'shop-gold', `<span class="coin"></span> ${U.fmt(p.gold)}`, head);
      const tabs = el('div', 'bag-tabs', null, body);
      for (const [t, label] of [['buy', 'Buy'], ['sell', 'Sell']]) { const b = el('button', 'tab' + (shopTab === t ? ' sel' : ''), label, tabs); b.onclick = () => { shopTab = t; UI.refresh(); }; }
      const grid = el('div', 'shop-grid scroll', null, body);
      if (shopTab === 'buy') {
        const items = (typeof def.shop.items === 'function' ? def.shop.items() : def.shop.items).map((id) => R.Items[id]).filter(Boolean);
        for (const it of items) {
          const price = Math.ceil(it.price * (def.shop.markup || 1));
          const row = el('div', 'shop-row r-' + it.rarity + (p.gold < price ? ' poor' : ''), null, grid);
          row.appendChild(UI.itemIcon(it, 3));
          el('div', 'shop-name', `<span style="color:${UI.rarityColor(it)}">${U.esc(it.name)}</span><small>${it.slot === 'weapon' ? (R.WeaponTypes[it.type] || {}).name : R.SLOT_NAMES[it.slot]}${it.level > 1 ? ' · Lv ' + it.level : ''}${R.SLOTS.includes(it.slot) && p.equipReason(it) ? ' · <span class="down">' + U.esc(p.equipReason(it)) + '</span>' : ''}${p.count(it.id) ? ' · <span class="dim">own ' + p.count(it.id) + '</span>' : ''}</small>`, row);
          el('div', 'shop-price', `<span class="coin"></span>${price}`, row);
          UI.bindTip(row, () => UI.itemTip(it, { price, hint: it.stack ? 'Click to buy · Shift-click to buy 5' : 'Click to buy' }));
          row.onclick = (e) => {
            const n = e.shiftKey && it.stack ? 5 : 1;
            if (p.gold < price * n) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
            p.gold -= price * n; p.addItem(it.id, n); R.Audio.play('buy');
            UI.toast(`Bought ${it.name}${n > 1 ? ' ×' + n : ''}`, 'good');
            UI.refresh();
          };
        }
      } else {
        const need = questNeeds();
        p.inv.forEach((st, i) => {
          const it = R.Items[st.id];
          if (!it || it.slot === 'quest') return;
          const price = UI.sellPrice(it);
          const row = el('div', 'shop-row r-' + it.rarity, null, grid);
          row.appendChild(UI.itemIcon(it, 3));
          el('div', 'shop-name', `<span style="color:${UI.rarityColor(it)}">${U.esc(it.name)}</span>${st.qty > 1 ? ' ×' + st.qty : ''}<small>${R.SLOT_NAMES[it.slot]}${need.has(it.id) ? ' · <span class="up">needed for a quest</span>' : ''}</small>`, row);
          el('div', 'shop-price', `<span class="coin"></span>${price}`, row);
          UI.bindTip(row, () => UI.itemTip(it, { price, ench: st.ench, priceLabel: 'Sell for', hint: st.qty > 1 ? 'Click: sell one · Shift-click: sell all' : 'Click to sell' }));
          const sell = (all) => {
            const cur = p.inv[i];
            if (!cur || cur.id !== st.id) return;
            const n = all ? cur.qty : 1;
            p.gold += price * n; cur.qty -= n; if (cur.qty <= 0) p.inv.splice(i, 1);
            R.Audio.play('coin');
            UI.refresh();
          };
          row.onclick = (e) => sell(e.shiftKey);
          row.oncontextmenu = (e) => { e.preventDefault(); sell(true); };
        });
        if (!grid.children.length) el('div', 'hint', 'Nothing to sell.', grid);
        UI.button(body, 'Sell all junk (common gear & materials not needed for quests)', () => {
          let total = 0;
          for (let i = p.inv.length - 1; i >= 0; i--) { const it = R.Items[p.inv[i].id]; if (it && ((it.slot === 'material' && !need.has(it.id)) || (R.SLOTS.includes(it.slot) && it.rarity === 'common'))) { total += UI.sellPrice(it) * p.inv[i].qty; p.inv.splice(i, 1); } }
          if (total) { p.gold += total; R.Audio.play('coin'); UI.toast('Sold junk for ' + total + ' gold', 'good'); UI.refresh(); } else UI.toast('No junk to sell');
        }, 'small');
      }
    },
  };

  // ============================================================================
  // PAUSE
  // ============================================================================
  S.pause = {
    build(m) {
      const box = el('div', 'pause', null, m);
      el('div', 'pause-title', R.Net && R.Net.active() ? 'Menu' : 'Paused', box);
      if (R.Net && R.Net.active()) el('div', 'pause-info', 'Co-op: the game keeps running while this menu is open.', box);
      const menu = el('div', 'title-menu', null, box);
      UI.button(menu, 'Resume', () => UI.close(), 'big');
      UI.button(menu, 'Save Game', () => UI.open('saves', { mode: 'save', back: 'pause' }));
      UI.button(menu, 'Load Game', () => UI.open('saves', { mode: 'load', back: 'pause' }));
      if (R.Net && R.Net.available()) UI.button(menu, R.Net.active() ? (R.Net.isHost() ? 'Multiplayer <small>Hosting · ' + (R.Net.peers.size) + ' friend(s)</small>' : 'Multiplayer <small>Connected</small>') : 'Multiplayer <small>Host or join a co-op game</small>', () => UI.open('multiplayer', { back: 'pause' }));
      UI.button(menu, 'Settings', () => UI.open('settings', { back: 'pause' }));
      UI.button(menu, 'Controls', () => UI.open('controls', { back: 'pause' }));
      UI.button(menu, 'Quit to Title', () => { R.Save.autosave(); UI.close(true); R.toTitle(); });
      const p = R.World.player;
      el('div', 'pause-info', `${U.esc(p.name)} · Level ${p.level} ${U.esc(raceName(p.race))} ${R.Classes[p.cls].name} · ${R.Difficulty.cur().name} · ${fmtTime(R.playtime)} played`, box);
    },
  };
  function fmtTime(s) { s = Math.floor(s || 0); const h = Math.floor(s / 3600), mi = Math.floor(s / 60) % 60; return (h ? h + 'h ' : '') + mi + 'm'; }

  S.saves = {
    pause: true,
    build(m, arg) {
      arg = arg || { mode: 'load', back: R.state === 'play' ? 'pause' : 'title' };
      const mp = arg.mode === 'mp';
      const body = UI.frame(m, arg.mode === 'save' ? 'Save Game' : mp ? 'Multiplayer — Pick Your Character' : 'Load Game', 'saves-frame');
      if (mp) el('div', 'hint', 'Choose who you want to play as. Next you can host a game (and get a room code) or join a friend with theirs.', body);
      const slots = arg.mode === 'save' ? [1, 2, 3] : ['auto', 1, 2, 3];
      for (const s of slots) {
        const info = R.Save.info(s);
        const row = el('div', 'save-row' + (info ? '' : ' empty'), null, body);
        const port = el('div', 'save-port', null, row);
        if (info && info.appearance) port.appendChild(UI.pix(C().portrait(info.appearance, {}), 3));
        el('div', 'save-info', info ? `<b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}: ${U.esc(info.name)}</b><small>Level ${info.level} ${U.esc(raceName(info.race))} ${R.Classes[info.cls] ? R.Classes[info.cls].name : ''} · ${U.esc(R.Maps[info.map] ? R.Maps[info.map].name : info.map)} · ${fmtTime(info.playtime)} · ${new Date(info.time).toLocaleString()}</small>` : `<b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><small>Empty</small>`, row);
        if (arg.mode === 'save') UI.button(row, info ? 'Overwrite' : 'Save', () => { if (R.Save.save(s)) { UI.toast('Game saved', 'good'); R.Audio.play('quest'); UI.refresh(); } else UI.toast('Save failed', 'bad'); }, 'primary');
        else if (info && mp) UI.button(row, 'Play', () => { UI.close(true); R.Save.load(s); UI.open('multiplayer'); }, 'primary');
        else if (info) UI.button(row, 'Load', () => { UI.close(true); R.Save.load(s); }, 'primary');
        if (info && s !== 'auto' && !mp) {
          const del = UI.button(row, 'Delete', () => {
            if (del.dataset.confirm) { R.Save.remove(s); UI.refresh(); }
            else { del.dataset.confirm = 1; del.textContent = 'Really delete?'; UI.toast('Click again to delete this save'); setTimeout(() => { if (del.isConnected) { delete del.dataset.confirm; del.textContent = 'Delete'; } }, 3000); }
          }, 'small danger');
        }
      }
      if (mp) UI.button(body, '+ Make a new character', () => { mpAfterCreate = true; UI.open('create'); });
      UI.button(body, '← Back', () => UI.back());
    },
  };
  let mpAfterCreate = false;

  S.settings = {
    build(m, arg) {
      const body = UI.frame(m, 'Settings', 'settings-frame');
      const st = R.settings;
      const list = el('div', 'set-list scroll', null, body);
      const slider = (label, key, fn) => {
        const row = el('div', 'set-row', `<label>${label}</label>`, list);
        const inp = el('input', null, null, row); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05; inp.value = st[key];
        const v = el('span', 'set-val', Math.round(st[key] * 100) + '%', row);
        inp.oninput = () => { st[key] = +inp.value; v.textContent = Math.round(st[key] * 100) + '%'; fn(+inp.value); R.Save.saveSettings(); };
      };
      const toggle = (label, key, fn) => {
        const row = el('div', 'set-row', `<label>${label}</label>`, list);
        const b = UI.button(row, st[key] ? 'On' : 'Off', () => { st[key] = !st[key]; b.textContent = st[key] ? 'On' : 'Off'; b.classList.toggle('sel', !!st[key]); if (fn) fn(st[key]); R.Save.saveSettings(); }, st[key] ? 'sel' : '');
      };
      // difficulty
      const drow = el('div', 'set-row', '<label>Difficulty</label>', list);
      const dctl = el('div', 'cc-cycle', null, drow);
      const DL = R.DIFFICULTIES, di = Math.max(0, DL.findIndex((d) => d.id === (st.difficulty || 'normal')));
      const setD = (i) => { st.difficulty = DL[(i + DL.length) % DL.length].id; R.Save.saveSettings(); UI.refresh(); };
      UI.button(dctl, '◀', () => setD(di - 1));
      el('span', 'dif-' + DL[di].id, `${DL[di].name}<small>${U.esc(DL[di].desc)}</small>`, dctl);
      UI.button(dctl, '▶', () => setD(di + 1));
      // crosshair
      const XH = R.Crosshairs, xl = XH.list, xi = Math.max(0, xl.findIndex((d) => d.id === (st.crosshair || 'default')));
      const xrow = el('div', 'set-row xh-row', '<label>Crosshair</label>', list);
      const xctl = el('div', 'cc-cycle', null, xrow);
      const setX = (i) => { st.crosshair = xl[(i + xl.length) % xl.length].id; R.Save.saveSettings(); XH.apply(); UI.refresh(); };
      UI.button(xctl, '◀', () => setX(xi - 1));
      const xv = el('span', 'xh-prev', null, xctl); xv.appendChild(XH.image(xl[xi].id, st.crosshairColor || null, 2)); el('small', null, `${xl[xi].name} (${xi === 0 ? 'default' : xi + ' of ' + (xl.length - 1)})`, xv);
      UI.button(xctl, '▶', () => setX(xi + 1));
      const xcol = el('div', 'set-row', '<label>Crosshair colour</label>', list);
      const sws = el('div', 'xh-cols', null, xcol);
      for (const c of XH.COLORS) {
        const sw = el('div', 'sw' + ((st.crosshairColor || null) === c ? ' sel' : '') + (c ? '' : ' none'), c ? '' : '★', sws);
        if (c) sw.style.background = c; sw.title = c ? c : "The design's own colours";
        sw.onclick = () => { st.crosshairColor = c; R.Save.saveSettings(); XH.apply(); UI.refresh(); };
      }
      toggle('HD-2D graphics (3D world, F9)', 'hd2d');
      toggle('Day & night cycle', 'dayNight');
      slider('Master Volume', 'master', (v) => R.Audio.setVolume('master', v));
      slider('Music', 'music', (v) => R.Audio.setVolume('music', v));
      slider('Sound Effects', 'sfx', (v) => R.Audio.setVolume('sfx', v));
      toggle('Mute when the game is in the background', 'muteUnfocused', () => R.Audio.syncBackground && R.Audio.syncBackground());
      toggle('Screen Shake', 'shake');
      toggle('Fancy Effects (glow, weather)', 'fancy');
      toggle('Villager chatter bubbles', 'chatter');
      toggle('Autosave', 'autosave');
      toggle('Quest Arrow', 'guide');
      toggle('Show FPS', 'showFps', (v) => document.getElementById('fps').classList.toggle('hidden', !v));
      if (isElectron()) toggle('Fullscreen (F11)', 'fullscreen', (v) => window.electronAPI.setFullscreen(v));
      // Browser version (Chromebooks): the browser's own fullscreen
      else if (document.fullscreenEnabled) {
        R.settings.fullscreen = !!document.fullscreenElement;
        toggle('Fullscreen', 'fullscreen', (v) => {
          if (v && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          if (!v && document.fullscreenElement) document.exitFullscreen().catch(() => {});
        });
      }
      UI.button(body, '← Back', () => UI.back());
    },
  };

  S.controls = {
    build(m, arg) {
      const body = UI.frame(m, 'Controls', 'controls-frame');
      const rows = [
        ['Move', 'W A S D / Arrow keys'], ['Aim', 'Mouse'], ['Attack', 'Left click (hold) / J'], ['Dodge roll (25 stamina)', 'Space'], ['Sprint (drains stamina)', 'Hold Shift'], ['Heavy attack (25 stamina)', 'Right click / U'], ['Skills', '1 2 3 4'],
        ['Health / Mana potion', 'Q / R'], ['Interact / Talk', 'E / F'], ['Crafting recipes', 'B'], ['Mount up / dismount', 'H'], ['Mount ability (while riding)', 'Space'], ['Stable: mounts & pets', 'N'], ['Achievements', 'O'], ['Inventory', 'I / Tab'], ['Character', 'C'], ['Skills', 'K'], ['Quest log', 'L'], ['Map', 'M'], ['Pause / Back', 'Esc'],
        ['Menus', 'Arrow keys to move · Enter to select · Esc to go back'],
        ['Gamepad', 'Left stick move · Right stick aim · RT attack · LT heavy attack · A dodge · R3 sprint · LB/RB/B/L3 skills · Y interact · D-pad potions'],
        ['Gamepad menus', 'D-pad / stick to move · A select · B back · X drop/sell all'],
      ];
      const t = el('div', 'stat-table controls scroll', null, body);
      for (const [a, b] of rows) el('div', 'stat-row', `<span>${a}</span><b>${b}</b>`, t);
      el('div', 'hint', 'Tip: Attacks chain into 3-hit combos — the third hit is a heavy finisher and staggers enemies mid-swing. Rolling makes you briefly invulnerable.', body);
      UI.button(body, '← Back', () => UI.back());
    },
  };

  // ============================================================================
  // DEATH
  // ============================================================================
  S.death = {
    build(m) {
      const box = el('div', 'death', null, m);
      el('div', 'death-title', 'You Have Fallen', box);
      el('div', 'death-sub', 'But legends do not end so easily...', box);
      const menu = el('div', 'title-menu', null, box);
      UI.button(menu, 'Rise Again <small>(return to Havenbrook, lose 10% gold)</small>', () => { UI.close(true); R.respawn(); }, 'big');
      if (R.Save.exists('auto')) UI.button(menu, 'Load Autosave', () => { UI.close(true); R.Save.load('auto'); });
      UI.button(menu, 'Quit to Title', () => { UI.close(true); R.toTitle(); });
    },
    back() {},
  };
})(window.RPG);
