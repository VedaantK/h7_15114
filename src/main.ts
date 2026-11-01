import Phaser from 'phaser';
import './style.css';
import { FIRST_HAUL } from './config/levels';
import { LogworksScene } from './game/LogworksScene';
import type { HudState } from './types/game';

/**
 * Entry point: builds the HTML HUD around a Phaser canvas and starts the first level.
 * The HUD talks to the scene only through `game.events` (see LogworksScene's doc comment).
 */

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="hud">
    <h1 id="title"></h1>
    <span class="stat">Cash <b id="cash">$0</b></span>
    <span class="stat">Delivered <b id="delivered">0</b></span>
    <span class="stat">Logs <b id="logs">0</b></span>
    <span class="stat">Wood <b id="wood">0</b></span>
    <span class="spacer"></span>
    <button id="pause" type="button">Pause (P)</button>
    <button id="reset" type="button">Reset (R)</button>
    <button id="help" type="button" aria-label="Help">?</button>
  </header>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="game"></div>
  <dialog id="helpDialog">
    <h2>How to play</h2>
    <ul>
      <li><b>Click the tree</b> to chop a log (it regrows over time).</li>
      <li><b>Click and drag a log</b> to pull it. The pull is force-limited: you can't shove logs through walls or move several at once.</li>
      <li>Get logs into the <b>furnace pit</b> on the right to earn cash.</li>
      <li><b>P</b> pauses, <b>R</b> restarts the attempt.</li>
    </ul>
    <button id="helpClose" type="button">Got it</button>
  </dialog>
`;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
$('title').textContent = FIRST_HAUL.title;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: FIRST_HAUL.world.width,
  height: FIRST_HAUL.world.height,
  backgroundColor: '#102d2e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'matter', matter: { gravity: { x: 0, y: FIRST_HAUL.gravityY }, debug: false } },
  scene: [],
});
game.scene.add('LogworksScene', LogworksScene, true, { level: FIRST_HAUL });

game.events.on('hud', (s: HudState) => {
  $('cash').textContent = `$${s.cash}`;
  $('delivered').textContent = String(s.delivered);
  $('logs').textContent = `${s.activeLogs}/${s.maxActiveLogs}`;
  $('wood').textContent = `${s.wood}/${s.woodCapacity}`;
  $('pause').textContent = s.paused ? 'Resume (P)' : 'Pause (P)';
  $('toast').textContent = s.paused ? 'Paused' : s.message;
});

$('pause').addEventListener('click', () => game.events.emit('cmd:pause'));
$('reset').addEventListener('click', () => game.events.emit('cmd:reset'));
const helpDialog = $<HTMLDialogElement>('helpDialog');
$('help').addEventListener('click', () => helpDialog.showModal());
$('helpClose').addEventListener('click', () => helpDialog.close());
window.addEventListener('keydown', (e) => {
  if (e.key === '?') helpDialog.showModal();
});
