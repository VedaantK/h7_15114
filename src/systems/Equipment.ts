import type { Economy } from './Economy';
import type { EquipmentKind, LevelConfig, PlacedEquipment, Rect } from '../types/game';

/**
 * Equipment catalog (data), placement rules, and the transaction manager (buy / upgrade / remove / undo).
 * All prices, stats and upgrade costs live in EQUIPMENT_CATALOG (spec section 3: data-driven).
 * Pure logic: no Phaser here, so everything is covered by tests/equipment.test.mjs.
 */

export const ROTATION_STEPS = 8;
export const MAX_TIER = 3;
/** A logger must be built within this horizontal distance of the tree trunk. */
export const LOGGER_REACH_PX = 170;
export const GRID_SNAP_PX = 10;

export interface StatInfo {
  key: string;
  label: string;
  unit: string;
  /** Multiplier from internal units (px/step etc.) to the number shown to players. */
  scale: number;
  decimals: number;
}

export interface EquipmentSpec {
  kind: EquipmentKind;
  label: string;
  description: string;
  price: number;
  width: number;
  height: number;
  /** Cost of upgrade 1, 2 and 3. Must increase (spec section 9). */
  upgradeCosts: number[];
  /** Per stat: 4 values, index = tier (0 = as purchased). */
  stats: Record<string, number[]>;
  statInfo: StatInfo[];
}

export const EQUIPMENT_CATALOG: Record<EquipmentKind, EquipmentSpec> = {
  conveyor: {
    kind: 'conveyor',
    label: 'Conveyor',
    description: 'Carries logs along its arrows. Rotate with E.',
    price: 35,
    width: 140,
    height: 18,
    upgradeCosts: [30, 50, 80],
    stats: { speed: [1.6, 2.2, 3.0, 4.0] },
    statInfo: [{ key: 'speed', label: 'Belt speed', unit: ' px/s', scale: 60, decimals: 0 }],
  },
  fan: {
    kind: 'fan',
    label: 'Fan',
    description: 'Blows logs in its direction; weaker with distance. Rotate with E.',
    price: 30,
    width: 56,
    height: 56,
    upgradeCosts: [25, 45, 70],
    stats: { force: [0.45, 0.6, 0.8, 1.0], range: [220, 260, 300, 350] },
    statInfo: [
      { key: 'force', label: 'Force', unit: '', scale: 100, decimals: 0 },
      { key: 'range', label: 'Range', unit: ' px', scale: 1, decimals: 0 },
    ],
  },
  trampoline: {
    kind: 'trampoline',
    label: 'Trampoline',
    description: 'Launches logs along its pad normal. Rotate with E to aim.',
    price: 42,
    width: 90,
    height: 16,
    upgradeCosts: [35, 55, 85],
    stats: { launchSpeed: [10, 12.5, 15, 18] },
    statInfo: [{ key: 'launchSpeed', label: 'Launch speed', unit: ' px/s', scale: 60, decimals: 0 }],
  },
  logger: {
    kind: 'logger',
    label: 'Auto logger',
    description: 'Chops the tree for you. Build it near the tree.',
    price: 64,
    width: 70,
    height: 70,
    upgradeCosts: [50, 80, 120],
    stats: { intervalMs: [4000, 3000, 2200, 1500] },
    statInfo: [{ key: 'intervalMs', label: 'Chop every', unit: ' s', scale: 0.001, decimals: 1 }],
  },
};

export type PlacementReason = 'bounds' | 'ground' | 'lake' | 'restricted' | 'furnace' | 'overlap' | 'reach';

/** Short player-facing explanation shown when a placement is refused (spec section 8). */
export const REASON_TEXT: Record<PlacementReason | 'cash', string> = {
  bounds: 'Outside the map',
  ground: 'Must sit on or above the ground',
  lake: 'Cannot build over a lake',
  restricted: 'Restricted zone - no building here',
  furnace: 'Cannot build over the furnace',
  overlap: 'Overlaps another tool',
  reach: `Loggers must be within ${LOGGER_REACH_PX}px of the tree`,
  cash: 'Not enough cash',
};

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Axis-aligned bounding box of a (possibly rotated) tool. Conservative for diagonal rotations. */
export function footprintBounds(kind: EquipmentKind, x: number, y: number, rotationStep: number): Bounds {
  const spec = EQUIPMENT_CATALOG[kind];
  const a = (rotationStep * Math.PI) / 4;
  const halfW = (Math.abs(Math.cos(a)) * spec.width + Math.abs(Math.sin(a)) * spec.height) / 2;
  const halfH = (Math.abs(Math.sin(a)) * spec.width + Math.abs(Math.cos(a)) * spec.height) / 2;
  return { left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH };
}

