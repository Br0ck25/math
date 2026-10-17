// =====================================================================
//  BUDDY GEAR: where accessories and body armor sit on a buddy
//  Every accessory has a slot (head, face, neck, back, side, aura). Positions are fractions of the buddy's own
//  size, so the same table places gear on the battle screen, the buddy hub and the trading card.
//  Body armor is a badge in the bottom-right corner so it never hides the buddy's face.
// =====================================================================
// x,y: anchor point inside the buddy (0..1). dx,dy: how far the gear's own box shifts from that point
// (-0.5 centres it). size: gear size as a fraction of the buddy. z: 1 = behind the buddy, 5 = in front.
const GEAR_SLOTS = {
  head: { x: 0.5, y: 0.1, dx: -0.5, dy: -0.75, size: 0.5, z: 5 },
  face: { x: 0.5, y: 0.62, dx: -0.5, dy: -0.5, size: 0.28, z: 5 },
  neck: { x: 0.5, y: 0.9, dx: -0.5, dy: -0.5, size: 0.3, z: 5 },
  back: { x: 0.0, y: 0.5, dx: -0.6, dy: -0.5, size: 0.46, z: 1 },
  side: { x: 0.98, y: 0.38, dx: -0.75, dy: -0.5, size: 0.44, z: 5 },
  aura: { x: 0.5, y: 0.5, dx: -0.5, dy: -0.5, size: 1.0, z: 1, opacity: 0.4 }
};
const ARMOR_BADGE = { size: 0.42, glyph: 0.28 };

