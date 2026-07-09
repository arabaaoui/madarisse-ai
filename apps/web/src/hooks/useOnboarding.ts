'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { WizardState, WizardStep, TenantProfile, ClassConfig } from '@/types/onboarding'

const STORAGE_KEY = 'madarisse_onboarding_wizard'

const INITIAL_STATE: WizardState = {
  currentStep: 'school',
  schoolProfile: {},
  academicYear: {},
  classes: [],
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setState(JSON.parse(saved) as WizardState)
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const setStep = useCallback((step: WizardStep) => update({ currentStep: step }), [update])

  const clear = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setState(INITIAL_STATE)
  }, [])

  return { state, update, setStep, clear, hydrated }
}

export function useOnboardingSubmit() {
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (state: WizardState) => {
      setError(null)

      // 1. Update tenant profile
      const schoolRes = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.schoolProfile),
      })
      if (!schoolRes.ok) {
        const err = await schoolRes.json() as { error?: string }
        throw new Error(err.error ?? 'Erreur lors de la mise \u00e0 jour de l\u2019\u00e9cole')
      }

      // 2. Create academic year
      const yearRes = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.academicYear, isActive: true }),
      })
      if (!yearRes.ok) {
        const err = await yearRes.json() as { error?: string }
        throw new Error(err.error ?? 'Erreur lors de la cr\u00e9ation de l\u2019ann\u00e9e scolaire')
      }

      // 3. Create classes (sequential to avoid RLS conflicts)
      for (const cls of state.classes) {
        const classRes = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cls),
        })
        if (!classRes.ok) {
          const err = await classRes.json() as { error?: string }
          throw new Error(err.error ?? `Erreur lors de la cr\u00e9ation de la classe ${cls.name}`)
        }
      }

      // 4. Mark onboarding complete
      await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      })
    },
    onError: (err: Error) => setError(err.message),
  })

  return { ...mutation, error }
}

export type { TenantProfile, ClassConfig }
