import { ImageResponse } from 'next/og'

// The home-screen icon: a barbell (white bar, red plates) on the app's dark
// background. Drawn on a 512 grid and scaled. `inset` shrinks the barbell
// toward the centre for Android's maskable icon, which may be cropped round.
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

export function appIcon(size: number, inset = 1) {
  const s = (size / 512) * inset
  const offset = (size - 512 * s) / 2
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', position: 'relative', background: CANVAS }}>
        {parts.map(([x, y, w, h, r, color], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: offset + x * s,
              top: offset + y * s,
              width: w * s,
              height: h * s,
              borderRadius: r * s,
              background: color,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size }
  )
}
