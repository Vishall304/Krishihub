/**
 * useSpeechRecognition.ts
 *
 * Full rewrite — fixes:
 *  ✔ Transcript instability (iterates from resultIndex, not 0)
 *  ✔ Auto-restart if browser stops unexpectedly (onend without manual stop)
 *  ✔ Mobile browser compatibility (forces continuous=false on iOS)
 *  ✔ Unsupported browser graceful handling
 *  ✔ Debounced final transcript (only committed on isFinal)
 *  ✔ Better Marathi/Hindi lang normalisation
 *  ✔ TypeScript error-free with proper Web API types
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpeechStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'restarting'
  | 'error'
  | 'unsupported'

export type UseSpeechRecognitionResult = {
  supported: boolean
  status: SpeechStatus
  transcript: string
  interim: string
  error: string | null
  /** Number of times recognition has been auto-restarted this session */
  restartCount: number
  start: (opts?: { lang?: string }) => void
  stop: () => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Internal Web API shim types (avoids importing lib.dom.d.ts extras)
// ---------------------------------------------------------------------------

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  readonly error: string
  readonly message?: string
}

interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type ISpeechRecognitionCtor = new () => ISpeechRecognition

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecognitionCtor(): ISpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: ISpeechRecognitionCtor
    webkitSpeechRecognition?: ISpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function normaliseRecognitionLang(lang?: string): string {
  const v = (lang ?? '').toLowerCase().trim()
  if (v.includes('mr') || v === 'marathi' || v === 'mr-in') return 'mr-IN'
  if (v.includes('hi') || v === 'hindi' || v === 'hi-in') return 'hi-IN'
  if (v.startsWith('mr')) return 'mr-IN'
  if (v.startsWith('hi')) return 'hi-IN'
  if (v.startsWith('en')) return 'en-IN'
  return 'en-IN'
}

/** True on iOS Safari which doesn't support continuous recognition reliably */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

const AUTO_RESTART_DELAY_MS = 350
const MAX_AUTO_RESTARTS = 5

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpeechRecognition(defaultLang = 'en-IN'): UseSpeechRecognitionResult {
  const Ctor = useMemo(() => getRecognitionCtor(), [])
  const supported = Boolean(Ctor)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const manuallyStoppedRef = useRef(false)
  const hasFinalRef = useRef(false)
  const langRef = useRef(defaultLang)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoRestartCountRef = useRef(0)
  const errorCodeRef = useRef<string | null>(null)

  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [restartCount, setRestartCount] = useState(0)

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      manuallyStoppedRef.current = true
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      try { recognitionRef.current?.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [])

  // -------------------------------------------------------------------------
  // Core: create & wire up a recognition instance
  // -------------------------------------------------------------------------
  const attachRecognition = useCallback(
    (lang: string) => {
      if (!Ctor) return

      // Abort any existing session
      try { recognitionRef.current?.abort() } catch { /* ignore */ }

      const recognition = new Ctor()
      recognition.lang = normaliseRecognitionLang(lang)
      // iOS Safari doesn't support continuous mode reliably
      recognition.continuous = !isIOS()
      recognition.interimResults = true
      recognition.maxAlternatives = 3 // get alternatives for better accuracy

      recognition.onstart = () => {
        setStatus('listening')
        setError(null)
        hasFinalRef.current = false
        errorCodeRef.current = null
      }

      recognition.onend = () => {
        setInterim('')

        if (manuallyStoppedRef.current) {
          setStatus(hasFinalRef.current ? 'processing' : 'idle')
          return
        }

        // If a hard error occurred, don't auto-restart
        const code = errorCodeRef.current
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          setStatus('error')
          return
        }

        // If we got a final result, go to processing (don't restart)
        if (hasFinalRef.current) {
          setStatus('processing')
          return
        }

        // Unexpected stop: auto-restart if under the limit
        if (autoRestartCountRef.current < MAX_AUTO_RESTARTS) {
          autoRestartCountRef.current += 1
          setRestartCount((n) => n + 1)
          setStatus('restarting')

          restartTimerRef.current = setTimeout(() => {
            if (!manuallyStoppedRef.current) {
              attachRecognition(langRef.current)
            }
          }, AUTO_RESTART_DELAY_MS)
          return
        }

        setStatus('idle')
      }

      recognition.onerror = (e) => {
        const code = e?.error ?? 'unknown'
        errorCodeRef.current = code

        if (code === 'aborted') {
          // Aborted by us — not an error
          setError(null)
          return
        }

        if (code === 'no-speech') {
          // No-speech is normal; clear error so UI is clean
          setError(null)
          return
        }

        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError('Microphone permission blocked. Click the lock icon near the URL and allow microphone.')
          setStatus('error')
          return
        }

        if (code === 'audio-capture') {
          setError('No microphone detected. Check your device mic.')
          setStatus('error')
          return
        }

        if (code === 'network') {
          setError('Speech recognition network error. Check internet connection.')
          // Allow auto-restart for transient network errors
          return
        }

        setError(e?.message || `Speech recognition error: ${code}`)
      }

      recognition.onresult = (ev) => {
        // Iterate from resultIndex so we don't re-process prior finals
        let finalChunk = ''
        let interimChunk = ''

        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i]
          // Pick best alternative (index 0 is highest confidence)
          const text = result[0]?.transcript ?? ''

          if (result.isFinal) {
            finalChunk += `${text} `
            hasFinalRef.current = true
          } else {
            interimChunk += text
          }
        }

        if (finalChunk.trim()) {
          setTranscript((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()))
        }

        setInterim(interimChunk.trim())
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start microphone.')
        setStatus('error')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Ctor],
  )

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  const start = useCallback(
    ({ lang }: { lang?: string } = {}) => {
      if (!Ctor) {
        setStatus('unsupported')
        setError('Speech recognition is not supported in this browser. Use Chrome or Edge.')
        return
      }

      const resolvedLang = normaliseRecognitionLang(lang ?? defaultLang)
      langRef.current = resolvedLang
      manuallyStoppedRef.current = false
      hasFinalRef.current = false
      autoRestartCountRef.current = 0
      errorCodeRef.current = null

      setTranscript('')
      setInterim('')
      setError(null)
      setRestartCount(0)

      attachRecognition(resolvedLang)
    },
    [Ctor, defaultLang, attachRecognition],
  )

  const stop = useCallback(() => {
    manuallyStoppedRef.current = true
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    setInterim('')
    setStatus(hasFinalRef.current ? 'processing' : 'idle')
  }, [])

  const reset = useCallback(() => {
    manuallyStoppedRef.current = true
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch { /* ignore */ }
    recognitionRef.current = null
    hasFinalRef.current = false
    autoRestartCountRef.current = 0
    errorCodeRef.current = null
    setTranscript('')
    setInterim('')
    setError(null)
    setRestartCount(0)
    setStatus(supported ? 'idle' : 'unsupported')
  }, [supported])

  return { supported, status, transcript, interim, error, restartCount, start, stop, reset }
}