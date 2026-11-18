# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/inikangai14-sys/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/inikangai14-sys/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay — a complete original 3D open-world crime game in the browser. A sun-soaked coastal city to explore on foot and by car, with traffic and pedestrians, cars to steal and drive, a wanted level with police who chase you, four story missions, combat, a HUD with a live minimap, synthesized sound, and a save that remembers your best cash. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in desktop Chrome. (Any static file server works; `file://` is not enough because the game loads its scripts as separate files.)

## How to play

- **WASD** move / drive · **mouse drag** orbit camera · **wheel** zoom
- **Shift** run · **Space** jump (on foot) / handbrake (in a car)
- **E** enter / exit the nearest car · **Click** shoot · **F** melee · **R** reload
- **P** pause · **M** mute

Steal a car and the police notice. Hit a pedestrian or speed past a cruiser and the wanted stars climb. Lose the tail by staying out of sight until the heat dies down. Follow the gold beacon to run Mara's jobs: deliver a package to the pier, pick up Rico at the marina, shake a 2-star tail, then hit the harbor warehouse.

## The story

You are Jay Cruz, a driver fresh out of luck in Solmar Bay. Mara runs the crew from the hideout on Coral Row, Rico knows every shortcut, and the Solmar PD knows your face. Four jobs stand between you and a clean slate — if the city lets you keep it.

## Tech

- three.js (vendored under `game/vendor/three.min.js`), plain static files, no build step, no network requests at all
- Procedural low-poly city: road grid, towers, palms, beach, ocean, pier and ferris wheel
- Deterministic seeded layout (`?seed=7`); screenshot presets `?shot=street|drive|chase|mission&seed=7`
- WebAudio-synthesized sound: engine hum, sirens, gunshots, mission jingles
- Progress saved in `localStorage` (best cash, missions completed)

---

<sub>Entered on [make.fun](https://make.fun/?ref=ze97ra9z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
