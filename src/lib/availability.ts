import type { TurnoPorDia } from '@/services/turnos.service';
import type { BloqueoHorario } from '@/services/bloqueos.service';

/* =========================
   Helpers de disponibilidad
   - grilla de horarios según apertura/cierre del barbero
   - filtrado de días hábiles
   - cálculo de slots ocupados (turnos + bloqueos)
========================= */

export const SLOT_STEP_MINUTES = 30;

export const DEFAULT_APERTURA = '10:00';
export const DEFAULT_CIERRE = '18:00';

/** Postgres `time` viene como "HH:MM:SS" — nos quedamos con "HH:MM". */
export function toHHMM(time: string): string {
  return time.slice(0, 5);
}

/**
 * Parsea 'YYYY-MM-DD' como fecha LOCAL (evita el corrimiento de día
 * que produce `new Date(fecha)` al interpretarla como UTC).
 */
export function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/* =========================
   Horario efectivo
   Solo vale el horario PROPIO del barbero: sin horario propio completo
   no se hereda el de la barbería ni se cae a defaults — el estado es
   "cerrado" (origen 'cerrado', campos ausentes en null).
   Única fuente de verdad para "¿qué horario está mostrando la app?".
   Función pura: no consulta la base ni toca estado.
   ========================= */

/** De dónde salió el horario efectivo. 'cerrado' = el barbero no tiene horario propio completo. */
export type OrigenHorario = 'barbero' | 'barberia' | 'default' | 'cerrado';

export type HorarioEfectivo = {
  /** "HH:MM" recortado con `toHHMM`; null = el barbero no lo tiene cargado. */
  hora_apertura: string | null;
  /** "HH:MM" recortado con `toHHMM`; null = el barbero no lo tiene cargado. */
  hora_cierre: string | null;
  /** null = el barbero no tiene días configurados (ver `isDiaHabil`: ningún día es hábil). */
  dias_habiles: number[] | null;
  origen: OrigenHorario;
};

/**
 * Forma mínima que necesita el resolver. La satisfacen tanto `Barbero` como
 * `Barberia` (y `CachedBarbero` con su `Barberia` embebida).
 */
export type FuenteHorario = {
  hora_apertura?: string | null | undefined;
  hora_cierre?: string | null | undefined;
  dias_habiles?: number[] | null | undefined;
};

/**
 * Resuelve el horario que la app debe usar. Solo vale el horario PROPIO del
 * barbero: si le falta la apertura, el cierre o los días, el resultado es
 * "cerrado" (origen 'cerrado') y NO se hereda nada de la barbería ni de los
 * defaults. Un barbero con su horario completo no cambia de comportamiento
 * en absoluto.
 *
 * En "cerrado" se conservan los campos propios que sí estén cargados (en
 * null los ausentes) para que la pantalla de configuración pueda
 * pre-sembrar el formulario con lo que haya, pero ninguna grilla genera
 * slots desde este estado (ver `generateTimeSlots` / `isDiaHabil`).
 */
export function resolverHorarioEfectivo(
  barbero: FuenteHorario | null | undefined,
  _barberia?: FuenteHorario | null | undefined,
): HorarioEfectivo {
  const aperturaPropia = barbero?.hora_apertura ? toHHMM(barbero.hora_apertura) : null;
  const cierrePropio = barbero?.hora_cierre ? toHHMM(barbero.hora_cierre) : null;
  const diasPropios =
    barbero?.dias_habiles && barbero.dias_habiles.length > 0 ? barbero.dias_habiles : null;

  if (aperturaPropia && cierrePropio && diasPropios) {
    return {
      hora_apertura: aperturaPropia,
      hora_cierre: cierrePropio,
      dias_habiles: diasPropios,
      origen: 'barbero',
    };
  }

  return {
    hora_apertura: aperturaPropia,
    hora_cierre: cierrePropio,
    dias_habiles: diasPropios,
    origen: 'cerrado',
  };
}

