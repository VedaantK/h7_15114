/**
 * Pure physics-effect math for placed equipment. No Phaser, no imports of values, so it is unit-testable.
 * Units: positions in px, velocities in px/step (Matter's native unit), accelerations in px/step^2.
 * The scene calls these once per fixed simulation step for every (equipment, active log) pair.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Placement {
  x: number;
  y: number;
  rotationStep: number;
}

const STEP_ANGLE_RAD = Math.PI / 4;

/** Rotation angle in radians (clockwise on screen, because screen y points down). */
export function angleOf(rotationStep: number): number {
  return rotationStep * STEP_ANGLE_RAD;
}

/** Direction a conveyor or fan pushes. Step 0 = right. */
export function directionOf(rotationStep: number): Vec {
  const a = angleOf(rotationStep);
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Outward normal of a trampoline pad / conveyor top. Step 0 = straight up. */
export function surfaceNormalOf(rotationStep: number): Vec {
  const a = angleOf(rotationStep);
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/**
 * Express a world point in the tool's own frame: `along` runs in the tool's direction,
 * `across` points to the tool's local "down" (negative = above the surface).
 */
export function toLocal(item: Placement, point: Vec): { along: number; across: number } {
  const a = angleOf(item.rotationStep);
  const dx = point.x - item.x;
  const dy = point.y - item.y;
  return { along: dx * Math.cos(a) + dy * Math.sin(a), across: -dx * Math.sin(a) + dy * Math.cos(a) };
}

/** How far above a surface a resting log's center may be and still count as "touching" it. */
const CONTACT_LIFT_PX = 24;
/** Small tolerance below the surface line so a log sinking slightly into the pad still counts. */
const CONTACT_SINK_PX = 6;

/**
 * Conveyor traction: nudges a touching log's velocity toward `speed` along the belt direction.
 * Returns the velocity change to add this step, or null if the log is not on the belt or is already fast enough.
 * Never pushes faster than `speed`, so upgrades change the real top speed.
 */
export function conveyorVelocityDelta(item: Placement, width: number, height: number, speed: number, pos: Vec, vel: Vec): Vec | null {
  const local = toLocal(item, pos);
  const onBelt = Math.abs(local.along) <= width / 2 && local.across >= -(height / 2 + CONTACT_LIFT_PX) && local.across <= -height / 2 + CONTACT_SINK_PX;
  if (!onBelt) return null;
  const dir = directionOf(item.rotationStep);
  const currentSpeed = vel.x * dir.x + vel.y * dir.y;
  if (currentSpeed >= speed) return null;
  const traction = 0.25; // fraction of the speed gap closed per step; tuned so belts can climb a 45 degree slope
  const delta = (speed - currentSpeed) * traction;
  return { x: dir.x * delta, y: dir.y * delta };
}

/**
 * Fan push: acceleration on a log inside the fan's cone, strongest at the fan and fading
 * linearly to zero at `range` (spec section 9: force decreases with distance).
 */
export function fanAcceleration(item: Placement, range: number, maxAccel: number, pos: Vec): Vec | null {
  const dir = directionOf(item.rotationStep);
  const rx = pos.x - item.x;
  const ry = pos.y - item.y;
  const along = rx * dir.x + ry * dir.y;
  const across = Math.abs(-rx * dir.y + ry * dir.x);
  const halfWidth = 50 + 0.2 * along; // gentle widening cone
  if (along < 0 || along > range || across > halfWidth) return null;
  const strength = maxAccel * (1 - along / range);
  return { x: dir.x * strength, y: dir.y * strength };
}

/**
 * Trampoline bounce: if a log is on the pad and not already moving away, returns its new velocity:
 * `launchSpeed` along the pad normal plus half of the log's sideways motion. Trajectory afterwards is plain physics.
 */
export function trampolineLaunchVelocity(item: Placement, width: number, height: number, launchSpeed: number, pos: Vec, vel: Vec): Vec | null {
  const local = toLocal(item, pos);
  const onPad = Math.abs(local.along) <= width / 2 + 10 && local.across >= -(height / 2 + CONTACT_LIFT_PX) && local.across <= -height / 2 + CONTACT_SINK_PX;
  if (!onPad) return null;
  const n = surfaceNormalOf(item.rotationStep);
  const speedAlongNormal = vel.x * n.x + vel.y * n.y;
  if (speedAlongNormal > 1) return null; // already leaving the pad
  const tangentX = vel.x - n.x * speedAlongNormal;
  const tangentY = vel.y - n.y * speedAlongNormal;
  return { x: tangentX * 0.5 + n.x * launchSpeed, y: tangentY * 0.5 + n.y * launchSpeed };
}
