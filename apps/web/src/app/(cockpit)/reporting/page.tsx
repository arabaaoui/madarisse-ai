import { RecoveryReport } from '@/components/reporting/RecoveryReport'

export const metadata = { title: 'Reporting \u2014 Madarisse' }

export default function ReportingPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Reporting financier</h1>
      <RecoveryReport />
    </div>
  )
}
