# STATUS OF THIS REPO (inherited-code audit, verified 2026-11-01)

**Read this first. It supersedes the phase notes further down.**

Original author: ISamanie (design, spec, README, config). Phase 2 build: Vedaant Kulkarni, with Claude as the coding assistant (see `prompt_log.md`).

## What the inherited commit actually contained
The inherited commit (`e64f54c`) had `spec.md`, `README.md`, `package.json`, `tsconfig.json`, `index.html` and `package-lock.json`, but **no `src/` or `tests/` directory**. The README below describes Phases 1-6 as implemented (23 tests, a level creator, a 3-level campaign), and none of that code was in the repo. Treat the Phase 2-6 sections below as the author's *plan*, not as a description of existing code.

## What exists now (Phases 1 and 2, built from the README's own module map)
Verified by `npm run typecheck`, `npm test` (31 passing unit tests), `npm run build`, and manual browser runs (Playwright, Chromium):
- Click the tree to spawn a log (250 ms cooldown, 8 wood, regrows 1 per 3 s of simulation time, 22 active-log cap with an on-screen message).
- Click and drag a single log. The pull is a force-limited damped spring (`drag` in `src/config/levels.ts`). It was pulled straight down into the floor without passing through, so collisions still win.
- Furnace pit on the right. A log whose center enters the delivery mouth is removed and pays $18 exactly once (`LogRegistry` is the gate, `Economy` the second check).
- Fixed 60 Hz simulation steps, simulation clock, pause (`P`), reset (`R`), help dialog.
- Logs falling out of the world are marked lost and removed.

**Phase 2 (equipment and building):**
- Shop bar with Conveyor $35, Fan $30, Trampoline $42, Auto logger $64 (all data in `EQUIPMENT_CATALOG`, `src/systems/Equipment.ts`).
- Click a shop button, move over the map for a green/red preview with a build grid, click to place. `E` rotates in 45-degree steps, `Esc` or right-click leaves build mode. Placement snaps to a 10px grid.
- Refused placements show a reason and never charge: outside map, below ground, over a lake, over the furnace, inside a restricted zone, overlapping another tool, logger too far from the tree (170px), or not enough cash.
- Click a placed tool to see stats, upgrade (3 tiers, rising cost, next-tier effect shown before buying) or remove (80% of price plus upgrades back). `Delete` removes the selected tool. `Z` or the Undo button reverses the last build action (placement and upgrade refund in full; undoing a removal re-buys it for the refund received).
- Physics: conveyors drag touching logs up to belt speed; fans push logs in a widening cone, fading linearly to zero at their range; trampolines launch a landing log along the pad normal (rotate to aim) and compress visibly; auto loggers chop through the same cooldown, wood and 22-log-cap rules as a manual click.
- Level 1 now has a 120px lake gap (logs that fall in are lost, with a splash) and a hatched NO BUILD zone.
- Verified in the browser: invalid placements charged nothing; trampoline launched a log; conveyor carried a log; fan blew a log about 150px further than it would have gone; logger produced its first log after about 4s.

