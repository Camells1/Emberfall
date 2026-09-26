# Emberfall — design plan

> **Shipped:** all 13 zones below. Bosses use the three-phase kit in `web/src/data/content.js` (`R.BossKit`); the story is `main_1`–`main_10` in `quests.js`, `content.js` and `content2.js`.

Shared content plan. Every content file must use the IDs listed here so the pieces fit together.

## Story

The **Ember Crown** kept the realm's eternal flame burning. **Malgrath the Hollow King** shattered it, and its five **Ember Shards** fell across the land, each corrupting the creature that found it. The hero, starting in the village of **Havenbrook**, recovers the shards, has them reforged by **Elder Maren**, and storms the **Obsidian Citadel** to face Malgrath.

## Zones

| Map id | Name | Levels | Music | Weather | Boss (enemy id) | Notes |
|---|---|---|---|---|---|---|
| `town` | Havenbrook | hub | `town` | leaves | — | Safe hub: elder, smith, armorer, alchemist, mage vendor, inn, stash of side quests |
| `forest` | The Whisperwood | 1–4 | `field` | fireflies | — | Links town ↔ grotto, marsh, crypt |
| `grotto` | Slime Grotto | 3–5 | `dungeon` | spores | `slime_king` (Gloopus) | Shard 1 |
| `crypt` | Forgotten Crypt | 6–9 | `crypt` | — | `lich` (Mortis the Bone Lich) | Optional side dungeon, entrance in the forest graveyard |
| `marsh` | Mirefen Swamp | 5–8 | `marsh` | rain | — | |
| `spider_den` | Broodmother's Nest | 7–9 | `dungeon` | spores | `broodmother` (Vexa the Broodmother) | Shard 2 |
| `oasis` | Oasis of Saffar | hub | `town` | sand | — | Small safe outpost: merchant, quest givers, waypoint |
| `desert` | Sunscorch Dunes | 9–12 | `desert` | sand | — | |
| `tomb` | Tomb of Anhotep | 11–13 | `crypt` | — | `pharaoh` (Anhotep the Sand King) | Shard 3 |
| `peaks` | Frostfang Peaks | 13–16 | `snow` | snow | — | |
| `ice_cavern` | Frozen Hollow | 15–17 | `dungeon` | snow | `frost_wyrm` (Skaldr the Frost Wyrm) | Shard 4 |
| `volcano` | Emberdeep Caldera | 17–21 | `volcano` | embers | `infernal` (Pyrrhus the Molten Titan) | Shard 5 |
| `citadel` | Obsidian Citadel | 21–25 | `citadel` | ash | `hollow_king` (Malgrath the Hollow King) | Final dungeon, needs all 5 shards reforged |
| `coast` | Gullwind Coast | 5–9 | `coast` | leaves | — | South of Havenbrook. Saltmere fishing village, Gull Cliffs lighthouse plateau with a waterfall, pirate camp |
| `sea_cave` | Smuggler's Grotto | 8–11 | `caves` | spores | `crab_king` (Clackjaw the Tide Tyrant) | Entrance in the coast's southern bluff |
| `glimmer` | Glimmercap Hollows | 11–15 | `caves` | spores | `mycelord` (Mycelos the Rot-Crowned) | Sinkhole in the Mirefen's south-west; friendly myconid village |
| `thornwood` | Thornveil Grove | 16–20 | `grove` | fireflies | `briar_queen` (Queen Briarthorn) | West of the Frostfang Peaks; Moonlit Terrace and Briarwatch Rise plateaus |
| `rift` | Starfall Rift | 25–30 | `rift` | stars | `watcher` (Ulthuun, the Watcher Beyond) | Post-game. Portal behind Malgrath's throne opens after he falls |

Cliffs: `M.raise(fn, top, style)`, `M.plateau(x, y, w, h, top, style)`, `M.stairs(...)` and `M.waterfall(...)` in `game/world.js`; cliff styles `rock coast snow sand dark fey void` in `gfx/tiles2.js`.

Every non-hub zone has at least one **waypoint** (`M.waypoint`) and a few **chests**. Dungeons are dark (`dark: 0.7–0.9`).

Music track ids that must exist in `core/audio.js`: `title town field dungeon crypt marsh desert snow volcano citadel boss final_boss victory`.
Weather ids available: `rain snow ash leaves fireflies spores sand embers`.

## Enemies by zone (enemy ids)

- forest: `slime`, `wolf`, `goblin`, `goblin_archer`, `goblin_shaman`, `boar`, `mushroom`
- grotto: `slime`, `bat`, `cave_slime`, `slime_king` (boss)
- crypt: `skeleton`, `skeleton_archer`, `ghoul`, `wraith`, `bone_mage`, `skeleton_knight`, `lich` (boss)
- marsh: `bog_zombie`, `spider`, `venom_spider`, `swamp_frog`, `wisp`, `bog_witch`, `lizardman`
- spider_den: `spider`, `venom_spider`, `spiderling`, `broodmother` (boss)
- desert: `scorpion`, `sand_wraith`, `mummy`, `desert_bandit`, `bandit_archer`, `sand_worm`, `vulture`
- tomb: `mummy`, `tomb_guardian`, `scarab`, `cursed_priest`, `pharaoh` (boss)
- peaks: `ice_wolf`, `yeti`, `frost_wraith`, `ice_golem`, `snow_harpy`
- ice_cavern: `ice_golem`, `frost_wraith`, `ice_bat`, `frost_wyrm` (boss)
- volcano: `fire_imp`, `magma_golem`, `salamander`, `hellhound`, `ember_cultist`, `infernal` (boss)
- citadel: `dark_knight`, `shadow_wraith`, `necromancer`, `gargoyle`, `hollow_soldier`, `hollow_king` (final boss)

Enemy `level` should match the zone. Enemies get tags such as `beast`, `undead`, `slime`, `goblin`, `insect`, `demon`, `construct`, `elemental`, `flying`.

## Materials (monster drops; defined in `data/items_materials.js`)

`slime_gel wolf_pelt goblin_ear boar_tusk mushroom_cap bat_wing bone_dust ectoplasm spider_silk venom_sac frog_leg lizard_scale wisp_essence scorpion_stinger mummy_wrap sand_pearl yeti_fur frost_core harpy_feather ember_core magma_shard imp_horn shadow_essence dark_steel`

## Gear rules

- Weapon types and which classes use them: see `R.WeaponTypes` in `gfx/weapons.js`.
- Armor has a `weight`: `light` (cloth/robes), `medium` (leather), `heavy` (plate/chain). Classes: warrior & paladin all; ranger & rogue light+medium; mage light only.
- Level bands: 1–4, 5–9, 10–14, 15–19, 20–25. Every class should find usable weapon and armor upgrades in every band.
- Rarity: common < uncommon < rare < epic < legendary < mythic.
- Unique boss loot: give items `dropsFrom: ['<boss id>']` — each boss drops one (preferring the player's class). Every boss should have at least one unique for each class.
- Shops use `R.shopStock({...})` so new gear appears automatically.
- Quest rewards can give `rewards.gear: {rarity, level}` (random piece usable by the player's class).
