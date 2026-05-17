import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Send, Square, Volume2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { fetchChatHistoryForUser, saveChatTurn } from '../services/chatHistoryService'
import { sendChatMessage } from '../services/aiService'
import { fetchBestWeather, type WeatherSnapshot } from '../services/weatherService'
import { speakOnce, type SpeakLang } from '../lib/voiceUtils'
import type { ChatHistoryRecord } from '../types/models'
import type { ChatMessage } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const welcomeByLanguage: Record<'en' | 'hi' | 'mr', string> = {
  en: 'Namaste! I am KrishiMitra AI. Ask about pests, fertilizer doses, sowing dates, irrigation, or mandi prices — in English, हिंदी, or मराठी.',
  hi: 'नमस्ते! मैं KrishiMitra AI हूँ। कीट, खाद की मात्रा, बुवाई का समय, सिंचाई या मंडी भाव के बारे में पूछें — हिंदी, मराठी या अंग्रेज़ी में।',
  mr: 'नमस्कार! मी KrishiMitra AI आहे. किड, खताचे प्रमाण, पेरणीची वेळ, सिंचन किंवा बाजार भावाबद्दल विचारा — मराठी, हिंदी किंवा इंग्रजीत.',
}

const voiceLangMap: Record<'en' | 'hi' | 'mr', string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
}

// Debounce before auto-sending a voice transcript (ms)
const VOICE_SEND_DEBOUNCE_MS = 1100

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function normaliseLang(l?: string): 'en' | 'hi' | 'mr' {
  const v = (l ?? '').toLowerCase().trim()
  if (['hi', 'hindi', 'हिंदी', 'हिन्दी'].includes(v)) return 'hi'
  if (['mr', 'marathi', 'मराठी'].includes(v)) return 'mr'
  return 'en'
}

function detectMessageLang(text: string, fallback: 'en' | 'hi' | 'mr'): 'en' | 'hi' | 'mr' {
  const devanagariChars = text.match(/[\u0900-\u097F]/g)?.length ?? 0
  const totalLetters = text.match(/[A-Za-z\u0900-\u097F]/g)?.length ?? 0

  if (devanagariChars > 0 && devanagariChars / Math.max(totalLetters, 1) > 0.25) {
    const marathiWords = [
      'माझ्या', 'माझा', 'माझी', 'माझे', 'मला', 'आहे', 'आहेत', 'काय', 'करू',
      'करायचं', 'पिकाला', 'झाडाला', 'पाणी', 'द्या', 'दिसत', 'पिवळे', 'डाग',
      'मराठी', 'टोमॅटो', 'भाजीपाला', 'शेत', 'खत', 'किड', 'रोग',
    ]

    const hindiWords = [
      'मेरे', 'मेरा', 'मेरी', 'मुझे', 'है', 'हैं', 'क्या', 'करूं', 'करना',
      'फसल', 'पौधे', 'पानी', 'देना', 'दिख', 'पीले', 'दाग', 'हिंदी',
      'टमाटर', 'सब्जी', 'खेत', 'खाद', 'कीट', 'रोग',
    ]

    const mrScore = marathiWords.filter((w) => text.includes(w)).length
    const hiScore = hindiWords.filter((w) => text.includes(w)).length

    if (mrScore > hiScore) return 'mr'
    if (hiScore > mrScore) return 'hi'

    return fallback
  }

  return fallback
}

function languageLabel(code: 'en' | 'hi' | 'mr'): string {
  if (code === 'hi') return 'हिंदी'
  if (code === 'mr') return 'मराठी'
  return 'English'
}

function recordsToMessages(records: ChatHistoryRecord[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const r of records) {
    out.push({ id: `${r.id}-u`, role: 'user', lang: r.language || 'You', text: r.userMessage })
    out.push({ id: `${r.id}-a`, role: 'assistant', lang: 'KrishiMitra', text: r.aiResponse })
  }
  return out
}

