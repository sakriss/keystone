import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export const AI_MODEL = 'gemini-2.5-flash-lite'

// Shared helper — gets the generative model
export function getModel() {
  return genai.getGenerativeModel({ model: AI_MODEL })
}

// Strip markdown code fences that models sometimes wrap JSON in
export function extractJSON(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
}
