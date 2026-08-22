# Plan: Adaptación a la nueva BD multi-tenant (Barbería)

> **Contexto**: la app migra del modelo "1 usuario = 1 negocio" (`Emprendedor`) al modelo multi-tenant `Barberia → Barbero` (spec v2, 19/08/2026). La BD nueva vive en otro proyecto Supabase (`vcgyiyrboumimwgdsitf`). La migración SQL del equipo agrega `Turno.origen`, `Turno.duracion_minutos`, `Cliente.email` y la tabla `CodigoVerificacion`.

## Decisiones tomadas

- Schema real verificado por REST + migración del equipo (origen, duracion_minutos, Cliente.email, CodigoVerificacion).
- UI con **solo 2 estados** de turno: `confirmado` / `cancelado` (el enum sigue teniendo 5 valores, no se toca).
- **Sin email** en el formulario de la app (el campo existe en BD pero es nullable; lo usa la web pública).
- **Mini-selector de origen** (presencial / whatsapp) al crear turno desde la app.
- Pantallas "Mi horario" y "Bloqueos" quedan **[PENDIENTE]** (Fase 3).
- Fin del turno se calcula con `Turno.duracion_minutos` (snapshot), sin join a `Servicio`.

## Schema objetivo (post-migración)

| Tabla | Columnas |
|---|---|
| `Barberia` | id, nombre, admin_user_id, hora_apertura, hora_cierre, dias_habiles (int[]), created_at |
| `Barbero` | id, barberia_id FK, users_id (auth), nombre, dias_habiles (int[]), hora_apertura, hora_cierre, activo, alias, descripcion, foto_url, created_at |
| `Servicio` | id, barbero_id FK, nombre, duracion, precio |
| `Cliente` | id, barberia_id FK, nombre, telefono, notas, ultima_visita, email (nullable, único por barbería), created_at |
| `Turno` | id, barbero_id FK, servicio_id FK, cliente_id FK, inicio, estado, origen (web/whatsapp/presencial), duracion_minutos, created_at, update_at |
| `BloqueoHorario` | id, barbero_id FK, fecha (date), hora_inicio (time, null = día completo), hora_fin, motivo, created_at |
| `CodigoVerificacion` | (RLS cerrada, solo función security definer — la app NO la toca) |

Enum `estado_turno`: pendiente, confirmado, completado, cancelado, ausente (sin cambios).

---

## Fase 0 — Configuración y tipos

1. **`.env`**: actualizar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` al proyecto nuevo.
2. **`src/types/database.types.ts`**: reescritura completa con el schema post-migración (6 tablas + CodigoVerificacion, enum de 5 estados). Se elimina `Emprendedor`.

## Fase 1 — Capa de servicios

3. **`src/services/barbero.service.ts`** (reemplaza a `emprendedor.service.ts`):
   - `getBarbero()`: `select('*, Barberia(nombre)')` filtrado por `users_id = auth.uid()`.
   - **Eliminar `createEmprendedor`/`ensureEmprendedor`** (spec: alta manual, sin policy de insert).
   - Si no hay fila → error "Tu cuenta no está vinculada a ninguna barbería."
4. **`src/services/turnos.service.ts`** (reescritura):
   - `getCurrentEmprendedor` → `getCurrentBarbero` (expone `id` y `barberia_id`).
   - Todos los `.eq('emprendedor_id', …)` → `.eq('barbero_id', …)`.
   - `getServicios()`: filtrar por `barbero_id` (catálogo propio del barbero).
   - `createAppointment`:
     - upsert de `Cliente` incluyendo `barberia_id` (verificar constraint de conflicto real: probablemente `(barberia_id, telefono)`).
     - insert de `Turno` con `barbero_id`, `origen` (parámetro), `duracion_minutos` (snapshot copiado de `Servicio.duracion`), estado `confirmado`.
   - `updateTurno`: whitelist `servicio_id`/`inicio`/`estado`; si cambia `servicio_id` → re-copiar `duracion_minutos` del nuevo servicio.
   - `getTurnosPorDia`: devolver `duracion_minutos` del propio turno (sin join a Servicio).
   - `BOOKABLE_STATUSES` → `['confirmado']`; `VALID_ESTADOS` → `['confirmado','cancelado']`.
   - Lógica de timestamps con `inicio` se conserva.
5. **`src/services/bloqueos.service.ts`** (nuevo):
   - `getBloqueosDelDia(fecha)`, `createBloqueo({fecha, hora_inicio?, hora_fin?, motivo?})`, `deleteBloqueo(id)` — siempre por `barbero_id`.

## Fase 2 — Adaptación de pantallas existentes

6. **`src/app/(tabs)/index.tsx`** (Home): `ensureEmprendedor` → `getBarbero`; badges solo 2 estados.
7. **`src/app/(tabs)/perfil/index.tsx`**: `getBarbero`; muestra barbería (join) + barbero + email de sesión; maneja caso "cuenta sin vincular".
8. **`src/app/(tabs)/turnos/[id].tsx`**: labels/colores a 2 estados; **eliminar botones "Ausente" y "Finalizar"**; fin con `duracion_minutos`.
9. **`src/app/(tabs)/turnos/nuevo.tsx`**:
   - Slots dinámicos desde `barbero.hora_apertura`/`hora_cierre` (paso 30 min).
   - Días disponibles filtrados por `barbero.dias_habiles`.
   - Ocupados = turnos del día + **bloqueos** del día.
10. **`src/components/ui/ModificarTurnoModal.tsx`**: misma lógica de slots/bloqueos → helper compartido **`src/lib/availability.ts`** (no duplicar).
11. **`src/app/(tabs)/turnos/confirmar.tsx`**: selector de origen (presencial/whatsapp, default presencial) + pasa `origen` al service.
12. **`src/app/(tabs)/turnos/index.tsx`** y **`src/components/ui/Card.tsx`**: solo ajustes de tipos (siguen usando `inicio`).

## Fase 3 — Pantallas NUEVAS [PENDIENTE]

> No existen hoy en la app. La spec 5.1 las incluye en el MVP; se dejan para una iteración posterior a la adaptación.

13. **[PENDIENTE] "Mi horario"**: editar `dias_habiles`, `hora_apertura`, `hora_cierre` del Barbero (RLS permite update de la propia fila). Entrada desde Perfil.
14. **[PENDIENTE] "Bloqueos"**: listar/crear/eliminar `BloqueoHorario` (el service ya existe del paso 5). Entrada desde Perfil.

## Fase 4 — Datos de prueba y verificación

15. **Cuenta de prueba**: crear usuario auth a mano en el dashboard (no hay self-signup). **Seed SQL** (generado por este plan, correr en SQL Editor después de la migración): 1 Barberia + 1 Barbero vinculado al `users_id` + ~5 servicios + ~8 clientes + ~10 turnos (con `origen` y `duracion_minutos` coherentes) + 1-2 bloqueos.
16. **Verificación**: `npx tsc --noEmit`, `npm run lint`, y flujo manual completo en Expo Go (login → home → lista → detalle → cancelar → crear → modificar).

## Prerequisitos externos

- Correr la **migración SQL** del equipo en el proyecto nuevo ANTES del seed.
- Crear el **usuario auth** de prueba en el dashboard.
- `CodigoVerificacion` y flujo de reserva web: **fuera de alcance** de la app Android (web pública).
