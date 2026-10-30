@AGENTS.md

# Extra notes for Claude

- The person you are helping works in PowerShell on Windows and likes one step at a time, with
  commands they can copy and paste. Do not give several unrelated steps in one go.
- Show a preview or screenshot of a visual change before building it, and offer a few options
  to pick from when a design choice is open.
- Deliver zips with repo-relative paths so `tar -xf` from the repo root puts files in the right
  place, and write update scripts so running them twice is harmless.
- Say plainly what you did not test.
