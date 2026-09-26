'use strict';
// Weapon types: how they attack (profile) and how they look (drawer).
// Weapon sprites are drawn pointing along +x with the grip at (GX, GY), cached,
// then rotated to the aim angle at the character's hand.
//
//   RPG.WeaponTypes[type] = { name, kind:'melee'|'thrust'|'ranged'|'magic', arc, range, dur, cd, mult,
//                             knock, projectile?, twoHanded?, classes:[...] }
//   RPG.Weapons.sprite(look) -> canvas     look = {type, blade, handle, glow, gem, style}
//   RPG.Weapons.draw(ctx, x, y, look, angle, opts)   x,y = hand position
(function (R) {
  const U = R.U, G = R.G;
  const WS = R.Weapons = {};
  const SW = 48, SH = 24, GX = 8, GY = 12;
  WS.GX = GX; WS.GY = GY;

  R.WeaponTypes = {
    sword: { name: 'Sword', kind: 'melee', arc: 2.3, range: 30, dur: 0.26, cd: 0.34, mult: 1.0, knock: 90, classes: ['warrior', 'paladin', 'rogue'] },
    greatsword: { name: 'Greatsword', kind: 'melee', arc: 3.0, range: 38, dur: 0.42, cd: 0.62, mult: 1.65, knock: 170, twoHanded: true, classes: ['warrior', 'paladin'] },
    axe: { name: 'Axe', kind: 'melee', arc: 2.5, range: 30, dur: 0.34, cd: 0.48, mult: 1.3, knock: 120, bleed: 0.2, classes: ['warrior'] },
    dagger: { name: 'Dagger', kind: 'thrust', arc: 1.2, range: 24, dur: 0.14, cd: 0.18, mult: 0.62, knock: 30, critBonus: 0.12, classes: ['rogue', 'ranger'] },
    spear: { name: 'Spear', kind: 'thrust', arc: 0.6, range: 44, dur: 0.24, cd: 0.42, mult: 1.1, knock: 110, twoHanded: true, classes: ['warrior', 'paladin', 'ranger'] },
    hammer: { name: 'Warhammer', kind: 'melee', arc: 2.0, range: 32, dur: 0.46, cd: 0.7, mult: 1.8, knock: 200, stun: 0.25, twoHanded: true, classes: ['paladin', 'warrior'] },
    mace: { name: 'Mace', kind: 'melee', arc: 2.0, range: 27, dur: 0.3, cd: 0.42, mult: 1.15, knock: 110, stun: 0.08, classes: ['paladin', 'warrior'] },
    bow: { name: 'Bow', kind: 'ranged', range: 260, dur: 0.3, cd: 0.42, mult: 1.0, knock: 50, projectile: 'arrow', speed: 340, twoHanded: true, classes: ['ranger'] },
    crossbow: { name: 'Crossbow', kind: 'ranged', range: 300, dur: 0.3, cd: 0.8, mult: 1.7, knock: 120, projectile: 'bolt', speed: 460, pierce: 1, twoHanded: true, classes: ['ranger', 'rogue'] },
    staff: { name: 'Staff', kind: 'magic', range: 220, dur: 0.3, cd: 0.5, mult: 1.1, knock: 60, projectile: 'orb', speed: 230, twoHanded: true, classes: ['mage', 'paladin'] },
    wand: { name: 'Wand', kind: 'magic', range: 200, dur: 0.18, cd: 0.26, mult: 0.62, knock: 20, projectile: 'bolt_magic', speed: 320, classes: ['mage'] },
  };

  // ---- drawers ---------------------------------------------------------------
  // P = painter. b = blade colour, h = handle colour, g = glow, gem
  function blade(P, x0, x1, y, w, b, l, d) {
    P.rect(x0, y - Math.floor(w / 2), x1 - x0, w, b);
    P.rect(x0, y - Math.floor(w / 2), x1 - x0, 1, l);
    P.rect(x0, y + Math.ceil(w / 2) - 1, x1 - x0, 1, d);
  }
  const DRAW = {
    sword(P, L) {
      const b = L.blade || '#d0d8e0', l = U.shade(b, 0.5), d = U.shade(b, -0.35), h = L.handle || '#6b4a2b', gd = L.guard || '#c8a040';
      P.rect(GX - 5, GY - 1, 5, 2, h); P.rect(GX - 6, GY - 1, 1, 2, gd);
      P.rect(GX, GY - 4, 2, 8, gd); P.px(GX, GY - 4, U.shade(gd, 0.4));
      blade(P, GX + 2, GX + 20, GY, 3, b, l, d);
      P.px(GX + 20, GY, b); P.px(GX + 21, GY, l);
      if (L.style === 'curved') { P.rect(GX + 14, GY - 2, 6, 1, b); P.px(GX + 20, GY - 1, b); }
      if (L.style === 'runed') for (let i = 4; i < 18; i += 3) P.px(GX + i, GY, L.glow || '#6fd8ff');
      if (L.style === 'flame') { P.px(GX + 6, GY - 2, '#ffb040'); P.px(GX + 11, GY + 2, '#ffb040'); P.px(GX + 16, GY - 2, '#ffd040'); }
      if (L.gem) P.px(GX + 1, GY, L.gem);
    },
    greatsword(P, L) {
      const b = L.blade || '#c8d0d8', l = U.shade(b, 0.5), d = U.shade(b, -0.35), h = L.handle || '#4a3020', gd = L.guard || '#909090';
      P.rect(GX - 7, GY - 1, 7, 2, h); P.rect(GX - 8, GY - 2, 2, 4, gd);
      P.rect(GX, GY - 6, 2, 12, gd); P.rect(GX - 1, GY - 6, 1, 2, gd); P.rect(GX - 1, GY + 4, 1, 2, gd);
      blade(P, GX + 2, GX + 30, GY, 5, b, l, d);
      P.rect(GX + 30, GY - 1, 2, 3, b); P.px(GX + 32, GY, l);
      P.rect(GX + 3, GY, 20, 1, d);
      if (L.style === 'runed') for (let i = 5; i < 28; i += 4) P.px(GX + i, GY, L.glow || '#ff5040');
      if (L.style === 'serrated') for (let i = 4; i < 28; i += 3) P.px(GX + i, GY - 3, b);
      if (L.gem) P.rect(GX, GY - 1, 2, 2, L.gem);
    },
    axe(P, L) {
      const b = L.blade || '#b8c0c8', l = U.shade(b, 0.5), d = U.shade(b, -0.35), h = L.handle || '#7a5030';
      P.rect(GX - 4, GY - 1, 22, 2, h); P.rect(GX - 4, GY, 22, 1, U.shade(h, -0.3));
      // head
      P.rect(GX + 13, GY - 7, 5, 6, b); P.rect(GX + 11, GY - 8, 8, 2, b); P.rect(GX + 11, GY - 8, 8, 1, l);
      P.rect(GX + 13, GY + 1, 4, 2, d);
      if (L.style === 'double') { P.rect(GX + 13, GY + 1, 5, 6, b); P.rect(GX + 11, GY + 6, 8, 2, b); }
      if (L.gem) P.px(GX + 15, GY - 4, L.gem);
      if (L.glow) { P.px(GX + 12, GY - 8, L.glow); P.px(GX + 18, GY - 8, L.glow); }
    },
    dagger(P, L) {
      const b = L.blade || '#d8dce0', l = U.shade(b, 0.5), d = U.shade(b, -0.35), h = L.handle || '#3a2a20', gd = L.guard || '#806040';
      P.rect(GX - 4, GY - 1, 4, 2, h); P.rect(GX, GY - 2, 1, 4, gd);
      blade(P, GX + 1, GX + 11, GY, 2, b, l, d); P.px(GX + 11, GY, l);
      if (L.style === 'curved') { P.px(GX + 10, GY - 2, b); P.px(GX + 11, GY - 1, b); }
      if (L.glow) P.px(GX + 6, GY, L.glow);
      if (L.gem) P.px(GX - 4, GY, L.gem);
    },
    spear(P, L) {
      const b = L.blade || '#c8d0d8', l = U.shade(b, 0.5), h = L.handle || '#8a6a40';
      P.rect(GX - 12, GY - 1, 36, 2, h); P.rect(GX - 12, GY, 36, 1, U.shade(h, -0.25));
      P.rect(GX + 24, GY - 2, 5, 4, b); P.rect(GX + 29, GY - 1, 3, 2, b); P.px(GX + 32, GY, l); P.rect(GX + 24, GY - 2, 5, 1, l);
      if (L.style === 'halberd') { P.rect(GX + 20, GY - 7, 4, 6, b); P.rect(GX + 20, GY - 7, 4, 1, l); }
      P.rect(GX + 22, GY - 2, 2, 4, L.guard || '#c03030');
      if (L.glow) { P.px(GX + 27, GY, L.glow); P.px(GX + 30, GY, L.glow); }
    },
    hammer(P, L) {
      const b = L.blade || '#9098a0', l = U.shade(b, 0.4), d = U.shade(b, -0.35), h = L.handle || '#6b4a2b';
      P.rect(GX - 5, GY - 1, 25, 2, h);
      P.rect(GX + 18, GY - 7, 8, 14, b); P.rect(GX + 18, GY - 7, 8, 2, l); P.rect(GX + 18, GY + 5, 8, 2, d); P.rect(GX + 25, GY - 7, 1, 14, d);
      P.rect(GX + 20, GY - 1, 4, 2, L.trim || '#d8b040');
      if (L.glow) { P.rect(GX + 21, GY - 4, 2, 8, L.glow); }
      if (L.gem) P.rect(GX + 21, GY - 1, 2, 2, L.gem);
    },
    mace(P, L) {
      const b = L.blade || '#a0a8b0', l = U.shade(b, 0.4), d = U.shade(b, -0.35), h = L.handle || '#5a3a20';
      P.rect(GX - 4, GY - 1, 16, 2, h);
      P.circle(GX + 15, GY, 4, b); P.rect(GX + 13, GY - 3, 3, 2, l); P.rect(GX + 15, GY + 2, 3, 2, d);
      P.px(GX + 15, GY - 5, b); P.px(GX + 15, GY + 5, b); P.px(GX + 20, GY, b); P.px(GX + 11, GY - 3, b); P.px(GX + 11, GY + 3, b);
      if (L.glow) P.rect(GX + 14, GY - 1, 2, 2, L.glow);
    },
    bow(P, L) {
      // bow drawn with its string along the grip; arc bulges toward +x
      const w = L.blade || '#8a5a30', l = U.shade(w, 0.35), d = U.shade(w, -0.3), s = L.string || '#e8e0d0';
      for (let i = -10; i <= 10; i++) {
        const x = GX + 5 - Math.round((i * i) / 22);
        P.px(x, GY + i, Math.abs(i) < 2 ? (L.handle || '#3a2418') : w);
        P.px(x - 1, GY + i, Math.abs(i) > 7 ? d : l);
      }
      P.rect(GX - 1, GY - 10, 1, 21, s);
      if (L.glow) { P.px(GX + 5, GY - 5, L.glow); P.px(GX + 5, GY + 5, L.glow); P.px(GX + 1, GY - 9, L.glow); P.px(GX + 1, GY + 9, L.glow); }
      if (L.style === 'recurve') { P.px(GX + 1, GY - 11, w); P.px(GX + 2, GY - 12, w); P.px(GX + 1, GY + 11, w); P.px(GX + 2, GY + 12, w); }
    },
    crossbow(P, L) {
      const w = L.handle || '#6b4a2b', m = L.blade || '#8890a0';
      P.rect(GX - 4, GY - 1, 20, 3, w); P.rect(GX - 4, GY - 1, 20, 1, U.shade(w, 0.3));
      P.rect(GX + 12, GY - 8, 2, 17, m); P.rect(GX + 13, GY - 8, 1, 17, U.shade(m, -0.3));
      P.line(GX + 12, GY - 8, GX + 4, GY, '#e8e0d0'); P.line(GX + 12, GY + 8, GX + 4, GY, '#e8e0d0');
      if (L.glow) P.rect(GX + 14, GY, 3, 1, L.glow);
    },
    staff(P, L) {
      const h = L.handle || '#7a5030', g = L.gem || '#6fd8ff', b = L.blade || '#c8a040';
      P.rect(GX - 12, GY - 1, 34, 2, h); P.rect(GX - 12, GY, 34, 1, U.shade(h, -0.3));
      for (let i = -10; i < 20; i += 5) P.px(GX + i, GY - 1, U.shade(h, 0.3));
      if (L.style === 'crook') { P.rect(GX + 22, GY - 5, 2, 6, h); P.rect(GX + 18, GY - 6, 5, 2, h); P.circle(GX + 20, GY - 1, 2, g); }
      else if (L.style === 'skull') { P.rect(GX + 22, GY - 3, 6, 6, '#e8e0d0'); P.px(GX + 24, GY - 1, g); P.px(GX + 24, GY + 1, g); P.rect(GX + 27, GY - 1, 1, 3, '#b0a890'); }
      else {
        P.rect(GX + 20, GY - 4, 2, 8, b); P.rect(GX + 26, GY - 4, 2, 8, b);
        P.circle(GX + 24, GY, 3, g); P.px(GX + 23, GY - 2, '#ffffff'); P.px(GX + 23, GY - 1, U.shade(g, 0.6));
      }
    },
    wand(P, L) {
      const h = L.handle || '#e8e0d0', g = L.gem || '#ff60c0';
      P.rect(GX - 3, GY - 1, 16, 2, h); P.rect(GX - 3, GY, 16, 1, U.shade(h, -0.3));
      P.rect(GX - 3, GY - 1, 3, 2, L.blade || '#6b4a2b');
      P.circle(GX + 14, GY, 2, g); P.px(GX + 14, GY - 1, '#ffffff');
    },
  };
  WS.DRAW = DRAW;

  function lkey(L) { return [L.type, L.blade, L.handle, L.guard, L.glow, L.gem, L.style, L.trim, L.string].join(','); }

  WS.sprite = function (L) {
    return G.sprite('wpn|' + lkey(L), SW, SH, (ctx) => {
      const P = G.painter(ctx);
      (DRAW[L.type] || DRAW.sword)(P, L);
    }, { outline: true });
  };

  // Draw weapon rotated with grip at (x, y). opts: {flip, scale, alpha, flash}
  WS.draw = function (ctx, x, y, L, angle, opts) {
    if (!L) return;
    const spr = WS.sprite(L);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    // keep the weapon's top side up when pointing left
    if (Math.cos(angle) < 0) ctx.scale(1, -1);
    if (opts && opts.scale) ctx.scale(opts.scale, opts.scale);
    if (opts && opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(spr, -GX, -GY);
    if (L.glow && R.settings && R.settings.fancy !== false) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(performance.now() / 200);
      const gl = G.glow(10, L.glow);
      ctx.drawImage(gl, (L.type === 'bow' ? 0 : 12) - 10, -10);
    }
    ctx.restore();
  };

  // Icon for inventory (item is rotated 45 degrees into a 24x24 box).
  WS.icon = function (L) {
    return G.sprite('wicon|' + lkey(L), 24, 24, (ctx) => {
      const spr = WS.sprite(L);
      ctx.save();
      ctx.translate(12, 12);
      ctx.rotate(L.type === 'bow' || L.type === 'crossbow' ? -Math.PI / 4 : -Math.PI / 4);
      const long = { greatsword: 0.55, spear: 0.5, staff: 0.52, hammer: 0.62, axe: 0.72 }[L.type] || 0.8;
      ctx.scale(long, long);
      const cx = { sword: 14, greatsword: 18, axe: 10, dagger: 6, spear: 10, hammer: 12, mace: 9, bow: 3, crossbow: 6, staff: 8, wand: 7 }[L.type] || 10;
      ctx.drawImage(spr, -GX - cx, -GY);
      ctx.restore();
    });
  };
})(window.RPG);
