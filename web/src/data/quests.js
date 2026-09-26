'use strict';
// Quest definitions (see game/questlog.js for the full schema).
(function (R) {
  const Q = R.Quests = R.Quests || {};
  R.addQuest = function (q) { Q[q.id] = q; return q; };
  const add = R.addQuest;

  add({
    id: 'main_1', name: 'Trouble in the Meadow', type: 'main', giver: 'elder', level: 1,
    desc: 'Slimes have been swarming the fields east of Havenbrook. Thin their numbers.',
    objectives: [{ type: 'kill', target: 'slime', count: 6 }],
    rewards: { xp: 60, gold: 30, items: ['potion_small', 'potion_small'] },
    dialog: {
      offer: ['Ah, a new face. Havenbrook could use one.', 'Slimes have been pouring out of the Whisperwood and fouling our fields. Would you clear some of them out?'],
      accept: 'Bless you. The meadow is just east of the village gate.',
      progress: ['The slimes still crowd the meadow. Be careful out there.'],
      complete: ['You have a real knack for this. Here — take these for your trouble.'],
    },
  });
  add({
    id: 'main_2', name: 'The Slime King', type: 'main', giver: 'elder', level: 3, requires: ['main_1'],
    desc: 'Something in the Slime Grotto is driving the slimes out. Find it and destroy it.',
    objectives: [{ type: 'reach', map: 'grotto', text: 'Find the Slime Grotto in the Whisperwood' }, { type: 'boss', target: 'slime_king' }],
    rewards: { xp: 200, gold: 100, items: ['iron_sword'] },
    dialog: {
      offer: ['The slimes come from a grotto deep in the Whisperwood.', 'Scouts speak of a monstrous slime wearing a crown. Will you face it?'],
      accept: 'Follow the forest path north. May the Dawn light your way.',
      progress: ['The grotto lies in the northern Whisperwood.'],
      complete: ['A slime... with a crown? Stranger things are stirring than I feared.', 'Take this blade. You will need it for what comes next.'],
    },
  });
  add({
    id: 'side_pelts', name: 'Warm Winter', type: 'side', giver: 'smith', level: 2,
    desc: 'Brom needs wolf pelts to line gloves for the coming winter.',
    objectives: [{ type: 'collect', item: 'wolf_pelt', count: 4 }],
    rewards: { xp: 80, gold: 60, items: ['leather_boots'] },
    dialog: {
      offer: ['Winter is coming early this year, mark my words.', 'Bring me four wolf pelts from the Whisperwood and I will make it worth your while.'],
      accept: 'Wolves prowl the forest paths. Mind their teeth.',
      progress: ['Four pelts. Wolves. Forest. You can do it.'],
      complete: ['Fine pelts! Here, take these boots — broken in by yours truly.'],
    },
  });
})(window.RPG);
