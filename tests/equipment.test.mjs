import test from 'node:test';
import assert from 'node:assert/strict';
import { Economy } from '../src/systems/Economy.ts';
import { EquipmentManager, EQUIPMENT_CATALOG, checkPlacement, upgradePreview, statsOf, LOGGER_REACH_PX } from '../src/systems/Equipment.ts';
import { conveyorVelocityDelta, fanAcceleration, trampolineLaunchVelocity, surfaceNormalOf } from '../src/systems/EquipmentEffects.ts';
import { FIRST_HAUL as L } from '../src/config/levels.ts';

const fresh = (cash = 1000) => {
  const eco = new Economy(cash, 18);
  return { eco, mgr: new EquipmentManager(L, eco) };
};
const GROUND_Y = L.groundTopY - 9 - 1; // a conveyor resting on the floor

test('catalog: upgrade costs strictly increase and every stat has 4 tiers', () => {
  for (const spec of Object.values(EQUIPMENT_CATALOG)) {
    assert.equal(spec.upgradeCosts.length, 3);
    assert.ok(spec.upgradeCosts[0] < spec.upgradeCosts[1] && spec.upgradeCosts[1] < spec.upgradeCosts[2], spec.kind);
    for (const values of Object.values(spec.stats)) assert.equal(values.length, 4);
  }
});

test('placement: valid on open ground, charges the price', () => {
  const { eco, mgr } = fresh(100);
  const r = mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  assert.equal(r.ok, true);
  assert.equal(eco.cash, 100 - EQUIPMENT_CATALOG.conveyor.price);
});

test('placement: invalid spots never deduct cash (lake, restricted, furnace, underground, overlap, reach)', () => {
  const { eco, mgr } = fresh(1000);
  const cases = [
    ['conveyor', L.lakes[0].x, GROUND_Y, 0, 'lake'],
    ['conveyor', L.restrictedZones[0].x, 450, 0, 'restricted'],
    ['trampoline', L.furnace.pit.x, GROUND_Y, 0, 'furnace'],
    ['conveyor', 300, L.groundTopY + 20, 0, 'ground'],
    ['logger', 600, L.groundTopY - 35, 0, 'reach'],
    ['fan', -10, 300, 0, 'bounds'],
  ];
  for (const [kind, x, y, rot, reason] of cases) {
    const r = mgr.tryPlace(kind, x, y, rot);
    assert.deepEqual([r.ok, r.reason], [false, reason], `${kind} at ${x},${y}`);
  }
  assert.equal(eco.cash, 1000);
  mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  const overlap = mgr.tryPlace('conveyor', 320, GROUND_Y, 0);
  assert.equal(overlap.reason, 'overlap');
  assert.equal(eco.cash, 1000 - EQUIPMENT_CATALOG.conveyor.price);
});

test('placement: refused for lack of cash, nothing placed', () => {
  const { eco, mgr } = fresh(10);
  const r = mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  assert.deepEqual([r.ok, r.reason], [false, 'cash']);
  assert.equal(eco.cash, 10);
  assert.equal(mgr.list().length, 0);
});

test('logger is allowed within reach of the tree', () => {
  assert.equal(checkPlacement(L, [], 'logger', L.tree.x + LOGGER_REACH_PX - 5, L.groundTopY - 35, 0), null);
});

test('upgrades: three tiers, rising cost, stats change, then max', () => {
  const { eco, mgr } = fresh(1000);
  const { item } = mgr.tryPlace('trampoline', 300, L.groundTopY - 9, 0);
  const before = eco.cash;
  const costs = EQUIPMENT_CATALOG.trampoline.upgradeCosts;
  let last = statsOf(item).launchSpeed;
  for (let i = 0; i < 3; i++) {
    assert.equal(upgradePreview(item).cost, costs[i]);
    assert.equal(mgr.tryUpgrade(item.id).ok, true);
    assert.ok(statsOf(item).launchSpeed > last);
    last = statsOf(item).launchSpeed;
  }
  assert.equal(eco.cash, before - costs.reduce((a, b) => a + b, 0));
  assert.deepEqual(mgr.tryUpgrade(item.id), { ok: false, reason: 'max' });
  assert.equal(upgradePreview(item), null);
});

test('upgrade without enough cash charges nothing', () => {
  const { eco, mgr } = fresh(EQUIPMENT_CATALOG.fan.price + 5);
  const { item } = mgr.tryPlace('fan', 300, L.groundTopY - 28, 0);
  assert.deepEqual(mgr.tryUpgrade(item.id), { ok: false, reason: 'cash' });
  assert.equal(eco.cash, 5);
  assert.equal(item.tier, 0);
});

