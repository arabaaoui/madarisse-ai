-- Ensure classes has all onboarding columns
ALTER TABLE classes ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS enrollment_fee numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS tuition_fee numeric(10,2) NOT NULL DEFAULT 0;

-- Ensure tenants has onboarding profile columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_slug ON tenants (slug) WHERE slug IS NOT NULL;