function rectBounds(r: Rect): Bounds {
  return { left: r.x - r.width / 2, right: r.x + r.width / 2, top: r.y - r.height / 2, bottom: r.y + r.height / 2 };
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function overlapsColumn(a: Bounds, r: Rect): boolean {
  return a.left < r.x + r.width / 2 && a.right > r.x - r.width / 2;
}

/** Pure placement check. Cash is NOT checked here; the manager does that after validity. */
export function checkPlacement(
  level: LevelConfig,
  items: Iterable<PlacedEquipment>,
  kind: EquipmentKind,
  x: number,
  y: number,
  rotationStep: number,
  ignoreId?: number,
): PlacementReason | null {
  const b = footprintBounds(kind, x, y, rotationStep);
  if (b.left < 0 || b.right > level.world.width || b.top < 0) return 'bounds';
  if (b.bottom > level.groundTopY) return 'ground';
  // Lakes and the furnace pit forbid building in their whole column, not just at ground level.
  for (const lake of level.lakes) if (overlapsColumn(b, lake)) return 'lake';
  if (overlapsColumn(b, level.furnace.pit)) return 'furnace';
  for (const zone of level.restrictedZones) if (intersects(b, rectBounds(zone))) return 'restricted';
  if (kind === 'logger' && Math.abs(x - level.tree.x) > LOGGER_REACH_PX) return 'reach';
  for (const other of items) {
    if (other.id === ignoreId) continue;
    if (intersects(b, footprintBounds(other.kind, other.x, other.y, other.rotationStep))) return 'overlap';
  }
  return null;
}

export function statsOf(item: Pick<PlacedEquipment, 'kind' | 'tier'>): Record<string, number> {
  const spec = EQUIPMENT_CATALOG[item.kind];
  const out: Record<string, number> = {};
  for (const key of Object.keys(spec.stats)) out[key] = spec.stats[key][item.tier];
  return out;
}

function formatStat(info: StatInfo, value: number): string {
  return `${(value * info.scale).toFixed(info.decimals)}${info.unit}`;
}

export function statLines(item: Pick<PlacedEquipment, 'kind' | 'tier'>): string[] {
  const spec = EQUIPMENT_CATALOG[item.kind];
  return spec.statInfo.map((info) => `${info.label}: ${formatStat(info, spec.stats[info.key][item.tier])}`);
}

/** Cost and effect text for the next upgrade, or null at max tier. Shown before purchase (spec section 9). */
export function upgradePreview(item: Pick<PlacedEquipment, 'kind' | 'tier'>): { cost: number; line: string } | null {
  if (item.tier >= MAX_TIER) return null;
  const spec = EQUIPMENT_CATALOG[item.kind];
  const parts = spec.statInfo.map((info) => `${info.label} ${formatStat(info, spec.stats[info.key][item.tier])} -> ${formatStat(info, spec.stats[info.key][item.tier + 1])}`);
  return { cost: spec.upgradeCosts[item.tier], line: parts.join(', ') };
}

export type PlaceResult = { ok: true; item: PlacedEquipment } | { ok: false; reason: PlacementReason | 'cash' };
export type UpgradeResult = { ok: true } | { ok: false; reason: 'missing' | 'max' | 'cash' };

type UndoOp =
  | { type: 'place'; id: number }
  | { type: 'upgrade'; id: number; cost: number }
  | { type: 'remove'; item: PlacedEquipment; refund: number }
  | { type: 'rotate'; id: number; prevY: number };

export type RotateResult = { ok: true } | { ok: false; reason: PlacementReason | 'fixed' | 'missing' };

/**
 * Owns the placed tools and every cash transaction involving them.
 * Invariant: cash is only deducted after a placement/upgrade is known to be valid, so a refused action never charges.
 */
export class EquipmentManager {
  private readonly level: LevelConfig;
  private readonly economy: Economy;
  private readonly items = new Map<number, PlacedEquipment>();
  private nextId = 1;
  private readonly undoStack: UndoOp[] = [];

  constructor(level: LevelConfig, economy: Economy) {
    this.level = level;
    this.economy = economy;
  }

  list(): PlacedEquipment[] {
    return [...this.items.values()];
  }

  get(id: number): PlacedEquipment | undefined {
    return this.items.get(id);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Validity only (used for the green/red preview). */
  checkPlacement(kind: EquipmentKind, x: number, y: number, rotationStep: number): PlacementReason | null {
    return checkPlacement(this.level, this.items.values(), kind, x, y, rotationStep);
  }

  tryPlace(kind: EquipmentKind, x: number, y: number, rotationStep: number): PlaceResult {
    if (!this.level.availableEquipment.includes(kind)) return { ok: false, reason: 'bounds' };
    const invalid = this.checkPlacement(kind, x, y, rotationStep);
    if (invalid) return { ok: false, reason: invalid };
    const price = EQUIPMENT_CATALOG[kind].price;
    if (!this.economy.trySpend(price)) return { ok: false, reason: 'cash' };
    const item: PlacedEquipment = { id: this.nextId++, kind, x, y, rotationStep, tier: 0, spent: price };
    this.items.set(item.id, item);
    this.undoStack.push({ type: 'place', id: item.id });
    return { ok: true, item };
  }

  tryUpgrade(id: number): UpgradeResult {
    const item = this.items.get(id);
    if (!item) return { ok: false, reason: 'missing' };
    if (item.tier >= MAX_TIER) return { ok: false, reason: 'max' };
    const cost = EQUIPMENT_CATALOG[item.kind].upgradeCosts[item.tier];
    if (!this.economy.trySpend(cost)) return { ok: false, reason: 'cash' };
    item.tier += 1;
    item.spent += cost;
    this.undoStack.push({ type: 'upgrade', id, cost });
    return { ok: true };
  }

  /** Whether a tool's orientation matters (loggers are fixed). */
  isRotatable(kind: EquipmentKind): boolean {
    return kind !== 'logger';
  }

  /**
   * Turn a placed tool 45 degrees clockwise, free of charge, if the rotated footprint still fits.
   * A tilted tool sitting on the floor would dip underground, so in that one case it is lifted
   * (in whole grid steps) just enough to clear the ground, instead of refusing the rotation.
   */
  tryRotate(id: number): RotateResult {
    const item = this.items.get(id);
    if (!item) return { ok: false, reason: 'missing' };
    if (!this.isRotatable(item.kind)) return { ok: false, reason: 'fixed' };
    const next = (item.rotationStep + 1) % ROTATION_STEPS;
    const prevY = item.y;
    let newY = item.y;
    let blocked = checkPlacement(this.level, this.items.values(), item.kind, item.x, newY, next, id);
    if (blocked === 'ground') {
      const overshoot = footprintBounds(item.kind, item.x, newY, next).bottom - this.level.groundTopY;
      newY -= Math.ceil(overshoot / GRID_SNAP_PX) * GRID_SNAP_PX;
      blocked = checkPlacement(this.level, this.items.values(), item.kind, item.x, newY, next, id);
    }
    if (blocked) return { ok: false, reason: blocked };
    item.rotationStep = next;
    item.y = newY;
    this.undoStack.push({ type: 'rotate', id, prevY });
    return { ok: true };
  }

  /** What removing this tool would pay back right now. */
  refundFor(id: number): number {
    const item = this.items.get(id);
    return item ? Math.floor(item.spent * this.level.refundRate) : 0;
  }

  /** Remove a tool and refund `refundRate` of everything spent on it. Returns the refund, or null if unknown id. */
  remove(id: number): number | null {
    const item = this.items.get(id);
    if (!item) return null;
    const refund = this.refundFor(id);
    this.items.delete(id);
    this.economy.earn(refund);
    this.undoStack.push({ type: 'remove', item: { ...item }, refund });
    return refund;
  }

  /**
   * Reverse the most recent action. Undoing a purchase or upgrade refunds in full (no penalty for experimenting);
   * undoing a removal buys the tool back for the refund it paid out. Returns a description or a failure reason.
   */
  undo(): { ok: true; text: string } | { ok: false; reason: string } {
    const op = this.undoStack[this.undoStack.length - 1];
    if (!op) return { ok: false, reason: 'Nothing to undo' };
    if (op.type === 'place') {
      const item = this.items.get(op.id);
      this.undoStack.pop();
      if (item) {
        this.items.delete(op.id);
        this.economy.earn(item.spent);
      }
      return { ok: true, text: 'Undid placement (full refund)' };
    }
    if (op.type === 'rotate') {
      const item = this.items.get(op.id);
      this.undoStack.pop();
      if (item) {
        item.rotationStep = (item.rotationStep + ROTATION_STEPS - 1) % ROTATION_STEPS;
        item.y = op.prevY;
      }
      return { ok: true, text: 'Undid rotation' };
    }
    if (op.type === 'upgrade') {
      const item = this.items.get(op.id);
      this.undoStack.pop();
      if (item) {
        item.tier -= 1;
        item.spent -= op.cost;
        this.economy.earn(op.cost);
      }
      return { ok: true, text: 'Undid upgrade (full refund)' };
    }
    // Undo removal: space may have been taken since, and the player may no longer afford the buy-back.
    const blocked = checkPlacement(this.level, this.items.values(), op.item.kind, op.item.x, op.item.y, op.item.rotationStep);
    if (blocked) return { ok: false, reason: `Cannot restore: ${REASON_TEXT[blocked]}` };
    if (!this.economy.trySpend(op.refund)) return { ok: false, reason: 'Cannot restore: not enough cash' };
    this.undoStack.pop();
    this.items.set(op.item.id, { ...op.item });
    return { ok: true, text: 'Restored removed tool' };
  }

  reset(): void {
    this.items.clear();
    this.undoStack.length = 0;
    this.nextId = 1;
  }
}
