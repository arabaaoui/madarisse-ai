'use client'

import { useState } from 'react'
import type { AcademicYear } from '@/types/onboarding'

type YearDraft = Partial<Omit<AcademicYear, 'id' | 'isActive'>>

interface Props {
  value: YearDraft
  onChange: (v: YearDraft) => void
  onBack: () => void
  onNext: () => void
}

export function YearStep({ value, onChange, onBack, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!value.year?.trim()) e.year = 'Intitul\u00e9 requis (ex\u00a0: 2025-2026)'
    if (!value.startDate) e.startDate = 'Date de d\u00e9but requise'
    if (!value.endDate) e.endDate = 'Date de fin requise'
    if (value.startDate && value.endDate && new Date(value.endDate) <= new Date(value.startDate)) {
      e.endDate = 'La date de fin doit \u00eatre apr\u00e8s la date de d\u00e9but'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Ann\u00e9e scolaire</h2>
        <p className="mt-1 text-sm text-gray-500">D\u00e9finissez la p\u00e9riode de l\u2019ann\u00e9e scolaire en cours.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Intitul\u00e9 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value.year ?? ''}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            placeholder="Ex\u00a0: 2025-2026"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              D\u00e9but <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={value.startDate ?? ''}
              onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={value.endDate ?? ''}
              onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          \u2190 Retour
        </button>
        <button
          onClick={() => validate() && onNext()}
          className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Suivant \u2192
        </button>
      </div>
    </div>
  )
}
