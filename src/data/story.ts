// INTRO・TITLE・STORYの文章は src/components/OpeningIntro.astro・OpeningTitle.astro・OpeningStory.astro で編集してください。

// TITLEとSTORYに必要なスクロール距離の倍率。
const titleStoryScrollScale = 0.5;
const originalTitleStart = 0.04;
const originalCrawlEnd = 0.70;
// タイトル開始4%を保ち、後続シーンの実際のスクロール距離も保つ。
const scrollDistanceScale = ((originalCrawlEnd - originalTitleStart) * titleStoryScrollScale
  + 1 - originalCrawlEnd) / (1 - originalTitleStart);
const compressTitleStory = (position: number) => originalTitleStart
  + (position - originalTitleStart) * titleStoryScrollScale / scrollDistanceScale;
const shiftAfterStory = (position: number) => compressTitleStory(originalCrawlEnd)
  + (position - originalCrawlEnd) / scrollDistanceScale;

/** Normalized scroll positions shared by the title, crawl and navigation. */
export const sequence = {
  productionHold: 0.01,
  productionEnd: 0.02,
  introStart: 0.02,
  introFadeInEnd: 0.025,
  introHold: 0.032,
  introEnd: 0.04,
  titleStart: originalTitleStart,
  titleFadeInEnd: compressTitleStory(0.06),
  titleFadeOutStart: compressTitleStory(0.25),
  titleEnd: compressTitleStory(0.32),
  crawlStart: compressTitleStory(0.28),
  crawlFadeInEnd: compressTitleStory(0.30),
  crawlFadeOutStart: compressTitleStory(0.65),
  crawlEnd: compressTitleStory(originalCrawlEnd),
  cameraPanStart: compressTitleStory(originalCrawlEnd),
  cameraPanEnd: shiftAfterStory(0.77),
  irisStart: shiftAfterStory(0.78),
  irisEnd: shiftAfterStory(0.86),
  creditsStart: shiftAfterStory(0.87),
  creditsEnd: shiftAfterStory(0.93),
  rollingCreditsStart: shiftAfterStory(0.935),
  rollingCreditsEnd: shiftAfterStory(0.99),
  endingStart: shiftAfterStory(0.99),
  scrollScreens: 36 * scrollDistanceScale,
  scrollDistanceScale,
};

// スクロール量を変えても、各シーンでのカメラ位置は同じにする。
export function getCameraProgress(progress: number) {
  if (progress <= sequence.titleStart) return progress;
  if (progress <= sequence.crawlEnd) {
    return originalTitleStart + (progress - sequence.titleStart) * scrollDistanceScale / titleStoryScrollScale;
  }
  return originalCrawlEnd + (progress - sequence.crawlEnd) * scrollDistanceScale;
}
