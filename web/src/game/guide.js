'use strict';
// Quest guide: works out where the tracked quest wants you to go and draws a gold arrow to it.
// If the goal is in another map, the arrow points at the exit that leads there.
//   Guide.target() -> {x, y, label, far} on the current map, or null
(function (R) {
  const U = R.U, G = R.G;
  const Guide = R.Guide = { cache: null, t: 0 };

  const maps = () => Object.keys(R.Maps).map((id) => R.World.buildMap(id));
  const findNpc = (id) => { for (const M of maps()) { const n = M.npcs.find((n) => n.id === id); if (n) return { map: M.id, x: n.x, y: n.y }; } return null; };

  // First map (current map preferred) that satisfies fn(M) -> {x, y} | null
  function locate(fn) {
    const W = R.World;
    const here = fn(W.map);
    if (here) return Object.assign({ map: W.map.id }, here);
    // maps you can walk to right now come first, locked-off ones last
    const reach = reachable();
    const others = maps().filter((M) => M.id !== W.map.id).sort((a, b) => (reach.has(b.id) ? 1 : 0) - (reach.has(a.id) ? 1 : 0));
    for (const M of others) { const r = fn(M); if (r) return Object.assign({ map: M.id }, r); }
    return null;
  }
  const nearest = (list) => {
    const p = R.World.player;
    let best = null, bd = 1e9;
    for (const o of list) { const d = U.dist(p.x, p.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    return best;
  };

  // Where does objective o of quest q point?
  function objectiveGoal(q, o) {
    const W = R.World;
    if (o.type === 'talk') return findNpc(o.npc);
    if (o.type === 'reach') {
      if (o.zone) return locate((M) => { const z = M.zones.find((z) => z.name === o.zone); return z ? { x: z.x, y: z.y } : null; });
      return o.map && o.map !== W.map.id ? { map: o.map, x: null, y: null } : null;
    }
    if (o.type === 'boss') return locate((M) => { const b = M.bosses.find((b) => b.id === o.target); return b ? { x: b.x, y: b.y } : null; });
    if (o.type === 'kill') {
      const ids = o.target ? [].concat(o.target) : null;
      const match = (id) => (ids ? ids.includes(id) : R.Enemies[id] && R.Enemies[id].tags.includes(o.tag));
      // a live one nearby beats a spawn point
      const live = W.enemies.filter((e) => !e.dead && match(e.id));
      if (live.length) { const e = nearest(live); return { map: W.map.id, x: e.x, y: e.y }; }
      return locate((M) => nearest(M.spawns.filter((s) => match(s.id))));
    }
    if (o.type === 'collect') {
      // an unopened chest holding it, else a monster that drops it
      const chest = locate((M) => nearest(M.chests.filter((c) => !W.flags['chest:' + c.id] && c.loot.some((l) => (l.item || l) === o.item))));
      if (chest) return chest;
      const droppers = Object.values(R.Enemies).filter((e) => (e.drops || []).some((d) => d.item === o.item)).map((e) => e.id);
      if (!droppers.length) return null;
      const live = W.enemies.filter((e) => !e.dead && droppers.includes(e.id));
      if (live.length) { const e = nearest(live); return { map: W.map.id, x: e.x, y: e.y }; }
      return locate((M) => nearest(M.spawns.filter((s) => droppers.includes(s.id))));
    }
    return null;
  }

  // Goal for the tracked quest (or any active one); with no quests, the nearest villager with a "!".
  function goal() {
    const QL = R.QuestLog;
    const act = QL.activeList();
    const order = QL.tracked && act.includes(QL.tracked) ? [QL.tracked].concat(act.filter((x) => x !== QL.tracked)) : act;
    for (const id of order) {
      const q = R.Quests[id], st = QL.state[id];
      if (st.status === 'ready') {
        const who = q.turnIn || q.giver;
        const n = who && findNpc(who);
        if (n) return Object.assign({ label: 'Turn in: ' + q.name, npc: who }, n);
        continue;
      }
      for (let i = 0; i < q.objectives.length; i++) {
        const o = q.objectives[i];
        if (st.prog[i] >= (o.count || 1)) continue;
        const g = objectiveGoal(q, o);
        if (g) return Object.assign({ label: QL.objText(q, o, i, st.prog[i]), npc: o.type === 'talk' ? o.npc : null }, g);
        break;
      }
    }
    // no quest to follow: point at someone offering one
    const offers = Object.values(R.Quests).filter((q) => q.giver && QL.status(q.id) === 'available' && QL.levelOk(q.id));
    const main = offers.find((q) => q.type === 'main');
    const pick = main || offers[0];
    if (pick) { const n = findNpc(pick.giver); if (n) return Object.assign({ label: 'New quest: ' + pick.name, npc: pick.giver }, n); }
    return null;
  }

  function reachable() {
    const seen = new Set([R.World.map.id]), queue = [R.World.map.id];
    while (queue.length) for (const x of R.World.buildMap(queue.shift()).exits) if (R.Maps[x.to] && !seen.has(x.to) && !(x.requires && !x.requires())) { seen.add(x.to); queue.push(x.to); }
    return seen;
  }

  // Next exit on the current map along the shortest route to map `to`.
  function routeExit(to) {
    const W = R.World;
    const start = W.map.id;
    const prev = { [start]: null };
    const queue = [start];
    while (queue.length) {
      const id = queue.shift();
      if (id === to) break;
      for (const x of R.World.buildMap(id).exits) if (R.Maps[x.to] && !(x.to in prev) && !(x.requires && !x.requires())) { prev[x.to] = { from: id, exit: x }; queue.push(x.to); }
    }
    if (!(to in prev)) return null;
    let step = prev[to];
    while (step && step.from !== start) step = prev[step.from];
    return step ? step.exit : null;
  }

  Guide.target = function () {
    const W = R.World;
    if (!W.map || !W.player) return null;
    const g = goal();
    if (!g) return null;
    if (g.map === W.map.id && g.x != null) {
      // follow the live NPC if it wanders
      if (g.npc) { const n = W.npcs.find((n) => n.id === g.npc); if (n) return { x: n.x, y: n.y - 30, label: g.label }; }
      return { x: g.x, y: g.y - 20, label: g.label };
    }
    const ex = routeExit(g.map);
    if (!ex) return null;
    const name = R.Maps[g.map] ? R.Maps[g.map].name : g.map;
    return { x: ex.x + ex.w / 2, y: ex.y + ex.h / 2, label: g.label + '  →  ' + name, exit: true };
  };

  // Recompute right away when quests or the map change.
  for (const ev of ['quest:start', 'quest:progress', 'quest:complete', 'enter', 'talk', 'chest', 'kill']) R.events.on(ev, () => { Guide.t = 0; });

  Guide.update = function (dt) {
    Guide.t -= dt;
    if (Guide.t <= 0) { Guide.t = 0.3; try { Guide.cache = Guide.target(); } catch (e) { console.error(e); Guide.cache = null; } }
    return Guide.cache;
  };

  // Screen-space arrow. cx, cy = camera offset.
  Guide.draw = function (ctx, cx, cy) {
    if (R.settings.guide === false) return;
    const g = Guide.cache;
    const W = R.World;
    if (!g || W.player.dead) return;
    const sx = g.x - cx, sy = g.y - cy;
    const m = 18;
    const t = performance.now() / 1000;
    const onScreen = sx > m && sx < G.W - m && sy > m + 20 && sy < G.H - m - 30;
    const px = W.player.x - cx, py = W.player.y - 12 - cy;
    ctx.save();
    if (onScreen) {
      // bouncing arrow above the target (hidden when you're standing on it)
      if (U.dist(px, py, sx, sy) < 26) { ctx.restore(); return; }
      drawArrow(ctx, sx, sy - 6 - Math.abs(Math.sin(t * 4)) * 5, Math.PI / 2, 1);
    } else {
      // arrow on the screen edge pointing at the target
      const a = Math.atan2(sy - py, sx - px);
      const ex = U.clamp(px + Math.cos(a) * 1000, m, G.W - m), ey = U.clamp(py + Math.sin(a) * 1000, m + 20, G.H - m - 30);
      // intersect the ray with the inset screen rectangle
      const kx = Math.cos(a) > 0 ? (G.W - m - px) / Math.cos(a) : Math.cos(a) < 0 ? (m - px) / Math.cos(a) : 1e9;
      const ky = Math.sin(a) > 0 ? (G.H - m - 30 - py) / Math.sin(a) : Math.sin(a) < 0 ? (m + 20 - py) / Math.sin(a) : 1e9;
      const k = Math.min(kx, ky);
      const ax = isFinite(k) ? px + Math.cos(a) * k : ex, ay = isFinite(k) ? py + Math.sin(a) * k : ey;
      const pulse = 1 + Math.sin(t * 5) * 0.12;
      drawArrow(ctx, ax - Math.cos(a) * Math.sin(t * 5) * 2, ay - Math.sin(a) * Math.sin(t * 5) * 2, a, pulse);
      const d = Math.round(U.dist(W.player.x, W.player.y, g.x, g.y) / 16);
      const img = G.pixelText(d + 'M', '#ffe070');
      ctx.drawImage(img, Math.round(ax - Math.cos(a) * 16 - img.width / 2), Math.round(ay - Math.sin(a) * 16 - img.height / 2));
    }
    ctx.restore();
  };

  function drawArrow(ctx, x, y, a, s) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(a);
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(G.glow(12, '#ffc040'), -14, -12);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // arrow pointing along +x, tip at origin
    ctx.fillStyle = '#140c1c';
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-10, -8); ctx.lineTo(-7, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd040';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -6); ctx.lineTo(-6, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4b0';
    ctx.beginPath(); ctx.moveTo(-1, -0.5); ctx.lineTo(-7, -5); ctx.lineTo(-6, -0.5); ctx.closePath(); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
})(window.RPG);
