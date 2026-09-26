'use strict';
// Bloodborn: the playable races. Picked in the character creator (the "Bloodborn" tab).
//
// { id, name, title, desc, color,
//   attrs: {str, dex, int, vit}       added to the class's starting attributes
//   bonus: {spd, def, crit, critDmg, lifesteal, hpRegen, mpRegen, dodge, hp, mp, xp}  flat stat bonuses
//   traits: [short lines shown in the creator]
//   skins: [skin colours offered first], look: appearance applied when you pick the race }
(function (R) {
  R.Races = {
    human: {
      id: 'human', name: 'Human', title: 'Children of the Dawn', color: '#e8c070',
      desc: 'Adaptable and ambitious. Humans learn quickly and excel at whatever path they choose.',
      attrs: { str: 1, dex: 1, int: 1, vit: 1 }, bonus: { xp: 0.1 },
      traits: ['+1 to every attribute', '+10% experience gained'],
      skins: ['#ffe8d6', '#fde0c5', '#f5c9a0', '#eab58c', '#d9a07a', '#c98e62', '#a36a44', '#8a5634', '#6e4028', '#553222', '#3e2418'],
      look: { ears: 'human', horns: 'none' },
    },
    elf: {
      id: 'elf', name: 'Elf', title: 'Wardens of the Old Wood', color: '#80e0b0',
      desc: 'Graceful and long-lived. Elves move like the wind and strike before their foes can blink.',
      attrs: { dex: 3, int: 2, vit: -1 }, bonus: { spd: 0.06, crit: 3 },
      traits: ['+3 DEX, +2 INT, -1 VIT', '+6% move speed', '+3% crit chance'],
      skins: ['#ffe8d6', '#fde0c5', '#f5c9a0', '#d9a07a', '#a36a44', '#f0f4ff', '#a9b8e8'],
      look: { ears: 'long', horns: 'none', body: 'b' },
    },
    dwarf: {
      id: 'dwarf', name: 'Dwarf', title: 'Sons and Daughters of Stone', color: '#d09050',
      desc: 'Stout as the mountains they carve. Dwarves shrug off blows that would fell anyone else.',
      attrs: { str: 2, vit: 3, dex: -1 }, bonus: { def: 5, hp: 20 },
      traits: ['+2 STR, +3 VIT, -1 DEX', '+5 defense', '+20 max HP'],
      skins: ['#f5c9a0', '#eab58c', '#d9a07a', '#c98e62', '#a36a44', '#8a5634'],
      look: { ears: 'human', horns: 'none', body: 'c', beard: 'braided' },
    },
    orc: {
      id: 'orc', name: 'Orc', title: 'The Iron Clans', color: '#70b050',
      desc: 'Born to war. Orcs hit like a landslide and grow fiercer with every blow they land.',
      attrs: { str: 4, vit: 1, int: -1 }, bonus: { critDmg: 0.2 },
      traits: ['+4 STR, +1 VIT, -1 INT', '+20% crit damage'],
      skins: ['#6fae6a', '#9fd4a8', '#5a8a4a', '#7a9a5a', '#8a9a7a', '#b8b8c0'],
      look: { ears: 'pointed', horns: 'none', body: 'a', face: 'tusks' },
    },
    beastkin: {
      id: 'beastkin', name: 'Beastkin', title: 'Kin of Fang and Feather', color: '#e0a060',
      desc: 'Part animal, all instinct. Beastkin are quick on their feet and hard to pin down.',
      attrs: { dex: 3, str: 1 }, bonus: { spd: 0.05, dodge: 5 },
      traits: ['+3 DEX, +1 STR', '+5% move speed', '+5% dodge'],
      skins: ['#fde0c5', '#f5c9a0', '#d9a07a', '#a36a44', '#6e4028', '#553222'],
      look: { ears: 'beast', horns: 'none' },
    },
    demonkin: {
      id: 'demonkin', name: 'Demonkin', title: 'Heirs of the Burning Pact', color: '#e05050',
      desc: 'Descended from infernal bargains. Fire runs in their veins and magic answers their call.',
      attrs: { int: 3, str: 2, vit: -1 }, bonus: { mpRegen: 0.8, burnResist: 0.5 },
      traits: ['+3 INT, +2 STR, -1 VIT', '+0.8 MP regen', 'Burns hurt half as much'],
      skins: ['#e07060', '#b06ab8', '#d8a8e0', '#6a6a78', '#c03848', '#8a4a9a'],
      look: { ears: 'pointed', horns: 'demon', hornColor: '#3a3040' },
    },
    revenant: {
      id: 'revenant', name: 'Revenant', title: 'Those Who Returned', color: '#80b0d0',
      desc: 'They died, and refused to stay dead. Revenants feed on the life of their foes.',
      attrs: { int: 2, vit: 2, dex: 1, str: -1 }, bonus: { lifesteal: 0.03, poisonResist: 0.5 },
      traits: ['+2 INT, +2 VIT, +1 DEX, -1 STR', '3% lifesteal', 'Poison hurts half as much'],
      skins: ['#b8b8c0', '#a9b8e8', '#f0f4ff', '#8a9aa8', '#6a6a78', '#c8c0d8'],
      look: { ears: 'human', horns: 'none', eyeStyle: 'glow', eyes: '#40c0d0' },
    },
    dragonborn: {
      id: 'dragonborn', name: 'Dragonborn', title: 'Scions of the Elder Wyrms', color: '#e07030',
      desc: 'Dragon blood burns in their veins. Dragonborn are armored in scales, shrug off flame, and carry a dragon\'s pride into every fight.',
      attrs: { str: 2, int: 2, vit: 1 }, bonus: { def: 3, hp: 10, burnResist: 0.6 },
      traits: ['+2 STR, +2 INT, +1 VIT', '+3 defense, +10 max HP', 'Scaled hide: burns hurt 60% less'],
      skins: ['#c04a30', '#d08a30', '#e8c050', '#4a8a5a', '#3a6aa0', '#b8b8c0', '#6a4a8a', '#2a2a34'],
      look: { ears: 'human', horns: 'dragon', hornColor: '#e8e0c8', face: 'scales', eyeStyle: 'slit', eyes: '#ffb020' },
    },
    sylvan: {
      id: 'sylvan', name: 'Sylvan', title: 'Dryads of the Deep Grove', color: '#60c080',
      desc: 'Half person, half forest. Sylvans heal like spring and draw strength from living things.',
      attrs: { int: 2, vit: 2, dex: 1 }, bonus: { hpRegen: 1.5, mp: 15 },
      traits: ['+2 INT, +2 VIT, +1 DEX', '+1.5 HP regen', '+15 max MP'],
      skins: ['#9fd4a8', '#6fae6a', '#c8e0a0', '#a0c8b0', '#e8c050', '#d8a8e0'],
      look: { ears: 'long', horns: 'antlers', hornColor: '#a09080', accessory: 'flower', accColor: '#ff80c0' },
    },
  };
  R.RACE_ORDER = ['human', 'elf', 'dwarf', 'orc', 'beastkin', 'dragonborn', 'demonkin', 'revenant', 'sylvan'];
  R.raceOf = (p) => R.Races[(p && p.race) || 'human'] || R.Races.human;
})(window.RPG);
