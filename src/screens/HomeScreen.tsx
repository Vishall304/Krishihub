import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bolt,
  Bookmark,
  Bug,
  Building2,
  CalendarDays,
  Camera,
  CloudRain,
  Droplet,
  Heart,
  Lightbulb,
  MessageCircle,
  Newspaper,
  Send as SendIcon,
  Sparkles,
  Sprout,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { feedItems } from '../data/dummy'
import type { FeedItem, FeedItemKind } from '../data/dummy'
import type { TabId } from '../types'
import type { AppLanguage } from '../types/models'

const iconMap: Record<FeedItem['IconKey'], LucideIcon> = {
  newspaper: Newspaper,
  buildingLibrary: Building2,
  lightBulb: Lightbulb,
  trendingUp: TrendingUp,
  cloudRain: CloudRain,
  droplet: Droplet,
  sprout: Sprout,
  bug: Bug,
  users: Users,
  stethoscope: Stethoscope,
}

const kindBadgeTint: Record<FeedItemKind, string> = {
  news: 'bg-teal-50 text-teal-700 ring-teal-100',
  scheme: 'bg-violet-50 text-violet-700 ring-violet-100',
  tips: 'bg-green-50 text-green-700 ring-green-100',
  market: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  weather: 'bg-sky-50 text-sky-700 ring-sky-100',
  irrigation: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  fertilizer: 'bg-lime-50 text-lime-800 ring-lime-100',
  pest: 'bg-amber-50 text-amber-800 ring-amber-100',
  community: 'bg-rose-50 text-rose-700 ring-rose-100',
  disease: 'bg-red-50 text-red-700 ring-red-100',
}

type Filter = 'all' | FeedItemKind

const filterKeys: Filter[] = [
  'all',
  'community',
  'weather',
  'market',
  'scheme',
  'tips',
  'news',
  'fertilizer',
  'irrigation',
  'pest',
  'disease',
]

