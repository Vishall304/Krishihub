import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  RefreshCw,
  Sparkles,
  Leaf,
  CloudRain,
  ShieldAlert,
  FlaskConical,
  Activity,
  Volume2,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import { analyzeCropImage, type DiseaseResult } from '../services/diseaseService'
import { fetchBestWeather, type WeatherSnapshot } from '../services/weatherService'
import { normaliseLang } from '../services/aiService'

type Step = 'upload' | 'preview' | 'result'

const voiceLangMap: Record<'en' | 'hi' | 'mr', string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}

function generateSmartAdvice(disease: string, rainChance: number): string {
  let advice = ''

  if (rainChance > 60) {
    advice += 'Heavy rain expected. Avoid spraying and improve drainage. '
  } else if (rainChance > 30) {
    advice += 'Moderate rain possible. Spray carefully. '
  } else {
    advice += 'Dry weather. Safe for spraying. '
  }

  const d = disease.toLowerCase()

  if (d.includes('fungus') || d.includes('fungal')) {
    advice += 'Avoid excess moisture and monitor fungal spread. '
  }

  if (d.includes('pest') || d.includes('insect')) {
    advice += 'Inspect the underside of leaves for insects. '
  }

  if (d.includes('nutrient') || d.includes('deficiency')) {
    advice += 'Consider soil testing and balanced fertilizer planning. '
  }

  return advice.trim()
}

