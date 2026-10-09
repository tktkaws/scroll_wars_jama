import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** An orthographic pass keeps the nearby horizon framed on every screen. */
export function createPlanets(requestRender: () => void, onLoadFailure: () => void) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.z = 100;
  const bodies = new THREE.Group();
  scene.add(bodies, new THREE.AmbientLight(0x9daec7, 0.8));
  const sunlight = new THREE.DirectionalLight(0xffe7c2, 2.8);
  sunlight.position.set(-5, 8, 100);
  scene.add(sunlight);
  const loader = new GLTFLoader();
  let saturn: THREE.Group | undefined;
  let moons: THREE.Group[] = [];
  let disposed = false;
  let aspect = 1;
  let loaded = false;

  function release(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
  }

  function layout() {
    camera.left = -aspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();
    if (saturn) {
      const radius = Math.max(4, aspect * aspect * 10);
      saturn.scale.setScalar(radius / 500);
      saturn.getObjectByName('Blue atmosphere')?.scale.setScalar(1 + 0.008 / radius);
      saturn.rotation.set(0.22, -0.15, 0);
      saturn.position.set(0, 0, -radius);
      saturn.updateMatrixWorld(true);
      // Measure the rotated mesh vertices; rotated bounding boxes overestimate
      // the limb height and push the actual surface below the viewport.
      const bounds = new THREE.Box3().setFromObject(saturn, true);
      saturn.position.y = -0.8 - bounds.max.y;
    }
    moons.forEach((moon, index) => {
      moon.scale.setScalar((index === 0 ? 0.105 : 0.065) / 500);
      moon.position.set((index === 0 ? -0.62 : 0.57) * aspect, index === 0 ? -0.2 : 0.05, 2);
      moon.rotation.set(0.2, index === 0 ? 0.4 : 2.6, index === 0 ? 0 : 0.4);
    });
  }

  Promise.allSettled([
    loader.loadAsync('/models/saturn.glb'),
    loader.loadAsync('/models/rhea.glb'),
  ]).then((results) => {
    if (disposed || results.some((result) => result.status === 'rejected')) {
      results.forEach((result) => { if (result.status === 'fulfilled') release(result.value.scene); });
      if (!disposed) onLoadFailure();
      return;
    }
    const planet = results[0];
    const moon = results[1];
    if (planet.status !== 'fulfilled' || moon.status !== 'fulfilled') return;
    saturn = planet.value.scene;
    // GLTFLoader sanitizes node names, so select the planet's first mesh.
    const surface = saturn.getObjectByProperty('type', 'Mesh');
    if (surface instanceof THREE.Mesh) {
      const materials = Array.isArray(surface.material) ? surface.material : [surface.material];
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.color.set('#ce9050');
          material.metalness = 0;
          material.roughness = 0.95;
        }
      });
      // A thin, slightly expanded shell lights only the visible atmospheric rim.
      const atmosphere = new THREE.Mesh(surface.geometry, new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color('#4daaff') } },
        vertexShader: `
          varying vec3 viewNormal;
          void main() {
            vec4 positionInView = modelViewMatrix * vec4(position, 1.0);
            viewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * positionInView;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying vec3 viewNormal;
          void main() {
            // This pass uses an orthographic camera; its viewing rays are parallel.
            float rim = 1.0 - clamp(dot(normalize(viewNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
            float glow = pow(rim, 40.0) * 0.85;
            gl_FragColor = vec4(glowColor, glow);
          }
        `,
      }));
      atmosphere.name = 'Blue atmosphere';
      atmosphere.position.copy(surface.position);
      atmosphere.quaternion.copy(surface.quaternion);
      atmosphere.scale.copy(surface.scale).multiplyScalar(1.004);
      surface.parent?.add(atmosphere);
    }
    moons = [moon.value.scene, moon.value.scene.clone(true)];
    bodies.add(saturn, ...moons);
    loaded = true;
    layout();
    requestRender();
  });

  return {
    resize(nextAspect: number) { aspect = nextAspect; layout(); },
    render(renderer: THREE.WebGLRenderer, pan: number) {
      camera.position.y = (1 - pan) * 2.8;
      if (!loaded || pan <= 0) return false;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;
      return true;
    },
    dispose() { disposed = true; release(bodies); },
  };
}
