// Red-theme redesign, step 1: new colors, fonts, solid cards, bigger tap targets. Safe to run twice.
// Adds one block at the end of src/app/globals.css and sets up the Barlow fonts in src/app/layout.tsx.
import fs from 'node:fs'

const CSS = 'src/app/globals.css'
const LAYOUT = 'src/app/layout.tsx'
const MARK = '/* === FitLog redesign (red theme) === */'

// ---------- globals.css ----------
if (!fs.existsSync(CSS)) { console.log(`MISSING  ${CSS}`) }
else {
  const raw = fs.readFileSync(CSS, 'utf8')
  if (raw.includes(MARK)) console.log('SKIPPED  globals.css (already done)')
  else {
    const nl = raw.includes('\r\n') ? '\r\n' : '\n'
    const block = `
${MARK}
/* New tokens. These override the ones above, so old pages pick them up with no edits. */
@theme static {
  --color-canvas: #0b0b0c;
  --color-surface: #18181b;
  --color-inset: #222226;
  --color-line: #2a2a2e;
  --color-line-strong: #6b6b73;   /* borders people must find (inputs, outlined buttons) */
  --color-ink: #f5f5f5;
  --color-muted: #a3a3a8;
  --color-accent: #c0392b;
  --color-accent-hover: #a93226;
  --color-accent-text: #ff6b5b;   /* small red text on dark backgrounds */
  --color-success: #34d27b;       /* finished sets and days */
  --color-on-success: #0b0b0c;
  --color-danger: #ff6b5b;
  --color-glass: rgba(255, 255, 255, 0.06);
  --color-glass-hover: rgba(255, 255, 255, 0.1);
  --radius-card: 1.125rem;
  --font-sans: var(--font-barlow), Arial, Helvetica, sans-serif;
  --font-display: var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif;
}

body {
  font-family: var(--font-barlow), Arial, Helvetica, sans-serif;
  line-height: 1.5;
}
h1, h2, h3 {
  font-family: var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif;
  letter-spacing: 0.01em;
}

/* Solid cards instead of glass */
.glass-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  backdrop-filter: none;
  box-shadow: none;
}
.inset-card {
  background-color: var(--color-inset);
  border: 1px solid var(--color-line);
  border-radius: 0.875rem;
}
.bg-glow {
  background-image: radial-gradient(ellipse 900px 420px at 50% 0%, rgba(192, 57, 43, 0.2) 0%, rgba(11, 11, 12, 0) 70%);
}

/* Small red text and labels are lighter so they stay readable */
.text-accent { color: var(--color-accent-text); }

/* Inputs: visible edge, 44px tall, 16px text (stops iOS zoom) */
.input-field, .input-compact {
  background-color: var(--color-inset);
  border-color: var(--color-line-strong);
  min-height: 2.75rem;
  font-size: 1rem;
}

/* Buttons: 44px minimum tap area, outlined buttons easy to find, press feedback */
.btn-accent { min-height: 3rem; font-size: 1rem; }
.btn-accent-sm { min-height: 2.75rem; font-size: 0.875rem; }
.btn-ghost, .btn-ghost-sm { background-color: transparent; border-color: var(--color-line-strong); }
.btn-ghost { min-height: 3rem; font-size: 1rem; }
.btn-ghost-sm { min-height: 2.75rem; font-size: 0.875rem; }
.btn-accent, .btn-accent-sm, .btn-ghost, .btn-ghost-sm { transition: background-color 0.15s, transform 0.1s; }
.btn-accent:active:not(:disabled), .btn-accent-sm:active:not(:disabled),
.btn-ghost:active:not(:disabled), .btn-ghost-sm:active:not(:disabled) { transform: scale(0.97); }

/* Keyboard focus ring on everything */
:focus-visible { outline: 2px solid var(--color-accent-text); outline-offset: 2px; }
input:focus-visible, textarea:focus-visible, select:focus-visible { outline: none; }

/* Numbers don't jump around */
.tabular { font-variant-numeric: tabular-nums; }

/* Less motion when the phone asks for it */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
`.replace(/\n/g, nl)
    fs.writeFileSync(CSS, raw.replace(/\s*$/, nl) + block)
    console.log('DONE     globals.css')
  }
}

// ---------- layout.tsx (fonts) ----------
if (!fs.existsSync(LAYOUT)) { console.log(`MISSING  ${LAYOUT}`) }
else {
  const raw = fs.readFileSync(LAYOUT, 'utf8')
  if (raw.includes('Barlow_Condensed')) console.log('SKIPPED  layout.tsx (already done)')
  else {
    const nl = raw.includes('\r\n') ? '\r\n' : '\n'
    let s = raw.replace(/\r\n/g, '\n')
    const htmlRe = /<html lang="en" className="([^"]*)">/
    const imp = 'import "./globals.css";'
    const imp2 = "import './globals.css'"
    if (!htmlRe.test(s) || !(s.includes(imp) || s.includes(imp2))) {
      console.log('NOT CHANGED  layout.tsx (send me this message and the file)')
    } else {
      const fonts =
`import { Barlow, Barlow_Condensed } from "next/font/google";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow", display: "swap" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed", display: "swap" });
`
      s = s.replace(s.includes(imp) ? imp : imp2, (m) => m + '\n' + fonts)
      s = s.replace(htmlRe, (_, c) => `<html lang="en" className={\`${c} \${barlow.variable} \${barlowCondensed.variable}\`}>`)
      fs.writeFileSync(LAYOUT, s.replace(/\n/g, nl))
      console.log('DONE     layout.tsx')
    }
  }
}
