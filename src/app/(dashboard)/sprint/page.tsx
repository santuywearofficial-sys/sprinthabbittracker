import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SprintClient from './SprintClient'

export default async function SprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [activeSprintResult, pastSprintsResult, habitsResult, completedCountResult] = await Promise.all([
    supabase
      .from('sprints')
      .select('*, sprint_habits(*, habits(*, habit_categories(*)))')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),

    supabase
      .from('sprints')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('habits')
      .select('*, habit_categories(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null),

    supabase
      .from('sprints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ])

  return (
    <SprintClient
      activeSprint={activeSprintResult.data}
      pastSprints={pastSprintsResult.data || []}
      habits={habitsResult.data || []}
      userId={user.id}
      completedSprintsCount={completedCountResult.count || 0}
    />
  )
}
