import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CONFIG } from '../core/config.js';

export { THREE };

export function createRenderer(app) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe39d74, 0.0009);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 8, -20);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.6, 0.72);
  composer.addPass(bloomPass);

  const hemi = new THREE.HemisphereLight(0xffe4d3, 0x1d2718, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd1aa, 3.2);
  sun.position.set(-120, 180, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CONFIG.shadowMapSize, CONFIG.shadowMapSize);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 700;
  scene.add(sun);

  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffc977, transparent: true, opacity: 0.72 }));
  sunGlow.position.copy(sun.position).multiplyScalar(4.2);
  scene.add(sunGlow);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x121a38) },
        midColor: { value: new THREE.Color(0xf18e69) },
        bottomColor: { value: new THREE.Color(0xffd1a5) },
        sunDir: { value: sun.position.clone().normalize() },
      },
      vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position,1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor; uniform vec3 sunDir; varying vec3 vWorldPosition; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); } float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.)); vec2 u=f*f*(3.-2.*f); return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y; } void main(){ vec3 dir=normalize(vWorldPosition); float h=clamp(dir.y*0.5+0.5,0.0,1.0); vec3 col=mix(bottomColor,midColor,smoothstep(0.0,0.5,h)); col=mix(col,topColor,smoothstep(0.45,1.0,h)); float sunAmt=pow(max(dot(dir,sunDir),0.0),320.0); float haze=pow(max(dot(dir,sunDir),0.0),6.0); float clouds=smoothstep(0.58,0.78,noise(dir.xz*8.0+dir.y*3.0)*0.6+noise(dir.xz*15.0)*0.4); col += vec3(1.0,0.8,0.6)*sunAmt*1.8; col=mix(col,vec3(1.0,0.92,0.88),clouds*0.12*(1.0-h)); col += vec3(1.0,0.72,0.45)*haze*0.18; gl_FragColor=vec4(col,1.0); }`,
    })
  );
  scene.add(sky);

  return { renderer, scene, camera, composer, bloomPass, sun };
}
