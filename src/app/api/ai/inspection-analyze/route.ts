import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeInspectionText, analyzeInspectionPDF } from '@/lib/ai/inspection-analysis'
import { requirePremium } from '@/lib/premium'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: 'AI features not configured' }, { status: 503 })
  }

  const { error: premiumError } = await requirePremium(supabase, user.id)
  if (premiumError) return premiumError

  const body = await req.json() as {
    inspectionId?: string
    propertyId?: string
    text?: string         // paste inspection text directly
    fileUrl?: string      // Supabase storage URL of uploaded PDF
  }

  // Fetch property address for context if propertyId is provided
  let propertyAddress: string | undefined
  if (body.propertyId) {
    const { data: property } = await supabase
      .from('properties')
      .select('address, city, state')
      .eq('id', body.propertyId)
      .single()
    if (property) {
      propertyAddress = [property.address, property.city, property.state].filter(Boolean).join(', ')
    }
  }

  try {
    let result

    if (body.fileUrl) {
      // Download the PDF from Supabase storage and analyze it
      const res = await fetch(body.fileUrl)
      if (!res.ok) throw new Error('Failed to fetch inspection file')
      const arrayBuffer = await res.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      result = await analyzeInspectionPDF(base64, propertyAddress)
    } else if (body.text) {
      result = await analyzeInspectionText(body.text, propertyAddress)
    } else {
      return Response.json({ error: 'Provide either text or fileUrl' }, { status: 400 })
    }

    // Cache the report in ai_reports
    await supabase.from('ai_reports').upsert({
      user_id: user.id,
      property_id: body.propertyId ?? null,
      inspection_id: body.inspectionId ?? null,
      report_type: 'inspection_analysis',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Inspection analysis error:', err)
    return Response.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
