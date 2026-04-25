'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, FileText, LayoutDashboard } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: FileText },
  { href: '/dashboard', label: 'Back to App', icon: LayoutDashboard },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
