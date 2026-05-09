import { supabase } from '@/lib/supabase';

export type Horario = {
  id: string;
  [key: string]: unknown;
};

export async function getHorarios() {
  const { data, error } = await supabase.from('horarios').select('*');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Horario[];
}
