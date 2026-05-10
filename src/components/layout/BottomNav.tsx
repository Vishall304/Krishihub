import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Camera, ClipboardList, Home, Sparkles, UserCircle } from 'lucide-react'
import type { TabId } from '../../types'
import type { AppLanguage } from '../../types/models'

type TabDef = {
  id: TabId
  Icon: LucideIcon
}

const leftTabs: TabDef[] = [
  { id: 'home', Icon: Home },
  { id: 'detect', Icon: Camera },
]

const rightTabs: TabDef[] = [
  { id: 'tracker', Icon: ClipboardList },
  { id: 'profile', Icon: UserCircle },
]

const labels: Record<AppLanguage, Record<TabId, string>> = {
  en: {
    home: 'Home',
    detect: 'Detect crop',
    ai: 'AI assistant',
    tracker: 'Activity tracker',
    profile: 'Profile',
  },
  hi: {
    home: 'होम',
    detect: 'फसल जांच',
    ai: 'AI सहायक',
    tracker: 'गतिविधि',
    profile: 'प्रोफाइल',
  },
  mr: {
    home: 'होम',
    detect: 'पीक तपासणी',
    ai: 'AI सहाय्यक',
    tracker: 'नोंदी',
    profile: 'प्रोफाइल',
  },
}

type Props = {
  active: TabId
  onChange: (id: TabId) => void
  lang?: AppLanguage
}

const iconTap = 'h-6 w-6 shrink-0 transition-colors duration-200'

function TabButton({
  tab,
  active,
  onChange,
  label,
}: {
  tab: TabDef
  active: TabId
  onChange: (id: TabId) => void
  label: string
}) {
  const isActive = active === tab.id
  const Icon = tab.Icon

  return (
    <button
      type="button"
      onClick={() => onChange(tab.id)}
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      data-testid={`nav-${tab.id}-btn`}
      className="group flex min-w-0 flex-1 flex-col items-center justify-end pb-2 pt-1 text-slate-500 transition active:scale-95 data-[active=true]:text-green-800"
      data-active={isActive}
    >
      <span
        className={[
          'inline-flex h-11 w-11 items-center justify-center rounded-2xl transition duration-200 ease-out',
          'hover:scale-105 hover:text-green-700',
          isActive
            ? 'bg-green-100 text-green-800 shadow-sm ring-1 ring-green-200/80'
            : 'bg-slate-100 text-slate-500 group-hover:bg-green-50',
        ].join(' ')}
      >
        <Icon className={iconTap} strokeWidth={isActive ? 2.25 : 2} aria-hidden />
      </span>
    </button>
  )
}

export function BottomNav({ active, onChange, lang = 'en' }: Props) {
  const aiActive = active === 'ai'
  const t = labels[lang] ?? labels.en

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-green-100 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_30px_rgba(22,163,74,0.08)] backdrop-blur-md"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1">
        {leftTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active}
            onChange={onChange}
            label={t[tab.id]}
          />
        ))}

        <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center pb-2">
          <motion.button
            type="button"
            onClick={() => onChange('ai')}
            title={t.ai}
            aria-label={t.ai}
            aria-current={aiActive ? 'page' : undefined}
            data-testid="nav-ai-btn"
            whileTap={{ scale: 0.94 }}
            className={[
              'absolute -top-9 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full text-white shadow-xl ring-4 transition duration-200 ease-out',
              'hover:scale-105 hover:ring-green-50',
              aiActive ? 'bg-green-600 ring-green-100' : 'bg-green-500 ring-white hover:bg-green-600',
            ].join(' ')}
          >
            <Sparkles className="h-7 w-7 drop-shadow" strokeWidth={2} aria-hidden />
          </motion.button>
          <span className="h-[11px]" aria-hidden />
        </div>

        {rightTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active}
            onChange={onChange}
            label={t[tab.id]}
          />
        ))}
      </div>
    </nav>
  )
}