function cleanForVoice(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/[#_`~>-]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

type SectionProps = {
  title: string
  icon: React.ReactNode
  items: string[]
  className?: string
}

function Section({
  title,
  icon,
  items,
  className = 'bg-white/80 ring-slate-100',
}: SectionProps) {
  if (!items.length) return null

  return (
    <div
      className={`rounded-3xl p-4 shadow-sm ring-1 backdrop-blur-xl ${className}`}
    >
      <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
        {icon}
        <span>{title}</span>
      </div>

      <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DetectScreen() {
  const { profile } = useAuth()

  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const pickedFileRef = useRef<File | null>(null)

  const [step, setStep] = useState<Step>('upload')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<DiseaseResult | null>(null)

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [advice, setAdvice] = useState('')

  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const langCode = normaliseLang(profile?.preferredLanguage)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [previewUrl])

  const speakText = useCallback((text: string, lang: 'en' | 'hi' | 'mr') => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(cleanForVoice(text))

    utterance.lang = voiceLangMap[lang]
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const onFile = useCallback((file: File | null) => {
    if (!file) return

    pickedFileRef.current = file

    const url = URL.createObjectURL(file)

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })

    setStep('preview')

    setResult(null)
    setWeather(null)
    setAdvice('')
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setStep('upload')

    pickedFileRef.current = null

    setResult(null)
    setWeather(null)
    setAdvice('')
    setError(null)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }, [])

  const analyze = async () => {
    const file = pickedFileRef.current

    if (!file) {
      setError('Please select an image first.')
      return
    }

    setWorking(true)
    setError(null)

    try {
      const aiResult = await analyzeCropImage({
        file,
        language: langCode,
      })

      const weatherData = await fetchBestWeather()

      const smartAdvice = generateSmartAdvice(
        aiResult.disease,
        weatherData.rainChance,
      )

      setResult(aiResult)
      setWeather(weatherData)
      setAdvice(smartAdvice)

      setStep('result')

      const voiceMsg =
        langCode === 'hi'
          ? `फसल ${aiResult.crop}. समस्या ${aiResult.disease}. सलाह ${smartAdvice}`
          : langCode === 'mr'
            ? `पीक ${aiResult.crop}. समस्या ${aiResult.disease}. सल्ला ${smartAdvice}`
            : `${aiResult.crop}. ${aiResult.disease}. ${smartAdvice}`

      speakText(voiceMsg, langCode)
    } catch (err) {
      console.error(err)

      setError(
        'AI analysis failed. Make sure backend server is running.',
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="min-h-screen space-y-5 bg-gradient-to-b from-[#f4fff6] via-[#ecfff2] to-white pb-28">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-700 via-emerald-600 to-lime-500 p-[1px] shadow-xl shadow-green-900/10">
        <motion.div
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute right-8 top-8 h-6 w-6 rounded-full bg-lime-300 blur-md"
        />

        <div className="rounded-[2rem] bg-white/85 p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-green-100 text-green-800 shadow-inner">
              <Leaf className="h-8 w-8" strokeWidth={2} />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                KrishiMitra Vision AI
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Crop Disease Scanner
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Upload a clear crop photo. AI will explain disease,
                symptoms, causes, weather risk and next action.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        {/* UPLOAD */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-[2rem] border-2 border-dashed border-green-200 bg-white/75 p-6 text-center shadow-inner backdrop-blur-xl"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-green-100">
              <Camera className="h-12 w-12 text-green-700" strokeWidth={1.8} />
            </div>

            <p className="mt-4 text-xl font-black text-slate-900">
              Scan crop image
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Use a close clear leaf/stem/fruit photo for better diagnosis.
            </p>

            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />

            <label
              htmlFor={inputId}
              className="mx-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg shadow-green-900/20 transition hover:scale-[1.02] hover:bg-green-700 active:scale-95"
            >
              <Camera className="h-5 w-5" />
              Choose Image
            </label>
          </motion.div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && previewUrl && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="overflow-hidden rounded-[2rem] border border-green-100 bg-white/85 shadow-xl shadow-green-900/10 backdrop-blur-xl"
          >
            <div className="relative overflow-hidden">
              <img
                src={previewUrl}
                alt="Crop preview"
                className="aspect-[4/3] w-full object-cover"
              />

              {working && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
                  />

                  <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '120%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: 'linear',
                    }}
                    className="absolute left-0 right-0 top-0 h-28 bg-gradient-to-b from-transparent via-green-400/45 to-transparent blur-xl"
                  />

                  <div className="absolute inset-0 grid place-items-center">
                    <div className="rounded-3xl bg-white/95 px-5 py-4 text-center shadow-2xl">
                      <RefreshCw className="mx-auto h-9 w-9 animate-spin text-green-700" />

                      <p className="mt-2 text-sm font-black text-slate-900">
                        AI scanning crop...
                      </p>

                      <p className="text-xs text-slate-500">
                        Checking disease patterns and weather context
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 p-5">
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={working}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 font-bold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-700 disabled:opacity-60"
              >
                {working ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}

                {working ? 'Analyzing...' : 'Analyze Crop'}
              </button>

              <button
                type="button"
                onClick={reset}
                disabled={working}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-green-200 bg-white text-green-800 shadow-sm"
              >
                <RefreshCw className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )}

        {/* RESULT */}
        {step === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {previewUrl && (
              <div className="overflow-hidden rounded-[2rem] border border-green-100 shadow-lg">
                <img
                  src={previewUrl}
                  alt="Analyzed crop"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            )}

            <div className="rounded-[2rem] border border-green-100 bg-white/90 p-5 shadow-xl shadow-green-900/10 backdrop-blur-xl">
              {/* TOP */}
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-800">
                  AI Result
                </span>

                <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
                  {result.confidence} confidence
                </span>
              </div>

              <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                {result.crop}
              </h3>

              <p className="mt-2 text-lg font-bold text-red-700">
                {result.disease}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-800 ring-1 ring-red-100">
                <ShieldAlert className="h-4 w-4" />
                Urgency: {result.urgency}
              </div>

              {/* WEATHER */}
              {weather && (
                <div className="mt-5 rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 ring-1 ring-blue-100">
                  <div className="mb-2 flex items-center gap-2 font-bold text-blue-900">
                    <CloudRain className="h-5 w-5" />
                    Weather Context
                  </div>

                  <p className="text-sm text-blue-900">
                    {weather.place}
                  </p>

                  <div className="mt-3 flex gap-3">
                    <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs text-slate-500">Temperature</p>
                      <p className="text-lg font-black text-slate-900">
                        {weather.tempC}°C
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs text-slate-500">Rain</p>
                      <p className="text-lg font-black text-slate-900">
                        {weather.rainChance}%
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-blue-900">
                    {weather.condition}
                  </p>
                </div>
              )}

              {/* ADVICE */}
              {advice && (
                <div className="mt-5 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 p-4 ring-1 ring-yellow-100">
                  <div className="mb-2 flex items-center gap-2 font-bold text-yellow-900">
                    <Sparkles className="h-5 w-5" />
                    Smart AI Advice
                  </div>

                  <p className="text-sm leading-relaxed text-yellow-900">
                    {advice}
                  </p>
                </div>
              )}

              {/* SECTIONS */}
              <div className="mt-5 space-y-4">
                <Section
                  title="Symptoms"
                  icon={<Activity className="h-5 w-5 text-red-600" />}
                  items={result.symptoms}
                  className="bg-red-50/70 ring-red-100"
                />

                <Section
                  title="Causes"
                  icon={<FlaskConical className="h-5 w-5 text-orange-600" />}
                  items={result.causes}
                  className="bg-orange-50/70 ring-orange-100"
                />

                <Section
                  title="What To Do Now"
                  icon={<Leaf className="h-5 w-5 text-green-700" />}
                  items={result.next_steps}
                  className="bg-green-50/80 ring-green-100"
                />

                <Section
                  title="Prevention"
                  icon={<ShieldAlert className="h-5 w-5 text-blue-700" />}
                  items={result.prevention}
                  className="bg-blue-50/70 ring-blue-100"
                />
              </div>

              {/* SPEAKING */}
              {speaking && (
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800 ring-1 ring-green-100">
                  <Volume2 className="h-5 w-5 animate-pulse" />
                  KrishiMitra is speaking...
                </div>
              )}

              {/* BUTTON */}
              <button
                type="button"
                onClick={reset}
                className="mt-6 w-full rounded-2xl bg-green-600 py-4 text-base font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-green-700 active:scale-[0.99]"
              >
                Scan New Crop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}