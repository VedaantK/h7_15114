import Phaser from 'phaser';
import './style.css';
import { FIRST_HAUL } from './config/levels';
import { LogworksScene } from './game/LogworksScene';
import { EQUIPMENT_CATALOG } from './systems/Equipment';
import type { EquipmentKind, HudState, SelectedInfo } from './types/game';

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
  <section class="shopbar" aria-label="Equipment shop">
    <div id="shop" class="shop"></div>
    <button id="undo" type="button" title="Undo last build action (Z)">Undo (Z)</button>
    <div id="panel" class="panel" aria-live="polite"></div>
  </section>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="game"></div>
  <dialog id="helpDialog">
    <h2>How to play</h2>
    <ul>
      <li><b>Click the tree</b> to chop a log (it regrows over time).</li>
      <li><b>Click and drag a log</b> to pull it. The pull is force-limited: you can't shove logs through walls or move several at once.</li>
      <li>Get logs into the <b>furnace pit</b> on the right to earn cash. Logs that fall in the lake are lost.</li>
      <li><b>Shop:</b> pick a tool, then click the map to place it (green = OK, red = blocked; refused placements never cost cash). <b>E</b> rotates, <b>Esc</b> or right-click cancels.</li>
      <li><b>Click a placed tool</b> to see its stats, upgrade it (3 tiers) or remove it for an 80% refund. <b>Z</b> undoes your last build action, <b>Delete</b> removes the selected tool.</li>
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

// --- shop buttons (built once from the catalog) ---
const shop = $('shop');
const shopButtons = new Map<EquipmentKind, HTMLButtonElement>();
for (const spec of Object.values(EQUIPMENT_CATALOG)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = spec.description;
  b.textContent = `${spec.label} $${spec.price}`;
  b.addEventListener('click', () => game.events.emit('cmd:build', spec.kind));
  shop.appendChild(b);
  shopButtons.set(spec.kind, b);
}
$('undo').addEventListener('click', () => game.events.emit('cmd:undo'));

// The selected-tool panel is only rebuilt when its content changes; rebuilding every frame would
// swap the buttons out from under the mouse between mousedown and mouseup.
const panel = $('panel');
let panelKey = '';
const IDLE_HINT = 'Pick a tool from the shop, then click the map. Click a placed tool to upgrade or remove it.';
function renderPanel(sel: SelectedInfo | null, cash: number): void {
  const key = JSON.stringify([sel, sel && sel.upgradeCost !== null ? cash >= sel.upgradeCost : null]);
  if (key === panelKey) return;
  panelKey = key;
  panel.replaceChildren();
  if (!sel) {
    panel.textContent = IDLE_HINT;
    return;
  }
  const title = document.createElement('b');
  title.textContent = `${sel.label} (upgrades ${sel.tier}/${sel.maxTier})`;
  const stats = document.createElement('span');
  stats.textContent = [...sel.statLines, sel.status].filter(Boolean).join(' | ');
  const up = document.createElement('button');
  up.type = 'button';
  if (sel.upgradeCost === null) {
    up.textContent = 'Max upgrades';
    up.disabled = true;
  } else {
    up.textContent = `Upgrade $${sel.upgradeCost}`;
    up.title = sel.upgradeLine ?? '';
    up.disabled = cash < sel.upgradeCost;
  }
  up.addEventListener('click', () => game.events.emit('cmd:upgrade'));
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.textContent = `Remove (+$${sel.refund})`;
  rm.addEventListener('click', () => game.events.emit('cmd:remove'));
  panel.append(title, stats);
  if (sel.upgradeLine) {
    const next = document.createElement('span');
    next.className = 'next';
    next.textContent = `Next: ${sel.upgradeLine}`;
    panel.append(next);
  }
  panel.append(up, rm);
}

game.events.on('hud', (s: HudState) => {
  for (const [kind, b] of shopButtons) {
    const price = EQUIPMENT_CATALOG[kind].price;
    b.setAttribute('aria-pressed', String(s.buildKind === kind));
    b.classList.toggle('active', s.buildKind === kind);
    b.classList.toggle('unaffordable', s.cash < price);
  }
  ($('undo') as HTMLButtonElement).disabled = !s.canUndo;
  renderPanel(s.selected, s.cash);
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
