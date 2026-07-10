'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'

interface SchoolClass {
  id: string
  name: string
}

interface CalEvent {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  event_type: string
  class_id: string | null
  classes: { name: string } | null
}

const TYPE_COLORS: Record<string, string> = {
  holiday: 'bg-red-500',
  exam: 'bg-orange-400',
  meeting: 'bg-blue-500',
  other: 'bg-gray-400',
}

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Vacances',
  exam: 'Examen',
  meeting: 'Réunion',
  other: 'Autre',
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  holiday: 'bg-red-100 text-red-700 border-red-200',
  exam: 'bg-orange-100 text-orange-700 border-orange-200',
  meeting: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  // Fill leading empty cells (Monday = 0)
  const startDow = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function toYYYYMM(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function CalendrierClient() {
  const sb = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    event_type: 'other',
    class_id: '',
  })

  useEffect(() => {
    sb.from('classes').select('id, name').order('name').then(({ data }) => setClasses(data ?? []))
  }, [])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/calendrier?month=${toYYYYMM(year, month)}`)
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const eventsForDay = (dateStr: string) =>
    events.filter(e => e.start_date <= dateStr && (e.end_date ? e.end_date >= dateStr : e.start_date === dateStr))

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.start_date) {
      toast.error('Titre et date de début sont requis')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/calendrier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Événement ajouté')
      setForm({ title: '', description: '', start_date: '', end_date: '', event_type: 'other', class_id: '' })
      setShowForm(false)
      loadEvents()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/calendrier?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Événement supprimé')
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedDay(null)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  const days = getMonthDays(year, month)
  const todayStr = toDateStr(now)
  const DOW_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold capitalize min-w-[200px] text-center">
            {formatMonth(year, month)}
          </h2>
          <button onClick={next} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button onClick={() => setShowForm(f => !f)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Ajouter un événement
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border rounded-xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Nouvel événement</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de l'événement" required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                value={form.event_type}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Classe (optionnel)</Label>
              <select
                value={form.class_id}
                onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Date de début *</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Date de fin</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Description optionnelle..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Ajouter
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1 border rounded-xl bg-white shadow-sm overflow-hidden">
          {/* DOW headers */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {DOW_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="border-b border-r min-h-[80px] bg-gray-50/50" />
                const dateStr = toDateStr(day)
                const dayEvents = eventsForDay(dateStr)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDay

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`border-b border-r min-h-[80px] p-1 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-[#02133E] text-white' : 'text-gray-700'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className={`text-[10px] text-white px-1 rounded truncate ${TYPE_COLORS[ev.event_type] ?? 'bg-gray-400'}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-500">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedDay && (
          <div className="w-72 border rounded-xl bg-white shadow-sm p-4 space-y-3 shrink-0">
            <h3 className="font-semibold text-sm">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>

            {selectedDayEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun événement ce jour</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(ev => (
                  <div key={ev.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{ev.title}</span>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded border ${TYPE_BADGE_COLORS[ev.event_type] ?? ''}`}>
                      {TYPE_LABELS[ev.event_type]}
                    </span>
                    {ev.classes?.name && <p className="text-xs text-gray-500">Classe: {ev.classes.name}</p>}
                    {ev.description && <p className="text-xs text-gray-600">{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type]}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
