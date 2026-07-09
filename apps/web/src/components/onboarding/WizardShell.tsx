'use client'

import { useRouter } from 'next/navigation'
import { WIZARD_STEPS, WIZARD_STEP_LABEL } from '@/types/onboarding'
import { useWizardState, useOnboardingSubmit } from '@/hooks/useOnboarding'
import { SchoolStep } from './SchoolStep'
import { YearStep } from './YearStep'
import { ClassesStep } from './ClassesStep'
import { ReviewStep } from './ReviewStep'

export function WizardShell() {
  const router = useRouter()
  const { state, update, setStep, clear, hydrated } = useWizardState()
  const submit = useOnboardingSubmit()

  if (!hydrated) return null

  const currentIndex = WIZARD_STEPS.indexOf(state.currentStep)

  async function handleSubmit() {
    await submit.mutateAsync(state)
    clear()
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <nav className="mb-8 flex items-center gap-2">
        {WIZARD_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <button
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                i < currentIndex
                  ? 'bg-green-500 text-white'
                  : i === currentIndex
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
              onClick={() => i < currentIndex && setStep(step)}
              disabled={i >= currentIndex}
            >
              {i < currentIndex ? '\u2713' : i + 1}
            </button>
            <span className={`text-sm ${i === currentIndex ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
              {WIZARD_STEP_LABEL[step]}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <span className="mx-1 text-gray-300">/</span>
            )}
          </div>
        ))}
      </nav>

      {/* Step content */}
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        {state.currentStep === 'school' && (
          <SchoolStep
            value={state.schoolProfile}
            onChange={(v) => update({ schoolProfile: v })}
            onNext={() => setStep('year')}
          />
        )}
        {state.currentStep === 'year' && (
          <YearStep
            value={state.academicYear}
            onChange={(v) => update({ academicYear: v })}
            onBack={() => setStep('school')}
            onNext={() => setStep('classes')}
          />
        )}
        {state.currentStep === 'classes' && (
          <ClassesStep
            value={state.classes}
            onChange={(v) => update({ classes: v })}
            onBack={() => setStep('year')}
            onNext={() => setStep('review')}
          />
        )}
        {state.currentStep === 'review' && (
          <ReviewStep
            state={state}
            onBack={() => setStep('classes')}
            onSubmit={handleSubmit}
            isSubmitting={submit.isPending}
            error={submit.error}
          />
        )}
      </div>
    </div>
  )
}
