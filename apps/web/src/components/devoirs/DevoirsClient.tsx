'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Loader2, Plus } from 'lucide-react'

interface SchoolClass {
  id: string
  name: string
}

interface Devoir {
  id: string
  subject: string
  title: string
  description: string | null
  due_date: string
  class_id: string | null
  classes: { name: string } | null
}

export function DevoirsClient() {
  const sb = createClient()

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [devoirs, setDevoirs] = useState<Devoir[]>([])
  const [filterClassId, setFilterClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    class_id: '',
    subject: '',
    title: '',
    description: '',
    due_date: '',
  })

  // Load classes
  useEffect(() => {
    sb.from('classes').select('id, name').order('name').then(({ data }) => setClasses(data ?? []))
  }, [])

  // Load devoirs
  const loadDevoirs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClassId) params.set('class_id', filterClassId)
    const res = await fetch(`/api/devoirs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDevoirs(data)
    }
    setLoading(false)
  }

  useEffect(() => { loadDevoirs() }, [filterClassId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.title.trim() || !form.due_date) {
      toast.error('Matière, titre et date sont requis')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/devoirs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Devoir ajouté')
      setForm({ class_id: '', subject: '', title: '', description: '', due_date: '' })
      loadDevoirs()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur lors de l\'ajout')
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/devoirs?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Devoir supprimé')
      setDevoirs(prev => prev.filter(d => d.id !== id))
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Ajouter un devoir
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="class_id">Classe</Label>
            <select
              id="class_id"
              value={form.class_id}
              onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="subject">Matière *</Label>
            <Input
              id="subject"
              placeholder="ex: Mathématiques"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              placeholder="ex: Exercices p.45"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="due_date">Date limite *</Label>
            <Input
              id="due_date"
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Détails du devoir..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ajouter le devoir
            </Button>
          </div>
        </form>
      </div>

      {/* Filter + List */}
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Liste des devoirs</h2>
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : devoirs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun devoir trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Date limite</th>
                  <th className="pb-3 pr-4 font-medium">Classe</th>
                  <th className="pb-3 pr-4 font-medium">Matière</th>
                  <th className="pb-3 pr-4 font-medium">Titre</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {devoirs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{new Date(d.due_date).toLocaleDateString('fr-FR')}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{d.classes?.name ?? '—'}</td>
                    <td className="py-3 pr-4 font-medium">{d.subject}</td>
                    <td className="py-3 pr-4">{d.title}</td>
                    <td className="py-3 pr-4 text-gray-500 max-w-xs truncate">{d.description ?? '—'}</td>
                    <td className="py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(d.id)}
                        className="text-red-500 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