function weatherLine(w: WeatherSnapshot): string {
  return `Current weather near farmer: ${w.place}, ${w.tempC}°C, ${w.condition}, humidity ${w.humidity}%, rain chance ${w.rainChance}%.`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIScreen() {
  const { user, profile } = useAuth()
  const inputId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  const langCode = normaliseLang(profile?.preferredLanguage)
  const sessionIdRef = useRef<string | undefined>(undefined)

  // Voice-send deduplication
  const lastVoiceTranscriptRef = useRef('')
  const voiceSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use a ref for sending state so closures inside timeout see the latest value
  const sendingRef = useRef(false)
  // Cancel TTS on unmount
  const cancelSpeakRef = useRef<(() => void) | null>(null)

  const welcome: ChatMessage = useMemo(
    () => ({ id: 'welcome', role: 'assistant', lang: 'KrishiMitra', text: welcomeByLanguage[langCode] }),
    [langCode],
  )

  const [messages, setMessages] = useState<ChatMessage[]>([welcome])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [text, setText] = useState('')
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  const voice = useSpeechRecognition(voiceLangMap[langCode])
  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending])

  // -------------------------------------------------------------------------
  // Scroll helper
  // -------------------------------------------------------------------------
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  // -------------------------------------------------------------------------
  // TTS helper — delegates to shared speakOnce
  // -------------------------------------------------------------------------
  const speakText = useCallback(async (replyText: string, lang: SpeakLang) => {
    // Cancel current speech before starting new (prevents overlap)
    cancelSpeakRef.current?.()
    setSpeaking(false)

    const cancel = await speakOnce(
      replyText,
      lang,
      () => setSpeaking(true),
      () => setSpeaking(false),
    )
    cancelSpeakRef.current = cancel
  }, [])

  // -------------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (rawText?: string) => {
      const t = (rawText ?? text).trim()
      if (!t || !user || sendingRef.current) return

      const messageLang = detectMessageLang(t, langCode)

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        lang: languageLabel(messageLang),
        text: t,
      }

      setMessages((prev) => [...prev, userMsg])
      setText('')
      setSending(true)
      sendingRef.current = true
      scrollToBottom()

      try {
        const currentHistory = [...messages.slice(-6), userMsg].map((m) => ({
          role: m.role,
          content: m.text,
        }))

        const contextPrefix = weather ? `${weatherLine(weather)}\n` : ''
        const enrichedMessage = contextPrefix ? `${contextPrefix}\n${t}` : t

        const res = await sendChatMessage({
          message: enrichedMessage,
          language: messageLang,
          sessionId: sessionIdRef.current,
          history: currentHistory.slice(0, -1),
        })

        sessionIdRef.current = res.sessionId

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          lang: 'KrishiMitra',
          text: res.reply,
        }

        setMessages((prev) => [...prev, assistantMsg])
        scrollToBottom()
        void speakText(res.reply, messageLang)

        void saveChatTurn({
          userId: user.uid,
          userMessage: t,
          aiResponse: res.reply,
          language: messageLang,
        }).catch((e) => import.meta.env.DEV && console.error('[AIScreen] saveChatTurn', e))
      } finally {
        setSending(false)
        sendingRef.current = false
      }
    },
    [text, user, langCode, messages, scrollToBottom, weather, speakText],
  )

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Weather
  useEffect(() => {
    void fetchBestWeather().then(setWeather).catch(() => setWeather(null))
  }, [])

  // Cleanup TTS and timers on unmount
  useEffect(() => {
    return () => {
      cancelSpeakRef.current?.()
      if (voiceSendTimerRef.current) clearTimeout(voiceSendTimerRef.current)
    }
  }, [])

  // Sync voice transcript → text input (show what was heard)
  useEffect(() => {
    const finalText = voice.transcript.trim()
    if (!finalText) return
    setText(finalText)
  }, [voice.transcript])

  // Auto-send when voice reaches 'processing' state
  useEffect(() => {
    const finalText = voice.transcript.trim()

    // Only trigger when processing & have text & no interim & not already sending
    if (voice.status !== 'processing' || !finalText || voice.interim.trim() || sendingRef.current) {
      return
    }

    // Deduplicate: don't resend the same transcript
    if (lastVoiceTranscriptRef.current === finalText) return
    lastVoiceTranscriptRef.current = finalText

    // Clear any pending timer
    if (voiceSendTimerRef.current) clearTimeout(voiceSendTimerRef.current)

    voiceSendTimerRef.current = setTimeout(() => {
      // Double-check conditions are still valid inside the callback
      const stableText = voice.transcript.trim()
      if (!stableText || stableText !== finalText || sendingRef.current) return

      void sendMessage(stableText)
      voice.reset()
      lastVoiceTranscriptRef.current = ''
    }, VOICE_SEND_DEBOUNCE_MS)

    return () => {
      if (voiceSendTimerRef.current) clearTimeout(voiceSendTimerRef.current)
    }
  }, [voice.status, voice.transcript, voice.interim, sendMessage, voice])

  // Load chat history
  const loadHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)

    try {
      const rows = await fetchChatHistoryForUser(user.uid)
      const fromDb = recordsToMessages(rows)
      setMessages(fromDb.length > 0 ? [welcome, ...fromDb] : [welcome])
    } catch (e) {
      if (import.meta.env.DEV) console.error('[AIScreen] load history', e)
      setMessages([welcome])
    } finally {
      setHistoryLoading(false)
    }
  }, [user, welcome])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // -------------------------------------------------------------------------
  // Voice toggle
  // -------------------------------------------------------------------------
  const toggleVoice = useCallback(() => {
    if (!voice.supported) return

    if (voice.status === 'listening' || voice.status === 'restarting') {
      if (voiceSendTimerRef.current) clearTimeout(voiceSendTimerRef.current)
      voice.stop()
      return
    }

    setText('')
    lastVoiceTranscriptRef.current = ''
    voice.reset()
    voice.start({ lang: voiceLangMap[langCode] })
  }, [voice, langCode])

  // -------------------------------------------------------------------------
  // Derived UI state
  // -------------------------------------------------------------------------
  const isListening = voice.status === 'listening' || voice.status === 'restarting'

  const micButtonClass = (() => {
    if (!voice.supported) return 'bg-slate-100 text-slate-400 cursor-not-allowed'
    if (isListening) return 'bg-red-500 text-white shadow-md ring-2 ring-red-200 animate-pulse'
    return 'bg-green-100 text-green-800 hover:scale-105 hover:bg-green-200 hover:text-green-900 active:scale-95'
  })()

  const MicIcon = voice.supported ? (isListening ? Square : Mic) : MicOff

  // Show interim in textarea while listening
  const textareaValue = isListening && voice.interim ? voice.interim : text

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col pb-28 pt-2">
      {/* Info banner */}
      <div className="mb-3 rounded-3xl border border-green-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">AI assistant</p>
        <p className="text-sm text-slate-600">
          English · हिंदी · मराठी — tap the mic to speak, or type your question.
        </p>

        {voice.error && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-100">
            {voice.error}
          </p>
        )}

        {voice.status === 'listening' && (
          <p className="mt-2 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 ring-1 ring-green-100">
            🎙️ Listening… speak now.
          </p>
        )}

        {voice.status === 'restarting' && (
          <p className="mt-2 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
            ↺ Reconnecting microphone…
          </p>
        )}

        {voice.status === 'processing' && (
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            Processing speech… sending shortly.
          </p>
        )}

        {historyLoading && <p className="mt-1 text-xs text-slate-500">Loading your past chats…</p>}
      </div>

      {/* Chat log */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-3xl bg-[#e8f7ec] px-3 pb-28 pt-4 [-webkit-overflow-scrolling:touch]"
        role="log"
        aria-live="polite"
        data-testid="ai-chat-log"
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-green-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-md'
                  : 'max-w-[90%] rounded-2xl rounded-bl-md border border-green-100 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm'
              }
            >
              <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${m.role === 'user' ? 'text-white/85' : 'text-green-700'}`}>
                {m.lang}
              </p>
              <p className={`whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : ''}`}>{m.text}</p>
            </div>
          </motion.div>
        ))}

        {/* Interim transcript bubble */}
        {isListening && voice.interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-green-500/80 px-4 py-3 text-[15px] leading-relaxed text-white shadow-md">
              {voice.interim}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start" data-testid="ai-typing-indicator">
            <div className="rounded-2xl rounded-bl-md border border-green-100 bg-white px-4 py-3 text-slate-500 shadow-sm">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500 [animation-delay:200ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500 [animation-delay:400ms]" />
              </span>
            </div>
          </div>
        )}

        {/* Speaking indicator */}
        {speaking && (
          <div className="flex justify-start" data-testid="ai-speaking-indicator">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-green-100 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm">
              <Volume2 className="h-4 w-4 animate-pulse" />
              KrishiMitra बोल रहा है…
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 mx-auto max-w-lg px-3">
        <div className="flex items-end gap-2 rounded-3xl border border-green-100 bg-white p-2 shadow-xl shadow-green-900/10">
          <label htmlFor={inputId} className="sr-only">
            Message
          </label>

          <textarea
            id={inputId}
            rows={1}
            value={textareaValue}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={isListening ? 'Listening…' : 'Message… / संदेश… / संदेश…'}
            readOnly={isListening}
            data-testid="ai-input"
            className="max-h-28 min-h-[48px] flex-1 resize-none rounded-2xl bg-slate-50 px-3 py-3 text-base text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-green-500"
          />

          <button
            type="button"
            onClick={toggleVoice}
            disabled={!voice.supported}
            title={
              !voice.supported
                ? 'Voice input not supported'
                : isListening
                  ? 'Stop listening'
                  : 'Speak your question'
            }
            aria-label={isListening ? 'Stop listening' : 'Speak your question'}
            aria-pressed={isListening}
            data-testid="ai-voice-btn"
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-200 ease-out ${micButtonClass}`}
          >
            <MicIcon className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!canSend}
            title="Send message"
            aria-label="Send message"
            data-testid="ai-send-btn"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md transition duration-200 ease-out hover:scale-105 hover:bg-green-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:scale-100"
          >
            <Send className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}