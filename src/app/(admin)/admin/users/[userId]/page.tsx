import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserDetailsClient from './UserDetailsClient'

export default async function UserDetailsPage({ params }: { params: { userId: string } }) {
  const supabase = await createClient()
  const { userId } = params

  // Fetch user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    redirect('/admin')
  }

  // Fetch user role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  // Fetch user habits
  const { data: habits } = await supabase
    .from('habits')
    .select('*, habit_categories(name, color)')
    .eq('user_id', userId)
    .is('deleted_at', null)

  // Fetch user sprints
  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch habit logs for completion rate
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('completed')
    .eq('user_id', userId)

  // Calculate stats
  const totalHabits = habits?.length || 0
  const totalSprints = sprints?.length || 0
  const completedLogs = habitLogs?.filter(log => log.completed).length || 0
  const totalLogs = habitLogs?.length || 0
  const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0

  return (
    <UserDetailsClient
      user={{
        ...user,
        role: userRole?.role || 'user'
      }}
      habits={habits || []}
      sprints={sprints || []}
      stats={{
        totalHabits,
        totalSprints,
        completionRate,
        lastLogin: user.created_at // Placeholder - would need last_login field
      }}
    />
  )
}
