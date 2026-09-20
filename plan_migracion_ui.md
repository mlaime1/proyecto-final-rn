# Plan de Migración a UI Nueva — App Barbería

> **Estado:** plan pendiente, sin fases ejecutadas. Depende de `plan_web_performance.md`.
>
> **Premisa:** el dueño ya quería construir una UI nueva y moderna. Este plan asume que `plan_web_performance.md` se ejecutó: la app corre en navegador, los bugs funcionales de web están corregidos y los cimientos de datos, bundle y gates están sanos. La migración de UI se hace SOBRE esa base, no en paralelo ni en reemplazo de ella.
>
> **Alcance:** definir la puerta de decisión de plataforma, las fundaciones de diseño, la capa de primitivas, el shell de navegación y la migración de pantallas por dominio, con un presupuesto de performance que no puede retroceder respecto del baseline que dejó el plan anterior.
>
> **Fuera de alcance:** cambios al contrato de Supabase, a la lógica de negocio o a las reglas de RLS. Este plan es de presentación.

---

## 1. Resultado ejecutivo

La UI actual es funcional pero fue construida para mobile y sin un sistema de diseño: cuatro fuentes de tokens en paralelo, matemática de fecha/slots duplicada en 4+ archivos, cero primitivas reutilizables y sin accesibilidad web. La decisión de construir una UI nueva es correcta y el momento es bueno, porque el trabajo del plan anterior ya resolvió lo que no debía rehacerse.

**El hecho que ordena todo el plan:** la UI es la mayor parte del código y la capa de dominio es chica y portable. Sobre 6.661 líneas en `src/`:

| Capa | Alcance medido | Porcentaje |
|---|---|---|
| UI (`src/app/` + `src/components/`) | 5.233 líneas en 29 archivos | ~79% |
| Dominio portable (services + types + lib + store) | 1.290 líneas | ~19% |
| Hooks y declarations | ~138 líneas | ~2% |

Y el contrato con la base no cambia en ninguna opción:

- `src/types/database.types.ts` (462 líneas).
- Migraciones aplicadas: `supabase/migrations/phase4_crear_turno_atomico.sql` (RPC atómica `public.crear_turno()`), `supabase/migrations/phase2_turno_tenant_integrity.sql` (`fn_turno_validar_relaciones()`, `fn_barbero_pertenencia_inmutable()`, `fn_cliente_pertenencia_inmutable()`) y `supabase/migrations/phase8_grants_hardening.sql`.

Esto significa que **el trabajo caro y riesgoso ya está hecho**: la reescritura es de presentación, no de dominio. El riesgo principal del proyecto no es técnico, es de decisión: elegir mal la plataforma y pagar dos veces.

### La decisión que bloquea el diseño detallado

No se puede diseñar en detalle la migración sin resolver antes la **puerta de decisión de plataforma** (sección 6). Hay tres opciones reales, con consecuencias distintas. Este documento las presenta y NO elige por el equipo. La Fase 0 es exactamente esa decisión, y es bloqueante.

### Qué NO se rehace (inventario de entregables del plan anterior)

Nada de esta lista se re-implementa, se rediseña ni se "mejora de paso" en la migración:

| Entregable de `plan_web_performance.md` | Por qué se respeta |
|---|---|
| Abstracción `showAlert()` / adopción de modales | Ya resuelve `Alert.alert` en web; la UI nueva solo estiliza modales. Verificado que `AlertModal` alcanza (solo 1 sitio necesita callback; `ConfirmModal` no es necesario) |
| Caché de sesión de `Barbero` y `Servicio[]` | Elimina round-trips de auth repetidos; la UI nueva consume el hook/store tal cual |
| Consultas acotadas de turnos (ventana/`limit`) | No volver a "traer todo y filtrar en pantalla" |
| Guard de race de disponibilidad | La UI nueva reintroduce exactamente el mismo riesgo si reescribe sin el guard |
| Estrategia de iconos (una familia o SVG) | Define el payload de fuentes; la UI nueva debe partir de ahí |
| Configuración de bundle y carga inicial | El presupuesto de performance se mide contra ese baseline |
| Tipos regenerados desde el schema en vivo (`database.types.ts`, H31) | El contrato de datos debe ser el real; la UI nueva no debe escribir contra tipos desactualizados |
| Seed de demo aplicado (H32) | La UI nueva se valida contra datos reales: barbero, servicios, clientes y turnos en varios estados |
| Script `typecheck` + CI (typecheck + lint) | La UI nueva nace con gates |
| `eslint-plugin-react-hooks` + `exhaustive-deps` | Aplica al código nuevo con más razón |
| Limpieza de código muerto y assets (H30a) | No reintroducir `Card.tsx`, `BrandHeader.tsx`, `lib/theme.ts`, etc. |
| Borrado de `.eslintrc.cjs`, `audit-report.json`, `expo-status-bar` | Higiene que no se repite |

