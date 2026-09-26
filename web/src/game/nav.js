'use strict';
// Enemy navigation: a flow field (breadth-first distances) spreading out from the player's tile,
// rebuilt whenever the player moves to a new tile. Enemies that can't walk straight at the player
// follow the field downhill, so they path around walls, cliffs, water and props.
//
//   Nav.reset(M)            new map loaded
//   Nav.update(dt)          called by the world every frame
//   Nav.dirFrom(x, y)       angle toward the player along the field, or null
//   Nav.clear(e, tx, ty)    true if e can walk in a straight line to (tx, ty)
(function (R) {
  const U = R.U;
  const S = 16;
  const MAXD = 70; // tiles; beyond this enemies just walk straight
  const Nav = R.Nav = { M: null, walk: null, dist: null, ptx: -1, pty: -1, t: 0 };
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4], [1, -1, 1.4], [-1, 1, 1.4], [-1, -1, 1.4]];

  Nav.reset = function (M) {
    Nav.M = M; Nav.ptx = Nav.pty = -1; Nav.t = 0;
    if (!M.navWalk) {
      // a tile is walkable if its centre (and most of it) is free of walls and prop boxes
      const W = R.World, walk = new Uint8Array(M.w * M.h);
      for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
        const i = y * M.w + x;
        if (M.solid[i]) continue;
        const cx = x * S + 8, cy = y * S + 10;
        walk[i] = W.solidAt(cx, cy) || (W.solidAt(cx - 5, cy) && W.solidAt(cx + 5, cy)) ? 0 : 1;
      }
      M.navWalk = walk;
    }
    Nav.walk = M.navWalk;
    Nav.dist = new Float32Array(M.w * M.h).fill(1e9);
  };

  function rebuild(tx, ty) {
    const M = Nav.M, w = M.w, h = M.h, walk = Nav.walk, dist = Nav.dist;
    dist.fill(1e9);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
    // Dijkstra-lite: a bucketed queue is plenty for these map sizes
    const q = [ty * w + tx];
    dist[ty * w + tx] = 0;
    let head = 0;
    while (head < q.length) {
      const i = q[head++];
      const x = i % w, y = (i / w) | 0, d0 = dist[i];
      if (d0 > MAXD) continue;
      for (const [dx, dy, c] of NB) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!walk[j]) continue;
        if (dx && dy && (!walk[y * w + nx] || !walk[ny * w + x])) continue; // no corner cutting
        const nd = d0 + c;
        if (nd < dist[j] - 0.01) { dist[j] = nd; q.push(j); }
      }
    }
  }

  Nav.update = function (dt) {
    const p = R.World.player;
    if (!Nav.M || !p) return;
    Nav.t -= dt;
    const tx = Math.floor(p.x / S), ty = Math.floor((p.y - 2) / S);
    if ((tx !== Nav.ptx || ty !== Nav.pty) && Nav.t <= 0) { Nav.ptx = tx; Nav.pty = ty; Nav.t = 0.15; rebuild(tx, ty); }
  };

  Nav.distAt = function (x, y) {
    const M = Nav.M; if (!M) return 1e9;
    const tx = Math.floor(x / S), ty = Math.floor((y - 2) / S);
    if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return 1e9;
    return Nav.dist[ty * M.w + tx];
  };

  // Best next step from world point (x, y), as an angle.
  Nav.dirFrom = function (x, y) {
    const M = Nav.M; if (!M || !Nav.dist) return null;
    const w = M.w;
    const tx = Math.floor(x / S), ty = Math.floor((y - 2) / S);
    if (tx < 0 || ty < 0 || tx >= w || ty >= M.h) return null;
    let best = null, bd = Nav.dist[ty * w + tx];
    if (bd >= 1e9) {
      // standing somewhere odd (inside a prop's footprint): step to any reachable neighbour
      bd = 1e9;
    }
    for (const [dx, dy] of NB) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= M.h) continue;
      if (dx && dy && (!Nav.walk[ty * w + nx] || !Nav.walk[ny * w + tx])) continue;
      const d = Nav.dist[ny * w + nx];
      if (d < bd) { bd = d; best = [nx, ny]; }
    }
    if (!best) return null;
    return U.angle(x, y, best[0] * S + 8, best[1] * S + 10);
  };

  // Straight-line walkability (samples the collision shape along the line).
  Nav.clear = function (e, tx, ty) {
    const W = R.World;
    const d = U.dist(e.x, e.y, tx, ty);
    const n = Math.ceil(d / 7);
    const r = Math.max(3, (e.r || 5) - 1);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (W.collides(U.lerp(e.x, tx, k), U.lerp(e.y, ty, k), r)) return false;
    }
    return true;
  };
})(window.RPG);
