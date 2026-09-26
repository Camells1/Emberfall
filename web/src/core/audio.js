'use strict';
// Procedural audio: every sound effect and music track is synthesized with WebAudio,
// so the game ships with no audio files.
//
// API (used everywhere else):
//   RPG.Audio.play(name, opts?)   one-shot SFX. opts: {vol, pitch}
//   RPG.Audio.music(trackName)    cross-fade to a looping music track (null = silence)
//   RPG.Audio.setVolume('master'|'sfx'|'music', 0..1)
(function (R) {
  const A = R.Audio = { vol: { master: 0.7, sfx: 0.8, music: 0.45 }, ctx: null, current: null };
  let master, sfxBus, musicBus, noiseBuf;

  function init() {
    if (A.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    A.ctx = new AC();
    master = A.ctx.createGain(); master.gain.value = A.vol.master; master.connect(A.ctx.destination);
    sfxBus = A.ctx.createGain(); sfxBus.gain.value = A.vol.sfx; sfxBus.connect(master);
    musicBus = A.ctx.createGain(); musicBus.gain.value = A.vol.music; musicBus.connect(master);
    noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // Browsers need a user gesture before audio can start.
  A.unlock = function () { if (A.bgMuted) return; if (init() && A.ctx.state === 'suspended') A.ctx.resume(); };
  window.addEventListener('pointerdown', A.unlock);
  window.addEventListener('keydown', A.unlock);

  // Go silent while the game is minimized, hidden or (optionally) in the background,
  // so the music doesn't keep playing when you're not playing.
  A.bgMuted = false;
  function syncBackground() {
    const st = R.settings || {};
    const away = document.hidden || (st.muteUnfocused !== false && !document.hasFocus());
    if (away === A.bgMuted) return;
    A.bgMuted = away;
    if (!A.ctx) return;
    if (away) A.ctx.suspend(); else A.ctx.resume();
  }
  A.syncBackground = syncBackground;
  document.addEventListener('visibilitychange', syncBackground);
  window.addEventListener('blur', syncBackground);
  window.addEventListener('focus', syncBackground);

  A.setVolume = function (bus, v) {
    A.vol[bus] = v;
    if (!A.ctx) return;
    ({ master, sfx: sfxBus, music: musicBus })[bus].gain.value = v;
  };

  // ---- building blocks -----------------------------------------------------
  function tone(o) {
    // o: {type, f, f2, t (dur), vol, attack, delay, bus}
    const c = A.ctx, t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + o.t + 0.05);
  }
  function noise(o) {
    // o: {t, vol, filter:'lowpass'|'highpass'|'bandpass', f, f2, delay, q}
    const c = A.ctx, t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const flt = c.createBiquadFilter(); flt.type = o.filter || 'lowpass';
    flt.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.t);
    flt.Q.value = o.q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    src.connect(flt); flt.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0); src.stop(t0 + o.t + 0.05);
  }
  A.tone = (o) => { if (init()) tone(o); };
  A.noise = (o) => { if (init()) noise(o); };

  // ---- sound library -------------------------------------------------------
  // Each entry is a function(p) where p is a pitch multiplier. Add freely.
  A.sfx = {
    slime: (p) => { tone({ type: 'sine', f: 240 * p, f2: 80 * p, t: 0.22, vol: 0.25 }); noise({ t: 0.08, vol: 0.12, f: 600 * p }); },
    whoosh: (p) => noise({ t: 0.35, vol: 0.28, filter: 'bandpass', f: 350 * p, f2: 1500 * p, q: 1 }),
    swing: (p) => noise({ t: 0.12, vol: 0.25, filter: 'bandpass', f: 1800 * p, f2: 600 * p, q: 2 }),
    hit: (p) => { noise({ t: 0.1, vol: 0.4, f: 1200 * p }); tone({ type: 'square', f: 160 * p, f2: 60, t: 0.12, vol: 0.15 }); },
    crit: (p) => { noise({ t: 0.15, vol: 0.5, f: 3000 * p }); tone({ type: 'sawtooth', f: 300 * p, f2: 80, t: 0.2, vol: 0.2 }); },
    hurt: (p) => tone({ type: 'sawtooth', f: 220 * p, f2: 90, t: 0.2, vol: 0.2 }),
    arrow: (p) => noise({ t: 0.15, vol: 0.2, filter: 'highpass', f: 3000 * p, f2: 1200 }),
    magic: (p) => { tone({ type: 'sine', f: 600 * p, f2: 1200 * p, t: 0.25, vol: 0.15 }); tone({ type: 'triangle', f: 900 * p, f2: 1800 * p, t: 0.2, vol: 0.08, delay: 0.03 }); },
    fire: (p) => noise({ t: 0.4, vol: 0.35, f: 800 * p, f2: 200 }),
    ice: (p) => { tone({ type: 'sine', f: 1800 * p, f2: 2400, t: 0.3, vol: 0.1 }); noise({ t: 0.3, vol: 0.15, filter: 'highpass', f: 5000 }); },
    zap: (p) => { tone({ type: 'sawtooth', f: 1400 * p, f2: 200, t: 0.18, vol: 0.12 }); noise({ t: 0.15, vol: 0.2, filter: 'highpass', f: 4000 }); },
    explode: (p) => { noise({ t: 0.6, vol: 0.6, f: 900 * p, f2: 60 }); tone({ type: 'sine', f: 90 * p, f2: 30, t: 0.5, vol: 0.4 }); },
    heal: (p) => [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', f: f * p, t: 0.3, vol: 0.1, delay: i * 0.06 })),
    dodge: (p) => noise({ t: 0.18, vol: 0.2, filter: 'bandpass', f: 900 * p, f2: 2000, q: 1.5 }),
    step: (p) => noise({ t: 0.04, vol: 0.05, f: 500 * p }),
    coin: (p) => { tone({ type: 'square', f: 988 * p, t: 0.08, vol: 0.08 }); tone({ type: 'square', f: 1319 * p, t: 0.25, vol: 0.08, delay: 0.07 }); },
    pickup: (p) => { tone({ type: 'triangle', f: 660 * p, f2: 990 * p, t: 0.12, vol: 0.15 }); },
    levelup: (p) => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'square', f: f * p, t: 0.3, vol: 0.08, delay: i * 0.09 })),
    quest: (p) => [392, 523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f: f * p, t: 0.4, vol: 0.12, delay: i * 0.12 })),
    click: (p) => tone({ type: 'square', f: 700 * p, t: 0.04, vol: 0.06 }),
    open: (p) => tone({ type: 'triangle', f: 400 * p, f2: 700 * p, t: 0.1, vol: 0.08 }),
    close: (p) => tone({ type: 'triangle', f: 600 * p, f2: 350 * p, t: 0.1, vol: 0.08 }),
    talk: (p) => tone({ type: 'square', f: (300 + Math.random() * 150) * p, t: 0.04, vol: 0.04 }),
    error: (p) => tone({ type: 'square', f: 150 * p, t: 0.15, vol: 0.1 }),
    death: (p) => { tone({ type: 'sawtooth', f: 300 * p, f2: 40, t: 0.8, vol: 0.2 }); noise({ t: 0.5, vol: 0.2, f: 600, f2: 100 }); },
    enemyDie: (p) => { noise({ t: 0.25, vol: 0.3, f: 1500 * p, f2: 200 }); tone({ type: 'square', f: 200 * p, f2: 50, t: 0.2, vol: 0.1 }); },
    bossRoar: (p) => { tone({ type: 'sawtooth', f: 110 * p, f2: 55, t: 1.2, vol: 0.3 }); noise({ t: 1.2, vol: 0.3, f: 400, f2: 100 }); },
    chest: (p) => [440, 554, 659, 880].forEach((f, i) => tone({ type: 'triangle', f: f * p, t: 0.2, vol: 0.1, delay: i * 0.05 })),
    equip: (p) => { noise({ t: 0.08, vol: 0.2, filter: 'highpass', f: 2500 }); tone({ type: 'square', f: 220 * p, t: 0.06, vol: 0.06 }); },
    buy: (p) => { tone({ type: 'square', f: 1319 * p, t: 0.1, vol: 0.07 }); tone({ type: 'square', f: 1760 * p, t: 0.2, vol: 0.07, delay: 0.08 }); },
    portal: (p) => { tone({ type: 'sine', f: 200 * p, f2: 800 * p, t: 0.6, vol: 0.15 }); noise({ t: 0.6, vol: 0.1, filter: 'bandpass', f: 1000, f2: 3000, q: 3 }); },
  };

  A.play = function (name, opts) {
    if (!init() || A.ctx.state !== 'running') return;
    const fn = A.sfx[name];
    if (!fn) return;
    try { fn((opts && opts.pitch) || (0.94 + Math.random() * 0.12)); } catch (e) { /* ignore */ }
  };

  // ---- music ---------------------------------------------------------------
  // Tracks: {bpm, wave, bass:[midi...], lead:[midi or 0...], pad?} — step sequencer, 8th notes.
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  A.tracks = {
    title: { bpm: 80, lead: [69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 67, 0, 69, 0, 0, 0], bass: [45, 45, 41, 41, 43, 43, 40, 40], wave: 'triangle' },
    town: { bpm: 100, lead: [72, 74, 76, 0, 79, 76, 74, 0, 72, 74, 72, 69, 67, 0, 0, 0], bass: [48, 48, 53, 53, 55, 55, 48, 48], wave: 'square' },
    field: { bpm: 110, lead: [64, 0, 67, 69, 71, 0, 69, 67, 64, 0, 62, 64, 67, 0, 0, 0], bass: [40, 40, 45, 45, 43, 43, 47, 47], wave: 'square' },
    dungeon: { bpm: 84, lead: [57, 0, 0, 60, 0, 0, 59, 0, 56, 0, 0, 57, 0, 0, 0, 0], bass: [33, 33, 33, 33, 32, 32, 31, 31], wave: 'sawtooth' },
    boss: { bpm: 150, lead: [69, 69, 72, 69, 75, 74, 72, 69, 68, 68, 71, 68, 74, 72, 71, 68], bass: [45, 45, 45, 45, 44, 44, 44, 44], wave: 'sawtooth' },
    coast: { bpm: 96, lead: [67, 0, 71, 74, 72, 0, 71, 69, 67, 0, 64, 0, 66, 67, 0, 0], bass: [43, 43, 48, 48, 50, 50, 43, 43], wave: 'triangle' },
    caves: { bpm: 76, lead: [62, 0, 0, 65, 0, 69, 0, 0, 68, 0, 0, 64, 0, 0, 0, 0], bass: [38, 38, 38, 38, 36, 36, 37, 37], wave: 'triangle' },
    grove: { bpm: 104, lead: [76, 0, 79, 81, 0, 79, 76, 0, 74, 76, 0, 72, 74, 0, 0, 0], bass: [45, 45, 48, 48, 43, 43, 47, 47], wave: 'triangle' },
    rift: { bpm: 70, lead: [60, 0, 63, 0, 66, 0, 0, 70, 0, 69, 0, 66, 0, 0, 63, 0], bass: [36, 36, 36, 36, 42, 42, 41, 41], wave: 'sine' },
    desert: { bpm: 100, lead: [64, 65, 68, 0, 69, 68, 65, 0, 64, 0, 62, 64, 65, 0, 0, 0], bass: [40, 40, 40, 41, 40, 40, 38, 40], wave: 'square' },
    snow: { bpm: 88, lead: [74, 0, 71, 0, 69, 0, 71, 74, 76, 0, 74, 0, 71, 0, 0, 0], bass: [47, 47, 43, 43, 45, 45, 42, 42], wave: 'triangle' },
    marsh: { bpm: 92, lead: [57, 0, 60, 0, 59, 57, 0, 55, 57, 0, 0, 52, 0, 55, 0, 0], bass: [33, 33, 36, 36, 31, 31, 33, 33], wave: 'square' },
    volcano: { bpm: 120, lead: [62, 62, 65, 0, 62, 60, 0, 58, 57, 0, 58, 60, 62, 0, 0, 0], bass: [38, 38, 38, 38, 34, 34, 36, 36], wave: 'sawtooth' },
    citadel: { bpm: 90, lead: [59, 0, 62, 0, 63, 0, 62, 59, 58, 0, 0, 55, 0, 58, 0, 0], bass: [35, 35, 35, 35, 34, 34, 31, 31], wave: 'sawtooth' },
  };
  let seqTimer = null, step = 0, nextTime = 0;
  A.music = function (name) {
    if (A.current === name) return;
    A.current = name;
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
    if (!name || !A.tracks[name]) return;
    const run = () => {
      if (!init() || A.ctx.state !== 'running') return;
      const tr = A.tracks[A.current];
      if (!tr) return;
      const stepDur = 60 / tr.bpm / 2;
      if (nextTime < A.ctx.currentTime) nextTime = A.ctx.currentTime + 0.05;
      while (nextTime < A.ctx.currentTime + 0.25) {
        const delay = nextTime - A.ctx.currentTime;
        const n = tr.lead[step % tr.lead.length];
        if (n) tone({ type: tr.wave, f: midi(n), t: stepDur * 1.6, vol: 0.05, delay, bus: musicBus });
        if (step % 2 === 0) {
          const b = tr.bass[(step / 2) % tr.bass.length];
          if (b) tone({ type: 'triangle', f: midi(b), t: stepDur * 1.9, vol: 0.09, delay, bus: musicBus });
        }
        step++; nextTime += stepDur;
      }
    };
    seqTimer = setInterval(run, 60);
  };
})(window.RPG);
