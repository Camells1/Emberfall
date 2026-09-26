'use strict';
// World maps. Coordinates are in tiles (16px). See game/world.js makeBuilder() for the builder API.
//
// World layout (exits):
//   town --E--> forest --N--> grotto            (shard 1: slime_king)
//                  |--SE graveyard--> crypt     (optional: lich)
//                  |--E--> marsh --NE--> spider_den (shard 2: broodmother)
(function (R) {
  const Maps = R.Maps = R.Maps || {};
  R.addMap = function (id, d) { d.id = id; Maps[id] = d; return d; };
  const add = R.addMap;
  const QL = () => R.QuestLog;
  const done = (q) => QL() && QL().isDone(q);
  const has = (it) => R.World.player && R.World.player.count(it) > 0;

  // ---- small builder kit ----------------------------------------------------------
  const K = R.MapKit = {
    // reserve every tile of the given types (keeps roads free of scattered props)
    keepTiles(M, types) { for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (types.includes(M.get(x, y))) M.reserve(x, y, 1, 1); },
    rooms(M, floor, list) { for (const [x, y, w, h] of list) M.rect(x, y, w, h, floor); },
    halls(M, floor, list, width) { for (const pts of list) M.path(pts, floor, width || 3); },
    // props at the four inner corners of a room
    corners(M, pid, x, y, w, h) { M.prop(pid, x + 1, y + 1); M.prop(pid, x + w - 2, y + 1); M.prop(pid, x + 1, y + h - 2); M.prop(pid, x + w - 2, y + h - 2); },
    campsite(M, x, y) { M.prop('campfire', x, y); M.prop('bedroll', x - 2, y + 1); M.prop('bedroll', x + 2, y + 1); M.prop('woodpile', x + 3, y - 2); },
  };

  // ================================================================ Havenbrook
  add('town', {
    name: 'Havenbrook', subtitle: 'A quiet village', w: 60, h: 44, level: 1, music: 'town', safe: true, outdoor: true, dustColor: '#b09468',
    weather: 'leaves',
    build(M) {
      M.fill('grass');
      M.noiseFill(0.12, (n) => (n > 0.72 ? 'darkgrass' : null));
      M.border('canopy', 2, [[57, 19, 3, 5], [28, 0, 5, 3], [28, 41, 5, 3]]);
      // roads & plaza
      M.path([[30, 0], [30, 17]], 'path', 3);
      M.path([[38, 21], [60, 21]], 'path', 3);
      M.path([[8, 21], [22, 21]], 'path', 3);
      M.path([[30, 27], [30, 40], [44, 40]], 'path', 3);
      M.path([[30, 40], [30, 43]], 'path', 3);
      M.path([[12, 21], [12, 30]], 'path', 2);
      M.rect(22, 16, 16, 11, 'cobble');
      // pond
      M.circle(50, 35, 5.4, 'shallow', 1.5); M.circle(50, 35, 4, 'water', 2);
      M.rect(44, 34, 3, 2, 'planks');
      M.prop('boat', 50, 36);
      // farm
      M.rect(3, 31, 13, 9, 'farmland');
      for (let y = 32; y < 40; y += 2) for (let x = 4; x < 15; x += 2) M.prop('crops', x, y, (y / 2) % 3);
      M.prop('scarecrow', 9, 35); M.prop('haystack', 17, 33); M.prop('haystack', 17, 37); M.prop('cart', 18, 30);
      for (let x = 3; x < 16; x++) M.prop('fence', x, 40);
      // buildings (bottom-centre tile coords)
      M.prop('bighouse', 23, 15, 0);                  // Elder's hall
      M.prop('tower', 36, 14);                        // Orin's tower
      M.prop('smithy', 46, 19); M.prop('forge', 41, 19); M.prop('anvil', 51, 19); M.prop('weaponrack', 53, 18);
      M.prop('shop', 46, 29, 1); M.prop('armorstand', 42, 28); M.prop('armorstand', 50, 28);  // armorer
      M.prop('shop', 14, 20, 0); M.prop('barrel', 19, 19); M.prop('crate', 9, 19);          // alchemist
      M.prop('inn', 23, 36); M.prop('bench', 18, 38); M.prop('barrel', 28, 35); M.prop('barrel', 29, 36);
      M.prop('house', 8, 11, 1); M.prop('house', 50, 11, 3); M.prop('house', 41, 10, 2); M.prop('hut', 14, 11, 0);
      // plaza
      M.prop('fountain', 30, 22);
      M.prop('stall', 25, 26, 0); M.prop('stall', 35, 26, 1);
      for (const [x, y] of [[22, 16], [37, 16], [22, 26], [37, 26]]) M.prop('lamp', x, y);
      M.prop('lamp', 44, 22); M.prop('lamp', 16, 22); M.prop('lamp', 32, 32);
      M.waypoint('town', 26, 18, 'Havenbrook');
      // training yard
      M.rect(36, 32, 10, 5, 'dirt');
      M.prop('dummy', 38, 33); M.prop('dummy', 41, 33); M.prop('dummy', 44, 33); M.prop('weaponrack', 40, 36);
      // north gate
      M.prop('gate', 30, 3);
      M.blockRect(26, 1, 3, 3); M.blockRect(32, 1, 3, 3);
      for (let x = 20; x < 27; x++) M.prop('palisade', x, 3);
      for (let x = 34; x < 41; x++) M.prop('palisade', x, 3);
      M.reserve(20, 16, 20, 12);
      K.keepTiles(M, ['path', 'cobble', 'farmland', 'planks', 'dirt']);
      M.scatter('autumntree', 30, { on: ['grass', 'darkgrass'], minDist: 2.5 });
      M.scatter('tree', 16, { on: ['grass', 'darkgrass'], minDist: 2.5 });
      M.scatter('bush', 16, { on: ['grass', 'darkgrass'] });
      M.scatter('flowers', 30, { on: ['grass'] });
      M.scatter('lily', 4, { on: ['water'], area: [45, 30, 10, 10] });
      // people
      M.npc('elder', 24, 17);
      M.npc('smith', 48, 21);
      M.npc('armorer', 46, 31);
      M.npc('alchemist', 14, 22);
      M.npc('arcanist', 36, 16);
      M.npc('innkeeper', 23, 38);
      M.npc('trainer', 42, 35);
      M.npc('guard', 56, 19);
      M.npc('captain', 33, 5);
      M.npc('pip', 28, 29);
      M.npc('lottie', 33, 29);
      M.npc('wendel', 10, 30);
      M.npc('greta', 12, 13);
      M.npc('fennick', 32, 18);
      M.npc('board', 34, 17);
      M.npc('mirabel', 17, 26);
      M.npc('bess', 39, 28);
      // exits
      M.exit(59, 19, 1, 5, 'forest', 'west');
      M.exit(28, 0, 5, 1, 'peaks', 'south', { requires: () => done('main_6'), locked: 'The Frostfang gate is sealed. It opens after the main quest "The Sand King" (defeat Anhotep in the desert).' });
      M.exit(28, 43, 5, 1, 'coast', 'north');
      M.point('south', 30, 40);
      M.sign(33, 41, 'South: Gullwind Coast\nand the fishing town of Saltmere.\n(Level 5+)');
      M.point('start', 30, 24);
      M.point('east', 56, 21);
      M.point('north', 30, 5);
      M.sign(55, 18, 'East: The Whisperwood.\nBeware of slimes.');
      M.sign(28, 6, 'North: Frostfang Pass.\nClosed by order of the Elder.');
    },
  });

  // ================================================================ The Whisperwood
  add('forest', {
    name: 'The Whisperwood', subtitle: 'Level 1-4', w: 96, h: 72, level: 2, music: 'field', outdoor: true, dustColor: '#7a5c3a',
    weather: 'fireflies', tint: 'rgba(10,40,20,0.08)',
    build(M) {
      M.fill('grass');
      M.noiseFill(0.08, (n) => (n > 0.6 ? 'darkgrass' : n < 0.3 ? 'dirt' : null));
      M.border('canopy', 2, [[0, 33, 2, 6], [94, 33, 2, 6], [45, 0, 7, 2]]);
      // river
      M.path([[66, 0], [62, 30], [70, 50], [64, 72]], 'water', 4, 5);
      // roads
      M.path([[0, 36], [40, 36], [94, 36]], 'path', 3, 3);
      M.path([[40, 36], [44, 20], [48, 3]], 'path', 3, 3);
      M.path([[40, 36], [26, 22], [18, 16]], 'path', 2, 3);
      M.path([[40, 36], [30, 50], [20, 58]], 'path', 2, 3);
      M.path([[82, 36], [82, 56]], 'path', 2, 2);
      M.rect(58, 33, 12, 7, 'bridge');
      // grotto mouth (north)
      M.rect(44, 0, 9, 4, 'cave');
      M.prop('cavemouth', 48, 3, 0); M.prop('boulder', 43, 4); M.prop('boulder', 53, 4);
      M.exit(45, 0, 7, 1, 'grotto', 'south', { color: '#60ff80' });
      M.point('grotto', 48, 6);
      // Old Mill (NW)
      M.rect(12, 10, 12, 9, 'dirt');
      M.prop('mill', 16, 14); M.prop('ruinwall', 21, 11); M.prop('ruinwall', 12, 17); M.prop('crate', 20, 15); M.prop('barrel', 21, 16);
      M.zone('Old Mill', 17, 15, 5);
      M.chest('mill_diary', 22, 13, { loot: ['millers_diary', 'potion_small'], gold: 15 });
      M.npc('whiskers', 7, 7);
      // hermit hut (SW)
      M.circle(28, 63, 4, 'water', 1.5);
      M.prop('hut', 16, 58, 1); M.prop('cauldron', 20, 59); M.prop('woodpile', 12, 58); M.prop('stump', 22, 57);
      M.npc('hermit', 19, 60);
      // goblin camp (NE)
      M.rect(74, 8, 16, 12, 'dirt');
      M.prop('tent', 77, 11, 0); M.prop('tent', 86, 11, 1); M.prop('campfire', 81, 14); M.prop('crate', 88, 16); M.prop('crate', 75, 17); M.prop('cage', 84, 17);
      for (let x = 73; x < 91; x += 1) if (x < 79 || x > 83) M.prop('palisade', x, 20);
      M.chest('forest_2', 88, 9, { loot: ['potion_small', 'potion_small', 'ether_small'], gold: 60, tier: 'iron' });
      // graveyard (SE) with the crypt
      M.rect(72, 54, 20, 14, 'gravel');
      for (let y = 62; y < 67; y += 2) for (let x = 74; x < 91; x += 3) M.prop(y % 4 ? 'grave' : 'cross', x, y);
      M.prop('mausoleum', 84, 58);
      M.prop('deadtree', 74, 56); M.prop('deadtree', 91, 60); M.prop('candles', 80, 59); M.prop('lamp', 79, 56);
      M.exit(83, 59, 3, 1, 'crypt', 'entrance', { label: 'Enter the Forgotten Crypt', prompt: true, color: '#b070ff' });
      M.point('crypt', 84, 61);
      M.npc('ghost', 78, 60);
      // lost ring
      M.chest('wendel_ring', 6, 64, { loot: ['wedding_ring'], gold: 10 });
      M.chest('forest_1', 34, 66, { loot: ['potion_small', 'copper_ring'], gold: 25 });
      M.waypoint('forest', 38, 33, 'Whisperwood Crossing');
      M.sign(42, 33, 'N: Slime Grotto\nE: Mirefen Swamp\nSE: Old Graveyard\nW: Havenbrook');
      M.reserve(36, 30, 8, 8);
      // Wolfrun Ledge: a rocky plateau with a little waterfall and a wolf den on top
      M.path([[7, 43], [7, 48]], 'water', 2);
      M.plateau(3, 41, 16, 8, null, 'rock');
      M.waterfall(6, 49, 3, 2);
      M.circle(7, 52.5, 1.8, 'water');
      M.stairs(13, 49, 3, 2);
      M.chest('forest_ledge', 15, 43, { loot: ['potion_small', 'elixir_speed'], gold: 60, tier: 'iron' });
      M.spawn('wolf', 10, 45, { count: 2, radius: 2, level: 4, elite: 0.2 });
      K.keepTiles(M, ['path', 'bridge', 'gravel', 'cave']);
      M.scatter('tree', 200, { on: ['grass', 'darkgrass', 'dirt'], minDist: 1.7 });
      M.scatter('pine', 30, { on: ['grass', 'darkgrass'], minDist: 2 });
      M.scatter('bush', 60, { on: ['grass', 'darkgrass'] });
      M.scatter('mushroom', 25); M.scatter('rock', 20); M.scatter('flowers', 40, { on: ['grass'] });
      M.scatter('log', 8, { on: ['grass', 'darkgrass'] }); M.scatter('stump', 10, { on: ['grass', 'darkgrass'] });
      M.scatter('lily', 8, { on: ['water'] });
      // monsters
      M.spawn('slime', 12, 30, { count: 4, radius: 4, level: 1 });
      M.spawn('slime', 26, 42, { count: 5, radius: 5, level: 1 });
      M.spawn('slime', 50, 46, { count: 4, radius: 5, level: 2 });
      M.spawn('mushroom', 30, 26, { count: 3, radius: 3, level: 2 });
      M.spawn('wolf', 52, 18, { count: 3, radius: 4, level: 2 });
      M.spawn('wolf', 56, 60, { count: 3, radius: 4, level: 3, elite: 0.1 });
      M.spawn('boar', 36, 56, { count: 3, radius: 4, level: 3 });
      M.spawn('boar', 76, 44, { count: 2, radius: 3, level: 3 });
      M.spawn('goblin', 80, 13, { count: 3, radius: 3, level: 3, elite: 0.2 });
      M.spawn('goblin_archer', 84, 9, { count: 2, radius: 2, level: 3 });
      M.spawn('goblin_shaman', 78, 16, { count: 1, radius: 2, level: 4 });
      // exits
      M.exit(0, 33, 1, 6, 'town', 'east');
      M.exit(95, 33, 1, 6, 'marsh', 'west', { requires: () => done('main_2'), locked: 'Thorny brambles block the swamp road. It opens after the main quest "The Slime King".' });
      M.point('west', 2, 36);
      M.point('east', 92, 36);
    },
  });

  // ================================================================ Slime Grotto
  add('grotto', {
    name: 'Slime Grotto', subtitle: 'Level 3-5', w: 44, h: 42, level: 3, music: 'dungeon', dark: 0.82, ambient: '#050a08', playerLight: 100, dustColor: '#5a4c52',
    weather: 'spores',
    build(M) {
      M.fill('cavewall');
      M.noiseFill(0.13, (n, x, y) => (n > 0.47 && x > 1 && y > 1 && x < M.w - 2 && y < M.h - 2 ? 'cave' : null));
      M.path([[22, 40], [22, 30], [12, 24], [14, 12], [22, 8]], 'cave', 3, 3);
      M.path([[22, 30], [32, 22], [30, 10], [22, 8]], 'cave', 3, 3);
      M.circle(22, 7, 6, 'cave', 1.5);
      M.circle(12, 24, 4, 'cave', 1); M.circle(32, 22, 4, 'cave', 1);
      M.circle(18, 7, 1.6, 'swamp'); M.circle(27, 8, 1.6, 'swamp');
      M.rect(19, 34, 7, 8, 'cave');
      M.scatter('crystal', 18, { on: ['cave'], minDist: 3 });
      M.scatter('stalagmite', 25, { on: ['cave'] });
      M.scatter('mushroom', 20, { on: ['cave'] });
      M.scatter('bones', 8, { on: ['cave'] });
      M.prop('torch', 19, 35); M.prop('torch', 25, 35);
      M.waypoint('grotto', 24, 37, 'Grotto Mouth');
      M.npc('finn', 34, 20);
      M.spawn('slime', 12, 24, { count: 4, radius: 2, level: 3, respawn: 90 });
      M.spawn('bat', 32, 22, { count: 3, radius: 2, level: 3, respawn: 90 });
      M.spawn('cave_slime', 26, 16, { count: 3, radius: 2, level: 4, respawn: 90 });
      M.spawn('cave_slime', 14, 14, { count: 3, radius: 2, level: 4, respawn: 90 });
      M.boss('slime_king', 22, 6);
      M.chest('grotto_1', 36, 22, { loot: ['potion_small', 'ether_small'], gold: 35 });
      M.exit(19, 41, 7, 1, 'forest', 'grotto');
      M.point('south', 21, 38);
    },
  });

  // ================================================================ Forgotten Crypt
  add('crypt', {
    name: 'Forgotten Crypt', subtitle: 'Level 6-9', w: 56, h: 52, level: 7, music: 'dungeon', dark: 0.86, ambient: '#06040c', playerLight: 95, dustColor: '#4a4a54',
    build(M) {
      M.fill('cryptwall');
      K.rooms(M, 'cryptfloor', [[22, 0, 13, 10], [18, 18, 21, 11], [3, 15, 12, 15], [43, 14, 11, 16], [15, 35, 27, 14]]);
      K.halls(M, 'cryptfloor', [[[28, 9], [28, 19]], [[19, 23], [12, 23]], [[38, 23], [45, 23]], [[28, 28], [28, 36]], [[8, 29], [8, 40], [16, 40]]]);
      M.rect(19, 19, 19, 9, 'cryptfloor');
      M.prop('stairsdown', 28, 2);
      M.waypoint('crypt', 32, 4, 'Crypt Stair');
      M.prop('torch', 23, 7); M.prop('torch', 33, 7);
      // central hall
      for (const x of [21, 25, 31, 35]) { M.prop('pillar', x, 20, 1); M.prop('pillar', x, 26, 1); }
      M.prop('brazier', 28, 21);
      // ossuary (west)
      M.prop('skullpile', 5, 17); M.prop('skullpile', 12, 17); M.prop('skullpile', 5, 28); M.prop('bones', 9, 21); M.prop('bones', 7, 25); M.prop('candles', 10, 16); M.prop('torch', 13, 23);
      M.chest('crypt_1', 8, 19, { loot: ['potion', 'potion'], gold: 90, tier: 'iron' });
      // burial chamber (east)
      for (let y = 16; y < 29; y += 5) { M.prop('sarcophagus', 46, y + 2, 0); M.prop('sarcophagus', 51, y + 2, 0); }
      M.prop('torch', 44, 15); M.prop('torch', 52, 15); M.prop('urn', 48, 28);
      M.chest('crypt_2', 48, 16, { loot: ['potion', 'ether_small'], gold: 120, tier: 'iron' });
      // lich chamber
      for (const x of [18, 24, 32, 38]) { M.prop('pillar', x, 38, 1); M.prop('pillar', x, 46, 1); }
      M.prop('brazier', 20, 42); M.prop('brazier', 36, 42); M.prop('rune', 28, 44); M.prop('coffin', 28, 47);
      M.prop('candles', 16, 36); M.prop('candles', 40, 36);
      M.boss('lich', 28, 42);
      M.chest('crypt_3', 40, 47, { loot: ['potion', 'potion', 'ether_small'], gold: 200, tier: 'gold' });
      M.spawn('skeleton', 28, 23, { count: 4, radius: 4, level: 6 });
      M.spawn('skeleton_archer', 33, 21, { count: 2, radius: 2, level: 6 });
      M.spawn('ghoul', 8, 23, { count: 3, radius: 3, level: 7 });
      M.spawn('wraith', 48, 22, { count: 2, radius: 3, level: 8 });
      M.spawn('bone_mage', 50, 26, { count: 1, radius: 2, level: 8 });
      M.spawn('skeleton_knight', 12, 40, { count: 2, radius: 2, level: 8, elite: 0.3 });
      M.spawn('skeleton', 28, 32, { count: 2, radius: 2, level: 7 });
      M.exit(24, 0, 9, 1, 'forest', 'crypt');
      M.point('entrance', 28, 5);
    },
  });

  // ================================================================ Mirefen Swamp
  add('marsh', {
    name: 'Mirefen Swamp', subtitle: 'Level 5-8', w: 96, h: 80, level: 6, music: 'field', outdoor: true, dustColor: '#4a4a32',
    weather: 'rain', tint: 'rgba(30,50,20,0.16)',
    build(M) {
      M.fill('swamp');
      M.noiseFill(0.1, (n) => (n > 0.66 ? 'bog' : n > 0.58 ? 'murk' : n < 0.3 ? 'mud' : null));
      M.border('canopy', 2, [[0, 37, 2, 6], [45, 78, 7, 2]]);
      // trails (drawn after the bog so they are always walkable)
      M.path([[0, 40], [30, 40], [60, 30], [80, 14]], 'mud', 3, 3);
      M.path([[30, 40], [40, 58], [48, 79]], 'mud', 3, 3);
      M.path([[60, 30], [84, 42]], 'mud', 2, 2);
      M.path([[40, 58], [72, 62]], 'mud', 2, 2);
      // Mirewatch (stilt camp)
      M.rect(22, 33, 17, 12, 'planks');
      M.prop('stilthut', 26, 36, 0); M.prop('stilthut', 35, 36, 1);
      M.prop('campfire', 30, 41); M.prop('barrel', 23, 43); M.prop('crate', 37, 43); M.prop('lamp', 22, 38); M.prop('lamp', 38, 38);
      M.waypoint('marsh', 34, 42, 'Mirewatch');
      M.npc('osric', 28, 39); M.npc('nessa', 33, 39); M.npc('grub', 27, 43); M.npc('otto', 37, 41);
      // witch hut (SE)
      M.rect(68, 58, 10, 8, 'mud');
      M.prop('hut', 73, 61, 1); M.prop('cauldron', 70, 63); M.prop('skull', 76, 63); M.prop('candles', 75, 64);
      M.chest('marsh_1', 77, 60, { loot: ['potion', 'ether_small'], gold: 80 });
      // lizardman ruins (E)
      M.rect(80, 36, 12, 12, 'mud');
      M.prop('ruinwall', 82, 38); M.prop('ruinwall', 88, 38); M.prop('ruinwall', 82, 46); M.prop('pillar', 90, 44); M.prop('skullpile', 86, 42);
      M.chest('marsh_2', 88, 45, { loot: ['potion', 'potion'], gold: 110, tier: 'iron' });
      // spider den mouth (NE)
      M.rect(76, 6, 10, 8, 'mud');
      M.prop('cavemouth', 80, 9, 2); M.prop('web', 75, 10); M.prop('web', 86, 9); M.prop('cocoon', 77, 12); M.prop('eggsac', 84, 12);
      M.exit(78, 8, 5, 2, 'spider_den', 'south', { label: "Enter Broodmother's Nest", prompt: true, color: '#a0ff60' });
      M.point('den', 80, 13);
      M.sign(33, 46, 'Mirewatch\nN-E: Broodmother\'s Nest\nS: Road to Saffar');
      // the glowing sinkhole down to the Glimmercap Hollows
      M.path([[30, 40], [18, 56], [12, 68]], 'mud', 2, 2);
      M.rect(8, 64, 9, 8, 'mud');
      M.prop('cavemouth', 12, 67, 0); M.prop('mushroom', 9, 66); M.prop('bigshroom', 16, 65, 0);
      M.light(12, 66, 60, '#60e0a0', 0.1);
      M.exit(10, 65, 5, 2, 'glimmer', 'entrance', { label: 'Descend into the Glimmercap Hollows', prompt: true, color: '#60e0a0' });
      M.point('sinkhole', 12, 70);
      M.sign(16, 69, 'A glowing sinkhole.\nSomething hums far below.');
      K.keepTiles(M, ['mud', 'planks']);
      M.reserve(20, 31, 21, 16);
      M.scatter('swamptree', 70, { on: ['swamp'], minDist: 2.5 });
      M.scatter('mangrove', 30, { on: ['swamp', 'murk'], minDist: 3 });
      M.scatter('deadtree', 20, { on: ['swamp'] });
      M.scatter('reeds', 70, { on: ['swamp', 'murk'] });
      M.scatter('lily', 30, { on: ['bog'] });
      M.scatter('bigshroom', 12, { on: ['swamp'], minDist: 4 });
      M.scatter('log', 8, { on: ['swamp'] });
      M.spawn('bog_zombie', 14, 46, { count: 3, radius: 4, level: 5 });
      M.spawn('swamp_frog', 46, 50, { count: 4, radius: 5, level: 5 });
      M.spawn('wisp', 56, 20, { count: 3, radius: 4, level: 6 });
      M.spawn('spider', 70, 18, { count: 4, radius: 4, level: 6 });
      M.spawn('venom_spider', 66, 10, { count: 2, radius: 3, level: 7, elite: 0.15 });
      M.spawn('lizardman', 85, 41, { count: 4, radius: 4, level: 7, elite: 0.2 });
      M.spawn('bog_witch', 72, 66, { count: 2, radius: 3, level: 8 });
      M.spawn('bog_zombie', 50, 68, { count: 3, radius: 4, level: 7 });
      M.spawn('swamp_frog', 20, 60, { count: 3, radius: 4, level: 6 });
      M.exit(0, 37, 1, 6, 'forest', 'east');
      M.exit(45, 79, 7, 1, 'oasis', 'north', { requires: () => done('main_4'), locked: 'The south road is overrun. It opens after the main quest "Mother of Spiders" (defeat the Broodmother).' });
      M.point('west', 2, 40);
      M.point('south', 48, 76);
    },
  });

  // ================================================================ Broodmother's Nest
  add('spider_den', {
    name: "Broodmother's Nest", subtitle: 'Level 7-9', w: 52, h: 52, level: 8, music: 'dungeon', dark: 0.86, ambient: '#060806', playerLight: 90, dustColor: '#4a4448',
    weather: 'spores',
    build(M) {
      M.fill('cavewall');
      M.noiseFill(0.14, (n, x, y) => (n > 0.5 && x > 2 && y > 2 && x < M.w - 3 && y < M.h - 3 ? 'web' : null));
      K.halls(M, 'web', [[[26, 51], [26, 40], [14, 32], [16, 18], [26, 12]], [[26, 40], [38, 30], [36, 18], [26, 12]], [[14, 32], [6, 40]], [[38, 30], [46, 38]]], 3);
      M.circle(26, 10, 8, 'web', 1.5);
      M.circle(6, 42, 4, 'web', 1); M.circle(46, 40, 4, 'web', 1); M.circle(26, 40, 4, 'web', 1);
      M.rect(23, 44, 7, 8, 'web');
      M.waypoint('spider_den', 28, 46, 'Nest Entrance');
      M.prop('torch', 23, 47); M.prop('torch', 30, 47);
      for (const [x, y] of [[20, 6], [32, 6], [18, 12], [34, 12], [22, 16], [30, 16]]) M.prop('eggsac', x, y);
      M.scatter('web', 16, { on: ['web'], minDist: 4 });
      M.scatter('cocoon', 14, { on: ['web'], minDist: 3 });
      M.scatter('eggsac', 10, { on: ['web'], minDist: 5 });
      M.scatter('bones', 10, { on: ['web'] });
      M.scatter('crystal', 6, { on: ['web'], minDist: 6 });
      M.boss('broodmother', 26, 9);
      M.spawn('spider', 16, 26, { count: 4, radius: 3, level: 7, respawn: 90 });
      M.spawn('spiderling', 36, 24, { count: 6, radius: 3, level: 7, respawn: 60 });
      M.spawn('venom_spider', 26, 38, { count: 2, radius: 2, level: 8, respawn: 90 });
      M.spawn('venom_spider', 46, 40, { count: 2, radius: 2, level: 8, elite: 0.25 });
      M.spawn('spiderling', 6, 42, { count: 5, radius: 3, level: 7 });
      M.chest('den_1', 6, 42, { loot: ['potion', 'potion'], gold: 90 });
      M.chest('den_2', 47, 41, { loot: ['potion', 'ether_small'], gold: 120, tier: 'iron' });
      M.exit(23, 51, 7, 1, 'marsh', 'den');
      M.point('south', 26, 48);
    },
  });

  // ================================================================ Oasis of Saffar
  add('oasis', {
    name: 'Oasis of Saffar', subtitle: 'A haven in the sands', w: 56, h: 44, level: 9, music: 'town', safe: true, outdoor: true, dustColor: '#c8a870',
    weather: 'sand',
    build(M) {
      M.fill('sand');
      M.noiseFill(0.12, (n) => (n > 0.66 ? 'dune' : null));
      M.border('sandcliff', 2, [[25, 0, 7, 2], [54, 19, 2, 7]]);
      M.path([[28, 0], [28, 12]], 'sandstone', 3);
      M.path([[36, 22], [56, 22]], 'sandstone', 3);
      M.circle(28, 22, 7.4, 'grass', 1.5);
      M.circle(28, 22, 5.6, 'shallow', 1.2);
      M.circle(28, 22, 4.2, 'water', 1);
      M.rect(15, 10, 8, 6, 'sandstone');
      M.prop('pavilion', 16, 11);
      M.prop('tent', 40, 12, 0); M.prop('tent', 46, 31, 1); M.prop('tent', 12, 32, 0);
      M.prop('stall', 38, 30, 2); M.prop('stall', 20, 34, 0);
      M.prop('well', 44, 20); M.prop('cart', 48, 14); M.prop('crate', 44, 14); M.prop('barrel', 45, 15);
      M.prop('obelisk', 23, 9); M.prop('obelisk', 33, 9);
      for (const [x, y] of [[22, 16], [34, 16], [22, 28], [34, 28], [20, 22], [36, 20]]) M.prop('palm', x, y);
      M.prop('lamp', 25, 12); M.prop('lamp', 31, 12);
      K.campsite(M, 30, 34);
      M.waypoint('oasis', 38, 25, 'Oasis of Saffar');
      M.npc('amira', 17, 13); M.npc('hassan', 38, 32); M.npc('zafir', 20, 36); M.npc('rashid', 50, 22); M.npc('layla', 26, 30);
      M.reserve(12, 8, 38, 30);
      K.keepTiles(M, ['sandstone']);
      M.scatter('palm', 10, { on: ['sand', 'dune'], minDist: 3 });
      M.scatter('cactus', 10, { on: ['sand', 'dune'], minDist: 2 });
      M.scatter('dunebush', 14, { on: ['sand', 'dune'] });
      M.scatter('lily', 3, { on: ['water'] });
      M.exit(25, 0, 7, 1, 'marsh', 'south');
      M.exit(55, 19, 1, 7, 'desert', 'west');
      M.point('north', 28, 3);
      M.point('east', 52, 22);
      M.point('start', 28, 32);
    },
  });

  // ================================================================ Sunscorch Dunes
  add('desert', {
    name: 'Sunscorch Dunes', subtitle: 'Level 9-12', w: 104, h: 80, level: 10, music: 'field', outdoor: true, dustColor: '#c8a870',
    weather: 'sand', tint: 'rgba(255,190,90,0.07)',
    build(M) {
      M.fill('sand');
      M.noiseFill(0.07, (n) => (n > 0.62 ? 'dune' : null));
      M.noiseFill(0.11, (n, x, y) => (n > 0.8 ? 'sandcliff' : null));
      M.border('sandcliff', 2, [[0, 37, 2, 7]]);
      // trails
      M.path([[0, 40], [30, 40], [56, 44], [80, 26]], 'path', 2, 3);
      M.path([[30, 40], [24, 60]], 'path', 2, 3);
      M.path([[30, 40], [40, 20]], 'path', 2, 3);
      M.path([[56, 44], [64, 64]], 'path', 2, 3);
      // pyramid & tomb entrance
      M.rect(68, 8, 26, 18, 'sandstone');
      M.prop('pyramid', 80, 21);
      M.prop('obelisk', 72, 25); M.prop('obelisk', 88, 25); M.prop('anubis', 75, 24); M.prop('anubis', 85, 24);
      M.exit(78, 22, 5, 1, 'tomb', 'entrance', { label: 'Enter the Tomb of Anhotep', prompt: true, color: '#ffd040', requires: () => has('sun_key') || R.World.flags['boss:pharaoh'], locked: 'A great sun-shaped lock seals the tomb. You need the Sun Key.' });
      M.point('tomb', 80, 25);
      // bandit camp (SW)
      M.rect(16, 56, 16, 12, 'dirt');
      M.prop('tent', 19, 59, 0); M.prop('tent', 28, 59, 1); M.prop('campfire', 24, 63); M.prop('crate', 17, 66); M.prop('crate', 30, 66); M.prop('cart', 22, 67); M.prop('cage', 31, 62);
      M.chest('sun_key_chest', 24, 58, { loot: ['sun_key', 'potion'], gold: 120, tier: 'gold' });
      // ruined city (centre)
      M.rect(50, 44, 18, 14, 'sandstone');
      for (const [x, y] of [[52, 46], [56, 46], [60, 46], [64, 46], [52, 55], [64, 55]]) M.prop('sandcolumn', x, y);
      M.prop('obelisk', 58, 51); M.prop('ruinwall', 54, 57); M.prop('ruinwall', 62, 49); M.prop('urn', 55, 50); M.prop('urn', 61, 53);
      M.chest('desert_1', 66, 57, { loot: ['potion', 'potion'], gold: 140, tier: 'iron' });
      M.npc('pell', 57, 53);
      // wrecked caravan (north)
      M.rect(36, 14, 12, 8, 'dune');
      M.prop('cart', 39, 17, 1); M.prop('cart', 45, 19, 0); M.prop('crate', 42, 15); M.prop('barrel', 37, 20); M.prop('ribcage', 44, 16); M.prop('skull', 40, 20);
      M.zone('Wrecked Caravan', 42, 18, 5);
      M.chest('caravan_ledger', 47, 15, { loot: ['caravan_ledger'], gold: 50 });
      M.waypoint('desert', 10, 38, 'Dune Road');
      // Sunscorch Mesa
      M.plateau(84, 52, 14, 10, null, 'sand');
      M.stairs(88, 62, 3, 2, 'sand');
      M.chest('desert_mesa', 94, 54, { loot: ['potion', 'potion_large'], gold: 220, tier: 'iron' });
      M.spawn('vulture', 90, 56, { count: 2, radius: 3, level: 11 });
      K.keepTiles(M, ['path', 'sandstone', 'dirt']);
      M.reserve(68, 8, 26, 20);
      M.scatter('cactus', 50, { on: ['sand', 'dune'], minDist: 2.5 });
      M.scatter('dunebush', 40, { on: ['sand', 'dune'] });
      M.scatter('palm', 8, { on: ['sand'], minDist: 6 });
      M.scatter('skull', 10, { on: ['sand', 'dune'] });
      M.scatter('sandcolumn', 10, { on: ['sand'], minDist: 6 });
      M.scatter('rock', 16, { on: ['sand', 'dune'] });
      M.spawn('scorpion', 20, 30, { count: 4, radius: 4, level: 9 });
      M.spawn('vulture', 42, 30, { count: 3, radius: 5, level: 9 });
      M.spawn('desert_bandit', 24, 62, { count: 3, radius: 3, level: 10, elite: 0.2 });
      M.spawn('bandit_archer', 28, 58, { count: 2, radius: 2, level: 10 });
      M.spawn('sand_wraith', 58, 50, { count: 3, radius: 4, level: 11 });
      M.spawn('mummy', 64, 46, { count: 2, radius: 3, level: 11 });
      M.spawn('sand_worm', 80, 50, { count: 2, radius: 5, level: 12, elite: 0.2 });
      M.spawn('scorpion', 88, 66, { count: 4, radius: 5, level: 11 });
      M.spawn('vulture', 72, 34, { count: 3, radius: 4, level: 11 });
      M.exit(0, 37, 1, 7, 'oasis', 'east');
      M.point('west', 3, 40);
    },
  });

  // ================================================================ Tomb of Anhotep
  add('tomb', {
    name: 'Tomb of Anhotep', subtitle: 'Level 11-13', w: 52, h: 56, level: 12, music: 'dungeon', dark: 0.85, ambient: '#0a0604', playerLight: 95, dustColor: '#6a5234',
    build(M) {
      M.fill('sandwall');
      K.rooms(M, 'tombfloor', [[20, 44, 13, 12], [21, 28, 11, 16], [4, 26, 13, 12], [35, 26, 13, 12], [14, 3, 25, 18]]);
      K.halls(M, 'tombfloor', [[[16, 32], [21, 32]], [[31, 32], [36, 32]], [[26, 28], [26, 20]], [[10, 26], [10, 14], [15, 14]]], 3);
      M.waypoint('tomb', 30, 50, 'Tomb Antechamber');
      M.prop('anubis', 21, 45); M.prop('anubis', 31, 45); M.prop('torch', 22, 53); M.prop('torch', 30, 53);
      for (let y = 30; y < 43; y += 4) { M.prop('torch', 22, y); M.prop('torch', 30, y); }
      // treasuries
      M.prop('goldpile', 7, 29); M.prop('goldpile', 13, 34); M.prop('urn', 5, 35); M.prop('urn', 15, 27); M.prop('sarcophagus', 10, 30, 1);
      M.chest('tomb_1', 6, 31, { loot: ['potion', 'potion'], gold: 180, tier: 'gold' });
      M.prop('sarcophagus', 38, 30, 0); M.prop('sarcophagus', 42, 30, 0); M.prop('sarcophagus', 46, 30, 0); M.prop('urn', 37, 36); M.prop('torch', 41, 27);
      M.chest('tomb_2', 45, 35, { loot: ['potion', 'ether_small'], gold: 160, tier: 'iron' });
      // throne hall
      for (const x of [17, 22, 30, 35]) { M.prop('sandcolumn', x, 8, 0); M.prop('sandcolumn', x, 17, 0); }
      M.prop('throne', 26, 5); M.prop('brazier', 19, 12); M.prop('brazier', 33, 12); M.prop('goldpile', 16, 4); M.prop('goldpile', 37, 4);
      M.boss('pharaoh', 26, 10);
      M.spawn('mummy', 26, 36, { count: 3, radius: 3, level: 11 });
      M.spawn('scarab', 10, 32, { count: 5, radius: 3, level: 11 });
      M.spawn('tomb_guardian', 41, 33, { count: 2, radius: 2, level: 12, elite: 0.2 });
      M.spawn('cursed_priest', 26, 24, { count: 2, radius: 2, level: 12 });
      M.spawn('scarab', 12, 16, { count: 4, radius: 2, level: 12 });
      M.exit(22, 55, 9, 1, 'desert', 'tomb');
      M.point('entrance', 26, 51);
    },
  });

  // ================================================================ Frostfang Peaks
  add('peaks', {
    name: 'Frostfang Peaks', subtitle: 'Level 13-16', w: 96, h: 88, level: 14, music: 'field', outdoor: true, dustColor: '#c8d2e0',
    weather: 'snow', tint: 'rgba(120,160,220,0.1)',
    build(M) {
      M.fill('snow');
      M.noiseFill(0.1, (n, x, y) => (n > 0.79 ? 'snowcliff' : n < 0.26 ? 'ice' : null));
      M.border('snowcliff', 2, [[45, 86, 7, 2], [94, 39, 2, 7], [0, 50, 2, 6]]);
      M.circle(58, 48, 10, 'frozenlake', 3);
      M.path([[48, 88], [48, 70], [40, 50], [22, 16]], 'snowpath', 3, 3);
      M.path([[48, 70], [70, 60], [96, 42]], 'snowpath', 3, 3);
      M.path([[40, 50], [60, 28], [80, 18]], 'snowpath', 2, 3);
      // ice cavern mouth (NW)
      M.rect(16, 8, 12, 8, 'snowpath');
      M.prop('cavemouth', 22, 11, 2); M.prop('icespike', 16, 12); M.prop('icespike', 28, 11); M.prop('frozenknight', 18, 14);
      M.exit(20, 10, 5, 2, 'ice_cavern', 'entrance', { label: 'Enter the Frozen Hollow', prompt: true, color: '#a0e0ff' });
      M.point('cavern', 22, 15);
      // Frostfang camp
      M.rect(40, 66, 16, 10, 'snowpath');
      M.prop('tent', 43, 69, 0); M.prop('tent', 53, 69, 1); K.campsite(M, 48, 72); M.prop('cart', 43, 74); M.prop('snowman', 55, 74);
      M.waypoint('peaks', 51, 76, 'Frostfang Camp');
      M.npc('yrsa', 46, 71); M.npc('bjorn', 52, 73);
      // the frozen pass east (sealed by Skaldr's ice)
      for (let y = 39; y < 46; y += 2) M.prop('icespike', 91, y);
      M.prop('frozenknight', 88, 38); M.prop('frozenknight', 88, 46);
      // harpy crags & yeti hollow
      M.prop('snowrock', 78, 16); M.prop('snowrock', 82, 20); M.prop('skullpile', 80, 18);
      M.chest('peaks_1', 82, 16, { loot: ['potion', 'potion'], gold: 200, tier: 'iron' });
      M.chest('peaks_2', 70, 80, { loot: ['potion', 'ether_small'], gold: 180 });
      // west trail to the Thornveil Grove
      M.path([[0, 53], [20, 52], [40, 50]], 'snowpath', 3, 2);
      M.exit(0, 50, 1, 6, 'thornwood', 'east');
      M.point('west', 3, 53);
      M.sign(4, 49, 'West: Thornveil Grove\n(Level 16+)');
      // Frostspire Ledge
      M.plateau(6, 62, 20, 12, null, 'snow');
      M.stairs(14, 74, 3, 2, 'snow');
      M.chest('peaks_ledge', 20, 65, { loot: ['potion_large', 'ether_large'], gold: 260, tier: 'iron' });
      M.spawn('yeti', 12, 66, { count: 1, radius: 1, level: 16, elite: 0.3 });
      K.keepTiles(M, ['snowpath']);
      M.reserve(38, 64, 20, 14);
      M.scatter('snowpine', 150, { on: ['snow'], minDist: 2 });
      M.scatter('snowrock', 30, { on: ['snow'] });
      M.scatter('icecrystal', 16, { on: ['snow', 'ice'], minDist: 5 });
      M.scatter('icespike', 16, { on: ['ice', 'frozenlake'], minDist: 4 });
      M.spawn('ice_wolf', 40, 56, { count: 4, radius: 4, level: 13 });
      M.spawn('ice_wolf', 70, 62, { count: 3, radius: 4, level: 14, elite: 0.15 });
      M.spawn('yeti', 20, 40, { count: 2, radius: 3, level: 15, elite: 0.2 });
      M.spawn('snow_harpy', 78, 20, { count: 4, radius: 4, level: 14 });
      M.spawn('frost_wraith', 58, 46, { count: 3, radius: 5, level: 15 });
      M.spawn('ice_golem', 30, 22, { count: 2, radius: 3, level: 16 });
      M.spawn('yeti', 84, 70, { count: 2, radius: 3, level: 16 });
      M.exit(45, 87, 7, 1, 'town', 'north');
      M.exit(95, 39, 1, 7, 'volcano', 'west', { requires: () => done('main_7'), locked: 'Enchanted ice seals the pass east. It melts after the main quest "Frostfang" (defeat Skaldr).' });
      M.point('south', 48, 84);
      M.point('east', 90, 42);
    },
  });

  // ================================================================ Frozen Hollow
  add('ice_cavern', {
    name: 'Frozen Hollow', subtitle: 'Level 15-17', w: 52, h: 52, level: 16, music: 'dungeon', dark: 0.7, ambient: '#040a14', playerLight: 110, dustColor: '#7aa8c8',
    weather: 'snow',
    build(M) {
      M.fill('icewall');
      M.noiseFill(0.13, (n, x, y) => (n > 0.5 && x > 2 && y > 2 && x < M.w - 3 && y < M.h - 3 ? 'icefloor' : null));
      K.halls(M, 'icefloor', [[[26, 51], [26, 40], [12, 30], [14, 16], [26, 10]], [[26, 40], [40, 30], [38, 16], [26, 10]]], 3);
      M.circle(26, 10, 8, 'icefloor', 1.5);
      M.circle(26, 30, 6, 'frozenlake', 1.5);
      M.path([[26, 40], [26, 24]], 'icefloor', 3);
      M.circle(12, 30, 4, 'icefloor', 1); M.circle(40, 30, 4, 'icefloor', 1);
      M.rect(23, 44, 7, 8, 'icefloor');
      M.waypoint('ice_cavern', 28, 46, 'Hollow Mouth');
      M.prop('torch', 23, 47); M.prop('torch', 30, 47);
      M.scatter('icecrystal', 20, { on: ['icefloor'], minDist: 3 });
      M.scatter('icespike', 20, { on: ['icefloor'], minDist: 2 });
      M.scatter('frozenknight', 4, { on: ['icefloor'], minDist: 8 });
      M.scatter('bones', 8, { on: ['icefloor'] });
      M.boss('frost_wyrm', 26, 9);
      M.spawn('ice_bat', 12, 30, { count: 4, radius: 3, level: 15, respawn: 80 });
      M.spawn('frost_wraith', 40, 30, { count: 2, radius: 3, level: 16, respawn: 90 });
      M.spawn('ice_golem', 26, 24, { count: 2, radius: 3, level: 16, elite: 0.2 });
      M.spawn('ice_bat', 36, 16, { count: 4, radius: 3, level: 16 });
      M.chest('ice_1', 12, 31, { loot: ['potion', 'potion'], gold: 220, tier: 'iron' });
      M.chest('ice_2', 41, 31, { loot: ['potion', 'ether_small'], gold: 240, tier: 'gold' });
      M.exit(23, 51, 7, 1, 'peaks', 'cavern');
      M.point('entrance', 26, 48);
    },
  });

  // ================================================================ Emberdeep Caldera
  add('volcano', {
    name: 'Emberdeep Caldera', subtitle: 'Level 17-21', w: 96, h: 88, level: 19, music: 'dungeon', outdoor: true, dark: 0.35, ambient: '#200808', playerLight: 130, dustColor: '#4a4040',
    weather: 'embers', tint: 'rgba(255,80,20,0.08)',
    build(M) {
      M.fill('volcrock');
      M.noiseFill(0.12, (n) => (n > 0.66 ? 'lavacrack' : n < 0.28 ? 'ash' : null));
      M.noiseFill(0.1, (n, x, y) => (n > 0.82 ? 'volcwall' : null));
      M.border('volcwall', 2, [[0, 41, 2, 7], [45, 0, 7, 2]]);
      // lava rivers
      M.path([[20, 0], [26, 30], [18, 60], [28, 88]], 'lava', 4, 5);
      M.path([[96, 70], [70, 60], [60, 88]], 'lava', 3, 4);
      // caldera arena with lava moat
      M.circle(52, 38, 13, 'lava', 1);
      M.circle(52, 38, 10, 'ash', 1);
      // trails & bridges
      M.path([[0, 44], [36, 44], [52, 38], [48, 0]], 'volcrock', 3, 2);
      M.path([[36, 44], [30, 70], [16, 72]], 'volcrock', 3, 2);
      M.path([[52, 38], [78, 62]], 'volcrock', 3, 2);
      for (const [x, y, w, h] of [[20, 42, 12, 5], [39, 40, 5, 5], [62, 40, 3, 3], [48, 24, 6, 4], [16, 69, 14, 5], [66, 56, 8, 6]]) M.rect(x, y, w, h, 'stonebridge');
      M.path([[36, 44], [42, 42]], 'stonebridge', 3); M.path([[52, 27], [50, 21]], 'stonebridge', 3); M.path([[60, 45], [66, 52]], 'stonebridge', 3);
      // lights along the lava
      for (let y = 4; y < M.h; y += 8) for (let x = 2; x < M.w; x += 8) if (M.get(x, y) === 'lava') M.light(x, y, 70, '#ff6020', 0.15);
      M.prop('altar', 52, 33); M.prop('lavapillar', 44, 32); M.prop('lavapillar', 60, 32); M.prop('lavapillar', 44, 44); M.prop('lavapillar', 60, 44);
      M.boss('infernal', 52, 38);
      // dwarf camp (SW)
      M.rect(8, 66, 12, 10, 'ash');
      K.campsite(M, 12, 70); M.prop('tent', 10, 67, 1); M.prop('forge', 16, 67); M.prop('anvil', 18, 70);
      M.npc('durgan', 15, 72);
      M.waypoint('volcano', 8, 44, 'Caldera Rim');
      // cultist camp (SE)
      M.rect(74, 60, 14, 10, 'ash');
      M.prop('warbanner', 76, 61); M.prop('warbanner', 86, 61); M.prop('rune', 81, 65); M.prop('cage', 78, 67); M.prop('brazier', 84, 67);
      M.chest('volcano_1', 86, 68, { loot: ['potion', 'potion', 'ether_small'], gold: 300, tier: 'iron' });
      M.chest('volcano_2', 90, 8, { loot: ['potion', 'potion'], gold: 260, tier: 'gold' });
      // citadel road (north)
      M.prop('obspike', 44, 4); M.prop('obspike', 53, 4); M.prop('warbanner', 45, 2); M.prop('warbanner', 52, 2);
      K.keepTiles(M, ['stonebridge']);
      M.reserve(38, 25, 28, 28);
      M.scatter('charredtree', 40, { on: ['volcrock', 'ash'], minDist: 3 });
      M.scatter('obspike', 30, { on: ['volcrock', 'ash', 'lavacrack'], minDist: 3 });
      M.scatter('vent', 16, { on: ['volcrock', 'lavacrack'], minDist: 5 });
      M.scatter('lavarock', 30, { on: ['volcrock', 'lavacrack'] });
      M.scatter('bones', 12, { on: ['ash'] });
      M.spawn('fire_imp', 34, 20, { count: 4, radius: 4, level: 17 });
      M.spawn('salamander', 30, 56, { count: 3, radius: 4, level: 18 });
      M.spawn('magma_golem', 70, 22, { count: 2, radius: 3, level: 19, elite: 0.2 });
      M.spawn('hellhound', 76, 44, { count: 3, radius: 4, level: 19 });
      M.spawn('ember_cultist', 80, 64, { count: 4, radius: 3, level: 20, elite: 0.2 });
      M.spawn('fire_imp', 84, 30, { count: 4, radius: 4, level: 19 });
      M.spawn('hellhound', 40, 76, { count: 3, radius: 4, level: 20 });
      M.exit(0, 41, 1, 7, 'peaks', 'east');
      M.exit(45, 0, 7, 1, 'citadel', 'entrance', { requires: () => done('main_9'), locked: 'Black flame bars the Citadel road. Only the Ember Crown can part it (main quest "The Ember Crown").' });
      M.point('west', 3, 44);
      M.point('citadel', 48, 4);
    },
  });

  // ================================================================ Obsidian Citadel
  add('citadel', {
    name: 'Obsidian Citadel', subtitle: 'Level 21-25', w: 60, h: 72, level: 23, music: 'dungeon', dark: 0.82, ambient: '#08040e', playerLight: 110, dustColor: '#2a2436',
    weather: 'ash',
    build(M) {
      M.fill('citwall');
      K.rooms(M, 'citfloor', [[24, 60, 13, 12], [22, 36, 17, 24], [4, 38, 14, 14], [43, 38, 14, 14], [4, 16, 14, 14], [43, 16, 14, 14], [14, 2, 33, 18]]);
      K.halls(M, 'citfloor', [[[18, 44], [22, 44]], [[38, 44], [43, 44]], [[10, 38], [10, 30]], [[50, 38], [50, 30]], [[17, 22], [22, 18]], [[43, 22], [38, 18]], [[30, 36], [30, 20]]], 3);
      M.rect(29, 20, 3, 50, 'royalcarpet');
      M.waypoint('citadel', 34, 66, 'Citadel Gate');
      M.prop('warbanner', 25, 61); M.prop('warbanner', 35, 61); M.prop('brazier', 26, 68); M.prop('brazier', 34, 68);
      for (let y = 38; y < 60; y += 6) { M.prop('citpillar', 24, y); M.prop('citpillar', 36, y); }
      M.prop('gargoyle', 23, 36); M.prop('gargoyle', 37, 36);
      // wings
      M.prop('cage', 6, 40); M.prop('cage', 15, 40); M.prop('chains', 10, 39); M.prop('skullpile', 8, 49); M.prop('brazier', 11, 45);
      M.prop('weaponrack', 47, 39); M.prop('armorstand', 53, 39); M.prop('brazier', 50, 45); M.prop('bedroll', 45, 48); M.prop('bedroll', 48, 48);
      M.prop('rune', 11, 23); M.prop('bookshelf', 7, 17); M.prop('bookshelf', 14, 17); M.prop('candles', 6, 27);
      M.prop('altar', 50, 22); M.prop('gargoyle', 45, 18); M.prop('gargoyle', 55, 18);
      M.chest('citadel_1', 15, 49, { loot: ['potion', 'potion'], gold: 400, tier: 'iron' });
      M.chest('citadel_2', 54, 49, { loot: ['potion', 'potion', 'ether_small'], gold: 400, tier: 'iron' });
      M.chest('citadel_3', 15, 27, { loot: ['potion', 'potion', 'potion'], gold: 500, tier: 'gold' });
      // throne room
      M.prop('throne', 30, 5);
      for (const x of [17, 23, 37, 43]) { M.prop('citpillar', x, 6); M.prop('citpillar', x, 15); }
      M.prop('brazier', 20, 10); M.prop('brazier', 40, 10); M.prop('warbanner', 26, 3); M.prop('warbanner', 34, 3);
      M.boss('hollow_king', 30, 10);
      M.spawn('hollow_soldier', 30, 52, { count: 4, radius: 4, level: 21 });
      M.spawn('dark_knight', 30, 42, { count: 2, radius: 3, level: 22, elite: 0.2 });
      M.spawn('gargoyle', 10, 44, { count: 2, radius: 3, level: 22 });
      M.spawn('shadow_wraith', 50, 44, { count: 3, radius: 3, level: 22 });
      M.spawn('necromancer', 10, 22, { count: 1, radius: 2, level: 23 });
      M.spawn('hollow_soldier', 10, 24, { count: 3, radius: 3, level: 23 });
      M.spawn('dark_knight', 50, 24, { count: 2, radius: 3, level: 23, elite: 0.3 });
      M.spawn('shadow_wraith', 30, 26, { count: 2, radius: 3, level: 24 });
      // a tear in reality opens behind the throne once Malgrath falls
      M.prop('riftportal', 40, 5);
      M.exit(39, 3, 3, 2, 'rift', 'entrance', { label: 'Step into the Starfall Rift', prompt: true, color: '#c060ff', requires: () => !!R.World.flags['boss:hollow_king'], locked: 'Reality ripples behind the throne... but Malgrath\'s power still holds it shut.' });
      M.point('rift', 40, 7);
      M.exit(24, 71, 13, 1, 'volcano', 'citadel');
      M.point('entrance', 30, 68);
    },
  });
})(window.RPG);