### Qué se dejó sin arreglar a propósito (no tomarlo como deuda pendiente)

El plan anterior descartó trabajo de pulido sobre la UI vieja. Eso NO es deuda técnica: es trabajo que este plan cubre de raíz. No reabrirlo como bug.

| Descartado | Dónde lo cubre este plan |
|---|---|
| `React.memo` en `TurnoCard`, `SlotRow`, `Chip` (H24) | Fase 2, componentes nuevos con memoización decidida desde el diseño |
| `renderItem` inline de `DayStrip` (H25) | Fase 2, la primitiva de tira de días se diseña una vez |
| `useMemo` roto en `excepciones.tsx` (H26) — ahora **SE DESCARTA**, con excepción consciente opcional | Fase 2, la primitiva de grilla evita el patrón |
| `key={idx}` y rebuilds en `ModificarTurnoModal` (H27) | Fase 2, la primitiva de selector de fecha/hora evita el patrón |
| Consolidar `MONTHS`/`formatTime`/`minutosDesde` duplicados (H28) | Fase 1, módulo único de formato y slots |
| Accesibilidad fina: foco visible, `onRequestClose`, labels (H29) | Fase 5, accesibilidad como requisito de las primitivas |
| Unificar las 4 fuentes de tokens (H30b) | Fase 1, un único sistema de tokens reemplaza a todos |
| Surfacing de errores en pantallas viejas (H11b) | Fase 4, la UI nueva nace con taxonomía de errores y el patrón correcto |

---

## 2. Arquitectura confirmada

### 2.1 Partición actual del código

| Zona | Contenido | Portabilidad |
|---|---|---|
| `src/services/` | `barbero`, `turnos`, `bloqueos`, `auth` | Portable: depende solo de `supabase-js` y tipos |
| `src/types/` | `database.types.ts`, `assets.d.ts` | Portable, es el contrato de la base |
| `src/lib/` | `availability`, `supabase`, `env`, `secureStorage`, `storage`, `logger` | Portable, con adaptaciones de storage por plataforma |
| `src/store/` | `app.store.ts` (Zustand, hoy casi vacío) | Portable; pasa a ser la caché de sesión |
| `src/hooks/` | `useAuth` | Portable en lógica; el consumo de React puede variar por opción |
| `src/app/` | Rutas expo-router | **No portable** fuera de Expo/RN |
| `src/components/` | UI y tokens visuales | **No portable**; se reescribe |

### 2.2 Contrato con Supabase (invariante en las tres opciones)

Ninguna opción toca:

- El schema y las policies/grants ya aplicados.
- La RPC atómica `public.crear_turno()` y los triggers de inmutabilidad y validación de relaciones.
- El shape de `src/types/database.types.ts`.
- El tratamiento de `inicio` como timestamp local-naive y el uso de `parseFechaLocal()` / `toHHMM()`.

**Consecuencia de diseño:** la migración de UI puede cambiar CÓMO se ve una fecha, pero NO cómo se calcula ni cómo se serializa. Toda la matemática de fechas y slots debe seguir viviendo en `src/lib/availability.ts` (o su equivalente extraído), no en componentes.

### 2.3 Restricciones

- Sin base de datos local; Supabase es remoto.
- Sin test suite: la verificación es typecheck + lint + paridad de flujos manual.
- **El dispositivo destino de la UI nueva es el teléfono (iPhone/WebKit, ~390 px) como viewport primario**; el escritorio es secundario. Esto cambia las prioridades del sistema de diseño (targets táctiles, inputs de al menos 16px, teclado y safe areas antes que layouts de escritorio).
- `AGENTS.md` es la fuente de verdad de pitfalls de timezone y de scoping por tenant.
- El presupuesto de performance se mide sobre el export del plan anterior.

---

## 3. Hallazgos confirmados

Hallazgos verificados sobre el código actual que condicionan el diseño de la migración.

### H1 — El dominio ya es portable; la UI no (contexto — habilitante)

