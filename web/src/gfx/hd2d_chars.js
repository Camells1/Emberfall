'use strict';
// HD-2D people: you, your friends and every villager become small, smooth 3D figures built from the
// same appearance + gear data as the 2D sprites (skin, hair style, eyes, ears, horns, beard, armour,
// helmet, cape, shield, weapon) and animated from the same state (walk, run, attack, cast, roll, die).
// Classic 2D mode is untouched.
(function (R) {
  const U = R.U;
  const CH = R.HD2DChars = {};
  let T = null;
  const TAU = Math.PI * 2, SCALE = 1.55, TILT = 0.42; // figure size; lean back toward the camera so faces read

  // ---- shared unit shapes ------------------------------------------------------------------
  const G3 = {};
  function geo(k) {
    if (G3[k]) return G3[k];
    const i = k.indexOf(':'), name = i < 0 ? k : k.slice(0, i), n = i < 0 ? 0 : +k.slice(i + 1);
    let g;
    switch (name) {
      case 'sph': g = new T.SphereGeometry(1, 20, 14); break;
      case 'dome': g = new T.SphereGeometry(1, 22, 10, 0, TAU, 0, Math.PI * n); break;
      case 'cap': g = new T.CapsuleGeometry(1, n, 5, 14); break; // radius 1, straight part n (height n + 2)
      case 'cone': g = new T.ConeGeometry(1, 1, 14).translate(0, 0.5, 0); break;
      case 'cyl': g = new T.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0); break;
      case 'flare': g = new T.CylinderGeometry(0.62, 1, 1, 18).translate(0, 0.5, 0); break;
      case 'box': g = new T.BoxGeometry(1, 1, 1); break;
      case 'rockish': g = new T.DodecahedronGeometry(1, 0); break;
      case 'ring': g = new T.TorusGeometry(1, 0.14, 8, 28).rotateX(Math.PI / 2); break;
      case 'wpn': g = new T.PlaneGeometry(48, 24).translate(16, 0, 0); break;
    }
    return (G3[k] = g);
  }
  const shade = (c, k) => U.shade(c || '#888888', k);

  // mat(colour, unlit?) / add(parent, shape, colour, pos xyz, scale xyz, rot xyz) / grp(parent, pos xyz)
  function kit(rig) {
    const mat = (hex, basic) => {
      const k = (basic ? 'b' : '') + (hex || '#888888'); let m = rig.matMap.get(k);
      if (!m) { m = basic ? new T.MeshBasicMaterial({ color: new T.Color(hex) }) : new T.MeshLambertMaterial({ color: new T.Color(hex || '#888888') }); rig.matMap.set(k, m); rig.mats.push(m); }
      return m;
    };
    const add = (par, g, col, x, y, z, sx, sy, sz, rx, ry, rz) => {
      const m = new T.Mesh(geo(g), typeof col === 'string' ? mat(col) : col);
      m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = Math.max(sx, sy == null ? sx : sy) > 2.4; par.add(m); return m; // tiny bits (eyes, buttons) skip the shadow pass
    };
    const grp = (par, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); par.add(g); return g; };
    return { mat, add, grp };
  }
  CH.kit = kit;
  CH.newRig = () => { if (!T) T = window.THREE; return { root: new T.Group(), mats: [], matMap: new Map(), eyes: [] }; };
  CH.SCALE = SCALE; CH.TILT = TILT;

  // ---- building one figure ------------------------------------------------------------------
  const HIDE_HAIR = { full: 1, knight: 1, hood: 1, skull: 1, dragon: 1, horned: 1, leather: 1, cap: 1, wizard: 1 };
  function build(a, gear, wl, util, mountId) {
    const rig = { root: new T.Group(), mats: [], matMap: new Map(), eyes: [] };
    const { mat, add, grp } = kit(rig);

    const b = a.body, wide = b === 'c' ? 1.15 : b === 'b' ? 0.88 : 1, legL = b === 'd' ? 10 : b === 'c' ? 7.5 : 8.5;
    const skin = a.skin, ch = gear.chest, lg = gear.legs, ft = gear.feet, hd = gear.hands, hm = gear.head, cp = gear.cape, oh = gear.offhand;
    const shirt = ch ? ch.color : a.outfit, trim = (ch && ch.trim) || a.outfit2 || '#d8c8a0';
    const pants = lg ? lg.color : shade(a.outfit, -0.35), boots = ft ? ft.color : '#4a3020', gloves = hd ? hd.color : skin;
    const robe = !!ch && (ch.style === 'robe' || ch.style === 'mage'), plate = !!ch && ch.style === 'plate';
    const hipY = legL + 2.5, headY = hipY + 17.5, HR = 7;
    rig.hipY = hipY;
    rig.root.rotation.x = -TILT; rig.root.scale.setScalar(SCALE);
    rig.yawG = grp(rig.root, 0, 0, 0);
    rig.spin = grp(rig.yawG, 0, hipY + 6, 0);
    const body = rig.body = grp(rig.spin, 0, -(hipY + 6), 0);

    // legs + boots
    rig.legs = [-1, 1].map((s) => {
      const L = grp(body, s * 2.4 * wide, hipY, 0);
      add(L, 'cap:1', pants, 0, -legL / 2, 0, 2.2 * wide, legL / 3, 2.3);
      if (lg && lg.style === 'plate') add(L, 'sph', shade(pants, 0.25), 0, -legL * 0.45, 1.2, 1.9, 1.6, 1.4);
      add(L, 'sph', boots, 0, -legL + 0.6, 1.1, 2.6, 1.9, 3.5);
      return L;
    });
    // torso
    add(body, 'cap:1', shirt, 0, hipY + 5.5, 0, 5.4 * wide, 11.5 / 3, 4.3);
    if (robe) {
      add(body, 'flare', shirt, 0, 0.3, 0, 6.9 * wide, hipY + 2.5, 5.8);
      add(body, 'ring', trim, 0, 0.9, 0, 6.8 * wide, 5, 5.7);
      if (ch.style === 'mage') add(body, 'box', trim, 0, hipY + 4, 4.3, 1.8, 9, 0.6);
    } else {
      add(body, 'ring', plate ? shade(shirt, -0.3) : '#3a2418', 0, hipY + 1.6, 0, 5.35 * wide, 9, 4.3);
      add(body, 'box', '#c8a040', 0, hipY + 1.6, 4.4, 1.6, 1.4, 0.6); // buckle
    }
    if (ch && ch.style === 'tunic') add(body, 'box', trim, 0, hipY + 8.2, 4.1, 3.2, 2.2, 0.6);
    if (ch && ch.style === 'chain') add(body, 'cap:1', shade(shirt, 0.18), 0, hipY + 6.5, 0.2, 5.5 * wide, 8 / 3, 4.35);
    if (plate) { add(body, 'cap:1', shade(shirt, 0.2), 0, hipY + 7, 0.6, 4.6 * wide, 7 / 3, 4); if (ch.trim) add(body, 'box', ch.trim, 0, hipY + 7, 4.6, 1.2, 7, 0.5); }
    if (ch && ch.glow) add(body, 'sph', mat(ch.glow, true), 0, hipY + 8, 4.3, 0.9);
    // head
    const head = rig.head = grp(body, 0, headY, 0.4);
    add(head, 'sph', skin, 0, 0, 0, HR, HR * 0.95, HR * 0.97);
    add(head, 'box', shade(skin, -0.38), 0, -3.4, 6.35, 1.7, 0.4, 0.3); // mouth
    for (const s of [-1, 1]) {
      const eg = grp(head, s * 2.5, -0.5, 5.7);
      add(eg, 'sph', '#ffffff', 0, 0, 0.3, 1.35, 1.75, 0.8);
      add(eg, 'sph', a.eyeStyle === 'glow' ? mat(a.eyes, true) : a.eyes, 0, -0.2, 0.95, 0.95, 1.3, 0.5);
      add(eg, 'sph', '#140c1c', 0, -0.25, 1.3, 0.45, 0.7, 0.3);
      add(eg, 'sph', mat('#ffffff', true), 0.35, 0.35, 1.45, 0.28);
      if (a.eyeStyle === 'lashes') add(eg, 'box', '#140c1c', 0, 1.6, 0.6, 2.6, 0.35, 0.3);
      rig.eyes.push(eg);
    }
    // ears
    const ears = a.ears;
    for (const s of [-1, 1]) {
      if (ears === 'pointed') add(head, 'cone', skin, s * 6.4, -0.2, -0.3, 1.4, 4.6, 1.1, 0, 0, -s * 1.2);
      else if (ears === 'long') add(head, 'cone', skin, s * 6.3, 0, -0.3, 1.4, 8.5, 1.1, 0, 0, -s * 1.0);
      else if (ears !== 'beast') add(head, 'sph', skin, s * 6.8, -0.6, 0, 1.3, 1.9, 1.1);
    }
    // hair
    const hc = a.hairColor, hs = a.hair, helmStyle = hm ? hm.style : null, hideTop = !!(hm && (HIDE_HAIR[helmStyle] || !helmStyle));
    if (hs !== 'bald') {
      if (!hideTop) {
        const bob = hs === 'bob' || hs === 'curly';
        if (hs !== 'afro') add(head, bob ? 'dome:0.64' : 'dome:0.5', hc, 0, 0.3, -0.4, hs === 'buzz' ? 7.25 : 7.6, hs === 'buzz' ? 7.3 : 7.7, 7.6, -0.35);
        if (hs !== 'buzz' && hs !== 'mohawk' && hs !== 'sidecut' && hs !== 'afro') add(head, 'sph', hc, 0, 3.7, 5.1, 5.2, 1.9, 1.7, 0.2); // fringe
        if (hs === 'spiky' || hs === 'wild') for (let i = 0; i < (hs === 'wild' ? 9 : 7); i++) { const an = i / 7 * Math.PI - Math.PI / 2 + (hs === 'wild' ? Math.sin(i * 7) * 0.4 : 0); add(head, 'cone', hc, Math.sin(an) * 4.5, 5.5 - Math.abs(Math.sin(an)) * 1.5, -1 - Math.cos(an) * 2, 1.7, hs === 'wild' ? 5 : 4.2, 1.7, -0.5 - Math.cos(an) * 0.4, 0, -Math.sin(an) * 0.8); }
        if (hs === 'swept') add(head, 'sph', hc, 2.8, 4.6, 3.4, 4.6, 2.3, 3.2, 0, 0, -0.4);
        if (hs === 'mohawk' || hs === 'sidecut') add(head, 'box', hc, 0, 6.8, -0.8, hs === 'mohawk' ? 1.8 : 5, 4.2, 11, 0.1);
        if (hs === 'curly') for (let i = 0; i < 10; i++) { const an = i / 10 * TAU; add(head, 'sph', shade(hc, (i % 2) * 0.1), Math.cos(an) * 6.2, 2.5 + Math.sin(i * 3) * 1.5, Math.sin(an) * 6 - 0.5, 2.3); }
        if (hs === 'afro') add(head, 'sph', hc, 0, 3, -3, 9.8, 9.2, 9.6);
        if (hs === 'bun') add(head, 'sph', hc, 0, 3.8, -6.8, 3.6);
        if (hs === 'topknot') { add(head, 'sph', hc, 0, 8.2, -1.2, 3); add(head, 'ring', '#c03030', 0, 6.4, -1.1, 1.8, 3, 1.8); }
      }
      if (hs === 'long' || hs === 'braids' || hs === 'dreads') {
        add(head, 'cap:1', hc, 0, -4.2, -4.2, 6.3, 4, 2.8);
        if (hs === 'long') for (const s of [-1, 1]) add(head, 'cap:1', hc, s * 6.2, -3, 0.5, 1.8, 3.2, 1.9);
        if (hs === 'braids') for (const s of [-1, 1]) add(head, 'cap:1', shade(hc, 0.08), s * 3.2, -11, -5.4, 1.4, 3, 1.4);
        if (hs === 'dreads') for (let i = 0; i < 6; i++) add(head, 'cap:1', shade(hc, (i % 2) * 0.1), -5 + i * 2, -9.5, -5 + Math.abs(i - 2.5) * 0.5, 1.1, 3.3, 1.1);
      }
      if (hs === 'ponytail') { add(head, 'sph', hc, 0, 1.4, -7.2, 1.9); add(head, 'cap:1', hc, 0, -4.5, -8.4, 2.1, 3.2, 2, 0.25); }
      if (hs === 'pigtails') for (const s of [-1, 1]) add(head, 'cap:1', hc, s * 7.6, -2.8, -1.8, 2.3, 3.3, 2.3, 0, 0, s * 0.25);
    }
    if (ears === 'beast') for (const s of [-1, 1]) { add(head, 'cone', hc, s * 4.3, 5.3, -0.5, 2.3, 5.2, 1.5, 0, 0, -s * 0.35); add(head, 'cone', '#f0a0b0', s * 4.2, 5.6, 0.4, 1.3, 3.6, 0.6, 0, 0, -s * 0.35); }
    // beard
    const bc = a.beardColor || hc, bd = a.beard;
    if (bd && bd !== 'none') {
      if (bd === 'stubble') add(head, 'dome:0.5', shade(skin, -0.14), 0, -0.8, 0.3, 6.95, 6.7, 6.95, Math.PI);
      if (bd === 'sideburns') for (const s of [-1, 1]) add(head, 'box', bc, s * 6.3, -2.2, 1.8, 1.1, 4.2, 2.4);
      if (bd === 'full' || bd === 'braided' || !['stubble', 'sideburns', 'mustache', 'goatee'].includes(bd)) add(head, 'sph', bc, 0, -3.8, 3.4, 5.6, 4.4, 4.1);
      if (bd === 'goatee') add(head, 'cone', bc, 0, -3.8, 5.6, 1.6, 3.4, 1.2, Math.PI);
      if (bd !== 'stubble' && bd !== 'sideburns') add(head, 'box', bc, 0, -2.5, 6.6, 4, 1, 0.9);
      if (bd === 'braided') add(head, 'cap:1', bc, 0, -8.6, 5.2, 1.3, 2, 1.3);
    }
    // horns
    const hn = a.horns, hcol = a.hornColor;
    if (hn && hn !== 'none') for (const s of hn === 'unicorn' ? [0] : [-1, 1]) {
      if (hn === 'nubs') add(head, 'cone', hcol, s * 3.4, 5.4, 1.4, 1.3, 2.6, 1.3, 0.2, 0, -s * 0.3);
      else if (hn === 'demon') add(head, 'cone', hcol, s * 3.6, 5, 1.2, 1.5, 7.5, 1.5, -0.45, 0, -s * 0.35);
      else if (hn === 'dragon') add(head, 'cone', hcol, s * 3.8, 4.8, 0, 1.6, 9.5, 1.6, -1.05, 0, -s * 0.25);
      else if (hn === 'ram') { add(head, 'sph', hcol, s * 6.4, 3.2, -0.6, 2.3); add(head, 'sph', shade(hcol, -0.1), s * 8, 0.6, 1, 1.9); add(head, 'sph', hcol, s * 7.4, -2, 2.6, 1.4); }
      else if (hn === 'antlers') { add(head, 'cyl', hcol, s * 3.6, 5, 0, 0.7, 7.5, 0.7, 0, 0, -s * 0.45); add(head, 'cyl', hcol, s * 5.6, 8.2, 0, 0.55, 4.2, 0.55, 0, 0, -s * 1.1); add(head, 'cyl', hcol, s * 5.2, 9.2, 0, 0.55, 3.5, 0.55, 0.3, 0, s * 0.2); }
      else if (hn === 'unicorn') add(head, 'cone', hcol, 0, 5.3, 4.2, 1.35, 7.5, 1.35, 0.55);
    }
    // accessories
    const ac = a.accColor || '#d8b040', acc = a.accessory;
    if (acc === 'earrings') for (const s of [-1, 1]) add(head, 'sph', ac, s * 7, -3.2, 0.4, 0.75);
    if (acc === 'glasses' || acc === 'monocle') for (const s of acc === 'monocle' ? [1] : [-1, 1]) add(head, 'ring', '#202020', s * 2.5, -0.5, 7.25, 1.9, 1.9, 1.9, Math.PI / 2);
    if (acc === 'flower') { add(head, 'sph', '#ff80c0', 5, 4.2, 3, 1.8); add(head, 'sph', '#ffe060', 5.4, 4.4, 4.4, 0.7); }
    if (acc === 'headband') add(head, 'ring', ac, 0, 3, 0, 7.25, 12, 7.25);
    if (acc === 'necklace') add(body, 'ring', ac, 0, hipY + 11, 0.6, 4.2, 4, 3.6, 0.35);
    // helmets
    if (hm) {
      const c = hm.color, tr = hm.trim || shade(c, -0.25), st = hm.style;
      if (st === 'hood') { add(head, 'dome:0.64', c, 0, 0.4, -0.6, 8.2, 8.5, 8.3, -0.45); add(head, 'cap:1', c, 0, -4.6, -4.2, 6.6, 3, 3.4); }
      else if (st === 'wizard') { add(head, 'dome:0.5', c, 0, 1, -0.2, 7.5, 6.5, 7.5, -0.15); add(head, 'cyl', shade(c, -0.1), 0, 4, 0, 11.5, 0.9, 11.5, -0.12); add(head, 'cone', c, 0, 4.6, -0.8, 6.8, 15, 6.8, -0.3); add(head, 'ring', tr, 0, 5.4, -0.2, 6.6, 7, 6.6, -0.12); if (hm.glow) add(head, 'sph', mat(hm.glow, true), 0, 17, -5.5, 1.4); }
      else if (st === 'cap') { add(head, 'dome:0.5', c, 0, 0.8, 0, 7.7, 7.2, 7.7, -0.2); add(head, 'box', shade(c, -0.15), 0, 2.6, 7.2, 8.5, 0.6, 5, 0.18); }
      else if (st === 'bandana') { add(head, 'ring', c, 0, 3.2, 0, 7.3, 14, 7.3, -0.2); add(head, 'cap:1', c, 1.5, 1, -8, 1, 1.5, 0.8, 0.5, 0, 0.3); }
      else if (st === 'circlet') { add(head, 'ring', c, 0, 3.4, 0, 7.35, 6, 7.35, -0.2); add(head, 'sph', mat(hm.accent || hm.glow || '#40c0ff', !!hm.glow), 0, 3.9, 7.4, 1.1); }
      else if (st === 'crown') { add(head, 'cyl', c, 0, 3.5, 0, 6.8, 3.6, 6.8); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; add(head, 'cone', c, Math.sin(an) * 6.3, 7, Math.cos(an) * 6.3, 1.2, 2.8, 1.2); } add(head, 'sph', mat(hm.accent || '#e03040'), 0, 5.2, 6.9, 1.1); }
      else if (st === 'full' || st === 'knight') {
        add(head, 'sph', c, 0, 0.4, 0, 8.1, 8.2, 8.1); add(head, 'box', '#141018', 0, -0.4, 7.4, 7.2, 1.2, 1.6);
        if (st === 'knight') add(head, 'box', tr, 0, 8, -0.5, 1.4, 3.5, 11); else add(head, 'ring', tr, 0, 1.8, 0, 8.05, 5, 8.05);
      }
      else if (st === 'skull') { add(head, 'dome:0.62', c, 0, 0.5, 0, 7.9, 8, 7.9, -0.3); for (const s of [-1, 1]) add(head, 'sph', '#140c1c', s * 2.8, 3.2, 6.6, 1.3, 1.1, 0.6); }
      else if (st === 'horned' || st === 'dragon') {
        add(head, 'dome:0.56', c, 0, 0.6, 0, 7.9, 8, 7.9, -0.25);
        if (st === 'horned') for (const s of [-1, 1]) add(head, 'cone', hm.trim || '#e8e0c8', s * 6.8, 3.5, 0, 1.7, 7, 1.7, 0, 0, -s * 0.9);
        else for (let i = 0; i < 4; i++) add(head, 'cone', tr, 0, 7.4 - i * 1.4, -1 - i * 2.4, 1.1, 3.4 - i * 0.5, 1.1, -0.6 - i * 0.3);
      }
      else add(head, 'dome:0.56', c, 0, 0.6, 0, 7.9, 7.9, 7.9, -0.25);
    }
    // arms
    const sleeve = robe ? shirt : shade(shirt, -0.08);
    const arm = (s) => {
      const A = grp(body, s * (5.3 * wide + 1.3), hipY + 9.3, 0);
      add(A, 'cap:1', sleeve, 0, -3.3, 0, 1.85, 7 / 3, 1.85);
      if (plate || (ch && ch.style === 'chain')) add(A, 'sph', shade(shirt, plate ? 0.22 : 0.1), 0, 0, 0, 2.9, 2.5, 2.9);
      const hand = grp(A, 0, -7.4, 0.3);
      add(hand, 'sph', gloves, 0, 0, 0, 1.95);
      return { A, hand };
    };
    const L = arm(-1), Rr = arm(1);
    rig.armL = L.A; rig.armR = Rr.A; rig.handR = Rr.hand;
    rig.armL0 = L.A.position.clone(); rig.armR0 = Rr.A.position.clone();
    // cape
    if (cp) {
      const C = rig.cape = grp(body, 0, hipY + 10.5, -3.6);
      const len = hipY + 8;
      add(C, 'box', cp.color, 0, -len / 2, 0, 10.5 * wide, len, 0.8);
      add(C, 'box', cp.trim || shade(cp.color, -0.3), 0, -len + 0.6, 0.05, 10.6 * wide, 1.3, 0.9);
      add(C, 'cap:1', shade(cp.color, 0.1), 0, 0.3, 1.2, 6 * wide, 0.5, 2.2, 0, 0, Math.PI / 2);
    }
    // shield on the left arm
    if (oh) {
      const sg = grp(L.hand, -1.2, 1.5, 1);
      add(sg, 'cyl', oh.color, 0, 0, 0, 5.2, 1.2, 5.6, 0, 0, Math.PI / 2);
      add(sg, 'ring', oh.trim || shade(oh.color, 0.3), -1.25, 0, 0, 5.2, 4, 5.6, 0, 0, Math.PI / 2);
      add(sg, 'sph', oh.accent || oh.trim || '#c8a040', -1.4, 0, 0, 1.5, 1.5, 1.5);
      if (oh.glow) add(sg, 'sph', mat(oh.glow, true), -2, 0, 0, 0.9);
    }
    // weapon: the item's own art on two crossed cards, held in the right hand
    if (wl && R.Weapons && R.Weapons.sprite) {
      const wm = new T.MeshLambertMaterial({ map: util.tex(util.smooth(R.Weapons.sprite(wl)), false, true), alphaTest: 0.4, side: T.DoubleSide });
      rig.mats.push(wm);
      const W = rig.weapon = grp(Rr.hand, 0, 0, 0);
      const k = 0.78;
      const p1 = new T.Mesh(geo('wpn'), wm); p1.rotation.y = -Math.PI / 2; p1.scale.set(k, k, k); p1.castShadow = true; W.add(p1);
      const hold = new T.Group(); hold.rotation.z = Math.PI / 2; W.add(hold); // second card turned 90 degrees around the blade
      const p2 = new T.Mesh(geo('wpn'), wm); p2.rotation.y = -Math.PI / 2; p2.scale.set(k, k, k); hold.add(p2);
    }
    // the mount rides along under the figure
    if (mountId && R.HD2DBeasts) { const mr = R.HD2DBeasts.buildMount(mountId, kit(rig)); if (mr) { rig.yawG.add(mr.g); rig.mount = mr; } }
    for (const m of rig.mats) { m.transparent = false; m.userData.base = m.color.clone(); }
    return rig;
  }

  // ---- who is a person ---------------------------------------------------------------------
  function lookOf(e) {
    if (e instanceof R.Player) { const w = e.weapon(); return { a: e.appearance, g: e.gear(), w: w ? w.look : null, wt: w ? w.type : null, mt: e.riding ? e.mount : null }; }
    if (R.RemotePlayer && e instanceof R.RemotePlayer) { const L = e.peer.look; return L ? { a: L.a, g: L.g || {}, w: L.w, wt: L.wt, mt: e.peer.s && e.peer.s.mo ? L.mt : null } : null; }
    if (R.NPC && e instanceof R.NPC && e.def && e.def.appearance && !e.def.drawSprite) return { a: e.def.appearance, g: e.def.gear || {}, w: e.def.weapon || null, wt: e.def.weapon ? e.def.weapon.type : null };
    return null;
  }
  CH.wants = function (e) {
    if (!T) T = window.THREE;
    if (!T || !T.CapsuleGeometry) return false;
    return !!lookOf(e);
  };

  const rigs = new Map();
  const gk = (o) => (o ? [o.style, o.color, o.trim, o.glow || '', o.accent || ''].join(',') : '-');
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const DIRA = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 };

  CH.draw = function (e, scene, util, now) {
    const L = lookOf(e); if (!L) return;
    const a = R.Character.norm(L.a), g = L.g || {};
    const key = R.Character.appearanceKey(a) + '|' + gk(g.head) + gk(g.chest) + gk(g.legs) + gk(g.feet) + gk(g.hands) + gk(g.cape) + gk(g.offhand) + '|' + (L.w ? JSON.stringify(L.w) : '') + '|' + (L.mt || '');
    let rig = rigs.get(e);
    if (!rig || rig.key !== key) {
      if (rig) CH.remove(e, scene);
      rig = build(a, g, L.w, util, L.mt && R.Companions && R.Companions.MOUNTS[L.mt] ? L.mt : null); rig.key = key; rig.yaw = null; rig.t = now;
      rig.shadow = util.shadowMesh(); scene.add(rig.root); rigs.set(e, rig);
    }
    const dt = Math.min(0.1, Math.max(0, (now - rig.t) / 1000)); rig.t = now;
    pose(rig, e, L, dt);
    rig.root.position.x = e.x; rig.root.position.z = e.y;
    const big = rig.mount ? 1.7 : 1, air = rig.air ? 0.6 : 1;
    rig.shadow.scale.set(30 * big * air, 19 * big * air, 1); rig.shadow.position.set(e.x, 0.4, e.y + 1); rig.shadow.visible = !e.dead;
  };

  function pose(rig, e, L, dt) {
    const t = e.animT || 0, anim = e.anim || 'idle', pl = e instanceof R.Player, rem = !pl && R.RemotePlayer && e instanceof R.RemotePlayer;
    const wt = (L.wt && R.WeaponTypes[L.wt]) || null, kind = wt ? wt.kind : null;
    const moving = anim === 'walk' || anim === 'run', run = anim === 'run';
    // attack progress 0..1 (or -1)
    let atk = -1, atkA = e.aim || 0, combo = e.combo || 0;
    if (pl && e.atkT > 0 && e.atkDur) { atk = 1 - e.atkT / e.atkDur; atkA = e.atkAngle != null ? e.atkAngle : e.aim; }
    if (rem && e.peer.s && e.peer.s.at >= 0) { atk = e.peer.s.at; atkA = e.peer.s.aa; combo = e.peer.s.cb || 0; }
    // facing
    let ang = DIRA[e.dir] != null ? DIRA[e.dir] : Math.PI / 2;
    if (atk >= 0 || (pl && e.castT > 0)) ang = atkA;
    else if (Math.hypot(e.vx || 0, e.vy || 0) > 12) ang = Math.atan2(e.vy, e.vx);
    const yaw = Math.atan2(Math.cos(ang), Math.sin(ang));
    if (rig.yaw == null) rig.yaw = yaw;
    rig.yaw += angDiff(rig.yaw, yaw) * Math.min(1, dt * 16);
    rig.yawG.rotation.y = rig.yaw;
    // base pose
    const ph = moving ? t * (run ? 14 : 10) : 0, sw = moving ? (run ? 0.9 : 0.62) : 0, s1 = Math.sin(ph);
    rig.legs[0].rotation.x = -s1 * sw; rig.legs[1].rotation.x = s1 * sw;
    rig.armL.rotation.set(s1 * sw * 0.8, 0, -0.14); rig.armR.rotation.set(-s1 * sw * 0.8, 0, 0.14);
    rig.armL.position.copy(rig.armL0); rig.armR.position.copy(rig.armR0);
    rig.body.position.y = -(rig.hipY + 6) + (moving ? Math.abs(Math.sin(ph)) * 1.2 : Math.sin(t * 2.2) * 0.3);
    rig.body.rotation.set(run ? 0.14 : 0, 0, 0);
    rig.spin.rotation.set(0, 0, 0); rig.yawG.scale.set(1, 1, 1); if (!rig.mount) rig.yawG.position.y = 0;
    if (rig.head) rig.head.rotation.set(0, 0, moving ? 0 : Math.sin(t * 0.9) * 0.04);
    if (rig.cape) rig.cape.rotation.x = -(0.08 + (moving ? (run ? 0.55 : 0.3) + Math.sin(ph * 2) * 0.06 : Math.sin(t * 1.5) * 0.03));
    // in the saddle
    rig.air = false;
    if (rig.mount) {
      const mr = rig.mount, mv = Math.hypot(e.vx || 0, e.vy || 0) > 10;
      rig.air = !!(mr.fly && (pl ? e.air : true));
      rig.spin.position.y = rig.hipY + 6 + (mr.seat - rig.hipY + 0.3);
      rig.legs[0].rotation.set(-1.2, 0, -0.55); rig.legs[1].rotation.set(-1.2, 0, 0.55);
      rig.armL.rotation.set(-0.85, 0, -0.1); rig.armR.rotation.set(-0.85, 0, 0.1);
      rig.body.position.y = -(rig.hipY + 6); rig.body.rotation.set(mv ? 0.12 : 0, 0, 0);
      rig.yawG.position.y = rig.air ? 12 + Math.sin(t * 3) * 2 : 0;
      R.HD2DBeasts.animate(mr, mv ? 1 : 0, t, rig.air);
      const md = mr.def;
      if (md.flame && mv && Math.random() < 0.5) R.FX.particle({ x: e.x + U.rand(-6, 6), y: e.y - U.rand(0, 8), vy: -20, life: 0.4, color: U.choose(['#ff6020', '#ffd040']), glow: true, size: 2 });
      if (md.stars && Math.random() < 0.3) R.FX.particle({ x: e.x + U.rand(-12, 12), y: e.y - U.rand(4, 20), life: 0.5, color: '#e0c0ff', glow: true, size: 1 });
    } else rig.spin.position.y = rig.hipY + 6;
    // weapon rest: blade up and forward (staves upright, bows level)
    const W = rig.weapon;
    if (W) W.rotation.set(kind === 'magic' ? -1.15 : kind === 'ranged' ? 0.2 : -0.62, 0, 0);
    if (W && !rig.mount) rig.armR.rotation.x = kind === 'magic' ? -0.3 : -0.4 - s1 * sw * 0.3;
    // actions
    if (atk >= 0) {
      const ez = 1 - Math.pow(1 - Math.min(1, atk * 1.25), 3), sgn = combo % 2 === 0 ? 1 : -1;
      if (kind === 'melee' || !kind) {
        rig.armR.rotation.x = -2.9 + 2.3 * ez; rig.armR.rotation.z = 0.14 + sgn * (0.7 - 1.3 * ez);
        if (W) W.rotation.x = 0.9;
        rig.body.rotation.y = sgn * (0.5 - 1.0 * ez); rig.body.rotation.x = 0.1 + 0.15 * ez;
      } else if (kind === 'thrust') {
        rig.armR.rotation.x = -1.55; rig.armR.position.z += Math.sin(Math.min(1, atk * 1.4) * Math.PI) * 5;
        if (W) W.rotation.x = 1.55; rig.body.rotation.x = 0.15;
      } else if (kind === 'ranged') {
        rig.armL.rotation.x = -1.5; rig.armR.rotation.x = -1.45 + Math.sin(atk * Math.PI) * 0.25; if (W) W.rotation.x = 1.45;
      } else if (kind === 'magic') {
        rig.armR.rotation.x = -0.3 - Math.sin(atk * Math.PI) * 1.4; rig.armL.rotation.x = -Math.sin(atk * Math.PI) * 0.8;
      }
    }
    if ((pl && e.castT > 0) || anim === 'cast') { rig.armL.rotation.set(-2.7, 0, -0.35); rig.armR.rotation.set(-2.7, 0, 0.35); if (W) W.rotation.x = -0.2; }
    if (anim === 'hurt') rig.body.rotation.x = -0.28;
    if (pl && e.rollT > 0) { const p = 1 - e.rollT / 0.32; rig.spin.rotation.x = p * TAU; rig.yawG.position.y = Math.sin(p * Math.PI) * 5; rig.legs[0].rotation.x = rig.legs[1].rotation.x = -1.2; }
    if (rem && e.peer.s && e.peer.s.r) { rig.spin.rotation.x = (e.spin || 0); }
    if (e.dead) { const k = Math.min(1, (e.deadT || 0) / 0.4); rig.spin.rotation.z = k * Math.PI / 2; rig.yawG.position.y = -k * (rig.hipY + 1); }
    // squash & stretch from the game (landing, hits)
    if (pl && e.squashScale) { const [sx, sy] = e.squashScale(); rig.yawG.scale.set(sx, sy, sx); }
    // blink
    const bl = (t % 3.7) < 0.12 || anim === 'hurt' || e.dead;
    for (const eg of rig.eyes) eg.scale.y = bl ? 0.12 : 1;
    // hit flash + see-through (blinking while invulnerable, stealth)
    const flash = e.flash > 0;
    let alpha = e.alpha != null ? e.alpha : 1;
    if (pl && e.invuln > 0 && !(e.rollT > 0) && Math.floor(e.invuln * 20) % 2 === 0) alpha = Math.min(alpha, 0.5);
    if (flash !== rig.flash || alpha !== rig.alpha) {
      for (const m of rig.mats) {
        if (m.userData.base) m.color.copy(m.userData.base);
        if (flash) m.color.lerp(new T.Color(1, 1, 1), 0.75);
        const tr = alpha < 1; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = alpha;
      }
      rig.flash = flash; rig.alpha = alpha;
    }
    rig.root.visible = alpha > 0.02;
  }

  CH.remove = function (e, scene) {
    const rig = rigs.get(e); if (!rig) return;
    scene.remove(rig.root); scene.remove(rig.shadow); rig.shadow.material.dispose();
    for (const m of rig.mats) m.dispose();
    rigs.delete(e);
  };
  CH.sweep = function (seen, scene) { for (const e of [...rigs.keys()]) if (!seen.has(e) || !CH.wants(e)) CH.remove(e, scene); };
  CH.clear = function (scene) { for (const e of [...rigs.keys()]) CH.remove(e, scene); };
  CH.has = (e) => rigs.has(e);
  // a shield bubble drawn over 3D people (the 2D sprite drew it itself)
  CH.overlay = function (ctx, e) {
    if (!(e.shield > 0) || !rigs.has(e)) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = U.rgba('#ffe080', 0.5 + 0.2 * Math.sin(performance.now() / 100)); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(e.x, e.y - 12, 13, 16, 0, 0, TAU); ctx.stroke(); ctx.restore();
  };
})(window.RPG);
