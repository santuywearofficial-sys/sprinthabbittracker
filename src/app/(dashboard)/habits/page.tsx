import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HabitsClient from './HabitsClient'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [habitsResult, categoriesResult, sprintResult, recentLogsResult] = await Promise.all([
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

    // Last 60 days logs for streak calculation
    supabase
      .from('habit_logs')
      .select('habit_id, logged_date, completed')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('logged_date', new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0])
      .order('logged_date', { ascending: false }),
  ])

  const lockedHabitIds = sprintResult.data?.sprint_habits
    ?.filter((sh: { is_locked: boolean }) => sh.is_locked)
    .map((sh: { habit_id: string }) => sh.habit_id) || []

  // Calculate streak per habit
  const today = new Date().toISOString().split('T')[0]
  const logs = recentLogsResult.data || []
  const habitStreaks: Record<string, number> = {}

  for (const habit of habitsResult.data || []) {
    let streak = 0
    const checkDate = new Date()
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasLog = logs.some(l => l.habit_id === habit.id && l.logged_date === dateStr)
      if (hasLog) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // Allow today to be missing (day not over yet)
        if (dateStr === today && i === 0) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
    }
    habitStreaks[habit.id] = streak
  }

  return (
    <HabitsClient
      habits={habitsResult.data || []}
      categories={categoriesResult.data || []}
      userId={user.id}
      lockedHabitIds={lockedHabitIds}
      habitStreaks={habitStreaks}
    />
  )
}
