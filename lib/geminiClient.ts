import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({ model: DEFAULT_MODEL })
}

export async function generateTextWithGemini(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const model = getGeminiModel()
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n[사용자 요청]\n${prompt}`
    : prompt

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
    },
  })

  return result.response.text().trim()
}

