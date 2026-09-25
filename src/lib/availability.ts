import { TurnoPorDia } from '@/services/turnos.service';
import { BloqueoHorario } from '@/services/bloqueos.service';

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
   Cascada Barbero → Barberia → default (por campo, no todo-o-nada)
   Única fuente de verdad para "¿qué horario está mostrando la app?".
   Función pura: no consulta la base ni toca estado.
   ========================= */

/** De dónde salió el horario efectivo. */
export type OrigenHorario = 'barbero' | 'barberia' | 'default';

export type HorarioEfectivo = {
  /** Siempre en formato "HH:MM" (ya recortado con `toHHMM`). */
  hora_apertura: string;
  /** Siempre en formato "HH:MM" (ya recortado con `toHHMM`). */
  hora_cierre: string;
  /** null = ningún nivel configuró días (ver `isDiaHabil`: todos son hábiles). */
  dias_habiles: number[] | null;
  origen: OrigenHorario;
};

/**
 * Forma mínima que necesita el resolver. La satisfacen tanto `Barbero` como
 * `Barberia` (y `CachedBarbero` con su `Barberia` embebida).
 */
type FuenteHorario = {
  hora_apertura?: string | null | undefined;
  hora_cierre?: string | null | undefined;
  dias_habiles?: number[] | null | undefined;
};

type CampoResuelto<T> = { valor: T; origen: OrigenHorario };

/** Un campo de horario: primero el propio del barbero, después el de la barbería. */
function resolverHora(
  propio: string | null | undefined,
  deBarberia: string | null | undefined,
  porDefecto: string,
): CampoResuelto<string> {
  if (propio) return { valor: toHHMM(propio), origen: 'barbero' };
  if (deBarberia) return { valor: toHHMM(deBarberia), origen: 'barberia' };
  return { valor: porDefecto, origen: 'default' };
}

/** null y [] cuentan como "sin configurar", igual que los trata `isDiaHabil`. */
function resolverDias(
  propios: number[] | null | undefined,
  deBarberia: number[] | null | undefined,
): CampoResuelto<number[] | null> {
  if (propios && propios.length > 0) return { valor: propios, origen: 'barbero' };
  if (deBarberia && deBarberia.length > 0) return { valor: deBarberia, origen: 'barberia' };
  // Sin días configurados en ningún nivel. Se devuelve null a propósito para
  // conservar el criterio histórico de `isDiaHabil` (todos los días hábiles).
  return { valor: null, origen: 'default' };
}

/**
 * Reduce los tres orígenes de campo a un único `origen` para la interfaz.
 * Regla ante fuentes mezcladas: 'barbero' solo si los TRES campos salen del
 * barbero; si no, 'barberia' en cuanto uno venga de la barbería; si no,
 * 'default'. Así el aviso al usuario aparece ante cualquier horario
 * incompleto, sin importar qué campo falte.
 */
function combinarOrigen(origenes: OrigenHorario[]): OrigenHorario {
  if (origenes.every((o) => o === 'barbero')) return 'barbero';
  if (origenes.some((o) => o === 'barberia')) return 'barberia';
  return 'default';
}

/**
 * Resuelve el horario que la app debe usar, resolviendo CADA campo por
 * separado: si al barbero le falta solo el cierre, la apertura puede venir de
 * él y el cierre de la barbería. Un barbero con su horario completo no cambia
 * de comportamiento en absoluto.
 */
export function resolverHorarioEfectivo(
  barbero: FuenteHorario | null | undefined,
  barberia: FuenteHorario | null | undefined,
): HorarioEfectivo {
  const apertura = resolverHora(barbero?.hora_apertura, barberia?.hora_apertura, DEFAULT_APERTURA);
  const cierre = resolverHora(barbero?.hora_cierre, barberia?.hora_cierre, DEFAULT_CIERRE);
  const dias = resolverDias(barbero?.dias_habiles, barberia?.dias_habiles);

  return {
    hora_apertura: apertura.valor,
    hora_cierre: cierre.valor,
    dias_habiles: dias.valor,
    origen: combinarOrigen([apertura.origen, cierre.origen, dias.origen]),
  };
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
 * Sin configuración, cae al default 10:00–18:00.
 */
export function generateTimeSlots(apertura?: string | null, cierre?: string | null): string[] {
  const start = toMinutes(apertura ? toHHMM(apertura) : DEFAULT_APERTURA);
  const end = toMinutes(cierre ? toHHMM(cierre) : DEFAULT_CIERRE);

  const slots: string[] = [];
  for (let current = start; current < end; current += SLOT_STEP_MINUTES) {
    slots.push(toSlot(current));
  }
  return slots;
}

/**
 * ¿La fecha cae en un día hábil del barbero?
 * dias_habiles es int[] con convención JS: 0=Domingo … 6=Sábado.
 * Sin configuración (null/vacío) todos los días son hábiles.
 */
export function isDiaHabil(date: Date, diasHabiles?: number[] | null): boolean {
  if (!diasHabiles || diasHabiles.length === 0) return true;
  return diasHabiles.includes(date.getDay());
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
