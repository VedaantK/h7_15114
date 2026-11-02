import test from 'node:test';
import assert from 'node:assert/strict';
import { Throughput } from '../src/systems/Throughput.ts';
import { Economy } from '../src/systems/Economy.ts';
import { FIRST_HAUL as L } from '../src/config/levels.ts';

const make = () => new Throughput(L.throughputTiers, L.throughputWindowMs);

test('multiplier follows the spec thresholds using deliveries already in the window', () => {
  const t = make();
  // five logs 100ms apart: pays x1, x1, x1.1, x1.25, x1.5 (before-this-log rule), then the 6th pays x2
  const paid = [0, 100, 200, 300, 400, 500].map((ms) => t.recordDelivery(ms));
  assert.deepEqual(paid, [1.0, 1.0, 1.1, 1.25, 1.5, 2.0]);
});

test('window rolls: old deliveries expire after one second', () => {
  const t = make();
  t.recordDelivery(0); t.recordDelivery(100); t.recordDelivery(200);
  assert.equal(t.countInWindow(900), 3);
  assert.equal(t.countInWindow(1050), 2, 'the t=0 delivery has left the window');
  assert.equal(t.countInWindow(1100), 1, 'a delivery exactly 1000ms old is outside the window');
  assert.equal(t.countInWindow(2500), 0);
  assert.equal(t.currentMultiplier(2500), 1);
});

test('currentMultiplier predicts what the next delivery pays and does not mutate', () => {
  const t = make();
  t.recordDelivery(0); t.recordDelivery(10);
  assert.equal(t.currentMultiplier(20), 1.1);
  assert.equal(t.currentMultiplier(20), 1.1);
  assert.equal(t.recordDelivery(20), 1.1);
});

test('reset empties the window', () => {
  const t = make();
  t.recordDelivery(0); t.reset();
  assert.equal(t.countInWindow(1), 0);
});

test('economy: multiplied payout is rounded and totalEarned ignores spending and refunds', () => {
  const e = new Economy(100, 18);
  assert.equal(e.rewardDelivery(1, 1.25), 23); // 22.5 rounds to 23
  assert.equal(e.rewardDelivery(1, 2), 0, 'still exactly once');
  assert.equal(e.totalEarned, 23);
  e.trySpend(50); e.earn(10);
  assert.equal(e.totalEarned, 23);
  e.reset();
  assert.equal(e.totalEarned, 0);
});

test('level config: tiers ascend and win goal is large relative to a delivery', () => {
  const mins = L.throughputTiers.map((t) => t.minDeliveries);
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
  assert.ok(L.winEarnings >= L.logValue * 50);
});
