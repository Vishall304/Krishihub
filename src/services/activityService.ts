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
import { ACTIVITIES } from '../firebase/collections'
import type { ActivityRecord } from '../types/models'
import { tsToDate } from '../types/models'
import { assertDocOwnedByUser } from './firestoreOwnership'

export async function addActivity(input: {
  userId: string
  title: string
  type: string
  date: string
  status: 'done' | 'pending'
  notes: string
}): Promise<string> {
  try {
    const col = collection(getFirestoreDb(), ACTIVITIES)
    const ref = await addDoc(col, {
      userId: input.userId,
      title: input.title,
      type: input.type,
      date: input.date,
      status: input.status,
      notes: input.notes,
      createdAt: serverTimestamp(),
    })
    firestoreDevLog.ok(ACTIVITIES, 'add', { id: ref.id, userId: input.userId })
    return ref.id
  } catch (e) {
    firestoreDevLog.fail(ACTIVITIES, 'add', e)
    throw e
  }
}

export async function fetchActivitiesForUser(userId: string): Promise<ActivityRecord[]> {
  try {
    const col = collection(getFirestoreDb(), ACTIVITIES)
    // Avoid composite index: only single equality filter, sort client-side
    const q = query(col, where('userId', '==', userId))
    const snap = await getDocs(q)
    const rows = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      const status: 'done' | 'pending' = data.status === 'done' ? 'done' : 'pending'
      return {
        id: d.id,
        userId: String(data.userId ?? ''),
        title: String(data.title ?? ''),
        type: String(data.type ?? ''),
        date: String(data.date ?? ''),
        status,
        notes: String(data.notes ?? ''),
        createdAt: tsToDate(data.createdAt as Timestamp | undefined),
      }
    })
    // Client-side sort: newest first
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    firestoreDevLog.ok(ACTIVITIES, 'fetch', { userId, count: rows.length })
    return rows
  } catch (e) {
    firestoreDevLog.fail(ACTIVITIES, 'fetch', e)
    throw e
  }
}


export async function updateActivity(
  userId: string,
  id: string,
  data: Partial<Pick<ActivityRecord, 'title' | 'type' | 'date' | 'status' | 'notes'>>,
): Promise<void> {
  try {
    await assertDocOwnedByUser(ACTIVITIES, id, userId)
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Record<string, string>
    const ref = doc(getFirestoreDb(), ACTIVITIES, id)
    await updateDoc(ref, cleaned)
    firestoreDevLog.ok(ACTIVITIES, 'update', { id, userId })
  } catch (e) {
    firestoreDevLog.fail(ACTIVITIES, 'update', e)
    throw e
  }
}

export async function deleteActivity(userId: string, id: string): Promise<void> {
  try {
    await assertDocOwnedByUser(ACTIVITIES, id, userId)
    await deleteDoc(doc(getFirestoreDb(), ACTIVITIES, id))
    firestoreDevLog.ok(ACTIVITIES, 'delete', { id, userId })
  } catch (e) {
    firestoreDevLog.fail(ACTIVITIES, 'delete', e)
    throw e
  }
}
