import test from 'node:test';
import assert from 'node:assert/strict';
import { TreeSupply } from '../src/systems/TreeSupply.ts';
import { LogRegistry } from '../src/systems/LogRegistry.ts';
import { Economy } from '../src/systems/Economy.ts';
import { FIRST_HAUL } from '../src/config/levels.ts';

const treeCfg = { woodCapacity: 2, clickCooldownMs: 100, regenIntervalMs: 1000 };

test('tree: harvest respects capacity and cooldown', () => {
  const t = new TreeSupply(treeCfg);
  assert.equal(t.harvest(0), true);
  assert.equal(t.harvest(50), false, 'within cooldown');
  assert.equal(t.blockedReason(50), 'cooldown');
  assert.equal(t.harvest(150), true);
  assert.equal(t.blockedReason(300), 'empty');
  assert.equal(t.harvest(300), false);
});

test('tree: regenerates in simulation time and never exceeds capacity', () => {
  const t = new TreeSupply(treeCfg);
  t.harvest(0); t.harvest(200);
  assert.equal(t.remaining, 0);
  t.update(1000);
  assert.equal(t.remaining, 1);
  t.update(10000);
  assert.equal(t.remaining, 2);
});

test('tree: no regrowth while time does not advance (paused)', () => {
  const t = new TreeSupply(treeCfg);
  t.harvest(0);
  t.update(0); t.update(0);
  assert.equal(t.remaining, 1);
});

test('registry: IDs are unique and states only move forward', () => {
  const r = new LogRegistry();
  const a = r.spawn(), b = r.spawn();
  assert.notEqual(a, b);
  assert.equal(r.markDelivered(a), true);
  assert.equal(r.markDelivered(a), false, 'second delivery rejected');
  assert.equal(r.markLost(a), false, 'delivered log cannot become lost');
  assert.equal(r.markLost(b), true);
  assert.equal(r.markDelivered(b), false, 'lost log cannot be delivered');
  assert.deepEqual([r.activeCount(), r.deliveredCount(), r.lostCount()], [0, 1, 1]);
});

test('economy: rewards each log exactly once', () => {
  const e = new Economy(100, 18);
  assert.equal(e.rewardDelivery(1), 18);
  assert.equal(e.rewardDelivery(1), 0);
  assert.equal(e.cash, 118);
});

test('economy: trySpend never goes negative or charges on failure', () => {
  const e = new Economy(50, 18);
  assert.equal(e.trySpend(60), false);
  assert.equal(e.cash, 50);
  assert.equal(e.trySpend(50), true);
  assert.equal(e.cash, 0);
});

test('economy: reset restores starting cash and reward eligibility', () => {
  const e = new Economy(50, 18);
  e.rewardDelivery(1); e.reset();
  assert.equal(e.cash, 50);
  assert.equal(e.rewardDelivery(1), 18);
});

test('level config: furnace mouth lies inside the pit and below the floor line', () => {
  const { pit, mouth } = FIRST_HAUL.furnace;
  assert.ok(mouth.x - mouth.width / 2 >= pit.x - pit.width / 2);
  assert.ok(mouth.x + mouth.width / 2 <= pit.x + pit.width / 2);
  assert.ok(mouth.y - mouth.height / 2 >= FIRST_HAUL.groundTopY);
});
