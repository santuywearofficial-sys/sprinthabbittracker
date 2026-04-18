import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { Suspense } from 'react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Active sprint with habits
  const { data: sprint } = await supabase
    .from('sprints')
    .select('*, sprint_habits(*, habits(*, habit_categories(*)))')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // Today's logs
  const { data: todayLogs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('logged_date', today)

  // User profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, timezone')
    .eq('id', user.id)
    .single()

  // Monthly data (last 12 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthlyData = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    const { data: monthLogs } = await supabase
      .from('habit_logs')
      .select('completed')
      .eq('user_id', user.id)
      .gte('logged_date', firstDay)
      .lte('logged_date', lastDay)
      .eq('completed', true)

    const { data: monthHabits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalPossible = (monthHabits?.length || 0) * daysInMonth
    const progress = totalPossible > 0 ? Math.round(((monthLogs?.length || 0) / totalPossible) * 100) : 0

    monthlyData.push({ month: monthNames[month], progress })
  }

  // Streak calculation
  let streak = 0
  const checkDate = new Date()
  const { data: allHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const totalHabits = allHabits?.length || 0
  if (totalHabits > 0) {
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const { data: dayLogs } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('logged_date', dateStr)
        .eq('completed', true)
      const rate = ((dayLogs?.length || 0) / totalHabits) * 100
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
        todayLogs={todayLogs || []}
        userId={user.id}
        profile={profile}
        today={today}
        monthlyData={monthlyData}
        streak={streak}
      />
    </Suspense>
  )
}
