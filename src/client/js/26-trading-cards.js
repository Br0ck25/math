// ----- trading card -----
function rarityOf(id) {
  const sp = getSpecies(id) || {};
  if (sp.legend) return { name: 'LEGEND', col: '#fde047' };
  if (sp.bossBuddy) return { name: 'BOSS', col: '#f87171' };
  if (sp.ultra) return { name: 'COSMIC', col: '#e879f9' };
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
// A card is plain data, so buddies and bosses share one renderer:
//   {name, levelText, icon, element, rarity:{name,col}, stars, stats:[[emoji, value, label] x3], line, foot, sleepy, gear}
function buddyCard(id) {
  const d = getPetById(id);
  return {
    name: d.name, levelText: 'Lv ' + d.level, icon: d.icon, element: d.element, rarity: rarityOf(id), stars: d.stage + 1,
    stats: [['❤️', getPetMaxHp(id), 'HP'], ['⚔️', getPetAttack(id), 'Attack'], ['🏆', state.tour.trophies, 'Trophies']],
    line: '⚡ ' + d.superMove, foot: heartsHtml(getBond(id)), sleepy: isSleepy(id), stage: d.stage,
    gear: id === state.activePet ? activeGear() : { acc: null, armor: null }    // gear belongs to the active buddy
  };
}
// opts.level / opts.form describe the boss currently in the arena; without them the card shows the best form you have beaten.
function bossCard(idx, opts) {
  opts = opts || {};
  const base = monstersList[idx];
  const seen = state.bossBook[idx] || { wins: 0, form: -1 };
  const form = opts.level ? getBossFormIndex(opts.level) : Math.max(0, seen.form);
  const raid = !!opts.raid;
  const weak = opts.level && currentMonsterIndex === idx ? getWeakOp() : weakOpForBoss(idx);
  const tough = !!(opts.level && currentMonsterIndex === idx && state.bossSwapped);       // a backup boss is tougher
  const hp = base.baseHp + (opts.level ? Math.floor(opts.level / 3) : 0) + form * 2 + (raid ? 2 : 0) + (tough ? ECON.boss.swap.extraHp : 0);
  return {
    name: (raid ? '👑 ' : '') + (form === 2 ? 'Alpha ' : form === 1 ? 'Elder ' : '') + base.name,
    levelText: opts.level ? 'Lv ' + opts.level : 'Lv ?', icon: base.icon, element: base.element,
    rarity: raid ? { name: 'RAID BOSS', col: '#ef4444' } : [null, null, null, { name: 'COMMON', col: '#94a3b8' }, { name: 'RARE', col: '#38bdf8' }, { name: 'EPIC', col: '#a78bfa' }, { name: 'LEGENDARY', col: '#fbbf24' }][clamp(base.baseHp, 3, 6)],
    stars: form + 1,
    stats: [['❤️', opts.level ? hp : '~' + hp, 'HP'], ['⚔️', bossAtk(base, opts.level || 0, form) + (tough ? ECON.boss.swap.extraAtk : 0), 'Attack'], ['🏅', seen.wins, 'Beaten']],
    line: '"' + base.taunts[0] + '"',
    foot: base.slays ? '☠️ Strong against ' + slayerTarget(base) : weak ? '🎯 Weak point: ' + OP_BY_ID[weak].icon + ' ' + OP_BY_ID[weak].label : '', sleepy: false, gear: { acc: null, armor: null }
  };
}
// A wild buddy's card: its stats at the level it has in the arena, how likely you are to catch it, and whether you own it.
function wildCard(id, level) {
  const sp = getSpecies(id), st = wildStats(level), shiny = state.wild.shiny && state.wild.id === id, owned = getOwnedIds().indexOf(id) !== -1;
  return {
    name: (shiny ? '✨ ' : '') + sp.name, levelText: 'Lv ' + level, icon: sp.icon, element: sp.element, rarity: shiny ? { name: 'DAILY RARE', col: '#facc15' } : rarityOf(id), stars: shiny ? 2 : 1,
    stats: [['❤️', shiny ? Math.ceil(st.maxHp * ECON.daily.hpMult) : st.maxHp, 'HP'], ['⚔️', st.atk, 'Attack'], ['🫧', state.wild.trainer ? '—' : Math.round(wildCatchChance(sp, { shiny: shiny }) * 100) + '%', 'Catch']],
    line: '⚡ ' + sp.superMove, foot: owned ? '✅ In your collection' + (spareCount(id) ? ' · ' + spareCount(id) + ' spare' + (spareCount(id) > 1 ? 's' : '') : '') : '🆕 Not in your collection yet',
    sleepy: false, stage: 0, gear: { acc: null, armor: null }
  };
}
function drawCardFromDesc(cv, c) {
  const W = 600, H = 840;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const ec = ELEM_COLORS[c.element] || '#6366f1';
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, ec);
  g.addColorStop(0.55, '#1e1b4b');
  g.addColorStop(1, '#0f172a');
  ctx.fillStyle = g;
  rrect(ctx, 0, 0, W, H, 36); ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = c.rarity.col;
  rrect(ctx, 8, 8, W - 16, H - 16, 30); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  rrect(ctx, 26, 26, W - 52, H - 52, 20); ctx.stroke();
  ctx.textBaseline = 'middle';
  // name + level
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.font = '900 40px system-ui, sans-serif, ' + EMOJI_FONT;
  ctx.fillText(c.name.length > 17 ? c.name.slice(0, 16) + '…' : c.name, 48, 66);
  ctx.textAlign = 'right'; ctx.fillStyle = '#fde047';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText(c.levelText, W - 48, 66);
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
  while (ctx.measureText(c.icon).width > 400 && fs > 90) { fs -= 20; ctx.font = fs + 'px ' + EMOJI_FONT; }
  drawForm(ctx, c.stage, c.element, W / 2, 335, fs, 'behind');
  drawGear(ctx, c.gear.acc, c.gear.armor, W / 2, 335, fs, 'behind');
  ctx.font = fs + 'px ' + EMOJI_FONT;
  ctx.globalAlpha = c.sleepy ? 0.55 : 1;
  if (c.stage) { ctx.shadowColor = ec; ctx.shadowBlur = 22 + 14 * (c.stage - 1); }
  fillEmoji(ctx, c.icon, W / 2, 335);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  drawForm(ctx, c.stage, c.element, W / 2, 335, fs, 'front');
  drawGear(ctx, c.gear.acc, c.gear.armor, W / 2, 335, fs, 'front');
  if (c.sleepy) { ctx.font = '70px ' + EMOJI_FONT; fillEmoji(ctx, '💤', W - 120, 170); }
  // type pill + stars
  ctx.fillStyle = ec;
  rrect(ctx, 48, 575, 190, 46, 23); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillText(c.element.toUpperCase(), 143, 599);
  ctx.textAlign = 'right'; ctx.fillStyle = '#fde047'; ctx.font = '36px ' + EMOJI_FONT;
  ctx.fillText('⭐'.repeat(clamp(c.stars, 1, 3)), W - 48, 599);
  // stats
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rrect(ctx, 48, 640, W - 96, 84, 18); ctx.fill();
  ctx.textAlign = 'center';
  c.stats.forEach(function (st, i) {
    const x = 150 + i * 150;
    ctx.fillStyle = '#fff'; ctx.font = '900 30px system-ui, sans-serif, ' + EMOJI_FONT;
    ctx.fillText(st[0] + ' ' + st[1], x, 668);
    ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#c7d2fe';
    ctx.fillText(st[2], x, 703);
  });
  // line (super move / taunt) and footer (bond hearts / weak point)
  ctx.fillStyle = '#fde68a';
  let lf = 26;
  ctx.font = '800 ' + lf + 'px system-ui, sans-serif, ' + EMOJI_FONT;
  while (ctx.measureText(c.line).width > W - 110 && lf > 14) { lf -= 2; ctx.font = '800 ' + lf + 'px system-ui, sans-serif, ' + EMOJI_FONT; }
  ctx.fillText(c.line, W / 2, 750);
  ctx.fillStyle = '#fff';
  ctx.font = '700 26px system-ui, sans-serif, ' + EMOJI_FONT;
  ctx.fillText(c.foot, W / 2, 778);
  // rarity + brand
  ctx.font = '900 20px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.fillStyle = c.rarity.col;
  ctx.fillText('◆ ' + c.rarity.name, 52, 800);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('MATH QUEST', W - 52, 800);
}
function drawCard(cv, id) { drawCardFromDesc(cv, buddyCard(id)); }
function renderCardTab() {
  const rar = rarityOf(hubPet);
  document.getElementById('hub-body').innerHTML =
    '<canvas class="card-canvas" id="card-canvas"></canvas>' +
    '<div style="font-size:0.72rem; font-weight:800; color:' + rar.col + ';">◆ ' + rar.name + ' card</div>' +
    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">' +
    '<button class="grade-btn" onclick="cardSave(&quot;card-canvas&quot;, hubPet)">💾 Save image</button>' +
    '<button class="grade-btn" onclick="cardShare(&quot;card-canvas&quot;, hubPet, getPetById(hubPet).name)">📤 Share</button></div>';
  drawCard(document.getElementById('card-canvas'), hubPet);
}
function cardBlob(canvasId, cb) { document.getElementById(canvasId).toBlob(cb, 'image/png'); }
function cardSave(canvasId, slug) {
  cardBlob(canvasId, function (blob) {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'math-quest-' + slug + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('🃏 Card saved!');
  });
}
function cardShare(canvasId, slug, title) {
  cardBlob(canvasId, function (blob) {
    if (!blob) return;
    const file = new File([blob], 'math-quest-' + slug + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: title + ' — Math Quest', text: 'Check out ' + title + ' in Math Quest!' }).catch(function () {});
    } else {
      cardSave(canvasId, slug);
    }
  });
}

