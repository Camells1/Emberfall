'use strict';
// Item icons (16x16 pixel art, outlined) for inventory, shop and ground loot.
//   RPG.Icons.item(item) -> canvas (18x18 incl. outline)
//   RPG.Icons.skill(skill) -> canvas (18x18)
(function (R) {
  const U = R.U, G = R.G;
  const IC = R.Icons = {};

  const ARMOR = {
    head(P, L) {
      const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3), t = L.trim || l;
      if (L.style === 'hood') { P.rect(3, 2, 10, 12, c); P.rect(5, 6, 6, 8, '#140c1c'); P.rect(4, 2, 8, 2, l); return; }
      if (L.style === 'wizard') { P.rect(1, 11, 14, 3, c); P.rect(4, 7, 8, 4, c); P.rect(6, 3, 5, 4, c); P.rect(9, 1, 3, 2, c); P.rect(4, 10, 8, 1, t); return; }
      if (L.style === 'crown' || L.style === 'circlet') { P.rect(2, 8, 12, 5, c); P.px(2, 6, c); P.px(2, 7, c); P.px(7, 5, c); P.px(8, 5, c); P.rect(7, 6, 2, 2, c); P.px(13, 6, c); P.px(13, 7, c); P.px(7, 10, L.accent || '#e03050'); P.rect(2, 12, 12, 1, d); return; }
      if (L.style === 'cap' || L.style === 'bandana' || L.style === 'leather') { P.rect(3, 5, 10, 7, c); P.rect(4, 4, 8, 1, c); P.rect(2, 11, 12, 2, d); P.rect(5, 5, 3, 1, l); if (L.accent) { P.px(12, 3, L.accent); P.px(13, 2, L.accent); } return; }
      P.rect(3, 3, 10, 11, c); P.rect(4, 2, 8, 1, c); P.rect(4, 3, 3, 5, l); P.rect(12, 3, 1, 11, d);
      P.rect(4, 8, 8, 2, '#140c1c'); P.rect(7, 8, 2, 5, d); P.rect(3, 6, 10, 1, t);
      if (L.style === 'horned') { P.rect(1, 3, 2, 3, L.accent || '#e8e0c8'); P.px(0, 1, L.accent || '#e8e0c8'); P.px(0, 2, L.accent || '#e8e0c8'); P.rect(13, 3, 2, 3, L.accent || '#e8e0c8'); P.px(15, 1, L.accent || '#e8e0c8'); P.px(15, 2, L.accent || '#e8e0c8'); }
      if (L.style === 'knight') P.rect(7, 0, 3, 3, L.accent || '#c03030');
      if (L.glow) { P.px(5, 8, L.glow); P.px(10, 8, L.glow); }
    },
    chest(P, L) {
      const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3), t = L.trim || l;
      if (L.style === 'robe' || L.style === 'mage') { P.rect(4, 2, 8, 13, c); P.rect(2, 3, 3, 7, c); P.rect(11, 3, 3, 7, c); P.rect(7, 2, 2, 13, t); P.rect(3, 14, 10, 1, t); return; }
      P.rect(3, 3, 10, 11, c); P.rect(1, 3, 3, 6, c); P.rect(12, 3, 3, 6, c); P.rect(6, 2, 4, 2, '#140c1c');
      P.rect(3, 3, 10, 1, l); P.rect(12, 4, 1, 10, d); P.rect(3, 11, 10, 1, d);
      if (L.style === 'plate') { P.rect(0, 2, 5, 3, l); P.rect(11, 2, 5, 3, l); P.rect(7, 4, 2, 7, t); }
      if (L.style === 'chain') for (let y = 4; y < 11; y++) for (let x = 3 + (y % 2); x < 13; x += 2) P.px(x, y, d);
      if (L.style === 'leather') { P.rect(4, 6, 8, 1, d); P.px(6, 5, t); P.px(9, 5, t); }
      if (L.style === 'tunic') P.rect(6, 4, 4, 2, t);
      if (L.glow) P.rect(7, 6, 2, 2, L.glow);
    },
    legs(P, L) { const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3); P.rect(3, 2, 10, 3, c); P.rect(3, 5, 4, 10, c); P.rect(9, 5, 4, 10, c); P.rect(3, 2, 10, 1, l); P.rect(6, 5, 1, 10, d); P.rect(12, 5, 1, 10, d); if (L.style === 'plate') { P.rect(3, 8, 4, 2, l); P.rect(9, 8, 4, 2, l); } if (L.trim) P.rect(3, 4, 10, 1, L.trim); },
    feet(P, L) { const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3); P.rect(2, 4, 4, 8, c); P.rect(2, 12, 6, 3, c); P.rect(9, 4, 4, 8, c); P.rect(9, 12, 6, 3, c); P.rect(2, 4, 4, 1, l); P.rect(9, 4, 4, 1, l); P.rect(2, 14, 6, 1, d); P.rect(9, 14, 6, 1, d); if (L.trim) { P.rect(2, 6, 4, 1, L.trim); P.rect(9, 6, 4, 1, L.trim); } },
    hands(P, L) { const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3); P.rect(3, 5, 8, 9, c); P.rect(3, 2, 2, 4, c); P.rect(5, 1, 2, 5, c); P.rect(7, 1, 2, 5, c); P.rect(9, 2, 2, 4, c); P.rect(11, 7, 3, 3, c); P.rect(3, 12, 8, 2, L.trim || d); P.rect(3, 5, 1, 7, l); },
    cape(P, L) { const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3); P.rect(4, 1, 8, 3, c); P.rect(3, 4, 10, 10, c); P.rect(2, 10, 12, 5, c); P.rect(6, 4, 1, 10, d); P.rect(9, 4, 1, 10, d); P.rect(4, 1, 8, 1, l); if (L.trim) P.rect(2, 14, 12, 1, L.trim); if (L.glow) { P.px(5, 8, L.glow); P.px(11, 11, L.glow); } },
    offhand(P, L) {
      const c = L.color, d = U.shade(c, -0.3), l = U.shade(c, 0.3), t = L.trim || '#d8b040';
      if (L.style === 'orb' || L.style === 'tome') {
        if (L.style === 'tome') { P.rect(3, 2, 10, 12, c); P.rect(3, 2, 2, 12, d); P.rect(6, 5, 5, 4, t); if (L.glow) P.px(8, 7, L.glow); return; }
        P.circle(8, 8, 5, c); P.rect(6, 5, 2, 2, '#ffffff'); P.rect(4, 13, 8, 2, t); return;
      }
      P.rect(2, 2, 12, 10, c); P.rect(3, 12, 10, 1, c); P.rect(4, 13, 8, 1, c); P.rect(6, 14, 4, 1, c);
      P.rect(2, 2, 12, 1, t); P.rect(2, 2, 1, 10, t); P.rect(13, 2, 1, 10, d); P.rect(6, 5, 4, 5, L.accent || l);
      if (L.glow) P.rect(7, 6, 2, 3, L.glow);
    },
  };

  const MISC = {
    potion(P, c1, c2) { P.rect(6, 1, 4, 2, '#a07040'); P.rect(6, 3, 4, 2, '#d0e0f0'); P.circle(8, 10, 5, '#d0e0f0'); P.circle(8, 10, 4, c1); P.rect(5, 8, 2, 2, c2 || '#ffffff'); P.rect(4, 13, 8, 1, U.shade(c1, -0.3)); },
    ring(P, c1, c2) { P.circle(8, 9, 5, c1); P.circle(8, 9, 3, 'rgba(0,0,0,0)'); P.ctx.clearRect(6, 7, 5, 5); P.rect(6, 2, 4, 3, c2 || '#40c0ff'); P.px(7, 2, '#ffffff'); },
    amulet(P, c1, c2) { P.line(3, 1, 8, 8, '#c0a040'); P.line(13, 1, 8, 8, '#c0a040'); P.circle(8, 10, 4, c1); P.circle(8, 10, 2, c2 || '#ff4060'); P.px(7, 9, '#ffffff'); },
    blob(P, c1) { P.ellipse(8, 10, 6, 4, c1); P.ellipse(6, 8, 2, 1, U.shade(c1, 0.4)); },
    pelt(P, c1) { P.rect(3, 3, 10, 10, c1); P.rect(1, 5, 2, 3, c1); P.rect(13, 5, 2, 3, c1); P.rect(2, 12, 3, 3, c1); P.rect(11, 12, 3, 3, c1); P.rect(5, 5, 6, 6, U.shade(c1, 0.2)); },
    bone(P, c1) { P.rect(4, 7, 8, 2, c1 || '#e8e0d0'); P.circle(3, 6, 2, c1 || '#e8e0d0'); P.circle(3, 10, 2, c1 || '#e8e0d0'); P.circle(13, 6, 2, c1 || '#e8e0d0'); P.circle(13, 10, 2, c1 || '#e8e0d0'); },
    gem(P, c1) { P.rect(5, 3, 6, 2, U.shade(c1, 0.3)); P.rect(3, 5, 10, 3, c1); P.rect(5, 8, 6, 3, U.shade(c1, -0.2)); P.rect(7, 11, 2, 2, U.shade(c1, -0.35)); P.px(5, 5, '#ffffff'); },
    ore(P, c1) { P.ellipse(8, 9, 6, 5, '#6a6068'); P.px(6, 7, c1); P.px(9, 9, c1); P.px(7, 11, c1); P.px(10, 6, c1); P.rect(5, 6, 2, 1, U.shade(c1, 0.4)); },
    scroll(P, c1) { P.rect(3, 3, 10, 10, '#e8dcb0'); P.rect(2, 2, 12, 2, '#c8b890'); P.rect(2, 12, 12, 2, '#c8b890'); P.rect(5, 6, 6, 1, c1 || '#6a4a2a'); P.rect(5, 8, 5, 1, c1 || '#6a4a2a'); },
    key(P, c1) { P.circle(4, 8, 3, c1 || '#e0c040'); P.ctx.clearRect(3, 7, 2, 2); P.rect(7, 7, 8, 2, c1 || '#e0c040'); P.rect(12, 9, 1, 2, c1 || '#e0c040'); P.rect(14, 9, 1, 3, c1 || '#e0c040'); },
    feather(P, c1) { P.line(3, 13, 12, 2, '#e8e0d0'); for (let i = 0; i < 7; i++) { P.line(5 + i, 11 - i, 3 + i, 8 - i, c1); P.line(5 + i, 11 - i, 8 + i, 12 - i, c1); } },
    fang(P, c1) { P.rect(5, 2, 6, 3, c1 || '#e8e0d0'); P.rect(6, 5, 4, 4, c1 || '#e8e0d0'); P.rect(7, 9, 2, 4, c1 || '#e8e0d0'); P.px(7, 13, c1 || '#e8e0d0'); },
    food(P, c1) { P.circle(8, 9, 5, c1 || '#c04030'); P.rect(8, 2, 1, 3, '#6a4020'); P.rect(9, 3, 3, 2, '#40a040'); P.px(6, 7, '#ffffff'); },
    heart(P, c1) { P.circle(5, 6, 3, c1); P.circle(11, 6, 3, c1); for (let i = 0; i < 6; i++) P.rect(2 + i, 8 + i, 12 - i * 2, 1, c1); },
    crystal(P, c1) { P.rect(6, 1, 4, 13, c1); P.rect(6, 1, 1, 13, U.shade(c1, 0.5)); P.rect(3, 6, 3, 8, U.shade(c1, -0.15)); P.rect(10, 5, 3, 9, U.shade(c1, -0.25)); },
    letter(P, c1) { P.rect(2, 4, 12, 9, '#e8dcb0'); P.line(2, 4, 8, 9, '#a09070'); P.line(13, 4, 8, 9, '#a09070'); P.rect(7, 8, 2, 2, c1 || '#c03030'); },
    orb(P, c1) { P.circle(8, 8, 6, c1); P.circle(6, 6, 2, U.shade(c1, 0.5)); P.px(5, 5, '#ffffff'); },
    bag(P, c1) { P.ellipse(8, 10, 6, 5, c1 || '#a07040'); P.rect(6, 3, 4, 3, c1 || '#a07040'); P.rect(5, 5, 6, 1, '#6a4020'); P.rect(7, 9, 2, 2, '#ffd040'); },
  };
  IC.ARMOR = ARMOR; IC.MISC = MISC;

  IC.item = function (it) {
    return G.sprite('icon|' + it.id, 18, 18, (ctx) => {
      ctx.translate(1, 1);
      const P = G.painter(ctx);
      if (it.slot === 'weapon' && it.look) { ctx.translate(-4, -4); ctx.drawImage(R.Weapons.icon(it.look), 0, 0); return; }
      if (it.slot === 'offhand' && it.look && it.look.type) { ctx.translate(-4, -4); ctx.drawImage(R.Weapons.icon(it.look), 0, 0); return; }
      if (it.icon && MISC[it.icon.shape]) { MISC[it.icon.shape](P, it.icon.color || '#c0c0c0', it.icon.color2); return; }
      if (it.look && ARMOR[it.slot]) { ARMOR[it.slot](P, it.look); return; }
      if (it.slot === 'ring') { MISC.ring(P, '#d0b040', '#40c0ff'); return; }
      if (it.slot === 'amulet') { MISC.amulet(P, '#d0b040'); return; }
      MISC.bag(P);
    }, { outline: true });
  };

  // Skill icon: glyph drawn by the skill's icon painter, on a coloured gem background.
  IC.skill = function (sk) {
    return G.sprite('sicon|' + sk.id, 18, 18, (ctx) => {
      const col = (sk.icon && sk.icon.color) || '#808080';
      const P = G.painter(ctx);
      P.rect(1, 1, 16, 16, U.shade(col, -0.55));
      P.rect(2, 2, 14, 14, U.shade(col, -0.35));
      if (sk.icon && sk.icon.draw) sk.icon.draw(P, col, ctx);
      else { P.circle(9, 9, 4, col); P.px(8, 7, '#ffffff'); }
    });
  };
})(window.RPG);
