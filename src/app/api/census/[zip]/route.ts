import { type NextRequest } from 'next/server'
import { getCensusData, type CensusData } from '@/lib/census'

export type { CensusData }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ zip: string }> }
) {
  const { zip } = await params

  if (!/^\d{5}$/.test(zip)) {
    return Response.json({ error: 'Invalid ZIP code' }, { status: 400 })
  }

  const data = await getCensusData(zip)

  if (!data) {
    return Response.json({ error: 'No Census data for this ZIP' }, { status: 404 })
  }

  return Response.json(data)
}
