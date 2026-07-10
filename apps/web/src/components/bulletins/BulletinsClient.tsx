'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Printer, ChevronDown, ChevronUp } from 'lucide-react'

interface SchoolClass {
  id: string
  name: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  class_id: string | null
}

interface Note {
  id: string
  student_id: string
  subject: string
  exam_type: string
  grade: number
  coefficient: number
  semester: number
}

interface SubjectGroup {
  subject: string
  notes: Note[]
  average: number
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-[#02133E] text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function SaisieTab() {
  const sb = createClient()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, { subject: string; exam_type: string; grade: string; coefficient: string; semester: string }>>({})

  useEffect(() => {
    sb.from('classes').select('id, name').order('name').then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return }
    sb.from('students')
      .select('id, first_name, last_name, class_id')
      .eq('class_id', selectedClassId)
      .order('last_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [selectedClassId])

  const getForm = (studentId: string) => forms[studentId] ?? {
    subject: '', exam_type: 'cc', grade: '', coefficient: '1', semester: '1',
  }

  const setStudentForm = (studentId: string, field: string, value: string) => {
    setForms(prev => ({ ...prev, [studentId]: { ...getForm(studentId), [field]: value } }))
  }

  const handleAddNote = async (student: Student) => {
    const form = getForm(student.id)
    if (!form.subject.trim() || form.grade === '') {
      toast.error('Matière et note sont requis')
      return
    }
    setSubmitting(student.id)
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: student.id,
        class_id: student.class_id,
        subject: form.subject,
        exam_type: form.exam_type,
        grade: parseFloat(form.grade),
        coefficient: parseFloat(form.coefficient) || 1,
        semester: parseInt(form.semester) || 1,
      }),
    })
    setSubmitting(null)
    if (res.ok) {
      toast.success(`Note ajoutée pour ${student.first_name} ${student.last_name}`)
      setForms(prev => ({ ...prev, [student.id]: { subject: '', exam_type: 'cc', grade: '', coefficient: '1', semester: '1' } }))
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Classe</Label>
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sélectionner une classe</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {students.length === 0 && selectedClassId && (
        <p className="text-gray-500 text-sm">Aucun élève dans cette classe</p>
      )}

      <div className="space-y-2">
        {students.map(student => {
          const isOpen = expandedStudent === student.id
          const form = getForm(student.id)
          return (
            <div key={student.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedStudent(isOpen ? null : student.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-sm">{student.last_name} {student.first_name}</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isOpen && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Matière</Label>
                    <Input
                      placeholder="ex: Maths"
                      value={form.subject}
                      onChange={e => setStudentForm(student.id, 'subject', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Type d'examen</Label>
                    <select
                      value={form.exam_type}
                      onChange={e => setStudentForm(student.id, 'exam_type', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cc">Contrôle continu</option>
                      <option value="exam">Examen</option>
                      <option value="oral">Oral</option>
                      <option value="project">Projet</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Note /20</Label>
                    <Input
                      type="number" min="0" max="20" step="0.5"
                      placeholder="0–20"
                      value={form.grade}
                      onChange={e => setStudentForm(student.id, 'grade', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Coefficient</Label>
                    <Input
                      type="number" min="0.5" step="0.5"
                      value={form.coefficient}
                      onChange={e => setStudentForm(student.id, 'coefficient', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Semestre</Label>
                    <select
                      value={form.semester}
                      onChange={e => setStudentForm(student.id, 'semester', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Semestre 1</option>
                      <option value="2">Semestre 2</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleAddNote(student)}
                      disabled={submitting === student.id}
                      size="sm"
                      className="w-full"
                    >
                      {submitting === student.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Ajouter la note
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AperçuTab() {
  const sb = createClient()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [semester, setSemester] = useState('1')
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    sb.from('classes').select('id, name').order('name').then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedClassId) { setStudents([]); setSelectedStudentId(''); return }
    sb.from('students')
      .select('id, first_name, last_name, class_id')
      .eq('class_id', selectedClassId)
      .order('last_name')
      .then(({ data }) => setStudents(data ?? []))
  }, [selectedClassId])

  const loadNotes = useCallback(async () => {
    if (!selectedStudentId) { setNotes([]); return }
    setLoading(true)
    const res = await fetch(`/api/notes?student_id=${selectedStudentId}&semester=${semester}`)
    if (res.ok) setNotes(await res.json())
    setLoading(false)
  }, [selectedStudentId, semester])

  useEffect(() => { loadNotes() }, [loadNotes])

  useEffect(() => {
    setSelectedStudent(students.find(s => s.id === selectedStudentId) ?? null)
  }, [selectedStudentId, students])

  // Group notes by subject
  const subjectGroups: SubjectGroup[] = Object.values(
    notes.reduce<Record<string, SubjectGroup>>((acc, note) => {
      if (!acc[note.subject]) acc[note.subject] = { subject: note.subject, notes: [], average: 0 }
      acc[note.subject].notes.push(note)
      return acc
    }, {})
  ).map(group => {
    const totalCoeff = group.notes.reduce((s, n) => s + n.coefficient, 0)
    const weightedSum = group.notes.reduce((s, n) => s + n.grade * n.coefficient, 0)
    return { ...group, average: totalCoeff > 0 ? weightedSum / totalCoeff : 0 }
  })

  const overallAverage = subjectGroups.length > 0
    ? subjectGroups.reduce((s, g) => s + g.average, 0) / subjectGroups.length
    : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label>Classe</Label>
          <select
            value={selectedClassId}
            onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId('') }}
            className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Élève</Label>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectedClassId}
          >
            <option value="">Sélectionner</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Semestre</Label>
          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </select>
        </div>
        {selectedStudentId && (
          <Button variant="outline" size="sm" onClick={() => window.print()} className="ml-auto">
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

      {!loading && selectedStudentId && (
        <div className="border rounded-xl overflow-hidden print:border-0">
          <div className="bg-[#02133E] text-white px-6 py-4 print:bg-gray-800">
            <h3 className="text-lg font-semibold">
              Bulletin — {selectedStudent?.last_name} {selectedStudent?.first_name}
            </h3>
            <p className="text-sm opacity-75">Semestre {semester}</p>
          </div>

          {subjectGroups.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune note enregistrée</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Matière</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium text-right">Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjectGroups.map(group => (
                  <tr key={group.subject} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{group.subject}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {group.notes.map(n => (
                          <Badge key={n.id} variant="outline" className="text-xs">
                            {n.grade}/20 ({n.exam_type})
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={group.average >= 10 ? 'text-green-600' : 'text-red-500'}>
                        {group.average.toFixed(2)}/20
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-right" colSpan={2}>Moyenne générale</td>
                  <td className="px-4 py-3 text-right text-lg">
                    <span className={overallAverage >= 10 ? 'text-green-600' : 'text-red-500'}>
                      {overallAverage.toFixed(2)}/20
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {!selectedStudentId && !loading && (
        <p className="text-center text-gray-500 py-8">Sélectionnez une classe et un élève pour afficher le bulletin</p>
      )}
    </div>
  )
}

export function BulletinsClient() {
  const [tab, setTab] = useState<'saisie' | 'apercu'>('saisie')

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2">
        <TabBtn active={tab === 'saisie'} onClick={() => setTab('saisie')}>Saisie des notes</TabBtn>
        <TabBtn active={tab === 'apercu'} onClick={() => setTab('apercu')}>Aperçu bulletin</TabBtn>
      </div>

      {tab === 'saisie' ? <SaisieTab /> : <AperçuTab />}
    </div>
  )
}
