# App de Gestión de Turnos para Barbería — Especificación (MVP)

> **v2 — 19/08/2026.** Tras mostrar la demo, el dueño de la barbería manifestó interés en sumar varios barberos a un mismo local. Esto pasa el proyecto de un modelo "1 barbero = 1 negocio" a un modelo **multi-tenant real**: una Barbería (negocio) con varios Barberos trabajando dentro. Las secciones 3, 4, 5, 7, 8 y 9 fueron actualizadas para reflejar esta decisión. El resto del documento (contexto, objetivo, flujo de reserva) se mantiene sin cambios de fondo.

## 1. Contexto y problema actual

El barbero gestiona su negocio hoy con dos herramientas no integradas:

- **WhatsApp**: canal de comunicación con clientes y también canal de reserva de turnos. El barbero debe estar disponible ~24/7 respondiendo disponibilidad horaria, costos y confirmando reservas. También se toman turnos de forma presencial en el local.
- **Excel**: agenda manual donde el barbero carga los turnos reservados, consulta horarios libres, y visualiza horario/servicio/costo de los próximos turnos.

Problema: proceso manual, dependiente de la disponibilidad constante del barbero, sin fuente única de verdad, no escalable a más de un barbero.

## 2. Objetivo del MVP

1. Reemplazar el Excel con una **app Android** que el barbero usa para administrar su agenda.
2. Reducir la dependencia de WhatsApp como canal de reserva, migrando la mayoría de las reservas a una **web pública sin registro**, verificando la identidad del cliente por email (modelo Fresha).
3. WhatsApp se mantiene como canal alternativo (no se elimina en este MVP), pero el objetivo de mediano plazo es que la mayoría de las reservas se hagan por la web.

## 3. Actores

| Actor | Medio | Rol |
|---|---|---|
| Admin (dueño de la barbería) | Manual por ahora (sin UI propia) — ver sección 4 | Da de alta barberos, configura datos generales del local |
| Barbero | App Android | Administra su propia agenda, sus servicios/precios, sus horarios y bloqueos |
| Cliente | Web pública (sin login) / WhatsApp / presencial | Reserva, consulta disponibilidad y costos |

> Nota: un mismo local (Barbería) puede tener varios Barberos. El Admin es el dueño del local, no necesariamente atiende clientes él mismo.

## 4. Modelo de cuentas

- El tenant de aislamiento pasa a ser la **Barbería** (el negocio), no el barbero individual. Una Barbería puede tener uno o varios Barberos.
- Cada **Barbero = una cuenta** en Supabase, vinculada a la Barbería a la que pertenece.
- El barbero provee su email; el equipo crea la cuenta manualmente (no hay self-signup en este MVP), igual que en la v1.
- Cada barbero solo puede ver y administrar **sus propios** turnos, servicios y horarios (aislamiento por cuenta / RLS).
- Los **clientes** (`Cliente`) son de la Barbería, no del barbero puntual: si un cliente reserva con distintos barberos del mismo local, se lo reconoce como un único cliente del local (historial compartido).
- El **Admin** (dueño de la Barbería) todavía no tiene login ni UI propia. Mientras el proyecto esté en esta etapa (piloto de 1 barbero), las altas de barberos y la configuración general del local las realiza el equipo de desarrollo directamente en Supabase (misma lógica manual que ya se usaba para las cuentas de barbero en la v1). El modelo de datos ya deja preparado el campo `admin_user_id` en `Barberia` para cuando exista ese login, pero no se lo usa todavía.
- Es un modelo **multi-tenant en dos niveles**: Barbería (tenant) → Barberos (usuarios dentro del tenant), aunque el onboarding de ambos siga siendo manual por ahora.

## 5. Alcance funcional

### 5.1 App Android (barbero) — reemplazo del Excel

Funcionalidades núcleo:
- Agregar turnos manualmente (ej. reservas que llegan por WhatsApp o presenciales).
- Ver agenda: horarios ocupados y libres.
- Ver detalle de cada turno: horario, tipo de servicio, costo.
- Cancelar turnos.
- Modificar turnos (horario, servicio, etc.).

