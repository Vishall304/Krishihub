import { Bell, Leaf } from 'lucide-react'
import type { AppLanguage } from '../../types/models'

type Props = {
  onBellClick?: () => void
  unreadCount?: number
  lang?: AppLanguage
}

const iconBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-full transition duration-200 ease-out hover:scale-105 active:scale-95'

const navText: Record<
  AppLanguage,
  {
    subtitle: string
    notifications: string
    notificationsUnread: (count: number) => string
  }
> = {
  en: {
    subtitle: 'Smart Farming Assistant',
    notifications: 'Notifications',
    notificationsUnread: (count) => `Notifications, ${count} unread`,
  },

  hi: {
    subtitle: 'स्मार्ट खेती सहायक',
    notifications: 'सूचनाएं',
    notificationsUnread: (count) => `${count} नई सूचनाएं`,
  },

  mr: {
    subtitle: 'स्मार्ट शेती सहाय्यक',
    notifications: 'सूचना',
    notificationsUnread: (count) => `${count} नवीन सूचना`,
  },
}

export function TopNav({
  onBellClick,
  unreadCount = 0,
  lang = 'en',
}: Props) {
  const t = navText[lang] ?? navText.en

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-green-100 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">

        <div className="flex items-center gap-2" data-testid="app-logo">
          <span className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-green-700 sm:text-xl">
            KrishiMitra

            <Leaf
              className="h-6 w-6 shrink-0 text-green-600 transition duration-200 ease-out hover:scale-105 hover:text-green-700 sm:h-7 sm:w-7"
              strokeWidth={2}
              aria-hidden
            />
          </span>

          <span className="hidden text-sm font-medium text-slate-500 sm:inline">
            · {t.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBellClick}
            title={
              unreadCount > 0
                ? t.notificationsUnread(unreadCount)
                : t.notifications
            }
            aria-label={
              unreadCount > 0
                ? t.notificationsUnread(unreadCount)
                : t.notifications
            }
            data-testid="topnav-bell-btn"
            className={`relative ${iconBtn} bg-green-50 text-green-800 hover:bg-green-100 hover:text-green-900`}
          >
            <Bell className="h-6 w-6" strokeWidth={2} aria-hidden />

            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                data-testid="topnav-bell-badge"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}