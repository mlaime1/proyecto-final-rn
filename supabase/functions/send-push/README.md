# Edge Function `send-push` (T5 — scaffold, NO deployada)

Fanout Web Push al barbero tras reserva / cancelación. Lee prefs
`Barbero.notify_on_*`, filtra por evento y envía a cada fila de
`push_subscriptions`. Prune 404/410. Nunca lanza ante fallos de envío:
retorna `{ sent, skipped, pruned, errors }`.

## 1. Generar claves VAPID (una vez, en tu máquina)

```bash
npx web-push generate-vapid-keys
```

Guardá la pública en `.env` como `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (nunca
commitees `.env`). La privada va SOLO a secrets del proyecto (paso 3),
nunca con prefijo `EXPO_PUBLIC`, nunca al bundle.

## 2. Deploy

```bash
supabase functions deploy send-push
```

## 3. Secrets (remoto, NO en repo)

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:tu-email@example.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los
inyecta Supabase solo. Requiere la migración `phase10_push_barbero.sql`
aplicada en SQL Editor (tabla `push_subscriptions` + prefs en `Barbero`).

## 4. Prueba con curl (JWT del barbero logueado)

```bash
curl -i -X POST https://<ref>.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer <JWT_USUARIO_BARBERO>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "barbero_id": 1,
    "evento": "reserva",
    "titulo": "Nueva reserva",
    "cuerpo": "Prueba T5",
    "turno_id": 123
  }'
```

Esperado con pref on y 1 suscripción: `{"sent":1,"skipped":0,"pruned":0,"errors":[]}`.
Con pref off: `{"sent":0,"skipped":1,...}` sin enviar.
Suscripción muerta (410): `pruned:1` y la fila se borra.

## 5. Notas port a Next.js

Se copia TAL CUAL:

- `public/sw-push.js` (SW push + click, scope `/`).
- `src/lib/push/*` (`vapid.ts`, `subscription.ts`, `detect.ts`): solo
  re-apuntar 2 imports — el cliente Supabase (`@/lib/supabase`) y
  `getBarbero()` (`@/services/barbero.service`, que arrastra
  `expo-secure-store`; en Next se reemplaza por tu session helper).
- Esta function `send-push` completa: sin cambios. El wiring
  (`supabase.functions.invoke('send-push', ...)`) es idéntico en Next.

Cambia de nombre: `EXPO_PUBLIC_VAPID_PUBLIC_KEY` →
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (o la env que uses).

## 6. Excepciones de convención (documentadas)

- Esta carpeta usa estilo Deno fmt (dobles comillas), NO la prettier
  single-quote del repo app.
- Excluida de `tsc` app (`tsconfig.json` → `exclude`) y de `eslint`
  (`eslint.config.mjs` → `ignores`): los tipos Deno / `npm:` no existen
  en el typecheck Expo. Se valida con `supabase functions serve` en deploy.
- Dependencias exactas en `deno.json` (`@supabase/supabase-js` 2.104.1,
  `web-push` 3.6.7 vía `npm:`). Si `npm:web-push` fallara en el runtime
  deployado, el plan B es VAPID manual con WebCrypto (firmar ECDSA P-256 +
  cifrar AES-GCM por RFC 8291) — scaffold actual prefiere la lib.
