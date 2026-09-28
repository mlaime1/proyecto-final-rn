# Feature: pwa-web-push-barbero

## Objetivo
Parche PWA + Web Push solo para barbero en la app Expo Web actual, portable a Next.js. El barbero elige si le avisa reserva, cancelación o ambos.

## Problema
- App corre en Expo Go web, sin notificaciones nativas y sin Apple Developer (descartado).
- Hoy cero notificaciones: `createAppointment` solo llama a RPC `crear_turno`, sin efectos.
- Uso real será web en iPhone + Android, detrás de login, solo barberos.

## Por qué
Usuario autorizó opción A (PWA + Web Push). Clientes fuera de alcance por ahora. Parche consciente: framework-agnostic para reutilizar en Next.js.

## Alcance
- `public/manifest.json`, iconos PWA, `app.config.ts` web, SW mínimo en raíz (`public/sw-push.js` + registro solo web).
- `src/lib/push/*` agnóstico (sin expo, sin react-native): `vapid.ts`, `subscription.ts`, `detect.ts`. Reutilizable tal cual en Next.js.
- DB: migración `supabase/migrations/*_push_barbero.sql` (`push_subscriptions` + prefs en `Barbero`: `notify_on_reserva`, `notify_on_cancelacion`) + RLS + update manual de `src/types/database.types.ts`.
- UI barbero: `src/app/(tabs)/perfil/notificaciones.tsx` + row en `perfil/index.tsx` (toggle reserva/cancelación, botón activar/desactivar push, guía Add to Home Screen iOS/Android).
- Sender: `supabase/functions/send-push/index.ts` (Deno + web-push, lee prefs + subscriptions, fanout) + wiring desde `turnos.service.ts` tras crear/cancelar + docs deploy.
- Excluido: push a clientes, nativo APNs/FCM, EAS build, web pública Astro, email/WhatsApp.

## Constraints
- Expo SDK 54 + TS strict. Imports absolutos `@/*`. Prettier single quotes, semicolons, trailing commas, printWidth 100. `any` es warning.
- Sin suite de tests: no `npm test`. TDD OFF (fuente: AGENTS.md + package.json sin test).
- HTTPS obligatorio, SW en `/`, permiso solo desde gesto, `userVisibleOnly:true`, siempre `showNotification()`.
- iOS: requiere instalada (Add to Home Screen), iOS 16.4+, abrir desde icono. Android: install prompt + FCM.
- `database.types.ts` mantenido a mano. Migración corre solo en SQL Editor (rol postgres, bypass RLS).
- Parche portable: nada de `expo-notifications`, nada de `expo-*` en `src/lib/push/*`.

## Tareas
- [x] T1 — PWA base instalable Android+iOS: `public/manifest.json` (name, short_name, display standalone, start_url, icons 192/512, theme), link en web, iconos, `app.config.ts` web (themeColor), SW `public/sw-push.js` mínimo (push + click + cache-off agresivo NO), registro condicional solo web + standalone detect. Heurística ~400 líneas: solo lo coherente mínimo. VERIFICADO 2026-09-28: tsc 0, lint 0 errores/0 warnings nuevos, dist/ heredado consistente (export no re-ejecutado en pasada read-only), portable Next.js OK. Commit a2b72e2.
- [x] T2 — DB patch: migración `push_subscriptions(id, barbero_id FK, endpoint unique, p256dh, auth, user_agent, created_at)` + columnas `Barbero.notify_on_reserva bool default true`, `notify_on_cancelacion bool default true` + RLS (barbero solo sus filas vía `users_id`) + `database.types.ts` a mano + doc de aplicación en SQL Editor. VERIFICADO 2026-09-28: tsc 0, lint 0 errores/0 nuevos, supabase lint no-ejecutado (sin docker, prohibido remoto). Commit d83cbfe. PENDIENTE usuario: aplicar en SQL Editor + verificación RLS del README_PUSH.
- [x] T3 — Client lib agnóstica `src/lib/push/`: `detect.ts` (isStandalone, isIOS, isPushSupported), `vapid.ts` (VAPID public de env), `subscription.ts` (getRegistration, subscribe, unsubscribe, saveToSupabase, base64 helpers). Sin imports RN/Expo. Solo Web Push estándar. VERIFICADO 2026-09-28: tsc 0, lint 0 errores/0 nuevos, cero imports expo/RN. Commit 8c3dd29. Nota: importa supabase+barbero.service (transitivo expo-secure-store) — en Next se re-apuntan 2 imports.
- [x] T4 — UI barbero `perfil/notificaciones.tsx`: muestra estado (no-instalada / instalada-sin-permiso / activa), botón Activar (gesto) con guía iOS Share->Add + Android Install, toggles reserva/cancelación (guardan en `Barbero`), botón Desactivar (unsubscribe + borra subscription con 410), row en `perfil/index.tsx`. Header back custom (perfil es Stack headerShown false). VERIFICADO 2026-09-28: tsc 0, lint 0 errores/0 nuevos. Commit e584e37 (460 líneas). Sin prueba real hasta TCLOSE (requiere VAPID T5).
- [x] T5 — Sender + wiring: `supabase/functions/send-push/` (valida JWT barbero o service_role según trigger, lee prefs, filtra por evento `reserva|cancelacion`, envía con VAPID privada desde secret, prune 404/410) + llamada desde `turnos.service.ts` tras `crear_turno` y tras cancelar (fire-and-forget, no bloquea UX) + README deploy + notas port Next.js (qué archivos se copian tal cual). VERIFICADO 2026-09-28: tsc 0, lint 0 errores/0 nuevos, sin deploy. Commit 1d9fbb3. Corrige typo doc: `cancelacion`.
- [x] TCLOSE — Verificación automatizada PASS 2026-09-28: `tsc` 0, `lint` 0 errores/0 nuevos, `expo export` OK con manifest+SW+link en `dist/`. PENDIENTE usuario (cierra TCLOSE real): aplicar migración, VAPID, secrets, deploy function, prueba Android + iPhone 16.4+ instalado desde icono.

