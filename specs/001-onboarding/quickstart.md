# Quickstart — Testing 001-onboarding

---

## Prerequisites

- Node.js 20+, pnpm installed
- Python 3.12+, uv installed
- A Supabase project with a test tenant (or use the local Supabase CLI stack)

---

## 1. Run DB Migrations

```bash
# From repo root — apply migrations in order
supabase db push
# or manually:
psql $DATABASE_URL -f db/migrations/20260709000002_onboarding_academic_years.sql
psql $DATABASE_URL -f db/migrations/20260709000003_onboarding_classes.sql
psql $DATABASE_URL -f db/migrations/20260709000004_onboarding_tenants.sql
```

Verify columns exist:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('tenants', 'academic_years', 'classes')
ORDER BY table_name, column_name;
```

---

## 2. Unit Tests (no real Supabase needed)

### TypeScript — type-check only (no Jest)
```bash
cd apps/web
pnpm tsc --noEmit
```

### Python — API handler tests
```bash
cd services/agent
uv run pytest tests/test_onboarding_tools.py -v
```

Expected: all HITL propose_* functions return an `action_log_id` string without hitting Supabase (mock the client in conftest).

---

## 3. Integration Test — Wizard End-to-End

### Start the web app
```bash
cd apps/web
pnpm dev
```

### Start the agent service
```bash
cd services/agent
uv run uvicorn main:app --reload --port 8000
```

### Manual test flow

1. Open `http://localhost:3000/onboarding` in a browser.
2. If localStorage has stale state, clear it: `localStorage.removeItem('onboarding_wizard')` in DevTools.

**Step 1 — School profile**
- Fill: Name = "École Test", Name AR = "مدرسة الاختبار", Address = "1 rue Test, Rabat"
- Click Next → verify `localStorage['onboarding_wizard'].currentStep === 'year'`

**Step 2 — Academic year**
- Fill: Year = "2025-2026", Start = "2025-09-01", End = "2026-06-30"
- Try invalid dates (End before Start) → expect validation error, Next button disabled
- Fix dates → click Next

**Step 3 — Classes**
- Add 3 classes: "CP" (enrollment 500, tuition 800), "CE1" (500, 800), "6ème" (1000, 1200)
- Remove one class → verify it disappears
- Click Next

**Step 4 — Review**
- Verify summary shows all entered data
- Click "Créer l'école" → expect:
  - `PATCH /api/tenant` → 200
  - `POST /api/academic-years` → 201
  - `POST /api/classes` × 3 → 201 each
  - `localStorage['onboarding_wizard']` cleared
  - Redirect to `/dashboard`

### Verify in DB
```sql
SELECT id, name, slug FROM tenants WHERE name = 'École Test';
SELECT year, start_date, is_active FROM academic_years WHERE tenant_id = '<id>';
SELECT name, enrollment_fee, tuition_fee FROM classes WHERE tenant_id = '<id>';
```

---

## 4. API Smoke Tests (curl)

Set your session cookie from the browser DevTools (Network tab → any request → copy `sb-*` cookies).

```bash
COOKIE="sb-access-token=<token>"

# Get tenant profile
curl -s http://localhost:3000/api/tenant -H "Cookie: $COOKIE" | jq .

# Create academic year
curl -s -X POST http://localhost:3000/api/academic-years \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"year":"2025-2026","startDate":"2025-09-01","endDate":"2026-06-30","isActive":true}' | jq .

# Create class
curl -s -X POST http://localhost:3000/api/classes \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"CP","enrollmentFee":500,"tuitionFee":800}' | jq .
```

---

## 5. Agent (US2) Smoke Test

```bash
# Start agent and open the /onboarding page in the "Assistant" tab
# Type in the chat:
"J'ai une école qui s'appelle Al Nour, j'ai 3 classes de primaire CP CE1 CE2,
les frais d'inscription sont 500 MAD et la scolarité 800 MAD par mois"

# Expected agent behavior:
# 1. Extracts: name=Al Nour, 3 classes, fees
# 2. Asks: "Pouvez-vous me confirmer les dates de l'année scolaire ?"
# 3. After answer: shows recap canvas
# 4. On user click "Valider": calls propose_setup_tenant → HITL pending
# 5. Confirmation UI appears → user clicks Confirmer
# 6. Repeat for year, then each class
```

---

## 6. Tenant Isolation Test

```bash
# Login as tenant A, create a class
# Login as tenant B (different account)
# GET /api/classes → must NOT return tenant A's classes
# Verify via RLS: run query as tenant B's JWT, confirm empty result
```
