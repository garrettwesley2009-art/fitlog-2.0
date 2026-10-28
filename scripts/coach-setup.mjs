// Adds the one-card setup to the Coach chat. Safe to run twice.
import fs from 'node:fs'
const file = 'src/components/assistant-chat.tsx'
if (!fs.existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(0) }
let t = fs.readFileSync(file, 'utf8')
if (t.includes('CoachSetupCard')) { console.log('SKIPPED  coach card (already done)'); process.exit(0) }
const nl = t.includes('\r\n') ? '\r\n' : '\n'
let s = t.replace(/\r\n/g, '\n')
const edits = [
  ["import type { ProgramDraft } from '@/lib/types'\n", "import type { ProgramDraft } from '@/lib/types'\nimport { CoachSetupCard } from '@/components/coach-setup-card'\n"],
  ["  const bottomRef = useRef<HTMLDivElement>(null)\n", "  const bottomRef = useRef<HTMLDivElement>(null)\n  const inputRef = useRef<HTMLInputElement>(null)\n  const [showSetup, setShowSetup] = useState(false)\n"],
  ["  async function send(override?: string) {\n    const text = (override ?? input).trim()\n    if (!text || loading) return\n\n    setError(null)\n", "  async function send(override?: string, shown?: string) {\n    const text = (override ?? input).trim()\n    if (!text || loading) return\n\n    setError(null)\n    setShowSetup(false)\n"],
  ["setMessages((prev) => [...prev, { role: 'user', content: text }])", "setMessages((prev) => [...prev, { role: 'user', content: shown ?? text }])"],
  ["          {messages.length === 0 && (\n            <div className=\"space-y-3\">", "          {(messages.length === 0 || showSetup) && (\n            <div className=\"space-y-3\">\n              <CoachSetupCard\n                disabled={loading}\n                onBuild={(m) => send(m, 'Build me a program (setup card)')}\n              />"],
  ["          <input\n            value={input}", "          <input\n            ref={inputRef}\n            value={input}"],
  ["          <button type=\"submit\" disabled={loading || !input.trim()} className=\"btn-accent\">", "          <button type=\"button\" onClick={() => setShowSetup((v) => !v)} className=\"btn-ghost-sm shrink-0\">\n            Guided setup\n          </button>\n          <button type=\"submit\" disabled={loading || !input.trim()} className=\"btn-accent\">"],
  ["        <p className=\"text-xs text-muted\">Want a change first? Just tell the coach.</p>", "        <button type=\"button\" onClick={onTweak} className=\"btn-ghost-sm\">\n          Tweak it\n        </button>"],
  ["  saving,\n  onSave,\n}: {\n  draft: ProgramDraft\n  saving: boolean\n  onSave: () => void\n}) {", "  saving,\n  onSave,\n  onTweak,\n}: {\n  draft: ProgramDraft\n  saving: boolean\n  onSave: () => void\n  onTweak: () => void\n}) {"],
  ["<DraftCard draft={pendingDraft} saving={saving} onSave={saveDraft} />", "<DraftCard\n          draft={pendingDraft}\n          saving={saving}\n          onSave={saveDraft}\n          onTweak={() => {\n            setInput('Change ')\n            inputRef.current?.focus()\n          }}\n        />"],
]
let miss = 0
for (const [a, b] of edits) { if (!s.includes(a)) { miss++; console.log('MISSING ANCHOR: ' + a.split('\n')[0]) } else s = s.replace(a, b) }
if (miss) { console.log('NOT CHANGED  coach card (send me this message)'); process.exit(0) }
fs.writeFileSync(file, s.replace(/\n/g, nl))
console.log('DONE     coach card')
