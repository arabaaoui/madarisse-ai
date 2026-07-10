import { MessagerieClient } from '@/components/messagerie/MessagerieClient'

export const metadata = { title: 'Messagerie — Madarisse' }

export default function MessageriePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Messagerie</h1>
      <MessagerieClient />
    </div>
  )
}
