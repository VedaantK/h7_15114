import Phaser from 'phaser';
import type { LevelConfig } from '../types/game';

export const TEXTURE_LOG = 'log';
export const TEXTURE_TREE = 'tree';

/**
 * All art is drawn in code (no external files, so the game never depends on missing assets).
 * To swap in real art later, load images in the scene's preload() under these same keys.
 */
export function generateTextures(scene: Phaser.Scene, level: LevelConfig): void {
  if (!scene.textures.exists(TEXTURE_LOG)) drawLog(scene, level.log.length, level.log.thickness);
  if (!scene.textures.exists(TEXTURE_TREE)) drawTree(scene);
}

function drawLog(scene: Phaser.Scene, length: number, thickness: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x8a5a2b, 1).fillRoundedRect(0, 0, length, thickness, 6);
  g.fillStyle(0xa87238, 1).fillRoundedRect(0, 2, length, thickness / 3, 4); // top highlight
  g.lineStyle(1, 0x5b3a1a, 0.7);
  for (let x = 14; x < length - 8; x += 12) g.lineBetween(x, 4, x + 4, thickness - 4); // bark grain
  g.fillStyle(0xe2b97a, 1).fillEllipse(length - 4, thickness / 2, 8, thickness - 2); // cut end
  g.lineStyle(1, 0x8a5a2b, 1).strokeEllipse(length - 4, thickness / 2, 4, thickness - 8);
  g.generateTexture(TEXTURE_LOG, length, thickness);
  g.destroy();
}

function drawTree(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x6b4423, 1).fillRect(52, 110, 26, 90); // trunk
  g.fillStyle(0x2f8f46, 1).fillCircle(65, 70, 52);
  g.fillStyle(0x3fae5a, 1).fillCircle(42, 90, 34).fillCircle(90, 92, 32);
  g.generateTexture(TEXTURE_TREE, 130, 200);
  g.destroy();
}
