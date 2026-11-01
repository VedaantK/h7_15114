import Phaser from 'phaser';
import type { HudState, LevelConfig } from '../types/game';
import { Economy } from '../systems/Economy';
import { LogRegistry } from '../systems/LogRegistry';
import { TreeSupply } from '../systems/TreeSupply';
import { TEXTURE_LOG, TEXTURE_TREE, generateTextures } from './assets';

/** Fixed simulation step. Gameplay never depends on render frame rate (spec section 3). */
const STEP_MS = 1000 / 60;
/** Cap on catch-up steps per rendered frame so a stalled tab can't cause a spiral of death. */
const MAX_STEPS_PER_FRAME = 5;
/** Logs that fall this far below the world are removed and counted as lost. */
const OUT_OF_WORLD_MARGIN = 200;

/** Matter body label prefix; the log's registry ID is stored on body.plugin / game object data. */
const LOG_DATA_KEY = 'logId';

export interface SceneInit {
  level: LevelConfig;
}

/**
 * The one playable scene. Owns the Matter world, input, and glue between the
 * framework-free systems (TreeSupply, LogRegistry, Economy) and what is drawn.
 *
 * Event interface with the HTML HUD (src/main.ts), on `game.events`:
 *   emits  'hud'        (state: HudState)   whenever something visible changes
 *   listens 'cmd:pause'  toggle pause
 *   listens 'cmd:reset'  restart this attempt (including cash)
 */
export class LogworksScene extends Phaser.Scene {
  private level!: LevelConfig;
  private registry_!: LogRegistry; // trailing underscore: `registry` is a Phaser.Scene property.
  private economy!: Economy;
  private tree!: TreeSupply;

  /** Simulation clock in ms. Advances only while unpaused, in whole STEP_MS increments. */
  private simTimeMs = 0;
  private accumulatorMs = 0;
  private paused = false;
  private message = '';
  private messageUntilMs = 0;

  private logBodies = new Map<number, MatterJS.BodyType>();
  private logImages = new Map<number, Phaser.Physics.Matter.Image>();
  private grabbedLogId: number | null = null;
  private dragGraphics!: Phaser.GameObjects.Graphics;
  private woodBar!: Phaser.GameObjects.Graphics;
  private deliveredCount = 0;

  constructor() {
    super('LogworksScene');
  }

  init(data: SceneInit): void {
    this.level = data.level;
  }

  preload(): void {
    generateTextures(this, this.level);
  }

