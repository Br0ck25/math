// =====================================================================
//  BOSS HELPERS AND THE TYPE CHART (the bosses themselves are in 02-data-core.js; Adventure fights are 24x-ow-battle.js and 24y-ow-arenas.js)
// =====================================================================
function getBossFormIndex(lvl) { return lvl >= 45 ? 2 : (lvl >= 20 ? 1 : 0); }
// Some bosses only appear once your buddy is strong enough (monster.minLevel).
function bossAvailable(i) { return (monstersList[i].minLevel || 0) <= getBuddyLevel(state.activePet); }

const TYPE_STRONG = {
  fire: ['nature', 'dark'],
  water: ['fire', 'magic'],
  nature: ['water', 'electric'],
  electric: ['water', 'magic'],
  dark: ['nature', 'electric'],
  magic: ['dark', 'fire']
};
// The element a fighter battles with: ultra-rare buddies always use Shadow power, whatever element badge they show.
function battleElement(p) { return p.ultra ? 'shadow' : p.element; }
function getTypeRelation(att, def) {
  if (att === 'shadow' || def === 'shadow') return 0;
  if ((TYPE_STRONG[att] || []).indexOf(def) !== -1) return 1;
  if ((TYPE_STRONG[def] || []).indexOf(att) !== -1) return -1;
  return 0;
}
// The buddy a slayer boss is strong against (shown on its cards).
function slayerTarget(boss) { const sp = boss.slays && getSpecies(boss.slays); return sp ? sp.name : ''; }
