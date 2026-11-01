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

/** Buildable tool types (spec section 9). */
export type EquipmentKind = 'conveyor' | 'fan' | 'trampoline' | 'logger';

/** A tool the player has bought and placed. `spent` = price + upgrades, the basis for refunds. */
export interface PlacedEquipment {
  id: number;
  kind: EquipmentKind;
  x: number;
  y: number;
  /** 0..7, each step is 45 degrees clockwise. Step 0 points right (conveyor/fan) or up (trampoline). */
  rotationStep: number;
  /** Number of upgrades bought, 0..3. */
  tier: number;
  spent: number;
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
  /** Fraction of `spent` returned when removing equipment (spec section 8: default 0.8). */
  refundRate: number;
  availableEquipment: EquipmentKind[];
  /** Gaps in the floor that destroy logs and forbid building (full column). Center-based rects. */
  lakes: Rect[];
  /** Areas where building is forbidden but logs move freely. */
  restrictedZones: Rect[];
  groundTopY: number;
  tree: TreeConfig;
  /** The furnace is a pit in the floor. `mouth` is the rect where a log counts as delivered. */
  furnace: { pit: Rect; mouth: Rect };
  log: LogPhysicsConfig;
  drag: DragConfig;
}

/** What the HUD shows about the currently selected placed tool. */
export interface SelectedInfo {
  id: number;
  kind: EquipmentKind;
  label: string;
  tier: number;
  maxTier: number;
  statLines: string[];
  upgradeLine: string | null;
  upgradeCost: number | null;
  refund: number;
  status: string;
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
  buildKind: EquipmentKind | null;
  canUndo: boolean;
  selected: SelectedInfo | null;
}
