'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Spinner } from '../shared'

interface AcademicYear { id: string; year: string }
interface SchoolClass { id: string; name: string }
interface Unit { id: string; name_fr: string }
interface Association { id: string; class_id: string; unit_id: string }

export default function SubjectClassMatrixTab({ tenantId }: { tenantId: string }) {
  const sb = createClient()
  const [years, setYears] = useState<AcademicYear[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>('')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

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
    const [{ data: cls }, { data: u }, { data: assoc }] = await Promise.all([
      sb.from('classes').select('id, name').eq('tenant_id', tenantId).order('name'),
      sb.from('units').select('id, name_fr').eq('tenant_id', tenantId).order('name_fr'),
      sb.from('unit_class_associations').select('*').eq('tenant_id', tenantId).eq('academic_year_id', selectedYearId),
    ])
    setClasses(cls ?? [])
    setUnits(u ?? [])
    setAssociations(assoc ?? [])
    setLoading(false)
  }, [tenantId, selectedYearId])

  useEffect(() => { load() }, [load])

  const isAssociated = (classId: string, unitId: string) =>
    associations.some(a => a.class_id === classId && a.unit_id === unitId)

  const toggle = async (classId: string, unitId: string) => {
    const key = `${classId}-${unitId}`
    setToggling(key)
    const existing = associations.find(a => a.class_id === classId && a.unit_id === unitId)
    if (existing) {
      const { error } = await sb.from('unit_class_associations').delete().eq('id', existing.id)
      if (error) { toast.error(error.message); setToggling(null); return }
      setAssociations(prev => prev.filter(a => a.id !== existing.id))
    } else {
      const { data, error } = await sb.from('unit_class_associations').insert({
        tenant_id: tenantId,
        class_id: classId,
        unit_id: unitId,
        academic_year_id: selectedYearId,
      }).select().single()
      if (error) { toast.error(error.message); setToggling(null); return }
      if (data) setAssociations(prev => [...prev, data])
    }
    setToggling(null)
  }

  const countForUnit = (unitId: string) =>
    associations.filter(a => a.unit_id === unitId).length

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Associer les unités aux classes</h2>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">Année scolaire</label>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20"
          value={selectedYearId}
          onChange={e => setSelectedYearId(e.target.value)}
        >
          <option value="">— Sélectionner une année —</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : selectedYearId && (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 bg-gray-50 min-w-[120px]">Classe</th>
                {units.map(u => (
                  <th key={u.id} className="p-2 text-center font-medium text-gray-600 border border-gray-200 bg-gray-50 min-w-[80px]">
                    <div>{u.name_fr}</div>
                    <div className="text-xs font-normal text-gray-400">{countForUnit(u.id)} cl.</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-2 font-medium border border-gray-200">{c.name}</td>
                  {units.map(u => {
                    const key = `${c.id}-${u.id}`
                    const checked = isAssociated(c.id, u.id)
                    return (
                      <td key={u.id} className="p-2 text-center border border-gray-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={toggling === key}
                          onChange={() => toggle(c.id, u.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#02133E] focus:ring-[#FF7A00] cursor-pointer disabled:opacity-50"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
              {classes.length === 0 && (
                <tr><td colSpan={units.length + 1} className="py-8 text-center text-gray-400">Aucune classe configurée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!selectedYearId && <p className="text-sm text-gray-400">Sélectionnez une année scolaire pour voir la matrice.</p>}
    </div>
  )
}
