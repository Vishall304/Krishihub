/**
 * ReminderHistory.tsx
 * Shows ONLY completed reminders + reminder-related activity history.
 * Clean card UI, no complex search.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, Trash2, History } from 'lucide-react'
import type { ActivityRecord, ReminderRecord } from '../../types/models'

interface ReminderHistoryProps {
  completedReminders: ReminderRecord[]
  activities: ActivityRecord[]
  onDeleteActivity: (id: string) => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  irrigation: '💧',
  fertilizer: '🌿',
  pesticide: '🛡️',
  harvest: '🌾',
  'disease check': '🔬',
  'market visit': '🏪',
  'weather check': '🌦️',
  other: '📝',
  'reminder completed': '✅',
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTimestamp(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReminderHistory({
  completedReminders,
  activities,
  onDeleteActivity,
}: ReminderHistoryProps) {
  // Only show reminder-related activities
  const reminderActivities = activities.filter(
    (a) => a.type === 'reminder completed' || a.title.startsWith('Completed:') || a.title.startsWith('Reminder completed:'),
  )

  const hasHistory = completedReminders.length > 0 || reminderActivities.length > 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
          <History className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Reminder History</h3>
          <p className="text-xs text-slate-500">
            {completedReminders.length} completed · {reminderActivities.length} activities
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!hasHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 py-10 text-center"
        >
          <CheckCircle className="h-10 w-10 text-green-300" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-600">No completed reminders yet</p>
          <p className="text-xs text-slate-400">
            Mark reminders as done to see your farming history here
          </p>
        </motion.div>
      )}

      {/* Completed reminders */}
      {completedReminders.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            ✅ Completed Reminders ({completedReminders.length})
          </p>
          <AnimatePresence initial={false}>
            {completedReminders.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
              >
                <span className="text-xl">{CATEGORY_EMOJI[r.type] ?? '📝'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-500 line-through">{r.title}</p>
                  {r.cropName && (
                    <p className="text-xs text-slate-400">🌱 {r.cropName}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" strokeWidth={2} />
                    {fmtDate(r.reminderDate)} · {r.reminderTime}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  Done ✓
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Activity log */}
      {reminderActivities.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            📋 Activity Log ({reminderActivities.length})
          </p>
          <AnimatePresence initial={false}>
            {reminderActivities.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="group flex items-start gap-3 rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-sm"
              >
                <span className="mt-0.5 text-xl">{CATEGORY_EMOJI[a.type] ?? '✅'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{a.title}</p>
                  {a.notes && (
                    <p className="mt-0.5 text-xs text-slate-500">{a.notes}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" strokeWidth={2} />
                    {fmtTimestamp(a.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteActivity(a.id)}
                  className="shrink-0 rounded-full p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Remove from history"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  )
}
