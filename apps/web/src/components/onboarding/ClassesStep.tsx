'use client'

import { useState } from 'react'
import type { ClassConfig } from '@/types/onboarding'

interface Props {
  value: ClassConfig[]
  onChange: (v: ClassConfig[]) => void
  onBack: () => void
  onNext: () => void
}

const EMPTY_CLASS: ClassConfig = { name: '', enrollmentFee: 0, tuitionFee: 0 }

export function ClassesStep({ value, onChange, onBack, onNext }: Props) {
  const [error, setError] = useState<string | null>(null)

  function addClass() {
    onChange([...value, { ...EMPTY_CLASS }])
  }

  function removeClass(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function updateClass(i: number, patch: Partial<ClassConfig>) {
    onChange(value.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function validate() {
    if (value.length === 0) { setError('Ajoutez au moins une classe'); return false }
    const invalid = value.find((c) => !c.name.trim())
    if (invalid) { setError('Toutes les classes doivent avoir un nom'); return false }
    setError(null)
    return true
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Classes</h2>
        <p className="mt-1 text-sm text-gray-500">Ajoutez les classes de votre \u00e9tablissement avec leurs tarifs.</p>
      </div>

      <div className="space-y-3">
        {value.map((cls, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Classe {i + 1}</span>
              <button
                onClick={() => removeClass(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cls.name}
                  onChange={(e) => updateClass(i, { name: e.target.value })}
                  placeholder="Ex\u00a0: 6\u00e8me A"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Frais inscription (MAD)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={cls.enrollmentFee}
                  onChange={(e) => updateClass(i, { enrollmentFee: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Scolarit\u00e9/mois (MAD)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={cls.tuitionFee}
                  onChange={(e) => updateClass(i, { tuitionFee: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addClass}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          + Ajouter une classe
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
