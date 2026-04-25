import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HabitsClient from './HabitsClient'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [habitsResult, categoriesResult, sprintResult] = await Promise.all([
    supabase
      .from('habits')
      .select('*, habit_categories(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),

    supabase
      .from('habit_categories')
      .select('*')
      .order('id'),

    supabase
      .from('sprints')
      .select('id, sprint_habits(habit_id, is_locked)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),
  ])

  const lockedHabitIds = sprintResult.data?.sprint_habits
    ?.filter((sh: { is_locked: boolean }) => sh.is_locked)
    .map((sh: { habit_id: string }) => sh.habit_id) || []

  return (
    <HabitsClient
      habits={habitsResult.data || []}
      categories={categoriesResult.data || []}
      userId={user.id}
      lockedHabitIds={lockedHabitIds}
    />
  )
}
