# Implementation Plan: Paiements — Encaissement, suivi et rapport financier

**Branch**: `004-paiements` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

## Summary

Cockpit de paiement (état élève + encaissement direct) + encaissement HITL via agent + rapport de recouvrement. Les tools de lecture `get_payment_stats` et `get_unpaid_students` existent déjà. Ce plan ajoute : `propose_payment_record` (HITL agent), `get_recovery_rate` (rapport), les API routes `/api/payments` et `/api/reporting/recovery`, et le cockpit `/paiements`.

## Technical Context

**Language/Version**: TypeScript 5 (web) | Python 3.12 (agent)  
**Primary Dependencies**: Next.js 16.2.10 App Router · shadcn/ui · TanStack Query 5 (web) | FastAPI · ADK 2.x.x · structlog (agent)  
**Storage**: Supabase — `payment_items` (échéancier), `accounting_transactions` (encaissements) — RLS multi-tenant  
**Testing**: pytest + mocks (agent) | tsc --noEmit (web)  
**Performance Goals**: État élève < 500ms | Rapport classe < 3s  
**Constraints**: HITL obligatoire pour écriture agent. Paiement cockpit = action humaine directe (sans canvas).

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| Multi-tenant isolation (§1) | ✅ | RLS via JWT, tous les tools filtrés par tenant_id |
| HITL sur écritures (§2) | ✅ | Encaissement agent = canvas HITL / Cockpit = action directe |
| JWT user dans tools (§3) | ✅ | Pattern existant dans payment_tools.py |
| Test-first (§4) | ✅ | Tests écrits avant implémentation tools |
| Observabilité (§5) | ✅ | structlog dans tous les tools, agent_action_logs |
| Conformité CNDP (§6) | ✅ | Pas de données personnelles dans les logs |

## Project Structure

```text
apps/web/src/
├── app/api/payments/route.ts           # GET (liste items élève) + POST (encaissement)
├── app/api/payments/[id]/route.ts      # PATCH (annulation)
├── app/api/reporting/recovery/route.ts # GET taux recouvrement
├── components/paiements/
│   ├── PaymentSchedule.tsx
│   ├── PaymentForm.tsx
│   └── PaiementsClient.tsx
├── hooks/usePayments.ts
├── types/payment.ts
└── app/(cockpit)/paiements/page.tsx

services/agent/
├── tools/payment_tools.py   # + propose_payment_record + get_recovery_rate
└── tests/test_payment_tools.py
```

## Implementation Phases

1. **Tests + Types** — TDD propose_payment_record + types TS
2. **Agent tools** — propose_payment_record (HITL), get_recovery_rate, bind
3. **API routes** — GET état élève, POST encaissement, GET rapport
4. **Hooks TanStack** — usePayments, useRecordPayment
5. **Cockpit UI** — PaymentSchedule, PaymentForm, PaiementsClient, page
6. **Polish** — typecheck, pytest, ruff, status update
