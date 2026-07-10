'use client'

import { useState } from 'react'
import { ClassAttendanceSheet } from './ClassAttendanceSheet'
import { AbsenceReport } from './AbsenceReport'

type Tab = 'saisie' | 'rapport'

const TABS: { id: Tab; label: string }[] = [
  { id: 'saisie', label: 'Saisie du jour' },
  { id: 'rapport', label: 'Rapport mensuel' },
]

export function PresencesClient() {
  const [tab, setTab] = useState<Tab>('saisie')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden w-fit text-sm">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-2 transition-colors',
              i > 0 ? 'border-l border-gray-200' : '',
              tab === t.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'saisie' && <ClassAttendanceSheet />}
      {tab === 'rapport' && <AbsenceReport />}
    </div>
  )
}
