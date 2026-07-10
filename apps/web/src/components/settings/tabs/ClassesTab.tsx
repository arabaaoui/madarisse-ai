'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from '../shared'

interface SchoolClass {
  id: string
  name: string
  name_ar: string | null
  enrollment_fee: number
  tuition_fee: number
  level: string | null
}

export default function ClassesTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', name_ar: '', level: '', enrollment_fee: '0', tuition_fee: '0' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('classes').select('*').eq('tenant_id', tenantId).order('name')
    setClasses(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) return toast.error('Le nom de la classe est requis')
    setSaving(true)
    const payload = {
      name: form.name, name_ar: form.name_ar || null, level: form.level || null,
      enrollment_fee: parseFloat(form.enrollment_fee) || 0,
      tuition_fee: parseFloat(form.tuition_fee) || 0,
    }
    if (editId) {
      await sb.from('classes').update(payload).eq('id', editId)
      toast.success('Classe mise à jour')
    } else {
      await sb.from('classes').insert({ ...payload, tenant_id: tenantId })
      toast.success('Classe créée')
    }
    setForm({ name: '', name_ar: '', level: '', enrollment_fee: '0', tuition_fee: '0' })
    setEditId(null)
    setSaving(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette classe ?')) return
    await sb.from('classes').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-gray-900">Classes</h2>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">{editId ? 'Modifier la classe' : 'Nouvelle classe'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom (FR)">
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: CE2, CM1…" />
          </Field>
          <Field label="Nom (AR)">
            <input className={inp} dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
          </Field>
          <Field label="Niveau">
            <input className={inp} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="ex: Primaire" />
          </Field>
          <Field label="Frais d'inscription (MAD)">
            <input type="number" min="0" className={inp} value={form.enrollment_fee} onChange={e => setForm(f => ({ ...f, enrollment_fee: e.target.value }))} />
          </Field>
          <Field label="Scolarité mensuelle (MAD)">
            <input type="number" min="0" className={inp} value={form.tuition_fee} onChange={e => setForm(f => ({ ...f, tuition_fee: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ name: '', name_ar: '', level: '', enrollment_fee: '0', tuition_fee: '0' }) }} className={btnGhost}>
              <X className="h-4 w-4" /> Annuler
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Niveau</th>
            <th className="pb-2 font-medium">Inscription (MAD)</th>
            <th className="pb-2 font-medium">Mensualité (MAD)</th>
            <th className="pb-2" />
          </tr></thead>
          <tbody className="divide-y">
            {classes.map(c => (
              <tr key={c.id}>
                <td className="py-2 font-medium">
                  {c.name}
                  {c.name_ar && <span className="ml-2 text-gray-400 text-xs" dir="rtl">{c.name_ar}</span>}
                </td>
                <td className="py-2 text-gray-600">{c.level ?? '—'}</td>
                <td className="py-2">{c.enrollment_fee.toLocaleString()} MAD</td>
                <td className="py-2">{c.tuition_fee.toLocaleString()} MAD</td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => {
                        setEditId(c.id)
                        setForm({ name: c.name, name_ar: c.name_ar ?? '', level: c.level ?? '', enrollment_fee: String(c.enrollment_fee), tuition_fee: String(c.tuition_fee) })
                      }}
                      className="p-1 text-gray-400 hover:text-[#02133E]"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => del(c.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {classes.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Aucune classe configurée</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
