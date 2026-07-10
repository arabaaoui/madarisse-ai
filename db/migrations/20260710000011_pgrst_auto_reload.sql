-- Migration: event trigger pour recharge automatique du cache schéma PostgREST
-- Après chaque DDL (CREATE/ALTER/DROP TABLE, etc.), PostgREST reçoit un NOTIFY
-- et recharge son cache — plus besoin de NOTIFY manuel après les migrations.

CREATE OR REPLACE FUNCTION public.notify_pgrst_schema_reload()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

DROP EVENT TRIGGER IF EXISTS pgrst_schema_reload_on_ddl;
CREATE EVENT TRIGGER pgrst_schema_reload_on_ddl
  ON ddl_command_end
  EXECUTE FUNCTION public.notify_pgrst_schema_reload();
