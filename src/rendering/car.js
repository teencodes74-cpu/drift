import { THREE } from './setup.js';

export function createCar(scene) {
  const carRoot = new THREE.Group();
  const bodyTilt = new THREE.Group();
  carRoot.add(bodyTilt);
  scene.add(carRoot);

  const paintMat = new THREE.MeshPhysicalMaterial({ color: 0x2aa7ff, metalness: 0.58, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.16, sheen: 0.5, emissive: 0x081321 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x101316, roughness: 0.82, metalness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa9d9ff, transparent: true, opacity: 0.45, roughness: 0.12, metalness: 0.4, transmission: 0.2 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe7c0 });
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xff453f });

  add(bodyTilt, new THREE.BoxGeometry(4.2, 1.1, 8.6), paintMat, [0, 1.55, 0]);
  add(bodyTilt, new THREE.BoxGeometry(3.75, 0.65, 2.2), paintMat, [0, 1.88, 2.55]);
  add(bodyTilt, new THREE.BoxGeometry(3.05, 1.15, 3.5), glassMat, [0, 2.35, -0.25]);
  add(bodyTilt, new THREE.BoxGeometry(2.8, 0.22, 2.2), paintMat, [0, 2.95, -0.35]);
  add(bodyTilt, new THREE.BoxGeometry(4.05, 0.18, 0.9), trimMat, [0, 0.8, 4.25]);
  add(bodyTilt, new THREE.BoxGeometry(4.05, 0.18, 0.9), trimMat, [0, 0.8, -4.2]);
  add(bodyTilt, new THREE.BoxGeometry(0.18, 0.35, 6.1), trimMat, [2.05, 0.95, 0]);
  add(bodyTilt, new THREE.BoxGeometry(0.18, 0.35, 6.1), trimMat, [-2.05, 0.95, 0]);
  add(bodyTilt, new THREE.BoxGeometry(0.18, 0.9, 0.18), trimMat, [1.2, 2.3, -3.5]);
  add(bodyTilt, new THREE.BoxGeometry(0.18, 0.9, 0.18), trimMat, [-1.2, 2.3, -3.5]);
  add(bodyTilt, new THREE.BoxGeometry(3.4, 0.18, 1.0), trimMat, [0, 2.7, -3.55]);
  add(bodyTilt, new THREE.BoxGeometry(0.72, 0.24, 0.12), lightMat, [1.25, 1.55, 4.26]);
  add(bodyTilt, new THREE.BoxGeometry(0.72, 0.24, 0.12), lightMat, [-1.25, 1.55, 4.26]);
  add(bodyTilt, new THREE.BoxGeometry(0.72, 0.24, 0.12), brakeLightMat, [1.25, 1.55, -4.26]);
  add(bodyTilt, new THREE.BoxGeometry(0.72, 0.24, 0.12), brakeLightMat, [-1.25, 1.55, -4.26]);

  const wheelGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.62, 18); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.86, metalness: 0.28 });
  const wheels = [[-1.78, 0.82, 2.7],[1.78, 0.82, 2.7],[-1.78, 0.82, -2.55],[1.78, 0.82, -2.55]].map((pos) => add(bodyTilt, wheelGeo, wheelMat, pos));

  const underGlow = new THREE.Mesh(new THREE.CircleGeometry(4.1, 32), new THREE.MeshBasicMaterial({ color: 0x4ec6ff, transparent: true, opacity: 0.08 }));
  underGlow.rotation.x = -Math.PI / 2; underGlow.position.y = 0.08; carRoot.add(underGlow);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.8, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06; carRoot.add(shadow);

  return { carRoot, bodyTilt, paintMat, brakeLightMat, wheels, underGlow };
}

function add(parent, geometry, material, [x, y, z]) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
