import { supabase } from '@/lib/supabase';
import { getBarbero } from '@/services/barbero.service';
import { Database } from '@/types/database.types';

/* =========================
   Tipos base DB
========================= */
export type Turno = Database['public']['Tables']['Turno']['Row'];
export type TurnoInsert = Database['public']['Tables']['Turno']['Insert'];
export type TurnoUpdate = Database['public']['Tables']['Turno']['Update'];
export type Servicio = Database['public']['Tables']['Servicio']['Row'];

/* =========================
   Tipo UI (con JOIN)
========================= */
export type TurnoUI = {
  id: number;
  inicio: string;
  cliente_id: number;
  servicio_id: number;
  cliente_nombre: string;
  servicio_nombre: string;
  servicio_precio: number | null;
  servicio_duracion: number | null;
  estado: string;
};

type TurnoConRelaciones = {
  id: number;
  inicio: string;
  cliente_id: number;
  servicio_id: number;
  estado: string | null;
  Cliente: { nombre: string | null } | null;
  Servicio: { nombre: string | null; precio: number | null; duracion: number | null } | null;
};

export type TurnoPorDia = {
  id: number;
  inicio: string;
  estado: string | null;
  duracion_minutos: number;
};

const BOOKABLE_STATUSES = ['confirmado'];
const VALID_ESTADOS = ['confirmado', 'cancelado'] as const;
type EstadoTurno = (typeof VALID_ESTADOS)[number];

// Estados que ocupan agenda. Debe coincidir con el WHERE de la constraint
// `turno_sin_solape` de la BD (pendiente / confirmado / completado).
const OCCUPYING_STATUSES: string[] = ['pendiente', 'confirmado', 'completado'];

// Tope de duración por servicio. Debe coincidir con el CHECK `turno_duracion_valida`.
const MAX_DURACION_MINUTOS = 480;

export type OrigenTurno = 'presencial' | 'whatsapp';

/* =========================
   Helpers
========================= */
async function getCurrentBarbero() {
  const barbero = await getBarbero();
  if (!barbero) {
    throw new Error('Tu cuenta no está vinculada a ninguna barbería. Contactá al administrador.');
  }
  return barbero;
}

function validateEstado(estado: unknown): EstadoTurno {
  if (typeof estado !== 'string' || !VALID_ESTADOS.includes(estado as EstadoTurno)) {
    throw new Error('Estado de turno no válido.');
  }
  return estado as EstadoTurno;
}

function normalizeDateBounds(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const startString = new Date(startOfDay.getTime() - tzOffset).toISOString().slice(0, -1);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const endString = new Date(endOfDay.getTime() - tzOffset).toISOString().slice(0, -1);

  return { startString, endString };
}

/**
 * Convierte un Date al string naive-local ("YYYY-MM-DDTHH:mm:ss") que espera la
 * columna `Turno.inicio` (timestamp without time zone). NO usar `toISOString()`:
 * eso emite UTC con sufijo `Z` y desplaza la ventana de comparación.
 */
function toLocalNaive(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, -5);
}

/**
 * Turnos ocupantes de `barberoId` que solapan de verdad con [inicio, fin).
 *
 * Es una pre-verificación de UX; la garantía real es la constraint
 * `turno_sin_solape` de la BD. Traemos los candidatos cuyo `inicio` cae en
 * [inicio - MAX_DURACION, fin): cualquier turno que pudiera solapar tiene que
 * empezar ahí, porque ninguna duración supera el tope de la BD. Después
 * comparamos los rangos reales en JS.
 */
async function findOverlaps(
  barberoId: number,
  inicio: Date,
  fin: Date,
  excluirTurnoId?: number,
): Promise<TurnoPorDia[]> {
  const desde = toLocalNaive(new Date(inicio.getTime() - MAX_DURACION_MINUTOS * 60000));
  const hasta = toLocalNaive(fin);

  const { data, error } = await supabase
    .from('Turno')
    .select('id, inicio, estado, duracion_minutos')
    .eq('barbero_id', barberoId)
    .in('estado', OCCUPYING_STATUSES)
    .gte('inicio', desde)
    .lt('inicio', hasta);

  if (error) throw new Error('No se pudo verificar la disponibilidad del horario.');

  const inicioMs = inicio.getTime();
  const finMs = fin.getTime();

  return ((data ?? []) as TurnoPorDia[]).filter((t) => {
    if (excluirTurnoId !== undefined && t.id === excluirTurnoId) return false;
    const tInicio = new Date(t.inicio).getTime();
    const tFin = tInicio + (t.duracion_minutos ?? 0) * 60000;
    return tInicio < finMs && tFin > inicioMs;
  });
}

