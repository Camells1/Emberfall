'use strict';
// Mounts and pets.
//   Mounts: press H to ride (outdoors, out of combat). Much faster travel. Attacking, dodging, casting
//           or getting hit knocks you out of the saddle.
//   Pets:   little friends that follow you around and fetch loot for you.
//   N opens the stable: pick your mount and pet, see what's left to collect.
//   Get them from Havenbrook's stable master, boss drops, the Gauntlet and a few secrets.
(function (R) {
  const U = R.U, G = R.G, FX = R.FX, Input = R.Input;
  const CP = R.Companions = {};

  // ================================================================== mounts
  // style: horse | wolf | raptor | elk | dragon | chicken | crab.  spd: speed multiplier while riding.
  const MOUNTS = CP.MOUNTS = {
    horse: { name: 'Chestnut Mare', style: 'horse', spd: 1.6, body: '#8a5a34', mane: '#3a2418', hoof: '#2a1a10', price: 800, from: 'Stable master, Havenbrook' },
    warhorse: { name: 'Armored Charger', style: 'horse', spd: 1.7, body: '#e8e0d0', mane: '#8a8070', hoof: '#3a3a40', armor: '#8a929a', trim: '#c8a040', price: 2500, level: 10, from: 'Stable master, Havenbrook (level 10)' },
    wolf: { name: 'Grey Direwolf', style: 'wolf', spd: 1.75, body: '#7a7a82', mane: '#4a4a52', eye: '#ffe060', from: 'Clear the Gauntlet once' },
    crab: { name: 'Tide Crab', style: 'crab', spd: 1.6, body: '#c03a2a', shell: '#6a8a9a', eye: '#ffffff', drop: ['crab_king', 0.35], from: 'Clackjaw, the Tide Tyrant (rare)' },
    raptor: { name: 'Sand Raptor', style: 'raptor', spd: 1.85, body: '#c8a060', mane: '#8a3a2a', eye: '#ffe040', drop: ['pharaoh', 0.3], from: 'Anhotep, the Sand King (rare)' },
    elk: { name: 'Frost Elk', style: 'elk', spd: 1.8, body: '#d0e0f0', mane: '#ffffff', antler: '#a0e8ff', hoof: '#6a8aa0', glow: '#a0e8ff', drop: ['frost_wyrm', 0.35], from: 'Skaldr, the Frost Wyrm (rare)' },
    unicorn: { name: 'Starlight Unicorn', style: 'horse', spd: 1.9, body: '#fff4ff', mane: '#ff90e0', hoof: '#c0a0ff', horn: '#ffe070', glow: '#ffb0ff', drop: ['briar_queen', 0.3], from: 'Queen Briarthorn (rare)' },
    nightmare: { name: 'Nightmare', style: 'horse', spd: 1.9, body: '#1a1418', mane: '#ff6020', hoof: '#ff8030', eye: '#ff4020', flame: true, glow: '#ff6020', drop: ['infernal', 0.3], from: 'Pyrrhus, the Molten Titan (rare)' },
    chicken: { name: 'Colossal Hen', style: 'chicken', spd: 1.65, body: '#fff8e8', comb: '#e03030', from: '??? (the hens remember)' },
    gryphon: { name: 'Sky Gryphon', style: 'dragon', spd: 1.9, fly: true, body: '#c89040', belly: '#f4ecd8', wing: '#8a6030', eye: '#ffe040', price: 6000, level: 15, from: 'Stable master, Havenbrook (level 15)' },
    drake: { name: 'Ember Drake', style: 'dragon', spd: 2.0, fly: true, body: '#8a2a2a', belly: '#e0a060', wing: '#5a1a1a', eye: '#ffe040', drop: ['hollow_king', 0.25], from: 'Malgrath, the Hollow King (rare)' },
    voidsteed: { name: 'Void Strider', style: 'horse', spd: 2.0, body: '#2a1a4a', mane: '#c080ff', hoof: '#8040ff', eye: '#ff40ff', stars: true, glow: '#c080ff', drop: ['watcher', 0.3], from: 'Ulthuun, the Watcher Beyond (rare)' },
  };
  // ================================================================== pets
  // style: quad | bird | blob | bug | dragon | golem
  const PETS = CP.PETS = {
    puppy: { name: 'Biscuit the Puppy', style: 'quad', ears: 'flop', body: '#c89060', dark: '#8a5a30', price: 150, from: 'Stable master' },
    kitten: { name: 'Mittens the Kitten', style: 'quad', ears: 'cat', body: '#404048', dark: '#202028', belly: '#ffffff', price: 150, from: 'Stable master' },
    bunny: { name: 'Clover the Bunny', style: 'quad', ears: 'bunny', body: '#f0ece0', dark: '#c0b8a8', price: 200, from: 'Stable master' },
    fox: { name: 'Ember the Fox', style: 'quad', ears: 'cat', body: '#e07030', dark: '#8a3a10', belly: '#ffffff', tail: true, price: 400, level: 5, from: 'Stable master (level 5)' },
    owl: { name: 'Professor Hoot', style: 'bird', body: '#8a6a4a', dark: '#5a4028', eye: '#ffe060', price: 500, level: 8, from: 'Stable master (level 8)' },
    gloopy: { name: 'Gloopy', style: 'blob', body: '#60d080', eye: '#140c1c', crown: '#ffd040', drop: ['slime_king', 0.4], from: 'Gloopus, the Slime King' },
    wisp: { name: 'Little Wisp', style: 'blob', body: '#b080ff', eye: '#ffffff', glow: '#c080ff', ghost: true, drop: ['lich', 0.4], from: 'Mortis, the Bone Lich' },
    itsy: { name: 'Itsy', style: 'bug', body: '#3a2a3a', eye: '#80ff40', drop: ['broodmother', 0.4], from: 'Vexa, the Broodmother' },
    crabling: { name: 'Pinchy', style: 'bug', body: '#e05030', eye: '#ffffff', claws: true, drop: ['crab_king', 0.4], from: 'Clackjaw, the Tide Tyrant' },
    spore: { name: 'Sporeling', style: 'blob', body: '#c050c0', eye: '#140c1c', cap: '#e060c0', spots: '#c0ff80', drop: ['mycelord', 0.4], from: 'Mycelos, the Rot-Crowned' },
    penguin: { name: 'Sir Waddles', style: 'bird', body: '#20202a', belly: '#ffffff', beak: '#ffb030', drop: ['frost_wyrm', 0.4], from: 'Skaldr, the Frost Wyrm' },
    phoenix: { name: 'Phoenix Chick', style: 'bird', body: '#ff8030', dark: '#ff3010', eye: '#ffffff', glow: '#ff8030', drop: ['infernal', 0.35], from: 'Pyrrhus, the Molten Titan' },
    dragonling: { name: 'Smolder the Dragonling', style: 'dragon', body: '#40a060', belly: '#e0d080', wing: '#2a7040', drop: ['hollow_king', 0.35], from: 'Malgrath, the Hollow King' },
    eyeball: { name: 'Blinky', style: 'blob', body: '#3a1a5a', eye: '#ff40ff', big: true, glow: '#c060ff', drop: ['watcher', 0.4], from: 'Ulthuun, the Watcher Beyond' },
    golem: { name: 'Pebble', style: 'golem', body: '#8a8a90', dark: '#5a5a62', eye: '#60e0ff', from: 'Clear the Gauntlet 3 times' },
    duckling: { name: 'Squire Quackers', style: 'bird', body: '#ffe040', beak: '#ff8020', eye: '#140c1c', from: '??? (a very persistent knight)' },
  };

  // ================================================================== drawing
  // Mounts are drawn side-on (40x32, facing right; flipped for left). f = gallop frame 0-3.
  function drawMount(P, m, f, moving) {
    const leg = moving ? [[0, 3], [3, 0], [0, -3], [-3, 0]][f] : [0, 0];
    const bob = moving ? [0, -1, 0, 1][f] : 0;
    const legs = (xs, top, len, c, hoof) => xs.forEach((x, i) => { const o = i % 2 ? leg[1] : leg[0]; P.rect(x + Math.round(o / 2), top, 2, len - Math.abs(o) / 3, c); if (hoof) P.rect(x + Math.round(o / 2), top + len - 2, 2, 2, hoof); });
    const st = m.style;
    if (st === 'horse' || st === 'elk') {
      const b = m.body;
      legs([11, 14, 24, 27], 20 + bob, 10, U.shade(b, -0.15), m.hoof);
      P.ellipse(19, 17 + bob, 11, 6, b); P.rect(9, 14 + bob, 20, 4, U.shade(b, 0.1));
      P.rect(27, 7 + bob, 5, 10, b); P.rect(29, 3 + bob, 7, 6, b); P.rect(35, 5 + bob, 2, 3, U.shade(b, -0.2)); // neck, head, muzzle
      P.px(32, 4 + bob, m.eye || '#140c1c');
      P.rect(27, 3 + bob, 2, 10, m.mane); P.rect(4, 13 + bob, 5, 3, m.mane); P.rect(3, 15 + bob, 3, 7, m.mane); // mane, tail
      if (m.armor) { P.rect(12, 12 + bob, 14, 7, m.armor); P.rect(12, 12 + bob, 14, 1, m.trim); P.rect(28, 4 + bob, 5, 3, m.armor); }
      if (m.horn) { P.px(33, 1 + bob, m.horn); P.px(34, 0 + bob, m.horn); P.px(33, 2 + bob, m.horn); }
      if (st === 'elk') { const a = m.antler; P.rect(29, 0 + bob, 1, 4, a); P.rect(27, 0 + bob, 3, 1, a); P.rect(32, -1 + bob, 1, 5, a); P.rect(32, -1 + bob, 3, 1, a); }
      if (m.flame) for (let i = 0; i < 6; i++) P.px(27 + (i % 2), 2 + i * 2 + bob - ((f + i) % 2), i % 2 ? '#ffd040' : '#ff6020');
      if (m.stars) for (const [x, y] of [[14, 15], [20, 13], [23, 18], [17, 19]]) P.px(x, y + bob, '#ffffff');
      P.rect(14, 11 + bob, 9, 2, '#6a3a1a'); // saddle
    } else if (st === 'wolf') {
      const b = m.body;
      legs([11, 14, 24, 27], 21 + bob, 9, U.shade(b, -0.2), '#2a2a30');
      P.ellipse(19, 18 + bob, 11, 5, b); P.rect(12, 13 + bob, 14, 3, m.mane);
      P.rect(27, 11 + bob, 7, 7, b); P.rect(33, 14 + bob, 4, 3, U.shade(b, -0.1)); P.px(36, 14 + bob, '#140c1c');
      P.rect(28, 8 + bob, 2, 3, b); P.rect(31, 8 + bob, 2, 3, b); P.px(31, 12 + bob, m.eye);
      P.rect(4, 13 + bob, 6, 3, b); P.rect(2, 11 + bob, 3, 3, U.shade(b, 0.2));
      P.rect(14, 12 + bob, 9, 2, '#6a3a1a');
    } else if (st === 'raptor') {
      const b = m.body;
      legs([15, 21], 20 + bob, 10, U.shade(b, -0.2), '#3a2a20');
      P.ellipse(18, 16 + bob, 9, 5, b); P.rect(4, 14 + bob, 8, 3, b); P.rect(1, 13 + bob, 4, 2, b); // tail
      P.rect(25, 6 + bob, 4, 10, b); P.rect(26, 3 + bob, 9, 5, b); P.px(33, 4 + bob, m.eye); P.rect(30, 7 + bob, 5, 1, '#ffffff');
      for (let i = 0; i < 4; i++) P.px(25 - i * 3, 11 + bob, m.mane);
      P.rect(14, 10 + bob, 8, 2, '#6a3a1a');
    } else if (st === 'dragon') {
      const b = m.body, wf = moving ? f % 2 : 0;
      P.rect(6, 6 - wf * 3 + bob, 12, 3, m.wing); P.rect(4, 3 - wf * 4 + bob, 6, 4, m.wing); // back wing
      legs([12, 23], 21 + bob, 8, U.shade(b, -0.2), '#2a1010');
      P.ellipse(18, 17 + bob, 11, 6, b); P.ellipse(19, 20 + bob, 8, 3, m.belly);
      P.rect(2, 15 + bob, 7, 3, b); P.rect(0, 14 + bob, 3, 3, U.shade(b, -0.2));
      P.rect(27, 7 + bob, 5, 9, b); P.rect(29, 4 + bob, 8, 5, b); P.px(33, 5 + bob, m.eye); P.px(28, 2 + bob, '#e0d0c0'); P.px(30, 2 + bob, '#e0d0c0');
      P.rect(13, 8 - wf * 3 + bob, 12, 3, U.shade(m.wing, 0.15)); P.rect(18, 4 - wf * 4 + bob, 6, 4, U.shade(m.wing, 0.15)); // front wing
      P.rect(14, 11 + bob, 9, 2, '#3a1a10');
    } else if (st === 'chicken') {
      const b = m.body;
      legs([16, 21], 21 + bob, 9, '#e0a020', null);
      P.ellipse(19, 15 + bob, 10, 7, b); P.rect(7, 10 + bob, 5, 6, U.shade(b, -0.1));
      P.rect(26, 4 + bob, 6, 8, b); P.px(30, 6 + bob, '#140c1c'); P.rect(32, 7 + bob, 3, 2, '#e0a020'); P.rect(26, 2 + bob, 5, 2, m.comb); P.px(31, 10 + bob, m.comb);
      P.rect(14, 9 + bob, 9, 2, '#6a3a1a');
    } else if (st === 'crab') {
      const b = m.body;
      for (let i = 0; i < 3; i++) { const o = moving ? (f + i) % 2 : 0; P.rect(8 + i * 3, 20 + o, 2, 8, U.shade(b, -0.2)); P.rect(24 + i * 3, 20 + (1 - o), 2, 8, U.shade(b, -0.2)); }
      P.ellipse(20, 17 + bob, 13, 7, m.shell); P.ellipse(20, 19 + bob, 12, 4, b);
      P.rect(33, 11 + bob, 5, 5, b); P.rect(36, 9 + bob, 3, 3, b); P.rect(2, 12 + bob, 5, 5, b);
      P.px(17, 11 + bob, m.eye); P.px(23, 11 + bob, m.eye); P.rect(17, 12 + bob, 1, 2, b); P.rect(23, 12 + bob, 1, 2, b);
      P.rect(15, 10 + bob, 10, 2, '#6a3a1a');
    }
  }

  // Front ('down') and back ('up') views: 44x40, feet at (22, 38). Two layers so the rider sits
  // between them: 'base' (drawn under the rider) and 'top' (drawn over the rider's legs).
  function drawMountV(P, m, f, moving, view, layer) {
    const st = m.style, b = m.body, dk = U.shade(b, -0.2);
    const lift = moving ? [[2, 0], [0, 2], [0, 0], [2, 0]][f] : [0, 0];
    const bob = moving ? [0, -1, 0, 1][f] : 0;
    const legPair = (xs, top, len, c, hoof) => xs.forEach((x, i) => { const up = i % 2 ? lift[1] : lift[0]; P.rect(x, top - up, 3, len, c); if (hoof) P.rect(x, top - up + len - 2, 3, 2, hoof); });
    const front = view === 'down';
    if (layer === 'base') {
      if (st === 'dragon') { const w = moving ? f % 2 : 0; P.rect(2, 12 - w * 3 + bob, 14, 5, m.wing); P.rect(28, 12 - w * 3 + bob, 14, 5, m.wing); P.rect(0, 9 - w * 4 + bob, 6, 4, m.wing); P.rect(38, 9 - w * 4 + bob, 6, 4, m.wing); }
      if (st === 'crab') {
        for (let i = 0; i < 3; i++) { const o = moving ? (f + i) % 2 : 0; P.rect(6 - i * 2, 26 + i * 3 - o, 5, 2, dk); P.rect(33 + i * 2, 26 + i * 3 - (1 - o), 5, 2, dk); }
        P.ellipse(22, 24 + bob, 14, 8, m.shell); P.ellipse(22, 27 + bob, 12, 5, b);
        P.rect(2, 16 + bob, 7, 6, b); P.rect(35, 16 + bob, 7, 6, b); P.rect(15, 14 + bob, 14, 3, '#6a3a1a');
        if (front) { P.px(18, 22 + bob, m.eye); P.px(26, 22 + bob, m.eye); }
        return;
      }
      if (!front) { // head and neck far away, behind the rider
        if (st === 'wolf') { P.rect(17, 6 + bob, 10, 8, b); P.rect(17, 3 + bob, 3, 4, b); P.rect(24, 3 + bob, 3, 4, b); }
        else if (st === 'chicken') { P.rect(18, 4 + bob, 8, 9, b); P.rect(19, 2 + bob, 6, 3, m.comb); }
        else if (st === 'raptor' || st === 'dragon') { P.rect(19, 3 + bob, 6, 12, b); if (st === 'dragon') { P.px(19, 1 + bob, '#e0d0c0'); P.px(24, 1 + bob, '#e0d0c0'); } }
        else { P.rect(19, 4 + bob, 6, 12, b); P.rect(20, 1 + bob, 2, 4, b); P.rect(23, 1 + bob, 2, 4, b); P.rect(21, 5 + bob, 2, 10, m.mane || dk);
          if (m.horn) P.rect(21, 0 + bob, 2, 3, m.horn);
          if (st === 'elk') { P.rect(15, 0 + bob, 5, 1, m.antler); P.rect(24, 0 + bob, 5, 1, m.antler); P.rect(17, 0 + bob, 1, 4, m.antler); P.rect(26, 0 + bob, 1, 4, m.antler); } }
      }
      // legs and body
      if (st === 'raptor' || st === 'chicken') legPair([17, 24], 28 + bob, 10, st === 'chicken' ? '#e0a020' : dk, st === 'chicken' ? null : '#3a2a20');
      else legPair([14, 18, 23, 27], 27 + bob, 11, dk, m.hoof || '#2a2a30');
      const bw = st === 'chicken' ? 10 : st === 'wolf' ? 8 : 9, bh = st === 'chicken' ? 9 : 10;
      P.ellipse(22, 22 + bob, bw, bh, b); P.ellipse(22, 19 + bob, bw - 2, bh - 4, U.shade(b, 0.1));
      if (st === 'dragon') P.ellipse(22, 25 + bob, 5, 5, m.belly);
      if (m.armor) { P.rect(14, 17 + bob, 16, 9, m.armor); P.rect(14, 17 + bob, 16, 1, m.trim); }
      if (m.stars) for (const [x, y] of [[17, 18], [26, 21], [21, 26], [24, 16]]) P.px(x, y + bob, '#ffffff');
      P.rect(16, 14 + bob, 12, 4, '#6a3a1a'); // saddle
      return;
    }
    // ---- 'top' layer: drawn over the rider's legs
    if (st === 'crab') return;
    if (front) { // neck + head coming toward us
      if (st === 'wolf') { P.rect(16, 24 + bob, 12, 9, b); P.rect(16, 21 + bob, 3, 4, b); P.rect(25, 21 + bob, 3, 4, b); P.rect(19, 30 + bob, 6, 4, U.shade(b, -0.1)); P.px(21, 33 + bob, '#140c1c'); P.px(22, 33 + bob, '#140c1c'); P.px(19, 27 + bob, m.eye); P.px(24, 27 + bob, m.eye); }
      else if (st === 'chicken') { P.rect(17, 22 + bob, 10, 10, b); P.px(19, 25 + bob, '#140c1c'); P.px(24, 25 + bob, '#140c1c'); P.rect(20, 27 + bob, 4, 3, '#e0a020'); P.rect(18, 19 + bob, 8, 3, m.comb); P.rect(21, 30 + bob, 2, 3, m.comb); }
      else if (st === 'raptor') { P.rect(18, 20 + bob, 8, 12, b); P.rect(19, 30 + bob, 6, 3, '#ffffff'); P.px(19, 24 + bob, m.eye); P.px(24, 24 + bob, m.eye); }
      else if (st === 'dragon') { P.rect(18, 20 + bob, 8, 13, b); P.rect(19, 30 + bob, 6, 3, m.belly); P.px(19, 23 + bob, m.eye); P.px(24, 23 + bob, m.eye); P.px(18, 19 + bob, '#e0d0c0'); P.px(25, 19 + bob, '#e0d0c0'); }
      else {
        P.rect(19, 20 + bob, 6, 8, b); P.rect(18, 25 + bob, 8, 8, b); P.rect(19, 31 + bob, 6, 3, U.shade(b, -0.25));
        P.px(19, 27 + bob, m.eye || '#140c1c'); P.px(24, 27 + bob, m.eye || '#140c1c');
        P.rect(18, 22 + bob, 2, 3, b); P.rect(24, 22 + bob, 2, 3, b); P.rect(21, 20 + bob, 2, 6, m.mane || dk);
        if (m.armor) P.rect(19, 25 + bob, 6, 2, m.armor);
        if (m.horn) { P.rect(21, 17 + bob, 2, 4, m.horn); P.px(21, 16 + bob, m.horn); }
        if (st === 'elk') { P.rect(14, 19 + bob, 5, 1, m.antler); P.rect(25, 19 + bob, 5, 1, m.antler); P.rect(15, 16 + bob, 1, 4, m.antler); P.rect(28, 16 + bob, 1, 4, m.antler); }
        if (m.flame) for (let i = 0; i < 4; i++) P.px(21 + (i % 2), 18 + i * 2 + bob - ((f + i) % 2), i % 2 ? '#ffd040' : '#ff6020');
      }
    } else { // tail toward us
      const tc = st === 'wolf' || st === 'chicken' || st === 'raptor' || st === 'dragon' ? b : (m.mane || dk);
      if (st === 'chicken') { P.rect(17, 24 + bob, 10, 6, U.shade(b, -0.08)); }
      else { const sway = moving ? [0, 1, 0, -1][f] : 0; P.rect(20 + sway, 28 + bob, 4, st === 'raptor' || st === 'dragon' ? 10 : 8, tc); if (st === 'wolf') P.rect(20 + sway, 35 + bob, 4, 2, U.shade(b, 0.25)); }
    }
  }
  function mountSpriteV(id, f, moving, view, layer) {
    const m = MOUNTS[id];
    return G.sprite('mountv|' + id + '|' + f + '|' + (moving ? 1 : 0) + view + layer, 44, 40, (c) => drawMountV(G.painter(c), m, f, moving, view, layer), { outline: true });
  }
  const SEAT = { horse: 13, elk: 13, wolf: 11, raptor: 12, dragon: 13, chicken: 12, crab: 12 };
  function mountSprite(id, f, moving) {
    const m = MOUNTS[id];
    return G.sprite('mount|' + id + '|' + f + '|' + (moving ? 1 : 0), 40, 32, (c) => { c.translate(0, 2); drawMount(G.painter(c), m, f, moving); }, { outline: true });
  }
  // Draw a mount with its rider. drawRider(yOffset) draws the character.
  // Draw a mount with its rider. dir: 'left' | 'right' | 'up' | 'down'. drawRider(yOffset, dir) draws the character.
  CP.drawRiding = function (ctx, x, y, mountId, dir, moving, t, drawRider, alpha) {
    const m = MOUNTS[mountId]; if (!m) return false;
    const f = m.fly ? Math.floor(t * 6) % 2 * 2 + (moving ? 1 : 0) : moving ? Math.floor(t * 12) % 4 : 0;
    const bob = m.fly ? 0 : moving ? [0, -1, 0, 1][f] : 0;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = m.fly ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, dir === 'up' || dir === 'down' ? 11 : 15, 4, 0, 0, U.TAU); ctx.fill();
    if (m.fly) { y -= 16 + Math.sin(t * 3) * 3; moving = true; } // up in the air, wings always flapping
    if (m.glow && R.settings.fancy !== false) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(G.glow(20, m.glow), Math.round(x - 20), Math.round(y - 30)); ctx.globalAlpha = alpha != null ? alpha : 1; ctx.globalCompositeOperation = 'source-over'; }
    const X = Math.round(x), Y = Math.round(y);
    if (dir === 'up' || dir === 'down') {
      ctx.drawImage(mountSpriteV(mountId, f, moving, dir, 'base'), X - 22, Y - 38);
      ctx.restore();
      drawRider(-(SEAT[m.style] || 12) - 2 + bob, dir);
      ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
      ctx.drawImage(mountSpriteV(mountId, f, moving, dir, 'top'), X - 22, Y - 38);
      ctx.restore();
    } else {
      ctx.translate(X, Y);
      if (dir === 'left') ctx.scale(-1, 1);
      ctx.drawImage(mountSprite(mountId, f, moving), -20, -30);
      ctx.restore();
      drawRider(-(SEAT[m.style] || 12) + bob, dir);
    }
    const back = dir === 'left' ? 12 : dir === 'right' ? -12 : 0, backY = dir === 'down' ? -14 : dir === 'up' ? 2 : -2;
    if (m.flame && moving && Math.random() < 0.5) FX.particle({ x: x + back + U.rand(-4, 4), y: y + backY, vy: -20, life: 0.4, color: U.choose(['#ff6020', '#ffd040']), glow: true, size: 2 });
    if (m.stars && Math.random() < 0.3) FX.particle({ x: x + U.rand(-12, 12), y: y - U.rand(4, 20), life: 0.5, color: '#e0c0ff', glow: true, size: 1 });
    return true;
  };
  // Pets: 16x16, f = step frame.
  function drawPet(P, p, f) {
    const hop = f % 2;
    if (p.style === 'quad') {
      const y = 7 - hop;
      P.rect(4, y + 5, 2, 3 + hop, p.dark); P.rect(10, y + 5, 2, 3 + hop, p.dark);
      P.ellipse(8, y + 3, 5, 3, p.body); if (p.belly) P.rect(6, y + 5, 5, 1, p.belly);
      P.rect(10, y - 2, 5, 5, p.body); P.px(13, y, '#140c1c'); P.px(15, y + 1, '#140c1c');
      if (p.ears === 'flop') { P.rect(10, y - 2, 2, 4, p.dark); }
      else if (p.ears === 'cat') { P.px(10, y - 3, p.body); P.px(13, y - 3, p.body); }
      else if (p.ears === 'bunny') { P.rect(11, y - 6, 1, 4, p.body); P.rect(13, y - 6, 1, 4, p.body); P.px(11, y - 4, '#ffb0c0'); }
      P.rect(1, y + 1, 3, 2, p.tail ? p.body : p.dark); if (p.tail) P.px(1, y + 1, '#ffffff');
    } else if (p.style === 'bird') {
      const y = 5 - hop;
      P.ellipse(8, y + 5, 5, 5, p.body); if (p.belly) P.ellipse(9, y + 6, 3, 3, p.belly);
      P.px(6, y + 3, p.eye || '#140c1c'); P.px(10, y + 3, p.eye || '#140c1c');
      P.rect(7, y + 5, 3, 1, p.beak || '#ffb030');
      if (p.dark) { P.rect(3, y + 4, 2, 4, p.dark); P.rect(12, y + 4, 2, 4, p.dark); }
      P.rect(6, y + 10, 1, 2, p.beak || '#e0a020'); P.rect(10, y + 10, 1, 2, p.beak || '#e0a020');
    } else if (p.style === 'blob') {
      const y = 6 - hop, sq = hop ? 1 : 0;
      P.ellipse(8, y + 5, 6 + sq, 5 - sq, p.body);
      if (p.cap) { P.ellipse(8, y + 1, 7, 3, p.cap); P.px(5, y, p.spots); P.px(10, y + 1, p.spots); }
      if (p.big) { P.circle(8, y + 5, 3, '#ffffff'); P.circle(8, y + 5, 2, p.eye); P.px(8, y + 5, '#140c1c'); }
      else { P.px(6, y + 4, p.eye); P.px(10, y + 4, p.eye); }
      if (p.crown) { P.rect(5, y - 1, 6, 2, p.crown); P.px(5, y - 2, p.crown); P.px(8, y - 2, p.crown); P.px(10, y - 2, p.crown); }
      if (p.ghost) { P.px(3, y + 9, p.body); P.px(7, y + 10, p.body); P.px(12, y + 9, p.body); }
    } else if (p.style === 'bug') {
      const y = 8;
      for (let i = 0; i < 3; i++) { P.rect(3 - i, y + 1 + i, 2, 1, p.body); P.rect(12 + i, y + 1 + i, 2, 1, p.body); }
      P.ellipse(8, y + 1, 5, 3, p.body); P.px(6, y, p.eye); P.px(10, y, p.eye);
      if (p.claws) { P.rect(1, y - 3 + hop, 3, 3, p.body); P.rect(13, y - 3 + (1 - hop), 3, 3, p.body); }
    } else if (p.style === 'dragon') {
      const y = 6 - hop;
      P.rect(2, y + 1 - hop * 2, 5, 3, p.wing); P.rect(9, y + 1 - hop * 2, 5, 3, p.wing);
      P.ellipse(8, y + 5, 4, 4, p.body); P.ellipse(8, y + 6, 2, 2, p.belly);
      P.rect(10, y - 1, 5, 4, p.body); P.px(13, y, '#140c1c'); P.px(11, y - 2, '#e0d0c0');
      P.rect(2, y + 7, 3, 1, p.body); P.rect(6, y + 9, 1, 2, p.body); P.rect(9, y + 9, 1, 2, p.body);
    } else if (p.style === 'golem') {
      const y = 5 - hop;
      P.rect(4, y + 3, 8, 7, p.body); P.rect(5, y, 6, 4, p.body); P.px(6, y + 1, p.eye); P.px(9, y + 1, p.eye);
      P.rect(2, y + 4, 2, 5, p.dark); P.rect(12, y + 4, 2, 5, p.dark); P.rect(5, y + 10, 2, 2, p.dark); P.rect(9, y + 10, 2, 2, p.dark);
      P.px(7, y + 6, '#60e0ff');
    }
  }
  function petSprite(id, f) { const p = PETS[id]; return G.sprite('pet|' + id + '|' + f, 16, 16, (c) => drawPet(G.painter(c), p, f), { outline: true }); }
  CP.petIcon = (id) => petSprite(id, 0);
  CP.mountIcon = (id) => mountSprite(id, 0, false);

  // ================================================================== pet entity
  let PetClass = null;
  function makePet() {
    if (PetClass) return PetClass;
    PetClass = class extends R.Entity {
      constructor(owner, id) { super(owner.x - 14, owner.y); this.owner = owner; this.pid = id; this.solid = false; this.r = 3; this.trail = []; this.t = Math.random() * 5; this.face = 1; this.isPet = true; }
      update(dt) {
        const o = this.owner; this.t += dt;
        if (!o || o.remove) { this.remove = true; return; }
        const d = U.dist(this.x, this.y, o.x, o.y);
        if (d > 260) { this.x = o.x - 12; this.y = o.y + 4; }
        const want = 18 + (o.riding || (o.peer && o.peer.s && o.peer.s.mo) ? 14 : 0);
        this.moving = d > want;
        if (this.moving) {
          const a = U.angle(this.x, this.y, o.x, o.y + 2), sp = Math.min(d * 3.2, 260);
          this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt;
          if (Math.abs(Math.cos(a)) > 0.2) this.face = Math.cos(a) > 0 ? 1 : -1;
        }
        const pd = PETS[this.pid];
        if (pd && pd.glow && Math.random() < dt * 5) FX.particle({ x: this.x + U.rand(-4, 4), y: this.y - U.rand(4, 12), vy: -10, life: 0.5, color: pd.glow, glow: true, size: 1 });
        // happy hearts now and then when you stand still
        if (!this.moving && o === R.World.player && Math.random() < dt * 0.08) FX.text(this.x, this.y - 18, '♥', '#ff80b0');
      }
      draw(ctx) {
        const pd = PETS[this.pid]; if (!pd) return;
        const f = this.moving ? Math.floor(this.t * 10) % 2 : Math.floor(this.t * 2) % 2 && pd.style === 'blob' ? 1 : 0;
        const spr = petSprite(this.pid, f);
        const fly = pd.style === 'bird' && pd.glow ? 6 + Math.sin(this.t * 4) * 2 : pd.ghost || pd.big ? 8 + Math.sin(this.t * 3) * 2 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(Math.round(this.x - 4), Math.round(this.y - 1), 8, 2);
        ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y - fly));
        if (this.face < 0) ctx.scale(-1, 1);
        ctx.drawImage(spr, -8, -15);
        ctx.restore();
      }
    };
    return PetClass;
  }
  // keep pet entities in sync with who is here and what pet they have out
  function syncPets() {
    const W = R.World; if (!W.map || !W.player) return;
    const Pet = makePet();
    const owners = [[W.player, W.player.pet]];
    if (R.Net && R.Net.active()) for (const q of R.Net.peers.values()) if (q.ent && !q.ent.remove && q.look) owners.push([q.ent, q.look.pt]);
    for (const [o, id] of owners) {
      const cur = W.entities.find((e) => e.isPet && e.owner === o && !e.remove);
      if (cur && cur.pid !== id) cur.remove = true;
      if (id && PETS[id] && (!cur || cur.pid !== id)) W.add(new Pet(o, id));
    }
    for (const e of W.entities) if (e.isPet && (!owners.some(([o]) => o === e.owner))) e.remove = true;
  }
  R.events.on('enter', () => { const p = R.World.player; if (p && p.riding && !R.World.def.outdoor) { p.air = false; CP.dismount(p, true); } syncPets(); });
  let syncT = 0;
  R.events.on('tick', (dt) => { syncT -= dt; if (syncT <= 0) { syncT = 0.5; syncPets(); } });

  // ================================================================== riding
  CP.canRide = (p) => R.World.def && R.World.def.outdoor;
  // Nearest spot where you can stand (for landing a flying mount).
  CP.landing = function (p) {
    const W = R.World;
    if (!W.collides(p.x, p.y, p.r)) return { x: p.x, y: p.y };
    for (let r = 8; r <= 120; r += 8) for (let a = 0; a < 16; a++) { const x = p.x + Math.cos(a / 16 * U.TAU) * r, y = p.y + Math.sin(a / 16 * U.TAU) * r; if (!W.collides(x, y, p.r)) return { x, y }; }
    return null;
  };
  CP.mountUp = function (p) {
    if (!p.mount || !MOUNTS[p.mount]) { R.UI.toast('You have no mount yet — visit the stable master in Havenbrook (N shows your stable).', 'bad'); return; }
    if (!CP.canRide(p)) { R.UI.toast('You can only ride outdoors.', 'bad'); return; }
    if (R.World.combatT > 0.5) { R.UI.toast("Can't mount up during a fight!", 'bad'); R.Audio.play('error'); return; }
    if (p.dead || p.rollT > 0) return;
    p.riding = true; p.air = !!MOUNTS[p.mount].fly; p.recalc();
    if (p.air) R.UI.toast('Up in the air! Fly over trees and rocks. (Press H over open ground to land.)', 'good');
    FX.burst(p.x, p.y - 6, { n: 20, colors: ['#e0d0b0', '#ffffff'], speed: 60, life: 0.5 });
    R.Audio.play('whoosh', { pitch: 0.8 }); R.Audio.play('step', { pitch: 0.6 });
  };
  CP.dismount = function (p, quiet) {
    if (!p.riding) return;
    if (p.air) {
      const spot = CP.landing(p);
      if (!spot) { if (!quiet) R.UI.toast('Nowhere to land here. Fly over open ground first.', 'bad'); return false; }
      p.x = spot.x; p.y = spot.y;
    }
    p.riding = false; p.air = false; p.recalc();
    if (!quiet) { FX.burst(p.x, p.y - 6, { n: 14, colors: ['#e0d0b0', '#ffffff'], speed: 50, life: 0.4 }); R.Audio.play('step', { pitch: 0.8 }); }
  };
  CP.speed = (p) => (p.riding && MOUNTS[p.mount] ? MOUNTS[p.mount].spd : 1);
  R.Input.bindings.mount = ['KeyH'];
  R.Input.bindings.stable = ['KeyN'];
  window.addEventListener('keydown', (e) => {
    if (R.state !== 'play' || R.UI.dialogOpen || (e.target && e.target.tagName === 'INPUT')) return;
    const p = R.World.player; if (!p || p.dead) return;
    if (R.Input.bindings.mount.includes(e.code) && !R.UI.current) { if (p.riding) CP.dismount(p); else CP.mountUp(p); }
    if (R.Input.bindings.stable.includes(e.code) && (!R.UI.current || R.UI.current === 'stable')) R.UI.toggle('stable');
  });

  // ================================================================== mount abilities (Space while riding)
  const C = R.Combat;
  const burst = (p, col) => FX.burst(p.x, p.y - 4, { n: 16, colors: [col, '#ffffff'], speed: 60, life: 0.5 });
  const dashTo = (p, a, dist, steps, each) => { for (let i = 0; i < steps; i++) R.World.later(i * 0.03, () => { R.World.moveEntity(p, Math.cos(a) * dist / steps, Math.sin(a) * dist / steps); if (each) each(i); }); };
  const hurt = (p, x, y, r, mult, o) => C.hitCircle(x, y, r, 'player', (e) => { const rr = C.roll(p, mult); C.damage(e, rr.dmg, Object.assign({ source: p, crit: rr.crit, angle: U.angle(p.x, p.y, e.x, e.y) }, o || {})); });
  const aimOf = (p) => (Math.hypot(p.vx, p.vy) > 5 ? Math.atan2(p.vy, p.vx) : p.aim);
  const ABIL = CP.ABILITIES = {
    horse: { name: 'Gallop', cd: 8, desc: 'A burst of speed for 3 seconds.', fn: (p) => { p.addBuff('spd', 0.5, 3, false, 'Gallop'); burst(p, '#e0d0b0'); R.Audio.play('whoosh'); } },
    warhorse: { name: 'Trample', cd: 10, desc: 'Charge forward, knocking enemies aside.', fn: (p) => { const a = aimOf(p); p.invuln = Math.max(p.invuln, 0.4); dashTo(p, a, 110, 10, (i) => { if (i % 3 === 0) hurt(p, p.x, p.y, 22, 1.4, { knock: 260 }); }); R.Audio.play('bossRoar', { pitch: 1.8 }); } },
    wolf: { name: 'Howl', cd: 14, desc: 'Terrify nearby enemies (they flee and are slowed) and gain +20% attack.', fn: (p) => { C.hitCircle(p.x, p.y, 110, 'player', (e) => C.applyStatus(e, { slow: { amt: 0.6, dur: 4 }, stun: { dur: 0.8 } })); p.addBuff('atk', 0.2, 10, true, 'Howl'); FX.ring(p.x, p.y, 4, 110, '#c0c0d0', 0.6, 4); R.Audio.play('bossRoar', { pitch: 1.3 }); } },
    crab: { name: 'Shell Bash', cd: 9, desc: 'Scuttle sideways at speed, bashing anything in the way.', fn: (p) => { const a = aimOf(p) + Math.PI / 2; p.invuln = Math.max(p.invuln, 0.4); dashTo(p, a, 90, 9, (i) => { if (i % 3 === 0) hurt(p, p.x, p.y, 22, 1.1, { knock: 220 }); }); R.Audio.play('hit', { pitch: 0.6 }); } },
    raptor: { name: 'Pounce', cd: 9, desc: 'Leap at the cursor and rake whatever you land on.', fn: (p) => { const a = p.aim; p.invuln = Math.max(p.invuln, 0.5); dashTo(p, a, 130, 10); R.World.later(0.32, () => { hurt(p, p.x, p.y, 34, 1.8, { knock: 120, status: { bleed: { dps: 8 + p.level, dur: 3 } } }); FX.slash(p.x, p.y - 8, a, 2.4, 30, '#ff6040', 0.2, 6); }); R.Audio.play('swing', { pitch: 0.7 }); } },
    elk: { name: 'Frost Stomp', cd: 12, desc: 'Freeze the ground around you.', fn: (p) => { if (FX.bfx) FX.bfx('spikes', p.x, p.y, '#c0f0ff', 22, 8); hurt(p, p.x, p.y, 70, 1.2, { status: { freeze: { dur: 1.5 } } }); FX.ring(p.x, p.y, 4, 70, '#a0e8ff', 0.5, 4); R.Audio.play('ice'); FX.shake(3, 0.2); } },
    unicorn: { name: 'Rainbow Blessing', cd: 25, desc: 'Heal yourself (and nearby friends) for 30% health.', fn: (p) => { C.heal(p, p.stats.maxHp * 0.3); FX.pillar(p.x, p.y, '#ffb0ff', 1.2, 18); FX.burst(p.x, p.y - 10, { n: 40, colors: ['#ff8080', '#ffd080', '#80ff80', '#80c0ff', '#c080ff'], speed: 70, life: 1, glow: true }); R.Audio.play('heal'); } },
    nightmare: { name: 'Hellfire Trail', cd: 12, desc: 'Your hooves burn the ground for 4 seconds; enemies in the flames burn.', fn: (p) => { for (let i = 0; i < 16; i++) R.World.later(i * 0.25, () => { if (!p.riding) return; const x = p.x, y = p.y; if (FX.bfx) FX.bfx('cloud', x, y, 12, '#ff5010', 2); for (let k = 0; k < 4; k++) R.World.later(k * 0.5, () => hurt(p, x, y, 14, 0.25, { status: { burn: { dps: 6 + p.level, dur: 2 } }, noText: true })); }); R.Audio.play('fire'); } },
    chicken: { name: 'Egg Barrage', cd: 8, desc: 'Lay a volley of exploding eggs behind you. (Why do they explode? Nobody knows.)', fn: (p) => { for (let i = 0; i < 5; i++) R.World.later(i * 0.1, () => { const a = p.aim + (i - 2) * 0.3, rr = C.roll(p, 0.9); C.projectile({ x: p.x, y: p.y - 6, z: 8, angle: a, speed: 160, dmg: 0, team: 'player', kind: 'orb', r: 4, size: 4, life: 0.6, color: '#fff8e8', source: p, onHit(pr) { pr.expire(); return false; }, onExpire(pr) { C.explode(pr.x, pr.y, 22, rr.dmg, 'player', { color: '#ffe080', source: p }); } }); }); R.Audio.play('talk', { pitch: 2 }); FX.text(p.x, p.y - 30, 'BAWK!', '#fff4c0'); } },
    gryphon: { name: 'Dive Bomb', cd: 9, desc: 'Swoop down on the cursor, slamming enemies below.', fn: (p) => { const t = { x: R.Input.mouse.x, y: R.Input.mouse.y }, d = Math.min(150, U.dist(p.x, p.y, t.x, t.y)), a = U.angle(p.x, p.y, t.x, t.y); dashTo(p, a, d, 8); R.World.later(0.26, () => { hurt(p, p.x, p.y, 44, 1.9, { knock: 220 }); FX.shake(5, 0.25); if (FX.bfx) FX.bfx('wavering', p.x, p.y, 8, 60, '#e0c080', 0.4); }); R.Audio.play('whoosh', { pitch: 0.8 }); } },
    drake: { name: 'Fire Breath', cd: 10, desc: 'Breathe a cone of fire in front of you.', fn: (p) => { const a = p.aim; for (let i = 0; i < 10; i++) R.World.later(i * 0.06, () => { const ang = a + U.rand(-0.35, 0.35); C.projectile({ x: p.x + Math.cos(ang) * 12, y: p.y - 14, z: 12, angle: ang, speed: 220, dmg: C.roll(p, 0.45).dmg, team: 'player', kind: 'fireball', r: 4, size: 4, life: 0.5, source: p, status: { burn: { dps: 5 + p.level, dur: 2 } } }); }); R.Audio.play('fire', { pitch: 0.7 }); } },
    voidsteed: { name: 'Void Step', cd: 7, desc: 'Blink forward through space.', fn: (p) => { const a = aimOf(p); burst(p, '#c080ff'); for (let d = 150; d > 20; d -= 10) { const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (!R.World.collides(x, y, 5)) { p.x = x; p.y = y; break; } } burst(p, '#c080ff'); p.invuln = Math.max(p.invuln, 0.3); R.Audio.play('portal', { pitch: 1.7 }); } },
  };
  CP.useAbility = function (p) {
    const ab = ABIL[p.mount]; if (!ab) return;
    p.mountCd = p.mountCd || {};
    const left = (p.mountCd[p.mount] || 0) - (R.playtime || 0);
    if (left > 0) { FX.text(p.x, p.y - 34, left.toFixed(1) + 's', '#c0c0d0'); return; }
    p.mountCd[p.mount] = (R.playtime || 0) + ab.cd;
    ab.fn(p);
    R.events.emit('mountAbility', { id: p.mount });
  };

  // Player hooks: speed, getting knocked off, drawing
  const Pl = R.Player.prototype;
  const origUpdate = Pl.update;
  Pl.update = function (dt) {
    if (this.riding && !this.dead && !R.UI.blocking() && !R.World.cutscene) {
      if (Input.hit('dodge')) { Input.pressed.delete('Space'); this.dodgeBuf = 0; CP.useAbility(this); }
      let act = Input.hit('heavy') || (Input.held('attack') && !R.UI.pointerOverUI);
      for (let i = 0; i < 4; i++) if (Input.hit('skill' + (i + 1))) act = true;
      if (act && CP.dismount(this) === false) this.atkCd = Math.max(this.atkCd, 0.2); // can't land here: no attacking from the air
    }
    return origUpdate.call(this, dt);
  };
  const origRoll = Pl.roll;
  Pl.roll = function (a) { if (this.riding) return; return origRoll.call(this, a); };
  const origDraw = Pl.draw;
  Pl.draw = function (ctx) {
    if (!this.riding || this.dead || !MOUNTS[this.mount]) return origDraw.call(this, ctx);
    if (Math.hypot(this.vx, this.vy) > 10) this.dir = Math.abs(this.vx) > Math.abs(this.vy) * 1.2 ? (this.vx > 0 ? 'right' : 'left') : (this.vy > 0 ? 'down' : 'up');
    const face = this.facingSide = this.dir === 'left' ? 'left' : this.dir === 'right' ? 'right' : (this.facingSide || 'right');
    const moving = Math.hypot(this.vx, this.vy) > 10;
    const a = this.appearance, gear = this.gear();
    const rdir = this.dir === 'up' || this.dir === 'down' ? this.dir : face;
    CP.drawRiding(ctx, this.x, this.y, this.mount, rdir, moving, this.animT, (oy, d) => R.Character.draw(ctx, this.x, this.y + oy, a, gear, d, 'idle', 0, { flash: this.flash > 0 ? '#ffffff' : null }));
  };
  // the stats recalc applies riding speed
  const compute = R.Stats.compute;
  R.Stats.compute = function (pl) { const s = compute.call(this, pl); if (pl.riding && MOUNTS[pl.mount]) s.spd = s.spd * MOUNTS[pl.mount].spd; return s; };
  // getting hit knocks you out of the saddle
  const dmg = R.Combat.damage;
  R.Combat.damage = function (t, amount) { if (t && t.riding && !t.air && amount > 0 && t === R.World.player) CP.dismount(t); return dmg.apply(this, arguments); };
  // remote players: draw their mount too
  if (R.RemotePlayer) {
    const rd = R.RemotePlayer.prototype.draw;
    R.RemotePlayer.prototype.draw = function (ctx) {
      const L = this.peer.look, s = this.peer.s;
      if (!L || !s || !s.mo || !L.mt || !MOUNTS[L.mt] || this.dead) return rd.call(this, ctx);
      const face = this.dir === 'left' ? 'left' : this.dir === 'right' ? 'right' : (this.face0 || 'right'); this.face0 = face;
      const rdir = this.dir === 'up' || this.dir === 'down' ? this.dir : face;
      CP.drawRiding(ctx, this.x, this.y, L.mt, rdir, Math.hypot(s.vx, s.vy) > 10, this.animT, (oy, d) => R.Character.draw(ctx, this.x, this.y + oy, L.a, L.g || {}, d, 'idle', 0));
    };
  }

  // ================================================================== collecting
  CP.give = function (p, kind, id, quiet) {
    const list = kind === 'mount' ? (p.mounts = p.mounts || []) : (p.pets = p.pets || []);
    if (list.includes(id)) return false;
    list.push(id);
    if (kind === 'mount' && !p.mount) p.mount = id;
    if (kind === 'pet' && !p.pet) p.pet = id;
    if (!quiet) {
      const d = (kind === 'mount' ? MOUNTS : PETS)[id];
      R.UI.banner(kind === 'mount' ? 'NEW MOUNT!' : 'NEW PET!', d.name + (kind === 'mount' ? ' — press H to ride' : ' — press N to choose your pet'));
      R.Audio.play('levelup', { pitch: 1.3 }); FX.pillar(p.x, p.y, '#ffd040', 1, 14);
    }
    return true;
  };
  // boss drops
  R.events.on('kill', (ev) => {
    if (!ev || !ev.boss) return;
    const p = R.World.player; if (!p) return;
    for (const [id, m] of Object.entries(MOUNTS)) if (m.drop && m.drop[0] === ev.enemy && Math.random() < m.drop[1]) CP.give(p, 'mount', id);
    for (const [id, m] of Object.entries(PETS)) if (m.drop && m.drop[0] === ev.enemy && Math.random() < m.drop[1]) CP.give(p, 'pet', id);
  });
  R.events.on('gauntlet:win', (ev) => { const p = R.World.player; if (ev.wins >= 1) CP.give(p, 'mount', 'wolf'); if (ev.wins >= 3) CP.give(p, 'pet', 'golem'); });
  // secrets: survive the hens' wrath three times; befriend the duck
  R.events.on('tick', () => {
    const W = R.World, p = W.player; if (!p || !W.flags) return;
    if (W.flags.duckGiven && !(p.pets || []).includes('duckling')) CP.give(p, 'pet', 'duckling');
    if ((W.flags.henWraths || 0) >= 3 && !(p.mounts || []).includes('chicken')) CP.give(p, 'mount', 'chicken');
  });

  // ================================================================== stable master (Havenbrook)
  R.addNPC({ id: 'stablemaster', name: 'Rosa Hayfield', title: 'Stable Master',
    appearance: { body: 'b', skin: '#e8b088', hair: 'braids', hairColor: '#a05a20', eyes: '#3a7a3a', beard: 'none', outfit: '#6a8a3a', outfit2: '#d8c8a0' },
    gear: { chest: { style: 'leather', color: '#6a4a2a', trim: '#d8c8a0' } },
    lines: ['Every hero needs a good horse. And a puppy. Mostly the puppy.', 'Brush them, feed them, talk to them. They listen better than people.', 'That wolf of yours bit my fence again.'],
    extraChoices: () => [{ text: 'Show me your animals.', fn: () => { R.World.later(0, () => R.UI.open('stable', { shop: true })); return 'close'; } }],
  });
  const town = R.Maps.town;
  if (town) {
    const orig = town.build;
    town.build = function (M) {
      orig.call(this, M);
      const pt = M.points.arena; if (!pt) return;
      const x = Math.floor(pt.x / 16) + 12, y = Math.floor(pt.y / 16) - 2;
      if (R.Ext) R.Ext.clearProps(M, x - 5, y - 5, 11, 10);
      M.rect(x - 4, y - 2, 9, 6, 'dirt');
      for (let i = x - 4; i <= x + 4; i++) { M.prop('fence', i, y - 3); M.prop('fence', i, y + 4); }
      M.prop('haystack', x + 3, y - 1); M.prop('cart', x - 3, y + 2); M.prop('hut', x, y - 4, 0);
      M.npc('stablemaster', x - 1, y + 1);
      M.sign(x + 5, y + 3, "Rosa's Stable\nMounts & pets for sale.\n(H: ride · N: your stable)");
      M.path([[x, y + 4], [x - 10, y + 6]], 'path', 2);
    };
  }

  // ================================================================== stable screen
  const UI = R.UI, el = UI.el;
  UI.screens.stable = {
    build(m, arg) {
      const p = R.World.player, shop = arg && arg.shop;
      const body = UI.frame(m, shop ? "Rosa's Stable" : 'Your Stable', 'stable-frame');
      for (const [kind, table] of [['mount', MOUNTS], ['pet', PETS]]) {
        const owned = kind === 'mount' ? (p.mounts || []) : (p.pets || []);
        const active = kind === 'mount' ? p.mount : p.pet;
        el('div', 'sec-title', `${kind === 'mount' ? 'Mounts' : 'Pets'} <small>${owned.length} / ${Object.keys(table).length} collected</small>`, body);
        const grid = el('div', 'stb-grid', null, body);
        for (const [id, d] of Object.entries(table)) {
          const has = owned.includes(id);
          const c = el('div', 'stb-card' + (has ? '' : ' missing') + (active === id ? ' active' : ''), null, grid);
          const icon = kind === 'mount' ? CP.mountIcon(id) : CP.petIcon(id);
          c.appendChild(UI.pix(icon, kind === 'mount' ? 2 : 3));
          el('div', 'stb-name', `${has || d.price ? U.esc(d.name) : '???'}${kind === 'mount' ? `<small>+${Math.round((d.spd - 1) * 100)}% speed${ABIL[id] ? ' · ' + ABIL[id].name : ''}</small>` : ''}`, c);
          if (kind === 'mount' && ABIL[id]) UI.bindTip(c, () => `<div class="tt-name">${U.esc(d.name)}</div><div class="tt-line">+${Math.round((d.spd - 1) * 100)}% move speed</div><div class="tt-ench" style="color:#ffd040">Space: ${U.esc(ABIL[id].name)}</div><div class="tt-desc">${U.esc(ABIL[id].desc)} (${ABIL[id].cd}s cooldown)</div><div class="tt-line dim">${U.esc(d.from)}</div>`);
          if (has) {
            if (active === id) el('div', 'stb-tag', kind === 'mount' ? '✓ Riding this one' : '✓ Following you', c);
            else UI.button(c, kind === 'mount' ? 'Choose' : 'Take along', () => {
              if (kind === 'mount') {
                const was = p.riding;
                if (was && CP.dismount(p, true) === false) { UI.toast('Land on open ground first, then switch mounts.', 'bad'); return; }
                p.mount = id; if (was) CP.mountUp(p);
              } else p.pet = id;
              R.Audio.play('equip'); UI.refresh();
            }, 'small');
            if (kind === 'pet' && active === id) UI.button(c, 'Send home', () => { p.pet = null; UI.refresh(); }, 'small');
          } else if (shop && d.price) {
            const ok = p.level >= (d.level || 1);
            UI.button(c, ok ? `Buy <small><span class="coin"></span>${d.price}</small>` : `Level ${d.level}`, () => {
              if (!ok) return;
              if (p.gold < d.price) { UI.toast('Not enough gold', 'bad'); R.Audio.play('error'); return; }
              p.gold -= d.price; CP.give(p, kind, id); if (kind === 'mount') p.mount = id; else p.pet = id; R.Audio.play('buy'); UI.refresh();
            }, ok && p.gold >= d.price ? 'primary small' : 'small');
          } else el('div', 'stb-tag dim', U.esc(d.from), c);
        }
      }
      el('div', 'hint', 'H: mount up / dismount (outdoors, out of combat). Attacking, dodging or getting hit knocks you off. Pets follow you and fetch nearby loot.', body);
      el('div', 'bag-foot', `<span class="coin"></span> ${U.fmt(p.gold)} gold`, body);
    },
  };
  // pets fetch loot from further away
  const PK = R.Pickup && R.Pickup.prototype, pkUpdate = PK && PK.update;
  if (PK) PK.update = function (dt) {
    pkUpdate.call(this, dt);
    const p = R.World.player;
    if (!p || !p.pet || p.dead || this.remove || this.age < 0.45) return;
    const d = U.dist(p.x, p.y - 6, this.x, this.y);
    if (d >= 36 && d < 90) { const a = U.angle(this.x, this.y, p.x, p.y - 6); this.x += Math.cos(a) * 140 * dt; this.y += Math.sin(a) * 140 * dt; }
  };
})(window.RPG);
