import type { LogState } from '../types/game';

/**
 * Source of truth for every log's unique ID and lifecycle state.
 * States only move forward: active -> delivered | lost. A log that has left 'active'
 * can never be rewarded or counted again, which is what makes delivery exactly-once.
 */
export class LogRegistry {
  private nextId = 1;
  private readonly states = new Map<number, LogState>();

  /** Create a new active log and return its unique ID. */
  spawn(): number {
    const id = this.nextId++;
    this.states.set(id, 'active');
    return id;
  }

  stateOf(id: number): LogState | undefined {
    return this.states.get(id);
  }

  /** Returns true only on the single transition active -> delivered. */
  markDelivered(id: number): boolean {
    return this.transition(id, 'delivered');
  }

  /** Returns true only on the single transition active -> lost. */
  markLost(id: number): boolean {
    return this.transition(id, 'lost');
  }

  activeCount(): number {
    return this.countIn('active');
  }

  deliveredCount(): number {
    return this.countIn('delivered');
  }

  lostCount(): number {
    return this.countIn('lost');
  }

  reset(): void {
    this.nextId = 1;
    this.states.clear();
  }

  private transition(id: number, to: LogState): boolean {
    if (this.states.get(id) !== 'active') return false;
    this.states.set(id, to);
    return true;
  }

  private countIn(state: LogState): number {
    let n = 0;
    for (const s of this.states.values()) if (s === state) n++;
    return n;
  }
}
