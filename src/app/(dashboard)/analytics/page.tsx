import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export const revalidate = 60

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch last 12 months of data in one go — client will filter by month
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)
  const fromDate = twelveMonthsAgo.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [logsResult, habitsResult, sprintsResult] = await Promise.all([
    supabase
      .from('habit_logs')
      .select('logged_date, completed, habit_id')
      .eq('user_id', user.id)
      .gte('logged_date', fromDate)
      .lte('logged_date', today)
      .order('logged_date'),

    supabase
      .from('habits')
      .select('id, title, category_id, habit_categories!inner(name, color)')
      .eq('user_id', user.id)
      .is('deleted_at', null) as any,

    supabase
      .from('sprints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const logs = logsResult.data || []
  const habits = habitsResult.data || []

  // Calculate current streak from all logs
  let streak = 0
  const checkDate = new Date()
  const totalHabits = habits.length
  for (let i = 0; i < 60; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const dayLogs = logs.filter((l: any) => l.logged_date === dateStr && l.completed)
    const rate = totalHabits > 0 ? (dayLogs.length / totalHabits) * 100 : 0
    if (rate >= 80) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  return (
    <AnalyticsClient
      logs={logs}
      habits={habits}
      sprints={sprintsResult.data || []}
      streak={streak}
      fromDate={fromDate}
      today={today}
    />
  )
}
