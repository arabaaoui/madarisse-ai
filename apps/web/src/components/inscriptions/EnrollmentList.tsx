'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useEnrollments, useValidateBatch, useValidateEnrollment } from '@/hooks/useEnrollments'
import { ENROLLMENT_STATUS_LABEL } from '@/types/enrollment'
import type { EnrollmentStatus } from '@/types/enrollment'

const STATUS_VARIANT: Record<EnrollmentStatus, 'default' | 'secondary' | 'outline'> = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'outline',
}

function fmt(amount: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(amount)
}

interface EnrollmentListProps {
  statusFilter?: string
}

export function EnrollmentList({ statusFilter = 'pending' }: EnrollmentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading, isError } = useEnrollments({ status: statusFilter, limit: 100 })
  const validateBatch = useValidateBatch()
  const validateOne = useValidateEnrollment()

  const enrollments = data?.data ?? []
  const pending = enrollments.filter((e) => e.status === 'pending')

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pending.map((e) => e.id)))
    }
  }

  async function handleValidateBatch() {
    await validateBatch.mutateAsync([...selectedIds])
    setSelectedIds(new Set())
    setConfirmOpen(false)
  }

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
  if (isError) return <div className="py-8 text-center text-sm text-destructive">Erreur de chargement.</div>

  if (enrollments.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune inscription {statusFilter === 'pending' ? 'en attente' : ''}.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barre d'actions masse */}
      {statusFilter === 'pending' && pending.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} sélectionnée(s)`
              : `${pending.length} en attente`}
          </span>
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              Valider tout ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {statusFilter === 'pending' && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pending.length && pending.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead>Élève</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Année</TableHead>
              <TableHead className="text-right">Frais inscr.</TableHead>
              <TableHead className="text-right">Scolarité/mois</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                {statusFilter === 'pending' && (
                  <TableCell>
                    {e.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        className="cursor-pointer"
                      />
                    )}
                  </TableCell>
                )}
                <TableCell className="font-medium">{e.studentName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.className}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.academicYear}</TableCell>
                <TableCell className="text-right text-sm">{fmt(e.enrollmentFee)}</TableCell>
                <TableCell className="text-right text-sm">{fmt(e.tuitionFee)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[e.status]}>
                    {ENROLLMENT_STATUS_LABEL[e.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  {e.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={validateOne.isPending}
                      onClick={() => validateOne.mutate({ id: e.id, status: 'confirmed' })}
                    >
                      Valider
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog confirmation validation en masse */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la validation en masse</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm">
            <p className="mb-2 text-muted-foreground">
              Vous allez valider <strong>{selectedIds.size} inscription(s)</strong> en attente.
              Cette action générera les échéanciers de paiement correspondants.
            </p>
            <ul className="space-y-1 max-h-48 overflow-auto">
              {enrollments
                .filter((e) => selectedIds.has(e.id))
                .map((e) => (
                  <li key={e.id} className="flex justify-between text-xs">
                    <span>{e.studentName}</span>
                    <span className="text-muted-foreground">{e.className} — {e.academicYear}</span>
                  </li>
                ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button
              onClick={handleValidateBatch}
              disabled={validateBatch.isPending}
            >
              {validateBatch.isPending ? 'Validation…' : `Valider ${selectedIds.size} inscription(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
