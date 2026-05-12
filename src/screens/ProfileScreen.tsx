import { useCallback, useEffect, useId, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Cloud,
  LogOut,
  MapPin,
  Sparkles,
  Sun,
  User,
  LocateFixed,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'

import { weatherSnapshot } from '../data/dummy'
import { useAuth } from '../hooks/useAuth'
import { fetchActivitiesForUser } from '../services/activityService'
import { fetchRemindersForUser } from '../services/reminderService'
import { uploadProfilePhoto } from '../services/storageService'
const textMap = {
  en: {
    yourDetails: 'Your details',
    fullName: 'Full name',
    phone: 'Phone',
    village: 'Village',
    district: 'District',
    state: 'State',
    language: 'Preferred language',
    useLocation: 'Use Current Location',
    detecting: 'Detecting location...',
    save: 'Save profile',
    weather: 'Weather snapshot',
    temperature: 'Temperature',
    humidity: 'Humidity',
    rainChance: 'Rain chance',
    logout: 'Logout',
    reminder: 'Reminder summary',
    pending: 'Pending reminders',
  },

  hi: {
    yourDetails: 'आपकी जानकारी',
    fullName: 'पूरा नाम',
    phone: 'मोबाइल नंबर',
    village: 'गांव',
    district: 'जिला',
    state: 'राज्य',
    language: 'भाषा',
    useLocation: 'वर्तमान स्थान इस्तेमाल करें',
    detecting: 'लोकेशन पता किया जा रहा है...',
    save: 'प्रोफाइल सेव करें',
    weather: 'मौसम जानकारी',
    temperature: 'तापमान',
    humidity: 'नमी',
    rainChance: 'बारिश संभावना',
    logout: 'लॉगआउट',
    reminder: 'रिमाइंडर सारांश',
    pending: 'बाकी रिमाइंडर',
  },

  mr: {
    yourDetails: 'तुमची माहिती',
    fullName: 'पूर्ण नाव',
    phone: 'मोबाईल नंबर',
    village: 'गाव',
    district: 'जिल्हा',
    state: 'राज्य',
    language: 'भाषा',
    useLocation: 'सध्याचे स्थान वापरा',
    detecting: 'स्थान शोधले जात आहे...',
    save: 'प्रोफाइल सेव करा',
    weather: 'हवामान माहिती',
    temperature: 'तापमान',
    humidity: 'आर्द्रता',
    rainChance: 'पावसाची शक्यता',
    logout: 'लॉगआउट',
    reminder: 'रिमाइंडर सारांश',
    pending: 'बाकी रिमाइंडर',
  },
}

export function ProfileScreen() {
  const navigate = useNavigate()

  const {
    profile,
    user,
    saveProfilePatch,
    signOutUser,
    clearError,
  } = useAuth()

  const photoInputId = useId()

  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  const [tasksDone, setTasksDone] = useState(0)
  const [tasksPending, setTasksPending] = useState(0)
  const [reminderCount, setReminderCount] = useState(0)

  const [draft, setDraft] = useState({
    fullName: '',
    phone: '',
    village: '',
    district: '',
    state: '',
    preferredLanguage: 'en',
    latitude: 0,
    longitude: 0,
  })

  useEffect(() => {
    if (!profile) return

    setDraft({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      village: profile.village || '',
      district: profile.district || '',
      state: profile.state || '',
      preferredLanguage: profile.preferredLanguage || 'en',
      latitude: profile.latitude || 0,
      longitude: profile.longitude || 0,
    })
  }, [profile])

  const lang =
    draft.preferredLanguage === 'hi'
      ? 'hi'
      : draft.preferredLanguage === 'mr'
        ? 'mr'
        : 'en'

  const t = textMap[lang]

  const loadStats = useCallback(async () => {
    if (!user) return

    const [acts, rems] = await Promise.all([
      fetchActivitiesForUser(user.uid),
      fetchRemindersForUser(user.uid),
    ])

    setTasksDone(acts.filter((a) => a.status === 'done').length)

    setTasksPending(acts.filter((a) => a.status === 'pending').length)

    setReminderCount(rems.filter((r) => r.status === 'pending').length)
  }, [user])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      alert('GPS not supported')
      return
    }

    setDetectingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lon = position.coords.longitude

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          )

          const data = await res.json()

          setDraft((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,

            village:
              data.address.village ||
              data.address.town ||
              data.address.hamlet ||
              '',

            district:
              data.address.county ||
              data.address.state_district ||
              '',

            state: data.address.state || '',
          }))
        } catch (e) {
          console.error(e)
        } finally {
          setDetectingLocation(false)
        }
      },
      () => {
        setDetectingLocation(false)
      }
    )
  }

  const avatarSrc = profile?.photoURL ?? user?.photoURL ?? undefined

  const onSave = async () => {
    clearError()

    setSaving(true)

    try {
      await saveProfilePatch({
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
        village: draft.village.trim(),
        district: draft.district.trim(),
        state: draft.state.trim(),

        preferredLanguage: draft.preferredLanguage as 'en' | 'hi' | 'mr',
        latitude: draft.latitude,
        longitude: draft.longitude,
      })
    } finally {
      setSaving(false)
    }
  }

  const onPhoto = async (file: File | null) => {
    if (!file || !user) return

    setUploadingPhoto(true)

    try {
      const url = await uploadProfilePhoto(user.uid, file)

      await saveProfilePatch({
        photoURL: url,
      })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const logout = async () => {
    await signOutUser()

    navigate('/login', { replace: true })
  }

  const locationLabel =
    draft.village && draft.district
      ? `${draft.village}, ${draft.district}, ${draft.state}`
      : draft.state || 'Your location'

  return (
    <div className="space-y-6 pb-28">

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-white to-green-50 p-5 shadow-lg"
      >
        <div className="flex items-start gap-4">

          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="h-20 w-20 rounded-3xl object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 ring-4 ring-white shadow-md">
                <User className="h-10 w-10 text-green-800" />
              </div>
            )}

            <label
              htmlFor={photoInputId}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-green-600 text-white shadow-md"
            >
              <Camera className="h-5 w-5" />
            </label>

            <input
              id={photoInputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              disabled={uploadingPhoto}
            />
          </div>

          <div className="flex-1">
            <h2 className="truncate text-xl font-bold text-slate-900">
              {draft.fullName || 'Farmer'}
            </h2>

            <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-green-700" />
              {locationLabel}
            </p>

            <button
              onClick={() => void logout()}
              className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-800 ring-1 ring-green-200"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">

        <div className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-700">
            Done
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {tasksDone}
          </p>
        </div>

        <div className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-700">
            Pending
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {tasksPending}
          </p>
        </div>

        <div className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-700">
            {t.pending}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {reminderCount}
          </p>
        </div>

      </div>

      <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-md">

        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-green-600" />

          <h3 className="text-lg font-bold text-slate-900">
            {t.yourDetails}
          </h3>
        </div>

        <div className="mt-4 space-y-3">

          <ProfileField
            label={t.fullName}
            value={draft.fullName}
            onChange={(v) =>
              setDraft((d) => ({ ...d, fullName: v }))
            }
          />

          <ProfileField
            label={t.phone}
            value={draft.phone}
            onChange={(v) =>
              setDraft((d) => ({ ...d, phone: v }))
            }
          />

          <ProfileField
            label={t.village}
            value={draft.village}
            onChange={(v) =>
              setDraft((d) => ({ ...d, village: v }))
            }
          />

          <ProfileField
            label={t.district}
            value={draft.district}
            onChange={(v) =>
              setDraft((d) => ({ ...d, district: v }))
            }
          />

          <ProfileField
            label={t.state}
            value={draft.state}
            onChange={(v) =>
              setDraft((d) => ({ ...d, state: v }))
            }
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.language}
            </label>

            <select
              value={draft.preferredLanguage}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  preferredLanguage: e.target.value as 'en' | 'hi' | 'mr',
                }))
              }
              className="mt-1 w-full rounded-2xl border border-green-100 bg-green-50/80 px-4 py-3 text-base font-medium text-slate-900 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>

          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <LocateFixed className="h-5 w-5" />

            {detectingLocation
              ? t.detecting
              : t.useLocation}
          </button>

          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="w-full rounded-2xl bg-green-600 py-3 text-base font-semibold text-white shadow-md transition hover:bg-green-700"
          >
            {saving ? 'Saving...' : t.save}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-sky-50 to-green-50 p-5 shadow-md">

        <div className="flex items-center justify-between gap-3">

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-800">
              {t.weather}
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {weatherSnapshot.place}
            </h3>
          </div>

          <Sun className="h-10 w-10 text-amber-500" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">

          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-green-100">
            <p className="text-xs font-semibold text-slate-500">
              {t.temperature}
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {weatherSnapshot.tempC}°C
            </p>

            <p className="text-sm text-slate-600">
              {weatherSnapshot.condition}
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-green-100">
            <p className="text-xs font-semibold text-slate-500">
              {t.humidity}
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {weatherSnapshot.humidity}%
            </p>

            <p className="flex items-center gap-1 text-sm text-slate-600">
              <Cloud className="h-4 w-4" />
              {t.rainChance} {weatherSnapshot.rainChance}%
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}

function ProfileField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-green-100 bg-green-50/80 px-4 py-3 text-base font-medium text-slate-900 outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}