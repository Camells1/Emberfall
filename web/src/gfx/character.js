'use strict';
// Layered humanoid renderer used by the player AND by every human NPC.
// A character is drawn from an `appearance` plus a `gear` object of item looks, in
// 4 facings and several animations, into a cached 32x40 canvas, then outlined.
//
//   RPG.Character.sprite(appearance, gear, dir, anim, frame) -> canvas (32x40)
//      anchor: feet at (16, 37) of the canvas
//   RPG.Character.draw(ctx, x, y, appearance, gear, dir, anim, frame, opts)
//      draws with feet at world (x, y). opts: {flash, alpha, rot, sx, sy (squash/stretch)}
//
// appearance: {body:'a'|'b'|'c'|'d', skin, hair (style id), hairColor, eyes, eyeStyle, beard, beardColor?,
//              ears, horns, hornColor, face, faceColor, accessory, accColor, outfit, outfit2}
//   Every key but body/skin/hair is optional; C.norm() fills in defaults so old saves keep working.
// gear: { head, chest, legs, feet, hands, cape, offhand }  -> each is an item `look` or undefined
//   look = { style, color, trim, glow?, accent? }
// dir: 'down' | 'up' | 'left' | 'right'
// anim / frame counts (C.FRAMES): idle 8, walk 6, run 6, attack 3, cast 2, hurt 1, roll 1, dead 1
(function (R) {
  const U = R.U, G = R.G;
  const C = R.Character = {};
  const W = 32, H = 40, FX0 = 16, FY0 = 37, OY = 4; // everything is drawn 4px lower than the old 36px layout
  C.W = W; C.H = H; C.ANCHOR_X = FX0; C.ANCHOR_Y = FY0;
  C.FRAMES = { idle: 8, walk: 6, run: 6, attack: 3, cast: 2, hurt: 1, roll: 1, dead: 1 };

  // ---- customisation options (used by the character creator and the stylist) ------------
  C.SKINS = [
    '#ffe8d6', '#fde0c5', '#f5c9a0', '#eab58c', '#d9a07a', '#c98e62', '#a36a44', '#8a5634', '#6e4028', '#553222', '#3e2418',
    '#f0f4ff', '#9fd4a8', '#6fae6a', '#a9b8e8', '#6f8fd8', '#d8a8e0', '#b06ab8', '#e07060', '#b8b8c0', '#6a6a78', '#e8c050',
  ];
  C.NATURAL_SKINS = 11;
  C.HAIR_COLORS = ['#1b1b2e', '#2a1d18', '#4a2e1f', '#7a4b2a', '#b5773c', '#e0b55f', '#f2e2a6', '#ffffff', '#d8d8d8', '#6a6a72', '#9a2b2b', '#ff4060', '#e05a2a', '#ff8ac0', '#b04fc0', '#7040ff', '#3b5bb5', '#40e0d0', '#46a15b', '#a0e060'];
  C.EYE_COLORS = ['#2b4f8a', '#40c0d0', '#3a7a3a', '#40ff80', '#6b4020', '#202020', '#d4a017', '#ff8020', '#c03030', '#ff40c0', '#8a2be2', '#e8e8f0'];
  C.OUTFIT_COLORS = ['#6b4a2b', '#8a7a4a', '#b06030', '#7a2e2e', '#a0304a', '#5a3a7a', '#3a5a8c', '#2a6a6a', '#2e6b3a', '#5a6a2a', '#3a3a3a', '#c0c0c0', '#e0d8c0', '#1a1a2a'];
  C.TRIM_COLORS = ['#d8c8a0', '#e0e0e0', '#a08060', '#303030', '#d8b040', '#c03030', '#4080e0', '#40a060', '#b070ff'];
  C.HORN_COLORS = ['#e8e0c8', '#a09080', '#3a3040', '#1a1a1a', '#d8b040', '#c03030', '#80d0ff'];
  C.MARK_COLORS = ['#c03030', '#3050c0', '#202020', '#ffffff', '#40c060', '#d8b040', '#b040c0', '#40d0e0'];
  C.ACC_COLORS = ['#d8b040', '#c0c0d0', '#c03030', '#3a78ff', '#40c060', '#ff80c0', '#202020'];
  C.HAIR_STYLES = [
    { id: 'short', name: 'Short' }, { id: 'buzz', name: 'Buzz Cut' }, { id: 'spiky', name: 'Spiky' }, { id: 'swept', name: 'Swept' },
    { id: 'sidecut', name: 'Undercut' }, { id: 'mohawk', name: 'Mohawk' }, { id: 'bob', name: 'Bob' }, { id: 'curly', name: 'Curly' },
    { id: 'afro', name: 'Afro' }, { id: 'long', name: 'Long' }, { id: 'ponytail', name: 'Ponytail' }, { id: 'pigtails', name: 'Pigtails' },
    { id: 'braids', name: 'Braids' }, { id: 'dreads', name: 'Dreadlocks' }, { id: 'bun', name: 'Bun' }, { id: 'topknot', name: 'Topknot' },
    { id: 'wild', name: 'Wild' }, { id: 'bald', name: 'Bald' },
  ];
  C.BEARDS = [{ id: 'none', name: 'None' }, { id: 'stubble', name: 'Stubble' }, { id: 'mustache', name: 'Mustache' }, { id: 'goatee', name: 'Goatee' }, { id: 'sideburns', name: 'Sideburns' }, { id: 'full', name: 'Full' }, { id: 'braided', name: 'Braided' }, { id: 'long', name: 'Long' }];
  C.BODIES = [{ id: 'a', name: 'Broad' }, { id: 'b', name: 'Slim' }, { id: 'c', name: 'Stocky' }, { id: 'd', name: 'Tall' }];
  C.EYE_STYLES = [{ id: 'normal', name: 'Normal' }, { id: 'lashes', name: 'Lashes' }, { id: 'narrow', name: 'Narrow' }, { id: 'wide', name: 'Wide' }, { id: 'sleepy', name: 'Sleepy' }, { id: 'glow', name: 'Glowing' }, { id: 'slit', name: 'Reptile' }];
  C.EARS = [{ id: 'human', name: 'Human' }, { id: 'pointed', name: 'Pointed' }, { id: 'long', name: 'Elven' }, { id: 'beast', name: 'Beast' }];
  C.HORNS = [{ id: 'none', name: 'None' }, { id: 'nubs', name: 'Nubs' }, { id: 'ram', name: 'Ram' }, { id: 'demon', name: 'Demon' }, { id: 'dragon', name: 'Dragon' }, { id: 'antlers', name: 'Antlers' }, { id: 'unicorn', name: 'Unicorn' }];
  C.FACES = [{ id: 'none', name: 'None' }, { id: 'tusks', name: 'Tusks' }, { id: 'scales', name: 'Scales' }, { id: 'freckles', name: 'Freckles' }, { id: 'blush', name: 'Blush' }, { id: 'scar', name: 'Scar' }, { id: 'warpaint', name: 'War Paint' }, { id: 'stripes', name: 'Stripes' }, { id: 'tattoo', name: 'Rune Tattoo' }, { id: 'eyepatch', name: 'Eyepatch' }];
  C.ACCESSORIES = [{ id: 'none', name: 'None' }, { id: 'earrings', name: 'Earrings' }, { id: 'glasses', name: 'Glasses' }, { id: 'monocle', name: 'Monocle' }, { id: 'flower', name: 'Flower' }, { id: 'headband', name: 'Headband' }, { id: 'necklace', name: 'Necklace' }, { id: 'scarf', name: 'Scarf' }];

  const DEFAULTS = { body: 'a', skin: '#f5c9a0', hair: 'short', hairColor: '#7a4b2a', eyes: '#2b4f8a', eyeStyle: 'normal', beard: 'none', ears: 'human', horns: 'none', hornColor: '#e8e0c8', face: 'none', faceColor: '#c03030', accessory: 'none', accColor: '#d8b040', outfit: '#6b4a2b', outfit2: '#d8c8a0' };
  // Fill in any missing keys (old saves, NPC definitions).
  C.norm = function (a) {
    if (!a) return Object.assign({}, DEFAULTS);
    if (a.__norm) return a;
    const n = Object.assign({}, DEFAULTS, a);
    if (!a.eyeStyle && a.body === 'b') n.eyeStyle = 'lashes'; // slim bodies used to always have lashes
    if (!C.BODIES.some((b) => b.id === n.body)) n.body = 'a';
    try { Object.defineProperty(n, '__norm', { value: true, enumerable: false }); } catch (e) { /* ignore */ }
    return n;
  };
  C.defaultAppearance = function () { return Object.assign({}, DEFAULTS); };
  C.randomAppearance = function (rng) {
    const r = rng || Math.random;
    const pick = (a) => a[Math.floor(r() * a.length)];
    const rare = (p, list, dflt) => (r() < p ? pick(list).id : dflt);
    const hair = pick(C.HAIR_STYLES).id;
    return {
      body: pick(['a', 'b', 'a', 'b', 'c', 'd']), skin: pick(C.SKINS.slice(0, C.NATURAL_SKINS)), hair, hairColor: pick(C.HAIR_COLORS.slice(0, 11)),
      eyes: pick(C.EYE_COLORS.slice(0, 8)), eyeStyle: rare(0.35, C.EYE_STYLES.slice(1, 5), 'normal'), beard: r() < 0.3 ? pick(C.BEARDS).id : 'none',
      ears: rare(0.12, C.EARS.slice(1, 3), 'human'), horns: 'none', hornColor: C.HORN_COLORS[0],
      face: rare(0.25, C.FACES.slice(2, 6), 'none'), faceColor: pick(C.MARK_COLORS), accessory: rare(0.2, C.ACCESSORIES.slice(1), 'none'), accColor: pick(C.ACC_COLORS),
      outfit: pick(C.OUTFIT_COLORS), outfit2: pick(['#d8c8a0', '#e0e0e0', '#a08060', '#303030']),
    };
  };
  // A random look for the "Randomize" button: anything goes, including fantasy options.
  C.wildAppearance = function () {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const a = C.randomAppearance();
    a.skin = Math.random() < 0.3 ? pick(C.SKINS.slice(C.NATURAL_SKINS)) : a.skin;
    a.hairColor = pick(C.HAIR_COLORS); a.eyes = pick(C.EYE_COLORS);
    if (Math.random() < 0.25) a.ears = pick(C.EARS).id;
    if (Math.random() < 0.2) { a.horns = pick(C.HORNS.slice(1)).id; a.hornColor = pick(C.HORN_COLORS); }
    return a;
  };

  function key(o) { return o ? [o.style, o.color, o.trim, o.glow || '', o.accent || ''].join(',') : '-'; }
  function aKey(a) { return [a.body, a.skin, a.hair, a.hairColor, a.eyes, a.eyeStyle, a.beard, a.beardColor || '', a.ears, a.horns, a.hornColor, a.face, a.faceColor, a.accessory, a.accColor, a.outfit, a.outfit2].join(','); }
  C.appearanceKey = aKey;

  // Body proportions per build.
  function metrics(a) {
    const b = a.body;
    return {
      tw: b === 'b' ? 8 : b === 'c' ? 12 : 10,   // torso width facing the camera
      sw: b === 'c' ? 8 : 7,                    // torso width in profile
      lift: b === 'd' ? 2 : b === 'c' ? -1 : 0, // longer legs lift the whole upper body
      legW: b === 'c' ? 4 : 3,
      waist: b === 'b',
    };
  }

  // ---- pose: per-frame offsets ---------------------------------------------
  // bob: body y offset; legL/legR: foot lift (front view); stride: leg spread (side view);
  // armL/armR: arm swing; armsUp: raised arms (cast); lean: forward (+) / back (-) lean;
  // sway: cape/hair drift; tuck: roll crouch; blink: eyes closed
  function pose(anim, frame) {
    const p = { bob: 0, legL: 0, legR: 0, armL: 0, armR: 0, stride: 0, armsUp: 0, lean: 0, sway: 0, tuck: 0, blink: false, reach: 0 };
    if (anim === 'walk' || anim === 'run') {
      const run = anim === 'run';
      const f = frame % 6, s = Math.sin(f / 6 * U.TAU);
      const amp = run ? 3 : 2;
      p.stride = Math.round(s * amp);
      p.legL = s > 0.3 ? -Math.round(s * amp) : 0;
      p.legR = s < -0.3 ? -Math.round(-s * amp) : 0;
      p.armL = Math.round(s * (run ? 2.4 : 1.5)); p.armR = -p.armL;
      p.bob = f % 3 === 0 ? -1 : 0;
      p.sway = run ? 2 : 1;
      if (run) p.lean = 1;
    } else if (anim === 'idle') {
      const f = frame % 8;
      p.bob = [0, 0, 0, 1, 1, 1, 1, 0][f];
      p.blink = f === 6;
    } else if (anim === 'attack') {
      const f = frame % 3;
      p.lean = [-1, 1, 0][f]; p.armR = [-3, 2, 1][f]; p.armL = [1, -1, 0][f];
      p.legL = f === 1 ? -1 : 0; p.stride = [-1, 2, 1][f]; p.reach = [0, 2, 1][f]; p.bob = f === 1 ? 0 : f === 0 ? 1 : 0;
      p.sway = f === 1 ? 2 : 0;
    } else if (anim === 'cast') {
      p.armsUp = frame === 0 ? 3 : 5; p.bob = frame === 1 ? -1 : 0;
    } else if (anim === 'hurt') {
      p.lean = -1; p.bob = 1; p.armL = -2; p.armR = -2; p.blink = true; p.sway = -1;
    } else if (anim === 'roll') {
      p.tuck = 3; p.bob = 3; p.armL = -1; p.armR = -1;
    }
    return p;
  }
  C.pose = pose;

  // ---- body parts ------------------------------------------------------------
  // All coordinates are for the 36px layout (the canvas is translated by OY).
  // Layout facing down: head 10x9 at y 7..15, torso y 16..23, legs y 24..32.

  function drawHairBack(P, a, dir, y0, p) {
    const c = a.hairColor, d = U.shade(c, -0.3);
    const y = y0;
    const sw = p.sway;
    const h = a.hair;
    if (h === 'long' || h === 'braids' || h === 'dreads') {
      if (dir === 'up') { P.rect(10, 9 + y, 12, 14, c); P.rect(10, 20 + y, 12, 3, d); }
      else if (dir === 'down') { P.rect(10, 10 + y, 12, 12, d); }
      else { const bx = dir === 'right' ? 10 - Math.min(1, sw) : 14 + Math.min(1, sw); P.rect(bx, 9 + y, 8, 13, d); }
    }
    if (h === 'afro') {
      if (dir === 'up') P.ellipse(16, 11 + y, 8, 7, c);
      else if (dir === 'down') P.ellipse(16, 10 + y, 8, 7, d);
      else P.ellipse(dir === 'right' ? 14 : 18, 10 + y, 7, 7, d);
    }
    if (h === 'curly') { if (dir === 'down') P.rect(10, 10 + y, 12, 6, d); }
    if (h === 'ponytail') {
      const s = dir === 'left' ? sw : dir === 'right' ? -sw : 0;
      if (dir === 'up') { P.rect(14, 12 + y, 4, 10, c); P.rect(15, 21 + y, 2, 2, d); }
      else if (dir === 'left') { P.rect(20, 10 + y, 3, 3, c); P.rect(21 + s, 13 + y, 3, 8, c); P.rect(21 + s, 20 + y, 3, 1, d); }
      else if (dir === 'right') { P.rect(9, 10 + y, 3, 3, c); P.rect(8 + s, 13 + y, 3, 8, c); P.rect(8 + s, 20 + y, 3, 1, d); }
    }
    if (h === 'pigtails' && dir === 'up') { P.rect(8, 11 + y, 3, 8, c); P.rect(21, 11 + y, 3, 8, c); }
  }

  // Ears poke out from the head's sides (drawn before the head so the face covers the base).
  function drawEars(P, a, dir, y, helm) {
    const e = a.ears;
    if (!e || e === 'human' || e === 'beast') return;
    const s = a.skin, sd = U.shade(s, -0.2);
    const long = e === 'long';
    if (helm && !['circlet', 'crown', 'bandana', 'cap'].includes(helm.style)) return;
    if (dir === 'down' || dir === 'up') {
      P.rect(9, y + 4, 2, 2, s); P.rect(21, y + 4, 2, 2, s);
      P.px(8, y + 3, s); P.px(23, y + 3, s);
      if (long) { P.px(7, y + 2, s); P.px(24, y + 2, s); P.px(6, y + 1, sd); P.px(25, y + 1, sd); }
      P.px(10, y + 5, sd); P.px(21, y + 5, sd);
    } else {
      const fx = dir === 'right';
      const ex = fx ? 13 : 18;
      P.rect(ex, y + 4, 2, 3, s); P.px(fx ? ex - 1 : ex + 2, y + 3, s);
      if (long) { P.px(fx ? ex - 2 : ex + 3, y + 2, s); P.px(fx ? ex - 3 : ex + 4, y + 1, sd); }
      P.px(fx ? ex : ex + 1, y + 5, sd);
    }
  }

  function drawEyes(P, a, dir, y, p) {
    const s = a.skin, ec = a.eyes, st = a.eyeStyle || 'normal';
    const closed = p.blink || st === 'sleepy';
    const lid = U.shade(s, -0.35);
    const eye = (x, side) => {
      if (closed) { P.rect(x, y + 6, 2, 1, lid); if (st === 'sleepy' && !p.blink) P.px(side ? x + 1 : x, y + 5, ec); return; }
      if (st === 'glow') { P.rect(x, y + 5, 2, 2, ec); P.px(side ? x + 1 : x, y + 5, '#ffffff'); return; }
      if (st === 'slit') { P.rect(x, y + 5, 2, 2, U.mix(ec, '#ffe060', 0.5)); P.px(side ? x + 1 : x + 1, y + 5, '#140c1c'); P.px(side ? x + 1 : x + 1, y + 6, '#140c1c'); return; }
      if (st === 'narrow') { P.rect(x, y + 6, 2, 1, '#ffffff'); P.px(side ? x + 1 : x + 1, y + 6, ec); P.rect(x, y + 5, 2, 1, lid); return; }
      if (st === 'wide') { P.rect(x, y + 4, 2, 3, '#ffffff'); P.px(side ? x + 1 : x, y + 5, ec); P.px(side ? x + 1 : x, y + 6, ec); if (!side) { P.px(x + 1, y + 5, ec); P.px(x + 1, y + 6, U.shade(ec, -0.3)); } return; }
      P.rect(x, y + 5, 2, 2, '#ffffff');
      if (side) { P.px(x + 1, y + 5, ec); P.px(x + 1, y + 6, ec); }
      else { P.px(x + 1, y + 5, ec); P.px(x + 1, y + 6, ec); }
    };
    if (dir === 'down') {
      eye(13, false); eye(18, false);
      // pupils face the viewer: shift the right eye's pupil left by one for a friendlier look
      if (!closed && st === 'normal') { P.px(18, y + 5, ec); P.px(18, y + 6, ec); P.px(19, y + 5, '#ffffff'); P.px(19, y + 6, '#ffffff'); }
      if (st === 'lashes' && !closed) { P.px(12, y + 5, '#3a2020'); P.px(20, y + 5, '#3a2020'); P.px(13, y + 4, '#3a2020'); P.px(19, y + 4, '#3a2020'); }
    } else if (dir === 'left' || dir === 'right') {
      const fx = dir === 'right';
      const ex = fx ? 18 : 13;
      eye(ex, true);
      if (st === 'lashes' && !closed) P.px(fx ? ex + 2 : ex - 1, y + 5, '#3a2020');
    }
  }

  function drawFaceMarks(P, a, dir, y) {
    const f = a.face;
    if (!f || f === 'none' || dir === 'up') return;
    const c = a.faceColor || '#c03030';
    const s = a.skin;
    const side = dir !== 'down', fx = dir === 'right';
    if (f === 'freckles') {
      const fc = U.shade(s, -0.28);
      if (!side) { P.px(12, y + 7, fc); P.px(14, y + 8, fc); P.px(19, y + 7, fc); P.px(17, y + 8, fc); }
      else { P.px(fx ? 17 : 14, y + 7, fc); P.px(fx ? 19 : 12, y + 8, fc); }
    } else if (f === 'blush') {
      const bc = U.mix(s, '#ff4060', 0.35);
      if (!side) { P.rect(12, y + 7, 2, 1, bc); P.rect(18, y + 7, 2, 1, bc); }
      else P.rect(fx ? 17 : 13, y + 7, 2, 1, bc);
    } else if (f === 'scar') {
      const sc = U.mix(s, '#ffffff', 0.35);
      if (!side) { P.px(19, y + 3, sc); P.px(18, y + 4, sc); P.px(19, y + 7, sc); P.px(20, y + 8, sc); }
      else { P.px(fx ? 19 : 12, y + 3, sc); P.px(fx ? 18 : 13, y + 7, sc); }
    } else if (f === 'warpaint') {
      if (!side) { P.rect(12, y + 7, 3, 1, c); P.rect(18, y + 7, 3, 1, c); P.px(16, y + 2, c); P.px(16, y + 3, c); }
      else P.rect(fx ? 17 : 12, y + 7, 3, 1, c);
    } else if (f === 'stripes') {
      if (!side) { P.px(11, y + 5, c); P.px(11, y + 7, c); P.px(20, y + 5, c); P.px(20, y + 7, c); P.rect(15, y + 1, 2, 1, c); }
      else { P.px(fx ? 15 : 16, y + 5, c); P.px(fx ? 15 : 16, y + 7, c); }
    } else if (f === 'tattoo') {
      if (!side) { P.px(16, y + 2, c); P.px(15, y + 3, c); P.px(17, y + 3, c); P.px(16, y + 4, c); }
      else { P.px(fx ? 20 : 11, y + 3, c); P.px(fx ? 19 : 12, y + 4, c); }
    } else if (f === 'scales') {
      const sc = U.shade(s, -0.22), sl = U.shade(s, 0.18);
      if (!side) { for (const [x, yy] of [[11, 3], [12, 4], [20, 3], [19, 4], [11, 7], [20, 7], [15, 1], [17, 1]]) P.px(x, y + yy, sc); P.px(12, y + 3, sl); P.px(19, y + 3, sl); }
      else { for (const [x, yy] of [[14, 3], [15, 4], [14, 7], [16, 2], [17, 8]]) P.px(fx ? x : 31 - x, y + yy, sc); }
    } else if (f === 'tusks') {
      const tc = '#f4ecd8';
      if (!side) { P.px(13, y + 8, tc); P.px(13, y + 7, tc); P.px(18, y + 8, tc); P.px(18, y + 7, tc); }
      else { P.px(fx ? 19 : 12, y + 8, tc); P.px(fx ? 19 : 12, y + 7, tc); }
    } else if (f === 'eyepatch') {
      const pc = '#1a1418';
      if (!side) { P.rect(18, y + 4, 3, 3, pc); P.line(11, y + 2, 21, y + 5, pc); }
      else if (fx) { P.rect(18, y + 4, 3, 3, pc); P.rect(13, y + 2, 5, 1, pc); }
      else P.rect(13, y + 3, 8, 1, pc);
    }
  }

  function drawHead(P, a, dir, y0, gear, p) {
    const s = a.skin, sd = U.shade(s, -0.18), sl = U.shade(s, 0.15);
    const y = 7 + y0;
    const helm = gear.head;
    const fullHelm = helm && ['full', 'horned', 'knight', 'skull', 'dragon'].includes(helm.style);
    drawEars(P, a, dir, y, helm);
    if (dir === 'down') {
      P.rect(11, y + 1, 10, 8, s); P.rect(12, y, 8, 1, s); P.rect(12, y + 9, 8, 1, sd);
      P.rect(20, y + 2, 1, 7, sd); P.rect(11, y + 2, 1, 5, sl);
      if (!fullHelm) {
        drawEyes(P, a, dir, y, p);
        P.px(16, y + 7, sd); // nose
        P.rect(15, y + 8, 2, 1, U.shade(s, -0.35)); // mouth
        if (p.lean < 0 && p.blink) P.rect(15, y + 8, 2, 1, '#3a1818'); // ouch
      }
    } else if (dir === 'up') {
      P.rect(11, y + 1, 10, 8, s); P.rect(12, y, 8, 1, s); P.rect(12, y + 9, 8, 1, sd);
    } else {
      const fx = dir === 'right';
      P.rect(12, y + 1, 9, 8, s); P.rect(13, y, 7, 1, s); P.rect(13, y + 9, 7, 1, sd);
      if (!fullHelm) {
        drawEyes(P, a, dir, y, p);
        P.px(fx ? 21 : 11, y + 6, s); // nose tip
        P.px(fx ? 19 : 13, y + 8, U.shade(s, -0.35));
        if (!a.ears || a.ears === 'human') { P.px(fx ? 14 : 18, y + 5, sd); P.px(fx ? 14 : 18, y + 6, sd); } // ear
      }
    }
    if (!fullHelm) drawFaceMarks(P, a, dir, y);
    // beard
    if (a.beard && a.beard !== 'none' && dir !== 'up' && !fullHelm) {
      const bc = a.beardColor || a.hairColor, bd = U.shade(bc, -0.25);
      const side = dir !== 'down';
      const x0 = side ? (dir === 'right' ? 15 : 12) : 12, w = side ? 6 : 8;
      const b = a.beard;
      if (b === 'stubble') { for (let i = 0; i < w; i += 2) P.px(x0 + i, y + 8, bd); P.px(x0 + 1, y + 9, bd); P.px(x0 + w - 2, y + 9, bd); }
      if (b === 'mustache') { if (!side) { P.rect(13, y + 7, 6, 1, bc); P.px(13, y + 8, bc); P.px(18, y + 8, bc); } else P.rect(dir === 'right' ? 18 : 12, y + 7, 3, 1, bc); }
      if (b === 'sideburns') { if (!side) { P.rect(11, y + 4, 1, 5, bc); P.rect(20, y + 4, 1, 5, bc); P.px(12, y + 8, bc); P.px(19, y + 8, bc); } else P.rect(dir === 'right' ? 14 : 17, y + 4, 2, 5, bc); }
      if (b === 'full') { P.rect(x0, y + 6, 1, 3, bc); P.rect(x0 + w - 1, y + 6, 1, 3, bc); P.rect(x0, y + 8, w, 2, bc); P.rect(x0 + 1, y + 10, w - 2, 1, bd); if (!side) P.rect(15, y + 8, 2, 1, U.shade(s, -0.35)); }
      if (b === 'goatee') { P.rect(side ? (dir === 'right' ? 18 : 13) : 15, y + 8, 2, 3, bc); }
      if (b === 'braided') { P.rect(x0, y + 7, w, 2, bc); const bx = side ? (dir === 'right' ? 18 : 13) : 15; P.rect(bx, y + 9, 2, 5, bc); P.px(bx, y + 11, bd); P.px(bx + 1, y + 13, bd); P.rect(bx, y + 14, 2, 1, a.accColor || '#d8b040'); }
      if (b === 'long') { P.rect(x0, y + 7, w, 3, bc); P.rect(x0 + 1, y + 10, w - 2, 3, bc); P.rect(x0 + 2, y + 13, w - 4, 1, bd); }
      if (b === 'mustache' || b === 'full' || b === 'long' || b === 'braided') { if (!side) { P.rect(13, y + 7, 6, 1, bc); } }
    }
  }

  function drawHairFront(P, a, dir, y0, gear, p) {
    const helm = gear.head;
    if (helm && !['circlet', 'crown'].includes(helm.style)) return; // hat hides hair (mostly)
    const st = a.hair;
    if (st === 'bald') return;
    const c = a.hairColor, d = U.shade(c, -0.25), l = U.shade(c, 0.25);
    const y = 7 + y0;
    const sw = p.sway;
    if (st === 'buzz') {
      if (dir === 'down' || dir === 'up') { P.rect(11, y, 10, 2, d); P.rect(12, y - 1, 8, 1, d); P.rect(13, y, 3, 1, c); if (dir === 'up') P.rect(11, y + 2, 10, 4, d); }
      else { P.rect(12, y - 1, 9, 2, d); P.rect(dir === 'right' ? 12 : 17, y + 1, 4, 4, d); }
      return;
    }
    if (dir === 'down') {
      if (st === 'afro') { P.rect(10, y - 3, 12, 5, c); P.rect(9, y - 1, 2, 6, c); P.rect(21, y - 1, 2, 6, c); P.rect(11, y - 4, 10, 1, c); for (const [x, yy] of [[11, -3], [14, -4], [18, -3], [20, -1], [10, 1]]) P.px(x, y + yy, l); for (const [x, yy] of [[13, -1], [17, -2], [21, 2], [9, 3]]) P.px(x, y + yy, d); return; }
      P.rect(11, y - 1, 10, 3, c); P.rect(12, y - 2, 8, 1, c); P.rect(11, y + 2, 1, 3, c); P.rect(20, y + 2, 1, 3, c);
      P.rect(13, y - 1, 3, 1, l);
      if (st === 'short' || st === 'bob') { P.rect(12, y + 2, 2, 1, c); P.rect(18, y + 2, 2, 1, c); }
      if (st === 'bob') { P.rect(10, y + 1, 2, 7, c); P.rect(20, y + 1, 2, 7, c); P.rect(10, y + 7, 2, 1, d); P.rect(20, y + 7, 2, 1, d); }
      if (st === 'spiky') { P.px(12, y - 3, c); P.px(15, y - 4, c); P.px(16, y - 3, c); P.px(19, y - 3, c); P.rect(11, y + 2, 3, 1, c); P.rect(17, y + 2, 2, 1, c); }
      if (st === 'swept') { P.rect(12, y + 2, 5, 1, c); P.rect(12, y + 3, 3, 1, c); P.px(12, y + 4, d); P.rect(10, y - 1, 2, 3, c); }
      if (st === 'sidecut') { P.rect(18, y - 1, 3, 3, U.shade(a.skin, -0.12)); P.rect(20, y + 2, 1, 3, U.shade(a.skin, -0.12)); P.rect(11, y - 3, 8, 2, c); P.rect(12, y + 2, 4, 2, c); P.px(12, y + 4, c); P.rect(13, y - 3, 3, 1, l); }
      if (st === 'long' || st === 'braids' || st === 'dreads') { P.rect(10, y, 2, 10, c); P.rect(20, y, 2, 10, c); P.rect(12, y + 2, 3, 1, c); }
      if (st === 'braids') { P.rect(10, y + 10, 2, 4, d); P.rect(20, y + 10, 2, 4, d); P.px(10, y + 14, a.accColor || l); P.px(21, y + 14, a.accColor || l); }
      if (st === 'dreads') { for (const x of [10, 13, 18, 21]) { P.rect(x, y + 2, 1, 11, x % 2 ? d : c); } P.px(10, y + 13, l); P.px(21, y + 13, l); }
      if (st === 'curly') { P.rect(10, y - 1, 12, 4, c); P.rect(10, y + 3, 2, 5, c); P.rect(20, y + 3, 2, 5, c); for (const [x, yy] of [[11, -1], [14, -2], [17, -1], [20, 0], [10, 3], [21, 5], [10, 6]]) P.px(x, y + yy, l); for (const [x, yy] of [[13, 0], [16, 1], [19, 1], [11, 5], [20, 7]]) P.px(x, y + yy, d); }
      if (st === 'mohawk') { P.rect(11, y - 1, 10, 2, U.shade(a.skin, -0.1)); P.rect(15, y - 4, 2, 5, c); P.rect(15, y - 4, 1, 2, l); }
      if (st === 'ponytail') { P.rect(12, y + 2, 2, 1, c); P.rect(18, y + 2, 2, 1, c); }
      if (st === 'pigtails') { P.rect(12, y + 2, 2, 1, c); P.rect(18, y + 2, 2, 1, c); P.rect(8, y + 2, 3, 7 + (sw > 1 ? 1 : 0), c); P.rect(21, y + 2, 3, 7 + (sw > 1 ? 1 : 0), c); P.rect(8, y + 2, 3, 1, a.accColor || '#d84060'); P.rect(21, y + 2, 3, 1, a.accColor || '#d84060'); P.px(8, y + 8, d); P.px(23, y + 8, d); }
      if (st === 'bun') { P.rect(12, y + 2, 2, 1, c); P.rect(18, y + 2, 2, 1, c); P.circle(16, y - 4, 2, c); P.px(15, y - 5, l); }
      if (st === 'topknot') { P.rect(14, y - 5, 4, 3, c); P.rect(15, y - 5, 1, 1, l); P.rect(15, y - 2, 2, 1, d); }
      if (st === 'wild') { P.rect(10, y - 2, 12, 4, c); P.px(9, y, c); P.px(22, y, c); P.px(11, y - 3, c); P.px(14, y - 4, c); P.px(18, y - 3, c); P.px(21, y - 2, c); P.rect(10, y + 2, 2, 5, c); P.rect(20, y + 2, 2, 5, c); }
    } else if (dir === 'up') {
      if (st === 'afro') { P.ellipse(16, y + 3, 8, 7, c); P.px(12, y - 1, l); P.px(18, y - 2, l); P.px(20, y + 4, d); return; }
      P.rect(11, y - 1, 10, 8, c); P.rect(12, y - 2, 8, 1, c); P.rect(11, y + 7, 10, 1, d);
      P.rect(13, y - 1, 4, 1, l);
      if (st === 'spiky') { P.px(12, y - 3, c); P.px(15, y - 4, c); P.px(19, y - 3, c); }
      if (st === 'mohawk') { P.rect(11, y - 1, 10, 8, U.shade(a.skin, -0.1)); P.rect(15, y - 4, 2, 11, c); }
      if (st === 'sidecut') { P.rect(11, y + 1, 3, 6, U.shade(a.skin, -0.12)); }
      if (st === 'topknot') { P.rect(14, y - 5, 4, 3, c); }
      if (st === 'bun') { P.circle(16, y - 3, 2, c); P.px(15, y - 4, l); }
      if (st === 'wild') { P.rect(10, y - 2, 12, 10, c); P.px(9, y + 2, c); P.px(22, y + 3, c); }
      if (st === 'bob') { P.rect(10, y + 1, 12, 8, c); P.rect(10, y + 8, 12, 1, d); }
      if (st === 'curly') { P.rect(10, y, 12, 8, c); for (const [x, yy] of [[11, 1], [14, 3], [18, 2], [20, 6], [13, 6]]) P.px(x, y + yy, l); }
      if (st === 'dreads') { for (const x of [11, 13, 15, 17, 19]) P.rect(x, y + 6, 1, 8, x % 4 === 1 ? d : c); }
      if (st === 'pigtails') { P.rect(8, y + 2, 3, 8, c); P.rect(21, y + 2, 3, 8, c); }
    } else {
      const fx = dir === 'right';
      const back = fx ? 12 : 19;
      if (st === 'afro') { P.rect(11, y - 3, 11, 6, c); P.rect(fx ? 10 : 16, y + 2, 6, 6, c); P.px(fx ? 13 : 19, y - 3, l); P.px(fx ? 11 : 21, y + 4, d); return; }
      P.rect(12, y - 1, 9, 3, c); P.rect(13, y - 2, 7, 1, c);
      P.rect(fx ? 12 : 17, y + 2, 4, 4, c); // back of head hair
      P.rect(fx ? 19 : 12, y + 2, 2, 1, c);   // fringe
      P.rect(fx ? 14 : 15, y - 1, 3, 1, l);
      const s = fx ? -Math.min(1, sw) : Math.min(1, sw);
      if (st === 'spiky') { P.px(fx ? 13 : 19, y - 3, c); P.px(16, y - 4, c); P.px(fx ? 19 : 13, y - 3, c); }
      if (st === 'swept') { P.rect(fx ? 18 : 12, y + 2, 3, 2, c); P.px(fx ? 12 + s : 20 + s, y - 2, c); }
      if (st === 'sidecut') { if (fx) P.rect(12, y + 1, 4, 5, U.shade(a.skin, -0.12)); P.rect(13, y - 3, 7, 2, c); }
      if (st === 'long' || st === 'braids' || st === 'dreads') { P.rect(back - (fx ? 1 : 0) + s, y + 2, 3, 10, c); }
      if (st === 'dreads') { P.px(back - (fx ? 1 : 0) + s, y + 12, l); P.rect(back + 1 - (fx ? 1 : 0) + s, y + 3, 1, 9, d); }
      if (st === 'braids') P.px(back + s, y + 12, a.accColor || l);
      if (st === 'curly') { P.rect(11, y - 1, 10, 4, c); P.rect(fx ? 11 : 17, y + 2, 5, 6, c); P.px(fx ? 12 : 20, y + 5, l); P.px(fx ? 14 : 18, y, l); }
      if (st === 'bob') { P.rect(back - (fx ? 1 : 0), y + 2, 3, 6, c); }
      if (st === 'mohawk') { P.rect(12, y - 1, 9, 3, U.shade(a.skin, -0.1)); P.rect(fx ? 12 : 17, y + 2, 4, 4, U.shade(a.skin, -0.1)); P.rect(13, y - 4, 7, 2, c); }
      if (st === 'topknot') { P.rect(fx ? 13 : 16, y - 5, 4, 3, c); }
      if (st === 'bun') { P.circle(fx ? 13 : 19, y - 1, 2, c); }
      if (st === 'pigtails') { P.rect((fx ? 10 : 20) + s, y + 3, 3, 8, c); P.rect((fx ? 10 : 20) + s, y + 3, 3, 1, a.accColor || '#d84060'); }
      if (st === 'wild') { P.rect(11, y - 2, 11, 4, c); P.rect(fx ? 11 : 17, y + 2, 5, 6, c); P.px(fx ? 10 : 22, y + 3, c); }
    }
  }

  // Beast ears sit on top of the hair.
  function drawBeastEars(P, a, dir, y0, gear) {
    if (a.ears !== 'beast') return;
    const helm = gear.head;
    if (helm && !['circlet', 'crown', 'bandana'].includes(helm.style)) return;
    const c = a.hair === 'bald' ? a.skin : a.hairColor, inner = U.mix(a.skin, '#ff90a0', 0.4), d = U.shade(c, -0.3);
    const y = 7 + y0;
    const ear = (x) => { P.rect(x, y - 3, 3, 3, c); P.px(x + 1, y - 4, c); P.px(x + 1, y - 2, inner); P.px(x + 2, y - 1, d); };
    if (dir === 'down' || dir === 'up') { ear(11); ear(18); }
    else ear(dir === 'right' ? 14 : 15);
  }

  function drawHorns(P, a, dir, y0, gear) {
    const h = a.horns;
    if (!h || h === 'none') return;
    const helm = gear.head;
    if (helm && ['full', 'horned', 'knight', 'skull', 'dragon', 'hood', 'wizard'].includes(helm.style)) return;
    const c = a.hornColor || '#e8e0c8', d = U.shade(c, -0.3), l = U.shade(c, 0.3);
    const y = 7 + y0;
    const front = dir === 'down' || dir === 'up';
    if (h === 'nubs') { if (front) { P.rect(12, y - 2, 2, 2, c); P.rect(18, y - 2, 2, 2, c); P.px(12, y - 2, l); } else P.rect(dir === 'right' ? 16 : 15, y - 2, 2, 2, c); }
    if (h === 'ram') {
      if (front) { for (const [sx, m] of [[10, -1], [21, 1]]) { P.rect(sx, y, 2, 2, c); P.px(sx + m, y + 2, c); P.px(sx + m * 2, y + 3, d); P.px(sx, y + 3, c); P.px(sx + (m > 0 ? 1 : 0), y - 1, l); } }
      else { const fx = dir === 'right'; const x = fx ? 14 : 16; P.rect(x, y, 3, 3, c); P.rect(x + (fx ? -1 : 1), y + 2, 3, 2, c); P.px(x + 1, y + 1, d); P.px(x + (fx ? -1 : 3), y + 4, d); }
    }
    if (h === 'demon') {
      if (front) { P.rect(12, y - 2, 2, 2, c); P.px(11, y - 3, c); P.px(11, y - 4, c); P.px(10, y - 5, l); P.rect(18, y - 2, 2, 2, c); P.px(20, y - 3, c); P.px(20, y - 4, c); P.px(21, y - 5, l); }
      else { const x = dir === 'right' ? 15 : 16; P.rect(x, y - 2, 2, 2, c); P.px(dir === 'right' ? x - 1 : x + 2, y - 3, c); P.px(dir === 'right' ? x - 2 : x + 3, y - 4, l); }
    }
    if (h === 'dragon') {
      // two long horns sweeping back from the temples
      if (front) {
        for (const [x0, m] of [[12, -1], [19, 1]]) { P.rect(x0, y - 1, 2, 2, c); P.px(x0 + m, y - 2, c); P.px(x0 + m * 2, y - 3, c); P.px(x0 + m * 2, y - 4, l); P.px(x0 + m * 3, y - 4, d); }
        if (dir === 'up') { P.rect(13, y + 1, 1, 2, d); P.rect(18, y + 1, 1, 2, d); }
      } else {
        const fx = dir === 'right', x0 = fx ? 15 : 16, m = fx ? -1 : 1;
        P.rect(x0, y - 1, 2, 2, c); P.px(x0 + m * 2, y - 1, c); P.px(x0 + m * 3, y - 2, c); P.px(x0 + m * 4, y - 2, l); P.px(x0 + m * 5, y - 3, d);
      }
    }
    if (h === 'antlers') {
      const ant = (x, m) => { P.rect(x, y - 3, 1, 3, c); P.px(x + m, y - 4, c); P.px(x + m * 2, y - 5, c); P.px(x, y - 5, c); P.px(x, y - 6, l); P.px(x + m * 2, y - 6, l); P.px(x + m * 3, y - 4, d); };
      if (front) { ant(12, -1); ant(19, 1); } else ant(dir === 'right' ? 15 : 16, dir === 'right' ? -1 : 1);
    }
    if (h === 'unicorn' && dir !== 'up') {
      const x = dir === 'down' ? 15 : dir === 'right' ? 18 : 12;
      P.rect(x, y - 3, 2, 3, c); P.px(x, y - 5, l); P.px(x, y - 4, c); P.px(x + 1, y - 4, d); P.px(x, y - 6, l);
    }
  }

  function drawAccessory(P, a, dir, y0, gear) {
    const acc = a.accessory;
    if (!acc || acc === 'none') return;
    const c = a.accColor || '#d8b040', d = U.shade(c, -0.3);
    const y = 7 + y0;
    const helm = gear.head;
    const covered = helm && ['full', 'horned', 'knight', 'skull', 'dragon'].includes(helm.style);
    const fx = dir === 'right';
    if (acc === 'earrings' && !covered) {
      if (dir === 'down') { P.px(10, y + 7, c); P.px(21, y + 7, c); }
      else if (dir !== 'up') P.px(fx ? 14 : 17, y + 7, c);
    }
    if ((acc === 'glasses' || acc === 'monocle') && !covered) {
      const g = '#1a1418', lens = 'rgba(200,230,255,0.55)';
      if (dir === 'down') {
        if (acc === 'glasses') { P.rect(12, y + 4, 4, 1, g); P.rect(17, y + 4, 4, 1, g); P.rect(12, y + 7, 4, 1, g); P.rect(17, y + 7, 4, 1, g); P.px(12, y + 5, g); P.px(12, y + 6, g); P.px(20, y + 5, g); P.px(20, y + 6, g); P.px(16, y + 5, g); P.px(15, y + 5, lens); }
        else { P.rect(17, y + 4, 4, 1, c); P.rect(17, y + 7, 4, 1, c); P.px(17, y + 5, c); P.px(20, y + 5, c); P.px(17, y + 6, c); P.px(20, y + 6, c); P.line(20, y + 8, 21, y + 12, d); }
      } else if (dir !== 'up') {
        const ex = fx ? 17 : 12;
        if (acc === 'glasses' || fx) { P.rect(ex, y + 4, 4, 1, acc === 'monocle' ? c : g); P.rect(ex, y + 7, 4, 1, acc === 'monocle' ? c : g); P.px(fx ? ex + 3 : ex, y + 5, acc === 'monocle' ? c : g); P.px(fx ? ex + 3 : ex, y + 6, acc === 'monocle' ? c : g); if (acc === 'glasses') P.rect(fx ? 14 : 16, y + 5, 3, 1, g); }
      }
    }
    if (acc === 'flower' && (!helm || ['circlet', 'crown'].includes(helm.style))) {
      const x = dir === 'down' ? 19 : dir === 'up' ? 12 : fx ? 13 : 18;
      P.px(x, y - 1, c); P.px(x + 1, y, c); P.px(x - 1, y, c); P.px(x, y + 1, c); P.px(x, y, '#fff4a0');
    }
    if (acc === 'headband' && !helm) {
      if (dir === 'down' || dir === 'up') { P.rect(11, y + 1, 10, 1, c); if (dir === 'up') { P.rect(15, y + 2, 1, 4, c); P.rect(17, y + 2, 1, 3, d); } }
      else { P.rect(12, y + 1, 9, 1, c); P.rect(fx ? 11 : 20, y + 2, 1, 4, c); P.px(fx ? 10 : 21, y + 5, d); }
    }
  }

  // Necklace and scarf go over the torso.
  function drawNeckwear(P, a, dir, y0, tx, tw) {
    const acc = a.accessory, c = a.accColor || '#d8b040';
    const y = 16 + y0;
    if (acc === 'necklace' && dir !== 'up') {
      if (dir === 'down') { P.px(tx + 2, y, c); P.px(tx + 3, y + 1, c); P.rect(tx + 4, y + 2, tw - 8, 1, c); P.px(tx + tw - 4, y + 1, c); P.px(tx + tw - 3, y, c); P.px(tx + tw / 2, y + 3, '#ffffff'); }
      else P.px(dir === 'right' ? tx + tw - 2 : tx + 1, y + 2, c);
    }
    if (acc === 'scarf') {
      const d = U.shade(c, -0.3);
      P.rect(tx, y - 1, tw, 2, c); P.rect(tx, y, tw, 1, d);
      if (dir === 'down') { P.rect(tx + 2, y + 1, 2, 4, c); P.px(tx + 2, y + 5, d); }
      else if (dir !== 'up') { P.rect(dir === 'right' ? tx - 2 : tx + tw, y, 2, 3, c); }
    }
  }

  // Helmets / hats
  function drawHelm(P, h, dir, y0) {
    if (!h) return;
    const c = h.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3), t = h.trim || l;
    const y = 7 + y0;
    const side = dir === 'left' || dir === 'right', fx = dir === 'right';
    const x0 = side ? 12 : 11, w = side ? 9 : 10;
    switch (h.style) {
      case 'hood':
        P.rect(x0 - 1, y - 2, w + 2, 5, c); P.rect(x0 - 1, y + 3, 2, 7, c); P.rect(x0 + w - 1, y + 3, 2, 7, c); P.rect(x0 + 1, y - 2, w - 2, 1, l);
        if (dir === 'up') P.rect(x0 - 1, y - 2, w + 2, 12, c), P.rect(x0 + 2, y + 9, w - 4, 3, d);
        if (side) P.rect(fx ? x0 - 1 : x0 + w - 3, y - 2, 4, 12, c);
        P.rect(x0 - 1, y + 2, w + 2, 1, t);
        break;
      case 'wizard':
        P.rect(x0 - 3, y + 1, w + 6, 2, c); P.rect(x0 - 3, y + 2, w + 6, 1, d);
        P.rect(x0 + 1, y - 3, w - 2, 4, c); P.rect(x0 + 2, y - 6, w - 4, 3, c); P.rect(x0 + 3, y - 8, w - 6, 2, c);
        P.rect(x0 + (fx ? w - 3 : 2), y - 10, 3, 2, c); P.px(x0 + (fx ? w : 1), y - 11, c);
        P.rect(x0 + 1, y, w - 2, 1, t); if (h.accent) P.px(x0 + w / 2, y - 4, h.accent);
        break;
      case 'cap':
        P.rect(x0, y - 2, w, 4, c); P.rect(x0 + 1, y - 3, w - 2, 1, c); P.rect(x0 + 2, y - 2, 3, 1, l);
        if (dir === 'down') P.rect(x0 - 1, y + 2, w + 2, 1, d);
        if (side) P.rect(fx ? x0 + w - 2 : x0 - 2, y + 1, 4, 1, d);
        if (h.accent) { P.px(fx ? x0 + 1 : x0 + w - 2, y - 4, h.accent); P.px(fx ? x0 : x0 + w - 1, y - 5, h.accent); }
        break;
      case 'circlet':
        P.rect(x0, y + 1, w, 1, c); if (dir !== 'up') P.px(x0 + (side ? (fx ? w - 3 : 2) : 4), y + 1, h.accent || '#6fd8ff'); if (dir === 'down') P.px(x0 + 5, y + 1, h.accent || '#6fd8ff');
        break;
      case 'crown':
        P.rect(x0 + 1, y - 2, w - 2, 3, c); P.px(x0 + 1, y - 3, c); P.px(x0 + w / 2, y - 4, c); P.px(x0 + w / 2 - 1, y - 3, c); P.px(x0 + w - 2, y - 3, c);
        P.rect(x0 + 1, y, w - 2, 1, d); P.px(x0 + w / 2, y - 1, h.accent || '#e03050');
        break;
      case 'bandana':
        P.rect(x0, y - 1, w, 3, c); P.rect(x0, y + 1, w, 1, d); P.rect(x0 + 2, y - 1, 2, 1, l);
        if (dir !== 'down') P.rect(fx ? x0 - 2 : x0 + w, y + 1, 2, 4, c);
        break;
      case 'leather':
        P.rect(x0, y - 2, w, 5, c); P.rect(x0 + 1, y - 3, w - 2, 1, c); P.rect(x0, y + 2, w, 1, d); P.rect(x0 + 2, y - 2, 3, 1, l);
        if (dir !== 'up') { P.rect(x0 - 1, y + 3, 2, 5, c); P.rect(x0 + w - 1, y + 3, 2, 5, c); }
        break;
      case 'full': case 'knight': case 'horned': case 'skull': case 'dragon': {
        // full helm covering the head
        P.rect(x0 - 1, y - 2, w + 2, 12, c); P.rect(x0, y - 3, w, 1, c);
        P.rect(x0, y - 2, 3, 6, l); P.rect(x0 + w - 1, y - 1, 1, 10, d); P.rect(x0 - 1, y + 9, w + 2, 1, d);
        if (dir === 'down') {
          P.rect(x0 + 1, y + 4, w - 2, 2, '#10101a'); P.rect(x0 + w / 2 - 1, y + 4, 2, 5, d);
          if (h.glow) { P.px(x0 + 2, y + 4, h.glow); P.px(x0 + w - 3, y + 4, h.glow); }
        } else if (side) {
          P.rect(fx ? x0 + 4 : x0, y + 4, w - 4, 2, '#10101a');
          if (h.glow) P.px(fx ? x0 + w - 2 : x0 + 1, y + 4, h.glow);
        } else {
          P.rect(x0 + w / 2 - 1, y - 3, 2, 12, t);
        }
        P.rect(x0 - 1, y + 2, w + 2, 1, t);
        if (h.style === 'knight') { P.rect(x0 + w / 2 - 1, y - 7, 2, 4, h.accent || '#c03030'); P.rect(x0 + w / 2, y - 8, 3, 2, h.accent || '#c03030'); }
        if (h.style === 'horned') {
          const hc = h.accent || '#e8e0c8';
          if (dir === 'down' || dir === 'up') { P.rect(x0 - 3, y, 2, 2, hc); P.rect(x0 - 4, y - 3, 2, 3, hc); P.px(x0 - 3, y - 5, hc); P.rect(x0 + w + 1, y, 2, 2, hc); P.rect(x0 + w + 2, y - 3, 2, 3, hc); P.px(x0 + w + 2, y - 5, hc); }
          else { P.rect(fx ? x0 + 1 : x0 + w - 3, y - 4, 2, 3, hc); P.rect(fx ? x0 - 1 : x0 + w - 1, y - 6, 2, 2, hc); }
        }
        if (h.style === 'skull') { if (dir === 'down') { P.rect(x0 + 1, y - 1, w - 2, 4, '#e8e0d0'); P.rect(x0 + 2, y, 2, 2, '#10101a'); P.rect(x0 + w - 4, y, 2, 2, '#10101a'); } }
        if (h.style === 'dragon') {
          const hc = h.accent || '#ffcf40';
          P.rect(x0 + 2, y - 5, 2, 3, hc); P.rect(x0 + w - 4, y - 5, 2, 3, hc); P.px(x0 + 2, y - 6, hc); P.px(x0 + w - 3, y - 6, hc);
          if (dir === 'down') P.rect(x0 + 3, y + 7, w - 6, 1, hc);
        }
        break;
      }
      default: // simple metal cap
        P.rect(x0, y - 2, w, 4, c); P.rect(x0 + 1, y - 3, w - 2, 1, c); P.rect(x0 + 1, y - 2, 3, 1, l); P.rect(x0, y + 1, w, 1, t);
    }
    if (h.glow && !['full', 'knight', 'horned', 'skull', 'dragon'].includes(h.style)) P.px(x0 + w / 2, y - 1, h.glow);
  }

  function drawLegs(P, a, gear, dir, p, m) {
    const pants = gear.legs ? gear.legs.color : U.shade(a.outfit, -0.35);
    const pd = U.shade(pants, -0.25);
    const boots = gear.feet ? gear.feet.color : '#4a3020';
    const bd = U.shade(boots, -0.3);
    const tuck = p.tuck;
    const y0 = 24 - m.lift + tuck;
    const legH = 8 + m.lift - tuck;
    const side = dir === 'left' || dir === 'right';
    const lw = m.legW;
    if (!side) {
      const lx = 15 - lw, rx = 17;
      const lh = legH + p.legL, rh = legH + p.legR;
      P.rect(lx, y0, lw, lh, pants); P.rect(lx, y0 + lh - 3, lw, 3, boots); P.rect(lx, y0 + lh - 1, lw, 1, bd);
      P.rect(rx, y0, lw, rh, pants); P.rect(rx, y0 + rh - 3, lw, 3, boots); P.rect(rx, y0 + rh - 1, lw, 1, bd);
      P.rect(lx + lw - 1, y0, 1, 3, pd); P.rect(rx + lw - 1, y0, 1, Math.max(1, lh - 3), pd);
      if (gear.legs && gear.legs.style === 'plate') { P.rect(lx, y0 + 3, lw, 1, U.shade(pants, 0.35)); P.rect(rx, y0 + 3, lw, 1, U.shade(pants, 0.35)); }
      if (gear.feet && gear.feet.trim) { P.rect(lx, y0 + lh - 3, lw, 1, gear.feet.trim); P.rect(rx, y0 + rh - 3, lw, 1, gear.feet.trim); }
    } else {
      const fx = dir === 'right';
      const s = p.stride * (fx ? 1 : -1);
      // back leg, front leg
      const bx = 14 - s, fx2 = 15 + s;
      const bl = Math.max(4, legH - (p.stride < 0 ? 1 : 0)), fl = Math.max(4, legH - (p.stride > 1 ? 1 : 0));
      P.rect(bx, y0, 3, bl, pd); P.rect(bx, y0 + bl - 3, 3, 3, bd);
      P.rect(fx2, y0, 3, fl, pants); P.rect(fx2, y0 + fl - 3, 3, 3, boots);
      P.rect(fx ? fx2 + 2 : fx2 - 1, y0 + fl - 1, 2, 1, boots); P.rect(fx ? bx + 2 : bx - 1, y0 + bl - 1, 2, 1, bd);
      if (gear.feet && gear.feet.trim) P.rect(fx2, y0 + fl - 3, 3, 1, gear.feet.trim);
    }
  }

  function drawTorso(P, a, gear, dir, p, m, y0) {
    const ch = gear.chest;
    const base = ch ? ch.color : a.outfit;
    const b2 = ch ? (ch.trim || U.shade(ch.color, 0.3)) : a.outfit2;
    const d = U.shade(base, -0.28), l = U.shade(base, 0.22);
    const y = 16 + y0;
    const side = dir === 'left' || dir === 'right';
    const w = side ? m.sw : m.tw;
    const lean = side ? p.lean * (dir === 'right' ? 1 : -1) : 0;
    const x0 = (side ? 16 - Math.ceil(w / 2) : 16 - w / 2) + lean;
    const style = ch ? ch.style : 'tunic';
    const tall = 8 + (p.tuck ? -1 : 0);
    P.rect(x0, y, w, tall, base);
    if (!side && m.waist) { P.px(x0, y + 5, d); P.px(x0 + w - 1, y + 5, d); }
    P.rect(x0 + w - 1, y, 1, tall, d);
    P.rect(x0, y, 1, 6, l);
    if (style === 'robe') {
      // robe extends over legs; the hem swings with the stride
      const hs = side ? Math.sign(p.stride) * (dir === 'right' ? -1 : 1) : 0;
      const rl = 8 + m.lift;
      P.rect(x0 - 1, y + 7, w + 2, rl, base); P.rect(x0 + w, y + 7, 1, rl, d); P.rect(x0 - 1 + hs, y + 6 + rl, w + 2, 1, b2);
      if (!side && dir === 'down') P.rect(x0 + w / 2 - 1, y + 1, 2, 6 + rl, b2);
      if (side) P.rect(dir === 'right' ? x0 + w - 2 : x0 + 1, y + 1, 1, 6 + rl, b2);
    }
    // belt
    if (style !== 'robe') {
      P.rect(x0, y + 6, w, 1, ch && ch.style === 'plate' ? d : '#3a2418');
      if (dir === 'down') P.px(x0 + Math.floor(w / 2), y + 6, '#d8b040');
    }
    if (dir === 'down' || dir === 'up') {
      const mid = x0 + Math.floor(w / 2);
      if (style === 'tunic') { if (dir === 'down') { P.rect(mid - 2, y, 4, 2, b2); P.px(mid - 1, y + 2, b2); } }
      if (style === 'leather') { P.rect(x0 + 1, y + 1, w - 2, 1, l); P.rect(x0 + 2, y + 3, w - 4, 1, d); if (dir === 'down') { P.px(mid - 2, y + 2, b2); P.px(mid + 1, y + 2, b2); } }
      if (style === 'chain') { for (let yy = 0; yy < 6; yy++) for (let xx = (yy % 2); xx < w; xx += 2) P.px(x0 + xx, y + yy, yy % 2 ? d : l); }
      if (style === 'plate') { P.rect(x0 + 1, y + 1, w - 2, 4, l); P.rect(x0 + 2, y + 2, w - 4, 2, base); if (dir === 'down') P.rect(mid - 1, y + 1, 2, 4, b2); P.rect(x0, y + 5, w, 1, d); }
      if (style === 'mage') { if (dir === 'down') { P.rect(mid - 2, y, 4, 8, b2); P.rect(mid - 1, y + 1, 2, 6, base); } }
      if (style === 'shadow') { P.rect(x0 + 1, y, 2, 8, d); P.rect(x0 + w - 3, y, 2, 8, d); if (dir === 'down') P.rect(mid - 2, y + 2, 4, 1, b2); }
    } else {
      if (style === 'plate') { P.rect(x0 + 1, y + 1, w - 2, 4, l); P.rect(x0 + 2, y + 2, w - 4, 2, base); }
      if (style === 'chain') { for (let yy = 0; yy < 6; yy++) for (let xx = (yy % 2); xx < w; xx += 2) P.px(x0 + xx, y + yy, yy % 2 ? d : l); }
      if (style === 'leather') P.rect(x0 + 1, y + 2, w - 2, 1, d);
    }
    if (ch && ch.glow) { P.px(x0 + Math.floor(w / 2), y + 3, ch.glow); if (!side) P.px(x0 + Math.floor(w / 2) - 1, y + 3, ch.glow); }
    return { x0, w, y };
  }

  function drawArm(P, a, gear, dir, p, which, m, y0) {
    // which: 'L' (screen-left) or 'R'
    const ch = gear.chest;
    const sleeve = ch ? (ch.style === 'robe' || ch.style === 'mage' ? ch.color : U.shade(ch.color, -0.1)) : a.outfit;
    const hand = gear.hands ? gear.hands.color : a.skin;
    const y = 17 + y0;
    const side = dir === 'left' || dir === 'right';
    if (!side) {
      const tx = 16 - m.tw / 2;
      const x = which === 'L' ? tx - 2 : tx + m.tw;
      const sw = which === 'L' ? p.armL : p.armR;
      const up = p.armsUp;
      const len = p.tuck ? 4 : 6;
      if (up) {
        P.rect(x, y - up, 2, 6, sleeve); P.rect(x, y - up - 2, 2, 2, hand);
      } else {
        P.rect(x, y + Math.min(0, sw), 2, len, sleeve); P.rect(x, y + len + sw, 2, 2, hand);
        if (sw > 0) P.rect(x, y + len, 2, sw, sleeve);
        P.rect(x + (which === 'L' ? 0 : 1), y + Math.min(0, sw), 1, len, U.shade(sleeve, which === 'L' ? 0.15 : -0.25));
      }
      // pauldrons
      if (ch && (ch.style === 'plate')) { P.rect(x - 1, y - 1, 4, 3, U.shade(ch.color, 0.25)); P.rect(x - 1, y + 1, 4, 1, U.shade(ch.color, -0.3)); if (ch.trim) P.rect(x - 1, y - 1, 4, 1, ch.trim); }
      if (ch && ch.style === 'shadow') P.rect(x - 1, y - 1, 4, 2, U.shade(ch.color, -0.3));
    } else {
      const fx = dir === 'right';
      const lean = p.lean * (fx ? 1 : -1);
      const swing = (fx ? p.armR : -p.armR) + (p.reach ? (fx ? p.reach : -p.reach) : 0);
      const x = 15 + swing + lean;
      if (p.armsUp) { P.rect(fx ? 17 : 13, y - p.armsUp, 2, 6, sleeve); P.rect(fx ? 17 : 13, y - p.armsUp - 2, 2, 2, hand); }
      else { const len = p.tuck ? 4 : 6; P.rect(x, y, 3, len, sleeve); P.rect(x, y + len, 3, 2, hand); }
      if (ch && ch.style === 'plate') { P.rect(14 + lean, y - 1, 5, 3, U.shade(ch.color, 0.25)); if (ch.trim) P.rect(14 + lean, y - 1, 5, 1, ch.trim); }
    }
  }

  function drawCape(P, cape, dir, p, front, y0) {
    if (!cape) return;
    const c = cape.color, d = U.shade(c, -0.3), t = cape.trim;
    const y = 16 + y0;
    const sway = p.stride;
    const flut = p.sway;
    if (dir === 'up' && front) {
      const len = 13 + (flut > 1 ? -1 : 0);
      P.rect(10, y, 12, len, c); P.rect(11, y + len, 10, 1, c); P.rect(10 + (sway > 0 ? 1 : 0), y + len, 1, 1, d);
      P.rect(15, y + 1, 1, len - 1, d); P.rect(18, y + 1, 1, len - 1, d);
      if (flut > 0) { P.px(10 + (sway > 0 ? 11 : 0), y + len, d); P.px(13, y + len, c); }
      if (t) P.rect(10, y + len, 12, 1, t);
      if (cape.glow) { P.px(13, y + 5, cape.glow); P.px(18, y + 8, cape.glow); }
    } else if (dir === 'down' && !front) {
      const wide = flut > 1 ? 1 : 0;
      P.rect(10 - wide, y + 1, 12 + wide * 2, 13, d);
      if (t) P.rect(10 - wide, y + 13, 12 + wide * 2, 1, t);
    } else if ((dir === 'left' || dir === 'right') && !front) {
      const fx = dir === 'right';
      const drift = Math.max(0, flut) * 2 + Math.abs(sway) * 0;
      const bx = fx ? 9 - drift + (sway > 0 ? 1 : 0) : 18 + drift - (sway > 0 ? 1 : 0);
      P.rect(fx ? 11 : 16, y, 5, 4, c);
      const h = 11 - Math.min(2, drift);
      P.rect(bx, y + 3, 5, h, c); P.rect(bx + (fx ? 0 : 4), y + 3, 1, h, d);
      if (drift) P.rect(fx ? bx + 4 : bx, y + 3, 1, 3, c);
      if (t) P.rect(bx, y + 2 + h, 5, 1, t);
    }
  }

  function drawShield(P, sh, dir, p, front, y0) {
    if (!sh) return;
    const c = sh.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3), t = sh.trim || '#d8b040';
    const y = 18 + y0;
    // held on the off-hand: screen-LEFT facing the camera (weapon hand is screen-right),
    // screen-RIGHT from behind.
    if (dir === 'down' && front) {
      const x = 6 + (p.armL > 0 ? 0 : 0);
      const yy = y + Math.max(-1, Math.min(1, p.armL));
      P.rect(x, yy, 6, 8, c); P.rect(x + 1, yy + 8, 4, 1, c); P.rect(x + 2, yy + 9, 2, 1, c);
      P.rect(x, yy, 6, 1, t); P.rect(x, yy, 1, 8, t); P.rect(x + 5, yy, 1, 8, d);
      P.rect(x + 2, yy + 2, 2, 4, sh.accent || l);
      if (sh.glow) P.px(x + 3, yy + 3, sh.glow);
    } else if (dir === 'up' && !front) {
      P.rect(20, y, 6, 8, d); P.rect(21, y + 8, 4, 1, d);
    } else if (dir === 'left' && front) {
      P.rect(9, y - 1, 4, 10, c); P.rect(9, y - 1, 1, 10, t); P.rect(10, y + 3, 2, 3, sh.accent || l);
    } else if (dir === 'right' && !front) {
      P.rect(12, y - 1, 3, 9, d);
    }
  }

  // ---- composition ---------------------------------------------------------
  function compose(ctx, a, gear, dir, anim, frame) {
    ctx.translate(0, OY);
    const P = G.painter(ctx);
    if (anim === 'dead') {
      // lying down: a side 'hurt' pose rotated flat
      ctx.save(); ctx.translate(16, 30); ctx.rotate(-Math.PI / 2); ctx.translate(-16, -30 - OY);
      compose(ctx, a, gear, 'right', 'hurt', 0); ctx.restore();
      return;
    }
    const m = metrics(a);
    const p = pose(anim, frame);
    const y0 = p.bob - m.lift + (p.tuck ? 0 : 0);
    const side = dir === 'left' || dir === 'right';
    // head moves with the lean in profile
    const hx = side ? p.lean * (dir === 'right' ? 1 : -1) : 0;
    const hy = y0 + (!side && p.lean > 0 ? 1 : 0);
    drawCape(P, gear.cape, dir, p, false, y0);
    ctx.save(); ctx.translate(hx, 0); drawHairBack(P, a, dir, hy, p); ctx.restore();
    if (dir === 'up') drawShield(P, gear.offhand, dir, p, false, y0);
    if (dir === 'right') drawShield(P, gear.offhand, dir, p, false, y0);
    if (side) {
      // far arm first
      const farSleeve = gear.chest ? U.shade(gear.chest.color, -0.35) : U.shade(a.outfit, -0.35);
      const lean = p.lean * (dir === 'right' ? 1 : -1);
      P.rect((dir === 'right' ? 14 : 16) + lean, 17 + y0 - p.armR, 2, p.tuck ? 4 : 6, farSleeve);
    }
    drawLegs(P, a, gear, dir, p, m);
    const torso = drawTorso(P, a, gear, dir, p, m, y0);
    drawNeckwear(P, a, dir, y0, torso.x0, torso.w);
    if (!side) { drawArm(P, a, gear, dir, p, 'L', m, y0); drawArm(P, a, gear, dir, p, 'R', m, y0); }
    ctx.save(); ctx.translate(hx, 0);
    drawHead(P, a, dir, hy, gear, p);
    drawHairFront(P, a, dir, hy, gear, p);
    drawBeastEars(P, a, dir, hy, gear);
    drawHelm(P, gear.head, dir, hy);
    drawHorns(P, a, dir, hy, gear);
    drawAccessory(P, a, dir, hy, gear);
    ctx.restore();
    if (side) drawArm(P, a, gear, dir, p, 'R', m, y0);
    drawCape(P, gear.cape, dir, p, true, y0);
    if (dir === 'down' || dir === 'left') drawShield(P, gear.offhand, dir, p, true, y0);
  }

  const frameOf = (anim, frame) => { const n = C.FRAMES[anim] || 1; return ((frame | 0) % n + n) % n; };

  C.sprite = function (a, gear, dir, anim, frame) {
    a = C.norm(a);
    gear = gear || {};
    anim = C.FRAMES[anim] ? anim : 'idle';
    frame = frameOf(anim, frame);
    const k = 'chr|' + aKey(a) + '|' + key(gear.head) + key(gear.chest) + key(gear.legs) + key(gear.feet) + key(gear.hands) + key(gear.cape) + key(gear.offhand) + '|' + dir + anim + frame;
    return G.sprite(k, W, H, (ctx) => compose(ctx, a, gear, dir, anim, frame), { outline: true });
  };

  // Where the weapon hand is, relative to the feet anchor, for each facing.
  C.handOffset = function (dir, anim, frame, a) {
    anim = C.FRAMES[anim] ? anim : 'idle';
    const p = pose(anim, frameOf(anim, frame));
    const lift = a ? metrics(C.norm(a)).lift : 0;
    const y = -9 + p.bob - lift + (p.tuck ? -2 : 0);
    const lean = p.lean;
    if (dir === 'down') return { x: 6, y: y + p.armR };
    if (dir === 'up') return { x: -6, y: y - 1 };
    if (dir === 'right') return { x: 2 + lean + p.reach, y };
    return { x: -2 - lean - p.reach, y };
  };

  C.draw = function (ctx, x, y, a, gear, dir, anim, frame, opts) {
    a = C.norm(a);
    const spr = C.sprite(a, gear, dir, anim, frame);
    let img = spr;
    if (opts && opts.flash) img = G.flash(spr, 'chr' + aKey(a) + dir + anim + frameOf(C.FRAMES[anim] ? anim : 'idle', frame) + key((gear || {}).chest) + key((gear || {}).head) + key((gear || {}).cape) + key((gear || {}).offhand), opts.flash === true ? '#ffffff' : opts.flash);
    if (opts && opts.alpha != null) ctx.globalAlpha = opts.alpha;
    const sx = (opts && opts.sx) || 1, sy = (opts && opts.sy) || 1;
    if (opts && opts.rot) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y - 10)); ctx.rotate(opts.rot); ctx.scale(sx, sy);
      ctx.drawImage(img, -FX0, -FY0 + 10); ctx.restore();
    } else if (sx !== 1 || sy !== 1) {
      const w = Math.round(W * sx), h = Math.round(H * sy);
      ctx.drawImage(img, Math.round(x - FX0 * sx), Math.round(y - FY0 * sy), w, h);
    } else {
      ctx.drawImage(img, Math.round(x - FX0), Math.round(y - FY0));
    }
    if (opts && opts.alpha != null) ctx.globalAlpha = 1;
  };

  // Portrait (head + shoulders) for dialogue boxes/UI, scaled by caller.
  C.portrait = function (a, gear) {
    a = C.norm(a);
    gear = gear || {};
    const spr = C.sprite(a, gear, 'down', 'idle', 0);
    const lift = metrics(a).lift;
    return G.sprite('portrait|' + aKey(a) + key(gear.head) + key(gear.chest), 24, 22, (ctx) => { ctx.drawImage(spr, -4, -6 + lift); });
  };
})(window.RPG);
