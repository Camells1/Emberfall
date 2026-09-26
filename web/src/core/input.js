'use strict';
// Keyboard + mouse + gamepad input, mapped to named actions.
(function (R) {
  const I = R.Input = {
    keys: new Set(),        // currently held KeyboardEvent.code values
    pressed: new Set(),     // codes pressed this frame
    mouse: { x: 0, y: 0, sx: 0, sy: 0, down: false, rdown: false, clicked: false, rclicked: false, moved: false },
    // screen (internal-resolution) coords are mouse.sx/sy; world coords filled in by the engine: mouse.x/y
    gamepad: null,
    usingPad: false,
    enabled: true,
  };

  // Action -> list of key codes. 'mouse0'/'mouse2' are left/right buttons.
  I.bindings = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    attack: ['mouse0', 'KeyJ'],
    dodge: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    heavy: ['mouse2', 'KeyU'],
    interact: ['KeyE', 'KeyF'],
    skill1: ['Digit1'],
    skill2: ['Digit2'],
    skill3: ['Digit3'],
    skill4: ['Digit4'],
    potion: ['KeyQ'],
    manapotion: ['KeyR'],
    inventory: ['KeyI', 'Tab'],
    quests: ['KeyL'],
    map: ['KeyM'],
    skills: ['KeyK'],
    character: ['KeyC'],
    pause: ['Escape'],
  };

  I.held = function (action) {
    if (!I.enabled) return false;
    const b = I.bindings[action];
    if (b) for (const c of b) {
      if (c === 'mouse0' ? I.mouse.down : c === 'mouse2' ? I.mouse.rdown : I.keys.has(c)) return true;
    }
    return padHeld(action);
  };
  I.hit = function (action) {
    if (I.swallow) return false; // a menu or dialogue already used this frame's input
    const b = I.bindings[action];
    if (b) for (const c of b) {
      if (c === 'mouse0' ? I.mouse.clicked : c === 'mouse2' ? I.mouse.rclicked : I.pressed.has(c)) return true;
    }
    return padHit(action);
  };
  // Movement vector (normalized)
  I.move = function () {
    if (!I.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (I.held('left')) x -= 1;
    if (I.held('right')) x += 1;
    if (I.held('up')) y -= 1;
    if (I.held('down')) y += 1;
    const p = I.gamepad;
    if (p) {
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.2) { x = ax; y = ay; }
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  };
  // Right-stick aim (radians) or null
  I.padAim = function () {
    const p = I.gamepad;
    if (!p) return null;
    const ax = p.axes[2] || 0, ay = p.axes[3] || 0;
    if (Math.hypot(ax, ay) > 0.35) return Math.atan2(ay, ax);
    return null;
  };

  // ---- gamepad -------------------------------------------------------------
  const PAD = { attack: [7, 2], dodge: [0], heavy: [6], sprint: [11], interact: [3], skill1: [4], skill2: [5], skill3: [1], skill4: [10], potion: [12], manapotion: [13], inventory: [8], pause: [9], map: [15], quests: [14] };
  let padPrev = [];
  function padHeld(action) {
    const p = I.gamepad; if (!p || !PAD[action]) return false;
    return PAD[action].some((i) => p.buttons[i] && p.buttons[i].pressed);
  }
  function padHit(action) {
    const p = I.gamepad; if (!p || !PAD[action]) return false;
    return PAD[action].some((i) => p.buttons[i] && p.buttons[i].pressed && !padPrev[i]);
  }
  // Raw gamepad button press this frame (for menus).
  I.padButtonHit = function (i) { const p = I.gamepad; return !!(p && p.buttons[i] && p.buttons[i].pressed && !padPrev[i]); };
  I.pollPad = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find((g) => g && g.connected);
    I.gamepad = p || null;
    if (p && p.buttons.some((b) => b.pressed)) I.usingPad = true;
  };
  I.endFrame = function () {
    I.swallow = false;
    I.pressed.clear();
    I.mouse.clicked = false;
    I.mouse.rclicked = false;
    I.mouse.moved = false;
    padPrev = I.gamepad ? I.gamepad.buttons.map((b) => b.pressed) : [];
  };

  I.attach = function (canvas, toInternal) {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!I.keys.has(e.code)) I.pressed.add(e.code);
      I.keys.add(e.code);
      I.usingPad = false;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => I.keys.delete(e.code));
    window.addEventListener('blur', () => { I.keys.clear(); I.mouse.down = I.mouse.rdown = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { I.keys.clear(); I.mouse.down = I.mouse.rdown = false; } });
    canvas.addEventListener('mousemove', (e) => {
      const p = toInternal(e.clientX, e.clientY);
      I.mouse.sx = p.x; I.mouse.sy = p.y; I.mouse.moved = true; I.usingPad = false;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { I.mouse.down = true; I.mouse.clicked = true; }
      if (e.button === 2) { I.mouse.rdown = true; I.mouse.rclicked = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) I.mouse.down = false;
      if (e.button === 2) I.mouse.rdown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  I.keyName = function (code) {
    if (!code) return '';
    if (code === 'mouse0') return 'LMB';
    if (code === 'mouse2') return 'RMB';
    return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Left', '').replace('Arrow', '');
  };
})(window.RPG);
