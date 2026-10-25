// Adds (?) help buttons to the Home and My Program pages. Safe to run twice.
import fs from 'node:fs'

const IMPORT = "import { HelpTip } from '@/components/help-tip'\n"

function edit(file, steps) {
  if (!fs.existsSync(file)) return console.log(`MISSING  ${file}`)
  let t = fs.readFileSync(file, 'utf8')
  const nl = t.includes('\r\n') ? '\r\n' : '\n'
  if (t.includes('HelpTip')) return console.log(`SKIPPED  ${file} (already done)`)
  let changed = 0
  for (const [name, re, fn] of steps) {
    if (re.test(t)) {
      t = t.replace(re, fn)
      changed++
    } else console.log(`  not found: ${name}`)
  }
  t = t.replace(/^(import [^\n]*\n)(?!import)/m, (m) => m) // keep first import block as is
  t = IMPORT.replace(/\n/g, nl) + t
  fs.writeFileSync(file, t)
  console.log(`DONE     ${file} (${changed}/${steps.length} spots)`)
}

edit('src/app/(main)/dashboard/page.tsx', [
  ['This week', />This week<\/p>/, `>This week{' '}<HelpTip title="This week"><p>Each circle is one workout day in your program. A check means done, a dash means skipped, and the ringed circle is today.</p><p>Your program is a set number of weeks. Finish every day (or skip it) to move on to the next week.</p></HelpTip></p>`],
  ['Streak', />Streak<\/p>/, `>Streak{' '}<HelpTip title="Streak"><p>How many weeks in a row you trained at least once, Monday to Sunday. Miss a whole week and it starts over.</p></HelpTip></p>`],
  ['Weight lifted', /Weight lifted per workout(\s*)<\/p>/, `Weight lifted per workout{' '}<HelpTip title="Weight lifted"><p>Your total for each workout: weight x reps added up over every set. Taller bars mean more total work. It shows your last 7 workouts.</p></HelpTip>$1</p>`],
])

edit('src/app/(main)/workout/program/page.tsx', [
  ['days finished', /(\{position\.doneCount\} of \{position\.totalDays\} days finished)(\s*)<\/p>/, `$1{' '}<HelpTip title="How programs work"><p>A program is a set number of weeks. Each week you do every day in order, then the program moves to the next week.</p><p>Days are not tied to the calendar. Do them whenever suits you. Tap Skip on Home if you have to miss one.</p></HelpTip>$2</p>`],
])
