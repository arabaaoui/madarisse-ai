'use client'

import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStudents } from '@/hooks/useStudents'
import { STUDENT_STATUS_LABEL } from '@/types/student'
import type { StudentStatus } from '@/types/student'

const STATUS_VARIANT: Record<StudentStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  inactive: 'outline',
}

interface StudentListProps {
  search?: string
  classId?: string
  status?: string
}

export function StudentList({ search, classId, status }: StudentListProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useStudents({ search, classId, status, limit: 50 })

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
  }

  if (isError) {
    return <div className="py-8 text-center text-sm text-destructive">Erreur lors du chargement des élèves.</div>
  }

  const students = data?.data ?? []

  if (students.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {search ? `Aucun élève trouvé pour « ${search} ».` : 'Aucun élève enregistré.'}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead className="text-right" dir="rtl">الاسم</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow
              key={s.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => router.push(`/eleves/${s.id}`)}
            >
              <TableCell className="font-medium">
                {s.firstName} {s.lastName}
              </TableCell>
              <TableCell className="text-right font-medium" dir="rtl">
                {s.firstNameAr || s.lastNameAr
                  ? `${s.firstNameAr ?? ''} ${s.lastNameAr ?? ''}`.trim()
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.className ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[s.annualStatus]}>
                  {STUDENT_STATUS_LABEL[s.annualStatus]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.phone ?? s.email ?? '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/eleves/${s.id}`)
                  }}
                >
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
