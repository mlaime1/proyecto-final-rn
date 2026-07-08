import { supabase } from '@/lib/supabase';
import { getEmprendedor } from '@/services/emprendedor.service';
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
  estado: string;
};

type TurnoConRelaciones = {
  id: number;
  inicio: string;
  cliente_id: number;
  servicio_id: number;
  estado: string | null;
  Cliente: { nombre: string | null } | null;
  Servicio: { nombre: string | null } | null;
};

type TurnoPorDia = {
  id: number;
  inicio: string;
  estado: string | null;
  Servicio: { duracion: number | null } | null;
};

const BOOKABLE_STATUSES = ['confirmado', 'pendiente'];
const VALID_ESTADOS = ['pendiente', 'confirmado', 'completado', 'cancelado', 'ausente'] as const;
type EstadoTurno = (typeof VALID_ESTADOS)[number];

/* =========================
   Helpers
========================= */
async function getCurrentEmprendedor() {
  const emprendedor = await getEmprendedor();
  if (!emprendedor) {
    throw new Error('No se encontró tu perfil. Verificá tu cuenta o contactá soporte.');
  }
  return emprendedor;
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
  const emprendedor = await getCurrentEmprendedor();

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
      Servicio ( nombre )
    `,
    )
    .eq('emprendedor_id', emprendedor.id)
    .order('inicio', { ascending: true });

  if (error) throw new Error('No se pudieron cargar los turnos.');

  return ((data ?? []) as unknown as TurnoConRelaciones[]).map((t) => ({
    id: t.id,
    inicio: t.inicio,
    cliente_id: t.cliente_id,
    servicio_id: t.servicio_id,
    cliente_nombre: t.Cliente?.nombre ?? 'Sin cliente',
    servicio_nombre: t.Servicio?.nombre ?? 'Sin servicio',
    estado: t.estado ?? 'pendiente',
  }));
}

/* =========================
   GET TURNOS POR DIA
========================= */
export async function getTurnosPorDia(date: Date): Promise<TurnoPorDia[]> {
  const emprendedor = await getCurrentEmprendedor();
  const { startString, endString } = normalizeDateBounds(date);

  const { data, error } = await supabase
    .from('Turno')
    .select(`
      id,
      inicio,
      estado,
      Servicio ( duracion )
    `)
    .eq('emprendedor_id', emprendedor.id)
    .in('estado', BOOKABLE_STATUSES)
    .gte('inicio', startString)
    .lte('inicio', endString);

  if (error) throw new Error('No se pudieron cargar los horarios ocupados.');

  return (data ?? []) as unknown as TurnoPorDia[];
}

/* =========================
   GET POR ID
========================= */
export async function getTurnoById(id: number) {
  const emprendedor = await getCurrentEmprendedor();

  const { data, error } = await supabase
    .from('Turno')
    .select(`
      *,
      Cliente ( nombre ),
      Servicio ( nombre, precio, duracion )
    `)
    .eq('id', id)
    .eq('emprendedor_id', emprendedor.id)
    .maybeSingle();

  if (error) throw new Error('No se pudo cargar el turno.');
  if (!data) throw new Error('Turno no encontrado.');

  return data as Turno & {
    Cliente: { nombre: string } | null;
    Servicio: { nombre: string | null; precio: number | null; duracion: number | null } | null;
  };
}

/* =========================
   SERVICIOS
========================= */
export async function getServicios() {
  const { data, error } = await supabase
    .from('Servicio')
    .select('*')
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
};

export async function createAppointment(data: CreateAppointmentData) {
  const { nombre, apellido, telefono, servicio_id, inicio } = data;
  const emprendedor = await getCurrentEmprendedor();

  // 1. obtener duración del servicio
  const { data: servicio, error: servicioError } = await supabase
    .from('Servicio')
    .select('duracion')
    .eq('id', servicio_id)
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
    .select('id, inicio, Servicio(duracion)')
    .eq('emprendedor_id', emprendedor.id)
    .in('estado', BOOKABLE_STATUSES)
    .lt('inicio', finDate.toISOString())
    .gte('inicio', inicioDate.toISOString());

  if (overlapError) throw new Error('No se pudo verificar la disponibilidad del horario.');
  if (overlapping && overlapping.length > 0) {
    throw new Error('El horario seleccionado ya no está disponible.');
  }

  // 3. buscar o crear cliente (upsert para evitar duplicados por race condition)
  const { data: upsertedCliente, error: clienteError } = await supabase
    .from('Cliente')
    .upsert(
      {
        nombre: `${nombre} ${apellido}`.trim(),
        telefono,
      },
      { onConflict: 'telefono' },
    )
    .select('id')
    .single();

  if (clienteError || !upsertedCliente) {
    throw new Error('No se pudo guardar los datos del cliente.');
  }

  // 4. crear turno
  const { data: createdTurno, error } = await supabase
    .from('Turno')
    .insert({
      cliente_id: upsertedCliente.id,
      servicio_id,
      inicio,
      emprendedor_id: emprendedor.id,
      estado: 'confirmado',
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
  const emprendedor = await getCurrentEmprendedor();

  const payload: Partial<TurnoUpdate> = {};
  if (changes.servicio_id !== undefined) payload.servicio_id = changes.servicio_id;
  if (changes.inicio !== undefined) payload.inicio = changes.inicio;
  if (changes.estado !== undefined) payload.estado = validateEstado(changes.estado);

  if (Object.keys(payload).length === 0) {
    throw new Error('No hay cambios para aplicar.');
  }

  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(payload)
    .eq('id', id)
    .eq('emprendedor_id', emprendedor.id)
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
  const emprendedor = await getCurrentEmprendedor();

  const { error } = await supabase
    .from('Turno')
    .delete()
    .eq('id', id)
    .eq('emprendedor_id', emprendedor.id);

  if (error) throw new Error('No se pudo eliminar el turno.');

  return true;
}
