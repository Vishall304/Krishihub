import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { getFirestoreDb } from '../firebase/config'
import { firestoreDevLog } from '../lib/firestoreDevLog'
import { REMINDERS } from '../firebase/collections'
import type { ReminderRecord, ReminderRepeat, ReminderCategory } from '../types/models'
import { tsToDate } from '../types/models'
import { assertDocOwnedByUser } from './firestoreOwnership'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_REPEATS: ReminderRepeat[] = ['once', 'daily', 'weekly', 'monthly']
const VALID_CATEGORIES: ReminderCategory[] = [
  'irrigation', 'fertilizer', 'pesticide', 'harvest',
  'disease check', 'market visit', 'weather check', 'other',
]

function coerceRepeat(v: unknown): ReminderRepeat {
  return VALID_REPEATS.includes(v as ReminderRepeat) ? (v as ReminderRepeat) : 'once'
}

function coerceCategory(v: unknown): ReminderCategory {
  // Legacy data may use old strings like 'pesticide spray' or 'soil test'
  if (v === 'pesticide spray') return 'pesticide'
  if (v === 'soil test') return 'disease check'
  if (v === 'pruning' || v === 'weeding') return 'other'
  return VALID_CATEGORIES.includes(v as ReminderCategory) ? (v as ReminderCategory) : 'other'
}

// ---------------------------------------------------------------------------
// addReminder
// ---------------------------------------------------------------------------
export async function addReminder(input: {
  userId: string
  title: string
  cropName: string
  notes: string
  reminderDate: string
  reminderTime: string
  repeat: ReminderRepeat
  type: ReminderCategory
  status: 'pending' | 'done'
}): Promise<string> {
  try {
    const col = collection(getFirestoreDb(), REMINDERS)
    const ref = await addDoc(col, {
      userId: input.userId,
      title: input.title,
      cropName: input.cropName,
      notes: input.notes,
      reminderDate: input.reminderDate,
      reminderTime: input.reminderTime,
      repeat: input.repeat,
      type: input.type,
      status: input.status,
      createdAt: serverTimestamp(),
    })
    firestoreDevLog.ok(REMINDERS, 'add', { id: ref.id, userId: input.userId })
    return ref.id
  } catch (e) {
    firestoreDevLog.fail(REMINDERS, 'add', e)
    throw e
  }
}

// ---------------------------------------------------------------------------
// fetchRemindersForUser
// Deliberately avoids composite index by ordering client-side.
// ---------------------------------------------------------------------------
export async function fetchRemindersForUser(userId: string): Promise<ReminderRecord[]> {
  try {
    const col = collection(getFirestoreDb(), REMINDERS)
    // Use only a single equality filter to avoid composite index requirement
    const q = query(col, where('userId', '==', userId))
    const snap = await getDocs(q)

    const rows: ReminderRecord[] = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      const status: 'done' | 'pending' = data.status === 'done' ? 'done' : 'pending'
      return {
        id: d.id,
        userId: String(data.userId ?? ''),
        title: String(data.title ?? ''),
        cropName: String(data.cropName ?? ''),
        notes: String(data.notes ?? data.description ?? ''),
        reminderDate: String(data.reminderDate ?? ''),
        reminderTime: String(data.reminderTime ?? ''),
        repeat: coerceRepeat(data.repeat),
        type: coerceCategory(data.type),
        status,
        createdAt: tsToDate(data.createdAt as Timestamp | undefined),
      }
    })

    // Client-side sort: pending first, then by date desc
    rows.sort((a, b) => {
      // Pending before done
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      // Then by date/time descending
      const da = `${a.reminderDate}T${a.reminderTime}`
      const db = `${b.reminderDate}T${b.reminderTime}`
      return da < db ? -1 : da > db ? 1 : 0
    })

    firestoreDevLog.ok(REMINDERS, 'fetch', { userId, count: rows.length })
    return rows
  } catch (e) {
    firestoreDevLog.fail(REMINDERS, 'fetch', e)
    throw e
  }
}

// ---------------------------------------------------------------------------
// updateReminder
// ---------------------------------------------------------------------------
export async function updateReminder(
  userId: string,
  id: string,
  data: Partial<
    Pick<
      ReminderRecord,
      'title' | 'cropName' | 'notes' | 'reminderDate' | 'reminderTime' | 'repeat' | 'type' | 'status'
    >
  >,
): Promise<void> {
  try {
    await assertDocOwnedByUser(REMINDERS, id, userId)
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Record<string, string>
    await updateDoc(doc(getFirestoreDb(), REMINDERS, id), cleaned)
    firestoreDevLog.ok(REMINDERS, 'update', { id, userId })
  } catch (e) {
    firestoreDevLog.fail(REMINDERS, 'update', e)
    throw e
  }
}

// ---------------------------------------------------------------------------
// deleteReminder
// ---------------------------------------------------------------------------
export async function deleteReminder(userId: string, id: string): Promise<void> {
  try {
    await assertDocOwnedByUser(REMINDERS, id, userId)
    await deleteDoc(doc(getFirestoreDb(), REMINDERS, id))
    firestoreDevLog.ok(REMINDERS, 'delete', { id, userId })
  } catch (e) {
    firestoreDevLog.fail(REMINDERS, 'delete', e)
    throw e
  }
}