Funcionalidades de configuración (más ambiciosas, dentro del alcance del MVP pero de mayor complejidad):
- Modificar la duración de los turnos/servicios (propios del barbero).
- Configurar **patrón semanal recurrente**: días hábiles fijos y horario de apertura/cierre del barbero (ej. "no trabajo los jueves"). Vive en la propia tabla `Barbero`, no requiere carga repetida.
- Bloquear **excepciones puntuales** sobre ese patrón: una franja horaria específica o un día completo (ej. "este viernes 16 a 18 no puedo", "esta semana estoy de vacaciones"). Se modela en `BloqueoHorario`, ligada a una fecha concreta.

> Nota: no hay registro/pago con seña. No está planeado tomar seña en este MVP.
> Nota: manejo de sobreturnos (permitir reservar por encima de la disponibilidad calculada) queda **fuera de esta etapa**, se define más adelante.

### 5.2 Web pública (cliente) — reemplazo parcial de WhatsApp como canal de reserva

- Sin necesidad de crear cuenta ni loguearse.
- El cliente puede ver disponibilidad horaria, servicios y costos del barbero.
- Selecciona un turno disponible.
- Para confirmar la reserva, se sigue el modelo de **Fresha**: se envía un **código de verificación al email** del cliente, y al ingresarlo se concluye la reserva.
- Al confirmarse, el turno queda reflejado automáticamente en la agenda del barbero (visible desde la app Android).

### 5.3 WhatsApp (canal existente, se mantiene)

- Sigue siendo un canal válido de reserva y comunicación.
- Los turnos que entran por WhatsApp o presencial se cargan manualmente por el barbero desde la app Android (ver 5.1).

### 5.4 Gestión del Admin (dueño de la barbería)

- Sin UI propia en este MVP (ver sección 4). El alta de barberos y la configuración del local (nombre, datos generales) se hacen manualmente por el equipo de desarrollo en Supabase.
- Cuando exista volumen suficiente de barberías como para justificar el esfuerzo, se evaluará un panel web liviano y separado, tanto de la web pública de reservas como de la app Android — no antes.

## 6. Flujo de reserva web (estilo Fresha)

1. El cliente entra a la web del barbero.
2. Ve servicios disponibles, costos y horarios libres.
3. Selecciona un turno (servicio + horario).
4. Ingresa su email.
5. Recibe un código de verificación por email.
6. Ingresa el código → se confirma la reserva.
7. El turno queda bloqueado en la agenda y visible en la app Android del barbero.

## 7. Modelo de datos preliminar (a validar con el equipo de desarrollo)

> Actualizado en v2: se separa el negocio (`Barberia`) de la persona que atiende (`Barbero`), y se define a qué nivel cuelga cada entidad.

- **Barberia**: id, nombre, admin_user_id (sin uso todavía, ver 5.4), horario_apertura, horario_cierre, dias_habiles — estos últimos tres a nivel local, si aplica; el horario específico de cada barbero vive en `Barbero`.
- **Barbero** (antes nombrada como el negocio en la v1): id, barberia_id (FK a Barberia), users_id (auth.uid()), nombre, dias_habiles, hora_apertura, hora_cierre.
- **Servicio**: id, barbero_id (FK a Barbero — **cada barbero define sus propios servicios y precios**), nombre, duración, costo.
- **Cliente**: id, barberia_id (FK a Barberia — **compartido entre todos los barberos del local**, no por barbero individual), nombre, email, teléfono.
- **Turno**: id, barbero_id (FK a Barbero), servicio_id (FK a Servicio), cliente_id (FK a Cliente), fecha, hora_inicio, hora_fin, estado (confirmado/cancelado), origen (web / whatsapp / presencial).
- **BloqueoHorario**: id, barbero_id (FK a Barbero), fecha, hora_inicio, hora_fin (null en ambos = día completo), motivo.
- **CodigoVerificacion**: id, email, código, turno_asociado, expiración, usado (bool).

