This is the spec.md I wrote, but I long ago realized ai is better at writing that me, so I also asked chat to create a more in depth spec which is included below.
Create a 2d game where the objective is to transport as many logs as possible into a furnace. 
Each level should provide the player with a starting amount of cash with which they can buy tools to move the logs such as trampolines, fans, conveyor belts, etc. 
Each log placed in the furnace should give the user some money which they can also use to buy upgrades to their tools. 
Logs can be created by clicking on trees or by using a logging machine on trees that automatically clicks for them, this should also be upgradable. 
Add lakes which players cannot build under. Add sections where the user cannot build to increase difficulty.
Players should also be able to pull logs with their mouse but not the strength should be regulated so that they cannot move/push multiple logs at once.
Add obstacles such as birds and fish that move across the map and prohibit buildings and or block logs.
Add objectives to each map that are more difficult than simply reaching the target cash amount, such as transport 5 logs in 1 second, transport 5 logs in 1 second without dropping any logs in the lake etc.
Add a streak multiplier, for example if the player sustains 5 logs per second multiply their earning by 2.
Create 3 such levels such that each of these features are displayed.
Add a level creator that allows players to create their won levels.

I did not realize how long this is, hope I have enough tokens.

Logworks — Game Design & Technical Specification
1. Project Overview

Build a polished 2D physics-based logistics puzzle game in which players transport logs from trees into a furnace using a combination of physical interaction, machinery, and clever level design.

Players earn money by delivering logs, use that money to purchase and upgrade equipment, and complete increasingly difficult levels with unique environmental hazards and performance challenges.

The game should combine:

Physics-based puzzle solving.
Incremental resource generation and economic progression.
Skill-based objectives and combo multipliers.
Strategic equipment placement.
Replayability through a built-in level editor.

Working title: Logworks
Genre: 2D physics puzzle / incremental management
Initial platform: Desktop web browser
Visual direction: Colorful, polished 2D cartoon art with readable silhouettes, satisfying animations, and a consistent visual language.

The finished product should feel like a complete, intentionally designed indie game, not a rough prototype.

2. Core Design Principles
Creative problem solving: Multiple solutions should be possible for most levels.
Readable physics: Players should understand why a log moves, stops, bounces, or falls.
Meaningful progression: Upgrades should noticeably change how the game plays.
Skill rewards: Efficient transport, streaks, and optional challenges should reward mastery.
Fast experimentation: Resetting, repositioning equipment, and trying another strategy should be easy.
Polished feedback: Every important action should have clear visual, audio, and interface feedback.
Stable simulation: Physics, money, and objective tracking must remain consistent regardless of frame rate.
3. Technology and Architecture

Use the following defaults unless an existing project requires otherwise:

TypeScript for game logic.
Phaser 3 for the 2D game framework.
Matter.js physics through Phaser's Matter integration.
Vite for development and production builds.
HTML/CSS for menus and interface elements where appropriate.

Use a modular architecture with separate systems for:

Physics and collision handling.
Log generation and tree health.
Furnace delivery and rewards.
Economy and upgrades.
Building placement and construction restrictions.
Objectives and achievement tracking.
Streak and combo calculations.
Level definitions and loading.
Save data and progression.
Level editor and level serialization.
Audio, animation, and visual effects.

Keep gameplay configuration separate from code. Tool statistics, prices, level layouts, rewards, and objectives should be data-driven rather than hardcoded throughout the game.

Use a fixed physics update step where practical. Avoid relying on render-frame timing for gameplay rules.

Before implementation, inspect the project structure. If a project already exists, preserve its working configuration and integrate the game into it rather than unnecessarily rebuilding it.

4. Core Gameplay Loop

The main gameplay loop is:

Enter a level with a starting cash balance.
Inspect the terrain, trees, furnace, hazards, and restricted building zones.
Generate logs by clicking trees or purchasing automated logging machinery.
Buy and place tools to transport logs.
Watch the logs interact with the environment and each other.
Earn money when logs successfully enter the furnace.
Complete optional and mandatory objectives.
Reinvest earnings in tools and upgrades.
Improve transport throughput, maintain streaks, and earn level rewards.
Complete the level and unlock the next challenge.

