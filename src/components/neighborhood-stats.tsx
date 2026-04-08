import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Home, DollarSign, TrendingUp, Clock, GraduationCap, MapPin } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getCensusData } from '@/lib/census'

interface Props {
  zip: string | null
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
        <Icon className="h-4 w-4 text-stone-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-sm font-semibold text-stone-900">{value}</p>
      </div>
    </div>
  )
}

export async function NeighborhoodStats({ zip }: Props) {
  if (!zip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-400" />
            Neighborhood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">Add a ZIP code to this property to see neighborhood data.</p>
        </CardContent>
      </Card>
    )
  }

  const data = await getCensusData(zip)

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-400" />
            Neighborhood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">Neighborhood data unavailable for ZIP {zip}.</p>
        </CardContent>
      </Card>
    )
  }

  const fmt = (n: number | null, suffix = '') =>
    n != null ? `${n.toLocaleString()}${suffix}` : '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-stone-400" />
          Neighborhood · {zip}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 px-5">
          <div className="divide-y divide-stone-100">
            <StatTile
              icon={Users}
              label="Population"
              value={fmt(data.population)}
            />
            <StatTile
              icon={DollarSign}
              label="Median Household Income"
              value={formatCurrency(data.medianHouseholdIncome)}
            />
            <StatTile
              icon={Home}
              label="Median Home Value"
              value={formatCurrency(data.medianHomeValue)}
            />
            <StatTile
              icon={TrendingUp}
              label="Median Gross Rent"
              value={formatCurrency(data.medianGrossRent)}
            />
          </div>
          <div className="divide-y divide-stone-100 sm:pl-5">
            <StatTile
              icon={Home}
              label="Vacancy Rate"
              value={data.vacancyRate != null ? `${data.vacancyRate}%` : '—'}
            />
            <StatTile
              icon={Home}
              label="Median Year Built"
              value={fmt(data.medianYearBuilt)}
            />
            <StatTile
              icon={Clock}
              label="Long Commute (45+ min)"
              value={data.longCommuteShare != null ? `${data.longCommuteShare}%` : '—'}
            />
            <StatTile
              icon={GraduationCap}
              label="Bachelor's Degree+"
              value={data.bachelorsDegreeShare != null ? `${data.bachelorsDegreeShare}%` : '—'}
            />
          </div>
        </div>
        <p className="px-5 py-2 text-xs text-stone-400 border-t border-stone-100">
          Source: U.S. Census Bureau ACS 5-Year Estimates (2022)
        </p>
      </CardContent>
    </Card>
  )
}
