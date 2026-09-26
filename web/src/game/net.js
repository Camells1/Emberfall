'use strict';
// Online co-op (desktop app only). One player hosts, up to three friends join by address.
//
// How it works
//   - The host's game runs the world: monsters, bosses and their AI. Monsters target the nearest player.
//   - Every player keeps their own character, inventory, quests and saves. Each player gets their
//     own loot and XP for every kill (the host tells everyone what died; each game rolls its own drops).
//   - Players send their position/animation ~15 times a second; the host relays them.
//   - Clients see the host's monsters as NetEnemy proxies (snapshots ~12/s). Hitting a proxy sends
//     the hit to the host, which applies it. Monster projectiles are spawned on every game and each
//     player's own game decides whether they got hit (so dodging feels right). Area attacks and melee
//     are resolved by the host and sent to the player they hit.
//   - The party travels together: when the host changes area, everyone follows.
// Transport: main.js (TCP, one JSON object per line) via window.electronAPI.net.
(function (R) {
  const U = R.U, FX = R.FX, G = R.G;
  const PROTO = 1;
  // Two ways to connect, both with the same shape (host/join/send/stop/onMessage/onStatus):
  //   'code' - room codes over WebRTC (PeerJS). Nothing to install, works over the internet.
  //   'ip'   - direct TCP to an address (desktop app; LAN, Tailscale/Radmin or port forwarding).
  const tcp = () => window.electronAPI && window.electronAPI.net;
  let T = null; // the transport in use
  const api = () => T;
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const ROOM_PREFIX = 'emberfall-coop-v1-';
  const PeerT = {
    peer: null, conns: new Map(), up: null, nextId: 1, msgFns: [], statusFns: [],
    emitMsg(from, line) { for (const f of this.msgFns) f(from, line); },
    emitStatus(s) { for (const f of this.statusFns) f(s); },
    onMessage(fn) { this.msgFns.push(fn); },
    onStatus(fn) { this.statusFns.push(fn); },
    newCode() { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; },
    wireConn(conn, id) {
      conn.on('data', (d) => { if (typeof d === 'string') this.emitMsg(id, d); });
      conn.on('close', () => { if (id === 0) this.up = null; else this.conns.delete(id); this.emitStatus({ type: 'closed', id }); });
      conn.on('error', (e) => this.emitStatus({ type: 'error', id, message: String(e && e.message || e) }));
    },
    host(_port, tries) {
      return new Promise((resolve) => {
        if (typeof window.Peer !== 'function') { resolve({ ok: false, error: 'Room codes are unavailable (network library missing).' }); return; }
        this.stop();
        const code = this.newCode();
        let done = false;
        const finish = (r) => { if (!done) { done = true; clearTimeout(to); resolve(r); } };
        const to = setTimeout(() => finish({ ok: false, error: 'Could not reach the matchmaking server. Check your internet connection.' }), 12000);
        const peer = this.peer = new window.Peer(ROOM_PREFIX + code, { debug: 0 });
        peer.on('open', () => { if (window.electronAPI && window.electronAPI.net && window.electronAPI.net.awake) window.electronAPI.net.awake(true); finish({ ok: true, code, addresses: [] }); });
        peer.on('connection', (conn) => {
          if (this.conns.size >= 3) { conn.on('open', () => { conn.send(JSON.stringify({ t: 'reject', reason: 'The game is full (4 players max).' })); setTimeout(() => conn.close(), 300); }); return; }
          const id = this.nextId++;
          this.conns.set(id, conn);
          this.wireConn(conn, id);
          conn.on('open', () => this.emitStatus({ type: 'connect', id }));
        });
        peer.on('error', (e) => {
          if (e.type === 'unavailable-id' && (tries || 0) < 3) { done = true; clearTimeout(to); this.host(_port, (tries || 0) + 1).then(resolve); return; }
          if (!done) finish({ ok: false, error: 'Could not start hosting (' + (e.type || e.message) + ').' });
          else this.emitStatus({ type: 'error', id: -1, message: e.type || e.message });
        });
        peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } }); // keep the room code alive
      });
    },
    join(code) {
      return new Promise((resolve) => {
        if (typeof window.Peer !== 'function') { resolve({ ok: false, error: 'Room codes are unavailable (network library missing).' }); return; }
        this.stop();
        code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
        let done = false;
        const finish = (r) => { if (!done) { done = true; clearTimeout(to); resolve(r); } };
        const to = setTimeout(() => { finish({ ok: false, error: 'Timed out. Is the code right, and is the host still hosting?' }); this.stop(); }, 15000);
        const peer = this.peer = new window.Peer({ debug: 0 });
        peer.on('open', () => {
          const conn = peer.connect(ROOM_PREFIX + code, { reliable: true, serialization: 'raw' });
          conn.on('open', () => { this.up = conn; this.wireConn(conn, 0); if (window.electronAPI && window.electronAPI.net && window.electronAPI.net.awake) window.electronAPI.net.awake(true); finish({ ok: true }); });
        });
        peer.on('error', (e) => finish({ ok: false, error: e.type === 'peer-unavailable' ? 'No game found with code ' + code + '.' : e.type === 'network' || e.type === 'server-error' ? 'Could not reach the matchmaking server. Check your internet connection.' : 'Could not connect (' + (e.type || e.message) + ').' }));
      });
    },
    send(to, line) {
      try {
        if (to === 0) { if (this.up && this.up.open) this.up.send(line); return; }
        if (to === -1) { for (const c of this.conns.values()) if (c.open) c.send(line); return; }
        const c = this.conns.get(to); if (c && c.open) c.send(line);
      } catch (e) { /* channel closing */ }
    },
    kick(id) { const c = this.conns.get(id); if (c) c.close(); },
    stop() {
      if (this.up) { try { this.up.close(); } catch (e) { /* ignore */ } this.up = null; }
      for (const c of this.conns.values()) { try { c.close(); } catch (e) { /* ignore */ } }
      this.conns.clear();
      if (this.peer) { try { this.peer.destroy(); } catch (e) { /* ignore */ } this.peer = null; }
      if (window.electronAPI && window.electronAPI.net && window.electronAPI.net.awake) window.electronAPI.net.awake(false);
      return Promise.resolve(true);
    },
  };
  const N = R.Net = {
    role: null, myId: 0, peers: new Map(), byNid: new Map(), nidSeq: 0, hostMap: null,
    sendT: 0, snapT: 0, fxQueue: [], capture: false, replaying: false, lastBlockT: 0, password: '', port: 7777, status: '', addresses: [],
  };
  N.available = () => !!tcp() || typeof window.Peer === 'function';
  N.canDirect = () => !!tcp();
  N.active = () => !!N.role && N.connected && !N.pendingJoin;
  N.isHost = () => N.role === 'host' && N.connected;
  N.isClient = () => N.role === 'client' && N.connected && !N.pendingJoin;
  N.remoteCount = () => (N.active() ? [...N.peers.values()].filter((p) => p.ent && !p.ent.remove).length : 0);
  const W = () => R.World;

  // ---------------------------------------------------------------- sending
  function send(to, obj) { const a = api(); if (a && N.connected) a.send(to, JSON.stringify(obj)); }
  N.toHost = (obj) => send(0, obj);
  N.toAll = (obj) => send(-1, obj);
  N.toPeer = (id, obj) => send(id, obj);
  // host: forward a client's message to every other client
  function relay(fromId, obj) { for (const id of N.peers.keys()) if (id !== fromId && id !== 0) N.toPeer(id, obj); }
  function broadcast(obj) { if (N.isHost()) N.toAll(obj); else if (N.isClient()) N.toHost(obj); }

  // ---------------------------------------------------------------- my state / look
  function myState() {
    const p = W().player;
    return {
      m: W().map.id, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), d: p.dir, a: p.anim, f: p.frame,
      aim: +(p.aim || 0).toFixed(2), r: p.rollT > 0 ? 1 : 0, rd: +(p.rollDir || 0).toFixed(2), dead: p.dead ? 1 : 0, hp: Math.ceil(p.hp), mhp: p.stats.maxHp,
      lv: p.level, at: p.atkT > 0 && p.atkDur ? +(1 - p.atkT / p.atkDur).toFixed(2) : -1, aa: +(p.atkAngle || 0).toFixed(2), cb: p.combo || 0, sh: Math.ceil(p.shield || 0),
    };
  }
  function myLook() {
    const p = W().player, w = p.weapon();
    return { name: p.name, cls: p.cls, race: p.race, a: Object.assign({}, R.Character.norm(p.appearance)), g: p.gear(), w: w ? w.look : null, wt: w ? w.type : null };
  }
  let lastLookKey = '';

  // ---------------------------------------------------------------- remote players
  class RemotePlayer extends R.Entity {
    constructor(peer) {
      const s = peer.s || {};
      super(s.x || 0, s.y || 0);
      this.peer = peer; this.remote = true; this.team = 'player';
      this.r = 5; this.height = 24; this.hp = s.hp || 1; this.stats = { maxHp: s.mhp || 1, def: 0 };
      this.dir = 'down'; this.aim = 0; this.deadT = 0;
    }
    update(dt) {
      const s = this.peer.s;
      if (!s) return;
      this.animT += dt;
      const lead = Math.min(0.15, (performance.now() - this.peer.at) / 1000);
      const tx = s.x + s.vx * lead, ty = s.y + s.vy * lead;
      if (Math.hypot(tx - this.x, ty - this.y) > 90) { this.x = tx; this.y = ty; }
      else { const k = Math.min(1, dt * 14); this.x += (tx - this.x) * k; this.y += (ty - this.y) * k; }
      this.vx = s.vx; this.vy = s.vy; this.dir = s.d || 'down'; this.anim = s.a || 'idle'; this.frame = s.f || 0; this.aim = s.aim || 0;
      this.dead = !!s.dead; this.hp = s.hp; this.stats.maxHp = s.mhp || 1; this.shield = s.sh || 0;
      this.invuln = s.r ? 1 : 0; this.rollT = s.r ? 0.1 : 0; this.level = s.lv;
      this.deadT = this.dead ? this.deadT + dt : 0;
      this.spin = s.r ? (this.spin || 0) + dt * 18 * (Math.cos(s.rd) < 0 ? -1 : 1) : 0;
    }
    draw(ctx) {
      const L = this.peer.look;
      if (!L) return;
      this.shadow(ctx, 7);
      const C = R.Character, gear = L.g || {};
      if (this.dead) { C.draw(ctx, this.x, this.y + 4, L.a, gear, 'right', 'hurt', 0, { rot: Math.min(1, this.deadT / 0.4) * Math.PI / 2 }); return; }
      if (this.peer.s && this.peer.s.r) { C.draw(ctx, this.x, this.y - 3, L.a, gear, this.dir, 'roll', 0, { rot: this.spin }); return; }
      const behind = this.dir === 'up' || this.dir === 'left';
      if (behind) this.drawWeapon(ctx, L);
      C.draw(ctx, this.x, this.y, L.a, gear, this.dir, this.anim, this.frame);
      if (!behind) this.drawWeapon(ctx, L);
    }
    drawWeapon(ctx, L) {
      if (!L.w) return;
      const s = this.peer.s, wt = R.WeaponTypes[L.wt] || { kind: 'melee', arc: 2 };
      const h = R.Character.handOffset(this.dir, this.anim, this.frame, L.a);
      const left = Math.cos(this.aim) < 0;
      let ang;
      if (s.at >= 0 && wt.kind === 'melee') { const arc = wt.arc || 2, sign = s.cb % 2 === 0 ? 1 : -1; ang = s.aa + sign * (-arc / 2 + arc * U.easeOut(Math.min(1, s.at * 1.3))); }
      else if (s.at >= 0 || wt.kind === 'ranged') ang = s.at >= 0 ? s.aa : this.aim;
      else ang = -Math.PI / 2 + (left ? -0.55 : 0.55);
      R.Weapons.draw(ctx, this.x + h.x, this.y + h.y, L.w, ang);
    }
    drawUI(ctx) {
      const L = this.peer.look;
      if (!L) return;
      const img = G.pixelText(L.name + ' ' + (this.level || ''), '#80ffb0');
      const y = Math.round(this.y - 40);
      ctx.drawImage(img, Math.round(this.x - img.width / 2), y - 8);
      const w = 22, x = Math.round(this.x - w / 2), f = Math.max(0, Math.min(1, this.hp / (this.stats.maxHp || 1)));
      ctx.fillStyle = '#140c1c'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = '#3a1020'; ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = '#40e070'; ctx.fillRect(x, y, Math.round(w * f), 2);
    }
  }
  R.RemotePlayer = RemotePlayer;

  // Add/remove the entity for a peer depending on whether they're in our area.
  function syncPeerEntity(peer) {
    const here = peer.s && peer.s.m === W().map.id && peer.look;
    if (here && (!peer.ent || peer.ent.remove || !W().entities.includes(peer.ent))) { peer.ent = W().add(new RemotePlayer(peer)); }
    else if (!here && peer.ent) { peer.ent.remove = true; peer.ent = null; }
  }

  // ---------------------------------------------------------------- monster proxies (client)
  // snapshot row: [nid, id, x, y, z, hp, maxHp, anim, frame, face, flags, alpha%, tier, shield, phase, level, armor]
  const FL = { dead: 1, elite: 2, boss: 4, flash: 8, untarget: 16, enraged: 32, stagger: 64, pop: 128 };
  class NetEnemy extends R.Entity {
    constructor(row) {
      super(row[2], row[3]);
      this.netProxy = true; this.nid = row[0]; this.id = row[1]; this.def = R.Enemies[row[1]];
      this.team = 'enemy'; this.r = this.def.r || 6; this.height = this.def.height || 18;
      this.mem = {}; this.status = {}; this.face = 1; this.lastHit = 99; this.deadT = 0; this.popIn = 0; this.staggerT = 0;
      this.apply(row, true);
    }
    apply(row, first) {
      this.tx = row[2]; this.ty = row[3]; this.z = row[4]; this.hp = row[5]; this.maxHp = row[6];
      this.anim = row[7]; this.frame = row[8]; this.face = row[9];
      const f = row[10];
      if ((f & FL.dead) && !this.dead) { this.dead = true; this.deadT = 0; this.fallDir = -this.face; }
      this.elite = !!(f & FL.elite); this.boss = !!(f & FL.boss); this.untargetable = !!(f & FL.untarget);
      if (f & FL.flash) this.flash = Math.max(this.flash, 0.08);
      this.staggerT = (f & FL.stagger) ? 0.2 : 0;
      if (first && (f & FL.pop)) this.popIn = 0.35;
      this.alpha = row[11] / 100; this.tier = row[12]; this.shield = row[13];
      this.mem.phase = row[14]; this.mem.enraged = !!(f & FL.enraged); this.level = row[15]; this.armor = row[16];
      if (first) { this.x = this.tx; this.y = this.ty; }
      this.seen = performance.now();
    }
    update(dt) {
      this.animT += dt; this.lastHit += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.popIn > 0) this.popIn -= dt;
      if (this.dead) { this.deadT += dt; if (this.deadT > 0.9) this.remove = true; return; }
      const k = Math.min(1, dt * 12);
      if (Math.hypot(this.tx - this.x, this.ty - this.y) > 80) { this.x = this.tx; this.y = this.ty; }
      else { this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; }
      if (performance.now() - this.seen > 1500) this.remove = true; // gone from the host's world
    }
    draw(ctx) { R.Enemy.prototype.draw.call(this, ctx); }
    drawUI(ctx) { R.Enemy.prototype.drawUI.call(this, ctx); }
    die() {}
  }
  R.NetEnemy = NetEnemy;

  function snapshot() {
    const rows = [];
    for (const e of W().enemies) {
      if (!e.nid || e.netProxy) continue;
      let f = 0;
      if (e.dead) f |= FL.dead; if (e.elite) f |= FL.elite; if (e.boss) f |= FL.boss; if (e.flash > 0) f |= FL.flash;
      if (e.untargetable) f |= FL.untarget; if (e.mem && e.mem.enraged) f |= FL.enraged; if (e.staggerT > 0) f |= FL.stagger; if (e.popIn > 0) f |= FL.pop;
      rows.push([e.nid, e.def.id, Math.round(e.x), Math.round(e.y), Math.round(e.z || 0), Math.ceil(e.hp), e.maxHp, e.anim || 'idle', e.frame || 0, e.face || 1, f,
        Math.round((e.alpha != null ? e.alpha : 1) * 100), e.tier || 1, Math.ceil(e.shield || 0), (e.mem && e.mem.phase) || 1, e.level || 1, Math.round(e.armor || 0)]);
    }
    return rows;
  }
  function applySnapshot(rows) {
    const Wd = W();
    const seen = new Set();
    for (const row of rows) {
      if (!R.Enemies[row[1]]) continue;
      seen.add(row[0]);
      let e = N.byNid.get(row[0]);
      if (e && !e.remove) e.apply(row);
      else if (!(row[10] & FL.dead)) {
        e = new NetEnemy(row);
        N.byNid.set(row[0], e);
        Wd.entities.push(e); Wd.enemies.push(e);
      }
    }
    for (const [nid, e] of N.byNid) if (e.remove) N.byNid.delete(nid);
    // combat state for regen and music
    const p = Wd.player;
    for (const e of Wd.enemies) if (e.netProxy && !e.dead && U.dist(e.x, e.y, p.x, p.y) < 180) { Wd.combatT = 3; break; }
  }

  // ---------------------------------------------------------------- hooks used by combat/world/AI
  // Client hits a proxy: show it now, let the host apply it.
  N.hitProxy = function (t, amount, o) {
    if (t.dead || t.untargetable) return 0;
    const est = Math.max(1, Math.round(o.trueDmg ? amount : amount * 50 / (50 + (t.armor || 0))));
    N.toHost({ t: 'hit', id: t.nid, a: Math.round(amount * 10) / 10, c: o.crit ? 1 : 0, k: o.knock || 0, an: o.angle != null ? +o.angle.toFixed(2) : null, st: cleanStatus(o.status), td: o.trueDmg ? 1 : 0 });
    t.flash = 0.12; t.lastHit = 0;
    if (!o.noText) FX.text(t.x, t.y - (t.height || 24), est + (o.crit ? '!' : ''), o.crit ? '#ffd040' : (o.color || '#ffffff'), { crit: o.crit });
    const bc = (t.def && t.def.blood) || (t.def && t.def.pal && t.def.pal.main) || '#c02030';
    FX.burst(t.x, t.y - 8, { n: o.crit ? 12 : 6, colors: [bc, '#ffffff'], speed: 80, angle: o.angle, spread: 0.9, life: 0.4, size: [1, 2], grav: 200, vz: 60 });
    R.Audio.play(o.crit ? 'crit' : 'hit');
    const p = W().player;
    if (o.source === p && p.stats.lifesteal > 0) p.hp = Math.min(p.stats.maxHp, p.hp + est * p.stats.lifesteal);
    return est;
  };
  N.statusProxy = function (t, st) { N.toHost({ t: 'st', id: t.nid, st: cleanStatus(st) }); };
  function cleanStatus(st) { if (!st) return null; const o = {}; for (const k in st) { const s = st[k]; if (s) o[k] = { dur: s.dur, dps: s.dps, amt: s.amt }; } return o; }

  // Host: a monster hit a remote player (melee / area). Their game applies it with their own armor.
  N.hurtRemote = function (t, amount, o) {
    N.toPeer(t.peer.id, { t: 'hurt', a: Math.round(amount * 10) / 10, k: o.knock || 0, an: o.angle != null ? +o.angle.toFixed(2) : null, st: cleanStatus(o.status), ap: o.source && o.source.armorPierce ? o.source.armorPierce : 0, td: o.trueDmg ? 1 : 0 });
    return amount;
  };

  // Host: which player should this monster go after?
  N.pickTarget = function (e) {
    const Wd = W();
    const now = Wd.time;
    if (e.target && !e.target.dead && !e.target.remove && e.targetT > now) return e.target;
    let best = Wd.player && !Wd.player.dead ? Wd.player : null, bd = best ? U.dist(e.x, e.y, best.x, best.y) : 1e9;
    for (const peer of N.peers.values()) {
      const r = peer.ent;
      if (!r || r.remove || r.dead) continue;
      const d = U.dist(e.x, e.y, r.x, r.y) * (r === e.target ? 0.8 : 1);
      if (d < bd) { bd = d; best = r; }
    }
    e.target = best || Wd.player; e.targetT = now + 0.6;
    return e.target;
  };
  N.players = function () {
    const out = [W().player];
    for (const peer of N.peers.values()) if (peer.ent && !peer.ent.remove) out.push(peer.ent);
    return out;
  };

  // Monster projectiles are created on every game; player projectiles are shown as harmless visuals.
  N.onProjectile = function (p) {
    if (!N.active() || N.replaying || p.cosmetic) return;
    if (p.onHit || p.update2 || p.onExpire) { if (p.team === 'enemy') return; }
    const o = { x: Math.round(p.x), y: Math.round(p.y), z: p.z, angle: +p.angle.toFixed(3), speed: p.speed, life: p.life, kind: p.kind, r: p.r, color: p.color, glow: p.glow, size: p.size, homing: p.homing, accel: p.accel, pierce: p.pierce, noCollide: p.noCollide, spin: p.spin };
    if (p.team === 'enemy') {
      if (!N.isHost()) return;
      Object.assign(o, { team: 'enemy', dmg: p.dmg, knock: p.knock, status: cleanStatus(p.status), ap: p.source && p.source.armorPierce ? p.source.armorPierce : 0, explode: p.explode });
    } else if (p.team === 'player') {
      Object.assign(o, { team: 'none', dmg: 0, explode: p.explode ? { r: p.explode.r, mult: 0, color: p.explode.color } : null });
    } else return;
    broadcast({ t: 'pj', p: o, m: W().map.id });
  };
  function spawnProjectile(o) {
    N.replaying = true;
    try {
      const p = Object.assign({}, o, { cosmetic: true });
      if (o.team === 'enemy') p.source = { armorPierce: o.ap || 0, x: o.x, y: o.y };
      R.Combat.projectile(p);
    } finally { N.replaying = false; }
  }

  // ---------------------------------------------------------------- effects replication
  const FXK = ['burst', 'ring', 'pillar', 'lightning', 'text', 'slash', 'light', 'tele', 'lane'];
  N.wrapFX = function () {
    for (const k of FXK) {
      const orig = FX[k];
      if (!orig || orig.__net) continue;
      const wrapped = function () {
        if (N.capture && !N.replaying && N.fxQueue.length < 60) N.fxQueue.push([k].concat([...arguments]));
        return orig.apply(this, arguments);
      };
      wrapped.__net = true;
      FX[k] = wrapped;
    }
  };
  function replayFX(list) {
    N.replaying = true;
    try { for (const [k, ...args] of list) if (FXK.includes(k) && FX[k]) FX[k](...args); } catch (e) { /* ignore bad fx */ } finally { N.replaying = false; }
  }
  // Telegraph circle and charge lane as plain effects, so they can be sent over the network.
  FX.tele = function (x, y, radius, delay, col) {
    FX.add({ x, y, life: delay, layer: 'ground', draw(ctx, t) {
      ctx.save(); ctx.fillStyle = U.rgba(col, 0.12 + 0.1 * t); ctx.strokeStyle = U.rgba(col, 0.6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, radius, radius * 0.6, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = U.rgba(col, 0.35); ctx.beginPath(); ctx.ellipse(x, y, radius * t, radius * 0.6 * t, 0, 0, U.TAU); ctx.fill(); ctx.restore();
    } });
  };
  FX.lane = function (x, y, a, len, w, col, life) {
    FX.add({ layer: 'ground', life, draw(ctx, t) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = U.rgba(col, 0.15 + t * 0.22); ctx.fillRect(0, -w, len * t, w * 2); ctx.strokeStyle = U.rgba(col, 0.55); ctx.strokeRect(0, -w, len, w * 2); ctx.restore(); } });
  };

  // ---------------------------------------------------------------- messages
  function onMessage(from, line) {
    let m; try { m = JSON.parse(line); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (N.role === 'host') hostHandle(from, m); else clientHandle(m);
  }

  function hostHandle(from, m) {
    const peer = N.peers.get(from);
    if (m.t === 'hello') {
      if (m.v !== PROTO) { N.toPeer(from, { t: 'reject', reason: 'Different game version. Everyone needs the same Emberfall version.' }); setTimeout(() => api() && api().kick(from), 300); return; }
      if (N.password && m.pw !== N.password) { N.toPeer(from, { t: 'reject', reason: 'Wrong password.' }); setTimeout(() => api() && api().kick(from), 300); return; }
      const np = { id: from, look: m.look, s: m.s, at: performance.now(), ent: null };
      N.peers.set(from, np);
      const others = [...N.peers.values()].filter((p) => p.id !== from).map((p) => ({ id: p.id, look: p.look, s: p.s }));
      others.push({ id: 0, look: myLook(), s: myState() });
      N.toPeer(from, { t: 'welcome', id: from, map: W().map.id, x: Math.round(W().player.x), y: Math.round(W().player.y), peers: others, dif: R.settings.difficulty });
      relay(from, { t: 'peer', id: from, look: m.look, s: m.s });
      R.UI.toast((m.look && m.look.name || 'A friend') + ' joined your game!', 'good'); R.Audio.play('quest');
      if (R.UI.current === 'multiplayer') R.UI.refresh();
      return;
    }
    if (!peer) return;
    if (m.t === 'p') { peer.s = m.s; peer.at = performance.now(); relay(from, { t: 'p', id: from, s: m.s }); syncPeerEntity(peer); return; }
    if (m.t === 'look') { peer.look = m.look; relay(from, { t: 'look', id: from, look: m.look }); return; }
    if (m.t === 'hit') {
      const e = N.byNid.get(m.id);
      if (!e || e.dead || !peer.s || peer.s.m !== W().map.id) return;
      R.Combat.damage(e, m.a, { crit: !!m.c, knock: m.k, angle: m.an, status: m.st, trueDmg: !!m.td, source: peer.ent, noText: true });
      return;
    }
    if (m.t === 'st') { const e = N.byNid.get(m.id); if (e && !e.dead) R.Combat.applyStatus(e, m.st || {}); return; }
    if (m.t === 'pj') { relay(from, m); if (m.m === W().map.id) spawnProjectile(m.p); return; }
    if (m.t === 'fx') { relay(from, m); if (m.m === W().map.id) replayFX(m.l); return; }
    if (m.t === 'chat') { relay(from, m); chat(m.name, m.text); return; }
  }

  function clientHandle(m) {
    if (m.t === 'reject') { R.UI.toast('Could not join: ' + m.reason, 'bad'); N.status = m.reason; N.leave(true); return; }
    if (m.t === 'welcome') {
      N.myId = m.id; N.connected = true; N.pendingJoin = false;
      for (const p of m.peers) N.peers.set(p.id, { id: p.id, look: p.look, s: p.s, at: performance.now(), ent: null });
      N.hostMap = { id: m.map, x: m.x, y: m.y };
      R.UI.toast('Joined the game! The host leads the party.', 'good'); R.Audio.play('quest');
      if (m.dif) N.hostDifficulty = m.dif;
      // clear our local monsters: from now on the host's world is the real one
      travel(m.map, m.x, m.y, true);
      if (R.UI.current === 'multiplayer') R.UI.refresh();
      return;
    }
    if (m.t === 'peer') { N.peers.set(m.id, { id: m.id, look: m.look, s: m.s, at: performance.now(), ent: null }); R.UI.toast((m.look && m.look.name || 'Someone') + ' joined the party.', 'good'); return; }
    if (m.t === 'left') { const p = N.peers.get(m.id); if (p) { if (p.ent) p.ent.remove = true; N.peers.delete(m.id); R.UI.toast((p.look && p.look.name || 'A player') + ' left.', 'bad'); } return; }
    if (m.t === 'p') { let p = N.peers.get(m.id); if (!p) { p = { id: m.id, s: null, look: null, ent: null }; N.peers.set(m.id, p); } p.s = m.s; p.at = performance.now(); syncPeerEntity(p); return; }
    if (m.t === 'look') { const p = N.peers.get(m.id); if (p) p.look = m.look; return; }
    if (m.t === 'map') { N.hostMap = { id: m.id, x: m.x, y: m.y }; if (W().map.id !== m.id && !W().player.dead) travel(m.id, m.x, m.y); return; }
    if (m.t === 'snap') { if (m.m === W().map.id) applySnapshot(m.e); return; }
    if (m.t === 'kill') { onKill(m); return; }
    if (m.t === 'hurt') {
      const p = W().player;
      if (p.dead) return;
      R.Combat.damage(p, m.a, { knock: m.k, angle: m.an, status: m.st, trueDmg: !!m.td, source: m.ap ? { armorPierce: m.ap, x: p.x, y: p.y } : null });
      return;
    }
    if (m.t === 'pj') { if (m.m === W().map.id) spawnProjectile(m.p); return; }
    if (m.t === 'fx') { if (m.m === W().map.id) replayFX(m.l); return; }
    if (m.t === 'chat') { chat(m.name, m.text); return; }
  }

  // Every player gets their own XP, loot and quest progress for each kill.
  function onKill(m) {
    const def = R.Enemies[m.d];
    if (!def) return;
    const e = N.byNid.get(m.id);
    if (e && !e.dead) { e.dead = true; e.deadT = 0; e.fallDir = -e.face; }
    const Wd = W(), p = Wd.player;
    if (m.m !== Wd.map.id || p.dead) return;
    const fake = { def, id: def.id, level: m.lv, elite: !!m.el, boss: !!m.b, x: m.x, y: m.y, goldMult: m.gm || 1, tier: m.tier || 1 };
    p.gainXp(m.xp); p.kills++;
    Wd.dropLoot(fake);
    R.events.emit('kill', { enemy: def.id, tags: def.tags || [], boss: !!m.b, map: Wd.map.id, entity: e || fake });
    if (m.b) {
      if (m.bf) { Wd.flags[m.bf] = 1; Wd.flags['bosswins:' + def.id] = Math.max(Wd.flags['bosswins:' + def.id] || 0, m.tier || 1); }
      R.events.emit('boss:defeat', { id: def.id });
    }
  }
  // Host: tell everyone what died (called from Enemy.die).
  N.onEnemyDeath = function (e, xp) {
    if (!N.isHost() || !e.nid) return;
    N.toAll({ t: 'kill', id: e.nid, d: e.def.id, lv: e.level, el: e.elite ? 1 : 0, b: e.boss ? 1 : 0, x: Math.round(e.x), y: Math.round(e.y), xp, gm: e.goldMult || 1, bf: e.bossFlag || null, tier: e.tier || 1, m: W().map.id });
  };

  // Client: move to the host's area.
  function travel(mapId, x, y, now) {
    const Wd = W();
    const at = { x: x + U.rand(-12, 12), y: y + U.rand(4, 14) };
    if (now) { Wd.load(mapId, at); Wd.fade = 1; Wd.fadeDir = -1; } else Wd.transition(mapId, at, true);
  }
  N.respawnPoint = function () { return N.isClient() && N.hostMap ? { id: N.hostMap.id, at: { x: N.hostMap.x, y: N.hostMap.y } } : null; };
  // Client: exits and waypoints are the host's job.
  N.blockTravel = function () {
    if (!N.isClient()) return false;
    if (W().time > N.lastBlockT) { R.UI.toast('Only the host can lead the party to a new area.', 'bad'); N.lastBlockT = W().time + 2.5; }
    return true;
  };
  // Host: after loading an area, bring everyone.
  N.onLoad = function () {
    if (!N.active()) return;
    N.byNid.clear();
    if (N.isHost()) {
      for (const e of W().enemies) if (!e.nid) { e.nid = ++N.nidSeq; N.byNid.set(e.nid, e); }
      N.toAll({ t: 'map', id: W().map.id, x: Math.round(W().player.x), y: Math.round(W().player.y) });
    }
    for (const peer of N.peers.values()) { peer.ent = null; syncPeerEntity(peer); }
  };
  N.onAdd = function (e) { if (N.isHost() && e instanceof R.Enemy && !e.nid) { e.nid = ++N.nidSeq; N.byNid.set(e.nid, e); } };

  function chat(name, text) { R.UI.toast(name + ': ' + text, 'quest'); }
  N.say = function (text) { text = String(text).slice(0, 120); if (!text) return; const name = W().player.name; broadcast({ t: 'chat', name, text }); chat(name, text); };

  // ---------------------------------------------------------------- per-frame
  N.tick = function (dt) {
    if (!N.active() || R.state !== 'play' || !W().player) return;
    const Wd = W();
    N.sendT -= dt; N.snapT -= dt;
    if (N.sendT <= 0) {
      N.sendT = 1 / 15;
      const s = myState();
      if (N.isHost()) N.toAll({ t: 'p', id: 0, s }); else N.toHost({ t: 'p', s });
      const look = myLook(), key = JSON.stringify(look);
      if (key !== lastLookKey) { lastLookKey = key; if (N.isHost()) N.toAll({ t: 'look', id: 0, look }); else N.toHost({ t: 'look', look }); }
    }
    if (N.isHost() && N.snapT <= 0) {
      N.snapT = 1 / 12;
      for (const e of Wd.enemies) if (!e.nid && !e.netProxy) { e.nid = ++N.nidSeq; N.byNid.set(e.nid, e); }
      for (const [nid, e] of N.byNid) if (e.remove) N.byNid.delete(nid);
      N.toAll({ t: 'snap', m: Wd.map.id, e: snapshot() });
    }
    if (N.fxQueue.length) { broadcast({ t: 'fx', m: Wd.map.id, l: N.fxQueue.splice(0, 60) }); N.fxQueue.length = 0; }
    for (const peer of N.peers.values()) syncPeerEntity(peer);
  };

  // Keep the world running while the host's window is minimized.
  let bgTimer = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && N.active() && R.tickNow && !bgTimer) bgTimer = setInterval(() => { if (!document.hidden || !N.active()) { clearInterval(bgTimer); bgTimer = null; return; } R.tickNow(1 / 30); }, 33);
  });

  // ---------------------------------------------------------------- connect / disconnect
  function onStatus(s) {
    if (s.type === 'connect') return; // wait for their hello
    if (s.type === 'closed' || s.type === 'error') {
      if (N.role === 'host' && s.id) {
        const p = N.peers.get(s.id);
        if (p) { if (p.ent) p.ent.remove = true; N.peers.delete(s.id); N.toAll({ t: 'left', id: s.id }); R.UI.toast((p.look && p.look.name || 'A player') + ' left the game.', 'bad'); }
        if (R.UI.current === 'multiplayer') R.UI.refresh();
      } else if (N.role === 'client' && s.id === 0 && s.type === 'closed' && N.connected) {
        R.UI.toast('Disconnected from the host. You are playing solo again.', 'bad');
        N.leave(true);
      }
    }
  }
  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    for (const t of [tcp(), PeerT]) if (t) { t.onMessage(onMessage); t.onStatus(onStatus); }
    N.wrapFX();
  }

  // mode: 'code' (room code, default) or 'ip'
  N.host = async function (port, password, mode) {
    wire();
    N.leaveQuiet();
    T = mode === 'ip' ? tcp() : PeerT;
    N.mode = mode === 'ip' ? 'ip' : 'code';
    const r = await T.host(port);
    if (!r.ok) { N.status = r.error; T = null; return r; }
    N.role = 'host'; N.connected = true; N.port = port; N.password = password || ''; N.addresses = r.addresses || []; N.code = r.code || null;
    N.status = N.code ? 'Hosting. Room code ' + N.code : 'Hosting on port ' + port;
    N.nidSeq = 0; N.byNid.clear();
    for (const e of W().enemies) { e.nid = ++N.nidSeq; N.byNid.set(e.nid, e); }
    return r;
  };
  N.join = async function (address, port, password, mode) {
    wire();
    N.leaveQuiet();
    T = mode === 'ip' ? tcp() : PeerT;
    N.mode = mode === 'ip' ? 'ip' : 'code';
    N.status = mode === 'ip' ? 'Connecting to ' + address + ':' + port + '...' : 'Looking for room ' + address + '...';
    const r = mode === 'ip' ? await T.join(address, port) : await T.join(address);
    if (!r.ok) { N.status = r.error; T = null; return r; }
    // connected, but not part of the host's world until they send "welcome"
    N.role = 'client'; N.connected = true; N.pendingJoin = true; N.password = password || '';
    lastLookKey = '';
    N.toHost({ t: 'hello', v: PROTO, pw: N.password, look: myLook(), s: myState() });
    setTimeout(() => { if (N.role === 'client' && N.pendingJoin) { N.status = 'The host did not answer.'; R.UI.toast('The host did not answer.', 'bad'); N.leave(true); } }, 8000);
    return r;
  };
  N.leaveQuiet = function () {
    for (const p of N.peers.values()) if (p.ent) p.ent.remove = true;
    N.peers.clear(); N.byNid.clear();
    const wasClient = N.role === 'client';
    N.role = null; N.connected = false; N.pendingJoin = false; N.hostMap = null; N.code = null;
    if (T) T.stop();
    T = null;
    return wasClient;
  };
  N.leave = function (quiet) {
    const wasClient = N.leaveQuiet();
    if (!quiet) R.UI.toast('Left the multiplayer game.', 'quest');
    // back to a normal single-player world: respawn this area's monsters
    if (wasClient && R.state === 'play' && W().map) { const p = W().player; W().load(W().map.id, { x: p.x, y: p.y }); W().fade = 0; W().fadeDir = 0; }
    if (R.UI.current === 'multiplayer') R.UI.refresh();
  };

  // ---------------------------------------------------------------- UI: party frame + multiplayer menu
  N.partyHTML = function () {
    if (!N.active()) return '';
    const rows = [];
    for (const p of N.peers.values()) {
      if (!p.look || !p.s) continue;
      const f = Math.max(0, Math.min(1, p.s.hp / (p.s.mhp || 1)));
      const away = p.s.m !== W().map.id;
      rows.push(`<div class="pty${p.s.dead ? ' dead' : ''}${away ? ' away' : ''}"><b>${U.esc(p.look.name)}</b> <small>Lv ${p.s.lv} ${U.esc((R.Classes[p.look.cls] || {}).name || '')}${p.id === 0 ? ' · Host' : ''}${away ? ' · traveling' : ''}</small><div class="pty-bar"><div style="width:${(f * 100).toFixed(0)}%"></div></div></div>`);
    }
    return rows.join('');
  };

  const S = R.UI.screens, el = R.UI.el;
  S.multiplayer = {
    build(m) {
      const UI = R.UI;
      const body = UI.frame(m, 'Multiplayer — Co-op', 'mp-frame');
      if (!N.available()) { el('div', 'hint', 'Multiplayer is not available in this version.', body); return; }
      if (N.active() || N.pendingJoin) {
        if (N.pendingJoin) el('div', 'mp-status', 'Joining...', body);
        else if (N.isHost()) {
          if (N.code) {
            el('div', 'mp-status', '<b>You are hosting!</b> Tell your friends this room code:', body);
            const c = el('div', 'mp-code', U.esc(N.code), body);
            c.title = 'Click to copy';
            c.onclick = () => { try { navigator.clipboard.writeText(N.code); UI.toast('Room code copied!', 'good'); } catch (e) { /* ignore */ } };
            el('div', 'hint', 'They open Emberfall, load their character, press Esc → Multiplayer → type the code → Join.' + (N.password ? ' (Password protected.)' : ''), body);
          } else {
            el('div', 'mp-status', `<b>You are hosting</b> on port ${N.port}${N.password ? ' (password protected)' : ''}. Friends join with one of these addresses:`, body);
            const list = el('div', 'mp-addrs', null, body);
            for (const a of N.addresses) el('div', 'mp-addr', `<code>${U.esc(a.address)}:${N.port}</code> <small>${U.esc(a.name)}${/tailscale|radmin|zerotier|hamachi/i.test(a.name) ? ' — use this one for internet play' : /^192\.168|^10\.|^172\./.test(a.address) ? ' — same home network' : ''}</small>`, list);
          }
        } else el('div', 'mp-status', '<b>Connected!</b> The host leads the party — when they change area, you follow.', body);
        el('div', 'sec-title', 'Party', body);
        const party = el('div', 'mp-party', null, body);
        el('div', 'mp-member', `<b>${U.esc(W().player.name)}</b> <small>(you${N.isHost() ? ', host' : ''})</small>`, party);
        for (const p of N.peers.values()) if (p.look) el('div', 'mp-member', `<b>${U.esc(p.look.name)}</b> <small>Lv ${p.s ? p.s.lv : '?'} ${U.esc((R.Classes[p.look.cls] || {}).name || '')}${p.id === 0 ? ' (host)' : ''}</small>`, party);
        if (N.isHost() && !N.peers.size) el('div', 'hint', 'Waiting for friends to join...', party);
        const chatRow = el('div', 'mp-row', null, body);
        const ci = el('input', 'cc-name mp-input', null, chatRow); ci.placeholder = 'Say something to the party...'; ci.maxLength = 120;
        const sendChat = () => { N.say(ci.value); ci.value = ''; };
        ci.onkeydown = (e) => { if (e.code === 'Enter') { sendChat(); e.preventDefault(); } if (e.code === 'Escape') ci.blur(); };
        UI.button(chatRow, 'Send', sendChat);
        const foot = el('div', 'cc-foot', null, body);
        UI.button(foot, '← Back', () => UI.back());
        UI.button(foot, N.isHost() ? 'Stop hosting' : 'Leave game', () => N.leave(), 'danger');
        return;
      }
      el('div', 'hint', 'Play online with up to 3 friends — nothing extra to install. Everyone keeps their own character, loot and quests; the host\'s world is the shared one.', body);
      // ---- room codes (easy)
      const cols = el('div', 'mp-cols', null, body);
      const hostBox = el('div', 'mp-box', '<div class="mp-box-title">Host a game</div>', cols);
      const hpw = el('input', 'cc-name mp-input', null, hostBox); hpw.placeholder = 'Password (optional)'; hpw.maxLength = 32;
      UI.button(hostBox, 'Host — get a room code', async (e) => {
        e.target.disabled = true; N.status = 'Starting...'; UI.toast('Starting your game room...');
        const r = await N.host(0, hpw.value.trim(), 'code');
        UI.toast(r.ok ? 'Room code: ' + r.code : 'Could not host: ' + r.error, r.ok ? 'good' : 'bad'); UI.refresh();
      }, 'primary big');
      const joinBox = el('div', 'mp-box', '<div class="mp-box-title">Join a friend</div>', cols);
      const jc = el('input', 'cc-name mp-input mp-code-in', null, joinBox); jc.placeholder = 'ROOM CODE'; jc.maxLength = 8; jc.value = N.lastCode || '';
      jc.oninput = () => { jc.value = jc.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
      const jpw = el('input', 'cc-name mp-input', null, joinBox); jpw.placeholder = 'Password (if they set one)'; jpw.maxLength = 32;
      UI.button(joinBox, 'Join', async (e) => {
        const code = jc.value.trim(); if (code.length < 4) { UI.toast('Type the room code first', 'bad'); return; }
        e.target.disabled = true; N.lastCode = code; UI.toast('Looking for room ' + code + '...');
        const r = await N.join(code, 0, jpw.value.trim(), 'code');
        if (!r.ok) UI.toast('Could not join: ' + r.error, 'bad');
        UI.refresh();
      }, 'primary big');
      if (N.status) el('div', 'mp-status dim', U.esc(N.status), body);
      // ---- direct connection (advanced)
      if (N.canDirect()) {
        const adv = el('details', 'mp-adv', '<summary>Advanced: connect by IP address (LAN, Tailscale, Radmin, port forwarding)</summary>', body);
        const h = el('div', 'mp-row', '<label>Host</label>', adv);
        const hp = el('input', 'cc-name mp-input small', null, h); hp.value = N.port || 7777; hp.maxLength = 5;
        UI.button(h, 'Host on this port', async () => { const r = await N.host(+hp.value || 7777, hpw.value.trim(), 'ip'); UI.toast(r.ok ? 'Hosting! Give your friends your address.' : 'Could not host: ' + r.error, r.ok ? 'good' : 'bad'); UI.refresh(); });
        const j = el('div', 'mp-row', '<label>Join</label>', adv);
        const ja = el('input', 'cc-name mp-input', null, j); ja.placeholder = 'e.g. 192.168.1.20'; ja.value = N.lastAddress || '';
        const jp = el('input', 'cc-name mp-input small', null, j); jp.value = N.port || 7777; jp.maxLength = 5;
        UI.button(j, 'Join', async () => {
          const addr = ja.value.trim(); if (!addr) { UI.toast('Type the host\'s address first', 'bad'); return; }
          N.lastAddress = addr;
          const r = await N.join(addr, +jp.value || 7777, jpw.value.trim(), 'ip');
          if (!r.ok) UI.toast('Could not connect: ' + r.error, 'bad');
          UI.refresh();
        });
        el('div', 'mp-help', 'Only needed if room codes don\'t work for you. The first time you host this way, Windows may ask to allow Emberfall through the firewall — click <b>Allow</b>.', adv);
      }
      const foot = el('div', 'cc-foot', null, body);
      UI.button(foot, '← Back', () => UI.back());
    },
  };
})(window.RPG);
