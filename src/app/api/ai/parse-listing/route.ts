import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel, extractJSON } from '@/lib/ai/client'

export interface ParsedListing {
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  notes: string | null
  confidence: 'high' | 'medium' | 'low'
  fieldsFound: string[]
}

function stripHTML(html: string): string {
  // Remove entire blocks we don't want (scripts, styles, svg, etc.)
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Truncate — 12,000 chars is plenty for a listing page's text content
  return text.slice(0, 12000)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'AI features not configured' }, { status: 503 })

  const { url } = await req.json() as { url: string }

  if (!url || !URL.canParse(url)) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch the listing page
  let pageText: string
  try {
    const res = await fetch(url, {
      headers: {
        // Mimic a real browser to improve success rate on listing sites
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return Response.json(
        { error: `Couldn't fetch that listing (${res.status}). The site may block automated access — try entering details manually.` },
        { status: 422 }
      )
    }

    const html = await res.text()

    // If we got back a tiny response it's likely a bot-detection redirect
    if (html.length < 500) {
      return Response.json(
        { error: "This site returned an empty page — it likely blocks automated access. Try a different listing site or enter details manually." },
        { status: 422 }
      )
    }

    pageText = stripHTML(html)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json(
      { error: `Failed to load that URL: ${msg}` },
      { status: 422 }
    )
  }

  // Ask Gemini to extract the property fields
  let rawText = ''
  try {
    const model = getModel()
    const result = await model.generateContent(`You are a real estate data extractor. From the text content of a property listing page, extract the property details.

PAGE TEXT:
${pageText}

Return ONLY a valid JSON object. No explanation, no markdown, no code fences — just the raw JSON.
{
  "address": "street address only, no city/state/zip" or null,
  "city": "city name" or null,
  "state": "2-letter state code" or null,
  "zip": "5-digit zip code" or null,
  "price": number or null,
  "beds": number or null,
  "baths": number or null,
  "sqft": number or null,
  "yearBuilt": number or null,
  "notes": "1-2 sentence description" or null,
  "confidence": "high" or "medium" or "low",
  "fieldsFound": ["address", "price", ...]
}`)

    rawText = result.response.text()

    // Try to find a JSON object anywhere in the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response:', rawText.slice(0, 500))
      return Response.json(
        { error: `Couldn't extract property details from this listing. Try a different URL or enter manually.` },
        { status: 422 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedListing
    return Response.json(parsed)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Listing parse error:', message, '\nRaw Gemini output:', rawText.slice(0, 500))

    if (message.includes('429') || message.toLowerCase().includes('too many') || message.toLowerCase().includes('quota')) {
      return Response.json(
        { error: 'Rate limit hit — wait a moment and try again.' },
        { status: 429 }
      )
    }

    return Response.json(
      { error: `AI extraction failed: ${message}` },
      { status: 500 }
    )
  }
}
