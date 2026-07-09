import { PaiementsClient } from '@/components/paiements/PaiementsClient'

export const metadata = { title: 'Paiements — Madarisse' }

export default function PaiementsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Paiements</h1>
      <PaiementsClient />
    </div>
  )
}
