'use strict';
// Enemy definitions.
//
// { id, name, level, hp, atk, def, spd, xp, gold:[min,max], r, height,
//   sprite: RPG.Monsters id, pal: {main, eye, ...}, scale?,
//   ai: RPG.AI id, attack: {...ai params}, aggro, leash,
//   drops: [{item, chance, qty?:[a,b]}],  tags: ['beast','undead',...],
//   knockResist, immune:[statuses], elite?, boss?, update?(e,dt,sm) custom AI, draw?(ctx,e) custom draw,
//   init?(e), onDeath?(e) }
//
// Regular enemies are built with mob(): stats come from a level curve times per-enemy multipliers,
// so every zone scales the same way (see the balance notes in the header of mob()).
(function (R) {
  const U = R.U;
  const E = R.Enemies = {};
  R.addEnemy = function (d) { d.tags = d.tags || []; E[d.id] = d; return d; };
  const add = R.addEnemy;

  // Level curves. A same-level hero needs ~3-6 hits for a 1.0 hp enemy and takes ~6-10% HP per 1.0 atk hit.
  const hpAt = (L) => 26 + 16 * L + 0.25 * L * L;
  const atkAt = (L) => 6 + 3 * L + 0.06 * L * L;
  const xpAt = (L) => (R.xpForLevel ? R.xpForLevel(L) : 40 * Math.pow(L, 1.65) + 20 * L) / 16;
  R.EnemyCurve = { hpAt, atkAt, xpAt };

  // mob(id, name, level, o): o.hp / o.atk / o.xp are multipliers; o.def adds armor; everything else is copied.
  function mob(id, name, L, o) {
    const d = Object.assign({ id, name, level: L }, o);
    d.hp = Math.round(hpAt(L) * (o.hp || 1));
    d.atk = Math.round(atkAt(L) * (o.atk || 1));
    d.def = Math.round(L * 0.8 + (o.def || 0));
    d.xp = Math.round(xpAt(L) * (o.xp || 1));
    d.gold = o.gold || [Math.max(1, Math.round(L * 0.8)), Math.round(L * 2.5 + 2)];
    const pot = L < 5 ? 'potion_small' : 'potion';
    d.drops = (o.drops || []).concat([{ item: pot, chance: o.potion != null ? o.potion : 0.06 }]);
    return add(d);
  }
  R.mob = mob;

  // ------------------------------------------------------------------ Whisperwood (1-4)
  mob('slime', 'Green Slime', 1, { hp: 0.7, atk: 0.8, xp: 0.8, spd: 40, r: 7, height: 12, sprite: 'slime', pal: { main: '#5fd35f' }, ai: 'hopper', attack: { cd: 0.6 }, drops: [{ item: 'slime_gel', chance: 0.5 }], tags: ['slime'] });
  mob('wolf', 'Grey Wolf', 2, { hp: 0.8, atk: 1, spd: 62, r: 7, height: 16, sprite: 'wolf', pal: { main: '#8a8a92', eye: '#ffd040' }, ai: 'melee', attack: { range: 16, windup: 0.4, lunge: 160, cd: 1.2 }, drops: [{ item: 'wolf_pelt', chance: 0.45 }], tags: ['beast'] });
  mob('goblin', 'Goblin Raider', 2, { hp: 0.9, atk: 1, spd: 48, r: 6, height: 20, sprite: 'goblin', pal: { main: '#6ab04a', cloth: '#7a4a2a' }, ai: 'melee', attack: { range: 16, windup: 0.45, lunge: 90, cd: 1.2 }, drops: [{ item: 'goblin_ear', chance: 0.4 }], potion: 0.1, tags: ['goblin'] });
  mob('goblin_archer', 'Goblin Archer', 3, { hp: 0.7, atk: 0.9, spd: 45, r: 6, height: 20, sprite: 'goblin', pal: { main: '#5aa04a', cloth: '#4a5a2a', weapon: 'bow', hood: '#3a4a2a' }, ai: 'ranged', attack: { range: 180, keep: 110, windup: 0.6, cd: 2, speed: 170, kind: 'arrow', sound: 'arrow' }, drops: [{ item: 'goblin_ear', chance: 0.4 }], tags: ['goblin'] });
  mob('goblin_shaman', 'Goblin Shaman', 4, { hp: 0.8, atk: 0.9, xp: 1.3, spd: 38, r: 6, height: 22, sprite: 'goblin', pal: { main: '#7aa05a', cloth: '#6a2a5a', weapon: 'staff', feathers: '#e04030', accent: '#80ff60' }, ai: 'summoner', attack: { range: 170, keep: 120, windup: 0.6, cd: 2.4, speed: 120, color: '#80ff60', heal: true, healCd: 6 }, drops: [{ item: 'goblin_ear', chance: 0.5 }, { item: 'mushroom_cap', chance: 0.2 }], potion: 0.12, tags: ['goblin', 'caster'] });
  mob('boar', 'Wild Boar', 3, { hp: 1.3, atk: 1.1, def: 2, spd: 44, r: 8, height: 16, sprite: 'boar', pal: { main: '#7a5a42', eye: '#200808' }, ai: 'charger', attack: { range: 130, windup: 0.7, speed: 230, chargeT: 0.7, cd: 2.6, mult: 1.3 }, knockResist: 0.4, drops: [{ item: 'boar_tusk', chance: 0.45 }], tags: ['beast'] });
  mob('mushroom', 'Sporeling', 2, { hp: 1.0, atk: 0.9, spd: 26, r: 7, height: 18, sprite: 'mushroom', pal: { main: '#d04a6a' }, ai: 'bomber', attack: { radius: 30, fuse: 0.9, mult: 1.4 }, drops: [{ item: 'mushroom_cap', chance: 0.55 }], tags: ['plant'],
    onDeath(e) { if (!e.mem.popped) R.FX.burst(e.x, e.y - 8, { n: 16, color: '#c0ff80', speed: 40, life: 0.8, up: 10 }); } });

  // ------------------------------------------------------------------ Slime Grotto (3-5)
  mob('bat', 'Cave Bat', 3, { hp: 0.55, atk: 0.8, xp: 0.7, spd: 80, r: 6, height: 10, sprite: 'bat', pal: { main: '#5a4a6a' }, ai: 'swarm', attack: { cd: 1.3 }, drops: [{ item: 'bat_wing', chance: 0.4 }], tags: ['beast', 'flying'] });
  mob('cave_slime', 'Cave Slime', 4, { hp: 1.2, atk: 1, xp: 1.2, spd: 38, r: 9, height: 14, scale: 1.3, sprite: 'slime', pal: { main: '#5a7ad8', eye: '#101030', spikes: '#a0c0ff' }, ai: 'hopper', attack: { cd: 0.9, radius: 22, height: 14 }, drops: [{ item: 'slime_gel', chance: 0.7, qty: [1, 2] }], tags: ['slime'],
    onDeath(e) { for (let i = 0; i < 2; i++) { const s = R.World.spawnEnemy('slimelet', e.x + (i ? 8 : -8), e.y, Math.max(1, e.level - 1)); if (s) s.state = 'chase'; } } });
  mob('slimelet', 'Slimelet', 3, { hp: 0.35, atk: 0.6, xp: 0.3, spd: 50, r: 5, height: 9, scale: 0.75, sprite: 'slime', pal: { main: '#7a9ae8', eye: '#101030' }, ai: 'hopper', attack: { cd: 0.5 }, potion: 0, gearChance: 0, tags: ['slime'] });

  // ------------------------------------------------------------------ Forgotten Crypt (6-9)
  mob('skeleton', 'Skeleton', 6, { hp: 1, atk: 1, spd: 42, r: 6, height: 24, sprite: 'skeleton', pal: { main: '#e8e0d0', shield: '#6a5a4a' }, ai: 'melee', attack: { range: 18, windup: 0.5, lunge: 70, cd: 1.3 }, drops: [{ item: 'bone_dust', chance: 0.45 }], tags: ['undead'], blood: '#e8e0d0' });
  mob('skeleton_archer', 'Skeleton Archer', 7, { hp: 0.75, atk: 0.9, spd: 40, r: 6, height: 24, sprite: 'skeleton', pal: { main: '#d8d0c0', weapon: 'bow', cloth: '#4a3a5a' }, ai: 'ranged', attack: { range: 200, keep: 120, windup: 0.6, cd: 1.9, speed: 190, kind: 'arrow', sound: 'arrow' }, drops: [{ item: 'bone_dust', chance: 0.45 }], tags: ['undead'], blood: '#e8e0d0' });
  mob('ghoul', 'Ghoul', 7, { hp: 0.95, atk: 1.1, spd: 58, r: 7, height: 20, sprite: 'ghoul', pal: { main: '#8a9a7a', eye: '#ffe040', cloth: '#3a2a2a' }, ai: 'leaper', attack: { range: 95, windup: 0.5, leapT: 0.45, radius: 16, cd: 2, mult: 1.2, status: { bleed: { dps: 5, dur: 3 } } }, drops: [{ item: 'bone_dust', chance: 0.35 }], tags: ['undead'] });
  mob('wraith', 'Wraith', 8, { hp: 0.8, atk: 1.1, xp: 1.2, spd: 46, r: 7, height: 26, sprite: 'wraith', pal: { main: '#4a5a7a', eye: '#80ffff' }, ai: 'ghost', attack: { windup: 0.55, cd: 2, mult: 1.1, status: { slow: { amt: 0.3, dur: 2 } } }, glow: '#4080ff', light: { r: 40, color: '#80c0ff' }, drops: [{ item: 'ectoplasm', chance: 0.4 }], tags: ['undead', 'spirit', 'flying'], blood: '#a0e8ff', immune: ['bleed', 'poison'] });
  mob('bone_mage', 'Bone Mage', 8, { hp: 0.8, atk: 1, xp: 1.3, spd: 34, r: 6, height: 26, sprite: 'robed', pal: { main: '#3a2a4a', head: 'skull', trim: '#a080c0', accent: '#b070ff', eye: '#b070ff' }, ai: 'summoner', attack: { range: 190, keep: 120, windup: 0.6, cd: 2.2, count: 3, spread: 0.22, speed: 130, color: '#b070ff', summon: 'skeleton', summonCount: 1, summonCd: 9, maxMinions: 2 }, drops: [{ item: 'bone_dust', chance: 0.5 }], potion: 0.1, tags: ['undead', 'caster'], blood: '#e8e0d0' });
  mob('skeleton_knight', 'Skeleton Knight', 9, { hp: 1.6, atk: 1.25, def: 5, xp: 1.6, spd: 38, r: 7, height: 28, sprite: 'knight', pal: { main: '#5a5a6a', helm: 'skull', trim: '#a08040', cloth: '#3a2a4a', shield: '#4a4a5a', eye: '#40c0ff' }, ai: 'melee', attack: { range: 22, windup: 0.7, lunge: 110, cd: 1.6, mult: 1.3 }, knockResist: 0.6, drops: [{ item: 'bone_dust', chance: 0.6, qty: [1, 2] }], potion: 0.12, tags: ['undead'], blood: '#e8e0d0' });

  // ------------------------------------------------------------------ Mirefen Swamp (5-8)
  mob('bog_zombie', 'Bog Zombie', 5, { hp: 1.25, atk: 1.05, spd: 28, r: 7, height: 24, sprite: 'shambler', pal: { main: '#6a8a5a', cloth: '#4a4a3a', drip: '#80ff40' }, ai: 'melee', attack: { range: 18, windup: 0.7, lunge: 60, cd: 1.6, status: { poison: { dps: 3, dur: 4 } } }, drops: [{ item: 'bone_dust', chance: 0.2 }, { item: 'frog_leg', chance: 0.1 }], tags: ['undead'], blood: '#5a7a3a' });
  mob('spider', 'Mire Spider', 6, { hp: 0.8, atk: 1, spd: 66, r: 7, height: 12, sprite: 'spider', pal: { main: '#4a3a3a', eye: '#ff3030', hair: '#6a5a4a' }, ai: 'leaper', attack: { range: 85, windup: 0.4, leapT: 0.35, radius: 14, cd: 1.8 }, drops: [{ item: 'spider_silk', chance: 0.45 }], tags: ['beast', 'insect'], blood: '#80a040' });
  mob('venom_spider', 'Venom Spider', 7, { hp: 0.75, atk: 0.9, spd: 56, r: 7, height: 12, sprite: 'spider', pal: { main: '#3a5a2a', eye: '#ffe040', mark: '#a0ff40', drip: '#a0ff40' }, ai: 'ranged', attack: { range: 170, keep: 100, windup: 0.5, cd: 2, speed: 130, color: '#a0ff40', count: 3, spread: 0.2, mult: 0.6, status: { poison: { dps: 4, dur: 3 } } }, drops: [{ item: 'venom_sac', chance: 0.35 }, { item: 'spider_silk', chance: 0.25 }], tags: ['beast', 'insect'], blood: '#80a040' });
  mob('swamp_frog', 'Bog Frog', 5, { hp: 0.9, atk: 0.9, spd: 50, r: 7, height: 14, sprite: 'frog', pal: { main: '#5a9a3a', warts: '#c0e060' }, ai: 'hopper', attack: { cd: 0.8, radius: 20, height: 16, hopT: 0.55 }, drops: [{ item: 'frog_leg', chance: 0.5 }], tags: ['beast'] });
  mob('wisp', 'Marsh Wisp', 6, { hp: 0.55, atk: 0.9, xp: 1.1, spd: 60, r: 5, height: 14, sprite: 'wisp', pal: { main: '#b0ff80' }, ai: 'ranged', attack: { range: 170, keep: 90, windup: 0.7, cd: 2.2, speed: 80, color: '#b0ff80', homing: 1.5, size: 3 }, glow: '#a0ff60', light: { r: 50, color: '#b0ff80' }, drops: [{ item: 'wisp_essence', chance: 0.4 }], tags: ['spirit', 'flying'], blood: '#d0ffa0', immune: ['bleed', 'poison'] });
  mob('bog_witch', 'Bog Witch', 8, { hp: 1.0, atk: 1.1, xp: 1.5, spd: 34, r: 6, height: 28, sprite: 'robed', pal: { main: '#3a5a3a', head: 'witch', skin: '#9ab080', hat: '#2a3a2a', trim: '#a0c060', accent: '#80ff40', eye: '#ff4040' }, ai: 'caster', attack: { range: 180, radius: 28, delay: 1.0, cd: 2.8, color: '#80ff40', mult: 1.2, status: { poison: { dps: 5, dur: 4 } } }, drops: [{ item: 'venom_sac', chance: 0.25 }, { item: 'wisp_essence', chance: 0.2 }], potion: 0.15, tags: ['human', 'caster'] });
  mob('lizardman', 'Lizardman', 7, { hp: 1.15, atk: 1.1, def: 2, spd: 50, r: 7, height: 28, sprite: 'lizardman', pal: { main: '#3a8a5a', crest: '#e04030' }, ai: 'melee', attack: { range: 30, windup: 0.55, lunge: 140, cd: 1.4, mult: 1.1 }, drops: [{ item: 'lizard_scale', chance: 0.45 }], tags: ['beast'] });

  // ------------------------------------------------------------------ Broodmother's Nest (7-9)
  mob('spiderling', 'Spiderling', 7, { hp: 0.35, atk: 0.6, xp: 0.35, spd: 85, r: 5, height: 8, scale: 0.6, sprite: 'spider', pal: { main: '#5a4050', eye: '#ff6060' }, ai: 'melee', attack: { range: 12, windup: 0.3, lunge: 120, cd: 1 }, drops: [{ item: 'spider_silk', chance: 0.15 }], potion: 0.02, gearChance: 0.02, tags: ['beast', 'insect'], blood: '#80a040' });

  // ------------------------------------------------------------------ Sunscorch Dunes (9-12)
  mob('scorpion', 'Dune Scorpion', 9, { hp: 1.1, atk: 1.05, def: 3, spd: 48, r: 8, height: 14, sprite: 'scorpion', pal: { main: '#c89040', sting: '#ff6040' }, ai: 'melee', attack: { range: 22, windup: 0.6, lunge: 90, cd: 1.5, mult: 1.1, status: { poison: { dps: 6, dur: 3 } } }, drops: [{ item: 'scorpion_stinger', chance: 0.4 }], tags: ['beast', 'insect'], blood: '#a0c040' });
  mob('sand_wraith', 'Sand Wraith', 10, { hp: 0.8, atk: 1.1, xp: 1.2, spd: 50, r: 7, height: 26, sprite: 'wraith', pal: { main: '#b09060', eye: '#ffc040' }, ai: 'ghost', attack: { windup: 0.6, cd: 2.2, bolt: true, color: '#ffc060', speed: 110, mult: 0.8 }, glow: '#ffa040', drops: [{ item: 'ectoplasm', chance: 0.3 }, { item: 'sand_pearl', chance: 0.04 }], tags: ['undead', 'spirit', 'flying'], blood: '#e0c080', immune: ['bleed', 'poison'] });
  mob('mummy', 'Mummy', 10, { hp: 1.35, atk: 1.1, def: 2, spd: 30, r: 7, height: 26, sprite: 'shambler', pal: { main: '#d8c8a0', style: 'mummy', eye: '#40ff80' }, ai: 'melee', attack: { range: 18, windup: 0.7, lunge: 70, cd: 1.7, status: { slow: { amt: 0.4, dur: 2 } } }, drops: [{ item: 'mummy_wrap', chance: 0.5 }], tags: ['undead'], blood: '#c8b890' });
  mob('desert_bandit', 'Desert Bandit', 10, { hp: 1, atk: 1.1, spd: 58, r: 6, height: 24, sprite: 'bandit', pal: { main: '#c8a878', scarf: '#a03030' }, ai: 'melee', attack: { range: 20, windup: 0.4, lunge: 170, cd: 1.2 }, drops: [{ item: 'sand_pearl', chance: 0.03 }], gold: [10, 30], potion: 0.12, gearChance: 0.1, tags: ['human'] });
  mob('bandit_archer', 'Bandit Archer', 10, { hp: 0.8, atk: 1, spd: 50, r: 6, height: 24, sprite: 'bandit', pal: { main: '#a88858', scarf: '#3050a0', weapon: 'bow' }, ai: 'ranged', attack: { range: 210, keep: 130, windup: 0.6, cd: 2.2, speed: 200, kind: 'arrow', sound: 'arrow', count: 3, spread: 0.18 }, gold: [10, 28], potion: 0.1, gearChance: 0.1, tags: ['human'] });
  mob('sand_worm', 'Sand Worm', 11, { hp: 1.6, atk: 1.2, def: 2, xp: 1.8, spd: 55, r: 10, height: 34, sprite: 'worm', pal: { main: '#c09060' }, ai: 'burrower', attack: { radius: 26, windup: 0.8, mult: 1.5, count: 3, color: '#d0c060' }, aggro: 150, knockResist: 1, drops: [{ item: 'sand_pearl', chance: 0.3 }], tags: ['beast'], immune: ['stun'] });
  mob('vulture', 'Carrion Vulture', 9, { hp: 0.7, atk: 0.9, spd: 75, r: 7, height: 14, sprite: 'vulture', pal: { main: '#4a3a3a' }, ai: 'swarm', attack: { cd: 1.5, status: { bleed: { dps: 4, dur: 3 } } }, drops: [{ item: 'harpy_feather', chance: 0.08 }], tags: ['beast', 'flying'] });

  // ------------------------------------------------------------------ Tomb of Anhotep (11-13)
  mob('tomb_guardian', 'Tomb Guardian', 12, { hp: 1.7, atk: 1.2, def: 5, xp: 1.8, spd: 38, r: 8, height: 32, sprite: 'anubis', pal: { main: '#2a2a38' }, ai: 'spinner', attack: { range: 26, windup: 0.6, lunge: 90, cd: 3.2, radius: 32, spinT: 1.6, mult: 0.7 }, knockResist: 0.7, drops: [{ item: 'mummy_wrap', chance: 0.3 }, { item: 'sand_pearl', chance: 0.12 }], potion: 0.12, tags: ['construct'], blood: '#e0b040', immune: ['bleed', 'poison'] });
  mob('scarab', 'Scarab', 11, { hp: 0.4, atk: 0.7, xp: 0.4, spd: 80, r: 5, height: 8, sprite: 'scarab', pal: { main: '#2a8a8a', eye: '#ffd040' }, ai: 'melee', attack: { range: 12, windup: 0.3, lunge: 130, cd: 1 }, potion: 0.02, gearChance: 0.02, tags: ['beast', 'insect'], blood: '#40c0a0' });
  mob('cursed_priest', 'Cursed Priest', 12, { hp: 0.9, atk: 1.1, xp: 1.6, spd: 34, r: 6, height: 28, sprite: 'robed', pal: { main: '#e8e0c8', head: 'priest', skin: '#9a7a5a', trim: '#e0b040', accent: '#40e0a0', weapon: 'ankh', eye: '#40ffa0' }, ai: 'summoner', attack: { range: 190, keep: 120, windup: 0.6, cd: 2.2, count: 3, spread: 0.3, speed: 120, color: '#40e0a0', homing: 1, summon: 'scarab', summonCount: 3, summonCd: 8, maxMinions: 5, status: { slow: { amt: 0.3, dur: 2 } } }, drops: [{ item: 'mummy_wrap', chance: 0.4 }], potion: 0.15, tags: ['undead', 'caster'] });

  // ------------------------------------------------------------------ Frostfang Peaks & Frozen Hollow (13-17)
  mob('ice_wolf', 'Frost Wolf', 13, { hp: 0.9, atk: 1, spd: 68, r: 7, height: 16, sprite: 'wolf', pal: { main: '#c0d8f0', eye: '#40c0ff', stripe: '#6a90c0', frost: 1 }, ai: 'melee', attack: { range: 16, windup: 0.4, lunge: 170, cd: 1.2, status: { slow: { amt: 0.35, dur: 1.5 } } }, drops: [{ item: 'wolf_pelt', chance: 0.4 }, { item: 'yeti_fur', chance: 0.05 }], tags: ['beast'] });
  mob('yeti', 'Yeti', 15, { hp: 2.2, atk: 1.35, def: 4, xp: 2.2, spd: 40, r: 11, height: 36, sprite: 'yeti', pal: { main: '#e8f0ff' }, ai: 'brute', attack: { radius: 34, windup: 0.8, cd: 2.6, mult: 1.4, throw: true, throwColor: '#f0f8ff', status: { slow: { amt: 0.4, dur: 2 } } }, knockResist: 0.8, drops: [{ item: 'yeti_fur', chance: 0.6 }], potion: 0.15, tags: ['beast'] });
  mob('frost_wraith', 'Frost Wraith', 14, { hp: 0.85, atk: 1.1, xp: 1.2, spd: 50, r: 7, height: 26, sprite: 'wraith', pal: { main: '#6a90c0', eye: '#e0ffff', frost: 1 }, ai: 'ghost', attack: { windup: 0.6, cd: 2.2, bolt: true, color: '#a0e0ff', speed: 110, mult: 0.8, status: { slow: { amt: 0.4, dur: 2 } } }, glow: '#60b0ff', light: { r: 40, color: '#a0e0ff' }, drops: [{ item: 'ectoplasm', chance: 0.35 }, { item: 'frost_core', chance: 0.05 }], tags: ['undead', 'spirit', 'flying'], blood: '#c0f0ff', immune: ['bleed', 'poison', 'freeze'] });
  mob('ice_golem', 'Ice Golem', 15, { hp: 2.4, atk: 1.3, def: 8, xp: 2.2, spd: 28, r: 11, height: 38, sprite: 'golem', pal: { main: '#8ab0d0', core: '#c0f8ff', crystals: '#a0e8ff' }, ai: 'brute', attack: { radius: 36, windup: 0.9, cd: 2.8, mult: 1.5, color: '#a0e0ff', status: { freeze: { dur: 0.8 } } }, knockResist: 1, drops: [{ item: 'frost_core', chance: 0.4 }], potion: 0.15, tags: ['construct', 'elemental'], blood: '#c0f0ff', immune: ['freeze', 'poison', 'bleed'] });
  mob('snow_harpy', 'Snow Harpy', 14, { hp: 0.8, atk: 1, spd: 70, r: 7, height: 22, sprite: 'harpy', pal: { main: '#8aa0d0', hair: '#e8f0ff' }, ai: 'ranged', attack: { range: 190, keep: 120, windup: 0.5, cd: 2, speed: 170, count: 5, spread: 0.16, mult: 0.6, color: '#c8d8f0', kind: 'dagger' }, drops: [{ item: 'harpy_feather', chance: 0.5 }], tags: ['beast', 'flying'] });
  mob('ice_bat', 'Frost Bat', 15, { hp: 0.55, atk: 0.85, xp: 0.7, spd: 85, r: 6, height: 10, sprite: 'bat', pal: { main: '#6a8ac0', eye: '#c0f8ff', frost: 1 }, ai: 'swarm', attack: { cd: 1.3, status: { slow: { amt: 0.3, dur: 1.5 } } }, drops: [{ item: 'bat_wing', chance: 0.35 }, { item: 'frost_core', chance: 0.03 }], tags: ['beast', 'flying'] });

  // ------------------------------------------------------------------ Emberdeep Caldera (17-21)
  mob('fire_imp', 'Fire Imp', 17, { hp: 0.7, atk: 1, spd: 64, r: 6, height: 20, sprite: 'imp', pal: { main: '#c03030' }, ai: 'caster', attack: { range: 180, radius: 24, delay: 0.8, cd: 2.2, color: '#ff8030', mult: 1.2, status: { burn: { dps: 10, dur: 3 } } }, glow: '#ff6020', light: { r: 40, color: '#ff8030' }, drops: [{ item: 'imp_horn', chance: 0.4 }], tags: ['demon', 'flying'], immune: ['burn'] });
  mob('magma_golem', 'Magma Golem', 19, { hp: 2.3, atk: 1.3, def: 8, xp: 2.2, spd: 28, r: 11, height: 38, sprite: 'golem', pal: { main: '#3a2a2a', core: '#ffa030', crack: '#ff6020', lava: '#ff8030' }, ai: 'brute', attack: { radius: 36, windup: 0.9, cd: 2.8, mult: 1.4, color: '#ff6020', status: { burn: { dps: 12, dur: 3 } }, pool: { r: 22, dur: 4, color: '#ff6020', mult: 0.35 } }, knockResist: 1, glow: '#ff5010', light: { r: 50, color: '#ff6020' }, drops: [{ item: 'magma_shard', chance: 0.45 }, { item: 'ember_core', chance: 0.1 }], potion: 0.15, tags: ['construct', 'elemental'], blood: '#ff8030', immune: ['burn', 'poison', 'bleed'] });
  mob('salamander', 'Salamander', 18, { hp: 1.1, atk: 1.1, spd: 52, r: 8, height: 14, sprite: 'salamander', pal: { main: '#c04a20' }, ai: 'ranged', attack: { range: 130, keep: 70, windup: 0.6, cd: 1.8, speed: 150, count: 5, spread: 0.12, mult: 0.5, kind: 'fireball', size: 2, sound: 'fire', status: { burn: { dps: 8, dur: 2 } } }, glow: '#ff6020', drops: [{ item: 'lizard_scale', chance: 0.3 }, { item: 'ember_core', chance: 0.15 }], tags: ['beast', 'elemental'], immune: ['burn'] });
  mob('hellhound', 'Hellhound', 19, { hp: 1, atk: 1.1, spd: 70, r: 8, height: 16, sprite: 'wolf', pal: { main: '#3a2020', eye: '#ffe040', mane: '#ff6020', belly: '#6a3020' }, ai: 'charger', attack: { range: 150, windup: 0.6, speed: 260, chargeT: 0.6, cd: 2.2, mult: 1.3 }, glow: '#ff4010', light: { r: 36, color: '#ff6020' }, drops: [{ item: 'ember_core', chance: 0.25 }, { item: 'imp_horn', chance: 0.1 }], tags: ['beast', 'demon'], immune: ['burn'] });
  mob('ember_cultist', 'Ember Cultist', 18, { hp: 0.9, atk: 1.1, xp: 1.4, spd: 36, r: 6, height: 28, sprite: 'robed', pal: { main: '#6a1a1a', head: 'hood', trim: '#ff8030', accent: '#ff6020', eye: '#ffa030', mask: '#e0c0a0' }, ai: 'caster', attack: { range: 190, radius: 30, delay: 1.0, cd: 2.6, color: '#ff6020', mult: 1.3, status: { burn: { dps: 12, dur: 3 } } }, drops: [{ item: 'ember_core', chance: 0.2 }], potion: 0.15, gearChance: 0.1, tags: ['human', 'caster'] });

  // ------------------------------------------------------------------ Obsidian Citadel (21-25)
  mob('dark_knight', 'Dark Knight', 23, { hp: 1.7, atk: 1.25, def: 8, xp: 1.8, spd: 44, r: 8, height: 30, sprite: 'knight', pal: { main: '#2a2a38', trim: '#8060c0', cloth: '#401060', shield: '#1a1a24', horns: '#6a6a7a', eye: '#c060ff', cape: '#2a0a3a' }, ai: 'melee', attack: { range: 24, windup: 0.6, lunge: 150, cd: 1.4, mult: 1.3 }, knockResist: 0.7, drops: [{ item: 'dark_steel', chance: 0.35 }], potion: 0.15, gearChance: 0.1, tags: ['human'] });
  mob('shadow_wraith', 'Shadow Wraith', 22, { hp: 0.85, atk: 1.15, xp: 1.2, spd: 55, r: 7, height: 26, sprite: 'wraith', pal: { main: '#2a1a3a', eye: '#ff40ff' }, ai: 'ghost', attack: { windup: 0.5, cd: 1.8, mult: 1.2, bolt: true, color: '#c060ff', speed: 130, status: { slow: { amt: 0.3, dur: 2 } } }, glow: '#8030c0', drops: [{ item: 'shadow_essence', chance: 0.4 }], tags: ['undead', 'spirit', 'flying'], blood: '#8040c0', immune: ['bleed', 'poison'] });
  mob('necromancer', 'Necromancer', 23, { hp: 1, atk: 1.1, xp: 1.6, spd: 36, r: 6, height: 28, sprite: 'robed', pal: { main: '#1a1a2a', head: 'hood', trim: '#60ff90', accent: '#60ff90', eye: '#60ff90', weapon: 'scythe' }, ai: 'summoner', attack: { range: 200, keep: 130, windup: 0.6, cd: 2, count: 5, spread: 0.18, speed: 140, color: '#60ff90', summon: 'hollow_soldier', summonCount: 2, summonCd: 10, maxMinions: 3 }, drops: [{ item: 'shadow_essence', chance: 0.35 }, { item: 'bone_dust', chance: 0.3 }], potion: 0.15, gearChance: 0.1, tags: ['human', 'caster'] });
  mob('gargoyle', 'Gargoyle', 22, { hp: 1.3, atk: 1.1, def: 8, spd: 70, r: 8, height: 24, sprite: 'gargoyle', pal: { main: '#5a5a68', eye: '#ff4020' }, ai: 'swarm', attack: { cd: 1.6, mult: 1.2 }, drops: [{ item: 'dark_steel', chance: 0.15 }, { item: 'shadow_essence', chance: 0.1 }], tags: ['construct', 'flying'], blood: '#8a8a9a', immune: ['bleed', 'poison'] });
  mob('hollow_soldier', 'Hollow Soldier', 21, { hp: 1.1, atk: 1.05, def: 4, spd: 46, r: 7, height: 28, sprite: 'knight', pal: { main: '#4a4a52', trim: '#6a5a3a', cloth: '#2a2a30', hollow: '#ff8030', eye: '#ff8030', weapon: 'axe' }, ai: 'melee', attack: { range: 22, windup: 0.55, lunge: 120, cd: 1.4 }, drops: [{ item: 'dark_steel', chance: 0.15 }], tags: ['undead'] });

  // Gargoyles sit as statues until you come close.
  const garg = E.gargoyle;
  garg.update = function (e, dt, sm) {
    if (!e.mem.awake) {
      e.anim = 'statue'; e.dmgTakenMult = 0.3;
      const p = R.World.player;
      if ((p && !p.dead && U.dist(e.x, e.y, p.x, p.y) < 70) || e.lastHit < 0.5) {
        e.mem.awake = true; e.dmgTakenMult = 1; e.state = 'chase';
        R.FX.burst(e.x, e.y - 12, { n: 20, colors: ['#8a8a9a', '#5a5a68'], speed: 70, life: 0.5 }); R.Audio.play('bossRoar', { pitch: 2 });
      }
      return;
    }
    R.AI.swarm(e, dt, sm);
  };
})(window.RPG);
