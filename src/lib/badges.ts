import { createClient } from '@/lib/supabase/client'

export async function checkAndAwardBadges(userId: string) {
  const supabase = createClient()

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from('badges')
    .select('badge_type')
    .eq('user_id', userId)

  const earned = new Set(existingBadges?.map(b => b.badge_type) || [])
  const toAward: string[] = []

  // Check completed sprints
  const { count: sprintCount } = await supabase
    .from('sprints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!earned.has('first_sprint') && (sprintCount || 0) >= 1) {
    toAward.push('first_sprint')
  }
  if (!earned.has('sprint_master') && (sprintCount || 0) >= 5) {
    toAward.push('sprint_master')
  }

  // Check perfect sprint (100% completion)
  const { data: perfectSprint } = await supabase
    .from('sprints')
    .select('completion_rate')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('completion_rate', 100)
    .limit(1)

  if (!earned.has('perfect_sprint') && perfectSprint && perfectSprint.length > 0) {
    toAward.push('perfect_sprint')
  }

  // Check streak
  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const totalHabits = habits?.length || 0
  if (totalHabits > 0) {
    let streak = 0
    const checkDate = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const { data: dayLogs } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('logged_date', dateStr)
        .eq('completed', true)
      const rate = ((dayLogs?.length || 0) / totalHabits) * 100
      if (rate >= 80) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else break
    }

    if (!earned.has('7_day_streak') && streak >= 7) toAward.push('7_day_streak')
    if (!earned.has('30_day_streak') && streak >= 30) toAward.push('30_day_streak')
    if (!earned.has('30_day_consistency') && streak >= 30) toAward.push('30_day_consistency')
  }

  // Award new badges
  if (toAward.length > 0) {
    await supabase.from('badges').insert(
      toAward.map(badge_type => ({ user_id: userId, badge_type }))
    )
  }

  return toAward
}
