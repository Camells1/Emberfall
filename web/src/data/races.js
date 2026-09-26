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

    gnome: {
      id: 'gnome', name: 'Gnome', title: 'Tinkerers of the Underhill', color: '#ffb0d0',
      desc: 'Small, clever and endlessly curious. Gnomes tinker with magic the way others tinker with clocks, so their spells come back around faster.',
      attrs: { int: 3, dex: 2, str: -2 }, bonus: { cdr: 0.06, mp: 15 },
      traits: ['+3 INT, +2 DEX, -2 STR', '6% faster skill cooldowns', '+15 max MP'],
      skins: ['#ffe8d6', '#fde0c5', '#f5c9a0', '#eab58c', '#d9a07a', '#a36a44'],
      look: { ears: 'pointed', horns: 'none', body: 'c', accessory: 'glasses', accColor: '#c8a040' },
    },
    merfolk: {
      id: 'merfolk', name: 'Merfolk', title: 'Children of the Tide', color: '#40c0d0',
      desc: 'Born beneath the waves and walking the land by choice. Merfolk flow around blows like water around a stone.',
      attrs: { dex: 2, int: 2, vit: 1 }, bonus: { dodge: 4, mp: 20, mpRegen: 0.5, slowResist: 0.5 },
      traits: ['+2 DEX, +2 INT, +1 VIT', '+4% dodge, +20 max MP', 'Slows wear off twice as fast'],
      skins: ['#60a8c8', '#40c0b0', '#80c8e8', '#3a7a9a', '#a0d8d0', '#5a6ab0'],
      look: { ears: 'pointed', horns: 'none', face: 'scales', faceColor: '#80e0f0', eyes: '#40c0d0' },
    },
    celestial: {
      id: 'celestial', name: 'Celestial', title: 'Touched by the Stars', color: '#ffe070',
      desc: 'A spark of starlight lives in their blood. Celestials glow faintly in the dark and mend their wounds with holy light.',
      attrs: { int: 2, vit: 2, str: 1 }, bonus: { hpRegen: 1.2, crit: 2, hp: 10 },
      traits: ['+2 INT, +2 VIT, +1 STR', '+1.2 HP regen, +10 max HP', '+2% crit chance'],
      skins: ['#fff4e0', '#ffe8c0', '#f0e0ff', '#e8d0a0', '#d0b890', '#c0a0e0'],
      look: { ears: 'human', horns: 'none', eyeStyle: 'glow', eyes: '#ffd040' },
    },
    forged: {
      id: 'forged', name: 'Forged', title: 'Iron Hearts, Living Steel', color: '#a0b0c8',
      desc: 'Built in a forgotten forge and given a soul by accident. The Forged are slow to anger and very, very hard to break.',
      attrs: { vit: 4, str: 2, dex: -2 }, bonus: { def: 8, hp: 30, spd: -0.03, poisonResist: 1, bleedResist: 1 },
      traits: ['+4 VIT, +2 STR, -2 DEX', '+8 defense, +30 max HP', 'Immune to poison and bleeding', '3% slower'],
      skins: ['#8a929a', '#b0b8c4', '#c89048', '#6a6a78', '#9a7a5a', '#5a6a7a'],
      look: { ears: 'human', horns: 'none', eyeStyle: 'glow', eyes: '#40c0ff', hair: 'bald', face: 'scar', faceColor: '#4a4a52' },
    },
    nightborn: {
      id: 'nightborn', name: 'Nightborn', title: 'Heirs of the Long Night', color: '#c02040',
      desc: 'Pale, graceful and hungry. The Nightborn drink the strength of those they strike down.',
      attrs: { dex: 2, str: 2, int: 1, vit: -1 }, bonus: { lifesteal: 0.05, crit: 3 },
      traits: ['+2 DEX, +2 STR, +1 INT, -1 VIT', '5% lifesteal', '+3% crit chance'],
      skins: ['#f0f0f8', '#e8e0e8', '#d8d0e0', '#c8c0d0', '#b8b0c8', '#a098b0'],
      look: { ears: 'pointed', horns: 'none', eyeStyle: 'glow', eyes: '#ff2040' },
    },
    fae: {
      id: 'fae', name: 'Fae', title: 'Folk of the Hollow Hills', color: '#ff90e0',
      desc: 'Tricksters from the fairy rings. The Fae are hard to catch and harder to hit, and they know it.',
      attrs: { dex: 3, int: 2, vit: -2, str: -1 }, bonus: { dodge: 6, spd: 0.08 },
      traits: ['+3 DEX, +2 INT, -2 VIT, -1 STR', '+6% dodge', '+8% move speed'],
      skins: ['#ffe0f0', '#e0f0ff', '#e8ffe0', '#fff0c0', '#d8c8ff', '#c0f0e0'],
      look: { ears: 'long', horns: 'none', body: 'b', accessory: 'flower', accColor: '#ff80c0', eyes: '#ff40c0' },
    },
    minotaur: {
      id: 'minotaur', name: 'Minotaur', title: 'Horned Titans of the Labyrinth', color: '#b07040',
      desc: 'Huge, horned and hot-tempered. A Minotaur in full charge is a force of nature.',
      attrs: { str: 4, vit: 2, dex: -2 }, bonus: { hp: 25, critDmg: 0.15 },
      traits: ['+4 STR, +2 VIT, -2 DEX', '+25 max HP', '+15% crit damage'],
      skins: ['#8a5a34', '#6a4028', '#a07050', '#3a2a20', '#c8a080', '#5a5a5a'],
      look: { ears: 'beast', horns: 'ram', hornColor: '#e8e0c8', body: 'a' },
    },
    lizardfolk: {
      id: 'lizardfolk', name: 'Lizardfolk', title: 'Scaled Kin of the Mire', color: '#60a040',
      desc: 'Cold-blooded and patient. Lizardfolk shrug off venom and their scales knit shut in moments.',
      attrs: { dex: 2, vit: 2, str: 1 }, bonus: { hpRegen: 1, poisonResist: 0.6, def: 2 },
      traits: ['+2 DEX, +2 VIT, +1 STR', '+1 HP regen, +2 defense', 'Poison hurts 60% less'],
      skins: ['#5a8a3a', '#7aa04a', '#3a6a4a', '#8ab070', '#a0a050', '#4a7a8a'],
      look: { ears: 'human', horns: 'none', face: 'scales', faceColor: '#3a5a2a', eyeStyle: 'slit', eyes: '#e0c020', hair: 'bald' },
    },
  };
  R.RACE_ORDER = ['human', 'elf', 'dwarf', 'orc', 'beastkin', 'dragonborn', 'demonkin', 'revenant', 'sylvan', 'gnome', 'merfolk', 'celestial', 'forged', 'nightborn', 'fae', 'minotaur', 'lizardfolk'];
  R.raceOf = (p) => R.Races[(p && p.race) || 'human'] || R.Races.human;
})(window.RPG);
