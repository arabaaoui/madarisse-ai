'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import { inp, btn, btnGhost, Field, Spinner } from './shared'

import dynamic from 'next/dynamic'

const SchoolTab         = dynamic(() => import('./tabs/SchoolTab'),            { ssr: false, loading: () => <TabLoader /> })
const AcademicYearsTab  = dynamic(() => import('./tabs/AcademicYearsTab'),     { ssr: false, loading: () => <TabLoader /> })
const SemestresTab      = dynamic(() => import('./tabs/SemestresTab'),         { ssr: false, loading: () => <TabLoader /> })
const ClassesTab        = dynamic(() => import('./tabs/ClassesTab'),           { ssr: false, loading: () => <TabLoader /> })
const UnitesTab         = dynamic(() => import('./tabs/UnitesTab'),            { ssr: false, loading: () => <TabLoader /> })
const MatieresTab       = dynamic(() => import('./tabs/MatieresTab'),          { ssr: false, loading: () => <TabLoader /> })
const SubjectClassMatrixTab = dynamic(() => import('./tabs/SubjectClassMatrixTab'), { ssr: false, loading: () => <TabLoader /> })
const EnseignantsTab    = dynamic(() => import('./tabs/EnseignantsTab'),       { ssr: false, loading: () => <TabLoader /> })

function TabLoader() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccCategory {
  id: string
  name_fr: string
  name_ar: string | null
  category_type: 'revenue' | 'expense'
  is_active: boolean
}

// ─── Hook tenant ──────────────────────────────────────────────────────────────
function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { setNotFound(true); return }
      sb.from('profiles').select('tenant_id').eq('id', data.user.id).maybeSingle()
        .then(({ data: p }) => {
          if (p?.tenant_id) setTenantId(p.tenant_id)
          else setNotFound(true)
        })
    })
  }, [])
  return { tenantId, notFound }
}

// ─── Catégories tab ───────────────────────────────────────────────────────────
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

  const typeBadge = (t: string) => t === 'revenue' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

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
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ name_fr: '', name_ar: '', category_type: 'revenue' }) }} className={btnGhost}>
              <X className="h-4 w-4" /> Annuler
            </button>
          )}
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

// ─── Navigation items ─────────────────────────────────────────────────────────
type TabId =
  | 'school' | 'years' | 'semestres' | 'classes'
  | 'unites' | 'matieres' | 'matrix' | 'enseignants'
  | 'categories' | 'users'

const NAV: { section: string; items: { id: TabId; label: string }[] }[] = [
  {
    section: 'Général',
    items: [
      { id: 'school', label: 'École' },
      { id: 'years', label: 'Années scolaires' },
      { id: 'semestres', label: 'Semestres' },
      { id: 'classes', label: 'Classes' },
    ],
  },
  {
    section: 'Curriculum',
    items: [
      { id: 'unites', label: 'Unités pédagogiques' },
      { id: 'matieres', label: 'Matières' },
      { id: 'matrix', label: 'Affectation matières' },
      { id: 'enseignants', label: 'Enseignants' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { id: 'categories', label: 'Catégories comptables' },
    ],
  },
  {
    section: 'Système',
    items: [
      { id: 'users', label: 'Utilisateurs' },
    ],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsClient() {
  const { tenantId, notFound } = useTenantId()
  const [tab, setTab] = useState<TabId>('school')

  if (notFound) return (
    <div className="p-8 text-sm text-red-600">
      Profil introuvable pour ce compte. Reconnectez-vous avec un compte valide.
    </div>
  )

  if (!tenantId) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 p-8">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement du contexte tenant…
    </div>
  )

  return (
    <div className="flex min-h-full">
      {/* Left sidebar nav */}
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 p-4 space-y-5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{section}</p>
            <div className="space-y-0.5">
              {items.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    tab === id
                      ? 'bg-[#02133E] text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Right panel */}
      <div className="flex-1 p-8">
        {tab === 'school'      && <SchoolTab tenantId={tenantId} />}
        {tab === 'years'       && <AcademicYearsTab tenantId={tenantId} />}
        {tab === 'semestres'   && <SemestresTab tenantId={tenantId} />}
        {tab === 'classes'     && <ClassesTab tenantId={tenantId} />}
        {tab === 'unites'      && <UnitesTab tenantId={tenantId} />}
        {tab === 'matieres'    && <MatieresTab tenantId={tenantId} />}
        {tab === 'matrix'      && <SubjectClassMatrixTab tenantId={tenantId} />}
        {tab === 'enseignants' && <EnseignantsTab tenantId={tenantId} />}
        {tab === 'categories'  && <CategoriesTab tenantId={tenantId} />}
        {tab === 'users'       && <UsersTab tenantId={tenantId} />}
      </div>
    </div>
  )
}
