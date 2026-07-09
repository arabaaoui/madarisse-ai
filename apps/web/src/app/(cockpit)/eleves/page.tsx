import { Suspense } from 'react'
import { ElevesClient } from '@/components/eleves/ElevesClient'

export const metadata = { title: 'Élèves — Madarisse AI' }

export default function ElevesPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Élèves</h1>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Chargement…</div>}>
        <ElevesClient />
      </Suspense>
    </div>
  )
}
