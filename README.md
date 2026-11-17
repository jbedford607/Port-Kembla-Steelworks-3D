# Port Kembla Steelworks 3D

A fictionalised explorable 3D reconstruction inspired by Port Kembla, NSW, Australia. Built for Firefox with Three.js and Vite.

**Status: playable modular Three.js alpha.** This is a new project foundation, not an exact port of the earlier custom-WebGL standalone V5. That file is still available in the original ChatGPT conversation.

## Play immediately without the launcher

**If START_FIREFOX.cmd or npm run dev does not start:** use [PLAY_OFFLINE_V5.html](PLAY_OFFLINE_V5.html).

1. Click `PLAY_OFFLINE_V5.html` in the repository.
2. Click **Download raw file** in GitHub.
3. Open the downloaded HTML in Firefox. Do not run any command.

This is the last complete standalone **V5** build. The newer Three.js rewrite is kept in `src/` but has not yet been verified as playable in your Firefox installation.

---

## Run in Firefox

**Easiest on Windows:** install Node.js once, then double-click START_FIREFOX.cmd in the extracted project folder. It installs dependencies on first run, starts the local game server and opens Firefox.


1. Install Node.js 22+ from https://nodejs.org/
2. Use GitHub **Code → Download ZIP**, then extract the folder.
3. Open a terminal inside the extracted folder.
4. Run the following commands:

    npm install
    npm run dev

5. Open the address printed by Vite in Firefox, usually http://127.0.0.1:5173/

Don't double-click index.html: Vite projects are served locally. There is no artificial loading screen. The initial npm install requires internet, but the generated game assets don't call a third-party image site.

To generate production website files, run npm run build. The files appear in dist/ and can be hosted on GitHub Pages or another static host.

## The Furnace Watcher — nighttime horror

Press **T** to cycle weather until **NIGHT SHIFT** (the fourth setting). At night, a tall, ember-eyed industrial figure watches from the industrial site, moves closer when unobserved, and eventually pursues the player. It avoids solid factory buildings using low-resolution pathfinding. Sprinting and well-lit safe areas offer ways to escape.

- Stalking sounds: metallic footsteps, scraping, low groaning and tension drones.
- Chase: synthesised furnace-like roar, faster footsteps, subtle field-of-view expansion.
- Capture: loud industrial impact, animated full-screen jumpscare and respawn.
- Occasional brief nearby scares without automatic capture.
- **K** mutes/unmutes generated horror sounds. Audio starts after interacting with the page, as required by Firefox.
- Night equipment: **F** flashlight. Illuminating its face briefly interrupts a stalk or chase (limited cooldown).
- Usable lockers/cabinets: approach a labelled locker and press **E** to hide. Press **E** again to emerge.
- **C** crouch reduces detection; holding **Shift** sprints, consuming stamina that regenerates when not running.
- It searches your **last known location** if you escape its view; it no longer has perfect wall-penetrating tracking.
- Rare false sightings, local electrical flicker, close-call scares, pulse/heartbeat and vent-like ambience.
- Built-in nearby lighting and procedural audio; no extra assets or downloadable sound packs.
- Day and storm modes do **not** show the horror figure.

No copyrighted or external audio files are needed. The creature and sounds are rendered procedurally. Flash effects are brief and reduced-motion preferences are respected.

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

## Bigger world (13 sectors)

The map now extends beyond the original core into a wider, connected steelworks complex. New industrial areas are intentionally *fictional*, with plausible logistics rather than an exact surveyed Port Kembla layout.

**Original sectors 1–6:** entrance, raw materials, blast furnaces, steelmaking/casting, rolling/dispatch and maintenance workshops.

**New sectors 7–13:**

- **7. Freight shunting yard:** multiple parallel tracks, sidings, open sheds, signal control and a moving freight consist.
- **8. Scrap recycling:** separated material bays, shredder hall, gantry rails and a moving magnetic crane.
- **9. Energy and gas:** substation, transformer arrays, gas vessels, supported cable and pipe runs, working breaker indicator.
- **10. Ore and sinter:** larger ore piles, conveyor chain, stockpile handling sheds and an active sinter feed.
- **11. Water treatment:** clarifier basins, pump house, working water-pump rotors and service pipe racks.
- **12. Outer wharf:** longer quayside, dock cranes, unloading platforms and moving hoist equipment.
- **13. Perimeter service depot:** service workshops, truck parking, a weighbridge and inspection control.

Connected service roads, road markings, drainage covers, lights, safety rails, concrete joints and overhead pipelines join the old and new facilities.

### Find your way

- Press **M** for an enlarged interactive overhead map. Click a sector to travel directly to its road access point.
- Press **1–9** for sectors 1–9; **0** for sector 10; **-** for 11; **=** for 12; and **`** for 13.
- Interact with labelled control panels using **E**. Machinery toggles have visible effects, and the operations counter records unique service-panel inspections. None of the map is locked.
- Night horror, hiding cabinets, false sightings and navigation boundaries now extend into the new industrial zones.

### Performance and verification

The extended map batches static geometry by material and district, culls distant districts, and uses existing quality presets and world-aligned textures. Project build checks include a Node-based real-geometry smoke test of all 13 waypoints, finite mesh geometry and functional controls. The smoke test cannot replace a real Firefox graphical test.

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
    src/world.js            Original six industrial sectors and scene management
    src/expansion.js        Seven additional sites, roads, machinery, logistics
    src/materials.js        Seamless world-aligned materials
    src/horror.js           Furnace Watcher behaviour and sounds
    src/night_fx.js         Hiding, flashlight, night lamps and decoys
    tests/world-smoke.mjs   Geometry and machinery regression tests
    src/style.css           Minimal overlay
    docs/ARCHITECTURE.md    Engineering notes and next steps
    assets/models/          Future GLB/Blender models
    .github/workflows/      Build verification

## Known limits

This is an artistic game map, not a measured replica or a diagram of operating infrastructure. Many large halls are still closed; rail and workers follow scripted routes. Raised walkways have basic step/ramp floor collision but railing collisions and accessibility are incomplete. Automated checks cover syntax/build, not visual correctness on Firefox. Real GLB assets and complete indoor factories will be added in later versions.

The steelmaking workflow was informed by public BlueScope explanations: https://www.bluescope.com/our-steel/steelmaking

**Repository visibility:** This repository is currently public. Change visibility under Settings → General → Danger Zone if you want the source private.

Not affiliated with or endorsed by BlueScope.
