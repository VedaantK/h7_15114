# Logworks — Phase 5: Level Creator (current state)

This archive contains the combined Phase 1–5 source project. Earlier phase notes below are historical and not a current feature list. Phase 6 has **not** begun.

## Phase 5 editor

Click **LEVEL CREATOR** from the game header. Use the tool palette to add trees, a furnace, lake, restrictions, platforms, birds, fish, and machinery markers. Click an object to select it; drag to move, edit coordinates/sizes/rotation in the property panel, use Delete to remove, right-drag the canvas to pan, and zoom with +/−. Grid snapping can be toggled. Undo/redo stores up to 100 snapshots.

Edit level title, dimensions, starting cash, log value, maximum active logs, optional timer, and objectives (primary or bonus). **Save locally** stores valid levels in browser localStorage; **Load** restores saved levels. **Export JSON** downloads a schema-versioned file; **Import JSON** validates a file up to 1 MB before use. Validation checks bounds, required objects, money, objective targets, IDs, and overlaps; it shows warnings for unsupported or potentially hard designs. **Test play** launches a sandbox scene and **Return to editor** restores the design. Custom tests do not award campaign progress.

**Known limitations (must be addressed before release):** The editor can author multiple trees, lakes, decorative wildlife, platforms and machinery, but test-play currently uses only the first tree/lake and game-created wildlife; platform/machine markers are not instantiated as level machinery. Test-play is based on a 1280×720 physics view and does not yet fully support other world dimensions. No end-to-end browser verification or production build was possible because Phaser is not installed (npm registry inaccessible). Undo/redo and custom test flows are code-implemented but not browser-smoke-tested. Level validation is structural, not a physical solvability proof. These limitations mean the complete level creator acceptance criteria have **not** yet all been met.

## Tests

`npm test` — 20 passing automated unit tests, including 5 Phase 5 tests for valid defaults, JSON roundtrip, invalid layouts, corrupt imports/saves, and warning cases. `npm run build` requires `npm install` to fetch Phaser and Vite.

---

# Logworks — Phase 1: Playable Foundation

A modular TypeScript + Phaser 3 + Matter.js browser game, built with Vite. This directory includes **Phase 1 only** as requested; phases 2–6 are intentionally not implemented yet.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Production build: `npm run build`. Type-check: `npm run typecheck`.

## Controls
- Click the tree: produce one log (wood capacity, cooldown, and regeneration apply).
- Click and drag **one** log: pull with capped force; it still collides with other bodies.
- Pull logs into the furnace mouth: earn the configured $18 per unique delivered log.
- `P`: pause/resume simulation and tree regeneration.
- `R` or reset button: restart the attempt, including its cash balance.
- `?`: help.

## Phase 1 modules
- `src/config/levels.ts`: data-driven gameplay and physics values.
- `src/types/game.ts`: common type definitions.
- `src/systems/TreeSupply.ts`: harvest, click cooldown, regeneration.
- `src/systems/LogRegistry.ts`: unique IDs, active/delivered/lost states.
- `src/systems/Economy.ts`: exactly-once reward bookkeeping.
- `src/game/LogworksScene.ts`: world creation, physics, input, delivery.
- `src/game/assets.ts`: self-contained procedurally drawn log textures.
- `src/main.ts`, `src/style.css`: responsive HUD, controls and in-browser view.

Physics updates are advanced in fixed-size 60Hz steps with a catch-up limit; tree regeneration is based on simulation time rather than wall-clock time. The game caps active logs at 22. All art is generated in code; the interface works with system fonts if the optional Google Fonts resource is unavailable.

## Not included until approved phases
Equipment shop and placement, hazard regions, combo and objective frameworks, full three-level campaign, visual editor, audio, and comprehensive browser acceptance testing.

## Phase 2 — Equipment and building

The shop now provides a conveyor ($35), fan ($30), trampoline ($42), and automatic logger ($64). Click a shop item and click a green preview to purchase and place it. Red previews indicate disallowed placements and do **not** charge cash. Press **E** to rotate a preview, **Esc** to cancel, or select a placed machine to upgrade (up to tier 3) or remove it for an 80% refund including upgrades. **Undo** reverses the last supported build, upgrade, or removal operation where funds and space permit.

Conveyors apply traction near the belt, fans exert distance-attenuated directional force, trampolines launch colliding logs, and automated loggers periodically harvest nearby trees while respecting tree capacity and the global log cap. A small water gap now removes logs that fall into it; it cannot be built on. Machinery pricing, upgrades, footprint dimensions, and default refunds live in `src/systems/Equipment.ts`.

Phase 2's automated system tests cover valid and invalid placements, all upgrade tiers, transaction safety, refunds, equipment storage, and automatic harvesting. **Runtime interaction and production build have not yet been verified** because package downloads from npm are blocked in this environment. After `npm install`, run `npm run build` and `npm run dev`, then manually smoke-test physics interactions before relying on this build.


