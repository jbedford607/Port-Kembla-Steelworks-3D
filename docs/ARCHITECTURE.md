# Architecture and priorities

## Rendering
- Three.js 0.187 + Vite.
- Procedural CanvasTexture color and normal maps with world-aligned UVs in metres.
- MeshStandardMaterial for concrete, asphalt, corrugated steel, rust, ore and machinery.
- Static geometries merged by material within each district to reduce draw calls.
- District-level distance visibility and 3 quality presets with pixel budget.
- Original procedural storm sky shader, volumetric ray approximation, smoke, rain and dynamic sun.

## Process-inspired map
Harbour + stockpiles → coke/sinter → blast furnace → basic oxygen steelmaking → casting → rolling → dispatch.

The map is constructed to feel functional, but its layout and distances are invented. It is not an actual plant plan.

## Texture rule
Never reset the tiling grid for each model. The box UV for any surface is calculated using the **absolute world position** divided by the repeat length. Adjacent planes share the same pattern grid. Generated canvas textures are RepeatWrapping. Roughness and normal-map intensity are tuned for readability in low golden sun.

## Next development milestones
1. Test actual Firefox/WebGL output and profile CPU/GPU use.
2. Make elevated platforms, stairs and railings physically collidable.
3. Add interior lighting, usable doors, service connections and roof access.
4. Import licence-checked GLB assets from Blender, starting with blast furnace and BOS cranes.
5. Physically animated conveyor belts, molten metal transport and freight schedules.
6. Optional positional industrial audio and audio settings.
7. Introduce camera-near mesh detail and farther-distance LOD.
8. Add GPU renderer diagnostics and accessibility options.

## Known limits
The new Three.js application is a first playable foundation and not yet a byte-for-byte conversion of the prior custom-WebGL V5. A source-level automated build is not equivalent to verifying its looks or performance in Firefox. The web build must be served through Vite or a static HTTP server; direct file:// opening is not supported.