Players should be able to pause, reset the current attempt, inspect equipment, and retry challenges without unnecessary menus.

5. Game World and Camera

Use a side-view 2D world with clear horizontal and vertical positioning.

The world contains:

Trees that generate logs.
A furnace that accepts and consumes logs.
Buildable terrain or construction surfaces.
Lakes and other non-buildable areas.
Restricted construction zones.
Static and moving hazards.
Equipment placed by the player.
Optional decorative background scenery.

The camera should show the important parts of each level while leaving enough room for the interface.

If a level is larger than the viewport, support smooth camera panning and optional zoom. Do not allow the interface to obscure critical gameplay elements.

Provide a subtle grid or placement guides while building. These should not dominate the normal gameplay view.

6. Logs and Physics

Logs are the main physical objects in the game.

Each log should have:

Position, velocity, rotation, mass, and collision bounds.
A consistent visual size and shape.
Configurable friction, restitution, and air resistance.
A unique identifier for objective tracking.
A state indicating whether it is active, delivered, lost, or otherwise unavailable.

Logs should collide with terrain, machinery, other logs, and applicable hazards.

Use stable physics settings so logs do not randomly vibrate, pass through solid objects, or become permanently trapped due to numerical instability.

Log generation

Players can generate logs by clicking a tree.

Each successful click produces one log, subject to the tree's remaining capacity.
Provide immediate visual and audio feedback.
Trees should have visible health, remaining wood, or another readable resource indicator.
Trees should regenerate over time or be replenishable through a clearly defined game mechanic.
Prevent excessive clicking from creating an unlimited number of physics objects.

The exact generation rate and tree capacity should be configurable per level.

Automated logging

Players can buy an automated logging machine that generates logs without manual clicking.

The machine should:

Have a visible working animation.
Produce logs at a configurable interval.
Stop or pause when the tree is exhausted.
Display its production rate.
Support upgrades to speed, efficiency, or capacity.
Provide clear feedback when it cannot operate.

Automated production should be a meaningful investment rather than an immediate replacement for all manual play.

7. Player Interaction

Players can click trees, place equipment, select objects, and interact with logs using the mouse.

Manual log dragging

Allow the player to grab and pull an individual log using the mouse.

Implement a force-limited dragging mechanic:

Only one log can be actively grabbed at a time.
The player applies force rather than teleporting the log.
Maximum pulling force and dragging responsiveness are configurable.
Dragging cannot override collision physics.
The player cannot directly move a log through solid obstacles.
Other logs should not automatically attach to the dragged log.
Other logs may move naturally through collisions, but cannot be directly controlled by the same drag action.
Release the log naturally, preserving appropriate momentum.
Show a subtle visual indication when a log is selected.

If the log is too heavy or blocked, the player should be able to see that the pull is constrained.

Dragging should feel responsive and forgiving without allowing players to bypass the puzzle.

8. Construction and Placement System

Players purchase tools from an equipment shop and place them into the world.

Placement flow
Select an item from the shop.
Preview the item at the cursor.
Show whether the proposed position is valid.
Rotate the item if rotation is supported.
Confirm placement and deduct its price.
Allow selection, repositioning, upgrading, and removal of placed equipment.

Display placement previews in green for valid positions and red for invalid positions.

Invalid placement must never silently deduct money.

Construction restrictions

The following areas prohibit construction:

Lakes and water.
Marked restricted zones.
Solid terrain or designated no-build regions.
Spaces occupied by incompatible equipment.
Hazard clearance areas, where configured.

Show restrictions visually and provide a brief explanation when the player attempts an invalid placement.

Do not confuse construction restrictions with physical collision. A log may be able to travel through an area where the player cannot build equipment.

Undo and refund rules

Provide undo for recent building actions.

Equipment removal should refund a configurable percentage of its purchase price. The default refund is 80% before an attempt is finalized, with any alternative rule clearly displayed.

Avoid punishing experimentation so heavily that players become afraid to try different designs.

9. Equipment Catalog

All tools must have meaningful physical behavior, configurable prices, and upgrade paths.

