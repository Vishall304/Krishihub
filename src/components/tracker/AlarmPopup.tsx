/**
 * AlarmPopup.tsx
 * In-app modal shown when a reminder alarm triggers.
 * Shows reminder details, plays alarm, speaks reminder via TTS.
 * Provides a Stop Alarm button to cancel audio + TTS.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle } from 'lucide-react'
import { getCategoryMeta } from '../../lib/reminderUtils'
import type { ReminderRecord } from '../../types/models'

interface AlarmPopupProps {
  reminder: ReminderRecord | null
  onStop: () => void
  onMarkDone: (id: string) => void
}

export function AlarmPopup({ reminder, onStop, onMarkDone }: AlarmPopupProps) {
  if (!reminder) return null

  const meta = getCategoryMeta(reminder.type)

  const formattedDate = reminder.reminderDate
    ? new Date(`${reminder.reminderDate}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
      })
    : ''

  return (
    <AnimatePresence>
      <motion.div
        key="alarm-overlay"
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key="alarm-card"
          initial={{ y: 80, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md rounded-t-3xl border border-green-100 bg-white p-6 shadow-2xl sm:rounded-3xl"
          role="alertdialog"
          aria-modal="true"
          aria-label="Reminder alarm"
        >
          {/* Pulsing Bell Icon */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [-8, 8, -8, 8, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-900/20"
            >
              <Bell className="h-8 w-8 text-white" strokeWidth={2} />
            </motion.div>

            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              ⏰ Reminder Alert
            </p>
          </div>

          {/* Category Badge */}
          <div className="mb-4 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${meta.color} ${meta.border} ${meta.text}`}
            >
              <span>{meta.emoji}</span>
              {meta.label}
            </span>
          </div>

          {/* Title */}
          <h2 className="mb-1 text-center text-2xl font-black text-slate-900">
            {reminder.title}
          </h2>

          {/* Crop name */}
          {reminder.cropName && (
            <p className="mb-1 text-center text-base font-semibold text-green-700">
              🌱 {reminder.cropName}
            </p>
          )}

          {/* Time + Date */}
          <p className="mb-2 text-center text-sm text-slate-500">
            {formattedDate} · {reminder.reminderTime}
          </p>

          {/* Notes */}
          {reminder.notes && (
            <p className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600 ring-1 ring-slate-100">
              {reminder.notes}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={() => {
                onMarkDone(reminder.id)
                onStop()
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-900/20 transition hover:from-green-700 hover:to-emerald-700"
            >
              <CheckCircle className="h-5 w-5" strokeWidth={2} />
              Mark Done
            </motion.button>

            <motion.button
              type="button"
              onClick={onStop}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              <X className="h-5 w-5" strokeWidth={2} />
              Stop
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
