'use client'

import { ChartBar, Folder, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AppTab = 'aujourdhui' | 'gerer' | 'stats' | 'reglages'

const TABS: { id: AppTab; label: string; icon: typeof Zap }[] = [
  { id: 'aujourdhui', label: "Aujourd'hui", icon: Zap },
  { id: 'gerer', label: 'Gérer', icon: Folder },
  { id: 'stats', label: 'Stats', icon: ChartBar },
  { id: 'reglages', label: 'Réglages', icon: Settings },
]

interface BottomNavProps {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#161618] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                active ? 'text-[#E0532C]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
