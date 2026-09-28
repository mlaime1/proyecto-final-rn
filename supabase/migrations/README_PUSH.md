# Fase 10 — push_subscriptions: aplicación y verificación

> Solo SQL Editor del dashboard (rol `postgres`, bypass RLS). No aplicar
> desde local: la publishable key no tiene DDL ni bypass RLS.

## Aplicar

1. Abrir el SQL Editor del proyecto `vcgyiyrboumimwgdsitf`.
2. Pegar el contenido completo de `phase10_push_barbero.sql` y ejecutar.
3. Debe terminar sin errores (idempotente en policies por los `DROP POLICY IF EXISTS`).

## Verificación RLS (pegar en SQL Editor tras aplicar)

```sql
-- 1) Tabla e índice existen
select tablename from pg_tables where schemaname = 'public' and tablename = 'push_subscriptions';
select indexname from pg_indexes where schemaname = 'public' and tablename = 'push_subscriptions';

-- 2) Columnas de prefs en Barbero con default true
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'Barbero'
  and column_name in ('notify_on_reserva', 'notify_on_cancelacion');

-- 3) RLS activo + 4 policies own-scope, solo rol authenticated
select relname, relrowsecurity as rls_enabled
from pg_class where relname = 'push_subscriptions';
select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'push_subscriptions'
order by policyname;
-- Esperado: 4 filas (select/insert/update/delete own), roles = {authenticated}.

-- 4) Grants: anon sin nada, authenticated con CRUD (RLS sigue mandando)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'push_subscriptions'
order by grantee, privilege_type;
-- Esperado: solo filas de `authenticated` (SELECT/INSERT/UPDATE/DELETE).
```

## Verificación como barbero (aislamiento real)

1. Con la sesión de un barbero (ej. en la app o con su JWT en el REST):
   `select * from push_subscriptions;` → solo sus filas (0 si aún no se suscribió).
2. Intentar leer/insertar con `barbero_id` de OTRO barbero → 0 filas / violación de policy.
3. `update "Barbero" set notify_on_reserva = false where id = <propio>;` → 1 fila afectada;
   con id ajeno → 0 filas.

## Rollback

Pegar `phase10_push_barbero_rollback.sql` en SQL Editor y ejecutar.
Elimina solo suscripciones push (recreables desde la UI) y las prefs.