test('remove refunds 80% of price plus upgrades', () => {
  const { eco, mgr } = fresh(1000);
  const { item } = mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  mgr.tryUpgrade(item.id);
  const spent = 35 + 30;
  const before = eco.cash;
  assert.equal(mgr.remove(item.id), Math.floor(spent * 0.8));
  assert.equal(eco.cash, before + Math.floor(spent * 0.8));
  assert.equal(mgr.list().length, 0);
  assert.equal(mgr.remove(item.id), null);
});

test('undo: place and upgrade refund in full, remove is restored', () => {
  const { eco, mgr } = fresh(500);
  const { item } = mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  mgr.tryUpgrade(item.id);
  assert.equal(mgr.undo().ok, true); // upgrade
  assert.equal(item.tier, 0);
  assert.equal(eco.cash, 500 - 35);
  mgr.remove(item.id);
  assert.equal(mgr.undo().ok, true); // restore
  assert.equal(mgr.list().length, 1);
  assert.equal(eco.cash, 500 - 35, 'restore is cash-neutral');
  assert.equal(mgr.undo().ok, true); // place
  assert.equal(eco.cash, 500);
  assert.equal(mgr.canUndo(), false);
  assert.equal(mgr.undo().ok, false);
});

test('undo restore fails safely if the buy-back is unaffordable', () => {
  const { eco, mgr } = fresh(500);
  const { item } = mgr.tryPlace('conveyor', 300, GROUND_Y, 0);
  mgr.remove(item.id);
  eco.trySpend(eco.cash); // spend everything
  const r = mgr.undo();
  assert.equal(r.ok, false);
  assert.equal(mgr.list().length, 0);
  assert.equal(mgr.canUndo(), true, 'the op stays on the stack so it can be retried');
});

// --- effects ---
const belt = { x: 300, y: 590, rotationStep: 0 };
test('conveyor pushes a log resting on it, never above top speed, ignores logs off it', () => {
  const d = conveyorVelocityDelta(belt, 140, 18, 2, { x: 310, y: 571 }, { x: 0, y: 0 });
  assert.ok(d.x > 0 && Math.abs(d.y) < 1e-9);
  assert.equal(conveyorVelocityDelta(belt, 140, 18, 2, { x: 310, y: 571 }, { x: 2, y: 0 }), null);
  assert.equal(conveyorVelocityDelta(belt, 140, 18, 2, { x: 600, y: 571 }, { x: 0, y: 0 }), null);
  assert.equal(conveyorVelocityDelta(belt, 140, 18, 2, { x: 310, y: 400 }, { x: 0, y: 0 }), null);
});

test('fan force falls off with distance and is zero behind or beyond range', () => {
  const fan = { x: 100, y: 500, rotationStep: 0 };
  const near = fanAcceleration(fan, 300, 0.6, { x: 150, y: 500 });
  const far = fanAcceleration(fan, 300, 0.6, { x: 350, y: 500 });
  assert.ok(near.x > far.x && far.x > 0);
  assert.equal(fanAcceleration(fan, 300, 0.6, { x: 50, y: 500 }), null);
  assert.equal(fanAcceleration(fan, 300, 0.6, { x: 450, y: 500 }), null);
  assert.equal(fanAcceleration(fan, 300, 0.6, { x: 150, y: 300 }), null);
});

test('trampoline launches along its normal; rotated pad aims the launch', () => {
  const pad = { x: 400, y: 590, rotationStep: 0 };
  const up = trampolineLaunchVelocity(pad, 90, 16, 10, { x: 400, y: 572 }, { x: 0, y: 1 });
  assert.ok(up.y < -9 && Math.abs(up.x) < 1e-9);
  const tilted = { ...pad, rotationStep: 1 };
  const n = surfaceNormalOf(1);
  assert.ok(n.x > 0 && n.y < 0);
  const aimed = trampolineLaunchVelocity(tilted, 90, 16, 10, { x: 400 + n.x * 18, y: 590 + n.y * 18 }, { x: 0, y: 0 });
  assert.ok(aimed.x > 6 && aimed.y < -6);
  assert.equal(trampolineLaunchVelocity(pad, 90, 16, 10, { x: 400, y: 572 }, { x: 0, y: -8 }), null, 'already rising');
});
