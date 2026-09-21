-- Rollback de Fase 9: revierte phase9_cliente_telefono_canonico.sql
-- Proyecto Supabase: vcgyiyrboumimwgdsitf

-- 1) Eliminar la firma nueva. Después re-ejecutar phase4_crear_turno_atomico.sql
--    para restaurar la firma `numeric` de la Fase 4.
DROP FUNCTION IF EXISTS public.crear_turno(bigint, timestamp without time zone, text, text, text, text, text);
-- >>> Luego: re-ejecutar phase4_crear_turno_atomico.sql <<<

-- 2) La allowlist de "Cliente" vuelve a la de phase2.
GRANT UPDATE ("nombre","notas","ultima_visita","telefono","email")
  ON public."Cliente" TO authenticated;

-- 3) Objetos nuevos de la Fase 9
ALTER TABLE public."Cliente" DROP CONSTRAINT IF EXISTS cliente_telefono_formato_chk;
DROP INDEX IF EXISTS public.cliente_barberia_tel_idx;
ALTER TABLE public."Cliente" DROP COLUMN IF EXISTS telefono_normalizado;
ALTER TABLE public."Cliente" DROP COLUMN IF EXISTS telefono_raw;
ALTER TABLE public."Barberia" DROP COLUMN IF EXISTS codigos_area_permitidos;

-- Sin pérdida de datos de teléfonos: `Cliente.telefono` (numeric) nunca se tocó
-- en esta migración, así que conserva los valores originales.
