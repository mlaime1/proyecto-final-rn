# Resumen: estructura de la base y RLS activas

## 1. Tablas y relaciones

```
Barberia (el negocio/local)
   ↑ barberia_id
Barbero (persona que atiende, 1 cuenta = 1 barbero)
   ↑ barbero_id            ↑ barbero_id
Servicio                BloqueoHorario
(catálogo propio        (excepciones puntuales
 de cada barbero)        a su horario)

Cliente (barberia_id) ←──┐
                          │
Turno (barbero_id, servicio_id, cliente_id) ──┘
```

- **Barberia**: el local. Tiene nombre, horario general y (a futuro) el usuario admin. Es el "tenant" — todo cuelga de acá, directa o indirectamente.
- **Barbero**: una persona con cuenta propia (login), vinculada a una Barberia. Reemplazó a la vieja tabla `Emprendedor`.
- **Servicio**: pertenece a **un Barbero puntual** (cada uno define sus propios cortes/precios).
- **Cliente**: pertenece a **la Barberia** (compartido entre todos los barberos del local, no a uno solo).
- **Turno**: conecta un Barbero + un Servicio + un Cliente en una fecha/hora.
- **BloqueoHorario**: excepciones puntuales al horario de **un Barbero** (ej. "este viernes no trabajo").

## 2. Qué hace cada RLS

| Tabla | Quién puede leer | Quién puede escribir |
|---|---|---|
| **Barberia** | El barbero logueado, solo su propia barbería | Nadie desde la app (altas/ediciones manuales por el equipo, admin no tiene login todavía) |
| **Barbero** | Cada uno, solo su propia fila | Cada uno puede editar (no crear) su propia fila |
| **Servicio** | Todos, incluso sin login (catálogo público) | Solo el barbero dueño de ese servicio |
| **Cliente** | Cualquier barbero, pero solo los clientes **de su misma barbería** | Igual: cualquier barbero de esa barbería |
| **Turno** | Solo el barbero dueño del turno | Solo el barbero dueño (crear/editar/cancelar) |
| **BloqueoHorario** | Solo el barbero dueño | Solo el barbero dueño |

**La idea central**: todo pasa por una verificación de "¿el usuario logueado (`auth.uid()`) es el `Barbero` dueño de esta fila, o pertenece a la misma `Barberia` que esta fila?" — nunca se confía en lo que la app dice ser, siempre se lo recalcula del lado del servidor con esos `exists (...)`.

**Lo que todavía queda afuera** (a propósito): nadie sin login (`anon`) puede tocar `Turno`, `Cliente` ni `BloqueoHorario` directamente — eso se resuelve más adelante con una función controlada para el flujo de reserva pública, no con policies abiertas.
