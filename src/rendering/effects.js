import { THREE } from './setup.js';
import { CONFIG } from '../core/config.js';

export function createEffects(scene) {
  const skidPos = new Float32Array(CONFIG.skidMax * 2 * 3);
  const skidCol = new Float32Array(CONFIG.skidMax * 2 * 3);
  const skidGeo = new THREE.BufferGeometry();
  skidGeo.setAttribute('position', new THREE.BufferAttribute(skidPos, 3));
  skidGeo.setAttribute('color', new THREE.BufferAttribute(skidCol, 3));
  const skidLines = new THREE.LineSegments(skidGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42 }));
  scene.add(skidLines);
  let skidIndex = 0;

  const particlePositions = new Float32Array(CONFIG.particleCount * 3);
  const particleColors = new Float32Array(CONFIG.particleCount * 3);
  const particleSizes = new Float32Array(CONFIG.particleCount);
  const particles = Array.from({ length: CONFIG.particleCount }, () => ({ life: 0, velocity: new THREE.Vector3() }));
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
  const particleMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { pointScale: { value: window.innerHeight / 2 } },
    vertexShader: `attribute float size; varying vec3 vColor; void main(){ vColor=color; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*(300.0 / -mvPosition.z); gl_Position=projectionMatrix*mvPosition; }`,
    fragmentShader: `varying vec3 vColor; void main(){ vec2 uv=gl_PointCoord-0.5; float d=dot(uv,uv); float a=smoothstep(0.26,0.0,d); gl_FragColor=vec4(vColor,a); }`
  });
  const particlePoints = new THREE.Points(particleGeo, particleMat);
  scene.add(particlePoints);
  let particleCursor = 0;

  return {
    particleMat,
    addSkid(left, right, alpha) {
      const i = (skidIndex % CONFIG.skidMax) * 6; const a = THREE.MathUtils.clamp(alpha, 0.08, 0.75);
      skidPos.set([left.x, left.y + 0.03, left.z, right.x, right.y + 0.03, right.z], i);
      skidCol.set([a, a, a, a, a, a], i);
      skidGeo.attributes.position.needsUpdate = true; skidGeo.attributes.color.needsUpdate = true; skidGeo.setDrawRange(0, Math.min(++skidIndex, CONFIG.skidMax) * 2);
    },
    spawnParticle(position, velocity, color, size, life) {
      const idx = particleCursor++ % CONFIG.particleCount; particles[idx].life = life; particles[idx].velocity.copy(velocity);
      particlePositions[idx * 3] = position.x; particlePositions[idx * 3 + 1] = position.y; particlePositions[idx * 3 + 2] = position.z;
      particleColors[idx * 3] = color.r; particleColors[idx * 3 + 1] = color.g; particleColors[idx * 3 + 2] = color.b; particleSizes[idx] = size;
    },
    update(dt) {
      for (let i = 0; i < CONFIG.particleCount; i++) {
        const p = particles[i]; if (p.life <= 0) continue; p.life -= dt; const idx = i * 3;
        particlePositions[idx] += p.velocity.x * dt; particlePositions[idx + 1] += p.velocity.y * dt; particlePositions[idx + 2] += p.velocity.z * dt;
        p.velocity.multiplyScalar(1 - dt * 0.8); p.velocity.y += dt * 0.6; particleSizes[i] *= 1 - dt * 0.35;
        const fade = THREE.MathUtils.clamp(p.life * 1.5, 0, 1); particleColors[idx] *= fade; particleColors[idx + 1] *= fade; particleColors[idx + 2] *= fade; if (p.life <= 0) particleSizes[i] = 0;
      }
      particleGeo.attributes.position.needsUpdate = true; particleGeo.attributes.color.needsUpdate = true; particleGeo.attributes.size.needsUpdate = true;
    }
  };
}