### Aislamiento de datos (RLS)

- **Barbero**: solo ve/edita su propia fila (`users_id = auth.uid()`). Sin policy de `insert` para `authenticated` — las altas las hace el equipo de desarrollo con la service role key (ver sección 4).
- **Servicio** y **BloqueoHorario**: lectura pública donde aplica (Servicio), escritura restringida al barbero dueño (`barbero_id` → `Barbero.users_id = auth.uid()`).
- **Cliente**: cualquier barbero de la misma `barberia_id` puede ver/gestionar los clientes del local (no está restringido al barbero que lo atendió puntualmente).
- **Turno**: restringido al barbero dueño (`barbero_id` → `Barbero.users_id = auth.uid()`).
- **Acceso público (cliente sin login)**: nunca hace `select`/`insert` directo sobre `Turno`, `Cliente` ni `BloqueoHorario` (expondría datos de otros clientes o permitiría reservas falsas / condiciones de carrera). El flujo de reserva y consulta de disponibilidad pasa por funciones `security definer` en Postgres, que exponen únicamente lo necesario (ej. horarios libres) sin dar acceso crudo a las tablas.

## 8. Decisiones técnicas tomadas

- **Backend / DB**: Supabase (Auth + Postgres).
- **Autenticación**: una cuenta Supabase por **barbero** (no por barbería), creada manualmente por el equipo a partir del email que provee el barbero.
- **Modelo de tenant**: la unidad de aislamiento pasa a ser la **Barbería**; dentro de ella pueden convivir varios Barberos, cada uno con acceso propio a sus turnos/servicios, y todos compartiendo la base de `Cliente` del local.
- **Admin**: sin cuenta ni login en esta etapa. Gestión manual vía Supabase (service role key) por parte del equipo de desarrollo.
- **Reservas públicas (sin login)**: no se resuelven con policies de `insert`/`select` abiertas a `anon`. Se exponen mediante funciones `security definer`, que orquestan la lógica (chequeo de disponibilidad, creación de `Cliente`, envío y validación de `CodigoVerificacion`, creación de `Turno`) sin dar acceso directo a las tablas subyacentes.

## 9. Preguntas abiertas / a definir con el equipo

Resueltas en v2 (se dejan tachadas para trazabilidad, no se borran):
- ~~¿Cada barbero tiene login propio o solo el admin?~~ → Cada barbero tiene login propio.
- ~~¿Dónde gestiona el admin altas de barberos y horarios?~~ → Manual por Supabase mientras dure el piloto; panel propio se evalúa más adelante.
- ~~¿Servicios y clientes son del negocio o del barbero?~~ → Servicios por barbero, clientes por barbería (compartidos).

Siguen abiertas:
- Stack de la app Android: ¿nativa (Kotlin) o multiplataforma (Flutter/React Native)?
- Stack de la web pública: framework a definir.
- **Ahora que hay varios barberos por local**: ¿la web pública muestra un selector de barbero dentro del mismo local, o cada barbero tiene su propia URL/página?
- ¿La web es un directorio/marketplace con varias barberías, o una página por barbería?
- ¿Notificaciones al barbero (push) cuando llega una nueva reserva desde la web?
- ¿Recordatorios de turno al cliente (email/WhatsApp) antes del horario reservado?
- ¿Puede el cliente cancelar o reprogramar su turno desde la web sin intervención del barbero?
- Manejo de zona horaria y feriados.
- Expiración del código de verificación (minutos) y reintentos permitidos.
- Política ante reservas simultáneas sobre el mismo horario (condición de carrera).
- Manejo de sobreturnos (no prioritario por ahora, ver sección 5.1).
- Cuándo y cómo se construye el panel de Admin (ver sección 5.4), una vez validado el piloto.

## 10. Fuera de alcance en este MVP

- Cobro de seña o pago online.
- Registro/login de clientes.
- Reemplazo total de WhatsApp como canal.
- Panel/UI propia para el Admin (gestión manual vía Supabase mientras dure el piloto, ver sección 5.4).
- Manejo de sobreturnos.
