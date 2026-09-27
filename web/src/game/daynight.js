'use strict';
// Day and night on outdoor maps. One full day takes 20 minutes of play: sunrise around 06:00,
// warm evening light, then a blue night lit by lamps, torches and fireflies. In HD-2D the sun
// travels across the sky so shadows turn through the day. Dungeons and caves are unaffected.
// The clock is saved with the game (W.flags.dayT). Settings → "Day & night cycle" turns it off.
(function (R) {
  const U = R.U;
  const DN = R.DayNight = {};
  const DAY_SECONDS = 1200;
  const W = () => R.World;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  DN.enabled = () => R.settings && R.settings.dayNight !== false;
  DN.t = () => { const f = W().flags; return f && typeof f.dayT === 'number' ? f.dayT : 0.36; }; // 0 = midnight, 0.5 = noon
  DN.outdoor = () => { const d = W().def; return !!(d && d.outdoor && !d.pvp) && DN.enabled(); };
  // 1 at night, 0 by day, easing through dawn (05:00-07:00) and dusk (18:00-20:30)
  DN.night = () => { if (!DN.outdoor()) return 0; const t = DN.t(); return 1 - smooth(0.2, 0.29, t) + smooth(0.75, 0.855, t); };
  // warm golden-hour glow around sunrise and sunset
  DN.golden = () => { if (!DN.outdoor()) return 0; const t = DN.t(); return Math.max(0, 1 - Math.abs(t - 0.27) / 0.06) * 0.7 + Math.max(0, 1 - Math.abs(t - 0.77) / 0.07); };
  // how dark the map is right now (maps that are always dark keep their own darkness)
  DN.dark = (def) => Math.max((def && def.dark) || 0, DN.night() * 0.62);
  DN.ambient = (def) => (DN.night() > 0.05 && !(def && def.dark) ? '#060a24' : (def && def.ambient) || '#05040a');
  DN.clock = () => { const m = Math.floor(DN.t() * 24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  DN.isNight = () => DN.night() > 0.5;
  // sun direction for HD-2D shadows: rises in the east (+x), sets in the west, moon at night
  DN.sunDir = () => {
    const t = DN.t(), day = t > 0.22 && t < 0.8;
    const a = day ? (t - 0.22) / 0.58 : ((t + 0.2) % 1) / 0.42; // 0..1 across the sky
    const x = Math.cos(a * Math.PI) * 0.75, y = 0.35 + Math.sin(a * Math.PI) * 0.6;
    return { x, y, z: -0.25, day };
  };

  R.events.on('tick', (dt) => {
    const w = W(); if (!w || !w.flags || R.state !== 'play') return;
    if (typeof w.flags.dayT !== 'number') w.flags.dayT = 0.36;
    if (!DN.enabled()) return;
    w.flags.dayT = (w.flags.dayT + dt / DAY_SECONDS) % 1;
    // fireflies drift around you on summer nights
    const n = DN.night();
    if (n > 0.5 && R.settings.fancy !== false && Math.random() < dt * 6 * n) {
      const p = w.player;
      if (p && !['desert', 'volcano', 'frost', 'peaks', 'tundra'].some((k) => (w.map.id || '').includes(k)))
        R.FX.particle({ x: p.x + U.rand(-260, 260), y: p.y + U.rand(-160, 140), vx: U.rand(-8, 8), vy: U.rand(-10, 4), life: U.rand(1.2, 2.4), color: U.choose(['#d0ff60', '#f0ff90', '#ffd860']), glow: true, size: 1 });
    }
  });
  // a new character starts in the morning
  R.events.on('enter', () => { const f = W().flags; if (f && typeof f.dayT !== 'number') f.dayT = 0.33; });

  // --- HUD clock under the minimap
  let clockEl = null, lastTxt = '';
  R.events.on('tick', () => {
    if (!clockEl) {
      const mm = document.querySelector('.minimap'); if (!mm) return;
      clockEl = document.createElement('div'); clockEl.className = 'mm-clock'; mm.appendChild(clockEl);
    }
    const on = DN.outdoor();
    const txt = on ? (DN.isNight() ? '☾ ' : DN.golden() > 0.4 ? '☀ ' : '☼ ') + DN.clock() + (DN.isNight() ? ' · night' : '') : '';
    if (txt !== lastTxt) { clockEl.textContent = txt; clockEl.style.display = on ? '' : 'none'; lastTxt = txt; }
  });
})(window.RPG);
