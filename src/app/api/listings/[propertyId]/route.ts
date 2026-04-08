import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RENTCAST_BASE = 'https://api.rentcast.io/v1'

interface RentCastValuation {
  price: number
  priceRangeLow: number
  priceRangeHigh: number
  latitude: number
  longitude: number
}

interface RentCastComp {
  id: string
  formattedAddress: string
  price: number
  squareFootage: number
  bedrooms: number
  bathrooms: number
  yearBuilt: number
  lastSaleDate: string
  distance: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: property } = await supabase
    .from('properties')
    .select('address, city, state, zip, beds, baths, sqft')
    .eq('id', propertyId)
    .single()

  if (!property) return Response.json({ error: 'Property not found' }, { status: 404 })

  // Check cache first (24h TTL)
  const { data: cached } = await supabase
    .from('listing_cache')
    .select('*')
    .eq('property_id', propertyId)
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    return Response.json({
      cached: true,
      fetchedAt: cached.fetched_at,
      valuation: cached.valuation,
      comparables: cached.comparables,
    })
  }

  if (!process.env.RENTCAST_API_KEY) {
    return Response.json(
      { error: 'RentCast API key not configured. Add RENTCAST_API_KEY to your environment variables.' },
      { status: 503 }
    )
  }

  const addressParam = encodeURIComponent(
    [property.address, property.city, property.state, property.zip].filter(Boolean).join(', ')
  )

  try {
    const [valuationRes, compsRes] = await Promise.all([
      fetch(`${RENTCAST_BASE}/avm/value?address=${addressParam}&propertyType=Single+Family&bedrooms=${property.beds ?? ''}&bathrooms=${property.baths ?? ''}`, {
        headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY },
      }),
      fetch(`${RENTCAST_BASE}/sales/comparables?address=${addressParam}&radius=0.5&limit=5`, {
        headers: { 'X-Api-Key': process.env.RENTCAST_API_KEY },
      }),
    ])

    const valuation = valuationRes.ok ? await valuationRes.json() as RentCastValuation : null
    const compsData = compsRes.ok ? await compsRes.json() as { comparables: RentCastComp[] } : null

    const result = {
      valueLow: valuation?.priceRangeLow ?? null,
      valueMid: valuation?.price ?? null,
      valueHigh: valuation?.priceRangeHigh ?? null,
    }

    const comparables = compsData?.comparables ?? []

    // Cache the result
    await supabase.from('listing_cache').upsert({
      user_id: user.id,
      property_id: propertyId,
      source: 'rentcast',
      valuation: result,
      comparables,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json({
      cached: false,
      fetchedAt: new Date().toISOString(),
      valuation: result,
      comparables,
    })
  } catch (err) {
    console.error('RentCast error:', err)
    return Response.json({ error: 'Failed to fetch listing data.' }, { status: 500 })
  }
}

// Force refresh
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('listing_cache').delete().eq('property_id', propertyId).eq('user_id', user.id)
  return Response.json({ ok: true })
}
