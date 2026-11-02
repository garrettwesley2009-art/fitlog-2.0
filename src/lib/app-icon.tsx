import { ImageResponse } from 'next/og'

// The barbell (white bar, red plates) on the app's dark background, drawn on
// a 512 grid and scaled. Used for the home-screen icons and iPhone launch
// screens.
const CANVAS = '#0b0b0c'
const BAR = '#f5f5f5'
const PLATE = '#c0392b'

const parts: [x: number, y: number, w: number, h: number, r: number, color: string][] = [
  [96, 243, 320, 26, 6, BAR],
  [76, 236, 20, 40, 5, BAR],
  [416, 236, 20, 40, 5, BAR],
  [128, 166, 40, 180, 10, PLATE],
  [344, 166, 40, 180, 10, PLATE],
  [176, 196, 28, 120, 8, PLATE],
  [308, 196, 28, 120, 8, PLATE],
]

// `markSize` is how wide the 512 grid is drawn, centred in a width x height canvas.
function barbellImage(width: number, height: number, markSize: number) {
  const s = markSize / 512
  const left = (width - markSize) / 2
  const top = (height - markSize) / 2
  return new ImageResponse(
    (
      <div style={{ width, height, display: 'flex', position: 'relative', background: CANVAS }}>
        {parts.map(([x, y, w, h, r, color], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: left + x * s,
              top: top + y * s,
              width: w * s,
              height: h * s,
              borderRadius: r * s,
              background: color,
            }}
          />
        ))}
      </div>
    ),
    { width, height }
  )
}

// `inset` shrinks the barbell toward the centre for Android's maskable icon,
// which may be cropped round.
export function appIcon(size: number, inset = 1) {
  return barbellImage(size, size, size * inset)
}

export function splashImage(width: number, height: number) {
  return barbellImage(width, height, width * 0.5)
}
