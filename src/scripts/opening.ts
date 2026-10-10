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
  const universe = document.querySelector<HTMLElement>('.universe')!;
  const creditCards = [...document.querySelectorAll<HTMLElement>('[data-credit-card]')];
  const rollingScene = document.querySelector<HTMLElement>('[data-rolling-credits-scene]')!;
  const rollingCredits = document.querySelector<HTMLElement>('[data-rolling-credits]')!;
  const reader = document.querySelector<HTMLElement>('#reader')!;
  const readerToggle = document.querySelector<HTMLButtonElement>('[data-reader-toggle]')!;
  const readerLabel = document.querySelector<HTMLElement>('[data-reader-label]')!;
  const progressText = document.querySelector<HTMLElement>('[data-progress]')!;
  const sceneLabel = document.querySelector<HTMLElement>('[data-scene-label]')!;
  const status = document.querySelector<HTMLElement>('[data-status]')!;
  const chapterNavigation = document.querySelector<HTMLElement>('[data-chapter-navigation]')!;
  const stops = [...document.querySelectorAll<HTMLButtonElement>('[data-chapter]')];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let readerMode = motionQuery.matches;
  let savedProgress = 0;
  let progress = 0;
  let range = 1;
  let perspective = 600;
  let crawlHeight = 1;
  let rollingCreditsHeight = 1;
  let frame = 0;
  let currentScene = -1;
  let currentCredit = -1;
  let endingActive = false;
  let lenis: Lenis | undefined;
  const creditDuration = (sequence.creditsEnd - sequence.creditsStart) / Math.max(1, creditCards.length);
  const scenePositions = [0, sequence.titleFadeInEnd,
    sequence.crawlStart + (sequence.crawlEnd - sequence.crawlStart) * 0.35,
    sequence.creditsStart + creditDuration * 0.35,
    sequence.rollingCreditsStart + (sequence.rollingCreditsEnd - sequence.rollingCreditsStart) * 0.2];
  const sceneNames = ['01 — INTRO', '02 — TITLE', '03 — STORY', '04 — CREDITS', '05 — ROLL'];
  const sceneDescriptions = ['導入文。スクロールするとタイトル、本文の順に進みます。', 'タイトル。スクロールで奥へ消えていきます。', '本文。スクロールで文字が奥へ流れます。', 'カメラが下を向いた後、円が縮んで星空へ切り替わります。スクロールでプロフィールが順にフェード表示されます。', '後半のエンドクレジット。スクロールに合わせて文字が下から上へ流れます。'];

  function update() {
    frame = 0;
    if (readerMode) return;
    progress = clamp(window.scrollY / range);
    const universeOpacity = smoothstep(portion(progress, sequence.titleStart, sequence.titleFadeInEnd));
    root.style.setProperty('--universe-opacity', String(universeOpacity));
    const cameraPan = smoothstep(portion(progress, sequence.cameraPanStart, sequence.cameraPanEnd));
    root.style.setProperty('--camera-pan', String(cameraPan));
    const iris = smoothstep(portion(progress, sequence.irisStart, sequence.irisEnd));
    const radius = Math.hypot(window.innerWidth, window.innerHeight) * 0.55 * (1 - iris);
    root.style.setProperty('--iris-radius', `${radius}px`);
    // The incoming galaxy is exposed outside the clear, shrinking circle.
    const outerBlur = progress >= sequence.irisStart && progress < sequence.irisEnd ? (1 - iris) * 12 : 0;
    root.style.setProperty('--iris-outer-blur', `${outerBlur}px`);
    root.style.setProperty('--galaxy-opacity', String(smoothstep(portion(progress, sequence.irisStart, sequence.irisStart + 0.012))));
    root.style.setProperty('--credit-stars-opacity', String(1 - smoothstep(portion(progress, sequence.creditsEnd, sequence.rollingCreditsStart))));
    universe.style.visibility = iris < 1 ? 'visible' : 'hidden';
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

    let activeCredit = -1;
    creditCards.forEach((card, index) => {
      const start = sequence.creditsStart + creditDuration * index;
      const phase = (progress - start) / creditDuration;
      const opacity = smoothstep(portion(phase, 0, 0.22)) * (1 - smoothstep(portion(phase, 0.72, 0.95)));
      card.style.opacity = String(opacity);
      card.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      card.setAttribute('aria-hidden', String(opacity === 0));
      if (opacity > 0.5) activeCredit = index;
    });
    const rollProgress = portion(progress, sequence.rollingCreditsStart, sequence.rollingCreditsEnd);
    const rollingVisible = rollProgress > 0 && rollProgress < 1;
    const rollTravel = window.innerHeight + rollingCreditsHeight + window.innerHeight * 0.08;
    rollingCredits.style.transform = `translate(-50%, ${window.innerHeight - rollTravel * rollProgress}px)`;
    rollingScene.style.visibility = rollingVisible ? 'visible' : 'hidden';
    rollingScene.setAttribute('aria-hidden', String(!rollingVisible));
    rollingScene.inert = !rollingVisible;

    const endingProgress = smoothstep(portion(progress, sequence.endingStart, 1));
    ending.style.opacity = String(endingProgress);
    ending.style.visibility = endingProgress > 0 ? 'visible' : 'hidden';
    ending.style.transform = `translateY(${(1 - endingProgress) * 18}px)`;
    ending.style.pointerEvents = endingProgress > 0.6 ? 'auto' : 'none';
    ending.inert = endingProgress <= 0.6;
    const endingVisible = progress >= sequence.endingStart;
    chapterNavigation.style.visibility = endingVisible ? 'hidden' : 'visible';
    chapterNavigation.inert = endingVisible;
    progressText.textContent = String(Math.round(progress * 100)).padStart(3, '0');

    const activeScene = progress < sequence.titleStart ? 0
      : progress < sequence.crawlStart ? 1
      : progress < sequence.cameraPanStart ? 2
      : progress < sequence.rollingCreditsStart ? 3 : 4;
    if (activeScene !== currentScene) {
      currentScene = activeScene;
      sceneLabel.textContent = sceneNames[activeScene];
      status.textContent = sceneDescriptions[activeScene];
      stops.forEach((stop) => {
        const isCurrent = Number(stop.dataset.chapter) === activeScene;
        stop.classList.toggle('is-current', isCurrent);
        if (isCurrent) stop.setAttribute('aria-current', 'step');
        else stop.removeAttribute('aria-current');
      });
    }
    if (activeCredit !== currentCredit) {
      currentCredit = activeCredit;
      if (activeCredit >= 0) {
        const card = creditCards[activeCredit];
        // Read the edited HTML itself, including any custom elements or line breaks.
        status.textContent = card.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      } else if (progress >= sequence.rollingCreditsEnd) {
        status.textContent = 'エンドクレジットが終了しました。中央の場面名から好きな場面に戻れます。';
      } else {
        status.textContent = sceneDescriptions[currentScene];
      }
    }
    if (endingVisible !== endingActive) {
      endingActive = endingVisible;
      status.textContent = endingVisible
        ? 'エンドクレジットが終了しました。中央の場面名から好きな場面に戻れます。'
        : sceneDescriptions[currentScene];
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
    rollingCreditsHeight = rollingCredits.offsetHeight;
    root.dataset.mode = previousMode ?? 'cinema';
    // Longer edited credits receive enough scroll distance to remain readable.
    const rollingTravel = height + rollingCreditsHeight + height * 0.08;
    const rollingScrollLength = rollingTravel * 0.75 / (sequence.rollingCreditsEnd - sequence.rollingCreditsStart);
    const scrollLength = Math.max(height * sequence.scrollScreens,
      crawlHeight * 3.4 * sequence.scrollDistanceScale, rollingScrollLength);
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
  stops.forEach((stop) => stop.addEventListener('click', () => goTo(scenePositions[Number(stop.dataset.chapter)])));
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
