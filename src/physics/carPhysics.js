import { THREE } from '../rendering/setup.js';

export function createCarPhysics(worldApi, effects) {
  const state = { position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3(), yaw: 0, angularVelocity: 0, steer: 0, speed: 0, damage: 0, flash: 0, drifted: false };
  const game = { score: 0, combo: 1, comboHold: 0, driftTime: 0, shake: 0 };
  const frontOffset = 2.75; const sideOffset = 1.65;
  let lastBarrierHit = false;
  const tmpA = new THREE.Vector3(); const tmpB = new THREE.Vector3(); const tmpC = new THREE.Vector3();

  function getForward(out = new THREE.Vector3()) { return out.set(Math.sin(state.yaw), 0, Math.cos(state.yaw)); }
  function getRight(out = new THREE.Vector3()) { return out.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw)); }
  function getLateralSpeed() { return state.velocity.dot(getRight(tmpA)); }

  function reset(full = true) {
    state.position.set(0, worldApi.groundHeight(0, 0), 0); state.velocity.set(0, 0, 0); state.yaw = 0; state.angularVelocity = 0; state.steer = 0; state.speed = 0; state.flash = 0;
    if (full) { state.damage = 0; game.score = 0; game.combo = 1; game.comboHold = 0; game.driftTime = 0; }
  }

  function crash(force) {
    const hit = THREE.MathUtils.clamp(force / 55, 0.05, 0.34); state.damage = THREE.MathUtils.clamp(state.damage + force * 0.46, 0, 100); state.flash = 1; game.shake = Math.max(game.shake, hit * 1.6); game.combo = 1; game.comboHold = 0;
    const puffColor = new THREE.Color(0.24, 0.24, 0.24);
    for (let i = 0; i < 14; i++) effects.spawnParticle(state.position.clone().add(new THREE.Vector3((Math.random() - .5) * 2, 1.2 + Math.random() * 1.2, (Math.random() - .5) * 2)), new THREE.Vector3((Math.random() - .5) * 10, 2 + Math.random() * 4, (Math.random() - .5) * 10), puffColor, 12 + Math.random() * 18, 1.3);
  }

  function clampToWorld() {
    let hit = false; const half = worldApi.halfWorld;
    if (Math.abs(state.position.x) > half - 12) { state.position.x = THREE.MathUtils.clamp(state.position.x, -half + 12, half - 12); state.velocity.x *= -0.32; hit = true; }
    if (Math.abs(state.position.z) > half - 12) { state.position.z = THREE.MathUtils.clamp(state.position.z, -half + 12, half - 12); state.velocity.z *= -0.32; hit = true; }
    if (hit) crash(12 + state.speed * 1.3);
  }

  function barrierCollision() {
    const x = state.position.x, z = state.position.z;
    const nearMain = Math.abs(Math.abs(x - worldApi.roadCenterX(z)) - (worldApi.roadWidth + 8.4)) < 2.2;
    const nearCross = Math.abs(Math.abs(z - worldApi.roadCenterZ(x)) - (worldApi.roadWidth + 8.4)) < 2.2;
    const hit = (nearMain || nearCross) && state.speed > 7;
    if (hit && !lastBarrierHit) { state.velocity.multiplyScalar(0.68); state.angularVelocity += (Math.random() - 0.5) * 2.8; crash(10 + state.speed * 1.7); }
    lastBarrierHit = hit;
  }

  function update(dt, input) {
    const forward = getForward(tmpA); const right = getRight(tmpB);
    const forwardSpeed = state.velocity.dot(forward); const lateralSpeed = state.velocity.dot(right);
    const roadGrip = THREE.MathUtils.lerp(5.2, 10.8, worldApi.roadInfluence(state.position.x, state.position.z));
    const damagePenalty = 1 - state.damage / 130;
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    state.steer = THREE.MathUtils.lerp(state.steer, steerInput, 1 - Math.exp(-dt * 8));

    let accel = 0;
    if (input.throttle) accel += 34 * damagePenalty;
    if (input.brake) accel -= forwardSpeed > 1 ? 28 : 16 * damagePenalty;
    if (!input.throttle && !input.brake) accel -= Math.sign(forwardSpeed) * Math.min(Math.abs(forwardSpeed), 7);

    const gripScalar = input.drift ? 0.28 : 1;
    const weightTransfer = THREE.MathUtils.clamp(Math.abs(state.angularVelocity) * 0.65 + Math.abs(lateralSpeed) * 0.035, 0, 1.4);
    const lateralGrip = roadGrip * gripScalar * (0.94 - Math.min(Math.abs(forwardSpeed) / 96, 0.22));
    const yawTorque = state.steer * THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 8, 0, 1.25) * (1.8 + weightTransfer * 0.8);
    const driftAssist = input.drift ? Math.sign(state.steer || lateralSpeed || 1) * 0.65 : 0;

    state.angularVelocity += (yawTorque + driftAssist * THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 24, 0, 1)) * dt;
    state.angularVelocity *= Math.exp(-(input.drift ? 0.95 : 1.9) * dt);
    state.yaw += state.angularVelocity * dt * 2.35;

    state.velocity.addScaledVector(forward, accel * dt);
    state.velocity.addScaledVector(right, -lateralSpeed * lateralGrip * dt);
    state.velocity.multiplyScalar(Math.pow(worldApi.roadInfluence(state.position.x, state.position.z) > 0.45 ? 0.986 : 0.969, dt * 60));
    state.position.addScaledVector(state.velocity, dt);
    clampToWorld(); barrierCollision();
    state.position.y = worldApi.groundHeight(state.position.x, state.position.z); state.speed = state.velocity.length();

    if (worldApi.roadInfluence(state.position.x, state.position.z) < 0.15 && state.speed > 18) state.damage = THREE.MathUtils.clamp(state.damage + dt * 1.4, 0, 100);
    if (Math.abs(lateralSpeed) > 6.8 && state.speed > 11) {
      const wheelBase = tmpC.copy(forward).multiplyScalar(frontOffset - 0.6); const axle = right.clone().multiplyScalar(sideOffset);
      effects.addSkid(state.position.clone().sub(wheelBase).sub(axle).setY(state.position.y), state.position.clone().sub(wheelBase).add(axle).setY(state.position.y), Math.abs(lateralSpeed) / 18);
    }
    emitParticles(lateralSpeed, forwardSpeed, forward, right);
    updateDrift(dt, lateralSpeed, forwardSpeed, input);
  }

  function emitParticles(lateralSpeed, forwardSpeed, forward, right) {
    const sliding = Math.abs(lateralSpeed) > 7 && Math.abs(forwardSpeed) > 8;
    const offroad = worldApi.roadInfluence(state.position.x, state.position.z) < 0.35;
    if (!(sliding || offroad || state.damage > 72)) return;
    const rear = state.position.clone().sub(forward.clone().multiplyScalar(frontOffset - 0.6));
    const dustColor = offroad ? new THREE.Color(0.72, 0.56, 0.35) : new THREE.Color(0.32, 0.32, 0.32);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const pos = rear.clone().add(right.clone().multiplyScalar(side * sideOffset)).add(new THREE.Vector3(0, 0.3, 0));
      const vel = right.clone().multiplyScalar(side * (2 + Math.random() * 4)).add(forward.clone().multiplyScalar(-2 - Math.random() * 4)).add(new THREE.Vector3(0, 1 + Math.random() * 1.5, 0));
      effects.spawnParticle(pos, vel, dustColor, offroad ? 18 + Math.random() * 16 : 10 + Math.random() * 10, offroad ? 1.1 : 0.7);
    }
    if (state.damage > 72) effects.spawnParticle(state.position.clone().add(new THREE.Vector3(0, 2.0, -2.4)), new THREE.Vector3((Math.random() - .5) * 2, 3 + Math.random() * 2, (Math.random() - .5) * 2), new THREE.Color(0.18, 0.18, 0.18), 18, 1.4);
  }

  function updateDrift(dt, lateralSpeed, forwardSpeed, input) {
    const slide = Math.abs(lateralSpeed);
    const drifting = slide > 5.6 && Math.abs(forwardSpeed) > 8.5 && (input.drift || slide > 8.8);
    if (drifting) {
      game.driftTime += dt; game.comboHold = 1.5; game.combo = THREE.MathUtils.clamp(1 + game.driftTime * 0.58, 1, 6); game.score += slide * Math.abs(forwardSpeed) * 0.09 * game.combo * dt; state.drifted = true;
    } else {
      game.driftTime = Math.max(0, game.driftTime - dt * 2.2); game.comboHold -= dt;
      if (game.comboHold <= 0) game.combo = THREE.MathUtils.lerp(game.combo, 1, 1 - Math.exp(-dt * 8));
    }
  }

  return { state, game, reset, update, getForward, getRight, getLateralSpeed, crash };
}
