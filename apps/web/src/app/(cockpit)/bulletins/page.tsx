import { BulletinsClient } from '@/components/bulletins/BulletinsClient'

export const metadata = { title: 'Notes & Bulletins — Madarisse' }

export default function BulletinsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Notes & Bulletins</h1>
      <BulletinsClient />
    </div>
  )
}
