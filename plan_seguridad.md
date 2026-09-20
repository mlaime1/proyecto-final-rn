# Plan de Seguridad — App Barbería (Supabase)

> Estado: **Fases 1, 2, 3, 4, 7 y 8 completas al 2026-09-11** (Fase 7 item 5 —leaked-password— diferido por decisión al alta del proyecto del cliente).
>
> Proyecto Supabase: `vcgyiyrboumimwgdsitf` · Última auditoría vía MCP: 2026-09-11.
>
> **Ejecutado (Fase 1, BD):** `Turno.inicio` y `Turno.barbero_id` NOT NULL; CHECK `turno_duracion_valida` (`duracion_minutos > 0 AND <= 480`); extensión `btree_gist`; constraint `turno_sin_solape` (EXCLUDE). Prueba superada: solape bloqueado, back-to-back permitido, sin datos de prueba residuales.
> **Ejecutado (Fase 1, código):** 1.6 chequeo cliente-side naive-local + solape completo (helper `findOverlaps`, en `createAppointment` y `updateTurno`); 1.7 mapeo SQLSTATE `23P01`. Verificado con `tsc --noEmit` y `eslint`.
> **Ejecutado (Fase 2, BD) 2026-09-11:** integridad de relaciones de tenant en `Turno` + inmutabilidad de pertenencia. `cliente_id`/`servicio_id` NOT NULL (item 1.3), 3 triggers INVOKER (`fn_turno_validar_relaciones`, `fn_barbero_pertenencia_inmutable`, `fn_cliente_pertenencia_inmutable`) y `REVOKE UPDATE` de tabla + allowlist de columnas en `Barbero`/`Cliente`/`Turno`. Evidencia: 18 tests cross-tenant en transacción con rollback + 5 post-aplicación, todos PASS; advisors sin hallazgos nuevos. Migración: `docs/migrations/phase2_turno_tenant_integrity.sql` (+ rollback).
> **Ejecutado (Fase 3, BD) 2026-09-11:** catálogo `Servicio` cerrado. Se quitó la policy global `USING(true)`; lectura solo de los servicios del barbero autenticado; `anon` sin acceso; escritura (INSERT/UPDATE/DELETE) revocada a `authenticated`. Gestión centralizada del dueño.
> **Ejecutado (Fase 4, BD + código) 2026-09-11:** reserva atómica vía RPC `crear_turno` (SECURITY INVOKER). Cliente + turno en una sola transacción: sin clientes huérfanos ante solape o servicio inválido. `createAppointment` refactorizado a `supabase.rpc`. Migración: `supabase/migrations/phase3_*.sql` y `phase4_*.sql` (+ rollbacks).
> **Ejecutado (Fase 7, código + auditoría) 2026-09-11:** se eliminó `signUp` de `authService`/`useAuth` (y el `getUser` muerto); auditoría de secretos sobre 55 commits: `.env` nunca trackeado, 0 JWT reales, 0 `service_role`; el cliente solo usa `sb_publishable_...` y `secureStorage` (SecureStore nativo / AsyncStorage web) con `persistSession` + `autoRefreshToken`. Se desactivó "Allow new users to sign up" en el proyecto demo (verificado `disable_signup = true`), cerrando el registro público a nivel proyecto. Decisión: leaked-password protection se difiere al alta del proyecto del cliente.
> **Ejecutado (Fase 8, BD) 2026-09-11:** hardening de grants (defensa en profundidad). Revocados `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` de todas las tablas; `anon` sin acceso a tablas ni secuencias; escrituras no usadas de `authenticated` en `Barberia`/`CodigoVerificacion`; `EXECUTE` de las 3 funciones trigger revocado a `PUBLIC/anon/authenticated`; `crear_turno` re-asegurada (solo `authenticated`); default privileges de `anon` revocados. Evidencia: 22/22 tests IDOR + regresión PASS (impersonando barbero A vs tenant B y `anon`); advisors sin hallazgos nuevos. Migración: `supabase/migrations/phase8_grants_hardening.sql` (+ rollback).
> **Diferido:** `es_sobreturno` → Fase 6. (Item 1.3 ya ejecutado en Fase 2.)
> **Nota:** la BD ya tiene datos (12 `Turno`, 1 `Barbero`, 2 `Barberia`, 5 `Servicio`, 10 `Cliente`, 3 `BloqueoHorario`, 1 `auth.users`).

## 1. Resultado ejecutivo

