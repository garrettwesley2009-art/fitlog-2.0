import { redirect } from 'next/navigation'

// PROGRAMS-TAB: the Schedule tab was removed; this old address forwards to the new home.
export default function Page() {
  redirect('/workout/program')
}
