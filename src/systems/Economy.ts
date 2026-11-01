/**
 * Cash balance and delivery rewards for a single attempt.
 * Persistent campaign rewards are deliberately NOT handled here (spec section 18).
 */
export class Economy {
  private balance: number;
  private readonly startingCash: number;
  private readonly logValue: number;
  private readonly rewardedLogIds = new Set<number>();

  // Explicit fields (no parameter properties) so `npm test` can run this file via Node type-stripping.
  constructor(startingCash: number, logValue: number) {
    this.startingCash = startingCash;
    this.logValue = logValue;
    this.balance = startingCash;
  }

  get cash(): number {
    return this.balance;
  }

  /**
   * Pay out for a delivered log. Returns the amount paid, or 0 if this log was already rewarded.
   * This is a second safety net; LogRegistry.markDelivered is the primary exactly-once gate.
   * TODO(phase 3): apply the rolling-throughput multiplier here.
   */
  rewardDelivery(logId: number): number {
    if (this.rewardedLogIds.has(logId)) return 0;
    this.rewardedLogIds.add(logId);
    this.balance += this.logValue;
    return this.logValue;
  }

  /** Spend cash if affordable. Returns false (and charges nothing) otherwise. */
  trySpend(amount: number): boolean {
    if (amount < 0 || amount > this.balance) return false;
    this.balance -= amount;
    return true;
  }

  reset(): void {
    this.balance = this.startingCash;
    this.rewardedLogIds.clear();
  }
}
