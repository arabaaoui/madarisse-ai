import { DevoirsClient } from '@/components/devoirs/DevoirsClient'

export const metadata = { title: 'Devoirs — Madarisse' }

export default function DevoirsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Devoirs</h1>
      <DevoirsClient />
    </div>
  )
}