/* =========================
   GET TURNOS
========================= */
export async function getTurnos(): Promise<TurnoUI[]> {
  const barbero = await getCurrentBarbero();

  const { data, error } = await supabase
    .from('Turno')
    .select(
      `
      id,
      inicio,
      cliente_id,
      servicio_id,
      estado,
      Cliente ( nombre ),
      Servicio ( nombre, precio, duracion )
    `,
    )
    .eq('barbero_id', barbero.id)
    .order('inicio', { ascending: true });

  if (error) throw new Error('No se pudieron cargar los turnos.');

  return ((data ?? []) as unknown as TurnoConRelaciones[]).map((t) => ({
    id: t.id,
    inicio: t.inicio,
    cliente_id: t.cliente_id,
    servicio_id: t.servicio_id,
    cliente_nombre: t.Cliente?.nombre ?? 'Sin cliente',
    servicio_nombre: t.Servicio?.nombre ?? 'Sin servicio',
    servicio_precio: t.Servicio?.precio ?? null,
    servicio_duracion: t.Servicio?.duracion ?? null,
    estado: t.estado ?? 'confirmado',
  }));
}

/* =========================
   GET TURNOS POR DIA
   (usa duracion_minutos snapshot, sin join a Servicio)
========================= */
export async function getTurnosPorDia(date: Date): Promise<TurnoPorDia[]> {
  const barbero = await getCurrentBarbero();
  const { startString, endString } = normalizeDateBounds(date);

  const { data, error } = await supabase
    .from('Turno')
    .select('id, inicio, estado, duracion_minutos')
    .eq('barbero_id', barbero.id)
    .in('estado', BOOKABLE_STATUSES)
    .gte('inicio', startString)
    .lte('inicio', endString);

  if (error) throw new Error('No se pudieron cargar los horarios ocupados.');

  return (data ?? []) as TurnoPorDia[];
}

/* =========================
   GET POR ID
========================= */
export async function getTurnoById(id: number) {
  const barbero = await getCurrentBarbero();

  const { data, error } = await supabase
    .from('Turno')
    .select(
      `
      *,
      Cliente ( nombre ),
      Servicio ( nombre, precio, duracion )
    `,
    )
    .eq('id', id)
    .eq('barbero_id', barbero.id)
    .maybeSingle();

  if (error) throw new Error('No se pudo cargar el turno.');
  if (!data) throw new Error('Turno no encontrado.');

  return data as Turno & {
    Cliente: { nombre: string } | null;
    Servicio: { nombre: string | null; precio: number | null; duracion: number | null } | null;
  };
}

/* =========================
   SERVICIOS (catálogo propio del barbero)
========================= */
export async function getServicios() {
  const barbero = await getCurrentBarbero();

  const { data, error } = await supabase
    .from('Servicio')
    .select('*')
    .eq('barbero_id', barbero.id)
    .order('id', { ascending: true });

  if (error) throw new Error('No se pudieron cargar los servicios.');
  return data as Servicio[];
}

/* =========================
   CREAR TURNO
========================= */
export type CreateAppointmentData = {
  nombre: string;
  apellido: string;
  telefono: number | null;
  servicio_id: number;
  inicio: string;
  origen: OrigenTurno;
};

