-- Phase 8: harden grants (defense in depth).
-- RLS remains the primary boundary; this removes direct privileges that RLS currently
-- masks but that would become dangerous if a policy or RLS were ever misconfigured.
-- Direction: revokes only. Safe to apply on top of phases 1-4.

-- 1) Drop dangerous (TRUNCATE bypasses RLS) or unused table privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2) No public (anon) direct table or sequence access: there is no public web surface yet.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 3) authenticated: close writes the app never performs.
REVOKE INSERT, UPDATE, DELETE ON "Barberia" FROM authenticated;
REVOKE ALL ON "CodigoVerificacion" FROM authenticated;

-- 4) Trigger helper functions must not be directly callable by client roles.
REVOKE EXECUTE ON FUNCTION public.fn_turno_validar_relaciones() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_barbero_pertenencia_inmutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_cliente_pertenencia_inmutable() FROM PUBLIC, anon, authenticated;

-- 5) Re-assert the crear_turno contract from phase 4 (idempotent).
REVOKE EXECUTE ON FUNCTION public.crear_turno(bigint, timestamp without time zone, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_turno(bigint, timestamp without time zone, text, text, text, numeric) TO authenticated;

-- 6) Do not auto-grant future objects in this schema to anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
