-- Rollback de Fase 10: revierte phase10_push_barbero.sql
-- Proyecto Supabase: vcgyiyrboumimwgdsitf

-- 1) La allowlist de "Barbero" vuelve a la de phase2 (revoke + re-grant
--    explícito: no existe REVOKE por columna suelta sin re-listar).
REVOKE UPDATE ON public."Barbero" FROM authenticated;
GRANT UPDATE ("nombre","descripcion","duracion_default","precio_base","alias","foto_url","activo","dias_habiles","hora_apertura","hora_cierre") ON public."Barbero" TO authenticated;

-- 2) Policies + tabla nueva (el DROP TABLE elimina policies e índice en cascada,
--    los DROP POLICY previos son defensa si la tabla ya no existe a medias).
DROP POLICY IF EXISTS "push_subscriptions select own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions insert own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions update own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions delete own" ON public.push_subscriptions;
DROP TABLE IF EXISTS public.push_subscriptions;

-- 3) Columnas de preferencias
ALTER TABLE public."Barbero" DROP COLUMN IF EXISTS notify_on_reserva;
ALTER TABLE public."Barbero" DROP COLUMN IF EXISTS notify_on_cancelacion;

-- Sin pérdida de datos del negocio: solo se eliminan suscripciones push
-- (recreables desde la UI) y prefs con default true.
