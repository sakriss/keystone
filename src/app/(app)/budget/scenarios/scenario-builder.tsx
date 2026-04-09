'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { formatCurrency, cn } from '@/lib/utils'
import { calculateMonthlyPI } from '@/lib/mortgage'
import { Plus, X } from 'lucide-react'

interface Scenario {
  id: string
  label: string
  homePrice: number
  downPaymentPct: number
  interestRate: number
  loanTermYears: 15 | 20 | 30
  propertyTaxRate: number
  hoaMonthly: number
  insuranceMonthly: number
}

interface ScenarioBreakdown {
  loanAmount: number
  pAndI: number
  tax: number
  insurance: number
  hoa: number
  pmi: number
  total: number
}

function computeBreakdown(s: Scenario): ScenarioBreakdown {
  const loanAmount = s.homePrice * (1 - s.downPaymentPct / 100)
  const pAndI = calculateMonthlyPI(loanAmount, s.interestRate, s.loanTermYears)
  const tax = (s.homePrice * s.propertyTaxRate) / 100 / 12
  const insurance = s.insuranceMonthly
  const hoa = s.hoaMonthly
  const pmi = s.downPaymentPct < 20 ? (loanAmount * 0.01) / 12 : 0
  const total = pAndI + tax + insurance + hoa + pmi
  return { loanAmount, pAndI, tax, insurance, hoa, pmi, total }
}

const TERM_OPTIONS = [
  { value: '30', label: '30-year fixed' },
  { value: '20', label: '20-year fixed' },
  { value: '15', label: '15-year fixed' },
]

const SCENARIO_COLORS = ['amber', 'blue', 'green'] as const
type ScenarioColor = typeof SCENARIO_COLORS[number]

