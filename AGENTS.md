# FitLog 2.0 - rules for AI helpers

FitLog is a gym tracking web app for the members of a small gym. A few members already use it
and want it on the App Store. Live site: every push to `main` auto-deploys to Vercel.
Repo: `garrettwesley2009-art/fitlog-2.0`. Long-term goal: installable web app first, then a
Capacitor wrap for TestFlight and the App Store.

Read this file before changing anything. Keep it short: if a rule here is no longer true, fix it
in the same change that makes it untrue.

## Stack

- Next.js 16 App Router: server components, server actions (`'use server'`), the `(main)` route
  group, API routes under `src/app/api`.
- Supabase (Postgres + row level security) through `@supabase/ssr`.
- Tailwind 4. Design tokens and shared classes live in `src/app/globals.css`.
- Fonts: Barlow (body) and Barlow Condensed (headlines and numbers) through `next/font/google`.
- Hosting: Vercel. Windows + PowerShell on the developer side.

Next.js 16 differs from what most AI models learned. Before using a Next.js API you are not
sure about, check the official Next.js 16 docs (or the version in `package.json`) instead of guessing.
A `'use server'` file may only export async functions.

## How the code is laid out

- Navigation is URL-driven by `src/lib/nav.ts` (sections with `prefixes`, `subs`, `hideHeader`).
  `src/components/nav-bar.tsx` draws the top tabs and the bottom bar: Workout, Schedule, Home,
  Coach, You. To add or move a page, change `nav.ts` first.
- The app shell (`src/app/(main)/layout.tsx`) has fixed top and bottom bars and one scrolling
  area. Pages render inside it. Do not make a page cover the bars with `fixed inset-0`
  (sheets and pop-ups are the only exception).
- The Log page is `src/app/(main)/log/page.tsx` plus `src/components/workout-logger.tsx`.
  Sets save one at a time through `/api/sets` with an offline outbox (`src/lib/outbox.ts`).
  Keep saving, editing, the outbox and rest timer working when you change how it looks.
- The current program day is derived, not stored: `getProgramPosition` in `src/lib/data.ts`.
- `target_reps` is text like `8/8/6/6F` (per set, F = to failure), parsed by `src/lib/log-plan.ts`.
- Sign-in check: use `getUserCached()` from `src/lib/supabase/get-user.ts`. Do not call
  `supabase.auth.getUser()` directly in pages; it adds a network call per page.
- Every page under `(main)` shows a skeleton from `loading.tsx` while data loads. Keep it.

## Design rules

Full spec: the project doc `ui-ux-design.md`. The short version:

- **Tokens only.** Use token classes (`bg-canvas`, `bg-surface`, `bg-inset`, `border-line`,
  `border-line-strong`, `text-ink`, `text-muted`, `bg-accent`, `text-accent-text`, `bg-success`,
  `bg-record`, `text-insight`, `text-streak`, `text-danger`). Never hard-code hex colors. If a
  new color or shared style is needed, add it to `globals.css` and use it from there.
- **One job per color.** Red = do this / you are here. Green = done. Gold = a record (PR).
  Blue = trends and the Coach. Orange = streak. Never show meaning by color alone: add a check,
  trophy, icon or words.
- **Small red text** uses `text-accent-text`, never plain `text-accent` on dark (fails contrast).
- **Solid cards** (`card` / `glass-card` classes are solid now). No blur or see-through glass.
- **Type.** Big numbers and page titles use `font-display` (Barlow Condensed); body is Barlow,
  never under 16px for body text on a phone. Use `tabular` for weights, reps, timers and counts.
- **Tap targets are at least 44x44px** with 8px or more between them. The main action on a
  screen is one red button. Icon-only buttons need an `aria-label`.
- **Every input has a visible label** and the right keyboard type (`inputMode`).
- **Motion** only where it explains something (rest ring, sheet slide, press). Animate opacity
  and transform only. Respect reduced motion. Never block input during an animation.
- **Check before delivering UI:** a 375px wide phone, landscape, no sideways scrolling, and
  contrast for any new color pair. Show the person a screenshot or preview before asking them
  to apply a big visual change.

## Database rules

- Never run SQL against the live database yourself. Write the change as a file in `supabase/`
  (named for what it does), tell the human to run it in the Supabase SQL editor FIRST, then ship
  the code that needs it. Every SQL change stays in the repo.
- Never re-run the seed files (they duplicate templates). New tables need row level security.
- Queries that do not depend on each other run in parallel (`Promise.all`).

## Secrets and safety

- Never commit `.env.local`. Keys live in `.env.local` and Vercel environment variables.
- Never paste API keys or tokens into chat, docs, commits or screenshots.
- The Coach may only propose program changes; the user must press Apply. It never saves silently
  and never gives medical advice.
- Delete nothing the user did not ask you to delete.

## Working agreements

- `git pull` before starting. Work on a branch for anything bigger than a small fix; Vercel builds
  a preview link for every branch. Merge to `main` only after the person has tried it.
- Make the smallest change that does what was asked. Do not build ahead of the request.
- Before saying a change is done: run `npx tsc --noEmit`, and for UI changes look at the result.
  If something could not be tested, say so plainly.
- Commands are given one step at a time, ready to copy and paste into PowerShell. LF/CRLF
  warnings on Windows are harmless.
- Update the docs when behavior changes: this file for rules, the project docs for design and plans.
