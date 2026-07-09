import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { data } = await supabase
    .from('tenants')
    .select('id, name, name_ar, address, logo_url, slug, onboarding_completed')
    .eq('id', tenantId)
    .single()

  if (!data) return NextResponse.json({ error: 'Profil école introuvable' }, { status: 404 })

  return NextResponse.json({
    id: data.id,
    name: data.name,
    nameAr: data.name_ar,
    address: data.address,
    logoUrl: data.logo_url,
    slug: data.slug,
    onboardingCompleted: data.onboarding_completed,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as {
    name?: string; nameAr?: string; address?: string; logoUrl?: string; slug?: string; onboardingCompleted?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.nameAr !== undefined) updates.name_ar = body.nameAr
  if (body.address !== undefined) updates.address = body.address
  if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.onboardingCompleted !== undefined) updates.onboarding_completed = body.onboardingCompleted

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce slug est d\u00e9j\u00e0 utilis\u00e9' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
