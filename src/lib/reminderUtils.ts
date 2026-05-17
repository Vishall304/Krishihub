/**
 * reminderUtils.ts
 * Shared utilities for the KrishiMitra reminder system:
 *  - Voice message builder (EN / HI / MR)
 *  - Web Audio API alarm engine
 *  - Reminder filter helpers
 *  - Category metadata
 */

import type { ReminderRecord, ReminderCategory } from '../types/models'

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

export type CategoryMeta = {
  label: string
  emoji: string
  color: string   // Tailwind bg class
  border: string  // Tailwind border class
  text: string    // Tailwind text class
}

export const CATEGORY_META: Record<ReminderCategory, CategoryMeta> = {
  irrigation:       { label: 'Irrigation',    emoji: '💧', color: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
  fertilizer:       { label: 'Fertilizer',    emoji: '🌿', color: 'bg-lime-50',   border: 'border-lime-200',   text: 'text-lime-700'   },
  pesticide:        { label: 'Pesticide',     emoji: '🛡️', color: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  harvest:          { label: 'Harvest',       emoji: '🌾', color: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700'  },
  'disease check':  { label: 'Disease Check', emoji: '🔬', color: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
  'market visit':   { label: 'Market Visit',  emoji: '🏪', color: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  'weather check':  { label: 'Weather Check', emoji: '🌦️', color: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700'    },
  other:            { label: 'Other',         emoji: '📝', color: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-700'  },
}

export function getCategoryMeta(type: string): CategoryMeta {
  return CATEGORY_META[type as ReminderCategory] ?? CATEGORY_META.other
}

// ---------------------------------------------------------------------------
// Voice message builder — multilingual
// ---------------------------------------------------------------------------

export function buildVoiceMessage(
  reminder: ReminderRecord,
  lang: 'en' | 'hi' | 'mr',
): string {
  const crop = reminder.cropName?.trim()
  const title = reminder.title?.trim()
  const time = reminder.reminderTime ?? ''

  if (lang === 'mr') {
    if (crop) {
      return `${crop} पिकासाठी ${title} करण्याची वेळ आली आहे. वेळ ${time}.`
    }
    return `${title} करण्याची वेळ आली आहे. वेळ ${time}.`
  }

  if (lang === 'hi') {
    if (crop) {
      return `${crop} की फसल के लिए ${title} करने का समय आ गया है। समय ${time}.`
    }
    return `${title} करने का समय आ गया है। समय ${time}.`
  }

  // English fallback
  if (crop) {
    return `Reminder for ${crop}: ${title}. Time is ${time}.`
  }
  return `Reminder: ${title}. Time is ${time}.`
}

// ---------------------------------------------------------------------------
// Web Audio API alarm
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const W = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctor = W.AudioContext ?? W.webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctor()
  }
  return audioCtx
}

/**
 * Play a 3-tone ascending alarm beep pattern via Web Audio API.
 * Returns a cleanup function that closes the AudioContext.
 */
export function playAlarmBeep(): (() => void) {
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  const freqs = [520, 660, 800]
  const gainNode = ctx.createGain()
  gainNode.gain.value = 0.22
  gainNode.connect(ctx.destination)

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gainNode)
    const start = ctx.currentTime + i * 0.35
    osc.start(start)
    osc.stop(start + 0.25)
  })

  // Second cycle after 1.5 seconds
  setTimeout(() => {
    const ctx2 = getAudioContext()
    if (!ctx2 || ctx2.state === 'closed') return
    freqs.forEach((freq, i) => {
      const osc = ctx2.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(ctx2.createGain())
      const gainN = ctx2.createGain()
      gainN.gain.value = 0.22
      gainN.connect(ctx2.destination)
      osc.connect(gainN)
      const start = ctx2.currentTime + i * 0.35
      osc.start(start)
      osc.stop(start + 0.25)
    })
  }, 1500)

  return () => {
    try { audioCtx?.close() } catch { /* ignore */ }
    audioCtx = null
  }
}

export function stopAlarm(): void {
  try { audioCtx?.close() } catch { /* ignore */ }
  audioCtx = null
}

// ---------------------------------------------------------------------------
// Reminder due-check
// ---------------------------------------------------------------------------

/** Returns true if a pending reminder's scheduled time has passed (within a 2-minute window). */
export function isReminderDueNow(reminder: ReminderRecord): boolean {
  if (reminder.status !== 'pending') return false
  if (!reminder.reminderDate || !reminder.reminderTime) return false

  const due = new Date(`${reminder.reminderDate}T${reminder.reminderTime}:00`)
  const now = new Date()
  // "Due" = scheduled time is in the past but less than 2 minutes ago
  const diffMs = now.getTime() - due.getTime()
  return diffMs >= 0 && diffMs < 2 * 60 * 1000
}

/** Returns true if a reminder is past due (more than 2 mins ago, still pending). */
export function isReminderOverdue(reminder: ReminderRecord): boolean {
  if (reminder.status !== 'pending') return false
  const due = new Date(`${reminder.reminderDate}T${reminder.reminderTime}:00`)
  return due < new Date()
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

export type ReminderTab = 'all' | 'today' | 'upcoming' | 'completed'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function filterReminders(
  reminders: ReminderRecord[],
  tab: ReminderTab,
): ReminderRecord[] {
  const today = todayString()

  switch (tab) {
    case 'today':
      return reminders.filter(
        (r) => r.status === 'pending' && r.reminderDate === today,
      )
    case 'upcoming':
      return reminders.filter(
        (r) => r.status === 'pending' && r.reminderDate > today,
      )
    case 'completed':
      return reminders.filter((r) => r.status === 'done')
    case 'all':
    default:
      return reminders
  }
}

// ---------------------------------------------------------------------------
// Natural language reminder parser
// ---------------------------------------------------------------------------

function formatToday(): string {
  return new Date().toISOString().slice(0, 10)
}
function getTomorrowDate(): string {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10)
}
function capitalize(s: string): string {
  const t = s.trim()
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : ''
}

export function parseNaturalReminder(input: string): {
  title: string
  notes: string
  reminderDate: string
  reminderTime: string
  type: ReminderCategory
} {
  const raw = input.trim().replace(/\s+/g, ' ')
  const lower = raw.toLowerCase()

  const reminderDate = /tomorrow|कल/.test(lower) ? getTomorrowDate() : formatToday()

  let reminderTime = '09:00'
  if (/morning|सुबह|सकाळ/.test(lower)) reminderTime = '08:00'
  else if (/afternoon|दोपहर|दुपार/.test(lower)) reminderTime = '13:00'
  else if (/evening|शाम|संध्याकाळ/.test(lower)) reminderTime = '17:00'
  else if (/night|रात|रात्री/.test(lower)) reminderTime = '19:00'

  let type: ReminderCategory = 'other'
  if (/fertilizer|fertiliser|खाद|nutrient|खत/.test(lower)) type = 'fertilizer'
  else if (/spray|pesticide|कीट|pest|किड|कीटक/.test(lower)) type = 'pesticide'
  else if (/harvest|कटाई|काढणी/.test(lower)) type = 'harvest'
  else if (/diseas|रोग|बीमारी|बिमारी/.test(lower)) type = 'disease check'
  else if (/market|mandi|मंडी|बाजार/.test(lower)) type = 'market visit'
  else if (/weather|हवामान|मौसम/.test(lower)) type = 'weather check'
  else if (/water|irrigat|सिंच|पाणी/.test(lower)) type = 'irrigation'

  const cleaned = raw
    .replace(/tomorrow|कल|today|आज|morning|सुबह|afternoon|दोपहर|evening|शाम|night|रात|at \d{1,2}(:\d{2})?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title: capitalize(cleaned || raw),
    notes: capitalize(raw),
    reminderDate,
    reminderTime,
    type,
  }
}
