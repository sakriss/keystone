import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScenarioBuilder } from './scenario-builder'

export default async function ScenariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">What If Scenario Builder</h1>
        <p className="text-sm text-stone-500 mt-1">Compare mortgage scenarios side-by-side to understand how price, rate, and down payment affect your monthly cost.</p>
      </div>
      <ScenarioBuilder />
    </div>
  )
}
