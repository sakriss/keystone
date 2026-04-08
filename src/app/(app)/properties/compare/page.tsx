import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, statusLabel } from '@/lib/utils'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getCensusData, type CensusData } from '@/lib/census'

interface Props {
  searchParams: Promise<{ ids?: string }>
}

function Cell({ value }: { value: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm text-stone-800 align-top border-b border-stone-100">
      {value ?? <span className="text-stone-400">—</span>}
    </td>
  )
}

function RowLabel({ label }: { label: string }) {
  return (
    <td className="px-4 py-3 text-xs font-medium text-stone-500 align-top border-b border-stone-100 bg-stone-50 whitespace-nowrap w-44">
      {label}
    </td>
  )
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams

  const idList = (ids ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[0-9a-f-]{36}$/.test(s))
    .slice(0, 3)

  if (idList.length < 2) {
    redirect('/properties')
  }

  const supabase = await createClient()

  const [propertiesResult, prosConsResult] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .in('id', idList),
    supabase
      .from('property_pros_cons')
      .select('*')
      .in('property_id', idList),
  ])

  const properties = (propertiesResult.data ?? []).sort(
    (a, b) => idList.indexOf(a.id) - idList.indexOf(b.id)
  )

  if (properties.length < 2) {
    redirect('/properties')
  }

  const prosConsAll = prosConsResult.data ?? []

  // Fetch census data for each unique ZIP in parallel (direct function call, no HTTP)
  const censusMap: Record<string, CensusData | null> = {}
  await Promise.all(
    properties.map(async p => {
      if (p.zip && !(p.zip in censusMap)) {
        censusMap[p.zip] = await getCensusData(p.zip)
      }
    })
  )

  const census = properties.map(p => (p.zip ? censusMap[p.zip] ?? null : null))

  const colCount = properties.length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Compare Properties</h1>
        <p className="text-sm text-stone-500 mt-1">Side-by-side view of {colCount} properties</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Label column */}
                <th className="w-44 bg-stone-50" />
                {properties.map(p => (
                  <th key={p.id} className="px-4 py-4 text-left border-b border-stone-200 align-top">
                    <Link href={`/properties/${p.id}`} className="hover:underline">
                      <p className="font-semibold text-stone-900 text-sm leading-tight">{p.address}</p>
                    </Link>
                    {(p.city || p.state) && (
                      <p className="text-xs text-stone-500 mt-0.5">{[p.city, p.state, p.zip].filter(Boolean).join(', ')}</p>
                    )}
                    <div className="mt-2">
                      <Badge label={statusLabel(p.status)} status={p.status} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ── Basics ── */}
              <tr>
                <td colSpan={colCount + 1} className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50 border-b border-stone-200">
                  Basics
                </td>
              </tr>
              <tr>
                <RowLabel label="List Price" />
                {properties.map(p => <Cell key={p.id} value={formatCurrency(p.price)} />)}
              </tr>
              <tr>
                <RowLabel label="Price / sqft" />
                {properties.map(p => (
                  <Cell key={p.id} value={
                    p.price && p.sqft
                      ? `$${Math.round(p.price / p.sqft).toLocaleString()}`
                      : null
                  } />
                ))}
              </tr>
              <tr>
                <RowLabel label="Beds" />
                {properties.map(p => <Cell key={p.id} value={p.beds} />)}
              </tr>
              <tr>
                <RowLabel label="Baths" />
                {properties.map(p => <Cell key={p.id} value={p.baths} />)}
              </tr>
              <tr>
                <RowLabel label="Sq Ft" />
                {properties.map(p => <Cell key={p.id} value={p.sqft?.toLocaleString()} />)}
              </tr>
              <tr>
                <RowLabel label="Year Built" />
                {properties.map(p => <Cell key={p.id} value={p.year_built} />)}
              </tr>

              {/* ── Your Assessment ── */}
              <tr>
                <td colSpan={colCount + 1} className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50 border-b border-stone-200">
                  Your Assessment
                </td>
              </tr>
              <tr>
                <RowLabel label="Pros" />
                {properties.map(p => {
                  const pros = prosConsAll.filter(pc => pc.property_id === p.id && pc.type === 'pro')
                  return (
                    <Cell key={p.id} value={
                      pros.length > 0
                        ? <ul className="list-disc list-inside space-y-0.5">
                            {pros.map(pc => <li key={pc.id} className="text-green-700">{pc.text}</li>)}
                          </ul>
                        : null
                    } />
                  )
                })}
              </tr>
              <tr>
                <RowLabel label="Cons" />
                {properties.map(p => {
                  const cons = prosConsAll.filter(pc => pc.property_id === p.id && pc.type === 'con')
                  return (
                    <Cell key={p.id} value={
                      cons.length > 0
                        ? <ul className="list-disc list-inside space-y-0.5">
                            {cons.map(pc => <li key={pc.id} className="text-red-700">{pc.text}</li>)}
                          </ul>
                        : null
                    } />
                  )
                })}
              </tr>
              <tr>
                <RowLabel label="Listing" />
                {properties.map(p => (
                  <Cell key={p.id} value={
                    p.listing_url
                      ? <a href={p.listing_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700">
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      : null
                  } />
                ))}
              </tr>

              {/* ── Neighborhood ── */}
              <tr>
                <td colSpan={colCount + 1} className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50 border-b border-stone-200">
                  Neighborhood (Census Bureau ACS 2022)
                </td>
              </tr>
              <tr>
                <RowLabel label="Median Home Value" />
                {census.map((c, i) => <Cell key={i} value={formatCurrency(c?.medianHomeValue)} />)}
              </tr>
              <tr>
                <RowLabel label="Median Rent" />
                {census.map((c, i) => <Cell key={i} value={formatCurrency(c?.medianGrossRent)} />)}
              </tr>
              <tr>
                <RowLabel label="Median HH Income" />
                {census.map((c, i) => <Cell key={i} value={formatCurrency(c?.medianHouseholdIncome)} />)}
              </tr>
              <tr>
                <RowLabel label="Population" />
                {census.map((c, i) => <Cell key={i} value={c?.population?.toLocaleString()} />)}
              </tr>
              <tr>
                <RowLabel label="Vacancy Rate" />
                {census.map((c, i) => (
                  <Cell key={i} value={c?.vacancyRate != null ? `${c.vacancyRate}%` : null} />
                ))}
              </tr>
              <tr>
                <RowLabel label="Long Commute (45+ min)" />
                {census.map((c, i) => (
                  <Cell key={i} value={c?.longCommuteShare != null ? `${c.longCommuteShare}%` : null} />
                ))}
              </tr>
              <tr>
                <RowLabel label="Bachelor's Degree+" />
                {census.map((c, i) => (
                  <Cell key={i} value={c?.bachelorsDegreeShare != null ? `${c.bachelorsDegreeShare}%` : null} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
