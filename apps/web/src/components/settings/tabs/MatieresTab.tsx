'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from '../shared'

interface Unit {
  id: string
  name_fr: string
}

interface Subject {
  id: string
  name_fr: string
  name_ar: string | null
  unit_id: string
  coefficient: number | null
}

export default function MatieresTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [units, setUnits] = useState<Unit[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name_fr: '', name_ar: '', unit_id: '', coefficient: '1' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: u }, { data: s }] = await Promise.all([
      sb.from('units').select('id, name_fr').eq('tenant_id', tenantId).order('name_fr'),
      sb.from('subjects').select('*').eq('tenant_id', tenantId).order('unit_id').order('name_fr'),
    ])
    setUnits(u ?? [])
    setSubjects(s ?? [])
    if (u && u.length > 0 && !form.unit_id) {
      setForm(f => ({ ...f, unit_id: u[0].id }))
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm(f => ({ ...f, name_fr: '', name_ar: '', coefficient: '1' }))
    setEditId(null)
  }

  const save = async () => {
    if (!form.name_fr.trim()) return toast.error('Le nom (FR) est requis')
    if (!form.unit_id) return toast.error('Veuillez sélectionner une unité')
    setSaving(true)
    const payload = {
      name_fr: form.name_fr,
      name_ar: form.name_ar || null,
      unit_id: form.unit_id,
      coefficient: parseFloat(form.coefficient) || 1,
    }
    if (editId) {
      await sb.from('subjects').update(payload).eq('id', editId)
      toast.success('Matière mise à jour')
    } else {
      await sb.from('subjects').insert({ ...payload, tenant_id: tenantId })
      toast.success('Matière créée')
    }
    resetForm()
    setSaving(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette matière ?')) return
    const { error } = await sb.from('subjects').delete().eq('id', id)
    error ? toast.error(error.message) : load()
  }

  // Group subjects by unit
  const grouped = units.map(u => ({
    unit: u,
    subjects: subjects.filter(s => s.unit_id === u.id),
  })).filter(g => g.subjects.length > 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Matières</h2>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">{editId ? 'Modifier la matière' : 'Nouvelle matière'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom (FR)">
            <input className={inp} value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder="ex: Mathématiques" />
          </Field>
          <Field label="Nom (AR)">
            <input className={inp} dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
          </Field>
          <Field label="Unité">
            <select className={inp} value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
              <option value="">— Sélectionner une unité —</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name_fr}</option>)}
            </select>
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
            <th className="pb-2 font-medium">Matière</th>
            <th className="pb-2 font-medium">Unité</th>
            <th className="pb-2 font-medium">Coefficient</th>
            <th className="pb-2" />
          </tr></thead>
          <tbody className="divide-y">
            {grouped.length > 0 ? grouped.map(g => (
              <>
                <tr key={`unit-header-${g.unit.id}`} className="bg-gray-50">
                  <td colSpan={4} className="py-1.5 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {g.unit.name_fr}
                  </td>
                </tr>
                {g.subjects.map(s => (
                  <tr key={s.id}>
                    <td className="py-2 pl-4 font-medium">
                      {s.name_fr}
                      {s.name_ar && <span className="ml-2 text-xs text-gray-400" dir="rtl">{s.name_ar}</span>}
                    </td>
                    <td className="py-2 text-gray-600">{units.find(u => u.id === s.unit_id)?.name_fr ?? '—'}</td>
                    <td className="py-2 text-gray-600">{s.coefficient ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEditId(s.id)
                            setForm({ name_fr: s.name_fr, name_ar: s.name_ar ?? '', unit_id: s.unit_id, coefficient: String(s.coefficient ?? 1) })
                          }}
                          className="p-1 text-gray-400 hover:text-[#02133E]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => del(s.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )) : (
              subjects.length === 0
                ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucune matière configurée</td></tr>
                : subjects.map(s => (
                  <tr key={s.id}>
                    <td className="py-2 font-medium">{s.name_fr}</td>
                    <td className="py-2 text-gray-600">{units.find(u => u.id === s.unit_id)?.name_fr ?? '—'}</td>
                    <td className="py-2 text-gray-600">{s.coefficient ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEditId(s.id)
                            setForm({ name_fr: s.name_fr, name_ar: s.name_ar ?? '', unit_id: s.unit_id, coefficient: String(s.coefficient ?? 1) })
                          }}
                          className="p-1 text-gray-400 hover:text-[#02133E]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => del(s.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