export async function createAppointment(data: CreateAppointmentData) {
  const { nombre, apellido, telefono, servicio_id, inicio, origen } = data;
  const barbero = await getCurrentBarbero();

  // 1. obtener duración del servicio (para snapshot y chequeo de solape)
  const { data: servicio, error: servicioError } = await supabase
    .from('Servicio')
    .select('duracion')
    .eq('id', servicio_id)
    .eq('barbero_id', barbero.id)
    .maybeSingle();

  if (servicioError || !servicio) {
    throw new Error('El servicio seleccionado no es válido.');
  }

  const duracionMinutos = servicio.duracion ?? 30;
  const inicioDate = new Date(inicio);
  const finDate = new Date(inicioDate.getTime() + duracionMinutos * 60000);

  if (inicioDate < new Date()) {
    throw new Error('No se pueden crear turnos en el pasado.');
  }

  // 2. pre-verificación de solape (solo UX; la autoridad es la constraint de la BD)
  const overlapping = await findOverlaps(barbero.id, inicioDate, finDate);
  if (overlapping.length > 0) {
    throw new Error('El horario seleccionado ya no está disponible.');
  }

  // 3. crear cliente (siempre nuevo; el barbero carga los datos. Telefono es opcional,
  // email queda null. Sin dedup por telefono -> insert directo, sin onConflict)
  const { data: nuevoCliente, error: clienteError } = await supabase
    .from('Cliente')
    .insert({
      barberia_id: barbero.barberia_id,
      nombre: `${nombre} ${apellido}`.trim(),
      telefono,
    })
    .select('id')
    .single();

  if (clienteError || !nuevoCliente) {
    throw new Error('No se pudo guardar los datos del cliente.');
  }

  // 4. crear turno (con snapshot de duración y origen)
  const { data: createdTurno, error } = await supabase
    .from('Turno')
    .insert({
      cliente_id: nuevoCliente.id,
      servicio_id,
      inicio,
      barbero_id: barbero.id,
      estado: 'confirmado',
      origen,
      duracion_minutos: duracionMinutos,
    })
    .select('*')
    .single();

  if (error) {
    // 23P01 = exclusion_violation (constraint `turno_sin_solape`).
    if (error.code === '23P01') {
      throw new Error('El horario seleccionado ya no está disponible.');
    }
    if (error.code === '23505' || error.message?.includes('unique')) {
      throw new Error('El horario seleccionado ya fue reservado.');
    }
    throw new Error('No se pudo crear el turno.');
  }

  return createdTurno as Turno;
}

/* =========================
   UPDATE
========================= */
export async function updateTurno(
  id: number,
  changes: Pick<TurnoUpdate, 'servicio_id' | 'inicio' | 'estado'>,
) {
  const barbero = await getCurrentBarbero();

  const payload: Partial<TurnoUpdate> = {};
  if (changes.inicio !== undefined) payload.inicio = changes.inicio;
  if (changes.estado !== undefined) payload.estado = validateEstado(changes.estado);

  // Si cambia el servicio, hay que refrescar el snapshot de duración
  if (changes.servicio_id !== undefined) {
    const { data: servicio, error: servicioError } = await supabase
      .from('Servicio')
      .select('duracion')
      .eq('id', changes.servicio_id)
      .eq('barbero_id', barbero.id)
      .maybeSingle();

    if (servicioError || !servicio) {
      throw new Error('El servicio seleccionado no es válido.');
    }

    payload.servicio_id = changes.servicio_id;
    payload.duracion_minutos = servicio.duracion ?? 30;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No hay cambios para aplicar.');
  }

  // Pre-verificación de solape sobre los valores EFECTIVOS (cambio parcial),
  // excluyendo el propio turno. Solo si el resultado va a ocupar agenda.
  const { data: actual, error: actualError } = await supabase
    .from('Turno')
    .select('inicio, duracion_minutos, estado')
    .eq('id', id)
    .eq('barbero_id', barbero.id)
    .maybeSingle();

  if (actualError) throw new Error('No se pudo cargar el turno.');
  if (!actual) throw new Error('Turno no encontrado.');

  const inicioEfectivoStr = payload.inicio ?? actual.inicio;
  if (!inicioEfectivoStr) throw new Error('El turno no tiene un horario de inicio válido.');

  const estadoEfectivo = payload.estado ?? actual.estado;
  const inicioEfectivo = new Date(inicioEfectivoStr);
  const duracionEfectiva = payload.duracion_minutos ?? actual.duracion_minutos;
  const finEfectivo = new Date(inicioEfectivo.getTime() + duracionEfectiva * 60000);

  if (typeof estadoEfectivo === 'string' && OCCUPYING_STATUSES.includes(estadoEfectivo)) {
    const overlapping = await findOverlaps(barbero.id, inicioEfectivo, finEfectivo, id);
    if (overlapping.length > 0) {
      throw new Error('El horario seleccionado ya no está disponible.');
    }
  }

  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(payload)
    .eq('id', id)
    .eq('barbero_id', barbero.id)
    .select('*')
    .single();

  if (error) {
    // 23P01 = exclusion_violation (constraint `turno_sin_solape`).
    if (error.code === '23P01') {
      throw new Error('El horario seleccionado ya no está disponible.');
    }
    if (error.code === '23505' || error.message?.includes('unique')) {
      throw new Error('El nuevo horario ya está reservado.');
    }
    throw new Error('No se pudo actualizar el turno.');
  }

  return updatedTurno as Turno;
}

/* =========================
   DELETE
========================= */
export async function deleteTurno(id: number) {
  const barbero = await getCurrentBarbero();

  const { error } = await supabase.from('Turno').delete().eq('id', id).eq('barbero_id', barbero.id);

  if (error) throw new Error('No se pudo eliminar el turno.');

  return true;
}
