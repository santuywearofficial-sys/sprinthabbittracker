import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export const revalidate = 60 // Cache for 60 seconds

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Last 30 days logs
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('logged_date, completed, habit_id')
    .eq('user_id', user.id)
    .gte('logged_date', fromDate)
    .lte('logged_date', today)
    .order('logged_date')

  const { data: habits } = await supabase
    .from('habits')
    .select('id, title, category_id, habit_categories!inner(name, color)')
    .eq('user_id', user.id)
    .is('deleted_at', null) as { data: any[] | null }

  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate streak
  let streak = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const dayLogs = logs?.filter(l => l.logged_date === dateStr && l.completed) || []
    const totalHabits = habits?.length || 0
    const completionRate = totalHabits > 0 ? (dayLogs.length / totalHabits) * 100 : 0
    if (completionRate >= 80) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
    if (streak > 365) break
  }

  return (
    <AnalyticsClient
      logs={logs || []}
      habits={habits || []}
      sprints={sprints || []}
      streak={streak}
      fromDate={fromDate}
      today={today}
    />
  )
}
