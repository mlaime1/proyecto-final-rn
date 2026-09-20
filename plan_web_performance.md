# Plan de Performance y Salida a Web — App Barbería (Expo Web)

> **Estado:** plan pendiente, sin fases ejecutadas. Ninguna tarea de este documento fue implementada todavía.
>
> **Objetivo inmediato:** que la app existente funcione correctamente en un navegador y que sus problemas de performance medibles queden corregidos, en el menor tiempo posible, para poder entregar y demostrar al cliente.
>
> **Contexto de negocio:** el equipo está una semana atrasado. El cliente ya pidió una UI nueva y moderna; esa migración se planifica por separado en `plan_migracion_ui.md`. Este plan NO rediseña la interfaz: solo la hace funcionar en web y la vuelve rápida.
>
> **Regla de orden:** primero lo que desbloquea al cliente (bugs funcionales en web), después la optimización. No se optimiza nada cuya corrección no sea perceptible en la demo.
>
> **Evidencia base:** export web real en `dist/` de este checkout, más auditoría de código sobre `src/` citada archivo:línea.

---

## 1. Resultado ejecutivo

La app es, en su lógica de datos, sólida: todas las consultas están correctamente acotadas al tenant (`barbero_id`), no hay bucles N+1 de lectura, no hay timers ni suscripciones sin cleanup, y las 23 llamadas a `StyleSheet.create` están en scope de módulo. El problema no es de arquitectura de datos: es de **compatibilidad con el navegador y de carga**.

Hay tres fallas funcionales que hoy impedirían una demo en web:

| # | Fallo | Impacto |
|---|---|---|
| H1 | `Alert.alert` no está implementado en react-native-web | Todos los mensajes y confirmaciones desaparecen en web (la supuesta "sesión expirada atrapa al barbero" resultó ser código muerto; ver H1 y H11a) |
| H2 | La pantalla Home nunca se refresca | Tras crear o cancelar un turno, la Home sigue mostrando datos viejos |
| H3 | Botón "Contactar por wsp" sin acción | Un botón visible que no hace nada |

Y dos problemas de performance medidos sobre el export real:

| # | Problema | Medición |
|---|---|---|
| H4 | 19 fuentes de iconos en el build, solo se usa `Ionicons` | 4.076.840 B en fuentes. **✅ RESUELTO en Fase 2: quedó 1 fuente / 389.724 B (−90,4%)** |
| H5 | Un único chunk JS, sin code splitting | 1.831.380 B raw / 508.210 B gzip; costo real por la red ~508.864 B (~496 KB) |

El resto de los hallazgos (H6-H33) son mejoras reales de capa de datos, render, gates de calidad, higiene y contrato de datos, pero **ninguna es más urgente que H1-H3**.

### Clasificación obligatoria del trabajo

Como la UI actual va a ser reemplazada por una UI nueva, todo el trabajo de este plan se etiqueta con uno de tres destinos. Esta clasificación es la decisión central del documento: evita invertir tiempo en código que va a morir.

| Bucket | Significado | Regla |
|---|---|---|
| **SOBREVIVE** | Trabajo agnóstico de framework o de UI. Pasa a la UI nueva sin cambios. | Prioridad alta: es la parte de este plan que el siguiente proyecto hereda. |
| **ARRÉGLALO IGUAL** | Toca UI que se va a reescribir, PERO es un bug funcional real que impide mostrar un producto que funcione. | Se arregla ahora, con el mínimo cambio posible. |
| **SE DESCARTA** | Pulido sobre UI que está por ser reemplazada. Arreglarlo hoy es desperdicio. | NO hacerlo. Documentarlo para que nadie lo "mejore" por reflejo. |

**Advertencia explícita:** invertir en el bucket SE DESCARTA con la fecha de entrega encima es un error de criterio. Ese trabajo se descarta por decisión, no por olvido.

**La clasificación es condicional, no un hecho.** El bucket SE DESCARTA presupone que el cliente APRUEBA la migración de UI (`plan_migracion_ui.md`). Si el cliente no aprueba la UI nueva, o no paga por ella, entonces H24, H25, H27, H28 y H29 dejan de ser "trabajo que muere" y se convierten en deuda real sobre la UI vieja. La demo es justamente lo que decide esa aprobación: por eso la clasificación debe revisarse cuando el cliente responda, y no tratarse como un veredicto definitivo.

### Falso positivo descartado

Una auditoría previa afirmó que `npm run lint` (`eslint . --ext .ts,.tsx`, `package.json:14`) estaba roto porque ESLint 9 con flat config habría eliminado `--ext`. **Eso es falso y no se incluye en este plan.** La guía oficial de migración de ESLint 9 lista los flags que flat config ya no soporta (`--env`, `--ignore-path`, `--no-eslintrc`, `--resolve-plugins-relative-to`, `--rulesdir`); `--ext` no está entre ellos y sigue soportado. El lint no está roto por este motivo.

### 1.1 Guion de entrega (una página)

Esta es la versión que hay que leer cuando queda poco tiempo. Los hallazgos de la sección 3 son material de referencia; lo que de verdad se entrega es esto, en este orden.

1. **Fase 0 — línea base, profiling y guion de demo.** Corta. Sin ella no se sabe si la lentitud viene de la carga, de los datos o del render (ver Fase 0 y C2).
2. **Fase 1 — desbloquear web (H1, H2, H3).** ✅ **Ejecutada 2026-09-20:** alertas visibles, Home que refresca al enfocar y botón de WhatsApp implementado. **Sin esto no hay demo.**
3. **H4 — una sola familia de iconos.** ✅ **Ejecutado:** import directo de `Ionicons` en los 12 sitios. Eliminó 3.687.116 B de fuentes del build (−90,4%) y 133.231 B del gzip del entry (−26,2%), con riesgo bajo.
4. **Fase 3 parcial — H6 + H10 (caché de `Barbero` y `Servicio[]`).** Es lo que baja las requests visibles de la demo. No arrancar H7/H8/H9/H12/H13/H14 hasta cerrar esto.
5. **`typecheck` de una línea** (`"typecheck": "tsc --noEmit"`): se puede colar temprano porque es barato.

**Fuera de la ruta crítica (después de la demo):** CI y workflow, lint de hooks (`exhaustive-deps`), flags estrictos de `tsconfig`, H5 (code splitting), H11b, la Fase 4 de render (salvo la excepción consciente de H26 y el ancho de login), la Fase 6 de higiene y todo el bucket SE DESCARTA. **El alcance de la demo son TODOS los flujos existentes, así que no hay flujos que ocultar: toda pantalla del guion tiene que funcionar.** Lo descartado es pulido, no funcionalidad; si algo rompe un flujo, no se descarta, se arregla.

**Regla:** un cliente que espera no ve un `typecheck` ni un workflow de CI. Ve si la pantalla carga, si los datos son correctos y si los botones responden. Por eso los gates van DESPUÉS de la performance.

---

## 2. Arquitectura confirmada

### 2.1 Superficie de la entrega

| Superficie | Usuarios | Cómo corre |
|---|---|---|
| Expo Web (react-native-web) | Solo barberos, detrás de login | `expo start --web` para demo; `expo export --platform web` para el artefacto estático |
| App mobile (mismo código) | Solo barberos | Expo Go / build nativo |
| Web pública de clientes | Clientes sin login | Fuera de alcance de este plan (`plan_web_publica.md`) |

Este plan NO crea la web pública. Solo hace que la app de barberos corra en un navegador.

### 2.2 Restricciones técnicas confirmadas

- No hay base de datos local. Supabase es remoto y el schema solo se refleja a mano en `src/types/database.types.ts`.
- `app.config.ts:30-32` define web únicamente como `{ favicon }`: no hay `web.output` declarado.
- No existe `metro.config.js` ni `babel.config.js` en la raíz.
- `app.config.ts` es la única fuente de configuración de Expo; los valores `EXPO_PUBLIC_*` se inlinean en build.
- `src/lib/availability.ts` es el hogar acordado para la matemática de slots (`AGENTS.md`).
- No hay test suite. Los gates posibles son typecheck, lint y un smoke test manual en navegador.

### 2.3 Por qué la lógica de datos es portable

Las capas de servicio (`src/services/`), tipos (`src/types/`) y librería (`src/lib/`) no dependen de componentes ni de estilos. Sobre un total de 6.661 líneas en `src/`, la UI (`src/app/` + `src/components/`) suma **5.233 líneas (≈79%)** y la capa de dominio (services + types + lib + store) suma **1.290 líneas**. Esa proporción es la que sostiene la división de buckets de este plan: casi todo lo que SOBREVIVE está en esas ~1.290 líneas y en la configuración de build.

---

## 3. Hallazgos confirmados

Cada hallazgo lleva su bucket de destino. Los números de línea fueron re-verificados sobre el checkout actual; donde la auditoría previa difería, se cita la línea real.

### H1 — `Alert.alert` no existe en web (CRÍTICO — ARRÉGLALO IGUAL)

