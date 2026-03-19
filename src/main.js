import { createRenderer, THREE } from './rendering/setup.js';
import { createWorld } from './rendering/world.js';
import { createCar } from './rendering/car.js';
import { createEffects } from './rendering/effects.js';
import { createCarPhysics } from './physics/carPhysics.js';
import { createControls } from './input/controls.js';
import { createUI } from './ui/hud.js';
import { createAudio } from './sounds/audio.js';
import { CONFIG } from './core/config.js';
import { MODELS_PLACEHOLDER } from '../assets/models/placeholder.js';
import { TEXTURES_PLACEHOLDER } from '../assets/textures/placeholder.js';
import { SOUNDS_PLACEHOLDER } from '../assets/sounds/placeholder.js';

const app = document.getElementById('app');
const { renderer, scene, camera, composer, bloomPass } = createRenderer(app);
const clock = new THREE.Clock();
const ui = createUI();
const input = createControls();
const worldApi = createWorld(scene);
const car = createCar(scene);
const effects = createEffects(scene);
const physics = createCarPhysics(worldApi, effects);
const listener = new THREE.AudioListener();
camera.add(listener);
const audio = createAudio(listener, physics);

const runtime = { running: false, pendingScore: null };
void MODELS_PLACEHOLDER;
void TEXTURES_PLACEHOLDER;
void SOUNDS_PLACEHOLDER;

function getBoard() { try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]'); } catch { return []; } }
function saveBoard(entries) { localStorage.setItem(CONFIG.storageKey, JSON.stringify(entries.slice(0, 5))); ui.renderBoard(getBoard()); }
ui.renderBoard(getBoard());

function maybePromptLeaderboard() {
  const score = Math.round(physics.game.score); const board = getBoard();
  if (score < 300) return;
  if (!(board.length < 5 || score > board[board.length - 1].score)) return;
  runtime.pendingScore = score; runtime.running = false; ui.showSaveModal(localStorage.getItem(CONFIG.lastNameKey) || 'Driver');
}

function savePendingScore() {
  if (!runtime.pendingScore) return;
  const name = (ui.refs.playerNameInput.value.trim() || 'Driver').slice(0, 16);
  localStorage.setItem(CONFIG.lastNameKey, name);
  const board = getBoard(); board.push({ name, score: runtime.pendingScore }); board.sort((a, b) => b.score - a.score); saveBoard(board);
  runtime.pendingScore = null; ui.hideSaveModal(); runtime.running = true; ui.setStatus(`<strong>Score saved.</strong> ${name} posted ${Math.round(physics.game.score).toLocaleString()} drift points.`);
}

function resetGame() {
  physics.reset(true); ui.setStatus('<strong>Reset complete.</strong> Damage repaired and combo restored.');
}
resetGame();

function updateCarVisuals(dt) {
  const damageTint = physics.state.damage / 100;
  physics.state.flash = Math.max(0, physics.state.flash - dt * 2.4);
  car.paintMat.color.setRGB(THREE.MathUtils.lerp(0.16, 1.0, physics.state.flash * 0.8), THREE.MathUtils.lerp(0.62, 0.24, damageTint), THREE.MathUtils.lerp(1.0, 0.22, damageTint));
  car.paintMat.roughness = 0.28 + damageTint * 0.2;
  car.underGlow.material.opacity = 0.06 + THREE.MathUtils.clamp(physics.state.speed / 60, 0, 0.1);
  car.brakeLightMat.color.set(input.brake ? 0xff6b5f : 0xaa332d);
  car.carRoot.position.set(physics.state.position.x, physics.state.position.y + 0.22, physics.state.position.z);
  car.carRoot.rotation.y = physics.state.yaw;
  const forward = physics.getForward();
  const pitch = THREE.MathUtils.clamp(-physics.state.velocity.dot(forward) * 0.012 - (input.throttle ? 0.02 : 0) + (input.brake ? 0.03 : 0), -0.12, 0.15);
  const roll = THREE.MathUtils.clamp(physics.getLateralSpeed() * 0.02 + physics.state.steer * 0.08, -0.22, 0.22);
  car.bodyTilt.rotation.x = THREE.MathUtils.lerp(car.bodyTilt.rotation.x, pitch, 1 - Math.exp(-dt * 6));
  car.bodyTilt.rotation.z = THREE.MathUtils.lerp(car.bodyTilt.rotation.z, roll, 1 - Math.exp(-dt * 6));
  car.bodyTilt.position.y = 0.1 + Math.sin(performance.now() * 0.012) * THREE.MathUtils.clamp(physics.state.speed / 48, 0, 0.08);
  const spin = physics.state.speed * dt * 2.9;
  car.wheels.forEach((wheel, idx) => { wheel.rotation.x += spin; if (idx < 2) wheel.rotation.y = -physics.state.steer * 0.4; });
}

function updateCamera(dt) {
  const forward = physics.getForward(); const right = physics.getRight();
  const target = car.carRoot.position.clone().add(new THREE.Vector3(0, 2.1, 0));
  const desired = target.clone().add(new THREE.Vector3(0, 8.2, 0)).add(forward.clone().multiplyScalar(-19 - physics.state.speed * 0.16)).add(right.clone().multiplyScalar(physics.state.steer * 1.7));
  if (physics.game.shake > 0.001) desired.add(new THREE.Vector3((Math.random() - .5) * physics.game.shake * 4, (Math.random() - .5) * physics.game.shake * 2, (Math.random() - .5) * physics.game.shake * 4));
  camera.position.lerp(desired, 1 - Math.exp(-dt * 4.2));
  camera.lookAt(target.clone().add(forward.clone().multiplyScalar(3 + physics.state.speed * 0.05)));
  physics.game.shake = Math.max(0, physics.game.shake - dt * 1.9);
}

function updateGameState() {
  if (physics.game.comboHold > 0.05) ui.setStatus('<strong>Drift locked.</strong> Keep the weight loaded and stretch the combo.');
  if (physics.state.damage >= 100) ui.setStatus('<strong>Critical damage.</strong> Press R to restore full power.');
  if (physics.state.speed < 1.2 && physics.state.drifted) { maybePromptLeaderboard(); physics.state.drifted = false; }
}

window.addEventListener('keydown', (e) => { if (e.code === 'KeyR') resetGame(); });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); bloomPass.setSize(window.innerWidth, window.innerHeight); effects.particleMat.uniforms.pointScale.value = window.innerHeight / 2;
});

ui.refs.playBtn.addEventListener('click', async () => { await audio.start(); runtime.running = true; ui.showGame(); ui.setStatus('<strong>Drive live.</strong> Search for clean asphalt, set angle, and link your slides.'); });
ui.refs.clearScoresBtn.addEventListener('click', () => { localStorage.removeItem(CONFIG.storageKey); ui.renderBoard([]); });
ui.refs.saveScoreBtn.addEventListener('click', savePendingScore);
ui.refs.skipScoreBtn.addEventListener('click', () => { runtime.pendingScore = null; runtime.running = true; ui.hideSaveModal(); });
ui.refs.playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') savePendingScore(); });

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.033);
  if (runtime.running) { physics.update(dt, input); audio.update(input); updateGameState(); }
  updateCarVisuals(dt); effects.update(dt); updateCamera(dt); ui.updateHUD(physics); composer.render();
}

tick();
