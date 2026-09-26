'use strict';
// Item database.
//
// Item shape:
// { id, name, slot, rarity, level, price, desc?,
//   type?        weapon type (see RPG.WeaponTypes) when slot === 'weapon'
//   dmg?         weapon base damage
//   stats?       {hp, mp, atk, mag, def, crit, spd, hpRegen, mpRegen, str, dex, int, vit, lifesteal, dodge}
//   look?        visual for weapon/armor (see gfx/weapons.js and gfx/character.js)
//   classes?     restrict to these class ids (weapons default to their type's class list)
//   effect?      weapon on-hit/special: {burn, freeze, poison, shock, lifesteal, pierce, explode, chain, multishot, element}
//   use?         consumables: {heal, mana, buff:{stat, amt, dur}, cure, teleport}
//   stack?       true for stackables (consumables/materials/quest)
//   icon?        for non-weapon/armor items: {shape, color, color2}  (see UI icon painter)
//   set?         set id for set bonuses (RPG.ItemSets)
// }
//
// Slots: weapon, offhand, head, chest, legs, feet, hands, cape, ring, amulet, consumable, material, quest
(function (R) {
  const I = R.Items = {};
  R.ItemSets = {};
  R.SLOTS = ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'cape', 'ring', 'amulet'];
  R.SLOT_NAMES = { weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', chest: 'Chest', legs: 'Legs', feet: 'Feet', hands: 'Hands', cape: 'Cape', ring: 'Ring', amulet: 'Amulet', consumable: 'Consumable', material: 'Material', quest: 'Quest Item' };

  // Helper to add items with less boilerplate.
  R.addItem = function (it) {
    if (!it.id) throw new Error('item needs id');
    it.rarity = it.rarity || 'common';
    it.level = it.level || 1;
    it.price = it.price == null ? 10 : it.price;
    it.stats = it.stats || {};
    if (['consumable', 'material', 'quest'].includes(it.slot)) it.stack = true;
    I[it.id] = it;
    return it;
  };
  const add = R.addItem;

  // Dynamic shop stock: NPC shops can use `items: R.shopStock({...})` so new gear shows up automatically.
  // filter: {slots:[...], types:[weapon types], minLevel, maxLevel, rarities:[...], ids:[always include], limit}
  // maxLevel may be a function (e.g. () => player level + 3) so stock grows with the hero.
  R.shopStock = function (f) {
    return function () {
      const p = (R.World && R.World.player) || { level: 1 };
      const maxL = typeof f.maxLevel === 'function' ? f.maxLevel(p) : f.maxLevel == null ? 99 : f.maxLevel;
      const minL = typeof f.minLevel === 'function' ? f.minLevel(p) : f.minLevel || 0;
      let list = Object.values(I).filter((it) => !it.noShop && !it.dropsFrom && (!f.slots || f.slots.includes(it.slot)) && (!f.types || f.types.includes(it.type)) &&
        it.level >= minL && it.level <= maxL && (!f.rarities || f.rarities.includes(it.rarity)) && (!f.filter || f.filter(it)));
      list.sort((a, b) => a.level - b.level || a.price - b.price);
      if (f.limit && list.length > f.limit) list = list.slice(-f.limit);
      const ids = (f.ids || []).filter((id) => I[id]).concat(list.map((it) => it.id));
      return [...new Set(ids)];
    };
  };

  // ---- starter weapons (one per class) --------------------------------------
  add({ id: 'rusty_sword', name: 'Rusty Sword', slot: 'weapon', type: 'sword', dmg: 6, price: 8, look: { type: 'sword', blade: '#a89a8a', handle: '#5a3a20', guard: '#7a6a5a' }, desc: 'Seen better days.' });
  add({ id: 'hunting_bow', name: 'Hunting Bow', slot: 'weapon', type: 'bow', dmg: 5, price: 10, look: { type: 'bow', blade: '#8a5a30' } });
  add({ id: 'apprentice_staff', name: 'Apprentice Staff', slot: 'weapon', type: 'staff', dmg: 5, stats: { mag: 3, mp: 10 }, price: 10, look: { type: 'staff', handle: '#7a5030', gem: '#6fd8ff', blade: '#a08040' } });
  add({ id: 'worn_dagger', name: 'Worn Dagger', slot: 'weapon', type: 'dagger', dmg: 5, price: 8, look: { type: 'dagger', blade: '#b8b8b0' } });
  add({ id: 'wooden_mace', name: 'Cudgel', slot: 'weapon', type: 'mace', dmg: 6, price: 8, look: { type: 'mace', blade: '#8a6a4a', handle: '#5a3a20' } });

  // ---- starter armor -----------------------------------------------------------
  add({ id: 'cloth_tunic', name: 'Cloth Tunic', slot: 'chest', stats: { def: 1 }, price: 5, look: { style: 'tunic', color: '#7a6a4a', trim: '#d8c8a0' } });
  add({ id: 'leather_boots', name: 'Leather Boots', slot: 'feet', stats: { def: 1, spd: 0.02 }, price: 6, look: { style: 'boots', color: '#5a3a22' } });
  add({ id: 'wooden_shield', name: 'Wooden Shield', slot: 'offhand', stats: { def: 3 }, price: 12, look: { style: 'round', color: '#8a5a30', trim: '#6a6a6a' }, classes: ['warrior', 'paladin'] });

  // ---- a few upgrades -----------------------------------------------------------
  add({ id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', type: 'sword', dmg: 11, level: 3, rarity: 'common', price: 60, look: { type: 'sword', blade: '#d0d8e0', handle: '#6b4a2b', guard: '#c8a040' } });
  add({ id: 'iron_helm', name: 'Iron Helm', slot: 'head', stats: { def: 3 }, level: 3, price: 45, look: { style: 'full', color: '#8a929a', trim: '#6a727a' } });
  add({ id: 'chain_mail', name: 'Chain Mail', slot: 'chest', stats: { def: 6 }, level: 4, price: 90, look: { style: 'chain', color: '#8a929a', trim: '#6a727a' }, classes: ['warrior', 'paladin', 'ranger', 'rogue'] });
  add({ id: 'apprentice_robe', name: 'Apprentice Robe', slot: 'chest', stats: { def: 2, mp: 15, mag: 2 }, level: 2, price: 50, look: { style: 'robe', color: '#3a4a8a', trim: '#d8c060' } });
  add({ id: 'travel_cape', name: 'Traveler\'s Cape', slot: 'cape', stats: { def: 1, spd: 0.03 }, level: 2, price: 35, look: { style: 'cape', color: '#6a2a2a', trim: '#c8a040' } });
  add({ id: 'copper_ring', name: 'Copper Ring', slot: 'ring', stats: { hp: 10 }, level: 1, price: 25, icon: { shape: 'ring', color: '#c87a40', color2: '#40c080' } });

  // ---- consumables -------------------------------------------------------------
  add({ id: 'potion_small', name: 'Minor Health Potion', slot: 'consumable', price: 12, use: { heal: 40 }, icon: { shape: 'potion', color: '#e03040' }, desc: 'Restores 40 HP.' });
  add({ id: 'potion', name: 'Health Potion', slot: 'consumable', price: 35, level: 5, use: { heal: 110 }, icon: { shape: 'potion', color: '#ff2050', color2: '#ffd0d0' }, desc: 'Restores 110 HP.' });
  add({ id: 'ether_small', name: 'Minor Mana Potion', slot: 'consumable', price: 14, use: { mana: 30 }, icon: { shape: 'potion', color: '#3060e0' }, desc: 'Restores 30 MP.' });

  // ---- materials / quest -------------------------------------------------------
  add({ id: 'slime_gel', name: 'Slime Gel', slot: 'material', price: 3, icon: { shape: 'blob', color: '#60d060' }, desc: 'Wobbly. Alchemists pay for it.' });
  add({ id: 'wolf_pelt', name: 'Wolf Pelt', slot: 'material', price: 6, icon: { shape: 'pelt', color: '#8a8a92' } });
})(window.RPG);
