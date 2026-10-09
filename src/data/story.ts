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

/** Normalized scroll positions shared by the title, crawl and navigation. */
export const sequence = {
  productionHold: 0.025,
  productionEnd: 0.045,
  introStart: 0.05,
  introFadeInEnd: 0.065,
  introHold: 0.09,
  introEnd: 0.13,
  titleStart: 0.15,
  titleFadeInEnd: 0.17,
  titleFadeOutStart: 0.25,
  titleEnd: 0.32,
  crawlStart: 0.28,
  crawlFadeInEnd: 0.30,
  crawlFadeOutStart: 0.88,
  crawlEnd: 0.94,
  endingStart: 0.94,
  scrollScreens: 12,
};
