import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

/* =========================
   Tipos base DB
========================= */
export type Turno = Database['public']['Tables']['Turno']['Row'];
export type TurnoInsert = Database['public']['Tables']['Turno']['Insert'];
export type TurnoUpdate = Database['public']['Tables']['Turno']['Update'];
export type Servicio = Database['public']['Tables']['Servicio']['Row'];

/* =========================
   Tipo UI (JOIN para frontend)
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

type TurnoConRelaciones = Pick<Turno, 'id' | 'inicio' | 'cliente_id' | 'servicio_id' | 'estado'> & {
  Cliente: Pick<Database['public']['Tables']['Cliente']['Row'], 'nombre'> | null;
  Servicio: Pick<Servicio, 'nombre'> | null;
};

/* =========================
   GET TURNOS (por emprendedor logueado)
========================= */
export async function getTurnos(): Promise<TurnoUI[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return [];

  const { data: emprendedor } = await supabase
    .from('Emprendedor')
    .select('id')
    .eq('users_id', userId)
    .single();

  if (!emprendedor) return [];

  const { data, error } = await supabase
    .from('Turno')
    .select(
      `
      id,
      inicio,
      cliente_id,
      servicio_id,
      estado,
      Cliente (nombre),
      Servicio (nombre)
    `,
    )
    .eq('emprendedor_id', emprendedor.id)
    .order('inicio', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as TurnoConRelaciones[]).map((t) => ({
    id: t.id,
    inicio: t.inicio ?? '',
    cliente_id: t.cliente_id ?? 0,
    servicio_id: t.servicio_id ?? 0,
    cliente_nombre: t.Cliente?.nombre ?? 'Sin cliente',
    servicio_nombre: t.Servicio?.nombre ?? 'Sin servicio',
    estado: t.estado ?? 'pendiente',
  }));
}

/* =========================
   GET POR ID
========================= */
export async function getTurnoById(id: number) {
  const { data, error } = await supabase.from('Turno').select('*').eq('id', id).single();

  if (error) throw new Error(error.message);
  return data as Turno;
}

/* =========================
   SERVICIOS
========================= */
export async function getServicios() {
  const { data, error } = await supabase
    .from('Servicio')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Servicio[];
}

/* =========================
   CREATE TURNOS
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

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) throw new Error('Usuario no autenticado');

  const { data: emprendedor } = await supabase
    .from('Emprendedor')
    .select('id')
    .eq('users_id', userId)
    .single();

  if (!emprendedor) throw new Error('Emprendedor no encontrado');

  let clienteId: number;

  const { data: existingCliente } = await supabase
    .from('Cliente')
    .select('id')
    .eq('telefono', telefono)
    .single();

  if (existingCliente) {
    clienteId = existingCliente.id;
  } else {
    const { data: newCliente, error } = await supabase
      .from('Cliente')
      .insert({
        nombre: `${nombre} ${apellido}`.trim(),
        telefono,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    clienteId = newCliente.id;
  }

  const { data: createdTurno, error } = await supabase
    .from('Turno')
    .insert({
      cliente_id: clienteId,
      servicio_id,
      inicio,
      emprendedor_id: emprendedor.id,
      estado: 'confirmado',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  return createdTurno as Turno;
}

/* =========================
   UPDATE
========================= */
export async function updateTurno(id: number, data: TurnoUpdate) {
  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return updatedTurno as Turno;
}

/* =========================
   DELETE
========================= */
export async function deleteTurno(id: number) {
  const { error } = await supabase.from('Turno').delete().eq('id', id);

  if (error) throw new Error(error.message);

  return true;
}
