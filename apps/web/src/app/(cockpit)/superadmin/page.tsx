import { SuperAdminClient } from '@/components/superadmin/SuperAdminClient'

export const metadata = { title: 'Super Admin — Madarisse' }

export default function SuperAdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Super Admin — Établissements</h1>
      <SuperAdminClient />
    </div>
  )
}
