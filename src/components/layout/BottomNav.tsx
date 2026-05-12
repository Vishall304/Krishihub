import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

import {
  Camera,
  ClipboardList,
  Home,
  Sparkles,
  UserCircle,
} from 'lucide-react'

import type { TabId } from '../../types'

type Language = 'en' | 'hi' | 'mr'

type TabDef = {
  id: TabId
  label: Record<Language, string>
  Icon: LucideIcon
}

const leftTabs: TabDef[] = [
  {
    id: 'home',
    label: {
      en: 'Home',
      hi: 'होम',
      mr: 'मुख्य',
    },
    Icon: Home,
  },

  {
    id: 'detect',
    label: {
      en: 'Detect',
      hi: 'डिटेक्ट',
      mr: 'तपासा',
    },
    Icon: Camera,
  },
]

const rightTabs: TabDef[] = [
  {
    id: 'tracker',
    label: {
      en: 'Tracker',
      hi: 'ट्रैकर',
      mr: 'ट्रॅकर',
    },
    Icon: ClipboardList,
  },

  {
    id: 'profile',
    label: {
      en: 'Profile',
      hi: 'प्रोफाइल',
      mr: 'प्रोफाइल',
    },
    Icon: UserCircle,
  },
]

type Props = {
  active: TabId
  onChange: (id: TabId) => void
  lang?: Language
}

const iconTap =
  'h-6 w-6 shrink-0 transition-colors duration-200'

function TabButton({
  tab,
  active,
  onChange,
  lang = 'en',
}: {
  tab: TabDef
  active: TabId
  onChange: (id: TabId) => void
  lang?: Language
}) {
  const isActive = active === tab.id

  const Icon = tab.Icon

  return (
    <button
      type="button"
      onClick={() => onChange(tab.id)}
      title={tab.label[lang]}
      aria-label={tab.label[lang]}
      aria-current={isActive ? 'page' : undefined}
      className="group flex min-w-0 flex-1 flex-col items-center justify-end pb-2 pt-1 text-slate-500 transition active:scale-95"
    >
      <span
        className={[
          'inline-flex h-11 w-11 items-center justify-center rounded-2xl transition duration-200 ease-out',

          isActive
            ? 'bg-green-100 text-green-800 shadow-sm ring-1 ring-green-200/80'
            : 'bg-slate-100 text-slate-500 group-hover:bg-green-50',
        ].join(' ')}
      >
        <Icon
          className={iconTap}
          strokeWidth={isActive ? 2.25 : 2}
        />
      </span>

      <span
        className={`mt-1 text-[11px] font-semibold ${
          isActive
            ? 'text-green-800'
            : 'text-slate-500'
        }`}
      >
        {tab.label[lang]}
      </span>
    </button>
  )
}

export function BottomNav({
  active,
  onChange,
  lang = 'en',
}: Props) {
  const aiActive = active === 'ai'

  const aiLabel =
    lang === 'hi'
      ? 'एआई'
      : lang === 'mr'
        ? 'एआय'
        : 'AI'

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
            lang={lang}
          />
        ))}

        <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center pb-2">

          <motion.button
            type="button"
            onClick={() => onChange('ai')}
            whileTap={{ scale: 0.94 }}
            className={[
              'absolute -top-9 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full text-white shadow-xl ring-4 transition duration-200 ease-out',

              aiActive
                ? 'bg-green-600 ring-green-100'
                : 'bg-green-500 ring-white hover:bg-green-600',
            ].join(' ')}
          >
            <Sparkles className="h-7 w-7" />
          </motion.button>

          <span className="mt-8 text-[11px] font-semibold text-green-800">
            {aiLabel}
          </span>
        </div>

        {rightTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active}
            onChange={onChange}
            lang={lang}
          />
        ))}
      </div>
    </nav>
  )
}