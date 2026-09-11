-- Rollback de Fase 3: revierte phase3_servicio_catalog.sql
-- Proyecto Supabase: vcgyiyrboumimwgdsitf

-- Restaurar grants de escritura y lectura publica
GRANT ALL ON public."Servicio" TO anon;
GRANT INSERT, UPDATE, DELETE ON public."Servicio" TO authenticated;

-- Restaurar policies originales
DROP POLICY IF EXISTS "Servicio select own" ON public."Servicio";
CREATE POLICY "Servicio select" ON public."Servicio"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Servicio insert own" ON public."Servicio"
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = "Servicio"."barbero_id" AND b.users_id = ( SELECT auth.uid() AS uid)
  ));

CREATE POLICY "Servicio update own" ON public."Servicio"
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = "Servicio"."barbero_id" AND b.users_id = ( SELECT auth.uid() AS uid)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = "Servicio"."barbero_id" AND b.users_id = ( SELECT auth.uid() AS uid)
  ));
