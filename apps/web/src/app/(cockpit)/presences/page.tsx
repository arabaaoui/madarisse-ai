import { PresencesClient } from '@/components/presences/PresencesClient'

export const metadata = { title: 'Présences — Madarisse' }

export default function PresencesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des présences</h1>
      <PresencesClient />
    </div>
  )
}
