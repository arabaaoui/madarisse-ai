import { Suspense } from 'react'
import Link from 'next/link'
import { Student360 } from '@/components/eleves/Student360'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Fiche élève — Madarisse AI' }

export default async function StudentPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center gap-3">
        <Link href="/eleves" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour
        </Link>
        <h1 className="text-xl font-semibold">Fiche élève</h1>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm py-8 text-center">Chargement…</div>}>
        <Student360 id={id} />
      </Suspense>
    </div>
  )
}