La Fase 1 ya está ejecutada (ver estado arriba); las fases siguientes siguen el orden del plan. La auditoría confirmó que la base tiene RLS activa, pero encontró huecos que impiden afirmar que los tres pilares estén garantizados.

| Pilar | Objetivo | Estado actual |
|---|---|---|
| 1 | Un usuario común no rompe la app | Casi completo: reserva atómica (Fase 4) y errores por SQLSTATE/token; falta dedup de clientes y límites de input server-side |
| 2 | Un programador promedio no puede hackearla | **Completado**: ownership + relaciones/pertenencia (Fase 2), catálogo `Servicio` cerrado (Fase 3), auth sin self-signup ni secretos privilegiados (Fase 7) y grants saneados + IDOR verificado (Fase 8) |
| 3 | Nadie salvo el barbero provoca solapes; el barbero solo a propósito | **Garantizado server-side** (constraint `turno_sin_solape` aplicada 2026-09-11). Pendiente: ajustes de código cliente y sobreturno futuro |

**Regla de no-solape:** el sobreturno es una capacidad futura del barbero, no una prioridad actual. Hasta implementarlo, la política más segura es **no permitir ningún solape**. Cuando se construya, se reemplazará por una excepción explícita, auditable y exclusiva del barbero.

---

## 2. Arquitectura confirmada

Hay dos superficies, no tres:

| Superficie | Usuarios | Autenticación |
|---|---|---|
| App mobile (este repo) | Solo barberos | Usuario Supabase vinculado a `Barbero.users_id` |
| Web | Clientes sin login + admin futuro | Clientes: flujo público controlado · Admin: autenticado |

- No existe ni existirá una app para clientes.
- El admin todavía no está diseñado; puede ser el mismo usuario que también es barbero.
- Una ruta no obvia como `/settings` no es seguridad. La autorización futura debe validarse en Postgres usando `Barberia.admin_user_id` u otra relación explícita.
- La web pública nunca debe poder crear un sobreturno.

---

## 3. Hallazgos confirmados

### H1 — No hay garantía server-side contra solapes (Pilar 3 — crítico)

En `Turno` solo existe el índice primario. No hay exclusion constraint, trigger ni índice que impida solapes.

Además, el código actual:

- usa un check-then-insert vulnerable a concurrencia;
- busca solo turnos cuyo inicio cae dentro del rango, por lo que pierde solapes que empiezan antes;
- usa `toISOString()` UTC contra `timestamp without time zone` naive-local;
- no valida solapes en `updateTurno`.

### H2 — Las RLS de `Turno` no validan todas sus relaciones (Pilar 2 — alto)

La policy actual comprueba que `Turno.barbero_id` pertenece al usuario, pero no garantiza que:

- `servicio_id` pertenezca a ese mismo barbero;
- `cliente_id` pertenezca a la barbería de ese barbero.

La validación existente en services no es una frontera de seguridad: se puede llamar directamente a PostgREST.

### H3 — `Servicio` se puede enumerar cross-tenant (Pilar 2 — alto)

`Servicio select` usa `USING (true)` para `anon` y `authenticated`. Cualquier visitante puede enumerar nombres, precios, duraciones y `barbero_id` de todas las barberías.

El catálogo público puede ser un requisito de producto, pero no debe exponerse como tabla global sin una decisión y una superficie controlada.

### H4 — El futuro trigger de sobreturno no debe liberar el lock antes de tiempo (Pilar 3 — crítico futuro)

Un trigger que retorna inmediatamente para `es_sobreturno = true` antes de adquirir `pg_advisory_xact_lock` deja una carrera entre un sobreturno y una reserva normal.

El lock debe adquirirse antes de decidir si se permite la excepción.

### H5 — “Solo desde la app” no se demuestra con un booleano (Pilar 2/3 — alto)

Una columna `es_sobreturno` puede ser enviada por cualquier cliente que tenga una sesión válida. La UI no es una frontera de seguridad.

La futura excepción debe pasar por una operación server-side autorizada, auditable y que la web pública no pueda invocar.

### H6 — La futura función `SECURITY DEFINER` está incompleta (Pilares 1/2/3 — alto)

Una función privilegiada sin contrato estricto puede convertirse en una API pública de escalada de privilegios.

Debe especificar schema, `search_path`, autenticación/verificación, grants, validación, lock y transacción.

### H7 — La reserva puede dejar clientes huérfanos (Pilar 1 — medio)

`createAppointment` inserta `Cliente` y luego `Turno` en requests separados. Si el segundo falla, queda un cliente sin turno.

La creación de cliente + turno debe ser una única operación transaccional.

