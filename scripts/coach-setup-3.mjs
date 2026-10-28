// The setup card now appears as the Coach's reply when you ask it to build a program. Safe to run twice.
import fs from 'node:fs'
const file = 'src/components/assistant-chat.tsx'
if (!fs.existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(0) }
const raw = fs.readFileSync(file, 'utf8')
const nl = raw.includes('\r\n') ? '\r\n' : '\n'
let s = raw.replace(/\r\n/g, '\n')
if (s.includes('isBuildRequest')) { console.log('SKIPPED  coach card v3 (already done)'); process.exit(0) }
const edits = [
  ["function DraftCard(", "// True when the person is asking the Coach to make them a new program.\nfunction isBuildRequest(text: string) {\n  return /\\b(build|create|make|design|write|new)\\b.*\\b(program|workout|plan|routine|split)\\b/i.test(text)\n}\n\nfunction DraftCard("],
  ["const [showSetup, setShowSetup] = useState(true)", "const [showSetup, setShowSetup] = useState(false)"],
  ["    if (!text || loading) return\n\n    setError(null)\n    setShowSetup(false)\n", "    if (!text || loading) return\n\n    if (shown === undefined && isBuildRequest(text)) {\n      setError(null)\n      setSavedName(null)\n      setInput('')\n      setMessages((prev) => [\n        ...prev,\n        { role: 'user', content: text },\n        { role: 'assistant', content: 'Happy to. Fill in the card below, change anything that is off, then tap Build.' },\n      ])\n      setShowSetup(true)\n      return\n    }\n\n    setError(null)\n    setShowSetup(false)\n"],
  ["{showSetup && !pendingDraft && (", "{showSetup && ("],
]
let miss = 0
for (const [a, b] of edits) { if (!s.includes(a)) { miss++; console.log('MISSING ANCHOR: ' + a.split('\n')[0]) } else s = s.replace(a, b) }
if (miss) { console.log('NOT CHANGED  coach card v3 (send me this message)'); process.exit(0) }
fs.writeFileSync(file, s.replace(/\n/g, nl))
console.log('DONE     coach card v3')
