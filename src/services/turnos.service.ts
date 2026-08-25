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
  telefono: number;
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

  // 2. verificar que el horario esté libre (defensa en profundidad)
  const { data: overlapping, error: overlapError } = await supabase
    .from('Turno')
    .select('id, inicio, duracion_minutos')
    .eq('barbero_id', barbero.id)
    .in('estado', BOOKABLE_STATUSES)
    .lt('inicio', finDate.toISOString())
    .gte('inicio', inicioDate.toISOString());

  if (overlapError) throw new Error('No se pudo verificar la disponibilidad del horario.');
  if (overlapping && overlapping.length > 0) {
    throw new Error('El horario seleccionado ya no está disponible.');
  }

  // 3. buscar o crear cliente (dentro de la barbería; upsert para evitar duplicados por race condition)
  const { data: upsertedCliente, error: clienteError } = await supabase
    .from('Cliente')
    .upsert(
      {
        barberia_id: barbero.barberia_id,
        nombre: `${nombre} ${apellido}`.trim(),
        telefono,
      },
      { onConflict: 'barberia_id,telefono' },
    )
    .select('id')
    .single();

  if (clienteError || !upsertedCliente) {
    throw new Error('No se pudo guardar los datos del cliente.');
  }

  // 4. crear turno (con snapshot de duración y origen)
  const { data: createdTurno, error } = await supabase
    .from('Turno')
    .insert({
      cliente_id: upsertedCliente.id,
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
    if (error.message?.includes('unique')) {
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

  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(payload)
    .eq('id', id)
    .eq('barbero_id', barbero.id)
    .select('*')
    .single();

  if (error) {
    if (error.message?.includes('unique')) {
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
