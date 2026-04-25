import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { Suspense } from 'react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Run independent queries in parallel
  const [sprintResult, todayLogsResult, profileResult, allHabitsResult] = await Promise.all([
    supabase
      .from('sprints')
      .select('*, sprint_habits(*, habits(*, habit_categories(*)))')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),

    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', today),

    supabase
      .from('users')
      .select('full_name, timezone')
      .eq('id', user.id)
      .single(),

    supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ])

  const sprint = sprintResult.data
  const todayLogs = todayLogsResult.data || []
  const profile = profileResult.data
  const totalHabits = allHabitsResult.data?.length || 0

  // Single batch query for last 12 months of logs
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = twelveMonthsAgo.toISOString().split('T')[0]

  const { data: allLogs } = await supabase
    .from('habit_logs')
    .select('logged_date, completed')
    .eq('user_id', user.id)
    .gte('logged_date', fromDate)
    .eq('completed', true)

  // Build monthly data from single query result
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthlyData = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    const monthLogs = allLogs?.filter(l => l.logged_date >= firstDay && l.logged_date <= lastDay) || []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalPossible = totalHabits * daysInMonth
    const progress = totalPossible > 0 ? Math.round((monthLogs.length / totalPossible) * 100) : 0

    monthlyData.push({ month: monthNames[month], progress })
  }

  // Calculate streak from already-fetched logs (no extra queries)
  let streak = 0
  if (totalHabits > 0 && allLogs) {
    const checkDate = new Date()
    for (let i = 0; i < 60; i++) { // max 60 days streak check
      const dateStr = checkDate.toISOString().split('T')[0]
      const dayLogs = allLogs.filter(l => l.logged_date === dateStr)
      const rate = (dayLogs.length / totalHabits) * 100
      if (rate >= 80) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else break
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <DashboardClient
        sprint={sprint}
        todayLogs={todayLogs}
        userId={user.id}
        profile={profile}
        today={today}
        monthlyData={monthlyData}
        streak={streak}
      />
    </Suspense>
  )
}
