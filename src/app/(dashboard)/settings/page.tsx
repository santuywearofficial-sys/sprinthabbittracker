import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [profileResult, badgesResult, sprintCountResult, habitCountResult, roleResult] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single(),

    supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),

    supabase
      .from('sprints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),

    supabase
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single(),
  ])

  const isAdmin = roleResult.data?.role === 'admin'

  return (
    <SettingsClient
      profile={profileResult.data}
      email={user.email || ''}
      badges={badgesResult.data || []}
      sprintCount={sprintCountResult.count || 0}
      habitCount={habitCountResult.count || 0}
      isAdmin={isAdmin}
    />
  )
}
