'use strict';
// The five playable classes.
//
// { id, name, title, color, desc, role, difficulty (1-3),
//   attrs: {str, dex, int, vit}          starting attributes
//   base: {hp, mp}                        level-1 pools before attributes
//   growth: {hp, mp}                      per level
//   primary: 'str'|'dex'|'int'           attribute that scales weapon damage
//   weapons: [types]                      weapon types this class can wield
//   armor: ['light','medium','heavy']     armor weights allowed (items may declare look.weight / item.weight)
//   start: {weapon, offhand?, chest?, ...} starting gear item ids
//   skills: [skillIds]                    4 skills in unlock order (see data/skills.js)
//   ratings: {offense, defense, range, mobility} 1..5, shown in the character creator
//   appearance: default look overrides for the creator preview
// }
(function (R) {
  R.Classes = {
    warrior: {
      id: 'warrior', name: 'Warrior', title: 'Blade of the Vanguard', color: '#e05a3a', role: 'Melee bruiser', difficulty: 1,
      desc: 'A frontline brawler who shrugs off blows and cleaves through crowds. Every hit fuels their fury, and they fight hardest when bloodied.',
      attrs: { str: 8, dex: 4, int: 2, vit: 7 }, base: { hp: 125, mp: 34 }, growth: { hp: 15, mp: 3 }, primary: 'str',
      weapons: ['sword', 'greatsword', 'axe', 'mace', 'hammer', 'spear'], armor: ['light', 'medium', 'heavy'],
      start: { weapon: 'rusty_sword', offhand: 'wooden_shield', chest: 'cloth_tunic', feet: 'leather_boots' },
      skills: ['whirlwind', 'charge', 'warcry', 'earthshatter'],
      ratings: { offense: 4, defense: 5, range: 1, mobility: 3 },
      appearance: { hair: 'short', outfit: '#7a2e2e' },
    },
    ranger: {
      id: 'ranger', name: 'Ranger', title: 'Warden of the Wilds', color: '#5fbf4a', role: 'Ranged marksman', difficulty: 2,
      desc: 'A deadly marksman who strikes from afar. Fast and evasive; masters bows and crossbows, lays traps and hits hardest at long range.',
      attrs: { str: 3, dex: 9, int: 4, vit: 5 }, base: { hp: 92, mp: 42 }, growth: { hp: 10, mp: 4 }, primary: 'dex',
      weapons: ['bow', 'crossbow', 'dagger', 'spear'], armor: ['light', 'medium'],
      start: { weapon: 'hunting_bow', chest: 'cloth_tunic', feet: 'leather_boots' },
      skills: ['multishot', 'piercing_shot', 'trap', 'arrow_rain'],
      ratings: { offense: 4, defense: 2, range: 5, mobility: 4 },
      appearance: { hair: 'ponytail', outfit: '#2e6b3a' },
    },
    mage: {
      id: 'mage', name: 'Mage', title: 'Scholar of the Arcane', color: '#5a8aff', role: 'Area caster', difficulty: 3,
      desc: 'A master of fire, frost and lightning. Fragile, but commands devastating area spells and shield themselves with raw mana.',
      attrs: { str: 2, dex: 4, int: 10, vit: 4 }, base: { hp: 78, mp: 85 }, growth: { hp: 8, mp: 8 }, primary: 'int',
      weapons: ['staff', 'wand'], armor: ['light'],
      start: { weapon: 'apprentice_staff', chest: 'apprentice_robe', feet: 'leather_boots' },
      skills: ['fireball', 'frost_nova', 'chain_lightning', 'meteor'],
      ratings: { offense: 5, defense: 1, range: 4, mobility: 3 },
      appearance: { hair: 'long', outfit: '#3a4a8a' },
    },
    rogue: {
      id: 'rogue', name: 'Rogue', title: 'Shadow of the Guild', color: '#b86bff', role: 'Assassin', difficulty: 3,
      desc: 'A lightning-fast assassin. Opens every fight with a guaranteed critical, then vanishes in smoke. Poison, daggers and shadow tricks.',
      attrs: { str: 4, dex: 10, int: 3, vit: 4 }, base: { hp: 86, mp: 46 }, growth: { hp: 9, mp: 4 }, primary: 'dex',
      weapons: ['dagger', 'sword', 'crossbow'], armor: ['light', 'medium'],
      start: { weapon: 'worn_dagger', chest: 'cloth_tunic', feet: 'leather_boots' },
      skills: ['shadow_step', 'fan_of_knives', 'poison_blade', 'death_mark'],
      ratings: { offense: 5, defense: 2, range: 2, mobility: 5 },
      appearance: { hair: 'spiky', outfit: '#3a3a3a' },
    },
    paladin: {
      id: 'paladin', name: 'Paladin', title: 'Sworn of the Dawn', color: '#ffd24a', role: 'Holy tank', difficulty: 1,
      desc: 'A holy knight who smites the wicked and mends their own wounds. Sturdy, self-healing, and the bane of undead and demons.',
      attrs: { str: 7, dex: 3, int: 5, vit: 7 }, base: { hp: 112, mp: 55 }, growth: { hp: 13, mp: 5 }, primary: 'str',
      weapons: ['mace', 'hammer', 'sword', 'greatsword', 'staff'], armor: ['light', 'medium', 'heavy'],
      start: { weapon: 'wooden_mace', offhand: 'wooden_shield', chest: 'cloth_tunic', feet: 'leather_boots' },
      skills: ['holy_strike', 'heal', 'consecration', 'divine_shield'],
      ratings: { offense: 3, defense: 5, range: 2, mobility: 2 },
      appearance: { hair: 'short', outfit: '#c0a040' },
    },
  };
  R.CLASS_ORDER = ['warrior', 'ranger', 'mage', 'rogue', 'paladin'];

  // Levels at which skill slots 1..4 unlock (slot i also maps to the 'skill<i+1>' input action).
  R.SKILL_UNLOCK = [1, 3, 6, 10];
  R.MAX_LEVEL = 30;
  R.xpForLevel = (lv) => Math.floor(40 * Math.pow(lv, 1.65) + 20 * lv);
})(window.RPG);
