import Phaser from 'phaser';
import type { EquipmentKind, PlacedEquipment, Rect } from '../types/game';
import { EQUIPMENT_CATALOG, footprintBounds, statsOf } from '../systems/Equipment';
import { angleOf } from '../systems/EquipmentEffects';

/**
 * Drawing for placed equipment, the placement preview and build-mode guides.
 * Everything is drawn immediate-mode onto shared Graphics objects that the scene clears each frame,
 * so there are no per-tool display objects to leak when tools are removed or the level restarts.
 * `animMs` is simulation time, so animations freeze on pause.
 */

export interface DrawOptions {
  alpha: number;
  animMs: number;
  /** 0..1, trampoline pad compression after a launch. */
  compress: number;
  /** Logger: true while it is actually chopping (saw spins only then). */
  working: boolean;
}

export function drawEquipment(g: Phaser.GameObjects.Graphics, kind: EquipmentKind, x: number, y: number, rotationStep: number, tier: number, opts: DrawOptions): void {
  const spec = EQUIPMENT_CATALOG[kind];
  const a = opts.alpha;
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angleOf(rotationStep));
  if (kind === 'conveyor') drawConveyor(g, spec.width, spec.height, tier, opts);
  else if (kind === 'fan') drawFan(g, spec.width, tier, opts);
  else if (kind === 'trampoline') drawTrampoline(g, spec.width, spec.height, opts);
  else drawLogger(g, spec.width, spec.height, opts);
  g.restore();
  // Tier pips are drawn unrotated above the tool so they stay readable: count, not color, carries the info.
  const b = footprintBounds(kind, x, y, rotationStep);
  for (let i = 0; i < tier; i++) g.fillStyle(0xffd166, a).fillCircle(x - (tier - 1) * 5 + i * 10, b.top - 8, 3.5);
}

function drawConveyor(g: Phaser.GameObjects.Graphics, w: number, h: number, tier: number, o: DrawOptions): void {
  const speed = statsOf({ kind: 'conveyor', tier }).speed;
  g.fillStyle(0x3b4252, o.alpha).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  // Chevrons scroll with belt speed; clipped to whole chevrons inside the belt so nothing spills outside.
  const spacing = 22;
  const offset = (o.animMs * speed * 0.06) % spacing;
  g.fillStyle(0xffd166, o.alpha);
  for (let cx = -w / 2 + 12 + offset - spacing; cx < w / 2 - 12; cx += spacing) {
    if (cx < -w / 2 + 12) continue;
    g.fillTriangle(cx - 4, -4, cx - 4, 4, cx + 4, 0);
  }
  g.fillStyle(0x88c0d0, o.alpha).fillCircle(-w / 2 + h / 2, 0, h / 2 - 3).fillCircle(w / 2 - h / 2, 0, h / 2 - 3);
}

function drawFan(g: Phaser.GameObjects.Graphics, size: number, tier: number, o: DrawOptions): void {
  const force = statsOf({ kind: 'fan', tier }).force;
  g.fillStyle(0x5e81ac, o.alpha).fillRoundedRect(-size / 2, -size / 2, size, size, 8);
  g.fillStyle(0x2e3440, o.alpha).fillCircle(0, 0, size / 2 - 7);
  const spin = o.animMs * 0.008 * (0.6 + force);
  g.lineStyle(6, 0xeceff4, o.alpha);
  for (let i = 0; i < 3; i++) {
    const ang = spin + (i * Math.PI * 2) / 3;
    g.lineBetween(0, 0, Math.cos(ang) * (size / 2 - 9), Math.sin(ang) * (size / 2 - 9));
  }
  g.fillStyle(0xeceff4, o.alpha).fillCircle(0, 0, 4);
  // Arrow on the housing shows the blow direction (step 0 = right) without relying on color.
  g.fillStyle(0xffd166, o.alpha).fillTriangle(size / 2 + 2, -8, size / 2 + 2, 8, size / 2 + 14, 0);
}