Conveyor belt
Moves logs along a defined direction.
Supports configurable speed and maximum load.
Logs should be able to fall off if poorly positioned.
Upgrades improve speed, load handling, or efficiency.
Direction must be visible.
Fan
Applies directional force to nearby logs.
Force decreases with distance.
Supports adjustable direction and configurable range.
Upgrades improve force, range, or energy efficiency.
Trampoline
Launches logs on collision.
Launch angle and bounce strength are configurable.
Upgrades improve launch force, consistency, or adjustability.
The resulting trajectory must remain subject to physics.
Automated logging machine
Generates logs automatically from a valid tree.
Production interval and output limits are configurable.
Upgrades increase output and efficiency.
Additional tools

The system should support future tools such as:

Ramps and chutes.
Springs and bumpers.
Winches or pulling mechanisms.
Sorting gates.
Timed launchers.

Do not implement extra tools at the expense of completing and polishing the core equipment.

Equipment upgrades

Each upgradable tool has three upgrade tiers.

Every upgrade must:

Display its cost and effect before purchase.
Apply an immediately observable change.
Increase in cost as tiers increase.
Be balanced against the value of delivered logs.
Have a maximum level.

Upgrades may be purchased by selecting a placed machine and opening its upgrade panel.

Keep upgrade statistics data-driven. Avoid upgrades that only increase a displayed number without producing a meaningful gameplay effect.

10. Economy and Rewards

Display the player's available money prominently throughout gameplay.

Starting cash

Each level specifies its starting cash independently.

Furnace rewards

When a log enters the furnace:

Confirm that the log has crossed the furnace's delivery boundary.
Mark the log as delivered.
Remove it from active physics simulation.
Play a delivery animation and sound.
Award the base log value plus applicable bonuses.
Update the cash balance and objectives.

Each log should be rewarded exactly once. Logs bouncing around the furnace entrance must not generate duplicate rewards.

Base log values and all multipliers should be configurable.

Economy feedback

Display:

Current cash.
Base log value.
Recent earnings.
Active streak multiplier.
Current delivery rate.
Equipment and upgrade costs.

Use a short floating money indicator when a log is delivered.

Avoid excessive animations that obscure the physics.

11. Streak and Throughput Multiplier

Reward players for maintaining high delivery throughput.

Calculate the delivery rate from a rolling one-second window. Count unique logs that successfully enter the furnace during that window.

Use the following initial thresholds as balancing defaults:

Deliveries in rolling 1 second	Reward multiplier
0–1	×1.0
2–2	×1.1
3–3	×1.25
4–4	×1.5
5 or more	×2.0

These thresholds must be configurable and may be adjusted after playtesting.

The multiplier applies to the base reward of each log delivered while the corresponding threshold is active. The exact timing rule must be consistent: calculate the active multiplier at delivery time, award the log, and update the rolling window.

Display the multiplier prominently when it changes.

When the player reaches a new threshold:

Show a brief animated multiplier indicator.
Play an appropriate sound.
Use a small burst of particles or furnace effects.
Keep the effect short enough that it does not interfere with gameplay.

The streak should reward efficient transport, not simply automated production that generates logs without delivering them.

12. Objectives and Challenge Tracking

Every campaign level has:

A primary completion objective.
At least two secondary objectives.
A clear progress indicator.
A success or failure state where appropriate.
A reward for completion.

Support objective types such as:

Deliver a specified number of logs.
Earn a specified amount of money.
Deliver a minimum number of logs in a rolling one-second window.
Deliver a batch of logs within a time limit.
Deliver logs without losing any to a hazard.
Complete a delivery streak.
Complete the level using a limited budget.
Complete the level without purchasing a specified tool.
Achieve a target score or efficiency rating.
Objective definitions

For an objective such as "Deliver 5 logs in 1 second":

Count unique successful furnace deliveries.
Use a rolling one-second window.
Update progress as deliveries occur.
Record the best qualifying window during the attempt.
Mark the objective complete when five deliveries fall within that window.

For an objective such as "Deliver 5 logs in 1 second without dropping any logs into the lake":

Track all logs created during the attempt.
Record any log that enters the designated lake-loss region.
Require a qualifying five-log delivery window.
Require zero lake losses for the relevant challenge attempt.
Clearly specify whether the objective applies to the whole attempt or only to the qualifying batch.