const COLOR_CLASSES: Record<ScenarioColor, { border: string; badge: string; header: string }> = {
  amber: { border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', header: 'bg-amber-50' },
  blue: { border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800', header: 'bg-blue-50' },
  green: { border: 'border-green-300', badge: 'bg-green-100 text-green-800', header: 'bg-green-50' },
}

function defaultScenario(id: string, label: string): Scenario {
  return {
    id,
    label,
    homePrice: 400000,
    downPaymentPct: 20,
    interestRate: 7.0,
    loanTermYears: 30,
    propertyTaxRate: 1.2,
    hoaMonthly: 0,
    insuranceMonthly: 150,
  }
}

function ScenarioCard({
  scenario,
  color,
  onUpdate,
  onRemove,
  canRemove,
}: {
  scenario: Scenario
  color: ScenarioColor
  onUpdate: (updated: Scenario) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const breakdown = computeBreakdown(scenario)
  const cls = COLOR_CLASSES[color]

  function set(field: keyof Scenario, value: string | number) {
    onUpdate({ ...scenario, [field]: value })
  }

  const rows: { label: string; value: number; muted?: boolean }[] = [
    { label: 'Principal & Interest', value: breakdown.pAndI },
    { label: 'Property Tax', value: breakdown.tax },
    { label: 'Homeowner\'s Insurance', value: breakdown.insurance },
    ...(breakdown.hoa > 0 ? [{ label: 'HOA', value: breakdown.hoa }] : []),
    ...(breakdown.pmi > 0 ? [{ label: 'PMI (est.)', value: breakdown.pmi, muted: true }] : []),
  ]

  return (
    <Card className={cn('border-2', cls.border)}>
      <CardHeader className={cn('rounded-t-xl', cls.header)}>
        <div className="flex items-center justify-between gap-2">
          <Input
            value={scenario.label}
            onChange={e => set('label', e.target.value)}
            className="font-semibold bg-transparent border-0 shadow-none p-0 h-auto text-stone-900 focus:ring-0 text-base w-full"
          />
          {canRemove && (
            <button onClick={onRemove} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Home Price"
            type="number"
            value={scenario.homePrice}
            onChange={e => set('homePrice', Number(e.target.value))}
          />
          <Input
            label="Down Payment %"
            type="number"
            value={scenario.downPaymentPct}
            onChange={e => set('downPaymentPct', Number(e.target.value))}
            min={0}
            max={100}
          />
          <Input
            label="Interest Rate %"
            type="number"
            value={scenario.interestRate}
            onChange={e => set('interestRate', Number(e.target.value))}
            step={0.125}
          />
          <Select
            label="Loan Term"
            value={String(scenario.loanTermYears)}
            onChange={e => set('loanTermYears', Number(e.target.value) as 15 | 20 | 30)}
            options={TERM_OPTIONS}
          />
          <Input
            label="Property Tax %"
            type="number"
            value={scenario.propertyTaxRate}
            onChange={e => set('propertyTaxRate', Number(e.target.value))}
            step={0.1}
          />
          <Input
            label="Insurance /mo"
            type="number"
            value={scenario.insuranceMonthly}
            onChange={e => set('insuranceMonthly', Number(e.target.value))}
          />
          <Input
            label="HOA /mo"
            type="number"
            value={scenario.hoaMonthly}
            onChange={e => set('hoaMonthly', Number(e.target.value))}
          />
        </div>

        {scenario.downPaymentPct < 20 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">PMI applies — down payment below 20%</p>
        )}

        {/* Breakdown */}
        <div className="border-t border-stone-100 pt-3 space-y-1.5">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className={row.muted ? 'text-stone-400' : 'text-stone-600'}>{row.label}</span>
              <span className={row.muted ? 'text-stone-400' : 'text-stone-700'}>{formatCurrency(row.value)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
            <span>Total Monthly</span>
            <span className="text-lg">{formatCurrency(breakdown.total)}</span>
          </div>
        </div>

        <div className="text-xs text-stone-400 space-y-0.5">
          <p>Loan amount: {formatCurrency(breakdown.loanAmount)}</p>
          <p>Down payment: {formatCurrency(scenario.homePrice * scenario.downPaymentPct / 100)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function ScenarioBuilder() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    defaultScenario('1', 'Scenario A'),
  ])

  function addScenario() {
    if (scenarios.length >= 3) return
    const label = scenarios.length === 1 ? 'Scenario B' : 'Scenario C'
    setScenarios(prev => [...prev, defaultScenario(String(Date.now()), label)])
  }

  function updateScenario(id: string, updated: Scenario) {
    setScenarios(prev => prev.map(s => s.id === id ? updated : s))
  }

  function removeScenario(id: string) {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }

  const breakdowns = scenarios.map(s => computeBreakdown(s))
  const lowestTotal = Math.min(...breakdowns.map(b => b.total))

  return (
    <div className="space-y-6">
      {/* Scenario cards */}
      <div className={cn('grid gap-5', scenarios.length === 1 ? 'max-w-sm' : scenarios.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            color={SCENARIO_COLORS[i]}
            onUpdate={updated => updateScenario(s.id, updated)}
            onRemove={() => removeScenario(s.id)}
            canRemove={scenarios.length > 1}
          />
        ))}
      </div>

      {scenarios.length < 3 && (
        <Button variant="secondary" onClick={addScenario}>
          <Plus className="h-4 w-4" />
          Add Scenario
        </Button>
      )}

      {/* Comparison table */}
      {scenarios.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Comparison</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-stone-500 font-medium"></th>
                  {scenarios.map((s, i) => (
                    <th key={s.id} className="text-right px-5 py-3 font-semibold text-stone-900">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', COLOR_CLASSES[SCENARIO_COLORS[i]].badge)}>
                        {s.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Home Price', key: (b: ScenarioBreakdown, s: Scenario) => s.homePrice },
                  { label: 'Down Payment', key: (b: ScenarioBreakdown, s: Scenario) => s.homePrice * s.downPaymentPct / 100 },
                  { label: 'Loan Amount', key: (b: ScenarioBreakdown) => b.loanAmount },
                  { label: 'P&I', key: (b: ScenarioBreakdown) => b.pAndI },
                  { label: 'Tax + Insurance', key: (b: ScenarioBreakdown) => b.tax + b.insurance },
                  { label: 'HOA + PMI', key: (b: ScenarioBreakdown) => b.hoa + b.pmi },
                ].map(row => (
                  <tr key={row.label} className="border-b border-stone-50">
                    <td className="px-5 py-2.5 text-stone-500">{row.label}</td>
                    {scenarios.map((s, i) => (
                      <td key={s.id} className="px-5 py-2.5 text-right text-stone-700">
                        {formatCurrency(row.key(breakdowns[i], s))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-stone-50">
                  <td className="px-5 py-3 font-bold text-stone-900">Total Monthly</td>
                  {scenarios.map((s, i) => (
                    <td key={s.id} className={cn('px-5 py-3 text-right font-bold text-lg', breakdowns[i].total === lowestTotal ? 'text-green-700' : 'text-stone-900')}>
                      {formatCurrency(breakdowns[i].total)}
                      {breakdowns[i].total === lowestTotal && scenarios.length > 1 && (
                        <span className="block text-xs font-normal text-green-600">Lowest</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Difference callouts */}
            {scenarios.length > 1 && (
              <div className="px-5 py-3 flex flex-wrap gap-3 border-t border-stone-100">
                {scenarios.slice(1).map((s, i) => {
                  const diff = breakdowns[i + 1].total - breakdowns[0].total
                  return (
                    <span key={s.id} className={cn('text-xs px-2.5 py-1 rounded-full font-medium', diff > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
                      {s.label} is {formatCurrency(Math.abs(diff))}/mo {diff > 0 ? 'more' : 'less'} than {scenarios[0].label}
                    </span>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