La partición de 2.1 es real y medible: 1.290 líneas de dominio contra 5.233 de UI. **Evidencia:** `wc -l` sobre `src/services/*.ts`, `src/types/*.ts`, `src/lib/*.ts`, `src/store/*.ts` suma 1.290; `src/app/` + `src/components/` suma 5.233 sobre un total de 6.661.

Esto habilita las opciones (B) y (C) de la sección 6 sin reescritura de negocio, y hace que la opción (A) sea la de menor costo.

### H2 — El contrato de Supabase es estable entre opciones (habilitante)

Las migraciones aplicadas (`phase4_crear_turno_atomico.sql`, `phase2_turno_tenant_integrity.sql`, `phase8_grants_hardening.sql`) y `src/types/database.types.ts` (462 líneas) no cambian si la UI se reescribe en React web o si se separa en un paquete. **Evidencia:** los archivos existen en `supabase/migrations/` y no hay ninguna decisión de este plan que requiera DDL.

### H3 — Cuatro fuentes de tokens divergentes

Coexisten `src/lib/theme.ts` (sin uso, primario `#0EA5E9`), `src/components/turnos/theme.ts` (primario `#4C1D95`, `red/green/amber`), `src/components/horario/theme.ts` (primario `#4C1D95`, `danger/dangerSoft`) y estilos inline por pantalla. Los dos últimos duplican 9 colores + radius con nombres distintos. Además `TurnoHeader.tsx:19-30` es casi idéntico a `ProfileHeader.tsx:9-26`.

**Consecuencia:** la Fase 1 debe nacer con UN solo sistema de tokens. Reutilizar cualquiera de los dos archivos actuales arrastra la divergencia de nombres.

### H4 — Matemática de fecha/slots duplicada, con la constante hardcodeada

`MONTHS`/`DAYS_OF_WEEK` están repetidos en `nuevo.tsx:23-40`, `confirmar.tsx:21-36`, `[id].tsx:26-44` y `ModificarTurnoModal.tsx:17-41`. `formatTime` existe en tres archivos. `minutosDesde`/`labelDesdeMinutos` están duplicados en `excepciones.tsx:61-65` y `TimeSlotGrid.tsx:14-19`. `SLOT_STEP_MINUTES` (`src/lib/availability.ts:11`) está hardcodeado como `30` en `TimeSlotGrid.tsx:37` y `excepciones.tsx:101`.

**Consecuencia:** extraer un módulo único de formato y una primitiva de grilla que lea la constante compartida es requisito de Fase 1, no un refactor opcional.

### H5 — No existe una capa de primitivas; hay componentes ad hoc

Solo existen `Screen`, `AlertModal`, `ConfirmModal`, `Card` (sin uso), `BrandHeader` (sin uso) y `ProfileHeader`. Las pantallas importan tokens directamente y redefinen estilos locales. Los modales existen pero se adoptan de forma parcial (`AlertModal` solo en `[id].tsx`).

**Consecuencia:** la Fase 2 construye el vocabulario de componentes antes que las pantallas, y el primer consumidor de cada primitiva es la primera pantalla migrada.

### H6 — El shell de navegación es específico de expo-router

Las rutas viven en `src/app/` con grupos `(tabs)`, stacks anidados (`perfil/_layout.tsx`, `turnos/_layout.tsx`) y navegación imperativa con `useRouter`/`router.push`. En la opción (B), este shell no se reutiliza: hay que re-implementar el enrutado.

**Consecuencia:** el costo de (B) no está en las pantallas sino en el shell y en los headers personalizados (por ejemplo, `TurnoHeader`/`ProfileHeader` reemplazan headers nativos).

### H7 — No hay baseline de accesibilidad

El plan anterior descartó el pulido de foco/accesibilidad sobre la UI vieja. Hoy ningún control muestra foco visible, varios no tienen `accessibilityRole`/`accessibilityLabel` y los `Modal` de RN no cierran con Escape.

**Consecuencia:** la accesibilidad no puede quedar para el final como "pulido": debe ser propiedad de las primitivas (Fase 2) y verificarse en Fase 5.

### H8 — El baseline de performance es conocido y medible

El plan anterior dejó números: fuentes, JS gzip, requests de Home. La UI nueva no parte de cero: se mide contra ese baseline.

**Consecuencia:** la Fase 6 tiene un presupuesto explícito y no negociable (sección 5).

---

## 4. Plan paso a paso

