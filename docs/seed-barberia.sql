-- ============================================================================
-- SEED de datos de prueba — Fase 4
-- Proyecto: Barbería (vcgyiyrboumimwgdsitf)
--
-- CÓMO USAR:
--   1) Esta SQL asume que YA corriste la migración del equipo (origen,
--      duracion_minutos, Cliente.email, CodigoVerificacion). Si tira
--      "column does not exist", corre la migración primero.
--   2) Creá en el dashboard (Authentication -> Users -> Add user) un usuario
--      con el email que está abajo en v_email (o usá uno ya existente).
--      La cuenta del barbero NO se autocrea: la da de alta el equipo.
--   3) Pegá y ejecutá TODO este script en el SQL Editor (corre como
--      postgres, por eso saltea las RLS de la app).
--   4) Es RE-EJECUTABLE: limpia primero los datos del demo para este email.
-- ============================================================================

do $$
declare
  v_email         text     := 'REEMPLAZAR_CON_EMAIL_DEL_BARBERO@ejemplo.com';
  v_user_id       uuid;
  v_barberia_id   bigint;
  v_barbero_id    bigint;
begin
  -- 0) usuario auth destino
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'No existe un usuario auth con email %%. Crealo en el dashboard antes de correr el seed.', v_email;
  end if;

  -- limpieza previa del demo (re-ejecutable)
  delete from "Turno"         where barbero_id in (select id from "Barbero" where users_id = v_user_id);
  delete from "BloqueoHorario" where barbero_id in (select id from "Barbero" where users_id = v_user_id);
  delete from "Servicio"       where barbero_id in (select id from "Barbero" where users_id = v_user_id);
  delete from "Cliente"        where barberia_id in (select id from "Barberia" where nombre = 'Barbería Demo');
  delete from "Barbero"        where users_id = v_user_id;
  delete from "Barberia"       where nombre = 'Barbería Demo';

  -- 1) Barbería (tenant)
  insert into "Barberia" (nombre, hora_apertura, hora_cierre, dias_habiles)
  values ('Barbería Demo', '09:00', '20:00', array[1,2,3,4,5])
  returning id into v_barberia_id;

  -- 2) Barbero (vinculado al usuario auth)
  insert into "Barbero" (barberia_id, users_id, nombre, dias_habiles, hora_apertura, hora_cierre, activo)
  values (v_barberia_id, v_user_id, 'Mauro Laime', array[1,2,3,4,5], '09:00', '20:00', true)
  returning id into v_barbero_id;

  -- 3) Servicios (catálogo propio del barbero)
  insert into "Servicio" (barbero_id, nombre, duracion, precio)
  values
    (v_barbero_id, 'Corte clásico',     30, 3500),
    (v_barbero_id, 'Corte y barba',     60, 6000),
    (v_barbero_id, 'Arreglo de barba',  30, 3000),
    (v_barbero_id, 'Perfilado',         45, 4500),
    (v_barbero_id, 'Tintura',           90, 9000);

  -- 4) Clientes (compartidos de la barbería; email nullable)
  insert into "Cliente" (barberia_id, nombre, telefono, email)
  values
    (v_barberia_id, 'Juan Pérez',       1122334455, 'juan.perez@mail.com'),
    (v_barberia_id, 'María Gómez',      1133445566, 'maria.gomez@mail.com'),
    (v_barberia_id, 'Carlos Ruiz',      1144556677, null),
    (v_barberia_id, 'Lucía Fernández',  1155667788, 'lucia.f@mail.com'),
    (v_barberia_id, 'Diego Torres',     1166778899, null),
    (v_barberia_id, 'Sofía Méndez',     1177889900, 'sofia.mendez@mail.com'),
    (v_barberia_id, 'Pedro Sosa',       1188990011, null),
    (v_barberia_id, 'Ana Castro',       1199001122, 'ana.castro@mail.com');

  -- 5) Turnos (origen + duracion_minutos snapshot obligatorios)
  insert into "Turno" (barbero_id, servicio_id, cliente_id, inicio, estado, origen, duracion_minutos)
  values
    (v_barbero_id, (select id from "Servicio" where nombre='Corte clásico' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1122334455),
                    now() + interval '2 hours', 'confirmado', 'presencial', 30),

    (v_barbero_id, (select id from "Servicio" where nombre='Corte y barba' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1133445566),
                    now() + interval '4 hours', 'confirmado', 'whatsapp', 60),

    (v_barbero_id, (select id from "Servicio" where nombre='Perfilado' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1144556677),
                    now() + interval '6 hours', 'cancelado', 'presencial', 45),

    (v_barbero_id, (select id from "Servicio" where nombre='Tintura' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1155667788),
                    (date_trunc('day', now()) + interval '1 day') + time '11:00', 'confirmado', 'whatsapp', 90),

    (v_barbero_id, (select id from "Servicio" where nombre='Arreglo de barba' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1166778899),
                    (date_trunc('day', now()) + interval '1 day') + time '16:00', 'confirmado', 'presencial', 30),

    (v_barbero_id, (select id from "Servicio" where nombre='Corte clásico' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1177889900),
                    (date_trunc('day', now()) + interval '2 days') + time '10:00', 'confirmado', 'presencial', 30),

    (v_barbero_id, (select id from "Servicio" where nombre='Corte y barba' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1188990011),
                    (date_trunc('day', now()) + interval '2 days') + time '12:00', 'confirmado', 'whatsapp', 60),

    (v_barbero_id, (select id from "Servicio" where nombre='Perfilado' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1199001122),
                    (date_trunc('day', now()) + interval '3 days') + time '11:00', 'confirmado', 'presencial', 45),

    (v_barbero_id, (select id from "Servicio" where nombre='Tintura' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1122334455),
                    (date_trunc('day', now()) + interval '4 days') + time '15:00', 'confirmado', 'whatsapp', 90),

    (v_barbero_id, (select id from "Servicio" where nombre='Arreglo de barba' and barbero_id=v_barbero_id),
                    (select id from "Cliente" where telefono=1133445566),
                    (date_trunc('day', now()) + interval '5 days') + time '10:30', 'confirmado', 'presencial', 30);

  -- 6) Bloqueos (excepciones de horario)
  insert into "BloqueoHorario" (barbero_id, fecha, hora_inicio, hora_fin, motivo)
  values
    (v_barbero_id, (date_trunc('day', now()) + interval '2 days')::date, '15:00', '17:00', 'Corte de luz'),
    (v_barbero_id, (date_trunc('day', now()) + interval '7 days')::date, null, null, 'Vacaciones');

  raise notice 'Seed OK — barbería %, barbero %, usuario %', v_barberia_id, v_barbero_id, v_user_id;
end $$;
