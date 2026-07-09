-- Ensure academic_years has all onboarding columns
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- Only one active year per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_active_tenant
  ON academic_years (tenant_id)
  WHERE is_active = true;
