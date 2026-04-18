'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { HABIT_CATEGORIES, HABIT_TEMPLATES } from '@/constants/habits'
import { Flame, Heart, Brain, Dumbbell, Home, Users, TrendingUp } from 'lucide-react'

type Template = 'general' | 'muslim' | 'custom'
type Step = 1 | 2 | 3 | 4

interface SelectedHabit {
  category_id: number
  title: string
  frequency: 'daily' | 'weekly'
}

const categoryIcons: Record<string, React.ReactNode> = {
  Soulset: <Heart size={16} />,
  Mindset: <Brain size={16} />,
  Healthset: <Dumbbell size={16} />,
  Familyset: <Home size={16} />,
  Socialset: <Users size={16} />,
  Wealthset: <TrendingUp size={16} />,
}

const categoryBg: Record<string, string> = {
  Soulset: 'bg-rose-500',
  Mindset: 'bg-indigo-500',
  Healthset: 'bg-emerald-500',
  Familyset: 'bg-orange-500',
  Socialset: 'bg-sky-500',
  Wealthset: 'bg-amber-500',
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [template, setTemplate] = useState<Template>('general')
  const [selectedHabits, setSelectedHabits] = useState<SelectedHabit[]>([])
  const [reward, setReward] = useState('')
  const [punishment, setPunishment] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const getTemplateHabits = () => {
    const habits: SelectedHabit[] = []
    const general = HABIT_TEMPLATES.general
    HABIT_CATEGORIES.forEach((cat) => {
      const key = cat.name.toLowerCase().replace('set', 'set') as keyof typeof general
      const catHabits = general[key] || []
      catHabits.forEach((title) => {
        habits.push({ category_id: cat.id, title, frequency: 'daily' })
      })
    })
    if (template === 'muslim') {
      const muslimHabits = HABIT_TEMPLATES.muslim
      Object.entries(muslimHabits).forEach(([catKey, titles]) => {
        const cat = HABIT_CATEGORIES.find(c =>
          c.name.toLowerCase() === catKey + 'set' || c.name.toLowerCase() === catKey
        )
        if (cat) {
          titles.forEach((title) => {
            habits.push({ category_id: cat.id, title, frequency: 'daily' })
          })
        }
      })
    }
    return habits
  }

  const toggleHabit = (habit: SelectedHabit) => {
    const exists = selectedHabits.find(h => h.title === habit.title && h.category_id === habit.category_id)
    if (exists) {
      setSelectedHabits(selectedHabits.filter(h => !(h.title === habit.title && h.category_id === habit.category_id)))
    } else {
      setSelectedHabits([...selectedHabits, habit])
    }
  }

  const isSelected = (habit: SelectedHabit) =>
    selectedHabits.some(h => h.title === habit.title && h.category_id === habit.category_id)

  const handleFinish = async () => {
    if (selectedHabits.length === 0 && template !== 'custom') return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (selectedHabits.length > 0) {
      await supabase.from('habits').insert(
        selectedHabits.map(h => ({
          user_id: user.id,
          category_id: h.category_id,
          title: h.title,
          frequency: h.frequency,
        }))
      )
    }

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 6)

    const { data: sprint } = await supabase.from('sprints').insert({
      user_id: user.id,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      duration_days: 7,
      status: 'active',
      reward,
      punishment,
    }).select().single()

    if (sprint && selectedHabits.length > 0) {
      const { data: habits } = await supabase.from('habits').select('id').eq('user_id', user.id)
      if (habits) {
        await supabase.from('sprint_habits').insert(
          habits.map(h => ({ sprint_id: sprint.id, habit_id: h.id, is_locked: true }))
        )
      }
    }

    await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-3 shadow-lg shadow-blue-200">
            <Flame className="text-white fill-white" size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sprint Tracker <span className="text-blue-600">2.0</span>
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          {/* Step 1: Filosofi */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🚀</div>
                <h2 className="text-xl font-bold text-slate-800">Selamat datang!</h2>
                <p className="text-slate-500 text-sm mt-1">Tiga filosofi untuk hidup yang lebih baik</p>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { icon: '🇯🇵', title: 'Kaizen', desc: '1% better every day — perbaikan kecil yang konsisten lebih powerful dari perubahan besar yang sporadis.' },
                  { icon: '📚', title: '6 Sets Framework', desc: 'Berkembang di 6 pilar: Jiwa, Pikiran, Tubuh, Keluarga, Sosial, dan Finansial.' },
                  { icon: '⚡', title: 'Sprint Scrum', desc: 'Komitmen mingguan dengan reward & punishment yang kamu tentukan sendiri.' },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="text-slate-800 font-semibold text-sm">{item.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Mulai Setup →
              </button>
            </div>
          )}

          {/* Step 2: Template */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Pilih template habit</h2>
              <p className="text-slate-500 text-sm mb-5">Bisa dikustomisasi nanti.</p>
              <div className="space-y-3 mb-6">
                {[
                  { value: 'general', icon: '🌍', title: 'General', desc: 'Meditasi, journaling, olahraga, dan habit universal lainnya.' },
                  { value: 'muslim', icon: '🕌', title: 'Muslim Pack', desc: 'Semua habit general + Tahajud, Al-Quran, Dzikir, dan Sedekah.' },
                  { value: 'custom', icon: '✏️', title: 'Custom', desc: 'Mulai dari kosong, isi sendiri sesuai kebutuhanmu.' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTemplate(t.value as Template)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      template === t.value
                        ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <p className="text-slate-800 font-semibold text-sm">{t.title}</p>
                      <p className="text-slate-500 text-xs">{t.desc}</p>
                    </div>
                    {template === t.value && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl transition-colors">
                  ← Kembali
                </button>
                <button
                  onClick={() => {
                    if (template !== 'custom') setSelectedHabits(getTemplateHabits())
                    setStep(3)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Pilih Habit */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Pilih habit pertamamu</h2>
              <p className="text-slate-500 text-sm mb-5">{selectedHabits.length} habit dipilih</p>
              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
                {HABIT_CATEGORIES.map((cat) => {
                  const catHabits = template === 'custom' ? [] : getTemplateHabits().filter(h => h.category_id === cat.id)
                  if (catHabits.length === 0) return null
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded-lg ${categoryBg[cat.name]} text-white`}>
                          {categoryIcons[cat.name]}
                        </div>
                        <p className="text-slate-700 font-semibold text-sm">{cat.name}</p>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {catHabits.map((habit) => (
                          <button
                            key={habit.title}
                            onClick={() => toggleHabit(habit)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                              isSelected(habit)
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {isSelected(habit) ? '✓ ' : ''}{habit.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {template === 'custom' && (
                  <p className="text-slate-400 text-sm text-center py-4">Tambah habit custom setelah onboarding selesai.</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl transition-colors">
                  ← Kembali
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={selectedHabits.length === 0 && template !== 'custom'}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-40 hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Sprint Planning */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Sprint pertamamu</h2>
              <p className="text-slate-500 text-sm mb-5">7 hari dimulai hari ini. Tentukan komitmenmu.</p>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 mb-5 text-white">
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>📅</span>
                  <span>
                    {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} —{' '}
                    {new Date(Date.now() + 6 * 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-white font-bold mt-1">{selectedHabits.length} habit dikunci selama 7 hari</p>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">🎁 Reward jika berhasil (≥80%)</label>
                  <input
                    type="text"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    placeholder="Contoh: Beli sepatu baru, nonton film favorit..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">⚡ Punishment jika gagal</label>
                  <input
                    type="text"
                    value={punishment}
                    onChange={(e) => setPunishment(e.target.value)}
                    placeholder="Contoh: Tidak boleh main game 2 hari, donasi Rp50.000..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl transition-colors">
                  ← Kembali
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50 hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  {loading ? 'Menyimpan...' : '🚀 Mulai Sprint!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
