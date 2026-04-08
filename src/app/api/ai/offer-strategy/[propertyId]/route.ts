import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateOfferStrategy, type OfferStrategyInput } from '@/lib/ai/offer-strategy'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'AI features not configured' }, { status: 503 })

  const { error: premiumError } = await requirePremium(supabase, user.id)
  if (premiumError) return premiumError

  const [
    { data: property },
    { data: preApprovals },
    { data: cachedReport },
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('pre_approvals').select('amount, lender_name').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('ai_reports').select('content, generated_at').eq('property_id', propertyId).eq('report_type', 'offer_strategy').eq('user_id', user.id).gt('expires_at', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!property) return Response.json({ error: 'Property not found' }, { status: 404 })
  if (cachedReport) return Response.json({ ...cachedReport.content, cached: true, generatedAt: cachedReport.generated_at })

  // Get most recent inspection analysis if available
  const { data: inspectionReport } = await supabase
    .from('ai_reports')
    .select('content')
    .eq('property_id', propertyId)
    .eq('report_type', 'inspection_analysis')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get listing cache for comps
  const { data: listingCache } = await supabase
    .from('listing_cache')
    .select('valuation, comparables')
    .eq('property_id', propertyId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  type InspectionContent = {
    totalCostLow?: number
    totalCostHigh?: number
    negotiationTotal?: number
    redFlags?: string[]
    findings?: { severity: string; item: string }[]
  }

  const inspContent = inspectionReport?.content as InspectionContent | undefined

  let inspectionSummary: OfferStrategyInput['inspectionSummary'] | undefined
  if (inspContent) {
    inspectionSummary = {
      totalCostLow: inspContent.totalCostLow ?? 0,
      totalCostHigh: inspContent.totalCostHigh ?? 0,
      negotiationTotal: inspContent.negotiationTotal ?? 0,
      criticalItems: (inspContent.findings ?? [])
        .filter(f => f.severity === 'critical')
        .map(f => f.item)
        .slice(0, 5),
    }
  }

  let comparableValueRange: OfferStrategyInput['comparableValueRange'] | undefined
  if (listingCache?.valuation) {
    const v = listingCache.valuation as { valueLow?: number; valueMid?: number; valueHigh?: number }
    if (v.valueLow && v.valueMid && v.valueHigh) {
      comparableValueRange = { low: v.valueLow, mid: v.valueMid, high: v.valueHigh }
    }
  }

  const input: OfferStrategyInput = {
    property: {
      address: property.address,
      listPrice: property.price,
      daysOnMarket: property.days_on_market,
      status: property.status,
    },
    preApprovals: (preApprovals || []).map(p => ({ amount: p.amount, lender: p.lender_name })),
    inspectionSummary,
    comparableValueRange,
  }

  try {
    const result = await generateOfferStrategy(input)

    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: propertyId,
      report_type: 'offer_strategy',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Offer strategy error:', err)
    return Response.json({ error: 'Strategy generation failed. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('ai_reports')
    .delete()
    .eq('property_id', propertyId)
    .eq('report_type', 'offer_strategy')
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
