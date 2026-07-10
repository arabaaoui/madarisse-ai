'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Settings } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  name_ar: string | null
  slug: string | null
  active: boolean
  onboarding_completed: boolean
  created_at: string
  userCount?: number
}

export function SuperAdminClient() {
  const sb = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const loadTenants = async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('tenants')
      .select('id, name, name_ar, slug, active, onboarding_completed, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erreur lors du chargement : ' + error.message)
      setLoading(false)
      return
    }

    const tenantList: Tenant[] = data ?? []

    // Load user counts per tenant
    const countsResults = await Promise.all(
      tenantList.map(t =>
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id)
      )
    )

    setTenants(
      tenantList.map((t, i) => ({
        ...t,
        userCount: countsResults[i]?.count ?? 0,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { loadTenants() }, [])

  const toggleActive = async (tenant: Tenant) => {
    setToggling(tenant.id)
    const { error } = await sb
      .from('tenants')
      .update({ active: !tenant.active })
      .eq('id', tenant.id)

    setToggling(null)
    if (error) {
      toast.error('Erreur : ' + error.message)
      return
    }
    toast.success(`Tenant ${!tenant.active ? 'activé' : 'désactivé'}`)
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: !t.active } : t))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{tenants.length} établissement{tenants.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTenants} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : tenants.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucun établissement trouvé</p>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Établissement</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium text-center">Utilisateurs</th>
                <th className="px-4 py-3 font-medium text-center">Onboarding</th>
                <th className="px-4 py-3 font-medium text-center">Statut</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    {t.name_ar && <div className="text-xs text-gray-400 mt-0.5">{t.name_ar}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium">{t.userCount ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.onboarding_completed ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Complété</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">En cours</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Actif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-200">Inactif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(t)}
                        disabled={toggling === t.id}
                        className={t.active ? 'text-red-500 hover:border-red-300' : 'text-green-600 hover:border-green-300'}
                      >
                        {toggling === t.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          t.active ? 'Désactiver' : 'Activer'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/parametres?tenant=${t.id}`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
