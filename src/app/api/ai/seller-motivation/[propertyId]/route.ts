import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateSellerMotivationReport, type SellerMotivationInput } from '@/lib/ai/seller-motivation'

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
    { data: pros },
    { data: cons },
    { data: visits },
    { data: offers },
    { data: inspections },
    { data: cachedReport },
    { data: listingCache },
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('property_pros_cons').select('text').eq('property_id', propertyId).eq('type', 'pro'),
    supabase.from('property_pros_cons').select('text').eq('property_id', propertyId).eq('type', 'con'),
    supabase.from('property_visits').select('overall_rating, notes').eq('property_id', propertyId).order('visited_at', { ascending: false }).limit(5),
    supabase.from('offers').select('amount, status, offered_at').eq('property_id', propertyId).order('offered_at', { ascending: false }),
    supabase.from('inspections').select('*, inspection_items(priority, status)').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('ai_reports').select('content, generated_at').eq('property_id', propertyId).eq('report_type', 'seller_motivation').eq('user_id', user.id).gt('expires_at', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('listing_cache').select('valuation').eq('property_id', propertyId).gt('expires_at', new Date().toISOString()).maybeSingle(),
  ])

  if (!property) return Response.json({ error: 'Property not found' }, { status: 404 })

  if (cachedReport) {
    return Response.json({ ...cachedReport.content, cached: true, generatedAt: cachedReport.generated_at })
  }

  // Inspection issue summary
  type InspItem = { priority: string; status: string }
  let inspectionIssueCount: SellerMotivationInput['inspectionIssueCount'] | undefined
  if (inspections && inspections.length > 0) {
    const items = (inspections[0].inspection_items as InspItem[]) || []
    inspectionIssueCount = {
      critical: items.filter(i => i.priority === 'high' && i.status === 'open').length,
      major: items.filter(i => i.priority === 'medium' && i.status === 'open').length,
    }
  }

  // Comparable value range
  let comparableValueRange: SellerMotivationInput['comparableValueRange'] | undefined
  if (listingCache?.valuation) {
    const v = listingCache.valuation as { valueLow?: number; valueMid?: number; valueHigh?: number }
    if (v.valueLow && v.valueMid && v.valueHigh) {
      comparableValueRange = { low: v.valueLow, mid: v.valueMid, high: v.valueHigh }
    }
  }

  // Days since property was added (proxy for market time)
  const daysTracked = property.created_at
    ? Math.floor((Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : undefined

  const input: SellerMotivationInput = {
    property: {
      address: property.address,
      city: property.city,
      state: property.state,
      price: property.price,
      status: property.status,
      yearBuilt: property.year_built,
      daysTracked,
    },
    offers: (offers || []).map(o => ({ amount: o.amount, status: o.status, offered_at: o.offered_at })),
    pros: (pros || []).map(p => p.text),
    cons: (cons || []).map(c => c.text),
    visits: (visits || []).map(v => ({ overall_rating: v.overall_rating, notes: v.notes })),
    inspectionIssueCount,
    comparableValueRange,
  }

  try {
    const result = await generateSellerMotivationReport(input)

    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: propertyId,
      report_type: 'seller_motivation',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Seller motivation report error:', err)
    return Response.json({ error: 'Report generation failed. Please try again.' }, { status: 500 })
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
    .eq('report_type', 'seller_motivation')
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