### Fase 0 — Puerta de decisión de plataforma (pendiente, bloqueante)

No se diseña ninguna pantalla antes de resolver esto.

**Opción A — Reestilizar dentro de Expo / React Native**

- Alcance: una sola base de código que sigue sirviendo mobile y web. Sistema de diseño sobre primitivas RN (o una librería como Tamagui/NativeWind).
- Ventajas: camino más corto; no se pierde la app mobile; el dominio, la caché y el contrato se consumen sin cambios; un solo pipeline de build.
- Costos/riesgos: el output web sigue siendo react-native-web, con sus características de DOM (no es HTML semántico nativo); limitaciones de layout y de rendimiento web que ya se vieron en el plan anterior (peso de `react-native-web`, dificultad de code splitting fino).
- Cuándo elegirla: si el negocio necesita mobile y web desde el mismo producto y la prioridad es la fecha de entrega.

**Opción B — Reescribir la UI en React web puro (Vite o Next), conservando la capa de dominio y el contrato Supabase**

- Alcance: se conservan `services`, `types`, `lib` y `store`; se reescribe todo lo visual y el enrutado.
- Ventajas: máxima calidad y control de UX web (HTML semántico, accesibilidad real, design system propio); mejor performance web alcanzable; sin las limitaciones de react-native-web.
- Costos/riesgos: se abandona la app mobile; hay que re-implementar el shell de navegación y los headers; dos productos si en el futuro se quiere volver a mobile.
- Cuándo elegirla: si el producto final es web y la app mobile ya no es un requisito del cliente.

**Opción C — Monorepo con paquetes de dominio compartidos y dos shells**

- Alcance: extraer `services`/`types`/`lib`/`store` a un paquete de dominio; un shell RN (mobile) y un shell web sobre el mismo contrato.
- Ventajas: mejor arquitectura a largo plazo; mobile y web evolucionan por separado sin duplicar negocio; el paquete de dominio es testeable de forma aislada.
- Costos/riesgos: el mayor costo inicial; requiere extraer y versionar el paquete de dominio primero; tooling de monorepo (workspaces, resolución de paths, CI por paquete); la fecha de entrega se aleja.
- Cuándo elegirla: si el negocio necesita ambas plataformas a mediano plazo y hay tolerancia a invertir ahora.

**Nota:** las tres opciones consumen el mismo contrato Supabase (H2) y la misma capa de dominio portable (H1). La diferencia es el shell y el costo de mantenimiento, no la lógica de negocio.

**Aceptación de la fase:** existe una opción elegida y escrita, con la razón de negocio (mobile sí / mobile no / ambas a mediano plazo) y una estimación de esfuerzo por fase. Sin esto, la Fase 1 no arranca.

### Fase 1 — Fundaciones de diseño (común a A/B/C) (pendiente)

Es el trabajo que no cambia según la opción: tokens, escalas y formato.

1. **Un único sistema de tokens.** Definir colores, radios, sombras, estados (hover, active, focus, disabled, error) y un tema claro base. Reemplazar las 4 fuentes de tokens actuales. Redactar por escrito la equivalencia con la paleta real (`#4C1D95` primario, `#EDE9FE` suave, neutros slate) para no reintroducir el `#0EA5E9` de `src/lib/theme.ts`.
2. **Escala tipográfica y de espaciado.** Definir una escala explícita (no valores sueltos por pantalla) y un set de pesos. Documentar que `spacing(n) = n * 4` (convención existente) se conserva.
3. **Módulo único de formato de fecha/hora/slots.** Un solo lugar para `MONTHS`, `DAYS_OF_WEEK`, `formatTime`, `minutosDesde`, `labelDesdeMinutos`; leer `SLOT_STEP_MINUTES` desde la fuente compartida (H4). Nada de esto se re-implementa en componentes.
4. **Estrategia de iconografía.** Consumir el resultado del plan anterior (una familia o SVG) y fijar un set de iconos aceptado. Si se eligió SVG, el set se versiona como componente.

**Aceptación:** un archivo de tokens y un archivo de formato; ninguna pantalla nueva define colores, radios ni constantes de tiempo hardcodeadas; la matemática de slots vive en un único módulo y respeta `SLOT_STEP_MINUTES`.

### Fase 2 — Capa de primitivas (común a A/B/C) (pendiente)

Construir el vocabulario antes que las pantallas. Cada primitiva nace con accesibilidad y estados completos.

