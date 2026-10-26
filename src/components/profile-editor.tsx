import { createClient } from '@/lib/supabase/server'
import { PROFILE_COLUMNS, fromRow, profileProgress } from '@/lib/profile-progress'
import { ProfileSetup } from '@/components/profile-setup'

// The profile section of the You page: progress plus the "Set up profile" button.
export async function ProfileEditor() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
  if (error) return null

  const p = fromRow(data, (user.user_metadata?.display_name as string | undefined) ?? '')
  const progress = profileProgress(p)
  const feet = p.heightIn != null ? Math.floor(p.heightIn / 12) : null
  const inches = p.heightIn != null ? Math.round((p.heightIn % 12) * 10) / 10 : null

  return (
    <div id="profile">
      <ProfileSetup
        percent={progress.percent}
        initial={{
          name: p.name ?? '',
          birthDate: p.birthDate ?? '',
          gender: p.gender,
          goals: p.goals ?? [],
          days: p.days,
          experience: p.experience,
          equipment: p.equipment ?? [],
          heightFt: feet != null ? String(feet) : '',
          heightIn: inches != null ? String(inches) : '',
          weightLb: p.weightLb != null ? String(p.weightLb) : '',
          limits: p.limits ?? '',
        }}
      />
    </div>
  )
}
