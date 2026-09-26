'use strict';
// Generated gear: tiered weapons for every weapon type, armor for each weight, sets,
// accessories, consumables, and unique boss loot (dropsFrom). Hand-made starter items live in items.js.
(function (R) {
  const add = R.addItem;
  const BANDS = [
    { lv: 1, mat: 'Bronze', blade: '#c8904a', cloth: '#6a5a3a', leather: '#7a5230', plate: '#9a7a4a' },
    { lv: 5, mat: 'Iron', blade: '#a8b0b8', cloth: '#3a5a8a', leather: '#5a3a22', plate: '#8a929a' },
    { lv: 10, mat: 'Steel', blade: '#d8e0e8', cloth: '#6a2a6a', leather: '#3a3a3a', plate: '#b0b8c4' },
    { lv: 15, mat: 'Mithril', blade: '#a0e0ff', cloth: '#1a6a6a', leather: '#2a4a3a', plate: '#80b8d8' },
    { lv: 20, mat: 'Adamant', blade: '#c090ff', cloth: '#3a1a4a', leather: '#2a1a2a', plate: '#5a4a7a' },
    { lv: 25, mat: 'Starforged', blade: '#fff0c0', cloth: '#1a1040', leather: '#241838', plate: '#e0d8f0' },
  ];
  const RAR = { common: 1, uncommon: 1.12, rare: 1.25, epic: 1.4, legendary: 1.6, mythic: 1.8 };
  const TYPE = {
    sword: { f: 1, n: 'Longsword' }, greatsword: { f: 1.4, n: 'Claymore' }, axe: { f: 1.15, n: 'Battleaxe' }, dagger: { f: 0.7, n: 'Dirk' },
    spear: { f: 1.1, n: 'Spear' }, hammer: { f: 1.5, n: 'Warhammer' }, mace: { f: 1.05, n: 'Mace' }, bow: { f: 1, n: 'Longbow' },
    crossbow: { f: 1.3, n: 'Crossbow' }, staff: { f: 1.1, n: 'Staff' }, wand: { f: 0.75, n: 'Wand' },
  };
  const price = (lv, rar) => Math.round((20 + lv * lv * 6) * ({ common: 1, uncommon: 1.6, rare: 2.6, epic: 4.5, legendary: 8, mythic: 12 })[rar]);
  const dmg = (lv, rar, type) => Math.round((5 + lv * 2.2) * RAR[rar] * TYPE[type].f);

  // Per-type flavour for the rare/epic versions: name, look style, effect, glow
  const RARE = {
    sword: [{ n: 'Flamebrand', style: 'flame', effect: { burn: 1 }, glow: '#ff8030' }, { n: 'Stormblade', style: 'runed', effect: { shock: 1 }, glow: '#9fd8ff' }],
    greatsword: [{ n: 'Doomcleaver', style: 'serrated', effect: { slow: 1 }, glow: '#ff4060' }, { n: 'Dawnbreaker', style: 'runed', effect: { burn: 1 }, glow: '#ffe070' }],
    axe: [{ n: 'Frostbite Axe', style: 'double', effect: { freeze: 1 }, glow: '#80d0ff' }, { n: 'Bloodreaver', style: 'double', stats: { lifesteal: 0.04 }, glow: '#e02040' }],
    dagger: [{ n: 'Viper Fang', style: 'curved', effect: { poison: 1 }, glow: '#80ff40' }, { n: 'Nightkiss', style: 'curved', stats: { crit: 6 }, glow: '#b070ff' }],
    spear: [{ n: 'Thunder Pike', style: 'halberd', effect: { shock: 1 }, glow: '#9fd8ff' }, { n: 'Glacial Lance', effect: { slow: 1 }, glow: '#80d0ff' }],
    hammer: [{ n: 'Earthshaker', effect: { slow: 1 }, glow: '#e0a040' }, { n: 'Thunderhead', effect: { shock: 1 }, glow: '#9fd8ff' }],
    mace: [{ n: 'Sunforged Mace', effect: { burn: 1 }, glow: '#ffe070' }, { n: 'Skullcrusher', stats: { critDmg: 0.2 }, glow: '#e0d0c0' }],
    bow: [{ n: 'Galeforce Bow', style: 'recurve', effect: { multishot: 2 }, glow: '#a0ff80' }, { n: 'Emberstring', style: 'recurve', effect: { burn: 1 }, glow: '#ff8030' }],
    crossbow: [{ n: 'Siegebreaker', effect: { explode: { r: 26, mult: 0.6 } }, glow: '#ffa040' }, { n: 'Venomshot', effect: { poison: 1 }, glow: '#80ff40' }],
    staff: [{ n: 'Staff of Cinders', effect: { element: 'fire' }, gem: '#ff6020' }, { n: 'Rimefrost Staff', effect: { element: 'ice' }, gem: '#a0e8ff' }, { n: 'Stormcaller', effect: { element: 'lightning' }, gem: '#c0c0ff' }],
    wand: [{ n: 'Hexwand', effect: { element: 'poison', homing: 4 }, gem: '#80ff40' }, { n: 'Sparkwand', effect: { element: 'lightning' }, gem: '#ffff80' }],
  };

  // ---------------------------------------------------------------- weapons
  for (const [type, T] of Object.entries(TYPE)) {
    BANDS.forEach((b, bi) => {
      const baseLook = { type, blade: b.blade, handle: ['#6a4424', '#5a3a20', '#3a2a20', '#2a3a4a', '#2a1a3a', '#1a1030'][bi], guard: ['#8a6a3a', '#9a9aa0', '#c8a040', '#e0f0ff', '#b070ff', '#ffe070'][bi] };
      if (type === 'staff' || type === 'wand') { baseLook.gem = ['#6fd8ff', '#80ffb0', '#ff60c0', '#ffe070', '#c080ff', '#ffffff'][bi]; baseLook.blade = baseLook.guard; }
      if (type === 'bow' || type === 'crossbow') { baseLook.blade = ['#8a5a30', '#6a4424', '#4a3020', '#a0c8d8', '#6a3a8a', '#e0d0a0'][bi]; baseLook.handle = '#3a2418'; }
      const lv = Math.max(1, b.lv + (bi === 0 ? 1 : 0));
      const magic = type === 'staff' || type === 'wand';
      add({ id: `${type}_${bi}c`, name: `${b.mat} ${T.n}`, slot: 'weapon', type, rarity: 'common', level: lv, dmg: dmg(lv, 'common', type), price: price(lv, 'common'),
        stats: magic ? { mag: 2 + bi * 3, mp: 5 + bi * 8 } : {}, look: baseLook });
      const flav = RARE[type][bi % RARE[type].length];
      const rl = lv + 2;
      const rareEff = Object.assign({}, flav.effect || {});
      if (rareEff.burn) rareEff.burn = 2 + rl; if (rareEff.poison) rareEff.poison = 2 + rl;
      const rrar = bi >= 5 ? 'legendary' : bi >= 3 ? 'epic' : 'rare';
      add({ id: `${type}_${bi}r`, name: bi >= 5 ? `Starforged ${flav.n}` : `${flav.n}`, slot: 'weapon', type, rarity: rrar, level: rl, dmg: dmg(rl, rrar, type), price: price(rl, rrar),
        stats: Object.assign(magic ? { mag: 4 + bi * 4, mp: 10 + bi * 10 } : { atk: 1 + bi * 2 }, flav.stats || {}), effect: rareEff,
        look: Object.assign({}, baseLook, { style: flav.style || baseLook.style, glow: flav.glow, gem: flav.gem || baseLook.gem }),
        desc: bi >= 3 ? 'Forged in an age of heroes.' : undefined });
    });
  }

  // ---------------------------------------------------------------- armor
  const WEIGHTS = {
    light: { f: 0.6, names: { head: 'Hood', chest: 'Robe', legs: 'Leggings', feet: 'Slippers', hands: 'Gloves' }, style: { head: 'wizard', chest: 'robe' }, bonus: { mp: 20, mag: 3, mpRegen: 1 }, set: 'Arcanist', key: 'cloth' },
    medium: { f: 1, names: { head: 'Cowl', chest: 'Jerkin', legs: 'Breeches', feet: 'Boots', hands: 'Bracers' }, style: { head: 'hood', chest: 'leather' }, bonus: { crit: 4, dodge: 3, spd: 0.04 }, set: 'Stalker', key: 'leather' },
    heavy: { f: 1.5, names: { head: 'Helm', chest: 'Cuirass', legs: 'Greaves', feet: 'Sabatons', hands: 'Gauntlets' }, style: { head: 'full', chest: 'plate' }, bonus: { def: 8, hp: 40, hpRegen: 1 }, set: 'Bulwark', key: 'plate' },
  };
  const RARE_COL = { light: ['#4a6aa0', '#5a3a8a', '#8a2a5a', '#2a8a8a', '#e0e0f0', '#3a2a7a'], medium: ['#6a4a2a', '#3a5a3a', '#4a2a2a', '#1a3a4a', '#2a1a3a', '#4a2a6a'], heavy: ['#a08050', '#9aa4b0', '#c0c8d8', '#6ab0e0', '#3a2a5a', '#f0e8ff'] };
  const SLOTMUL = { head: 1.2, chest: 2, legs: 1.2, feet: 0.8, hands: 0.8 };
  const MATNAME = { light: ['Linen', 'Wool', 'Silk', 'Moonweave', 'Starweave', 'Voidsilk'], medium: ['Hide', 'Leather', 'Studded', 'Drakeskin', 'Shadowhide', 'Riftleather'], heavy: ['Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Starforged'] };
  const HEADSTYLE = { light: ['hood', 'wizard', 'wizard', 'circlet', 'crown', 'circlet'], medium: ['cap', 'hood', 'leather', 'hood', 'bandana', 'hood'], heavy: ['default', 'full', 'knight', 'horned', 'dragon', 'knight'] };
  for (const [w, Wd] of Object.entries(WEIGHTS)) {
    BANDS.forEach((b, bi) => {
      const col = b[Wd.key];
      const trim = ['#d8c8a0', '#c8a040', '#e0e0e0', '#a0e0ff', '#ffd040', '#e0c0ff'][bi];
      for (const slot of Object.keys(SLOTMUL)) {
        const lv = Math.max(1, b.lv + (slot === 'chest' ? 1 : 0));
        const def = Math.max(1, Math.round(lv * 0.5 * Wd.f * SLOTMUL[slot] + 1));
        const look = { style: slot === 'head' ? HEADSTYLE[w][bi] : slot === 'chest' ? (w === 'heavy' && bi === 1 ? 'chain' : w === 'medium' && bi >= 3 ? 'shadow' : w === 'light' && bi >= 2 ? 'mage' : Wd.style.chest) : slot === 'legs' && w === 'heavy' ? 'plate' : 'basic', color: col, trim, weight: w };
        const stats = { def };
        if (w === 'light') stats.mp = 4 + bi * 5;
        if (w === 'heavy') stats.hp = 5 + bi * 8;
        add({ id: `${w}_${slot}_${bi}`, name: `${MATNAME[w][bi]} ${Wd.names[slot]}`, slot, weight: w, rarity: 'common', level: lv, price: price(lv, 'common') >> 1, stats, look });
        // set piece (uncommon/rare) one band later in power
        const sl = lv + 2, rar = bi >= 5 ? 'legendary' : bi >= 3 ? 'epic' : bi >= 1 ? 'rare' : 'uncommon';
        const sstats = { def: Math.round(def * 1.35) + 1 };
        const bk = Object.keys(Wd.bonus)[['head', 'chest', 'legs', 'feet', 'hands'].indexOf(slot) % 3];
        sstats[bk] = Math.round(Wd.bonus[bk] * (1 + bi * 0.6) * 100) / 100;
        const setId = `${w}_set_${bi}`;
        add({ id: `${w}_${slot}_${bi}s`, name: `${['Novice', 'Veteran', 'Champion', 'Hero', 'Legend', 'Ascendant'][bi]}'s ${Wd.names[slot]}`, slot, weight: w, rarity: rar, level: sl, price: price(sl, rar) >> 1, stats: sstats,
          look: Object.assign({}, look, { color: RARE_COL[w][bi], trim: bi >= 5 ? '#e0c0ff' : '#ffd040', glow: bi >= 5 ? '#c080ff' : bi >= 3 ? '#ffe070' : undefined }), set: setId });
      }
      const n = ['Novice', 'Veteran', 'Champion', 'Hero', 'Legend', 'Ascendant'][bi];
      const k = 1 + bi * 0.6;
      const b2 = {}, b4 = {};
      for (const [s, v] of Object.entries(Wd.bonus)) { b2[s] = Math.round(v * k * 100) / 100; b4[s] = Math.round(v * k * 2 * 100) / 100; }
      b4.atk = 2 + bi * 3;
      R.ItemSets[`${w}_set_${bi}`] = { name: `${n}'s ${Wd.set} Set`, pieces: 5, bonus: { 2: b2, 4: b4 } };
    });
  }

  // ---------------------------------------------------------------- capes & shields & tomes
  const CAPE_COL = ['#6a2a2a', '#2a4a8a', '#2a6a3a', '#6a2a8a', '#1a1a2a', '#2a1a5a'];
  BANDS.forEach((b, bi) => {
    const lv = b.lv + 1;
    add({ id: `cape_${bi}`, name: `${['Wanderer', 'Ranger', 'Knight', 'Warlord', 'Shadow', 'Starfall'][bi]}'s Cape`, slot: 'cape', rarity: bi >= 5 ? 'epic' : bi >= 3 ? 'rare' : 'uncommon', level: lv, price: price(lv, 'uncommon') >> 1,
      stats: { def: 1 + bi * 2, spd: 0.02 + bi * 0.01, hp: bi * 10 }, look: { style: 'cape', color: CAPE_COL[bi], trim: ['#c8a040', '#e0e0e0', '#ffd040', '#ff8030', '#b070ff', '#fff0c0'][bi], glow: bi >= 5 ? '#e0c0ff' : bi >= 3 ? '#ffe070' : undefined } });
    add({ id: `shield_${bi}`, name: `${b.mat} ${['Buckler', 'Kite Shield', 'Heater Shield', 'Tower Shield', 'Aegis', 'Bulwark'][bi]}`, slot: 'offhand', classes: ['warrior', 'paladin'], rarity: bi >= 5 ? 'epic' : bi >= 3 ? 'rare' : 'common', level: lv, price: price(lv, 'common'),
      stats: { def: 3 + bi * 4, hp: bi * 12 }, look: { style: 'kite', color: b.plate, trim: ['#8a6a3a', '#c8a040', '#e0e0e0', '#a0e0ff', '#ffd040', '#c080ff'][bi], accent: ['#8a3a2a', '#2a4a8a', '#8a2a2a', '#e0f0ff', '#b070ff', '#fff0c0'][bi] } });
    add({ id: `tome_${bi}`, name: `${['Primer', 'Grimoire', 'Codex', 'Arcanum', 'Necronomicon', 'Starbound Tome'][bi]} of ${b.mat === 'Bronze' ? 'Sparks' : ['Sparks', 'Frost', 'Flame', 'Storms', 'Stars', 'the Void'][bi]}`, slot: 'offhand', classes: ['mage'], rarity: bi >= 5 ? 'epic' : bi >= 3 ? 'rare' : 'uncommon', level: lv, price: price(lv, 'uncommon'),
      stats: { mag: 2 + bi * 3, mp: 10 + bi * 12, mpRegen: 0.3 + bi * 0.3 }, icon: { shape: 'scroll', color: ['#6a4a2a', '#2a4a8a', '#8a2a2a', '#6a2a8a', '#1a1a2a', '#3a1a6a'][bi] } });
    add({ id: `quiver_${bi}`, name: `${b.mat} Quiver`, slot: 'offhand', classes: ['ranger', 'rogue'], rarity: bi >= 5 ? 'epic' : bi >= 3 ? 'rare' : 'uncommon', level: lv, price: price(lv, 'uncommon'),
      stats: { atk: 1 + bi * 2, crit: 2 + bi, dex: bi }, icon: { shape: 'feather', color: ['#c8a040', '#e0e0e0', '#80c0ff', '#a0ffb0', '#c080ff', '#fff0c0'][bi] } });
  });

  // ---------------------------------------------------------------- rings & amulets
  const JEWELS = [
    ['Ring of Vigor', { hp: 25, hpRegen: 0.5 }, '#e04040'], ['Ring of Focus', { mp: 20, mpRegen: 0.6 }, '#4060e0'], ['Band of Might', { str: 2, atk: 2 }, '#e08030'],
    ['Band of Swiftness', { dex: 2, spd: 0.04 }, '#40c080'], ['Sage\'s Loop', { int: 2, mag: 3 }, '#8040e0'], ['Stoneskin Ring', { vit: 2, def: 3 }, '#a0a0a0'],
    ['Assassin\'s Signet', { crit: 5, critDmg: 0.15 }, '#b070ff'], ['Vampire\'s Band', { lifesteal: 0.04, hp: 10 }, '#c01030'], ['Ring of Haste', { cdr: 0.08, mp: 10 }, '#40e0e0'],
    ['Phantom Ring', { dodge: 5, spd: 0.03 }, '#c0c0ff'],
  ];
  JEWELS.forEach(([n, st, col], i) => {
    for (let t = 0; t < 2; t++) {
      const lv = [3, 8, 12, 16, 21, 26][(i + t * 3) % 6] + t * 2;
      const k = 1 + lv / 10;
      const stats = {}; for (const s in st) stats[s] = Math.round(st[s] * k * 100) / 100;
      const slot = t ? 'amulet' : 'ring';
      add({ id: `${slot}_${i}`, name: t ? n.replace(/Ring|Band|Loop|Signet/, 'Amulet') : n, slot, rarity: lv >= 15 ? 'epic' : lv >= 8 ? 'rare' : 'uncommon', level: lv, price: price(lv, 'rare'), stats, icon: { shape: slot, color: '#d0b040', color2: col } });
    }
  });

  // ---------------------------------------------------------------- consumables
  add({ id: 'potion_large', name: 'Greater Health Potion', slot: 'consumable', level: 10, price: 80, use: { heal: 260 }, icon: { shape: 'potion', color: '#ff1040', color2: '#ffe0e0' }, desc: 'Restores 260 HP.' });
  add({ id: 'potion_super', name: 'Supreme Health Potion', slot: 'consumable', level: 17, price: 160, use: { heal: 550 }, icon: { shape: 'potion', color: '#ff3080', color2: '#ffffff' }, desc: 'Restores 550 HP.' });
  add({ id: 'ether', name: 'Mana Potion', slot: 'consumable', level: 6, price: 40, use: { mana: 80 }, icon: { shape: 'potion', color: '#2050ff', color2: '#d0e0ff' }, desc: 'Restores 80 MP.' });
  add({ id: 'ether_large', name: 'Greater Mana Potion', slot: 'consumable', level: 14, price: 110, use: { mana: 200 }, icon: { shape: 'potion', color: '#6040ff', color2: '#ffffff' }, desc: 'Restores 200 MP.' });
  add({ id: 'elixir_might', name: 'Elixir of Might', slot: 'consumable', level: 5, price: 90, use: { buff: { stat: 'atk', amt: 0.25, mult: true, dur: 60 } }, icon: { shape: 'potion', color: '#ff8020' }, desc: '+25% attack for 60 seconds.' });
  add({ id: 'elixir_arcana', name: 'Elixir of Arcana', slot: 'consumable', level: 5, price: 90, use: { buff: { stat: 'mag', amt: 0.25, mult: true, dur: 60 } }, icon: { shape: 'potion', color: '#b040ff' }, desc: '+25% magic for 60 seconds.' });
  add({ id: 'elixir_iron', name: 'Ironskin Draught', slot: 'consumable', level: 5, price: 90, use: { buff: { stat: 'def', amt: 15, dur: 60 } }, icon: { shape: 'potion', color: '#a0a0a0' }, desc: '+15 defense for 60 seconds.' });
  add({ id: 'elixir_speed', name: 'Quicksilver Tonic', slot: 'consumable', level: 3, price: 60, use: { buff: { stat: 'spd', amt: 0.25, dur: 45 } }, icon: { shape: 'potion', color: '#40e0c0' }, desc: '+25% move speed for 45 seconds.' });
  add({ id: 'antidote', name: 'Antidote', slot: 'consumable', level: 1, price: 15, use: { cure: true }, icon: { shape: 'potion', color: '#60d040' }, desc: 'Cures poison, burns and other ailments.' });
  add({ id: 'scroll_recall', name: 'Scroll of Recall', slot: 'consumable', level: 1, price: 40, use: { teleport: true }, icon: { shape: 'scroll', color: '#6040c0' }, desc: 'Returns you to Havenbrook.' });
  add({ id: 'tome_xp', name: 'Tome of Insight', slot: 'consumable', level: 8, price: 400, use: { xp: 500 }, icon: { shape: 'scroll', color: '#c080ff' }, desc: 'Grants 500 experience.', noShop: true });

  // ---------------------------------------------------------------- unique boss loot
  // One legendary per class per boss (mythic for the Hollow King), themed on the boss.
  const BOSS = {
    slime_king: { lv: 5, rar: 'legendary', col: '#40e080', glow: '#60ff90', tag: 'Gloopus', eff: { slow: 1 } },
    lich: { lv: 9, rar: 'legendary', col: '#b0a8ff', glow: '#8060ff', tag: 'Mortis', eff: { freeze: 1 }, stats: { lifesteal: 0.05 } },
    broodmother: { lv: 9, rar: 'legendary', col: '#80c040', glow: '#a0ff40', tag: 'Vexa', eff: { poison: 12 } },
    pharaoh: { lv: 13, rar: 'legendary', col: '#e0c060', glow: '#ffe070', tag: 'Anhotep', eff: { burn: 14 } },
    frost_wyrm: { lv: 17, rar: 'legendary', col: '#a0e8ff', glow: '#c0f8ff', tag: 'Skaldr', eff: { freeze: 1, slow: 1 } },
    infernal: { lv: 21, rar: 'legendary', col: '#ff6020', glow: '#ffa040', tag: 'Pyrrhus', eff: { burn: 25, explode: { r: 28, mult: 0.5 } } },
    hollow_king: { lv: 25, rar: 'mythic', col: '#4a2a6a', glow: '#c040ff', tag: 'Malgrath', eff: { shock: 1, burn: 20 }, stats: { lifesteal: 0.06, critDmg: 0.3 } },
    crab_king: { lv: 11, rar: 'legendary', col: '#c05030', glow: '#80e0ff', tag: 'Clackjaw', eff: { slow: 1 }, stats: { def: 6 } },
    mycelord: { lv: 15, rar: 'legendary', col: '#8a3a8a', glow: '#c0ff80', tag: 'Mycelos', eff: { poison: 18 } },
    briar_queen: { lv: 20, rar: 'legendary', col: '#6a4a5a', glow: '#ff90e0', tag: 'Briarthorn', eff: { poison: 24, slow: 1 }, stats: { hpRegen: 2 } },
    watcher: { lv: 30, rar: 'mythic', col: '#2a1a4a', glow: '#ff60ff', tag: 'Ulthuun', eff: { shock: 1, explode: { r: 30, mult: 0.6 } }, stats: { lifesteal: 0.07, critDmg: 0.4, cdr: 0.1 } },
  };
  const CLASS_W = { warrior: ['greatsword', 'Cleaver'], ranger: ['bow', 'Longbow'], mage: ['staff', 'Scepter'], rogue: ['dagger', 'Fang'], paladin: ['hammer', 'Maul'] };
  const TITLES = {
    slime_king: ['Gelatinous', 'Royal Ooze', 'Wobbling', 'Slick', 'Crowned'],
    lich: ['Bonewrought', 'Deathwhisper', 'Phylactery', 'Gravechill', 'Soulbound'],
    broodmother: ['Broodfang', 'Silkweaver', 'Venomheart', 'Eightfold', 'Chitinous'],
    pharaoh: ['Sunking', 'Sandsworn', 'Scarab', 'Pharaoh\'s', 'Dune-Eternal'],
    frost_wyrm: ['Wyrmfrost', 'Glacial', 'Rimeheart', 'Skaldr\'s', 'Everwinter'],
    infernal: ['Molten', 'Titanforged', 'Cinderheart', 'Hellfire', 'Magmacore'],
    hollow_king: ['Hollow Crown', 'Kingslayer', 'Voidtouched', 'Oblivion', 'Shattered Crown'],
    crab_king: ['Tidebreaker', 'Riptide', 'Brinecaller', 'Pincer', 'Leviathan'],
    mycelord: ['Sporeheart', 'Mycelial', 'Rotbloom', 'Toadstool', 'Glimmercap'],
    briar_queen: ['Thornqueen\'s', 'Briarsong', 'Bloomcaller', 'Rosethorn', 'Heartwood'],
    watcher: ['Starbreaker', 'Eye-Piercer', 'Voidgazer', 'Night\'s End', 'Worldwarden'],
  };
  for (const [boss, B] of Object.entries(BOSS)) {
    Object.entries(CLASS_W).forEach(([cls, [type, noun]], i) => {
      const eff = Object.assign({}, B.eff);
      if (type === 'staff') eff.element = boss === 'frost_wyrm' || boss === 'lich' || boss === 'crab_king' ? 'ice' : boss === 'hollow_king' || boss === 'watcher' ? 'lightning' : boss === 'broodmother' || boss === 'mycelord' || boss === 'briar_queen' ? 'poison' : 'fire';
      if (type === 'bow') eff.multishot = boss === 'hollow_king' || boss === 'watcher' ? 3 : 2;
      const magic = type === 'staff';
      add({
        id: `u_${boss}_${cls}`, name: `${TITLES[boss][i]} ${noun}`, slot: 'weapon', type, rarity: B.rar, level: B.lv, dmg: dmg(B.lv, B.rar, type),
        price: price(B.lv, B.rar), dropsFrom: [boss], classes: [cls], effect: eff,
        stats: Object.assign(magic ? { mag: 6 + B.lv, mp: 20 + B.lv * 3 } : { atk: 3 + Math.round(B.lv / 2) }, B.stats || {}),
        look: { type, blade: B.col, handle: '#2a1a2a', guard: B.glow, glow: B.glow, gem: B.glow, style: ['serrated', 'recurve', 'skull', 'curved', 'runed'][i] },
        desc: `Torn from ${B.tag}'s remains. It still hums with the Ember Shard's power.`,
      });
    });
    // plus a boss trinket for everyone
    add({ id: `u_${boss}_amulet`, name: `Heart of ${B.tag}`, slot: 'amulet', rarity: B.rar, level: B.lv, price: price(B.lv, B.rar), dropsFrom: [boss],
      stats: { hp: 20 + B.lv * 4, atk: 2 + B.lv / 3 | 0, mag: 2 + B.lv / 3 | 0, crit: 3 + B.lv / 5 | 0 }, icon: { shape: 'amulet', color: '#ffd040', color2: B.glow }, desc: 'Warm to the touch.' });
  }
})(window.RPG);
