export type AiLanguage = 'en' | 'hi' | 'mr'

export type AiHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatRequest = {
  message: string
  language?: string
  sessionId?: string
  history?: AiHistoryMessage[]
}

export type ChatResponse = {
  reply: string
  language: AiLanguage
  sessionId: string
  source: 'llm' | 'fallback' | 'network-fallback'
}

const AI_ENDPOINT =
  import.meta.env.VITE_AI_ENDPOINT?.toString().trim() ||
  'http://127.0.0.1:8001/api/ai/chat'

const MOCK_REPLIES: Record<AiLanguage, string> = {
  en: 'I am offline right now. Please try again after a moment.',
  hi: 'अभी मैं ऑफलाइन हूँ। कृपया थोड़ी देर बाद फिर कोशिश करें।',
  mr: 'सध्या मी ऑफलाइन आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
}

export function normaliseLang(l?: string): AiLanguage {
  const v = (l ?? '').toLowerCase().trim()
  if (['hi', 'hindi', 'हिंदी', 'हिन्दी'].includes(v)) return 'hi'
  if (['mr', 'marathi', 'मराठी'].includes(v)) return 'mr'
  return 'en'
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const language = normaliseLang(req.language)

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: req.message,
        language,
        session_id: req.sessionId,
        history: req.history ?? [],
      }),
    })

    if (!res.ok) throw new Error(`AI endpoint returned HTTP ${res.status}`)

    const data = await res.json()

    return {
      reply: data.reply,
      language: data.language,
      sessionId: data.session_id,
      source: data.source,
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[KrishiMitra][ai] fallback', err)
    }

    return {
      reply: MOCK_REPLIES[language],
      language,
      sessionId: req.sessionId ?? `local-${Date.now()}`,
      source: 'network-fallback',
    }
  }
}