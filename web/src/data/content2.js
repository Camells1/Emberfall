'use strict';
// Chapter Two: the Oasis, Sunscorch Dunes and Tomb, Frostfang Peaks, Emberdeep Caldera and the
// Obsidian Citadel. Villagers, four bosses and the rest of the main story.
(function (R) {
  const U = R.U, FX = R.FX, C = R.Character, K = R.BossKit;

  // ---------------------------------------------------------------- NPCs
  function npc(id, name, o) {
    const a = Object.assign(C.randomAppearance(U.rng('npc:' + id)), o.a || {});
    R.addNPC(Object.assign({ id, name, appearance: a, gear: o.gear || {}, wander: o.wander == null ? 20 : o.wander }, o));
  }
  const robe = (c, t) => ({ chest: { style: 'robe', color: c, trim: t || '#d8c060' } });
  const warm = (c) => ({ chest: { style: 'leather', color: c, trim: '#e0e0e0' }, head: { style: 'hood', color: '#e8e8f0', trim: '#a0a0b0' }, cape: { style: 'cape', color: '#8a8a9a' } });
  const sand = (c) => ({ head: { style: 'bandana', color: c }, chest: { style: 'robe', color: '#e0d0a8', trim: c } });

  npc('amira', 'Amira', { title: 'Keeper of the Oasis', wander: 0, a: { body: 'b', skin: '#a36a44', hair: 'long', hairColor: '#1b1b2e' }, gear: Object.assign(robe('#c08030', '#ffd040'), { head: { style: 'circlet', color: '#ffd040', accent: '#40c0ff' } }), lines: ['Water is life. The Oasis welcomes all who respect it.'] });
  npc('hassan', 'Hassan', { title: 'Merchant', wander: 0, a: { skin: '#7a4a2e', hair: 'bald', beard: 'full', beardColor: '#2a1d18' }, gear: sand('#8a2a6a'),
    shop: { title: "Hassan's Bazaar", greeting: 'Silks, steel and sweet water! Everything a traveler needs.', items: R.shopStock({ slots: ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'cape', 'consumable'], minLevel: 6, maxLevel: (p) => p.level + 3, rarities: ['common', 'uncommon', 'rare'], filter: (it) => it.slot !== 'consumable' || it.use.heal || it.use.mana }) },
    lines: ['Best prices in the desert! ...The only prices in the desert.'] });
  npc('zafir', 'Zafir', { title: 'Caravan Master', a: { skin: '#a36a44', hair: 'short', beard: 'goatee' }, gear: sand('#2a6a8a'), lines: ['Sandworms took two wagons last week. Two!'] });
  npc('rashid', 'Rashid', { title: 'Oasis Guard', wander: 10, a: { skin: '#7a4a2e' }, gear: Object.assign(sand('#8a2a2a'), { chest: { style: 'chain', color: '#a09070' } }), weapon: { type: 'spear', blade: '#d8c8a0' }, lines: ['Stay near the water after dark.'] });
  npc('layla', 'Layla', { title: 'Water Carrier', a: { body: 'b', skin: '#a36a44', hair: 'braids', hairColor: '#2a1d18' }, gear: sand('#2a8a6a'), lines: ['The well never runs dry. The Keeper says it is blessed.'] });
  npc('pell', 'Pell', { title: 'Treasure Hunter', a: { hair: 'wild', hairColor: '#e0b55f' }, gear: { head: { style: 'cap', color: '#8a6a3a', accent: '#e04030' }, chest: { style: 'leather', color: '#7a5230' } }, lines: ['Somewhere out here is a golden key. And I WILL find it. Eventually.'] });
  npc('yrsa', 'Yrsa', { title: 'Mountain Warden', wander: 0, a: { body: 'b', hair: 'braids', hairColor: '#f2e2a6', skin: '#fde0c5' }, gear: Object.assign(warm('#5a6a8a'), { head: { style: 'horned', color: '#8a929a', accent: '#e8e0c8' } }), weapon: { type: 'axe', blade: '#c8d8e8', style: 'double' }, lines: ['The cold kills more travelers than the wolves. Wrap up.'] });
  npc('bjorn', 'Bjorn', { title: 'Trapper', a: { hair: 'wild', hairColor: '#b5773c', beard: 'long', beardColor: '#b5773c' }, gear: warm('#6a4a2a'), lines: ['Yeti fur makes the warmest cloaks. Yetis disagree.'] });
  npc('durgan', 'Durgan', { title: 'Master Smith', wander: 0, a: { skin: '#c98e62', hair: 'mohawk', hairColor: '#e05a2a', beard: 'full', beardColor: '#e05a2a' }, gear: { chest: { style: 'leather', color: '#3a2a20' }, hands: { style: 'gloves', color: '#2a1a14' } }, weapon: { type: 'hammer', blade: '#707880', glow: '#ff8030' },
    shop: { title: "Durgan's Volcano Forge", greeting: 'Steel forged in dragonfire. Well, volcano fire. Close enough.', items: R.shopStock({ slots: ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands'], minLevel: 14, maxLevel: (p) => p.level + 4, rarities: ['common', 'uncommon', 'rare', 'epic'] }) },
    lines: ['Only fire hot enough to forge the Crown burns here.'] });

  // ---------------------------------------------------------------- bosses
  const boss = (d) => R.addEnemy(Object.assign({ boss: true, knockResist: 1, music: 'boss', immune: ['stun', 'freeze'], drops: [{ item: 'potion_large', chance: 1, qty: [2, 3] }] }, d));
  boss({
    id: 'pharaoh', name: 'Anhotep', title: 'The Sand King', level: 13, hp: 4400, atk: 58, def: 14, spd: 42, xp: 2600, gold: [300, 450], r: 14, height: 48, scale: 2.2,
    sprite: 'anubis', pal: { main: '#2a2a38', gold: '#ffd040', cloth: '#e0d0a0' }, light: { r: 70, color: '#ffd040' }, tags: ['undead', 'boss'], immune: ['stun', 'freeze', 'poison', 'bleed'],
    intro: ['WHO DISTURBS THE ETERNAL SLEEP OF ANHOTEP?', 'The shard is MINE. As is your soul.'],
    update: K.bossBrain({ color: '#ffd040', keep: 80, moves: [K.fan('#ffd040', 5, { burn: { dps: 20, dur: 3 } }), K.spiral('#e0c060'), K.blast('#ffb030', { burn: { dps: 24, dur: 3 } }), K.summon('scarab', 3), K.charge('#ffd040')] }),
  });
  boss({
    id: 'frost_wyrm', name: 'Skaldr', title: 'The Frost Wyrm', level: 17, hp: 5800, atk: 72, def: 18, spd: 46, xp: 4000, gold: [450, 650], r: 16, height: 52, scale: 2.6,
    sprite: 'worm', pal: { main: '#a0d8f0', gum: '#3a5a8a', sand: '#e8f8ff' }, light: { r: 80, color: '#a0e8ff' }, tags: ['beast', 'boss'], drops: [{ item: 'potion_large', chance: 1, qty: [3, 4] }],
    intro: ['*The ice beneath you groans. Something vast uncoils in the dark.*', 'Warm blood... how rare. How delicious.'],
    update: K.bossBrain({ color: '#a0e8ff', keep: 90, moves: [K.fan('#c0f0ff', 6, { slow: { amt: 0.45, dur: 2.5 } }), K.ring('#a0e8ff', 14), K.blast('#80d0ff', { freeze: { dur: 1 } }), K.rain('#c0f0ff', { slow: { amt: 0.4, dur: 2 } }), K.summon('ice_bat', 3), K.charge('#a0e8ff')] }),
  });
  boss({
    id: 'infernal', name: 'Pyrrhus', title: 'The Molten Titan', level: 21, hp: 7600, atk: 88, def: 22, spd: 36, xp: 6000, gold: [650, 900], r: 18, height: 60, scale: 2.6,
    sprite: 'golem', pal: { main: '#3a2020', core: '#ffb030', crack: '#ff5020', lava: '#ff8030' }, light: { r: 110, color: '#ff8030' }, tags: ['elemental', 'boss'], immune: ['stun', 'freeze', 'burn'], drops: [{ item: 'potion_super', chance: 1, qty: [2, 3] }],
    intro: ['*The caldera shakes. Magma rises into the shape of a giant.*', 'I AM THE MOUNTAIN\'S HEART. I AM FIRE ETERNAL.'],
    update: K.bossBrain({ color: '#ff6020', keep: 70, moves: [K.rain('#ff6020', { burn: { dps: 30, dur: 3 } }), K.ring('#ff8030', 16), K.blast('#ff4010', { burn: { dps: 34, dur: 3 } }), K.charge('#ff6020'), K.summon('fire_imp', 3), K.spiral('#ffb040')] }),
  });
  boss({
    id: 'hollow_king', name: 'Malgrath', title: 'The Hollow King', level: 25, hp: 12000, atk: 100, def: 26, spd: 48, xp: 12000, gold: [1500, 2000], r: 14, height: 60, scale: 2.4,
    sprite: 'knight', pal: { main: '#1a1a24', trim: '#c040ff', cloth: '#401060', shield: '#101018', horns: '#8a8a9a', eye: '#ff40ff' }, light: { r: 90, color: '#c040ff' },
    tags: ['undead', 'boss'], immune: ['stun', 'freeze', 'poison', 'bleed', 'slow'], drops: [{ item: 'potion_super', chance: 1, qty: [3, 4] }, { item: 'tome_xp', chance: 1 }],
    intro: ['So. The little flame has come to my throne, carrying my crown.', 'I shattered it once. I will shatter YOU just the same.', 'Kneel before the Hollow King!'],
    update: K.bossBrain({
      color: '#c040ff', keep: 80,
      moves: [K.spiral('#c040ff'), K.fan('#ff40ff', 7, { slow: { amt: 0.35, dur: 2 } }), K.blast('#8020ff', null), K.rain('#c040ff', null), K.charge('#ff40ff'), K.summon('hollow_soldier', 2), K.ring('#8060ff', 18)],
      onPhase(e, ph) { if (ph === 3) R.UI.dialog([{ speaker: 'Malgrath', text: 'ENOUGH! Witness the true power of the Hollow Crown!' }]); },
    }),
  });

  // ---------------------------------------------------------------- main story, continued
  const Q = R.addQuest;
  // After the Broodmother the story continues south instead of ending.
  const m4 = R.Quests.main_4;
  m4.dialog.complete = ['You... actually did it. The swamp is quiet for the first time in years.', 'The road south to the Oasis of Saffar is open again. Word is, the desert holds another shard.'];
  m4.onComplete = null;
  Q({
    id: 'main_5', name: 'The Road South', type: 'main', giver: 'osric', level: 9, requires: ['main_4'],
    desc: 'Follow the south road out of the Mirefen to the Oasis of Saffar and find its Keeper, Amira.',
    objectives: [{ type: 'reach', map: 'oasis', text: 'Travel to the Oasis of Saffar' }, { type: 'talk', npc: 'amira', lines: ['A shard-bearer. I dreamed you would come.', 'The Sand King Anhotep has woken in his tomb. He wears the third shard in his crown.'] }],
    rewards: { xp: 900, gold: 250, gear: { rarity: 'rare', level: 10 } }, turnIn: 'amira',
    dialog: { offer: ['Two shards now. Maren\'s letters say there are five.', 'Go south to the Oasis. The Keeper there knows the desert\'s secrets.'], accept: 'The south road starts at the bottom of the swamp.', progress: ['The Oasis is due south.'], complete: ['Rest a while, shard-bearer. You will need your strength.'] },
  });
  Q({
    id: 'main_6', name: 'The Sand King', type: 'main', giver: 'amira', level: 12, requires: ['main_5'],
    desc: 'The Tomb of Anhotep is sealed with a sun-shaped lock. Find the Sun Key somewhere in the Sunscorch Dunes, then destroy the Sand King.',
    objectives: [{ type: 'collect', item: 'sun_key', count: 1, text: 'Find the Sun Key in the dunes' }, { type: 'boss', target: 'pharaoh' }],
    rewards: { xp: 2500, gold: 500, gear: { rarity: 'epic', level: 13 } },
    dialog: { offer: ['The tomb lies east, across the dunes. Its door opens only to the Sun Key.', 'A caravan carried the key years ago. The caravan never arrived.'], accept: 'Search the dunes. Beware the worms beneath the sand.', progress: ['The Sun Key... find the lost caravan.'], complete: ['Anhotep is dust once more! Three shards, shard-bearer.', 'Maren has sent word: the Frostfang pass north of Havenbrook is open to you now.'] },
  });
  Q({
    id: 'main_7', name: 'Frostfang', type: 'main', giver: 'elder', level: 15, requires: ['main_6'],
    desc: 'Climb the Frostfang Peaks through the north gate of Havenbrook. The Frost Wyrm Skaldr coils around the fourth shard.',
    objectives: [{ type: 'reach', map: 'peaks', text: 'Climb the Frostfang Peaks (Havenbrook north gate)' }, { type: 'talk', npc: 'yrsa', lines: ['Maren\'s shard-bearer! The wyrm has frozen half the mountain.', 'Its lair is the Frozen Hollow. Kill it, and the ice will break.'] }, { type: 'boss', target: 'frost_wyrm' }],
    rewards: { xp: 4000, gold: 800, gear: { rarity: 'epic', level: 17 } }, turnIn: 'yrsa',
    dialog: { offer: ['Three shards! I never believed I would live to see it.', 'The fourth lies in the Frostfang Peaks. I have opened the north gate for you.'], accept: 'Wrap up warm. Find Yrsa, the mountain warden.', progress: ['The north gate of Havenbrook leads to the peaks.'], complete: ['The ice is breaking! Listen — the mountain is singing.', 'East of here, the pass to the Emberdeep Caldera is clear at last.'] },
  });
  Q({
    id: 'main_8', name: 'Heart of the Mountain', type: 'main', giver: 'yrsa', level: 19, requires: ['main_7'],
    desc: 'Cross east into the Emberdeep Caldera. The Molten Titan Pyrrhus holds the last shard. The smith Durgan camps at the caldera\'s edge.',
    objectives: [{ type: 'talk', npc: 'durgan', lines: ['Hah! Another fool come to fight the Titan?', 'Good. Kill it and bring me the shard. Only this fire can reforge the Crown.'] }, { type: 'boss', target: 'infernal' }],
    rewards: { xp: 6000, gold: 1200, gear: { rarity: 'epic', level: 21 } }, turnIn: 'durgan',
    dialog: { offer: ['The last shard burns inside the Caldera, east of here.', 'Find Durgan the smith. He is mad, but he is the best there is.'], accept: 'Take the east pass. Mind the lava.', progress: ['The Caldera lies east.'], complete: ['FIVE SHARDS! Hah! Now we do some real smithing.', 'Take them to Maren. She knows the words to wake the Crown. I have done my part — the fire is in them now.'] },
  });
  Q({
    id: 'main_9', name: 'The Ember Crown', type: 'main', giver: 'durgan', level: 20, requires: ['main_8'], turnIn: 'elder',
    desc: 'Bring the five Ember Shards back to Elder Maren in Havenbrook so she can reforge the Ember Crown.',
    objectives: [{ type: 'reach', map: 'town', text: 'Return to Havenbrook' }],
    rewards: { xp: 3000, gold: 500, items: ['ember_crown'] },
    dialog: { offer: ['The shards are forge-warm. Now they need the old words.', 'Go home, shard-bearer. Maren is waiting.'], accept: 'Go! And don\'t drop them.', progress: ['Maren is in Havenbrook.'], complete: ['Five shards... after all these years.', '*Maren speaks words older than the village. The shards rise, glowing, and fuse into a blazing crown.*', 'The Ember Crown is whole. Its flame can part the black fire around the Obsidian Citadel.'] },
    onComplete() { const p = R.World.player; for (let i = 1; i <= 5; i++) p.removeItem('ember_shard_' + i, 9); FX.pillar(p.x, p.y, '#ff9020', 1.5, 26); FX.flash('#ffb040', 0.5); },
  });
  Q({
    id: 'main_10', name: 'The Hollow King', type: 'main', giver: 'elder', level: 24, requires: ['main_9'],
    desc: 'Carry the Ember Crown through the black flame beyond the Caldera\'s northern road and destroy Malgrath in the Obsidian Citadel.',
    objectives: [{ type: 'reach', map: 'citadel', text: 'Enter the Obsidian Citadel (north of the Caldera)' }, { type: 'boss', target: 'hollow_king' }],
    rewards: { xp: 10000, gold: 3000, gear: { rarity: 'legendary', level: 25 } },
    dialog: { offer: ['The Citadel lies north of the Caldera, walled in black flame. The Crown will part it.', 'End this, shard-bearer. For all of us.'], accept: 'Go with the Dawn.', progress: ['Malgrath waits in the Citadel.'], complete: ['You did it. You truly did it.', 'The Hollow King is gone, and the eternal flame burns again. Havenbrook — no, the whole realm — owes you everything.'] },
    onComplete() { R.World.later(1.5, () => R.Story.ending()); },
  });

  // ---------------------------------------------------------------- side quests
  const side = (q) => Q(Object.assign({ type: 'side' }, q));
  side({ id: 'side_caravan', name: 'The Lost Caravan', giver: 'zafir', level: 10, desc: 'Zafir wants the ledger from his lost caravan, somewhere in the dunes.',
    objectives: [{ type: 'collect', item: 'caravan_ledger', count: 1 }], rewards: { xp: 700, gold: 300, gear: { rarity: 'rare', level: 11 } },
    dialog: { offer: ['My caravan vanished in the dunes. The ledger inside proves who owes me money!', 'Find it and I will make it worth your while.'], accept: 'Look for broken wagons.', progress: ['Any sign of the ledger?'], complete: ['My ledger! Now to collect some debts...'] } });
  side({ id: 'side_stingers', name: 'Stinger Soup', giver: 'pell', level: 10, desc: 'Pell swears scorpion stingers are the secret to desert survival.',
    objectives: [{ type: 'collect', item: 'scorpion_stinger', count: 6 }], rewards: { xp: 650, gold: 220, items: ['elixir_might'] },
    dialog: { offer: ['Scorpion stingers! Six of them. Do not ask why.'], accept: 'Mind the tails.', progress: ['Six stingers, friend.'], complete: ['Perfect. Here, have an elixir. Unrelated to the stingers. Probably.'] } });
  side({ id: 'side_worms', name: 'Worm Trouble', giver: 'rashid', level: 11, desc: 'Sand worms keep ambushing travelers on the dune road.',
    objectives: [{ type: 'kill', target: 'sand_worm', count: 5 }], rewards: { xp: 800, gold: 300, gear: { rarity: 'rare', level: 12 } },
    dialog: { offer: ['The worms are getting bolder. Kill five, and the road will be safe for a while.'], accept: 'Watch for the sand bulging.', progress: ['The worms still hunt the road.'], complete: ['The caravans thank you.'] } });
  side({ id: 'side_yeti', name: 'Fur Trade', giver: 'bjorn', level: 14, desc: 'Bjorn needs yeti fur for winter cloaks.',
    objectives: [{ type: 'collect', item: 'yeti_fur', count: 5 }], rewards: { xp: 1200, gold: 400, gear: { rarity: 'rare', slot: 'cape', level: 15 } },
    dialog: { offer: ['Five yeti furs and I will make you the warmest cloak on the mountain.'], accept: 'Yetis hit hard. Keep moving.', progress: ['Five furs!'], complete: ['Now that is fur! Here — take this cloak.'] } });
  side({ id: 'side_golems', name: 'Cracked Stone', giver: 'yrsa', level: 16, desc: 'Ice golems block the high passes.',
    objectives: [{ type: 'kill', target: 'ice_golem', count: 4 }], rewards: { xp: 1600, gold: 500, items: ['potion_large', 'potion_large'] },
    dialog: { offer: ['Ice golems have taken the high passes. Break four of them.'], accept: 'Hit hard and roll away.', progress: ['The passes are still blocked.'], complete: ['The passes are clear. Well fought.'] } });
  side({ id: 'side_imps', name: 'Imp Infestation', giver: 'durgan', level: 19, desc: 'Fire imps keep stealing Durgan\'s tools.',
    objectives: [{ type: 'kill', target: 'fire_imp', count: 8 }], rewards: { xp: 2200, gold: 700, gear: { rarity: 'epic', level: 20 } },
    dialog: { offer: ['Imps! They took my second-best hammer! Kill eight of the little thieves.'], accept: 'They explode. Just so you know.', progress: ['Still missing my hammer.'], complete: ['Found my hammer in one of them. Don\'t ask. Here — take this.'] } });

  // ---------------------------------------------------------------- story
  R.Story.ending = function () {
    R.UI.dialog([
      { speaker: 'Narrator', text: 'Malgrath the Hollow King crumbles to ash, and the black flames around the Citadel gutter out.' },
      { speaker: 'Narrator', text: 'Far away, in Havenbrook, the Ember Crown blazes — and every hearth in the realm flares warm again.' },
      { speaker: 'Narrator', text: 'Songs will be sung of you for a hundred years. Fennick is already working on a few. They rhyme badly.' },
      { speaker: 'Narrator', text: 'Thank you for playing Emberfall! Keep exploring, finish every side quest and hunt for mythic loot.' },
    ], () => R.UI.banner('THE END', 'Emberfall: Legends of the Shattered Crown'));
  };
  R.events.on('boss:defeat', (ev) => {
    const shard = { pharaoh: 'ember_shard_3', frost_wyrm: 'ember_shard_4', infernal: 'ember_shard_5' }[ev.id];
    const p = R.World.player;
    if (shard && p && !p.count(shard)) { p.addItem(shard); R.UI.lootToast(R.Items[shard], 1); }
  });
})(window.RPG);