const text = {
  en: {
    welcome: 'Welcome back',
    dashboard: 'Your farm dashboard',
    season: 'Season: Kharif',
    kisanFeed: 'Kisan feed',
    post: 'post',
    posts: 'posts',
    noPosts: 'No posts in this category yet.',
    askAI: 'Ask AI',
    quick: {
      detect: 'Detect crop',
      detectTip: 'Detect crop — photo-based crop check',
      ai: 'Ask AI',
      aiTip: 'Ask AI — chat or speak in your language',
      reminder: 'Reminder',
      reminderTip: 'Set reminder — irrigation and field tasks',
    },
    filters: {
      all: 'All',
      community: 'Community',
      weather: 'Weather',
      market: 'Market',
      scheme: 'Schemes',
      tips: 'Tips',
      news: 'News',
      fertilizer: 'Fertiliser',
      irrigation: 'Irrigation',
      pest: 'Pest',
      disease: 'Disease',
    },
    kinds: {
      news: 'Farming news',
      scheme: 'Govt scheme',
      tips: 'Tip',
      market: 'Market price',
      weather: 'Weather alert',
      irrigation: 'Irrigation',
      fertilizer: 'Fertiliser',
      pest: 'Pest advisory',
      community: 'Community',
      disease: 'Disease watch',
    },
  },
  hi: {
    welcome: 'वापसी पर स्वागत है',
    dashboard: 'आपका खेती डैशबोर्ड',
    season: 'मौसम: खरीफ',
    kisanFeed: 'किसान फीड',
    post: 'पोस्ट',
    posts: 'पोस्ट',
    noPosts: 'इस श्रेणी में अभी कोई पोस्ट नहीं है।',
    askAI: 'AI से पूछें',
    quick: {
      detect: 'फसल जांच',
      detectTip: 'फसल जांच — फोटो से फसल की जांच',
      ai: 'AI से पूछें',
      aiTip: 'AI से पूछें — अपनी भाषा में बोलकर या लिखकर',
      reminder: 'रिमाइंडर',
      reminderTip: 'रिमाइंडर सेट करें — सिंचाई और खेत के काम',
    },
    filters: {
      all: 'सभी',
      community: 'समुदाय',
      weather: 'मौसम',
      market: 'बाजार',
      scheme: 'योजनाएं',
      tips: 'सुझाव',
      news: 'समाचार',
      fertilizer: 'खाद',
      irrigation: 'सिंचाई',
      pest: 'कीट',
      disease: 'रोग',
    },
    kinds: {
      news: 'खेती समाचार',
      scheme: 'सरकारी योजना',
      tips: 'सुझाव',
      market: 'बाजार भाव',
      weather: 'मौसम अलर्ट',
      irrigation: 'सिंचाई',
      fertilizer: 'खाद',
      pest: 'कीट सलाह',
      community: 'समुदाय',
      disease: 'रोग जानकारी',
    },
  },
  mr: {
    welcome: 'पुन्हा स्वागत आहे',
    dashboard: 'तुमचा शेती डॅशबोर्ड',
    season: 'हंगाम: खरीप',
    kisanFeed: 'शेतकरी फीड',
    post: 'पोस्ट',
    posts: 'पोस्ट',
    noPosts: 'या प्रकारात अजून कोणतीही पोस्ट नाही.',
    askAI: 'AI ला विचारा',
    quick: {
      detect: 'पीक तपासणी',
      detectTip: 'पीक तपासणी — फोटोवरून पीक तपासा',
      ai: 'AI ला विचारा',
      aiTip: 'AI ला विचारा — तुमच्या भाषेत बोला किंवा लिहा',
      reminder: 'स्मरणपत्र',
      reminderTip: 'स्मरणपत्र सेट करा — सिंचन आणि शेतातील कामे',
    },
    filters: {
      all: 'सर्व',
      community: 'समुदाय',
      weather: 'हवामान',
      market: 'बाजार',
      scheme: 'योजना',
      tips: 'टिप्स',
      news: 'बातम्या',
      fertilizer: 'खत',
      irrigation: 'सिंचन',
      pest: 'कीड',
      disease: 'रोग',
    },
    kinds: {
      news: 'शेती बातम्या',
      scheme: 'सरकारी योजना',
      tips: 'टिप',
      market: 'बाजार भाव',
      weather: 'हवामान सूचना',
      irrigation: 'सिंचन',
      fertilizer: 'खत',
      pest: 'कीड सल्ला',
      community: 'समुदाय',
      disease: 'रोग माहिती',
    },
  },
} satisfies Record<AppLanguage, unknown>

type Props = {
  onNavigate: (tab: TabId) => void
  lang?: AppLanguage
}

function getT(lang?: AppLanguage) {
  return text[lang ?? 'en'] ?? text.en
}

