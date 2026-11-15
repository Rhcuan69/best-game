[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Rhcuan69/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Rhcuan69/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Lumen — a lantern firefly game

An original 2D canvas arcade game, built for the make.fun bounty
"Make the best game" (best-game-01): https://make.fun/bounty/best-game-01

Guide a lantern firefly through the night garden: gather ember orbs for
points with a combo multiplier (up to x8; golden sun embers pay x5), dodge
shadow wisps that drift and then chase, dash on click or Shift, and survive
waves that grow faster and denser as the score grows. Three lives, a HUD
with score, combo, wave and lives, title, pause and game-over screens, and
restart with R or a click. Heart moths restore a life. All art is drawn in
canvas (parallax starfield, moon, glow, particles); all sounds are
synthesized WebAudio. No network requests, no external assets.

## Play

```sh
node main.ts            # writes game/ + screenshots/ + dossier.json to /output
# or serve the game locally:
node /path/to/kit/starter/serve.ts   # then open http://localhost:8080
```

Keyboard: WASD or arrows to steer, Space to start, Shift to dash, P to
pause, M to mute, R to restart. Mouse: move to steer, click to dash.

`?seed=N` fixes the night's pattern. `?shot=start|play|end&seed=N` stages a
scene; `?autoplay=1` hands the firefly to the autopilot.

## Files

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` (Node 22, standard library only).
- `game/index.html`, `game/src/` — the game itself, vanilla JavaScript:
  `config.js` (tuning), `random.js` (seeded RNG), `input.js` (keyboard/mouse),
  `audio.js` (synthesized sounds), `world.js` (entities, waves, rules),
  `render.js` (canvas drawing, screens), `shots.js` (staged scenes, autopilot),
  `main.js` (boot and the one loop).
- `screenshots/` — 3 real renders of the game's own code: title, live play
  (score 1760, combo x8, wave 2), game over.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

Entry for make.fun by @rhcuan28 — https://make.fun/r/nx2h6gdz
