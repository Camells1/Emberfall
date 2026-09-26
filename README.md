# Emberfall: Legends of the Shattered Crown

A 2D pixel-art action RPG you can play **solo or online with up to 3 friends**. Pick from 5 classes and 9 races, customise your hero, explore 18 regions, fight 11 bosses that come back harder every time you beat them, and hunt for secrets.

![Emberfall gameplay](docs/gameplay.png)

## ⬇️ Download (Windows)

### [**Download the latest version here**](https://github.com/Camells1/Emberfall/releases/latest)

On that page, click **`Emberfall-Setup-….exe`** under *Assets*, run it, and you're done. The installer includes everything, online play too. It adds Emberfall to your Desktop and Start menu.

> **"Windows protected your PC"?** The installer isn't code-signed (that costs money), so Windows SmartScreen may warn you the first time. Click **More info → Run anyway**.

## 🎮 Play with friends

Everyone needs the same version of the game and an internet connection. No accounts, no extra apps, no router settings.

1. **Host:** start or load your character, press **Esc → Multiplayer → Host**. You get a 5-letter **room code**.
2. **Friends:** start or load *their own* character, press **Esc → Multiplayer**, type the code and click **Join**.
3. That's it: you're in the host's world. Everyone keeps their own character, gear, XP, loot and quests. Monsters chase whoever is closest, and the party follows the host between areas.

