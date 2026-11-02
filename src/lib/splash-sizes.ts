// iPhone launch screens. iOS only shows one when its size matches the phone
// exactly: [CSS width, CSS height, pixel ratio], portrait.
export const SPLASH_SIZES: [w: number, h: number, ratio: number][] = [
  [440, 956, 3], // 16 / 17 Pro Max
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [420, 912, 3], // Air
  [430, 932, 3], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12 / 13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12 / 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 8 Plus
  [375, 667, 2], // SE, 8
]

export const splashFile = ([w, h, r]: [number, number, number]) => `${w * r}x${h * r}.png`
