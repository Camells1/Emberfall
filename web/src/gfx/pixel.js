'use strict';
// Pixel-art helpers and the sprite cache. All art in the game is drawn in code into
// small offscreen canvases, cached, and blitted at 1:1 onto the 640x360 back buffer,
// which is then scaled up with nearest-neighbour filtering.
(function (R) {
  const G = R.G = {};
  const U = R.U;

  G.W = 640; G.H = 360;           // internal resolution
  G.TILE = 16;
  G.OUTLINE = '#140c1c';

  const cache = new Map();
  G.cacheSize = () => cache.size;
  G.clearCache = () => cache.clear();

  G.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return c;
  };

  // Cached sprite: draw(ctx, w, h) is called once per key.
  // opts.outline: add a 1px dark outline around opaque pixels (needs 1px free border).
  G.sprite = function (key, w, h, draw, opts) {
    let c = cache.get(key);
    if (c) return c;
    c = G.canvas(w, h);
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    if (opts && opts.outline) G.outline(c, opts.outline === true ? G.OUTLINE : opts.outline);
    cache.set(key, c);
    if (cache.size > 9000) { // crude eviction (oldest first)
      let n = 0;
      for (const k of cache.keys()) { cache.delete(k); if (++n > 2500) break; }
    }
    return c;
  };

  // Adds a 1px outline around every opaque pixel in the canvas.
  G.outline = function (c, color) {
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const [or, og, ob] = U.hexToRgb(color);
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  // White silhouette of a sprite (hit flash).
  G.flash = function (src, key, color) {
    return G.sprite('flash:' + (color || '#fff') + ':' + key, src.width, src.height, (ctx) => {
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color || '#ffffff';
      ctx.fillRect(0, 0, src.width, src.height);
    });
  };

  // Horizontal mirror of a cached sprite.
  G.mirror = function (src, key) {
    return G.sprite('mirror:' + key, src.width, src.height, (ctx) => {
      ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
    });
  };

  // Small painter that wraps a context with pixel helpers.
  G.painter = function (ctx) {
    return {
      ctx,
      px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, w, h, c) { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); },
      // filled circle, pixel aligned
      circle(cx, cy, r, c) {
        ctx.fillStyle = c;
        for (let y = -r; y <= r; y++) {
          const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
          ctx.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
        }
      },
      ellipse(cx, cy, rx, ry, c) {
        ctx.fillStyle = c;
        for (let y = -ry; y <= ry; y++) {
          const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))));
          ctx.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
        }
      },
      line(x0, y0, x1, y1, c) {
        ctx.fillStyle = c;
        x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          ctx.fillRect(x0, y0, 1, 1);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      },
      // random speckles of colour in a rect, deterministic by rng
      speckle(x, y, w, h, c, n, rng) {
        ctx.fillStyle = c;
        for (let i = 0; i < n; i++) ctx.fillRect((x + rng() * w) | 0, (y + rng() * h) | 0, 1, 1);
      },
    };
  };

  // Soft radial glow (used for lights, magic).
  G.glow = function (radius, color) {
    const key = 'glow:' + radius + ':' + color;
    return G.sprite(key, radius * 2, radius * 2, (ctx) => {
      const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      g.addColorStop(0, U.rgba(color, 0.9));
      g.addColorStop(0.35, U.rgba(color, 0.35));
      g.addColorStop(1, U.rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, radius * 2, radius * 2);
    });
  };

  // Tiny 3x5 pixel font for damage numbers (crisp at 1:1). Digits and a few symbols.
  const FONT = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
    '!': '010010010000010', '%': '101001010100101', ' ': '000000000000000',
    'M': '101111111101101', 'I': '111010010010111', 'S': '111100111001111', 'X': '101101010101101',
    'P': '111101111100100', 'L': '100100100100111', 'V': '101101101101010', 'E': '111100111100111',
    'U': '101101101101111', 'B': '110101110101110', 'O': '111101101101111', 'C': '111100100100111',
    'K': '101101110101101', 'D': '110101101101110', 'G': '111100101101111', 'A': '010101111101101',
    'R': '110101110101101', 'N': '101111111111101', 'T': '111010010010010', 'H': '101101111101101',
    'Y': '101101010010010', 'F': '111100110100100', 'W': '101101111111101', 'Z': '111001010100111',
    'Q': '111101101111001', 'J': '001001001101111', '.': '000000000000010',
  };
  G.pixelText = function (text, color, scale) {
    text = String(text).toUpperCase();
    scale = scale || 1;
    const key = 'ptext:' + text + color + scale;
    const w = (text.length * 4 + 1) * scale + 2, h = 7 * scale;
    return G.sprite(key, w, h, (ctx) => {
      ctx.fillStyle = color;
      for (let i = 0; i < text.length; i++) {
        const g = FONT[text[i]] || FONT[' '];
        for (let j = 0; j < 15; j++) if (g[j] === '1') ctx.fillRect((1 + i * 4 + (j % 3)) * scale, (1 + Math.floor(j / 3)) * scale, scale, scale);
      }
    }, { outline: true });
  };

  // Rarity colours shared by UI and world.
  G.RARITY = {
    common: { name: 'Common', color: '#c8c8c8' },
    uncommon: { name: 'Uncommon', color: '#5fd35f' },
    rare: { name: 'Rare', color: '#4aa3ff' },
    epic: { name: 'Epic', color: '#b86bff' },
    legendary: { name: 'Legendary', color: '#ff9f1c' },
    mythic: { name: 'Mythic', color: '#ff4f6d' },
  };
})(window.RPG);
