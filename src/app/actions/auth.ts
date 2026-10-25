'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Emails are not case sensitive, but phones love to capitalize the first letter and add a
// trailing space. Clean it up so "Sam@Gmail.com " and "sam@gmail.com" are the same person.
function cleanEmail(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim().toLowerCase()
}

// Turns Supabase's technical messages into something a gym member can act on.
function friendly(message: string, code?: string): string {
  const m = message.toLowerCase()
  if (code === 'over_email_send_rate_limit' || m.includes('email rate limit')) {
    return "We can't send more emails right now. Wait a few minutes and try again."
  }
  if (m.includes('invalid login credentials')) {
    return "That email and password don't match. Check for typos (tap Show to see your password)."
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'There is already an account with that email. Try logging in instead.'
  }
  if (code === 'weak_password' || m.includes('password should be at least')) {
    return 'Your password needs at least 6 characters.'
  }
  if (code === 'email_address_invalid' || m.includes('valid email') || m.includes('invalid email')) {
    return "That email address doesn't look right. Check it and try again."
  }
  if (code === 'over_request_rate_limit' || m.includes('rate limit')) {
    return 'Too many tries. Wait a minute and try again.'
  }
  if (m.includes('fetch') || m.includes('network')) {
    return "Couldn't reach the server. Check your signal and try again."
  }
  return message
}

export async function login(formData: FormData) {
  const email = cleanEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Signed up but never clicked the email link: send them to the page that can resend it.
    if (error.code === 'email_not_confirmed' || error.message.toLowerCase().includes('not confirmed')) {
      redirect(`/signup/check-email?email=${encodeURIComponent(email)}&unconfirmed=1`)
    }
    redirect(
      `/login?error=${encodeURIComponent(friendly(error.message, error.code))}&email=${encodeURIComponent(email)}`
    )
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = cleanEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('displayName') ?? '').trim()
  const back = `email=${encodeURIComponent(email)}&name=${encodeURIComponent(displayName)}`

  if (!displayName) {
    redirect(`/signup?error=${encodeURIComponent('Add a name so we know what to call you.')}&${back}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(friendly(error.message, error.code))}&${back}`)
  }

  // Supabase hides "this email already exists" by returning a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect(
      `/signup?error=${encodeURIComponent('There is already an account with that email. Try logging in instead.')}&${back}`
    )
  }

  // No session yet means the email has to be confirmed first. Say so, instead of
  // bouncing them back to the login page with no explanation.
  if (!data.session) {
    redirect(`/signup/check-email?email=${encodeURIComponent(email)}`)
  }

  redirect('/dashboard')
}

export async function resendConfirmation(formData: FormData) {
  const email = cleanEmail(formData.get('email'))
  const page = `/signup/check-email?email=${encodeURIComponent(email)}`

  if (!email) redirect('/signup')

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })

  if (error) {
    redirect(`${page}&error=${encodeURIComponent(friendly(error.message, error.code))}`)
  }
  redirect(`${page}&sent=1`)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