Use the whole-attempt rule by default for no-loss challenges. Clearly communicate that rule before the player begins.

Secondary objectives should be independently tracked so players can replay a level to earn missed rewards.

13. Hazards and Environmental Obstacles
Lakes

Lakes are visually distinct, non-buildable regions.

Logs entering the water become lost after a configurable delay or according to the level's loss rules.
Display a splash animation and sound.
Update any affected objectives.
Ensure a lost log cannot later be rewarded by the furnace.
Allow water hazards to have different shapes and sizes.
Birds

Birds move across the level along configurable paths.

They may:

Collide with logs and deflect them.
Temporarily obstruct a delivery route.
Cause additional difficulty in timed challenges.

Bird behavior must be predictable enough that players can plan around it.

Birds should not arbitrarily destroy equipment or change their behavior without a clear rule.

Fish

Fish move within designated water regions.

They may:

Create brief upward splashes.
Deflect or disturb logs when the level explicitly enables this behavior.
Add timing challenges near water boundaries.

Fish should not have a physical effect on land-based logs unless a specific interaction is defined.

Other obstacles

Support configurable obstacles such as moving platforms, gates, wind zones, and timed barriers in future levels.

All hazards must use consistent collision and interaction rules.

14. Campaign Levels

Create exactly three complete, playable campaign levels for the initial release.

Each level must demonstrate its mechanics through gameplay rather than relying exclusively on tutorial text.

Level 1: The First Haul

Purpose: Teach the core loop.

Features:

A simple forest layout.
A nearby furnace.
Generous starting cash.
Manual tree clicking.
Basic log dragging.
Conveyor belts and trampolines.
A small amount of restricted building space.

Objectives:

Deliver the required number of logs.
Deliver at least five logs in one rolling one-second window.
Earn a minimum amount of money.

Introduce the shop, placement previews, upgrades, and the furnace reward loop gradually.

The player should be able to complete the level using a simple solution, but efficient machinery should improve their score.

Level 2: The Lakeside Run

Purpose: Introduce hazards, precision, and environmental constraints.

Features:

A large lake dividing the trees from the furnace.
Narrow buildable corridors.
Restricted construction zones.
Moving birds.
Fish in the lake.
Automated logging machinery.
Fans and trampolines.
A more constrained starting budget.

Objectives:

Deliver a specified number of logs.
Deliver five logs in one rolling one-second window.
Complete the required delivery streak.
Complete a no-lake-loss challenge.

The layout should require the player to think about trajectories, timing, and where machinery can be placed.

Level 3: The Industrial Rush

Purpose: Test optimization and mastery.

Features:

Multiple trees.
A longer transport route.
Several non-buildable zones.
Moving hazards and timed obstructions.
Automated log generation.
Multiple types of equipment working together.
Expensive upgrades and a more demanding budget.

Objectives:

Deliver a target number of logs before the timer expires.
Reach a specified delivery throughput.
Maintain a streak multiplier for a defined duration.
Complete a no-loss challenge.
Earn a high efficiency rating.

The level should reward a well-designed transport system rather than brute-force spending.

Level progression
Levels unlock sequentially by default.
Completion rewards contribute to persistent progression.
Players can replay unlocked levels.
Previously earned secondary objectives remain recorded.
Each level has a summary screen showing results, objectives, earnings, and replay options.

Do not require a perfect score to unlock the next level unless this is explicitly configured.

15. Level Creator

The level creator is a major feature, not an afterthought.

Players must be able to create, test, save, and load custom levels using an accessible visual interface.

Editor interface

Provide:

A level canvas.
A selection tool.
Placement tools for terrain, trees, furnace, lakes, restricted zones, hazards, and machinery.
Move, rotate, resize, and delete controls where appropriate.
Undo and redo.
Grid snapping with an optional free-placement mode.
Zoom and pan.
A properties panel for the selected object.
A level settings panel.
A test-play button.
Save, load, and export controls.
Editable objects

Players should be able to place and configure:

Trees and tree regeneration.
Furnace position and delivery settings.
Terrain and platforms.
Lakes and water-loss regions.
Restricted building zones.
Birds and fish.
Starting cash.
Available equipment.
Tool prices and upgrade settings.
Log values.
Time limits.
Level objectives.
Optional environmental hazards.