### H8 — Manejo de errores frágil (Pilares 1/3 — medio)

La app busca texto como `unique` en el mensaje de error. Los errores de exclusión, foreign key, CHECK o NOT NULL deben manejarse por código SQLSTATE, no por texto.

### H9 — `signUp` contradice el modelo de cuentas manuales (Pilar 2 — medio)

`authService` y `useAuth` todavía exponen `signUp`, aunque no haya pantalla actual. La política del producto es no permitir self-signup.

### H10 — Configuración de autenticación y grants pendientes (Pilar 2 — bajo/medio)

- Debe revisarse la protección contra contraseñas filtradas, reportada como deshabilitada por el advisor.
- Deben revisarse los grants de `anon`/`authenticated` como defensa en profundidad.
- `CodigoVerificacion` está cerrada por RLS, pero debe documentarse y verificarse como tabla no accesible directamente.

### H11 — Campos de pertenencia al tenant son mutables por API (Pilar 2 — crítico)

La app solo actualiza campos de horario, pero la policy de `Barbero` permite actualizar la fila propia sin impedir que un request directo cambie `barberia_id`. También deben protegerse `Cliente.barberia_id` y `Turno.barbero_id` después de crear la fila.

Si un usuario puede reasignar su pertenencia, puede intentar entrar en otro tenant o modificar relaciones que la UI nunca ofrece.

La solución debe usar permisos por columna, triggers de inmutabilidad y/o RPCs estrechas. Una policy `WITH CHECK` sobre la fila nueva no reemplaza una regla que compare `OLD` contra `NEW`.

---

## 4. Plan paso a paso

No avanzar al paso siguiente si el criterio de aceptación del paso actual no está cumplido.

### Fase 0 — Congelar, respaldar y establecer evidencia

1. Exportar el estado actual de schema, policies, grants, funciones, triggers, índices y advisors.
2. Confirmar que el proyecto objetivo es `vcgyiyrboumimwgdsitf`.
3. No ejecutar DDL sobre producción hasta tener una migración revisada y rollback definido.
4. Crear datos de prueba en un entorno/branch separado: dos barberías, dos barberos, servicios y clientes cruzados.
5. Guardar la evidencia base para comparar después.

**Aceptación:** se puede reconstruir el estado inicial y todos los tests de seguridad tienen datos de prueba aislados.

### Fase 1 — Cerrar el Pilar 3 en el estado actual: ningún solape

El sobreturno queda diferido. Por lo tanto, ahora se aplica la regla estricta: ningún turno ocupante puede solapar otro del mismo barbero.

1. Validar que no existan filas conflictivas ni filas con valores nulos inválidos.
2. Convertir invariantes lógicas en invariantes de BD, después de corregir datos existentes:
   - `Turno.inicio` NOT NULL;
   - `Turno.barbero_id`, `servicio_id` y `cliente_id` NOT NULL;
   - `duracion_minutos > 0` y un máximo razonable;
   - `origen` limitado a `web`, `whatsapp` o `presencial`.
3. Habilitar `btree_gist` si no existe.
4. Aplicar una exclusion constraint usando `tsrange`, porque `Turno.inicio` es `timestamp without time zone`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Turno"
  ADD CONSTRAINT turno_sin_solape
  EXCLUDE USING gist (
    barbero_id WITH =,
    tsrange(
      inicio,
      inicio + (duracion_minutos || ' minutes')::interval,
      '[)'
    ) WITH &&
  )
  WHERE (estado IN ('pendiente', 'confirmado', 'completado'));
