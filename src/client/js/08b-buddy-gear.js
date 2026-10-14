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
    ctx.fillText(acc.renderIcon, gx, gy);
  }
  if (layer === 'front' && armor && armor.renderIcon) {
    const d = ARMOR_BADGE.size * size;
    const bx = cx + size / 2 - d / 2, by = cy + size / 2 - d / 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = ARMOR_TIER_COLORS[armor.tier] || '#94a3b8';
    ctx.lineWidth = Math.max(2, d * 0.07);
    ctx.beginPath(); ctx.arc(bx, by, d / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = ARMOR_BADGE.glyph * size + 'px ' + EMOJI_FONT;
    ctx.fillText(armor.renderIcon, bx, by + d * 0.04);
  }
  ctx.restore();
}
const ARMOR_TIER_COLORS = ['', '#94a3b8', '#60a5fa', '#facc15'];