## Phase 3 — Game systems (October 2026)

- New `Throughput` system computes unique furnace deliveries in a rolling 1000 ms of simulation time, with configurable multiplier thresholds. The bonus for a delivery uses the multiplier *before* that log enters the window, per specification.
- New `Objectives` system tracks primary deliveries, secondary burst, earned cash, streak and whole-attempt no-loss conditions. The HUD displays current objective progress.
- New `Progression` system saves completed levels, secondary medals, unlock index and one-time completion rewards to versioned localStorage. Phase 4 will supply the two further campaign levels; this version still features The First Haul.
- Animated birds apply a small predictable physical deflection to nearby logs; fish are visual and constrained to the lake. Both use simulation time and stop when paused.
- The pause button freezes simulation timers, manual and automated logging, physics, wildlife movement and challenge tracking; restart resets only the current attempt.

### Checks

`npm test` runs the full Node suite (12 tests). `npm run build` requires dependencies from npm; unavailable in this execution environment, so runtime browser verification is not claimed.

## Phase 4 — Three-level campaign (October 2026)

Phase 4 adds three data-driven campaign definitions in `src/config/levels.ts`:

| Level | Main objective | Features | Secondary objectives |
| --- | --- | --- | --- |
| The First Haul | Deliver 8 logs | Nearby furnace, short lake, generous budget, conveyor/trampoline introduction | Five-log one-second burst, earn $140 |
| The Lakeside Run | Deliver 10 logs | Wide lake, construction restrictions, bird/fish, automation | Five-log burst, four-log streak, zero water losses |
| The Industrial Rush | Deliver 12 logs in 160 simulated seconds | Wide gap, extra restricted zones, timed pressure, costly equipment choices | Five-log burst, six-log streak, zero losses, earn $270 |

Level controls above the canvas let you select unlocked levels. Each newly selected level has an onboarding briefing. Completing all *primary* objectives unlocks the next level, records the achievement to local storage, and displays the results screen; replay is available without re-awarding first-clear campaign bonuses. Secondary objective medals are preserved across completed replays. The Industrial Rush timer advances only while gameplay simulates and stops on pause. Expiration triggers a failure summary with a retry button.

Use `npm test` for all **15 automated tests** (12 existing + 3 Phase 4). The available Node tests validate configuration, progression/replay semantics, and objective models, but they do not test the interactive Phaser rendering or guarantee gameplay balance and solvability. The local production build remains blocked by missing Phaser packages because package registry access was unavailable. Run `npm install && npm run build && npm run dev` with internet access to perform the full build and playtest before considering this phase runtime-verified. Phase 5 (level creator) is not yet implemented.

## Phase 6 — final source review and remaining verification (October 2026)

The Phase 6 source update extends custom-level test play to multiple interactive trees with separate wood supplies, multiple lake-loss sensors, authored static platforms, authored placed equipment, and multiple moving birds/fish. Authored machinery is free preplaced equipment (refund basis $0) rather than an unauthorized charge to the test player's starting cash. Larger custom world dimensions are preserved and the game camera can pan using arrow keys and zoom using `+` / `-`. Original procedural wood, machine and wildlife art remains self-contained; a small optional procedural sound feedback system adds chop, reward, purchase and loss cues and is muted by default.

Tests: `npm test` runs **23 passing Node tests**. They cover economy, physics-independent logic, construction, objectives, campaign progression, editor persistence and Phase 6 custom level data mapping. TypeScript syntax parsing also completed without parse diagnostics. **These are not live gameplay tests.** `npm install` failed with `EAI_AGAIN` resolving `registry.npmjs.org`; therefore Phaser/Vite packages are missing, `npm run build` cannot pass and no browser-level or 60 FPS test was performed. This package is a best-effort Phase 6 code update, **not an acceptance-certified release**.

### Open acceptance items

- Install dependencies in a network-enabled environment, run `npm run build`, and fix any framework API/type integration errors found.
- Smoke-test all three campaigns and a custom level through the browser; measure actual delivery feasibility, throughput thresholds and performance before signing off.
- Refine world-space editing/physics for custom world heights other than the default 720px; some scenery and UI labels remain placed at fixed scene coordinates.
- Complete the full visual-property integration: editor object dimensions and rotations are not uniformly reflected in every gameplay drawing or hitbox, and machinery-specific configuration remains basic.
- Finish a full music/SFX settings interface and audio accessibility validation. Only a sound toggle and procedural effects were added in this phase.
- Resolve the remaining campaign-content limitations: Phase 4 timed obstructions and its full level-balance pass remain outstanding.

Controls added: arrow keys pan the camera; `+`/`-` adjust zoom. Custom test mode uses the editor return button and does not grant campaign rewards.
