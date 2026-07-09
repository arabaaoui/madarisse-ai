import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DashboardKpis } from '@/components/cockpit/DashboardKpis'

export const metadata = { title: 'Tableau de bord \u2014 Madarisse' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const tenantName = session?.user?.user_metadata?.tenant_name as string | undefined

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tenantName ?? 'Tableau de bord'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
        </div>
        <Link
          href="/inscriptions"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Nouvelle inscription
        </Link>
      </div>

      <DashboardKpis />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Rechercher un \u00e9l\u00e8ve', href: '/eleves', icon: '\ud83d\udc65' },
            { label: 'Valider des inscriptions', href: '/inscriptions', icon: '\u2705' },
            { label: 'Enregistrer un paiement', href: '/paiements', icon: '\ud83d\udcb3' },
            { label: 'Rapport mensuel', href: '/reporting', icon: '\ud83d\udcca' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        Appuyez sur{' '}
        <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
          \u2318K
        </kbd>{' '}
        pour ouvrir l&apos;assistant et poser une question ou d\u00e9l\u00e9guer une t\u00e2che.
      </div>
    </div>
  )
}
