import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateShouldIBuyReport, type ShouldIBuyInput } from '@/lib/ai/should-i-buy'

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

  // Gather all property data
  const [
    { data: property },
    { data: pros },
    { data: cons },
    { data: visits },
    { data: inspections },
    { data: offers },
    { data: budgetItems },
    { data: userSettings },
    { data: cachedReport },
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('property_pros_cons').select('text').eq('property_id', propertyId).eq('type', 'pro'),
    supabase.from('property_pros_cons').select('text').eq('property_id', propertyId).eq('type', 'con'),
    supabase.from('property_visits').select('visited_at, overall_rating, notes').eq('property_id', propertyId).order('visited_at', { ascending: false }).limit(5),
    supabase.from('inspections').select('*, inspection_items(*)').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('offers').select('amount, status').eq('property_id', propertyId).order('offered_at', { ascending: false }),
    supabase.from('budget_items').select('estimated_monthly, frequency').eq('user_id', user.id),
    supabase.from('user_settings').select('monthly_budget_target').eq('user_id', user.id).maybeSingle(),
    supabase.from('ai_reports').select('content, generated_at').eq('property_id', propertyId).eq('report_type', 'should_i_buy').eq('user_id', user.id).gt('expires_at', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!property) return Response.json({ error: 'Property not found' }, { status: 404 })

  // Return cached report if fresh
  if (cachedReport) {
    return Response.json({ ...cachedReport.content, cached: true, generatedAt: cachedReport.generated_at })
  }

  // Calculate monthly cost of ownership
  type BudgetItem = { estimated_monthly: number; frequency: string }
  const monthlyTotal = (budgetItems as BudgetItem[] | null)?.reduce((sum, item) => {
    if (item.frequency === 'annual') return sum + item.estimated_monthly / 12
    if (item.frequency === 'one_time') return sum
    return sum + item.estimated_monthly
  }, 0) ?? 0

  // Summarize inspection data
  type InspectionItem = { priority: string; status: string; estimated_cost?: number; description?: string }
  let inspectionFindings: ShouldIBuyInput['inspectionFindings'] | undefined
  if (inspections && inspections.length > 0) {
    const items = (inspections[0].inspection_items as InspectionItem[]) || []
    const critical = items.filter(i => i.priority === 'high' && i.status === 'open')
    const major = items.filter(i => i.priority === 'medium' && i.status === 'open')
    const totalLow = items.reduce((s, i) => s + (i.estimated_cost || 0) * 0.7, 0)
    const totalHigh = items.reduce((s, i) => s + (i.estimated_cost || 0) * 1.3, 0)
    inspectionFindings = {
      totalCostLow: Math.round(totalLow),
      totalCostHigh: Math.round(totalHigh),
      negotiationTotal: Math.round(critical.reduce((s, i) => s + (i.estimated_cost || 0), 0)),
      redFlags: critical.slice(0, 3).map(i => i.description || 'High priority item'),
      criticalCount: critical.length,
      majorCount: major.length,
    }
  }

  // Get neighborhood data from census cache
  let neighborhoodData: ShouldIBuyInput['neighborhoodData'] | undefined
  if (property.zip) {
    const { data: census } = await supabase.from('census_cache').select('data').eq('zip', property.zip).maybeSingle()
    if (census?.data) {
      const d = census.data as Record<string, number>
      neighborhoodData = {
        medianHouseholdIncome: d.medianHouseholdIncome,
        medianHomeValue: d.medianHomeValue,
        ownerOccupiedPercent: d.ownerOccupied,
        walkScore: undefined,
      }
    }
  }

  // Get cached listing data for comps
  const { data: listingCache } = await supabase
    .from('listing_cache')
    .select('valuation, comparables')
    .eq('property_id', propertyId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  let comparableValueRange: ShouldIBuyInput['comparableValueRange'] | undefined
  if (listingCache?.valuation) {
    const v = listingCache.valuation as { valueLow?: number; valueMid?: number; valueHigh?: number }
    if (v.valueLow && v.valueMid && v.valueHigh) {
      comparableValueRange = { low: v.valueLow, mid: v.valueMid, high: v.valueHigh }
    }
  }

  const input: ShouldIBuyInput = {
    property: {
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      price: property.price,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      yearBuilt: property.year_built,
      status: property.status,
    },
    pros: (pros || []).map(p => p.text),
    cons: (cons || []).map(c => c.text),
    visits: (visits || []).map(v => ({
      visited_at: v.visited_at,
      overall_rating: v.overall_rating,
      notes: v.notes,
    })),
    inspectionFindings,
    offers: (offers || []).map(o => ({ amount: o.amount, status: o.status })),
    monthlyBudget: userSettings?.monthly_budget_target ?? undefined,
    costOfOwnership: monthlyTotal > 0 ? monthlyTotal : undefined,
    neighborhoodData,
    comparableValueRange,
  }

  try {
    const result = await generateShouldIBuyReport(input)

    // Cache the report
    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: propertyId,
      report_type: 'should_i_buy',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Should I Buy report error:', err)
    return Response.json({ error: 'Report generation failed. Please try again.' }, { status: 500 })
  }
}

// Force regeneration
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
    .eq('report_type', 'should_i_buy')
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
