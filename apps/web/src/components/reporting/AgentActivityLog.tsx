'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface ActionLog {
  id: string
  created_at: string
  action_type: string
  status: string
  agent_id: string
  user_id: string
  payload: Record<string, unknown> | null
  snapshot_after: Record<string, unknown> | null
  error_message: string | null
  confirmed_at: string | null
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'failed'
type TypeFilter = 'all' | 'enrollment.create' | 'enrollment.validate' | 'payment.record'

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  failed: 'Échec',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
}

const ACTION_LABEL: Record<string, string> = {
  'enrollment.create': 'Nouvelle inscription',
  'enrollment.validate': 'Validation inscription',
  'payment.record': 'Encaissement',
}

function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        sb.from('profiles').select('tenant_id').eq('id', data.user.id).single()
          .then(({ data: p }) => setTenantId(p?.tenant_id ?? null))
      }
    })
  }, [])
  return tenantId
}

function PayloadPreview({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <span className="text-gray-400 italic">—</span>
  const parts: string[] = []
  if (payload.first_name) parts.push(`${payload.first_name} ${payload.last_name ?? ''}`.trim())
  if (payload.class_name) parts.push(String(payload.class_name))
  if (payload.amount) parts.push(`${payload.amount} MAD`)
  if (payload.payment_method) parts.push(String(payload.payment_method))
  return <span>{parts.join(' · ') || JSON.stringify(payload).slice(0, 60)}</span>
}

export function AgentActivityLog() {
  const tenantId = useTenantId()
  const sb = createClient()
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterType, setFilterType] = useState<TypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    let q = sb.from('agent_action_logs')
      .select('id, created_at, action_type, status, agent_id, user_id, payload, snapshot_after, error_message, confirmed_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (filterStatus !== 'all') q = q.eq('status', filterStatus)
    if (filterType !== 'all') q = q.eq('action_type', filterType)

    q.then(({ data }) => {
      setLogs((data ?? []) as ActionLog[])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filterStatus, filterType])

  if (!tenantId) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
    </div>
  )

  const statusFilters: StatusFilter[] = ['all', 'pending', 'confirmed', 'cancelled', 'failed']
  const typeFilters: TypeFilter[] = ['all', 'enrollment.create', 'enrollment.validate', 'payment.record']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filtre status */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${filterStatus === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s === 'all' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {/* Filtre type */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {typeFilters.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${filterType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'all' ? 'Toutes actions' : ACTION_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Détails</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Confirmé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <>
                  <tr key={log.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {ACTION_LABEL[log.action_type] ?? log.action_type}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <PayloadPreview payload={log.payload} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[log.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.confirmed_at
                        ? new Date(log.confirmed_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-gray-400 font-medium mb-1">Payload (paramètres agent)</p>
                            <pre className="bg-white border border-gray-200 rounded p-2 overflow-auto max-h-40 text-gray-700">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium mb-1">Résultat (snapshot_after)</p>
                            <pre className="bg-white border border-gray-200 rounded p-2 overflow-auto max-h-40 text-gray-700">
                              {JSON.stringify(log.snapshot_after, null, 2) ?? '—'}
                            </pre>
                          </div>
                          {log.error_message && (
                            <div className="col-span-2">
                              <p className="text-red-500 font-medium mb-1">Erreur</p>
                              <p className="text-red-600">{log.error_message}</p>
                            </div>
                          )}
                          <div className="col-span-2 text-gray-400">
                            Agent: <code>{log.agent_id}</code> · User: <code>{log.user_id}</code>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Aucune action agent enregistrée. Testez le chat (⌘K) pour en créer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
