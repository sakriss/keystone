import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { InsuranceActions } from './insurance-actions'

export default async function InsurancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: quotes } = await supabase
    .from('insurance_quotes')
    .select('*, properties(address)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Insurance Quotes</h1>
          <p className="text-sm text-stone-500 mt-1">Compare home insurance quotes</p>
        </div>
        <InsuranceActions mode="add" properties={properties ?? []} />
      </div>

      {!quotes?.length ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No insurance quotes yet"
            description="Track homeowner's insurance quotes and mark which one you've selected."
            action={<InsuranceActions mode="add" properties={properties ?? []} />}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {quotes.map(q => (
            <Card key={q.id} className={q.is_selected ? 'ring-2 ring-amber-500' : ''}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900">{q.company_name}</p>
                      {q.is_selected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {(q.properties as { address: string } | null)?.address ?? ''}
                    </p>
                  </div>
                  <InsuranceActions mode="edit" quote={q} properties={properties ?? []} />
                </div>

                {q.monthly_premium && (
                  <div>
                    <p className="text-2xl font-bold text-stone-900">{formatCurrency(q.monthly_premium)}<span className="text-sm font-normal text-stone-500">/mo</span></p>
                    {q.annual_premium && <p className="text-xs text-stone-500">{formatCurrency(q.annual_premium)}/year</p>}
                  </div>
                )}

                <div className="text-xs text-stone-500 space-y-0.5">
                  {q.coverage_amount && <p>Coverage: {formatCurrency(q.coverage_amount)}</p>}
                  {q.deductible && <p>Deductible: {formatCurrency(q.deductible)}</p>}
                  {q.policy_type && <p>Type: {q.policy_type}</p>}
                  {q.agent_name && <p>Agent: {q.agent_name}</p>}
                  {q.agent_phone && <p>📞 {q.agent_phone}</p>}
                </div>

                {q.notes && (
                  <p className="text-xs text-stone-600 bg-stone-50 rounded-lg p-2">{q.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
