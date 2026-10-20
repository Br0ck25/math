// =====================================================================
//  THE LIGHTHOUSE (Gold's sick Amphy): the Keeper's buddy in Tide Bay is ill. Healer Mei in Gloom Marsh makes the Secret Potion once you hold the Gloom Badge;
//  bring it to the Keeper for a reward. A fetch quest across the map, kept in the story list (OW_STORY 'lighthouse') and the key item 'secret-potion'.
// =====================================================================
owAddNpc('gloom-house', { id: 'gloom-mei', kind: 'gift', gift: 'secret-potion', needs: 'gloom', name: 'Healer Mei', x: 2, y: 2, face: 'down', look: { skin: 3, hair: 5, outfit: 5, style: 1 },
  lines: ['I brew medicine from the marsh herbs. A buddy in Tide Bay is very sick, I hear.', 'Take this Secret Potion to the Lighthouse Keeper. Quickly!'], after: ['I am out of Secret Potion, but the Keeper in Tide Bay will be glad of the one you carry.'] });
OW_SERVICES.lighthouse = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  if (state.overworld.story.indexOf('lighthouse') !== -1) { openTalk({ name: npc.name, art: art, lines: ['The light shines again, and my buddy is fine. Thank you, friend!'] }); return; }
  if (!hasKeyItem('secret-potion')) { openTalk({ name: npc.name, art: art, lines: ['My buddy that keeps the lighthouse bright is very sick. Nothing I have helps.', 'They say a healer in Gloom Marsh makes a Secret Potion. She only trusts trainers who hold the Gloom Badge.'] }); return; }
  openTalk({ name: npc.name, art: art, lines: ['Is that... the Secret Potion?! Please, give it here!'], choices: [{ label: 'Give the Secret Potion', run: function () {
    closeTalk();
    state.keyItems = state.keyItems.filter(function (k) { return k !== 'secret-potion'; });
    owStoryDone('lighthouse');
    state.items.stone = Math.min(99, (state.items.stone || 0) + 1); state.items.revive = Math.min(99, (state.items.revive || 0) + 2);
    saveState();
    openTalk({ name: npc.name, art: art, lines: ['The buddy opens its eyes and the lighthouse glows again. You saved it!', 'Please take this Evolution Stone and two Revives as thanks.'] });
  } }] });
};
owAddNpc('tide-house', { id: 'tide-pharos', kind: 'lighthouse', name: 'Keeper Pharos', x: 5, y: 2, face: 'down', look: { skin: 1, hair: 7, outfit: 3, style: 0 }, lines: ['The Lighthouse Keeper.'] });
