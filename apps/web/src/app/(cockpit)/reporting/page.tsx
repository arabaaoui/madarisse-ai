import { RecoveryReport } from '@/components/reporting/RecoveryReport'
import { AgentActivityLog } from '@/components/reporting/AgentActivityLog'
import { MonthlyRevenueChart } from '@/components/reporting/MonthlyRevenueChart'
import { ClassRecoveryTable } from '@/components/reporting/ClassRecoveryTable'

export const metadata = { title: 'Reporting — Madarisse' }

export default function ReportingPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Reporting financier</h1>
        <MonthlyRevenueChart />
      </div>

      <div>
        <ClassRecoveryTable />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recouvrement détaillé</h2>
        <RecoveryReport />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Journal des actions agent (HITL)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Historique de toutes les actions proposées et confirmées par l&apos;assistant IA.
        </p>
        <AgentActivityLog />
      </div>
    </div>
  )
}
