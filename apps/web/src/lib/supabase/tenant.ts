import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Récupère le tenant_id de l'utilisateur depuis la table profiles (source de vérité).
 * NE PAS utiliser session.user.user_metadata.tenant_id — ce champ JWT peut être
 * absent ou désynchronisé de profiles.tenant_id.
 */
export async function getTenantId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  return data?.tenant_id ?? null
}
