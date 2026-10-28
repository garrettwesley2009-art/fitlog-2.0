// Makes the setup card open by default and sit under the chat. Safe to run twice.
import fs from 'node:fs'
const file = 'src/components/assistant-chat.tsx'
if (!fs.existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(0) }
const raw = fs.readFileSync(file, 'utf8')
const nl = raw.includes('\r\n') ? '\r\n' : '\n'
let s = raw.replace(/\r\n/g, '\n')
if (s.includes('{showSetup && !pendingDraft')) { console.log('SKIPPED  coach card v2 (already done)'); process.exit(0) }
const edits = [
  ["const [showSetup, setShowSetup] = useState(false)", "const [showSetup, setShowSetup] = useState(true)"],
  ["          {(messages.length === 0 || showSetup) && (\n            <div className=\"space-y-3\">\n              <CoachSetupCard\n                disabled={loading}\n                onBuild={(m) => send(m, 'Build me a program (setup card)')}\n              />", "          {messages.length === 0 && (\n            <div className=\"space-y-3\">"],
  ["          {loading && (\n            <div className=\"flex justify-start\">", "          {showSetup && !pendingDraft && (\n            <CoachSetupCard disabled={loading} onBuild={(m) => send(m, 'Build me a program (setup card)')} />\n          )}\n\n          {loading && (\n            <div className=\"flex justify-start\">"],
  ["[messages, pendingDraft, savedName, loading]", "[messages, pendingDraft, savedName, loading, showSetup]"],
]
let miss = 0
for (const [a, b] of edits) { if (!s.includes(a)) { miss++; console.log('MISSING ANCHOR: ' + a.split('\n')[0]) } else s = s.replace(a, b) }
if (miss) { console.log('NOT CHANGED  coach card v2 (send me this message)'); process.exit(0) }
fs.writeFileSync(file, s.replace(/\n/g, nl))
console.log('DONE     coach card v2')
