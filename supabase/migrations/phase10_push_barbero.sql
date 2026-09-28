-- Fase 10: Web Push del barbero (PWA).
-- Proyecto Supabase: vcgyiyrboumimwgdsitf
-- Rollback: phase10_push_barbero_rollback.sql
--
-- Cierra T2 del feature pwa-web-push-barbero: tabla `push_subscriptions`
-- (una fila por suscripción Web Push de cada barbero) + preferencias
-- `notify_on_reserva` / `notify_on_cancelacion` en "Barbero" + RLS
-- (el barbero autenticado solo ve/toca sus propias filas vía
-- `Barbero.users_id = auth.uid()`, mismo patrón que phase3_servicio_catalog.sql).
--
-- NOTA DE TIPOS: `barbero_id` usa `bigint` (no `int`) a propósito: es el tipo
-- real de `"Barbero".id` y Postgres exige que la FK coincida exactamente.
--
-- APLICACIÓN (solo SQL Editor, rol postgres, bypass RLS):
--   1. Pegar este archivo completo y ejecutar.
--   2. Verificar con las queries de supabase/migrations/README_PUSH.md.
--   3. `src/types/database.types.ts` ya incluye estos cambios a mano (T2).

-- ---------------------------------------------------------------------------
-- 1) Tabla de suscripciones Web Push (minúscula, sin comillas, como las FK
--    lowercase del schema; "Barbero" entrecomillada por la mayúscula).
-- ---------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  barbero_id bigint NOT NULL REFERENCES public."Barbero" (id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_barbero_id_idx
  ON public.push_subscriptions (barbero_id);

-- ---------------------------------------------------------------------------
-- 2) Preferencias de aviso en "Barbero" (default true: ambos eventos).
-- ---------------------------------------------------------------------------
ALTER TABLE public."Barbero"
  ADD COLUMN notify_on_reserva boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_on_cancelacion boolean NOT NULL DEFAULT true;

-- 3) Allowlist de UPDATE por columna en "Barbero" (definida en phase2:96).
--    Sin esto, `authenticated` no puede guardar los toggles por REST
--    (el UPDATE a nivel tabla está revocado a propósito).
GRANT UPDATE (notify_on_reserva, notify_on_cancelacion)
  ON public."Barbero" TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Grants de la tabla nueva (defensa en profundidad, patrón phase8):
--    anon sin acceso directo; authenticated solo vía RLS.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE ALL ON public.push_subscriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.push_subscriptions_id_seq TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) RLS: el barbero autenticado solo sus propias filas.
--    UPDATE con mismo scope que Turno/Cliente (editar permitido, no denegado:
--    sin policy de UPDATE el cambio fallaría silencioso con 0 filas).
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions select own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions select own" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = push_subscriptions.barbero_id AND b.users_id = ( SELECT auth.uid() AS uid)
  ));

DROP POLICY IF EXISTS "push_subscriptions insert own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions insert own" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = push_subscriptions.barbero_id AND b.users_id = ( SELECT auth.uid() AS uid)
  ));

DROP POLICY IF EXISTS "push_subscriptions update own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions update own" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = push_subscriptions.barbero_id AND b.users_id = ( SELECT auth.uid() AS uid)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = push_subscriptions.barbero_id AND b.users_id = ( SELECT auth.uid() AS uid)
  ));

DROP POLICY IF EXISTS "push_subscriptions delete own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions delete own" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Barbero" b
    WHERE b.id = push_subscriptions.barbero_id AND b.users_id = ( SELECT auth.uid() AS uid)
  ));
