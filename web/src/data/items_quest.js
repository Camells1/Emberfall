'use strict';
// Quest items (story shards, keys, letters). Quest items cannot be sold.
(function (R) {
  const add = R.addItem;
  const shard = (n, name, color, color2, desc) => add({ id: 'ember_shard_' + n, name, slot: 'quest', rarity: 'legendary', price: 0, icon: { shape: 'crystal', color, color2 }, desc });
  shard(1, 'Verdant Ember Shard', '#80ff80', '#ffd040', 'Pulled from the jelly of Gloopus. It is warm, and it hums.');
  shard(2, 'Venom Ember Shard', '#a0ff40', '#ff6020', 'Wrapped in silk from the Broodmother\'s nest. Still faintly sticky.');
  shard(3, 'Sunfire Ember Shard', '#ffd040', '#ff8020', 'Anhotep wore it as a crown-jewel for a thousand years.');
  shard(4, 'Rime Ember Shard', '#80d8ff', '#ffffff', 'Frost clings to it, yet it burns to the touch.');
  shard(5, 'Molten Ember Shard', '#ff6020', '#ffd060', 'Torn from the heart of Pyrrhus. It never stops glowing.');
  add({ id: 'ember_crown', name: 'The Ember Crown', slot: 'quest', rarity: 'mythic', price: 0, icon: { shape: 'gem', color: '#ff9020' }, desc: 'Reforged from five shards. Its flame can part the black fire of the Hollow King.' });
  add({ id: 'sun_key', name: 'Sun Key', slot: 'quest', rarity: 'rare', price: 0, icon: { shape: 'key', color: '#ffd040' }, desc: 'A golden key shaped like the sun. It opens the Tomb of Anhotep.' });
  add({ id: 'wedding_ring', name: "Wendel's Wedding Ring", slot: 'quest', rarity: 'uncommon', price: 0, icon: { shape: 'ring', color: '#e0c040', color2: '#ff80a0' }, desc: 'Engraved: "To W., from M. Don\'t lose it."' });
  add({ id: 'millers_diary', name: "Otto's Diary", slot: 'quest', rarity: 'uncommon', price: 0, icon: { shape: 'scroll', color: '#6a4a2a' }, desc: '"Day 40: Still owe Brom 300 gold. Day 41: The swamp is lovely this time of year."' });
  add({ id: 'caravan_ledger', name: 'Caravan Ledger', slot: 'quest', rarity: 'uncommon', price: 0, icon: { shape: 'scroll', color: '#8a3a2a' }, desc: 'The last entries mention a "golden key, sold to the bandits".' });
  add({ id: 'bess_letter', name: "Bess's Letter", slot: 'quest', rarity: 'common', price: 0, icon: { shape: 'letter', color: '#c03030' }, desc: 'Addressed to Hassan, Oasis of Saffar. Smells of cinnamon.' });
})(window.RPG);
