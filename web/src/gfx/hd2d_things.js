'use strict';
// HD-2D world objects: gold and loot on the ground (spinning coins, 3D weapons, potion bottles, gems,
// bags, with a rarity glow and a light beam for epic+), treasure chests whose lids open, and gathering
// nodes (herbs, logs, ore veins). Also draws floating combat text (damage, XP, gold) as smooth
// full-resolution text instead of the pixel font.
(function (R) {
  const U = R.U;
  const TH = R.HD2DThings = {};
  const PI = Math.PI, TAU = PI * 2;
  const sh = (c, k) => U.shade(c || '#888888', k);
  const rigs = new Map();

  TH.wants = (e) => !!((R.Pickup && e instanceof R.Pickup) || (R.Chest && e instanceof R.Chest) || (e.n && e.kind && e.interactR && R.Crafting));

  function build(e) {
    const CH = R.HD2DChars, rig = CH.newRig(); rig.outline = 0.3;
    const k = CH.kit(rig), g = k.grp(rig.root, 0, 0, 0);
    rig.root.rotation.x = -CH.TILT * 0.5; rig.root.scale.setScalar(1.5);
    rig.spin = g;
    if (R.Pickup && e instanceof R.Pickup) {
      rig.kind = 'pickup';
      if (e.gold) {
        const n = Math.min(5, 1 + Math.floor(e.gold / 20)), gold = k.mat('#f0b830', false, true);
        for (let i = 0; i < n; i++) { const c = k.add(g, 'cyl', gold, (i % 2) * 1.2 - 0.6, i * 0.75, (i % 3) * 0.5 - 0.5, 2, 0.6, 2); c.castShadow = true; k.add(g, 'ring', k.mat('#fff0a0', false, true), (i % 2) * 1.2 - 0.6, i * 0.75 + 0.62, (i % 3) * 0.5 - 0.5, 1.5, 1, 1.5); }
        rig.coin = k.add(g, 'cyl', gold, 0, 5, 0, 2.2, 0.6, 2.2, PI / 2, 0, 0); rig.coin.castShadow = true; rig.coin.userData.keep = true;
        rig.glowCol = '#ffd040';
      } else {
        const it = R.Items[e.item] || {}, rar = (R.G.RARITY[it.rarity] || R.G.RARITY.common).color, ic = (it.icon && it.icon.color) || rar;
        rig.glowCol = it.rarity && it.rarity !== 'common' ? rar : null;
        const hold = rig.item = k.grp(g, 0, 4, 0);
        if (it.slot === 'weapon' && it.look) {
          const w = k.grp(hold, 0, 0, -5); CH.weaponMesh ? CH.weaponMesh(k, w, it.look, it.type) : null; hold.rotation.set(-0.3, 0, 0.7); hold.scale.setScalar(0.7);
        } else if (it.slot === 'consumable') {
          k.add(hold, 'sph', k.mat(ic), 0, 0, 0, 2.2); k.add(hold, 'cyl', '#d8e8f0', 0, 1.8, 0, 0.8, 1.6, 0.8); k.add(hold, 'cyl', '#8a5a30', 0, 3.3, 0, 0.9, 0.8, 0.9);
          k.add(hold, 'sph', k.mat('#ffffff', true), -0.8, 0.8, 1.6, 0.5);
        } else if (it.slot === 'material' || it.slot === 'quest' || it.slot === 'gem') {
          k.add(hold, 'rockish', k.mat(ic, !!it.glow, true), 0, 0, 0, 2); k.add(hold, 'rockish', k.mat(sh(ic, 0.25)), 1.3, 1, 0.4, 1.1);
        } else if (it.slot === 'ring' || it.slot === 'amulet') {
          k.add(hold, 'ring', k.mat('#e8c060', false, true), 0, 0, 0, 2, 8, 2, PI / 2); k.add(hold, 'sph', k.mat(ic, true), 0, 2, 0, 0.9);
        } else {
          // armour and the rest: a tied bag in the item's colour
          k.add(hold, 'sph', k.mat(sh(ic, -0.15)), 0, 0, 0, 2.6, 2.4, 2.6); k.add(hold, 'cone', sh(ic, -0.25), 0, 1.8, 0, 1.3, 1.8, 1.3); k.add(hold, 'ring', rar, 0, 2.2, 0, 0.8, 4, 0.8);
        }
        if (rig.glowCol) { const r = k.add(g, 'ring', k.mat(rig.glowCol, true), 0, 0.2, 0, 4, 5, 4); r.castShadow = false; r.userData.keep = true; rig.ringGlow = r; }
        if (['epic', 'legendary', 'mythic'].includes(it.rarity)) {
          const bm = k.mat(rar, true); bm.transparent = true; bm.opacity = 0.28; bm.depthWrite = false; bm.userData.keepAlpha = 0.28;
          const beam = k.add(g, 'cyl', bm, 0, 0, 0, 1.2, 40, 1.2); beam.castShadow = false; rig.beam = beam;
        }
      }
    } else if (R.Chest && e instanceof R.Chest) {
      rig.kind = 'chest';
      const tier = e.tier, wood = tier === 'gold' ? '#8a3a8a' : tier === 'iron' ? '#5a5a6a' : '#8a5a30', band = k.mat(tier === 'gold' ? '#ffd040' : tier === 'iron' ? '#b0b0c0' : '#7a7a7a', false, true);
      k.add(g, 'box', wood, 0, 3, 0, 12, 6, 8); for (const x of [-4, 4]) k.add(g, 'box', band, x, 3, 0, 1.4, 6.2, 8.2);
      const lid = rig.lid = k.grp(g, 0, 6, -4);
      k.add(lid, 'halfcyl', wood, 0, 0, 4, 4, 12, 4, 0, 0, PI / 2); for (const x of [-4, 4]) k.add(lid, 'halfcyl', band, x, 0, 4, 4.15, 1.4, 4.15, 0, 0, PI / 2);
      rig.lidCut = k.add(lid, 'box', wood, 0, -1.2, 4, 12, 2.4, 8); rig.lidCut.visible = false;
      k.add(lid, 'box', k.mat('#ffd040', false, true), 0, 0.2, 8.2, 1.8, 2.4, 0.6);
      rig.inside = k.add(g, 'box', k.mat('#ffd040', true), 0, 5.6, 0, 10, 0.4, 6.5); rig.inside.visible = false; rig.inside.userData.keep = true;
    } else {
      rig.kind = 'node';
      const kd = e.kind; rig.kd = kd;
      const on = k.grp(g, 0, 0, 0), off = k.grp(g, 0, 0, 0); rig.on = on; rig.off = off;
      if (kd.type === 'herb') {
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; k.add(on, 'cone', sh(kd.color, (i % 2) * 0.12), Math.cos(a) * 2, 0, Math.sin(a) * 2, 0.7, 5 + (i % 3) * 1.5, 0.5, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
        for (let i = 0; i < 5; i++) { const a = i * 1.3; k.add(on, 'sph', kd.glow ? k.mat(kd.flower, true) : kd.flower, Math.cos(a) * 2.4, 5.5 + (i % 2) * 1.5, Math.sin(a) * 2.4, 0.9); }
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(off, 'cone', '#6a5a40', Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5, 0.5, 2, 0.4); }
      } else if (kd.type === 'log') {
        k.add(on, 'cyl', '#7a5030', 6, 2.6, 0, 2.6, 12, 2.6, 0, 0.3, PI / 2); k.add(on, 'cyl', '#c09060', 6.05, 2.6, 0.2, 2.2, 0.2, 2.2, 0, 0.3, PI / 2);
        k.add(on, 'cone', '#4a8a3a', 1, 5, 0, 0.6, 2.4, 0.4); k.add(on, 'sph', '#60b040', 1.3, 7, 0, 0.8, 0.5, 0.8);
        k.add(off, 'cyl', '#5a4030', 0, 0, 0, 3, 2, 3); k.add(off, 'cyl', '#a08060', 0, 2, 0, 2.6, 0.2, 2.6);
      } else {
        const base = '#6a6068';
        k.add(on, 'rockish', base, 0, 3, 0, 6, 4.6, 5); k.add(on, 'rockish', sh(base, 0.1), 3, 2.5, 2, 3.6); k.add(on, 'rockish', sh(base, -0.05), -3.5, 2, 1.5, 3.2);
        for (let i = 0; i < 6; i++) { const a = i * 1.1; k.add(on, 'cone', k.mat(kd.vein, !!kd.glow, !kd.glow), Math.cos(a) * 3.6, 3.5 + (i % 2) * 2, Math.sin(a) * 3 + 1, 0.9, 2.6 + (i % 3), 0.9, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
        k.add(off, 'rockish', '#4a4448', 0, 2, 0, 5, 3, 4.2);
      }
    }
    // keep the parts we move on their own groups; everything else is merged
    return CH.bake(rig, 'thing|' + (e.item || '') + '|' + (e.gold ? Math.min(5, 1 + Math.floor(e.gold / 20)) : '') + '|' + (e.tier || '') + '|' + (e.n ? e.n.kind : ''));
  }

  TH.draw = function (e, scene, util, now) {
    let rig = rigs.get(e);
    const key = e.item || (e.gold ? 'g' + Math.min(5, 1 + Math.floor(e.gold / 20)) : '') + (e.tier || '') + (e.n ? e.n.kind : '');
    if (!rig || rig.key !== key) { if (rig) TH.remove(e, scene); rig = build(e); rig.key = key; rig.shadow = util.shadowMesh(); scene.add(rig.root); rigs.set(e, rig); }
    const t = now / 1000;
    rig.root.position.set(e.x, e.z || 0, e.y);
    if (rig.kind === 'pickup') {
      const bob = !(e.z > 0) ? Math.sin((e.age || 0) * 4) * 0.8 + 0.8 : 0;
      rig.spin.position.y = bob; rig.spin.rotation.y = t * 2.2 + e.x;
      if (rig.ringGlow) { const q = 1 + Math.sin(t * 5) * 0.12; rig.ringGlow.scale.set(4 * q, 5, 4 * q); }
      rig.shadow.scale.set(9, 6, 1);
    } else if (rig.kind === 'chest') {
      const o = e.openT || 0;
      rig.lid.rotation.x = -o * 1.9; rig.inside.visible = o > 0.2;
      rig.shadow.scale.set(26, 14, 1);
    } else {
      const ready = e.ready ? e.ready() : true;
      rig.on.visible = ready; rig.off.visible = !ready;
      if (ready && rig.kd.type === 'herb') rig.on.rotation.z = Math.sin(t * 1.6 + e.x) * 0.06;
      rig.shadow.scale.set(rig.kd.type === 'ore' ? 24 : 16, 10, 1);
    }
    rig.shadow.position.set(e.x, 0.4, e.y + 1);
    return true;
  };
  TH.remove = function (e, scene) { const rig = rigs.get(e); if (!rig) return; scene.remove(rig.root); scene.remove(rig.shadow); rig.shadow.material.dispose(); R.HD2DChars.dispose(rig); rigs.delete(e); };
  TH.sweep = function (seen, scene) { for (const e of [...rigs.keys()]) if (!seen.has(e) || e.remove) TH.remove(e, scene); };
  TH.clear = function (scene) { for (const e of [...rigs.keys()]) TH.remove(e, scene); };

  // ---- smooth floating text (damage numbers, +XP, +gold) at full screen resolution --------------
  // a = world->640x360 affine from the renderer; k = display pixels per game pixel
  TH.drawTexts = function (ctx, a, k) {
    const FX = R.FX; if (!FX.texts.length) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of FX.texts) {
      const sx = (a[0] * t.x + a[2] * t.y + a[4]) * k, sy = (a[1] * t.x + a[3] * t.y + a[5]) * k;
      const al = Math.min(1, t.life / t.max * 2.5), pop = t.crit ? 1 + Math.max(0, (t.life - t.max + 0.15) / 0.15) * 0.6 : 1;
      const size = Math.round((t.scale > 1 ? 13 : 9) * pop * k);
      ctx.globalAlpha = al;
      ctx.font = `900 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.lineWidth = Math.max(2, size * 0.2); ctx.strokeStyle = 'rgba(20,12,28,0.95)';
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color; ctx.fillText(t.text, sx, sy);
    }
    ctx.restore();
  };
})(window.RPG);
