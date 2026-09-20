-- ============================================================================
-- SEED de datos de demo — App móvil (Fase 0.3 del plan_web_performance.md)
-- Proyecto Supabase: vcgyiyrboumimwgdsitf
--
-- CÓMO USAR:
--   1) Creá en el dashboard (Authentication -> Users -> Add user) el usuario
--      cuyo email figura en v_email, o usá uno ya existente.
--      La cuenta del barbero NO se autocrea: la da de alta el equipo.
--   2) Pegá y ejecutá TODO este script en el SQL Editor, o vía MCP (corre como
--      postgres, por eso saltea las RLS de la app).
--   3) Es RE-EJECUTABLE.
--
-- ✅ NO ES DESTRUCTIVO (a diferencia de la versión anterior de este archivo).
--    Preserva el historial de turnos pasados, que es lo que la Home necesita
--    para mostrar "Último turno". Sólo administra la ventana de HOY en adelante.
--
-- QUÉ HACE:
--   1. Pone dias_habiles = {0..6} (los 7 días) en la barbería y el barbero.
--      Antes era {2,3,4,5,6} (martes a sábado), lo que dejaba la agenda VACÍA
--      si la demo caía domingo o lunes.
--   2. Amplía el horario a 09:00-20:00.
--   3. Normaliza los teléfonos de cliente a formato internacional (54 9 11 ...)
--      para que la prueba del botón de WhatsApp (H3) sea válida. La columna es
--      `numeric`: no admite "+" ni ceros iniciales, se guardan sólo dígitos.
--   4. Borra y regenera SÓLO los turnos de HOY en adelante, más los bloqueos.
--      Los turnos pasados NO se tocan.
--   5. Crea turnos que cubren HOY y los próximos días, con estados variados, y
--      2 bloqueos (uno parcial y uno de día completo).
--
-- NO TOCA: el tenant de la web pública (Barberia 'Conexión Barbería' /
--   Barbero id 10) ni 'Barbería Piloto'. Aborta si el tenant del barbero
--   tuviera otros barberos, para no tocar datos ajenos.
--
-- PARA UN RESET TOTAL (borra también el historial): ver el bloque comentado
--   al final del script. Respaldar antes (docs/seed-backup-2026-09-20.json).
-- ============================================================================

do $$
declare
  v_email        text      := 'test@test.com';
  v_user_id      uuid;
  v_barberia_id  bigint;
  v_barbero_id   bigint;
  v_hoy          timestamp;   -- medianoche LOCAL (Argentina), naive
  v_borrados     int;
  v_servicios    int;
