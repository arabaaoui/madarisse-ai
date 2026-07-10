import SettingsClient from '@/components/settings/SettingsClient'

export const metadata = { title: 'Paramètres — Madarisse' }

export default function ParametresPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configuration de l&apos;école, des années scolaires, du curriculum et des utilisateurs.</p>
      </div>
      <SettingsClient />
    </div>
  )
}
