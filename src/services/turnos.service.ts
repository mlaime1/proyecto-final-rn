import { supabase } from '@/lib/supabase';

export type Turno = {
  id: number;
  created_at: string;
  duracion: string;
  estado: string;
  inicio: string;
  precio: number;
  cliente_id: number;
  emprendedor_id: number;
  fin: string;
  update_at: string;
};

export type TurnoInput = Omit<Turno, 'id'>;

export async function getTurnos() {
  const { data, error } = await supabase.from('Turno').select('*');
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Turno[];
}

export async function getTurnoById(id: number) {
  const { data, error } = await supabase.from('Turno').select('*').eq('id', id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Turno;
}

export async function createTurno(data: TurnoInput) {
  const { data: createdTurno, error } = await supabase
    .from('Turno')
    .insert(data)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return createdTurno as Turno;
}

export async function updateTurno(id: number, data: Partial<TurnoInput>) {
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
