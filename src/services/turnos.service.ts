import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type Turno = Database['public']['Tables']['Turno']['Row'];
export type TurnoInsert = Database['public']['Tables']['Turno']['Insert'];
export type TurnoUpdate = Database['public']['Tables']['Turno']['Update'];
export type Servicio = Database['public']['Tables']['Servicio']['Row'];

export async function getTurnos() {
  const { data, error } = await supabase.from('Turno').select('*').order('inicio', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data as Turno[];
}

export async function getTurnoById(id: number) {
  const { data, error } = await supabase.from('Turno').select('*').eq('id', id).single();
  if (error) {
    throw new Error(error.message);
  }
  return data as Turno;
}

export async function getServicios() {
  const { data, error } = await supabase.from('Servicio').select('*').order('id', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data as Servicio[];
}

export type CreateAppointmentData = {
  nombre: string;
  apellido: string;
  telefono: number;
  servicio_id: number;
  inicio: string;
  emprendedor_id?: number;
};

export async function createAppointment(data: CreateAppointmentData) {
  const { nombre, apellido, telefono, servicio_id, inicio, emprendedor_id = 1 } = data;

  let clienteId: number;

  const { data: existingCliente, error: findError } = await supabase
    .from('Cliente')
    .select('id')
    .eq('telefono', telefono)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    throw new Error(findError.message);
  }

  if (existingCliente) {
    clienteId = existingCliente.id;
  } else {
    const { data: newCliente, error: createError } = await supabase
      .from('Cliente')
      .insert({ nombre: `${nombre} ${apellido}`.trim(), telefono })
      .select('id')
      .single();

    if (createError) throw new Error(createError.message);
    clienteId = newCliente.id;
  }

  const turnoData: TurnoInsert = {
    cliente_id: clienteId,
    emprendedor_id,
    servicio_id,
    inicio,
    estado: 'confirmado',
  };

  const { data: createdTurno, error: turnoError } = await supabase
    .from('Turno')
    .insert(turnoData)
    .select('*')
    .single();

  if (turnoError) throw new Error(turnoError.message);

  return createdTurno as Turno;
}

export async function updateTurno(id: number, data: TurnoUpdate) {
  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updatedTurno as Turno;
}

export async function deleteTurno(id: number) {
  const { error } = await supabase.from('Turno').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
