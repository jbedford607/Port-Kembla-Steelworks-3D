# Port Kembla Steelworks 3D

A fictionalised explorable 3D reconstruction inspired by Port Kembla, NSW, Australia. Built for Firefox with Three.js and Vite.

**Status: playable modular Three.js alpha.** This is a new project foundation, not an exact port of the earlier custom-WebGL standalone V5. That file is still available in the original ChatGPT conversation.

## Run in Firefox

1. Install Node.js 22+ from https://nodejs.org/
2. Use GitHub **Code → Download ZIP**, then extract the folder.
3. Open a terminal inside the extracted folder.
4. Run the following commands:

    npm install
    npm run dev

5. Open the address printed by Vite in Firefox, usually http://127.0.0.1:5173/

Don't double-click index.html: Vite projects are served locally. There is no artificial loading screen. The initial npm install requires internet, but the generated game assets don't call a third-party image site.

To generate production website files, run npm run build. The files appear in dist/ and can be hosted on GitHub Pages or another static host.

## Controls

| Key | Action |
|---|---|
| Click | Capture mouse look |
| WASD | Walk |
| Shift / Space / C | Sprint / jump / crouch |
| V | Fly |
| E | Use nearby interactive control |
| T | Cycle sunbreak, storm, clearing, night |
| Q | Cycle performance / balanced / ultra |
| 1–6 | Teleport between six industrial districts |
| H / M | Help / sector list |
| Escape | Release mouse |

## Features

- Harbour unloading, ore stockpiles, coke ovens, sinter and gas processing
- Blast furnaces, stove clusters, hot metal transfer, BOS vessels, casting and rolling
- Open and closed sheds, enterable workshop, cranes, pipes, conveyors and rail sidings
- Procedural Illawarra-style escarpment, low golden sun, storm clouds, rain and smoke
- Moving freight train, mechanical hoist and workers on site routes
- World-aligned seamless procedural PBR textures with generated normal maps
- Render resolution limits, quality presets and district-level geometry batching

## Project layout

    index.html              Browser entry
    src/game.js             Camera, weather, rendering, controls
    src/world.js            Buildings, world geometry, vehicles, workers
    src/materials.js        Seamless world-aligned materials
    src/style.css           Minimal overlay
    docs/ARCHITECTURE.md    Engineering notes and next steps
    assets/models/          Future GLB/Blender models
    .github/workflows/      Build verification

## Known limits

This is an artistic game map, not a measured replica or a diagram of operating infrastructure. Many large halls are still closed; rail and workers follow scripted routes. Raised walkways are currently visual objects and need player-floor collision improvements. Automated checks cover syntax/build, not visual correctness on Firefox. Real GLB assets and complete indoor factories will be added in later versions.

The steelmaking workflow was informed by public BlueScope explanations: https://www.bluescope.com/our-steel/steelmaking

**Repository visibility:** This repository is currently public. Change visibility under Settings → General → Danger Zone if you want the source private.

Not affiliated with or endorsed by BlueScope.
