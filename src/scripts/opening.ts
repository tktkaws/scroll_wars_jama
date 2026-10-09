import Lenis from 'lenis';
import { sequence } from '../data/story';

// 慣性スクロールの調整。保存後、ブラウザーを再読み込みしてください。
const scrollSettings = {
  // 0より大きく1以下。小さいほど余韻が長く、大きいほど素早く止まります。
  // 例: 0.04 = ゆったり / 0.08 = 現在 / 0.15 = きびきび
  lerp: 0.04,
  // ホイール・トラックパッドの移動量。0.5 = 半分 / 1 = 標準 / 1.5 = 1.5倍
  wheelMultiplier: 3,
};

// All cinematic effects follow the browser's actual scroll position.
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const portion = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export function initOpening() {
  const root = document.documentElement;
  const journey = document.querySelector<HTMLElement>('[data-journey]')!;
  const productionScene = document.querySelector<HTMLElement>('[data-production-scene]')!;
  const introScene = document.querySelector<HTMLElement>('[data-intro-scene]')!;
  const titleScene = document.querySelector<HTMLElement>('[data-title-scene]')!;
  const title = document.querySelector<HTMLElement>('[data-title]')!;
  const crawlViewport = document.querySelector<HTMLElement>('[data-crawl-viewport]')!;
  const crawl = document.querySelector<HTMLElement>('[data-crawl]')!;
  const ending = document.querySelector<HTMLElement>('[data-ending]')!;
  const reader = document.querySelector<HTMLElement>('#reader')!;
  const readerToggle = document.querySelector<HTMLButtonElement>('[data-reader-toggle]')!;
  const readerLabel = document.querySelector<HTMLElement>('[data-reader-label]')!;
  const progressText = document.querySelector<HTMLElement>('[data-progress]')!;
  const progressBar = document.querySelector<HTMLElement>('[data-progress-bar]')!;
  const sceneLabel = document.querySelector<HTMLElement>('[data-scene-label]')!;
  const status = document.querySelector<HTMLElement>('[data-status]')!;
  const stops = [...document.querySelectorAll<HTMLButtonElement>('[data-chapter]')];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let readerMode = motionQuery.matches;
  let savedProgress = 0;
  let progress = 0;
  let range = 1;
  let perspective = 600;
  let crawlHeight = 1;
  let frame = 0;
  let currentScene = -1;
  let lenis: Lenis | undefined;
  const scenePositions = [0, sequence.titleFadeInEnd, 0.43, 1];
  const sceneNames = ['01 — THE INTRO', '02 — THE TITLE', '03 — THE STORY', '04 — BEYOND'];
  const sceneDescriptions = ['導入文。スクロールするとタイトル、本文の順に進みます。', 'タイトル。スクロールで奥へ消えていきます。', '本文。スクロールで文字が奥へ流れます。', '宇宙を見下ろすと2つの月と大きな環のある惑星が現れます。最初から旅するボタンでもう一度読めます。'];

  function update() {
    frame = 0;
    if (readerMode) return;
    progress = clamp(window.scrollY / range);
    const universeOpacity = smoothstep(portion(progress, sequence.titleStart, sequence.titleFadeInEnd));
    root.style.setProperty('--universe-opacity', String(universeOpacity));
    const cameraPan = smoothstep(portion(progress, sequence.cameraPanStart, sequence.cameraPanEnd));
    root.style.setProperty('--camera-pan', String(cameraPan));
    const productionOpacity = 1 - smoothstep(portion(progress, sequence.productionHold, sequence.productionEnd));
    productionScene.style.opacity = String(productionOpacity);
    productionScene.style.visibility = productionOpacity > 0 ? 'visible' : 'hidden';
    productionScene.inert = productionOpacity === 0;
    const introOpacity = smoothstep(portion(progress, sequence.introStart, sequence.introFadeInEnd))
      * (1 - smoothstep(portion(progress, sequence.introHold, sequence.introEnd)));
    introScene.style.opacity = String(introOpacity);
    introScene.style.visibility = introOpacity > 0 ? 'visible' : 'hidden';
    introScene.inert = introOpacity === 0;

    const titleProgress = portion(progress, sequence.titleStart, sequence.titleEnd);
    const titleOpacity = smoothstep(portion(progress, sequence.titleStart, sequence.titleFadeInEnd))
      * (1 - smoothstep(portion(progress, sequence.titleFadeOutStart, sequence.titleEnd)));
    title.style.transform = `translateZ(${-titleProgress * 2800}px)`;
    titleScene.style.opacity = String(titleOpacity);
    titleScene.style.visibility = titleOpacity > 0 ? 'visible' : 'hidden';
    titleScene.inert = titleOpacity === 0;

    const crawlProgress = portion(progress, sequence.crawlStart, sequence.crawlEnd);
    const startY = perspective * 0.58;
    // Move along the tilted plane, so lines naturally get smaller in the distance.
    // Reserve the final part of the journey for the last paragraph to recede.
    const crawlY = startY - (crawlHeight + startY) * crawlProgress
      - perspective * 7 * Math.pow(crawlProgress, 8);
    crawl.style.transform = `translateY(${crawlY}px)`;
    const crawlOpacity = portion(progress, sequence.crawlStart, sequence.crawlFadeInEnd)
      * (1 - portion(progress, sequence.crawlFadeOutStart, sequence.crawlEnd));
    crawlViewport.style.opacity = String(crawlOpacity);
    crawlViewport.style.visibility = crawlOpacity > 0 ? 'visible' : 'hidden';

    const endingProgress = smoothstep(portion(progress, sequence.endingStart, 0.995));
    ending.style.opacity = String(endingProgress);
    ending.style.visibility = endingProgress > 0 ? 'visible' : 'hidden';
    ending.style.transform = `translateY(${(1 - endingProgress) * 18}px)`;
    ending.style.pointerEvents = endingProgress > 0.6 ? 'auto' : 'none';
    ending.inert = endingProgress <= 0.6;
    progressText.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    progressBar.style.transform = `scaleX(${progress})`;

    const activeScene = progress < sequence.titleStart ? 0
      : progress < sequence.crawlStart ? 1
      : progress < sequence.cameraPanStart ? 2 : 3;
    if (activeScene !== currentScene) {
      currentScene = activeScene;
      sceneLabel.textContent = sceneNames[activeScene];
      status.textContent = sceneDescriptions[activeScene];
      stops.forEach((stop, index) => {
        stop.classList.toggle('is-current', index === activeScene);
        if (index === activeScene) stop.setAttribute('aria-current', 'step');
        else stop.removeAttribute('aria-current');
      });
    }
    window.dispatchEvent(new CustomEvent('opening:progress', { detail: { progress, readerMode } }));
  }
  function requestUpdate() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }
  function syncScrolling() {
    if (readerMode || motionQuery.matches) {
      lenis?.destroy();
      lenis = undefined;
    } else if (!lenis) {
      lenis = new Lenis({
        ...scrollSettings,
        autoRaf: true,
        autoResize: false, // Layout changes are followed by resize() in measure().
        smoothWheel: true,
        syncTouch: false, // Keep the browser's native touch momentum.
        respectReducedMotion: true,
      });
      // Keep the crawl and starfield updating until the inertia settles.
      lenis.on('scroll', requestUpdate);
    }
  }
  function scrollTo(top: number, immediate = false) {
    if (lenis) {
      if (immediate) {
        // Cancel any previous destination before restoring a measured position.
        lenis.stop();
        lenis.start();
      }
      lenis.scrollTo(top, { immediate });
    } else {
      window.scrollTo({ top, behavior: immediate || motionQuery.matches ? 'instant' : 'smooth' });
    }
  }
  function measure(preservePosition = true) {
    if (!readerMode && preservePosition) progress = clamp(window.scrollY / range);
    const height = window.innerHeight;
    perspective = Math.max(360, Math.min(850, height * 0.78));
    const angle = window.innerWidth <= 500 ? 57 : 62;
    root.style.setProperty('--crawl-perspective', `${perspective}px`);
    root.style.setProperty('--crawl-angle', `${angle}deg`);
    // For this tilted plane, horizonY = perspectiveOriginY - perspective / tan(angle).
    // Keep the vanishing point at 20% of the screen on both desktop and mobile.
    const originY = height * 0.2 + perspective / Math.tan(angle * Math.PI / 180);
    root.style.setProperty('--crawl-origin', `${originY}px`);
    const previousMode = root.dataset.mode;
    // A hidden reader-mode crawl still needs its layout measured.
    if (readerMode) root.dataset.mode = 'cinema';
    // Start with the top and bottom cropped, then recede along the title's Z axis.
    title.style.fontSize = '100px';
    const titleSize = 100 * height * 1.4 / Math.max(1, title.offsetHeight);
    title.style.fontSize = `${titleSize}px`;
    crawlHeight = crawl.offsetHeight;
    root.dataset.mode = previousMode ?? 'cinema';
    const scrollLength = Math.max(height * sequence.scrollScreens, crawlHeight * 3.4);
    journey.style.height = `${scrollLength + height}px`;
    range = scrollLength;
    lenis?.resize();
    if (!readerMode && preservePosition) scrollTo(progress * range, true);
    requestUpdate();
  }
  function goTo(value: number) {
    if (readerMode) setMode(false);
    scrollTo(value * range);
  }
  function setMode(reading: boolean, focus = false) {
    if (reading === readerMode && root.classList.contains('is-enhanced')) {
      syncScrolling();
      return;
    }
    if (reading) savedProgress = clamp(window.scrollY / range);
    readerMode = reading;
    root.dataset.mode = reading ? 'reader' : 'cinema';
    root.classList.add('is-enhanced');
    readerToggle.setAttribute('aria-pressed', String(reading));
    readerLabel.textContent = reading ? '演出に戻る' : '本文を読む';
    reader.inert = !reading;
    status.textContent = reading ? '通常の文章表示に切り替えました。' : sceneDescriptions[currentScene < 0 ? 0 : currentScene];
    if (reading) {
      syncScrolling();
      scrollTo(0, true);
      if (focus) reader.focus({ preventScroll: true });
    } else {
      progress = savedProgress;
      measure(false);
      syncScrolling();
      scrollTo(savedProgress * range, true);
      if (focus) readerToggle.focus({ preventScroll: true });
    }
    window.dispatchEvent(new CustomEvent('opening:progress', { detail: { progress, readerMode } }));
    requestUpdate();
  }

  readerToggle.addEventListener('click', () => setMode(!readerMode, true));
  document.querySelectorAll<HTMLElement>('[data-restart]').forEach((button) => {
    button.addEventListener('click', (event) => { event.preventDefault(); goTo(0); });
  });
  document.querySelector('[data-begin]')?.addEventListener('click', () => goTo(scenePositions[1]));
  document.querySelector('[data-production-begin]')?.addEventListener('click', () => goTo(sequence.introFadeInEnd));
  stops.forEach((stop, index) => stop.addEventListener('click', () => goTo(scenePositions[index])));
  motionQuery.addEventListener('change', (event) => setMode(event.matches));
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => measure(), { passive: true });
  window.addEventListener('pageshow', requestUpdate);
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      lenis?.destroy();
      lenis = undefined;
      window.cancelAnimationFrame(frame);
    }
  });
  // Measure the actual cinematic layout before applying the user's display mode.
  root.dataset.mode = 'cinema';
  root.classList.add('is-enhanced');
  measure(false);
  progress = clamp(window.scrollY / range);
  savedProgress = progress;
  root.classList.remove('is-enhanced');
  setMode(readerMode);
  document.fonts.ready.then(() => measure());
  update();
}