function drawTrampoline(g: Phaser.GameObjects.Graphics, w: number, h: number, o: DrawOptions): void {
  const padH = h * (1 - 0.5 * o.compress);
  g.lineStyle(3, 0x4c566a, o.alpha);
  for (let i = 0; i < 4; i++) {
    const sx = -w / 2 + 12 + (i * (w - 24)) / 3;
    g.lineBetween(sx, h / 2, sx - 4, h / 2 - padH / 2);
    g.lineBetween(sx - 4, h / 2 - padH / 2, sx + 4, h / 2 - padH);
  }
  g.fillStyle(0xbf616a, o.alpha).fillRoundedRect(-w / 2, -h / 2 + (h - padH), w, padH * 0.55, 5);
  g.fillStyle(0xeceff4, o.alpha).fillTriangle(-6, -h / 2 - 7, 6, -h / 2 - 7, 0, -h / 2 - 15); // up arrow marks the launch side
}

function drawLogger(g: Phaser.GameObjects.Graphics, w: number, h: number, o: DrawOptions): void {
  g.fillStyle(0xd08770, o.alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
  g.fillStyle(0x4c566a, o.alpha).fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, 14);
  const spin = o.working ? o.animMs * 0.03 : 0;
  g.lineStyle(3, 0xeceff4, o.alpha);
  for (let i = 0; i < 6; i++) {
    const ang = spin + (i * Math.PI) / 3;
    g.lineBetween(0, 8, Math.cos(ang) * 17, 8 + Math.sin(ang) * 17);
  }
  g.fillStyle(0x2e3440, o.alpha).fillCircle(0, 8, 4);
}

/** Green/red footprint + ghost tool following the cursor in build mode. */
export function drawPreview(g: Phaser.GameObjects.Graphics, kind: EquipmentKind, x: number, y: number, rotationStep: number, valid: boolean): void {
  const b = footprintBounds(kind, x, y, rotationStep);
  const color = valid ? 0x4ade80 : 0xf87171;
  g.fillStyle(color, 0.25).fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
  g.lineStyle(2, color, 0.95).strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
  drawEquipment(g, kind, x, y, rotationStep, 0, { alpha: 0.65, animMs: 0, compress: 0, working: false });
  // A cross in the footprint marks "invalid" for players who can't rely on red vs green.
  if (!valid) g.lineBetween(b.left, b.top, b.right, b.bottom).lineBetween(b.right, b.top, b.left, b.bottom);
}

export function drawSelection(g: Phaser.GameObjects.Graphics, item: PlacedEquipment): void {
  const b = footprintBounds(item.kind, item.x, item.y, item.rotationStep);
  g.lineStyle(2, 0xffffff, 0.95).strokeRect(b.left - 4, b.top - 4, b.right - b.left + 8, b.bottom - b.top + 8);
}

/** Subtle placement grid, shown only while building (spec section 5). */
export function drawGrid(g: Phaser.GameObjects.Graphics, width: number, groundTopY: number, step: number): void {
  g.lineStyle(1, 0xffffff, 0.12);
  for (let x = 0; x <= width; x += step * 4) g.lineBetween(x, 0, x, groundTopY);
  for (let y = 0; y <= groundTopY; y += step * 4) g.lineBetween(0, y, width, y);
}

/** Diagonal-hatched no-build area with a label; hatching (not just red) so it doesn't rely on color. */
export function drawRestrictedZone(scene: Phaser.Scene, zone: Rect): void {
  const g = scene.add.graphics().setDepth(5);
  const left = zone.x - zone.width / 2;
  const top = zone.y - zone.height / 2;
  g.fillStyle(0xef4444, 0.14).fillRect(left, top, zone.width, zone.height);
  g.lineStyle(1, 0xb91c1c, 0.55);
  for (let d = -zone.height; d < zone.width; d += 16) {
    const x1 = Math.max(0, d);
    const y1 = Math.max(0, -d);
    const len = Math.min(zone.width - x1, zone.height - y1);
    g.lineBetween(left + x1, top + y1, left + x1 + len, top + y1 + len);
  }
  g.lineStyle(2, 0xb91c1c, 0.8).strokeRect(left, top, zone.width, zone.height);
  scene.add.text(zone.x, top + 12, 'NO BUILD', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#7f1d1d', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
}

export function drawLake(scene: Phaser.Scene, lake: Rect, groundTopY: number): void {
  const left = lake.x - lake.width / 2;
  const depth = 120;
  scene.add.rectangle(lake.x, groundTopY + depth / 2, lake.width, depth, 0x2b7fd1).setDepth(1);
  scene.add.rectangle(lake.x, groundTopY + 6, lake.width, 12, 0x6bb8f0).setDepth(2);
  scene.add.text(lake.x, groundTopY + 44, 'LAKE\nno building', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#eaf6ff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(3);
  void left;
}
