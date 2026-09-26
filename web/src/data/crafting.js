'use strict';
// Crafting, gathering and enchanting.
//
//   Gathering nodes (herbs, ore veins, timber) grow in the wilds; walk up and press E.
//   Crafting Stations (Havenbrook, the Oasis, wilderness camps) have four benches:
//     Alchemy    - potions and elixirs from herbs and monster parts
//     Smithing   - forge the weapon or armor piece you want, at any tier you've reached
//     Enchanting - one enchantment per item (I, II or III), paid in Arcane Dust / Shards / Prisms
//     Salvage    - break unwanted gear down into Arcane materials
//   Enchantments live on the inventory entry ({id, qty, ench:{id, lv}}) or, when worn, in player.ench[slot].
(function (R) {
  const U = R.U, add = R.addItem;
  const CR = R.Crafting = { atStation: null };

  // ================================================================== materials
  const mat = (id, name, price, shape, color, color2, desc, rarity) => add({ id, name, slot: 'material', price, rarity, icon: { shape, color, color2 }, desc, craftMat: true });
  mat('meadowleaf', 'Meadowleaf', 4, 'feather', '#60c040', '#c0ff80', 'A soft green herb. The base of most healing brews.');
  mat('glowmoss', 'Glowmoss', 6, 'blob', '#40c0b0', '#c0fff0', 'Moss that glows faintly blue-green. Alchemists use it for mana draughts.');
  mat('emberroot', 'Emberroot', 12, 'fang', '#e05020', '#ffc060', 'A root that stays warm for days. Burns your tongue. Heals your wounds.');
  mat('frostbloom', 'Frostbloom', 16, 'crystal', '#80c0ff', '#ffffff', 'A flower with petals of living ice. It only grows where it never thaws.');
  mat('timber', 'Timber', 5, 'bone', '#a07040', '#6a4424', 'Good straight wood for hafts, bows and bow-staves.');
  mat('iron_ore', 'Iron Ore', 8, 'ore', '#b08070', '#6a5a50', 'Rusty-red rock heavy with iron.');
  mat('mithril_ore', 'Mithril Ore', 22, 'ore', '#80d0ff', '#e0f8ff', 'Silver-blue ore, light as a feather and hard as a promise.', 'uncommon');
  mat('adamant_ore', 'Adamant Ore', 40, 'ore', '#b070ff', '#e0c0ff', 'Violet ore that hums when struck. Almost nothing can scratch it.', 'rare');
  mat('starmetal', 'Starmetal', 80, 'ore', '#fff0a0', '#ffffff', 'Metal that fell from the sky. It is still faintly warm.', 'epic');
  mat('raw_gem', 'Rough Gem', 45, 'gem', '#e04080', '#ffc0e0', 'An uncut gemstone. Jewelers and enchanters both want it.', 'rare');
  mat('arcane_dust', 'Arcane Dust', 10, 'bag', '#b080ff', '#e8d8ff', 'Glittering dust left over when magic gear is taken apart. Used for enchanting.');
  mat('arcane_shard', 'Arcane Shard', 60, 'crystal', '#c060ff', '#f0d0ff', 'A sliver of crystallised magic, from rare and epic gear.', 'rare');
  mat('arcane_prism', 'Arcane Prism', 300, 'gem', '#ff80ff', '#ffffff', 'A perfect prism of pure magic, from legendary gear. Needed for the strongest enchantments.', 'legendary');

  // ================================================================== enchantments
  // stats(L, lv): L = item level, lv = enchantment level 1..3
  const E = CR.ENCH = {
    sharpness: { name: 'Sharpness', color: '#e0e8ff', slots: ['weapon'], stats: (L, lv) => ({ atk: Math.round((2 + L * 0.35) * lv) }), text: 'Attack' },
    arcana: { name: 'Arcana', color: '#b080ff', slots: ['weapon', 'offhand', 'ring', 'amulet', 'head'], stats: (L, lv) => ({ mag: Math.round((2 + L * 0.35) * lv), mp: Math.round((5 + L) * lv) }), text: 'Magic and mana' },
    flame: { name: 'Flame', color: '#ff7030', slots: ['weapon'], effect: (L, lv) => ({ burn: Math.round((2 + L * 0.45) * lv) }), text: 'Hits set enemies on fire' },
    venom: { name: 'Venom', color: '#80ff40', slots: ['weapon'], effect: (L, lv) => ({ poison: Math.round((2 + L * 0.45) * lv) }), text: 'Hits poison enemies' },
    frost: { name: 'Frost', color: '#80d8ff', slots: ['weapon'], effect: (L, lv) => (lv >= 3 ? { slow: 1, freeze: 1 } : { slow: 1 }), text: 'Hits slow enemies (III: can freeze)' },
    storm: { name: 'Storm', color: '#c0c0ff', slots: ['weapon'], effect: () => ({ shock: 1 }), stats: (L, lv) => ({ atk: Math.round((1 + L * 0.12) * (lv - 1)) }), text: 'Hits arc lightning to another enemy' },
    vampiric: { name: 'Vampiric', color: '#e02040', slots: ['weapon', 'ring', 'amulet'], stats: (L, lv) => ({ lifesteal: 0.015 * lv }), text: 'Heal from the damage you deal' },
    precision: { name: 'Precision', color: '#ffd040', slots: ['weapon', 'hands', 'ring', 'amulet'], stats: (L, lv) => ({ crit: 2.5 * lv, critDmg: 0.08 * lv }), text: 'Critical chance and damage' },
    protection: { name: 'Protection', color: '#a0b0c0', slots: ['head', 'chest', 'legs', 'feet', 'hands', 'offhand', 'cape'], stats: (L, lv) => ({ def: Math.round((1 + L * 0.25) * lv) }), text: 'Defense' },
    vitality: { name: 'Vitality', color: '#ff6080', slots: ['head', 'chest', 'legs', 'feet', 'hands', 'offhand', 'cape', 'ring', 'amulet'], stats: (L, lv) => ({ hp: Math.round((10 + L * 2.5) * lv) }), text: 'Max health' },
    regeneration: { name: 'Regeneration', color: '#60ff90', slots: ['chest', 'legs', 'head', 'amulet'], stats: (L, lv) => ({ hpRegen: Math.round((0.4 + L * 0.04) * lv * 10) / 10 }), text: 'Health regeneration' },
    evasion: { name: 'Evasion', color: '#c0c0ff', slots: ['feet', 'hands', 'cape', 'chest'], stats: (L, lv) => ({ dodge: 1.5 * lv }), text: 'Dodge chance' },
    swiftness: { name: 'Swiftness', color: '#40e0c0', slots: ['feet', 'legs', 'cape'], stats: (L, lv) => ({ spd: 0.025 * lv }), text: 'Move speed' },
    wisdom: { name: 'Wisdom', color: '#4080ff', slots: ['ring', 'amulet', 'head', 'offhand'], stats: (L, lv) => ({ mp: Math.round((8 + L * 1.5) * lv), mpRegen: Math.round(0.3 * lv * 10) / 10 }), text: 'Mana and mana regeneration' },
    haste: { name: 'Haste', color: '#ffe070', slots: ['ring', 'amulet', 'hands'], stats: (L, lv) => ({ cdr: 0.025 * lv }), text: 'Faster skill cooldowns' },
    power: { name: 'Power', color: '#ff9040', slots: ['ring', 'amulet', 'chest'], stats: (L, lv) => ({ str: lv, dex: lv, int: lv, vit: lv }), text: 'All attributes' },
  };
  const ROMAN = ['', 'I', 'II', 'III'];
  CR.roman = (lv) => ROMAN[lv] || lv;
  CR.enchantsFor = (it) => Object.entries(E).filter(([, e]) => e.slots.includes(it.slot)).map(([id]) => id);
  CR.stats = function (en, it) { const e = en && E[en.id]; return e && e.stats && it ? e.stats(it.level || 1, en.lv) : {}; };
  CR.effect = function (en, it) { const e = en && E[en.id]; return e && e.effect && it ? e.effect(it.level || 1, en.lv) : {}; };
  CR.label = (en) => (en && E[en.id] ? `${E[en.id].name} ${ROMAN[en.lv]}` : '');
  // Tooltip lines for an enchantment on an item.
  CR.tipHTML = function (en, it) {
    const e = en && E[en.id]; if (!e) return '';
    let h = `<div class="tt-ench" style="color:${e.color}">✧ ${e.name} ${ROMAN[en.lv]}</div>`;
    const st = CR.stats(en, it);
    for (const k in st) if (st[k]) h += `<div class="tt-line ench">${R.UI.fmtStat(k, st[k])} ${R.UI.STAT_NAMES[k] || k}</div>`;
    if (e.effect) h += `<div class="tt-line ench">${U.esc(e.text)}</div>`;
    return h;
  };
  CR.enchantCost = function (it, lv) {
    const L = it.level || 1;
    if (lv === 1) return { gold: 40 + L * 4, mats: { arcane_dust: 3 } };
    if (lv === 2) return { gold: 100 + L * 9, mats: { arcane_dust: 6, arcane_shard: 1 } };
    return { gold: 250 + L * 16, mats: { arcane_shard: 3, raw_gem: 1, arcane_prism: L >= 18 ? 1 : 0 } };
  };

  // ================================================================== salvage
  CR.salvageYield = function (it) {
    const r = it.rarity || 'common';
    const lvb = Math.floor((it.level || 1) / 8);
    return {
      common: { arcane_dust: 1 + lvb }, uncommon: { arcane_dust: 2 + lvb }, rare: { arcane_dust: 3 + lvb, arcane_shard: 0.35 },
      epic: { arcane_dust: 4, arcane_shard: 1 + (lvb > 1 ? 1 : 0) }, legendary: { arcane_shard: 2, arcane_prism: 0.4 }, mythic: { arcane_shard: 3, arcane_prism: 1 },
    }[r] || { arcane_dust: 1 };
  };
  CR.canSalvage = (it) => it && R.SLOTS.includes(it.slot) && !it.noDrop && it.slot !== 'quest';

  // ================================================================== alchemy
  CR.ALCHEMY = [
    { out: 'potion_small', n: 1, mats: { meadowleaf: 2 } },
    { out: 'potion', n: 1, mats: { meadowleaf: 3, slime_gel: 1 }, lv: 4 },
    { out: 'potion_large', n: 1, mats: { meadowleaf: 2, emberroot: 2, wisp_essence: 1 }, lv: 10 },
    { out: 'potion_super', n: 1, mats: { emberroot: 2, frostbloom: 2, frost_core: 1 }, lv: 16 },
    { out: 'ether_small', n: 1, mats: { glowmoss: 2 } },
    { out: 'ether', n: 1, mats: { glowmoss: 3, bat_wing: 1 }, lv: 6 },
    { out: 'ether_large', n: 1, mats: { glowmoss: 2, frostbloom: 2, ectoplasm: 1 }, lv: 14 },
    { out: 'antidote', n: 2, mats: { meadowleaf: 1, venom_sac: 1 } },
    { out: 'elixir_speed', n: 1, mats: { meadowleaf: 2, bat_wing: 1, timber: 1 }, lv: 3 },
    { out: 'elixir_might', n: 1, mats: { emberroot: 2, boar_tusk: 1 }, lv: 5 },
    { out: 'elixir_arcana', n: 1, mats: { glowmoss: 2, wisp_essence: 1 }, lv: 5 },
    { out: 'elixir_iron', n: 1, mats: { meadowleaf: 2, iron_ore: 2, lizard_scale: 1 }, lv: 5 },
    { out: 'fish', n: 2, mats: { timber: 1, silver_trout: 1 } },
  ];

  // ================================================================== smithing
  CR.TIERS = [
    { bi: 1, name: 'Iron', lv: 5, weapon: { iron_ore: 5, timber: 2 }, armor: { iron_ore: 4, wolf_pelt: 2 }, gold: 50 },
    { bi: 2, name: 'Steel', lv: 10, weapon: { iron_ore: 9, timber: 3 }, armor: { iron_ore: 7, lizard_scale: 2 }, gold: 140 },
    { bi: 3, name: 'Mithril', lv: 15, weapon: { mithril_ore: 6, timber: 3 }, armor: { mithril_ore: 5, yeti_fur: 2 }, gold: 340 },
    { bi: 4, name: 'Adamant', lv: 20, weapon: { adamant_ore: 6, ember_core: 2 }, armor: { adamant_ore: 5, magma_shard: 2 }, gold: 700 },
    { bi: 5, name: 'Starforged', lv: 25, weapon: { starmetal: 5, shadow_essence: 2 }, armor: { starmetal: 4, dark_steel: 2 }, gold: 1500 },
  ];
  CR.MASTERWORK = { raw_gem: 2, arcane_shard: 2 };
  // What a player of this class can forge at a tier: [{key, label, id (normal), mw (masterwork id)}]
  CR.forgeList = function (p, tier) {
    const cls = R.Classes[p.cls], bi = tier.bi, out = [];
    for (const type of cls.weapons) if (R.Items[`${type}_${bi}c`]) out.push({ key: 'w:' + type, kind: 'weapon', id: `${type}_${bi}c`, mw: `${type}_${bi}r` });
    const weights = ['heavy', 'medium', 'light'].filter((w) => cls.armor.includes(w));
    for (const w of weights) for (const slot of ['head', 'chest', 'legs', 'feet', 'hands']) if (R.Items[`${w}_${slot}_${bi}`]) out.push({ key: 'a:' + w + slot, kind: 'armor', id: `${w}_${slot}_${bi}`, mw: `${w}_${slot}_${bi}s` });
    for (const pre of ['shield', 'tome', 'quiver']) { const it = R.Items[`${pre}_${bi}`]; if (it && (!it.classes || it.classes.includes(p.cls))) out.push({ key: 'o:' + pre, kind: 'armor', id: it.id, mw: it.id, mwEnchant: true }); }
    if (R.Items[`cape_${bi}`]) out.push({ key: 'c', kind: 'armor', id: `cape_${bi}`, mw: `cape_${bi}`, mwEnchant: true });
    return out;
  };

  // ================================================================== inventory helpers
  CR.has = (p, mats, times) => { for (const k in mats) if (mats[k] && p.count(k) < mats[k] * (times || 1)) return false; return true; };
  CR.take = (p, mats, times) => { for (const k in mats) if (mats[k]) p.removeItem(k, mats[k] * (times || 1)); };

  // ================================================================== gathering nodes
  // kind -> look + what it gives. Nodes regrow after a few minutes.
  CR.NODES = {
    meadowleaf: { label: 'Gather Meadowleaf', item: 'meadowleaf', n: [2, 3], color: '#60c040', flower: '#f0f080', type: 'herb' },
    glowmoss: { label: 'Gather Glowmoss', item: 'glowmoss', n: [2, 3], color: '#2a8a80', flower: '#80fff0', type: 'herb', glow: '#60ffe0' },
    emberroot: { label: 'Dig up Emberroot', item: 'emberroot', n: [1, 2], color: '#8a5a30', flower: '#ff6020', type: 'herb', glow: '#ff8040' },
    frostbloom: { label: 'Pick Frostbloom', item: 'frostbloom', n: [1, 2], color: '#6a90b0', flower: '#c0f0ff', type: 'herb', glow: '#a0e0ff' },
    timber: { label: 'Chop Timber', item: 'timber', n: [2, 3], type: 'log' },
    iron_ore: { label: 'Mine Iron Ore', item: 'iron_ore', n: [2, 3], vein: '#c07050', type: 'ore', gem: 0.06 },
    mithril_ore: { label: 'Mine Mithril Ore', item: 'mithril_ore', n: [1, 3], vein: '#80d8ff', type: 'ore', gem: 0.1 },
    adamant_ore: { label: 'Mine Adamant Ore', item: 'adamant_ore', n: [1, 2], vein: '#c080ff', type: 'ore', gem: 0.12 },
    starmetal: { label: 'Mine Starmetal', item: 'starmetal', n: [1, 2], vein: '#fff0a0', type: 'ore', gem: 0.2, glow: '#fff0a0' },
    gem: { label: 'Mine Gem Cluster', item: 'raw_gem', n: [1, 2], vein: '#ff60a0', type: 'ore', glow: '#ff80c0' },
  };
  const regrow = {}; // node key -> playtime when it is back
  let NodeClass = null;
  function makeNode() {
    if (NodeClass) return NodeClass;
    const G = R.G, FX = R.FX;
    NodeClass = class extends R.Entity {
      constructor(n) { super(n.x, n.y); this.n = n; this.kind = CR.NODES[n.kind]; this.solid = false; this.r = 7; this.interactR = 26; this.t = Math.random() * 9; }
      ready() { return !(regrow[this.n.key] > (R.playtime || 0)); }
      interactLabel() { return this.ready() ? this.kind.label : null; }
      interact() {
        const p = R.World.player;
        if (!this.ready() || this.busy) return;
        this.busy = true;
        p.castT = p.castDur = 0.7; p.dir = p.x < this.x ? 'right' : 'left';
        R.Audio.play(this.kind.type === 'ore' ? 'hit' : this.kind.type === 'log' ? 'swing' : 'pickup', { pitch: this.kind.type === 'ore' ? 0.7 : 1.2 });
        FX.burst(this.x, this.y - 6, { n: 10, color: this.kind.vein || this.kind.flower || '#a07040', speed: 40, life: 0.4, grav: 150, vz: 50 });
        R.World.later(0.6, () => {
          this.busy = false;
          if (!this.ready()) return;
          regrow[this.n.key] = (R.playtime || 0) + 240 + Math.random() * 120;
          const k = this.kind, qty = U.randInt ? U.randInt(k.n[0], k.n[1]) : k.n[0] + Math.floor(Math.random() * (k.n[1] - k.n[0] + 1));
          p.addItem(k.item, qty); R.UI.lootToast(R.Items[k.item], qty);
          if (k.gem && Math.random() < k.gem) { p.addItem('raw_gem', 1); R.UI.lootToast(R.Items.raw_gem, 1); R.Audio.play('crit'); }
          R.Audio.play('pickup');
          FX.burst(this.x, this.y - 8, { n: 14, color: k.glow || k.vein || k.flower || '#c0a060', speed: 50, life: 0.5, glow: true });
          R.events.emit('gather', { item: k.item, qty });
        });
      }
      update(dt) { this.t += dt; }
      draw(ctx) {
        const k = this.kind, ready = this.ready();
        const spr = G.sprite('node|' + this.n.kind + '|' + (ready ? 1 : 0), 22, 18, (c) => drawNode(G.painter(c), k, ready), { outline: true });
        ctx.drawImage(spr, Math.round(this.x - 11), Math.round(this.y - 16));
        if (ready && k.glow && R.settings.fancy !== false) {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(this.t * 3) * 0.12;
          ctx.drawImage(G.glow(10, k.glow), Math.round(this.x - 10), Math.round(this.y - 18));
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        if (ready && Math.sin(this.t * 1.3) > 0.97) FX.particle({ x: this.x + U.rand(-6, 6), y: this.y - U.rand(4, 12), life: 0.5, color: '#fff4c0', glow: true });
      }
    };
    return NodeClass;
  }
  function drawNode(P, k, ready) {
    if (k.type === 'herb') {
      const c = ready ? k.color : '#5a5040';
      for (let i = 0; i < 5; i++) { const x = 5 + i * 3; P.rect(x, 9 - (i % 2) * 2, 1, 8 + (i % 2) * 2, c); P.rect(x - 1, 11 - (i % 3), 3, 1, U.shade(c, 0.2)); }
      if (ready) for (const [x, y] of [[5, 7], [11, 5], [17, 8], [8, 10], [14, 9]]) { P.rect(x - 1, y, 3, 1, k.flower); P.rect(x, y - 1, 1, 3, k.flower); P.px(x, y, '#ffffff'); }
    } else if (k.type === 'log') {
      P.rect(2, 9, 18, 6, ready ? '#7a5030' : '#5a4030'); P.rect(2, 9, 18, 2, ready ? '#9a6a40' : '#6a5040'); P.ellipse(19, 12, 2, 3, '#c09060'); P.px(19, 12, '#8a6030');
      if (ready) { P.rect(8, 6, 1, 3, '#4a8a3a'); P.px(7, 6, '#60b040'); P.px(9, 5, '#60b040'); }
    } else {
      const base = ready ? '#6a6068' : '#4a4448';
      P.ellipse(11, 12, 9, 5, base); P.ellipse(9, 9, 6, 4, U.shade(base, 0.12)); P.ellipse(14, 10, 5, 4, base);
      if (ready) for (const [x, y] of [[7, 9], [12, 8], [15, 11], [9, 13], [13, 13]]) { P.px(x, y, k.vein); P.px(x + 1, y, U.shade(k.vein, 0.35)); }
    }
  }
  // Maps list nodes in M.nodes = [{kind, x, y (px), key}]; the builder helper M.node(kind, tx, ty) adds one.
  R.events.on('enter', () => {
    const W = R.World, M = W.map;
    if (!M.nodes || !M.nodes.length) return;
    const Node = makeNode();
    for (const n of M.nodes) W.add(new Node(n));
  });

  // ================================================================== crafting stations
  let StationClass = null;
  function makeStation() {
    if (StationClass) return StationClass;
    const G = R.G;
    StationClass = class extends R.Entity {
      constructor(x, y) { super(x, y); this.solid = false; this.r = 10; this.interactR = 30; this.t = Math.random() * 5; this.box = [-12, -5, 24, 5]; }
      interactLabel() { return 'Crafting Station'; }
      interact() { CR.atStation = this; R.UI.open('crafting'); }
      update(dt) { this.t += dt; }
      draw(ctx) {
        const spr = G.sprite('craftstation', 40, 30, (c) => {
          const P = G.painter(c);
          // workbench
          P.rect(2, 12, 24, 4, '#9a6a3a'); P.rect(2, 12, 24, 1, '#b8844c'); P.rect(3, 16, 2, 12, '#6a4424'); P.rect(23, 16, 2, 12, '#6a4424'); P.rect(3, 22, 22, 1, '#6a4424');
          P.rect(5, 8, 5, 4, '#a0a0a8'); P.rect(6, 7, 3, 1, '#c8c8d0'); // hammer head
          P.rect(12, 6, 2, 6, '#e0e0f0'); P.rect(11, 9, 4, 1, '#c8a040'); // blade
          P.rect(17, 9, 3, 3, '#60c040'); P.rect(21, 8, 3, 4, '#4060e0'); P.px(18, 8, '#c0ff80'); P.px(22, 7, '#a0c0ff'); // flasks
          // enchanting stand
          P.rect(29, 14, 8, 14, '#4a3a5a'); P.rect(28, 13, 10, 2, '#6a5a7a'); P.rect(30, 28, 6, 1, '#2a1a3a');
          P.circle(33, 8, 4, '#b080ff'); P.circle(32, 7, 1, '#ffffff');
        }, { outline: true });
        ctx.drawImage(spr, Math.round(this.x - 14), Math.round(this.y - 28));
        if (R.settings.fancy !== false) {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(this.t * 2.5) * 0.15;
          ctx.drawImage(G.glow(12, '#b080ff'), Math.round(this.x + 19 - 12), Math.round(this.y - 20 - 12));
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    };
    return StationClass;
  }
  R.events.on('enter', () => {
    const W = R.World, M = W.map;
    if (!M.stations) return;
    const St = makeStation();
    for (const s of M.stations) W.add(new St(s.x, s.y));
  });
  CR.nearStation = function () {
    const W = R.World, p = W.player;
    if (!p) return false;
    return W.entities.some((e) => StationClass && e instanceof StationClass && U.dist(e.x, e.y, p.x, p.y) < 70);
  };

  // Builder helpers (added to every map builder).
  // (world.js calls CR.extendBuilder on every new map builder)
  CR.extendBuilder = function (M) {
    M.nodes = M.nodes || []; M.stations = M.stations || [];
    M.node = (kind, x, y) => { if (!CR.NODES[kind]) return; M.nodes.push({ kind, x: x * 16 + 8, y: y * 16 + 13, key: M.id + ':' + kind + ':' + (x | 0) + ',' + (y | 0) }); M.reserve(x | 0, y | 0, 1, 1); };
    M.station = (x, y) => { M.stations.push({ x: x * 16 + 8, y: y * 16 + 14 }); M.reserve((x | 0) - 1, (y | 0) - 1, 4, 2); };
  };

  // Stations in the towns (coordinates are in each map's original layout).
  const addTo = (id, fn) => { const d = R.Maps[id]; if (!d) return; const orig = d.build; d.build = function (M) { orig.call(this, M); fn(M); }; };
  addTo('town', (M) => { M.station(52, 23); M.sign(50, 24, 'Crafting Station\nAlchemy · Smithing · Enchanting · Salvage\n(Gather herbs and ore out in the wilds.)'); });
  addTo('oasis', (M) => { M.station(33, 27); });
})(window.RPG);
