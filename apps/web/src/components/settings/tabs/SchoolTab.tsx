'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { inp, btn, Field } from '../shared'

interface SchoolSettings {
  school_name: string
  school_name_ar: string
  school_phone: string
  school_email: string
  school_address: string
  currency_code: string
  currency_symbol: string
  payment_mode: 'installments' | 'annual_upfront'
  active_academic_year_id: string | null
}

interface AcademicYear {
  id: string
  year: string
  is_active: boolean
}

export default function SchoolTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [form, setForm] = useState<SchoolSettings>({
    school_name: '', school_name_ar: '', school_phone: '',
    school_email: '', school_address: '', currency_code: 'MAD',
    currency_symbol: 'MAD', payment_mode: 'installments',
    active_academic_year_id: null,
  })
  const [saving, setSaving] = useState(false)
  const [years, setYears] = useState<AcademicYear[]>([])

  useEffect(() => {
    sb.from('settings').select('*').eq('tenant_id', tenantId).maybeSingle()
      .then(({ data }) => { if (data) setForm(f => ({ ...f, ...data })) })
    sb.from('academic_years').select('id, year, is_active').eq('tenant_id', tenantId).order('year', { ascending: false })
      .then(({ data }) => setYears(data ?? []))
  }, [tenantId])

  const save = async () => {
    setSaving(true)
    const { error } = await sb.from('settings').upsert({ ...form, tenant_id: tenantId }, { onConflict: 'tenant_id' })
    setSaving(false)
    error ? toast.error(error.message) : toast.success('Paramètres sauvegardés')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Informations de l&apos;école</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de l'école (FR)">
          <input className={inp} value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
        </Field>
        <Field label="Nom de l'école (AR)">
          <input className={inp} dir="rtl" value={form.school_name_ar} onChange={e => setForm(f => ({ ...f, school_name_ar: e.target.value }))} />
        </Field>
        <Field label="Téléphone">
          <input className={inp} value={form.school_phone} onChange={e => setForm(f => ({ ...f, school_phone: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className={inp} type="email" value={form.school_email} onChange={e => setForm(f => ({ ...f, school_email: e.target.value }))} />
        </Field>
        <Field label="Adresse" className="col-span-2">
          <input className={inp} value={form.school_address} onChange={e => setForm(f => ({ ...f, school_address: e.target.value }))} />
        </Field>
        <Field label="Devise (code)">
          <input className={inp} value={form.currency_code} onChange={e => setForm(f => ({ ...f, currency_code: e.target.value }))} placeholder="MAD" />
        </Field>
        <Field label="Devise (symbole)">
          <input className={inp} value={form.currency_symbol} onChange={e => setForm(f => ({ ...f, currency_symbol: e.target.value }))} placeholder="MAD" />
        </Field>
        <Field label="Mode de paiement" className="col-span-2">
          <select className={inp} value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value as 'installments' | 'annual_upfront' }))}>
            <option value="installments">Mensualités (paiements échelonnés)</option>
            <option value="annual_upfront">Annuel unique (en début d&apos;année)</option>
          </select>
        </Field>
        <Field label="Année scolaire active" className="col-span-2">
          <select className={inp} value={form.active_academic_year_id ?? ''} onChange={e => setForm(f => ({ ...f, active_academic_year_id: e.target.value || null }))}>
            <option value="">— Aucune —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.year}{y.is_active ? ' ✓' : ''}</option>)}
          </select>
        </Field>
      </div>
      <button onClick={save} disabled={saving} className={btn}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Sauvegarder
      </button>
    </div>
  )
}
