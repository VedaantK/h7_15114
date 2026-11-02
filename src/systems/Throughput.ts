import type { ThroughputTier } from '../types/game';

/**
 * Rolling-window delivery counter and streak multiplier (spec section 11).
 * Time is simulation time, so pausing freezes the window. Each delivery is stamped once,
 * and the caller only records unique, already-validated deliveries (LogRegistry guarantees uniqueness).
 */
export class Throughput {
  private readonly tiers: ThroughputTier[];
  private readonly windowMs: number;
  private stamps: number[] = [];

  constructor(tiers: ThroughputTier[], windowMs: number) {
    // Highest threshold first so the first match wins.
    this.tiers = [...tiers].sort((a, b) => b.minDeliveries - a.minDeliveries);
    this.windowMs = windowMs;
  }

  /** Number of deliveries within the last `windowMs` as of `nowMs`. */
  countInWindow(nowMs: number): number {
    this.prune(nowMs);
    return this.stamps.length;
  }

  /** Multiplier a delivery arriving right now would receive. */
  currentMultiplier(nowMs: number): number {
    return this.multiplierForCount(this.countInWindow(nowMs));
  }

  /**
   * Register a delivery at `nowMs`. Returns the multiplier that applies to THIS log:
   * based on deliveries already in the window, before this one is added.
   */
  recordDelivery(nowMs: number): number {
    const multiplier = this.currentMultiplier(nowMs);
    this.stamps.push(nowMs);
    return multiplier;
  }

  reset(): void {
    this.stamps = [];
  }

  private multiplierForCount(count: number): number {
    for (const tier of this.tiers) if (count >= tier.minDeliveries) return tier.multiplier;
    return 1;
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - this.windowMs;
    let drop = 0;
    while (drop < this.stamps.length && this.stamps[drop] <= cutoff) drop++;
    if (drop > 0) this.stamps.splice(0, drop);
  }
}
