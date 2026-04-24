'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, CheckCircle2, BarChart3, Flame, User } from 'lucide-react'
import { Suspense } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, tab: null },
  { href: '/dashboard?tab=checkin', label: 'Check-in', icon: CheckCircle2, tab: 'checkin' },
  { href: '/sprint', label: 'Sprint', icon: Flame, tab: null },
  { href: '/analytics', label: 'Stats', icon: BarChart3, tab: null },
  { href: '/settings', label: 'Profil', icon: User, tab: null },
]

function NavContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  return (
    <div className="max-w-2xl mx-auto flex justify-around items-center">
      {navItems.map((item) => {
        let isActive = false
        if (item.tab === 'checkin') {
          isActive = pathname === '/dashboard' && currentTab === 'checkin'
        } else if (item.href === '/dashboard') {
          isActive = pathname === '/dashboard' && currentTab !== 'checkin'
        } else {
          isActive = pathname === item.href
        }

        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`flex flex-col items-center gap-1 transition-colors min-w-0 ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Suspense fallback={null}>
        <NavContent />
      </Suspense>
    </nav>
  )
}
