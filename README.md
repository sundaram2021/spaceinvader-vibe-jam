# Starfall Armada

A lightweight Three.js arcade shooter built for Cursor Vibe Jam 2026.

## Play

- Move: left/right arrow keys
- Shoot: `Space`
- Special: `Shift`
- Pause: `P` or `Esc`
- Touch: drag to steer, hold to fire, tap `Special`

## Features

- Avatar-first start flow with 4 selectable pilots
- 4 ships: Interceptor, Bulwark, Phantom, Nova
- 5 procedural space environments
- 5 escalating seven-minute survival levels
- Aliens attack from the front and from behind
- Alien fire ends the run after 10 registered hits
- Asteroid collision ends the run immediately
- Sound effects for shooting, hits, explosions, power-ups, and level transitions
- Local high-score persistence
- Required Vibe Jam widget included in `index.html`

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Deploy the generated `dist` folder to any static web host. The game is free-to-play, web-only, and requires no login.