`Alert.alert` no está implementado por react-native-web (issue #1026, abierto). En un navegador no renderiza nada y **nunca ejecuta el callback**. Hay 10 sitios de llamada:

- `src/app/(tabs)/perfil/excepciones.tsx:128,144,207,221`
- `src/app/(tabs)/perfil/horario.tsx:63,100`
- `src/app/(tabs)/turnos/confirmar.tsx:112`
- `src/app/(tabs)/turnos/nuevo.tsx:87,123,139`

**Corrección (2026-09-20) — este diagnóstico era FALSO.** Afirmaba que el más grave era `nuevo.tsx:87`, el alert "Sesión expirada" cuyo callback hace `router.replace('/login')`, con el barbero "atrapado en un formulario muerto, sin feedback y sin salida". Al implementar la Fase 1 se comprobó que esa rama **jamás se ejecutó**: compara `message === 'Usuario no autenticado'` y **ningún productor emite ese string** (grep: aparece únicamente en ese `if`). Era **código muerto**, así que el barbero nunca quedó atrapado *por esta vía*. El síntoma real es distinto y vive en **H11a**: `getBarbero()` devuelve `null` ante un error de auth, y eso se muestra como "cuenta no vinculada" — un mensaje equivocado. La rama muerta se eliminó durante la Fase 1 (decisión del dueño).

La ironía útil: `src/components/ui/AlertModal.tsx` **ya funciona en web** y ya se usa en `src/app/(tabs)/turnos/[id].tsx:15,279`. El problema es que el resto de la app no lo usa.

**Verificado (resuelve la incertidumbre previa):** se revisaron los 10 sitios de `Alert.alert`. Exactamente UNO pasa un array de botones: `src/app/(tabs)/turnos/nuevo.tsx:87-89`, el alert "Sesión expirada", con un único botón `{ text: 'Aceptar', onPress: () => router.replace('/login') }`. Los otros 9 pasan solo título y mensaje, sin callback. Por lo tanto **`AlertModal` alcanza para los 10 sitios y `ConfirmModal` no es necesario.**

**Actualización — resuelto en Fase 1 (2026-09-20):** ese único sitio con callback resultó **código muerto** y se eliminó (ver corrección arriba). Los 9 restantes se migraron sin callback. La implementación adoptó **`showAlert()` chico sobre `AlertModal`**, con store de Zustand y un `AlertHost` global montado en `_layout.tsx`, conservando `onConfirm` en la firma por ser el contrato de esta sección aunque hoy ningún call site la use. **Esto cierra la decisión abierta de la sección 7, fila 1.**

**Dos partes con distinto destino:**

- Construir una abstracción cross-platform `showAlert()` (o `useAlert()`): **SOBREVIVE**. Es UI-agnóstica y la UI nueva la hereda.
- Migrar los 10 sitios: **ARRÉGLALO IGUAL**. Es un bug funcional que impide la demo.

### H2 — Home nunca se refresca (ALTO — ARRÉGLALO IGUAL)

`src/app/(tabs)/index.tsx:220-222` usa `useEffect(..., [])`. Las tab screens permanecen montadas, así que "Próximos turnos" y "Último turno" quedan congelados desde el arranque hasta un reload completo, incluso después de crear o cancelar un turno.

`src/app/(tabs)/turnos/index.tsx:67` ya usa `useFocusEffect`: ese es el patrón a espejar.

### H3 — Botón muerto "Contactar por wsp" (MEDIO — ARRÉGLALO IGUAL)

`src/app/(tabs)/turnos/[id].tsx:238-240` tiene `onPress={() => {}}` en un botón de ancho completo. O se implementa con `Linking.openURL('https://wa.me/<telefono>')` usando el teléfono del cliente, o se elimina hasta que la función exista. Mostrar un botón que no hace nada en una demo es peor que no mostrarlo.

### H4 — 19 fuentes de iconos para usar una (ALTO — SOBREVIVE)

Medido sobre `dist/`: **19 archivos `.ttf`, 4.076.840 B (3.89 MB)**. Solo se usa `Ionicons` (`Ionicons.b4eb…ttf`, 389.724 B). El desperdicio es de ~3.5 MB (95%).

Causa: `import { Ionicons } from '@expo/vector-icons'` es un barrel import que arrastra el registro completo de familias. Aparece en 12 archivos:

`src/components/ui/Card.tsx:4`, `src/components/ui/AlertModal.tsx:3`, `src/components/ui/ModificarTurnoModal.tsx:11`, `src/components/ui/ProfileHeader.tsx:1`, `src/components/turnos/TurnoHeader.tsx:9`, `src/app/(tabs)/perfil/index.tsx:10`, `src/app/(tabs)/turnos/confirmar.tsx:1`, `src/app/(tabs)/turnos/nuevo.tsx:1`, `src/app/(tabs)/turnos/[id].tsx:2`, `src/app/(tabs)/index.tsx:2`, `src/app/(tabs)/_layout.tsx:1`, `src/app/login.tsx:13`.

Se usan ~20-25 nombres de iconos distintos (`chevron-forward`, `calendar-outline`, `time-outline`, `checkmark-circle`, entre otros). Dos salidas:

1. Import directo: `import Ionicons from '@expo/vector-icons/Ionicons'` — cambio mínimo, elimina las otras 18 fuentes.
2. Migrar los ~20 iconos a SVG inline (lucide-react / react-icons) y eliminar la fuente por completo — mejor para la UI nueva, pero es trabajo de la migración.

**Recomendación:** opción 1 ahora (SOBREVIVE: es config de build/imports), y dejar la opción 2 como decisión de la UI nueva. No migrar a SVG bajo la presión de la entrega.

**✅ RESUELTO — Opción 1 aplicada (2026-09-20, Fase 2).** Los 12 imports migrados a `import Ionicons from '@expo/vector-icons/Ionicons'`. Medido sobre el `dist/` regenerado:

| Métrica | Antes | Después | Δ |
|---|---|---|---|
| `.ttf` en el export | 19 | **1** | −18 |
| Bytes de fuentes | 4.076.840 | **389.724** | **−3.687.116 (−90,4%)** |
| JS entry raw | 1.834.499 | **1.406.740** | −427.759 (−23,3%) |
| JS entry gzip (−6) | 508.210 | **374.979** | −133.231 (−26,2%) |
| `dist/` total | ~5.947.000 | **1.832.500** | ≈ −4.114.500 (−69,2%) |
| Chunks JS | 1 | 1 | 0 (H5 intacto) |

**Hallazgo adicional (no anticipado):** el barrel no solo arrastraba las fuentes — también **empaquetaba el glyphMap y los metadatos de cada familia dentro del JS**. Por eso el entry crudo cayó 23% *además* del ahorro de fuentes, y por eso el "piso" estimado en 5.1 quedó invalidado.

**Verificación del riesgo real (que el build NO prueba):** un import directo podría resolver y sin embargo dejar de registrar la fuente, en cuyo caso los iconos se verían como cajas vacías. Se leyó el módulo: `@expo/vector-icons/build/Ionicons.js` importa el mismo `.ttf`, el mismo `glyphmaps/Ionicons.json` y llama al mismo `createIconSet(glyphMap, 'ionicons', font)`. El `.ttf` referenciado pesa 389.724 B — byte por byte el único que quedó en `dist/`. **La carga de la fuente sigue intacta.** Lo que sigue sin probarse es el render visual en navegador (requiere el smoke test).

**Actualización de la incertidumbre de Fase 0:** la pregunta abierta era si el navegador DESCARGABA las 19 fuentes o solo la usada. El export ahora emite **exactamente 1 fuente, la que el código referencia**, así que el desperdicio del lado del BUILD quedó eliminado y la duda quedó acotada: el peor caso de descarga pasa de ≤ 4.076.840 B a ≤ 389.724 B (el mejor sigue siendo 0). **El conteo real de descargas por red sigue sin medirse** — requiere navegador con DevTools. **No reportar "3,5 MB ahorrados por red" como si estuviera medido.**

### H5 — Un solo chunk JS, sin code splitting (MEDIO — SOBREVIVE, fuera de la ruta crítica)

Medido sobre `dist/_expo/static/js/web/`: **un único archivo de 1.831.380 B raw / 508.210 B gzip** (re-verificado 2026-09-20; el valor originalmente documentado era 1.836.759 B / 509.845 B). Sin splitting por ruta, todas las pantallas se cargan antes del primer paint. Sumado a las fuentes, la carga inicial total es de **5.944.256 B (~5.67 MB)**.

**Este hallazgo está sobre-ponderado.** Un host estático sirve el JS comprimido, así que el costo real de la carga inicial por la red es **508.864 B (~496 KB)** — medido: JS gzip + `index.html` gzip —, no 1.831.380 B raw. El número raw asusta por lo que no se transmite. **Antes de invertir en splitting hay que medir el artefacto DESPLEGADO (comprimido, por la red y ya desplegado)**, no el directorio local. Hasta tener esa medición, H5 queda FUERA de la ruta crítica de la demo.

**Riesgo del `web.output: 'static'` (concreto en este repo, no hipotético):** `web.output: 'static'` pre-renderiza las rutas en Node durante `expo export`, y cualquier módulo que toque `window`, `localStorage` o `AsyncStorage` en tiempo de import puede romper el build. Acá ya pasa:
- `src/lib/supabase.ts` crea el cliente a NIVEL DE MÓDULO (`:11`) y **lanza un error en el import** si faltan las variables de entorno (`:5-9`).
- `src/lib/secureStorage.ts` cae a `AsyncStorage` en web, que es `localStorage`.

**Dos aclaraciones que evitan un error de planificación:**
- **`web.output: 'static'` NO es code splitting.** Son decisiones separadas: una define el modo de render/export, la otra define el particionado de chunks. No presentarlas como la misma cosa.
- El soporte de chunking por ruta en expo-router/Metro debe **verificarse contra la documentación de Expo para esta versión del SDK** antes de planificarlo como si ya estuviera disponible.
- Cambiar el modo de `output` también cambia lo que tiene que hacer quien despliega: es una decisión para tomar CON esa persona, no en solitario.

**Nota honesta:** en una demo local o en una LAN, 5.67 MB carga rápido y puede no notarse. La medición importa igual porque el cliente va a consumir esto en su navegador, y porque la UI nueva debe partir de este baseline (ver `plan_migracion_ui.md`).

### H6 — `getBarbero()` hace round-trip remoto en cada llamada (ALTO — SOBREVIVE)

`src/services/barbero.service.ts:18` usa `supabase.auth.getUser()`, que es un round-trip REMOTO a Supabase Auth (a diferencia de `getSession()`, que es local), y `:23-27` hace un segundo SELECT. `getCurrentBarbero()` se invoca dentro de cada método de servicio (`src/services/turnos.service.ts:61-62` y `src/services/bloqueos.service.ts:8-9`, usado en 7 métodos de turnos y 4 de bloqueos).

En el montaje de Home: `src/app/(tabs)/index.tsx:226` llama `getBarbero()` y `:227` llama `getTurnos()`, que lo llama otra vez → 2 round-trips de auth + 2 SELECT de `Barbero` para el mismo usuario antes del primer paint.

`src/hooks/useAuth.ts:21` ya usa `getSession()` correctamente: ese es el patrón a seguir.

**Regresión que introduce el cambio (crítica) — ✅ RESUELTA en Fase 3, con un desvío respecto de lo previsto.** Al pasar a `getSession()` + caché, se pierde la validación remota del token que hacía `getUser()`. El plan pedía "definir cómo se sigue detectando después". **Se implementó y se verificó independientemente, y el resultado fue distinto al diseñado:**
- La detección **proactiva** (comparar `expires_at`) resultó **código muerto** y se eliminó: `getSession()` ya refresca cuando corresponde y solo devuelve `session: null` si el refresh falló (`GoTrueClient.js:2341-2373`), así que nunca entrega una sesión expirada.
- El mecanismo real es: **fallo de refresh → Supabase emite `SIGNED_OUT` → el redirect del root layout manda a `/login`**. A eso se suma la detección **reactiva** sobre un error de auth en la query (`isAuthError`), que sí es alcanzable.
- **Hallazgo crítico derivado:** mientras la caché solo se limpiaba en `authService.signOut`, el camino de `SIGNED_OUT` automático dejaba la caché del usuario anterior y **el siguiente usuario veía datos del anterior** (ver Fase 3, paso 1). Corregido limpiando en `onAuthStateChange`.
- **El paso 3 del smoke test debe seguir rediseñado** (el alert original en `nuevo.tsx` era código muerto y se borró en Fase 1): probar que una sesión revocada termina en `/login` y que **no** se muestran datos del usuario anterior.

**Fix — ✅ APLICADO:** caché del barbero resuelto en el store de Zustand (`src/store/app.store.ts`) durante la sesión, con `getSession()` en lugar de `getUser()`, e invalidación en `signOut`, en `updateHorarioHabitual` y —clave— en cada transición de sesión (`SIGNED_OUT`/`SIGNED_IN`). La caché **nunca** se limpia en `TOKEN_REFRESHED`, que es el mismo usuario.

### H7 — `getTurnos()` trae el historial completo (ALTO — SOBREVIVE)

`src/services/turnos.service.ts:142-159` no tiene `.gte()`, `.lt()`, `.limit()` ni `.range()`, y hace dos joins embebidos. Los consumidores después ordenan el array entero del lado del cliente para mostrar 4 turnos futuros + 1 pasado (`src/app/(tabs)/index.tsx:242`) y para filtrar un día (`src/app/(tabs)/turnos/index.tsx:82-90`). La carga crece sin límite con el historial de reservas.

**Fix:** ventana de fechas acotada y/o `.limit()`. El conteo de la Home debe resolverse con una consulta acotada, no ordenando todo en memoria.

### H8 — La agenda hace doble fetch al montar (ALTO — SOBREVIVE)

`src/app/(tabs)/turnos/index.tsx:60-65` (un `useEffect`) y `:67-71` (`useFocusEffect`) disparan ambos al montar → dos `getTurnos()` idénticos, y cada uno re-ejecuta `getBarbero()` (H6) → ~6 llamadas de red antes de renderizar la lista.

**Fix:** borrar el `useEffect` de montaje; `useFocusEffect` ya cubre el primer montaje. Agregar un guard de frescura para no refetchear ciegamente al volver de la pantalla de detalle. El patrón "una sola carga por foco, con guard" SOBREVIVE a la UI nueva.

### H9 — Race de escritura en disponibilidad (MEDIO, CORRECTNESS — SOBREVIVE)

`src/app/(tabs)/turnos/nuevo.tsx:66-96`: `loadOccupied` depende de `selectedDate` pero no tiene abort ni guard. Tocar días rápidamente permite que una respuesta vieja gane y sobreescriba `occupiedSlots` (`:77`) con la disponibilidad del día EQUIVOCADO: el barbero ve slots tomados o pierde slots libres. El mismo patrón está en `src/components/ui/ModificarTurnoModal.tsx:90-118`.

Además, varias pantallas no protegen `setState` después del unmount (`nuevo.tsx`, el modal, `[id].tsx:83-103`, `turnos/index.tsx`), mientras que `useAuth.ts:14-51`, `perfil/index.tsx:32-45`, `excepciones.tsx:122-135` y `horario.tsx:54-70` sí lo hacen bien.

**Fix:** guard de request (token/abort) por día seleccionado y patrón `mounted` en los efectos que quedan. La lógica de "disponibilidad por día" se moverá a un hook compartido, así que el arreglo es portable.

### H10 — No hay capa de caché (MEDIO — SOBREVIVE)

`perfil/index.tsx:31-46`, `perfil/horario.tsx:53-71`, `perfil/excepciones.tsx:121-136`, `turnos/nuevo.tsx:61-64` y `ModificarTurnoModal.tsx:72-88` llaman `getBarbero()` y/o `getServicios()` frescos en cada montaje o apertura, aunque ese dato es estático durante la sesión.

**Fix — ✅ APLICADO:** caché de sesión (store) para `Barbero` (con `hora_apertura`, `hora_cierre`, `dias_habiles`) y `Servicio[]`, con invalidación explícita al actualizar horario y en cada transición de sesión. Es exactamente el mismo mecanismo de H6. Verificado que **no existe ninguna mutación de `Servicio`** en la app (solo SELECT), así que el catálogo es genuinamente estático durante la sesión y no hay camino de staleness interno.

### H11 — Errores tragados: patrón en servicios vs. surfacing en UI (MEDIO — mixto)

La clasificación es exclusiva por bucket y H11 estaba en dos, así que se separa explícitamente (igual que H30 en H30a/H30b):

**H11a (SOBREVIVE) — el PATRÓN de tragado de errores en la capa de servicios.** Es agnóstico de UI y la UI nueva lo hereda:
- `src/services/barbero.service.ts:21` devuelve `null` ante un error de auth, y eso se confunde con "cuenta no vinculada". Una sesión expirada se disfraza de problema de configuración.
- `src/services/turnos.service.ts` reemplaza errores reales de Supabase por strings genéricos, borrando la causa.

**H11b (SE DESCARTA) — el surfacing en pantallas que se van a reescribir.** Pulido de UI sobre código que muere:
- `src/app/(tabs)/index.tsx:234-235` (`catch { setTurnos([]) }`) → un error de red se ve como "No tenés próximos turnos".
- `nuevo.tsx:112-114` y `:122-124`, `ModificarTurnoModal.tsx:113-115` y `:138-140` (solo `console.error`).
- `perfil/index.tsx:37-39` (`.catch(() => {})`).

**Fix:** taxonomía de errores en servicios (H11a, SOBREVIVE). El surfacing visible (H11b) NO se hace ahora: la UI nueva nace con el patrón correcto ya presente en `src/app/(tabs)/turnos/index.tsx:55-57`.

### H12 — Waterfalls de `await` secuenciales (MEDIO — SOBREVIVE)

- `src/app/(tabs)/index.tsx:226-227` son independientes y deberían ser `Promise.all`.
- `src/services/turnos.service.ts:330-408` (`updateTurno`) busca dos filas independientes en serie (`:343` y `:364`).
- `createAppointment` (`:278-325`) hace cuatro saltos seriales.

**Fix:** paralelizar lo independiente; no cambia contratos.

### H13 — Refetch evitable y `SELECT *` (BAJO — SOBREVIVE)

`src/app/(tabs)/turnos/[id].tsx:138` vuelve a llamar `getTurnoById` aunque `updateTurno` ya devolvió la fila actualizada. Además, `getTurnoById` (`src/services/turnos.service.ts:200-223`) y `getBarbero` (`src/services/barbero.service.ts:25`) usan `SELECT *` y traen columnas que la UI nunca consume.

**Fix:** usar la fila devuelta por `updateTurno` y reemplazar `*` por la lista explícita de columnas.

### H14 — `computeOccupiedSlots` devuelve Array y se consulta con `.includes()` (BAJO — SOBREVIVE)

`computeOccupiedSlots` (`src/lib/availability.ts:73-103`) construye un `Set` internamente pero retorna `Array.from(occupied)` (`:103`). Los consumidores prueban pertenencia con `.includes()` dentro de un `.map` (`nuevo.tsx:253`, `ModificarTurnoModal.tsx:291`) → O(slots × occupied) por render. `generateTimeSlots` se llama sin `useMemo` (`nuevo.tsx:56`, modal `:71`).

**Fix:** devolver `Set<string>` y memoizar la generación de slots.

### H15 — No hay gates automáticos (ALTO — SOBREVIVE)

`package.json:5-16` no tiene script `typecheck`. `.github/` existe pero solo contiene `copilot-instructions.md`: **no existe `.github/workflows`**. No hay tests ni pre-commit hook.

**Fix:** agregar `"typecheck": "tsc --noEmit"` y un workflow mínimo (install + typecheck + lint).

### H16 — No hay lint de React Hooks (ALTO — SOBREVIVE)

`eslint-plugin-react-hooks` no está ni en `package.json` ni en `package-lock.json`, así que `react-hooks/exhaustive-deps` nunca corre. Ejemplo vivo de la clase de bug que se pierde: `src/app/_layout.tsx:12-22` usa `router` en un `useEffect` pero lo omite del array de dependencias (el array es `[session, loading, segments]`).

**Fix:** instalar el plugin y habilitar `recommended` + `exhaustive-deps`.

### H17 — `eslint-plugin-react-native` registrado sin reglas (MEDIO — SOBREVIVE)

Se registra en `eslint.config.mjs:36`, pero no se aplica ninguna de sus reglas: solo se esparcen ts/react/prettier en `:40-42`. Es una dependencia no-op.

### H18 — `@eslint/js` es una dependencia fantasma (MEDIO — SOBREVIVE)

Se importa en `eslint.config.mjs:1` pero NO está declarada en `package.json`; solo resuelve de forma transitiva. Puede romper con una reinstalación limpia.

### H19 — `.eslintrc.cjs` es configuración muerta (MEDIO — SOBREVIVE)

Existe `.eslintrc.cjs` en la raíz, pero ESLint 9 usa flat config por defecto e ignora los archivos eslintrc cuando hay una flat config. Hay que eliminarlo para no confundir a quien lea el repo.

### H20 — `docs/` está entero en `.gitignore` (MEDIO — SOBREVIVE)

`.gitignore:48` ignora todo el árbol `docs/`, por lo que 4 documentos quedan sin trackear:

- `docs/barberia-app-spec (3).md`
- `docs/prompt-pendev-desktop.md`
- `docs/requerimientos-web-ux-ui-historias.md`
- `docs/requerimientos-web-ux-ui-pantallas.md`

`.gitignore:47` es además una ruta absoluta de Windows muerta (`D:\ComIT\proyecto-final-rn\docs`).

**No** están ausentes: `.env.example`, `docs/barberia-app-spec (2).md`, `docs/resumen-bd-rls.md` y `docs/seed-barberia.sql` ya están trackeados (verificado con `git ls-files`). No reportarlos como faltantes.

### H21 — `audit-report.json` no describe este checkout (MEDIO — SOBREVIVE)

`audit-report.json` existe en la raíz del repositorio (sin trackear; verificado con `git ls-files`, que no lo devuelve) y reporta `{ low: 1, moderate: 10, high: 16, critical: 1 }`, pero sus entradas referencian `expo` 57.0.x mientras `package-lock.json:6964` fija `expo` 54.0.37. El reporte no corresponde a esta versión del proyecto. Borrarlo o ignorarlo, y auditar el lockfile real contra `package-lock.json`.

### H22 — `tsconfig.json` deja guards valiosos afuera (MEDIO — SOBREVIVE)

Tiene `strict: true` (`tsconfig.json:4`) pero no `noUncheckedIndexedAccess` — el guard de mayor valor para este código, que indexa arrays en la matemática de slots y disponibilidad — ni `noImplicitOverride`, `noFallthroughCasesInSwitch` ni `noImplicitReturns`. Su `include: ["**/*.ts","**/*.tsx"]` (`:12`) solo excluye `node_modules`.

### H23 — `expo-status-bar` es dependencia muerta (BAJO — SOBREVIVE)

Está en `dependencies` (`package.json:28`) pero nunca se importa: `StatusBar` se importa desde `react-native` (`src/app/(tabs)/turnos/nuevo.tsx:9`, `confirmar.tsx:13`).

### H24 — Cero `React.memo` (MEDIO — SE DESCARTA)

No hay ningún `React.memo` en `src/`. `TurnoCard` (`src/app/(tabs)/index.tsx:117`, mapeado en `:286`), `SlotRow` (`turnos/index.tsx:160`, mapeado en `:133`) y `Chip` (`:148`) reciben handlers inline nuevos en cada render.

**No se hace.** Es micro-optimización sobre componentes que la UI nueva reemplaza.

### H25 — `DayStrip` re-renderiza toda la tira (MEDIO — SE DESCARTA)

`src/components/turnos/DayStrip.tsx:74-111` pasa un `renderItem` inline recreado en cada render y no está memoizado; en `nuevo.tsx:228-232` las props `onSelect` e `isDisabled` también son inline, así que cada tap en un slot (`setSelectedTime` en `:278`) re-renderiza las ~16 celdas de días.

**No se hace.** El costo medible es bajo y el componente muere con la reescritura.

### H26 — `useMemo` que nunca memoiza en excepciones (MEDIO — SE DESCARTA)

`src/app/(tabs)/perfil/excepciones.tsx:159-162`: `parcialesExistentes` (`:159`) es un `filter` que produce una identidad nueva en cada render, y `useMemo` se llavea sobre esa variable (`[parcialesExistentes]`, `:162`), así que nunca memoiza y el set de slots se reconstruye en cada tecla del `TextInput` de `nota`. El arreglo es barato (llavear sobre `existentes` y mover el `filter` adentro del `useMemo`).

**Reclasificado a SE DESCARTA.** Por la definición del documento (micro-performance sobre una pantalla que la UI nueva reescribe) este hallazgo NO corresponde a ARRÉGLALO IGUAL. Como el cambio es de ~10 minutos, hacerlo es aceptable, pero debe quedar registrado como una **excepción CONSCIENTE a la regla de clasificación**, no como una inconsistencia de ella.

### H27 — `key={idx}`, rebuilds y `new Date()` por slot (MEDIO — SE DESCARTA)

`src/components/ui/ModificarTurnoModal.tsx:259` usa `key={idx}` sobre una lista cuyo contenido se desplaza, lo que puede renderizar el día seleccionado equivocado; `availableDays` y `timeSlots` se reconstruyen en cada render (`:146-150`, `:71`) y se llama `new Date()` por slot (`:293-304`, mismo antipatrón en `nuevo.tsx:252-268`).

**No se hace.** Es reescritura de componentes, no un bug bloqueante.

### H28 — Lógica de fecha/slot duplicada en 4+ archivos (MEDIO — SE DESCARTA)

- `MONTHS`/`DAYS_OF_WEEK`: `nuevo.tsx:23-40`, `confirmar.tsx:21-36`, `[id].tsx:26-44`, `ModificarTurnoModal.tsx:17-41`.
- `formatTime`: `(tabs)/index.tsx:39-46`, `turnos/index.tsx:25-28`, `[id].tsx:47-53`.
- `minutosDesde`/`labelDesdeMinutos`: `excepciones.tsx:61-65` y `TimeSlotGrid.tsx:14-19`.
- `SLOT_STEP_MINUTES` (`src/lib/availability.ts:11`) está hardcodeado como 30 en `TimeSlotGrid.tsx:37` y `excepciones.tsx:101` en vez de leer la constante.

`AGENTS.md` declara `src/lib/availability.ts` como el hogar acordado de esta matemática.

**Se descarta como refactor NOW.** La consolidación pertenece a la UI nueva, que debe nacer con un único módulo de formato de fecha y slots. Lo único barato y útil ahora es leer `SLOT_STEP_MINUTES` en lugar del `30` literal; se deja anotado como opcional.

### H29 — Brechas de accesibilidad web (BAJO — SE DESCARTA)

Ningún control muestra indicador de foco visible (`TouchableOpacity` resetea el outline y no se usa estilo `focused`): `login.tsx:113`, `DayStrip.tsx:79`, `nuevo.tsx:271`, `turnos/index.tsx:150`, `[id].tsx:241`. Varios controles carecen de `accessibilityRole`/`accessibilityLabel` (el `TurnoCard` de Home en `(tabs)/index.tsx:127-128` es el ejemplo correcto). Los `Modal` de RN no pasan `onRequestClose` (`AlertModal.tsx:34`, `ConfirmModal.tsx:26`, `ModificarTurnoModal.tsx:171`, `confirmar.tsx:273`), así que Escape no los cierra. `login.tsx:140-142` define `content: { width: '100%' }` sin ancho máximo, así que los inputs ocupan todo el viewport de escritorio.

**Se descarta el pulido fino.** El ancho máximo del login (`login.tsx:140-142`) deja de ser una exigencia de demo: es un detalle SOLO de escritorio y de baja prioridad, porque el viewport primario es un teléfono (iPhone/WebKit, ~390 px). Foco visible y `onRequestClose` son baseline obligatorio de la UI nueva.

### H30 — Código muerto y tokens divergentes (BAJO — mixto)

**H30a (SOBREVIVE) — borrar lo que nadie importa:**
`src/components/ui/Card.tsx` (nunca importado), `src/components/ui/BrandHeader.tsx` (nunca importado), `src/components/ui/index.ts` (barrel que nadie usa; los callers importan `@/components/ui/Screen` directo), `src/lib/theme.ts` (sin uso), `src/styles/globals.ts` (sin uso), `src/hooks/useColorScheme.ts` (sin uso), estilos sin usar en `login.tsx:214-227`, un `turnosTabItem` no-op en `src/app/(tabs)/_layout.tsx:105-107`, tokens sin uso en `components/turnos/theme.ts:8-9` y `components/horario/theme.ts:15-17`, y los assets `assets/logo.png` (12.868 B) y `assets/rigo-baby.jpg` (31.327 B) sin referencias.

**H30b (SE DESCARTA) — unificar las 4 fuentes de tokens:**
`src/lib/theme.ts` (su `#0EA5E9` primario difiere del real `#4C1D95`), `components/turnos/theme.ts` y `components/horario/theme.ts` duplican 9 colores + radius con nombres divergentes (`red/green/amber` vs `danger/dangerSoft`). También `TurnoHeader.tsx:19-30` es casi idéntico a `ProfileHeader.tsx:9-26`.

La unificación de tokens es exactamente el trabajo de fundación de la UI nueva. Hacerla ahora sería construir dos veces el mismo sistema.

### H31 — `database.types.ts` está DESACTUALIZADO respecto del schema real (ALTO — SOBREVIVE)

`src/types/database.types.ts` se mantiene a mano y se desincronizó del schema en vivo. Verificado comparando las columnas declaradas contra las reales:

- `Barberia` — declara 7 columnas, en vivo hay **10**. Faltan **`public_slug`**, **`description`** y **`publicado`**.
- `Barbero` — declara 12 columnas, en vivo hay **14**. Faltan **`duracion_default`** y **`precio_base`**.
- `Cliente`, `Servicio`, `Turno`, `BloqueoHorario` y `CodigoVerificacion` — coinciden.

**Por qué importa (punto #1 del dueño):** un gate de `typecheck` puede pasar limpio mientras una query falla en runtime, porque los tipos NO se generan desde el schema. La dirección concreta del peligro acá es que la base tiene columnas que los tipos no conocen: los consumidores con `select('*')` reciben datos fuera del tipo sin que TypeScript se entere, y cualquier código nuevo escrito contra esas columnas será rechazado por un tipo viejo o, peor, escrito esquivándolo.

**Acción:** regenerar los tipos desde el schema en vivo con la Supabase CLI, diferenciarlos contra el archivo commiteado y commitear la versión regenerada ANTES de cualquier otro trabajo. `public_slug`, `description` y `publicado` parecen existir para el proyecto de web pública, lo que indica que la deriva no es accidental: el schema evolucionó para otra superficie.

### H32 — Los datos de demo existen pero están TODOS en el pasado (MEDIO — SOBREVIVE)

**Corrección de un dato previo de este plan.** Una versión anterior de este documento afirmaba que la base tenía `Barberia` 1 / `Barbero` 1 / `Servicio` 4 / `Cliente` 1 / `Turno` 1. **Eso era falso**: provenía del conteo de filas del inspector de esquema, que resultó ser una estadística no confiable. El conteo real, hecho con `count`/`jsonb_agg` sobre las tablas, es:

| Tabla | Filas reales |
|---|---|
| `Barberia` | **3** |
| `Barbero` | **2** |
| `Cliente` | **11** |
| `Servicio` | **9** |
| `Turno` | **13** |
| `BloqueoHorario` | **0** |
| `CodigoVerificacion` | **0** |

El tenant de la app móvil es `Barberia` id 2 ("Barbería Demo"), con el barbero id 1 ("Mauro Laime", `users_id` del usuario `test@test.com`). Existe además `Barberia` id 3 ("Conexión Barbería", `publicado = true`, `public_slug = 'conexion-barberia'`) con el barbero id 10, que es el tenant de la **web pública** — no tocar. `Barberia` id 1 ("Barbería Piloto") está vacía.

**El problema real NO es la falta de datos, es que no hay nada en el futuro.** Los 13 turnos son pasados: el más reciente es del 2026-09-12 y hoy es 2026-09-20. Con eso, la **agenda del día y "Próximos turnos" salen vacíos en la demo**, que son dos pantallas del guion. Además `BloqueoHorario` está en 0, así que la pantalla de excepciones no tiene nada que mostrar.

**Acción (entregable de Fase 0):** refrescar los datos de demo para que **cubran pasado, HOY y futuro**, y agregar al menos dos bloqueos (uno parcial y uno de día completo). Restricciones a respetar:
- El seed existente `docs/seed-barberia.sql` es **DESTRUCTIVO** (borra `Turno`, `BloqueoHorario`, `Servicio` del barbero y `Cliente`, `Barbero`, `Barberia` del tenant antes de insertar) y **solo genera turnos futuros** (`now() + interval`), así que tal cual está no cubre el requisito de pasado. Hay que extenderlo, no ejecutarlo sin más.
- Su placeholder de email sigue sin reemplazar (`REEMPLAZAR_CON_EMAIL_DEL_BARBERO@ejemplo.com`). El valor correcto para el tenant móvil es `test@test.com`.
- Por `AGENTS.md` el seed corre ÚNICAMENTE en el SQL Editor de Supabase (la publishable key no puede hacer DDL ni saltar RLS) y requiere que el usuario destino exista antes en `auth.users`.
- `Cliente` es por `Barberia` mientras que `Servicio` es por `Barbero`: el seed debe respetar ese scoping.

### H33 — `Cliente.telefono` es `numeric` y destruye el formato (MEDIO, CORRECTNESS — afecta a H3)

En el schema en vivo `Cliente.telefono` es una columna `numeric`, y la app la escribe con `parseInt(telefonoLimpio, 10)` en `src/app/(tabs)/turnos/confirmar.tsx:103`. Consecuencias: un cero inicial se destruye de forma permanente (relevante para números en formato local argentino, por ejemplo `011 5555-1234`) y la columna nunca puede preservar formato. El tipo declarado es `telefono: number | null`, que coincide con la columna pero es el MODELO EQUIVOCADO para un teléfono.

Esto afecta directamente a H3 (el botón de WhatsApp de Fase 1), porque `wa.me` necesita un número internacional completo. Honestamente: un ingreso internacional completo como `+54 9 11 5555-1234` sobrevive (14 dígitos, dentro del rango seguro de enteros), así que la función puede andar; pero es frágil para cualquier cliente que haya cargado un número en formato local.

**Acción:** el seed debe contener teléfonos en formato internacional completo; la implementación de H3 debe manejar ambos formatos de forma defensiva; y cambiar la columna a `text` se propone como un cambio separado y posterior (es una migración de schema, fuera del alcance del empujón de demo).

### Resultados verificados como correctos (delimitan el alcance)

Estos puntos se verificaron y NO son problemas; deben quedar explícitos para que nadie invente trabajo:

- **Scope de tenant correcto:** todas las consultas se acotan por `barbero_id` (o por `barberia_id` donde corresponde, vía el barbero resuelto). No hay bugs de scope de tenant.
- **Sin N+1 clásico de lectura:** no hay un bucle que dispare una query por fila.
- **`useMemo` de slots:** `computeOccupiedSlots` (availability.ts:73) construye un `Set` internamente y lo convierte a Array al final — el problema de H14 es la conversión, no el algoritmo.
- **Estilos:** las 23 llamadas a `StyleSheet.create` están en scope de módulo; ninguna dentro del cuerpo de un componente.
- **Cleanup:** no hay timers ni suscripciones sin cleanup.
- **`FlatList`:** todo uso tiene `keyExtractor` (`DayStrip.tsx:69`).
- **Lint:** `npm run lint` no está roto por `--ext` (ver sección 1).
- **Sin flujos de redirect de Auth (verificado, no hay que configurar nada):** un grep no encontró `resetPasswordForEmail`, `signUp` ni llamadas de confirmación/recovery de email en `src/`. La app tiene login solo con contraseña, consistente con `AGENTS.md` ("no self-signup / no auto-create"). Por lo tanto las **Site URL / Redirect URLs de Supabase Auth NO necesitan configurarse para la demo**. Nota: `src/hooks/useAuth.ts:87-88` solo mapea un mensaje de ERROR ("email not confirmed") a texto amigable; no es un flujo.
- **`Alert.alert` es la ÚNICA API hostil a web (verificado):** un grep no encontró ninguna otra API de React Native que sea no-op o problemática en el navegador. No hay `ToastAndroid`, `ActionSheetIOS`, `Share`, `Alert.prompt`, `Linking`, `Clipboard`, `Dimensions` ni `Vibration` en `src/`. Esto acota el alcance de H1: no hay una segunda clase de fallas silenciosas escondida en el código, y lo que H1 cubre es todo lo que hay.
- **Dependencias de Expo efectivamente usadas:** solo tres — `expo-router`, `expo-constants` y `expo-secure-store`. `expo-font` figura como plugin en `app.config.ts` pero no se importa en `src/` (los iconos cargan vía `@expo/vector-icons`).

---

## 4. Plan paso a paso

No avanzar a la fase siguiente si el criterio de "hecho" de la fase actual no está cumplido. Las fases están ordenadas por lo que desbloquea al cliente más rápido: los bugs funcionales de web van antes que cualquier optimización.

### Fase 0 — Línea base, evidencia y alcance de la demo (✅ ejecutada 2026-09-20; queda pendiente el perfil de rendimiento interactivo)

Sin medición previa ninguna mejora es demostrable. Esta fase es corta, habilita la sección 5 y fija QUÉ se va a mostrar. **El alcance ya está decidido: la demo cubre todos los flujos que existen hoy en la app** (ver paso 2), así que esta fase NO recorta trabajo: lo delimita con precisión.

1. **Regenerar los tipos desde el schema en vivo (H31) — primero que todo.** Con `src/types/database.types.ts` desactualizado, ningún `typecheck` prueba que las queries sean correctas. Regenerar con la Supabase CLI, diferenciar contra el archivo commiteado y commitear la versión regenerada antes de cualquier otro trabajo. Si aparece un cambio de contrato inesperado, frenar y resolverlo.
2. **Alcance de la demo — RESUELTO por el dueño: se muestran TODOS los flujos que existen hoy en la app.** El guion no se recorta, se enumera. Los flujos son: login; Home/agenda del día; lista de turnos con filtro; detalle de turno (incluye modificar y cancelar); nuevo turno (selección de día y horario, servicio y cliente); confirmar turno; perfil; horario habitual; y excepciones/bloqueos. **Consecuencia directa: la palanca de "ocultar en lugar de arreglar" NO está disponible en este proyecto.** Toda pantalla del guion debe funcionar sin errores visibles, porque todas se van a ver. Esto NO convierte al bucket `SE DESCARTA` en deuda: un pulido descartado (memoización, accesibilidad fina, tokens) no rompe un flujo; un bug funcional sí. Lo que cambia es que **el conjunto `ARRÉGLALO IGUAL` debe cubrir las 9 pantallas, no solo las que parecían críticas.** Antes de la demo, recorrer el guion completo una vez y registrar cada pantalla que falle.
3. **Refrescar el seed de demo (H32) — ✅ EJECUTADO 2026-09-20.** `docs/seed-barberia.sql` fue reescrito y aplicado. **Cambio de enfoque respecto de lo previsto: NO es destructivo.** Se descartó el borrado total porque los 13 turnos pasados son justamente el historial que la Home necesita para "Último turno"; destruirlos era contraproducente. El seed ahora preserva el historial y administra **solo la ventana `inicio >= hoy`**. Qué hace: pone `dias_habiles = {0..6}` (los 7 días) en barbería y barbero — esto resuelve el bloqueante de demo, porque antes `{2,3,4,5,6}` dejaba la agenda **vacía en domingo y lunes**; amplía el horario a 09:00-20:00; normaliza los teléfonos de cliente a formato internacional (`54911XXXXXXXX`) para que la prueba de `wa.me` de H3 sea válida; genera 13 turnos de hoy y futuros más 2 bloqueos (uno parcial, uno de día completo); y **aborta si el tenant tuviera otros barberos**. Deja un bloque de RESET TOTAL comentado al final para cuando se quiera un tenant limpio. Respaldo previo en `docs/seed-backup-2026-09-20.json`. Resultado verificado: histórico 13 intacto, hoy+futuro 13, turnos de hoy 6, teléfonos internacionales 9 / locales 0, solapamientos 0, bloqueos 2, tenant de la web pública intacto. **El seed se auto-verifica**: lanza excepción si el conteo de turnos no es el esperado, porque los turnos se insertan con JOIN por nombre y un acento mal escrito descarta filas en silencio (pasó durante la implementación).
4. **Perfilar de dónde viene la lentitud — ⚠️ NO AUTOMATIZABLE con las herramientas disponibles.** Hoy NADIE midió si la lentitud es de carga, de datos o de render. Este paso requiere un navegador con DevTools sobre la app corriendo, y no se pudo ejecutar en esta sesión (la herramienta de navegador disponible depende de una app de escritorio que no estaba activa). **Queda pendiente y es el único entregable de Fase 0 que necesita una persona.** Pasos exactos para quien lo haga: levantar la app con `npx expo start --web`; abrir DevTools en un perfil mobile capado (Fast 4G + CPU 4x slowdown); grabar el panel Performance desde la carga hasta que Home muestre datos; y registrar (a) tiempo al primer contenido significativo, (b) cantidad y duración de las requests de datos en la pestaña Network, (c) long tasks y su origen. **La salida decide cuál de H4/H5/H6-H14 recibe atención primero: no asumir el orden.** Lo único que ya se midió es el componente de CARGA (ver paso 6), que es el tamaño, no el tiempo.
5. Confirmar que el export corresponde a este checkout:
   - `npm ci` (o `npm install` si el lockfile no está consistente).
   - `npm run build:web` para regenerar `dist/`.
6. **Registrar la línea base — ✅ EJECUTADO 2026-09-20.** Se regeneró el export (`npm run build:web`) y **reproduce el baseline documentado dentro del 0,3%**, con lo cual la línea base queda confirmada y es reproducible. Valores del `dist/` regenerado en este checkout:
   - JS entry raw: **1.831.380 B** (documentado: 1.836.759 B; −5.379 B atribuibles a la regeneración de tipos).
   - JS entry gzip: **508.210 B** (documentado: 509.845 B).
   - Fuentes: **19** archivos `.ttf`, suma **4.076.840 B** (sin cambios).
   - Chunks JS: **1** (sin splitting).
   - `dist/` total: **5.944.256 B** (informativo, no criterio duro; ver 5.1).
   - **Costo real sobre la red:** JS gzip + `index.html` gzip = **508.864 B (~496 KB)**. Este es el número que importa para H5, porque es lo que sirve un host estático, no los 1,83 MB raw.
   - Se verificó además que las env de Supabase quedan inlineadas en el bundle y que **no hay ninguna clave privilegiada filtrada** (`service_role` no aparece).

   **H4 quedó CONFIRMADO (2026-09-20, Fase 2).** La predicción era correcta: al pasar al import directo, las `.ttf` del export cayeron de 19 a 1, así que el barrel quedó probado como la causa y el desperdicio de build era real. El ahorro de **BUILD** está medido (−3.687.116 B de fuentes; el JS además cayó 23% porque el barrel también empaquetaba los glyphMaps). Lo que sigue sin medirse es el **conteo de descargas por red**: el export ya solo emite la fuente que el código referencia, así que el peor caso bajó de ≤ 4.076.840 B a ≤ 389.724 B (el mejor sigue siendo 0), pero nadie observó el panel Network. **No reportar el ahorro de red como medido.**
7. Ejecutar los gates actuales y guardar la salida:
   - `npx tsc --noEmit`
   - `npm run lint`
8. Levantar la app en web (`npm run web` o `npx expo start --web`) y contar las requests de red del primer render de Home y de la agenda (DevTools → Network). Registrar el conteo; hoy se estiman ~5-6 requests en Home y ~6 en la agenda al montar.
9. Guardar esta evidencia en un archivo de notas del equipo (fuera del repo si el equipo lo prefiere).

**Estado de Fase 0 — 2026-09-20:** ✅ tipos regenerados y verificados (`tsc` 0 errores, `lint` 0 errores / 9 warnings) · ✅ alcance de demo resuelto (todos los flujos) · ✅ seed aplicado y verificado (no destructivo) · ✅ línea base de bundle medida y reproducible · ⬜ **perfil de rendimiento interactivo PENDIENTE** (requiere navegador con DevTools; ver paso 4) · ⬜ conteo de requests del primer render, que sale del mismo paso pendiente.

**Hecho cuando:** los tipos están regenerados y verificados, el guion de demo está fijado, el seed está aplicado y verificado, y existe un registro fechado con los números de bundle reproducible con un comando. **Los dos entregables que faltan (perfil de rendimiento y conteo de requests reales) dependen de una sesión de navegador con DevTools y NO bloquean el arranque de Fase 1** — se pueden completar en paralelo, porque Fase 1 son bugs funcionales que se arreglan por inspección y no por medición.

### Fase 1 — Desbloquear web (H1, H2, H3) — máxima prioridad (✅ ejecutada 2026-09-20; smoke test en navegador pendiente)

Esta fase sola habilita la demo. No tocar performance antes de terminarla.

1. **H1 — abstracción de alertas (SOBREVIVE) — ✅ IMPLEMENTADO.** `showAlert()` y no el par `.web.ts`/`.native.ts`.
   - **Implementado:** `src/lib/alert.ts` con un store de Zustand y `showAlert(title, message, options?)`, donde `options` acepta `type` y `onConfirm`. En `Platform.OS === 'web'` publica en el store; en nativo llama a `Alert.alert` **sin alterar el comportamiento existente**. `src/components/ui/AlertHost.tsx` suscribe el store y renderiza el `AlertModal` que ya existía, montado en `src/app/_layout.tsx` como **hermano** de `<Stack>` dentro de `<ErrorBoundary>`.
   - **`ConfirmModal` no fue necesario** (ver H1). Se conserva `onConfirm` en la firma por ser el contrato de esta sección, aunque hoy ningún call site la use.
2. **H1 — migrar los sitios (ARRÉGLALO IGUAL) — ✅ IMPLEMENTADO.**
   - **9 sitios migrados:** `excepciones.tsx:128,144,207,221`, `horario.tsx:63,100`, `confirmar.tsx:112`, `nuevo.tsx:123,139`.
   - **El décimo (`nuevo.tsx:87`) NO se migró: se ELIMINÓ** por ser código muerto — comparaba `'Usuario no autenticado'`, un string que ningún productor emite (ver la corrección en H1 y el síntoma real en H11a). El manejo de sesión expirada queda a cargo del redirect del root layout, no de esta pantalla.
   - Verificado por grep: no queda ninguna llamada a `Alert.alert` en `src/` salvo el branch nativo intencional dentro de `src/lib/alert.ts`, y no queda ningún `onPress={() => {}}`.
3. **H2 — refrescar Home al enfocar (ARRÉGLALO IGUAL) — ✅ IMPLEMENTADO.** `useEffect(..., [])` reemplazado por `useFocusEffect(useCallback(...))` en `src/app/(tabs)/index.tsx`, con el loader convertido a `useCallback(..., [])`. Sin `useEffect` de montaje residual: Home quedó limpia del doble fetch (a diferencia de `turnos/index.tsx`, que sí lo conserva — H8).
4. **H3 — botón "Contactar por wsp" (ARRÉGLALO IGUAL) — ✅ IMPLEMENTADO con la Opción A.**
   - El teléfono **no** estaba disponible en el detalle: se agregó `telefono` al `select` de `getTurnoById` (`src/services/turnos.service.ts`), junto con el tipo `telefono: number | null`. Verificado: `Cliente.telefono` es Postgres `numeric` (no `int4`, sin riesgo de overflow) y los datos ya están en formato internacional sin `+` (p. ej. `5491122334455`); `[id].tsx` es el único caller.
   - El handler abre `https://wa.me/<digits>` vía `Linking.openURL` (soportado por react-native-web) y, si el cliente no tiene teléfono, **no** abre un link roto: muestra un `showAlert`. La Opción B quedó descartada.

**Hecho cuando:** en WebKit (Safari) a ~390 px, (a) cada uno de los **9** mensajes muestra un modal visible, (b) ~~la sesión expirada en `nuevo.tsx` muestra el mensaje y navega a `/login`~~ → **ANULADO:** esa rama era código muerto y se eliminó; el redirect por sesión expirada es responsabilidad del root layout (ver H1 y H6), (c) crear un turno y volver a Home muestra el turno nuevo sin recargar, y (d) no queda ningún `onPress={() => {}}` visible.

**Estado de Fase 1 — 2026-09-20:** implementada y verificada (`npx tsc --noEmit` 0 errores · `npm run lint` 0 errores / 9 warnings · `npm run build:web` exit 0). **El smoke test en navegador sigue PENDIENTE** y es lo único que falta para declararla cerrada: `tsc` y el build prueban que compila y que el bundle es válido, pero NO prueban que el modal se vea ni que el link de WhatsApp abra pestaña. Ver 5.5.

### Fase 2 — Bundle y carga inicial (H4, H5) — H4 ✅ ejecutada 2026-09-20 · H5 diferida por decisión del plan

1. **H4 — una sola familia de iconos (SOBREVIVE) — ✅ IMPLEMENTADO.**
   - Los 12 imports de barrel cambiados a `import Ionicons from '@expo/vector-icons/Ionicons'`.
   - Archivos: `Card.tsx:4`, `AlertModal.tsx:3`, `ModificarTurnoModal.tsx:11`, `ProfileHeader.tsx:1`, `TurnoHeader.tsx:9`, `perfil/index.tsx:10`, `confirmar.tsx:1`, `nuevo.tsx:1`, `[id].tsx:2`, `(tabs)/index.tsx:2`, `(tabs)/_layout.tsx:1`, `login.tsx:13`. Diff verificado: **12 líneas eliminadas y 12 agregadas, ni una más**. `Card.tsx` sigue existiendo, así que son 12 y no 11.
   - Verificado que **solo `Ionicons` se usa en todo `src/`** (53 usos, cero otras familias), así que descartar el barrel no quita nada.
2. **H5 — code splitting (SOBREVIVE, fuera de la ruta crítica) — ⬜ NO EJECUTADO, por decisión del plan.**
   - **Falta medir el artefacto desplegado** (comprimido y por la red). Hasta entonces no se invierte en splitting. Tras H4 el costo real de carga inicial bajó a **375.635 B (~367 KB)**, no 1.831.380 B raw.
   - Si se decide avanzar, evaluar `web.output` (por ejemplo `'static'`) en `app.config.ts:30-32`, teniendo en cuenta el riesgo de pre-render en Node (H5) y que cambiar el modo de output afecta a quien despliega.
   - Verificar si expo-router 6 + Metro ya ofrece splitting por ruta con la configuración actual contra la documentación de Expo para esta versión del SDK; si no, diferir el split fino a la UI nueva.
   - No agregar un bundler nuevo (Vite/Next) bajo la presión de la entrega: eso es la decisión del plan de migración de UI.
3. **Regenerar el export y comparar contra Fase 0 — ✅ HECHO.** Ver la tabla de resultados en H4 y la actualización de 5.1.

**Hecho cuando:** el export contiene 1 sola fuente `.ttf` (Ionicons) o 0, la suma de fuentes es ≤ 389.724 B, y el JS gzip inicial bajó respecto de 508.210 B. Si el splitting no puede lograrse sin reconfigurar el bundler, debe quedar documentado con el motivo y el número alcanzado.

**Resultado (2026-09-20): los tres criterios DUROS se cumplen.** 1 sola fuente `.ttf` (exactamente la de Ionicons) · 389.724 B (exactamente el límite) · JS gzip 508.210 → **374.979 B**. El **objetivo informativo de ≤ 350.000 B NO se alcanzó** (quedó en 374.979 B); cerrar esa brecha requeriría H5 (code splitting), que sigue diferido. H5 queda documentado como no ejecutado, con el motivo: falta la medición del artefacto desplegado. Gates: `npx tsc --noEmit` 0 errores · `npm run lint` 0 errores / 9 warnings · `npm run build:web` exit 0.

### Fase 3 — Performance de datos (H6-H14) — H6/H7/H8/H9/H10 ✅ ejecutadas 2026-09-20 · H11-H14 pendientes

Ordenar por impacto: primero la caché (H6/H10), después los límites de query (H7), después el doble fetch (H8) y el resto. **Solo el bloque H6/H10 integra la ruta crítica de la demo** (es lo que reduce las requests visibles); el resto puede esperar.

1. **H6 + H10 — caché de sesión (SOBREVIVE) — ✅ IMPLEMENTADO.**
   - `src/store/app.store.ts` cachea `barbero` (con `Barberia` embebida) y `servicios`, con `clearSessionData()`.
   - `getBarbero()` (`src/services/barbero.service.ts`) es **cache-first** y usa **`getSession()` (local)** en lugar de `getUser()` (remoto). **No cachea `null`**, para no bloquear a un usuario cuya cuenta se vincule después. `getServicios()` (`turnos.service.ts`) también es cache-first. Sin cambios de firma ni de mensajes de error para los consumidores.
   - **Detección de expiración — RESUELTA, con una corrección importante.** El diseño original tenía dos mitades: una proactiva (comparar `expires_at`) y una reactiva (primer error de auth en la query). **La verificación independiente demostró que la proactiva es CÓDIGO MUERTO:** `getSession()` ya intenta refrescar cuando la sesión expiró y solo devuelve `session: null` si el refresh **falló** (`GoTrueClient.js:2341-2373`, márgen de 90 s), así que nunca devuelve una sesión expirada. Esa rama se **eliminó**. **El mecanismo real, y el único, es:** Supabase emite `SIGNED_OUT` cuando el refresh falla → el redirect del root layout manda a `/login`. La mitad reactiva (`isAuthError` sobre la query) sí es alcanzable y se conservó.
   - **🔴 FUGA ENTRE USUARIOS DETECTADA Y CORREGIDA (CRITICAL).** La caché se limpiaba **solo** en `authService.signOut`. Cualquier transición de sesión que no pasara por ahí —y en particular los `SIGNED_OUT` que emite Supabase por su cuenta al fallar el refresh, y el propio `signOutSilently()`— **dejaba la caché con el barbero del usuario anterior**. Como `getBarbero()` devuelve cache hit sin consultar, **el siguiente usuario que iniciara sesión veía los turnos, nombres y teléfonos del anterior** (las queries se scopean por `barbero.id`). Antes del cambio esto era imposible porque siempre se re-consultaba con el usuario actual. **Fix aplicado:** limpiar la caché en el único punto que cubre TODOS los caminos, `onAuthStateChange` de `src/hooks/useAuth.ts`, ante `SIGNED_OUT` y `SIGNED_IN`. El `clearSessionData()` de `authService.signOut` se mantuvo como redundancia.
   - **El paso 3 original del smoke test ya NO existe:** la rama "Sesión expirada" en `nuevo.tsx` era código muerto y se eliminó en la Fase 1. Lo que este cambio debe garantizar es que una sesión revocada siga terminando en `/login` — y eso ahora pasa exclusivamente por `SIGNED_OUT` → root layout.
   - **Conteo de llamadas de red — ANÁLISIS ESTÁTICO, no medición.** Medir requests reales necesita un navegador con DevTools, que no se ejecutó. Por análisis estático: Home pase de **~5 requests a 2** (`getUser()` remoto ×2 + SELECT `Barbero` ×2 + `Turno` ×1 → `Barbero` ×1 + `Turno` ×1); la agenda de **~6 a ~3**. `getServicios()` pasa a 0 red en llamadas sucesivas. **No reportar esto como medido.**
   - ⚠️ **Limitación conocida (WARNING, no corregida):** si la query devuelve un error de auth y el `signOutSilently()` posterior **falla** (sin red), no se emite `SIGNED_OUT`, el root layout no redirige, y el usuario queda varado con el mensaje equivocado *"Tu cuenta no está vinculada a ninguna barbería"*. Alcanzabilidad baja (requiere error de auth en cache miss **y** caída de red), pero es real.
2. **H7 — acotar `getTurnos()` (SOBREVIVE) — ✅ IMPLEMENTADO.**
   - `getTurnos()` acepta `opts?: { desde?: Date; hasta?: Date; limit?: number }` y aplica `.gte/.lte/.limit`. Reusa **`normalizeDateBounds`**, que emite el string local-naive correcto (`- tzOffset` + `.slice(0,-1)`). **Nada de ISO UTC**: en Argentina (UTC−3) eso habría corrido la ventana un día.
   - **Agenda:** pasa la ventana completa de la tira — `[dias[0], dias[último]]` de `buildDayRange()` = **hoy−5 … hoy+10** (16 días). La agenda filtra por día en memoria sobre ese conjunto acotado, así que la ventana tiene que cubrir **toda** la tira, no un día.
   - **Home:** pasa solo un límite inferior y **mantiene UNA sola query** (respetando el criterio 5.2 de ≤ 3 requests). Se acota a `ULTIMO_TURNO_LOOKBACK_DIAS = 30`.
   - ⚠️ **Cambio de producto a confirmar:** si un barbero no tiene turnos no cancelados en los últimos 30 días, la tarjeta **"Último turno" ahora aparece vacía** donde antes mostraba el más reciente de todo el historial. Es deliberado y está en una constante comentada, pero es visible en demo. Si no se acepta, hay que cambiar la constante o el criterio.
   - Cumple el objetivo: ya no se ordena el historial completo en memoria, y la carga deja de crecer sin límite con las reservas.
3. **H8 — eliminar doble fetch de agenda (SOBREVIVE) — ✅ IMPLEMENTADO (con un desvío deliberado).**
   - Se **borró el `useEffect` de montaje** de `src/app/(tabs)/turnos/index.tsx`; `useFocusEffect` cubre el primer montaje. Verificado por grep: solo queda el efecto de foco.
   - **DESVÍO: NO se agregó el guard de frescura (TTL) que pedía este paso.** Un guard por tiempo cambia correctitud por una request ahorrada: si el usuario crea o cancela un turno y vuelve a la agenda dentro del TTL, vería datos viejos — un bug visible en demo, peor que un fetch de más. Con H7 la consulta ya está acotada y con H6 `getBarbero()` es gratis, así que el refetch por foco es barato. **Se prefirió frescura.**
   - **🔴 Regresión introducida y corregida (WARNING):** al mover la carga al efecto de foco, se puso `setLoading(true)` **dentro** de `loadTurnos`. Como el render cambia la lista entera por un `<ActivityIndicator>` cuando `loading` es true, **cada regreso desde el detalle mostraba un spinner en lugar de la lista**, y el pull-to-refresh mostraba **doble spinner** (el `RefreshControl` + el de pantalla completa). No existía antes, porque `loading` solo se tocaba en el montaje. **Corregido:** se quitó el `setLoading(true)` — el estado inicial ya es `true` y el `finally` lo baja, que es exactamente el patrón de la Home tras la Fase 1.
4. **H9 — guard de race en disponibilidad (SOBREVIVE) — ✅ IMPLEMENTADO.**
   - Se agregó el patrón `mounted` (por ejecución del efecto) en los efectos de `nuevo.tsx` y `ModificarTurnoModal.tsx` que cargan disponibilidad. **El guard de race funciona a través de `mounted`:** cuando `selectedDate` cambia, React corre el cleanup anterior (`mounted = false`) antes de arrancar el nuevo efecto, así que la respuesta vieja se descarta sola. Verificado por un revisor independiente.
   - **Código muerto eliminado (SUGGESTION):** se había agregado además un token por fecha (`requestDateKey`). **Es inefectivo:** dentro del closure del efecto, `selectedDate` es la misma referencia congelada de la que se calculó `requestDateKey`, así que `dateKey(selectedDate) !== requestDateKey` es **siempre falso** y el chequeo nunca se dispara. Se eliminó junto con los imports de `dateKey` que había introducido, para no dejar una falsa sensación de protección. Se dejó un comentario explicando qué protege realmente.
   - ⚠️ **`limit` quedó sin consumidores.** La firma lo soporta pero ningún llamador lo usa. Es API especulativa; si no se va a necesitar, conviene quitarlo.
5. **H11 — errores (H11a SOBREVIVE / H11b SE DESCARTA).**
   - H11a: distinguir el error de auth de "cuenta no vinculada" y no reemplazar errores reales de Supabase por strings genéricos (`barbero.service.ts:21`, `turnos.service.ts`).
   - H11b: el surfacing en pantallas que se reescriben NO se hace ahora; la UI nueva nace con el patrón correcto de `turnos/index.tsx:55-57`.
6. **H12 — paralelizar (SOBREVIVE).** `Promise.all` en `(tabs)/index.tsx:226-227`, en `updateTurno` y en `createAppointment`.
7. **H13 + H14 (SOBREVIVE).** Usar la fila devuelta por `updateTurno`; reemplazar `SELECT *`; devolver `Set<string>` desde `computeOccupiedSlots` y actualizar los 2 consumidores.

**Hecho cuando:** el primer render de Home hace ≤ 3 requests (sesión local + 1 SELECT de `Barbero` + 1 query de `Turno`), `getBarbero()` no repite red dentro de la sesión, la agenda monta con 1 sola consulta de turnos, y tocar días rápido nunca muestra slots del día equivocado.

**Estado de Fase 3 al 2026-09-20:** ✅ **H6, H7, H8, H9 y H10 implementados.** Criterios duros: Home hace **1 query de `Turno`** acotada a 30 días + 1 `Barbero` (y 0 red en llamadas siguientes por la caché) → cumple ≤ 3; la agenda monta con **1 sola consulta** (el doble fetch se eliminó) acotada a la ventana de 16 días de la tira; el race de días quedó cubierto por el patrón `mounted`. Gates: `npx tsc --noEmit` 0 errores · `npm run lint` 0 errores / 9 warnings · `npm run build:web` exit 0 (1 `.ttf` / 389.724 B, sin regresión de bundle). **Pendiente:** confirmar el cambio de producto de los 30 días, y el smoke test en navegador. **El conteo de requests sigue siendo análisis estático, no medición.**

### Fase 4 — Render (H24-H28) (pendiente, mayormente SE DESCARTA)

**Recomendación: saltar esta fase completa**, con una excepción consciente.

- **H26 (SE DESCARTA; excepción consciente opcional):** el `useMemo` roto de `excepciones.tsx:159-162` es micro-performance sobre una pantalla que se reescribe, así que por la definición del bucket corresponde SE DESCARTA. El arreglo es de ~10 minutos, así que hacerlo es aceptable, pero se registra como una **excepción CONSCIENTE a la clasificación**, no como una inconsistencia de ella.
- **H24, H25, H27, H28, H29: NO hacer.** `React.memo` en componentes por borrar (H24/H25), `key={idx}` y rebuilds en un modal por reescribir (H27), consolidar matemática duplicada (H28) y pulido de foco/accesibilidad (H29) se descartan por decisión. El único sub-item barato y seguro es leer `SLOT_STEP_MINUTES` en lugar del `30` literal en `TimeSlotGrid.tsx:37` y `excepciones.tsx:101`, si se toca ese archivo por otro motivo.
- **Ancho de login (`login.tsx:140-142`): detalle SOLO de escritorio y de BAJA prioridad.** El viewport primario es un teléfono (iPhone/WebKit, ~390 px), así que esto NO es una preocupación de demo.

**Hecho cuando:** el documento deja constancia de que H26, H24, H25, H27, H28 y H29 se descartan por la migración de UI (con H26 marcado como excepción consciente opcional).

### Fase 5 — Gates de calidad (H15-H19, H22) (pendiente, FUERA de la ruta crítica)

**Advertencia de costo no acotado:** habilitar `react-hooks/exhaustive-deps` y `noUncheckedIndexedAccess` puede producir decenas de errores en código que está por reescribirse, y "corregirlos" no tiene techo de tiempo. Por eso: `exhaustive-deps` y los flags estrictos de `tsconfig` entran como **`warn`** o quedan **postergados**. Solo el `typecheck` de una línea y el cableado de CI se pueden agregar ya.

1. **H15:** agregar `"typecheck": "tsc --noEmit"` a `package.json`. Este script es barato y **se puede colar temprano** (ver sección 7). El workflow de CI puede agregarse ahora, pero **no pertenece a la ruta crítica de la demo**.
2. **H16:** instalar `eslint-plugin-react-hooks` y registrarlo, pero habilitar `exhaustive-deps` como **`warn`** (no como error bloqueante). Corregir el caso de `src/app/_layout.tsx:12-22` solo si es trivial; el resto queda como warning para la UI nueva.
3. **H17:** aplicar reglas de `eslint-plugin-react-native` o eliminar la dependencia no-op.
4. **H18:** declarar `@eslint/js` en `package.json` (o importar de otra fuente declarada).
5. **H19:** borrar `.eslintrc.cjs`.
6. **H22:** `noUncheckedIndexedAccess` y los flags de rigor quedan **postergados** (o se activan como no bloqueantes) hasta después de la demo, por el costo no acotado sobre código que se reescribe.

**Hecho cuando:** `npx tsc --noEmit` corre limpio sobre el baseline y `npm run lint` no tiene errores nuevos; los flags estrictos y `exhaustive-deps` quedan documentados como `warn`/postergados.

### Fase 6 — Higiene (H20, H21, H23, H30a) (pendiente)

1. **H20:** ajustar `.gitignore` para no ignorar `docs/` completo; trackear los 4 documentos listados; borrar la ruta Windows muerta de `.gitignore:47`. Confirmar que `.env` sigue ignorado.
2. **H21:** borrar o ignorar `audit-report.json` y correr una auditoría contra el lockfile real (Expo 54.0.37).
3. **H23:** eliminar `expo-status-bar` de `dependencies`.
4. **H30a:** borrar el código muerto y los assets sin referenciar listados en H30a. NO unificar tokens (H30b es SE DESCARTA).

**Hecho cuando:** `git status` no muestra documentación valiosa por fuera, no existe `audit-report.json` desactualizado en el árbol de trabajo, y `grep` no encuentra imports de los archivos muertos eliminados.

---

## 5. Verificación obligatoria antes de declarar la salida a web

Los criterios son numéricos y reproducibles. Se comparan contra la línea base de Fase 0.

### 5.1 Bundle

| Métrica | Baseline (Fase 0) | Logrado tras H4 (2026-09-20) | Criterio de aceptación |
|---|---|---|---|
| Archivos `.ttf` en el export | 19 | **1** ✅ | **Duro:** 1 (Ionicons) o 0 |
| Payload de fuentes | 4.076.840 B | **389.724 B** ✅ | **Duro:** ≤ 389.724 B (solo Ionicons) o 0 |
| **Costo real sobre la red** (JS gzip + `index.html` gzip) | 508.864 B (~496 KB) | **375.635 B (~367 KB)** ✅ | **Duro:** estrictamente menor que 508.864 B |
| JS entry gzip (−6) | 508.210 B | **374.979 B** ✅ | **Duro:** < 508.210 B · **objetivo ≤ 350.000 B: NO alcanzado** (requiere H5) |
| JS entry raw | 1.831.380 B | **1.406.740 B** | Informativo: no es criterio |
| Chunk gzip más grande | 508.210 B (único chunk) | **374.979 B** (único chunk) | Informativo: ≤ 300.000 B solo si se logra splitting |
| `dist/` total | 5.944.256 B | **1.832.500 B** | **Blando/informativo** (ver nota) |

**Nota sobre el total de `dist/`:** el criterio histórico (`≤ 1.500.000 B`) sigue sin alcanzarse (medido **1.832.500 B** tras H4), pero la estimación previa del "piso" (**~2.221.104 B**) quedó **INVALIDADA por la medición**: esa cuenta asumía que el JS del barrel se mantenía, y no es así — el barrel también empaquetaba el glyphMap y los metadatos de cada familia en el JS. Por eso el entry raw cayó de 1.831.380 a 1.406.740 B, muy por debajo del supuesto piso. Lo que se sirve por la red es el artefacto comprimido — medido: **375.635 B (~367 KB)**. Los criterios DUROS son el payload de fuentes y el gzip del entry.

Comandos: `du -b`, `find dist -name '*.ttf' | wc -l`, `gzip -c <entry> | wc -c`, `du -sb dist`. Los objetivos informativos de chunk se revisan tras la medición del artefacto desplegado en Fase 0 si el splitting no es viable sin cambiar el bundler.

### 5.2 Datos y red

- Primer render de Home: **≤ 3 requests** de datos (sesión local + 1 SELECT de `Barbero` + 1 consulta de `Turno`). Baseline: ~5-6.
- `getBarbero()` por sesión: **1 round-trip de red**, luego 0 (caché).
- Primer montaje de la agenda: **1 sola consulta** de turnos (baseline: dos).
- `getTurnos()`: la query lleva ventana de fechas o `.limit()` verificable en el SQL emitido.
- Tocar 5 días rápido en `nuevo.tsx`: los slots mostrados siempre corresponden al último día seleccionado.

### 5.3 Tiempo percibido (medido, no inferido)

Los criterios de bytes y requests no miden lo que el cliente siente. Criterio adicional: **la Home muestra datos reales en menos de N segundos** (a fijar tras el profiling de Fase 0, sugerido N = 2 s) en un perfil capado (Fast 4G, CPU 4x slowdown) en **WebKit**. Se mide con el panel Performance o Lighthouse, en el mismo perfil que produjo la línea base.

### 5.4 Gates

- `npx tsc --noEmit` → sin errores.
- `npm run lint` → sin errores.
- El workflow de CI corre typecheck + lint y pasa.

### 5.5 Smoke test manual en navegador (obligatorio)

**El cliente usa un iPhone. El navegador obligatorio es WebKit (Safari) con un viewport de ~390 px.** Desktop/Chrome es opcional, no primario: sirve como segunda opinión, no como criterio de aprobación.

1. Login con credenciales válidas → entra a `(tabs)`.
2. Login con credenciales inválidas → muestra el error en pantalla (no debe depender de `Alert.alert`).
3. Sesión expirada: expirar o revocar la sesión y llegar a `nuevo.tsx` → **NO** aparece ningún modal "Sesión expirada" (esa rama se eliminó en la Fase 1 por ser código muerto). Lo que debe ocurrir es que la app termine en `/login` por el redirect del root layout cuando Supabase emite `SIGNED_OUT`, y que **no** quede mostrando el mensaje equivocado "cuenta no vinculada". **Paso rediseñado: ejecutarlo después de H6 (ver H6 y H11a).**
4. Crear un turno completo (servicio, día, hora, cliente) → confirmación visible.
5. Volver a Home → el turno recién creado aparece SIN recargar la página.
6. Cancelar ese turno desde el detalle → confirmación visible.
7. Volver a Home → el turno cancelado ya no aparece entre los próximos.
8. Abrir el detalle de un turno con teléfono → "Contactar por wsp" abre WhatsApp o el botón no existe.
9. Guardar excepciones (`excepciones.tsx`) → el bloqueo persiste al recargar.
10. Guardar horario habitual (`horario.tsx`) → persiste al recargar.
11. Alternar entre tabs 5 veces → no hay refetch de `Barbero`/`Servicio` por navegación.

**Ninguna fase se declara terminada sin este smoke test corriendo en WebKit (Safari) con viewport de ~390 px.**

### 5.6 Verificación específica de iOS Safari (WebKit, ~390 px)

Puntos que NO deben asumirse: hay que probarlos en el dispositivo o en el navegador real. Se separa lo ya verificado en el repo de lo que falta verificar en WebKit.

- **Auto-zoom de iOS Safari en inputs con `font-size` menor a 16px:** iOS Safari hace zoom al enfocar un input cuya tipografía sea menor a 16px. Verificado en el repo: el input de login (`src/app/login.tsx:150-160`, `styles.input`) es de **16px**, así que está bien; los tamaños de 14px de ese archivo (`errorText`/`footerText`) no son inputs. **Resultado de la auditoría de todos los `TextInput`:** los tres de `src/app/(tabs)/turnos/confirmar.tsx:187,200,213` usan `styles.input` a **16px** (bien); el input de nota de `src/app/(tabs)/perfil/excepciones.tsx:352-353` (`styles.notaInput`) es de **14.5px**, por debajo del umbral → **candidato real a auto-zoom, hay que probarlo y subirlo a 16px si ocurre.** No quedan otros inputs por revisar.
- **`100vh` y la barra de direcciones de Safari:** verificado que NO hay ningún `100vh` en el código (solo `width: '100%'`), así que no se conoce problema acá.
- **Safe areas:** verificado que está RESUELTO. `src/components/ui/Screen.tsx:3,11` usa `SafeAreaView` con todos los edges y `src/app/(tabs)/_layout.tsx:5,22` usa `useSafeAreaInsets`. **No reportarlo como brecha.**
- **Teclado que tapa formularios:** `KeyboardAvoidingView` se usa en `src/app/login.tsx:67`, `src/app/(tabs)/turnos/confirmar.tsx:137` y `src/app/(tabs)/perfil/excepciones.tsx:231` con `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`. En web `Platform.OS` es `'web'`, así que `behavior` queda `undefined` y el componente es inerte: en iOS Safari **el teclado PUEDE tapar el formulario**. Riesgo real a probar.
- **Login a ancho completo en escritorio:** al ser el teléfono el viewport primario, esto pasa a ser un detalle SOLO de escritorio y de baja prioridad, no una preocupación de demo.
- **`@react-native-picker/picker` — ahora SÍ es crítico para la demo.** El paquete (`2.11.1`) se usa únicamente a través de `src/components/horario/DaySelectField.tsx`, y ese componente se usa en un solo lugar: `src/app/(tabs)/perfil/excepciones.tsx:250`. Con el alcance de demo actual —todos los flujos— esa pantalla se muestra, así que el picker deja de ser un detalle periférico. En web el paquete renderiza un `<select>` nativo, pero su estilado está limitado por el navegador y el borde/`wrap` propio de `DaySelectField.tsx:76-85` es lo único que sostiene la apariencia. **Hay que probarlo en WebKit antes de la demo** y, si se ve mal o no responde, reemplazarlo por una lista de opciones propia: es el único uso del paquete en todo el proyecto, así que eliminarlo es barato.
- **Modales que no cierran con Escape:** los cuatro `Modal` de React Native (`src/components/ui/ConfirmModal.tsx:26`, `AlertModal.tsx:34`, `ModificarTurnoModal.tsx:171`, `src/app/(tabs)/turnos/confirmar.tsx:273`) no pasan `onRequestClose`. En un iPhone no hay tecla Escape, así que **deja de ser un problema en el target real**; solo importa si además se prueba en escritorio.

---

## 6. Decisiones abiertas

| # | Decisión | Estado |
|---|---|---|
| 1 | `showAlert()` chico vs adoptar `AlertModal` directo en los 10 sitios | **RESUELTA en Fase 1 (2026-09-20):** se adoptó `showAlert()` chico sobre `AlertModal`, con store de Zustand y `AlertHost` global en `_layout.tsx`. El único sitio con callback resultó código muerto y se eliminó, así que `ConfirmModal` no hizo falta. |
| 2 | Migrar iconos a SVG ahora o dejar el import directo de `Ionicons` | Abierta; recomendación: import directo ahora, SVG en la UI nueva |
| 3 | `web.output` (modo de export) — decisión SEPARADA del code splitting | Abierta; verificar chunking por ruta en la doc de Expo para este SDK y resolverla CON quien despliega (ver H5) |
| 4 | Borrar vs implementar el botón "Contactar por wsp" | Abierta; depende de si el teléfono del cliente está disponible en el detalle |
| 5 | Guion de demo: qué pantallas y flujos verá el cliente | Decisión del equipo CON el dueño; hasta que exista, el orden de fases es provisional |
| 6 | `Cliente.telefono` `numeric` vs `text` | Postergada: es una migración de schema, fuera del alcance de la demo (ver H33) |
| 7 | Alcance del smoke test (Chrome vs WebKit) | **Resuelta:** WebKit (Safari) ~390 px es obligatorio; desktop/Chrome opcional (sección 5.5) |

---

## 7. Orden recomendado de ejecución

1. **Fase 0** — línea base, tipos regenerados, seed, guion de demo y profiling.
2. **Fase 1** — desbloquear web (H1, H2, H3). **Ejecutar sin interrupción.**
3. **H4** — una sola familia de iconos (import directo de `Ionicons`).
4. **Fase 3 parcial** — solo H6/H10 (caché y barbero), que es lo que reduce las requests visibles.
5. **Resto de Fase 3** — H7, H8, H9, H11a, H12, H13, H14.
6. **`typecheck` de una línea** — `"typecheck": "tsc --noEmit"`; se puede colar temprano porque es barato.
7. **Fase 6** — higiene (H20, H21, H23, H30a).
8. **Fase 2 (H5)** — code splitting, solo tras medir el artefacto desplegado y fuera de la ruta crítica.
9. **Fase 5** — gates (H15-H19, H22): CI y lint de hooks van DESPUÉS de la performance, como `warn`/postergados.
10. **Fase 4** — solo la excepción consciente de H26; el resto se descarta.

**Justificación del reorden:** el orden mínimo para entregar es **Fase 1 → H4 (iconos) → Fase 3 parcial (solo H6/H10 — caché y barbero)**; recién después el resto. Los gates se mueven DESPUÉS de la performance porque un cliente que espera no ve un `typecheck` ni un CI: ve si la pantalla carga y responde. El script `typecheck` de una línea es tan barato que se puede colar temprano, pero el CI y el trabajo del plugin de lint NO pertenecen a la ruta crítica de la demo. H4 va antes que el resto de la performance porque elimina ~3,5 MB de fuentes del build con riesgo bajo y es visible (ejecutado 2026-09-20: −3.687.116 B de fuentes y −133.231 B de gzip del entry). Y el total de `dist/` no ordena nada: mandan el gzip del entry y el payload de fuentes.

---

## 8. Criterio final de aprobación

La app se declara lista para entregar en web solo cuando:

- los 9 sitios de `Alert.alert` que quedan muestran feedback real en navegador (el décimo era código muerto y se eliminó; el redirect por sesión expirada lo cubre el root layout, ver H1);
- la Home refleja crear y cancelar un turno sin recarga manual;
- no queda ningún botón visible sin acción;
- la sesión expirada SIGUE terminando en `/login` después de H6, no solo antes (ver H6) — y deja de mostrarse como "cuenta no vinculada" (H11a);
- el export web contiene una sola familia de fuentes (o ninguna): payload de fuentes ≤ 389.724 B o 0 — **✅ cumplido: 1 fuente, 389.724 B exactos** —, y el costo real de carga inicial por la red estrictamente menor que 508.864 B medidos — **✅ cumplido: 375.635 B** (objetivo: gzip del entry ≤ 350.000 B → **no alcanzado**, quedó en 374.979 B; requiere H5);
- el primer render de Home hace ≤ 3 requests de datos y `getBarbero()` no repite red dentro de la sesión;
- la Home muestra datos reales por debajo del umbral de tiempo percibido fijado en 5.3, en WebKit con perfil capado;
- la disponibilidad por día nunca muestra datos de otro día bajo taps rápidos;
- `src/types/database.types.ts` está regenerado desde el schema en vivo y commiteado (H31);
- `npx tsc --noEmit` corre limpio y `npm run lint` no tiene errores nuevos;
- el smoke test de la sección 5.5 pasa completo en WebKit (Safari) a ~390 px, incluida la verificación de 5.6;
- queda documentado, sin ambigüedad, qué se descartó (H24, H25, H26 —excepción consciente opcional—, H27, H28, H29, H30b, H11b) y por qué.

---

## 9. Referencias

- `AGENTS.md` — modelo de datos, pitfalls de timezone y comandos del repo.
- `plan_seguridad.md` — plantilla y registro del estado de la base (RLS, RPC `crear_turno`).
- `plan_migracion_ui.md` — plan de UI nueva que consume los entregables SOBREVIVE de este documento.
- `plan_web_publica.md` — frontera de la web pública de clientes (fuera de alcance).
- `app.config.ts`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore` — configuración afectada.
- `src/services/barbero.service.ts`, `src/services/turnos.service.ts`, `src/services/bloqueos.service.ts` — capa de datos.
- `src/lib/availability.ts` — matemática de slots y disponibilidad.
- `src/types/database.types.ts` — contrato de tipos, hoy desactualizado respecto del schema real (H31).
- `docs/seed-barberia.sql` — referencia del seed manual; el seed de demo (H32) corre en el SQL Editor de Supabase.
- `src/components/ui/AlertModal.tsx`, `ConfirmModal.tsx` — modales que sí funcionan en web (`AlertModal` alcanza; ver H1).
- `dist/` — artefacto de export web usado para las mediciones.
