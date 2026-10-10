/** Edit the opening here. The crawl distance adapts to the length of the text. */
export const story = {
  title: ['SCROLL', 'WARS'],
  episode: 'EPISODE 001',
  chapter: 'まだ見ぬ世界へ',
  prelude: '遠い昔 はるかかなたの銀河系で…',
  paragraphs: [
    '無数の星が眠る銀河の片隅。忘れ去られた小さな惑星から、ひとつの信号が宇宙へと放たれた。',
    'それは、まだ誰も見たことのない世界への招待状。長い沈黙を破り、古い星図に新たな航路が浮かび上がる。',
    '光を追う者たちは、故郷を離れ、暗闇の向こうへ船を進めた。手にしたのは、わずかな希望と、終わりのない好奇心だけ。',
    '星々のあいだには、数えきれない物語がある。出会いも、別れも、まだ名前のない発見も。そのすべてが、旅人の到着を待っていた。',
    'そして今、新しい冒険が始まる。次の一歩が、物語を動かす。遥か彼方の未来へ向かって…。',
  ],
  ending: 'その先に、あなたの物語を。',
};

export type OpeningStory = typeof story;

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
