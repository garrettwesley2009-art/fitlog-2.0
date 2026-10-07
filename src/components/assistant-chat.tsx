'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProgramDraft } from '@/lib/types'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export function AssistantChat({ programContext }: { programContext?: unknown }) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<ProgramDraft | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/assistant')
      .then((r) => r.json())
      .then((body) => {
        if (Array.isArray(body.messages)) {
          setMessages(body.messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })))
        }
      })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingDraft])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setError(null)
    setInput('')
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history, programContext }),
    })

    const body = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(body.error ?? 'The assistant had a problem responding.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: body.reply }])
    if (body.draft) setPendingDraft(body.draft)
  }

  async function applyDraft() {
    if (!pendingDraft) return
    setApplying(true)
    setError(null)

    const res = await fetch('/api/programs/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingDraft),
    })

    const body = await res.json()
    setApplying(false)

    if (!res.ok) {
      setError(body.error ?? 'Could not apply that program.')
      return
    }

    setPendingDraft(null)
    router.push('/dashboard')
  }

  return (
    <div className="glass-card flex h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask for a new program, ask to customize your current one, or just ask a training question.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'ml-auto bg-accent text-white'
                : 'bg-glass-hover text-ink'
            }`}
          >
            {m.content}
          </div>
        ))}

        {pendingDraft && (
          <div className="inset-card p-3">
            <p className="text-sm font-medium text-ink">
              Proposed program: {pendingDraft.name}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-muted">
              {pendingDraft.days.map((d, i) => (
                <li key={i}>
                  <span className="font-medium text-ink">{d.day_label}:</span>{' '}
                  {d.exercises.map((e) => e.exercise_name).join(', ')}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={applyDraft} disabled={applying} className="btn-accent-sm">
                {applying ? 'Applying…' : 'Apply this program'}
              </button>
              <button onClick={() => setPendingDraft(null)} className="btn-ghost-sm">
                Dismiss
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Nothing is saved until you click Apply.
            </p>
          </div>
        )}

        {loading && <p className="text-sm text-muted">Thinking…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message the assistant…"
          className="input-compact min-w-0 flex-1"
        />
        <button onClick={send} disabled={loading} className="btn-accent-sm">
          Send
        </button>
      </div>
    </div>
  )
}