import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  const { count: sprintCount } = await supabase
    .from('sprints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const { count: habitCount } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  return (
    <SettingsClient
      profile={profile}
      email={user.email || ''}
      badges={badges || []}
      sprintCount={sprintCount || 0}
      habitCount={habitCount || 0}
    />
  )
}
