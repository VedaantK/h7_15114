import type { LevelConfig } from '../types/game';

/**
 * Data-driven level definitions (spec section 3: keep gameplay config out of code).
 * Phase 1 ships only "The First Haul". TODO(phase 4): add The Lakeside Run and The Industrial Rush.
 */

// The floor top is at y=600. The furnace is a 140px-wide pit cut into the floor on the right,
// so a log only needs to be pulled or rolled over the edge to be delivered.
const GROUND_TOP_Y = 600;

export const FIRST_HAUL: LevelConfig = {
  id: 'first-haul',
  title: 'The First Haul',
  world: { width: 1280, height: 720 },
  startingCash: 200,
  logValue: 18,
  maxActiveLogs: 22,
  gravityY: 1,
  groundTopY: GROUND_TOP_Y,
  tree: { x: 150, y: GROUND_TOP_Y, woodCapacity: 8, clickCooldownMs: 250, regenIntervalMs: 3000 },
  furnace: {
    pit: { x: 1130, y: 660, width: 140, height: 120 },
    // Slightly inside the pit so a log must be properly over the edge, not merely touching it.
    mouth: { x: 1130, y: 640, width: 120, height: 60 },
  },
  log: { length: 64, thickness: 20, density: 0.002, friction: 0.6, restitution: 0.1, frictionAir: 0.01 },
  drag: { stiffness: 0.02, damping: 0.25, maxAccel: 0.7 },
};

export const LEVELS: LevelConfig[] = [FIRST_HAUL];