function FeedCard({
  item,
  index,
  lang,
}: {
  item: FeedItem
  index: number
  lang: AppLanguage
}) {
  const Icon = iconMap[item.IconKey]
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const t = getT(lang)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.04 }}
      className="overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`feed-card-${item.id}`}
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-bold text-white ring-2 ring-white">
          {item.authorInitials}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-slate-900">{item.author}</p>
          <p className="truncate text-xs text-slate-500">
            {item.authorHandle} · {item.timeAgo}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${kindBadgeTint[item.kind]}`}
        >
          {t.kinds[item.kind]}
        </span>
      </header>

      <div
        className={`relative mx-4 mt-3 flex aspect-[5/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} text-white`}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
        <Icon className="relative h-20 w-20 drop-shadow-lg" strokeWidth={1.6} />

        {item.meta && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {item.meta}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 pt-3">
        <h4 className="text-[15px] font-bold leading-snug text-slate-900">{item.title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
      </div>

      <footer className="flex items-center gap-1 border-t border-green-50 px-3 py-2">
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Unlike post' : 'Like post'}
          data-testid={`feed-like-${item.id}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition duration-200 ease-out hover:scale-105 ${
            liked ? 'text-rose-600' : 'text-slate-600 hover:text-rose-500'
          }`}
        >
          <Heart
            className="h-5 w-5"
            strokeWidth={liked ? 0 : 2}
            fill={liked ? 'currentColor' : 'none'}
            aria-hidden
          />
          <span>{item.likes + (liked ? 1 : 0)}</span>
        </button>

        <button
          type="button"
          aria-label="Comments"
          data-testid={`feed-comments-${item.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition duration-200 ease-out hover:scale-105 hover:text-green-700"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
          <span>{item.comments}</span>
        </button>

        <button
          type="button"
          aria-label="Share"
          data-testid={`feed-share-${item.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition duration-200 ease-out hover:scale-105 hover:text-green-700"
        >
          <SendIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-label={saved ? 'Remove bookmark' : 'Save post'}
          data-testid={`feed-save-${item.id}`}
          className={`ml-auto inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition duration-200 ease-out hover:scale-105 ${
            saved ? 'text-green-700' : 'text-slate-600 hover:text-green-700'
          }`}
        >
          <Bookmark
            className="h-5 w-5"
            strokeWidth={saved ? 0 : 2}
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden
          />
        </button>
      </footer>
    </motion.article>
  )
}

export function HomeScreen({ onNavigate, lang = 'en' }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const t = getT(lang)

  const quickActions = [
    {
      key: 'detect',
      label: t.quick.detect,
      tooltip: t.quick.detectTip,
      Icon: Camera,
      tab: 'detect' as TabId,
      gradient: 'from-green-600 to-emerald-600',
    },
    {
      key: 'ai',
      label: t.quick.ai,
      tooltip: t.quick.aiTip,
      Icon: Sparkles,
      tab: 'ai' as TabId,
      gradient: 'from-emerald-600 to-green-700',
    },
    {
      key: 'reminder',
      label: t.quick.reminder,
      tooltip: t.quick.reminderTip,
      Icon: CalendarDays,
      tab: 'tracker' as TabId,
      gradient: 'from-green-700 to-green-600',
    },
  ]

  const visibleItems = useMemo(
    () => (filter === 'all' ? feedItems : feedItems.filter((i) => i.kind === filter)),
    [filter],
  )

  return (
    <div className="space-y-6 pb-28">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 px-1">
          <div>
            <p className="text-sm font-medium text-green-800">{t.welcome}</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.dashboard}</h2>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {t.season}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.Icon

            return (
              <motion.button
                key={action.key}
                type="button"
                title={action.tooltip}
                aria-label={action.tooltip}
                data-testid={`quick-${action.key}-btn`}
                onClick={() => onNavigate(action.tab)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.985 }}
                className={`group flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br ${action.gradient} p-4 text-white shadow-lg shadow-green-900/15 ring-1 ring-white/20 transition duration-200 ease-out hover:brightness-110`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </span>
                <span className="text-xs font-semibold">{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Bolt className="h-5 w-5 text-green-600" strokeWidth={2} aria-hidden />
          <h3 className="text-lg font-bold text-slate-900">{t.kisanFeed}</h3>

          <span className="ml-auto text-xs font-medium text-slate-500">
            {visibleItems.length} {visibleItems.length === 1 ? t.post : t.posts}
          </span>
        </div>

        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]"
          style={{ scrollbarWidth: 'none' }}
          data-testid="feed-filters"
        >
          {filterKeys.map((key) => {
            const active = filter === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                data-testid={`feed-filter-${key}`}
                className={[
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition duration-200 ease-out',
                  active
                    ? 'bg-green-600 text-white shadow-sm ring-1 ring-green-700'
                    : 'bg-white text-slate-600 ring-1 ring-green-100 hover:scale-[1.02] hover:bg-green-50 hover:text-green-800',
                ].join(' ')}
              >
                {t.filters[key]}
              </button>
            )
          })}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-green-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">{t.noPosts}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="feed-list">
            {visibleItems.map((item, i) => (
              <FeedCard key={item.id} item={item} index={i} lang={lang} />
            ))}
          </div>
        )}
      </section>

      <motion.button
        type="button"
        onClick={() => onNavigate('ai')}
        title={t.askAI}
        aria-label={t.askAI}
        data-testid="home-ask-ai-fab"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.06 }}
        className="fixed bottom-24 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-xl shadow-green-900/25 ring-2 ring-green-100 transition-colors duration-200 ease-out hover:bg-green-700 hover:ring-green-200"
      >
        <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden />
      </motion.button>
    </div>
  )
}