'use strict';
// Monster materials (drops). Owned by the bestiary; ids match DESIGN.md.
// Icon shapes come from gfx/icons.js MISC.
(function (R) {
  const add = (id, name, price, shape, color, color2, desc) => R.addItem({ id, name, slot: 'material', price, icon: { shape, color, color2 }, desc });

  // Whisperwood / Slime Grotto (1-5)
  add('slime_gel', 'Slime Gel', 3, 'blob', '#60d060', '#b0ffb0', 'Wobbly and faintly warm. Alchemists thicken potions with it.');
  add('wolf_pelt', 'Wolf Pelt', 6, 'pelt', '#8a8a92', '#c8c8d0', 'A thick grey pelt. Tanners in Havenbrook always want more.');
  add('goblin_ear', 'Goblin Ear', 5, 'fang', '#6ab04a', '#3a6a2a', 'Proof of a goblin slain. Somebody pays bounties for these.');
  add('boar_tusk', 'Boar Tusk', 8, 'fang', '#f0e6c8', '#b0a080', 'A curved ivory tusk, still sharp enough to draw blood.');
  add('mushroom_cap', 'Glowcap', 7, 'food', '#d04a6a', '#ffe0e8', 'A spotted mushroom cap that pulses when squeezed. Do not eat raw.');
  add('bat_wing', 'Bat Wing', 5, 'feather', '#5a4a6a', '#8a7a9a', 'Leathery and thin as paper. A staple of cheap hexes.');

  // Crypt / Mirefen / Nest (5-9)
  add('bone_dust', 'Bone Dust', 9, 'bag', '#e8e0d0', '#a09880', 'Ground bones of the restless dead. Smells of old stone.');
  add('ectoplasm', 'Ectoplasm', 14, 'blob', '#a0e8ff', '#e8ffff', 'Cold, glowing slime left behind when a spirit is torn apart.');
  add('spider_silk', 'Spider Silk', 10, 'scroll', '#e8e8f0', '#b8b8c8', 'Strong as wire, light as breath. Prized by bowyers.');
  add('venom_sac', 'Venom Sac', 14, 'blob', '#80e040', '#305010', 'A swollen gland full of paralytic venom. Handle with gloves.');
  add('frog_leg', 'Bog Frog Leg', 8, 'food', '#6a9a3a', '#c8e0a0', 'A meaty leg. The inn in Havenbrook fries them in butter.');
  add('lizard_scale', 'Lizard Scale', 12, 'gem', '#3a8a6a', '#a0e0c0', 'A hard, overlapping scale. Makes excellent light armor.');
  add('wisp_essence', 'Wisp Essence', 18, 'orb', '#b0ff80', '#ffffff', 'A flickering mote of marsh-light, trapped in a bubble of glass.');

  // Sunscorch Dunes / Tomb of Anhotep (9-13)
  add('scorpion_stinger', 'Scorpion Stinger', 18, 'fang', '#c89040', '#6a3a10', 'A barbed stinger still beaded with venom.');
  add('mummy_wrap', 'Mummy Wrappings', 16, 'scroll', '#d8c8a0', '#8a7a50', 'Resin-soaked linen inscribed with fading curses.');
  add('sand_pearl', 'Sand Pearl', 40, 'orb', '#fff0c0', '#e0b060', 'Formed in the gullet of a great sand worm. Merchants love them.');

  // Frostfang Peaks / Frozen Hollow (13-17)
  add('yeti_fur', 'Yeti Fur', 24, 'pelt', '#e8f0ff', '#a0b8d8', 'So warm it steams in the snow. Worth a fortune in winter.');
  add('frost_core', 'Frost Core', 32, 'crystal', '#80d0ff', '#e8ffff', 'The heart of an ice golem. It never melts, not even in fire.');
  add('harpy_feather', 'Harpy Feather', 22, 'feather', '#c8d8f0', '#6a7aa0', 'A long steel-blue feather that hums in the wind.');

  // Emberdeep Caldera (17-21)
  add('ember_core', 'Ember Core', 38, 'orb', '#ff8030', '#ffe080', 'A coal that never cools. It beats slowly, like a heart.');
  add('magma_shard', 'Magma Shard', 34, 'ore', '#ff5020', '#3a1a10', 'A shard of cooling magma, glowing through black crust.');
  add('imp_horn', 'Imp Horn', 28, 'fang', '#a02030', '#ff8060', 'A small twisted horn. It is warm, and it giggles at night.');

  // Obsidian Citadel (21-25)
  add('shadow_essence', 'Shadow Essence', 48, 'orb', '#6a40a0', '#1a0c2a', 'Liquid darkness wrung from a shade. It swallows lamplight.');
  add('dark_steel', 'Dark Steel', 60, 'ore', '#4a4a5a', '#a080ff', 'Obsidian-forged steel from the Hollow King\'s armories.');
})(window.RPG);
