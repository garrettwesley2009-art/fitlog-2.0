@AGENTS.md

# Extra notes for Claude

- The person you are helping works in PowerShell on Windows and likes one step at a time, with
  commands they can copy and paste. Do not give several unrelated steps in one go.
- Show a preview or screenshot of a visual change before building it, and offer a few options
  to pick from when a design choice is open.
- Deliver zips with repo-relative paths so `tar -xf` from the repo root puts files in the right
  place, and write update scripts so running them twice is harmless.
- Say plainly what you did not test.
- Show UI previews at phone width (375px), one screen at a time, and keep replies phone-friendly
  (short, no wide tables).

## Plan first
- Before creating, editing or deleting any file beyond a small fix, show a short plan: what changes
  and why, which files (new / edited / deleted), and any risks (data loss, breaking changes, new
  packages). Then stop and wait for "go", "ok" or "yes".
- If the plan changes partway through, stop and say so before continuing.
- Keep plans to a few bullets.

## Checks and wrap-up
- Run the lint, type check and build commands from `package.json` once at the end of a change.
  Fix errors you caused; report errors that were already there instead of fixing them silently.
  Run tests related to what changed, if any exist.
- End with a short summary: what changed, what was checked, and what to test by hand.

## Safety
- Never edit `.env` files or print secret values.
- Database changes (tables, columns, migrations, RLS policies) need approval first and must not
  delete existing user data.
- Do not install new packages without asking.
- Never run `git push`, force-push, or delete branches. The person pushes (every push to `main`
  deploys). Give the commit and push commands as copy-paste blocks and suggest a commit message.

## How to talk
- Explain in plain language and define technical terms briefly. Be concise, no long intros or
  repeated summaries. Show only the parts that changed, not whole files.
- Only read the files you need; do not re-read unchanged files. Do not refactor code that was not
  asked about; mention it as a suggestion.
- When corrected on something likely to repeat, suggest a one-line rule to add here.
