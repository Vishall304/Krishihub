import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Status = 'idle' | 'listening' | 'error' | 'unsupported'

export type UseSpeechRecognitionResult = {
  supported: boolean
  status: Status
  transcript: string
  interim: string
  error: string | null
  start: (opts?: { lang?: string }) => void
  stop: () => void
  reset: () => void
}

type RecognitionResult = {
  0: { transcript: string }
  isFinal: boolean
  length: number
}

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string; message?: string }) => void) | null
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(defaultLang = 'en-IN'): UseSpeechRecognitionResult {
  const Ctor = useMemo(() => getRecognitionCtor(), [])
  const supported = Boolean(Ctor)

  const recognitionRef = useRef<Recognition | null>(null)
  const manuallyStoppedRef = useRef(false)

  const [status, setStatus] = useState<Status>(supported ? 'idle' : 'unsupported')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback(
    ({ lang }: { lang?: string } = {}) => {
      if (!Ctor) {
        setStatus('unsupported')
        setError('Speech recognition is not supported in this browser. Use Chrome or Edge.')
        return
      }

      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }

      manuallyStoppedRef.current = false

      const recognition = new Ctor()
      recognition.lang = lang || defaultLang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setStatus('listening')
        setError(null)
        setTranscript('')
        setInterim('')
      }

      recognition.onend = () => {
        setInterim('')
        setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
      }

      recognition.onerror = (e) => {
        const code = e?.error ?? 'unknown'

        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError('Microphone permission blocked. Click the lock icon near URL and allow microphone.')
        } else if (code === 'no-speech') {
          setError("Didn't catch that. Speak clearly and try again.")
        } else if (code === 'audio-capture') {
          setError('No microphone detected. Check your device mic.')
        } else if (code === 'network') {
          setError('Speech recognition network error. Check internet connection.')
        } else if (code === 'aborted') {
          setError(null)
        } else {
          setError(e?.message || `Speech recognition error: ${code}`)
        }

        if (code !== 'aborted') setStatus('error')
      }

      recognition.onresult = (ev) => {
        let finalText = ''
        let interimText = ''

        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          const item = ev.results[i]
          const text = item?.[0]?.transcript ?? ''

          if (item?.isFinal) finalText += text
          else interimText += text
        }

        if (finalText.trim()) {
          setTranscript((prev) => `${prev} ${finalText}`.trim())
        }

        setInterim(interimText.trim())
      }

      recognitionRef.current = recognition

      try {
        recognition.start()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start microphone.')
        setStatus('error')
      }
    },
    [Ctor, defaultLang],
  )

  const stop = useCallback(() => {
    manuallyStoppedRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    try {
      recognitionRef.current?.abort()
    } catch {
      // ignore
    }
    setTranscript('')
    setInterim('')
    setError(null)
    setStatus(supported ? 'idle' : 'unsupported')
  }, [supported])

  return { supported, status, transcript, interim, error, start, stop, reset }
}