import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, ASSISTANT_MODEL } from '@/lib/anthropic'
import type { ProgramDraft } from '@/lib/types'

const SYSTEM_PROMPT = `You are the in-app training assistant for FitLog, a workout logging app.

You help with two things:
1. General questions about training, the app, or a user's current program.
2. Creating a brand new program, or customizing an existing one, when asked.

When (and ONLY when) the user asks you to create or change a program, do two things:
- Give a short, plain-language explanation of what you're proposing and why.
- After your explanation, include a fenced code block labeled program_json containing ONLY
  valid JSON (no comments, no trailing commas) matching exactly this shape:

\`\`\`program_json
{
  "name": "string",
  "days": [
    {
      "day_label": "string",
      "order_index": 0,
      "exercises": [
        {
          "exercise_name": "string",
          "order_index": 0,
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": null
        }
      ]
    }
  ]
}
\`\`\`

Never invent a program unprompted, and never claim you have already changed the user's saved
program -- you only ever propose; a visible "Apply" step elsewhere in the app is what actually
saves it. If the user is not asking you to create or edit a program, just answer normally and
do not include a program_json block at all.`

function extractDraft(text: string): { reply: string; draft: ProgramDraft | null } {
  const match = text.match(/```program_json\s*([\s\S]*?)```/)
  if (!match) return { reply: text.trim(), draft: null }

  const reply = text.replace(match[0], '').trim()
  try {
    const draft = JSON.parse(match[1]) as ProgramDraft
    if (!draft.name || !Array.isArray(draft.days)) {
      return { reply, draft: null }
    }
    return { reply, draft }
  } catch {
    return { reply, draft: null }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { message, history, programContext } = (await request.json()) as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
    programContext?: unknown
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  await supabase.from('assistant_messages').insert({ user_id: user.id, role: 'user', content: message })

  const contextNote = programContext
    ? `\n\nThe user's current program for reference:\n${JSON.stringify(programContext)}`
    : ''

  let text = ''
  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT + contextNote,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
      ],
    })

    text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Assistant request failed' },
      { status: 500 }
    )
  }

  const { reply, draft } = extractDraft(text)

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
