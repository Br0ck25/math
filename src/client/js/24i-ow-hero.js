// =====================================================================
//  THE ADVENTURE HERO and KEY ITEMS. The hero is a name (letters only, at most 10, kept on this save and never shown to other players) and a look,
//  saved as indexes into the palettes below (never trust a colour from a save). Key items are earned on the Adventure, never bought or lost.
// =====================================================================
const HERO_SKINS = [['#F8D9BE', 'Light'], ['#F2C9A0', 'Fair'], ['#E0A878', 'Tan'], ['#C68642', 'Warm brown'], ['#8D5524', 'Brown'], ['#5C3A1E', 'Deep brown']];
const HERO_HAIRS = [['#2B1B10', 'Black'], ['#5B3A1E', 'Brown'], ['#A0522D', 'Auburn'], ['#D9A441', 'Honey'], ['#E8D27A', 'Blond'], ['#C0392B', 'Red'], ['#5B6EE1', 'Blue'], ['#EC4899', 'Pink']];
const HERO_OUTFITS = [['#3B82F6', 'Blue'], ['#EF4444', 'Red'], ['#22C55E', 'Green'], ['#F59E0B', 'Orange'], ['#A855F7', 'Purple'], ['#14B8A6', 'Teal'], ['#EC4899', 'Pink'], ['#64748B', 'Gray']];
const HERO_STYLES = ['Short', 'Long', 'Spiky', 'Ponytail'];
const HERO_NAMES = ['Sam', 'Alex', 'Jamie', 'Casey', 'Taylor', 'Morgan', 'Skye', 'Rowan'];
const HERO_NAME_MAX = 10;
const KEY_ITEMS = [
  { id: 'badge-case', name: 'Badge Case', text: 'Keeps the gym badges you win.', art: 'k-badge-case' },
  { id: 'running-shoes', name: 'Running Shoes', text: 'Hold a direction on the map to walk faster.', art: 'k-shoes' }
];
function hasKeyItem(id) { return state.keyItems.indexOf(id) !== -1; }
// True when the item is new (the caller saves).
function grantKeyItem(id) {
  if (hasKeyItem(id) || !KEY_ITEMS.some(function (k) { return k.id === id; })) return false;
  state.keyItems.push(id);
  return true;
}
function cleanHeroName(s) { return String(s === undefined || s === null ? '' : s).replace(/[^A-Za-z ]/g, '').replace(/ +/g, ' ').trim().slice(0, HERO_NAME_MAX); }
function heroName() { return state.hero.name || 'Explorer'; }
// The look as the CSS colours heroSprite() takes.
function heroLookColors(look) {
  const l = look || state.hero.look;
  return { skin: HERO_SKINS[l.skin][0], hair: HERO_HAIRS[l.hair][0], outfit: HERO_OUTFITS[l.outfit][0], style: l.style };
}

// ----- the creator: Who are you? -----
let heroDraft = null, heroFirst = false;
function openHeroCreator() {
  heroFirst = !state.hero.made;
  heroDraft = { name: state.hero.name, look: Object.assign({}, state.hero.look) };
  showModal('hero-modal', function () {
    document.getElementById('hero-title').innerText = heroFirst ? 'Who are you?' : 'Change your look';
    document.getElementById('hero-go').innerText = heroFirst ? 'Start the adventure' : 'Done';
    document.getElementById('hero-name').value = heroDraft.name;
    renderHeroCreator();
  });
}
function closeHeroCreator() { hideModal('hero-modal', function () { heroDraft = null; }); }
function heroSwatches(group, list, label) {
  return '<div class="hero-group" role="group" aria-label="' + label + '"><div class="hero-label">' + label + '</div><div class="hero-row">' + list.map(function (c, i) {
    const on = heroDraft.look[group] === i;
    return '<button type="button" class="hero-swatch' + (on ? ' on' : '') + '" style="background:' + c[0] + '" aria-label="' + label + ': ' + c[1] + '" aria-pressed="' + on + '" onclick="heroPick(\'' + group + '\',' + i + ')"></button>';
  }).join('') + '</div></div>';
}
function renderHeroCreator() {
  const d = heroDraft, colors = heroLookColors(d.look);
  document.getElementById('hero-preview').innerHTML = heroSprite(colors, 'down', 0);
  document.getElementById('hero-names').innerHTML = HERO_NAMES.map(function (n) { return '<button type="button" class="hero-chip" onclick="heroPickName(\'' + n + '\')">' + n + '</button>'; }).join('');
  const styles = '<div class="hero-group" role="group" aria-label="Hair style"><div class="hero-label">Hair style</div><div class="hero-row">' + HERO_STYLES.map(function (s, i) {
    const on = d.look.style === i;
    return '<button type="button" class="hero-swatch hero-style' + (on ? ' on' : '') + '" aria-label="Hair style: ' + s + '" aria-pressed="' + on + '" onclick="heroPick(\'style\',' + i + ')">' + heroSprite(Object.assign({}, colors, { style: i }), 'down', 0) + '</button>';
  }).join('') + '</div></div>';
  document.getElementById('hero-picks').innerHTML = heroSwatches('skin', HERO_SKINS, 'Skin') + styles + heroSwatches('hair', HERO_HAIRS, 'Hair colour') + heroSwatches('outfit', HERO_OUTFITS, 'Outfit');
}
function heroPick(group, i) {
  if (!heroDraft) return;
  heroDraft.look[group] = i;
  soundClick();
  renderHeroCreator();
}
function heroNameTyped() {
  const el = document.getElementById('hero-name'), v = el.value.replace(/[^A-Za-z ]/g, '').slice(0, HERO_NAME_MAX);
  if (v !== el.value) el.value = v;                                  // letters and spaces only, as you type
  heroDraft.name = v;
}
function heroPickName(n) {
  document.getElementById('hero-name').value = n;
  heroDraft.name = n;
  soundClick();
}
function finishHero() {
  if (!heroDraft) return;
  const first = heroFirst;
  state.hero = { name: cleanHeroName(heroDraft.name), look: Object.assign({}, heroDraft.look), made: true };
  const got = first ? [grantKeyItem('badge-case'), grantKeyItem('running-shoes')].some(Boolean) : false;
  saveState();
  closeHeroCreator();
  if (first) {
    if (got) toast('You got the Badge Case and the Running Shoes!');
    showAdventureWindow();
  } else if (document.getElementById('bag-modal').style.display === 'flex') renderBag();
}
