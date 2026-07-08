/**
 * Dashboard — page d'accueil du cockpit.
 * KPIs, briefing ambiant, actions rapides.
 */

import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bienvenue, {user?.email}
          </p>
        </div>
      </div>

      {/* Placeholder — KPIs seront ajoutés en Phase 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Élèves inscrits', value: '—', note: 'cette année' },
          { label: 'Taux de recouvrement', value: '—', note: 'ce mois' },
          { label: 'Inscriptions en attente', value: '—', note: 'à valider' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border bg-card p-4 space-y-1"
          >
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="text-3xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.note}</p>
          </div>
        ))}
      </div>

      {/* Tip assistant */}
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        💡 Appuyez sur <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono">⌘K</kbd> pour
        ouvrir l&apos;assistant et poser une question ou déléguer une tâche.
      </div>
    </div>
  )
}
