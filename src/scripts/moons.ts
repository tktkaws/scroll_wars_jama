import * as THREE from 'three';
import { moonScene } from '../data/moons';

export function createSceneMoons(scene: THREE.Scene, fallback: HTMLElement | null, requestRender: () => void) {
  const group = new THREE.Group();
  scene.add(group);
  let ready = false;
  let disposed = false;
  const texture = new THREE.TextureLoader().load(moonScene.image, () => {
    if (disposed) return;
    ready = true;
    requestRender();
  }, undefined, () => {
    // Keep the HTML images visible if the WebGL texture cannot be loaded.
    requestRender();
  });
  texture.colorSpace = THREE.SRGBColorSpace;

  const moons = moonScene.bodies.map((body) => {
    const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: false, toneMapped: false });
    // Match the existing CSS saturation/brightness in the output color space.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <map_fragment>', `
          if (length(vMapUv - vec2(0.5)) > 0.5) discard;
          #include <map_fragment>
        `)
        .replace('#include <colorspace_fragment>', `
          #include <colorspace_fragment>
          float moonLuminance = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor.rgb = mix(vec3(moonLuminance), gl_FragColor.rgb, ${body.saturation.toFixed(4)}) * ${body.brightness.toFixed(4)};
        `);
    };
    material.customProgramCacheKey = () => `moon-${body.brightness}-${body.saturation}`;
    const sprite = new THREE.Sprite(material);
    sprite.position.set(body.position.x, body.position.y, body.position.z);
    sprite.scale.setScalar(body.diameter);
    sprite.renderOrder = body.id === 'near' ? 2 : 1;
    group.add(sprite);
    return { body, sprite, material, image: fallback?.querySelector<HTMLImageElement>(`.moon-${body.id}`) };
  });

  return {
    group,
    resize(aspect: number) {
      moons.forEach(({ body, sprite }) => {
        sprite.position.x = body.position.x * aspect / moonScene.referenceAspect;
      });
    },
    update(camera: THREE.PerspectiveCamera) {
      group.visible = ready;
      if (fallback) {
        fallback.style.visibility = 'visible';
        // Project the same scene coordinates while loading or without WebGL.
        // Switching from an HTML image to its sprite cannot change its position.
        moons.forEach(({ body, sprite, image }) => {
          if (!image) return;
          const projected = sprite.position.clone().project(camera);
          const distance = -sprite.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
          const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const size = `${body.diameter / viewHeight * 100}vh`;
          image.style.left = `${(projected.x + 1) * 50}%`;
          image.style.top = `${(1 - projected.y) * 50}%`;
          image.style.width = size;
          image.style.height = size;
        });
      }
      return group.visible;
    },
    dispose() {
      disposed = true;
      scene.remove(group);
      moons.forEach(({ material }) => material.dispose());
      texture.dispose();
    },
  };
}
