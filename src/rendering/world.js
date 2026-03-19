import { THREE } from './setup.js';
import { CONFIG } from '../core/config.js';

export function createWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);
  const halfWorld = CONFIG.worldSize / 2;
  const roadWidth = CONFIG.roadWidth;

  const terrainNoise = makeNoise(2.7);
  const macroNoise = makeNoise(9.1);
  const clamp = THREE.MathUtils.clamp;

  function roadCenterX(z) { return Math.sin(z * 0.004) * 180 + Math.sin(z * 0.015 + 1.7) * 55; }
  function roadCenterZ(x) { return Math.cos(x * 0.004 + 0.6) * 180 + Math.sin(x * 0.013) * 45; }
  function rampShape(x, z) { return Math.sin((x + z) * 0.012) * 1.8 + Math.cos(z * 0.016) * 1.2; }
  function roadDistance(x, z) { return Math.min(Math.abs(x - roadCenterX(z)), Math.abs(z - roadCenterZ(x))); }
  function roadInfluence(x, z) { return clamp(1 - roadDistance(x, z) / (roadWidth * 2.3), 0, 1); }
  function groundHeight(x, z) {
    const road = roadInfluence(x, z);
    const terrain = terrainNoise(x, z) + macroNoise(x * 0.6, z * 0.6) * 0.35;
    return terrain * (1 - road * 0.88) + (5 + rampShape(x, z)) * road * 0.95;
  }

  const textures = createTextures();
  buildTerrain(world, groundHeight, roadInfluence, textures.grass);
  buildRoadOverlay(world, groundHeight, roadInfluence, textures.asphalt);
  populateWorld(world, groundHeight, roadDistance, textures);
  addRoadDecor(world, groundHeight, roadCenterX, roadCenterZ, halfWorld);

  return { world, halfWorld, groundHeight, roadInfluence, roadCenterX, roadCenterZ, roadWidth, textures };
}

function makeNoise(seed = 1) {
  return (x, z) => Math.sin(x * 0.008 + seed) * Math.cos(z * 0.011 - seed * 2.1) * 32 + Math.sin((x + z) * 0.019) * 10 + Math.cos(Math.hypot(x, z) * 0.016 + seed * 0.7) * 15 + Math.sin(x * 0.045 - z * 0.036 + seed * 1.5) * 5;
}

function createTextures() {
  return {
    asphalt: canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#474b54'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) { const v = 48 + Math.random() * 35; ctx.fillStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.18})`; ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 3, Math.random() * 3); }
    }, 40, 40),
    grass: canvasTexture((ctx, w, h) => {
      const grd = ctx.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#45682c'); grd.addColorStop(1, '#293f17'); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { const g = 90 + Math.random() * 100; ctx.fillStyle = `rgba(${30 + Math.random() * 20},${g},${20 + Math.random() * 20},${0.18 + Math.random() * 0.18})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1, 4 + Math.random() * 6); }
    }, 55, 55),
    dirt: canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#6e523b'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1900; i++) { ctx.fillStyle = `rgba(${90 + Math.random() * 50},${60 + Math.random() * 30},${40 + Math.random() * 20},${0.18 + Math.random() * 0.18})`; ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 4 + 1, 0, Math.PI * 2); ctx.fill(); }
    }, 36, 36),
    rock: canvasTexture((ctx, w, h) => {
      ctx.fillStyle = '#7e7975'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) { const v = 110 + Math.random() * 60; ctx.fillStyle = `rgba(${v},${v},${v},${0.14 + Math.random() * 0.18})`; ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 4 + 1, Math.random() * 4 + 1); }
    }, 8, 8),
  };
}

function canvasTexture(draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d'); draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY); texture.anisotropy = 8; return texture;
}

function buildTerrain(world, groundHeight, roadInfluence, grassTex) {
  const geo = new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize, 220, 220); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; const colors = []; const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const road = roadInfluence(x, z); const y = groundHeight(x, z); pos.setY(i, y);
    const steep = THREE.MathUtils.clamp((y + 20) / 85, 0, 1);
    if (road > 0.52) color.setRGB(0.22 + road * 0.1, 0.22 + road * 0.1, 0.24 + road * 0.12);
    else if (steep > 0.7) color.setRGB(0.43, 0.4, 0.36);
    else color.setRGB(0.13 + steep * 0.08, 0.32 + steep * 0.18, 0.09 + steep * 0.08);
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 1 })); mesh.receiveShadow = true; world.add(mesh);
}

