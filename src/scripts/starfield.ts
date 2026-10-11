import * as THREE from 'three';
import { sequence, getCameraProgress } from '../data/story';
import { spaceCamera } from '../data/camera';
import { createSceneMoons } from './moons';
import { createScenePlanet } from './planet';

export function initStarfield(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer | undefined;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    canvas.parentElement?.classList.add('no-webgl');
    // Keep projecting the fixed scene into HTML images above the SVG stars.
  }
  renderer?.setClearColor(0x000000, 0);
  const creditsCanvas = document.querySelector<HTMLCanvasElement>('#credits-starfield');
  let creditsRenderer: THREE.WebGLRenderer | undefined;
  if (creditsCanvas && renderer) {
    try {
      creditsRenderer = new THREE.WebGLRenderer({ canvas: creditsCanvas, alpha: true, antialias: false, powerPreference: 'low-power' });
      creditsRenderer.setClearColor(0x000000, 0);
    } catch {
      // The matching SVG stars remain visible if a second context is unavailable.
    }
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(spaceCamera.fov, 1, 0.1, 2400);
  const creditsCamera = new THREE.PerspectiveCamera(spaceCamera.fov, 1, 0.1, 2400);
  const titleCameraProgress = getCameraProgress(sequence.titleFadeInEnd);
  creditsCamera.position.z = -titleCameraProgress * spaceCamera.travel;
  let creditsNeedsRender = true;
  const count = window.innerWidth < 600 ? 1020 : 2160;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  let seed = 1204;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 2400;
    positions[i * 3 + 1] = (random() - 0.5) * 1600;
    positions[i * 3 + 2] = -100 - random() * 1800;
    sizes[i] = 1.8 + random() * 3.2;
    brightness[i] = 0.4 + random() * 0.55;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float aSize;
      attribute float aBrightness;
      uniform float uPixelRatio;
      varying float vBrightness;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(aSize * (500.0 / -viewPosition.z), 1.1, 4.2) * uPixelRatio;
        vBrightness = aBrightness;
      }
    `,
    fragmentShader: `
      varying float vBrightness;
      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float alpha = (1.0 - smoothstep(0.12, 0.5, distanceToCenter)) * vBrightness;
        gl_FragColor = vec4(0.83, 0.88, 0.98, alpha);
      }
    `,
  });
  const stars = new THREE.Points(geometry, material);
  // Keep the entire scene stationary; only the camera moves with the scroll.
  stars.rotation.z = titleCameraProgress * 0.018;
  stars.position.y = titleCameraProgress * 12;
  scene.add(stars);
  let frame = 0;
  let progress = 0;
  let readerMode = document.documentElement.dataset.mode === 'reader';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let available = Boolean(renderer);
  let disposed = false;
  const moons = createSceneMoons(scene, canvas.parentElement?.querySelector<HTMLElement>('.moon-scene') ?? null, requestRender);
  const planet = createScenePlanet(scene, canvas.parentElement?.querySelector<HTMLElement>('.planet-scene') ?? null, requestRender);

  // Render only after a change. Nothing keeps moving when the scroll stops.
  function render() {
    frame = 0;
    if (disposed || document.hidden) return;
    const movement = motionQuery.matches || readerMode ? 0 : progress;
    camera.position.z = -getCameraProgress(movement) * spaceCamera.travel;
    const panProgress = Math.max(0, Math.min(1, (movement - sequence.cameraPanStart) / (sequence.cameraPanEnd - sequence.cameraPanStart)));
    const pan = panProgress * panProgress * (3 - 2 * panProgress);
    camera.rotation.x = -pan * spaceCamera.panAngle;
    camera.updateMatrixWorld();
    const moonsVisible = moons.update(camera);
    const planetVisible = planet.update(camera);
    if (!available || !renderer) return;
    renderer.render(scene, camera);
    if (creditsRenderer && creditsNeedsRender) {
      // Reuse the title's stars at a fixed position, without moons or planets.
      moons.group.visible = false;
      planet.sprite.visible = false;
      creditsRenderer.render(scene, creditsCamera);
      moons.group.visible = moonsVisible;
      planet.sprite.visible = planetVisible;
      creditsCanvas?.parentElement?.classList.add('has-credit-webgl');
      creditsNeedsRender = false;
    }
    canvas.parentElement?.classList.add('has-webgl');
    canvas.parentElement?.classList.toggle('has-scene-moons', moonsVisible);
    canvas.parentElement?.classList.toggle('has-scene-planet', planetVisible);
    canvas.parentElement?.classList.remove('no-webgl');
  }
  function requestRender() {
    if (!frame && !disposed) frame = window.requestAnimationFrame(render);
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer?.setPixelRatio(ratio);
    renderer?.setSize(window.innerWidth, window.innerHeight, false);
    creditsRenderer?.setPixelRatio(ratio);
    creditsRenderer?.setSize(window.innerWidth, window.innerHeight, false);
    creditsCamera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    creditsCamera.updateProjectionMatrix();
    creditsNeedsRender = true;
    material.uniforms.uPixelRatio.value = ratio;
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
    moons.resize(camera.aspect);
    planet.resize(camera.aspect);
    requestRender();
  }
  function onProgress(event: Event) {
    const detail = (event as CustomEvent<{ progress: number; readerMode: boolean }>).detail;
    progress = detail.progress;
    readerMode = detail.readerMode;
    requestRender();
  }
  function onContextLost(event: Event) {
    event.preventDefault();
    available = false;
    canvas.parentElement?.classList.add('no-webgl');
    canvas.parentElement?.classList.remove('has-webgl');
    canvas.parentElement?.classList.remove('has-scene-moons');
    canvas.parentElement?.classList.remove('has-scene-planet');
  }
  function onContextRestored() {
    available = true;
    resize();
  }
  function onCreditsContextLost(event: Event) {
    event.preventDefault();
    creditsCanvas?.parentElement?.classList.remove('has-credit-webgl');
  }
  function onCreditsContextRestored() {
    creditsNeedsRender = true;
    requestRender();
  }
  function dispose() {
    disposed = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('opening:progress', onProgress);
    document.removeEventListener('visibilitychange', requestRender);
    motionQuery.removeEventListener('change', requestRender);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    creditsCanvas?.removeEventListener('webglcontextlost', onCreditsContextLost);
    creditsCanvas?.removeEventListener('webglcontextrestored', onCreditsContextRestored);
    geometry.dispose();
    material.dispose();
    moons.dispose();
    planet.dispose();
    renderer?.dispose();
    creditsRenderer?.dispose();
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('opening:progress', onProgress);
  document.addEventListener('visibilitychange', requestRender);
  motionQuery.addEventListener('change', requestRender);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  creditsCanvas?.addEventListener('webglcontextlost', onCreditsContextLost);
  creditsCanvas?.addEventListener('webglcontextrestored', onCreditsContextRestored);
  window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); }, { once: true });
  resize();
}
