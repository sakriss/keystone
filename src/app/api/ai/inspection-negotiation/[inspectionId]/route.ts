import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateNegotiationScript, type InspectionNegotiationInput } from '@/lib/ai/inspection-negotiation'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  const { inspectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'AI features not configured' }, { status: 503 })

  const { error: premiumError } = await requirePremium(supabase, user.id)
  if (premiumError) return premiumError

  const [
    { data: inspection },
    { data: cachedReport },
  ] = await Promise.all([
    supabase.from('inspections').select('*, inspection_items(*), properties(address, city, state)').eq('id', inspectionId).single(),
    supabase.from('ai_reports').select('content, generated_at').eq('inspection_id', inspectionId).eq('report_type', 'inspection_negotiation').eq('user_id', user.id).gt('expires_at', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!inspection) return Response.json({ error: 'Inspection not found' }, { status: 404 })
  if (inspection.status !== 'completed') return Response.json({ error: 'Inspection must be completed first' }, { status: 400 })

  if (cachedReport) {
    return Response.json({ ...cachedReport.content, cached: true, generatedAt: cachedReport.generated_at })
  }

  // Get most recent offer for this property
  const property = inspection.properties as { address: string; city: string | null; state: string | null } | null
  let currentOfferAmount: number | null = null
  if (inspection.property_id) {
    const { data: latestOffer } = await supabase
      .from('offers')
      .select('amount')
      .eq('property_id', inspection.property_id)
      .in('status', ['pending', 'countered', 'accepted'])
      .order('offered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    currentOfferAmount = latestOffer?.amount ?? null
  }

  type InspItem = {
    id: string
    description: string
    priority: 'high' | 'medium' | 'low'
    status: string
    category: string | null
    estimated_cost: number | null
    notes: string | null
  }

  const allItems = (inspection.inspection_items as InspItem[]) || []
  // Only include open high/medium priority items — these are what to negotiate
  const negotiableItems = allItems.filter(
    i => i.status === 'open' && (i.priority === 'high' || i.priority === 'medium')
  )

  if (negotiableItems.length === 0) {
    return Response.json({ error: 'No open high or medium priority items found to negotiate.' }, { status: 400 })
  }

  const totalRepairLow = negotiableItems.reduce((s, i) => s + (i.estimated_cost || 0) * 0.7, 0)
  const totalRepairHigh = negotiableItems.reduce((s, i) => s + (i.estimated_cost || 0) * 1.3, 0)

  const input: InspectionNegotiationInput = {
    property: {
      address: property?.address ?? 'Unknown',
      city: property?.city,
      state: property?.state,
    },
    currentOfferAmount,
    inspectionItems: negotiableItems.map(i => ({
      description: i.description,
      priority: i.priority,
      category: i.category,
      estimated_cost: i.estimated_cost,
      notes: i.notes,
    })),
    totalRepairLow: Math.round(totalRepairLow),
    totalRepairHigh: Math.round(totalRepairHigh),
  }

  try {
    const result = await generateNegotiationScript(input)

    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: inspection.property_id ?? null,
      inspection_id: inspectionId,
      report_type: 'inspection_negotiation',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Negotiation script error:', err)
    return Response.json({ error: 'Script generation failed. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  const { inspectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('ai_reports')
    .delete()
    .eq('inspection_id', inspectionId)
    .eq('report_type', 'inspection_negotiation')
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
