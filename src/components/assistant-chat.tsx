'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProgramDraft } from '@/lib/types'
import { CoachSetupCard } from '@/components/coach-setup-card'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'Build me a new program',
  'I want to get stronger',
  'Help me build muscle',
  'I play baseball and want more power',
]

// True when the person is asking the Coach to make them a new program.
function isBuildRequest(text: string) {
  return /\b(build|create|make|design|write|new)\b.*\b(program|workout|plan|routine|split)\b/i.test(text)
}

function DraftCard({
  draft,
  saving,
  onSave,
  onTweak,
}: {
  draft: ProgramDraft
  saving: boolean
  onSave: () => void
  onTweak: () => void
}) {
  const [open, setOpen] = useState(true)
  const weeks = draft.total_weeks ?? 8

  return (
    <div className="glass-card space-y-3 border border-accent p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">New template draft</p>
          <p className="mt-1 text-base font-semibold text-ink">{draft.name}</p>
          <p className="text-xs text-muted">
            {weeks} weeks &middot; {draft.days.length} training days per week
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost-sm shrink-0">
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {draft.days.map((day) => (
            <div key={day.order_index}>
              <p className="text-sm font-medium text-ink">{day.day_label}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {day.exercises.map((ex) => (
                  <li key={ex.order_index}>
                    {ex.exercise_name}
                    {ex.target_sets && ex.target_reps ? ` - ${ex.target_sets} x ${ex.target_reps}` : ''}
                    {ex.notes ? ` (${ex.notes})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving} className="btn-accent">
          {saving ? 'Saving...' : 'Save to my programs'}
        </button>
        <button type="button" onClick={onTweak} className="btn-ghost-sm">
          Tweak it
        </button>
      </div>
    </div>
  )
}

export function AssistantChat({ programContext }: { programContext?: unknown }) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<ProgramDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    fetch('/api/assistant')
      .then((r) => r.json())
      .then((body) => {
        if (Array.isArray(body.messages)) {
          setMessages(
            body.messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingDraft, savedName, loading, showSetup])

  async function send(override?: string, shown?: string) {
    const text = (override ?? input).trim()
    if (!text || loading) return

    if (shown === undefined && isBuildRequest(text)) {
      setError(null)
      setSavedName(null)
      setInput('')
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: 'Happy to. Fill in the card below, change anything that is off, then tap Build.' },
      ])
      setShowSetup(true)
      return
    }

    setError(null)
    setShowSetup(false)
    setSavedName(null)
    setInput('')
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', content: shown ?? text }])
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, programContext, currentDraft: pendingDraft }),
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? 'The assistant had a problem responding.')
        return
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: body.reply }])
      if (body.draft) setPendingDraft(body.draft)
    } catch {
      setError('Could not reach the assistant. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveDraft() {
    if (!pendingDraft) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/programs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingDraft),
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? 'Could not save that program.')
        return
      }

      setSavedName(pendingDraft.name)
      setPendingDraft(null)
      router.refresh()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="glass-card flex h-[60vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Tell the coach what you want. It will ask a few quick questions, show you an outline, and build the
                program with you before anything is saved.
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="btn-ghost-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm text-ink ${
                  m.role === 'user' ? 'border border-accent bg-glass' : 'bg-glass-hover'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {showSetup && (
            <CoachSetupCard disabled={loading} onBuild={(m) => send(m, 'Build me a program (setup card)')} />
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-glass-hover px-3 py-2 text-sm text-muted">Coach is thinking...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <p className="border-t border-line px-4 py-2 text-sm text-danger">{error}</p>}

        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your coach"
            className="input-field flex-1"
            aria-label="Message your coach"
          />
          <button type="button" onClick={() => setShowSetup((v) => !v)} className="btn-ghost-sm shrink-0">
            Guided setup
          </button>
          <button type="submit" disabled={loading || !input.trim()} className="btn-accent">
            Send
          </button>
        </form>
      </div>

      {pendingDraft && <DraftCard
          draft={pendingDraft}
          saving={saving}
          onSave={saveDraft}
          onTweak={() => {
            setInput('Change ')
            inputRef.current?.focus()
          }}
        />}

      {savedName && (
        <div className="glass-card space-y-2 border border-accent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">New template saved</p>
          <p className="text-base font-semibold text-ink">{savedName}</p>
          <p className="text-xs text-muted">It is in your programs now. You can keep chatting to build another one.</p>
          <button type="button" onClick={() => router.push('/dashboard')} className="btn-accent-sm">
            Go to Home
          </button>
        </div>
      )}
    </div>
  )
}
