'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from '../shared'

interface AcademicYear {
  id: string
  year: string
}

interface Semester {
  id: string
  name: string
  name_ar: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  order_num: number | null
  academic_year_id: string
}

export default function SemestresTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [years, setYears] = useState<AcademicYear[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>('')
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', name_ar: '', start_date: '', end_date: '', order_num: '1' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sb.from('academic_years')
      .select('id, year')
      .eq('tenant_id', tenantId)
      .order('year', { ascending: false })
      .then(({ data }) => {
        setYears(data ?? [])
        if (data && data.length > 0) setSelectedYearId(data[0].id)
      })
  }, [tenantId])

  const load = useCallback(async () => {
    if (!selectedYearId) return
    setLoading(true)
    const { data } = await sb.from('semesters')
      .select('*')
      .eq('academic_year_id', selectedYearId)
      .order('order_num', { ascending: true })
    setSemesters(data ?? [])
    setLoading(false)
  }, [selectedYearId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name: '', name_ar: '', start_date: '', end_date: '', order_num: '1' })
    setEditId(null)
  }

  const save = async () => {
    if (!form.name.trim()) return toast.error('Le nom du semestre est requis')
    if (!selectedYearId) return toast.error('Veuillez sélectionner une année scolaire')
    setSaving(true)
    const payload = {
      name: form.name,
      name_ar: form.name_ar || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      order_num: parseInt(form.order_num) || 1,
    }
    if (editId) {
      await sb.from('semesters').update(payload).eq('id', editId)
      toast.success('Semestre mis à jour')
    } else {
      await sb.from('semesters').insert({ ...payload, academic_year_id: selectedYearId, is_active: false })
      toast.success('Semestre créé')
    }
    resetForm()
    setSaving(false)
    load()
  }

  const toggleActive = async (id: string, current: boolean) => {
    if (!current) {
      await sb.from('semesters').update({ is_active: false }).eq('academic_year_id', selectedYearId)
    }
    await sb.from('semesters').update({ is_active: !current }).eq('id', id)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer ce semestre ?')) return
    await sb.from('semesters').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Semestres</h2>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">Année scolaire</label>
        <select
          className={inp}
          value={selectedYearId}
          onChange={e => { setSelectedYearId(e.target.value); resetForm() }}
        >
          <option value="">— Sélectionner une année —</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
        </select>
      </div>

      {selectedYearId && (
        <>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">{editId ? 'Modifier' : 'Nouveau semestre'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom (FR)">
                <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Semestre 1" />
              </Field>
              <Field label="Nom (AR)">
                <input className={inp} dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </Field>
              <Field label="Date de début">
                <input type="date" className={inp} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </Field>
              <Field label="Date de fin">
                <input type="date" className={inp} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </Field>
              <Field label="Ordre">
                <input type="number" min="1" className={inp} value={form.order_num} onChange={e => setForm(f => ({ ...f, order_num: e.target.value }))} />
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
                <th className="pb-2 font-medium">Ordre</th>
                <th className="pb-2 font-medium">Nom</th>
                <th className="pb-2 font-medium">Début</th>
                <th className="pb-2 font-medium">Fin</th>
                <th className="pb-2 font-medium">Actif</th>
                <th className="pb-2" />
              </tr></thead>
              <tbody className="divide-y">
                {semesters.map(s => (
                  <tr key={s.id}>
                    <td className="py-2 text-gray-500">{s.order_num ?? '—'}</td>
                    <td className="py-2 font-medium">
                      {s.name}
                      {s.name_ar && <span className="ml-2 text-xs text-gray-400" dir="rtl">{s.name_ar}</span>}
                    </td>
                    <td className="py-2 text-gray-600">{s.start_date ?? '—'}</td>
                    <td className="py-2 text-gray-600">{s.end_date ?? '—'}</td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleActive(s.id, s.is_active)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {s.is_active ? '✓ Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEditId(s.id)
                            setForm({ name: s.name, name_ar: s.name_ar ?? '', start_date: s.start_date ?? '', end_date: s.end_date ?? '', order_num: String(s.order_num ?? 1) })
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
                {semesters.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Aucun semestre pour cette année</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
