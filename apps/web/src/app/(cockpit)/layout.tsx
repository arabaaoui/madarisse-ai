/**
 * Layout du cockpit principal — toutes les pages opérationnelles.
 * Structure : sidebar (navigation) + zone centrale (contenu module) + panneau assistant (repliable).
 * Vérifie l'authentification côté serveur.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/cockpit/Sidebar'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { Providers } from '@/components/cockpit/Providers'

export default async function CockpitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar navigation */}
        <Sidebar />

        {/* Zone centrale — module actif */}
        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>

        {/* Panneau assistant repliable (⌘K) */}
        <AssistantPanel userId={user.id} />
      </div>
    </Providers>
  )
}
