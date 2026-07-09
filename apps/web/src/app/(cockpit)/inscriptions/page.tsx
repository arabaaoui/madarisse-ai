import { Suspense } from 'react'
import { InscriptionsClient } from '@/components/inscriptions/InscriptionsClient'

export const metadata = { title: 'Inscriptions — Madarisse AI' }

export default function InscriptionsPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inscriptions</h1>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Chargement…</div>}>
        <InscriptionsClient />
      </Suspense>
    </div>
  )
}