```

5. Mantener `cancelado` y `ausente` fuera del rango ocupado para liberar el slot inmediatamente.
6. Mantener el check cliente-side solo como UX; nunca como garantía.
7. Corregir `createAppointment` y `updateTurno` para usar límites naive-local y el predicado completo, pero aceptar que la BD es la autoridad.
8. Mapear SQLSTATE `23P01` a “El horario seleccionado ya no está disponible”.

**Aceptación:** dos requests concurrentes al mismo slot producen exactamente un éxito; los turnos back-to-back funcionan; cancelar libera el slot; modificar no puede crear un solape.

### Fase 2 — Garantizar relaciones de tenant en `Turno` — ✅ EJECUTADA 2026-09-11

La autorización de ownership no alcanza: también se debe comprobar la integridad de las relaciones.

**Resultado:** triggers de validación de relaciones (`Turno` → `Servicio`/`Cliente`) e inmutabilidad de pertenencia (`Barbero.barberia_id`/`users_id`, `Cliente.barberia_id`, `Turno.barbero_id`), más `REVOKE UPDATE` de tabla + allowlist de columnas. Los 5 casos del punto 7 se verificaron con SQL directo impersonando roles (`SET LOCAL ROLE authenticated` + `request.jwt.claims`): todos fallan server-side (`42501`/`23514`). También se ejecutó el item 1.3 (`cliente_id`/`servicio_id` NOT NULL).

1. Definir como invariantes server-side:

```text
Turno.barbero_id = Barbero.id del usuario actual
Turno.servicio_id pertenece a ese Barbero
Turno.cliente_id pertenece a la Barberia de ese Barbero
```

2. Hacer inmutables los campos de pertenencia:
   - `Barbero.barberia_id` y `Barbero.users_id` no deben poder cambiarse desde el cliente;
   - `Cliente.barberia_id` no debe poder cambiarse desde el cliente;
   - `Turno.barbero_id` no debe poder cambiarse después de crear el turno.
3. Implementar permisos por columna, triggers `OLD`/`NEW` o RPCs estrechas para impedir reasignaciones. La UI nunca debe ser la única protección.
4. Reforzar las policies `INSERT` y `UPDATE` de `Turno` con `WITH CHECK` que valide `Servicio` y `Cliente`, o encapsular todas las mutaciones en una función invoker/servidor equivalente.
5. Agregar una validación DB adicional (trigger o RPC transaccional) para que la integridad no dependa de la policy ni del service de TypeScript.
6. No permitir que el cliente pueda cambiar `barbero_id`, `cliente_id` o relaciones fuera del conjunto autorizado.
7. Probar explícitamente:
   - barbero A usando `servicio_id` de B;
   - barbero A usando `cliente_id` de otra barbería;
   - barbero A insertando `barbero_id` de B.
   - barbero A cambiando `Barbero.barberia_id` a otra barbería;
   - cambiando `Cliente.barberia_id` o `Turno.barbero_id` mediante REST.

**Aceptación:** cada intento cruzado falla en Postgres aunque se haga con REST directo y no mediante la app.

### Fase 3 — Corregir el catálogo `Servicio` — ✅ EJECUTADA 2026-09-11 (ajustada a gestión centralizada)

**Resultado:** se quitó la policy global `USING(true)`; `Servicio` queda de lectura solo para el barbero dueño y de escritura exclusiva del dueño/server. El catálogo público para la web (slug + RPC + rate limiting) queda diferido hasta que exista la web (Fase 5).

1. Decidir si el catálogo público es realmente público o si solo debe mostrarse después de identificar una barbería/barbero.
2. Revocar la policy global `USING (true)`.
3. Para la app mobile, permitir únicamente servicios del barbero autenticado.
4. Para la web, no abrir toda la tabla a `anon`. Exponer solamente un endpoint/RPC de lectura que:
   - reciba una identidad pública no enumerable fácilmente, preferentemente un slug;
   - devuelva solo servicios activos del barbero/barbería solicitados;
   - no devuelva relaciones internas innecesarias;
   - aplique rate limiting.
5. Verificar que un visitante no pueda enumerar todos los `barbero_id` incrementando IDs.

**Aceptación:** la web puede leer el catálogo necesario, pero no puede obtener el catálogo completo de todos los tenants desde la tabla.

### Fase 4 — Hacer la reserva atómica — ✅ EJECUTADA 2026-09-11

**Resultado:** alta de cliente + turno en una única RPC `crear_turno` (SECURITY INVOKER). Un solape (`23P01`) o un servicio inválido revierten también el cliente: sin huérfanos. `createAppointment` usa `supabase.rpc` y mapea errores por SQLSTATE/token.

1. Reemplazar los dos requests `Cliente.insert` + `Turno.insert` por una sola operación transaccional.
2. La operación debe validar dentro de la misma transacción:
   - autenticación/caller;
   - barbería y barbero;
   - servicio y duración;
   - cliente;
   - horario y estado;
   - lock de disponibilidad;
   - inserción de cliente y turno.
3. Si falla el turno, debe revertirse también la creación del cliente.
4. La app debe interpretar códigos estructurados, no mensajes libres.
5. La misma lógica de solape debe cubrir INSERT y UPDATE.

**Aceptación:** ninguna reserva fallida deja clientes huérfanos ni estados parciales.

### Fase 5 — Contrato seguro para la web pública futura

La web pública no debe insertar directamente en `Turno`, `Cliente` ni `CodigoVerificacion`.

La operación server-side deberá:

1. Vivir en un schema no expuesto o en una Edge Function con acceso mínimo.
2. Si usa `SECURITY DEFINER`:
   - fijar `search_path` explícito y seguro;
   - calificar nombres de tablas y funciones;
   - revocar `EXECUTE` a `PUBLIC` y otorgar solo a los roles necesarios;
   - no confiar en `user_metadata` ni en parámetros enviados por el cliente;
   - validar captcha, expiración, origen y límites;
   - nunca aceptar `es_sobreturno` desde la web;
   - tomar el lock de disponibilidad antes de comprobar e insertar;
   - ejecutarse de forma atómica.
3. Mantener `CodigoVerificacion` cerrada a acceso directo.
4. Auditar cada cambio de privilegios con advisors y una prueba de llamada anónima.

**Aceptación:** un cliente anónimo solo puede ejecutar el flujo público previsto; no puede leer tablas internas ni llamar operaciones administrativas.

### Fase 6 — Sobreturno futuro, sin implementarlo ahora

Cuando se priorice, no se debe eliminar la seguridad para permitirlo.

1. Agregar `Turno.es_sobreturno boolean NOT NULL DEFAULT false`.
2. Reemplazar la constraint estricta por una política explícita de excepción.
3. Adquirir `pg_advisory_xact_lock(barbero_id)` **antes** de cualquier retorno, incluido el caso `es_sobreturno = true`.
4. Permitir el solape únicamente mediante una operación server-side autorizada para el barbero.
5. La web nunca podrá enviar ni activar esa excepción.
6. Auditar quién, cuándo y desde qué operación creó el sobreturno.
7. Probar concurrencia normal-vs-sobreturno y web-vs-sobreturno.

**Aceptación:** un barbero puede forzar un sobreturno solo mediante una acción explícita; ningún cliente web ni request genérico puede hacerlo.

### Fase 7 — Auth, cuentas y secretos — ✅ EJECUTADA 2026-09-11 (item 5 diferido)

**Resultado:** `signUp` eliminado de `authService` y `useAuth` (no quedaban callers) y `getUser` muerto removido. Auditoría de secretos sobre los 55 commits: `.env` nunca fue trackeado (solo `.env.example`), 0 JWT reales (>150 chars), 0 `service_role`, y el cliente usa `sb_publishable_...` (pública por diseño). Sesión persistida en `secureStorage` (SecureStore en nativo, AsyncStorage en web) con `persistSession`/`autoRefreshToken`/`detectSessionInUrl=false`. El signup público del proyecto demo quedó desactivado (verificado). El item 5 (leaked-password protection) se difiere por decisión al alta del proyecto del cliente, donde se reaplica la config de Auth.

1. Eliminar `signUp` de `authService` y `useAuth`, o bloquearlo explícitamente si existe una razón futura documentada.
2. Confirmar que no exista ningún caller de self-signup.
3. Mantener solo publishable/anon key en el cliente; nunca `service_role`.
4. Confirmar rotación de cualquier clave que haya sido expuesta anteriormente.
5. Habilitar y verificar protección contra contraseñas filtradas.
6. Revisar expiración/refresh de sesiones y política de cierre de sesión.
7. Verificar almacenamiento seguro en mobile; documentar las limitaciones del fallback web.

**Aceptación:** no existe camino de registro público ni secreto privilegiado dentro del bundle.

### Fase 8 — Grants, RLS y pruebas IDOR — ✅ EJECUTADA 2026-09-11

**Resultado:** grants saneados y batería IDOR pasada. Se revocaron `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` de todas las tablas, todo acceso de `anon` a tablas/secuencias, las escrituras no usadas de `authenticated` (`Barberia`, `CodigoVerificacion`) y el `EXECUTE` de las 3 funciones trigger; se re-aseguró `crear_turno` solo para `authenticated`. `CodigoVerificacion` queda inaccesible a propósito (RLS sin policy + sin grants). Evidencia: 22/22 tests (aislamiento de lectura, IDOR de escritura A-vs-B, `anon` y regresión de la app) PASS; advisors sin hallazgos nuevos. Migración: `supabase/migrations/phase8_grants_hardening.sql` (+ rollback).

1. Listar grants efectivos de `anon`, `authenticated` y funciones.
2. Revocar acceso directo innecesario a tablas internas.
3. Mantener RLS activa en todas las tablas expuestas.
4. Verificar cada policy con `USING` y `WITH CHECK` cuando corresponda.
5. Probar como barbero A:
   - leer/modificar datos de barbero B;
   - usar servicios de B;
   - usar clientes de otra barbería;
   - cambiar `barbero_id` en un update;
   - modificar `es_sobreturno` ajeno cuando exista.
6. Probar como anon:
   - escribir Turno/Cliente/BloqueoHorario;
   - leer CodigoVerificacion;
   - enumerar servicios de todos los tenants.

**Aceptación:** cada operación fuera del tenant falla server-side, también usando REST directo.

---

## 5. Verificación obligatoria antes de declarar seguridad

### Pilar 1 — Usuario común

- Inputs vacíos, excesivamente largos, caracteres inesperados y fechas inválidas.
- Requests duplicados y reintentos.
- Error de red después de crear cliente pero antes del turno.
- Error de constraint durante reserva y modificación.
- Confirmar ausencia de registros parciales/orphan rows.

### Pilar 2 — Programador promedio

- IDOR por cada tabla.
- Foreign keys cruzadas entre tenants.
- Manipulación directa de campos no visibles en la UI.
- Acceso anónimo a tablas y funciones.
- Intento de usar una función `SECURITY DEFINER` con parámetros inválidos.
- Revisión de secrets y bundle.

### Pilar 3 — Solapes

- Dos inserts concurrentes del mismo slot.
- Solape de borde izquierdo y derecho.
- Turnos de distinta duración.
- Back-to-back válido.
- Update que mueve un turno sobre otro.
- Cancelación que libera de inmediato.
- Sobreturno futuro: solo acción explícita del barbero.

### Evidencia mínima

Antes de cerrar cada fase guardar:

- policies y grants efectivos;
- índices, constraints, triggers y funciones;
- resultados de advisors;
- requests permitidos y rechazados;
- filas creadas antes/después de errores;
- resultado de pruebas concurrentes.

---

## 6. Decisiones abiertas

| # | Decisión | Estado |
|---|---|---|
| 1 | Sobreturno explícito del barbero | Diferido; la base actual debe ser no-solape estricto |
| 2 | Catálogo público | Definir slug/scope; no mantener `USING(true)` global sin justificación |
| 3 | RPC vs Edge Function para web | Definir antes de crear el flujo público |
| 4 | Deduplicación de clientes | Necesaria antes de reglas anti-abuso por cliente |
| 5 | Admin | Futuro; autorización server-side por relación explícita |
| 6 | Protección contra contraseñas filtradas | Diferido por decisión al alta del proyecto del cliente (demo sin signup público). Fase 7 ejecutada |

---

## 7. Orden recomendado de ejecución

1. Congelar evidencia y crear entorno de prueba.
2. Corregir y probar relaciones de `Turno`.
3. Aplicar no-solape estricto y probar concurrencia.
4. Hacer reserva cliente+turno atómica.
5. Cerrar `Servicio` y grants innecesarios. — ✅ (Fases 3 y 8)
6. Eliminar self-signup y corregir configuración de Auth. — ✅ (Fase 7)
7. Ejecutar pruebas IDOR y de los tres pilares. — ✅ (Fase 8)
8. Diseñar la web pública mediante una frontera server-side segura.
9. Recién después planificar admin y sobreturno.

No se debe aplicar una migración si una prueba de seguridad previa falla o si la operación no tiene rollback y evidencia verificable.

---

## 8. Criterio final de aprobación

La aplicación no se declara segura por tener RLS activa. Se declara lista solo cuando:

- el cliente común no puede generar estados parciales ni datos inválidos relevantes;
- un usuario autenticado no puede cruzar tenants ni relaciones de foreign keys;
- la web pública no tiene acceso directo a tablas internas;
- ningún request normal puede solapar turnos bajo concurrencia;
- el sobreturno futuro tiene una frontera server-side explícita y exclusiva del barbero;
- Auth, grants, funciones, secrets y advisors están revisados;
- las pruebas de los tres pilares tienen evidencia reproducible.

---

## 9. Referencias

- `docs/resumen-bd-rls.md` — intención original de RLS.
- `plan_adaptacion_bd.md` — modelo multi-tenant.
- `anti-abuso-web-publica.md` — captcha, rate-limit, expiración y reprogramación web.
- `src/services/turnos.service.ts` — creación y modificación de turnos.
- `src/services/auth.service.ts` / `src/hooks/useAuth.ts` — autenticación y self-signup.
- `src/lib/availability.ts` — cálculo de slots en UI.
- Supabase MCP — schema, policies, grants, índices, triggers y advisors del proyecto real.
