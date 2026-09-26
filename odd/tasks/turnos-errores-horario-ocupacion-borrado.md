# Feature: turnos-errores-horario-ocupacion-borrado

## Objective
Implementar 0 (5 códigos en mapCrearTurnoError), F5-A (display cerrado ante horario incompleto), F4 (estados de ocupación unificados) y F6 (borrado amable de Barbero) en el orden 0 → F5-A → F4 → F6.

## Problem
- Errores de creación de turno caen al genérico "No se pudo crear el turno" aunque la causa sea conocida (horario no configurado, fuera de horario, bloqueado, teléfono inválido, servicio no reservable).
- `getTurnosPorDia` solo mira `confirmado` mientras `findOverlaps` ocupa con pendiente/confirmado/completado → grilla miente si aparece un pendiente.
- Sin horario del barbero, el resolver cae a barbería y a 10:00/18:00/todos, con grilla muda en 5 consumidores; `isDiaHabil([])` devuelve true.
- No existe path de borrado de Barbero; si se agrega alguna vez, el FK 23503 reventaría sin mensaje claro.

## Why
Pedido explícito del usuario (2026-09-26): implementar 0, F4, F5-A, F6 en orden sugerido 0 → F5-A → F4 → F6, con aceptaciones por tarea.

## Scope
- `src/services/turnos.service.ts` (mapCrearTurnoError ~L327-351, constantes L47/53, usos L127/223/505).
- `src/lib/availability.ts` (resolverHorarioEfectivo L104-118, resolverDias L74-83, isDiaHabil L153-156, generateTimeSlots L137-146, defaults L13-14).
- 5 consumidores: `src/app/(tabs)/turnos/nuevo.tsx`, `src/components/ui/ModificarTurnoModal.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/perfil/horario.tsx`, `src/app/(tabs)/perfil/excepciones.tsx`.
- Borrado Barbero: hoy inexistente (`src/services/barbero.service.ts` solo SELECT/UPDATE). F6 es greenfield o wrapper defensivo.
- Excluido: crear infraestructura de tests desde cero, cambios de schema/RPC, web pública, login.

## Constraints
- Expo SDK 54 + TS strict. Imports absolutos `@/*`. Prettier: single quotes, semicolons, trailing commas, printWidth 100.
- `inicio` local-naive (quitar Z + getTimezoneOffset, nunca toISOString crudo). `dias_habiles` JS 0=domingo. Postgres `time` "HH:MM:SS" → `toHHMM()`. `new Date('YYYY-MM-DD')` desplaza → `parseFechaLocal()`.
- `Turno` requiere `origen` (web/whatsapp/presencial) y `duracion_minutos`; no enviar duración cliente-confiada.
- Tono de mapCrearTurnoError: voseo corto, sin códigos técnicos.
- `getBarbero()` null → "cuenta no vinculada"; varias pantallas hoy tragan el error y caen a defaults en silencio (no empeorar).
- Sin test suite en el repo (AGENTS.md: no `npm test`). "Tests en verde" = tsc + lint si no se monta runner.

## Tasks
- [x] T0 — 5 códigos en mapCrearTurnoError (HORARIO_NO_CONFIGURADO, FUERA_DE_HORARIO, HORARIO_BLOQUEADO, TELEFONO_INVALIDO, SERVICIO_NO_RESERVABLE). Ruta: delegada (writer único, 1 archivo pero con verificación). Trigger: preparation (leer antes de escribir) + per-action (tsc/lint en worker fresco si hace falta).
- [x] TF5A — Display cerrado: resolverHorarioEfectivo/resolverDias devuelven "cerrado" sin horario del barbero (sin fallback a barbería/default); isDiaHabil([]) → false en ese caso; generateTimeSlots sin límites → []. 5 consumidores muestran "sin horario configurado" (detectar por `origen`) en vez de grilla muda. Ruta: delegada (writer único, 6 archivos). Trigger: writer (2+ no-triviales) + mapping ya hecho.
- [x] TF4 — Ocupación: jubilar BOOKABLE_STATUSES, usar OCCUPYING_STATUSES en getTurnosPorDia (:223) + verificar :127/:505; confirmar que nada crea pendiente (RPCs escriben confirmado, sin .insert Turno en app). Ruta: delegada junto a T0 o writer único. Trigger: writer/preparation.
- [x] TF6 — Borrado amable: hoy no existe delete de Barbero; definir wrapper defensivo del error FK 23503 con mensaje claro o documentar no-op si no hay path. Ruta: delegada con writer solo si hay path; si no, decisión documentada. Trigger: mapping.
- [ ] TCLOSE — Verificación: `npx tsc --noEmit` + `npm run lint` en verde, readback estructural, reporte de outcome por tarea.

