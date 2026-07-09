'use client'

import { useState } from 'react'
import type { TenantProfile } from '@/types/onboarding'

interface Props {
  value: Partial<TenantProfile>
  onChange: (v: Partial<TenantProfile>) => void
  onNext: () => void
}

export function SchoolStep({ value, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!value.name?.trim()) e.name = 'Le nom de l\u2019\u00e9cole est requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Votre \u00e9cole</h2>
        <p className="mt-1 text-sm text-gray-500">Commencez par les informations de base de votre \u00e9tablissement.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nom de l\u2019\u00e9cole <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value.name ?? ''}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Ex\u00a0: \u00c9cole Al-Anwar"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nom en arabe
          </label>
          <input
            type="text"
            dir="rtl"
            value={value.nameAr ?? ''}
            onChange={(e) => onChange({ ...value, nameAr: e.target.value })}
            placeholder="\u0627\u0633\u0645 \u0627\u0644\u0645\u062f\u0631\u0633\u0629"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
          <input
            type="text"
            value={value.address ?? ''}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="Ex\u00a0: 12 Rue Hassan II, Casablanca"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
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