/* =========================
   Horario reservable (intersección para RESERVA — opción B)
   La barbería funciona como TECHO: solo se puede reservar en el cruce de
   ambos horarios (días en común y ventana greatest(aperturas)–least(cierres)),
   igual que impone la RPC `crear_turno` server-side. Esta es la ÚNICA fuente
   para RESERVA (grilla de turnos, nuevo/modificar/confirmar, pre-chequeo del
   servicio). `resolverHorarioEfectivo` NO cambia: sigue siendo el horario
   PROPIO para las pantallas de CONFIG (perfil/horario, perfil/excepciones),
   que necesitan pre-sembrar formularios con lo propio.
   Función pura: no consulta la base ni toca estado.
   ========================= */

/**
 * Resuelve la ventana en la que se puede RESERVAR: intersección del horario
 * del barbero con el de su barbería.
 *
 * - Días: intersección de ambos `dias_habiles` (solo enteros 0–6, ordenados).
 * - Ventana: apertura = max(aperturas), cierre = min(cierres), en "HH:MM".
 * - Si falta algún lado (horas o días en null/vacío), la intersección de días
 *   es vacía o la apertura >= cierre, el resultado es "cerrado" (origen
 *   'cerrado', campos en null): sin slots, igual que el estado cerrado del
 *   resolver de config (ver `generateTimeSlots` / `isDiaHabil`).
 * - Con intersección válida el origen se informa como 'barbero' (único valor
 *   no-cerrado que consumen las pantallas de reserva: solo bifurcan por
 *   `=== 'cerrado'`); el contenido ya es la intersección, no el horario propio.
 */
export function resolverHorarioReservable(
  barbero: FuenteHorario | null | undefined,
  barberia: FuenteHorario | null | undefined,
): HorarioEfectivo {
  const cerrado: HorarioEfectivo = {
    hora_apertura: null,
    hora_cierre: null,
    dias_habiles: null,
    origen: 'cerrado',
  };

  const aperturaBarbero = barbero?.hora_apertura ? toHHMM(barbero.hora_apertura) : null;
  const cierreBarbero = barbero?.hora_cierre ? toHHMM(barbero.hora_cierre) : null;
  const aperturaBarberia = barberia?.hora_apertura ? toHHMM(barberia.hora_apertura) : null;
  const cierreBarberia = barberia?.hora_cierre ? toHHMM(barberia.hora_cierre) : null;

  const diasBarbero = diasUtilizables(barbero?.dias_habiles);
  const diasBarberia = diasUtilizables(barberia?.dias_habiles);

  // Sin ambos lados completos no hay intersección que calcular.
  if (!aperturaBarbero || !cierreBarbero || !aperturaBarberia || !cierreBarberia) return cerrado;
  if (!diasBarbero || diasBarbero.length === 0 || !diasBarberia || diasBarberia.length === 0) {
    return cerrado;
  }

  const aperturaBarberoMin = minutosSeguros(aperturaBarbero);
  const cierreBarberoMin = minutosSeguros(cierreBarbero);
  const aperturaBarberiaMin = minutosSeguros(aperturaBarberia);
  const cierreBarberiaMin = minutosSeguros(cierreBarberia);

  if (
    aperturaBarberoMin === null ||
    cierreBarberoMin === null ||
    aperturaBarberiaMin === null ||
    cierreBarberiaMin === null
  ) {
    return cerrado;
  }

  const dias = diasBarbero.filter((d) => diasBarberia.includes(d)).sort((a, b) => a - b);
  if (dias.length === 0) return cerrado;

  const aperturaMin = Math.max(aperturaBarberoMin, aperturaBarberiaMin);
  const cierreMin = Math.min(cierreBarberoMin, cierreBarberiaMin);
  if (aperturaMin >= cierreMin) return cerrado;

  return {
    hora_apertura: aperturaMin === aperturaBarberoMin ? aperturaBarbero : aperturaBarberia,
    hora_cierre: cierreMin === cierreBarberoMin ? cierreBarbero : cierreBarberia,
    dias_habiles: dias,
    origen: 'barbero',
  };
}

