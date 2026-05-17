/**
 * TrackerScreen.tsx
 * Stable, production-ready KrishiMitra farming tracker.
 *
 * KEY FIXES in this version:
 *  1. Reminders and activities load correctly (no composite-index error)
 *  2. Optimistic updates — reminder appears immediately on add (before Firestore confirms)
 *  3. Alarm uses a stable ref — not re-created on every reminders state change
 *  4. Activity section simplified — shows only completed reminder history
 *  5. Notification permission requested on mount
 *  6. All intervals/timeouts cleaned up properly
 */
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, PlusCircle, TrendingUp, X, Bell, BellOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  addActivity,
  deleteActivity,
  fetchActivitiesForUser,
} from '../services/activityService'
import {
  addReminder,
  deleteReminder,
  fetchRemindersForUser,
  updateReminder,
} from '../services/reminderService'
import { formatFirestoreError } from '../lib/firestoreErrors'
import { normaliseLang } from '../services/aiService'
import type { ActivityRecord, ReminderRecord, ReminderCategory, ReminderRepeat } from '../types/models'
import { PremiumReminderModal, type ReminderFormData } from '../components/tracker/PremiumReminderModal'
import { ReminderCards } from '../components/tracker/ReminderCards'
import { ReminderHistory } from '../components/tracker/ReminderHistory'
import { ReminderGraph } from '../components/tracker/ReminderGraph'
import { AlarmPopup } from '../components/tracker/AlarmPopup'
import {
  buildVoiceMessage,
  playAlarmBeep,
  stopAlarm,
  isReminderDueNow,
  parseNaturalReminder,
} from '../lib/reminderUtils'
import {
  canNotify,
  notificationPermission,
  requestNotificationPermission,
  sendNotification,
} from '../lib/notificationService'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOICE_LANG_MAP: Record<'en' | 'hi' | 'mr', string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}
const ALARM_CHECK_MS = 30_000

function formatToday(): string {
  return new Date().toISOString().slice(0, 10)
}