## Authorized scope
Usuario autorizó implementación explícita ("vamos a realizar lo siguiente") el 2026-09-26. Cubre T0, TF5A, TF4, TF6 en este feature. Expansiones (tests runner nuevo, RPCs, schema) requieren autorización aparte. Push/PR/merge: decisión del usuario bajo política ordinaria del repo.

## Acceptance criteria
- T0: forzar cada rechazo (ej. teléfono vacío) muestra su mensaje, no el genérico.
- TF5A: barbero con horario NULL → sin slots y con aviso "sin horario configurado"; con horario completo → idéntico a hoy. tsc + lint en verde.
- TF4: un turno en cada estado (pendiente/confirmado/completado) pinta ocupado en la grilla; verificado que nada crea pendiente hoy.
- TF6: borrar barbero con historial explica ("no se puede borrar: tiene turnos en el historial") en vez de reventar; si no hay path, queda documentado + wrapper listo.

## Applicable checks
- TDD: OFF (fuente: AGENTS.md "No test suite" + exploración 2026-09-26 sin runner/config/scripts). Runner: ninguno. Checks ordinarios: `npx tsc --noEmit`, `npm run lint`. Sin evidencia inventada.
- Review: RDD switch por verificar antes de cada work-unit commit (`gentle-ai review assess` + preflight solo si enabled). Candidato = work-unit commit, nunca checkbox.
- Delivery: estrategia `ask-on-risk` (default). Forecast <400 authored lines → un solo PR. Slices/PR boundaries aquí cuando aplique.

## Progress
- 2026-09-26: exploración read-only completa (handoff mapper). Feature doc creado. Sin writes de fuente aún.
- 2026-09-26: T0 done. Rama `feat/turnos-errores-horario-ocupacion`. Commit 563500f (15 insertions, 1 archivo). RDD off (global) → sin review; assess tracked-diff: medium/under_budget (executable_change, 1 path/15 lines).
- 2026-09-26: TF5A done. Commit 137fde9 (6 archivos, +231/−130). resolver propio-o-cerrado con origen 'cerrado'; isDiaHabil([]/null)→false; slots sin límites→[]. RDD off → sin review; assess tracked-diff: medium/under_budget (361 lines).
- 2026-09-26: TF4 done. Commit c8aa16d (1 archivo, +1/−2). BOOKABLE_STATUSES eliminada; getTurnosPorDia usa OCCUPYING_STATUSES; :127/:505 ya la usaban (verificados sin tocar). Nada crea pendiente hoy (RPCs confirmado, sin .insert Turno). Assess tracked-diff: medium/under_budget (3 lines).
- 2026-09-26: TF6 done. Commit d1f179f (1 archivo, +28). Nuevo deleteBarbero en barbero.service.ts: 23503 → "No se puede borrar: tiene turnos en el historial.", resto genérico + code crudo como deleteTurno. Sin UI (fuera de alcance). Assess tracked-diff: medium/under_budget (28 lines).
- Commits: 563500f feat(turnos): mapear 5 errores de creación. 137fde9 feat(horario): display cerrado ante horario incompleto con aviso. c8aa16d feat(turnos): grilla ocupa con pendiente/confirmado/completado. d1f179f feat(barbero): borrado amable con mensaje claro ante historial.

## Verification evidence
- T0 writer: `npx tsc --noEmit`: exit 0 sin salida; `npm run lint`: exit 0, 0 errores, 9 warnings preexistentes no-explicit-any (ninguno en archivo tocado).
- T0 parent spot check: `npx tsc --noEmit`: exit 0.
- TF5A writer: `npx tsc --noEmit`: exit 0 sin salida; `npm run lint`: exit 0, 0 errores, mismos 9 warnings preexistentes.
- TF5A parent spot check: `npx tsc --noEmit`: exit 0.
- TF4 writer: `npx tsc --noEmit`: exit 0 sin salida; `npm run lint`: exit 0, 0 errores, mismos 9 warnings preexistentes.
- TF4 parent spot check: `npx tsc --noEmit`: exit 0.
- TF6 writer: `npx tsc --noEmit`: exit 0 sin salida; `npm run lint`: exit 0, 0 errores, mismos 9 warnings preexistentes.
- TF6 parent spot check: `npx tsc --noEmit`: exit 0.

## Next step
- Cierre: verificación final rama completa + push/PR a decisión del usuario (política ordinaria).

## Locator
- Repo-relative: `odd/tasks/turnos-errores-horario-ocupacion-borrado.md`
- Engram mirror topic: `odd/turnos-errores-horario-ocupacion-borrado/tasks` (proyecto `proyecto-final-rn`)
