# Feature: techo-barberia-reserva

## Objetivo
Alinear la reserva con el techo de la barbería (opción B): la grilla y las
validaciones cliente usan la intersección barbero ∩ barbería, como ya hace la
RPC `crear_turno` server-side.

## Problema
- La RPC viva `public.crear_turno` YA impone la opción B: exige horarios de
  ambos lados no nulos (`HORARIO_NO_CONFIGURADO`), exige `v_dow` en AMBOS días
  (`FUERA_DE_HORARIO`), ventana efectiva `greatest(aperturas)/least(cierres)`
  con chequeo de contención (`FUERA_DE_HORARIO`), y chequea bloqueos
  (`HORARIO_BLOQUEADO`).
- El cliente está desfasado: muestra el lunes y hasta las 21:00 (horario propio
  del barbero) y deja llegar al RPC para fallar.
- Caso testigo: Barbero Mauro Test (id 1) `dias_habiles [0,1,3,4,5,6]`,
  10:30–21:00; Barbería Premium días `[2,3,4,5,6,0]`, 09:00–20:00.

## Por qué
Opción B autorizada explícitamente por el usuario: la reserva no puede ofrecer
lo que el servidor va a rechazar. El cliente debe dejar de mostrar días/slots
fuera del techo antes de llegar al RPC.

## Alcance
- `src/lib/availability.ts` (nuevo `resolverHorarioReservable` + `estaEnVentana`;
  `resolverHorarioEfectivo` NO cambia: lo usan pantallas de config).
- `src/app/(tabs)/turnos/nuevo.tsx`, `src/components/ui/ModificarTurnoModal.tsx`,
  `src/app/(tabs)/turnos/confirmar.tsx`, `src/services/turnos.service.ts`
  (`createAppointment`).
- Excluido: cambios de schema/RPC, pantallas de config
  (`perfil/horario.tsx`, `perfil/excepciones.tsx`), web pública, login.

## Constraints
- Expo SDK 54 + TS strict. Imports absolutos `@/*`. Prettier: single quotes,
  semicolons, trailing commas, printWidth 100. `any` es warning, no se purga.
- Sin suite de tests en el repo: no buscar `npm test`.

## Tareas
- [x] T1 — `resolverHorarioReservable(barbero, barberia)` en
  `src/lib/availability.ts`: intersección de días (solo enteros 0–6),
  apertura = max, cierre = min; si falta algún lado, intersección vacía o
  apertura >= cierre → `origen: 'cerrado'` con campos en null (sin slots).
  Comentarios en español: única fuente para RESERVA; el resolver viejo sigue
  siendo para CONFIG. Reutilizar `toHHMM`/minutos existentes.
- [x] T2 — `src/app/(tabs)/turnos/nuevo.tsx`: nuevo resolver para
  horario/timeSlots/isDisabled; aviso en vez de grilla si `selectedDate` no es
  hábil; `handleNext()` bloquea día no hábil y fuera de ventana con showAlert.
- [x] T3 — `src/components/ui/ModificarTurnoModal.tsx`: mismo cambio
  (availableDays, timeSlots, aviso, validación en `handleSave`).
- [x] T4 — `src/app/(tabs)/turnos/confirmar.tsx`: revalidar día hábil + ventana
  efectiva antes de `createAppointment` (barbero + barbería vía `getBarbero()`
  y el nuevo resolver); si falla, showAlert y no llamar.
- [x] T5 — `src/services/turnos.service.ts` `createAppointment`: pre-chequeo
  cliente de día hábil + contención en ventana efectiva usando barbero y
  `barbero.Barberia`; lanzar `ServiceError('Está fuera del horario de
  atención.', { code: 'FUERA_DE_HORARIO' })`.
- [ ] TCLOSE — Verificación: `npx tsc --noEmit` + `npm run lint` en verde,
  reporte de outcome por tarea.

## Alcance autorizado
Usuario autorizó implementación (opción B) sobre la rama
`feat/techo-barberia-reserva` creada desde
`feat/turnos-errores-horario-ocupacion`. Cubre T1–T5 en este feature.
Expansiones (schema, RPCs, tests runner nuevo) requieren autorización aparte.
Push/PR/merge: decisión del usuario bajo política ordinaria del repo.

## Criterios de aceptación
- T1: intersección del caso testigo = días `[0,3,4,5,6]`, 10:30–20:00; sin un
  lado o con ventana vacía → cerrado sin slots; el resolver viejo intacto.
- T2/T3: el lunes se muestra deshabilitado/sin grilla (aviso) y no se puede
  avanzar; slots solo 10:30–20:00 en días del cruce.
- T4/T5: reserva fuera del techo se bloquea en cliente con el mensaje
  existente, sin llegar al RPC.
- TCLOSE: `npx tsc --noEmit` exit 0; `npm run lint` exit 0 sin errores nuevos.

## Checks aplicables
- TDD: OFF (AGENTS.md: sin suite, no `npm test`). Checks ordinarios:
  `npx tsc --noEmit`, `npm run lint`. Sin evidencia inventada.

## Progreso
- T1 done. `resolverHorarioReservable` + `estaEnVentana` en
  `src/lib/availability.ts`; imports de tipos a `import type` (evita ciclo de
  runtime con `turnos.service.ts`); `resolverHorarioEfectivo` intacto.
- T2 done. `nuevo.tsx` usa la intersección (DayStrip deshabilita fuera del
  techo; aviso "Día no disponible" si el día elegido no es hábil);
  `handleNext()` valida día + ventana antes del chequeo de pasado.
- T3 done. `ModificarTurnoModal` usa la intersección (availableDays, slots,
  aviso "Día no disponible"); `handleSave()` valida día + ventana con
  showAlert, como en `nuevo.tsx`.
- T4 done. `confirmar.tsx` revalida día hábil + ventana efectiva con
  `getBarbero()` antes de `createAppointment`; si falla, showAlert y no llama
  (el `finally` existente resetea el loading).
- T5 done. `createAppointment` pre-chequea día hábil + ventana efectiva con
  barbero y `barbero.Barberia` embebida; fuera del techo →
  `ServiceError('Está fuera del horario de atención.', { code:
  'FUERA_DE_HORARIO' })`, cubierto por el mapeo existente. Pasos renumerados
  (2 techo, 3 solape, 4 RPC).

## Evidencia de verificación
- (pendiente)

## Locator
- Repo-relative: `odd/tasks/techo-barberia-reserva.md`
- Engram mirror topic: `odd/techo-barberia-reserva/tasks` (proyecto `proyecto-final-rn`)