// Draws an emoji on a canvas. iPhone Safari paints a colour emoji as a flat silhouette filled with whatever
// fillStyle is current (a gradient made the buddies on trading cards look like grey ghosts), so emoji always get
// a plain opaque fill. Use this for EVERY emoji drawn on a canvas; tests/cards.test.mjs enforces it.
function fillEmoji(ctx, text, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// The accessory and armor the active buddy is wearing.
function activeGear() {
  return {
    acc: accessoriesList.find(function (a) { return a.id === state.activeAccessory; }) || accessoriesList[0],
    armor: getArmor(state.activeArmor)
  };
}

// Markup for the gear layer placed over a buddy whose box defines --u (its size in px).
function gearMarkup(acc, armor) {
  let h = '';
  const slot = acc && acc.slot && GEAR_SLOTS[acc.slot];
  if (slot) {
    h += '<span class="gear gear-' + acc.slot + '" title="' + escHtml(acc.name) + '" style="left:' + (slot.x * 100) + '%; top:' + (slot.y * 100) + '%; z-index:' + slot.z +
      '; font-size:calc(var(--u) * ' + slot.size + '); transform:translate(' + (slot.dx * 100) + '%, ' + (slot.dy * 100) + '%);' + (slot.opacity ? ' opacity:' + slot.opacity + ';' : '') + '">' + acc.renderIcon + '</span>';
  }
  if (armor && armor.renderIcon) {
    h += '<span class="armor-badge t' + armor.tier + '" title="' + escHtml(armor.name) + '" style="width:calc(var(--u) * ' + ARMOR_BADGE.size + '); height:calc(var(--u) * ' + ARMOR_BADGE.size +
      '); font-size:calc(var(--u) * ' + ARMOR_BADGE.glyph + ');">' + armor.renderIcon + '</span>';
  }
  return h;
}

// Same placement on a canvas (trading card). (cx, cy) is the buddy's centre and `size` its width in px.
// layer 'behind' draws slots with z < 3, 'front' the rest plus the armor badge.
function drawGear(ctx, acc, armor, cx, cy, size, layer) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const slot = acc && acc.slot && GEAR_SLOTS[acc.slot];
  if (slot && (slot.z < 3) === (layer === 'behind')) {
    const px = slot.size * size;
    const gx = cx - size / 2 + slot.x * size + (slot.dx + 0.5) * px;
    const gy = cy - size / 2 + slot.y * size + (slot.dy + 0.5) * px;
    ctx.globalAlpha = slot.opacity || 1;
    ctx.font = px + 'px ' + EMOJI_FONT;
    fillEmoji(ctx, acc.renderIcon, gx, gy);
  }
  if (layer === 'front' && armor && armor.renderIcon) {
    const d = ARMOR_BADGE.size * size;
    const bx = cx + size / 2 - d / 2, by = cy + size / 2 - d / 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = ARMOR_TIER_COLORS[armor.tier] || '#94a3b8';
    ctx.lineWidth = Math.max(2, d * 0.07);
    ctx.beginPath(); ctx.arc(bx, by, d / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = ARMOR_BADGE.glyph * size + 'px ' + EMOJI_FONT;
    fillEmoji(ctx, armor.renderIcon, bx, by + d * 0.04);
  }
  ctx.restore();
}
const ARMOR_TIER_COLORS = ['', '#94a3b8', '#60a5fa', '#facc15'];

// =====================================================================
//  EVOLUTION LOOK: evolved buddies keep their own face, plus a glow in their element's colour,
//  an element badge, and (final form) a faint aura and sparkle. No per-buddy art needed.
// =====================================================================
const ELEM_EMOJI = { fire: '🔥', water: '💧', nature: '🌿', electric: '⚡', dark: '🌑', magic: '✨', shadow: '🌌' };
function elemColor(element) { return ELEM_COLORS[element] || '#a855f7'; }

// Decoration layer for a buddy at evolution `stage` (0 = none). Sized from the --u of the box it is placed in.
function formMarkup(stage, element) {
  if (!stage) return '';
  const em = ELEM_EMOJI[element] || '⭐';
  let h = '<span class="evo-badge" style="width:calc(var(--u) * 0.34); height:calc(var(--u) * 0.34); font-size:calc(var(--u) * 0.2);">' + em + '</span>';
  if (stage === 1) {
    h += '<span class="evo-crest" aria-hidden="true"></span>';
  }
  if (stage >= 2) {
    h += '<span class="evo-wings" aria-hidden="true"></span>';
    h += '<span class="evo-crown" aria-hidden="true" style="font-size:calc(var(--u) * 0.28);">👑</span>';
    h += '<span class="evo-runes" aria-hidden="true">✦</span>';
    h += '<span class="evo-aura" style="font-size:calc(var(--u) * 1.15);">' + em + '</span>';
    h += '<span class="evo-spark" style="font-size:calc(var(--u) * 0.26);">✨</span>';
  }
  return h;
}
// A buddy picture of `px` pixels with its evolution look (and optional extra gear markup) for menus and modals.
function avatarHtml(pet, px, gearHtml) {
  return '<span class="buddy-avatar' + (state.shinies[pet.id] ? ' shiny' : '') + ' stage-wrap-' + (pet.stage || 0) + '" style="--u:' + px + 'px; --evo:' + elemColor(pet.element) + ';"><span class="buddy-glyph stage-' + pet.stage + '">' + pet.icon +
    '</span><span class="gear-layer">' + formMarkup(pet.stage, pet.element) + (gearHtml || '') + '</span></span>';
}
// Same look on the trading card canvas. layer 'behind' draws the aura, 'front' the badge and sparkle.
function drawForm(ctx, stage, element, cx, cy, size, layer) {
  if (!stage) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = ELEM_EMOJI[element] || '⭐';
  const col = elemColor(element);
  if (layer === 'behind' && stage === 1) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, size * 0.03);
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.52, 0, Math.PI * 2); ctx.stroke();
  }
  if (layer === 'behind' && stage >= 2) {
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(4, size * 0.04);
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.58, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.font = size * 1.15 + 'px ' + EMOJI_FONT;
    fillEmoji(ctx, glyph, cx, cy);
  }
  if (layer === 'front') {
    const d = size * 0.34, bx = cx - size / 2 + d * 0.15, by = cy - size / 2 + d * 0.15;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, d * 0.07);
    ctx.beginPath(); ctx.arc(bx, by, d / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = size * 0.2 + 'px ' + EMOJI_FONT;
    fillEmoji(ctx, glyph, bx, by + d * 0.03);
    if (stage >= 2) {
      ctx.font = size * 0.26 + 'px ' + EMOJI_FONT;
      fillEmoji(ctx, '✨', cx + size * 0.42, cy - size * 0.42);
      fillEmoji(ctx, '👑', cx, cy - size * 0.46);
    }
  }
  ctx.restore();
}
