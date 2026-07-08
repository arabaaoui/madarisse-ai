-- Migration: agent_action_logs + pgvector
-- Phase 0 — walking skeleton
-- Applique sur le même projet Supabase que ecole-muret

-- ── pgvector (RAG mémoire agent) ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── agent_action_logs (audit trail de toutes les actions HITL) ───────────────
CREATE TABLE IF NOT EXISTS public.agent_action_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  agent_id        TEXT        NOT NULL,                     -- ex: 'school-agent/enrollment'
  action_type     TEXT        NOT NULL,                     -- ex: 'enrollment.create'
  payload         JSONB,                                    -- paramètres proposés par l'agent
  snapshot_before JSONB,                                    -- état avant (réversibilité)
  snapshot_after  JSONB,                                    -- état après
  status          TEXT        NOT NULL DEFAULT 'pending',   -- pending | confirmed | cancelled | failed
  error_message   TEXT,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS agent_action_logs_tenant_idx ON public.agent_action_logs(tenant_id);
CREATE INDEX IF NOT EXISTS agent_action_logs_user_idx   ON public.agent_action_logs(user_id);
CREATE INDEX IF NOT EXISTS agent_action_logs_status_idx ON public.agent_action_logs(status);
CREATE INDEX IF NOT EXISTS agent_action_logs_created_idx ON public.agent_action_logs(created_at DESC);

-- RLS
ALTER TABLE public.agent_action_logs ENABLE ROW LEVEL SECURITY;

-- Secrétariat/Admin/Directeur voient les logs de leur tenant
CREATE POLICY "agent_action_logs_tenant_select"
  ON public.agent_action_logs FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- Insertion : via service uniquement (pas de RLS INSERT pour l'utilisateur)
-- L'agent service valide et insère via service_role après confirmation HITL
CREATE POLICY "agent_action_logs_service_insert"
  ON public.agent_action_logs FOR INSERT
  WITH CHECK (true);  -- contrôle fait au niveau applicatif (JWT validation)

-- ── agent_memory (RAG vectoriel per-tenant) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID      NOT NULL,
  content     TEXT      NOT NULL,
  embedding   vector(1536),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_memory_tenant_idx ON public.agent_memory(tenant_id);
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx ON public.agent_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_memory_tenant_isolation"
  ON public.agent_memory FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- ── Commentaires ─────────────────────────────────────────────────────────────
COMMENT ON TABLE public.agent_action_logs IS
'Audit trail de toutes les actions proposées et confirmées par les agents madarisse-ai.
Chaque action HITL (human-in-the-loop) est enregistrée ici avec son statut (pending → confirmed/cancelled).
Permet la traçabilité, la réversibilité, et le debug des agents.';

COMMENT ON TABLE public.agent_memory IS
'Mémoire vectorielle (pgvector) per-tenant pour le RAG des agents.
Contient les embeddings des données scolaires contextualisées (élèves, documents, historique).
Isolée par tenant_id via RLS.';
