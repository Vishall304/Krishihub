/**
 * ReminderCards.tsx
 * Premium reminder cards with:
 *  - Filter tabs: All / Today / Upcoming / Completed
 *  - Section headers: Today, Upcoming, Completed
 *  - Category badges
 *  - Always-visible action buttons (mobile-friendly)
 *  - Overdue indicator
 *  - Framer-motion stagger animations
 */
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Pencil, Trash2, Clock, AlertTriangle, BellOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReminderRecord } from '../../types/models'
import {
  filterReminders,
  getCategoryMeta,
  isReminderOverdue,
  type ReminderTab,
} from '../../lib/reminderUtils'

interface ReminderCardsProps {
  reminders: ReminderRecord[]
  loading: boolean
  onEdit: (reminder: ReminderRecord) => void
  onDelete: (id: string) => Promise<void> | void
  onMarkDone: (id: string) => Promise<void> | void
}

const TABS: { value: ReminderTab; label: string; emoji: string }[] = [
  { value: 'all',       label: 'All',       emoji: '🗂️' },
  { value: 'today',     label: 'Today',     emoji: '📌' },
  { value: 'upcoming',  label: 'Upcoming',  emoji: '📅' },
  { value: 'completed', label: 'Completed', emoji: '✅' },
]

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

const listVariants = {
  visible: { transition: { staggerChildren: 0.05 } },
}

export function ReminderCards({
  reminders,
  loading,
  onEdit,
  onDelete,
  onMarkDone,
}: ReminderCardsProps) {
  const [activeTab, setActiveTab] = useState<ReminderTab>('all')

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const filtered = useMemo(
    () => filterReminders(reminders, activeTab),
    [reminders, activeTab],
  )

  // Counts for tab badges
  const counts = useMemo(() => {
    const today = reminders.filter((r) => r.status === 'pending' && r.reminderDate === todayStr).length
    const upcoming = reminders.filter((r) => r.status === 'pending' && r.reminderDate > todayStr).length
    const completed = reminders.filter((r) => r.status === 'done').length
    return { all: reminders.length, today, upcoming, completed }
  }, [reminders, todayStr])

  // Group filtered reminders into sections (only relevant for 'all' tab)
  const sections = useMemo(() => {
    if (activeTab !== 'all') {
      return [{ label: null, items: filtered }]
    }
    const todayItems = filtered.filter((r) => r.status === 'pending' && r.reminderDate === todayStr)
    const upcomingItems = filtered.filter((r) => r.status === 'pending' && r.reminderDate > todayStr)
    const overdueItems = filtered.filter((r) => r.status === 'pending' && r.reminderDate < todayStr)
    const completedItems = filtered.filter((r) => r.status === 'done')
    return [
      { label: todayItems.length > 0 ? `📌 Today (${todayItems.length})` : null, items: todayItems },
      { label: overdueItems.length > 0 ? `⚠️ Overdue (${overdueItems.length})` : null, items: overdueItems },
      { label: upcomingItems.length > 0 ? `📅 Upcoming (${upcomingItems.length})` : null, items: upcomingItems },
      { label: completedItems.length > 0 ? `✅ Completed (${completedItems.length})` : null, items: completedItems },
    ].filter((s) => s.items.length > 0)
  }, [activeTab, filtered, todayStr])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
          <Clock className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Reminders</h3>
          <p className="text-xs text-slate-500">
            {reminders.length} total · {counts.today} today · {counts.upcoming} upcoming
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {TABS.map((tab) => {
          const count = counts[tab.value]
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-green-600 text-white shadow-md shadow-green-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 py-12 text-center"
        >
          <BellOff className="h-10 w-10 text-green-300" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-600">No reminders here yet</p>
          <p className="text-xs text-slate-400">
            {activeTab === 'today'
              ? 'No reminders scheduled for today'
              : activeTab === 'upcoming'
              ? 'No upcoming reminders'
              : activeTab === 'completed'
              ? 'No completed reminders'
              : 'Tap the + button to create a reminder'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.label ?? 'main'}>
              {section.label && (
                <h4 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {section.label}
                </h4>
              )}
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                <AnimatePresence initial={false}>
                  {section.items.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onMarkDone={onMarkDone}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Individual Card
// ---------------------------------------------------------------------------

interface ReminderCardProps {
  reminder: ReminderRecord
  onEdit: (reminder: ReminderRecord) => void
  onDelete: (id: string) => Promise<void> | void
  onMarkDone: (id: string) => Promise<void> | void
}

function ReminderCard({ reminder, onEdit, onDelete, onMarkDone }: ReminderCardProps) {
  const meta = getCategoryMeta(reminder.type)
  const overdue = isReminderOverdue(reminder)
  const isCompleted = reminder.status === 'done'

  const formattedDate = reminder.reminderDate
    ? new Date(`${reminder.reminderDate}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : ''

  const cardBg = isCompleted
    ? 'border-slate-200 bg-slate-50/80'
    : overdue
    ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
    : `${meta.border} ${meta.color}`

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`relative rounded-3xl border p-4 shadow-sm transition hover:shadow-md ${cardBg}`}
    >
      {/* Overdue badge */}
      {overdue && !isCompleted && (
        <div className="absolute -right-1.5 -top-1.5">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow"
          >
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Overdue
          </motion.div>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg ${meta.color} ${meta.border}`}
        >
          {meta.emoji}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4
                className={`font-bold leading-tight ${
                  isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                }`}
              >
                {reminder.title}
              </h4>
              {reminder.cropName && (
                <p className={`text-xs font-medium ${isCompleted ? 'text-slate-300' : 'text-green-700'}`}>
                  🌱 {reminder.cropName}
                </p>
              )}
            </div>

            {/* Repeat badge */}
            {reminder.repeat !== 'once' && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                {reminder.repeat}
              </span>
            )}
          </div>

          {/* Notes */}
          {reminder.notes && (
            <p className={`mt-1 text-sm leading-snug ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
              {reminder.notes}
            </p>
          )}

          {/* Date/Time row */}
          <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={`rounded-full px-2 py-0.5 font-medium ${meta.color} ${meta.text}`}>
              {meta.emoji} {meta.label}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              {formattedDate} · {reminder.reminderTime}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons — always visible (mobile-friendly) */}
      <div className="mt-3 flex gap-2">
        {!isCompleted && (
          <motion.button
            type="button"
            onClick={() => void onMarkDone(reminder.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-green-100 py-2 text-sm font-bold text-green-700 transition hover:bg-green-200"
            title="Mark as done"
          >
            <CheckCircle className="h-4 w-4" strokeWidth={2} />
            Done
          </motion.button>
        )}

        <motion.button
          type="button"
          onClick={() => onEdit(reminder)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          title="Edit"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => void onDelete(reminder.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-2.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  )
}