/**
 * ¿El slot "HH:MM" cae dentro de la ventana [apertura, cierre)?
 * Pre-chequeo de UX para RESERVA (la autoridad real es la RPC `crear_turno`):
 * sin hora o sin ambos límites devuelve false. El inicio coincide con el
 * último slot que genera `generateTimeSlots` (estrictamente menor al cierre).
 */
export function estaEnVentana(
  hora: string | null | undefined,
  apertura: string | null | undefined,
  cierre: string | null | undefined,
): boolean {
  const horaMin = minutosSeguros(hora);
  const aperturaMin = minutosSeguros(apertura);
  const cierreMin = minutosSeguros(cierre);
  if (horaMin === null || aperturaMin === null || cierreMin === null) return false;
  return horaMin >= aperturaMin && horaMin < cierreMin;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toSlot(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Genera la grilla de horarios entre apertura y cierre (paso 30 min).
 * Sin ambos límites (estado "cerrado") devuelve lista vacía: ya no se cae
 * al default 10:00–18:00. Con apertura >= cierre también devuelve [].
 */
export function generateTimeSlots(apertura?: string | null, cierre?: string | null): string[] {
  if (!apertura || !cierre) return [];
  const start = toMinutes(toHHMM(apertura));
  const end = toMinutes(toHHMM(cierre));
  if (start >= end) return [];

  const slots: string[] = [];
  for (let current = start; current < end; current += SLOT_STEP_MINUTES) {
    slots.push(toSlot(current));
  }
  return slots;
}

/**
 * ¿La fecha cae en un día hábil del barbero?
 * dias_habiles es int[] con convención JS: 0=Domingo … 6=Sábado.
 * Sin configuración (null/vacío) ningún día es hábil: solo un horario
 * propio completo habilita días (estado "cerrado" del resolver).
 */
export function isDiaHabil(date: Date, diasHabiles?: number[] | null): boolean {
  if (!diasHabiles || diasHabiles.length === 0) return false;
  return diasHabiles.includes(date.getDay());
}

/* =========================
   Desajuste con el horario de la barbería
   El horario de la barbería funciona como TECHO: un turno solo puede caer
   dentro de `barberia.hora_apertura..barberia.hora_cierre` y en un día que
   esté en el cruce de ambos `dias_habiles`. Por eso avisamos solo cuando el
   barbero se sale de ese techo, y NUNCA cuando se queda adentro: trabajar
   menos que la barbería es exactamente la intersección que hay que respetar.
   Función pura y total: no consulta la base, no toca estado y no lanza.
   ========================= */

/** Nombres de día en español, en convención JS: 0=Domingo … 6=Sábado. */
export const DIAS_SEMANA: readonly string[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export type DesajusteHorario = {
  /** El barbero se extiende más allá del rango de la barbería (abre antes o cierra después). */
  fueraDeHorario: boolean;
  /** Días marcados por el barbero que la barbería no abre, en convención JS. */
  diasFuera: number[];
};

/**
 * Minutos desde medianoche, o `null` si el valor no viene o no es un "HH:MM"
 * parseable. Devolver `null` en vez de `NaN` deja las comparaciones de abajo
 * siempre en `false` en lugar de propagar valores inesperados.
 */
function minutosSeguros(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const minutos = toMinutes(toHHMM(hhmm));
  return Number.isFinite(minutos) ? minutos : null;
}

/** Deja solo los días usable por el índice de `DIAS_SEMANA` (enteros 0–6). */
function diasUtilizables(dias: number[] | null | undefined): number[] | null {
  if (!dias) return null;
  const validos = dias.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return Array.from(new Set(validos));
}

/**
 * Compara el horario del barbero contra el de su barbería y devuelve en qué se
 * sale del techo que impone el local. Se usa solo para AVISAR: nunca bloquea un
 * guardado.
 *
 * Contrato cuando la barbería no tiene horario con el que comparar
 * (`null`, ausente, o `hora_apertura`/`hora_cierre`/`dias_habiles` en `null`):
 * devuelve `{ fueraDeHorario: false, diasFuera: [] }`. Sin techo configurado
 * no hay nada contra qué comparar, así que el silencio es la respuesta correcta.
 *
 * Cada dimensión se mira por separado y solo se compara lo que el barbero
 * cargó realmente: si un extremo de hora o la lista de días viene heredado de
 * la barbería (o del default de la app), es imposible que exceda el techo, y
 * comparar contra el valor heredado solo generaría falsos positivos. Por eso
 * NO se usa el `origen` colapsado de `resolverHorarioEfectivo` como filtro:
 * un `origen: 'barberia'` puede deberse a que solo falten los días, y en ese
 * caso las horas propias del barbero siguen siendo comparables.
 */
export function detectarDesajusteConBarberia(
  barbero: FuenteHorario | null | undefined,
  barberia: FuenteHorario | null | undefined,
): DesajusteHorario {
  if (!barbero || !barberia) {
    return { fueraDeHorario: false, diasFuera: [] };
  }

  // Solo se compara un extremo de hora que el barbero haya cargado: si lo
  // heredó, ya es el de la barbería y no puede estar por fuera de sí mismo.
  const aperturaBarbero = minutosSeguros(barbero.hora_apertura);
  const cierreBarbero = minutosSeguros(barbero.hora_cierre);
  const aperturaBarberia = minutosSeguros(barberia.hora_apertura);
  const cierreBarberia = minutosSeguros(barberia.hora_cierre);

  const abreAntesDelLocal =
    aperturaBarbero !== null && aperturaBarberia !== null && aperturaBarbero < aperturaBarberia;
  const cierraDespuesDelLocal =
    cierreBarbero !== null && cierreBarberia !== null && cierreBarbero > cierreBarberia;

  // Días: null/vacío significa "sin configurar" para este chequeo,
  // así que no hay contra qué cruzar y no se reporta nada.
  const diasBarbero = diasUtilizables(barbero.dias_habiles);
  const diasBarberia = diasUtilizables(barberia.dias_habiles);

  const diasFuera =
    diasBarbero && diasBarbero.length > 0 && diasBarberia && diasBarberia.length > 0
      ? diasBarbero.filter((dia) => !diasBarberia.includes(dia)).sort((a, b) => a - b)
      : [];

  return {
    fueraDeHorario: abreAntesDelLocal || cierraDespuesDelLocal,
    diasFuera,
  };
}

/**
 * Calcula los slots ocupados de un día a partir de:
 * - turnos confirmados (inicio + duracion_minutos snapshot)
 * - bloqueos horarios (hora_inicio/hora_fin; ambos null = día completo)
 */
export function computeOccupiedSlots(
  turnos: TurnoPorDia[],
  bloqueos: BloqueoHorario[],
): Set<string> {
  const occupied = new Set<string>();

  turnos.forEach((t) => {
    const start = new Date(t.inicio);
    const duration = t.duracion_minutos ?? SLOT_STEP_MINUTES;
    const end = new Date(start.getTime() + duration * 60000);

    const current = new Date(start);
    while (current < end) {
      occupied.add(
        `${current.getHours().toString().padStart(2, '0')}:${current
          .getMinutes()
          .toString()
          .padStart(2, '0')}`,
      );
      current.setMinutes(current.getMinutes() + SLOT_STEP_MINUTES);
    }
  });

  bloqueos.forEach((b) => {
    // Día completo: bloquear todo el rango posible
    const startMin = b.hora_inicio && b.hora_fin ? toMinutes(toHHMM(b.hora_inicio)) : 0;
    const endMin = b.hora_inicio && b.hora_fin ? toMinutes(toHHMM(b.hora_fin)) : 24 * 60;

    for (let current = startMin; current < endMin; current += SLOT_STEP_MINUTES) {
      occupied.add(toSlot(current));
    }
  });

  return occupied;
}
