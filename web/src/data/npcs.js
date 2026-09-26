'use strict';
// NPCs.
// { id, name, title?, appearance (see gfx/character.js), gear: {head, chest, ...looks}, weapon?: weapon look,
//   wander?: px radius, static?: true (never turns), dir?,
//   lines?: [random idle lines], talk?(Q) -> lines | null   (Q = dialogue helper, see ui/dialog)
//   shop?: {title, items:[ids], sells?: true}  services?: ['inn', 'stash', 'respec'] }
(function (R) {
  const N = R.NPCs = R.NPCs || {};
  R.addNPC = function (d) { N[d.id] = d; return d; };
  const add = R.addNPC;

  add({
    id: 'elder', name: 'Elder Maren', title: 'Village Elder',
    appearance: { body: 'b', skin: '#e8b088', hair: 'long', hairColor: '#d8d8d8', eyes: '#3a7a3a', beard: 'none', outfit: '#5a3a7a', outfit2: '#d8c060' },
    gear: { chest: { style: 'robe', color: '#5a3a7a', trim: '#d8c060' } },
    weapon: { type: 'staff', handle: '#6a4424', gem: '#80ffb0', style: 'crook' },
    lines: ['The wind smells of ash lately. I do not like it.', 'Havenbrook has stood for three hundred years. It will stand for three hundred more — if we have heroes.'],
  });
  add({
    id: 'smith', name: 'Brom', title: 'Blacksmith',
    appearance: { body: 'a', skin: '#c98e62', hair: 'bald', hairColor: '#2a1d18', eyes: '#202020', beard: 'full', beardColor: '#6a3a1a', outfit: '#6b4a2b', outfit2: '#3a2418' },
    gear: { chest: { style: 'leather', color: '#6a4424', trim: '#3a2418' }, hands: { style: 'gloves', color: '#3a2a20' } },
    weapon: { type: 'hammer', blade: '#707880', handle: '#5a3a20' },
    shop: { title: "Brom's Forge", items: ['iron_sword', 'iron_helm', 'chain_mail', 'wooden_shield'] },
    lines: ['Steel sings when it is forged right.', 'Bring me good ore and I will make you something worth dying in. Or not dying in, preferably.'],
  });
  add({
    id: 'alchemist', name: 'Lysa', title: 'Alchemist',
    appearance: { body: 'b', skin: '#fde0c5', hair: 'bob', hairColor: '#46a15b', eyes: '#8a2be2', beard: 'none', outfit: '#2a6a6a', outfit2: '#e0e0e0' },
    gear: { chest: { style: 'robe', color: '#2a6a6a', trim: '#e0e0e0' } },
    shop: { title: "Lysa's Remedies", items: ['potion_small', 'ether_small', 'potion'] },
    lines: ['Slime gel makes a wonderful base for tonics. Do not ask how I know.', 'Drink responsibly. Adventure irresponsibly.'],
  });
})(window.RPG);
