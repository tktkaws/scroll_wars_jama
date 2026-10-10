import * as THREE from 'three';
import { planetScene } from '../data/planet';

export function createScenePlanet(scene: THREE.Scene, fallback: HTMLElement | null, requestRender: () => void) {
  let ready = false;
  let disposed = false;
  const texture = new THREE.TextureLoader().load(planetScene.image, () => {
    if (disposed) return;
    ready = true;
    requestRender();
  }, undefined, () => {
    // Keep the matching HTML image while the texture is unavailable.
    requestRender();
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: false, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      diffuseColor.a *= clamp((1.0 - vMapUv.y) / ${planetScene.skyFade.toFixed(4)}, 0.0, 1.0);
    `);
  };
  material.customProgramCacheKey = () => `planet-sky-${planetScene.skyFade}`;
  const sprite = new THREE.Sprite(material);
  // Anchor the panorama at its horizon, rather than at its image center.
  sprite.center.set(0.5, 1 - planetScene.horizon);
  sprite.position.set(planetScene.position.x, planetScene.position.y, planetScene.position.z);
  sprite.renderOrder = 3;
  sprite.visible = false;
  scene.add(sprite);
  const image = fallback?.querySelector<HTMLImageElement>('.planet-limb');

  return {
    sprite,
    resize(aspect: number) {
      const width = planetScene.width * Math.max(aspect, planetScene.minAspect) / planetScene.referenceAspect;
      sprite.scale.set(width, width * planetScene.imageSize.height / planetScene.imageSize.width, 1);
      sprite.position.x = planetScene.position.x * aspect / planetScene.referenceAspect;
    },
    update(camera: THREE.PerspectiveCamera) {
      sprite.visible = ready;
      if (fallback) {
        fallback.style.visibility = 'visible';
        if (image) {
          // Project the same anchor and scale to prevent loading-time jumps.
          const projected = sprite.position.clone().project(camera);
          const distance = -sprite.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
          const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          image.style.left = `${(projected.x + 1) * 50}%`;
          image.style.top = `${(1 - projected.y) * 50}%`;
          image.style.width = `${sprite.scale.x / viewHeight * 100}vh`;
          image.style.height = `${sprite.scale.y / viewHeight * 100}vh`;
        }
      }
      return sprite.visible;
    },
    dispose() {
      disposed = true;
      scene.remove(sprite);
      material.dispose();
      texture.dispose();
    },
  };
}
