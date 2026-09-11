-- Fase 2: integridad de relaciones de tenant en "Turno" + inmutabilidad de pertenencia.
-- Proyecto Supabase: vcgyiyrboumimwgdsitf
-- Aplicada 2026-09-11. Rollback: phase2_turno_tenant_integrity_rollback.sql
--
-- Cierra H2 (RLS de Turno no valida relaciones) y H11 (campos de pertenencia
-- mutables por API) del plan_seguridad.md.

-- 1) Las relaciones de Turno pasan a ser obligatorias (diferido de Fase 1, item 1.3)
ALTER TABLE public."Turno" ALTER COLUMN "cliente_id" SET NOT NULL;
ALTER TABLE public."Turno" ALTER COLUMN "servicio_id" SET NOT NULL;

-- 2) Validacion de relaciones de Turno + inmutabilidad de barbero_id (INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.fn_turno_validar_relaciones()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- El servicio debe pertenecer al mismo barbero del turno
  IF NEW."servicio_id" IS NULL OR NOT EXISTS (
    SELECT 1 FROM public."Servicio" s
    WHERE s.id = NEW."servicio_id" AND s."barbero_id" = NEW."barbero_id"
  ) THEN
    RAISE EXCEPTION 'El servicio no pertenece al barbero del turno.' USING ERRCODE = '23514';
  END IF;

  -- El cliente debe pertenecer a la barberia del barbero del turno
  IF NEW."cliente_id" IS NULL OR NOT EXISTS (
    SELECT 1 FROM public."Cliente" c
    JOIN public."Barbero" b ON b.id = NEW."barbero_id"
    WHERE c.id = NEW."cliente_id" AND c."barberia_id" = b."barberia_id"
  ) THEN
    RAISE EXCEPTION 'El cliente no pertenece a la barberia del barbero del turno.' USING ERRCODE = '23514';
  END IF;

  -- El barbero de un turno no se reasigna desde el cliente
  IF TG_OP = 'UPDATE'
     AND NEW."barbero_id" IS DISTINCT FROM OLD."barbero_id"
     AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'El barbero de un turno no puede modificarse.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_turno_validar_relaciones
BEFORE INSERT OR UPDATE ON public."Turno"
FOR EACH ROW EXECUTE FUNCTION public.fn_turno_validar_relaciones();

-- 3) Inmutabilidad de pertenencia en "Barbero"
CREATE OR REPLACE FUNCTION public.fn_barbero_pertenencia_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW."barberia_id" IS DISTINCT FROM OLD."barberia_id" THEN
      RAISE EXCEPTION 'La barberia de un barbero no puede modificarse.' USING ERRCODE = '23514';
    END IF;
    IF NEW."users_id" IS DISTINCT FROM OLD."users_id" THEN
      RAISE EXCEPTION 'El usuario vinculado a un barbero no puede modificarse.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_barbero_pertenencia_inmutable
BEFORE UPDATE ON public."Barbero"
FOR EACH ROW EXECUTE FUNCTION public.fn_barbero_pertenencia_inmutable();

-- 4) Inmutabilidad de pertenencia en "Cliente"
CREATE OR REPLACE FUNCTION public.fn_cliente_pertenencia_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NEW."barberia_id" IS DISTINCT FROM OLD."barberia_id" THEN
    RAISE EXCEPTION 'La barberia de un cliente no puede modificarse.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cliente_pertenencia_inmutable
BEFORE UPDATE ON public."Cliente"
FOR EACH ROW EXECUTE FUNCTION public.fn_cliente_pertenencia_inmutable();

-- 5) Defensa en profundidad: los roles cliente no escriben columnas de pertenencia.
--    Se revoca UPDATE a nivel tabla y se re-otorga UPDATE solo por columna permitida.
REVOKE UPDATE ON public."Barbero" FROM anon, authenticated;
GRANT UPDATE ("nombre","descripcion","duracion_default","precio_base","alias","foto_url","activo","dias_habiles","hora_apertura","hora_cierre") ON public."Barbero" TO authenticated;

REVOKE UPDATE ON public."Cliente" FROM anon, authenticated;
GRANT UPDATE ("nombre","notas","ultima_visita","telefono","email") ON public."Cliente" TO authenticated;

REVOKE UPDATE ON public."Turno" FROM anon, authenticated;
GRANT UPDATE ("cliente_id","servicio_id","inicio","estado","duracion_minutos","origen","update_at") ON public."Turno" TO authenticated;

-- 6) Higiene: las funciones de trigger no son invocables directamente por clientes
REVOKE ALL ON FUNCTION public.fn_turno_validar_relaciones() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_barbero_pertenencia_inmutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cliente_pertenencia_inmutable() FROM PUBLIC;
