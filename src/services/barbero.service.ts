import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type Barbero = Database['public']['Tables']['Barbero']['Row'];
export type Barberia = Database['public']['Tables']['Barberia']['Row'];

export type BarberoConBarberia = Barbero & {
  Barberia: Pick<Barberia, 'nombre' | 'hora_apertura' | 'hora_cierre' | 'dias_habiles'> | null;
};

/**
 * Devuelve el Barbero vinculado al usuario logueado (users_id = auth.uid()).
 * Las cuentas se crean manualmente por el equipo (no hay self-signup ni
 * auto-creación de perfil), así que si no existe la fila es un error de
 * configuración de la cuenta, no algo que la app pueda resolver.
 */
export async function getBarbero(): Promise<BarberoConBarberia | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) return null;

  const { data, error } = await supabase
    .from('Barbero')
    .select('*, Barberia(nombre, hora_apertura, hora_cierre, dias_habiles)')
    .eq('users_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo cargar tu perfil.');
  }

  return data as BarberoConBarberia | null;
}

export type HorarioHabitualData = {
  dias_habiles: number[];
  hora_apertura: string;
  hora_cierre: string;
};

/**
 * Actualiza el patrón semanal del barbero logueado.
 * La policy RLS permite update solo de la propia fila.
 */
export async function updateHorarioHabitual(data: HorarioHabitualData): Promise<void> {
  const barbero = await getBarbero();
  if (!barbero) {
    throw new Error('Tu cuenta no está vinculada a ninguna barbería. Contactá al administrador.');
  }

  const { error } = await supabase
    .from('Barbero')
    .update({
      dias_habiles: data.dias_habiles,
      hora_apertura: data.hora_apertura,
      hora_cierre: data.hora_cierre,
    })
    .eq('id', barbero.id);

  if (error) {
    throw new Error('No se pudo guardar tu horario. Intentá de nuevo.');
  }
}
