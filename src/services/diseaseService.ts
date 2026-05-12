const DISEASE_ENDPOINT =
  import.meta.env.VITE_DISEASE_ENDPOINT?.toString().trim() ||
  'http://127.0.0.1:8001/api/ai/disease'

export type DiseaseResult = {
  crop: string
  disease: string
  confidence: string
  urgency: string
  symptoms: string[]
  causes: string[]
  next_steps: string[]
  prevention: string[]
  language: 'en' | 'hi' | 'mr'
  source: 'llm' | 'fallback'
}

function normaliseDiseaseLanguage(
  language: string,
): 'en' | 'hi' | 'mr' {
  const v = language.toLowerCase().trim()

  if (
    ['hi', 'hindi', 'हिंदी', 'हिन्दी'].includes(v)
  ) {
    return 'hi'
  }

  if (
    ['mr', 'marathi', 'मराठी'].includes(v)
  ) {
    return 'mr'
  }

  return 'en'
}

export async function analyzeCropImage(input: {
  file: File
  language: 'en' | 'hi' | 'mr' | string
  crop?: string
}): Promise<DiseaseResult> {
  const language = normaliseDiseaseLanguage(
    input.language,
  )

  const formData = new FormData()

  formData.append('image', input.file)
  formData.append('language', language)
  formData.append('crop', input.crop || '')

  const res = await fetch(DISEASE_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(
      `Disease analysis failed: ${res.status}`,
    )
  }

  return await res.json()
}