import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePremium } from '@/lib/premium'
import { generateBudgetCheck } from '@/lib/ai/budget-check'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'AI features not configured' }, { status: 503 })

  const { error: premiumError } = await requirePremium(supabase, user.id)
  if (premiumError) return premiumError

  const body = await req.json() as { forceRefresh?: boolean }

  if (!body.forceRefresh) {
    const { data: cached } = await supabase
      .from('ai_reports')
      .select('content, generated_at')
      .eq('user_id', user.id)
      .eq('report_type', 'budget_check')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) return Response.json({ ...cached.content, cached: true, generatedAt: cached.generated_at })
  }

  // Gather rooms + projects with budget data
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_projects(*)')
    .eq('user_id', user.id)

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('monthly_budget_target')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rooms || rooms.length === 0) {
    return Response.json({ error: 'No renovation projects found.' }, { status: 400 })
  }

  type RoomProject = {
    id: string
    name: string
    status: string
    budget_estimate: number | null
    contractor_quote: number | null
    actual_cost: number | null
    priority: string | null
  }

  const projects = rooms.flatMap(room =>
    ((room.room_projects as RoomProject[]) || []).map(p => ({
      id: p.id,
      name: p.name,
      room: room.name,
      status: p.status,
      budgetEstimate: p.budget_estimate ?? undefined,
      contractorQuote: p.contractor_quote ?? undefined,
      actualCost: p.actual_cost ?? undefined,
      priority: p.priority ?? undefined,
    }))
  )

  try {
    const result = await generateBudgetCheck({
      projects,
      totalBudget: userSettings?.monthly_budget_target ?? undefined,
    })

    await supabase.from('ai_reports').insert({
      user_id: user.id,
      property_id: null,
      report_type: 'budget_check',
      content: result,
      model: 'gemini-2.5-flash-lite',
      generated_at: new Date().toISOString(),
      // Budget check expires in 1 day — budget data changes frequently
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    return Response.json(result)
  } catch (err) {
    console.error('Budget check error:', err)
    return Response.json({ error: 'Budget analysis failed. Please try again.' }, { status: 500 })
  }
}
