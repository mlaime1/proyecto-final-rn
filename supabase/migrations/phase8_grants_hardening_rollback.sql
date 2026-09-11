-- Rollback for phase 8: best-effort restore of the pre-phase-8 default grants.
-- NOTE: deliberately does NOT re-grant table-level UPDATE on Barbero/Cliente/Turno,
-- because the phase 2 column allowlist depends on that table-level UPDATE being revoked.
GRANT SELECT, INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON "Barbero", "Cliente", "Turno" TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON "Barberia", "BloqueoHorario", "CodigoVerificacion" TO anon, authenticated;
GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER ON "Servicio" TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_turno_validar_relaciones() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_barbero_pertenencia_inmutable() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cliente_pertenencia_inmutable() TO PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
