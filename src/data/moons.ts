// 宇宙シーン内の月の配置。変更後はブラウザーを再読み込みしてください。
// x: 左が負・右が正、y: 下が負・上が正。
// z: 値を小さくする（例: -500 → -1000）ほど遠ざかり、小さく見えます。
// xは16:9の画面を基準とし、画面の縦横比に合わせて調整します。
export const moonScene = {
  image: '/moon02.png',
  referenceAspect: 16 / 9,
  bodies: [
    {
      id: 'near',
      position: { x: -286.89, y: -385.476, z: -369.684 },
      diameter: 109.32,
      brightness: 1,
      saturation: 0.8,
    },
    {
      id: 'far',
      position: { x: 0, y: -678.994, z: -1151.469 },
      diameter: 39.589,
      brightness: 0.65,
      saturation: 0.6,
    },
  ],
} as const;