begin
  -- 0) usuario auth destino
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'No existe un usuario auth con email %. Crealo en el dashboard antes de correr el seed.', v_email;
  end if;

  -- 1) barbero y barbería del usuario (deben existir: la cuenta se da de alta a mano)
  select id, barberia_id into v_barbero_id, v_barberia_id
  from "Barbero" where users_id = v_user_id limit 1;

  if v_barbero_id is null then
    raise exception 'El usuario % no está vinculado a ningún barbero. Vinculá la cuenta antes de correr el seed.', v_email;
  end if;

  -- 2) guarda: no tocar datos de otros barberos del mismo tenant
  if exists (select 1 from "Barbero" where barberia_id = v_barberia_id and id <> v_barbero_id) then
    raise exception 'La barbería % tiene otros barberos. Este seed asume un tenant de un solo barbero; se aborta para no tocar datos ajenos.', v_barberia_id;
  end if;

  -- 3) Día de HOY a medianoche en hora de Argentina, como timestamp naive.
  --    `inicio` es `timestamp without time zone` y la app lo trata como
  --    naive-local, así que NO usar date_trunc('day', now()) (el server es UTC).
  v_hoy := date_trunc('day', (now() at time zone 'America/Argentina/Buenos_Aires'));

  -- 4) Días hábiles: los 7, para que la demo funcione cualquier día
  update "Barberia"
     set dias_habiles  = array[0,1,2,3,4,5,6],
         hora_apertura = '09:00',
         hora_cierre   = '20:00'
   where id = v_barberia_id;

  update "Barbero"
     set dias_habiles    = array[0,1,2,3,4,5,6],
         hora_apertura   = '09:00',
         hora_cierre     = '20:00',
         activo          = true,
         duracion_default = coalesce(duracion_default, 30),
         precio_base      = coalesce(precio_base, 3500)
   where id = v_barbero_id;

  -- 5) Catálogo de servicios: si el barbero no tiene ninguno, crear el estándar.
  --    Si ya tiene, se respeta el existente (no se pisan precios ni duraciones).
  select count(*) into v_servicios from "Servicio" where barbero_id = v_barbero_id;
  if v_servicios = 0 then
    insert into "Servicio" (barbero_id, nombre, duracion, precio) values
      (v_barbero_id, 'Corte clásico',    30, 3500),
      (v_barbero_id, 'Corte y barba',    60, 6000),
      (v_barbero_id, 'Arreglo de barba', 30, 3000),
      (v_barbero_id, 'Perfilado',        45, 4500),
      (v_barbero_id, 'Tintura',          90, 9000);
  end if;

  -- 6) Teléfonos de cliente a formato internacional (54 9 11 ...).
  --    Idempotente: sólo actualiza los que siguen en formato local de 10 dígitos.
  update "Cliente" set telefono = 5491122334455 where barberia_id = v_barberia_id and nombre = 'Juan Pérez'     and telefono = 1122334455;
  update "Cliente" set telefono = 5491133445566 where barberia_id = v_barberia_id and nombre = 'María Gómez'    and telefono = 1133445566;
  update "Cliente" set telefono = 5491144556677 where barberia_id = v_barberia_id and nombre = 'Carlos Ruiz'    and telefono = 1144556677;
  update "Cliente" set telefono = 5491155667788 where barberia_id = v_barberia_id and nombre = 'Lucía Fernández' and telefono = 1155667788;
  update "Cliente" set telefono = 5491166778899 where barberia_id = v_barberia_id and nombre = 'Diego Torres'   and telefono = 1166778899;
  update "Cliente" set telefono = 5491177889900 where barberia_id = v_barberia_id and nombre = 'Sofía Méndez'   and telefono = 1177889900;
  update "Cliente" set telefono = 5491188990011 where barberia_id = v_barberia_id and nombre = 'Pedro Sosa'     and telefono = 1188990011;
  update "Cliente" set telefono = 5491199001122 where barberia_id = v_barberia_id and nombre = 'Ana Castro'     and telefono = 1199001122;
  update "Cliente" set telefono = 5491168612399 where barberia_id = v_barberia_id and nombre = 'Mauro Meza'     and telefono = 1168612399;

  -- 7) Limpieza SOLO de la ventana de demo: turnos de hoy en adelante + bloqueos.
  --    El historial (inicio < hoy) queda intacto.
  delete from "Turno"          where barbero_id = v_barbero_id and inicio >= v_hoy;
  delete from "BloqueoHorario" where barbero_id = v_barbero_id;
  get diagnostics v_borrados = row_count;

  -- 8) Turnos de HOY y FUTURO.
  --    Restricción `turno_sin_solape`: es un EXCLUDE PARCIAL que sólo aplica a
  --    estados pendiente/confirmado/completado. Cancelados y ausentes no ocupan
  --    agenda, por eso pueden solaparse.
  --    Los turnos de HOY están espaciados 2 h con duraciones <= 90 min, así que
  --    no se solapan entre sí ni con los históricos (que son de días previos).
  insert into "Turno" (barbero_id, servicio_id, cliente_id, inicio, estado, origen, duracion_minutos)
  select v_barbero_id, s.id, c.id, t.inicio, t.estado::estado_turno, t.origen, s.duracion::smallint
  from (values
    -- ---- HOY ----
    ('Corte clásico',    'Juan Pérez',      v_hoy + time '09:00',            'confirmado', 'presencial'),
    ('Corte y barba',    'María Gómez',     v_hoy + time '11:00',            'confirmado', 'whatsapp'),
    ('Arreglo de barba', 'Sofía Méndez',    v_hoy + time '13:00',            'confirmado', 'presencial'),
    ('Perfilado',        'Pedro Sosa',      v_hoy + time '15:00',            'confirmado', 'whatsapp'),
    ('Corte clásico',    'Ana Castro',      v_hoy + time '17:00',            'confirmado', 'presencial'),
    ('Tintura',          'Mauro Meza',      v_hoy + time '19:00',            'confirmado', 'whatsapp'),
    -- ---- FUTURO ----
    ('Corte clásico',    'Carlos Ruiz',     v_hoy + interval '1 day'  + time '10:00', 'confirmado', 'presencial'),
    ('Corte y barba',    'Lucía Fernández', v_hoy + interval '1 day'  + time '15:00', 'confirmado', 'whatsapp'),
    ('Perfilado',        'Diego Torres',    v_hoy + interval '2 days' + time '11:00', 'confirmado', 'presencial'),
    ('Arreglo de barba', 'Sofía Méndez',    v_hoy + interval '2 days' + time '16:00', 'cancelado',  'presencial'),
    ('Tintura',          'Juan Pérez',      v_hoy + interval '3 days' + time '16:00', 'confirmado', 'whatsapp'),
    ('Arreglo de barba', 'María Gómez',     v_hoy + interval '5 days' + time '10:30', 'confirmado', 'presencial'),
    ('Corte y barba',    'Ana Castro',      v_hoy + interval '6 days' + time '12:00', 'confirmado', 'presencial')
  ) as t(servicio, cliente, inicio, estado, origen)
  join "Servicio" s on s.barbero_id = v_barbero_id and s.nombre = t.servicio
  join "Cliente"  c on c.barberia_id = v_barberia_id and c.nombre = t.cliente;

  -- 9) Bloqueos: uno parcial (futuro) y uno de día completo
  insert into "BloqueoHorario" (barbero_id, fecha, hora_inicio, hora_fin, motivo) values
    (v_barbero_id, (v_hoy + interval '2 days')::date, '15:00', '17:00', 'Corte de luz'),
    (v_barbero_id, (v_hoy + interval '7 days')::date, null,    null,    'Vacaciones');

  -- 10) AUTO-VERIFICACIÓN.
  --     Los turnos se insertan haciendo JOIN por NOMBRE de servicio y de cliente.
  --     Si un nombre no coincide exactamente (un acento, un espacio), el JOIN
  --     descarta esa fila EN SILENCIO y el seed "pasa" con menos turnos de los
  --     previstos. Eso ya pasó una vez durante la implementación. Esta guarda lo
  --     convierte en un error ruidoso en vez de un dato faltante silencioso.
  if (select count(*) from "Turno" where barbero_id = v_barbero_id and inicio >= v_hoy) <> 13 then
    raise exception 'El seed esperaba 13 turnos de hoy en adelante pero insertó %. Revisar que los nombres de servicio y cliente coincidan exactamente, acentos incluidos.',
      (select count(*) from "Turno" where barbero_id = v_barbero_id and inicio >= v_hoy);
  end if;

  if (select count(*) from "Cliente" where barberia_id = v_barberia_id and telefono is not null and telefono < 10000000000) > 0 then
    raise warning 'Quedaron clientes con teléfono en formato local (10 dígitos). La prueba del botón de WhatsApp no va a funcionar con esos números.';
  end if;

  raise notice 'Seed OK — barbería % / barbero % / usuario %', v_barberia_id, v_barbero_id, v_user_id;
  raise notice 'Turnos en total: % (histórico) + % (hoy y futuro) | Bloqueos: 2 | Servicios: %',
    (select count(*) from "Turno" where barbero_id = v_barbero_id and inicio <  v_hoy),
    (select count(*) from "Turno" where barbero_id = v_barbero_id and inicio >= v_hoy),
    (select count(*) from "Servicio" where barbero_id = v_barbero_id);
end $$;

-- ============================================================================
-- RESET TOTAL (opcional, destructivo — borra también el historial).
-- Descomentar y ejecutar sólo si se quiere un tenant limpio.
-- Respaldar antes: docs/seed-backup-2026-09-20.json
-- ============================================================================
-- do $$
-- declare
--   v_user_id     uuid;
--   v_barberia_id bigint;
--   v_barbero_id  bigint;
-- begin
--   select id into v_user_id from auth.users where email = 'test@test.com';
--   select id, barberia_id into v_barbero_id, v_barberia_id
--     from "Barbero" where users_id = v_user_id limit 1;
--   if v_barbero_id is null then raise exception 'Barbero no encontrado'; end if;
--   delete from "Turno"          where barbero_id = v_barbero_id;
--   delete from "BloqueoHorario" where barbero_id = v_barbero_id;
--   delete from "Servicio"       where barbero_id = v_barbero_id;
--   delete from "Barbero"        where id = v_barbero_id;
--   delete from "Cliente"        where barberia_id = v_barberia_id;
--   delete from "Barberia"       where id = v_barberia_id;
--   raise notice 'Reset total OK — volver a correr el seed principal.';
-- end $$;
