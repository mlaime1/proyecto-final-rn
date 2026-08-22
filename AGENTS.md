# AGENTS.md

React Native (Expo SDK 54 + TypeScript strict) app for a barbershop. There is **no local database** — Supabase is remote and the schema is only mirrored in `src/types/database.types.ts` (hand-maintained, not generated in-repo).

## Commands

- Run: `npx expo start --tunnel` (needs Expo Go on a device). LAN/--tunnel matters.
- Typecheck: `npx tsc --noEmit` — there is **no** `typecheck` script.
- Lint: `npm run lint` (eslint). Format/autofix: `npx eslint . --fix` or `npm run format` (prettier).
- **No test suite.** Do not look for `npm test`.

## Config gotchas

- `.env` is gitignored but **required**; `src/lib/supabase.ts` throws at import if `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_KEY` are missing. Expo inlines `EXPO_PUBLIC_*` at build time (see `app.config.ts` `extra`). Never commit `.env` (was committed once — rotate key if you see a leak).
- `@/*` → `src/*` via tsconfig paths. Absolute imports only.
- Prettier: single quotes, semicolons, trailing commas, `printWidth: 100`. `@typescript-eslint/no-explicit-any` is a **warning**, not an error — don't try to purge every `any`.

## Data model (multi-tenant) — READ BEFORE EDITING SERVICES

Business is `Barberia` (tenant) → `Barbero` (one auth user each). Reference docs: `docs/barberia-app-spec (2).md`, `docs/resumen-bd-rls.md`, `plan_adaptacion_bd.md`.

- **No self-signup / no auto-create.** `register.tsx` was deleted and `getBarbero()` returns `null` when the logged-in user has no row → screens must handle "cuenta no vinculada". Accounts are seeded manually.
- `Servicio` is **per barbero** (`barbero_id`), `Cliente` is **per barberia** (`barberia_id`, shared). Always scope queries by the barbero from `getBarbero()`.
- `Turno` singles out: a single `inicio` timestamp (NOT fecha/hora_inicio/hora_fin), plus required **`origen`** (`web`/`whatsapp`/`presencial`) and **`duracion_minutos`** (snapshot). Omitting either → NOT NULL violation. `estado` enum in DB has 5 values but the UI uses only `confirmado`/`cancelado`.
- New tables in the migrated schema: `BloqueoHorario`, `CodigoVerificacion` (RLS-closed; app never touches it directly).

## Time/date pitfalls

- `inicio` is treated as a **local-naive** timestamp — code strips the trailing `Z` and uses `getTimezoneOffset()` to build `"YYYY-MM-DDTHH:mm:ss"`. Match this; don't send UTC ISO strings blindly.
- Postgres `time` columns come back as `"HH:MM:SS"` → slice to `"HH:MM"` using `toHHMM()`.
- `new Date('YYYY-MM-DD')` parses as UTC and shifts a day in negative offsets — use `parseFechaLocal()` (`src/lib/availability.ts`).
- `Barbero.dias_habiles` is `number[]` using **JS convention** (`0`=Sunday … `6`=Saturday).

## Layout / navigation

- `src/app/` is expo-router; `(tabs)` group with `index`, `turnos`, `perfil`. `perfil` is its own `Stack` with `headerShown: false` → pushed screens must render a custom back header (see `src/app/(tabs)/perfil/excepciones.tsx`).
- Reusable availability helpers live in `src/lib/availability.ts` (`generateTimeSlots`, `isDiaHabil`, `computeOccupiedSlots`) — reuse rather than re-implementing slot math in screens.

## Seeding the remote DB

`docs/seed-barberia.sql` runs **only** in the Supabase SQL Editor (postgres role, bypasses RLS). It cannot run locally: the publishable key can't do DDL or bypass RLS. It requires the target user to exist in `auth.users` first (create in dashboard) and replaces the email placeholder at the top.