Up to 4 players. You can set an optional password when hosting. (There's also a direct-IP option under *Advanced* for LAN or Tailscale.)

## Screenshots

| | |
|---|---|
| ![Title](docs/title.png) | ![Character creator](docs/creator.png) |
| ![Cliffs and waterfalls](docs/cliffs.png) | ![Boss fight](docs/boss.png) |

## Features

- **5 classes** (Warrior, Ranger, Mage, Rogue, Paladin) and **9 Bloodborn races** (Human, Elf, Dwarf, Orc, Beastkin, Dragonborn, Demonkin, Revenant, Sylvan), each with their own look and bonuses
- **Deep character customisation**: body types, 18 hairstyles, beards, ears, horns, face markings, accessories and custom colours. Restyle anytime at the Stylist in Havenbrook.
- **18 regions**: forests, swamps, deserts, glaciers, volcanoes, a coast with a lighthouse, a fungal cave, a fairy forest and the post-game Starfall Rift, with cliffs, waterfalls and hidden areas to discover
- **11 bosses** with multiple phases, shields and enrage timers. Beat one and a **Challenge Sigil** lets you rematch it at a higher tier, forever.
- **Difficulty levels** from Story to Hell
- **60 quests** plus repeatable bounties, hundreds of items and legendary boss loot
- Smart enemies that path around walls, take turns attacking, dodge your shots and flee when hurt
- Everything (art, sound and music) is generated in code. There are no asset files.
- A few easter eggs. Be nice to the hens.

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move | WASD or arrow keys | Left stick |
| Aim | Mouse | Right stick |
| Attack (hold for combos) | Left click or J | RT |
| Heavy attack (costs stamina) | Right click or U | LT |
| Dodge roll (costs stamina) | Space | A |
| Sprint (drains stamina) | Hold Shift | R3 |
| Skills | 1–4 | LB, RB, B, L3 |
| Health / mana potion | Q / R | D-pad |
| Talk, open, travel | E or F | Y |
| Inventory | I or Tab | View |
| Skills / quests / map | K / L / M | |
| Pause, save, settings / back | Esc | Menu / B |
| Move around menus | Arrow keys, Enter | D-pad or left stick, A |

F11 toggles fullscreen in the desktop app. The game goes quiet when it's minimized or in the background (turn this off in Settings).

## Changelog

### v1.3

- **Online co-op for up to 4 players.** Press Esc → Multiplayer. The host clicks **Host** and gets a 5-letter room code; friends type it into **Join**. Nothing else to install, no router setup. Everyone keeps their own character, loot, XP and quests; monsters target whoever is closest, and the party follows the host between areas. (Direct IP connections for LAN/Tailscale are under "Advanced".)
- **Bigger world.** Nine outdoor maps grew by roughly a third to a half: Havenbrook Outskirts, Fernhollow Glades, the Drowned Hamlet, the Glass Canyons, Skyreach Glacier, the Ashen Wastes, Gull Downs, Wildheart Thicket and the Palm Gardens. New cliffs, ruins, monster dens, camps, shrines that bless you, fishing spots, hidden chests (not all of them are chests...) and discovery XP for finding each new area.
- **Easter eggs.** A few. Be nice to the hens.

### v1.2

- **Much harder bosses**: four phases (70% / 40% / 15%), each with a shockwave, a damage shield you have to break, reinforcements and faster attacks; new nova and sweeping-beam attacks; an enrage timer; boss hits pierce half your armor; and boss health scales with your gear, so over-geared heroes still get a real fight. Potions have a 3-second cooldown during boss fights.
- **Boss tiers**: after you beat a boss, a Challenge Sigil appears where it fell. Each rematch is one tier higher (more health, harder hits, faster attacks) with bigger rewards. Tiers never stop.
- **Difficulty levels** in Settings: Story, Normal, Hard, Nightmare and Hell.
- **Fixes**: your arrows and spells now hit enemies anywhere on their body (tall bosses used to only be hittable through the middle), and enemy healers can no longer fully heal bosses.

### v1.1

- **Bloodborn races**: Human, Elf, Dwarf, Orc, Beastkin, Dragonborn, Demonkin, Revenant and Sylvan, each with its own look and stat bonuses.
- **Deeper customization**: four body types, 18 hairstyles, 8 beards, eye styles, ears, horns, face markings, accessories, dozens of colours plus a custom colour picker for everything. Mirabel the Stylist in Havenbrook can restyle you later.
- **New regions**: Gullwind Coast and the Smuggler's Grotto (south of Havenbrook), the Glimmercap Hollows (a sinkhole in the Mirefen), the Thornveil Grove (west of Frostfang) and the post-game Starfall Rift (behind Malgrath's throne). Four new bosses, 23 new monsters, a Starforged gear tier.
- **Cliffs and plateaus** with stone stairs and waterfalls, in the new regions and in the Whisperwood, Frostfang and the dunes.
- **31 new quests**, including repeatable bounties on the Havenbrook notice board.
- **Smarter enemies**: pathfinding around walls and cliffs, taking turns to attack and circling you, waking nearby allies, dodging arrows and spells, fleeing when badly hurt, leading their shots, and getting staggered by heavy hits.
- **Better animation**: 6-frame walk and run cycles, breathing and blinking, 3-stage attacks, flinching, falling on death, cape and hair sway, and squash-and-stretch on monsters.
- **Villager chatter** in speech bubbles, new music for each region.
- **Menu fixes**: Esc goes back instead of closing everything, menus no longer flicker when you click, keyboard and gamepad menu navigation, no stuck tooltips, the boss bar no longer sticks after dying, buttons no longer keep focus (Space used to re-press them), and the Fullscreen setting stays in sync with F11.

## Building from source

You need [Node.js](https://nodejs.org) 18 or newer.

```sh
npm install
npm start          # run the game
npm run dist:win   # build the Windows installer into dist/
```

You can also open `web/index.html` in a browser to play single-player (online room codes work there too).

## How it's built

Plain JavaScript with no build step. `web/index.html` loads the scripts in order and everything hangs off one global, `RPG`.

| Folder | What's in it |
|---|---|
| `web/src/core` | Utilities, input, synthesized audio |
| `web/src/gfx` | Pixel-art renderer: characters, weapons, monsters, tiles and props, icons, particles and effects |
| `web/src/data` | Items, classes, races (`races.js`) and skills, enemies and bosses, NPCs, quests, maps, story; the v1.1 regions live in `regions.js` |
| `web/src/game` | Combat, entities, enemy AI and pathfinding (`nav.js`), world and collision, quest engine, saves |
| `web/src/ui` | HUD and menus (DOM layer over the canvas) |
| `main.js`, `netmain.js`, `preload.js` | Electron shell and co-op networking |

`DESIGN.md` has the content plan: zones, enemies, bosses and gear rules. Saves are kept in the browser's (or app's) local storage: three slots plus an autosave.

## Credits

Online play uses [PeerJS](https://peerjs.com) (MIT licence, bundled in `web/lib/`) and its free public matchmaking server.
