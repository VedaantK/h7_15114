import type { TreeConfig } from '../types/game';

/**
 * Wood supply for one tree: manual harvest cooldown + regeneration.
 * Time is *simulation* time (ms) supplied by the caller, never wall-clock,
 * so pausing the game also pauses regrowth (spec section 19).
 */
export class TreeSupply {
  readonly capacity: number;
  private wood: number;
  private lastHarvestMs = -Infinity;
  private regenProgressMs = 0;
  private lastUpdateMs = 0;
  private readonly clickCooldownMs: number;
  private readonly regenIntervalMs: number;

  constructor(config: Pick<TreeConfig, 'woodCapacity' | 'clickCooldownMs' | 'regenIntervalMs'>) {
    this.capacity = config.woodCapacity;
    this.wood = config.woodCapacity;
    this.clickCooldownMs = config.clickCooldownMs;
    this.regenIntervalMs = config.regenIntervalMs;
  }

  get remaining(): number {
    return this.wood;
  }

  /** Advance regrowth to `nowMs`. Call once per simulation step. */
  update(nowMs: number): void {
    const elapsed = Math.max(0, nowMs - this.lastUpdateMs);
    this.lastUpdateMs = nowMs;
    if (this.wood >= this.capacity) {
      this.regenProgressMs = 0;
      return;
    }
    this.regenProgressMs += elapsed;
    while (this.regenProgressMs >= this.regenIntervalMs && this.wood < this.capacity) {
      this.regenProgressMs -= this.regenIntervalMs;
      this.wood += 1;
    }
  }

  /** Why a harvest would fail right now, or null if it would succeed. */
  blockedReason(nowMs: number): 'empty' | 'cooldown' | null {
    if (this.wood <= 0) return 'empty';
    if (nowMs - this.lastHarvestMs < this.clickCooldownMs) return 'cooldown';
    return null;
  }

  /** Take one unit of wood. Returns true if a log should be spawned. */
  harvest(nowMs: number): boolean {
    if (this.blockedReason(nowMs) !== null) return false;
    this.wood -= 1;
    this.lastHarvestMs = nowMs;
    return true;
  }

  /** Put wood back, e.g. when a harvest is refused because the active-log cap was hit. */
  refund(): void {
    this.wood = Math.min(this.capacity, this.wood + 1);
    this.lastHarvestMs = -Infinity;
  }

  reset(): void {
    this.wood = this.capacity;
    this.lastHarvestMs = -Infinity;
    this.regenProgressMs = 0;
    this.lastUpdateMs = 0;
  }
}
