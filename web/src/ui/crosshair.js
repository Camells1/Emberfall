'use strict';
// Custom crosshairs. Drawn as small pixel-art images and used as the mouse cursor over the game,
// so they move with zero lag. Pick one (and its colour) in Settings.
(function (R) {
  const U = R.U;
  const N = 25, K = 2; // 25x25 design grid, drawn at 2x
  const C = R.Crosshairs = {};

  // Each design paints into a 25x25 grid: px(x, y, colourIndex). 1 = main colour, 2 = accent, 3 = light.
  const ring = (px, cx, cy, r, c) => { for (let a = 0; a < 360; a += 3) { const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r); px(x, y, c); } };
  const disc = (px, cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c); };
  const line = (px, x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
  const DESIGNS = [
    { id: 'default', name: 'Classic', color: '#ffffff', draw(px) { line(px, 12, 3, 12, 8, 1); line(px, 12, 16, 12, 21, 1); line(px, 3, 12, 8, 12, 1); line(px, 16, 12, 21, 12, 1); px(12, 12, 2); } },
    { id: 'dot', name: 'Dot', color: '#ff4060', draw(px) { disc(px, 12, 12, 2, 1); px(11, 11, 3); } },
    { id: 'circle', name: 'Ring', color: '#60ff90', draw(px) { ring(px, 12, 12, 7, 1); px(12, 12, 1); px(12, 3, 1); px(12, 21, 1); px(3, 12, 1); px(21, 12, 1); } },
    { id: 'flower', name: 'Flower', color: '#ff80c0', accent: '#ffe040', draw(px) {
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; disc(px, Math.round(12 + Math.cos(a) * 6), Math.round(12 + Math.sin(a) * 6), 3, 1); }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; px(Math.round(12 + Math.cos(a) * 7), Math.round(12 + Math.sin(a) * 7), 3); }
      disc(px, 12, 12, 2, 2); px(12, 12, 0);
    } },
    { id: 'star', name: 'Star', color: '#ffd040', draw(px) {
      const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4 : 10; pts.push([12 + Math.cos(a) * r, 12 + Math.sin(a) * r]); }
      for (let k = 0; k < 10; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % 10]; line(px, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 1); }
      px(12, 12, 1);
    } },
    { id: 'heart', name: 'Heart', color: '#ff4070', draw(px) {
      const inside = (x, y) => { const X = (x - 12) / 9, Y = -(y - 13) / 9; return Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y <= 0; };
      for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) if (inside(x, y) && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1))) px(x, y, 1);
      px(12, 12, 1); px(8, 8, 3);
    } },
    { id: 'diamond', name: 'Diamond', color: '#60e0ff', draw(px) { line(px, 12, 3, 21, 12, 1); line(px, 21, 12, 12, 21, 1); line(px, 12, 21, 3, 12, 1); line(px, 3, 12, 12, 3, 1); line(px, 12, 8, 12, 9, 1); line(px, 12, 15, 12, 16, 1); px(12, 12, 2); } },
    { id: 'swords', name: 'Crossed Swords', color: '#d0d8e8', accent: '#c08040', draw(px) {
      line(px, 5, 5, 17, 17, 1); line(px, 19, 5, 7, 17, 1); line(px, 15, 20, 20, 15, 2); line(px, 4, 15, 9, 20, 2); px(20, 20, 2); px(4, 20, 2); px(5, 5, 3); px(19, 5, 3);
    } },
    { id: 'skull', name: 'Skull', color: '#f0ece0', draw(px) {
      disc(px, 12, 10, 6, 1); for (let x = 9; x <= 15; x++) for (let y = 15; y <= 18; y++) px(x, y, 1);
      disc(px, 10, 10, 1, 0); disc(px, 14, 10, 1, 0); px(12, 13, 0); px(10, 17, 0); px(12, 17, 0); px(14, 17, 0); px(10, 10, 2); px(14, 10, 2);
    } },
    { id: 'paw', name: 'Paw Print', color: '#ffb060', draw(px) { disc(px, 12, 15, 4, 1); disc(px, 6, 10, 2, 1); disc(px, 18, 10, 2, 1); disc(px, 9, 5, 2, 1); disc(px, 15, 5, 2, 1); px(12, 15, 3); } },
    { id: 'snowflake', name: 'Snowflake', color: '#c0f0ff', draw(px) {
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a); line(px, 12, 12, Math.round(12 + c * 10), Math.round(12 + s * 10), 1); const bx = 12 + c * 6, by = 12 + s * 6; for (const d of [-1, 1]) { const b = a + d * 0.8; line(px, Math.round(bx), Math.round(by), Math.round(bx + Math.cos(b) * 3), Math.round(by + Math.sin(b) * 3), 1); } }
      px(12, 12, 3);
    } },
  ];
  C.list = DESIGNS;
  C.COLORS = [null, '#ffffff', '#ffd040', '#60ff90', '#ff4060', '#60e0ff', '#ff80c0', '#c080ff', '#ff9030'];

  const cache = {};
  // Image (canvas) for a design + colour override. null colour = the design's own colours.
  C.image = function (id, color, scale) {
    const d = DESIGNS.find((x) => x.id === id) || DESIGNS[0];
    const k = scale || K, key = d.id + '|' + (color || '') + '|' + k;
    if (cache[key]) return cache[key];
    const grid = new Uint8Array(N * N);
    d.draw((x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < N && y < N) grid[y * N + x] = c === 0 ? 9 : c; });
    const main = color || d.color, accent = d.accent || U.shade(main, -0.25), light = U.shade(main, 0.45);
    const cols = { 1: main, 2: accent, 3: light };
    const cv = document.createElement('canvas');
    cv.width = (N + 2) * k; cv.height = (N + 2) * k;
    const ctx = cv.getContext('2d');
    const on = (x, y) => x >= 0 && y >= 0 && x < N && y < N && grid[y * N + x] && grid[y * N + x] !== 9;
    // dark outline so it shows on any ground
    ctx.fillStyle = 'rgba(12,8,20,0.95)';
    for (let y = -1; y <= N; y++) for (let x = -1; x <= N; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || (x >= 0 && y >= 0 && x < N && y < N && grid[y * N + x] === 9)) ctx.fillRect((x + 1) * k, (y + 1) * k, k, k);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = grid[y * N + x]; if (c && c !== 9) { ctx.fillStyle = cols[c] || main; ctx.fillRect((x + 1) * k, (y + 1) * k, k, k); } }
    cache[key] = cv;
    return cv;
  };
  // Apply the chosen crosshair as the cursor over the game canvas.
  C.apply = function () {
    const cv = document.getElementById('game');
    if (!cv) return;
    const st = R.settings || {};
    try {
      const img = C.image(st.crosshair || 'default', st.crosshairColor || null);
      const h = Math.floor(img.width / 2);
      cv.style.cursor = `url(${img.toDataURL()}) ${h} ${h}, crosshair`;
    } catch (e) { cv.style.cursor = 'crosshair'; }
  };
  C.name = (id) => (DESIGNS.find((x) => x.id === id) || DESIGNS[0]).name;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => C.apply()); else setTimeout(() => C.apply(), 0);
})(window.RPG);
