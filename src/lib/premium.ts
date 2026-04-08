import type { SupabaseClient } from '@supabase/supabase-js'

export const FREE_PROPERTY_LIMIT = 10

export async function getUserPremiumStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_settings')
    .select('is_premium')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.is_premium ?? false
}

export async function requirePremium(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isPremium: boolean; error: Response | null }> {
  const isPremium = await getUserPremiumStatus(supabase, userId)
  if (!isPremium) {
    return {
      isPremium: false,
      error: Response.json(
        { error: 'AI features require a premium account.', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      ),
    }
  }
  return { isPremium: true, error: null }
}
