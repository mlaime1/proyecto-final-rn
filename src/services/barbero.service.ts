import { supabase } from '@/lib/supabase';
import { useAppStore, type CachedBarbero } from '@/store/app.store';
import { Database } from '@/types/database.types';

export type Barbero = CachedBarbero;
export type Barberia = Database['public']['Tables']['Barberia']['Row'];

export type BarberoConBarberia = CachedBarbero;

function isAuthError(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toString().toLowerCase();

  return (
    code === '401' ||
    code.startsWith('pgrst3') ||
    message.includes('jwt') ||
    message.includes('expired') ||
    message.includes('invalid claim') ||
    message.includes('session not found') ||
    message.includes('session_revoked')
  );
}

function signOutSilently() {
  supabase.auth.signOut().catch(() => {});
}

/**
 * Devuelve el Barbero vinculado al usuario logueado (users_id = auth.uid()).
 * Las cuentas se crean manualmente por el equipo (no hay self-signup ni
 * auto-creación de perfil), así que si no existe la fila es un error de
 * configuración de la cuenta, no algo que la app pueda resolver.
 *
 * La sesión se valida con getSession() (local) en lugar de getUser() (remoto).
 * El resultado se cachea en el store de la sesión; no se cachea un resultado
 * nulo para evitar bloquear a un usuario cuya cuenta se vincule después.
 */
export async function getBarbero(): Promise<BarberoConBarberia | null> {
  const { barbero: cached, setBarbero } = useAppStore.getState();

  if (cached) {
    return cached;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  const { data, error } = await supabase
    .from('Barbero')
    .select('*, Barberia(nombre, hora_apertura, hora_cierre, dias_habiles)')
    .eq('users_id', session.user.id)
    .maybeSingle();

  if (error) {
    if (isAuthError(error)) {
      signOutSilently();
      return null;
    }
    throw new Error('No se pudo cargar tu perfil.');
  }

  if (data) {
    setBarbero(data as BarberoConBarberia);
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

  const { setBarbero } = useAppStore.getState();
  setBarbero({
    ...barbero,
    dias_habiles: data.dias_habiles,
    hora_apertura: data.hora_apertura,
    hora_cierre: data.hora_cierre,
  });
}
