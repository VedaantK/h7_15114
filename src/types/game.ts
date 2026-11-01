/** Shared type definitions for Logworks. Pure types only: no runtime code. */

/** Lifecycle of a single log (spec section 6). A log only ever moves forward from 'active'. */
export type LogState = 'active' | 'delivered' | 'lost';

export interface Rect {
  /** Center x in world pixels. */
  x: number;
  /** Center y in world pixels. */
  y: number;
  width: number;
  height: number;
}

export interface TreeConfig {
  /** x of the trunk's center; the trunk base sits on the ground. */
  x: number;
  y: number;
  /** Logs available before the tree is exhausted. */
  woodCapacity: number;
  /** Minimum simulated ms between two manual harvests (anti click-spam). */
  clickCooldownMs: number;
  /** Simulated ms to regrow one unit of wood. */
  regenIntervalMs: number;
}

export interface LogPhysicsConfig {
  length: number;
  thickness: number;
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
}

export interface DragConfig {
  /** Spring stiffness toward the pointer, in (px/step^2) per px of distance. */
  stiffness: number;
  /** Velocity damping, in (px/step^2) per (px/step) of speed. Stops oscillation. */
  damping: number;
  /** Hard cap on pull acceleration in px/step^2. Gravity is ~0.28, so 0.7 is a firm but beatable pull. */
  maxAccel: number;
}

export interface LevelConfig {
  id: string;
  title: string;
  world: { width: number; height: number };
  startingCash: number;
  /** Cash for each unique delivered log. */
  logValue: number;
  /** Global cap on simultaneous active logs. */
  maxActiveLogs: number;
  gravityY: number;
  groundTopY: number;
  tree: TreeConfig;
  /** The furnace is a pit in the floor. `mouth` is the rect where a log counts as delivered. */
  furnace: { pit: Rect; mouth: Rect };
  log: LogPhysicsConfig;
  drag: DragConfig;
}

/** Snapshot pushed from the scene to the HTML HUD (see main.ts). */
export interface HudState {
  cash: number;
  delivered: number;
  activeLogs: number;
  maxActiveLogs: number;
  wood: number;
  woodCapacity: number;
  paused: boolean;
  message: string;
}
