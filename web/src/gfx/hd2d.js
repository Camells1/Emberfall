'use strict';
// HD-2D renderer (Settings → Graphics). The world is drawn in 3D with three.js: the tile map lies on
// the ground, and every prop, character and monster is an upright pixel-art cut-out standing on it,
// lit by real point lights (torches, lamps, your own glow) under a tilted, narrow-angle camera.
// Game logic is untouched: world x/y are the ground plane (x, z), and effects / health bars are drawn
// on top with a matching projection.
(function (R) {
  const U = R.U, G = R.G, S = 16;
  const H = R.HD2D = { on: () => !!(R.settings && R.settings.hd2d) && !!window.THREE };
  let T = null, renderer, scene, camera, amb, hemi, sun, glCanvas, playerLight;
  const PITCH = 52 * Math.PI / 180, FOV = 30, VIEW_H = 330; // camera tilt, lens, how much ground is visible
  const texCache = new WeakMap(), groundMeshes = new Map(), propMeshes = new Map(), entMeshes = new Map(), lights = [];
  let tmpC = null, tmpC2 = null;
  let geoPlane = null, curMap = null, wallGeo = null, camX = null, camZ = null;
  const wallSets = new Map(); // tile id -> instanced blocks textured with that tile's own art
  function wallSet(id) {
    let w = wallSets.get(id);
    if (w) return w;
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const td = R.Tiles[id]; try { td.draw(G.painter(c.getContext('2d')), U.rng('wall:' + id), 0, 0); } catch (e) { const g = c.getContext('2d'); g.fillStyle = td.color || '#555'; g.fillRect(0, 0, 16, 16); }
    w = new T.InstancedMesh(wallGeo, new T.MeshLambertMaterial({ map: gpuScale2x(c) }), 4000);
    w.count = 0; w.frustumCulled = false; w.castShadow = w.receiveShadow = true; scene.add(w); wallSets.set(id, w);
    return w;
  }
  const WALL_H = 22, CHAR_K = 1.45; // wall height; characters drawn a bit bigger than props

  function init() {
    if (renderer) return true;
    T = window.THREE; if (!T) return false;
    glCanvas = document.createElement('canvas');
    try { renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true }); } catch (e) { console.warn('HD-2D unavailable', e); return false; }
    renderer.setSize(outW || G.W * 2, outH || G.H * 2, false);
    renderer.setPixelRatio(1);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FOV, G.W / G.H, 10, 4000);
    amb = new T.AmbientLight(0xffffff, 0.55); scene.add(amb);
    hemi = new T.HemisphereLight(0xfff4e0, 0x404060, 0.35); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff0d0, 0.55); scene.add(sun); scene.add(sun.target);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.5;
    Object.assign(sun.shadow.camera, { left: -540, right: 540, top: 480, bottom: -480, near: 10, far: 1800 }); sun.shadow.camera.updateProjectionMatrix();
    playerLight = new T.PointLight(0xffe0b0, 0, 180, 1.6); scene.add(playerLight);
    for (let i = 0; i < 10; i++) { const l = new T.PointLight(0xffc080, 0, 160, 1.8); scene.add(l); lights.push(l); }
    geoPlane = new T.PlaneGeometry(1, 1); tmpC = new T.Color(); tmpC2 = new T.Color();
    wallGeo = new T.BoxGeometry(16, WALL_H, 16);
    return true;
  }
  // Scale2x: doubles pixel art while rounding off stair-step edges
  function scale2x(src, dst) {
    const w = src.width, h = src.height, W2 = w * 2;
    if (dst.width !== W2 || dst.height !== h * 2) { dst.width = W2; dst.height = h * 2; dst._img = null; }
    const sd = new Uint32Array(src.getContext('2d').getImageData(0, 0, w, h).data.buffer);
    const dctx = dst.getContext('2d'); const img = dst._img || (dst._img = dctx.createImageData(W2, h * 2)); const od = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) {
      const ro = y * w, ru = (y ? y - 1 : 0) * w, rd = (y < h - 1 ? y + 1 : y) * w;
      for (let x = 0; x < w; x++) {
        const P = sd[ro + x], A = sd[ru + x], D = sd[rd + x], C = sd[ro + (x ? x - 1 : 0)], B = sd[ro + (x < w - 1 ? x + 1 : x)], o = y * 2 * W2 + x * 2;
        if (A !== D && C !== B) { od[o] = C === A ? A : P; od[o + 1] = A === B ? B : P; od[o + W2] = C === D ? C : P; od[o + W2 + 1] = D === B ? D : P; }
        else od[o] = od[o + 1] = od[o + W2] = od[o + W2 + 1] = P;
      }
    }
    dctx.putImageData(img, 0, 0);
    return dst;
  }
  // The same Scale2x, run on the GPU: draws the texture into a 2x render target through a small
  // shader, so smoothing a new patch of ground never has to read pixels back (which stalls a frame).
  let s2Scene = null, s2Cam = null, s2Mat = null;
  function gpuScale2x(canvas) {
    if (!s2Scene) {
      s2Mat = new T.ShaderMaterial({
        uniforms: { tex: { value: null }, size: { value: new T.Vector2(1, 1) } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: [
          'uniform sampler2D tex; uniform vec2 size; varying vec2 vUv;',
          'bool eq(vec4 a, vec4 b) { return all(lessThan(abs(a - b), vec4(0.004))); }',
          'void main() {',
          '  vec2 px = vUv * size, ip = floor(px), f = px - ip, d = 1.0 / size, c = (ip + 0.5) * d;',
          '  vec4 P = texture2D(tex, c), A = texture2D(tex, c + vec2(0.0, d.y)), D = texture2D(tex, c - vec2(0.0, d.y));',
          '  vec4 C = texture2D(tex, c - vec2(d.x, 0.0)), B = texture2D(tex, c + vec2(d.x, 0.0));',
          '  vec4 o = P;',
          '  if (!eq(A, D) && !eq(C, B)) {',
          '    if (f.y >= 0.5) { if (f.x < 0.5) { if (eq(C, A)) o = A; } else { if (eq(A, B)) o = B; } }',
          '    else { if (f.x < 0.5) { if (eq(C, D)) o = C; } else { if (eq(D, B)) o = D; } }',
          '  }',
          '  gl_FragColor = o;',
          '}'].join('\n'),
        depthTest: false, depthWrite: false,
      });
      s2Scene = new T.Scene(); s2Scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), s2Mat)); s2Cam = new T.Camera();
    }
    const src = new T.CanvasTexture(canvas); src.magFilter = src.minFilter = T.NearestFilter; src.generateMipmaps = false;
    const rt = new T.WebGLRenderTarget(canvas.width * 2, canvas.height * 2, { magFilter: T.LinearFilter, minFilter: T.LinearFilter, depthBuffer: false });
    rt.texture.generateMipmaps = false;
    s2Mat.uniforms.tex.value = src; s2Mat.uniforms.size.value.set(canvas.width, canvas.height);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.render(s2Scene, s2Cam); renderer.setRenderTarget(prev);
    src.dispose();
    rt.texture.userData.rt = rt;
    return rt.texture;
  }
  const smoothCache = new WeakMap(); // static sprite -> its smoothed copy
  function smooth(c) { let s2 = smoothCache.get(c); if (!s2) { s2 = scale2x(c, document.createElement('canvas')); smoothCache.set(c, s2); } return s2; }
  function tex(canvas, dynamic, lin) {
    let t = texCache.get(canvas);
    if (!t) { t = new T.CanvasTexture(canvas); t.magFilter = t.minFilter = lin ? T.LinearFilter : T.NearestFilter; t.generateMipmaps = false; texCache.set(canvas, t); }
    else if (dynamic) t.needsUpdate = true;
    return t;
  }
  // free a texture's GPU memory (it is rebuilt from its canvas if that canvas is shown again)
  function freeTex(t) { if (!t) return; if (t.userData && t.userData.rt) { t.userData.rt.dispose(); return; } t.dispose(); if (t.image) texCache.delete(t.image); }
  const spriteMat = (map) => new T.MeshLambertMaterial({ map, transparent: false, alphaTest: 0.45, side: T.DoubleSide });
  // Upright cut-out, tilted back to face the camera so pixel art keeps its proportions.
  function billboard(w, h) { const m = new T.Mesh(geoPlane, spriteMat(null)); m.scale.set(w, h, 1); m.rotation.x = -(Math.PI / 2 - PITCH) * 0.85; scene.add(m); return m; }
  function placeBillboard(m, x, y, ax, ay, w, h) {
    const L = -m.rotation.x, v = h / 2 - ay; // v: feet height in the plane's own coordinates
    m.position.set(x - (ax - w / 2), -v * Math.cos(L), y + v * Math.sin(L));
  }
  // soft round shadow on the ground under characters
  let shadowTex = null;
  function shadowMesh() {
    if (!shadowTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); shadowTex = new T.CanvasTexture(c); }
    const m = new T.Mesh(geoPlane, new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; scene.add(m); return m;
  }
  // Compile every kind of material once, up front, so the first arrow, spell, drop or monster of a
  // kind doesn't freeze the game for a moment while the GPU builds its shader.
  let warmed = false;
  function warmUp(x, z) {
    warmed = true;
    const g = new T.BoxGeometry(1, 1, 1), list = [];
    const vc = new T.BufferGeometry().copy(g); vc.setAttribute('color', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const mats = [
      [vc, new T.MeshPhongMaterial({ vertexColors: true, shininess: 10 })], [vc, new T.MeshBasicMaterial({ vertexColors: true })],
      [g, new T.MeshBasicMaterial({ color: 0, side: T.BackSide })], [g, new T.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })],
      [g, new T.MeshPhongMaterial({ color: 0xffffff })], [g, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })],
      [g, spriteMat(tex(document.createElement('canvas'), false, true))], [g, new T.MeshLambertMaterial({ color: 0xffffff })],
    ];
    for (const [geo, m] of mats) { const mesh = new T.Mesh(geo, m); mesh.position.set(x, -40, z); mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh); list.push(mesh); }
    // the instanced pools
    for (const k of ['box|l', 'box|g', 'box|f', 'blade|n']) { const [geo, mt] = k.split('|'); if (R.HD2DModels) pool(geo, mt); }
    return list;
  }
  // upload only the used part of an instanced buffer (a full upload is several MB a frame)
  function flush(pl, n) {
    const had = pl.count; pl.count = n;
    if (!n && !had) return;
    pl.instanceMatrix.updateRange.offset = 0; pl.instanceMatrix.updateRange.count = Math.max(n, 1) * 16; pl.instanceMatrix.needsUpdate = true;
    if (pl.instanceColor) { pl.instanceColor.updateRange.offset = 0; pl.instanceColor.updateRange.count = Math.max(n, 1) * 3; pl.instanceColor.needsUpdate = true; }
  }
  // instanced pools for the 3D props: one per (shape, material)
  const pools = new Map(), tufts = new Map();
  let tmpM, tmpE, tmpQ, tmpV, tmpS;
  const GRASS = { grass: 1, darkgrass: 1, feygrass: 1, sporegrass: 1, swamp: 1 };
  function pool(geo, mat) {
    const k = geo + '|' + mat; let pl = pools.get(k);
    if (pl) return pl;
    if (!tmpM) { tmpM = new T.Matrix4(); tmpE = new T.Euler(); tmpQ = new T.Quaternion(); tmpV = new T.Vector3(); tmpS = new T.Vector3(); }
    const m = mat === 'g' ? new T.MeshBasicMaterial() : mat === 'f' ? new T.MeshLambertMaterial({ transparent: true, opacity: 0.35, depthWrite: false }) : new T.MeshLambertMaterial();
    const g = geo === 'blade' ? (bladeGeo || (bladeGeo = new T.ConeGeometry(0.5, 1, 3).translate(0, 0.5, 0).toNonIndexed())) : R.HD2DModels.geo(geo);
    if (geo === 'blade') g.computeVertexNormals();
    pl = new T.InstancedMesh(g, m, geo === 'blade' ? 9000 : 6000); pl.count = 0; pl.frustumCulled = false;
    pl.castShadow = mat === 'l' || mat === 'g'; pl.receiveShadow = mat !== 'g' && mat !== 'f';
    pl.setColorAt(0, new T.Color());
    scene.add(pl); pools.set(k, pl);
    return pl;
  }
  let bladeGeo = null;
  function makeTuft(x, y, id) {
    const r = U.rng((x * 73856093) ^ (y * 19349663));
    if (r() > 0.45) return null;
    const base = new T.Color(R.Tiles[id].color), out = [];
    for (let k = 0, n = 3 + Math.floor(r() * 4); k < n; k++) {
      const col = base.clone().multiplyScalar(0.85 + r() * 0.45);
      out.push({ m: new T.Matrix4().setPosition(x * S + 2 + r() * 12, 0, y * S + 2 + r() * 12), rx: (r() - 0.5) * 0.6, ry: r() * 6, w: 1.6 + r(), h: 4 + r() * 5, col });
    }
    return out;
  }
  // ------------------------------------------------------------------ per-map setup
  function resetMap() {
    for (const m of groundMeshes.values()) { scene.remove(m); freeTex(m.material.map); m.material.dispose(); }
    for (const m of propMeshes.values()) scene.remove(m);
    for (const e of entMeshes.values()) { scene.remove(e.mesh); scene.remove(e.shadow); freeTex(e.mesh.material.map); e.mesh.material.dispose(); }
    groundMeshes.clear(); propMeshes.clear(); entMeshes.clear(); tufts.clear(); if (R.HD2DChars) R.HD2DChars.clear(scene); if (R.HD2DBeasts) R.HD2DBeasts.clear(scene); if (R.HD2DMonsters) R.HD2DMonsters.clear(scene); if (R.HD2DThings) R.HD2DThings.clear(scene);
    curMap = R.World.map; camX = null;
  }

  // ------------------------------------------------------------------ frame
  H.draw = function (bctx) {
    const W = R.World, M = W.map;
    if (!init() || !M.ground.chunk) return false;
    if (curMap !== M) resetMap();
    const pl0 = W.player;
    if (camX == null || Math.abs(camX - pl0.x) > 400 || Math.abs(camZ - pl0.y) > 400) { camX = pl0.x; camZ = pl0.y; }
    camX += (pl0.x - camX) * 0.12; camZ += (pl0.y - camZ) * 0.12;
    const tx = camX, tz = camZ - 6;
    const dist = VIEW_H / (H.zoom || 1) / (2 * Math.tan(FOV / 2 * Math.PI / 180));
    camera.position.set(tx, Math.sin(PITCH) * dist, tz + Math.cos(PITCH) * dist);
    camera.lookAt(tx, 0, tz);
    camera.updateMatrixWorld();
    // light & mood
    const DN = R.DayNight, dark = DN ? DN.dark(W.def) : W.def.dark || 0, night = DN ? DN.night() : 0, gold = DN ? DN.golden() : 0;
    amb.intensity = 0.62 * (1 - dark * 0.8) * (1 - night * 0.45); hemi.intensity = 0.4 * (1 - dark * 0.7) * (1 - night * 0.6);
    // sun (or moon) colour and strength through the day
    sun.intensity = W.def.outdoor ? 0.55 * (1 - (W.def.dark || 0)) * (1 - night * 0.72) + gold * 0.12 : 0.1;
    sun.color.set(0xfff0d0).lerp(tmpC.set(0xff9a50), Math.min(1, gold)).lerp(tmpC.set(0x8898d8), night);
    amb.color.set(0xffffff).lerp(tmpC.set(0x8a94ff), night * 0.8).lerp(tmpC.set(0xffc090), gold * 0.35);
    if (!scene.background) { scene.background = new T.Color(); scene.fog = new T.Fog(0, 1, 2); }
    scene.background.set(night > 0.05 && !W.def.dark ? tmpC.set(W.def.ambient || '#101820').lerp(tmpC2.set('#040716'), night) : (W.def.ambient || (W.def.outdoor ? '#101820' : '#06040a'))); scene.fog.color.copy(scene.background); scene.fog.near = dist * 1.05; scene.fog.far = dist * 1.9;
    const p = W.player;
    const sd = DN && DN.outdoor() ? DN.sunDir() : { x: -0.45, y: 0.85, z: 0.25 };
    sun.castShadow = !!W.def.outdoor; sun.position.set(tx + sd.x * 700, sd.y * 700, tz + sd.z * 700 - 40); sun.target.position.set(tx, 0, tz - 40);
    playerLight.position.set(p.x, 26, p.y + 4); playerLight.intensity = dark ? 1.4 : 0.35; playerLight.distance = (W.def.playerLight || 110) * 1.6;
    // nearest map lights
    if (!M._propLights) { M._propLights = []; for (const pr of M.props) { const d = R.Props[pr.id]; if (d && d.light) M._propLights.push({ x: pr.x, y: pr.y - d.ay * 0.6, r: d.light.r, color: d.light.color, flicker: d.light.flicker }); } }
    const near = M.lights.concat(M._propLights).filter((l) => Math.abs(l.x - tx) < 420 && Math.abs(l.y - tz) < 320).sort((a, b) => U.dist(a.x, a.y, tx, tz) - U.dist(b.x, b.y, tx, tz));
    lights.forEach((L, i) => { const l = near[i]; if (!l) { L.intensity = 0; return; } L.color.set(l.color); L.position.set(l.x, 22, l.y); L.distance = l.r * 2.2; L.intensity = (dark ? 1.6 + night * 0.8 : 0.8) * (1 + (l.flicker ? Math.sin(W.time * 13 + i) * l.flicker : 0)); });
    // view window in world space (a trapezoid; take a generous box)
    const x0 = tx - 420, x1 = tx + 420, y0 = tz - 330, y1 = tz + 250;
    // ground chunks
    // New ground patches are made at most one per frame (nearest first) so moving never stalls; the
    // view box reaches well past the screen edges, so a patch is ready before it comes into sight.
    const PX = M.ground.CH * S, seenG = new Set(), want = [];
    let budget = groundMeshes.size ? 1 : 99;
    for (let cy = Math.max(0, Math.floor(y0 / PX)); cy <= Math.min(Math.ceil(M.h / M.ground.CH) - 1, Math.floor(y1 / PX)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / PX)); cx <= Math.min(Math.ceil(M.w / M.ground.CH) - 1, Math.floor(x1 / PX)); cx++) {
        const k = cx + ',' + cy; seenG.add(k);
        if (!groundMeshes.has(k)) want.push([Math.hypot((cx + 0.5) * PX - tx, (cy + 0.5) * PX - tz), cx, cy, k]);
      }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy, k] of want) {
        if (budget-- <= 0) break;
        let m;
        {
          const c = M.ground.chunk(cx, cy);
          m = new T.Mesh(geoPlane, new T.MeshLambertMaterial({ map: gpuScale2x(c) })); m.receiveShadow = true;
          m.rotation.x = -Math.PI / 2; m.scale.set(c.width, c.height, 1);
          m.position.set(cx * PX + c.width / 2, 0, cy * PX + c.height / 2);
          scene.add(m); groundMeshes.set(k, m);
        }
    }
    for (const [k, m] of groundMeshes) if (!seenG.has(k)) { scene.remove(m); freeTex(m.material.map); m.material.dispose(); groundMeshes.delete(k); }
    // walls stand up as blocks, wrapped in their own tile art
    { const Tl = R.Tiles, mat = new T.Matrix4(); const used = new Map();
      const ax = Math.max(0, Math.floor(x0 / S)), bx = Math.min(M.w - 1, Math.ceil(x1 / S)), ay = Math.max(0, Math.floor(y0 / S)), by = Math.min(M.h - 1, Math.ceil(y1 / S));
      for (let ty = ay; ty <= by; ty++) for (let tx2 = ax; tx2 <= bx; tx2++) {
        const i = ty * M.w + tx2, id = M.tiles[i], td = Tl[id];
        // any solid, non-liquid tile stands up: dungeon walls, hedges, rock and ice walls, cliff faces
        if (!td || !(M.sight[i] || (td.solid && !td.water && !td.liquid && !td.fall && !M.block[i]))) continue;
        const w = wallSet(id), n = used.get(w) || 0; if (n >= 4000) continue;
        const hh = M.sight[i] ? 1 : 0.7;
        mat.makeScale(1, hh, 1); mat.setPosition(tx2 * S + 8, WALL_H * hh / 2, ty * S + 8); w.setMatrixAt(n, mat); used.set(w, n + 1);
      }
      for (const w of wallSets.values()) flush(w, used.get(w) || 0); }
    // grass tufts: little 3D blades on grassy ground near the camera
    const used3 = new Map(), MD = R.HD2DModels;
    if (MD) {
      const gp = pool('blade', 'n'), gx0 = Math.max(0, Math.floor((tx - 380) / S)), gx1 = Math.min(M.w - 1, Math.ceil((tx + 380) / S)), gy0 = Math.max(0, Math.floor((tz - 260) / S)), gy1 = Math.min(M.h - 1, Math.ceil((tz + 230) / S));
      let n = 0; const sw = W.time * 2.2;
      for (let ty = gy0; ty <= gy1; ty++) for (let tx2 = gx0; tx2 <= gx1; tx2++) {
        const i = ty * M.w + tx2; if (!GRASS[M.tiles[i]] || M.block[i]) continue;
        let tf = tufts.get(i);
        if (tf === undefined) { tf = makeTuft(tx2, ty, M.tiles[i]); tufts.set(i, tf); }
        if (!tf) continue;
        const s1 = Math.sin(sw + tx2 * 0.6 + ty * 0.4) * 0.12;
        for (const b of tf) { if (n >= 9000) break; tmpM.copy(b.m); tmpE.set(b.rx + s1, b.ry, 0, 'YXZ'); tmpQ.setFromEuler(tmpE); tmpM.compose(tmpV.setFromMatrixPosition(b.m), tmpQ, tmpS.set(b.w, b.h, b.w)); gp.setMatrixAt(n, tmpM); gp.setColorAt(n, b.col); n++; }
      }
      used3.set(gp, n);
    }
    // props
    const seenP = new Set(), PR = R.Props;
    for (const pr of M.props) {
      if (pr.x < x0 || pr.x > x1 || pr.y < y0 - 60 || pr.y > y1 + 40) continue;
      if (MD && MD.has(pr.id)) { // a real low-poly model instead of a cut-out
        const d = PR[pr.id], hide = d.h > 24 && p.y < pr.y - 2 && p.y > pr.y - d.h * 1.3 && Math.abs(p.x - pr.x) < d.w * 0.6;
        const sw = Math.sin(W.time * 1.6 + pr.x * 0.05 + pr.y * 0.03) * 0.9;
        for (const pt of MD.parts(pr)) {
          const pl = pool(pt.geo, hide ? 'f' : pt.mat), n = used3.get(pl) || 0; if (n >= 6000) continue;
          if (pt.sway) { tmpM.copy(pt.m); tmpM.elements[12] += sw * pt.sway; tmpM.elements[14] += sw * pt.sway * 0.4; pl.setMatrixAt(n, tmpM); } else pl.setMatrixAt(n, pt.m);
          pl.setColorAt(n, pt.col); used3.set(pl, n + 1);
        }
        continue;
      }
      seenP.add(pr);
      const d = PR[pr.id], spr = PR.sprite(pr.id, pr.v, d.anim ? Math.floor(W.time * 6 + pr.x) % d.anim : 0);
      let m = propMeshes.get(pr);
      if (!m) { m = billboard(spr.width, spr.height); m.castShadow = spr.height > 24; propMeshes.set(pr, m); }
      const t = tex(smooth(spr), false, true); if (m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; }
      m.scale.set(spr.width, spr.height, 1);
      placeBillboard(m, pr.x, pr.y, d.ax + 1, d.ay + 1, spr.width, spr.height);
    }
    for (const [pr, m] of propMeshes) if (!seenP.has(pr)) { scene.remove(m); m.material.dispose(); propMeshes.delete(pr); }
    for (const pl of pools.values()) flush(pl, used3.get(pl) || 0);
    // entities: each one draws itself (with all its usual detail) into its own little canvas
    const seenE = new Set(), flying = [], CH3 = R.HD2DChars, BE = R.HD2DBeasts, MO = R.HD2DMonsters, TH = R.HD2DThings, util = { tex, smooth, shadowMesh }, now = performance.now();
    for (const e of W.entities) {
      if (e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1 + 40 || e.remove) continue;
      if (R.Projectile && e instanceof R.Projectile) { flying.push(e); continue; } // drawn with the effects layer (no texture per shot)
      seenE.add(e);
      if ((MO && MO.has(e)) || (TH && TH.wants(e))) { // monsters, bosses, loot, chests and gathering nodes
        const old = entMeshes.get(e);
        if (old) { scene.remove(old.mesh); scene.remove(old.shadow); freeTex(old.mesh.material.map); old.mesh.material.dispose(); old.shadow.material.dispose(); entMeshes.delete(e); }
        if (MO && MO.has(e)) MO.draw(e, scene, util, now); else TH.draw(e, scene, util, now);
        continue;
      }
      if (CH3 && (CH3.wants(e) || (e.isPet && BE))) { // people, mounts and pets are real 3D figures
        const old = entMeshes.get(e);
        if (old) { scene.remove(old.mesh); scene.remove(old.shadow); freeTex(old.mesh.material.map); old.mesh.material.dispose(); old.shadow.material.dispose(); entMeshes.delete(e); }
        if (e.isPet) { if (BE.drawPet(e, scene, util, now)) continue; } else { CH3.draw(e, scene, util, now); continue; }
      }
      const sc = (e.def && e.def.scale) || 1, huge = e.boss && sc > 2.4, big = e.boss || sc > 1.6 || e.riding;
      const cw = huge ? 384 : big ? 256 : 128, chh = huge ? 336 : big ? 224 : 112, footY = chh - 20;
      let rec = entMeshes.get(e);
      if (!rec || rec.cw !== cw) {
        if (rec) scene.remove(rec.mesh);
        const c = document.createElement('canvas'); c.width = cw; c.height = chh;
        rec = { c, ctx: c.getContext('2d'), mesh: billboard(cw, chh), cw, shadow: shadowMesh() };
        rec.ctx.imageSmoothingEnabled = false; rec.mesh.material.map = tex(c, false, true); rec.mesh.material.needsUpdate = true; rec.mesh.castShadow = true;
        entMeshes.set(e, rec);
      }
      // repaint at most ~20 times a second (pixel animations run slower than that); a hit flash repaints at once
      const fl = e.flash > 0;
      if (now >= (rec.next || 0) || fl !== rec.fl) { rec.next = now + 40 + Math.random() * 20; rec.fl = fl;
      const g = rec.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, chh);
      g.setTransform(1, 0, 0, 1, Math.round(cw / 2 - e.x), Math.round(footY - e.y));
      try { e.draw(g); } catch (err) { /* keep going */ }
      { // soft light from the upper left, shadowed underside: gives the flat art some roundness
        const hg = 24 * Math.min(sc, 3) * (e.riding ? 1.5 : 1), cx = cw / 2 - hg * 0.35, cy = footY - hg * 1.05;
        const gr = g.createRadialGradient(cx, cy, 0, cx + hg * 0.35, cy + hg * 0.55, hg * 1.25);
        gr.addColorStop(0, 'rgba(255,246,220,0.30)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(12,10,40,0.42)');
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, cw, chh); g.globalCompositeOperation = 'source-over';
      }
      tex(rec.c, true); }
      const k = e.boss ? 1.1 : CHAR_K;
      rec.mesh.scale.set(cw * k, chh * k, 1);
      placeBillboard(rec.mesh, e.x, e.y, cw / 2 * k, footY * k, cw * k, chh * k);
      rec.mesh.position.z += 0.3; // a nudge in front of props at the same spot
      const sr = (e.r || 5) * 2.6 + (e.riding ? 14 : 0);
      rec.shadow.scale.set(sr * 2, sr * 1.2, 1); rec.shadow.position.set(e.x, 0.4, e.y + 1); rec.shadow.visible = !e.dead && e.alpha !== 0;
    }
    for (const [e, rec] of entMeshes) if (!seenE.has(e)) { scene.remove(rec.mesh); scene.remove(rec.shadow); freeTex(rec.mesh.material.map); rec.mesh.material.dispose(); rec.shadow.material.dispose(); entMeshes.delete(e); }
    if (CH3) CH3.sweep(seenE, scene);
    if (BE) BE.sweep(seenE, scene);
    if (MO) MO.sweep(seenE, scene);
    if (TH) TH.sweep(seenE, scene);
    const warm = warmed ? null : warmUp(tx, tz);
    renderer.render(scene, camera);
    if (warm) { for (const m of warm) { scene.remove(m); m.material.dispose(); } }
    // the 3D picture is shown at full screen resolution by H.present(); the 640x360 layer only carries effects & labels
    bctx.clearRect(0, 0, G.W, G.H); frameReady = true;
    // --- overlay: effects, health bars, damage numbers, prompts (projected onto the ground plane)
    const a = H.affine(tx, tz);
    bctx.save(); bctx.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]);
    R.FX.drawEffects(bctx, 'ground'); R.FX.drawParticles(bctx);
    for (const pj of flying) { try { pj.draw(bctx); } catch (err) { /* keep going */ } }
    R.FX.drawEffects(bctx, 'top');
    for (const e of W.entities) if (seenE.has(e)) { if (CH3) CH3.overlay(bctx, e); if (MO) MO.overlay(bctx, e); if (e.drawUI) e.drawUI(bctx); }
    if (!TH) R.FX.drawTexts(bctx); // otherwise drawn smooth at full resolution by H.post()
    H.lastAffine = a;
    const it = !p.dead && !R.UI.blocking() ? W.interactTarget() : null;
    W.currentInteract = it;
    if (it && it.label) {
      const key = R.Input.usingPad ? 'Y' : R.Input.keyName(R.Input.bindings.interact[0]);
      const img = G.pixelText(key + ' ' + it.label, '#ffffff');
      const bx = Math.round(it.x - img.width / 2), by = Math.round(it.y - 44 + Math.sin(W.time * 5) * 1.5);
      bctx.fillStyle = 'rgba(20,12,28,0.75)'; bctx.fillRect(bx - 2, by - 1, img.width + 4, img.height + 2); bctx.drawImage(img, bx, by);
    }
    bctx.restore();
    // soft tilt-shift: darken/blur the top and bottom edges a little for the diorama look
    const gr = bctx.createLinearGradient(0, 0, 0, G.H);
    gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.18, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
    bctx.fillStyle = gr; bctx.fillRect(0, 0, G.W, G.H);
    return true;
  };

  // Screen-resolution output: main.js calls resize() with the display canvas size and present() each frame.
  let frameReady = false, outW = 0, outH = 0;
  H.resize = function (w, h) {
    const k = Math.min(1, Math.sqrt((2560 * 1440) / (w * h))); // cap the pixel count on huge screens
    outW = Math.round(w * k); outH = Math.round(h * k);
    if (renderer) renderer.setSize(outW, outH, false);
  };
  H.info = () => renderer && { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, props: propMeshes.size, ents: entMeshes.size, objs: scene.children.length };
  // after the pixel layer: smooth floating text on top
  H.post = function (ctx, w, h) { if (!H.lastAffine || !R.HD2DThings || !H.on() || R.state !== 'play') return; R.HD2DThings.drawTexts(ctx, H.lastAffine, w / G.W); };
  H.present = function (ctx, w, h) {
    if (!frameReady) return false;
    frameReady = false;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(glCanvas, 0, 0, w, h); ctx.imageSmoothingEnabled = false;
    return true;
  };
  // World ground point -> screen pixel (640x360)
  const v3 = () => new T.Vector3();
  H.project = function (x, y, h) { const v = v3().set(x, h || 0, y).project(camera); return { x: (v.x + 1) / 2 * G.W, y: (1 - v.y) / 2 * G.H }; };
  // Affine approximation of the ground projection around the view centre (for 2D overlays)
  H.affine = function (tx, tz) {
    const s0 = H.project(tx, tz, 8), s1 = H.project(tx + 100, tz, 8), s2 = H.project(tx, tz + 100, 8);
    const ax = (s1.x - s0.x) / 100, ay = (s1.y - s0.y) / 100, bx = (s2.x - s0.x) / 100, by = (s2.y - s0.y) / 100;
    return [ax, ay, bx, by, s0.x - ax * tx - bx * tz, s0.y - ay * tx - by * tz];
  };
  // Screen pixel -> world ground point (for mouse aiming)
  H.toWorld = function (sx, sy) {
    if (!camera) return null;
    const ndc = new T.Vector3(sx / G.W * 2 - 1, -(sy / G.H * 2 - 1), 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    const t = -camera.position.y / dir.y;
    return { x: camera.position.x + dir.x * t, y: camera.position.z + dir.z * t };
  };
  // F9 toggles HD-2D
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F9') return;
    e.preventDefault();
    R.settings.hd2d = !R.settings.hd2d; R.Save.saveSettings();
    R.UI.toast(R.settings.hd2d ? 'Graphics: HD-2D' : 'Graphics: Classic 2D', 'good');
    if (R.UI.current === 'settings') R.UI.refresh();
  });
})(window.RPG);
