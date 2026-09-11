-- Rollback de Fase 2: revierte phase2_turno_tenant_integrity.sql
-- Proyecto Supabase: vcgyiyrboumimwgdsitf

-- 1) Quitar triggers y funciones
DROP TRIGGER IF EXISTS trg_turno_validar_relaciones ON public."Turno";
DROP FUNCTION IF EXISTS public.fn_turno_validar_relaciones();

DROP TRIGGER IF EXISTS trg_barbero_pertenencia_inmutable ON public."Barbero";
DROP FUNCTION IF EXISTS public.fn_barbero_pertenencia_inmutable();

DROP TRIGGER IF EXISTS trg_cliente_pertenencia_inmutable ON public."Cliente";
DROP FUNCTION IF EXISTS public.fn_cliente_pertenencia_inmutable();

-- 2) Restaurar grants de UPDATE a nivel tabla (default de Supabase)
REVOKE UPDATE ("nombre","descripcion","duracion_default","precio_base","alias","foto_url","activo","dias_habiles","hora_apertura","hora_cierre") ON public."Barbero" FROM authenticated;
GRANT UPDATE ON public."Barbero" TO anon, authenticated;

REVOKE UPDATE ("nombre","notas","ultima_visita","telefono","email") ON public."Cliente" FROM authenticated;
GRANT UPDATE ON public."Cliente" TO anon, authenticated;

REVOKE UPDATE ("cliente_id","servicio_id","inicio","estado","duracion_minutos","origen","update_at") ON public."Turno" FROM authenticated;
GRANT UPDATE ON public."Turno" TO anon, authenticated;

-- 3) Revertir NOT NULL (item 1.3)
ALTER TABLE public."Turno" ALTER COLUMN "cliente_id" DROP NOT NULL;
ALTER TABLE public."Turno" ALTER COLUMN "servicio_id" DROP NOT NULL;
