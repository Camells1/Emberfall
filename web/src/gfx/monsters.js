'use strict';
// Monster & boss sprite drawers.
//
//   RPG.Monsters[id] = { w, h, ax, ay, frames:{idle,walk,windup,attack,cast,...}, draw(P, pal, anim, frame, ctx) }
//     drawn facing RIGHT; the renderer mirrors for left.  anim: 'idle'|'walk'|'windup'|'attack'|'cast' (+ drawer extras)
//     pal = enemy palette {main, dark, light, eye, accent, ...} (any keys the drawer wants)
//   RPG.Monsters.sprite(id, pal, anim, frame, flip) -> canvas
//   RPG.Monsters.draw(ctx, e)   draws enemy entity e (uses e.pal || e.def.pal, e.anim, e.frame, e.face, e.flash, e.alpha)
//   Boss drawers live in gfx/monsters_bosses.js.
(function (R) {
  const U = R.U, G = R.G;
  const M = R.Monsters = {};

  const sh = U.shade;

  // ---- extra painter helpers (used only while baking a sprite, so allocations are fine) ----
  // Filled triangle, scanline, pixel aligned.
  function tri(P, x0, y0, x1, y1, x2, y2, c) {
    const ctx = P.ctx; ctx.fillStyle = c;
    const minY = Math.round(Math.min(y0, y1, y2)), maxY = Math.round(Math.max(y0, y1, y2));
    const E = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (let y = minY; y <= maxY; y++) {
      let a = 1e9, b = -1e9;
      const yy = y + 0.5;
      for (const [ax, ay, bx, by] of E) {
        if ((yy >= ay && yy <= by) || (yy >= by && yy <= ay)) {
          if (ay === by) { a = Math.min(a, ax, bx); b = Math.max(b, ax, bx); continue; }
          const x = ax + (bx - ax) * (yy - ay) / (by - ay);
          a = Math.min(a, x); b = Math.max(b, x);
        }
      }
      if (b >= a) ctx.fillRect(Math.round(a), y, Math.max(1, Math.round(b) - Math.round(a) + 1), 1);
    }
  }
  // Thick line (limbs, tails, tentacles).
  function seg(P, x0, y0, x1, y1, w, c) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    const h = Math.floor(w / 2);
    P.ctx.fillStyle = c;
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      P.ctx.fillRect(x - h, y - h, w, w);
    }
  }
  function eye(P, x, y, c, big) { P.px(x, y, c); if (big) { P.px(x + 1, y, c); P.px(x, y + 1, sh(c, -0.3)); P.px(x + 1, y + 1, sh(c, -0.3)); } }
  M.tri = tri; M.seg = seg; M.eye = eye;

  const walkBob = (anim, f) => (anim === 'walk' ? [0, -1, 0, -1][f % 4] : 0);
  const legPair = (anim, f, a) => (anim === 'walk' ? [[0, a], [0, 0], [a, 0], [0, 0]][f % 4] : [0, 0]);

  // =====================================================================================
  // SLIMES
  // =====================================================================================
  M.slime = {
    w: 24, h: 20, ax: 12, ay: 18, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      let sq = 0;
      if (anim === 'walk') sq = [0, 2, 0, -2][f];
      if (anim === 'idle') sq = f ? 1 : 0;
      if (anim === 'windup') sq = 3;
      if (anim === 'attack') sq = -3;
      const w = 9 + Math.max(0, sq), h = 7 - sq;
      const cy = 17 - h;
      const m = p.main;
      P.ellipse(12, cy + 1, w, h, sh(m, -0.25));
      P.ellipse(12, cy, w - 1, h - 1, m);
      P.ellipse(11, cy + 2, w - 3, Math.max(1, h - 4), sh(m, 0.12));
      P.ellipse(9, cy - 2, 3, 2, sh(m, 0.4));
      P.px(8, cy - 3, '#ffffff'); P.px(7, cy - 2, '#ffffff');
      if (p.core) { P.rect(10, cy + 1, 3, 3, p.core); P.px(10, cy + 1, sh(p.core, 0.4)); }
      // bubbles
      P.px(6, cy + 2, sh(m, 0.3)); P.px(17, cy + 3, sh(m, 0.3));
      const ec = p.eye || '#101018';
      P.rect(13, cy - 1, 2, 3, ec); P.rect(17, cy - 1, 2, 3, ec);
      P.px(13, cy - 1, '#ffffff'); P.px(17, cy - 1, '#ffffff');
      if (anim === 'windup') { P.rect(14, cy - 3, 2, 1, ec); P.rect(17, cy - 3, 2, 1, ec); }
      if (anim === 'attack' || anim === 'windup') P.rect(14, cy + 3, 4, 1, sh(m, -0.5));
      // drips
      P.px(5 + (f % 2), 17, sh(m, -0.25));
      if (p.crown) { P.rect(8, cy - h - 2, 8, 3, p.crown); P.px(8, cy - h - 3, p.crown); P.px(12, cy - h - 4, p.crown); P.px(15, cy - h - 3, p.crown); }
      if (p.spikes) for (let i = 0; i < 4; i++) P.rect(7 + i * 3, cy - h - 1 + (i % 2), 2, 2, p.spikes);
    },
  };

  // =====================================================================================
  // BEASTS
  // =====================================================================================
  M.wolf = {
    w: 36, h: 26, ax: 17, ay: 23, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), bl = p.belly || sh(m, 0.35);
      const bob = walkBob(anim, f);
      const lunge = anim === 'attack' ? 4 : anim === 'windup' ? -2 : 0;
      const crouch = anim === 'windup' ? 2 : 0;
      const y = 10 + bob + crouch;
      const x = lunge;
      const lp = anim === 'walk' ? [[0, 2], [2, 0], [0, 2], [2, 0]][f] : [0, 0];
      // far legs
      P.rect(10 + x, y + 7, 3, 6 - lp[0] - crouch, d); P.rect(23 + x, y + 7, 3, 6 - lp[1] - crouch, d);
      // tail
      const tw = anim === 'idle' ? f : 0;
      seg(P, 9 + x, y + 1, 4 + x, y - 2 - tw, 3, m); P.rect(2 + x, y - 4 - tw, 3, 3, l);
      // body
      P.ellipse(18 + x, y + 3, 10, 5, m);
      P.rect(10 + x, y - 1, 16, 2, l);
      P.rect(12 + x, y + 6, 12, 2, bl);
      // near legs
      P.rect(13 + x, y + 7, 3, 6 - lp[1] - crouch, m); P.rect(26 + x, y + 7, 3, 6 - lp[0] - crouch, m);
      P.rect(13 + x, y + 12 - lp[1] - crouch, 4, 1, d); P.rect(26 + x, y + 12 - lp[0] - crouch, 4, 1, d);
      // head
      const hy = y - 5 + (anim === 'windup' ? 2 : 0);
      P.rect(25 + x, hy, 8, 7, m); P.rect(25 + x, hy, 8, 2, l);
      P.rect(31 + x, hy + 3, 4, 3, l); P.px(35 + x, hy + 3, '#101010');
      tri(P, 25 + x, hy, 27 + x, hy - 4, 28 + x, hy, d); tri(P, 28 + x, hy, 30 + x, hy - 4, 31 + x, hy, d);
      P.px(30 + x, hy + 2, p.eye || '#ffd040'); P.px(29 + x, hy + 2, '#101010');
      if (anim === 'attack' || anim === 'windup') { P.rect(31 + x, hy + 6, 4, 1, '#ffffff'); P.rect(31 + x, hy + 7, 3, 1, '#a02020'); P.px(34 + x, hy + 7, '#ffffff'); }
      if (p.stripe) { P.rect(14 + x, y - 1, 2, 5, p.stripe); P.rect(18 + x, y - 1, 2, 5, p.stripe); P.rect(22 + x, y - 1, 2, 5, p.stripe); }
      if (p.mane) {
        // flaming mane/spine (hellhound)
        const fl = f % 2;
        for (let i = 0; i < 6; i++) { const hx = 11 + i * 3 + x, hh = 2 + ((i + fl) % 3); P.rect(hx, y - 1 - hh, 2, hh, i % 2 ? p.mane : sh(p.mane, 0.35)); }
        P.rect(24 + x, hy - 3 - fl, 2, 3, p.mane); P.px(24 + x, hy - 4 - fl, '#ffe080');
        P.rect(2 + x, y - 6 - tw, 2, 2, p.mane); P.px(2 + x, y - 7 - tw, '#ffe080');
      }
      if (p.frost) { P.px(15 + x, y, '#ffffff'); P.px(21 + x, y - 1, '#ffffff'); P.rect(26 + x, hy - 1, 1, 1, '#e8ffff'); }
    },
  };

  M.boar = {
    w: 36, h: 26, ax: 18, ay: 24, frames: { idle: 2, walk: 4, windup: 2, attack: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.2), br = p.bristle || sh(m, -0.5);
      const bob = walkBob(anim, f);
      const x = anim === 'attack' ? 3 : anim === 'windup' ? -2 : 0;
      const y = 9 + bob + (anim === 'windup' ? 1 : 0);
      const lp = anim === 'walk' || anim === 'attack' ? [[0, 2], [2, 0], [0, 2], [2, 0]][f % 4] : anim === 'windup' ? [f ? 1 : 0, f ? 0 : 1] : [0, 0];
      P.rect(9 + x, y + 9, 3, 5 - lp[0], d); P.rect(22 + x, y + 9, 3, 5 - lp[1], d);
      P.px(4 + x, y + 3, br); P.px(3 + x, y + 2, br);
      P.ellipse(17 + x, y + 5, 12, 6, m);
      P.ellipse(16 + x, y + 2, 9, 2, l);
      P.rect(9 + x, y + 9, 16, 2, d);
      for (let i = 0; i < 9; i++) P.rect(8 + i * 2 + x, y - 2 + (i % 2), 1, 3, br);
      P.rect(12 + x, y + 9, 3, 5 - lp[1], m); P.rect(25 + x, y + 9, 3, 5 - lp[0], m);
      P.rect(12 + x, y + 13 - lp[1], 3, 1, '#2a2020'); P.rect(25 + x, y + 13 - lp[0], 3, 1, '#2a2020');
      // head
      const hy = y + (anim === 'windup' || anim === 'attack' ? 3 : 1);
      P.rect(26 + x, hy, 7, 7, m); P.rect(26 + x, hy, 7, 1, l);
      P.rect(32 + x, hy + 3, 3, 4, sh(m, 0.15)); P.px(34 + x, hy + 4, '#2a1a1a'); P.px(34 + x, hy + 6, '#2a1a1a');
      tri(P, 26 + x, hy, 27 + x, hy - 3, 29 + x, hy, d);
      P.px(30 + x, hy + 2, p.eye || '#200808'); if (anim === 'windup' || anim === 'attack') P.px(30 + x, hy + 2, '#ff3020');
      const tk = p.tusk || '#f0e8d0';
      P.px(32 + x, hy + 7, tk); P.px(33 + x, hy + 7, tk); P.px(34 + x, hy + 6, tk); P.px(34 + x, hy + 5, tk);
    },
  };

  M.bat = {
    w: 30, h: 22, ax: 15, ay: 20, frames: { idle: 4, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.3);
      const flap = anim === 'windup' ? 7 : anim === 'attack' ? -1 : [0, 3, 6, 3][f % 4];
      const y = 7;
      for (let i = 0; i < 10; i++) {
        const yy = y + 1 - flap + Math.round(i * flap / 6);
        const hh = 5 - Math.floor(i / 2.5);
        P.rect(10 - i, yy, 1, hh, i % 3 === 2 ? d : m); P.rect(20 + i, yy, 1, hh, i % 3 === 2 ? d : m);
        P.px(10 - i, yy, l); P.px(20 + i, yy, l);
      }
      P.ellipse(15, y + 4, 4, 5, m); P.ellipse(15, y + 6, 2, 2, sh(m, 0.15));
      P.rect(12, y - 3, 2, 4, m); P.rect(17, y - 3, 2, 4, m); P.px(12, y - 3, l); P.px(18, y - 3, l);
      const ec = p.eye || '#ff3030';
      P.px(13, y + 2, ec); P.px(17, y + 2, ec);
      P.px(14, y + 5, '#ffffff'); P.px(16, y + 5, '#ffffff');
      if (anim === 'attack') { P.rect(14, y + 5, 3, 2, '#401010'); P.px(14, y + 5, '#ffffff'); P.px(16, y + 5, '#ffffff'); }
      P.px(13, y + 10, d); P.px(17, y + 10, d);
      if (p.frost) { P.px(8, y + 2 - flap + 2, '#ffffff'); P.px(22, y + 2 - flap + 2, '#ffffff'); P.px(15, y, '#e8ffff'); }
    },
  };

  M.frog = {
    w: 28, h: 22, ax: 14, ay: 20, frames: { idle: 2, walk: 2, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), bl = p.belly || '#e8d890';
      const puff = anim === 'windup' ? 2 : anim === 'idle' && f ? 1 : 0;
      const up = anim === 'walk' ? (f ? -3 : 0) : 0;
      const y = 8 + up;
      // back legs
      if (anim === 'walk' && f) { P.rect(3, y + 9, 6, 2, d); P.rect(1, y + 11, 4, 1, d); }
      else { P.ellipse(8, y + 8, 4, 3, d); P.rect(4, y + 10, 6, 2, d); }
      P.ellipse(14, y + 6, 9, 6, m);
      P.ellipse(15, y + 8, 6 + puff, 3 + puff, bl);
      P.ellipse(12, y + 3, 5, 2, l);
      // spots
      P.rect(9, y + 3, 2, 2, d); P.rect(13, y + 1, 2, 1, d); P.rect(7, y + 6, 2, 1, d);
      // head/eyes
      P.circle(18, y, 3, m); P.circle(18, y, 2, '#f8f0c0'); P.rect(18, y - 1, 2, 2, '#101010');
      P.circle(22, y + 1, 2, m); P.px(22, y + 1, '#101010'); P.px(23, y + 1, '#f8f0c0');
      P.rect(18, y + 5, 7, 1, d);
      if (anim === 'attack') { P.rect(20, y + 5, 5, 3, '#6a1020'); P.rect(21, y + 6, 3, 1, '#e05070'); }
      // front legs
      P.rect(19, y + 10, 2, 3, m); P.rect(18, y + 12, 4, 1, d);
      if (p.warts) { P.px(10, y + 1, p.warts); P.px(16, y + 4, p.warts); P.px(6, y + 4, p.warts); }
    },
  };

  M.scorpion = {
    w: 38, h: 30, ax: 18, ay: 27, frames: { idle: 2, walk: 4, windup: 1, attack: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), st = p.sting || '#e0e060';
      const y = 18 + (anim === 'idle' ? f : 0);
      // legs
      for (let i = 0; i < 4; i++) {
        const o = anim === 'walk' ? ((i + f) % 2) * 2 - 1 : 0;
        const lx = 12 + i * 4;
        P.line(lx, y + 2, lx - 2 + o, y + 6, d); P.line(lx - 2 + o, y + 6, lx - 3 + o, y + 8, d);
      }
      // body segments
      P.ellipse(18, y + 2, 8, 4, m); P.ellipse(17, y, 6, 2, l);
      for (let i = 0; i < 3; i++) P.rect(12 + i * 4, y - 1, 1, 5, d);
      // tail: curls over the back
      let pts;
      if (anim === 'windup') pts = [[11, y], [7, y - 5], [6, y - 11], [9, y - 17], [15, y - 20], [20, y - 19]];
      else if (anim === 'attack') pts = f ? [[11, y], [9, y - 6], [12, y - 12], [19, y - 14], [26, y - 11], [30, y - 7]] : [[11, y], [8, y - 6], [10, y - 13], [16, y - 16], [23, y - 14], [27, y - 10]];
      else pts = [[11, y], [7, y - 4], [7, y - 10], [10, y - 14], [15, y - 15], [17, y - 12]];
      for (let i = 0; i < pts.length - 1; i++) seg(P, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i < 3 ? 4 : 3, i % 2 ? m : sh(m, 0.08));
      for (let i = 1; i < pts.length - 1; i++) P.px(pts[i][0] - 1, pts[i][1] - 1, l);
      const tp = pts[pts.length - 1];
      P.rect(tp[0] - 1, tp[1] - 1, 3, 3, st); P.px(tp[0] + 2, tp[1] + 1, st); P.px(tp[0] + 3, tp[1] + 2, '#ffffff');
      // claws
      const cx = anim === 'attack' ? 3 : 0;
      for (const [yy, s] of [[y - 1, 0], [y + 3, 1]]) {
        seg(P, 24, yy, 28 + cx, yy - 1 + s, 2, s ? m : d);
        P.rect(28 + cx, yy - 3 + s, 5, 4, s ? m : d);
        P.rect(33 + cx, yy - 3 + s, 2, 1, s ? l : m); P.rect(33 + cx, yy + s, 2, 1, s ? l : m);
      }
      P.px(25, y - 1, p.eye || '#ff3030'); P.px(24, y - 2, p.eye || '#ff3030');
    },
  };

  M.spider = {
    w: 34, h: 24, ax: 17, ay: 20, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.25);
      const y = 12 + (anim === 'windup' ? 1 : 0) - (anim === 'attack' ? 1 : 0);
      const x = anim === 'attack' ? 2 : 0;
      for (let i = 0; i < 4; i++) {
        const o = anim === 'walk' ? ((i + f) % 2) * 2 : 0;
        const kx = 11 - i * 2, fx = 20 + i * 2;
        // back legs (left side) and front legs (right side), knees above body
        P.line(14 + x, y + 1, kx - 3 + x, y - 4 + i + o, d); P.line(kx - 3 + x, y - 4 + i + o, kx - 5 + x, y + 6 + i - o, d);
        P.line(18 + x, y + 1, fx + 4 + x, y - 4 + i - o, d); P.line(fx + 4 + x, y - 4 + i - o, fx + 6 + x, y + 6 + i + o, d);
      }
      if (anim === 'windup') { P.line(20, y, 26, y - 8, d); P.line(26, y - 8, 29, y - 5, d); }
      // abdomen + thorax
      P.ellipse(11 + x, y, 7, 6, m); P.ellipse(10 + x, y - 2, 4, 3, l); P.px(8 + x, y - 4, sh(l, 0.3));
      if (p.mark) { P.rect(9 + x, y, 4, 1, p.mark); P.rect(10 + x, y - 1, 2, 3, p.mark); }
      if (p.hair) for (let i = 0; i < 5; i++) P.px(6 + i * 2 + x, y - 6 + (i % 2), p.hair);
      P.ellipse(20 + x, y + 1, 4, 3, m); P.px(19 + x, y - 1, l);
      const ec = p.eye || '#ff3030';
      for (const [ex, ey] of [[21, y], [23, y], [22, y + 1], [20, y - 1]]) P.px(ex + x, ey, ec);
      // fangs
      P.rect(23 + x, y + 3, 1, anim === 'attack' || anim === 'windup' ? 3 : 2, '#f0e8e0'); P.rect(21 + x, y + 3, 1, anim === 'attack' ? 3 : 2, '#f0e8e0');
      if (p.drip) P.px(23 + x, y + 6, p.drip);
    },
  };

  M.scarab = {
    w: 20, h: 16, ax: 10, ay: 14, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.35);
      const y = 8 - (anim === 'attack' ? 1 : 0);
      for (let i = 0; i < 3; i++) { const o = anim === 'walk' ? ((i + f) % 2) : 0; P.line(6 + i * 3, y + 2, 5 + i * 3 - o, y + 5, '#201810'); }
      if (anim === 'windup' || anim === 'attack') { // wing cases open
        tri(P, 9, y - 2, 2, y - 6, 4, y + 2, sh(p.wing || '#c0e0ff', 0)); P.ctx.globalAlpha = 1;
      }
      P.ellipse(9, y, 6, 4, m); P.rect(9, y - 4, 1, 7, d); P.ellipse(7, y - 2, 2, 1, l); P.px(12, y - 2, l);
      P.rect(14, y - 1, 3, 3, d); P.px(16, y - 1, p.eye || '#ffd040');
      P.px(17, y - 2, d); P.px(18, y - 3, d); P.px(17, y + 2, d);
    },
  };

  M.vulture = {
    w: 40, h: 28, ax: 20, ay: 25, frames: { idle: 4, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), sk = p.skin || '#d08070';
      const flap = anim === 'windup' ? 7 : anim === 'attack' ? -3 : [0, 4, 7, 4][f % 4];
      const y = 10;
      // wings
      for (let side = -1; side <= 1; side += 2) {
        const bx = 20 + side * 3;
        for (let i = 0; i < 14; i++) {
          const wx = bx + side * i;
          const wy = y - flap + Math.round(i * flap / 8);
          const hh = 6 - Math.floor(i / 3);
          P.rect(wx, wy, 1, Math.max(2, hh), i > 9 ? d : m);
          if (i > 6 && i % 2) P.px(wx, wy + hh, d);
          P.px(wx, wy, l);
        }
      }
      // body
      P.ellipse(20, y + 4, 5, 6, m); P.ellipse(20, y + 6, 3, 3, sh(m, 0.1));
      P.rect(18, y - 2, 4, 3, '#f0e8e0');
      // head+neck
      const hx = anim === 'attack' ? 26 : 24;
      P.rect(22, y - 5, 2, 4, sk); P.rect(hx, y - 7, 4, 4, sk); P.px(hx + 1, y - 6, '#101010');
      P.rect(hx + 4, y - 6, 2, 2, '#e0d0a0'); P.px(hx + 5, y - 4, '#e0d0a0');
      // tail & talons
      P.rect(17, y + 10, 6, 2, d);
      P.rect(18, y + 11, 1, 3, '#c0a060'); P.rect(22, y + 11, 1, 3, '#c0a060');
    },
  };

  M.salamander = {
    w: 40, h: 24, ax: 20, ay: 21, frames: { idle: 2, walk: 4, windup: 1, attack: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.25), fl = p.flame || '#ffb030';
      const y = 12 + (anim === 'windup' ? -1 : 0);
      const sw = anim === 'walk' ? [0, 1, 0, -1][f] : 0;
      // tail
      seg(P, 11, y + 3, 5, y + 5 + sw, 4, m); seg(P, 5, y + 5 + sw, 1, y + 3 - sw, 3, m); P.px(0, y + 2 - sw, fl);
      // legs
      const lp = legPair(anim, f, 2);
      P.rect(12, y + 5, 3, 4 - lp[0], d); P.rect(24, y + 5, 3, 4 - lp[1], d);
      P.rect(12 + 2, y + 8 - lp[0], 3, 1, d);
      // body
      P.ellipse(19, y + 3, 9, 4, m); P.ellipse(19, y + 1, 7, 2, l);
      P.rect(12, y + 5, 14, 2, p.belly || '#ffd060');
      P.rect(15, y + 6, 3, 4 - lp[1], m); P.rect(27, y + 6, 3, 4 - lp[0], m);
      // flame crest
      for (let i = 0; i < 6; i++) { const hh = 2 + ((i + f) % 3); P.rect(12 + i * 3, y - 1 - hh, 2, hh, i % 2 ? fl : sh(fl, 0.4)); }
      // head
      const hy = y - (anim === 'windup' ? 3 : 1);
      P.rect(27, hy, 8, 5, m); P.rect(27, hy, 8, 1, l); P.rect(35, hy + 1, 3, 3, m);
      P.px(31, hy + 1, p.eye || '#ffff80');
      if (anim === 'windup') { P.rect(34, hy + 4, 4, 2, '#ff6020'); P.px(36, hy + 4, '#ffe080'); }
      if (anim === 'attack') { P.rect(34, hy + 4, 5, 3, '#401010'); P.rect(35, hy + 5, 4, 1, fl); P.px(38, hy + 4, '#ffffff'); }
    },
  };

  // =====================================================================================
  // HUMANOIDS
  // =====================================================================================
  M.goblin = {
    w: 30, h: 30, ax: 15, ay: 28, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), cl = p.cloth || '#6a4a2a';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 10 + bob + (anim === 'windup' ? 1 : 0);
      const lp = legPair(anim, f, 2);
      P.rect(11, y + 12, 3, 6 - lp[0], d); P.rect(16, y + 12, 3, 6 - lp[1], d);
      P.rect(10, y + 17 - lp[0], 4, 1, '#3a2a1a'); P.rect(15, y + 17 - lp[1], 4, 1, '#3a2a1a');
      P.rect(10, y + 6, 10, 7, cl); P.rect(10, y + 11, 10, 1, sh(cl, -0.3)); P.rect(10, y + 6, 10, 1, sh(cl, 0.2));
      if (p.hood) { P.rect(9, y + 4, 12, 3, p.hood); }
      // back arm
      P.rect(8, y + 7, 2, 4, d);
      // head w/ big ears
      P.rect(9, y - 3, 12, 9, m); P.rect(9, y - 3, 12, 2, l); P.rect(10, y + 5, 10, 1, d);
      tri(P, 9, y - 2, 3, y - 5, 9, y + 2, m); tri(P, 21, y - 2, 27, y - 5, 21, y + 2, m);
      P.px(4, y - 4, l); P.px(26, y - 4, l);
      const ec = p.eye || '#ff3030';
      P.px(16, y, ec); P.px(19, y, ec); P.px(16, y - 1, d); P.px(19, y - 1, d);
      P.rect(21, y + 1, 2, 2, l); // nose
      P.rect(15, y + 3, 5, 1, sh(m, -0.5)); P.px(16, y + 4, '#ffffff'); P.px(19, y + 4, '#ffffff');
      if (p.helm) { P.rect(9, y - 5, 12, 3, p.helm); P.px(15, y - 7, p.helm); P.rect(9, y - 5, 12, 1, sh(p.helm, 0.3)); }
      if (p.feathers) { P.rect(11, y - 7, 2, 4, p.feathers); P.rect(14, y - 9, 2, 6, sh(p.feathers, 0.2)); P.rect(17, y - 7, 2, 4, p.feathers); P.rect(9, y - 4, 12, 2, p.bone || '#e8e0c0'); }
      // weapon arm
      const sw = anim === 'windup' ? -6 : anim === 'attack' ? 5 : 0;
      if (p.weapon === 'bow') {
        const draw = anim === 'windup' ? 3 : 0;
        P.rect(20, y + 7, 3 - draw, 3, m);
        seg(P, 24, y, 26, y + 6, 1, '#8a5a30'); seg(P, 26, y + 6, 24, y + 13, 1, '#8a5a30'); P.rect(24, y + 1, 1, 12, '#e8e0d0');
        if (anim === 'windup') { P.line(24, y + 6, 20, y + 6, '#e8e0d0'); P.rect(20, y + 6, 8, 1, '#c8c0a0'); P.px(28, y + 6, '#a0a0a8'); }
      } else if (p.weapon === 'staff') {
        const up = anim === 'cast' || anim === 'windup' ? -5 : 0;
        P.rect(20, y + 6 + up, 3, 4, m);
        P.rect(23, y - 5 + up, 2, 20, '#6a4424'); P.rect(22, y - 7 + up, 4, 2, p.bone || '#e8e0c0');
        P.circle(24, y - 9 + up, 2, p.accent || '#60ff60'); P.px(23, y - 10 + up, '#ffffff');
      } else {
        P.rect(20, y + 7, 3, 4, m);
        P.rect(22, y + 1 + sw, 2, 9, '#b0b0b8'); P.rect(22, y + 1 + sw, 1, 9, '#e0e0e8'); P.rect(21, y + 9 + sw, 4, 1, '#6a4424'); P.rect(22, y + 10 + sw, 2, 2, '#4a3020');
      }
    },
  };

  M.skeleton = {
    w: 30, h: 34, ax: 15, ay: 32, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f) {
      const b = p.main || '#e8e0d0', d = sh(b, -0.3), dk = '#141018';
      const bob = walkBob(anim, f);
      const y = 7 + bob;
      const lp = legPair(anim, f, 2);
      P.rect(11, y + 16, 2, 8 - lp[0], b); P.rect(16, y + 16, 2, 8 - lp[1], b); P.rect(11, y + 20 - lp[0], 2, 1, d); P.rect(16, y + 20 - lp[1], 2, 1, d);
      P.rect(10, y + 23 - lp[0], 4, 1, d); P.rect(15, y + 23 - lp[1], 4, 1, d);
      P.rect(10, y + 15, 9, 2, d);
      if (p.cloth) { P.rect(9, y + 14, 11, 5, p.cloth); P.rect(9, y + 18, 3, 2, p.cloth); P.rect(15, y + 18, 3, 2, p.cloth); }
      P.rect(14, y + 8, 2, 8, b);
      for (let i = 0; i < 3; i++) P.rect(10, y + 9 + i * 2, 9, 1, b);
      P.rect(9, y + 8, 11, 1, b);
      if (p.armor) { P.rect(9, y + 8, 11, 6, p.armor); P.rect(9, y + 8, 11, 1, sh(p.armor, 0.3)); P.rect(14, y + 9, 1, 5, sh(p.armor, -0.3)); }
      // back arm
      const cast = anim === 'cast';
      P.rect(7, y + 9 - (cast ? 4 : 0), 2, 6, d);
      // skull
      P.rect(9, y - 2, 11, 9, b); P.rect(9, y - 2, 11, 1, '#ffffff'); P.rect(10, y + 7, 9, 2, d);
      P.rect(15, y + 1, 3, 3, dk); P.rect(11, y + 1, 3, 3, dk); P.rect(19, y + 2, 1, 2, d);
      const ec = p.eye || '#ff4040';
      P.px(12, y + 2, ec); P.px(16, y + 2, ec);
      P.rect(12, y + 5, 6, 1, dk); P.px(13, y + 6, dk); P.px(15, y + 6, dk); P.px(17, y + 6, dk);
      const sw = anim === 'windup' ? -7 : anim === 'attack' ? 4 : 0;
      if (p.weapon === 'bow') {
        P.rect(19, y + 9, 3, 2, b);
        seg(P, 22, y + 1, 24, y + 9, 1, '#6a5030'); seg(P, 24, y + 9, 22, y + 17, 1, '#6a5030'); P.rect(22, y + 2, 1, 15, '#c8c0b0');
        if (anim === 'windup') { P.rect(17, y + 9, 10, 1, '#c8c0a0'); P.px(27, y + 9, p.accent || '#a0a0a8'); }
      } else if (p.weapon === 'staff') {
        const up = cast || anim === 'windup' ? -4 : 0;
        P.rect(19, y + 9 + up, 2, 5, b);
        P.rect(21, y - 5 + up, 2, 24, '#3a2a4a'); P.circle(22, y - 6 + up, 2, p.accent || '#b070ff'); P.px(21, y - 7 + up, '#ffffff');
      } else {
        P.rect(19, y + 9, 2, 5, b);
        P.rect(21, y + 1 + sw, 2, 13, '#b0b0b8'); P.rect(21, y + 1 + sw, 1, 13, '#e0e0e8'); P.rect(20, y + 12 + sw, 4, 1, '#5a4a3a'); P.px(21, y + 13 + sw, '#5a4a3a');
      }
      if (p.shield) { P.rect(4, y + 8, 6, 8, p.shield); P.rect(4, y + 8, 6, 1, sh(p.shield, 0.3)); P.rect(6, y + 10, 2, 3, p.shieldMark || sh(p.shield, 0.4)); }
      if (p.helm) { P.rect(8, y - 4, 13, 4, p.helm); P.rect(8, y - 4, 13, 1, sh(p.helm, 0.3)); P.rect(8, y, 2, 3, p.helm); }
      if (p.crown) { P.rect(9, y - 4, 11, 2, p.crown); P.px(9, y - 5, p.crown); P.px(14, y - 6, p.crown); P.px(19, y - 5, p.crown); }
    },
  };

  // Hunched undead eater with long claws.
  M.ghoul = {
    w: 34, h: 30, ax: 16, ay: 28, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), cl = p.cloth || '#4a3a3a';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const crouch = anim === 'windup' ? 3 : 0;
      const x = anim === 'attack' ? 4 : 0;
      const y = 10 + bob + crouch;
      const lp = legPair(anim, f, 2);
      // legs: bent
      P.rect(10 + x, y + 10, 3, 4, d); P.rect(8 + x, y + 13, 3, 5 - lp[0] - Math.min(crouch, 1), d);
      P.rect(16 + x, y + 10, 3, 4, m); P.rect(18 + x, y + 13, 3, 5 - lp[1] - Math.min(crouch, 1), m);
      P.rect(7 + x, y + 17 - lp[0], 4, 1, d); P.rect(18 + x, y + 17 - lp[1], 4, 1, d);
      // torn loincloth
      P.rect(10 + x, y + 9, 10, 3, cl); P.px(11 + x, y + 12, cl); P.px(15 + x, y + 12, cl); P.px(18 + x, y + 12, cl);
      // hunched torso
      P.ellipse(15 + x, y + 4, 7, 6, m);
      for (let i = 0; i < 3; i++) P.rect(13 + i * 3 + x, y + 3, 1, 4, d); // ribs
      P.rect(9 + x, y - 1, 3, 3, l); P.px(11 + x, y - 2, l); // spine bumps
      // back arm
      const reach = anim === 'attack' ? 8 : anim === 'windup' ? -4 : 0;
      seg(P, 13 + x, y + 2, 16 + x + reach / 2, y + 10, 2, d);
      // head low and forward
      const hy = y - 1;
      P.rect(20 + x, hy - 2, 7, 7, m); P.rect(20 + x, hy - 2, 7, 1, l);
      P.px(24 + x, hy, p.eye || '#ffe040'); P.px(26 + x, hy, p.eye || '#ffe040');
      P.rect(22 + x, hy + 3, 5, 2, '#3a0a10'); P.px(23 + x, hy + 3, '#ffffff'); P.px(25 + x, hy + 3, '#ffffff'); P.px(24 + x, hy + 4, '#ffffff');
      if (p.hair) { P.rect(19 + x, hy - 3, 5, 2, p.hair); P.px(19 + x, hy - 1, p.hair); }
      // front arm with claws
      const ax0 = 19 + x, ay0 = y + 3;
      const hx = 24 + x + reach, hyy = y + 9 - (anim === 'windup' ? 8 : 0);
      seg(P, ax0, ay0, hx, hyy, 2, m);
      const cc = p.claw || '#f0e8d0';
      P.px(hx + 1, hyy + 1, cc); P.px(hx + 2, hyy + 2, cc); P.px(hx + 2, hyy, cc); P.px(hx + 3, hyy + 1, cc); P.px(hx, hyy + 2, cc); P.px(hx, hyy + 3, cc);
    },
  };

  // Shambler: zombies, mummies.
  M.shambler = {
    w: 30, h: 34, ax: 15, ay: 32, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.2), mummy = p.style === 'mummy';
      const cl = p.cloth || '#4a5a7a';
      const bob = walkBob(anim, f);
      const lean = anim === 'walk' ? [0, 1, 0, 1][f] : anim === 'windup' ? -1 : anim === 'attack' ? 2 : 0;
      const y = 7 + bob;
      const lp = legPair(anim, f, 3);
      const legC = mummy ? m : sh(cl, -0.2);
      P.rect(11, y + 16, 3, 8 - lp[0], sh(legC, -0.15)); P.rect(16, y + 16, 3, 8 - lp[1], legC);
      P.rect(10, y + 23 - lp[0], 4, 1, d); P.rect(16, y + 23 - lp[1], 4, 1, d);
      // torso
      const tc = mummy ? m : cl;
      P.rect(10 + lean, y + 7, 10, 10, tc); P.rect(10 + lean, y + 7, 10, 1, sh(tc, 0.2));
      if (mummy) { for (let i = 0; i < 5; i++) P.rect(10 + lean, y + 8 + i * 2, 10, 1, i % 2 ? d : l); P.rect(13 + lean, y + 16, 2, 4, l); }
      else { P.rect(10 + lean, y + 16, 10, 2, sh(cl, -0.35)); P.rect(14 + lean, y + 10, 3, 3, sh(m, -0.1)); P.px(12 + lean, y + 14, '#2a1a1a'); P.px(18 + lean, y + 12, '#2a1a1a'); }
      // back arm
      const reach = anim === 'attack' ? 5 : anim === 'windup' ? -3 : 0;
      P.rect(12 + lean, y + 9, 9 + reach, 3, d);
      // head
      const hx = 11 + lean + (anim === 'attack' ? 1 : 0);
      P.rect(hx, y - 2, 9, 9, m); P.rect(hx, y - 2, 9, 1, l);
      if (mummy) {
        for (let i = 0; i < 4; i++) P.rect(hx, y - 1 + i * 2, 9, 1, i % 2 ? d : l);
        P.rect(hx + 4, y + 1, 4, 2, '#1a1010'); P.px(hx + 5, y + 1, p.eye || '#40ff80'); P.px(hx + 7, y + 1, p.eye || '#40ff80');
      } else {
        P.rect(hx + 5, y + 1, 2, 2, '#f0e0a0'); P.px(hx + 6, y + 2, p.eye || '#202020'); P.px(hx + 8, y + 1, p.eye || '#202020');
        P.rect(hx + 5, y + 4, 4, 2, '#3a1a10'); P.px(hx + 6, y + 4, '#e0d0b0');
        if (p.hair) { P.rect(hx, y - 3, 7, 2, p.hair); P.rect(hx - 1, y - 1, 2, 4, p.hair); }
        P.px(hx + 2, y + 3, d); P.px(hx + 3, y - 1, d);
      }
      // front arm reaching
      P.rect(15 + lean, y + 9, 10 + reach, 3, m); P.rect(25 + lean + reach, y + 9, 2, 4, l);
      if (mummy) { P.rect(18 + lean, y + 9, 1, 3, d); P.rect(22 + lean, y + 9, 1, 3, d); P.rect(20 + lean + reach, y + 12, 1, 4, l); }
      if (p.drip) { P.px(26 + lean + reach, y + 13 + (f % 2), p.drip); P.px(hx + 8, y + 6 + (f % 2), p.drip); }
    },
  };

  // Robed caster: witches, necromancers, priests, cultists, bone mages.
  M.robed = {
    w: 30, h: 38, ax: 15, ay: 36, frames: { idle: 2, walk: 4, windup: 2, attack: 1, cast: 2 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.2), tr = p.trim || '#d8c060', sk = p.skin || '#d0a080';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 10 + bob;
      // robe (flared)
      const sway = anim === 'walk' ? [0, 1, 0, -1][f] : 0;
      tri(P, 15, y + 2, 7 + sway, y + 26 - bob, 23 + sway, y + 26 - bob, m);
      P.rect(10, y + 4, 10, 10, m);
      tri(P, 15, y + 6, 12 + sway, y + 26 - bob, 15 + sway, y + 26 - bob, d);
      P.rect(7 + sway, y + 25 - bob, 17, 1, tr);
      P.rect(14, y + 4, 2, 21 - bob, tr);
      if (p.belt) P.rect(10, y + 12, 10, 1, p.belt);
      // back arm/sleeve
      const casting = anim === 'cast' || anim === 'windup';
      if (casting) { P.rect(8, y + 1, 3, 7, d); P.rect(8, y, 3, 2, sk); }
      else P.rect(8, y + 5, 3, 8, d);
      // head variants
      const hd = p.head || 'hood';
      if (hd === 'skull') {
        P.rect(11, y - 6, 9, 8, p.bone || '#e8e0d0'); P.rect(12, y - 4, 2, 2, '#141018'); P.rect(16, y - 4, 2, 2, '#141018');
        P.px(12, y - 3, p.eye || '#b070ff'); P.px(16, y - 3, p.eye || '#b070ff'); P.rect(13, y, 5, 1, '#141018');
        P.rect(10, y - 8, 11, 4, m); P.rect(10, y - 8, 2, 10, m); P.rect(10, y - 8, 11, 1, l);
      } else if (hd === 'witch') {
        P.rect(11, y - 5, 8, 7, sk); P.px(18, y - 2, sh(sk, -0.2)); P.rect(19, y - 2, 2, 2, sh(sk, -0.1));
        P.px(15, y - 3, p.eye || '#60ff60'); P.px(17, y - 3, p.eye || '#60ff60'); P.rect(15, y, 3, 1, '#3a1a1a');
        P.rect(10, y - 5, 3, 9, p.hair || '#303030');
        P.rect(7, y - 6, 17, 2, p.hat || d); tri(P, 10, y - 6, 20, y - 6, 13, y - 17, p.hat || d); P.rect(11, y - 8, 8, 1, tr);
        P.px(13, y - 17, p.hat || d); P.px(12, y - 16, p.hat || d);
      } else if (hd === 'priest') {
        P.rect(11, y - 5, 8, 7, sk); P.rect(13, y - 3, 2, 1, '#101010'); P.rect(16, y - 3, 2, 1, '#101010');
        P.px(14, y - 3, p.eye || '#ffd040'); P.px(17, y - 3, p.eye || '#ffd040');
        // nemes-like headdress
        P.rect(10, y - 7, 10, 3, tr); for (let i = 0; i < 5; i++) P.rect(10 + i * 2, y - 7, 1, 3, p.stripe || '#3050a0');
        P.rect(9, y - 5, 2, 8, tr); P.rect(19, y - 5, 2, 5, tr); P.px(15, y - 8, tr);
      } else if (hd === 'horned') {
        P.rect(10, y - 7, 11, 10, m); P.rect(10, y - 7, 11, 1, l); P.rect(12, y - 5, 8, 6, '#0a0608');
        P.px(14, y - 3, p.eye || '#ff3020'); P.px(18, y - 3, p.eye || '#ff3020');
        const hc = p.horns || '#e8d8c0';
        P.rect(8, y - 9, 2, 4, hc); P.px(7, y - 11, hc); P.px(7, y - 10, hc); P.rect(21, y - 9, 2, 4, hc); P.px(23, y - 11, hc); P.px(23, y - 10, hc);
      } else {
        // deep hood with glowing eyes
        P.rect(10, y - 7, 11, 10, m); P.rect(10, y - 7, 11, 1, l); P.rect(20, y - 5, 1, 7, d);
        P.rect(13, y - 4, 7, 6, p.face || '#0a0608');
        P.px(15, y - 2, p.eye || '#ffd040'); P.px(18, y - 2, p.eye || '#ffd040');
        if (p.mask) { P.rect(13, y - 4, 7, 4, p.mask); P.px(15, y - 3, '#101010'); P.px(18, y - 3, '#101010'); }
        P.px(15, y - 8, m); P.px(14, y - 9, l);
      }
      // staff arm
      const up = casting ? -6 : anim === 'attack' ? -3 : 0;
      P.rect(19, y + 5 + up, 3, 5, l); P.rect(20, y + 9 + up, 2, 2, sk);
      const st = p.staff || '#5a3a2a';
      if (p.weapon !== 'none') {
        P.rect(22, y - 8 + up, 2, 34 + (up < 0 ? 0 : 0) - (casting ? 0 : 0), st);
        const orb = p.accent || '#b070ff';
        if (p.weapon === 'scythe') { P.rect(18, y - 9 + up, 10, 2, '#b0b0c0'); P.rect(15, y - 8 + up, 4, 2, '#d0d0e0'); P.px(14, y - 6 + up, '#d0d0e0'); }
        else if (p.weapon === 'ankh') { P.rect(21, y - 12 + up, 4, 4, tr); P.rect(22, y - 11 + up, 2, 2, '#1a1010'); P.rect(19, y - 8 + up, 8, 2, tr); }
        else { P.rect(21, y - 10 + up, 4, 2, sh(st, 0.3)); P.circle(23, y - 12 + up, 2, orb); P.px(22, y - 13 + up, '#ffffff'); }
        if (casting && f % 2) { P.px(20, y - 15 + up, orb); P.px(26, y - 13 + up, orb); P.px(23, y - 16 + up, '#ffffff'); }
      }
      if (casting) { const orb = p.accent || '#b070ff'; P.circle(10, y - 1, 2, orb); P.px(9, y - 2, '#ffffff'); }
    },
  };

  M.lizardman = {
    w: 36, h: 38, ax: 16, ay: 36, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), bl = p.belly || '#d8d090';
      const bob = walkBob(anim, f);
      const y = 11 + bob;
      const lp = legPair(anim, f, 2);
      // tail
      seg(P, 11, y + 13, 6, y + 18, 3, d); seg(P, 6, y + 18, 2, y + 21, 2, d);
      // legs (digitigrade)
      P.rect(11, y + 15, 3, 5, d); P.rect(10, y + 19, 3, 6 - lp[0], d); P.rect(9, y + 24 - lp[0], 5, 1, d);
      P.rect(16, y + 15, 3, 5, m); P.rect(17, y + 19, 3, 6 - lp[1], m); P.rect(17, y + 24 - lp[1], 5, 1, d);
      // torso
      P.rect(10, y + 4, 10, 12, m); P.rect(13, y + 6, 5, 9, bl); for (let i = 0; i < 4; i++) P.rect(13, y + 7 + i * 2, 5, 1, sh(bl, -0.15));
      P.rect(10, y + 4, 10, 1, l);
      if (p.armor) { P.rect(9, y + 3, 5, 4, p.armor); P.rect(9, y + 13, 12, 2, p.armor); }
      // back arm (holds spear)
      const thrust = anim === 'attack' ? 7 : anim === 'windup' ? -5 : 0;
      P.rect(8, y + 5, 3, 7, d);
      // head
      P.rect(12, y - 4, 8, 8, m); P.rect(19, y - 2, 6, 4, m); P.rect(19, y + 2, 6, 1, bl); P.rect(12, y - 4, 8, 1, l);
      P.px(17, y - 2, p.eye || '#ffd040'); P.px(18, y - 2, '#101010'); P.px(24, y - 1, d);
      if (anim === 'attack' || anim === 'windup') { P.rect(20, y + 2, 5, 1, '#801020'); P.px(21, y + 2, '#ffffff'); P.px(23, y + 2, '#ffffff'); }
      // crest
      const cr = p.crest || '#e04030';
      P.rect(11, y - 6, 2, 3, cr); P.rect(13, y - 7, 2, 3, cr); P.rect(15, y - 6, 2, 2, cr); P.rect(10, y - 3, 1, 4, cr);
      // spear
      const sy = y + 8;
      P.rect(2 + thrust, sy, 30, 1, '#6a4a2a'); P.rect(2 + thrust, sy + 1, 30, 1, '#4a3020');
      tri(P, 32 + thrust, sy - 2, 32 + thrust, sy + 3, 36 + thrust, sy + 1, p.tip || '#c8d0d8');
      P.px(31 + thrust, sy - 1, '#e04030');
      // front arm
      P.rect(17, y + 5, 3, 4, m); P.rect(18 + Math.max(0, thrust / 2), y + 7, 4, 3, m);
    },
  };

  M.bandit = {
    w: 32, h: 34, ax: 15, ay: 32, frames: { idle: 2, walk: 4, windup: 1, attack: 2 },
    draw(P, p, anim, f) {
      const sk = p.skin || '#c08858', cl = p.main || '#c8a878', d = sh(cl, -0.3), sc = p.scarf || '#a03030';
      const bob = walkBob(anim, f);
      const y = 9 + bob + (anim === 'windup' ? 1 : 0);
      const lp = legPair(anim, f, 2);
      P.rect(11, y + 15, 3, 7 - lp[0], sh(p.pants || '#6a5a4a', -0.15)); P.rect(16, y + 15, 3, 7 - lp[1], p.pants || '#6a5a4a');
      P.rect(10, y + 21 - lp[0], 4, 2, '#3a2a1a'); P.rect(16, y + 21 - lp[1], 4, 2, '#3a2a1a');
      // torso
      P.rect(10, y + 6, 10, 10, cl); P.rect(10, y + 6, 10, 1, sh(cl, 0.2)); P.rect(10, y + 13, 10, 2, p.belt || '#5a3a20'); P.px(15, y + 13, '#e0c040');
      P.rect(12, y + 6, 6, 3, sc);
      // back arm
      P.rect(8, y + 7, 2, 6, sh(sk, -0.2));
      // head w/ turban & mask
      P.rect(11, y - 2, 8, 8, sk); P.rect(17, y + 1, 2, 2, sh(sk, -0.1));
      P.rect(10, y - 4, 10, 4, p.turban || '#e8e0d0'); P.rect(10, y - 4, 10, 1, '#ffffff'); P.px(9, y - 1, p.turban || '#e8e0d0'); P.rect(8, y, 2, 4, p.turban || '#e8e0d0');
      P.rect(11, y + 2, 9, 4, sc); P.rect(15, y, 2, 1, '#101010'); P.px(18, y, '#101010');
      const sw = anim === 'windup' ? -1 : anim === 'attack' ? 1 : 0;
      if (p.weapon === 'bow') {
        P.rect(19, y + 7, 4, 3, sk);
        seg(P, 24, y - 1, 26, y + 7, 1, '#7a4a20'); seg(P, 26, y + 7, 24, y + 15, 1, '#7a4a20'); P.rect(24, y, 1, 15, '#e8e0d0');
        if (anim === 'windup') { P.rect(19, y + 7, 10, 1, '#c8c0a0'); P.px(29, y + 7, '#d0d0d8'); }
        P.rect(8, y + 3, 3, 9, '#6a4a2a'); P.px(8, y + 2, '#e8e8e8'); P.px(10, y + 2, '#e8e8e8');
      } else {
        // curved scimitar
        if (sw < 0) { P.rect(19, y + 2, 3, 6, sk); seg(P, 20, y + 2, 16, y - 8, 2, '#d0d8e0'); P.px(15, y - 9, '#ffffff'); P.rect(19, y + 1, 4, 1, '#c0a040'); }
        else if (sw > 0) {
          P.rect(19, y + 7, 5, 3, sk);
          if (f) { seg(P, 24, y + 9, 31, y + 12, 2, '#d0d8e0'); P.px(32, y + 11, '#ffffff'); }
          else { seg(P, 24, y + 8, 31, y + 4, 2, '#d0d8e0'); P.px(31, y + 3, '#ffffff'); }
          P.rect(23, y + 7, 1, 4, '#c0a040');
        } else { P.rect(19, y + 7, 3, 5, sk); seg(P, 21, y + 10, 24, y + 1, 2, '#d0d8e0'); P.px(25, y, '#ffffff'); P.rect(19, y + 10, 4, 1, '#c0a040'); }
      }
    },
  };

  // Armored knight: skeleton knights, dark knights, hollow soldiers.
  M.knight = {
    w: 36, h: 40, ax: 17, ay: 38, frames: { idle: 2, walk: 4, windup: 1, attack: 2, block: 1 },
    draw(P, p, anim, f) {
      const a = p.main || '#7a7a8a', d = sh(a, -0.35), l = sh(a, 0.3), tr = p.trim || '#c0a040', cl = p.cloth || '#6a1a2a';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 11 + bob;
      const lp = legPair(anim, f, 2);
      // cape behind
      if (p.cape) { tri(P, 11, y + 1, 5, y + 24, 16, y + 24, p.cape); P.rect(5, y + 23, 3, 2, sh(p.cape, -0.3)); }
      P.rect(11, y + 16, 4, 9 - lp[0], d); P.rect(17, y + 16, 4, 9 - lp[1], a); P.rect(17, y + 16, 1, 9 - lp[1], l);
      P.rect(10, y + 24 - lp[0], 5, 2, d); P.rect(17, y + 24 - lp[1], 5, 2, d);
      // tabard + chest
      P.rect(10, y + 4, 12, 13, a); P.rect(10, y + 4, 12, 2, l); P.rect(10, y + 15, 12, 2, d);
      P.rect(13, y + 8, 6, 10, cl); P.rect(13, y + 17, 6, 2, sh(cl, -0.3)); P.rect(15, y + 10, 2, 4, tr);
      P.rect(8, y + 3, 5, 4, l); P.rect(19, y + 3, 5, 4, l); P.rect(8, y + 6, 5, 1, d); P.rect(19, y + 6, 5, 1, d);
      // helmet
      if (p.helm === 'skull') {
        P.rect(11, y - 6, 10, 10, p.bone || '#e8e0d0'); P.rect(13, y - 3, 3, 3, '#141018'); P.rect(17, y - 3, 3, 3, '#141018');
        P.px(14, y - 2, p.eye || '#40c0ff'); P.px(18, y - 2, p.eye || '#40c0ff'); P.rect(13, y + 2, 7, 1, '#141018');
        P.rect(10, y - 8, 12, 4, a); P.rect(10, y - 8, 12, 1, l); P.rect(15, y - 11, 2, 3, cl);
      } else {
        P.rect(11, y - 7, 10, 11, a); P.rect(11, y - 7, 10, 2, l); P.rect(20, y - 5, 1, 8, d);
        P.rect(13, y - 3, 8, 2, '#0a0610'); P.px(15, y - 3, p.eye || '#ff3020'); P.px(18, y - 3, p.eye || '#ff3020');
        P.rect(16, y, 1, 3, d); P.rect(18, y, 1, 3, d);
        if (p.horns) { P.rect(9, y - 9, 2, 5, p.horns); P.px(8, y - 11, p.horns); P.px(8, y - 10, p.horns); P.rect(21, y - 9, 2, 5, p.horns); P.px(23, y - 11, p.horns); P.px(23, y - 10, p.horns); }
        else if (p.plume) { P.rect(14, y - 10, 4, 3, p.plume); P.rect(12, y - 11, 4, 2, p.plume); P.px(11, y - 10, p.plume); }
        if (p.hollow) { P.rect(13, y - 3, 8, 2, p.hollow); P.px(15, y - 3, '#ffffff'); P.px(18, y - 3, '#ffffff'); }
      }
      const blk = anim === 'block';
      // weapon arm & weapon
      const wp = p.weapon || 'sword';
      if (anim === 'windup') {
        P.rect(21, y + 1, 4, 5, a);
        if (wp === 'axe') { P.rect(22, y - 14, 2, 17, '#4a3020'); P.rect(18, y - 16, 6, 6, '#c0c0d0'); P.rect(18, y - 16, 1, 6, '#ffffff'); }
        else { P.rect(22, y - 16, 3, 17, p.blade || '#c8d0e0'); P.rect(22, y - 16, 1, 17, '#ffffff'); P.rect(20, y + 1, 7, 2, tr); }
      } else if (anim === 'attack') {
        P.rect(21, y + 6, 6, 4, a);
        if (f === 0) { seg(P, 27, y + 8, 35, y - 3, 3, p.blade || '#c8d0e0'); P.rect(25, y + 6, 2, 6, tr); }
        else { seg(P, 27, y + 9, 36, y + 12, 3, p.blade || '#c8d0e0'); P.rect(26, y + 6, 2, 6, tr); }
      } else {
        P.rect(21, y + 6, 4, 6, a);
        if (wp === 'axe') { P.rect(24, y - 4, 2, 19, '#4a3020'); P.rect(25, y - 5, 6, 7, '#c0c0d0'); P.rect(30, y - 5, 1, 7, '#ffffff'); }
        else { P.rect(24, y - 6, 3, 18, p.blade || '#c8d0e0'); P.rect(24, y - 6, 1, 18, '#ffffff'); P.rect(22, y + 10, 7, 2, tr); P.rect(25, y + 12, 1, 3, '#3a2a20'); }
      }
      // shield in front
      if (p.shield) {
        const sx = blk ? 20 : 4, sy = blk ? y + 1 : y + 6;
        P.rect(sx, sy, 9, 13, p.shield); P.rect(sx, sy, 9, 1, sh(p.shield, 0.35)); P.rect(sx + 1, sy + 12, 7, 2, sh(p.shield, -0.3)); P.rect(sx + 3, sy + 13, 3, 2, sh(p.shield, -0.3));
        P.rect(sx + 3, sy + 3, 3, 6, tr); P.rect(sx + 2, sy + 5, 5, 2, tr);
        if (blk) { P.rect(sx + 9, sy, 1, 13, '#ffffff'); }
      }
      if (p.glow) { P.px(15, y + 11, p.glow); P.px(16, y + 12, p.glow); }
    },
  };

  // Jackal-headed tomb guardian with a halberd; has a spin anim.
  M.anubis = {
    w: 44, h: 46, ax: 20, ay: 44, frames: { idle: 2, walk: 4, windup: 1, attack: 1, spin: 4 },
    draw(P, p, anim, f) {
      const m = p.main || '#2a2a38', d = sh(m, -0.3), l = sh(m, 0.3), g = p.gold || '#e0b040', cl = p.cloth || '#e8e0c8';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 14 + bob;
      const lp = legPair(anim, f, 2);
      P.rect(15, y + 17, 4, 10 - lp[0], d); P.rect(22, y + 17, 4, 10 - lp[1], m);
      P.rect(14, y + 26 - lp[0], 6, 2, g); P.rect(21, y + 26 - lp[1], 6, 2, g);
      // kilt
      tri(P, 20, y + 12, 12, y + 22, 29, y + 22, cl); P.rect(19, y + 13, 3, 9, g);
      // torso
      P.rect(14, y + 2, 13, 12, m); P.rect(14, y + 2, 13, 1, l);
      P.rect(13, y + 1, 15, 4, g); for (let i = 0; i < 5; i++) P.rect(14 + i * 3, y + 2, 1, 3, '#3050a0');
      P.rect(14, y + 12, 13, 2, g);
      // head (jackal)
      P.rect(16, y - 7, 9, 8, m); P.rect(24, y - 4, 6, 4, m); P.rect(29, y - 3, 2, 2, d);
      tri(P, 16, y - 7, 17, y - 16, 20, y - 7, m); tri(P, 20, y - 7, 22, y - 15, 24, y - 7, d); P.px(18, y - 11, '#c04040');
      P.px(23, y - 5, p.eye || '#40e0ff'); P.px(22, y - 5, p.eye || '#40e0ff');
      P.rect(15, y - 3, 2, 6, g); P.rect(15, y - 7, 1, 5, '#3050a0');
      if (anim === 'spin') {
        // halberd sweeping around
        const ang = f * Math.PI / 2;
        const cx = 20, cy = y + 7;
        const ex = cx + Math.round(Math.cos(ang) * 20), ey = cy + Math.round(Math.sin(ang) * 9);
        const bx = cx - Math.round(Math.cos(ang) * 12), by = cy - Math.round(Math.sin(ang) * 5);
        seg(P, bx, by, ex, ey, 2, '#6a4a2a');
        P.rect(ex - 2, ey - 3, 5, 6, '#d0d8e0'); P.px(ex, ey - 3, '#ffffff');
        P.rect(11, y + 4, 4, 4, m); P.rect(26, y + 4, 4, 4, m);
        return;
      }
      // halberd
      const up = anim === 'windup' ? -8 : anim === 'attack' ? 6 : 0;
      const hx = anim === 'attack' ? 32 : 30;
      P.rect(26, y + 5 + Math.min(0, up / 2), 4, 5, m);
      if (anim === 'attack') {
        seg(P, 22, y + 3, 42, y + 16, 2, '#6a4a2a');
        tri(P, 38, y + 9, 44, y + 13, 38, y + 18, '#d0d8e0'); P.px(40, y + 12, '#ffffff');
      } else {
        P.rect(hx, y - 16 + up, 2, 42, '#6a4a2a'); P.rect(hx, y - 1 + up, 2, 2, g);
        tri(P, hx + 2, y - 16 + up, hx + 8, y - 11 + up, hx + 2, y - 6 + up, '#d0d8e0'); P.rect(hx - 1, y - 20 + up, 4, 4, '#d0d8e0'); P.px(hx + 4, y - 11 + up, '#ffffff');
      }
      P.rect(9, y + 3, 4, 9, d); P.rect(9, y + 11, 3, 2, m);
    },
  };

  // =====================================================================================
  // SPIRITS, ELEMENTALS & CONSTRUCTS
  // =====================================================================================
  M.wraith = {
    w: 32, h: 38, ax: 16, ay: 36, frames: { idle: 4, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f, ctx) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.25);
      const wv = [0, 1, 0, -1][f % 4];
      const y = 6 + wv;
      // tattered tail (translucent)
      ctx.globalAlpha = 0.75;
      tri(P, 9, y + 12, 23, y + 12, 14 + wv, y + 30, d);
      for (let i = 0; i < 4; i++) P.rect(10 + i * 3 + ((i + f) % 2), y + 22 + (i % 2) * 3, 2, 4 + (i % 2) * 2, d);
      ctx.globalAlpha = 0.5;
      P.rect(13 + wv, y + 29, 2, 3, d); P.rect(17 - wv, y + 26, 2, 4, d);
      ctx.globalAlpha = 1;
      // body/cloak
      P.rect(9, y + 4, 14, 12, m); tri(P, 16, y - 2, 7, y + 16, 25, y + 16, m);
      P.rect(9, y + 4, 2, 10, d); P.rect(21, y + 4, 2, 10, l);
      // hood
      P.rect(10, y - 4, 12, 11, m); P.rect(10, y - 4, 12, 2, l); P.px(15, y - 6, m); P.px(16, y - 6, m); P.px(16, y - 7, l);
      P.rect(12, y - 1, 9, 7, '#06040a');
      const ec = p.eye || '#80ffff';
      P.rect(14, y + 1, 2, 2, ec); P.rect(18, y + 1, 2, 2, ec); P.px(14, y + 1, '#ffffff'); P.px(18, y + 1, '#ffffff');
      if (anim === 'attack' || anim === 'windup') P.rect(15, y + 4, 4, 1, ec);
      // arms with claws
      const reach = anim === 'attack' ? 8 : anim === 'windup' ? -2 : 0;
      const armY = anim === 'windup' || anim === 'cast' ? y - 2 : y + 6;
      seg(P, 21, y + 6, 26 + reach, armY, 3, m);
      const cc = p.claw || '#d0d8e0';
      P.line(26 + reach, armY, 29 + reach, armY - 2, cc); P.line(26 + reach, armY, 30 + reach, armY, cc); P.line(26 + reach, armY, 29 + reach, armY + 2, cc);
      seg(P, 10, y + 6, 5, armY + 2, 3, d); P.line(5, armY + 2, 2, armY, cc); P.line(5, armY + 2, 2, armY + 3, cc);
      if (p.chain) { P.px(11, y + 10, p.chain); P.px(13, y + 11, p.chain); P.px(15, y + 11, p.chain); P.px(17, y + 10, p.chain); }
      if (p.frost) { P.px(10, y - 3, '#ffffff'); P.px(21, y, '#ffffff'); P.px(8, y + 14, '#e8ffff'); }
    },
  };

  M.wisp = {
    w: 18, h: 26, ax: 9, ay: 24, frames: { idle: 4, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f, ctx) {
      const m = p.main || '#b0ff80', l = sh(m, 0.5);
      const y = 12 + [0, -1, 0, 1][f % 4];
      const big = anim === 'windup' ? 1 : 0;
      ctx.globalAlpha = 0.45;
      P.circle(9, y, 6 + big, m);
      ctx.globalAlpha = 0.8;
      // flame tail
      P.rect(8 + (f % 2), y + 5, 2, 3, m); P.px(9 - (f % 2), y + 8, m); P.px(9, y + 10, m);
      tri(P, 5, y - 1, 13, y - 1, 9 + ((f % 2) ? 1 : -1), y - 9 - big, m);
      ctx.globalAlpha = 1;
      P.circle(9, y, 4 + big, m); P.circle(9, y, 2 + big, l); P.px(8, y - 1, '#ffffff'); P.px(9, y - 1, '#ffffff');
      if (p.face !== false) { P.px(7, y, p.eye || '#204010'); P.px(11, y, p.eye || '#204010'); }
    },
  };

  M.golem = {
    w: 48, h: 50, ax: 24, ay: 48, frames: { idle: 2, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.35), l = sh(m, 0.25), c = p.core || '#80e0ff', cr = p.crack || c;
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 14 + bob;
      const lp = legPair(anim, f, 3);
      // legs
      P.rect(15, y + 20, 7, 12 - lp[0], d); P.rect(26, y + 20, 7, 12 - lp[1], m); P.rect(26, y + 20, 2, 12 - lp[1], l);
      P.rect(14, y + 30 - lp[0], 9, 3, d); P.rect(25, y + 30 - lp[1], 9, 3, d);
      // torso (big boulder)
      P.rect(12, y + 2, 24, 20, m); P.rect(10, y + 5, 28, 13, m); P.rect(12, y + 2, 24, 3, l); P.rect(10, y + 16, 28, 3, d);
      // cracks glowing
      P.line(16, y + 6, 20, y + 12, cr); P.line(20, y + 12, 18, y + 17, cr); P.line(30, y + 5, 27, y + 11, cr); P.line(33, y + 13, 30, y + 18, cr);
      P.rect(21, y + 8, 6, 6, c); P.rect(22, y + 9, 4, 4, sh(c, 0.4)); P.px(23, y + 10, '#ffffff');
      // head small
      P.rect(19, y - 6, 10, 9, m); P.rect(19, y - 6, 10, 2, l); P.rect(21, y - 2, 7, 2, '#0a0810');
      P.px(22, y - 2, p.eye || c); P.px(26, y - 2, p.eye || c);
      if (p.crystals) { tri(P, 13, y + 3, 15, y - 7, 18, y + 3, p.crystals); tri(P, 29, y + 2, 33, y - 9, 35, y + 3, p.crystals); P.px(32, y - 6, '#ffffff'); P.px(15, y - 4, '#ffffff'); tri(P, 22, y - 5, 24, y - 11, 26, y - 5, p.crystals); }
      if (p.lava) { P.px(14, y + 21, p.lava); P.px(35, y + 19, p.lava); P.rect(11, y + 12, 1, 2, p.lava); }
      // arms: huge fists
      const up = anim === 'windup' ? -14 : anim === 'attack' ? 6 : 0;
      P.rect(4, y + 4 + Math.max(0, up / 2), 7, 14, d); P.rect(2, y + 16 + Math.max(0, up / 2), 10, 9, d);
      P.rect(37, y + 4 + Math.min(0, up), 7, 12, m); P.rect(36, y + 14 + up, 11, 10, m); P.rect(36, y + 14 + up, 11, 2, l);
      if (anim === 'windup' || anim === 'attack') { P.rect(2, y + 4 + up, 8, 8, m); P.rect(2, y + 4 + up, 8, 2, l); P.rect(4, y + 11 + up, 5, 5, d); }
      P.line(39, y + 16 + up, 41, y + 21 + up, cr);
    },
  };

  // =====================================================================================
  // FLYERS & DEMONS
  // =====================================================================================
  M.harpy = {
    w: 40, h: 36, ax: 20, ay: 33, frames: { idle: 4, walk: 4, windup: 1, attack: 1 },
    draw(P, p, anim, f) {
      const m = p.main || '#8aa0d0', d = sh(m, -0.3), l = sh(m, 0.3), sk = p.skin || '#e0c0b0', hr = p.hair || '#e8f0ff';
      const flap = anim === 'windup' ? 8 : anim === 'attack' ? -2 : [0, 4, 8, 4][f % 4];
      const y = 12;
      // wings
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 13; i++) {
          const wx = 20 + side * (3 + i);
          const wy = y - flap + Math.round(i * flap / 7) - 1;
          const hh = 8 - Math.floor(i / 2);
          P.rect(wx, wy, 1, Math.max(2, hh), i % 3 === 0 ? d : m);
          P.px(wx, wy, l);
          if (i > 5) P.px(wx, wy + Math.max(2, hh), d);
        }
      }
      // body
      P.rect(17, y + 2, 7, 9, sk); P.rect(17, y + 7, 7, 6, m); P.rect(17, y + 7, 7, 1, l);
      // head + hair
      P.rect(17, y - 5, 7, 7, sk); P.rect(16, y - 7, 9, 3, hr); P.rect(16, y - 5, 2, 8, hr); P.rect(14, y - 4, 2, 7, hr);
      P.px(22, y - 3, p.eye || '#ff4040'); P.px(20, y - 3, p.eye || '#ff4040'); P.rect(20, y, 3, 1, '#801020');
      // legs/talons
      const tal = anim === 'attack' ? 3 : 0;
      P.rect(18, y + 13, 2, 4 + tal, '#c0a060'); P.rect(22, y + 13, 2, 4 + tal, '#c0a060');
      P.rect(17, y + 17 + tal, 4, 1, '#403020'); P.rect(22, y + 17 + tal, 4, 1, '#403020');
      P.rect(16, y + 12, 9, 2, d);
    },
  };

  M.imp = {
    w: 28, h: 30, ax: 14, ay: 28, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 2 },
    draw(P, p, anim, f) {
      const m = p.main || '#c03030', d = sh(m, -0.35), l = sh(m, 0.25), wg = p.wing || sh(m, -0.5);
      const hov = [0, -1, -2, -1][f % 4];
      const y = 10 + (anim === 'walk' || anim === 'idle' ? hov : 0);
      // wings
      const fl = f % 2;
      tri(P, 12, y + 3, 2, y - 4 - fl * 2, 4, y + 8, wg); tri(P, 12, y + 3, 5, y - 2 - fl * 2, 3, y + 3, sh(wg, 0.2));
      // tail
      seg(P, 11, y + 12, 5, y + 16, 1, d); tri(P, 3, y + 14, 6, y + 16, 3, y + 18, d);
      // legs
      P.rect(11, y + 13, 2, 5, d); P.rect(15, y + 13, 2, 5, m); P.rect(10, y + 17, 3, 1, '#201010'); P.rect(15, y + 17, 3, 1, '#201010');
      // body
      P.ellipse(14, y + 8, 5, 6, m); P.rect(12, y + 8, 5, 4, sh(m, 0.15)); P.px(13, y + 4, l);
      // head
      P.rect(10, y - 4, 10, 8, m); P.rect(10, y - 4, 10, 1, l);
      const hc = p.horns || '#2a1a1a';
      P.rect(10, y - 6, 2, 2, hc); P.px(9, y - 7, hc); P.rect(17, y - 6, 2, 2, hc); P.px(19, y - 7, hc);
      P.rect(20, y - 1, 1, 2, d); P.px(21, y - 2, d); // ear
      P.px(15, y - 1, p.eye || '#ffe040'); P.px(18, y - 1, p.eye || '#ffe040');
      P.rect(14, y + 2, 5, 1, '#200808'); P.px(15, y + 2, '#ffffff'); P.px(17, y + 2, '#ffffff');
      // arm with fireball
      const casting = anim === 'cast' || anim === 'windup';
      P.rect(18, y + 5 - (casting ? 4 : 0), 3, 5, m);
      if (casting) { const fc = p.fire || '#ff9020'; P.circle(21, y - 1, 3 + (f % 2), fc); P.circle(21, y - 1, 1 + (f % 2), '#ffe080'); P.px(21, y - 5 - (f % 2), fc); }
      else if (anim === 'attack') { P.rect(20, y + 5, 4, 2, m); }
      if (p.trident) { P.rect(22, y - 6, 1, 22, '#303030'); P.rect(20, y - 8, 5, 1, '#606060'); P.px(20, y - 9, '#606060'); P.px(22, y - 9, '#606060'); P.px(24, y - 9, '#606060'); }
    },
  };

  M.gargoyle = {
    w: 40, h: 38, ax: 20, ay: 35, frames: { idle: 4, walk: 4, windup: 1, attack: 1, statue: 1 },
    draw(P, p, anim, f) {
      const m = p.main || '#6a6a78', d = sh(m, -0.35), l = sh(m, 0.25);
      const statue = anim === 'statue';
      const flap = statue ? 0 : anim === 'windup' ? 8 : anim === 'attack' ? -2 : [0, 4, 7, 4][f % 4];
      const y = statue ? 16 : 11;
      // wings
      if (statue) { tri(P, 13, y, 3, y - 8, 9, y + 12, d); tri(P, 27, y, 37, y - 8, 31, y + 12, d); P.line(3, y - 8, 9, y + 12, l); }
      else for (let side = -1; side <= 1; side += 2) {
        const wy = y - flap;
        tri(P, 20 + side * 3, y + 2, 20 + side * 18, wy - 4, 20 + side * 14, y + 10 - flap / 2, d);
        P.line(20 + side * 3, y + 2, 20 + side * 18, wy - 4, l);
        P.line(20 + side * 10, y + 1 - flap / 2, 20 + side * 14, y + 10 - flap / 2, m);
      }
      // body
      const hunch = statue ? 3 : 0;
      P.rect(14, y + 1 + hunch, 12, 12, m); P.rect(14, y + 1 + hunch, 12, 2, l); P.rect(15, y + 6 + hunch, 10, 1, d);
      // legs
      if (statue) { P.rect(13, y + 12, 5, 6, d); P.rect(22, y + 12, 5, 6, m); P.rect(10, y + 18, 20, 3, '#5a5a5a'); P.rect(10, y + 18, 20, 1, '#7a7a7a'); }
      else { const t = anim === 'attack' ? 3 : 0; P.rect(15, y + 13, 3, 5 + t, d); P.rect(22, y + 13, 3, 5 + t, m); P.rect(14, y + 17 + t, 5, 1, d); P.rect(22, y + 17 + t, 5, 1, d); }
      // head
      P.rect(16, y - 6 + hunch, 10, 8, m); P.rect(16, y - 6 + hunch, 10, 1, l); P.rect(24, y - 3 + hunch, 3, 4, m);
      const hc = p.horns || sh(m, -0.2);
      tri(P, 16, y - 5 + hunch, 13, y - 11 + hunch, 18, y - 6 + hunch, hc); tri(P, 22, y - 6 + hunch, 24, y - 12 + hunch, 25, y - 6 + hunch, hc);
      const ec = statue ? d : (p.eye || '#ff4020');
      P.px(22, y - 3 + hunch, ec); P.px(24, y - 3 + hunch, ec);
      P.rect(21, y + hunch, 6, 1, '#101010'); if (!statue) { P.px(22, y + 1 + hunch, '#ffffff'); P.px(25, y + 1 + hunch, '#ffffff'); }
      // arms
      const reach = anim === 'attack' ? 6 : 0;
      P.rect(24, y + 3 + hunch, 3, 7, m); P.rect(26 + reach, y + 8 + hunch, 3, 3, d); P.px(29 + reach, y + 10 + hunch, '#e0e0e0');
      if (statue) { P.px(18, y + 3, l); P.px(20, y + 9, d); P.px(15, y + 10, d); }
    },
  };

  // Burrowing worm. Extra anims: hidden (only a sand mound), emerge.
  M.worm = {
    w: 40, h: 50, ax: 20, ay: 46, frames: { idle: 2, walk: 2, windup: 1, attack: 1, hidden: 2, emerge: 2 },
    draw(P, p, anim, f) {
      const m = p.main || '#c09060', d = sh(m, -0.3), l = sh(m, 0.25), sand = p.sand || '#d8b878', gum = p.gum || '#c04050';
      const ground = 46;
      // sand mound
      const moundW = anim === 'hidden' ? 9 + f : 14;
      P.ellipse(20, ground - 1, moundW, 3, sand); P.ellipse(19, ground - 2, moundW - 3, 2, sh(sand, 0.15));
      P.px(8 + f * 3, ground - 3, sh(sand, -0.2)); P.px(30 - f * 2, ground - 3, sh(sand, -0.2));
      if (anim === 'hidden') { P.px(20, ground - 4 - f, sh(sand, 0.3)); P.px(22 - f * 2, ground - 5, sh(sand, 0.2)); return; }
      // body segments rising in an S curve
      const h = anim === 'emerge' ? (f ? 22 : 12) : anim === 'windup' ? 38 : anim === 'attack' ? 32 : 34 + f;
      const bend = anim === 'windup' ? -5 : anim === 'attack' ? 7 : (f ? 1 : -1);
      const n = Math.floor(h / 4);
      let hx = 20, hy = ground - 2;
      for (let i = 0; i < n; i++) {
        const t = i / Math.max(1, n - 1);
        const cx = 20 + Math.round(Math.sin(t * Math.PI) * -3 + t * t * bend);
        const cy = ground - 2 - i * 4;
        const r = 6 - Math.floor(t * 1.5);
        P.ellipse(cx, cy, r, 3, i % 2 ? m : sh(m, 0.08)); P.rect(cx - r + 1, cy - 2, r * 2 - 1, 1, l); P.rect(cx - r + 1, cy + 2, r * 2 - 1, 1, d);
        hx = cx; hy = cy;
      }
      if (anim === 'emerge') return;
      // head: maw facing right/up
      const mo = anim === 'attack' || anim === 'windup' ? 1 : 0;
      P.ellipse(hx + 2, hy - 2, 7, 6, m); P.rect(hx - 4, hy - 7, 12, 2, l);
      P.ellipse(hx + 5, hy - 2, 3 + mo, 4 + mo, '#200808'); P.ellipse(hx + 5, hy - 2, 2 + mo, 3 + mo, gum);
      for (let i = -3 - mo; i <= 3 + mo; i += 2) { P.px(hx + 3, hy - 2 + i, '#f0e8d0'); P.px(hx + 7 + mo, hy - 2 + i, '#f0e8d0'); }
      P.px(hx - 2, hy - 5, p.eye || '#202020'); P.px(hx, hy - 6, p.eye || '#202020');
    },
  };

  M.mushroom = {
    w: 28, h: 30, ax: 14, ay: 28, frames: { idle: 2, walk: 4, windup: 2, attack: 1, hidden: 1 },
    draw(P, p, anim, f) {
      const cap = p.main || '#d04a6a', d = sh(cap, -0.3), l = sh(cap, 0.25), st = p.stem || '#f0e0c0', sp = p.spots || '#fff8e8';
      const hidden = anim === 'hidden';
      const bob = walkBob(anim, f);
      const puff = anim === 'windup' ? 1 + f : anim === 'attack' ? -2 : 0;
      const y = 12 + bob + (hidden ? 6 : 0);
      // feet
      if (!hidden) { const lp = legPair(anim, f, 1); P.rect(9, y + 13 - lp[0], 4, 3, sh(st, -0.25)); P.rect(15, y + 13 - lp[1], 4, 3, sh(st, -0.25)); }
      // stem body
      P.rect(9, y + 2, 10, 12, st); P.rect(9, y + 2, 2, 12, sh(st, -0.15)); P.rect(17, y + 2, 2, 12, sh(st, 0.1));
      if (!hidden) {
        P.px(12, y + 6, '#201010'); P.px(16, y + 6, '#201010');
        P.px(12, y + 5, p.eye || '#201010'); P.px(16, y + 5, p.eye || '#201010');
        if (anim === 'windup' || anim === 'attack') P.rect(13, y + 9, 3, 2, '#401020'); else P.rect(13, y + 9, 3, 1, '#401020');
        // stubby arms
        P.rect(7, y + 7, 2, 3, st); P.rect(19, y + 7, 2, 3, st);
      }
      // cap
      const cw = 12 + Math.max(0, puff), chh = 6 + Math.max(0, puff);
      P.ellipse(14, y, cw, chh, d); P.ellipse(14, y - 1, cw - 1, chh - 1, cap); P.ellipse(12, y - 3, cw - 5, 2, l);
      P.rect(3, y + 2, 22, 1, sh(cap, -0.45));
      for (const [sx, sy2] of [[8, -2], [14, -4], [19, -1], [11, 1], [17, 2]]) { P.rect(sx, y + sy2, 2, 2, sp); }
      if (anim === 'windup' && f) { P.px(6, y - 6, '#c0ff80'); P.px(22, y - 7, '#c0ff80'); P.px(14, y - 9, '#c0ff80'); }
    },
  };

  // Big furry mountain ape.
  M.yeti = {
    w: 48, h: 48, ax: 24, ay: 46, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f) {
      const m = p.main || '#e8f0ff', d = sh(m, -0.25), dd = sh(m, -0.45), sk = p.skin || '#6080c0';
      const bob = walkBob(anim, f) + (anim === 'idle' ? f : 0);
      const y = 13 + bob;
      const lp = legPair(anim, f, 3);
      // legs
      P.rect(15, y + 20, 7, 11 - lp[0], d); P.rect(26, y + 20, 7, 11 - lp[1], m);
      P.rect(14, y + 30 - lp[0], 9, 3, sk); P.rect(25, y + 30 - lp[1], 9, 3, sk);
      // body shaggy
      P.ellipse(24, y + 12, 13, 12, d); P.ellipse(24, y + 11, 12, 11, m);
      for (let i = 0; i < 7; i++) P.rect(12 + i * 4, y + 21 + (i % 2), 2, 3, m);
      P.ellipse(25, y + 14, 6, 6, sh(m, 0.1));
      for (let i = 0; i < 5; i++) P.px(15 + i * 4, y + 5 + (i % 2) * 3, d);
      // head
      P.rect(19, y - 5, 12, 11, m); P.rect(18, y - 3, 14, 7, m);
      P.rect(22, y - 1, 9, 7, sk); P.rect(22, y - 1, 9, 1, sh(sk, 0.2));
      P.px(24, y + 1, p.eye || '#ffe040'); P.px(28, y + 1, p.eye || '#ffe040'); P.rect(23, y, 3, 1, dd); P.rect(27, y, 3, 1, dd);
      const roar = anim === 'windup' || anim === 'cast';
      if (roar) { P.rect(24, y + 3, 5, 3, '#300810'); P.px(24, y + 3, '#ffffff'); P.px(28, y + 3, '#ffffff'); P.px(24, y + 5, '#ffffff'); P.px(28, y + 5, '#ffffff'); }
      else { P.rect(24, y + 4, 5, 1, '#300810'); P.px(25, y + 5, '#ffffff'); P.px(28, y + 5, '#ffffff'); }
      const hc = p.horns || '#a09080';
      P.rect(17, y - 6, 3, 3, hc); P.px(16, y - 8, hc); P.px(16, y - 7, hc); P.rect(30, y - 6, 3, 3, hc); P.px(33, y - 8, hc); P.px(33, y - 7, hc);
      // arms
      const up = anim === 'windup' || anim === 'cast' ? -16 : anim === 'attack' ? 6 : 0;
      P.rect(7, y + 3 + Math.min(0, up), 7, 16 + Math.max(0, up / 2), d); P.rect(5, y + 17 + up, 9, 6, sk);
      P.rect(34, y + 3 + Math.min(0, up), 7, 16 + Math.max(0, up / 2), m); P.rect(34, y + 17 + up, 9, 6, sk); P.rect(34, y + 17 + up, 9, 1, sh(sk, 0.25));
      if (anim === 'cast') { P.circle(24, y - 11, 5, '#f0f8ff'); P.circle(23, y - 12, 2, '#ffffff'); }
    },
  };

  // Generic big humanoid (kept for compatibility / scripted enemies).
  M.brute = {
    w: 44, h: 48, ax: 22, ay: 45, frames: { idle: 2, walk: 4, windup: 1, attack: 1, cast: 1 },
    draw(P, p, anim, f) {
      const m = p.main, d = sh(m, -0.3), l = sh(m, 0.25), a = p.accent || '#c03030';
      const bob = anim === 'walk' ? [0, -1, 0, -1][f] : anim === 'idle' ? f : 0;
      const y = 8 + bob;
      const lp = anim === 'walk' ? [[0, 3], [0, 0], [3, 0], [0, 0]][f] : [0, 0];
      P.rect(14, y + 24, 6, 13 - lp[0], d); P.rect(24, y + 24, 6, 13 - lp[1], d);
      P.rect(12, y + 8, 20, 17, m); P.rect(12, y + 8, 20, 3, l); P.rect(12, y + 22, 20, 3, d);
      P.rect(18, y + 11, 8, 8, a);
      P.rect(15, y - 4, 14, 12, m); P.rect(15, y - 4, 14, 3, l);
      P.rect(18, y + 1, 3, 2, p.eye || '#ffd040'); P.rect(24, y + 1, 3, 2, p.eye || '#ffd040');
      const up = anim === 'windup' ? -10 : anim === 'attack' ? 6 : anim === 'cast' ? -12 : 0;
      P.rect(6, y + 9, 6, 14, m); P.rect(32, y + 9 + Math.min(0, up), 6, 14, m);
      P.rect(32, y + 21 + up, 8, 6, d);
      if (p.horns) { P.rect(13, y - 8, 3, 6, p.horns); P.rect(28, y - 8, 3, 6, p.horns); P.px(12, y - 9, p.horns); P.px(31, y - 9, p.horns); }
      if (p.weapon) { P.rect(38, y + 2 + up, 3, 26, p.weapon); P.rect(36, y + 2 + up, 7, 6, sh(p.weapon, 0.2)); }
    },
  };

  // ---- cache + draw ----------------------------------------------------------
  function palKey(p) { if (p.__k) return p.__k; let s = ''; for (const k in p) if (k !== '__k') s += k + p[k]; try { Object.defineProperty(p, '__k', { value: s, enumerable: false }); } catch (e) { /* frozen */ } return s; }
  M.palKey = palKey;
  M.sprite = function (id, pal, anim, frame, flip) {
    const d = M[id] || M.slime;
    const an = d.frames && d.frames[anim] ? anim : 'idle';
    const fr = d.frames && d.frames[an] ? frame % d.frames[an] : 0;
    const k = 'mon|' + id + '|' + palKey(pal) + '|' + an + fr;
    const spr = G.sprite(k, d.w + 2, d.h + 2, (ctx) => { ctx.translate(1, 1); d.draw(G.painter(ctx), pal, an, fr, ctx); ctx.globalAlpha = 1; }, { outline: true });
    return flip ? G.mirror(spr, k) : spr;
  };

  M.draw = function (ctx, e) {
    const def = e.def;
    const id = def.sprite || 'slime';
    const d = M[id] || M.slime;
    const pal = e.pal || def.pal || {};
    const flip = e.face < 0;
    const s = def.scale || 1;
    const t = R.World ? R.World.time : 0;
    // under-glow: elites pulse gold, glowing monsters (wisps, fire) carry their own light
    if (R.settings.fancy !== false && (e.elite || def.glow) && !e.dead) {
      const gc = e.elite ? '#ffb030' : def.glow;
      const gr = Math.round((e.r + 8) * (e.elite ? 1.4 : 1));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (e.elite ? 0.35 : 0.45) + Math.sin(t * 4 + e.x * 0.1) * 0.12;
      ctx.drawImage(G.glow(gr, gc), Math.round(e.x - gr), Math.round(e.y - e.z - e.height * 0.45 - gr));
      ctx.restore();
      if (e.elite && Math.random() < 0.15) R.FX.particle({ x: e.x + U.rand(-e.r, e.r), y: e.y - U.rand(0, e.height), vy: -20, life: 0.6, color: '#ffc040', glow: true });
    }
    let spr = M.sprite(id, pal, e.anim || 'idle', e.frame || 0, flip);
    const hitFlash = e.flash > 0 || (e.dead && e.deadT < 0.12);
    if (hitFlash) spr = G.flash(spr, id + (e.anim || 'idle') + (e.frame || 0) + flip + palKey(pal), e.flashColor || '#ffffff');
    const ax = flip ? d.w - d.ax : d.ax;
    const a = (e.alpha != null ? e.alpha : 1) * (def.alpha != null ? def.alpha : 1);
    if (a < 1) ctx.globalAlpha = Math.max(0, a);
    // Procedural squash & stretch on top of the sprite frames:
    //  idle breathing, anticipation on windup, lunge on attack, recoil when hit,
    //  a pop-in when summoned, and a topple + flatten when killed.
    let sx = 1, sy = 1, rot = 0;
    const flying = def.tags && def.tags.includes('flying');
    const an = e.anim || 'idle';
    if (!e.dead) {
      if (an === 'idle' && !flying) sy += Math.sin(t * 3 + e.x * 0.37) * 0.03;
      else if (an === 'walk' && !flying) rot = Math.sin((e.animT || 0) * 10) * 0.05;
      if (an === 'windup') { sx -= 0.07; sy += 0.08; }
      else if (an === 'attack') { sx += 0.1; sy -= 0.07; }
      if (e.flash > 0) { const k = e.flash / 0.12; sx += 0.14 * k; sy -= 0.12 * k; }
      if (e.staggerT > 0) rot = Math.sin(e.staggerT * 40) * 0.1;
      if (e.popIn > 0) { const k = U.clamp(1 - e.popIn / 0.35, 0, 1); const b = U.easeOutBack(k); sx *= b; sy *= b; }
    } else {
      const k = U.clamp(e.deadT / 0.35, 0, 1);
      if (flying) { sy *= 1 - k * 0.3; rot = (e.fallDir || 1) * k * 0.6; }
      else if (d.h > d.w * 0.9) rot = (e.fallDir || 1) * U.easeIn(k) * Math.PI / 2 * 0.95; // tall things topple
      else { sx *= 1 + k * 0.25; sy *= 1 - k * 0.55; } // squat things flatten
    }
    const px = Math.round(e.x), py = Math.round(e.y - e.z);
    const W = spr.width * s, Hh = spr.height * s;
    if (rot || sx !== 1 || sy !== 1) {
      ctx.save();
      ctx.translate(px, py);
      if (rot) ctx.rotate(rot);
      ctx.scale(sx, sy);
      ctx.drawImage(spr, Math.round(-(ax + 1) * s), Math.round(-(d.ay + 1) * s), Math.round(W), Math.round(Hh));
      ctx.restore();
    } else {
      const x = Math.round(e.x - (ax + 1) * s), y = Math.round(e.y - e.z - (d.ay + 1) * s);
      if (s !== 1) ctx.drawImage(spr, x, y, Math.round(W), Math.round(Hh));
      else ctx.drawImage(spr, x, y);
    }
    ctx.globalAlpha = 1;
    // shielded blockers show a shimmering front
    if (e.blocking && !e.dead) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba('#a0d0ff', 0.5 + Math.sin(t * 12) * 0.2); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(e.x, e.y - e.height * 0.5, e.r + 8, e.face > 0 ? -0.9 : Math.PI - 0.9, e.face > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      ctx.restore();
    }
  };
})(window.RPG);
