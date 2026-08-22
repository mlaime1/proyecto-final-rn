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
export function computeOccupiedSlots(turnos: TurnoPorDia[], bloqueos: BloqueoHorario[]): string[] {
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

  return Array.from(occupied);
}
