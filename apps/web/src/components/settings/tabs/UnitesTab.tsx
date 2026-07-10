'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from '../shared'

interface Unit {
  id: string
  name_fr: string
  name_ar: string | null
  coefficient: number | null
}

export default function UnitesTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name_fr: '', name_ar: '', coefficient: '1' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('units').select('*').eq('tenant_id', tenantId).order('name_fr')
    setUnits(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name_fr: '', name_ar: '', coefficient: '1' })
    setEditId(null)
  }

  const save = async () => {
    if (!form.name_fr.trim()) return toast.error('Le nom (FR) est requis')
    setSaving(true)
    const payload = {
      name_fr: form.name_fr,
      name_ar: form.name_ar || null,
      coefficient: parseFloat(form.coefficient) || 1,
    }
    if (editId) {
      await sb.from('units').update(payload).eq('id', editId)
      toast.success('Unité mise à jour')
    } else {
      await sb.from('units').insert({ ...payload, tenant_id: tenantId })
      toast.success('Unité créée')
    }
    resetForm()
    setSaving(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette unité ? Les matières liées seront affectées.')) return
    const { error } = await sb.from('units').delete().eq('id', id)
    error ? toast.error('Impossible : des matières sont liées à cette unité') : load()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Unités pédagogiques</h2>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">{editId ? 'Modifier l\'unité' : 'Nouvelle unité'}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nom (FR)">
            <input className={inp} value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder="ex: Sciences" />
          </Field>
          <Field label="Nom (AR)">
            <input className={inp} dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
          </Field>
          <Field label="Coefficient">
            <input type="number" min="0" step="0.5" className={inp} value={form.coefficient} onChange={e => setForm(f => ({ ...f, coefficient: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editId && (
            <button onClick={resetForm} className={btnGhost}>
              <X className="h-4 w-4" /> Annuler
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Coefficient</th>
            <th className="pb-2" />
          </tr></thead>
          <tbody className="divide-y">
            {units.map(u => (
              <tr key={u.id}>
                <td className="py-2 font-medium">
                  {u.name_fr}
                  {u.name_ar && <span className="ml-2 text-xs text-gray-400" dir="rtl">{u.name_ar}</span>}
                </td>
                <td className="py-2 text-gray-600">{u.coefficient ?? '—'}</td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => { setEditId(u.id); setForm({ name_fr: u.name_fr, name_ar: u.name_ar ?? '', coefficient: String(u.coefficient ?? 1) }) }}
                      className="p-1 text-gray-400 hover:text-[#02133E]"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => del(u.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {units.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-gray-400">Aucune unité pédagogique configurée</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
