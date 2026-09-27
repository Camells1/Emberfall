'use strict';
// HD-2D people: you, your friends and every villager are 3D figures built from the same appearance +
// gear data as the 2D sprites (skin, face, hair style, eyes, ears, horns, beard, armour, helmet, cape,
// shield, weapon) and animated from the same state (walk, run, attack, cast, roll, ride, die).
// Proportions are stylised-realistic (about 4 heads tall) with shaped heads, bending knees and elbows,
// proper hands and shoes, and real 3D weapons. Classic 2D mode is untouched.
(function (R) {
  const U = R.U;
  const CH = R.HD2DChars = {};
  let T = null;
  const TAU = Math.PI * 2, PI = Math.PI, SCALE = 1.52, TILT = 0.38; // figure size; lean back toward the camera so faces read

  // ---- shared shapes -----------------------------------------------------------------------
  const G3 = {};
  const lathe = (pts, seg) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg || 28);
  function geo(k) {
    if (G3[k]) return G3[k];
    const i = k.indexOf(':'), name = i < 0 ? k : k.slice(0, i), n = i < 0 ? 0 : +k.slice(i + 1);
    let g;
    switch (name) {
      case 'sph': g = new T.SphereGeometry(1, 20, 14); break;
      case 'sphS': g = new T.SphereGeometry(1, 10, 7); break;
      case 'dome': g = new T.SphereGeometry(1, 26, 12, 0, TAU, 0, PI * n); break;
      case 'cap': g = new T.CapsuleGeometry(1, n, 6, 16); break; // radius 1, straight part n (height n + 2)
      case 'cone': g = new T.ConeGeometry(1, 1, 16).translate(0, 0.5, 0); break;
      case 'cyl': g = new T.CylinderGeometry(1, 1, 1, 20).translate(0, 0.5, 0); break;
      case 'flare': g = new T.CylinderGeometry(0.62, 1, 1, 24).translate(0, 0.5, 0); break;
      case 'box': g = new T.BoxGeometry(1, 1, 1); break;
      case 'rbox': g = new T.CapsuleGeometry(0.5, 0.2, 3, 8); break;
      case 'taperx': g = new T.CylinderGeometry(0.72, 1, 1, 14).translate(0, 0.5, 0); break;
      case 'halfcyl': g = new T.CylinderGeometry(1, 1, 1, 18, 1, false, 0, PI); break;
      case 'rockish': g = new T.DodecahedronGeometry(1, 0); break;
      case 'ring': g = new T.TorusGeometry(1, 0.14, 10, 32).rotateX(PI / 2); break;
      // head: rounded skull, cheeks and a narrower chin (front is +z)
      case 'head': g = lathe([[0, -5.0], [1.7, -4.75], [3.0, -3.9], [3.9, -2.6], [4.35, -1.0], [4.55, 0.7], [4.45, 2.3], [3.95, 3.7], [2.95, 4.75], [1.5, 5.3], [0, 5.45]]); g.scale(1, 1, 1.04); break;
      // torso from hips (0) to neck (10.6): waist, chest, shoulders
      case 'torso': g = lathe([[0, -0.2], [3.0, 0], [3.25, 1.4], [3.1, 3.0], [3.45, 5.0], [4.05, 7.0], [4.45, 8.5], [3.95, 9.6], [2.3, 10.3], [1.4, 10.6], [0, 10.7]]); break;
      case 'skirt': g = lathe([[0, -11.2], [5.5, -11.2], [5.4, -10.5], [4.9, -8], [4.2, -5], [3.5, -2], [3.25, 0]]); break;
      case 'shoe': g = lathe([[0, -1], [1.05, -0.95], [1.35, -0.4], [1.3, 0.3], [0.9, 0.9], [0, 1.05]], 16); break;
      case 'blade': { const s = new T.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 0.86); s.lineTo(0, 1); s.lineTo(-0.5, 0.86); s.closePath(); g = new T.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 }).translate(0, 0, -0.09); break; }
      case 'axehead': { const s = new T.Shape(); s.moveTo(0, -0.35); s.quadraticCurveTo(0.9, -0.7, 1.05, 0); s.quadraticCurveTo(0.9, 0.7, 0, 0.35); s.closePath(); g = new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 }).translate(0, 0, -0.08); break; }
      // tapered limbs (y -1..1, wide end on top): thigh / upper arm, and a calf / forearm with a bulge
      case 'limb': g = lathe([[0, -1], [0.55, -0.97], [0.72, -0.85], [0.78, -0.5], [0.88, 0], [1, 0.55], [0.95, 0.85], [0.6, 0.98], [0, 1]], 20); break;
      case 'calf': g = lathe([[0, -1], [0.5, -0.97], [0.62, -0.8], [0.68, -0.4], [0.92, 0.2], [1, 0.5], [0.9, 0.85], [0.55, 0.98], [0, 1]], 20); break;
      case 'arc': g = new T.TorusGeometry(1, 0.07, 6, 24, PI * 0.9).rotateZ(PI * 0.55); break;
    }
    return (G3[k] = g);
  }
  CH.geo = geo;
  CH.weaponMesh = (k, par, L, type) => weapon(k, par, L, type);
  const shade = (c, k) => U.shade(c || '#888888', k);

  // mat(colour, unlit?, metal?) / add(parent, shape, colour, pos xyz, scale xyz, rot xyz) / grp(parent, pos xyz)
  function kit(rig) {
    const mat = (hex, basic, metal) => {
      const k = (basic ? 'b' : metal ? 'm' : '') + (hex || '#888888'); let m = rig.matMap.get(k);
      if (!m) {
        const c = new T.Color(hex || '#888888');
        m = basic ? new T.MeshBasicMaterial({ color: c }) : new T.MeshPhongMaterial({ color: c, shininess: metal ? 70 : 10, specular: metal ? 0x9a9a9a : 0x1a1a1a });
        rig.matMap.set(k, m); rig.mats.push(m);
      }
      return m;
    };
    const add = (par, g, col, x, y, z, sx, sy, sz, rx, ry, rz) => {
      sy = sy == null ? sx : sy; sz = sz == null ? sx : sz;
      if (g === 'sph' && Math.max(sx, sy, sz) < 1.2) g = 'sphS';
      const m = new T.Mesh(geo(g), typeof col === 'string' ? mat(col) : col);
      m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0);
      const big = Math.max(sx, sy, sz) >= 1.4;
      m.castShadow = big; par.add(m); // tiny bits (eyes, buttons) skip the shadow pass
      // ink outline (inverted hull) around the bigger parts, like the outlined pixel art
      if (rig.outline && big && !(m.material.isMeshBasicMaterial)) {
        const o = new T.Mesh(m.geometry, outlineMat(rig)); const t = rig.outline;
        o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.set(sx + t, sy + t * (sy / Math.max(sx, 0.01) > 3 ? 0.4 : 1), sz + t);
        par.add(o);
      }
      return m;
    };
    const grp = (par, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); par.add(g); return g; };
    return { mat, add, grp };
  }
  function outlineMat(rig) {
    if (!rig.outMat) { rig.outMat = new T.MeshBasicMaterial({ color: 0x1a1020, side: T.BackSide }); rig.mats.push(rig.outMat); }
    return rig.outMat;
  }
  CH.kit = kit;
  // ---- baking: merge each group's parts into a few vertex-coloured meshes (cloth / metal / glow /
  // outline) so a figure is ~15 draw calls instead of 100+. Animated groups stay separate.
  const flatGeo = new WeakMap(); // shape -> its non-indexed version (made once)
  const flat = (g) => { let f = flatGeo.get(g); if (!f) { f = g.index ? g.toNonIndexed() : g; flatGeo.set(g, f); } return f; };
  const bakedCache = new Map(); // rig key -> [[group index, kind, geometry, castShadow], ...] shared by identical figures
  const v3 = () => new T.Vector3();
  function bake(rig, key) {
    const mk = new Map();
    const matFor = (kind) => {
      let m = mk.get(kind);
      if (!m) {
        m = kind === 'basic' ? new T.MeshBasicMaterial({ vertexColors: true }) : kind === 'out' ? rig.outMat
          : new T.MeshPhongMaterial({ vertexColors: true, shininess: kind === 'metal' ? 70 : 10, specular: kind === 'metal' ? 0x9a9a9a : 0x1a1a1a });
        mk.set(kind, m);
      }
      return m;
    };
    const groups = []; rig.root.traverse((o) => { if (!o.isMesh) groups.push(o); });
    const cached = key && bakedCache.get(key), made = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const buckets = new Map();
      for (const c of g.children) {
        if (!c.isMesh) continue;
        const m = c.material; if (m.transparent || m.userData.keepAlpha || c.userData.keep) continue;
        const kind = m === rig.outMat ? 'out' : m.isMeshBasicMaterial ? 'basic' : m.shininess > 30 ? 'metal' : 'cloth';
        if (!buckets.has(kind)) buckets.set(kind, []);
        buckets.get(kind).push(c);
      }
      for (const [kind, list] of buckets) {
        if (list.length < 2) continue;
        let cast = false;
        for (const c of list) { cast = cast || c.castShadow; g.remove(c); }
        let bg = null;
        const hit = cached && cached.find((x) => x[0] === gi && x[1] === kind);
        if (hit) bg = hit[2];
        else {
          let n = 0; for (const c of list) n += flat(c.geometry).attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), nm = new T.Matrix3(), p = v3(), q = v3();
          let o = 0;
          for (const c of list) {
            c.updateMatrix(); nm.getNormalMatrix(c.matrix);
            const fg = flat(c.geometry), P = fg.attributes.position.array, N = fg.attributes.normal.array, cnt = fg.attributes.position.count, cc = c.material.color, e = c.matrix.elements, ne = nm.elements;
            for (let i = 0; i < cnt; i++) {
              const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], j = (o + i) * 3;
              pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
              const a = N[i * 3], b = N[i * 3 + 1], c2 = N[i * 3 + 2];
              let nx = ne[0] * a + ne[3] * b + ne[6] * c2, ny = ne[1] * a + ne[4] * b + ne[7] * c2, nz = ne[2] * a + ne[5] * b + ne[8] * c2; const l = Math.hypot(nx, ny, nz) || 1;
              nor[j] = nx / l; nor[j + 1] = ny / l; nor[j + 2] = nz / l;
              col[j] = cc.r; col[j + 1] = cc.g; col[j + 2] = cc.b;
            }
            o += cnt;
          }
          bg = new T.BufferGeometry();
          bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.BufferAttribute(nor, 3)); bg.setAttribute('color', new T.BufferAttribute(col, 3));
          bg.computeBoundingSphere();
          made.push([gi, kind, bg]);
        }
        const mesh = new T.Mesh(bg, matFor(kind)); mesh.castShadow = cast && kind !== 'out'; mesh.frustumCulled = false; g.add(mesh);
      }
    }
    if (key && !cached) bakedCache.set(key, made);
    if (!key) rig.geos = made.map((x) => x[2]); // unshared: freed with the rig
    // the rig's materials are now whatever its meshes use
    const used = new Set(); rig.root.traverse((o) => { if (o.isMesh) used.add(o.material); });
    for (const m of rig.mats) if (!used.has(m) && m !== rig.outMat) m.dispose();
    rig.mats = [...used];
    for (const m of rig.mats) { if (!m.userData.keepAlpha) m.transparent = false; m.userData.base = m.color.clone(); }
    return rig;
  }
  CH.bake = bake;
  CH.dispose = (rig) => { for (const m of rig.mats) m.dispose(); for (const g of rig.geos || []) g.dispose(); };

  CH.newRig = () => { if (!T) T = window.THREE; return { root: new T.Group(), mats: [], matMap: new Map(), eyes: [] }; };
  CH.SCALE = SCALE; CH.TILT = TILT;

  // ---- weapons (built along +z from the grip in the hand) ------------------------------------
  function weapon(k, par, L, type) {
    const W = k.grp(par, 0, 0, 0), bl = L.blade || '#d0d8e0', hn = L.handle || '#6b4a2b', gd = L.guard || '#c8a040';
    const metal = (c) => k.mat(c, false, true);
    const glow = L.glow || L.gem;
    const grip = (len) => { k.add(W, 'cyl', hn, 0, 0, -1.5, 0.55, len, 0.55, PI / 2); k.add(W, 'sph', metal(gd), 0, 0, -1.8, 0.75); };
    switch (type) {
      case 'greatsword': grip(4.6); k.add(W, 'box', metal(gd), 0, 0, 3.1, 5, 0.9, 0.9); k.add(W, 'blade', metal(bl), 0, 0, 3.4, 2.1, 20, 1, PI / 2); break;
      case 'dagger': grip(3); k.add(W, 'box', metal(gd), 0, 0, 1.6, 2.4, 0.6, 0.6); k.add(W, 'blade', metal(bl), 0, 0, 1.8, 1.3, 6.5, 1, PI / 2); break;
      case 'axe': k.add(W, 'cyl', hn, 0, 0, -2, 0.6, 14, 0.6, PI / 2); k.add(W, 'axehead', metal(bl), 0.3, 0, 10.5, 4.6, 5, 4, PI / 2, 0, 0); break;
      case 'hammer': k.add(W, 'cyl', hn, 0, 0, -2, 0.65, 16, 0.65, PI / 2); k.add(W, 'box', metal(bl), 0, 0, 13, 5.5, 3.4, 3.4); k.add(W, 'box', metal(gd), 0, 0, 13, 5.8, 1, 3.6); break;
      case 'mace': k.add(W, 'cyl', hn, 0, 0, -2, 0.6, 10, 0.6, PI / 2); k.add(W, 'sph', metal(bl), 0, 0, 9, 2.1); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(W, 'cone', metal(bl), Math.cos(a) * 1.7, Math.sin(a) * 1.7, 9, 0.6, 1.6, 0.6, 0, 0, a - PI / 2); } break;
      case 'spear': k.add(W, 'cyl', hn, 0, 0, -6, 0.5, 22, 0.5, PI / 2); k.add(W, 'blade', metal(bl), 0, 0, 16, 1.6, 5.5, 1, PI / 2); k.add(W, 'ring', metal(gd), 0, 0, 15.8, 0.8, 3, 0.8, PI / 2); break;
      case 'bow': case 'crossbow': {
        const a = k.add(W, 'arc', hn, 0, 0, 0, 1, 9, 9, 0, PI / 2, 0); a.castShadow = true;
        k.add(W, 'cyl', '#e8e0d0', 0, -8.2, -1.2, 0.12, 16.4, 0.12);
        if (type === 'crossbow') k.add(W, 'box', hn, 0, 0, 2, 1.2, 1.2, 9);
        break;
      }
      case 'staff': k.add(W, 'cyl', hn, 0, 0, -8, 0.6, 26, 0.6, PI / 2); k.add(W, 'ring', metal(L.blade || gd), 0, 0, 17.6, 1.6, 6, 1.6, PI / 2); k.add(W, 'sph', k.mat(glow || '#6fd8ff', true), 0, 0, 18.6, 1.5); break;
      case 'wand': k.add(W, 'cyl', hn, 0, 0, -1.5, 0.4, 9, 0.4, PI / 2); k.add(W, 'sph', k.mat(glow || '#ff60c0', true), 0, 0, 7.8, 0.9); break;
      default: grip(3); k.add(W, 'box', metal(gd), 0, 0, 1.8, 3.8, 0.7, 0.7); k.add(W, 'blade', metal(bl), 0, 0, 2, 1.5, 13, 1, PI / 2); // sword
    }
    if (L.glow && type !== 'staff' && type !== 'wand') k.add(W, 'sph', k.mat(L.glow, true), 0, 0, 1.6, 0.5);
    return W;
  }

  // ---- building one figure ------------------------------------------------------------------
  const HIDE_HAIR = { full: 1, knight: 1, hood: 1, skull: 1, dragon: 1, horned: 1, leather: 1, cap: 1, wizard: 1 };
  function build(bkey, a, gear, wl, wtype, util, mountId) {
    const rig = CH.newRig(); rig.outline = 0.32;
    const K = kit(rig), { mat, add, grp } = K;

    const b = a.body, wide = b === 'c' ? 1.14 : b === 'b' ? 0.9 : 1, leg = b === 'd' ? 6.8 : b === 'c' ? 5.5 : 6.1;
    const skin = a.skin, ch = gear.chest, lg = gear.legs, ft = gear.feet, hd = gear.hands, hm = gear.head, cp = gear.cape, oh = gear.offhand;
    const shirt = ch ? ch.color : a.outfit, trim = (ch && ch.trim) || a.outfit2 || '#d8c8a0';
    const pants = lg ? lg.color : shade(a.outfit2 || '#8a7a6a', -0.5), boots = ft ? ft.color : '#4a3020', gloves = hd ? hd.color : null;
    const robe = !!ch && (ch.style === 'robe' || ch.style === 'mage'), plate = !!ch && ch.style === 'plate', chain = !!ch && ch.style === 'chain';
    const hipY = leg * 2 + 1.1, HR = 4.6;
    rig.hipY = hipY;
    rig.root.rotation.x = -TILT; rig.root.scale.setScalar(SCALE);
    rig.yawG = grp(rig.root, 0, 0, 0);
    rig.spin = grp(rig.yawG, 0, hipY + 6, 0);
    const body = rig.body = grp(rig.spin, 0, -(hipY + 6), 0);
    const metal = (c) => mat(c, false, true);

    // legs: thigh -> knee -> shin -> shoe
    rig.knees = [];
    rig.legs = [-1, 1].map((s) => {
      const Lg = grp(body, s * 1.75 * wide, hipY, 0);
      add(Lg, 'limb', pants, 0, -leg / 2, 0, 1.75 * wide, leg / 2 + 0.3, 1.8);
      const kn = grp(Lg, 0, -leg, 0); rig.knees.push(kn);
      add(kn, 'sph', pants, 0, 0, 0, 1.3 * wide);
      add(kn, 'calf', pants, 0, -leg / 2, -0.1, 1.42 * wide, leg / 2 + 0.2, 1.45);
      if (lg && lg.style === 'plate') { add(kn, 'sph', metal(shade(pants, 0.25)), 0, 0, 0.9, 1.3, 1.1, 1); add(kn, 'cap:1', metal(shade(pants, 0.15)), 0, -leg / 2, 0.4, 1.45, leg / 3.4, 1.35); }
      if (ft) add(kn, 'cyl', boots, 0, -leg + 0.4, 0, 1.5 * wide, leg * 0.45, 1.55);
      add(kn, 'shoe', boots, 0, -leg - 0.15, 0.75, 1.18 * wide, 0.95, 1.8);
      return Lg;
    });
    // hips + torso
    add(body, 'sph', pants, 0, hipY + 0.4, 0, 3.35 * wide, 2.3, 2.55);
    add(body, 'torso', shirt, 0, hipY, 0, wide, 1, 0.74);
    if (!robe) add(body, 'flare', shade(shirt, -0.05), 0, hipY - 1.3, 0, 3.55 * wide, 2.4, 2.75);
    if (robe) {
      add(body, 'skirt', shirt, 0, hipY + 1, 0, wide, 1.02 * (hipY + 0.2) / 11.2, 0.82);
      add(body, 'ring', trim, 0, 1.05, 0, 5.5 * wide, 4, 4.55);
      if (ch.style === 'mage') { add(body, 'box', trim, 0, hipY + 5, 3.05, 1.3, 9.5, 0.4); add(body, 'box', trim, 0, hipY - 5, 4.1, 1.3, 9.5, 0.4, -0.1); }
    }
    if (plate) { add(body, 'torso', metal(shade(shirt, 0.18)), 0, hipY + 2.6, 0.15, 0.97 * wide, 0.72, 0.8); if (ch.trim) add(body, 'box', metal(ch.trim), 0, hipY + 7, 3.55, 0.9, 5.5, 0.4); }
    if (chain) add(body, 'torso', shade(shirt, 0.2), 0, hipY + 1.2, 0.05, 1.02 * wide, 0.8, 0.77);
    if (ch && ch.style === 'tunic') { add(body, 'box', trim, -0.9, hipY + 8.2, 3.25, 0.5, 3.4, 0.35, 0, 0, 0.45); add(body, 'box', trim, 0.9, hipY + 8.2, 3.25, 0.5, 3.4, 0.35, 0, 0, -0.45); }
    if (ch && ch.style === 'leather') { add(body, 'box', shade(shirt, -0.25), 0, hipY + 6, 3.15, 0.6, 7.5, 0.35, 0, 0, 0.55); }
    if (ch && ch.glow) add(body, 'sph', mat(ch.glow, true), 0, hipY + 7.5, 3.3, 0.7);
    if (!robe) { add(body, 'ring', plate ? metal(shade(shirt, -0.3)) : '#3a2418', 0, hipY + 1.2, 0, 3.3 * wide, 9, 2.5); add(body, 'box', metal('#d8b048'), 0, hipY + 1.2, 2.55, 1.3, 1.1, 0.4); add(body, 'rbox', '#5a3a20', 2.6 * wide, hipY + 0.3, 1.2, 1.6, 2, 1.1); }
    add(body, 'ring', trim, 0, hipY + 10.1, 0.1, 2.05, 6, 1.7); // collar
    add(body, 'cyl', skin, 0, hipY + 10, 0, 1.3, 2.1, 1.25); // neck
    // head
    const head = rig.head = grp(body, 0, hipY + 11.4 + 4.9 * 1.1, 0.2); head.scale.setScalar(1.1);
    add(head, 'head', skin, 0, 0, 0, 1, 1, 1);
    const hc = a.hairColor, brow = shade(hc, -0.15);
    add(head, 'sph', shade(skin, -0.07), 0, -0.9, 4.45, 0.55, 0.78, 0.6); // nose
    add(head, 'box', shade(skin, -0.38), 0, -2.45, 4.12, 1.45, 0.24, 0.3); // mouth
    if (a.face === 'blush') for (const s of [-1, 1]) add(head, 'sph', '#ff8a9a', s * 2.5, -1.5, 3.6, 0.9, 0.5, 0.3);
    if (a.face === 'freckles') for (let i = 0; i < 6; i++) add(head, 'sph', shade(skin, -0.3), (i % 3 - 1) * 0.6 + (i < 3 ? -2.2 : 2.2), -0.9 - (i % 2) * 0.4, 4, 0.15);
    if (a.face === 'scar') add(head, 'box', shade(skin, -0.3), 1.9, 0.3, 4.2, 0.25, 2.6, 0.2, 0, 0, 0.3);
    if (a.face === 'warpaint' || a.face === 'tattoo') for (const s of [-1, 1]) add(head, 'box', a.faceColor || '#c03030', s * 2.3, -0.9, 3.95, 1.5, 0.35, 0.25, 0, s * 0.45, 0);
    if (a.face === 'tusks') for (const s of [-1, 1]) add(head, 'cone', '#f0ead8', s * 1, -2.7, 3.9, 0.3, 1.1, 0.3);
    if (a.face === 'scales') for (let i = 0; i < 5; i++) add(head, 'sph', shade(skin, -0.15), (i - 2) * 1.1, 2.4 - Math.abs(i - 2) * 0.4, 4, 0.45, 0.35, 0.2);
    for (const s of [-1, 1]) {
      const eg = grp(head, s * 1.72, 0.15, 3.62);
      const eh = a.eyeStyle === 'narrow' || a.eyeStyle === 'sleepy' ? 0.62 : a.eyeStyle === 'wide' ? 1.12 : 0.98;
      add(eg, 'sph', '#fbfaf6', 0, 0, 0, 1.12, eh, 0.55);
      add(eg, 'sph', a.eyeStyle === 'glow' ? mat(a.eyes, true) : a.eyes, s * -0.05, -0.08, 0.36, 0.7, Math.min(0.8, eh * 0.82), 0.32);
      add(eg, 'sph', '#140c1c', s * -0.05, -0.08, 0.58, a.eyeStyle === 'slit' ? 0.14 : 0.36, Math.min(0.5, eh * 0.52), 0.2);
      add(eg, 'sph', mat('#ffffff', true), 0.22, 0.22, 0.68, 0.17);
      add(eg, 'box', shade(skin, -0.5), 0, eh * 0.78, 0.22, 2.3, 0.28, 0.5, -0.2, 0, s * -0.08); // upper lid line
      if (a.eyeStyle === 'lashes') add(eg, 'box', '#140c1c', 0, 0.72, 0.3, 2, 0.22, 0.25);
      if (a.eyeStyle === 'sleepy') add(eg, 'sph', shade(skin, -0.08), 0, 0.35, 0.22, 1, 0.5, 0.5);
      add(head, 'box', brow, s * 1.75, 1.75, 3.98, 1.7, 0.34, 0.5, -0.15, 0, s * -0.1);
      rig.eyes.push(eg);
    }
    // ears
    const ears = a.ears;
    for (const s of [-1, 1]) {
      if (ears === 'pointed') add(head, 'cone', skin, s * 4.2, -0.2, -0.3, 0.85, 3.2, 0.6, 0, 0, -s * 1.2);
      else if (ears === 'long') add(head, 'cone', skin, s * 4.1, 0, -0.3, 0.9, 6, 0.6, 0, 0, -s * 1.0);
      else if (ears !== 'beast') add(head, 'sph', skin, s * 4.45, -0.4, 0, 0.62, 1.1, 0.5);
    }
    // hair
    const hs = a.hair, hideTop = !!(hm && (HIDE_HAIR[hm.style] || !hm.style));
    if (hs !== 'bald') {
      if (!hideTop) {
        const bob = hs === 'bob' || hs === 'curly';
        if (hs !== 'afro') {
          const hr = hs === 'buzz' ? 4.72 : 4.95;
          add(head, 'dome:0.5', hc, 0, 1.6, -0.1, hr, hs === 'buzz' ? 3.95 : 4.25, hr + 0.05); // crown: covers the whole top, edge just above the brows
          add(head, 'sph', hc, 0, bob ? -0.4 : 0.6, -1.25, hr - 0.1, bob ? 5.1 : 4.8, 4.25); // back of the head (hidden behind the face)
        }
        if (hs !== 'buzz' && hs !== 'mohawk' && hs !== 'sidecut' && hs !== 'afro') {
          for (let f = -2; f <= 2; f++) add(head, 'sph', shade(hc, (f + 2) % 2 ? 0.06 : 0), f * 1.25, 2.35 - Math.abs(f) * 0.3, 4.15 - Math.abs(f) * 0.45, 1.25, 1.55, 0.9, 0.5, f * 0.25, -f * 0.3); // fringe locks over the forehead
          for (let f = 0; f < 5; f++) { const an = (f / 4 - 0.5) * 2.4; add(head, 'sph', shade(hc, (f % 2) * -0.06), Math.sin(an) * 3.6, -1.6, -Math.cos(an) * 3.5 - 0.6, 1.3, 1.9, 1.2); }
          for (const s of [-1, 1]) add(head, 'sph', hc, s * 3.9, 1.3, 1.4, 1.05, 2.3, 1.7, 0, 0, s * 0.12); // sideburn locks
        }
        if (hs === 'spiky' || hs === 'wild') for (let i = 0; i < (hs === 'wild' ? 10 : 8); i++) { const an = i / 8 * PI - PI / 2 + (hs === 'wild' ? Math.sin(i * 7) * 0.4 : 0); add(head, 'cone', hc, Math.sin(an) * 3, 4.8 - Math.abs(Math.sin(an)) * 1.2, -0.6 - Math.cos(an) * 1.6, 1.1, hs === 'wild' ? 3.6 : 3, 1.1, -0.55 - Math.cos(an) * 0.45, 0, -Math.sin(an) * 0.9); }
        if (hs === 'swept') add(head, 'sph', hc, 1.8, 4.1, 2.3, 3.2, 1.6, 2.4, 0, 0, -0.45);
        if (hs === 'mohawk' || hs === 'sidecut') add(head, 'box', hc, 0, 5.5, -0.5, hs === 'mohawk' ? 1.2 : 3.4, 2.8, 8.5, 0.12);
        if (hs === 'curly') for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; add(head, 'sph', shade(hc, (i % 2) * 0.1), Math.cos(an) * 4.4, 2.2 + Math.sin(i * 3) * 1.2, Math.sin(an) * 4.3 - 0.5, 1.6); }
        if (hs === 'afro') add(head, 'sph', hc, 0, 2.6, -2.2, 6.8, 6.5, 6.7);
        if (hs === 'bun') add(head, 'sph', hc, 0, 3, -5, 2.5);
        if (hs === 'topknot') { add(head, 'sph', hc, 0, 6.6, -1, 2.1); add(head, 'ring', '#c03030', 0, 5.4, -0.9, 1.25, 3, 1.25); }
      }
      if (hs === 'long' || hs === 'braids' || hs === 'dreads') {
        add(head, 'cap:1', hc, 0, -3.8, -3.1, 4.3, 3.6, 1.9, 0.08);
        if (hs === 'long') for (const s of [-1, 1]) add(head, 'cap:1', hc, s * 4, -2.6, 0.2, 1.2, 2.7, 1.3);
        if (hs === 'braids') for (const s of [-1, 1]) add(head, 'cap:1', shade(hc, 0.08), s * 2.2, -9, -3.9, 0.95, 2.6, 0.95);
        if (hs === 'dreads') for (let i = 0; i < 7; i++) add(head, 'cap:1', shade(hc, (i % 2) * 0.1), -3.6 + i * 1.2, -8, -3.7 + Math.abs(i - 3) * 0.35, 0.75, 3, 0.75);
      }
      if (hs === 'ponytail') { add(head, 'sph', hc, 0, 1.2, -5.1, 1.3); add(head, 'cap:1', hc, 0, -3.8, -6, 1.45, 2.8, 1.4, 0.25); }
      if (hs === 'pigtails') for (const s of [-1, 1]) add(head, 'cap:1', hc, s * 5.2, -2.3, -1.3, 1.55, 2.8, 1.55, 0, 0, s * 0.25);
    }
    if (ears === 'beast') for (const s of [-1, 1]) { add(head, 'cone', hc, s * 2.9, 4.3, -0.4, 1.6, 3.8, 1.05, 0, 0, -s * 0.35); add(head, 'cone', '#f0a0b0', s * 2.85, 4.5, 0.2, 0.9, 2.6, 0.4, 0, 0, -s * 0.35); }
    // beard
    const bc = a.beardColor || hc, bd = a.beard;
    if (bd && bd !== 'none') {
      if (bd === 'stubble') add(head, 'dome:0.5', shade(skin, -0.14), 0, -0.6, 0.25, 4.62, 4.9, 4.72, PI);
      if (bd === 'sideburns') for (const s of [-1, 1]) add(head, 'box', bc, s * 4.1, -1.6, 1.3, 0.8, 3.2, 1.8);
      if (bd === 'full' || bd === 'braided' || !['stubble', 'sideburns', 'mustache', 'goatee'].includes(bd)) add(head, 'sph', bc, 0, -3.5, 2.9, 3.3, 2.5, 2.3);
      if (bd === 'goatee') add(head, 'cone', bc, 0, -3.4, 3.9, 1.1, 2.4, 0.9, PI);
      if (bd !== 'stubble' && bd !== 'sideburns') { for (const s of [-1, 1]) add(head, 'sph', bc, s * 0.9, -1.85, 4.25, 1.15, 0.45, 0.5, 0, 0, s * 0.3); }
      if (bd === 'braided') add(head, 'cap:1', bc, 0, -7.2, 3.6, 0.9, 1.6, 0.9);
    }
    // horns
    const hn = a.horns, hcol = a.hornColor;
    if (hn && hn !== 'none') for (const s of hn === 'unicorn' ? [0] : [-1, 1]) {
      if (hn === 'nubs') add(head, 'cone', hcol, s * 2.3, 4.4, 1.2, 0.9, 1.8, 0.9, 0.2, 0, -s * 0.3);
      else if (hn === 'demon') add(head, 'cone', hcol, s * 2.4, 4.1, 1, 1.05, 5.2, 1.05, -0.45, 0, -s * 0.35);
      else if (hn === 'dragon') add(head, 'cone', hcol, s * 2.6, 3.9, 0, 1.1, 6.6, 1.1, -1.05, 0, -s * 0.25);
      else if (hn === 'ram') { add(head, 'sph', hcol, s * 4.4, 2.3, -0.4, 1.6); add(head, 'sph', shade(hcol, -0.1), s * 5.5, 0.4, 0.7, 1.3); add(head, 'sph', hcol, s * 5.1, -1.4, 1.8, 1); }
      else if (hn === 'antlers') { add(head, 'cyl', hcol, s * 2.4, 4.1, 0, 0.5, 5.2, 0.5, 0, 0, -s * 0.45); add(head, 'cyl', hcol, s * 3.8, 6.3, 0, 0.4, 3, 0.4, 0, 0, -s * 1.1); add(head, 'cyl', hcol, s * 3.5, 7, 0, 0.4, 2.5, 0.4, 0.3, 0, s * 0.2); }
      else if (hn === 'unicorn') add(head, 'cone', hcol, 0, 4.3, 2.9, 0.95, 5.2, 0.95, 0.55);
    }
    // accessories
    const ac = a.accColor || '#d8b040', acc = a.accessory;
    if (acc === 'earrings') for (const s of [-1, 1]) add(head, 'sph', metal(ac), s * 4.5, -2, 0.3, 0.5);
    if (acc === 'glasses' || acc === 'monocle') for (const s of acc === 'monocle' ? [1] : [-1, 1]) add(head, 'ring', metal('#303030'), s * 1.62, 0.25, 4.35, 1.3, 1.3, 1.3, PI / 2);
    if (acc === 'flower') { add(head, 'sph', '#ff80c0', 3.4, 3.3, 2.2, 1.2); add(head, 'sph', '#ffe060', 3.7, 3.5, 3.1, 0.5); }
    if (acc === 'headband') add(head, 'ring', ac, 0, 2.3, 0, 4.75, 10, 4.85, -0.15);
    if (acc === 'necklace') add(body, 'ring', metal(ac), 0, hipY + 9.3, 0.5, 2.7, 3, 2.3, 0.35);
    // helmets
    if (hm) {
      const c = hm.color, tr = hm.trim || shade(c, -0.25), st = hm.style, M = (x) => metal(x);
      if (st === 'hood') { add(head, 'dome:0.66', c, 0, 0.3, -0.5, 5.4, 6.1, 5.5, -0.42); add(head, 'cap:1', c, 0, -3.8, -3.1, 4.5, 2.4, 2.4); add(head, 'ring', shade(c, -0.2), 0, 0.2, 1.3, 4.7, 5, 4.2, -1.25); }
      else if (st === 'wizard') { add(head, 'dome:0.5', c, 0, 0.8, -0.2, 5, 4.6, 5, -0.15); add(head, 'cyl', shade(c, -0.1), 0, 3.3, 0, 8, 0.6, 8, -0.12); add(head, 'cone', c, 0, 3.8, -0.6, 4.6, 11, 4.6, -0.3); add(head, 'ring', tr, 0, 4.3, -0.2, 4.5, 6, 4.5, -0.12); if (hm.glow) add(head, 'sph', mat(hm.glow, true), 0, 13.3, -4, 1); }
      else if (st === 'cap') { add(head, 'dome:0.5', c, 0, 0.7, 0, 5.05, 5.4, 5.05, -0.2); add(head, 'box', shade(c, -0.15), 0, 2.2, 4.7, 5.8, 0.45, 3.4, 0.18); }
      else if (st === 'bandana') { add(head, 'ring', c, 0, 2.5, 0, 4.8, 12, 4.8, -0.2); add(head, 'cap:1', c, 1, 0.8, -5.3, 0.7, 1.1, 0.55, 0.5, 0, 0.3); }
      else if (st === 'circlet') { add(head, 'ring', M(c), 0, 2.6, 0, 4.85, 4.5, 4.85, -0.2); add(head, 'sph', mat(hm.accent || hm.glow || '#40c0ff', !!hm.glow, !hm.glow), 0, 3, 4.9, 0.75); }
      else if (st === 'crown') { add(head, 'cyl', M(c), 0, 3, 0, 4.5, 2.6, 4.5); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; add(head, 'cone', M(c), Math.sin(an) * 4.2, 5.5, Math.cos(an) * 4.2, 0.8, 2, 0.8); } add(head, 'sph', M(hm.accent || '#e03040'), 0, 4.2, 4.55, 0.75); }
      else if (st === 'full' || st === 'knight') {
        add(head, 'sph', M(c), 0, 0.5, 0, 5.3, 6, 5.4); add(head, 'box', '#141018', 0, 0, 5.05, 4.8, 0.8, 1); add(head, 'box', M(shade(c, 0.12)), 0, -2.4, 4.6, 3.6, 2.8, 1.2);
        if (st === 'knight') { add(head, 'box', tr, 0, 6.6, -0.5, 1, 2.6, 7.5); add(head, 'cap:1', tr, 0, 6, -4, 0.8, 1.5, 0.8, -1); } else add(head, 'ring', M(tr), 0, 1.8, 0, 5.3, 4, 5.4);
      }
      else if (st === 'skull') { add(head, 'dome:0.62', c, 0, 0.4, 0, 5.2, 5.9, 5.2, -0.3); for (const s of [-1, 1]) add(head, 'sph', '#140c1c', s * 1.8, 2.4, 4.4, 0.9, 0.75, 0.4); }
      else if (st === 'horned' || st === 'dragon') {
        add(head, 'dome:0.56', M(c), 0, 0.5, 0, 5.2, 5.9, 5.2, -0.25);
        if (st === 'horned') for (const s of [-1, 1]) add(head, 'cone', hm.trim || '#e8e0c8', s * 4.6, 2.6, 0, 1.2, 5, 1.2, 0, 0, -s * 0.9);
        else for (let i = 0; i < 4; i++) add(head, 'cone', M(tr), 0, 5.6 - i * 1, -0.7 - i * 1.7, 0.8, 2.5 - i * 0.4, 0.8, -0.6 - i * 0.3);
      }
      else add(head, 'dome:0.56', M(c), 0, 0.5, 0, 5.2, 5.9, 5.2, -0.25);
    }
    // arms: shoulder -> upper arm -> elbow -> forearm -> hand
    const sleeve = robe ? shirt : shade(shirt, -0.06), shortSleeve = !robe && !plate && !chain && !gloves;
    rig.elbows = [];
    const arm = (s) => {
      const A = grp(body, s * (3.95 * wide + 0.6), hipY + 8.6, 0);
      add(A, 'sph', sleeve, 0, -0.2, 0, 1.45 * wide);
      add(A, 'limb', sleeve, 0, -2.3, 0, 1.25 * wide, 2.5, 1.25);
      if (plate) add(A, 'dome:0.5', metal(shade(shirt, 0.22)), 0, 0.2, 0, 2.3 * wide, 1.8, 2.2);
      if (chain) add(A, 'sph', shade(shirt, 0.15), 0, -0.2, 0, 1.75 * wide);
      const el = grp(A, 0, -4.5, 0); rig.elbows.push(el);
      add(el, 'sph', shortSleeve ? skin : sleeve, 0, 0, 0, 0.98 * wide);
      add(el, 'calf', shortSleeve ? skin : robe ? shirt : sleeve, 0, -2.1, 0, 1.08 * wide, 2.3, 1.08);
      if (!shortSleeve && !robe) add(el, 'ring', shade(sleeve, -0.2), 0, -3.9, 0, 0.95, 4, 0.95);
      if (robe) add(el, 'flare', shirt, 0, -4.3, 0, 1.6, 2.2, 1.6, PI);
      if (gloves) add(el, 'cap:1', hd.style === 'plate' ? metal(gloves) : gloves, 0, -3.2, 0, 1.12, 0.7, 1.12);
      const hand = grp(el, 0, -4.4, 0.15);
      add(hand, 'sph', gloves || skin, 0, 0, 0, 0.9, 1.1, 0.72);
      add(hand, 'sph', gloves || skin, s * -0.75, 0.2, 0.55, 0.42, 0.62, 0.42, 0.5);
      return { A, hand };
    };
    const Lh = arm(-1), Rh = arm(1);
    rig.armL = Lh.A; rig.armR = Rh.A; rig.handR = Rh.hand;
    rig.armL0 = Lh.A.position.clone(); rig.armR0 = Rh.A.position.clone();
    // cape
    if (cp) {
      const C = rig.cape = grp(body, 0, hipY + 9.6, -2.6);
      const len = hipY + 7.5;
      add(C, 'box', cp.color, 0, -len / 2, 0, 8.6 * wide, len, 0.45);
      add(C, 'box', cp.trim || shade(cp.color, -0.3), 0, -len + 0.5, 0.02, 8.7 * wide, 1, 0.5);
      add(C, 'cap:1', shade(cp.color, 0.08), 0, 0.2, 0.9, 1.3, 2.6 * wide, 1.5, 0, 0, PI / 2);
      add(C, 'sph', metal('#d8b048'), 3.4 * wide, 0.2, 2.2, 0.55);
    }
    // shield on the left arm
    if (oh) {
      const sg = grp(Lh.hand, -1, 1.1, 0.8);
      add(sg, 'cyl', oh.color, 0, 0, 0, 3.8, 0.8, 4.1, 0, 0, PI / 2);
      add(sg, 'ring', metal(oh.trim || shade(oh.color, 0.3)), -0.82, 0, 0, 3.8, 3, 4.1, 0, 0, PI / 2);
      add(sg, 'sph', metal(oh.accent || oh.trim || '#c8a040'), -0.95, 0, 0, 1.1);
      if (oh.glow) add(sg, 'sph', mat(oh.glow, true), -1.4, 0, 0, 0.6);
    }
    // weapon in the right hand
    if (wl) rig.weapon = weapon(K, Rh.hand, wl, wtype || wl.type);
    // the mount rides along under the figure
    if (mountId && R.HD2DBeasts) { const mr = R.HD2DBeasts.buildMount(mountId, K); if (mr) { rig.yawG.add(mr.g); rig.mount = mr; } }
    return bake(rig, 'chr|' + bkey);
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
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const DIRA = { down: PI / 2, up: -PI / 2, left: PI, right: 0 };
  CH.angDiff = angDiff;

  CH.draw = function (e, scene, util, now) {
    const L = lookOf(e); if (!L) return;
    const a = R.Character.norm(L.a), g = L.g || {};
    const key = R.Character.appearanceKey(a) + '|' + gk(g.head) + gk(g.chest) + gk(g.legs) + gk(g.feet) + gk(g.hands) + gk(g.cape) + gk(g.offhand) + '|' + (L.w ? JSON.stringify(L.w) : '') + '|' + (L.mt || '');
    let rig = rigs.get(e);
    if (!rig || rig.key !== key) {
      if (rig) CH.remove(e, scene);
      rig = build(key, a, g, L.w, L.wt, util, L.mt && R.Companions && R.Companions.MOUNTS[L.mt] ? L.mt : null); rig.key = key; rig.yaw = null; rig.t = now;
      rig.shadow = util.shadowMesh(); scene.add(rig.root); rigs.set(e, rig);
    }
    const dt = Math.min(0.1, Math.max(0, (now - rig.t) / 1000)); rig.t = now;
    pose(rig, e, L, dt);
    rig.root.position.x = e.x; rig.root.position.z = e.y;
    const big = rig.mount ? 1.7 : 1, air = rig.air ? 0.6 : 1;
    rig.shadow.scale.set(26 * big * air, 16 * big * air, 1); rig.shadow.position.set(e.x, 0.4, e.y + 1); rig.shadow.visible = !e.dead;
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
    let ang = DIRA[e.dir] != null ? DIRA[e.dir] : PI / 2;
    if (atk >= 0 || (pl && e.castT > 0)) ang = atkA;
    else if (Math.hypot(e.vx || 0, e.vy || 0) > 12) ang = Math.atan2(e.vy, e.vx);
    const yaw = Math.atan2(Math.cos(ang), Math.sin(ang));
    if (rig.yaw == null) rig.yaw = yaw;
    rig.yaw += angDiff(rig.yaw, yaw) * Math.min(1, dt * 16);
    rig.yawG.rotation.y = rig.yaw;
    // base pose: walk cycle with knees and elbows
    const ph = moving ? t * (run ? 13 : 9.5) : 0, sw = moving ? (run ? 0.85 : 0.55) : 0, s1 = Math.sin(ph);
    rig.legs[0].rotation.set(-s1 * sw, 0, 0); rig.legs[1].rotation.set(s1 * sw, 0, 0);
    rig.knees[0].rotation.x = moving ? sw * 1.25 * Math.max(0, Math.sin(ph + 1.2)) : 0;
    rig.knees[1].rotation.x = moving ? sw * 1.25 * Math.max(0, Math.sin(ph + PI + 1.2)) : 0;
    rig.armL.rotation.set(s1 * sw * 0.75, 0, -0.1); rig.armR.rotation.set(-s1 * sw * 0.75, 0, 0.1);
    rig.elbows[0].rotation.set(-0.2 - sw * 0.35, 0, 0); rig.elbows[1].rotation.set(-0.2 - sw * 0.35, 0, 0);
    rig.armL.position.copy(rig.armL0); rig.armR.position.copy(rig.armR0);
    rig.body.position.y = -(rig.hipY + 6) + (moving ? Math.abs(Math.cos(ph)) * 0.9 - 0.3 : Math.sin(t * 2.2) * 0.15);
    rig.body.rotation.set(run ? 0.16 : moving ? 0.05 : 0, moving ? s1 * 0.08 : 0, 0);
    rig.spin.rotation.set(0, 0, 0); rig.yawG.scale.set(1, 1, 1); if (!rig.mount) rig.yawG.position.y = 0;
    rig.head.rotation.set(moving ? -0.05 : 0, moving ? -s1 * 0.06 : Math.sin(t * 0.7) * 0.12, moving ? 0 : Math.sin(t * 0.9) * 0.03);
    if (rig.cape) rig.cape.rotation.x = -(0.06 + (moving ? (run ? 0.6 : 0.3) + Math.sin(ph * 2) * 0.06 : Math.sin(t * 1.5) * 0.03));
    // in the saddle
    rig.air = false;
    if (rig.mount) {
      const mr = rig.mount, mv = Math.hypot(e.vx || 0, e.vy || 0) > 10;
      rig.air = !!(mr.fly && (pl ? e.air : true));
      rig.spin.position.y = rig.hipY + 6 + (mr.seat - rig.hipY + 0.6);
      rig.legs[0].rotation.set(-1.3, 0, -0.45); rig.legs[1].rotation.set(-1.3, 0, 0.45);
      rig.knees[0].rotation.x = rig.knees[1].rotation.x = 1.35;
      rig.armL.rotation.set(-0.7, 0, -0.1); rig.armR.rotation.set(-0.7, 0, 0.1);
      rig.elbows[0].rotation.x = rig.elbows[1].rotation.x = -0.7;
      rig.body.position.y = -(rig.hipY + 6); rig.body.rotation.set(mv ? 0.12 : 0, 0, 0);
      rig.yawG.position.y = rig.air ? 12 + Math.sin(t * 3) * 2 : 0;
      R.HD2DBeasts.animate(mr, mv ? 1 : 0, t, rig.air);
      const md = mr.def;
      if (md.flame && mv && Math.random() < 0.5) R.FX.particle({ x: e.x + U.rand(-6, 6), y: e.y - U.rand(0, 8), vy: -20, life: 0.4, color: U.choose(['#ff6020', '#ffd040']), glow: true, size: 2 });
      if (md.stars && Math.random() < 0.3) R.FX.particle({ x: e.x + U.rand(-12, 12), y: e.y - U.rand(4, 20), life: 0.5, color: '#e0c0ff', glow: true, size: 1 });
    } else rig.spin.position.y = rig.hipY + 6;
    // weapon rest: blade up and forward (staves upright, bows level)
    const W = rig.weapon;
    if (W) W.rotation.set(kind === 'magic' ? -1.25 : kind === 'ranged' ? 0.1 : -0.75, 0, 0);
    if (W && !rig.mount) { rig.armR.rotation.x = kind === 'magic' ? -0.15 : -0.3 - s1 * sw * 0.3; rig.elbows[1].rotation.x = kind === 'magic' ? -0.5 : -0.75; }
    // actions
    if (atk >= 0) {
      const ez = 1 - Math.pow(1 - Math.min(1, atk * 1.25), 3), sgn = combo % 2 === 0 ? 1 : -1;
      if (kind === 'melee' || !kind) {
        rig.armR.rotation.x = -2.9 + 2.3 * ez; rig.armR.rotation.z = 0.14 + sgn * (0.7 - 1.3 * ez); rig.elbows[1].rotation.x = -0.35 + 0.3 * ez;
        if (W) W.rotation.x = 0.7;
        rig.body.rotation.y = sgn * (0.5 - 1.0 * ez); rig.body.rotation.x = 0.1 + 0.15 * ez;
        rig.legs[0].rotation.x = -0.35; rig.legs[1].rotation.x = 0.3; rig.knees[1].rotation.x = 0.35;
      } else if (kind === 'thrust') {
        const push = Math.sin(Math.min(1, atk * 1.4) * PI);
        rig.armR.rotation.x = -1.5; rig.elbows[1].rotation.x = -0.9 + push * 0.9; rig.armR.position.z += push * 2.5;
        if (W) W.rotation.x = 1.5; rig.body.rotation.x = 0.15;
      } else if (kind === 'ranged') {
        rig.armL.rotation.x = -1.5; rig.elbows[0].rotation.x = 0; rig.armR.rotation.x = -1.4; rig.elbows[1].rotation.x = -1.2 - Math.sin(atk * PI) * 0.6; if (W) W.rotation.x = 1.4 + 1.2;
      } else if (kind === 'magic') {
        rig.armR.rotation.x = -0.3 - Math.sin(atk * PI) * 1.4; rig.elbows[1].rotation.x = -0.3; rig.armL.rotation.x = -Math.sin(atk * PI) * 0.9;
      }
    }
    if ((pl && e.castT > 0) || anim === 'cast') { rig.armL.rotation.set(-2.7, 0, -0.35); rig.armR.rotation.set(-2.7, 0, 0.35); rig.elbows[0].rotation.x = rig.elbows[1].rotation.x = -0.2; if (W) W.rotation.x = -0.1; }
    if (anim === 'hurt') { rig.body.rotation.x = -0.28; rig.head.rotation.x = -0.25; }
    if (pl && e.rollT > 0) { const p = 1 - e.rollT / 0.32; rig.spin.rotation.x = p * TAU; rig.yawG.position.y = Math.sin(p * PI) * 5; rig.legs[0].rotation.x = rig.legs[1].rotation.x = -1.3; rig.knees[0].rotation.x = rig.knees[1].rotation.x = 1.6; }
    if (rem && e.peer.s && e.peer.s.r) { rig.spin.rotation.x = (e.spin || 0); }
    if (e.dead) { const k = Math.min(1, (e.deadT || 0) / 0.4); rig.spin.rotation.z = k * PI / 2; rig.yawG.position.y = -k * (rig.hipY + 1); }
    // squash & stretch from the game (landing, hits)
    if (pl && e.squashScale) { const [sx, sy] = e.squashScale(); rig.yawG.scale.set(sx, sy, sx); }
    // blink
    const bl = (t % 3.7) < 0.12 || anim === 'hurt' || e.dead;
    for (const eg of rig.eyes) eg.scale.y = bl ? 0.12 : 1;
    // hit flash + see-through (blinking while invulnerable, stealth)
    const flash = e.flash > 0;
    let alpha = e.alpha != null ? e.alpha : 1;
    if (pl && e.invuln > 0 && !(e.rollT > 0) && Math.floor(e.invuln * 20) % 2 === 0) alpha = Math.min(alpha, 0.5);
    CH.tint(rig, flash, alpha);
    rig.root.visible = alpha > 0.02;
  }
  const WHITE = { r: 1, g: 1, b: 1 };
  CH.tint = function (rig, flash, alpha) {
    if (flash === rig.flash && alpha === rig.alpha) return;
    for (const m of rig.mats) {
      if (m.userData.base) m.color.copy(m.userData.base);
      if (m.emissive) m.emissive.setScalar(flash ? 0.65 : 0); else if (flash) m.color.lerp(WHITE, 0.75);
      const keep = m.userData.keepAlpha, op = alpha * (keep || 1), tr = op < 1;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op;
    }
    rig.flash = flash; rig.alpha = alpha;
  };

  CH.remove = function (e, scene) {
    const rig = rigs.get(e); if (!rig) return;
    scene.remove(rig.root); scene.remove(rig.shadow); rig.shadow.material.dispose();
    CH.dispose(rig);
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
