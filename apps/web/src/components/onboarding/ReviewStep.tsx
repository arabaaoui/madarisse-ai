'use client'

import type { WizardState } from '@/types/onboarding'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

interface Props {
  state: WizardState
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
  error: string | null
}

export function ReviewStep({ state, onBack, onSubmit, isSubmitting, error }: Props) {
  const { schoolProfile: s, academicYear: y, classes } = state

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">R\u00e9capitulatif</h2>
        <p className="mt-1 text-sm text-gray-500">V\u00e9rifiez les informations avant de cr\u00e9er votre \u00e9cole.</p>
      </div>

      <div className="space-y-4">
        {/* School */}
        <section className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">\u00c9tablissement</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Nom</dt>
              <dd className="font-medium">{s.name}</dd>
            </div>
            {s.nameAr && (
              <div className="flex gap-2">
                <dt className="w-32 text-gray-500">Nom (AR)</dt>
                <dd className="font-medium" dir="rtl">{s.nameAr}</dd>
              </div>
            )}
            {s.address && (
              <div className="flex gap-2">
                <dt className="w-32 text-gray-500">Adresse</dt>
                <dd>{s.address}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Academic year */}
        <section className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Ann\u00e9e scolaire</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">Intitul\u00e9</dt>
              <dd className="font-medium">{y.year}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 text-gray-500">P\u00e9riode</dt>
              <dd>
                {y.startDate && new Date(y.startDate).toLocaleDateString('fr-FR')}
                {' \u2192 '}
                {y.endDate && new Date(y.endDate).toLocaleDateString('fr-FR')}
              </dd>
            </div>
          </dl>
        </section>

        {/* Classes */}
        <section className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Classes ({classes.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-2">Classe</th>
                  <th className="pb-2 text-right">Inscription</th>
                  <th className="pb-2 text-right">Mensualit\u00e9</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classes.map((c, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-medium">{c.name}</td>
                    <td className="py-1.5 text-right font-mono">{fmt(c.enrollmentFee)}</td>
                    <td className="py-1.5 text-right font-mono">{fmt(c.tuitionFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          \u2190 Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-green-600 px-8 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Cr\u00e9ation en cours\u2026' : '\u2713 Cr\u00e9er mon \u00e9cole'}
        </button>
      </div>
    </div>
  )
}
