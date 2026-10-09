import * as THREE from 'three';

export function initStarfield(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    return; // The SVG starfield is already rendered underneath.
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2400);
  const count = window.innerWidth < 600 ? 850 : 1800;
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
  scene.add(stars);
  let frame = 0;
  let progress = 0;
  let readerMode = document.documentElement.dataset.mode === 'reader';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let available = true;
  let disposed = false;

  // Render only after a change. Nothing keeps moving when the scroll stops.
  function render() {
    frame = 0;
    if (!available || disposed || document.hidden) return;
    const movement = motionQuery.matches || readerMode ? 0 : progress;
    camera.position.z = -movement * 45;
    stars.rotation.z = movement * 0.018;
    stars.position.y = movement * 12;
    renderer.render(scene, camera);
    canvas.parentElement?.classList.add('has-webgl');
  }
  function requestRender() {
    if (!frame && !disposed) frame = window.requestAnimationFrame(render);
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    material.uniforms.uPixelRatio.value = ratio;
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
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
    canvas.parentElement?.classList.remove('has-webgl');
  }
  function onContextRestored() {
    available = true;
    resize();
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
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('opening:progress', onProgress);
  document.addEventListener('visibilitychange', requestRender);
  motionQuery.addEventListener('change', requestRender);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); }, { once: true });
  resize();
}
