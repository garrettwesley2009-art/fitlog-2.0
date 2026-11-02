import { splashImage } from '@/lib/app-icon'
import { SPLASH_SIZES, splashFile } from '@/lib/splash-sizes'

// /splash/1179x2556.png and friends, built once at deploy. Only the listed sizes exist.
export const dynamicParams = false

export function generateStaticParams() {
  return SPLASH_SIZES.map((s) => ({ size: splashFile(s) }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const [w, h] = (await params).size.replace('.png', '').split('x').map(Number)
  return splashImage(w, h)
}
