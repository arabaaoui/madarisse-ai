import { CalendrierClient } from '@/components/calendrier/CalendrierClient'

export const metadata = { title: 'Calendrier — Madarisse' }

export default function CalendrierPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendrier</h1>
      <CalendrierClient />
    </div>
  )
}