// ----- boss cards: tap the boss in the arena, or a met boss in the collection book -----
let bossCardArgs = { idx: 0, opts: {} };
function renderBossCard() {
  const wildId = bossCardArgs.wild;
  const c = wildId ? wildCard(wildId, bossCardArgs.opts.level) : bossCard(bossCardArgs.idx, bossCardArgs.opts);
  document.getElementById('boss-card-title').innerText = wildId ? '🫧 Wild Buddy Card' : '👾 Boss Card';
  drawCardFromDesc(document.getElementById('boss-canvas'), c);
  document.getElementById('boss-card-rarity').innerText = '◆ ' + c.rarity.name + ' card';
  document.getElementById('boss-card-rarity').style.color = c.rarity.col;
}
function openBossCard(idx, opts) {
  bossCardArgs = { idx: idx, opts: opts || {}, wild: '' };
  showModal('bosscard-modal', renderBossCard);
}
function openArenaBossCard() {
  if (state.wild.id) {
    bossCardArgs = { idx: -1, opts: { level: bossLevel }, wild: state.wild.id };
    showModal('bosscard-modal', renderBossCard);
    return;
  }
  openBossCard(currentMonsterIndex, { level: bossLevel, raid: !!state.raid });
}
function closeBossCard() { hideModal('bosscard-modal'); }
