'use client'

import { useState, useMemo } from 'react'
import { HABIT_CATEGORIES } from '@/constants/habits'
import { Flame, Trophy, BarChart3, ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load Recharts
const AreaChart = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => ({ default: m.Area })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })

interface Log {
  logged_date: string
  completed: boolean
  habit_id: string
}

interface Habit {
  id: string
  title: string
  category_id: number
  habit_categories: { name: string; color: string }
}

interface Sprint {
  id: string
  start_date: string
  end_date: string
  duration_days: number
  completion_rate: number | null
  status: string
}

interface Props {
  logs: Log[]
  habits: Habit[]
  sprints: Sprint[]
  streak: number
  fromDate: string
  today: string
}

const categoryBg: Record<string, string> = {
  Soulset: 'bg-rose-500',
  Mindset: 'bg-indigo-500',
  Healthset: 'bg-emerald-500',
  Familyset: 'bg-orange-500',
  Socialset: 'bg-sky-500',
  Wealthset: 'bg-amber-500',
}

const categoryColor: Record<string, string> = {
  Soulset: '#f43f5e',
  Mindset: '#6366f1',
  Healthset: '#10b981',
  Familyset: '#f97316',
  Socialset: '#0ea5e9',
  Wealthset: '#f59e0b',
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function AnalyticsClient({ logs, habits, sprints, streak, fromDate, today }: Props) {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  // Build list of available months (last 12)
  const availableMonths = useMemo(() => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      months.push({ year: d.getFullYear(), month: d.getMonth() })
    }
    return months
  }, [])

  const canGoPrev = useMemo(() => {
    const first = availableMonths[0]
    return !(selectedYear === first.year && selectedMonth === first.month)
  }, [selectedYear, selectedMonth, availableMonths])

  const canGoNext = useMemo(() => {
    return !(selectedYear === now.getFullYear() && selectedMonth === now.getMonth())
  }, [selectedYear, selectedMonth])

  const goToPrevMonth = () => {
    if (!canGoPrev) return
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (!canGoNext) return
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  // Date range for selected month
  const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${daysInMonth}`

  // Filter logs for selected month
  const monthLogs = useMemo(() =>
    logs.filter(l => l.logged_date >= monthStart && l.logged_date <= monthEnd),
    [logs, monthStart, monthEnd]
  )

  // Heatmap for selected month
  const heatmapData = useMemo(() => {
    const data = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayLogs = monthLogs.filter(l => l.logged_date === dateStr && l.completed)
      const rate = habits.length > 0 ? Math.round((dayLogs.length / habits.length) * 100) : 0
      const isFuture = dateStr > today
      data.push({ date: dateStr, day: d, rate, isFuture })
    }
    return data
  }, [monthLogs, daysInMonth, selectedYear, selectedMonth, habits, today])

  // Monthly completion rate
  const monthCompletedLogs = monthLogs.filter(l => l.completed).length
  const pastDaysInMonth = heatmapData.filter(d => !d.isFuture).length
  const monthTotalPossible = habits.length * pastDaysInMonth
  const monthRate = monthTotalPossible > 0 ? Math.round((monthCompletedLogs / monthTotalPossible) * 100) : 0

  // Best day in month
  const bestDay = useMemo(() => {
    return heatmapData
      .filter(d => !d.isFuture)
      .reduce((best, d) => d.rate > best.rate ? d : best, { rate: 0, day: 0, date: '' })
  }, [heatmapData])

  // Days with 100% completion
  const perfectDays = heatmapData.filter(d => !d.isFuture && d.rate === 100).length

  // Category stats for selected month
  const categoryStats = useMemo(() =>
    HABIT_CATEGORIES.map(cat => {
      const catHabits = habits.filter(h => h.category_id === cat.id)
      if (catHabits.length === 0) return null
      const catLogs = monthLogs.filter(l => catHabits.some(h => h.id === l.habit_id) && l.completed)
      const totalPossible = catHabits.length * pastDaysInMonth
      const rate = totalPossible > 0 ? Math.round((catLogs.length / totalPossible) * 100) : 0
      return { ...cat, rate, habitCount: catHabits.length }
    }).filter(Boolean) as any[],
    [monthLogs, habits, pastDaysInMonth]
  )

  // Per-habit stats for selected month
  const habitStats = useMemo(() =>
    habits.map(habit => {
      const habitLogs = monthLogs.filter(l => l.habit_id === habit.id && l.completed)
      const rate = pastDaysInMonth > 0 ? Math.round((habitLogs.length / pastDaysInMonth) * 100) : 0
      return { ...habit, completedDays: habitLogs.length, rate }
    }).sort((a, b) => b.rate - a.rate),
    [monthLogs, habits, pastDaysInMonth]
  )

  // Monthly trend chart (all 12 months)
  const monthlyTrend = useMemo(() =>
    availableMonths.map(({ year, month }) => {
      const mStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const mDays = new Date(year, month + 1, 0).getDate()
      const mEnd = `${year}-${String(month + 1).padStart(2, '0')}-${mDays}`
      const mLogs = logs.filter(l => l.logged_date >= mStart && l.logged_date <= mEnd && l.completed)
      const mPastDays = mEnd > today ? Math.max(1, Math.floor((new Date(today).getTime() - new Date(mStart).getTime()) / 86400000) + 1) : mDays
      const total = habits.length * mPastDays
      const rate = total > 0 ? Math.round((mLogs.length / total) * 100) : 0
      const isSelected = year === selectedYear && month === selectedMonth
      return { label: MONTH_SHORT[month], rate, isSelected }
    }),
    [availableMonths, logs, habits, today, selectedYear, selectedMonth]
  )

  const completedSprints = sprints.filter(s => s.status === 'completed')

  const exportMonthCSV = () => {
    const rows = [['Tanggal', 'Habit', 'Kategori', 'Status']]
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (dateStr > today) continue
      for (const habit of habits) {
        const done = monthLogs.some(l => l.habit_id === habit.id && l.logged_date === dateStr && l.completed)
        rows.push([
          dateStr,
          habit.title,
          habit.habit_categories.name,
          done ? 'Selesai' : 'Tidak Selesai',
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habit-log-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getHeatColor = (rate: number, isFuture: boolean) => {
    if (isFuture) return 'bg-slate-50 border border-slate-100'
    if (rate === 0) return 'bg-slate-100'
    if (rate < 40) return 'bg-blue-200'
    if (rate < 70) return 'bg-blue-400'
    if (rate < 90) return 'bg-blue-600'
    return 'bg-indigo-700'
  }

  // First day of month (0=Sun, 1=Mon, ...)
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay()
  // Adjust to Mon-start: Mon=0, Tue=1, ..., Sun=6
  const offset = (firstDayOfWeek + 6) % 7

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Pencapaian bulanan</p>
          </div>
          {/* Month Picker */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2">
            <button
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              className="text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5 min-w-[120px] justify-center">
              <Calendar size={14} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-800">
                {MONTH_SHORT[selectedMonth]} {selectedYear}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className="text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-5 space-y-5">

        {/* Month Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h2>
          <div className="flex items-center gap-2">
            {selectedYear === now.getFullYear() && selectedMonth === now.getMonth() && (
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Bulan ini</span>
            )}
            <button
              onClick={exportMonthCSV}
              disabled={habits.length === 0}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
            <BarChart3 className="mb-2" size={20} />
            <p className="text-3xl font-bold">{monthRate}%</p>
            <p className="text-white/80 text-xs mt-0.5">Completion Rate</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200">
            <Trophy className="mb-2" size={20} />
            <p className="text-3xl font-bold">{perfectDays}</p>
            <p className="text-white/80 text-xs mt-0.5">Hari Sempurna 🎯</p>
          </div>
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-amber-200">
            <Flame className="mb-2 fill-white" size={20} />
            <p className="text-3xl font-bold">{streak}</p>
            <p className="text-white/80 text-xs mt-0.5">Day Streak</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-slate-400 text-xs mb-2">Hari Terbaik</p>
            {bestDay.rate > 0 ? (
              <>
                <p className="text-2xl font-bold text-slate-800">{bestDay.rate}%</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {bestDay.date ? new Date(bestDay.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                </p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            Kalender {MONTH_SHORT[selectedMonth]}
          </h2>
          {habits.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Belum ada habit</p>
          ) : (
            <>
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {heatmapData.map((d) => (
                  <div
                    key={d.date}
                    title={d.isFuture ? d.date : `${d.date}: ${d.rate}%`}
                    className={`aspect-square rounded-lg flex items-center justify-center relative group cursor-default ${getHeatColor(d.rate, d.isFuture)}`}
                  >
                    <span className={`text-[10px] font-bold ${
                      d.isFuture ? 'text-slate-300' :
                      d.rate >= 70 ? 'text-white' : 'text-slate-500'
                    }`}>
                      {d.day}
                    </span>
                    {/* Tooltip */}
                    {!d.isFuture && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {d.rate}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className="text-slate-400 text-xs">0%</span>
                {['bg-slate-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-indigo-700'].map(c => (
                  <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span className="text-slate-400 text-xs">100%</span>
              </div>
            </>
          )}
        </div>

        {/* 12-Month Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            Tren 12 Bulan
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload, index }: any) => {
                    const isSelected = monthlyTrend[index]?.isSelected
                    return (
                      <text x={x} y={y + 12} textAnchor="middle" fill={isSelected ? '#2563eb' : '#94a3b8'} fontSize={isSelected ? 13 : 11} fontWeight={isSelected ? 'bold' : 'normal'}>
                        {payload.value}
                      </text>
                    )
                  }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Completion']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#trendGrad)" dot={(props: any) => {
                  const { cx, cy, index } = props
                  const isSelected = monthlyTrend[index]?.isSelected
                  if (!isSelected) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#3b82f6" />
                  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={6} fill="#2563eb" stroke="white" strokeWidth={2} />
                }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4">
              Per Pilar — {MONTH_SHORT[selectedMonth]} {selectedYear}
            </h2>
            <div className="space-y-3">
              {categoryStats.map((cat: any) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${categoryBg[cat.name]}`} />
                      <span className="text-slate-600 text-sm font-medium">{cat.name}</span>
                      <span className="text-slate-400 text-xs">({cat.habitCount} habit)</span>
                    </div>
                    <span className="text-slate-800 text-sm font-bold">{cat.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${cat.rate}%`, backgroundColor: categoryColor[cat.name] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Habit Breakdown */}
        {habitStats.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4">
              Per Habit — {MONTH_SHORT[selectedMonth]} {selectedYear}
            </h2>
            <div className="space-y-2">
              {habitStats.map((habit: any) => (
                <div key={habit.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-700 text-xs font-semibold truncate">{habit.title}</p>
                      <span className={`text-xs font-bold ml-2 flex-shrink-0 ${
                        habit.rate >= 80 ? 'text-emerald-600' :
                        habit.rate >= 50 ? 'text-amber-600' : 'text-red-400'
                      }`}>
                        {habit.completedDays}/{pastDaysInMonth}d · {habit.rate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          habit.rate >= 80 ? 'bg-emerald-500' :
                          habit.rate >= 50 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${habit.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sprint History */}
        {completedSprints.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h2 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Riwayat Sprint
            </h2>
            <div className="space-y-3">
              {completedSprints.map(sprint => (
                <div key={sprint.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-slate-600 text-xs font-medium">
                      {new Date(sprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} —{' '}
                      {new Date(sprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${(sprint.completion_rate || 0) >= 80 ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{ width: `${sprint.completion_rate || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${(sprint.completion_rate || 0) >= 80 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {sprint.completion_rate || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
