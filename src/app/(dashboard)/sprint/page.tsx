import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SprintClient from './SprintClient'

export default async function SprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: activeSprint } = await supabase
    .from('sprints')
    .select('*, sprint_habits(*, habits(*, habit_categories(*)))')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: pastSprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: habits } = await supabase
    .from('habits')
    .select('*, habit_categories(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)

  // Count completed sprints for unlock logic
  const { count: completedCount } = await supabase
    .from('sprints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')

  return (
    <SprintClient
      activeSprint={activeSprint}
      pastSprints={pastSprints || []}
      habits={habits || []}
      userId={user.id}
      completedSprintsCount={completedCount || 0}
    />
  )
}