1. **Button** (variantes primary/secondary/ghost/danger; estados loading/disabled/focus) y **IconButton**.
2. **Input / TextField** (label, error, helper, foco visible, ancho acotado en escritorio).
3. **Card / Surface**.
4. **Modal / Sheet** (cierre con Escape, foco atrapado, `onRequestClose` equivalente) y **ConfirmDialog**.
5. **List** y **ListItem** (con `key` estable por id, nunca por índice).
6. **EmptyState** y **LoadingState** (esqueletos o spinner consistente).
7. **DateStrip** y **TimeSlotGrid** (una sola implementación de la tira de días y de la grilla de slots, leyendo la constante compartida).

**Aceptación:** cada primitiva tiene estados default/hover/focus/disabled/error documentados, cierra modales con Escape, expone rol y label accesibles, y ninguna pantalla necesita estilos de color propios.

### Fase 3 — Shell de navegación (depende de la opción) (pendiente)

- **Opción A:** conservar expo-router, reemplazar la tab bar y los headers personalizados por primitivas del sistema nuevo; simplificar los stacks anidados de `perfil` y `turnos`.
- **Opción B:** elegir router web (por ejemplo, del framework de Vite/Next) y re-implementar la estructura `login` + `tabs` (`index`/`turnos`/`perfil`), los sub-stacks y los headers.
- **Opción C:** un shell por plataforma sobre el mismo paquete de dominio; el shell web y el mobile no comparten componentes de navegación.

**Aceptación:** login protegido y transición a `tabs` funcionan; las tres tabs (`index`, `turnos`, `perfil`) y sus sub-pantallas navegan; el back es consistente; ninguna pantalla queda sin header utilizable.

### Fase 4 — Pantallas por dominio (pendiente)

Migrar de a una, con paridad funcional 1:1 contra la pantalla actual. Orden sugerido por valor para la demo:

1. **login** — primera pantalla que ve el cliente; valida Input + Button + states.
2. **turnos/index (agenda)** — valida List, DateStrip y estados vacíos.
3. **turnos/[id] (detalle)** — valida Card, ConfirmDialog, Modal y el botón de WhatsApp (implementado o ausente según el plan anterior).
4. **turnos/nuevo** — valida TimeSlotGrid, guard de race, EmptyState/ErrorState.
5. **turnos/confirmar** — valida resumen y modal de éxito.
6. **perfil/index** — valida lista de datos y acción destructiva de `signOut`.
7. **perfil/horario** — valida selección de días y guardado.
8. **perfil/excepciones** — la más compleja: valida TextInput + grids + mutación con recarga.

Para cada pantalla: conservar el comportamiento (incluido el manejo de "cuenta no vinculada"), consumir el hook de caché de `Barbero`/`Servicio[]`, y NO tocar la matemática de disponibilidad.

**Aceptación:** por cada pantalla migrada, el flujo equivalente del smoke test del plan anterior pasa en la UI nueva, y no se agregó ninguna llamada de red que el baseline no tuviera.

### Fase 5 — Accesibilidad (pendiente)

1. Foco visible en todo control interactivo.
2. Rol y label accesibles en controles sin texto visible (icon buttons, celdas de fecha, slots).
3. Navegación por teclado completa, incluido Escape en modales.
4. Contraste mínimo verificado sobre los tokens.
5. Anchos máximos y layout utilizable en escritorio, no solo en viewport mobile.

**Aceptación:** se puede completar el flujo login → crear turno → cancelar → Home solo con teclado, con foco visible en todo momento y modales que cierran con Escape.

### Fase 6 — Presupuesto de performance y validación (pendiente)

1. Medir el export final con los mismos comandos del plan anterior (`du -b`, gzip, conteo de `.ttf`, conteo de requests).
2. Comparar contra el baseline de `plan_web_performance.md` sección 5.
3. Corregir cualquier regresión antes de aprobar.

**Aceptación:** se cumple el presupuesto de la sección 5.

---

## 5. Verificación obligatoria y presupuesto de performance

### 5.1 Presupuesto (no regresión respecto del baseline)

| Métrica | Baseline del plan anterior | Presupuesto UI nueva |
|---|---|---|
| Archivos de fuente de iconos | 1 (Ionicons) o 0 | Igual o mejor |
| Payload de fuentes | ≤ 389.724 B o 0 | Igual o mejor |
| JS inicial gzip | menor a 509.845 B (objetivo ≤ 350.000 B) | No superar el valor logrado |
| Requests en el primer render de Home | ≤ 3 de datos | ≤ 3 de datos |
| Round-trips de `getBarbero()` por sesión | 1 | 1 |
| Consulta del primer montaje de agenda | 1 | 1 |