Provide reasonable minimum and maximum values for all configurable properties.

Test mode

Players can test a level without permanently affecting their campaign progression.

Provide:

A clear return-to-editor button.
A reset-test button.
A way to inspect objective completion.
Validation messages for invalid or impossible configurations.

The editor must distinguish between testing a level and publishing or saving its final configuration.

Save and load

Support local persistence for user-created levels.

Export and import levels as JSON files. Include a schema version so saved levels can be migrated when the format changes.

A level file should contain:

Level metadata.
World dimensions.
Object positions and properties.
Terrain and hazard definitions.
Starting economy.
Equipment availability.
Objectives.
Relevant gameplay configuration.

Do not store executable code in level files. Validate imported data before loading it.

Level validation

Before a level can be marked as ready to play, validate that:

A furnace exists.
At least one usable log source exists.
The world has valid dimensions.
Object properties fall within allowed bounds.
The level has a valid starting economy.
Objectives have valid parameters.
Required object references are valid.
Invalid object overlaps and contradictory restrictions are flagged.

Validation should distinguish between structural errors and warnings about potentially difficult or impossible layouts.

Do not promise that every custom level is solvable unless an actual solvability check has been implemented.

Sharing

Provide an exportable JSON file and a compact shareable representation if feasible.

If compact sharing is implemented, handle oversized levels gracefully. Do not build an online sharing service unless backend infrastructure is explicitly requested.

16. User Interface and Visual Design

The visual design should be cohesive and readable at common desktop resolutions.

Main menu

Include:

Play.
Level selection.
Level creator.
Settings.
Credits.
In-game interface

Include:

Cash balance.
Delivery rate.
Streak multiplier.
Objective progress.
Remaining time when applicable.
Equipment shop.
Selected-item information.
Pause, reset, and return controls.

Use clear icons, readable text, consistent spacing, and helpful tooltips.

Avoid covering the main play area with large opaque panels.

Art direction

Use a cheerful, stylized forestry and industrial theme:

Warm wood tones.
Lush green forests.
Clear blue water.
Bright, readable machinery.
A furnace with an expressive glow.
Distinct silhouettes for each tool.

Prioritize readability over visual complexity. Logs and equipment must remain distinguishable against every background.

Animation and effects

Include:

Smooth log rotation and movement.
Tree reactions when clicked.
Conveyor animation.
Fan blades that rotate while active.
Trampoline compression and rebound.
Animated furnace flames.
Smoke and delivery particles.
Lake splashes.
Bird and fish movement.
Purchase and upgrade feedback.
Objective-completion effects.

Effects must be lightweight and must not obscure critical information.

Audio

Include optional sound effects for:

Tree clicking.
Log spawning.
Equipment operation.
Log collisions.
Furnace delivery.
Cash rewards.
Streak milestones.
Objective completion.
Button interactions.

Provide separate volume controls for sound effects and music, plus a mute option.

Use original, licensed, or otherwise legally usable audio assets. Never make the game depend on missing external assets.

17. Accessibility and Input
Support keyboard navigation for menus.
Provide visible focus states.
Use readable font sizes and sufficient contrast.
Never communicate critical information through color alone.
Support mouse-based gameplay without requiring precise pixel-perfect clicks.
Provide clear selected-object indicators.
Allow sound to be muted.
Keep animations short and avoid excessive screen shake.
Support common desktop window sizes.

Document any controls that are not obvious from the interface.

18. Save Data and Persistence

Persist:

Campaign progression.
Level completion.
Secondary objectives.
Persistent rewards and upgrades, if used.
Settings.
Custom levels.

Use a versioned save schema and recover gracefully from invalid or outdated data.

Autosave at appropriate milestones, especially after level completion and editor saves.

Provide a way to reset campaign progress separately from deleting custom levels.

Keep the economy of a single attempt separate from persistent progression so restarting a level cannot accidentally duplicate rewards.

19. Performance and Stability

Target smooth gameplay at 60 FPS on typical modern desktop hardware.

Requirements:

Avoid unnecessary per-frame allocations.
Limit the number of active physics objects.
Clean up delivered and lost logs.
Prevent duplicate collision-triggered rewards.
Ensure pause stops gameplay timers and automated production.
Ensure physics and objective tracking remain correct when the browser tab is temporarily inactive.
Handle restarting and changing levels without duplicate listeners or lingering objects.
Avoid unhandled exceptions during normal play.

Use a sensible maximum active-log limit with clear feedback if reached.

20. Testing and Acceptance Criteria

The game is not complete until the following are verified.

Core gameplay
Clicking a tree creates a log.
Automated logging creates logs at the configured rate.
Logs respond consistently to gravity and collisions.
Manual dragging applies a force limit and controls no more than one log.
Equipment can be purchased, placed, selected, upgraded, and removed.
Invalid placements do not deduct money.
Lakes and restricted areas prevent construction.
Logs entering the furnace are rewarded exactly once.
Logs lost in water cannot subsequently be delivered or rewarded.
Economy and objectives
Rewards, upgrade prices, and cash balances remain consistent.
The rolling one-second delivery counter counts unique logs.
Streak multipliers activate at the configured thresholds.
Timed objectives pause correctly when gameplay is paused.
No-loss objectives fail or succeed according to their documented rules.
Objective progress is restored correctly when appropriate.
Campaign
All three levels are playable from start to finish.
Each level demonstrates its intended mechanics.
Completion and secondary objectives are recorded.
Resetting an attempt does not corrupt persistent progression.
Level editor
Users can create and configure levels.
Undo and redo work for supported editing operations.
Test mode can be entered and exited repeatedly.
Saved levels can be reloaded without losing their configuration.
Exported JSON can be imported.
Invalid files are rejected safely with useful error messages.
Custom levels do not corrupt campaign saves.
Interface and polish
The game works at common desktop resolutions.
Tooltips and costs are readable.
Audio controls function.
Important actions provide clear feedback.
There are no obvious placeholder screens, broken assets, or nonfunctional buttons.
21. Development Plan

Build incrementally in this order:

Phase 1 — Playable foundation

Project setup.
Camera and level canvas.
Physics world.
Trees, logs, and furnace.
Manual dragging.
Cash and delivery rewards.

Phase 2 — Construction and equipment

Placement preview and validation.
Conveyor belts, fans, and trampolines.
Automated logging.
Upgrades and removal refunds.
Restricted zones and lakes.

Phase 3 — Game systems

Streak multipliers.
Objective framework.
Birds and fish.
Pause, reset, and campaign progression.

Phase 4 — Campaign content

Build and balance all three levels.
Add onboarding and level-specific objectives.
Implement results screens and replay support.

Phase 5 — Level creator

Visual editor.
Object properties.
Undo and redo.
Test mode.
JSON save, load, export, and import.
Validation.

Phase 6 — Polish and verification

Art, animation, and audio.
Interface refinement.
Performance optimization.
Regression testing.
Bug fixing and final acceptance checks.

At the end of each phase, keep the game runnable and test the completed systems before proceeding.

22. Implementation Instructions for Claude

Work directly in the project files and implement the game, not just a design document or a collection of disconnected code examples.

Before coding:

Inspect the repository and identify existing frameworks, conventions, and available assets.
Confirm the implementation plan and major architectural choices.
Establish the core data models and configuration formats.

During development:

Prefer complete, working systems over superficial implementations of every feature.
Keep modules small and maintainable.
Avoid unnecessary dependencies.
Do not leave critical mechanics as TODOs or placeholder buttons.
Do not fake physics using animations that ignore collisions.
Do not silently substitute a static mockup for a functioning level editor.
Use original placeholder artwork only when final assets are unavailable, and keep the asset structure easy to replace.
Run the available build, type checks, and tests regularly.
Fix regressions before adding more features.

If the full scope is too large to implement reliably in one pass, complete the phases in order. Preserve working code, explain any unfinished features explicitly, and never claim an unimplemented feature is complete.

Definition of done: A user can launch the game, play all three campaign levels, operate the economy and equipment, complete objectives, and create, test, save, reload, export, and import a custom level without encountering critical gameplay or persistence bugs.
