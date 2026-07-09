import { WizardShell } from '@/components/onboarding/WizardShell'
import { Providers } from '@/components/cockpit/Providers'

export const metadata = { title: 'Configuration de l\u2019\u00e9cole \u2014 Madarisse' }

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur Madarisse</h1>
          <p className="mt-2 text-gray-500">
            Configurez votre \u00e9cole en quelques minutes pour commencer.
          </p>
        </div>
        <Providers>
          <WizardShell />
        </Providers>
      </div>
    </div>
  )
}
