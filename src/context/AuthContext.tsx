import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { firebaseReady, getFirebaseAuth } from '../firebase/config'
import { formatAuthError } from '../lib/firebaseErrors'
import { createUserProfile, getUserProfile, updateUserProfile } from '../services/userService'
import type { SignUpPayload, UserProfile } from '../types/models'

type EditableProfileFields = Pick<
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

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  initializing: boolean
  profileLoading: boolean
  error: string | null
  clearError: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (payload: SignUpPayload) => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveProfilePatch: (patch: Partial<EditableProfileFields>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true)
    try {
      const p = await getUserProfile(uid)
      setProfile(p)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!firebaseReady) {
      console.warn(
        '[KrishiMitra][firebase] Auth listener not started — Firebase env is missing or invalid. Fix .env.local and restart Vite.',
      )
      setUser(null)
      setProfile(null)
      setInitializing(false)
      return
    }

    const auth = getFirebaseAuth()

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (u) {
        await loadProfile(u.uid)
      } else {
        setProfile(null)
      }

      setInitializing(false)
    })

    return () => unsub()
  }, [loadProfile])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)

    if (!firebaseReady) {
      const msg = 'Firebase is not configured. Check .env.local and restart the dev server.'
      setError(msg)
      throw new Error(msg)
    }

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
    } catch (e) {
      const msg = formatAuthError(e)
      setError(msg)
      throw e
    }
  }, [])

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      setError(null)

      if (!firebaseReady) {
        const msg = 'Firebase is not configured. Check .env.local and restart the dev server.'
        setError(msg)
        throw new Error(msg)
      }

      try {
        const cred = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          payload.email.trim(),
          payload.password,
        )

        await createUserProfile(cred.user.uid, payload)
        await updateProfile(cred.user, { displayName: payload.fullName })
        await loadProfile(cred.user.uid)
      } catch (e) {
        const msg = formatAuthError(e)
        setError(msg)
        throw e
      }
    },
    [loadProfile],
  )

  const signOutUser = useCallback(async () => {
    setError(null)
    if (!firebaseReady) return
    await signOut(getFirebaseAuth())
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.uid)
  }, [user, loadProfile])

  const saveProfilePatch = useCallback(
    async (patch: Partial<EditableProfileFields>) => {
      if (!user) return

      setError(null)

      try {
        await updateUserProfile(user.uid, patch)

        const authPatch: { displayName?: string; photoURL?: string | null } = {}

        if (patch.fullName !== undefined) {
          authPatch.displayName = patch.fullName
        }

        if (patch.photoURL !== undefined) {
          authPatch.photoURL = patch.photoURL
        }

        if (Object.keys(authPatch).length > 0) {
          await updateProfile(user, authPatch)
        }

        await loadProfile(user.uid)
      } catch (e) {
        const msg = formatAuthError(e)
        setError(msg)
        throw e
      }
    },
    [user, loadProfile],
  )

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      profileLoading,
      error,
      clearError,
      signIn,
      signUp,
      signOutUser,
      refreshProfile,
      saveProfilePatch,
    }),
    [
      user,
      profile,
      initializing,
      profileLoading,
      error,
      clearError,
      signIn,
      signUp,
      signOutUser,
      refreshProfile,
      saveProfilePatch,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}