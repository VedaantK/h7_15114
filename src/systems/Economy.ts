/**
 * Cash balance and delivery rewards for a single attempt.
 * Persistent campaign rewards are deliberately NOT handled here (spec section 18).
 */
export class Economy {
  private balance: number;
  private earnedTotal = 0;
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

  /** Sum of delivery rewards this attempt. Spending and refunds never change it; the win condition uses it. */
  get totalEarned(): number {
    return this.earnedTotal;
  }

  /**
   * Pay out for a delivered log. Returns the amount paid, or 0 if this log was already rewarded.
   * This is a second safety net; LogRegistry.markDelivered is the primary exactly-once gate.
   * `multiplier` is the streak multiplier chosen by the Throughput system; the payout is rounded to whole dollars.
   */
  rewardDelivery(logId: number, multiplier = 1): number {
    if (this.rewardedLogIds.has(logId)) return 0;
    this.rewardedLogIds.add(logId);
    const paid = Math.round(this.logValue * multiplier);
    this.balance += paid;
    this.earnedTotal += paid;
    return paid;
  }

  /** Spend cash if affordable. Returns false (and charges nothing) otherwise. */
  trySpend(amount: number): boolean {
    if (amount < 0 || amount > this.balance) return false;
    this.balance -= amount;
    return true;
  }

  /** Add cash that is not a delivery reward (refunds, undo). */
  earn(amount: number): void {
    if (amount > 0) this.balance += amount;
  }

  reset(): void {
    this.balance = this.startingCash;
    this.earnedTotal = 0;
    this.rewardedLogIds.clear();
  }
}