  create(): void {
    this.resetRuntimeState();
    this.buildWorld();
    this.buildTree();
    this.buildFurnaceVisuals();
    this.dragGraphics = this.add.graphics().setDepth(20);
    this.registerInput();

    // Manual stepping gives us the fixed 60Hz update (see update()).
    this.matter.world.autoUpdate = false;

    const onPause = (): void => this.togglePause();
    const onReset = (): void => {
      this.scene.restart({ level: this.level });
    };
    this.game.events.on('cmd:pause', onPause);
    this.game.events.on('cmd:reset', onReset);
    // Remove listeners when the scene restarts so resets never stack duplicate handlers (spec section 19).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('cmd:pause', onPause);
      this.game.events.off('cmd:reset', onReset);
    });

    this.emitHud();
  }

  update(_time: number, deltaMs: number): void {
    if (!this.paused) {
      this.accumulatorMs += Math.min(deltaMs, STEP_MS * MAX_STEPS_PER_FRAME);
      let steps = 0;
      while (this.accumulatorMs >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        this.stepSimulation();
        this.accumulatorMs -= STEP_MS;
        steps++;
      }
    }
    this.drawDragIndicator();
    this.emitHud();
  }

  // ---------------------------------------------------------------- simulation

  /** One fixed 60Hz tick: everything that affects gameplay state happens here. */
  private stepSimulation(): void {
    this.simTimeMs += STEP_MS;
    this.tree.update(this.simTimeMs);
    this.applyDragForce();
    this.matter.world.step(STEP_MS);
    this.checkLogsForDeliveryOrLoss();
  }

  /**
   * Pull the grabbed log toward the pointer with a damped spring whose acceleration is capped.
   * We only ever apply a force (never set position), so collisions still win: the log cannot be
   * dragged through terrain, and other logs only move when the grabbed log physically hits them.
   */
  private applyDragForce(): void {
    if (this.grabbedLogId === null) return;
    const body = this.logBodies.get(this.grabbedLogId);
    if (!body) {
      this.grabbedLogId = null;
      return;
    }
    const { stiffness, damping, maxAccel } = this.level.drag;
    const pointer = this.input.activePointer;
    const dx = pointer.worldX - body.position.x;
    const dy = pointer.worldY - body.position.y;
    // Velocity in px per step, as Matter stores it.
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    let ax = stiffness * dx - damping * vx;
    let ay = stiffness * dy - damping * vy;
    const mag = Math.hypot(ax, ay);
    if (mag > maxAccel) {
      ax = (ax / mag) * maxAccel;
      ay = (ay / mag) * maxAccel;
    }
    // Matter: velocity change per step = force / mass * STEP_MS^2, so invert for the force.
    const forceScale = body.mass / (STEP_MS * STEP_MS);
    this.matter.body.applyForce(body, body.position, { x: ax * forceScale, y: ay * forceScale });
  }

  /** Position-based delivery check: a log is delivered once its center is inside the furnace mouth. */
  private checkLogsForDeliveryOrLoss(): void {
    const { mouth } = this.level.furnace;
    const left = mouth.x - mouth.width / 2;
    const right = mouth.x + mouth.width / 2;
    const top = mouth.y - mouth.height / 2;
    const bottom = mouth.y + mouth.height / 2;
    const worldBottom = this.level.world.height + OUT_OF_WORLD_MARGIN;

    for (const [id, body] of [...this.logBodies]) {
      const { x, y } = body.position;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        this.deliverLog(id, x, y);
      } else if (y > worldBottom) {
        this.loseLog(id);
      }
    }
  }

  private deliverLog(id: number, x: number, y: number): void {
    // markDelivered is the exactly-once gate: it is true only for the first call per log.
    if (!this.registry_.markDelivered(id)) return;
    const paid = this.economy.rewardDelivery(id);
    this.deliveredCount++;
    this.removeLog(id);
    this.floatText(x, y - 20, `+$${paid}`, '#ffd166');
  }

  private loseLog(id: number): void {
    if (!this.registry_.markLost(id)) return;
    this.removeLog(id);
  }

  private removeLog(id: number): void {
    if (this.grabbedLogId === id) this.grabbedLogId = null;
    this.logImages.get(id)?.destroy();
    this.logImages.delete(id);
    this.logBodies.delete(id);
  }

  // ---------------------------------------------------------------- input

  private registerInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || !pointer.leftButtonDown()) return;
      // Logs take priority over the tree so a log lying in front of the trunk can still be grabbed.
      const logId = this.logIdAt(pointer.worldX, pointer.worldY);
      if (logId !== null) {
        this.grabbedLogId = logId; // Only one log can be grabbed at a time.
      }
    });
    const release = (): void => {
      this.grabbedLogId = null; // Releasing keeps the log's current velocity (natural momentum).
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-R', () => this.scene.restart({ level: this.level }));
  }

  private logIdAt(worldX: number, worldY: number): number | null {
    const bodies = [...this.logBodies.values()];
    const hits = this.matter.query.point(bodies, { x: worldX, y: worldY });
    if (hits.length === 0) return null;
    // Overlapping logs: take the one whose center is closest to the pointer.
    let best: MatterJS.BodyType = hits[0];
    let bestDist = Infinity;
    for (const body of hits) {
      const d = Math.hypot(body.position.x - worldX, body.position.y - worldY);
      if (d < bestDist) {
        best = body;
        bestDist = d;
      }
    }
    for (const [id, body] of this.logBodies) if (body === best) return id;
    return null;
  }

  private onTreeClicked(): void {
    if (this.paused) return;
    if (this.registry_.activeCount() >= this.level.maxActiveLogs) {
      this.showMessage('Log limit reached - deliver some logs first', 1500);
      return;
    }
    const reason = this.tree.blockedReason(this.simTimeMs);
    if (reason === 'empty') {
      this.showMessage('Tree is out of wood - it regrows over time', 1500);
      return;
    }
    if (reason === 'cooldown') return; // Silent: rapid clicking is expected.
    if (this.tree.harvest(this.simTimeMs)) this.spawnLog();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) this.grabbedLogId = null;
    this.emitHud();
  }

  // ---------------------------------------------------------------- world building

  private resetRuntimeState(): void {
    this.registry_ = new LogRegistry();
    this.economy = new Economy(this.level.startingCash, this.level.logValue);
    this.tree = new TreeSupply(this.level.tree);
    this.simTimeMs = 0;
    this.accumulatorMs = 0;
    this.paused = false;
    this.message = '';
    this.messageUntilMs = 0;
    this.logBodies = new Map();
    this.logImages = new Map();
    this.grabbedLogId = null;
    this.deliveredCount = 0;
  }

  private buildWorld(): void {
    const { world, groundTopY, furnace, gravityY } = this.level;
    this.matter.world.setBounds(0, -2000, world.width, world.height + 2000 + OUT_OF_WORLD_MARGIN * 2, 64, true, true, false, false);
    this.matter.world.setGravity(0, gravityY);
    this.cameras.main.setBackgroundColor('#bfe6f5');

    // Floor is two slabs with the furnace pit between them.
    const pitLeft = furnace.pit.x - furnace.pit.width / 2;
    const pitRight = furnace.pit.x + furnace.pit.width / 2;
    const floorHeight = world.height - groundTopY;
    this.addStaticSlab(0, pitLeft, groundTopY, floorHeight);
    this.addStaticSlab(pitRight, world.width, groundTopY, floorHeight);
    // The pit's bottom is deliberately open: logs are deleted on delivery, not by hitting a floor.
    // Side walls of the pit are the slab edges above.
  }

  private addStaticSlab(left: number, right: number, topY: number, height: number): void {
    const width = right - left;
    this.matter.add.rectangle(left + width / 2, topY + height / 2, width, height, {
      isStatic: true,
      friction: 0.8,
      label: 'ground',
    });
    this.add.rectangle(left + width / 2, topY + height / 2, width, height, 0x5a8f3c).setDepth(1);
    this.add.rectangle(left + width / 2, topY + 5, width, 10, 0x74b04c).setDepth(2); // grass lip
  }

  private buildTree(): void {
    const { tree } = this.level;
    const treeImage = this.add.image(tree.x, tree.y, TEXTURE_TREE).setOrigin(0.5, 1).setDepth(3);
    // Generous hit area (spec section 17: no pixel-perfect clicks).
    treeImage.setInteractive({ useHandCursor: true });
    treeImage.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      // If a log is under the cursor the generic pointerdown handler grabs it instead.
      if (this.logIdAt(pointer.worldX, pointer.worldY) !== null) return;
      this.tweens.add({ targets: treeImage, angle: { from: -2, to: 2 }, duration: 60, yoyo: true, repeat: 1, onComplete: () => treeImage.setAngle(0) });
      this.onTreeClicked();
    });
    this.woodBar = this.add.graphics().setDepth(4);
  }

  private buildFurnaceVisuals(): void {
    const { pit, mouth } = this.level.furnace;
    this.add.rectangle(pit.x, pit.y, pit.width, pit.height, 0x3a2a2a).setDepth(1);
    this.add.rectangle(pit.x, pit.y + 10, pit.width - 20, pit.height - 30, 0xff6b1a).setDepth(2);
    this.add.rectangle(pit.x, mouth.y, mouth.width - 30, 20, 0xffc247).setDepth(2);
    const label = this.add.text(pit.x, this.level.groundTopY - 28, 'FURNACE', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#7a1f00', fontStyle: 'bold' });
    label.setOrigin(0.5).setDepth(5);
  }

  private spawnLog(): void {
    const { tree, log } = this.level;
    const id = this.registry_.spawn();
    // Spawn to the right of the trunk, slightly above the ground, with a small random kick
    // so logs don't stack perfectly on top of each other.
    const x = tree.x + 90 + Math.random() * 20;
    const y = tree.y - 70;
    const image = this.matter.add.image(x, y, TEXTURE_LOG, undefined, {
      chamfer: { radius: 6 },
      density: log.density,
      friction: log.friction,
      restitution: log.restitution,
      frictionAir: log.frictionAir,
      label: `log-${id}`,
    });
    image.setDepth(10);
    image.setData(LOG_DATA_KEY, id);
    image.setVelocity(2 + Math.random() * 2, -2);
    image.setAngularVelocity((Math.random() - 0.5) * 0.1);
    this.logImages.set(id, image);
    this.logBodies.set(id, image.body as MatterJS.BodyType);
  }

  // ---------------------------------------------------------------- feedback / HUD

  private drawDragIndicator(): void {
    const g = this.dragGraphics;
    g.clear();
    this.drawWoodBar();
    for (const [id, body] of this.logBodies) {
      if (id !== this.grabbedLogId) continue;
      const pointer = this.input.activePointer;
      const dist = Math.hypot(pointer.worldX - body.position.x, pointer.worldY - body.position.y);
      // Pull is "constrained" when the requested acceleration exceeds the cap: show red instead of white.
      const constrained = this.level.drag.stiffness * dist > this.level.drag.maxAccel;
      g.lineStyle(2, constrained ? 0xff5555 : 0xffffff, 0.9);
      g.lineBetween(body.position.x, body.position.y, pointer.worldX, pointer.worldY);
      g.strokeCircle(body.position.x, body.position.y, this.level.log.length * 0.55);
    }
  }

  private drawWoodBar(): void {
    const { tree } = this.level;
    const w = 70;
    const x = tree.x - w / 2;
    const y = tree.y - 215;
    this.woodBar.clear();
    this.woodBar.fillStyle(0x000000, 0.35).fillRect(x, y, w, 8);
    this.woodBar.fillStyle(0xffd166, 1).fillRect(x, y, (w * this.tree.remaining) / this.tree.capacity, 8);
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
    t.setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private showMessage(text: string, durationMs: number): void {
    this.message = text;
    this.messageUntilMs = performance.now() + durationMs;
  }

  private emitHud(): void {
    if (this.message && performance.now() > this.messageUntilMs) this.message = '';
    const state: HudState = {
      cash: this.economy.cash,
      delivered: this.deliveredCount,
      activeLogs: this.registry_.activeCount(),
      maxActiveLogs: this.level.maxActiveLogs,
      wood: this.tree.remaining,
      woodCapacity: this.tree.capacity,
      paused: this.paused,
      message: this.message,
    };
    this.game.events.emit('hud', state);
  }
}
