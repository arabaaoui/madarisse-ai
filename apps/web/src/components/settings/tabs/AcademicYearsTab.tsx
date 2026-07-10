'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from '../shared'

interface AcademicYear {
  id: string
  year: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export default function AcademicYearsTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ year: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('academic_years').select('*').eq('tenant_id', tenantId).order('year', { ascending: false })
    setYears(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.year.trim()) return toast.error('Le label de l\'année est requis (ex: 2025-2026)')
    setSaving(true)
    if (editId) {
      await sb.from('academic_years').update({ year: form.year, start_date: form.start_date || null, end_date: form.end_date || null }).eq('id', editId)
      toast.success('Année mise à jour')
    } else {
      await sb.from('academic_years').insert({ tenant_id: tenantId, year: form.year, start_date: form.start_date || null, end_date: form.end_date || null, is_active: false })
      toast.success('Année créée')
    }
    setForm({ year: '', start_date: '', end_date: '' })
    setEditId(null)
    setSaving(false)
    load()
  }

  const toggleActive = async (id: string, current: boolean) => {
    if (!current) {
      await sb.from('academic_years').update({ is_active: false }).eq('tenant_id', tenantId)
    }
    await sb.from('academic_years').update({ is_active: !current }).eq('id', id)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette année scolaire ? Les inscriptions liées seront bloquées.')) return
    await sb.from('academic_years').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Années scolaires</h2>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">{editId ? 'Modifier' : 'Nouvelle année'}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Année (ex: 2025-2026)">
            <input className={inp} value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2025-2026" />
          </Field>
          <Field label="Date de début">
            <input type="date" className={inp} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </Field>
          <Field label="Date de fin">
            <input type="date" className={inp} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ year: '', start_date: '', end_date: '' }) }} className={btnGhost}>
              <X className="h-4 w-4" /> Annuler
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Année</th>
            <th className="pb-2 font-medium">Début</th>
            <th className="pb-2 font-medium">Fin</th>
            <th className="pb-2 font-medium">Active</th>
            <th className="pb-2" />
          </tr></thead>
          <tbody className="divide-y">
            {years.map(y => (
              <tr key={y.id} className="py-2">
                <td className="py-2 font-medium">{y.year}</td>
                <td className="py-2 text-gray-600">{y.start_date ?? '—'}</td>
                <td className="py-2 text-gray-600">{y.end_date ?? '—'}</td>
                <td className="py-2">
                  <button onClick={() => toggleActive(y.id, y.is_active)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${y.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {y.is_active ? '✓ Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditId(y.id); setForm({ year: y.year, start_date: y.start_date ?? '', end_date: y.end_date ?? '' }) }} className="p-1 text-gray-400 hover:text-[#02133E]"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => del(y.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {years.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Aucune année scolaire</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
