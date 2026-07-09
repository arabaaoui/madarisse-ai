'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EnrollmentForm } from './EnrollmentForm'
import { EnrollmentList } from './EnrollmentList'

export function InscriptionsClient() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'pending' | 'confirmed'>('pending')

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Tabs */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          <button
            className={`px-3 py-1.5 ${tab === 'pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setTab('pending')}
          >
            En attente
          </button>
          <button
            className={`px-3 py-1.5 border-l ${tab === 'confirmed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setTab('confirmed')}
          >
            Confirmées
          </button>
        </div>

        <div className="flex-1" />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            + Nouvelle inscription
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nouvelle inscription</DialogTitle>
            </DialogHeader>
            <EnrollmentForm
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <EnrollmentList statusFilter={tab} />
    </div>
  )
}
