'use strict';
// Chapter Three: new regions around the realm.
//   Gullwind Coast + Smuggler's Grotto   (south of Havenbrook, Lv 5-11)   boss: Clackjaw the Tide Tyrant
//   Glimmercap Hollows                   (under the Mirefen, Lv 11-15)     boss: Mycelos the Rot-Crowned
//   Thornveil Grove                      (west of Frostfang, Lv 16-20)     boss: Queen Briarthorn
//   Starfall Rift                        (behind Malgrath's throne, Lv 25-30, post-game) boss: Ulthuun, the Watcher Beyond
// plus new Havenbrook villagers (stylist, baker), repeatable bounties and region questlines.
(function (R) {
  const U = R.U, FX = R.FX, C = R.Character, K = R.BossKit;
  const add = R.addMap;
  const QL = () => R.QuestLog;
  const done = (q) => QL() && QL().isDone(q);
  const flag = (f) => !!R.World.flags[f];

  // ================================================================== items
  const mat = (id, name, price, shape, color, color2, desc) => R.addItem({ id, name, slot: 'material', price, icon: { shape, color, color2 }, desc });
  mat('crab_meat', 'Crab Meat', 10, 'food', '#f08060', '#fff0e0', 'Sweet, pink and still twitching a little.');
  mat('pirate_doubloon', 'Pirate Doubloon', 22, 'orb', '#ffd040', '#b08020', 'Stamped with a grinning skull. Worth more than it looks.');
  mat('sea_glass', 'Sea Glass', 18, 'gem', '#80e0d0', '#e0fff8', 'Worn smooth by a hundred years of tides.');
  mat('glow_spore', 'Glowspore', 26, 'blob', '#80ffb0', '#e0fff0', 'A spore sac that pulses with soft green light.');
  mat('lurker_eye', 'Lurker Eye', 30, 'orb', '#60ffe0', '#1a3a3a', 'It keeps looking at you.');
  mat('heartwood', 'Blighted Heartwood', 34, 'ore', '#6a4a3a', '#c050a0', 'Rotten at the core, humming with fey magic.');
  mat('fey_dust', 'Fey Dust', 40, 'bag', '#ff90e0', '#fff4a0', 'Sparkling dust shed by pixie wings. Makes you sneeze glitter.');
  mat('void_crystal', 'Void Crystal', 70, 'crystal', '#b070ff', '#ffffff', 'A shard of the space between the stars.');
  mat('star_fragment', 'Star Fragment', 90, 'gem', '#fff0a0', '#c080ff', 'Still warm from its fall.');
  const qi = (id, name, shape, color, desc) => R.addItem({ id, name, slot: 'quest', rarity: 'uncommon', price: 0, icon: { shape, color }, desc });
  qi('sea_bottle', 'Message in a Bottle', 'potion', '#80c0a0', 'A cork-stoppered bottle with a soggy note inside: "Pim — I\'m alive. Tell Mum. — Dad"');
  qi('lamp_oil', 'Whale-oil Lamp Oil', 'potion', '#e0c060', 'Thick, smelly, and exactly what a lighthouse needs.');
  qi('lost_pickaxe', "Dunk's Pickaxe", 'ore', '#9aa0a8', 'Engraved: "PROPERTY OF DUNK. HANDS OFF. YES, YOU."');
  // consumables
  R.addItem({ id: 'potion_mythic', name: 'Starlight Draught', slot: 'consumable', level: 24, price: 320, use: { heal: 900 }, icon: { shape: 'potion', color: '#ffe070', color2: '#ffffff' }, desc: 'Restores 900 HP.' });
  R.addItem({ id: 'ether_mythic', name: 'Void Ether', slot: 'consumable', level: 22, price: 240, use: { mana: 350 }, icon: { shape: 'potion', color: '#a040ff', color2: '#ffffff' }, desc: 'Restores 350 MP.' });
  R.addItem({ id: 'crab_cake', name: 'Saltmere Crab Cake', slot: 'consumable', level: 5, price: 45, use: { heal: 150, buff: { stat: 'def', amt: 6, dur: 60 } }, icon: { shape: 'food', color: '#e0a040' }, desc: 'Restores 150 HP and grants +6 defense for 60 seconds.' });

  // ================================================================== NPCs
  function npc(id, name, o) {
    const a = Object.assign(C.randomAppearance(U.rng('npc:' + id)), o.a || {});
    R.addNPC(Object.assign({ id, name, appearance: a, gear: o.gear || {}, wander: o.wander == null ? 20 : o.wander }, o));
  }
  const robe = (c, t) => ({ chest: { style: 'robe', color: c, trim: t || '#d8c060' } });
  const sailor = (c) => ({ head: { style: 'bandana', color: c }, chest: { style: 'tunic', color: '#e8e0d0', trim: '#3a5a8c' } });
  const monsterNpc = (sprite, pal, scale) => function (ctx, n) {
    const d = R.Monsters[sprite];
    const f = Math.floor(n.animT * 3) % ((d.frames && d.frames.idle) || 1);
    const flip = R.World.player && R.World.player.x < n.x;
    const spr = R.Monsters.sprite(sprite, pal, n.anim === 'walk' ? 'walk' : 'idle', f, flip);
    const s = scale || 1, ax = flip ? d.w - d.ax : d.ax;
    ctx.drawImage(spr, Math.round(n.x - (ax + 1) * s), Math.round(n.y - (d.ay + 1) * s), Math.round(spr.width * s), Math.round(spr.height * s));
  };

  // Havenbrook
  npc('mirabel', 'Mirabel', { title: 'Stylist', wander: 0, services: ['style'], serviceLine: 'Darling, that hair! Let me work my magic.', a: { body: 'b', hair: 'bun', hairColor: '#ff8ac0', eyeStyle: 'lashes', accessory: 'earrings', accColor: '#d8b040' }, gear: robe('#b04f8a', '#ffd040'), lines: ['A new look, a new you!', 'Horns are VERY in this season.', 'I can do anything except your bloodline, sweetie.'] });
  npc('bess', 'Bess', { title: 'Baker', wander: 8, a: { body: 'c', hair: 'curly', hairColor: '#b5773c', face: 'blush', eyeStyle: 'normal' }, gear: { chest: { style: 'tunic', color: '#e8e0d0', trim: '#c03030' } },
    shop: { title: "Bess's Bakery", greeting: 'Fresh from the oven! Well, fresh-ish.', items: ['potion_small', 'potion', 'crab_cake', 'antidote'] }, lines: ['Cinnamon buns! Get your cinnamon buns!', 'My sweetheart Hassan is all the way off in Saffar...'] });
  // Gullwind Coast / Saltmere
  npc('bree', 'Harbormaster Bree', { title: 'Harbormaster of Saltmere', wander: 0, a: { body: 'b', hair: 'ponytail', hairColor: '#e0b55f', skin: '#c98e62', face: 'scar' }, gear: Object.assign(sailor('#3a5a8c'), { cape: { style: 'cape', color: '#2a3a5a', trim: '#e0c060' } }), weapon: { type: 'sword', blade: '#d0d8e0', guard: '#c8a040', style: 'curved' }, lines: ['Saltmere\'s been a fishing town for three hundred years. It\'s not going to become a pirate town on MY watch.'] });
  npc('jonas', 'Old Salt Jonas', { title: 'Fisherman', wander: 10, a: { hair: 'bald', beard: 'long', beardColor: '#d8d8d8', skin: '#a36a44' }, gear: sailor('#8a2a2a'), lines: ['The sea gives, the sea takes. Mostly it takes.', 'Crabs have been bigger lately. MUCH bigger.'] });
  npc('pim_sea', 'Little Pim', { title: 'Cabin Boy', wander: 18, a: { hair: 'spiky', hairColor: '#2a1d18', skin: '#8a5634', face: 'freckles' }, gear: sailor('#2a8a6a'), lines: ['My dad\'s ship never came back. But he\'ll come home. I know it.'] });
  npc('pearl', 'Madame Pearl', { title: 'Merchant', wander: 0, a: { body: 'b', hair: 'long', hairColor: '#f2e2a6', accessory: 'necklace', accColor: '#f0f0ff' }, gear: robe('#2a6a8a', '#f0f0ff'),
    shop: { title: "Pearl's Treasures", greeting: 'Salvage from a hundred wrecks, darling. All perfectly legal.', items: R.shopStock({ slots: ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'cape', 'ring', 'amulet', 'consumable'], minLevel: 4, maxLevel: (p) => p.level + 3, rarities: ['common', 'uncommon', 'rare'], filter: (it) => it.slot !== 'consumable' || it.use.heal || it.use.mana }) },
    lines: ['Pearls, darling. Pearls are forever.'] });
  npc('cora', 'Cora', { title: 'Lighthouse Keeper', wander: 6, a: { body: 'b', hair: 'braids', hairColor: '#9a2b2b', accessory: 'glasses', accColor: '#202020' }, gear: { chest: { style: 'leather', color: '#4a3a2a', trim: '#e0c060' }, cape: { style: 'cape', color: '#e8c040', trim: '#8a6a2a' } }, lines: ['The light has burned for a century. I won\'t be the one who lets it go out.'] });
  // Glimmercap Hollows
  npc('myra', 'Myra', { title: 'Spore Scholar', wander: 12, a: { body: 'b', hair: 'bob', hairColor: '#46a15b', accessory: 'glasses', ears: 'pointed' }, gear: robe('#3a4a6a', '#80ffb0'), lines: ['Did you know the Hollows are all ONE mushroom? One! Enormous! Fungus!'] });
  npc('dunk', 'Dunk', { title: 'Dwarf Miner', wander: 10, a: { body: 'c', hair: 'bald', beard: 'braided', beardColor: '#e05a2a', skin: '#eab58c' }, gear: { chest: { style: 'leather', color: '#5a4030' }, head: { style: 'cap', color: '#e0c040' } }, weapon: { type: 'hammer', blade: '#9aa0a8' }, lines: ['Came down here for crystals. Found mushrooms. Mushrooms with ARMS.'] });
  npc('morel', 'Elder Morel', { title: 'Myconid Elder', wander: 0, appearance: null, drawSprite: monsterNpc('myconid', { main: '#a07050', eye: '#80ffb0', spots: '#fff4d0', accent: '#80ffb0' }, 1.2), lines: ['*The elder releases a puff of friendly, faintly minty spores.*', '*You feel understood.*'] });
  // Thornveil Grove
  npc('sylvara', 'Sylvara', { title: 'Warden of the Thornveil', wander: 0, a: { body: 'b', hair: 'long', hairColor: '#e0f0ff', skin: '#9fd4a8', ears: 'long', horns: 'antlers', hornColor: '#a09080', accessory: 'flower', accColor: '#ff80c0' }, gear: Object.assign(robe('#2a6a4a', '#ff90d0'), { cape: { style: 'cape', color: '#3a8a5a', trim: '#ff90d0' } }), weapon: { type: 'staff', handle: '#6a4424', gem: '#ff90e0', style: 'crook' }, lines: ['The grove remembers every footstep. Tread gently.'] });
  npc('thistle', 'Thistle', { title: 'Pixie Peddler', wander: 24, appearance: null, drawSprite: monsterNpc('pixie', { main: '#80d0ff', hair: '#fff4a0', accent: '#ffffff', wing: 'rgba(200,240,255,0.7)' }),
    shop: { title: "Thistle's Glittering Goods", greeting: 'Shinies for shinies! Everything glitters, nothing\'s cursed. Probably.', items: R.shopStock({ slots: ['ring', 'amulet', 'consumable'], minLevel: 8, maxLevel: (p) => p.level + 4, filter: (it) => it.slot !== 'consumable' || it.use.buff || it.use.mana || it.use.heal }) },
    lines: ['Hee hee!', 'Want to see a trick? *vanishes* ...Ta-da!'] });
  // Starfall Rift
  npc('ilyra', 'Seer Ilyra', { title: 'Watcher of the Veil', wander: 0, a: { body: 'd', hair: 'long', hairColor: '#ffffff', eyeStyle: 'glow', eyes: '#c080ff', skin: '#a9b8e8', face: 'tattoo', faceColor: '#c080ff' }, gear: Object.assign(robe('#2a1a4a', '#c080ff'), { head: { style: 'circlet', color: '#e0e0f0', accent: '#c080ff' } }), weapon: { type: 'staff', handle: '#3a2a5a', gem: '#e0c0ff' }, lines: ['The stars are wrong here. Something beyond them is looking in.'] });
  npc('vessel', 'The Vessel', { title: 'Merchant Between Worlds', wander: 0, a: { body: 'a', hair: 'bald', skin: '#6a6a78', eyeStyle: 'glow', eyes: '#ffe070', horns: 'unicorn', hornColor: '#ffe070' }, gear: Object.assign(robe('#1a1a2a', '#ffe070'), { head: { style: 'hood', color: '#1a1a2a', trim: '#ffe070' } }),
    shop: { title: 'Wares from Elsewhere', greeting: 'I trade in what the stars drop. Coin is... acceptable.', items: R.shopStock({ slots: ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'cape', 'ring', 'amulet', 'consumable'], minLevel: 18, maxLevel: (p) => p.level + 3, rarities: ['uncommon', 'rare', 'epic'], ids: ['potion_mythic', 'ether_mythic'] }) },
    lines: ['...', 'I remember when these stars were young.'] });

  // Havenbrook's baker has a sweetheart in the Oasis
  if (R.NPCs.hassan) R.NPCs.hassan.lines = (R.NPCs.hassan.lines || []).concat(['If you are ever in Havenbrook, say hello to Bess for me. She bakes the best bread in the world.']);
  // New villager chatter for the old towns
  if (R.NPCs.board) { R.NPCs.board.lines = ['BOUNTIES posted daily. The Captain pays in gold.']; R.NPCs.board.silent = true; }

  // ================================================================== enemies
  const mob = R.mob;
  // Gullwind Coast / Smuggler's Grotto (5-11)
  mob('crab', 'Shore Crab', 6, { hp: 1.1, atk: 0.95, def: 4, spd: 44, r: 8, height: 14, sprite: 'crab', pal: { main: '#d05030' }, ai: 'melee', attack: { range: 18, windup: 0.45, lunge: 90, cd: 1.3 }, knockResist: 0.3, drops: [{ item: 'crab_meat', chance: 0.5 }], tags: ['beast'], blood: '#f0e0c0' });
  mob('hermit_crab', 'Hermit Crab', 9, { hp: 1.7, atk: 1.1, def: 9, xp: 1.5, spd: 36, r: 9, height: 20, scale: 1.2, sprite: 'crab', pal: { main: '#c07040', shell: '#b8a080' }, ai: 'charger', attack: { range: 120, windup: 0.7, speed: 200, chargeT: 0.6, cd: 2.8, mult: 1.3 }, knockResist: 0.6, drops: [{ item: 'crab_meat', chance: 0.6 }, { item: 'sea_glass', chance: 0.2 }], tags: ['beast'], blood: '#f0e0c0' });
  mob('pirate', 'Saltwater Pirate', 7, { hp: 1, atk: 1.05, spd: 56, r: 6, height: 24, sprite: 'bandit', pal: { main: '#8a6a4a', scarf: '#c03030' }, ai: 'melee', attack: { range: 20, windup: 0.4, lunge: 160, cd: 1.2 }, drops: [{ item: 'pirate_doubloon', chance: 0.3 }], gold: [8, 22], potion: 0.1, gearChance: 0.1, tags: ['human'] });
  mob('pirate_gunner', 'Pirate Gunner', 8, { hp: 0.85, atk: 1.25, spd: 46, r: 6, height: 24, sprite: 'bandit', pal: { main: '#6a5a4a', scarf: '#303060', weapon: 'bow' }, ai: 'ranged', attack: { range: 230, keep: 140, windup: 0.9, cd: 2.6, speed: 260, kind: 'bolt', sound: 'crit', lead: 0.8, mult: 1.2 }, drops: [{ item: 'pirate_doubloon', chance: 0.3 }], gold: [8, 22], potion: 0.1, gearChance: 0.1, tags: ['human'] });
  mob('drowned', 'Drowned Sailor', 8, { hp: 1.3, atk: 1.05, spd: 30, r: 7, height: 24, sprite: 'shambler', pal: { main: '#5a8a8a', cloth: '#3a4a5a', drip: '#80e0ff' }, ai: 'melee', attack: { range: 18, windup: 0.7, lunge: 60, cd: 1.6, status: { slow: { amt: 0.35, dur: 2 } } }, drops: [{ item: 'sea_glass', chance: 0.25 }], tags: ['undead'], blood: '#80c0c0' });
  mob('gull', 'Storm Gull', 6, { hp: 0.6, atk: 0.85, xp: 0.8, spd: 80, r: 6, height: 12, sprite: 'vulture', pal: { main: '#d8dce8' }, ai: 'swarm', attack: { cd: 1.4 }, drops: [{ item: 'harpy_feather', chance: 0.06 }], tags: ['beast', 'flying'] });
  mob('siren', 'Siren', 8, { hp: 0.85, atk: 1, xp: 1.2, spd: 64, r: 7, height: 22, sprite: 'harpy', pal: { main: '#4a9a9a', hair: '#80e0d0' }, ai: 'ranged', attack: { range: 190, keep: 110, windup: 0.6, cd: 2.1, speed: 120, count: 3, spread: 0.22, mult: 0.7, color: '#80e0ff', status: { slow: { amt: 0.3, dur: 1.5 } } }, drops: [{ item: 'sea_glass', chance: 0.3 }], tags: ['beast', 'flying', 'spirit'] });
  mob('tidecaller', 'Tidecaller', 9, { hp: 0.95, atk: 1.1, xp: 1.5, spd: 34, r: 6, height: 28, sprite: 'robed', pal: { main: '#2a4a6a', head: 'hood', trim: '#80e0ff', accent: '#40c0ff', eye: '#80ffff' }, ai: 'caster', attack: { range: 190, radius: 30, delay: 1.0, cd: 2.6, color: '#40c0ff', mult: 1.25, status: { slow: { amt: 0.4, dur: 2 } } }, drops: [{ item: 'sea_glass', chance: 0.3 }, { item: 'pirate_doubloon', chance: 0.2 }], potion: 0.15, tags: ['human', 'caster'] });
  // Glimmercap Hollows (11-15)
  mob('myconid', 'Myconid Warrior', 12, { hp: 1.2, atk: 1.05, def: 3, spd: 40, r: 7, height: 26, sprite: 'myconid', pal: { main: '#b05060', eye: '#ffe060', weapon: 'club' }, ai: 'melee', attack: { range: 22, windup: 0.55, lunge: 90, cd: 1.4, status: { poison: { dps: 6, dur: 3 } } }, drops: [{ item: 'glow_spore', chance: 0.4 }, { item: 'mushroom_cap', chance: 0.2 }], tags: ['plant'], blood: '#e0d8c8' });
  mob('spore_shaman', 'Spore Shaman', 13, { hp: 1, atk: 1.05, xp: 1.6, spd: 34, r: 7, height: 26, sprite: 'myconid', pal: { main: '#6a50b0', accent: '#c0ff80', eye: '#c0ff80', spots: '#c0ff80' }, ai: 'summoner', attack: { range: 190, keep: 120, windup: 0.6, cd: 2.3, count: 3, spread: 0.25, speed: 120, color: '#c0ff80', summon: 'mushroom', summonCount: 2, summonCd: 9, maxMinions: 3, heal: true, healCd: 7, status: { poison: { dps: 6, dur: 3 } } }, drops: [{ item: 'glow_spore', chance: 0.6 }], potion: 0.15, tags: ['plant', 'caster'], blood: '#e0d8c8' });
  mob('glowbug', 'Glowbug', 12, { hp: 0.5, atk: 0.85, xp: 0.8, spd: 72, r: 5, height: 12, sprite: 'wisp', pal: { main: '#60e0ff' }, ai: 'ranged', attack: { range: 160, keep: 80, windup: 0.6, cd: 2, speed: 90, color: '#80ffe0', homing: 1.6, size: 2 }, glow: '#40e0ff', light: { r: 40, color: '#60e0ff' }, drops: [{ item: 'glow_spore', chance: 0.2 }], tags: ['insect', 'flying'] });
  mob('cave_lurker', 'Deep Lurker', 13, { hp: 0.95, atk: 1.1, spd: 64, r: 8, height: 14, sprite: 'spider', pal: { main: '#2a2a4a', eye: '#60ffe0', mark: '#40c0ff', hair: '#4a4a6a' }, ai: 'leaper', attack: { range: 100, windup: 0.45, leapT: 0.4, radius: 16, cd: 1.9, mult: 1.2, color: '#40c0ff', status: { poison: { dps: 7, dur: 3 } } }, drops: [{ item: 'lurker_eye', chance: 0.4 }, { item: 'spider_silk', chance: 0.25 }], tags: ['beast', 'insect'], blood: '#40c0a0' });
  mob('fungal_hulk', 'Fungal Hulk', 14, { hp: 2.3, atk: 1.3, def: 6, xp: 2.1, spd: 28, r: 11, height: 36, sprite: 'golem', pal: { main: '#5a4a6a', core: '#80ff90', crystals: '#c070ff' }, ai: 'brute', attack: { radius: 34, windup: 0.9, cd: 2.7, mult: 1.4, color: '#a0ff80', status: { poison: { dps: 8, dur: 3 } }, pool: { r: 22, dur: 4, color: '#80ff60', mult: 0.3, status: { poison: { dps: 6, dur: 2 } } } }, knockResist: 1, drops: [{ item: 'glow_spore', chance: 0.5, qty: [1, 2] }], potion: 0.15, tags: ['plant', 'construct'], blood: '#80ff90', immune: ['poison'] });
  // Thornveil Grove (16-20)
  mob('treant', 'Blightwood Treant', 18, { hp: 2.4, atk: 1.3, def: 7, xp: 2.2, spd: 30, r: 11, height: 44, sprite: 'treant', pal: { main: '#5a4a3a', leaf: '#4a7a3a', eye: '#ff6040' }, ai: 'brute', attack: { radius: 36, windup: 0.9, cd: 2.6, mult: 1.45, color: '#a0c060', throw: true, throwColor: '#6a5040', status: { slow: { amt: 0.35, dur: 2 } } }, knockResist: 1, drops: [{ item: 'heartwood', chance: 0.45 }], potion: 0.15, tags: ['plant'], blood: '#8a6a4a', immune: ['bleed', 'poison'] });
  mob('pixie', 'Wicked Pixie', 17, { hp: 0.6, atk: 0.95, xp: 1, spd: 76, r: 5, height: 16, sprite: 'pixie', pal: { main: '#e060c0', hair: '#ff90e0', accent: '#fff4a0' }, ai: 'ranged', attack: { range: 180, keep: 100, windup: 0.5, cd: 1.8, speed: 115, color: '#ff90e0', homing: 2, size: 2, count: 2, spread: 0.3 }, glow: '#ff80e0', light: { r: 30, color: '#ff90e0' }, dodge: 0.55, flee: 0.3, drops: [{ item: 'fey_dust', chance: 0.4 }], tags: ['fey', 'flying'] });
  mob('fey_wolf', 'Moonfang Wolf', 17, { hp: 1, atk: 1.05, spd: 70, r: 7, height: 16, sprite: 'wolf', pal: { main: '#8080c0', eye: '#c0ffff', stripe: '#b0b0ff' }, ai: 'melee', attack: { range: 16, windup: 0.35, lunge: 180, cd: 1.1 }, drops: [{ item: 'wolf_pelt', chance: 0.4 }, { item: 'fey_dust', chance: 0.1 }], tags: ['beast', 'fey'] });
  mob('briar_archer', 'Briar Stalker', 18, { hp: 0.9, atk: 1.05, spd: 52, r: 6, height: 24, sprite: 'bandit', pal: { main: '#4a6a3a', scarf: '#8a2a5a', weapon: 'bow' }, ai: 'ranged', attack: { range: 220, keep: 130, windup: 0.55, cd: 2, speed: 220, kind: 'arrow', sound: 'arrow', count: 2, spread: 0.12, status: { poison: { dps: 8, dur: 3 } } }, drops: [{ item: 'fey_dust', chance: 0.15 }], potion: 0.12, gearChance: 0.1, tags: ['human', 'fey'] });
  mob('bramble', 'Snapbramble', 17, { hp: 1.3, atk: 1, def: 4, spd: 0, r: 9, height: 18, sprite: 'bramble', pal: { main: '#4a6a2a', flower: '#ff70b0' }, ai: 'turret', aggro: 170, stationary: true, attack: { cd: 1.8, count: 3, aimed: true, spread: 0.25, speed: 120, color: '#c0ff60', status: { poison: { dps: 7, dur: 3 } } }, knockResist: 1, drops: [{ item: 'heartwood', chance: 0.15 }], tags: ['plant'], blood: '#80c040', noStagger: true });
  // Starfall Rift (25-30)
  mob('voidling', 'Voidling', 26, { hp: 0.9, atk: 1.05, xp: 1.1, spd: 50, r: 8, height: 22, sprite: 'voideye', pal: { main: '#4a2a7a', eye: '#ff40ff' }, ai: 'ranged', attack: { range: 200, keep: 110, windup: 0.6, cd: 2, speed: 140, count: 3, spread: 0.2, color: '#ff60ff', mult: 0.7 }, glow: '#a040ff', light: { r: 40, color: '#c060ff' }, drops: [{ item: 'void_crystal', chance: 0.35 }], tags: ['spirit', 'flying'], blood: '#c080ff', immune: ['bleed', 'poison'] });
  mob('void_knight', 'Starfallen Knight', 27, { hp: 1.8, atk: 1.3, def: 10, xp: 1.9, spd: 46, r: 8, height: 30, sprite: 'knight', pal: { main: '#2a2a4a', trim: '#c080ff', cloth: '#1a0a3a', shield: '#101020', eye: '#e0c0ff', cape: '#2a0a4a' }, ai: 'melee', attack: { range: 24, windup: 0.55, lunge: 160, cd: 1.3, mult: 1.35 }, knockResist: 0.7, drops: [{ item: 'dark_steel', chance: 0.3 }, { item: 'star_fragment', chance: 0.05 }], potion: 0.15, gearChance: 0.12, tags: ['undead'] });
  mob('star_wraith', 'Star Wraith', 26, { hp: 0.9, atk: 1.15, xp: 1.2, spd: 56, r: 7, height: 26, sprite: 'wraith', pal: { main: '#3a2a6a', eye: '#ffffff' }, ai: 'ghost', attack: { windup: 0.5, cd: 1.8, mult: 1.2, bolt: true, color: '#e0c0ff', speed: 140 }, glow: '#8060ff', drops: [{ item: 'star_fragment', chance: 0.12 }], tags: ['undead', 'spirit', 'flying'], blood: '#c0a0ff', immune: ['bleed', 'poison'] });
  mob('rift_golem', 'Rift Colossus', 28, { hp: 2.6, atk: 1.35, def: 12, xp: 2.4, spd: 28, r: 12, height: 40, sprite: 'golem', pal: { main: '#3a2e52', core: '#e080ff', crystals: '#b070ff' }, ai: 'brute', attack: { radius: 38, windup: 0.9, cd: 2.6, mult: 1.5, color: '#c080ff', throw: true, throwColor: '#b070ff' }, knockResist: 1, drops: [{ item: 'void_crystal', chance: 0.5, qty: [1, 2] }], potion: 0.2, tags: ['construct'], blood: '#c080ff', immune: ['poison', 'bleed', 'freeze'] });
  mob('void_hound', 'Void Hound', 26, { hp: 1.05, atk: 1.1, spd: 74, r: 8, height: 16, sprite: 'wolf', pal: { main: '#1a1428', eye: '#ff40ff', mane: '#b040ff', belly: '#3a1a4a' }, ai: 'charger', attack: { range: 160, windup: 0.5, speed: 280, chargeT: 0.55, cd: 2, mult: 1.3 }, glow: '#8030c0', drops: [{ item: 'void_crystal', chance: 0.2 }], tags: ['beast'] });

  // ================================================================== bosses
  const boss = (d) => R.addEnemy(Object.assign({ boss: true, knockResist: 1, music: 'boss', immune: ['stun', 'freeze'] }, d));
  boss({
    id: 'crab_king', name: 'Clackjaw', title: 'The Tide Tyrant', level: 11, hp: 3600, atk: 50, def: 16, spd: 46, xp: 2000, gold: [250, 380], r: 18, height: 34, scale: 2.6,
    sprite: 'crab', pal: { main: '#c03a2a', crown: '#ffd040', shell: '#6a8a9a' }, tags: ['beast', 'boss'], light: { r: 60, color: '#80e0ff' },
    drops: [{ item: 'potion', chance: 1, qty: [3, 4] }, { item: 'crab_cake', chance: 1, qty: [2, 3] }],
    intro: ['*The pool churns. A crown glints beneath the water.*', 'CLACK. CLACK. You smell of SURFACE. Of SUN. I HATE the sun.'],
    update: K.bossBrain({ color: '#40c0ff', keep: 60, moves: [K.charge('#80e0ff'), K.fan('#80e0ff', 5, { slow: { amt: 0.4, dur: 2 } }), K.blast('#40a0ff', { slow: { amt: 0.5, dur: 2 } }), K.summon('crab', 2), K.ring('#a0e0ff', 12)] }),
  });
  boss({
    id: 'mycelord', name: 'Mycelos', title: 'The Rot-Crowned', level: 15, hp: 5200, atk: 64, def: 16, spd: 40, xp: 3400, gold: [400, 560], r: 16, height: 46, scale: 2.4,
    sprite: 'myconid', pal: { main: '#8a3a8a', spots: '#c0ff80', crown: '#ffd040', eye: '#c0ff80', accent: '#c0ff80' }, tags: ['plant', 'boss'], light: { r: 70, color: '#a0ff80' }, immune: ['stun', 'freeze', 'poison'],
    drops: [{ item: 'potion_large', chance: 1, qty: [2, 3] }],
    intro: ['*Every mushroom in the cavern turns toward you at once.*', 'WE ARE MANY. WE ARE ONE. YOU WILL FEED THE ROOT.'],
    update: K.bossBrain({ color: '#a0ff60', keep: 90, moves: [K.rain('#a0ff60', { poison: { dps: 16, dur: 3 } }), K.ring('#c0ff80', 14), K.summon('myconid', 2), K.blast('#80ff40', { poison: { dps: 18, dur: 4 } }), K.spiral('#c070ff')] }),
  });
  boss({
    id: 'briar_queen', name: 'Queen Briarthorn', title: 'Heart of the Thornveil', level: 20, hp: 7400, atk: 84, def: 20, spd: 34, xp: 5600, gold: [600, 850], r: 18, height: 60, scale: 2.2,
    sprite: 'treant', pal: { main: '#6a4a5a', leaf: '#c050a0', flowers: '#ffe0f0', crown: '#ffd040', eye: '#ff80e0' }, tags: ['plant', 'fey', 'boss'], light: { r: 90, color: '#ff90e0' }, immune: ['stun', 'freeze', 'poison', 'bleed'],
    drops: [{ item: 'potion_super', chance: 1, qty: [2, 3] }],
    intro: ['*Petals rain from nowhere. The ancient tree before you opens its eyes.*', 'Little warm thing. You trample my roots and pluck my children.', 'Now you will SLEEP beneath my thorns, forever.'],
    update: K.bossBrain({ color: '#ff70c0', keep: 100, moves: [K.rain('#c0ff60', { poison: { dps: 22, dur: 3 } }), K.fan('#ff90e0', 7, null), K.summon('pixie', 2), K.blast('#ff60c0', { slow: { amt: 0.5, dur: 2 } }), K.spiral('#c0ff60'), K.ring('#ff90e0', 16)] }),
  });
  boss({
    id: 'watcher', name: 'Ulthuun', title: 'The Watcher Beyond', level: 30, hp: 18000, atk: 128, def: 30, spd: 44, xp: 20000, gold: [2500, 3500], r: 18, height: 60, scale: 3,
    sprite: 'voideye', pal: { main: '#3a1a5a', eye: '#ff40ff', crown: '#c080ff' }, tags: ['spirit', 'boss', 'flying'], light: { r: 120, color: '#c060ff' }, immune: ['stun', 'freeze', 'poison', 'bleed', 'slow'],
    drops: [{ item: 'potion_mythic', chance: 1, qty: [3, 4] }, { item: 'tome_xp', chance: 1, qty: [2, 2] }],
    intro: ['*The stars go dark, one by one. An eye the size of a moon opens.*', 'I HAVE WATCHED YOUR LITTLE WORLD SINCE BEFORE IT HAD A NAME.', 'THE HOLLOW KING WAS MY DOOR. YOU HAVE KILLED MY DOORKEEPER. NOW I WILL WALK THROUGH MYSELF.'],
    update: K.bossBrain({
      color: '#c040ff', keep: 110,
      moves: [K.spiral('#ff60ff'), K.ring('#c080ff', 18), K.rain('#8040ff', null), K.blast('#ff40ff', { slow: { amt: 0.4, dur: 2 } }), K.fan('#ffffff', 9, null), K.summon('voidling', 2), K.charge('#c040ff')],
      onPhase(e, ph) { if (ph === 3) R.UI.dialog([{ speaker: 'Ulthuun', text: 'SEE WHAT LIES BETWEEN THE STARS, LITTLE FLAME. SEE IT AND DESPAIR.' }]); },
    }),
  });

  // Reinforcements each boss calls in when it enters a new phase.
  const ADDS = { slime_king: 'slime', lich: 'skeleton', broodmother: 'spiderling', pharaoh: 'scarab', frost_wyrm: 'ice_bat', infernal: 'fire_imp', hollow_king: 'hollow_soldier', crab_king: 'crab', mycelord: 'myconid', briar_queen: 'pixie', watcher: 'voidling' };
  for (const [b, a] of Object.entries(ADDS)) if (R.Enemies[b]) R.Enemies[b].bossAdds = a;

  // ================================================================== maps
  const K2 = R.MapKit;
  // ---------------------------------------------------------------- Gullwind Coast
  add('coast', {
    name: 'Gullwind Coast', subtitle: 'Level 5-9', w: 90, h: 70, level: 7, music: 'coast', outdoor: true, dustColor: '#d8c490',
    weather: 'leaves', tint: 'rgba(120,200,255,0.05)',
    build(M) {
      M.fill('grass');
      M.noiseFill(0.1, (n) => (n > 0.68 ? 'darkgrass' : null));
      // the sea wraps the east and south
      M.noiseFill(0.09, (n, x, y) => { const f = Math.max(x - 64, (y - 54) * 1.1) + (n - 0.5) * 10; return f > 4 ? 'sea' : f > 2 ? 'surf' : f > 0 ? 'wetsand' : f > -4 ? 'beach' : null; });
      for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if ((x < 2 || y < 2) && !(y < 2 && x >= 41 && x < 48) && M.get(x, y) !== 'sea') M.set(x, y, 'canopy');
      // Gull Cliffs: a tall plateau with a lighthouse and a waterfall
      M.circle(16, 21.5, 2.2, 'water');
      M.path([[16, 22], [16, 37]], 'water', 2);
      M.path([[16, 40], [20, 47], [28, 54]], 'water', 2, 2);
      M.plateau(3, 18, 26, 20, null, 'coast');
      M.waterfall(15, 38, 3, 2);
      M.stairs(8, 38, 3, 2); M.stairs(29, 26, 1, 3);
      M.rect(5, 40, 8, 2, 'path'); M.rect(30, 25, 4, 5, 'path');
      M.prop('lighthouse', 8, 24); M.zone('Gull Lighthouse', 9, 26, 4);
      M.npc('cora', 12, 26);
      M.chest('coast_cliff', 25, 20, { loot: ['potion', 'ether', 'sea_glass'], gold: 90, tier: 'iron' });
      M.prop('bench', 13, 29);
      // sea cave under the southern bluff
      M.rect(16, 42, 5, 3, 'bridge'); // cross the falls' river
      M.plateau(2, 44, 11, 6, null, 'coast');
      for (let y = 50; y < 52; y++) for (let x = 6; x < 9; x++) M.set(x, y, 'wetstone');
      M.prop('cavemouth', 7, 51, 2);
      M.exit(6, 50, 3, 2, 'sea_cave', 'entrance', { label: "Enter the Smuggler's Grotto", prompt: true, color: '#40c0ff' });
      M.point('cave', 7, 53);
      M.rect(3, 52, 12, 3, 'beach');
      // Saltmere village
      M.path([[44, 0], [44, 14], [50, 16], [62, 17]], 'path', 3);
      M.path([[44, 14], [40, 30], [42, 42], [38, 50]], 'path', 2, 3);
      M.rect(38, 7, 22, 14, 'dirt'); M.rect(46, 13, 8, 6, 'cobble');
      M.prop('house', 40, 11, 0); M.prop('house', 57, 10, 2); M.prop('hut', 50, 9, 1); M.prop('shop', 55, 21, 1);
      M.prop('well', 50, 16); M.prop('fishrack', 58, 14); M.prop('crabtrap', 61, 20); M.prop('barrel', 40, 14); M.prop('crate', 41, 15); M.prop('anchor', 39, 18);
      M.prop('lamp', 46, 13); M.prop('lamp', 53, 13); M.prop('lamp', 44, 19);
      // docks
      M.rect(60, 16, 16, 2, 'planks'); M.rect(74, 12, 2, 8, 'planks');
      for (const [x, y] of [[64, 15], [68, 15], [72, 15], [64, 18], [68, 18], [72, 18]]) M.prop('dockpost', x, y);
      M.prop('boat', 70, 20); M.prop('buoy', 79, 13); M.prop('buoy', 80, 24);
      M.waypoint('coast', 47, 20, 'Saltmere');
      M.npc('bree', 50, 14); M.npc('jonas', 70, 16); M.npc('pim_sea', 44, 22); M.npc('pearl', 55, 23);
      M.sign(45, 3, 'South: Saltmere\nWest: Gull Lighthouse\nNorth: Havenbrook');
      // pirate camp on the beach
      M.rect(26, 45, 20, 7, 'beach');
      M.prop('tent', 30, 47, 0); M.prop('tent', 42, 47, 1); M.prop('campfire', 36, 49); M.prop('crate', 27, 50); M.prop('crate', 45, 50); M.prop('barrel', 28, 46); M.prop('warbanner', 36, 45);
      M.chest('pirate_stash', 44, 45, { loot: ['pirate_doubloon', 'potion'], gold: 120, tier: 'iron' });
      // shipwreck in the surf
      M.rect(44, 54, 12, 3, 'wetsand');
      M.prop('shipwreck', 58, 60);
      M.chest('coast_wreck', 48, 55, { loot: ['lamp_oil', 'sea_glass'], gold: 60 });
      M.prop('seastack', 72, 32); M.prop('seastack', 76, 44, 1); M.prop('seastack', 68, 60);
      K2.keepTiles(M, ['path', 'planks', 'cobble', 'dirt', 'water', 'stairs_coast', 'wetstone']);
      M.reserve(36, 5, 26, 20); M.reserve(24, 43, 24, 10);
      M.scatter('tree', 45, { on: ['grass', 'darkgrass'], minDist: 2.5 });
      M.scatter('palm', 18, { on: ['beach', 'grass'], minDist: 3 });
      M.scatter('bush', 30, { on: ['grass', 'darkgrass'] });
      M.scatter('flowers', 30, { on: ['grass'] });
      M.scatter('shell', 30, { on: ['beach', 'wetsand'] });
      M.scatter('driftwood', 10, { on: ['beach', 'wetsand'], minDist: 4 });
      M.scatter('seaweed', 16, { on: ['surf'] });
      M.scatter('coral', 8, { on: ['surf'], minDist: 4 });
      M.scatter('rock', 14, { on: ['beach', 'grass'] });
      M.spawn('gull', 20, 30, { count: 3, radius: 4, level: 6 });
      M.spawn('crab', 61, 32, { count: 4, radius: 4, level: 6 });
      M.spawn('crab', 60, 44, { count: 3, radius: 4, level: 7 });
      M.spawn('hermit_crab', 56, 50, { count: 2, radius: 3, level: 8, elite: 0.15 });
      M.spawn('pirate', 36, 48, { count: 4, radius: 4, level: 7, elite: 0.15 });
      M.spawn('pirate_gunner', 32, 45, { count: 2, radius: 2, level: 8 });
      M.spawn('tidecaller', 42, 50, { count: 1, radius: 2, level: 9 });
      M.spawn('drowned', 48, 54, { count: 3, radius: 3, level: 8 });
      M.spawn('siren', 64, 26, { count: 3, radius: 4, level: 8 });
      M.spawn('gull', 30, 36, { count: 3, radius: 5, level: 7 });
      M.exit(41, 0, 7, 1, 'town', 'south');
      M.point('north', 44, 3);
      M.point('start', 47, 22);
    },
  });

  // ---------------------------------------------------------------- Smuggler's Grotto
  add('sea_cave', {
    name: "Smuggler's Grotto", subtitle: 'Level 8-11', w: 50, h: 46, level: 10, music: 'caves', dark: 0.8, ambient: '#040a10', playerLight: 100, dustColor: '#4a5a60',
    weather: 'spores',
    build(M) {
      M.fill('seawall');
      M.noiseFill(0.15, (n, x, y) => (n > 0.56 && x > 2 && y > 2 && x < M.w - 3 && y < M.h - 3 ? 'wetstone' : null));
      M.rect(20, 37, 11, 9, 'wetstone');
      M.path([[25, 40], [25, 26]], 'wetstone', 3);
      M.circle(25, 22, 9, 'wetstone', 1.5);
      M.circle(25, 23, 3.2, 'surf'); M.circle(25, 23, 2, 'sea');
      M.path([[17, 22], [8, 14]], 'wetstone', 3); M.rect(2, 6, 11, 11, 'wetstone');
      M.path([[33, 22], [41, 20]], 'wetstone', 3); M.rect(37, 18, 9, 5, 'wetstone');
      M.path([[25, 14], [25, 17]], 'wetstone', 3);
      M.rect(15, 5, 20, 10, 'wetstone');
      M.circle(24.5, 8.5, 3.3, 'surf'); M.circle(24.5, 8.5, 2, 'sea');
      M.plateau(35, 7, 12, 9, 'wetstone', 'dark');
      M.stairs(39, 16, 3, 2, 'dark');
      M.plateau(19, 1, 12, 3, 'wetstone', 'dark');
      M.waterfall(24, 4, 2, 2);
      M.waypoint('sea_cave', 28, 41, 'Grotto Mouth');
      M.prop('torch', 21, 38); M.prop('torch', 29, 38); M.prop('torch', 16, 6); M.prop('torch', 33, 6);
      // smugglers' den
      M.prop('crate', 3, 7); M.prop('crate', 4, 7); M.prop('barrel', 11, 7); M.prop('barrel', 11, 8); M.prop('table', 7, 12); M.prop('bedroll', 3, 14); M.prop('warbanner', 8, 7);
      M.chest('cave_den', 4, 9, { loot: ['pirate_doubloon', 'pirate_doubloon', 'potion'], gold: 160, tier: 'iron' });
      // ledge
      M.chest('cave_bottle', 43, 9, { loot: ['sea_bottle', 'sea_glass'], gold: 40 });
      M.prop('coral', 37, 9); M.prop('crystal', 45, 12);
      M.boss('crab_king', 24, 12);
      M.chest('cave_treasure', 32, 7, { loot: ['potion', 'potion', 'crab_cake'], gold: 350, tier: 'gold', requires: () => flag('boss:crab_king') });
      M.scatter('seaweed', 10, { on: ['surf'] });
      M.scatter('bones', 8, { on: ['wetstone'] });
      M.scatter('coral', 8, { on: ['wetstone'], minDist: 5 });
      M.scatter('stalagmite', 12, { on: ['wetstone'], minDist: 3 });
      M.spawn('pirate', 7, 11, { count: 3, radius: 3, level: 9, respawn: 90 });
      M.spawn('pirate_gunner', 9, 14, { count: 2, radius: 2, level: 9, respawn: 90 });
      M.spawn('tidecaller', 5, 10, { count: 1, radius: 1, level: 10 });
      M.spawn('crab', 21, 27, { count: 3, radius: 3, level: 9, respawn: 90 });
      M.spawn('hermit_crab', 30, 25, { count: 2, radius: 2, level: 10, elite: 0.2 });
      M.spawn('drowned', 40, 11, { count: 3, radius: 3, level: 10 });
      M.spawn('drowned', 40, 20, { count: 2, radius: 2, level: 10, respawn: 90 });
      M.exit(21, 45, 9, 1, 'coast', 'cave');
      M.point('entrance', 25, 42);
    },
  });

  // ---------------------------------------------------------------- Glimmercap Hollows
  add('glimmer', {
    name: 'Glimmercap Hollows', subtitle: 'Level 11-15', w: 60, h: 56, level: 13, music: 'caves', dark: 0.72, ambient: '#060410', playerLight: 105, dustColor: '#4a4060',
    weather: 'spores',
    build(M) {
      M.fill('fungalwall');
      M.noiseFill(0.12, (n, x, y) => (n > 0.5 && x > 2 && y > 2 && x < M.w - 3 && y < M.h - 3 ? 'glowmoss' : null));
      M.path([[30, 55], [30, 44], [18, 36], [14, 24], [22, 12], [30, 8]], 'glowmoss', 3, 3);
      M.path([[30, 44], [44, 36], [46, 24], [38, 12], [30, 8]], 'glowmoss', 3, 3);
      M.noiseFill(0.2, (n, x, y) => (n > 0.62 && M.get(x, y) === 'glowmoss' ? 'sporegrass' : null));
      M.rect(26, 47, 9, 9, 'glowmoss');
      // myconid village
      M.circle(11, 30, 7, 'sporegrass', 1.2);
      M.prop('glowshroom', 6, 26); M.prop('glowshroom', 16, 25); M.prop('glowshroom', 6, 35); M.prop('glowshroom', 17, 35); M.prop('fairyring', 11, 31);
      M.npc('morel', 11, 28); M.npc('myra', 8, 31); M.npc('dunk', 14, 33);
      M.zone('Myconid Village', 11, 30, 6);
      // underground lake below a ledge, with a waterfall
      M.rect(46, 19, 10, 8, 'glowmoss');
      M.circle(51, 23, 3.4, 'shallow'); M.circle(51, 23, 2.2, 'water');
      M.plateau(47, 9, 9, 8, 'glowmoss', 'dark');
      M.waterfall(50, 17, 2, 2);
      M.stairs(53, 17, 2, 2, 'dark');
      M.chest('glim_ledge', 49, 11, { loot: ['lost_pickaxe', 'glow_spore'], gold: 120, tier: 'iron' });
      M.prop('crystal', 54, 10); M.prop('glowshroom', 48, 14);
      // Heartroot chamber
      M.circle(30, 8, 7, 'glowmoss', 1);
      for (const [x, y] of [[23, 5], [37, 5], [24, 12], [36, 12]]) M.prop('rootpillar', x, y);
      M.boss('mycelord', 30, 7);
      M.chest('glim_heart', 33, 4, { loot: ['potion_large', 'glow_spore', 'glow_spore'], gold: 400, tier: 'gold', requires: () => flag('boss:mycelord') });
      M.waypoint('glimmer', 32, 50, 'Sinkhole Landing');
      M.prop('torch', 27, 52); M.prop('torch', 34, 52);
      M.chest('glim_1', 44, 37, { loot: ['potion_large', 'ether'], gold: 180, tier: 'iron' });
      K2.keepTiles(M, ['stairs_dark']);
      M.reserve(4, 23, 15, 14);
      M.scatter('glowshroom', 18, { on: ['glowmoss', 'sporegrass'], minDist: 4 });
      M.scatter('shroomcluster', 30, { on: ['glowmoss', 'sporegrass'], minDist: 2 });
      M.scatter('sporepod', 12, { on: ['sporegrass'], minDist: 4 });
      M.scatter('mushroom', 25, { on: ['glowmoss'] });
      M.scatter('crystal', 8, { on: ['glowmoss'], minDist: 6 });
      M.scatter('bones', 6, { on: ['glowmoss'] });
      M.spawn('myconid', 22, 42, { count: 3, radius: 3, level: 12 });
      M.spawn('myconid', 40, 34, { count: 3, radius: 3, level: 13, elite: 0.15 });
      M.spawn('spore_shaman', 20, 16, { count: 2, radius: 2, level: 13 });
      M.spawn('glowbug', 30, 26, { count: 4, radius: 4, level: 12 });
      M.spawn('cave_lurker', 46, 34, { count: 3, radius: 3, level: 13 });
      M.spawn('fungal_hulk', 16, 19, { count: 1, radius: 2, level: 14, elite: 0.2 });
      M.spawn('mushroom', 36, 45, { count: 3, radius: 3, level: 12 });
      M.spawn('cave_lurker', 42, 14, { count: 2, radius: 2, level: 14 });
      M.exit(26, 55, 9, 1, 'marsh', 'sinkhole');
      M.point('entrance', 30, 52);
    },
  });

  // ---------------------------------------------------------------- Thornveil Grove
  add('thornwood', {
    name: 'Thornveil Grove', subtitle: 'Level 16-20', w: 90, h: 80, level: 18, music: 'grove', outdoor: true, dustColor: '#5a7a60',
    weather: 'fireflies', tint: 'rgba(90,20,110,0.08)',
    build(M) {
      M.fill('feygrass');
      M.noiseFill(0.1, (n) => (n > 0.64 ? 'feymoss' : null));
      M.noiseFill(0.13, (n, x, y) => (n > 0.82 ? 'thornwall' : null));
      M.border('thornwall', 2, [[88, 48, 2, 6]]);
      M.path([[89, 51], [60, 50], [44, 40], [40, 20], [44, 10]], 'mossstone', 3, 3);
      M.path([[60, 50], [64, 66], [50, 72]], 'mossstone', 2, 3);
      M.path([[44, 40], [20, 44], [12, 60]], 'mossstone', 2, 3);
      // Moonlit Terrace: a high plateau with a stream that tumbles down into a pond
      M.circle(18, 30, 4.5, 'shallow', 1); M.circle(18, 30, 3.2, 'water', 1);
      M.plateau(6, 8, 25, 18, 'feygrass', 'fey');
      M.circle(18, 11, 2, 'water');
      M.path([[18, 12], [18, 25]], 'water', 2);
      M.waterfall(17, 26, 3, 2);
      M.stairs(24, 26, 3, 2, 'fey'); M.stairs(31, 15, 1, 3, 'fey');
      M.rect(24, 28, 4, 2, 'mossstone'); M.rect(32, 14, 6, 5, 'mossstone');
      M.prop('fairyring', 11, 14); M.zone('Ring of Stars', 11, 14, 2);
      M.prop('standingstone', 8, 11); M.prop('standingstone', 14, 11); M.prop('standingstone', 26, 12);
      M.chest('thorn_terrace', 27, 10, { loot: ['potion_super', 'fey_dust'], gold: 260, tier: 'iron' });
      // Briarwatch Rise, guarded by snapbrambles
      M.plateau(62, 26, 19, 13, 'feymoss', 'fey');
      M.stairs(70, 39, 3, 2, 'fey');
      M.chest('thorn_rise', 76, 28, { loot: ['potion_super', 'ether_large', 'heartwood'], gold: 320, tier: 'gold' });
      M.prop('feytree', 66, 30, 1); M.prop('standingstone', 78, 34);
      // fairy rings
      M.prop('fairyring', 72, 18); M.zone('Ring of Dawn', 72, 18, 2);
      M.prop('fairyring', 30, 62); M.zone('Ring of Dusk', 30, 62, 2);
      // the Heart Grove (boss)
      M.circle(44, 10, 10, 'thornwall', 1);
      M.circle(44, 10, 8, 'feymoss', 1);
      M.rect(40, 15, 8, 7, 'mossstone');
      for (const [x, y] of [[38, 5], [50, 5], [37, 12], [51, 12]]) M.prop('feytree', x, y, (x + y) % 3);
      M.boss('briar_queen', 44, 8);
      M.chest('thorn_heart', 47, 5, { loot: ['potion_super', 'fey_dust', 'heartwood'], gold: 600, tier: 'gold', requires: () => flag('boss:briar_queen') });
      // Warden's camp
      M.rect(58, 52, 13, 10, 'feymoss');
      M.prop('hollowlog', 61, 60); M.prop('campfire', 64, 57); M.prop('standingstone', 59, 53); M.prop('standingstone', 70, 53); M.prop('bedroll', 67, 59);
      M.waypoint('thornwood', 66, 55, "Warden's Camp");
      M.npc('sylvara', 62, 55); M.npc('thistle', 68, 58);
      M.sign(84, 50, 'Thornveil Grove\nEast: Frostfang Peaks');
      K2.keepTiles(M, ['mossstone', 'water', 'shallow', 'stairs_fey']);
      M.reserve(56, 50, 17, 14); M.reserve(36, 14, 16, 8);
      M.scatter('feytree', 40, { on: ['feygrass', 'feymoss'], minDist: 4 });
      M.scatter('tree', 30, { on: ['feygrass'], minDist: 3 });
      M.scatter('thornbush', 30, { on: ['feygrass', 'feymoss'], minDist: 2 });
      M.scatter('bluebells', 40, { on: ['feygrass'] });
      M.scatter('mushroom', 20, { on: ['feymoss'] });
      M.scatter('standingstone', 8, { on: ['feygrass'], minDist: 10 });
      M.scatter('hollowlog', 5, { on: ['feygrass'], minDist: 12 });
      M.spawn('treant', 30, 46, { count: 2, radius: 3, level: 18, elite: 0.15 });
      M.spawn('treant', 52, 30, { count: 2, radius: 3, level: 19 });
      M.spawn('pixie', 70, 20, { count: 4, radius: 4, level: 17 });
      M.spawn('pixie', 16, 16, { count: 3, radius: 3, level: 18 });
      M.spawn('fey_wolf', 20, 52, { count: 4, radius: 4, level: 17 });
      M.spawn('fey_wolf', 60, 12, { count: 3, radius: 3, level: 18 });
      M.spawn('briar_archer', 48, 62, { count: 3, radius: 3, level: 18 });
      M.spawn('bramble', 66, 29, { count: 1, radius: 0, level: 18, respawn: 0 });
      M.spawn('bramble', 74, 31, { count: 1, radius: 0, level: 18, respawn: 0 });
      M.spawn('bramble', 70, 36, { count: 1, radius: 0, level: 18, respawn: 0 });
      M.spawn('bramble', 39, 22, { count: 1, radius: 0, level: 19, respawn: 0 });
      M.spawn('bramble', 49, 22, { count: 1, radius: 0, level: 19, respawn: 0 });
      M.exit(89, 48, 1, 6, 'peaks', 'west');
      M.point('east', 86, 51);
    },
  });

  // ---------------------------------------------------------------- Starfall Rift
  add('rift', {
    name: 'Starfall Rift', subtitle: 'Level 25-30', w: 72, h: 72, level: 27, music: 'rift', dark: 0.45, ambient: '#0a0418', playerLight: 120, dustColor: '#3a2a52',
    weather: 'stars',
    build(M) {
      M.fill('starvoid');
      const island = (cx, cy, r) => { M.circle(cx, cy, r, 'voidrock', 2); M.circle(cx, cy, r - 2.5, 'voidfloor', 1); };
      const bridge = (a, b) => M.path([a, b], 'stonebridge', 3);
      bridge([36, 62], [14, 50]); bridge([36, 62], [36, 36]); bridge([14, 50], [12, 24]); bridge([36, 36], [58, 46]);
      bridge([12, 24], [36, 10]); bridge([58, 46], [60, 18]); bridge([60, 18], [36, 10]); bridge([12, 24], [36, 36]);
      island(36, 62, 7); island(14, 50, 6); island(58, 46, 7); island(36, 36, 9); island(12, 24, 6); island(60, 18, 6); island(36, 10, 9);
      M.rect(33, 66, 7, 5, 'voidrock');
      // central tor: a raised plateau of dark crystal
      M.plateau(32, 30, 9, 6, 'voidfloor', 'void');
      M.stairs(35, 36, 3, 2, 'void');
      M.chest('rift_tor', 36, 31, { loot: ['potion_mythic', 'void_crystal', 'star_fragment'], gold: 700, tier: 'gold' });
      M.prop('riftportal', 36, 69);
      M.exit(34, 67, 5, 2, 'citadel', 'rift', { label: 'Return to the Obsidian Citadel', prompt: true, color: '#c060ff' });
      M.waypoint('rift', 40, 60, 'Rift Landing');
      M.point('entrance', 36, 64);
      // seer's camp
      M.prop('campfire', 14, 51); M.prop('bedroll', 11, 52); M.prop('voidcrystal', 18, 47); M.prop('starpillar', 9, 47);
      M.npc('ilyra', 13, 48); M.npc('vessel', 17, 53);
      // boss island
      for (let i = 0; i < 6; i++) { const a = i / 6 * U.TAU; M.prop('starpillar', 36 + Math.cos(a) * 6, 10 + Math.sin(a) * 5, i % 2); }
      M.boss('watcher', 36, 9);
      M.chest('rift_star', 41, 5, { loot: ['potion_mythic', 'star_fragment', 'star_fragment'], gold: 2000, tier: 'gold', requires: () => flag('boss:watcher') });
      M.chest('rift_east', 62, 16, { loot: ['ether_mythic', 'void_crystal'], gold: 500, tier: 'iron' });
      M.chest('rift_west', 10, 22, { loot: ['potion_mythic', 'star_fragment'], gold: 500, tier: 'iron' });
      K2.keepTiles(M, ['stonebridge', 'stairs_void']);
      M.reserve(8, 45, 12, 10); M.reserve(30, 58, 12, 12);
      M.scatter('floatrock', 26, { on: ['starvoid'], minDist: 5 });
      M.scatter('voidcrystal', 16, { on: ['voidrock', 'voidfloor'], minDist: 4 });
      M.scatter('starpillar', 8, { on: ['voidfloor'], minDist: 6 });
      M.spawn('voidling', 58, 46, { count: 4, radius: 4, level: 26 });
      M.spawn('void_hound', 36, 44, { count: 3, radius: 3, level: 26 });
      M.spawn('rift_golem', 40, 42, { count: 1, radius: 2, level: 28, elite: 0.25 });
      M.spawn('star_wraith', 12, 24, { count: 3, radius: 3, level: 27 });
      M.spawn('void_knight', 60, 18, { count: 3, radius: 3, level: 28, elite: 0.2 });
      M.spawn('voidling', 24, 30, { count: 3, radius: 3, level: 27 });
      M.spawn('void_hound', 48, 14, { count: 3, radius: 3, level: 28 });
    },
  });

  // Music for the older zones gets a little more variety
  const mus = { desert: 'desert', tomb: 'caves', peaks: 'snow', ice_cavern: 'caves', marsh: 'marsh', crypt: 'caves', citadel: 'citadel', volcano: 'volcano', oasis: 'desert' };
  for (const [id, m] of Object.entries(mus)) if (R.Maps[id]) R.Maps[id].music = m;

  // ================================================================== quests
  const Q = R.addQuest;
  const side = (q) => Q(Object.assign({ type: 'side' }, q));
  // ---- Havenbrook
  side({ id: 'side_bess', name: 'A Letter for Saffar', giver: 'bess', turnIn: 'hassan', level: 9, minLevel: 8, region: 'Havenbrook',
    desc: 'Bess the baker has written a letter to her sweetheart Hassan, a merchant at the Oasis of Saffar.',
    objectives: [{ type: 'talk', npc: 'hassan', text: 'Deliver the letter to Hassan at the Oasis', lines: ['A letter? From Bess?! *He reads it three times and turns bright red.*', 'Tell her... tell her I am coming home for the harvest festival.'] }],
    rewards: { xp: 600, gold: 150, items: ['crab_cake', 'crab_cake'] },
    onStart() { R.World.player.addItem('bess_letter'); },
    onComplete() { R.World.player.removeItem('bess_letter', 9); },
    dialog: { offer: ['Could you take this letter to Hassan in the Oasis of Saffar? The roads are too dangerous for a baker.', 'It smells of cinnamon. That\'s on purpose.'], accept: 'Oh, thank you! Don\'t read it!', progress: ['Has Hassan read it yet?'], complete: ['He\'s coming home! Here — take some crab cakes for the road. Bess made them. I mean, SHE made them. For you.'] } });
  // Bounty board: repeatable bounties that unlock with your level
  const bounty = (id, name, lv, target, count, text, xp, gold) => Q({ id, name: 'Bounty: ' + name, type: 'side', repeatable: true, cooldown: 240, giver: 'board', level: lv, minLevel: lv, region: 'Bounty Board',
    desc: `BOUNTY: ${text} Paid by the Captain of the Watch. (Repeatable.)`,
    objectives: [{ type: 'kill', target, count, text: 'Defeat ' + name }], rewards: { xp, gold },
    dialog: { offer: ['BOUNTY: ' + text + ' Reward: ' + gold + ' gold.'], accept: '(You tear off a notice.)', progress: ['(The notice flutters in the wind.)'], complete: ['(A pouch of ' + gold + ' gold has been pinned to the board with your name on it.)'] } });
  bounty('bounty_slimes', 'Slimes', 1, 'slime', 10, 'Slimes are fouling the meadow again.', 60, 35);
  bounty('bounty_wolves', 'Grey Wolves', 3, 'wolf', 8, 'Wolves are harrying the forest road.', 140, 70);
  bounty('bounty_spiders', 'Mire Spiders', 6, ['spider', 'venom_spider'], 8, 'Spiders are spilling out of the Mirefen.', 320, 140);
  bounty('bounty_pirates', 'Pirates', 7, ['pirate', 'pirate_gunner'], 8, 'Pirates are raiding Saltmere\'s nets.', 380, 170);
  bounty('bounty_bandits', 'Desert Bandits', 10, ['desert_bandit', 'bandit_archer'], 8, 'Bandits are robbing the Saffar caravans.', 700, 260);
  bounty('bounty_myconids', 'Myconids', 12, ['myconid', 'spore_shaman'], 8, 'Mushroom-folk are climbing out of the Glimmercap sinkhole.', 950, 320);
  bounty('bounty_yetis', 'Yetis', 14, 'yeti', 3, 'Yetis are blocking the Frostfang pass.', 1300, 420);
  bounty('bounty_treants', 'Treants', 17, 'treant', 4, 'Blighted treants are spreading from the Thornveil.', 1900, 600);
  bounty('bounty_imps', 'Fire Imps', 18, 'fire_imp', 10, 'Imps are setting fires at the Caldera\'s edge.', 2100, 650);
  bounty('bounty_void', 'Voidlings', 25, ['voidling', 'void_hound'], 10, 'Things from beyond the stars are leaking through the Rift.', 4200, 1200);

  // ---- Gullwind Coast
  side({ id: 'coast_1', name: 'Pirates of Gullwind', giver: 'bree', level: 6, minLevel: 5, region: 'Gullwind Coast',
    desc: 'Pirates have made camp on the beach south of Saltmere. Harbormaster Bree wants them gone.',
    objectives: [{ type: 'kill', target: ['pirate', 'pirate_gunner'], count: 6, text: 'Drive off the pirates' }, { type: 'collect', item: 'pirate_doubloon', count: 3, text: 'Recover stolen doubloons' }],
    rewards: { xp: 420, gold: 160, gear: { rarity: 'uncommon', level: 7 } },
    dialog: { offer: ['Pirates. On MY beach. Stealing MY town\'s fish and MY town\'s coin.', 'Clear out their camp and bring back what they stole. Three doubloons at least.'], accept: 'The camp is south along the beach. Mind the gunners — they don\'t miss often.', progress: ['I can still see their campfire from here.'], complete: ['Ha! That\'ll teach them. Here\'s your cut.'] } });
  side({ id: 'coast_2', name: 'The Dark Lighthouse', giver: 'cora', level: 7, minLevel: 5, region: 'Gullwind Coast',
    desc: 'The Gull Lighthouse is running out of oil, and drowned sailors have been crawling out of the old shipwreck.',
    objectives: [{ type: 'kill', target: 'drowned', count: 5 }, { type: 'collect', item: 'lamp_oil', count: 1, text: 'Salvage lamp oil from the shipwreck' }],
    rewards: { xp: 480, gold: 180, items: ['ether', 'crab_cake'] },
    dialog: { offer: ['The lamp is almost dry. There\'s a barrel of whale oil in the wreck on the south beach...', '...but the drowned crew won\'t let anyone near it. Will you help?'], accept: 'The wreck is in the shallows south-east of the pirate camp.', progress: ['The light flickers lower every night.'], complete: ['*Cora pours the oil. The great lamp roars back to life.*', 'Ships can find their way home again. Thank you.'] },
    onComplete() { R.World.flags.lighthouse_lit = 1; } });
  side({ id: 'coast_3', name: 'Tyrant of the Tides', giver: 'bree', level: 10, minLevel: 8, requires: ['coast_1'], region: 'Gullwind Coast',
    desc: 'Something enormous in the Smuggler\'s Grotto is dragging fishing boats under. Find it and kill it.',
    objectives: [{ type: 'reach', map: 'sea_cave', text: "Enter the Smuggler's Grotto" }, { type: 'boss', target: 'crab_king' }],
    rewards: { xp: 1600, gold: 600, gear: { rarity: 'epic', level: 11 } },
    dialog: { offer: ['Three boats lost this month. Survivors say a claw the size of a door came out of the water.', 'The sea cave under the southern bluff — that\'s where it lives. End it.'], accept: 'The cave is at the foot of the southern cliffs, west of the pirate camp.', progress: ['Still hearing clacking under the docks at night.'], complete: ['Clackjaw?! THE Clackjaw? My grandfather told stories... You\'re a legend, you know that?'] } });
  side({ id: 'coast_crabs', name: 'Crab Cakes', giver: 'jonas', level: 6, region: 'Gullwind Coast', desc: 'Old Salt Jonas makes the best crab cakes on the coast. He just needs crabs.',
    objectives: [{ type: 'collect', item: 'crab_meat', count: 6 }], rewards: { xp: 300, gold: 90, items: ['crab_cake', 'crab_cake', 'crab_cake'] },
    dialog: { offer: ['Six crab claws\' worth of meat, and I\'ll cook you something that\'ll put hair on your chest.'], accept: 'Shore crabs are all along the eastern beach.', progress: ['Crabs, friend. Six.'], complete: ['Here — still hot. Don\'t tell Bree I gave you the good ones.'] } });
  side({ id: 'coast_sirens', name: 'Siren Song', giver: 'jonas', level: 8, requires: ['coast_crabs'], region: 'Gullwind Coast', desc: 'Sirens on the sea stacks are luring fishermen onto the rocks.',
    objectives: [{ type: 'kill', target: 'siren', count: 4 }], rewards: { xp: 520, gold: 200, gear: { rarity: 'rare', level: 8 } },
    dialog: { offer: ['Hear that singing? Pretty, eh? That\'s how they get you.', 'Four sirens nest by the eastern rocks. Plug your ears and deal with them.'], accept: 'Mind the slowing bubbles.', progress: ['Still singing...'], complete: ['Quiet at last. Well, as quiet as the sea gets.'] } });
  side({ id: 'coast_bottle', name: 'Message in a Bottle', giver: 'pim_sea', level: 9, minLevel: 7, region: 'Gullwind Coast', desc: 'Pim believes his father\'s ship is still out there somewhere. The smugglers found a bottle washed into their grotto.',
    objectives: [{ type: 'collect', item: 'sea_bottle', count: 1, text: "Find the bottle in the Smuggler's Grotto" }], rewards: { xp: 700, gold: 150, gear: { rarity: 'rare', level: 9 } },
    dialog: { offer: ['The smugglers said they found a bottle with a note in the grotto. They laughed at me.', 'What if it\'s from Dad? Please — will you look?'], accept: 'It\'s probably up on some ledge. Smugglers hide everything up high.', progress: ['Did you find it? Did you?'], complete: ['*Pim reads the note. Then reads it again. Then bursts into tears.*', 'He\'s ALIVE! I KNEW it! Thank you, thank you, thank you!'] } });

  // ---- Glimmercap Hollows
  side({ id: 'glim_1', name: 'Lights Below', giver: 'nessa', turnIn: 'myra', level: 11, minLevel: 10, region: 'Glimmercap Hollows',
    desc: 'A sinkhole has opened in the south-west of the Mirefen. Green light pours out of it at night. Nessa wants to know why.',
    objectives: [{ type: 'reach', map: 'glimmer', text: 'Descend into the Glimmercap Hollows' }, { type: 'talk', npc: 'myra', lines: ['Oh! A person! A real, non-mushroom person!', 'I\'m Myra. I came down to study the spores and, well, the spores started studying ME.'] }],
    rewards: { xp: 900, gold: 220, gear: { rarity: 'uncommon', level: 12 } },
    dialog: { offer: ['That sinkhole in the south-west glows at night, dearie. Glows GREEN.', 'Nothing good glows green. Go and see what\'s down there.'], accept: 'Follow the mud trail south-west from Mirewatch.', progress: ['Still glowing, dearie.'], complete: ['Welcome to the Hollows! Mind your step. And your lungs.'] } });
  side({ id: 'glim_2', name: 'Spore Samples', giver: 'myra', level: 12, requires: ['glim_1'], region: 'Glimmercap Hollows',
    desc: 'Myra believes the spore shamans are spreading a rot through the Hollows. She needs samples, and the shamans stopped.',
    objectives: [{ type: 'collect', item: 'glow_spore', count: 6 }, { type: 'kill', target: 'spore_shaman', count: 3 }],
    rewards: { xp: 1200, gold: 300, gear: { rarity: 'rare', level: 13 } },
    dialog: { offer: ['The glow is spreading — and it\'s the WRONG glow. Rot-glow.', 'Bring me six glowspores for study, and stop the shamans who are spreading it.'], accept: 'Shamans heal each other, so hit them fast!', progress: ['Samples, samples, samples!'], complete: ['These spores are... crowned. There is something at the root of all this. Elder Morel will know.'] } });
  side({ id: 'glim_3', name: 'The Rot Crown', giver: 'morel', level: 15, requires: ['glim_2'], region: 'Glimmercap Hollows',
    desc: 'The Myconid Elder says a single ancient mushroom, Mycelos, has taken a crown of rot and is poisoning the entire colony.',
    objectives: [{ type: 'boss', target: 'mycelord' }],
    rewards: { xp: 3000, gold: 800, gear: { rarity: 'epic', level: 15 } },
    dialog: { offer: ['*The elder releases a cloud of spores. Images bloom in your mind: a crown, a root, a chamber to the north.*', '*You understand: Mycelos must be pruned.*'], accept: '*Encouraging spores.*', progress: ['*Worried spores.*'], complete: ['*The elder releases the happiest spores you have ever smelled. The whole cavern glows a gentle blue.*'] } });
  side({ id: 'glim_pick', name: "Dunk's Pickaxe", giver: 'dunk', level: 12, region: 'Glimmercap Hollows', desc: 'Dunk dropped his lucky pickaxe while fleeing a mushroom. He thinks it ended up on the ledge above the lake.',
    objectives: [{ type: 'collect', item: 'lost_pickaxe', count: 1 }], rewards: { xp: 800, gold: 260, items: ['elixir_iron'] },
    dialog: { offer: ['My pickaxe! Forty years we\'ve been together. It\'s up on the waterfall ledge, east side. I\'m not going back up there.'], accept: 'Stairs are on the right of the falls.', progress: ['Found her yet?'], complete: ['There she is! Not a scratch. Here — drink this. Dwarven recipe. Don\'t ask what\'s in it.'] } });
  side({ id: 'glim_lurkers', name: 'Lurkers in the Dark', giver: 'dunk', level: 13, requires: ['glim_pick'], region: 'Glimmercap Hollows', desc: 'Deep lurkers keep ambushing Dunk near the lake.',
    objectives: [{ type: 'kill', target: 'cave_lurker', count: 6 }, { type: 'collect', item: 'lurker_eye', count: 2 }], rewards: { xp: 1100, gold: 300, gear: { rarity: 'rare', level: 14 } },
    dialog: { offer: ['Big spiders. Glowing eyes. They jump. I don\'t like things that jump.', 'Six of them, and bring me a couple of those eyes. I want to know what I\'m dealing with.'], accept: 'They leap — watch for the landing circle and move!', progress: ['Still jumpy down there.'], complete: ['Ugh. Look at that eye. It\'s still LOOKING at me.'] } });

  // ---- Thornveil Grove
  side({ id: 'thorn_1', name: 'The Withering', giver: 'yrsa', turnIn: 'sylvara', level: 16, minLevel: 15, region: 'Thornveil Grove',
    desc: 'The forest west of the Frostfang Peaks is dying from the inside out. Yrsa has heard of a warden there.',
    objectives: [{ type: 'reach', map: 'thornwood', text: 'Travel west from the peaks to the Thornveil Grove' }, { type: 'talk', npc: 'sylvara', lines: ['A shard-bearer. The trees whispered you might come.', 'The Thornveil is sick. Its heart has turned against it.'] }],
    rewards: { xp: 1500, gold: 360, gear: { rarity: 'rare', level: 16 } },
    dialog: { offer: ['West of the peaks there is a forest that doesn\'t freeze, even in deep winter.', 'Lately the wind from there smells of rot. Find the warden, Sylvara.'], accept: 'The west trail from the peaks runs straight into it.', progress: ['Go west.'], complete: ['Thank the trees you are here.'] } });
  side({ id: 'thorn_2', name: 'Roots of Rot', giver: 'sylvara', level: 17, requires: ['thorn_1'], region: 'Thornveil Grove',
    desc: 'The blight has turned the grove\'s treants against it. Put them to rest and bring Sylvara their rotten hearts.',
    objectives: [{ type: 'kill', target: 'treant', count: 4 }, { type: 'collect', item: 'heartwood', count: 4, text: 'Collect blighted heartwood' }],
    rewards: { xp: 2200, gold: 500, gear: { rarity: 'rare', level: 18 } },
    dialog: { offer: ['The treants were my friends. Now they are hollow things full of rot.', 'Free them. Bring me their heartwood so I can learn where the rot began.'], accept: 'They are slow, but their blows can crush stone.', progress: ['The rot spreads...'], complete: ['This rot... it comes from the Heart Grove. From the Queen herself.'] } });
  side({ id: 'thorn_3', name: 'Queen of Thorns', giver: 'sylvara', level: 20, requires: ['thorn_2'], region: 'Thornveil Grove',
    desc: 'Queen Briarthorn, the ancient heart-tree of the grove, has been corrupted. She must be cut down before the whole Thornveil dies.',
    objectives: [{ type: 'boss', target: 'briar_queen' }],
    rewards: { xp: 5000, gold: 1200, gear: { rarity: 'epic', level: 20 } },
    dialog: { offer: ['The Queen was the first tree. Every root in this forest is hers.', 'I cannot raise a hand against her. You must. North, beyond the thorns.'], accept: 'Burn the brambles at the gate — they bite.', progress: ['I can feel her anger through the roots.'], complete: ['*The whole grove sighs. Petals fall like snow.*', 'She is at peace. A seedling will grow where she fell. You have saved us all.'] } });
  side({ id: 'thorn_rings', name: 'Fairy Rings', giver: 'thistle', level: 17, region: 'Thornveil Grove', desc: 'Thistle wants you to dance in all three fairy rings of the grove. For reasons.',
    objectives: [{ type: 'reach', zone: 'Ring of Dawn', text: 'Visit the Ring of Dawn (north-east)' }, { type: 'reach', zone: 'Ring of Dusk', text: 'Visit the Ring of Dusk (south-west)' }, { type: 'reach', zone: 'Ring of Stars', text: 'Visit the Ring of Stars (Moonlit Terrace)' }],
    rewards: { xp: 1800, gold: 400, items: ['elixir_speed', 'fey_dust'] },
    dialog: { offer: ['Hee! Dance in all three rings — Dawn, Dusk and Stars — and something WONDERFUL will happen!', '...Probably wonderful.'], accept: 'Go go go!', progress: ['Dance! Dance!'], complete: ['You did it! Now you\'re a little bit fey. Just a smidge. You\'ll barely notice. Here, have some glitter!'] } });
  side({ id: 'thorn_wolves', name: 'Moonfang Hunt', giver: 'sylvara', level: 18, requires: ['thorn_1'], region: 'Thornveil Grove', desc: 'Moonfang wolves, maddened by the blight, are hunting everything that moves.',
    objectives: [{ type: 'kill', target: 'fey_wolf', count: 6 }], rewards: { xp: 1700, gold: 420, gear: { rarity: 'rare', slot: 'cape', level: 18 } },
    dialog: { offer: ['The Moonfangs have gone mad. Six of them hunt near the camp. Put them down, gently if you can.'], accept: 'They are fast. Roll through their lunges.', progress: ['I still hear them howling.'], complete: ['Rest now, little moons. ...Thank you.'] } });

  // ---- Starfall Rift (post-game)
  side({ id: 'rift_1', name: 'Beyond the Veil', giver: 'elder', turnIn: 'ilyra', level: 25, requires: ['main_10'], region: 'Starfall Rift',
    desc: 'With Malgrath gone, a tear has opened behind his throne. Something is watching through it.',
    objectives: [{ type: 'reach', map: 'rift', text: 'Step through the Rift behind the Hollow King\'s throne' }, { type: 'talk', npc: 'ilyra', lines: ['You came through the Rift. Brave, or foolish. Usually both.', 'I am Ilyra. I have watched this place for a hundred years. Malgrath was never the true enemy. He was a door.'] }],
    rewards: { xp: 6000, gold: 1500, gear: { rarity: 'epic', level: 25 } },
    dialog: { offer: ['Hero... the stars above the Citadel are wrong. There is a tear behind Malgrath\'s throne.', 'Whatever made the Hollow King hollow is still out there. Will you look?'], accept: 'Be careful. Come home.', progress: ['The Rift is in the Citadel\'s throne room.'], complete: ['Welcome to the edge of everything.'] } });
  side({ id: 'rift_2', name: 'Shards of Night', giver: 'ilyra', level: 26, requires: ['rift_1'], region: 'Starfall Rift',
    desc: 'The voidlings are the Watcher\'s eyes. Blind them, and bring Ilyra the crystals they are made of.',
    objectives: [{ type: 'kill', target: 'voidling', count: 8 }, { type: 'collect', item: 'void_crystal', count: 5 }],
    rewards: { xp: 8000, gold: 2000, gear: { rarity: 'legendary', level: 27 } },
    dialog: { offer: ['Every voidling is an eye of the Watcher. Blind it, and it cannot see you coming.', 'Bring me five void crystals. I will weave a ward from them.'], accept: 'They float over the void. Your arrows and spells will reach them — your boots will not.', progress: ['More crystals.'], complete: ['The ward is ready. Now the Watcher cannot see you until you are at its door.'] } });
  side({ id: 'rift_3', name: 'The Watcher Beyond', giver: 'ilyra', level: 30, requires: ['rift_2'], region: 'Starfall Rift',
    desc: 'Ulthuun, the Watcher Beyond, waits on the northernmost island of the Rift. End it, and close the door forever.',
    objectives: [{ type: 'boss', target: 'watcher' }],
    rewards: { xp: 20000, gold: 6000, gear: { rarity: 'mythic', level: 30 } },
    dialog: { offer: ['Ulthuun waits at the northern edge. It is older than the stars you were born under.', 'If it walks into our world, nothing will be left. Go, and do not look into its eye for long.'], accept: 'May the Ember Crown burn bright for you.', progress: ['It is waiting. It is always waiting.'], complete: ['*The Rift trembles and the stars slowly return to their places.*', 'It is over. Truly over. Go home, hero. You have earned the longest rest in history.'] },
    onComplete() { R.World.later(1.5, () => R.Story.epilogue()); } });
  side({ id: 'rift_wraiths', name: 'Echoes of the Fallen', giver: 'ilyra', level: 27, requires: ['rift_1'], region: 'Starfall Rift', desc: 'Star wraiths are the ghosts of heroes who tried to close the Rift before you.',
    objectives: [{ type: 'kill', target: 'star_wraith', count: 6 }, { type: 'collect', item: 'star_fragment', count: 2 }], rewards: { xp: 7000, gold: 1800, items: ['potion_mythic', 'potion_mythic'] },
    dialog: { offer: ['The wraiths were heroes once. The void hollowed them. Set them free.'], accept: 'Their bolts cut deep. Keep moving.', progress: ['I can still hear them.'], complete: ['Their names are written in the stars again. Thank you.'] } });

  R.Story.epilogue = function () {
    R.UI.dialog([
      { speaker: 'Narrator', text: 'The Watcher Beyond closes its great eye, and the Rift folds shut like a closing book.' },
      { speaker: 'Narrator', text: 'Somewhere in Havenbrook, Fennick finally finds a word that rhymes with "Ulthuun". It is not a good word.' },
      { speaker: 'Narrator', text: 'Thank you for playing every last corner of the realm! The bounty board always has more work for a legend.' },
    ], () => R.UI.banner('TRUE ENDING', 'The Watcher Beyond is defeated'));
  };
})(window.RPG);
