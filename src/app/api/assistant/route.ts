import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, ASSISTANT_MODEL } from '@/lib/anthropic'
import { COACH_GUIDELINES } from '@/lib/coach-guidelines'
import type { ProgramDraft } from '@/lib/types'

// Room for a full multi-day program. The old limit (1500) cut long programs off
// in the middle of the JSON, which made the coach look like it "only outputs text".
const MAX_OUTPUT_TOKENS = 8000
const MAX_HISTORY = 30
const MAX_EXERCISE_NAMES = 800

const BASE_PROMPT = `You are the in-app training coach for FitLog, a workout logging app. You talk with one person at a time and help them with training questions, their current program, or building a new program.

You build a program WITH the person, in three steps:
1. Interview. Ask only what you still need (see the guidelines). Use the profile you are given so you never ask for things you already know.
2. Outline. Send a short outline (name, length, and each day with its focus) and ask if they want it built like that. Do not call propose_program yet.
3. Build. Once they agree, call the propose_program tool with the full program. After that, keep taking changes and call the tool again with the full updated program each time.

Rules:
- Never claim a program is saved. You only propose. The person taps a Save button in the app to save it, and you do not control that button.
- When you call propose_program, also write one or two short sentences first about what you built and why. Do not paste the program as text in the chat; the app shows it as a card.
- If the person is only asking a question, answer it and do not call the tool.
- Follow the guidelines below exactly. They describe what the app can and cannot do.

GUIDELINES
`

const PROPOSE_PROGRAM_TOOL = {
  name: 'propose_program',
  description:
    'Put a full training program on screen for the person to review and save. Call this only after they agreed to the outline, or when they asked you to just build it. Always send the complete program, never just the changes.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Short program name, for example "Upper/Lower Strength".' },
      total_weeks: {
        type: 'integer',
        description: 'Whole number from 4 to 12. How many times the listed days repeat as a week. Default 8.',
      },
      days: {
        type: 'array',
        description: 'Training days in order. Never include rest days.',
        items: {
          type: 'object',
          properties: {
            day_label: { type: 'string', description: 'For example "Day 1 - Upper A".' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exercise_name: { type: 'string' },
                  target_sets: { type: 'integer' },
                  target_reps: {
                    type: 'string',
                    description: 'Text like "8", "8-10", or "8/8/6/6F". With a slash list, target_sets equals the number of numbers.',
                  },
                  notes: { type: 'string', description: 'Short cue, load target and "Rest 90 sec". Empty string if none.' },
                },
                required: ['exercise_name', 'target_sets', 'target_reps'],
              },
            },
          },
          required: ['day_label', 'exercises'],
        },
      },
    },
    required: ['name', 'days'],
  },
}

type RawExercise = { exercise_name?: unknown; target_sets?: unknown; target_reps?: unknown; notes?: unknown }
type RawDay = { day_label?: unknown; exercises?: unknown }

// The model's tool input is untrusted: clean it into exactly the ProgramDraft shape.
function normalizeDraft(input: unknown): ProgramDraft | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as { name?: unknown; total_weeks?: unknown; days?: unknown }
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name || !Array.isArray(raw.days)) return null

  const days = (raw.days as RawDay[])
    .map((d, i) => {
      const exercises = (Array.isArray(d.exercises) ? (d.exercises as RawExercise[]) : [])
        .map((e) => {
          const exercise_name = typeof e.exercise_name === 'string' ? e.exercise_name.trim() : ''
          const sets = Math.round(Number(e.target_sets))
          const reps = typeof e.target_reps === 'string' ? e.target_reps.trim() : String(e.target_reps ?? '').trim()
          const notes = typeof e.notes === 'string' && e.notes.trim() ? e.notes.trim() : null
          return {
            exercise_name,
            target_sets: Number.isFinite(sets) && sets > 0 ? sets : null,
            target_reps: reps || null,
            notes,
          }
        })
        .filter((e) => e.exercise_name)
        .map((e, j) => ({ ...e, order_index: j }))
      return {
        day_label: typeof d.day_label === 'string' && d.day_label.trim() ? d.day_label.trim() : `Day ${i + 1}`,
        order_index: i,
        exercises,
      }
    })
    .filter((d) => d.exercises.length > 0)
    .map((d, i) => ({ ...d, order_index: i }))

  if (days.length === 0) return null

  const weeks = Math.round(Number(raw.total_weeks))
  const total_weeks = Number.isFinite(weeks) ? Math.min(12, Math.max(4, weeks)) : 8
  return { name, total_weeks, days }
}

// Turns whatever columns the profiles table has into short lines for the model.
// Works today (display name only) and picks up weight, age, goals, etc. automatically
// once the profile and onboarding columns exist. Nothing here needs to change then.
const SKIP_PROFILE_KEYS = new Set(['id', 'created_at', 'updated_at', 'onboarded_at', 'email'])

function profileNote(profile: Record<string, unknown> | null): string {
  if (!profile) return 'No profile information is saved for this person yet.'
  const lines = Object.entries(profile)
    .filter(([key, value]) => !SKIP_PROFILE_KEYS.has(key) && value !== null && value !== '' && value !== undefined)
    .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
  if (lines.length === 0) return 'No profile information is saved for this person yet.'
  return `Saved profile (units are as stored; ask if unclear):\n${lines.join('\n')}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { message, history, programContext, currentDraft } = (await request.json()) as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
    programContext?: unknown
    currentDraft?: ProgramDraft | null
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  await supabase.from('assistant_messages').insert({ user_id: user.id, role: 'user', content: message })

  const [{ data: profile }, { data: exerciseRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('exercises').select('name').order('name', { ascending: true }).limit(MAX_EXERCISE_NAMES),
  ])

  const exerciseList = (exerciseRows ?? []).map((r: { name: string }) => r.name).join('; ')

  const contextParts = [
    profileNote(profile as Record<string, unknown> | null),
    programContext
      ? `The program the person is looking at or currently running (for reference):\n${JSON.stringify(programContext)}`
      : '',
    currentDraft
      ? `The draft program currently on the person's screen (revise this one when they ask for changes, and send back the full updated program):\n${JSON.stringify(currentDraft)}`
      : '',
    exerciseList ? `Exercise library (use these exact names when possible):\n${exerciseList}` : '',
  ].filter(Boolean)

  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }))

  let text = ''
  let draft: ProgramDraft | null = null
  let truncated = false

  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        // Same every call, so it can be cached.
        { type: 'text', text: BASE_PROMPT + COACH_GUIDELINES, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: contextParts.join('\n\n') },
      ],
      tools: [PROPOSE_PROGRAM_TOOL],
      messages: [...safeHistory, { role: 'user' as const, content: message }],
    })

    truncated = response.stop_reason === 'max_tokens'

    text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim()

    // A cut-off tool call is an incomplete program, so never show it as a draft.
    if (!truncated) {
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'propose_program') {
          draft = normalizeDraft(block.input)
        }
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Assistant request failed' },
      { status: 500 }
    )
  }

  let reply = text
  if (!reply && draft) reply = `Here is the draft: ${draft.name}. Look it over and tell me what to change.`
  if (!reply) reply = 'Sorry, I did not get a reply together. Try asking again.'
  if (truncated && !draft) {
    reply += '\n\n(That reply was cut off because it got too long. Ask me to build it again, or build one day at a time.)'
  }

  await supabase.from('assistant_messages').insert({ user_id: user.id, role: 'assistant', content: reply })

  return NextResponse.json({ reply, draft })
}

export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data } = await supabase
    .from('assistant_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(100)

  return NextResponse.json({ messages: data ?? [] })
}
