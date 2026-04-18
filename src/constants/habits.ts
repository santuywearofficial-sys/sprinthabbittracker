// Habit templates per pilar
export const HABIT_TEMPLATES = {
  general: {
    soulset: [
      'Meditasi 5 menit',
      'Journaling',
      'Gratitude practice',
    ],
    mindset: [
      'Baca buku 10 halaman',
      'Belajar skill baru 20 menit',
      'Dengarkan podcast edukatif',
    ],
    healthset: [
      'Olahraga 30 menit',
      'Minum 8 gelas air',
      'Tidur sebelum jam 23.00',
    ],
    familyset: [
      'Quality time keluarga',
      'Hubungi orang tua',
    ],
    socialset: [
      'Reach out 1 orang',
      'Ikut komunitas/diskusi',
    ],
    wealthset: [
      'Catat pengeluaran',
      'Deep work 2 jam tanpa distraksi',
    ],
  },
  muslim: {
    soulset: [
      'Tahajud',
      'Baca Al-Quran 1 halaman',
      'Dzikir pagi/sore',
    ],
    wealthset: [
      'Sedekah harian',
    ],
  },
} as const

export const HABIT_CATEGORIES = [
  { id: 1, name: 'Soulset', color: '#8B5CF6', icon: 'Heart' },
  { id: 2, name: 'Mindset', color: '#3B82F6', icon: 'Brain' },
  { id: 3, name: 'Healthset', color: '#10B981', icon: 'Dumbbell' },
  { id: 4, name: 'Familyset', color: '#F59E0B', icon: 'Home' },
  { id: 5, name: 'Socialset', color: '#EC4899', icon: 'Users' },
  { id: 6, name: 'Wealthset', color: '#6366F1', icon: 'TrendingUp' },
] as const

export const SPRINT_COMPLETION_THRESHOLD = 80 // 80% untuk reward berlaku
export const SPRINT_STREAK_THRESHOLD = 80 // 80% untuk streak dihitung
export const SPRINT_ADVANCED_UNLOCK = 2 // selesaikan 2 sprint untuk unlock 14 hari