**Added after Phase 2 (requested by the user, not from the author's phase list):**
- **Win screen, no levels:** the game ends with a "You win!" dialog once total *earned from deliveries* reaches `winEarnings` ($1500 in `src/config/levels.ts`; spending and refunds do not affect it). "Keep playing" resumes, "Play again" restarts. Open the game with `?goal=40` to lower the target for testing.
- **Throughput multiplier** (`src/systems/Throughput.ts`): spec thresholds x1.0 / x1.1 (2) / x1.25 (3) / x1.5 (4) / x2.0 (5+) in a rolling 1-second window of simulation time. Following the author's Phase 3 rule, a log is paid using the deliveries *already* in the window when it arrives, so the 5th log of a burst pays x1.5 and the 6th x2.0. The HUD shows the multiplier the next log would get and the count in the window; the floating payout shows the multiplier; a "STREAK xN!" banner shows the first time a higher tier is reached.
- **Furnace polish:** animated flames, pulsing glow, and a spark burst on every delivery (bigger with a higher multiplier). Driven by simulation time, so they freeze on pause.
- **Rotate placed tools:** select a tool, then press `E` or click "Rotate (E)". Free, 45 degrees clockwise per press, undoable with `Z`. A tool resting on the floor is lifted just enough to stay above ground; a rotation that would hit another tool or a no-build zone is refused with a reason. Loggers cannot rotate.

Not browser-tested: the streak multiplier (unit-tested only; I could not hand-deliver several logs within a second), pause/reset buttons, the help dialog, the 22-log cap message, upgrade/remove/undo buttons in the UI (covered by unit tests only), tab-inactive behavior, 60 FPS under load, and whether level 1 is comfortably solvable with the starting $200 (balance is a guess).

## Code map
| File | Responsibility |
| --- | --- |
| `src/config/levels.ts` | Level data: sizes, cash, physics and drag tuning. Add new levels here. |
| `src/types/game.ts` | Shared types (`LevelConfig`, `HudState`, `LogState`). |
| `src/systems/TreeSupply.ts` | Harvest cooldown, wood capacity, regrowth. Pure logic, takes simulation time. |
| `src/systems/LogRegistry.ts` | Unique log IDs and active/delivered/lost states (forward-only). |
| `src/systems/Economy.ts` | Cash, exactly-once delivery reward, `trySpend`, `earn` (refunds). |
| `src/systems/Throughput.ts` | Rolling one-second delivery window and streak multiplier. |
| `src/systems/Equipment.ts` | Equipment catalog (prices, stats, upgrade costs), placement rules (`checkPlacement`), and `EquipmentManager` (buy/upgrade/remove/undo transactions). |
| `src/systems/EquipmentEffects.ts` | Pure per-step physics math for conveyor, fan and trampoline. Unit-tested. |
| `src/game/EquipmentView.ts` | Drawing for tools, preview, grid, lake and no-build zone. Immediate-mode; redrawn every frame. |
| `src/game/LogworksScene.ts` | Phaser/Matter scene: world, input, drag force, delivery check, HUD events. |
| `src/game/assets.ts` | Procedurally drawn textures (no external assets). |
| `src/main.ts`, `src/style.css` | HTML HUD around the canvas; talks to the scene via `game.events`. |
| `tests/systems.test.mjs`, `tests/equipment.test.mjs`, `tests/throughput.test.mjs` | Node tests for the framework-free systems (`npm test`). Systems avoid TS-only syntax such as parameter properties so Node can run them directly. |

## Acceptance criteria status (spec section 20)
Met (checked in browser or unit test): tree click creates a log; automated logging creates logs at the configured interval; gravity/collisions consistent; dragging is force-limited and moves one log; equipment can be purchased, placed, selected, upgraded and removed; invalid placements do not deduct money; lakes and restricted areas prevent construction; furnace reward exactly once; lost logs cannot be rewarded (unit test).
Partially met: "equipment can be selected, upgraded, removed" is verified by unit tests and a manual look at the panel, but the Upgrade/Remove buttons were not clicked in a browser run. Tools cannot be moved after placing (remove and re-place instead, or rotate in place); the spec lists repositioning. Conveyors have no "maximum load" and fans no adjustable range besides upgrades.
**Not built yet:** objectives, birds/fish, levels 2 and 3, campaign save/progression, level editor, audio, main menu. Some have `TODO(phase N)` markers in the code.

## Known issues and traps
- `LogworksScene` sets `matter.world.autoUpdate = false` and steps Matter by hand; do not also let Phaser auto-step.
- Drag acceleration is in px/step^2 (Matter units). Matter's velocity change is `force / mass * dt^2`, so force = `mass * accel / dt^2`. An earlier version had this inverted and threw logs to x~20000.
- A tilted tool's footprint is its bounding box, so a 45-degree trampoline must be placed about 37px above the ground; this is intentional but may surprise players.
- Loggers spawn logs in the same spot as the tree click, which can pile logs on top of the logger; it is not a solid object.
- Furnace delivery is a position check on the log's center, not a collision event.
- No favicon (harmless 404 in the console).

## Suggested next steps (priority order)
1. Phase 3: objectives framework (the multiplier is done), birds and fish.
2. Play-test and balance level 1 (prices, starting cash, lake width) and click through the upgrade/remove UI.
3. Phase 4: the other two levels, results screen, progression save.
4. Moving placed tools, conveyor max load, tool-specific tooltips.
5. Persistence, then the level editor.

---

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