const defaultReminderForm = (): ReminderFormData => ({
  title: '',
  cropName: '',
  notes: '',
  reminderDate: formatToday(),
  reminderTime: '09:00',
  repeat: 'once' as ReminderRepeat,
  type: 'irrigation' as ReminderCategory,
  status: 'pending',
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrackerScreen() {
  const { user, profile } = useAuth()
  const langCode = normaliseLang(profile?.preferredLanguage) as 'en' | 'hi' | 'mr'

  // ── Data ──────────────────────────────────────────────────────────────────
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [openReminderModal, setOpenReminderModal] = useState(false)
  const [editReminder, setEditReminder] = useState<ReminderRecord | null>(null)
  const [reminderForm, setReminderForm] = useState<ReminderFormData>(defaultReminderForm())

  // ── Alarm ─────────────────────────────────────────────────────────────────
  // Store reminders in a ref so the alarm interval doesn't need it in deps
  const remindersRef = useRef<ReminderRecord[]>([])
  const triggeredIdsRef = useRef<Set<string>>(new Set())
  const [alarmReminder, setAlarmReminder] = useState<ReminderRecord | null>(null)
  const stopAlarmFnRef = useRef<(() => void) | null>(null)
  const langCodeRef = useRef(langCode)

  // Keep refs in sync
  useEffect(() => { remindersRef.current = reminders }, [reminders])
  useEffect(() => { langCodeRef.current = langCode }, [langCode])

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState<string>(() => notificationPermission())

  // -------------------------------------------------------------------------
  // Request notification permission on mount (silently)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (notifPermission === 'default') {
      void requestNotificationPermission().then((r) => setNotifPermission(r))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [a, r] = await Promise.all([
        fetchActivitiesForUser(user.uid),
        fetchRemindersForUser(user.uid),
      ])
      setActivities(a)
      setReminders(r)
    } catch (e) {
      if (import.meta.env.DEV) console.error('[TrackerScreen] refresh failed', e)
      setError(formatFirestoreError(e, 'load data'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  // -------------------------------------------------------------------------
  // Stable alarm interval — uses refs, NOT state in deps
  // -------------------------------------------------------------------------
  useEffect(() => {
    const checkDue = () => {
      const lang = langCodeRef.current
      const due = remindersRef.current.filter(
        (r) => isReminderDueNow(r) && !triggeredIdsRef.current.has(r.id),
      )
      if (due.length === 0) return

      const first = due[0]!
      due.forEach((r) => triggeredIdsRef.current.add(r.id))

      // Play beep alarm
      const stopFn = playAlarmBeep()
      stopAlarmFnRef.current = stopFn

      // Browser notification
      sendNotification(
        '⏰ KrishiMitra Reminder',
        buildVoiceMessage(first, lang),
        { tag: first.id },
      )

      // Voice TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const msg = buildVoiceMessage(first, lang)
        const utterance = new SpeechSynthesisUtterance(msg)
        utterance.lang = VOICE_LANG_MAP[lang]
        utterance.rate = lang === 'mr' ? 0.72 : lang === 'hi' ? 0.76 : 0.86
        utterance.pitch = 1.05
        window.speechSynthesis.speak(utterance)
      }

      setAlarmReminder(first)
    }

    // Check immediately, then every 30s
    checkDue()
    const id = window.setInterval(checkDue, ALARM_CHECK_MS)
    return () => window.clearInterval(id)
  }, []) // stable — uses refs only

  // -------------------------------------------------------------------------
  // Stop alarm
  // -------------------------------------------------------------------------
  const stopActiveAlarm = useCallback(() => {
    stopAlarmFnRef.current?.()
    stopAlarmFnRef.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setAlarmReminder(null)
    stopAlarm()
  }, [])

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      stopAlarm()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  // -------------------------------------------------------------------------
  // Notifications button
  // -------------------------------------------------------------------------
  const handleEnableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
  }, [])

  // -------------------------------------------------------------------------
  // Reminder actions
  // -------------------------------------------------------------------------
  const saveReminder = useCallback(async () => {
    if (!user) return
    setIsSaving(true)
    setError(null)

    let { title, cropName, notes, reminderDate, reminderTime, repeat, type, status } = reminderForm
    title = title.trim()
    cropName = cropName.trim()
    notes = notes.trim()

    if (!editReminder && !title) {
      setError('Please enter a reminder title.')
      setIsSaving(false)
      return
    }

    // Natural language parsing
    if (
      !editReminder &&
      !notes &&
      /tomorrow|today|watering|water|spray|fertilizer|harvest|soil|test|morning|evening|afternoon|night/i.test(title)
    ) {
      const parsed = parseNaturalReminder(title)
      title = parsed.title
      notes = parsed.notes
      if (reminderDate === formatToday()) reminderDate = parsed.reminderDate
      if (reminderTime === '09:00') reminderTime = parsed.reminderTime
      if (type === 'other' || type === 'irrigation') type = parsed.type
    }

    // ── Optimistic: immediately show the new reminder in the list ──────────
    if (!editReminder) {
      const optimisticReminder: ReminderRecord = {
        id: `optimistic-${Date.now()}`,
        userId: user.uid,
        title,
        cropName,
        notes,
        reminderDate,
        reminderTime,
        repeat,
        type,
        status,
        createdAt: new Date(),
      }
      setReminders((prev) => [optimisticReminder, ...prev])
    }

    setOpenReminderModal(false)
    setEditReminder(null)
    setReminderForm(defaultReminderForm())

    try {
      if (editReminder) {
        await updateReminder(user.uid, editReminder.id, {
          title, cropName, notes, reminderDate, reminderTime, repeat, type, status,
        })
      } else {
        await addReminder({
          userId: user.uid,
          title, cropName, notes, reminderDate, reminderTime, repeat, type, status,
        })
      }
      // Refresh to get real IDs / server timestamps
      await refresh()
    } catch (e) {
      if (import.meta.env.DEV) console.error('[TrackerScreen] save reminder failed', e)
      setError(formatFirestoreError(e, 'save reminder'))
      // On error revert optimistic update
      await refresh()
    } finally {
      setIsSaving(false)
    }
  }, [editReminder, refresh, reminderForm, user])

  const removeReminder = useCallback(
    async (id: string) => {
      if (!confirm('Delete this reminder?') || !user) return
      setError(null)
      // Optimistic remove
      setReminders((prev) => prev.filter((r) => r.id !== id))
      try {
        await deleteReminder(user.uid, id)
      } catch (e) {
        setError(formatFirestoreError(e, 'delete reminder'))
        await refresh()
      }
    },
    [refresh, user],
  )

  const markReminderDone = useCallback(
    async (id: string) => {
      if (!user) return
      const reminder = reminders.find((r) => r.id === id)
      if (!reminder) return
      setError(null)
      // Optimistic status change
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'done' as const } : r)),
      )
      try {
        await updateReminder(user.uid, id, { status: 'done' })
        // Record as completed activity
        await addActivity({
          userId: user.uid,
          title: `Completed: ${reminder.title}`,
          type: 'reminder completed',
          date: formatToday(),
          status: 'done',
          notes: [reminder.cropName, reminder.notes].filter(Boolean).join(' — ') || 'Reminder done',
        })
        await refresh()
      } catch (e) {
        setError(formatFirestoreError(e, 'update reminder'))
        await refresh()
      }
    },
    [refresh, reminders, user],
  )

  const openEditReminder = useCallback((rem: ReminderRecord) => {
    setEditReminder(rem)
    setReminderForm({
      title: rem.title,
      cropName: rem.cropName,
      notes: rem.notes,
      reminderDate: rem.reminderDate,
      reminderTime: rem.reminderTime,
      repeat: rem.repeat,
      type: rem.type,
      status: rem.status,
    })
    setOpenReminderModal(true)
  }, [])

  const closeReminderModal = useCallback(() => {
    setOpenReminderModal(false)
    setEditReminder(null)
    setReminderForm(defaultReminderForm())
    setError(null)
  }, [])

  // Completed reminders for history section
  const completedReminders = reminders.filter((r) => r.status === 'done')

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-28"
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-900/20">
              <TrendingUp className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Farming Tracker</h2>
              <p className="text-sm text-slate-500">
                {reminders.length} reminders · {completedReminders.length} done
              </p>
            </div>
          </div>

          {/* Add reminder button in header */}
          <button
            type="button"
            onClick={() => {
              setEditReminder(null)
              setReminderForm(defaultReminderForm())
              setOpenReminderModal(true)
            }}
            title="Add reminder"
            aria-label="Add reminder"
            className="group inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-900/20 transition hover:scale-110 active:scale-95"
          >
            <PlusCircle className="h-6 w-6 transition group-hover:rotate-90" strokeWidth={2} />
          </button>
        </div>

        {/* Notification status strip */}
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={() => void handleEnableNotifications()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 text-sm font-bold text-white transition hover:from-amber-500 hover:to-orange-500"
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
            Enable Reminder Notifications
          </button>
        )}
        {notifPermission === 'denied' && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
            <BellOff className="h-3.5 w-3.5 shrink-0" />
            Notifications blocked — in-app alarm will still work
          </p>
        )}
        {canNotify() && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-700">
            <Bell className="h-3.5 w-3.5" strokeWidth={2} />
            Notifications enabled ✓
          </p>
        )}
      </motion.div>

      {/* ── Error Banner ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100"
        >
          <span className="text-lg">⚠️</span>
          <p className="flex-1 font-semibold">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Reminders */}
          <ReminderCards
            reminders={reminders}
            loading={false}
            onEdit={openEditReminder}
            onDelete={removeReminder}
            onMarkDone={markReminderDone}
          />

          {/* Weekly completion graph */}
          <ReminderGraph reminders={reminders} />

          {/* Completed reminder history */}
          <ReminderHistory completedReminders={completedReminders} activities={activities} onDeleteActivity={(id) => {
            void deleteActivity(user!.uid, id).then(() => refresh())
          }} />
        </div>
      )}

      {/* ── Floating Add Reminder FAB ── */}
      <motion.button
        type="button"
        onClick={() => {
          setEditReminder(null)
          setReminderForm(defaultReminderForm())
          setOpenReminderModal(true)
        }}
        className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-green-900/30 transition sm:bottom-8 sm:right-8"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Add reminder"
        aria-label="Add reminder"
      >
        <Clock className="h-6 w-6" strokeWidth={2} />
      </motion.button>

      {/* ── Reminder Modal ── */}
      <PremiumReminderModal
        isOpen={openReminderModal || !!editReminder}
        onClose={closeReminderModal}
        onSave={saveReminder}
        title={editReminder ? 'Edit Reminder' : 'New Reminder'}
        formData={reminderForm}
        onFormChange={(updates) => setReminderForm((prev) => ({ ...prev, ...updates }))}
        isLoading={isSaving}
        error={error}
        isEditing={!!editReminder}
        lang={langCode}
      />

      {/* ── Alarm Popup ── */}
      {alarmReminder && (
        <AlarmPopup
          reminder={alarmReminder}
          onStop={stopActiveAlarm}
          onMarkDone={(id) => {
            void markReminderDone(id)
            stopActiveAlarm()
          }}
        />
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ModalWrap (kept for potential future use)
// ---------------------------------------------------------------------------
function ModalWrap({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-green-100 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-bold text-slate-900">{title}</h4>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

// Suppress unused warning — ModalWrap kept for future activity log forms
void ModalWrap