function buildRoadOverlay(world, groundHeight, roadInfluence, asphaltTex) {
  const geo = new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize, 220, 220); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, alphaAttr = [];
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundHeight(x, z) + 0.12); alphaAttr.push(THREE.MathUtils.clamp((roadInfluence(x, z) - 0.3) / 0.7, 0, 1)); }
  geo.setAttribute('alpha', new THREE.Float32BufferAttribute(alphaAttr, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { map: { value: asphaltTex } },
    vertexShader: `attribute float alpha; varying vec2 vUv; varying float vAlpha; void main(){ vUv=uv; vAlpha=alpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vAlpha; void main(){ vec4 tex=texture2D(map,vUv); gl_FragColor=vec4(tex.rgb, tex.a*vAlpha); if(gl_FragColor.a<0.02) discard; }`
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; world.add(mesh);
}

function populateWorld(world, groundHeight, roadDistance, textures) {
  makeInstanced(world, new THREE.CylinderGeometry(0.32, 0.5, 4.4, 8), new THREE.MeshStandardMaterial({ color: 0x5c3d2a, roughness: 1 }), 300, roadDistance, groundHeight, ({ matrix, color, x, y, z }) => {
    const s = THREE.MathUtils.randFloat(0.8, 1.8); matrix.compose(new THREE.Vector3(x, y + 2.2 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, THREE.MathUtils.randFloat(-0.04, 0.04))), new THREE.Vector3(s, s, s)); color.setRGB(0.35, 0.22, 0.15); return true;
  });
  makeInstanced(world, new THREE.ConeGeometry(2.6, 7.5, 8), new THREE.MeshStandardMaterial({ color: 0x4c8b43, roughness: 1, map: textures.grass }), 300, roadDistance, groundHeight, ({ matrix, color, x, y, z }) => {
    const s = THREE.MathUtils.randFloat(1.2, 2.5); matrix.compose(new THREE.Vector3(x, y + 7 * s * 0.45, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0)), new THREE.Vector3(s, s, s)); color.setHSL(0.28 + Math.random() * 0.03, 0.4, 0.3 + Math.random() * 0.08); return true;
  });
  makeInstanced(world, new THREE.IcosahedronGeometry(2.8, 0), new THREE.MeshStandardMaterial({ map: textures.rock, color: 0x8c857e, roughness: 1 }), 240, roadDistance, groundHeight, ({ matrix, color, x, y, z }) => {
    const s = THREE.MathUtils.randFloat(0.8, 3.2); matrix.compose(new THREE.Vector3(x, y + 1.7 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random())), new THREE.Vector3(s, s * 0.8, s * 1.15)); color.setRGB(0.45 + Math.random() * 0.08, 0.43 + Math.random() * 0.08, 0.4 + Math.random() * 0.08); return true;
  });
  const barrier = new THREE.InstancedMesh(new THREE.BoxGeometry(6.4, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: 0xdad5cb, roughness: 0.92, map: textures.rock }), 260);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  barrier.castShadow = true; barrier.receiveShadow = true;
  for (let i = 0; i < 260; i++) {
    const mainAxis = Math.random() > 0.5; const t = THREE.MathUtils.randFloatSpread(CONFIG.worldSize * 0.8); const side = Math.random() > 0.5 ? 1 : -1;
    const x = mainAxis ? Math.sin(t * 0.004) * 180 + Math.sin(t * 0.015 + 1.7) * 55 + side * (CONFIG.roadWidth + 8 + Math.random() * 6) : t;
    const z = mainAxis ? t : Math.cos(t * 0.004 + 0.6) * 180 + Math.sin(t * 0.013) * 45 + side * (CONFIG.roadWidth + 8 + Math.random() * 6);
    q.setFromEuler(new THREE.Euler(0, mainAxis ? 0 : Math.PI / 2, 0)); s.set(1 + Math.random() * 0.4, 1, 1); m.compose(new THREE.Vector3(x, groundHeight(x, z) + 1.1, z), q, s); barrier.setMatrixAt(i, m);
  }
  world.add(barrier);
}

function makeInstanced(world, geometry, material, count, roadDistance, groundHeight, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.castShadow = true; mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4(); const color = new THREE.Color(); let placed = 0;
  for (let i = 0; i < count * 7 && placed < count; i++) {
    const x = THREE.MathUtils.randFloatSpread(CONFIG.worldSize * 0.94); const z = THREE.MathUtils.randFloatSpread(CONFIG.worldSize * 0.94); if (roadDistance(x, z) < CONFIG.roadWidth * 1.25) continue;
    if (!place({ matrix, color, x, y: groundHeight(x, z), z })) continue; mesh.setMatrixAt(placed, matrix); mesh.setColorAt(placed, color); placed++;
  }
  mesh.count = placed; world.add(mesh);
}

function addRoadDecor(world, groundHeight, roadCenterX, roadCenterZ, halfWorld) {
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf4ead1, emissive: 0x44351d, roughness: 0.75 });
  const geo = new THREE.BoxGeometry(1.5, 0.05, 9.2);
  const stripes = new THREE.Group();
  for (let z = -halfWorld + 24; z < halfWorld - 24; z += 26) { const x = roadCenterX(z); const stripe = new THREE.Mesh(geo, stripeMat); stripe.position.set(x, groundHeight(x, z) + 0.12, z); stripe.receiveShadow = true; stripes.add(stripe); }
  for (let x = -halfWorld + 24; x < halfWorld - 24; x += 26) { const z = roadCenterZ(x); const stripe = new THREE.Mesh(geo, stripeMat); stripe.rotation.y = Math.PI / 2; stripe.position.set(x, groundHeight(x, z) + 0.12, z); stripe.receiveShadow = true; stripes.add(stripe); }
  world.add(stripes);
}
