// ----- trading card -----
function rarityOf(id) {
  const sp = getSpecies(id) || {};
  if (sp.isJanie) return { name: 'COSMIC', col: '#e879f9' };
  if (sp.mythic) return { name: 'MYTHIC', col: '#f43f5e' };
  if (sp.secret) return { name: 'LEGENDARY', col: '#fbbf24' };
  if ((sp.cost || 0) >= 400) return { name: 'EPIC', col: '#a78bfa' };
  if ((sp.cost || 0) >= 150) return { name: 'RARE', col: '#38bdf8' };
  return { name: 'COMMON', col: '#94a3b8' };
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function drawCard(cv, id) {
  const W = 600, H = 840;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const d = getPetById(id);
  const rar = rarityOf(id);
  const ec = ELEM_COLORS[d.element] || '#6366f1';
  const sleepy = isSleepy(id);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, ec);
  g.addColorStop(0.55, '#1e1b4b');
  g.addColorStop(1, '#0f172a');
  ctx.fillStyle = g;
  rrect(ctx, 0, 0, W, H, 36); ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = rar.col;
  rrect(ctx, 8, 8, W - 16, H - 16, 30); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  rrect(ctx, 26, 26, W - 52, H - 52, 20); ctx.stroke();
  ctx.textBaseline = 'middle';
  // name + level
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name, 48, 66);
  ctx.textAlign = 'right'; ctx.fillStyle = '#fde047';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('Lv ' + d.level, W - 48, 66);
  // art box
  const art = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 260);
  art.addColorStop(0, 'rgba(255,255,255,0.35)');
  art.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = art;
  rrect(ctx, 48, 110, W - 96, 440, 24); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
  ctx.textAlign = 'center';
  let fs = 250;
  ctx.font = fs + 'px ' + EMOJI_FONT;
  while (ctx.measureText(d.icon).width > 400 && fs > 90) { fs -= 20; ctx.font = fs + 'px ' + EMOJI_FONT; }
  ctx.globalAlpha = sleepy ? 0.55 : 1;
  ctx.fillText(d.icon, W / 2, 335);
  ctx.globalAlpha = 1;
  if (sleepy) { ctx.font = '70px ' + EMOJI_FONT; ctx.fillText('💤', W - 120, 170); }
  // gear
  const acc = accessoriesList.find(function (a) { return a.id === state.activeAccessory; });
  const arm = getArmor(state.activeArmor);
  ctx.font = '56px ' + EMOJI_FONT;
  if (id === state.activePet) {
    if (acc && acc.renderIcon) ctx.fillText(acc.renderIcon, 110, 180);
    if (arm.renderIcon) ctx.fillText(arm.renderIcon, 110, 500);
  }
  // type pill + stars
  ctx.fillStyle = ec;
  rrect(ctx, 48, 575, 190, 46, 23); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillText(d.element.toUpperCase(), 143, 599);
  ctx.textAlign = 'right'; ctx.fillStyle = '#fde047'; ctx.font = '36px ' + EMOJI_FONT;
  ctx.fillText(d.stage === 0 ? '⭐' : (d.stage === 1 ? '⭐⭐' : '⭐⭐⭐'), W - 48, 599);
  // stats
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rrect(ctx, 48, 640, W - 96, 84, 18); ctx.fill();
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillText('❤️ ' + getPetMaxHp(id), 150, 668);
  ctx.fillText('⚔️ ' + getPetAttack(id), 300, 668);
  ctx.fillText('🏆 ' + state.tour.trophies, 450, 668);
  ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#c7d2fe';
  ctx.fillText('HP', 150, 703); ctx.fillText('Attack', 300, 703); ctx.fillText('Trophies', 450, 703);
  // super move + bond
  ctx.font = '800 26px system-ui, sans-serif'; ctx.fillStyle = '#fde68a';
  ctx.fillText('⚡ ' + d.superMove, W / 2, 755);
  ctx.font = '28px ' + EMOJI_FONT;
  ctx.fillText(heartsHtml(getBond(id)), W / 2, 793);
  // rarity ribbon
  ctx.fillStyle = rar.col;
  rrect(ctx, W / 2 - 110, 812 - 6, 220, 0.1, 1);
  ctx.font = '900 20px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.fillStyle = rar.col;
  ctx.fillText('◆ ' + rar.name, 48, 812);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('MATH QUEST', W - 48, 812);
}
function renderCardTab() {
  const rar = rarityOf(hubPet);
  document.getElementById('hub-body').innerHTML =
    '<canvas class="card-canvas" id="card-canvas"></canvas>' +
    '<div style="font-size:0.72rem; font-weight:800; color:' + rar.col + ';">◆ ' + rar.name + ' card</div>' +
    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">' +
    '<button class="grade-btn" onclick="cardSave()">💾 Save image</button>' +
    '<button class="grade-btn" onclick="cardShare()">📤 Share</button></div>';
  drawCard(document.getElementById('card-canvas'), hubPet);
}
function cardBlob(cb) { document.getElementById('card-canvas').toBlob(cb, 'image/png'); }
function cardSave() {
  cardBlob(function (blob) {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'math-quest-' + hubPet + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('🃏 Card saved!');
  });
}
function cardShare() {
  cardBlob(function (blob) {
    if (!blob) return;
    const file = new File([blob], 'math-quest-' + hubPet + '.png', { type: 'image/png' });
    const d = getPetById(hubPet);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: d.name + ' — Math Quest', text: 'Check out my ' + d.name + '! Lv ' + d.level }).catch(function () {});
    } else {
      cardSave();
    }
  });
}
