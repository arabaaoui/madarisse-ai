'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StudentForm } from './StudentForm'
import { StudentSearch } from './StudentSearch'
import { StudentList } from './StudentList'

export function ElevesClient() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="flex items-center gap-3">
        <StudentSearch onSearch={setSearch} className="flex-1 max-w-sm" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            + Nouvel élève
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nouveau dossier élève</DialogTitle>
            </DialogHeader>
            <StudentForm
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <StudentList search={search} />
    </div>
  )
}
