import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { getFirestoreDb } from '../firebase/config'
import { USERS } from '../firebase/collections'
import type { SignUpPayload, UserProfile } from '../types/models'
import { tsToDate } from '../types/models'

function normalisePreferredLanguage(value?: string): 'en' | 'hi' | 'mr' {
  const v = (value ?? '').toLowerCase().trim()

  if (['hi', 'hindi', 'हिंदी', 'हिन्दी'].includes(v)) return 'hi'
  if (['mr', 'marathi', 'मराठी'].includes(v)) return 'mr'

  return 'en'
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined

  const n = Number(value)

  return Number.isFinite(n) ? n : undefined
}

function profileFromDoc(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,

    fullName: String(data.fullName ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),

    village: String(data.village ?? ''),
    district: String(data.district ?? ''),
    state: String(data.state ?? ''),

    preferredLanguage: normalisePreferredLanguage(String(data.preferredLanguage ?? 'en')),

    latitude: toNumberOrUndefined(data.latitude),
    longitude: toNumberOrUndefined(data.longitude),

    photoURL: data.photoURL ? String(data.photoURL) : undefined,

    createdAt: tsToDate(data.createdAt as Timestamp | undefined),
  }
}

/**
 * Creates `users/{uid}` in Firestore.
 * Call only after Firebase Auth signup succeeds.
 */
export async function createUserProfile(
  uid: string,
  payload: SignUpPayload,
): Promise<void> {
  const ref = doc(getFirestoreDb(), USERS, uid)

  const data = {
    uid,

    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,

    village: payload.village || '',
    district: payload.district || '',
    state: payload.state || '',

    preferredLanguage: normalisePreferredLanguage(payload.preferredLanguage),

    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,

    createdAt: serverTimestamp(),
  }

  try {
    await setDoc(ref, data)

    console.info('[KrishiMitra][Firestore][users] Document created', {
      path: `${USERS}/${uid}`,
      uid,
      email: payload.email,
    })
  } catch (e) {
    console.error('[KrishiMitra][Firestore][users] Failed to create document', {
      uid,
      error: e,
    })

    throw e
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(getFirestoreDb(), USERS, uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) return null

  return profileFromDoc(uid, snap.data() as Record<string, unknown>)
}

export async function updateUserProfile(
  uid: string,
  data: Partial<
    Pick<
      UserProfile,
      | 'fullName'
      | 'phone'
      | 'village'
      | 'district'
      | 'state'
      | 'preferredLanguage'
      | 'photoURL'
      | 'latitude'
      | 'longitude'
    >
  >,
): Promise<void> {
  const ref = doc(getFirestoreDb(), USERS, uid)

  const cleaned = Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => {
        if (key === 'preferredLanguage') {
          return [key, normalisePreferredLanguage(String(value))]
        }

        return [key, value]
      }),
  )

  await updateDoc(ref, cleaned)
}