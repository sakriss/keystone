/**
 * Census Bureau data utility — call directly from Server Components.
 * Uses Supabase as a 30-day cache to avoid repeat Census API calls.
 * Server-only: uses service role key.
 */
import { createServiceClient } from '@/lib/supabase/service'

const CENSUS_VARS = [
  'B01003_001E',  // Total population
  'B25001_001E',  // Total housing units
  'B25002_003E',  // Vacant housing units
  'B25077_001E',  // Median home value
  'B25064_001E',  // Median gross rent
  'B19013_001E',  // Median household income
  'B25035_001E',  // Median year structure built
  'B08303_001E',  // Total workers (commute base)
  'B08303_012E',  // Workers with 45–59 min commute
  'B08303_013E',  // Workers with 60+ min commute
  'B15003_001E',  // Total population 25+ (education base)
  'B15003_022E',  // Bachelor's degree holders
].join(',')

const CENSUS_YEAR = '2022'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface CensusData {
  zip: string
  population: number | null
  totalHousingUnits: number | null
  vacantHousingUnits: number | null
  vacancyRate: number | null
  medianHomeValue: number | null
  medianGrossRent: number | null
  medianHouseholdIncome: number | null
  medianYearBuilt: number | null
  longCommuteShare: number | null
  bachelorsDegreeShare: number | null
}

export async function getCensusData(zip: string): Promise<CensusData | null> {
  if (!/^\d{5}$/.test(zip)) return null

  const supabase = createServiceClient()

  // Check cache
  const { data: cachedRow } = await supabase
    .from('census_cache')
    .select('data, fetched_at')
    .eq('zip', zip)
    .single()

  const cached = cachedRow as { data: CensusData; fetched_at: string } | null

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < CACHE_TTL_MS) {
      return cached.data
    }
  }

  // Fetch from Census Bureau ACS5
  const url = new URL(`https://api.census.gov/data/${CENSUS_YEAR}/acs/acs5`)
  url.searchParams.set('get', `NAME,${CENSUS_VARS}`)
  url.searchParams.set('for', `zip code tabulation area:${zip}`)
  const apiKey = process.env.CENSUS_API_KEY
  if (apiKey) url.searchParams.set('key', apiKey)

  let raw: string[][]
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    raw = await res.json()
  } catch {
    return null
  }

  if (!raw || raw.length < 2) return null

  const headers = raw[0]
  const values = raw[1]
  const get = (varName: string): number | null => {
    const idx = headers.indexOf(varName)
    if (idx === -1) return null
    const v = Number(values[idx])
    return isNaN(v) || v < 0 ? null : v
  }

  const totalWorkers = get('B08303_001E')
  const longCommuteWorkers = (get('B08303_012E') ?? 0) + (get('B08303_013E') ?? 0)
  const totalAdults = get('B15003_001E')
  const bachelors = get('B15003_022E')
  const totalUnits = get('B25001_001E')
  const vacantUnits = get('B25002_003E')

  const data: CensusData = {
    zip,
    population: get('B01003_001E'),
    totalHousingUnits: totalUnits,
    vacantHousingUnits: vacantUnits,
    vacancyRate: totalUnits && vacantUnits != null
      ? Math.round((vacantUnits / totalUnits) * 1000) / 10
      : null,
    medianHomeValue: get('B25077_001E'),
    medianGrossRent: get('B25064_001E'),
    medianHouseholdIncome: get('B19013_001E'),
    medianYearBuilt: get('B25035_001E'),
    longCommuteShare: totalWorkers
      ? Math.round((longCommuteWorkers / totalWorkers) * 1000) / 10
      : null,
    bachelorsDegreeShare: totalAdults && bachelors != null
      ? Math.round((bachelors / totalAdults) * 1000) / 10
      : null,
  }

  // Upsert into cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('census_cache') as any)
    .upsert({ zip, data, fetched_at: new Date().toISOString() }, { onConflict: 'zip' })

  return data
}
