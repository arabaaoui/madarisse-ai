'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStudent } from '@/hooks/useStudent'
import { STUDENT_STATUS_LABEL } from '@/types/student'
import type { StudentStatus } from '@/types/student'

const STATUS_VARIANT: Record<StudentStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  inactive: 'outline',
}

function fmt(amount: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(amount)
}

interface Student360Props {
  id: string
}

export function Student360({ id }: Student360Props) {
  const { data: student, isLoading, isError, error } = useStudent(id)

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement de la fiche…</div>
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {(error as Error)?.message ?? 'Erreur lors du chargement.'}
      </div>
    )
  }

  if (!student) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Identité */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-xl">
                {student.firstName} {student.lastName}
              </CardTitle>
              {(student.firstNameAr || student.lastNameAr) && (
                <p className="text-base text-muted-foreground mt-0.5" dir="rtl">
                  {`${student.firstNameAr ?? ''} ${student.lastNameAr ?? ''}`.trim()}
                </p>
              )}
            </div>
            <Badge variant={STATUS_VARIANT[student.annualStatus]}>
              {STUDENT_STATUS_LABEL[student.annualStatus]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="Date de naissance" value={student.dateOfBirth
            ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
            : '—'} />
          <Row label="Genre" value={student.gender === 'M' ? 'Masculin' : 'Féminin'} />
          <Row label="Classe" value={student.class?.name ?? '—'} />
          {student.parentName && <Row label="Parent" value={student.parentName} />}
          {student.parentPhone && <Row label="Téléphone" value={student.parentPhone} />}
          {student.parentEmail && <Row label="Email" value={student.parentEmail} />}
        </CardContent>
      </Card>

      {/* Inscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inscription</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {student.enrollment ? (
            <>
              <Row label="Année" value={student.enrollment.academicYear} />
              <Row label="Statut" value={student.enrollment.status === 'confirmed' ? 'Confirmée' : student.enrollment.status} />
              <Row label="Frais inscription" value={fmt(student.enrollment.enrollmentFee)} />
              <Row label="Frais scolarité" value={fmt(student.enrollment.tuitionFee)} />
            </>
          ) : (
            <p className="text-muted-foreground">Aucune inscription active.</p>
          )}
        </CardContent>
      </Card>

      {/* Paiements */}
      {student.paymentSummary && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Suivi des paiements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <Stat label="Total dû" value={fmt(student.paymentSummary.totalDue)} />
            <Stat label="Payé" value={fmt(student.paymentSummary.totalPaid)} highlight="green" />
            <Stat
              label="En retard"
              value={fmt(student.paymentSummary.totalOverdue)}
              highlight={student.paymentSummary.totalOverdue > 0 ? 'red' : undefined}
            />
            {student.paymentSummary.nextDueDate && (
              <Stat
                label="Prochaine échéance"
                value={new Date(student.paymentSummary.nextDueDate).toLocaleDateString('fr-FR')}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-semibold text-base ${highlight === 'red' ? 'text-red-600' : highlight === 'green' ? 'text-green-600' : ''}`}>
        {value}
      </span>
    </div>
  )
}
