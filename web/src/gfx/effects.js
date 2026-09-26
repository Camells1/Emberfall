'use strict';
// Particles, floating combat text, screen shake, hit-stop, slash arcs and dynamic lights.
// Everything here lives in world coordinates and is drawn by the world renderer.
//
// API:
//   FX.burst(x, y, {n, color, colors, speed, life, size, grav, drag, glow, spread, angle, z})
//   FX.particle({...})                         single particle
//   FX.text(x, y, text, color, {big, crit})    floating text
//   FX.add({life, draw(ctx, t, fx), update?(fx, dt), layer:'ground'|'top', x, y}) custom effect
//   FX.slash(x, y, angle, arc, radius, color, dur, width)
//   FX.ring(x, y, r0, r1, color, dur, width)
//   FX.beam(x0, y0, x1, y1, color, dur, width)
//   FX.lightning(x0, y0, x1, y1, color)
//   FX.shake(amount, dur)   FX.hitstop(sec)   FX.flash(color, dur)   (flash = full screen tint)
//   FX.light(x, y, radius, color, life?)     temporary light (for dark maps)
(function (R) {
  const U = R.U, G = R.G;
  const FX = R.FX = { parts: [], effects: [], texts: [], lights: [], shakeAmt: 0, shakeT: 0, stop: 0, flashC: null, flashT: 0, flashMax: 0 };

  FX.reset = function () { FX.parts.length = 0; FX.effects.length = 0; FX.texts.length = 0; FX.lights.length = 0; FX.shakeAmt = 0; FX.stop = 0; FX.flashT = 0; };

  FX.particle = function (p) {
    p.life = p.life || 0.5; p.max = p.life;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.z = p.z || 0; p.vz = p.vz || 0;
    p.size = p.size || 1; p.drag = p.drag == null ? 0.9 : p.drag; p.grav = p.grav || 0;
    if (FX.parts.length < 2500) FX.parts.push(p);
    return p;
  };

  FX.burst = function (x, y, o) {
    o = o || {};
    const n = o.n || 10;
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + U.rand(-(o.spread || 0.5), o.spread || 0.5) : U.rand(0, U.TAU);
      const s = U.rand(0.3, 1) * (o.speed || 60);
      FX.particle({
        x: x + U.rand(-(o.jitter || 0), o.jitter || 0), y: y + U.rand(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * (o.flat ? 0.6 : 1),
        z: o.z || 0, vz: o.vz != null ? U.rand(o.vz * 0.5, o.vz) : 0, grav: o.grav || 0,
        life: U.rand(0.6, 1) * (o.life || 0.5),
        color: o.colors ? U.choose(o.colors) : o.color || '#fff',
        size: o.size ? (Array.isArray(o.size) ? U.randi(o.size[0], o.size[1]) : o.size) : 1,
        drag: o.drag == null ? 0.9 : o.drag, glow: o.glow, shrink: o.shrink !== false, up: o.up || 0,
      });
    }
  };

  FX.text = function (x, y, text, color, o) {
    o = o || {};
    FX.texts.push({ x: x + U.rand(-4, 4), y, vy: o.crit ? -55 : -40, text: String(text), color: color || '#fff', life: o.life || 0.9, max: o.life || 0.9, scale: o.big || o.crit ? 2 : 1, crit: o.crit });
  };

  FX.add = function (fx) { fx.t = 0; fx.life = fx.life || 0.5; FX.effects.push(fx); return fx; };

  FX.shake = function (amt, dur) { if (!R.settings || R.settings.shake !== false) { FX.shakeAmt = Math.max(FX.shakeAmt, amt); FX.shakeT = Math.max(FX.shakeT, dur || 0.2); } };
  FX.hitstop = function (s) { FX.stop = Math.max(FX.stop, s); };
  FX.flash = function (color, dur) { FX.flashC = color; FX.flashT = FX.flashMax = dur || 0.2; };
  FX.light = function (x, y, radius, color, life) { FX.lights.push({ x, y, r: radius, color: color || '#ffd9a0', life: life || 0.2, max: life || 0.2 }); };

  // Crescent slash trail.
  FX.slash = function (x, y, angle, arc, radius, color, dur, width) {
    return FX.add({
      x, y, life: dur || 0.18, layer: 'top', draw(ctx, t) {
        const a0 = angle - arc / 2, a1 = angle + arc / 2;
        const head = U.easeOut(Math.min(1, t * 1.6));
        const tail = U.easeIn(t);
        const aa = U.lerp(a0, a1, tail), ab = U.lerp(a0, a1, head);
        if (ab <= aa) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const w = (width || 6) * (1 - t * 0.6);
        ctx.fillStyle = U.rgba(color, 0.85 * (1 - t));
        ctx.beginPath();
        ctx.arc(x, y, radius, aa, ab);
        ctx.arc(x, y, Math.max(1, radius - w), ab, aa, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = U.rgba('#ffffff', 0.9 * (1 - t));
        ctx.beginPath();
        ctx.arc(x, y, radius, aa + (ab - aa) * 0.4, ab);
        ctx.arc(x, y, radius - Math.max(1, w * 0.35), ab, aa + (ab - aa) * 0.4, true);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      },
    });
  };

  FX.ring = function (x, y, r0, r1, color, dur, width) {
    return FX.add({
      x, y, life: dur || 0.4, layer: 'ground', draw(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba(color, 1 - t);
        ctx.lineWidth = (width || 3) * (1 - t) + 1;
        ctx.beginPath(); ctx.ellipse(x, y, U.lerp(r0, r1, U.easeOut(t)), U.lerp(r0, r1, U.easeOut(t)) * 0.6, 0, 0, U.TAU); ctx.stroke();
        ctx.restore();
      },
    });
  };

  FX.beam = function (x0, y0, x1, y1, color, dur, width) {
    return FX.add({
      life: dur || 0.2, layer: 'top', draw(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = U.rgba(color, 0.7 * (1 - t));
        ctx.lineWidth = (width || 4) * (1 - t * 0.5);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = U.rgba('#ffffff', 1 - t);
        ctx.lineWidth = Math.max(1, (width || 4) * 0.35);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.restore();
      },
    });
  };

  FX.lightning = function (x0, y0, x1, y1, color, dur) {
    const pts = [];
    const n = Math.max(3, Math.floor(U.dist(x0, y0, x1, y1) / 10));
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = i === 0 || i === n ? 0 : U.rand(-7, 7);
      pts.push([U.lerp(x0, x1, t) + (nx / nl) * off, U.lerp(y0, y1, t) + (ny / nl) * off]);
    }
    FX.light((x0 + x1) / 2, (y0 + y1) / 2, 60, color || '#9fd8ff', 0.2);
    return FX.add({
      life: dur || 0.22, layer: 'top', draw(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, c, a] of [[5, color || '#6fb6ff', 0.5], [2, '#ffffff', 1]]) {
          ctx.strokeStyle = U.rgba(c, a * (1 - t)); ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts) ctx.lineTo(p[0], p[1]);
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  };

  // Rising pillar of light (level-up, heal, portals).
  FX.pillar = function (x, y, color, dur, w) {
    return FX.add({
      x, y, life: dur || 0.8, layer: 'top', draw(ctx, t) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const ww = (w || 14) * (1 - t);
        const g = ctx.createLinearGradient(0, y - 80, 0, y);
        g.addColorStop(0, U.rgba(color, 0)); g.addColorStop(1, U.rgba(color, 0.6 * (1 - t)));
        ctx.fillStyle = g; ctx.fillRect(x - ww / 2, y - 80, ww, 80);
        ctx.restore();
      },
    });
  };

  FX.update = function (dt) {
    if (FX.shakeT > 0) { FX.shakeT -= dt; if (FX.shakeT <= 0) FX.shakeAmt = 0; }
    if (FX.flashT > 0) FX.flashT -= dt;
    const P = FX.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) { p.vz -= p.grav * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.4; p.vx *= 0.6; p.vy *= 0.6; } }
      if (p.up) p.z += p.up * dt;
    }
    for (let i = FX.effects.length - 1; i >= 0; i--) {
      const e = FX.effects[i];
      e.t += dt;
      if (e.update) e.update(e, dt);
      if (e.t >= e.life) FX.effects.splice(i, 1);
    }
    for (let i = FX.texts.length - 1; i >= 0; i--) {
      const t = FX.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.vy *= Math.pow(0.9, dt * 60);
      if (t.life <= 0) FX.texts.splice(i, 1);
    }
    for (let i = FX.lights.length - 1; i >= 0; i--) { FX.lights[i].life -= dt; if (FX.lights[i].life <= 0) FX.lights.splice(i, 1); }
  };

  FX.drawEffects = function (ctx, layer) {
    for (const e of FX.effects) if ((e.layer || 'top') === layer) {
      try { e.draw(ctx, U.clamp(e.t / e.life, 0, 1), e); } catch (err) { console.error(err); e.t = e.life; }
    }
  };

  FX.drawParticles = function (ctx) {
    let lighter = false;
    for (const p of FX.parts) {
      const a = p.shrink ? p.life / p.max : 1;
      const s = p.shrink ? Math.max(1, Math.round(p.size * (0.4 + 0.6 * a))) : p.size;
      if (p.glow && !lighter) { ctx.globalCompositeOperation = 'lighter'; lighter = true; }
      if (!p.glow && lighter) { ctx.globalCompositeOperation = 'source-over'; lighter = false; }
      ctx.globalAlpha = p.glow ? Math.min(1, a * 1.2) : Math.min(1, a * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - p.z - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  FX.drawTexts = function (ctx) {
    for (const t of FX.texts) {
      const img = G.pixelText(t.text, t.color, t.scale);
      const a = Math.min(1, t.life / t.max * 2.5);
      ctx.globalAlpha = a;
      const pop = t.crit ? 1 + Math.max(0, (t.life - t.max + 0.15) / 0.15) * 0.6 : 1;
      const w = img.width * pop, h = img.height * pop;
      ctx.drawImage(img, Math.round(t.x - w / 2), Math.round(t.y - h / 2), Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = 1;
  };

  FX.shakeOffset = function () {
    if (FX.shakeAmt <= 0) return [0, 0];
    return [U.rand(-FX.shakeAmt, FX.shakeAmt), U.rand(-FX.shakeAmt, FX.shakeAmt)];
  };
})(window.RPG);
