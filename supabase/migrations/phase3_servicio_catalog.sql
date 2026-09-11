-- Fase 3: catalogo Servicio de solo lectura propia + gestion centralizada.
-- Proyecto Supabase: vcgyiyrboumimwgdsitf
-- Aplicada 2026-09-11. Rollback: phase3_servicio_catalog_rollback.sql
--
-- Cierra H3 (enumeracion cross-tenant de Servicio) y aplica la decision de
-- producto: el dueno gestiona el catalogo; los barberos no lo escriben.

-- Lectura: solo servicios del propio barbero
DROP POLICY IF EXISTS "Servicio select" ON public."Servicio";
CREATE POLICY "Servicio select own" ON public."Servicio"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = "Servicio"."barbero_id" AND b.users_id = ( SELECT auth.uid() AS uid)
  ));

-- Escritura: solo server/admin (no anon, no barberos)
DROP POLICY IF EXISTS "Servicio insert own" ON public."Servicio";
DROP POLICY IF EXISTS "Servicio update own" ON public."Servicio";
REVOKE ALL ON public."Servicio" FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public."Servicio" FROM authenticated;
