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
  let geoPlane = null, curMap = null, wallGeo = null, camX = null, camZ = null;
  const wallSets = new Map(); // tile id -> instanced blocks textured with that tile's own art
  function wallSet(id) {
    let w = wallSets.get(id);
    if (w) return w;
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const td = R.Tiles[id]; try { td.draw(G.painter(c.getContext('2d')), U.rng('wall:' + id), 0, 0); } catch (e) { const g = c.getContext('2d'); g.fillStyle = td.color || '#555'; g.fillRect(0, 0, 16, 16); }
    w = new T.InstancedMesh(wallGeo, new T.MeshLambertMaterial({ map: tex(c) }), 4000);
    w.count = 0; w.frustumCulled = false; scene.add(w); wallSets.set(id, w);
    return w;
  }
  const WALL_H = 22, CHAR_K = 1.35; // wall height; characters drawn a bit bigger than props

  function init() {
    if (renderer) return true;
    T = window.THREE; if (!T) return false;
    glCanvas = document.createElement('canvas');
    try { renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true }); } catch (e) { console.warn('HD-2D unavailable', e); return false; }
    renderer.setSize(G.W * 2, G.H * 2, false);
    renderer.setPixelRatio(1);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FOV, G.W / G.H, 10, 4000);
    amb = new T.AmbientLight(0xffffff, 0.55); scene.add(amb);
    hemi = new T.HemisphereLight(0xfff4e0, 0x404060, 0.35); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff0d0, 0.55); sun.position.set(-0.4, 1, 0.6); scene.add(sun);
    playerLight = new T.PointLight(0xffe0b0, 0, 180, 1.6); scene.add(playerLight);
    for (let i = 0; i < 10; i++) { const l = new T.PointLight(0xffc080, 0, 160, 1.8); scene.add(l); lights.push(l); }
    geoPlane = new T.PlaneGeometry(1, 1);
    wallGeo = new T.BoxGeometry(16, WALL_H, 16);
    return true;
  }
  function tex(canvas, dynamic) {
    let t = texCache.get(canvas);
    if (!t) { t = new T.CanvasTexture(canvas); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; texCache.set(canvas, t); }
    else if (dynamic) t.needsUpdate = true;
    return t;
  }
  // free a texture's GPU memory (it is rebuilt from its canvas if that canvas is shown again)
  function freeTex(t) { if (!t) return; t.dispose(); if (t.image) texCache.delete(t.image); }
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
  // ------------------------------------------------------------------ per-map setup
  function resetMap() {
    for (const m of groundMeshes.values()) { scene.remove(m); freeTex(m.material.map); m.material.dispose(); }
    for (const m of propMeshes.values()) scene.remove(m);
    for (const e of entMeshes.values()) { scene.remove(e.mesh); scene.remove(e.shadow); freeTex(e.mesh.material.map); e.mesh.material.dispose(); }
    groundMeshes.clear(); propMeshes.clear(); entMeshes.clear();
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
    const dist = VIEW_H / (2 * Math.tan(FOV / 2 * Math.PI / 180));
    camera.position.set(tx, Math.sin(PITCH) * dist, tz + Math.cos(PITCH) * dist);
    camera.lookAt(tx, 0, tz);
    camera.updateMatrixWorld();
    // light & mood
    const dark = W.def.dark || 0;
    amb.intensity = 0.62 * (1 - dark * 0.8); hemi.intensity = 0.4 * (1 - dark * 0.7); sun.intensity = W.def.outdoor ? 0.55 * (1 - dark) : 0.1;
    if (!scene.background) { scene.background = new T.Color(); scene.fog = new T.Fog(0, 1, 2); }
    scene.background.set(W.def.ambient || (W.def.outdoor ? '#101820' : '#06040a')); scene.fog.color.copy(scene.background); scene.fog.near = dist * 1.05; scene.fog.far = dist * 1.9;
    const p = W.player;
    playerLight.position.set(p.x, 26, p.y + 4); playerLight.intensity = dark ? 1.4 : 0.35; playerLight.distance = (W.def.playerLight || 110) * 1.6;
    // nearest map lights
    const near = M.lights.filter((l) => Math.abs(l.x - tx) < 420 && Math.abs(l.y - tz) < 320).sort((a, b) => U.dist(a.x, a.y, tx, tz) - U.dist(b.x, b.y, tx, tz));
    lights.forEach((L, i) => { const l = near[i]; if (!l) { L.intensity = 0; return; } L.color.set(l.color); L.position.set(l.x, 22, l.y); L.distance = l.r * 2.2; L.intensity = (dark ? 1.6 : 0.8) * (1 + (l.flicker ? Math.sin(W.time * 13 + i) * l.flicker : 0)); });
    // view window in world space (a trapezoid; take a generous box)
    const x0 = tx - 420, x1 = tx + 420, y0 = tz - 330, y1 = tz + 250;
    // ground chunks
    const PX = M.ground.CH * S, seenG = new Set();
    for (let cy = Math.max(0, Math.floor(y0 / PX)); cy <= Math.min(Math.ceil(M.h / M.ground.CH) - 1, Math.floor(y1 / PX)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / PX)); cx <= Math.min(Math.ceil(M.w / M.ground.CH) - 1, Math.floor(x1 / PX)); cx++) {
        const k = cx + ',' + cy; seenG.add(k);
        let m = groundMeshes.get(k);
        if (!m) {
          const c = M.ground.chunk(cx, cy);
          m = new T.Mesh(geoPlane, new T.MeshLambertMaterial({ map: tex(c) }));
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
      for (const w of wallSets.values()) { w.count = used.get(w) || 0; w.instanceMatrix.needsUpdate = true; } }
    // props
    const seenP = new Set(), PR = R.Props;
    for (const pr of M.props) {
      if (pr.x < x0 || pr.x > x1 || pr.y < y0 || pr.y > y1 + 40) continue;
      seenP.add(pr);
      const d = PR[pr.id], spr = PR.sprite(pr.id, pr.v, d.anim ? Math.floor(W.time * 6 + pr.x) % d.anim : 0);
      let m = propMeshes.get(pr);
      if (!m) { m = billboard(spr.width, spr.height); propMeshes.set(pr, m); }
      const t = tex(spr); if (m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; }
      m.scale.set(spr.width, spr.height, 1);
      placeBillboard(m, pr.x, pr.y, d.ax + 1, d.ay + 1, spr.width, spr.height);
    }
    for (const [pr, m] of propMeshes) if (!seenP.has(pr)) { scene.remove(m); m.material.dispose(); propMeshes.delete(pr); }
    // entities: each one draws itself (with all its usual detail) into its own little canvas
    const seenE = new Set();
    for (const e of W.entities) {
      if (e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1 + 40 || e.remove) continue;
      seenE.add(e);
      const sc = (e.def && e.def.scale) || 1, huge = e.boss && sc > 2.4, big = e.boss || sc > 1.6 || e.riding;
      const cw = huge ? 384 : big ? 256 : 128, chh = huge ? 336 : big ? 224 : 112, footY = chh - 20;
      let rec = entMeshes.get(e);
      if (!rec || rec.cw !== cw) {
        if (rec) scene.remove(rec.mesh);
        const c = document.createElement('canvas'); c.width = cw; c.height = chh;
        rec = { c, ctx: c.getContext('2d'), mesh: billboard(cw, chh), cw, shadow: shadowMesh() };
        rec.ctx.imageSmoothingEnabled = false; rec.mesh.material.map = tex(c); rec.mesh.material.needsUpdate = true;
        entMeshes.set(e, rec);
      }
      const g = rec.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, chh);
      g.setTransform(1, 0, 0, 1, Math.round(cw / 2 - e.x), Math.round(footY - e.y));
      try { e.draw(g); } catch (err) { /* keep going */ }
      tex(rec.c, true);
      const k = e.boss ? 1.1 : CHAR_K;
      rec.mesh.scale.set(cw * k, chh * k, 1);
      placeBillboard(rec.mesh, e.x, e.y, cw / 2 * k, footY * k, cw * k, chh * k);
      rec.mesh.position.z += 0.3; // a nudge in front of props at the same spot
      const sr = (e.r || 5) * 2.6 + (e.riding ? 14 : 0);
      rec.shadow.scale.set(sr * 2, sr * 1.2, 1); rec.shadow.position.set(e.x, 0.4, e.y + 1); rec.shadow.visible = !e.dead && e.alpha !== 0;
    }
    for (const [e, rec] of entMeshes) if (!seenE.has(e)) { scene.remove(rec.mesh); scene.remove(rec.shadow); freeTex(rec.mesh.material.map); rec.mesh.material.dispose(); rec.shadow.material.dispose(); entMeshes.delete(e); }
    renderer.render(scene, camera);
    bctx.save(); bctx.imageSmoothingEnabled = true; bctx.drawImage(glCanvas, 0, 0, G.W, G.H); bctx.restore();
    // --- overlay: effects, health bars, damage numbers, prompts (projected onto the ground plane)
    const a = H.affine(tx, tz);
    bctx.save(); bctx.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]);
    R.FX.drawEffects(bctx, 'ground'); R.FX.drawParticles(bctx); R.FX.drawEffects(bctx, 'top');
    for (const e of W.entities) if (e.drawUI && seenE.has(e)) e.drawUI(bctx);
    R.FX.drawTexts(bctx);
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
