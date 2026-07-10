'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, Save, X, Loader2, CheckCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
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
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

interface SchoolClass {
  id: string
  name: string
  name_ar: string | null
  enrollment_fee: number
  tuition_fee: number
  level: string | null
}

interface AccCategory {
  id: string
  name_fr: string
  name_ar: string | null
  category_type: 'revenue' | 'expense'
  is_active: boolean
}

// ─── Hook : tenant ID courant ─────────────────────────────────────────────────
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

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
        ${active
          ? 'bg-[#02133E] text-white'
          : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

// ─── École tab ────────────────────────────────────────────────────────────────
function SchoolTab({ tenantId }: { tenantId: string }) {
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
    sb.from('academic_years').select('id, year, start_date, end_date, is_active').eq('tenant_id', tenantId).order('year', { ascending: false })
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
      <h2 className="text-lg font-semibold text-gray-900">Informations de l'école</h2>
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
            <option value="annual_upfront">Annuel unique (en début d'année)</option>
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

// ─── Années scolaires tab ─────────────────────────────────────────────────────
function AcademicYearsTab({ tenantId }: { tenantId: string }) {
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
      // Désactive toutes les autres
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

      {/* Form */}
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
          {editId && <button onClick={() => { setEditId(null); setForm({ year: '', start_date: '', end_date: '' }) }} className={btnGhost}><X className="h-4 w-4" /> Annuler</button>}
        </div>
      </div>

      {/* List */}
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

// ─── Classes tab ──────────────────────────────────────────────────────────────
function ClassesTab({ tenantId }: { tenantId: string }) {
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
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '', name_ar: '', level: '', enrollment_fee: '0', tuition_fee: '0' }) }} className={btnGhost}><X className="h-4 w-4" /> Annuler</button>}
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
                <td className="py-2 font-medium">{c.name}{c.name_ar && <span className="ml-2 text-gray-400 text-xs" dir="rtl">{c.name_ar}</span>}</td>
                <td className="py-2 text-gray-600">{c.level ?? '—'}</td>
                <td className="py-2">{c.enrollment_fee.toLocaleString()} MAD</td>
                <td className="py-2">{c.tuition_fee.toLocaleString()} MAD</td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditId(c.id); setForm({ name: c.name, name_ar: c.name_ar ?? '', level: c.level ?? '', enrollment_fee: String(c.enrollment_fee), tuition_fee: String(c.tuition_fee) }) }} className="p-1 text-gray-400 hover:text-[#02133E]"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => del(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

// ─── Catégories comptables tab ────────────────────────────────────────────────
function CategoriesTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [cats, setCats] = useState<AccCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name_fr: '', name_ar: '', category_type: 'revenue' as 'revenue' | 'expense' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('accounting_categories').select('*').eq('tenant_id', tenantId).order('category_type').order('name_fr')
    setCats(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name_fr.trim()) return toast.error('Le nom est requis')
    setSaving(true)
    if (editId) {
      await sb.from('accounting_categories').update({ name_fr: form.name_fr, name_ar: form.name_ar || null, category_type: form.category_type }).eq('id', editId)
      toast.success('Catégorie mise à jour')
    } else {
      await sb.from('accounting_categories').insert({ tenant_id: tenantId, name_fr: form.name_fr, name_ar: form.name_ar || null, category_type: form.category_type, is_active: true })
      toast.success('Catégorie créée')
    }
    setForm({ name_fr: '', name_ar: '', category_type: 'revenue' })
    setEditId(null)
    setSaving(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    const { error } = await sb.from('accounting_categories').delete().eq('id', id)
    error ? toast.error('Impossible : des transactions sont liées à cette catégorie') : load()
  }

  const typeBadge = (t: string) => t === 'revenue'
    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Catégories comptables</h2>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nom (FR)">
            <input className={inp} value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder="ex: Scolarité mensuelle" />
          </Field>
          <Field label="Nom (AR)">
            <input className={inp} dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
          </Field>
          <Field label="Type">
            <select className={inp} value={form.category_type} onChange={e => setForm(f => ({ ...f, category_type: e.target.value as 'revenue' | 'expense' }))}>
              <option value="revenue">Revenu</option>
              <option value="expense">Dépense</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name_fr: '', name_ar: '', category_type: 'revenue' }) }} className={btnGhost}><X className="h-4 w-4" /> Annuler</button>}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2" />
          </tr></thead>
          <tbody className="divide-y">
            {cats.map(c => (
              <tr key={c.id}>
                <td className="py-2 font-medium">{c.name_fr}{c.name_ar && <span className="ml-2 text-xs text-gray-400" dir="rtl">{c.name_ar}</span>}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(c.category_type)}`}>{c.category_type === 'revenue' ? 'Revenu' : 'Dépense'}</span></td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditId(c.id); setForm({ name_fr: c.name_fr, name_ar: c.name_ar ?? '', category_type: c.category_type }) }} className="p-1 text-gray-400 hover:text-[#02133E]"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => del(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {cats.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-gray-400">Aucune catégorie. Créez-en au moins une pour enregistrer des paiements.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Utilisateurs tab ─────────────────────────────────────────────────────────
function UsersTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [users, setUsers] = useState<{ id: string; email: string; first_name: string; last_name: string; role: string }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await sb.from('profiles').select('id, email, first_name, last_name').eq('tenant_id', tenantId)
    if (!profiles) { setLoading(false); return }
    const ids = profiles.map(p => p.id)
    const { data: roles } = await sb.from('user_roles').select('user_id, role').in('user_id', ids).eq('tenant_id', tenantId)
    setUsers(profiles.map(p => ({
      ...p,
      first_name: p.first_name ?? '',
      last_name: p.last_name ?? '',
      role: roles?.find(r => r.user_id === p.id)?.role ?? 'non assigné',
    })))
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const changeRole = async (userId: string, newRole: string) => {
    await sb.from('user_roles').delete().eq('user_id', userId).eq('tenant_id', tenantId)
    if (newRole !== 'none') {
      await sb.from('user_roles').insert({ user_id: userId, tenant_id: tenantId, role: newRole, is_active: true })
    }
    load()
  }

  const ROLES = ['admin', 'directeur', 'secretariat', 'teacher', 'parent']

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-lg font-semibold text-gray-900">Utilisateurs</h2>
      {loading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Rôle</th>
          </tr></thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id}>
                <td className="py-2 font-medium">{u.first_name} {u.last_name}</td>
                <td className="py-2 text-gray-600">{u.email}</td>
                <td className="py-2">
                  <select className="rounded-lg border border-gray-200 px-2 py-1 text-xs" value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-gray-400">Aucun utilisateur lié à ce tenant</td></tr>}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-400">Pour créer un utilisateur, utilisez la console Supabase (Auth &gt; Add user) puis assignez-lui un rôle ici.</p>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SettingsClient() {
  const tenantId = useTenantId()
  const [tab, setTab] = useState<'school' | 'years' | 'classes' | 'categories' | 'users'>('school')

  if (!tenantId) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 p-8">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement du contexte tenant…
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Configuration de l'école, des années scolaires, des classes et de la comptabilité.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-1 overflow-x-auto">
        <TabBtn active={tab === 'school'} onClick={() => setTab('school')}>🏫 École</TabBtn>
        <TabBtn active={tab === 'years'} onClick={() => setTab('years')}>📅 Années scolaires</TabBtn>
        <TabBtn active={tab === 'classes'} onClick={() => setTab('classes')}>🎓 Classes</TabBtn>
        <TabBtn active={tab === 'categories'} onClick={() => setTab('categories')}>💰 Catégories comptables</TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>👥 Utilisateurs</TabBtn>
      </div>

      <div>
        {tab === 'school'      && <SchoolTab tenantId={tenantId} />}
        {tab === 'years'       && <AcademicYearsTab tenantId={tenantId} />}
        {tab === 'classes'     && <ClassesTab tenantId={tenantId} />}
        {tab === 'categories'  && <CategoriesTab tenantId={tenantId} />}
        {tab === 'users'       && <UsersTab tenantId={tenantId} />}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20'
const btn = 'inline-flex items-center gap-2 rounded-xl bg-[#02133E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02133E]/90 disabled:opacity-50 transition-colors'
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
}
