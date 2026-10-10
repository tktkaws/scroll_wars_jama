// 惑星画像を宇宙シーン内に配置します。変更後は再読み込みしてください。
// positionは画像中央の地平線の座標。xは左右、yは上下、zは奥行きです。
// zを小さくする（例: -225 → -500）と遠ざかり、小さく見えます。
export const planetScene = {
  image: '/mars_01.png',
  imageSize: { width: 2171, height: 344 },
  position: { x: 0, y: -327.851, z: -225.068 },
  // 16:9の画面を基準にした、宇宙シーン内での画像の幅。
  width: 647.817,
  referenceAspect: 16 / 9,
  // 縦長画面では左右を見切れさせ、惑星が画面下まで続く幅を保ちます。
  minAspect: 1,
  // 画像上端から地平線までの割合と、空を透明にする範囲。
  horizon: 0.33,
  skyFade: 0.3,
} as const;
