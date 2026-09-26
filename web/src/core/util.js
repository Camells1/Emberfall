'use strict';
// Global namespace. Every script adds to RPG; files load in the order listed in index.html.
window.RPG = window.RPG || {};

(function (R) {
  const U = R.U = {};

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  U.angle = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  U.angleDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeIn = (t) => t * t;
  U.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  U.easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // Deterministic RNG (mulberry32) so maps are the same every visit.
  U.rng = function (seed) {
    let s = typeof seed === 'string' ? U.hash(seed) : seed >>> 0;
    const f = function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + f() * (b - a);
    f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  // Cheap 2D value noise, handy for terrain.
  U.noise2 = function (seed) {
    const perm = new Uint8Array(512);
    const r = U.rng(seed);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const grad = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return function (x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X] + Y, b = perm[X + 1] + Y;
      return U.lerp(U.lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
        U.lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 0.7 + 0.5;
    };
  };

  // ---- colour helpers -------------------------------------------------------
  U.hexToRgb = function (hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  // amt -1..1 : negative darkens, positive lightens
  const shadeCache = new Map();
  U.shade = function (hex, amt) {
    const key = hex + amt;
    let v = shadeCache.get(key);
    if (v) return v;
    const [r, g, b] = U.hexToRgb(hex);
    v = amt < 0
      ? U.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt))
      : U.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    shadeCache.set(key, v);
    return v;
  };
  U.mix = function (h1, h2, t) {
    const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
    return U.rgbToHex(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t));
  };
  U.rgba = function (hex, a) { const [r, g, b] = U.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  U.fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n)));
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- event bus ---------------------------------------------------------------
  // Game events used across systems:
  //   kill {enemy, id}      pickup {item, qty}     talk {npc}      enter {map}
  //   quest:start/progress/complete {quest}       levelup {level}  boss:defeat {id}
  //   use {item}            chest {id}             flag {name}
  const listeners = {};
  R.events = {
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); return fn; },
    off(name, fn) { const l = listeners[name]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit(name, data) { const l = listeners[name]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { console.error('event', name, e); } } },
  };
})(window.RPG);
