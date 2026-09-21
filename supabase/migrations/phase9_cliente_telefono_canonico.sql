-- Fase 9: teléfono de Cliente en formato canónico.
-- Proyecto Supabase: vcgyiyrboumimwgdsitf
-- Rollback: phase9_cliente_telefono_canonico_rollback.sql
--
-- Contexto: `Cliente.telefono` era `numeric`, que no puede preservar formato
-- (ceros iniciales, `+`). Todo el flujo del negocio es por WhatsApp, así que el
-- canónico es el celular argentino: `+549` + 10 dígitos.
--
-- EXPAND/CONTRACT: esta migración AGREGA las columnas nuevas y reescribe
-- `crear_turno`. NO elimina `Cliente.telefono`; eso va en una migración aparte,
-- cuando el código nuevo esté desplegado y verificado.
--
-- ORDEN DE DESPLIEGUE: aplicar esta migración y el cambio de código JUNTOS.
-- Entre una y otra la reserva queda rota: la RPC nueva recibe `p_telefono text`
-- y la app vieja manda un number.

-- ---------------------------------------------------------------------------
-- 0) Verificación previa: los datos existentes deben estar ya en formato
--    internacional `549` + 10 dígitos. Si no lo están, la migración aborta
--    (no se hace a ojo con un SELECT).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_malos bigint;
BEGIN
  SELECT count(*) INTO v_malos
  FROM public."Cliente"
  WHERE telefono IS NOT NULL
    AND telefono::text !~ '^549[1-9][0-9]{9}$';

  IF v_malos > 0 THEN
    RAISE EXCEPTION 'Hay % clientes con telefono fuera de formato; corregirlos antes de migrar.', v_malos;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1) Columnas nuevas
-- ---------------------------------------------------------------------------
ALTER TABLE public."Cliente"
  ADD COLUMN telefono_raw text,
  ADD COLUMN telefono_normalizado text;

-- 2) Backfill. Solo el normalizado: el valor canónico se reconstruye con `+`.
--    `telefono_raw` se deja NULL en las filas viejas a propósito — lo que el
--    usuario tipeó en su momento no es recuperable, y el numeric string no es
--    "lo tipeado". Inventarlo sería mentir en la columna.
UPDATE public."Cliente"
SET telefono_normalizado = '+' || telefono::text
WHERE telefono IS NOT NULL;

-- 3) Red de seguridad: área 11 (AMBA) o 2xx/3xx.
--    Es la única garantía real del formato; el tipo `text` por sí solo no valida nada.
ALTER TABLE public."Cliente"
  ADD CONSTRAINT cliente_telefono_formato_chk
  CHECK (
    telefono_normalizado IS NULL
    OR telefono_normalizado ~ '^\+549(11[0-9]{8}|[23][0-9]{9})$'
  );

-- 4) Índice normal (NO único) para búsqueda/autocompletado futuro.
--    Sin unicidad por decisión: el dedupe de Cliente queda fuera de alcance.
CREATE INDEX cliente_barberia_tel_idx
  ON public."Cliente" (barberia_id, telefono_normalizado)
  WHERE telefono_normalizado IS NOT NULL;

-- 5) Áreas permitidas por barbería (regla comercial, solo formulario público).
--    Por defecto AMBA. Es dato de despliegue: `authenticated` NO tiene
--    INSERT/UPDATE sobre "Barberia" (phase8_grants_hardening.sql:14), así que
--    se cambia por SQL, no desde la app.
ALTER TABLE public."Barberia"
  ADD COLUMN codigos_area_permitidos text[] NOT NULL DEFAULT '{11}';

-- ---------------------------------------------------------------------------
-- 6) crear_turno: pasa a recibir el teléfono canónico.
--    `CREATE OR REPLACE` NO puede cambiar el tipo de un parámetro: crearía un
--    overload (quedarían vivas las dos firmas) y PostgREST devolvería PGRST203
--    al resolver `p_telefono`. Por eso el DROP explícito de la firma `numeric`.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.crear_turno(bigint, timestamp without time zone, text, text, text, numeric);

CREATE FUNCTION public.crear_turno(
  p_servicio_id bigint,
  p_inicio timestamp without time zone,
  p_origen text,
  p_nombre text,
  p_apellido text,
  p_telefono text DEFAULT NULL,     -- canónico: +549 + 10 dígitos
  p_telefono_raw text DEFAULT NULL  -- lo que se tipeó (auditoría)
)
RETURNS public."Turno"
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_barbero_id bigint;
  v_barberia_id bigint;
  v_duracion numeric;
  v_duracion_min smallint;
  v_cliente_id bigint;
  v_turno public."Turno";
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'SESION_INVALIDA' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, barberia_id INTO v_barbero_id, v_barberia_id
  FROM public."Barbero" WHERE users_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUENTA_NO_VINCULADA' USING ERRCODE = 'P0001';
  END IF;

  SELECT duracion INTO v_duracion
  FROM public."Servicio" WHERE id = p_servicio_id AND barbero_id = v_barbero_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICIO_INVALIDO' USING ERRCODE = 'P0001';
  END IF;

  IF p_nombre IS NULL OR length(trim(p_nombre)) < 2 OR p_apellido IS NULL OR length(trim(p_apellido)) < 2 THEN
    RAISE EXCEPTION 'DATOS_CLIENTE_INVALIDOS' USING ERRCODE = 'P0001';
  END IF;

  IF p_origen IS NULL OR p_origen NOT IN ('presencial','whatsapp','web') THEN
    RAISE EXCEPTION 'ORIGEN_INVALIDO' USING ERRCODE = 'P0001';
  END IF;

  v_duracion_min := GREATEST(1, LEAST(480, COALESCE(v_duracion, 30)))::smallint;

  -- El formato canónico lo valida `cliente_telefono_formato_chk`.
  INSERT INTO public."Cliente" (barberia_id, nombre, telefono_raw, telefono_normalizado)
  VALUES (v_barberia_id, trim(p_nombre) || ' ' || trim(p_apellido), p_telefono_raw, p_telefono)
  RETURNING id INTO v_cliente_id;

  INSERT INTO public."Turno" (cliente_id, servicio_id, inicio, barbero_id, estado, origen, duracion_minutos)
  VALUES (v_cliente_id, p_servicio_id, p_inicio, v_barbero_id, 'confirmado', p_origen, v_duracion_min)
  RETURNING * INTO v_turno;

  RETURN v_turno;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_turno(bigint, timestamp without time zone, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.crear_turno(bigint, timestamp without time zone, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_turno(bigint, timestamp without time zone, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Allowlist de UPDATE por columna en "Cliente" (definida en phase2:99).
--    Sin esto, `authenticated` no puede escribir las columnas nuevas por REST
--    (el UPDATE a nivel tabla está revocado a propósito).
-- ---------------------------------------------------------------------------
GRANT UPDATE ("nombre","notas","ultima_visita","telefono","telefono_raw","telefono_normalizado","email")
  ON public."Cliente" TO authenticated;
