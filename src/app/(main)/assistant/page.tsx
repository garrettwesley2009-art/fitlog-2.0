import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram } from '@/lib/data'
import { AssistantChat } from '@/components/assistant-chat'

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>
}) {
  const { templateId } = await searchParams
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  let programContext: unknown = null

  if (templateId) {
    const { data: template } = await supabase
      .from('templates')
      .select('id, name, description')
      .eq('id', templateId)
      .single()

    const { data: days } = await supabase
      .from('template_days')
      .select(
        'day_label, order_index, template_exercises(order_index, target_sets, target_reps, notes, exercises(name))'
      )
      .eq('template_id', templateId)
      .order('order_index', { ascending: true })

    programContext = { kind: 'template', template, days }
  } else {
    const current = await getCurrentProgram(supabase, user.id)
    if (current) programContext = { kind: 'current_program', program: current }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">AI assistant</h1>
        <p className="mt-1 text-sm text-muted">
          {templateId
            ? 'Ask it to tweak this template before you start it.'
            : 'Ask it to build or adjust a program, or ask a training question.'}
        </p>
      </div>
      <AssistantChat programContext={programContext} />
    </div>
  )
}
