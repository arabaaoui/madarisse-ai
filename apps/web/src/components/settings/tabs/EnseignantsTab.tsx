'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { inp, Spinner } from '../shared'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface Subject {
  id: string
  name_fr: string
  unit_id: string
  unit_name: string
}

interface SchoolClass {
  id: string
  name: string
}

interface UnitClassAssoc {
  unit_id: string
  class_id: string
}

interface Assignment {
  teacher_id: string
  subject_id: string
  class_id: string
}

export default function EnseignantsTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [unitClassAssocs, setUnitClassAssocs] = useState<UnitClassAssoc[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await sb.from('profiles').select('id, first_name, last_name, email').eq('tenant_id', tenantId)
    const { data: roles } = await sb.from('user_roles').select('user_id').eq('tenant_id', tenantId).eq('role', 'teacher')
    const teacherIds = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id))
    setTeachers((profiles ?? []).filter((p: { id: string; first_name: string | null; last_name: string | null; email: string }) => teacherIds.has(p.id)).map((p: { id: string; first_name: string | null; last_name: string | null; email: string }) => ({
      id: p.id,
      first_name: p.first_name ?? '',
      last_name: p.last_name ?? '',
      email: p.email,
    })))

    const { data: subs } = await sb.from('subjects')
      .select('id, name_fr, unit_id, units!inner(name_fr)')
      .eq('tenant_id', tenantId)
      .order('unit_id')
      .order('name_fr')
    setSubjects((subs ?? []).map((s: { id: string; name_fr: string; unit_id: string; units: { name_fr: string } | { name_fr: string }[] }) => ({
      id: s.id,
      name_fr: s.name_fr,
      unit_id: s.unit_id,
      unit_name: Array.isArray(s.units) ? s.units[0]?.name_fr ?? '' : (s.units as { name_fr: string }).name_fr,
    })))

    const { data: cls } = await sb.from('classes').select('id, name').eq('tenant_id', tenantId).order('name')
    setClasses(cls ?? [])

    const { data: assocs } = await sb.from('unit_class_associations').select('unit_id, class_id').eq('tenant_id', tenantId)
    setUnitClassAssocs(assocs ?? [])

    setLoading(false)
  }, [tenantId])

  const loadAssignments = useCallback(async () => {
    if (!selectedTeacherId) { setAssignments([]); return }
    const { data } = await sb.from('teacher_subject_class_assignments')
      .select('teacher_id, subject_id, class_id')
      .eq('tenant_id', tenantId)
      .eq('teacher_id', selectedTeacherId)
    setAssignments(data ?? [])
  }, [tenantId, selectedTeacherId])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadAssignments() }, [loadAssignments])

  const isAssigned = (subjectId: string, classId: string) =>
    assignments.some(a => a.subject_id === subjectId && a.class_id === classId)

  const toggle = async (subjectId: string, classId: string, unitId: string) => {
    if (!selectedTeacherId) return
    const key = `${subjectId}-${classId}`
    setToggling(key)
    const existing = assignments.find(a => a.subject_id === subjectId && a.class_id === classId)
    if (existing) {
      const { error } = await sb.from('teacher_subject_class_assignments')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('teacher_id', selectedTeacherId)
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
      if (error) { toast.error(error.message); setToggling(null); return }
      setAssignments(prev => prev.filter(a => !(a.subject_id === subjectId && a.class_id === classId)))
    } else {
      const { error } = await sb.from('teacher_subject_class_assignments').insert({
        tenant_id: tenantId,
        teacher_id: selectedTeacherId,
        subject_id: subjectId,
        class_id: classId,
        unit_id: unitId,
      })
      if (error) { toast.error(error.message); setToggling(null); return }
      setAssignments(prev => [...prev, { teacher_id: selectedTeacherId, subject_id: subjectId, class_id: classId }])
    }
    setToggling(null)
  }

  // For each subject, show only classes that have the subject's unit assigned
  const getClassesForSubject = (unitId: string) =>
    classes.filter(c => unitClassAssocs.some(a => a.unit_id === unitId && a.class_id === c.id))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Affectation des enseignants</h2>

      {loading ? <Spinner /> : (
        <>
          <div className="space-y-1.5 max-w-sm">
            <label className="block text-xs font-medium text-gray-600">Enseignant</label>
            <select
              className={inp}
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
            >
              <option value="">— Sélectionner un enseignant —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} — {t.email}</option>
              ))}
            </select>
            {teachers.length === 0 && (
              <p className="text-xs text-amber-600">Aucun utilisateur avec le rôle &quot;teacher&quot; trouvé.</p>
            )}
          </div>

          {selectedTeacherId && (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 bg-gray-50 min-w-[140px]">Matière</th>
                    <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 bg-gray-50 min-w-[100px]">Unité</th>
                    {classes.map(c => (
                      <th key={c.id} className="p-2 text-center font-medium text-gray-600 border border-gray-200 bg-gray-50 min-w-[80px]">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => {
                    const eligibleClasses = getClassesForSubject(s.unit_id)
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-2 font-medium border border-gray-200">{s.name_fr}</td>
                        <td className="p-2 text-gray-500 border border-gray-200">{s.unit_name}</td>
                        {classes.map(c => {
                          const eligible = eligibleClasses.some(ec => ec.id === c.id)
                          const key = `${s.id}-${c.id}`
                          return (
                            <td key={c.id} className={`p-2 text-center border border-gray-200 ${!eligible ? 'bg-gray-50' : ''}`}>
                              {eligible ? (
                                <input
                                  type="checkbox"
                                  checked={isAssigned(s.id, c.id)}
                                  disabled={toggling === key}
                                  onChange={() => toggle(s.id, c.id, s.unit_id)}
                                  className="h-4 w-4 rounded border-gray-300 text-[#02133E] focus:ring-[#FF7A00] cursor-pointer disabled:opacity-50"
                                />
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {subjects.length === 0 && (
                    <tr><td colSpan={classes.length + 2} className="py-8 text-center text-gray-400">Aucune matière configurée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
