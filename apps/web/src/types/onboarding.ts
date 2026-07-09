export interface TenantProfile {
  id: string
  name: string
  nameAr?: string
  address?: string
  logoUrl?: string
  slug?: string
  onboardingCompleted?: boolean
}

export interface AcademicYear {
  id: string
  year: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface ClassConfig {
  id?: string
  name: string
  nameAr?: string
  level?: string
  capacity?: number
  enrollmentFee: number
  tuitionFee: number
}

export type WizardStep = 'school' | 'year' | 'classes' | 'review'

export interface WizardState {
  currentStep: WizardStep
  schoolProfile: Partial<TenantProfile>
  academicYear: Partial<Omit<AcademicYear, 'id' | 'isActive'>>
  classes: ClassConfig[]
}

export const WIZARD_STEPS: WizardStep[] = ['school', 'year', 'classes', 'review']

export const WIZARD_STEP_LABEL: Record<WizardStep, string> = {
  school: '\u00c9cole',
  year: 'Ann\u00e9e scolaire',
  classes: 'Classes',
  review: 'R\u00e9capitulatif',
}
