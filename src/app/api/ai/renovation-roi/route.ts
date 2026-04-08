import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateRenovationROI, type RenovationROIInput } from '@/lib/ai/renovation-roi'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'AI features not configured' }, { status: 503 })

  const { error: premiumError } = await requirePremium(supabase, user.id)
  if (premiumError) return premiumError

  const body = await req.json() as { propertyId?: string; forceRefresh?: boolean }

  // Check cache
  if (!body.forceRefresh) {
    const { data: cached } = await supabase
      .from('ai_reports')
      .select('content, generated_at')
      .eq('user_id', user.id)
      .eq('report_type', 'renovation_roi')
      .is('property_id', body.propertyId ?? null)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) return Response.json({ ...cached.content, cached: true, generatedAt: cached.generated_at })
  }

  // Gather all rooms + projects
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, room_projects(*)')
    .eq('user_id', user.id)
    .order('sort_order')

  if (!rooms || rooms.length === 0) {
    return Response.json({ error: 'No renovation projects found. Add some rooms and projects first.' }, { status: 400 })
  }

  type RoomProject = {
    id: string
    name: string
    description: string | null
    status: string
    budget_estimate: number | null
    contractor_quote: number | null
    priority: string | null
  }

  const projects = rooms.flatMap(room =>
    ((room.room_projects as RoomProject[]) || []).map(p => ({
      id: p.id,
      name: p.name,
      room: room.name,
      description: p.description ?? undefined,
      status: p.status,
      budgetEstimate: p.budget_estimate ?? undefined,
      contractorQuote: p.contractor_quote ?? undefined,
      priority: p.priority ?? undefined,
    }))
  )

  // Get primary property for address context
  let propertyAddress = 'Unknown location'
  let state: string | undefined
  let zip: string | undefined
  let estimatedHomeValue: number | undefined

  if (body.propertyId) {
    const { data: property } = await supabase.from('properties').select('address, city, state, zip, price').eq('id', body.propertyId).single()
    if (property) {
      propertyAddress = [property.address, property.city, property.state].filter(Boolean).join(', ')
      state = property.state
      zip = property.zip
      estimatedHomeValue = property.price
    }
  } else {
    const { data: primaryProperty } = await supabase.from('properties').select('address, city, state, zip, price').eq('user_id', user.id).eq('is_primary', true).maybeSingle()
    if (primaryProperty) {
      propertyAddress = [primaryProperty.address, primaryProperty.city, primaryProperty.state].filter(Boolean).join(', ')
      state = primaryProperty.state
      zip = primaryProperty.zip
      estimatedHomeValue = primaryProperty.price
    }
  }

  const input: RenovationROIInput = {
    propertyAddress,
    state,
    zip,
    estimatedHomeValue,
    projects,
  }

  try {
    const result = await generateRenovationROI(input)

    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: body.propertyId ?? null,
      report_type: 'renovation_roi',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Renovation ROI error:', err)
    return Response.json({ error: 'ROI analysis failed. Please try again.' }, { status: 500 })
  }
}