Si la opción elegida cambia el bundler (B o C), el baseline debe re-medirse y justificarse, no ignorarse.

### 5.2 Paridad funcional

Por cada pantalla migrada, ejecutar el smoke test del plan anterior (login, error de login, sesión expirada en `nuevo.tsx`, crear turno, Home refleja el cambio, cancelar, WhatsApp, guardar excepciones, guardar horario, alternar tabs sin refetch de datos estáticos).

### 5.3 Gates

- `npx tsc --noEmit` limpio.
- `npm run lint` limpio (con `react-hooks/exhaustive-deps` activo).
- CI verde en cada PR de pantalla.

### 5.4 Accesibilidad

Flujo completo por teclado, foco visible, modales con Escape, contraste verificado.

---

## 6. Decisiones abiertas

| # | Decisión | Estado |
|---|---|---|
| 1 | Opción de plataforma: (A) reestilizar en Expo/RN, (B) React web puro, (C) monorepo con dominio compartido | **Abierta y bloqueante.** Debe resolverla el dueño con la necesidad de negocio (mobile sí / no / ambas) |
| 2 | Librería de sistema de diseño si se elige (A): Tamagui, NativeWind o primitivas propias | Abierta; depende de la opción 1 |
| 3 | Framework web si se elige (B): Vite o Next | Abierta; depende de requisitos de SEO/SSR, que la app de barberos probablemente no necesita |
| 4 | Extracción del paquete de dominio si se elige (C): estructura de workspaces y versionado | Abierta; es el mayor costo inicial de (C) |
| 5 | Alcance de accesibilidad: WCAG AA completo o baseline operativo | Abierta |
| 6 | ¿La UI nueva conserva la estética violeta actual o parte de un rediseño visual nuevo? | Abierta; afecta Fase 1 |

---

## 7. Orden recomendado de ejecución

1. Fase 0 — elegir plataforma. **Sin esto no arranca nada.**
2. Fase 1 — tokens, tipografía, formato, iconografía. Común a las tres opciones.
3. Fase 2 — primitivas. Común a las tres opciones.
4. Fase 3 — shell de navegación, según la opción elegida.
5. Fase 4 — pantallas por dominio, en el orden de valor para la demo.
6. Fase 5 — accesibilidad sobre las primitivas ya usadas.
7. Fase 6 — medir y cerrar el presupuesto.

**Regla de secuencia:** ninguna pantalla empieza antes de que existan las primitivas que necesita. Migrar pantalla por pantalla contra una base de componentes inestable multiplica el retrabajo.

---

## 8. Criterio final de aprobación

La migración se declara terminada solo cuando:

- la opción de plataforma está resuelta y documentada con su razón de negocio;
- existe un único sistema de tokens y un único módulo de formato/fechas/slots, sin duplicación ni constantes hardcodeadas;
- todas las pantallas del dominio migrado operan con paridad funcional verificada;
- el flujo principal se completa por teclado, con foco visible y modales que cierran con Escape;
- el presupuesto de performance de la sección 5.1 se cumple sin regresión;
- `typecheck` y `lint` corren limpios en CI;
- queda constancia de que NINGÚN entregable SOBREVIVE del plan anterior fue re-implementado.

---

## 9. Referencias

- `plan_web_performance.md` — plan previo; define el baseline, los entregables SOBREVIVE y lo descartado.
- `AGENTS.md` — modelo de datos, pitfalls de timezone, layout expo-router y ubicación de `availability.ts`.
- `plan_seguridad.md` — estado aplicado de RLS, grants, RPC `crear_turno` y triggers de integridad.
- `plan_adaptacion_bd.md` — modelo multi-tenant `Barberia → Barbero → Servicio/Cliente/Turno`.
- `src/types/database.types.ts` — contrato de datos (462 líneas).
- `supabase/migrations/phase4_crear_turno_atomico.sql`, `phase2_turno_tenant_integrity.sql`, `phase8_grants_hardening.sql` — contrato server-side que no cambia.
- `src/lib/availability.ts` — hogar de la matemática de slots.
- `src/components/turnos/theme.ts`, `src/components/horario/theme.ts`, `src/lib/theme.ts` — tokens actuales a reemplazar.