## Alcance autorizado
Usuario autorizó PWA + Web Push solo barbero (reserva/cancelación/ambos), sin Apple Developer, Android+iOS, parche portable a Next.js. Cubre T1–T5 + TCLOSE en este feature. Expansiones (clientes, WhatsApp/email, nativo) requieren autorización aparte. Push/PR/merge: decisión del usuario.

## Criterios de aceptación
- T1: Lighthouse/PWA instalable en Android y iPhone (Add to Home Screen abre standalone sin barra), SW registrado en `/` solo web.
- T2: Migración aplica limpio en staging, RLS impide ver subscriptions ajenas, tipos compilan.
- T3: `subscribe()` devuelve subscription válida y la guarda; `unsubscribe()` la borra; en Safari tab sin instalar reporta no-soportado sin crashear.
- T4: Barbero puede dejar solo-reserva, solo-cancelación o ambos y persiste; guía iOS visible solo en iOS no-instalado.
- T5: Reserva nueva con pref on -> push visible en dispositivo suscrito; cancelación igual; pref off -> no envía; 410 prunea sin error; fallo de envío nunca rompe crear/cancelar turno.
- TCLOSE: `tsc` 0, `lint` 0 errores nuevos, export web OK.

## Checks aplicables
- TDD: OFF. Checks ordinarios por tarea: `npx tsc --noEmit`, `npm run lint`. Export web en T1/TCLOSE. Sin evidencia inventada. Cada tarea cierra con work-unit commit en feature branch.

## Progreso
- 2026-09-28: feature creado, 6 items (T1-T5 + TCLOSE). Estimado 600-800 líneas -> excede heurística 400, estrategia `ask-on-risk` (default): work-unit commits por tarea, un PR al final salvo que reviente; TDD OFF; runner n/a.
- Ruta: delegated direct (writer trigger: 2+ no-triviales). triggers: mapping ya hecho, preparation delegada al writer.
- 2026-09-28: T1 done verificado (commit a2b72e2). standalone-detect helper queda para T3 (detect.ts). Sigo con T2.
- 2026-09-28: T2 done (commit d83cbfe). Scope OK (4 archivos, no tocó T1/T4/T5). Sigo con T3.
- 2026-09-28: T3 done (commit 8c3dd29). Scope OK. Acumulado ~643 líneas (206+218+219) > heurística 400. Estrategia ask-on-risk: debo preguntar split vs size:exception antes de T4.
- 2026-09-28: T4 done (commit e584e37). PR2 acumula 460. Sigo con T5 (último, luego aviso prueba iPhone).
- 2026-09-28: T5 done (commit 1d9fbb3). Todo el código listo. Falta TCLOSE + pendientes usuario (VAPID, deploy, migración). PR2 total ~825.
- 2026-09-28: TCLOSE automatizado PASS (tsc/lint/export). Rama limpia, 12 commits, lista para PR1/PR2. Prueba real en dispositivos queda en manos del usuario.
- 2026-09-28: usuario aplicó migración (verificado: push_subscriptions + prefs existen), regeneró VAPID, seteó secrets y deployó send-push (verificado: ACTIVE v1). Falta rebuild web + smoke test + prueba iPhone.
- 2026-09-28: push + PRs stacked creados: PR #74 (T1–T3 base techo) y PR #75 (T4–T5 base PR1). Merge/merge orden: decisión del usuario.
- 2026-09-28: fanout web hecho en OTRO repo (conexion-demo, rama feat/push-fanout-booking, sin commit/deploy): send-push porteado byte-idéntico + fire-and-forget en public-booking que resuelve turno/barbero solo en server vía BookingIdempotency→Turno (public_crear_turno no expone id por privacidad). Corrección a mi snippet: el turno.barbero_id no existe en el browser. Pendiente: deploy public-booking (manual usuario) + test punta a punta web→push. Skipped allá: deno fmt, deploy.

## Delivery
- Estrategia: `ask-on-risk` -> usuario eligió PRs encadenados `stacked-to-main` (2026-09-28). PR1 = T1–T3 (~643 líneas), PR2 = T4–T5. Avisar al cerrar T5 para prueba en iPhone.
- Frontera base: rama `feat/techo-barberia-reserva` (actual). Nueva rama `feat/pwa-web-push-barbero` desde ahí.
- Commits: work-unit por tarea, Conventional Commits, tests/docs junto al comportamiento (docs = guía iOS + README deploy).

## Ruta
- delegated direct, un writer acotado por lote. TDD OFF, checks ordinarios, sin review nativa (RDD off global per memoria pasada). Skill paths al writer: supabase, supabase-postgres-best-practices, work-unit-commits.
