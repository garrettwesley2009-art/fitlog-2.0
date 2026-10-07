
## Style rules (FitLog design system)

All colors and shared styles live in `src/app/globals.css`. Follow these rules on every page and component:

- Never hard-code colors (`bg-white`, `text-neutral-900`, `bg-blue-600`, `text-red-600`, hex codes). Use the token classes only.
- Page backgrounds and text: `bg-canvas`, `text-ink` (main text), `text-muted` (secondary text), `border-line` (borders and dividers), `text-accent` / `bg-accent` (red accent), `text-danger` (errors).
- Cards: `glass-card` for main panels, `inset-card` for a card inside a panel.
- Inputs: `input-field` (forms) or `input-compact` (inline rows).
- Buttons: `btn-accent` (main action), `btn-ghost` (secondary). Add `-sm` for small versions (`btn-accent-sm`, `btn-ghost-sm`).
- Hover fills use `hover:bg-glass-hover`.
- Need a style that doesn't exist yet? Add a new token or `@utility` in `globals.css` and use it. Don't invent one-off colors in a page.
- To rebrand, change `--color-accent` and `--color-accent-hover` in `globals.css`. Nothing else should need editing.