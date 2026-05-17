/**
 * PremiumReminderModal.tsx
 * Full-featured reminder form modal:
 *  - 8 categories  (irrigation, fertilizer, pesticide, harvest, disease check, market visit, weather check, other)
 *  - 4 repeat types (once, daily, weekly, monthly)
 *  - Voice mic button for title input
 *  - Framer-motion animations
 *  - Bilingual labels
 */
import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, AlertCircle, Mic, Square } from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import type { ReminderCategory, ReminderRepeat } from '../../types/models'
import { CATEGORY_META } from '../../lib/reminderUtils'

export type ReminderFormData = {
  title: string
  cropName: string
  notes: string
  reminderDate: string
  reminderTime: string
  repeat: ReminderRepeat
  type: ReminderCategory
  status: 'pending' | 'done'
}

interface PremiumReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
  title: string
  formData: ReminderFormData
  onFormChange: (updates: Partial<ReminderFormData>) => void
  isLoading?: boolean
  error?: string | null
  isEditing?: boolean
  lang?: 'en' | 'hi' | 'mr'
}

const REMINDER_CATEGORIES: { value: ReminderCategory; label: string; emoji: string }[] = [
  { value: 'irrigation',    label: 'Irrigation',    emoji: '💧' },
  { value: 'fertilizer',   label: 'Fertilizer',    emoji: '🌿' },
  { value: 'pesticide',    label: 'Pesticide',     emoji: '🛡️' },
  { value: 'harvest',      label: 'Harvest',       emoji: '🌾' },
  { value: 'disease check',label: 'Disease Check', emoji: '🔬' },
  { value: 'market visit', label: 'Market Visit',  emoji: '🏪' },
  { value: 'weather check',label: 'Weather Check', emoji: '🌦️' },
  { value: 'other',        label: 'Other',         emoji: '📝' },
]

const REPEAT_OPTIONS: { value: ReminderRepeat; label: string; emoji: string }[] = [
  { value: 'once',    label: 'Once',    emoji: '1️⃣' },
  { value: 'daily',  label: 'Daily',   emoji: '📅' },
  { value: 'weekly', label: 'Weekly',  emoji: '📆' },
  { value: 'monthly',label: 'Monthly', emoji: '🗓️' },
]

const VOICE_LANG_MAP: Record<'en' | 'hi' | 'mr', string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export function PremiumReminderModal({
  isOpen,
  onClose,
  onSave,
  title,
  formData,
  onFormChange,
  isLoading = false,
  error = null,
  isEditing = false,
  lang = 'en',
}: PremiumReminderModalProps) {
  const voice = useSpeechRecognition(VOICE_LANG_MAP[lang])
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Sync voice transcript → title field
  useEffect(() => {
    if (voice.status === 'processing' && voice.transcript.trim()) {
      onFormChange({ title: voice.transcript.trim() })
      voice.reset()
    }
  }, [voice.status, voice.transcript, onFormChange, voice])

  // Focus title input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const toggleVoice = useCallback(() => {
    if (!voice.supported) return
    if (voice.status === 'listening') {
      voice.stop()
    } else {
      voice.reset()
      voice.start({ lang: VOICE_LANG_MAP[lang] })
    }
  }, [voice, lang])

  const selectedMeta = CATEGORY_META[formData.type]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        key="reminder-modal-overlay"
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={onClose}
      >
        <motion.div
          key="reminder-modal-card"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-green-100 bg-white p-5 shadow-2xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${selectedMeta.color} ${selectedMeta.border} border`}
            >
              {selectedMeta.emoji}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-black text-slate-900">{title}</h4>
              <p className="text-xs text-slate-500">
                {selectedMeta.label} · {formData.reminderDate} · {formData.reminderTime}
              </p>
            </div>
            <button
              type="button"
              title="Close"
              aria-label="Close"
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 flex gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" strokeWidth={2} />
              <p>{error}</p>
            </motion.div>
          )}

          {/* Voice status */}
          {voice.status === 'listening' && (
            <p className="mt-3 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 ring-1 ring-green-100">
              🎙️ Listening… speak reminder title
            </p>
          )}

          <div className="mt-5 space-y-4">
            {/* Title + Mic */}
            <Field label="Reminder Title" required>
              <div className="mt-2 flex gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => onFormChange({ title: e.target.value })}
                  placeholder="e.g., Water the tomato field"
                  className="flex-1 rounded-2xl border border-green-100 bg-slate-50 px-4 py-3 text-base outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                />
                {voice.supported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={voice.status === 'listening' ? 'Stop listening' : 'Speak title'}
                    aria-label={voice.status === 'listening' ? 'Stop listening' : 'Speak title'}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
                      voice.status === 'listening'
                        ? 'animate-pulse bg-red-500 text-white ring-2 ring-red-200'
                        : 'border border-green-100 bg-slate-50 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {voice.status === 'listening' ? (
                      <Square className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Mic className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                )}
              </div>
            </Field>

            {/* Crop Name */}
            <Field label="Crop Name">
              <input
                type="text"
                value={formData.cropName}
                onChange={(e) => onFormChange({ cropName: e.target.value })}
                placeholder="e.g., Tomato, Wheat, Cotton"
                className="mt-2 w-full rounded-2xl border border-green-100 bg-slate-50 px-4 py-3 text-base outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={formData.notes}
                onChange={(e) => onFormChange({ notes: e.target.value })}
                placeholder="Optional details…"
                rows={2}
                className="mt-2 w-full resize-none rounded-2xl border border-green-100 bg-slate-50 px-4 py-3 text-base outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
            </Field>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={formData.reminderDate}
                  onChange={(e) => onFormChange({ reminderDate: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-green-100 bg-slate-50 px-3 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => onFormChange({ reminderTime: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-green-100 bg-slate-50 px-3 py-3 text-base outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                />
              </Field>
            </div>

            {/* Category */}
            <Field label="Category">
              <div className="mt-2 grid grid-cols-4 gap-2">
                {REMINDER_CATEGORIES.map((cat) => {
                  const isSelected = formData.type === cat.value
                  const m = CATEGORY_META[cat.value]
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => onFormChange({ type: cat.value })}
                      disabled={isLoading}
                      title={cat.label}
                      className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs font-semibold transition ${
                        isSelected
                          ? `${m.color} ${m.border} ${m.text} ring-2 ring-offset-1 ring-green-400`
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-green-200 hover:bg-green-50'
                      }`}
                    >
                      <span className="text-lg leading-none">{cat.emoji}</span>
                      <span className="leading-tight text-center">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Repeat */}
            <Field label="Repeat">
              <div className="mt-2 grid grid-cols-4 gap-2">
                {REPEAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFormChange({ repeat: opt.value })}
                    disabled={isLoading}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs font-semibold transition ${
                      formData.repeat === opt.value
                        ? 'border-green-400 bg-green-50 text-green-700 ring-2 ring-green-200'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-green-200 hover:bg-green-50'
                    }`}
                  >
                    <span className="text-lg leading-none">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Save Button */}
          <motion.button
            type="button"
            onClick={() => void onSave()}
            disabled={isLoading || !formData.title.trim()}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-white shadow-md transition ${
              isLoading || !formData.title.trim()
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                />
                Saving…
              </>
            ) : (
              <>
                <Clock className="h-5 w-5" strokeWidth={2} />
                {isEditing ? 'Update Reminder' : 'Add Reminder'}
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
