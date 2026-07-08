import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

export type Emprendedor = Database['public']['Tables']['Emprendedor']['Row'];
export type EmprendedorInsert = Database['public']['Tables']['Emprendedor']['Insert'];

export async function getEmprendedor(): Promise<Emprendedor | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) return null;

  const { data, error } = await supabase
    .from('Emprendedor')
    .select('*')
    .eq('users_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo cargar tu perfil.');
  }

  return data;
}

export async function createEmprendedor(): Promise<Emprendedor> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const email = userData.user?.email;

  if (userError || !userId) {
    throw new Error('Debes iniciar sesión para crear tu perfil.');
  }

  const existing = await getEmprendedor();
  if (existing) {
    return existing;
  }

  const fallbackName = email ? email.split('@')[0] : 'Mi Negocio';

  const { data, error } = await supabase
    .from('Emprendedor')
    .upsert(
      {
        users_id: userId,
        nombre: fallbackName,
        activo: true,
      },
      { onConflict: 'users_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw new Error('No se pudo crear tu perfil. Intentá de nuevo.');
  }

  if (!data) {
    throw new Error('No se pudo crear tu perfil.');
  }

  return data;
}

export async function ensureEmprendedor(): Promise<Emprendedor> {
  const existing = await getEmprendedor();
  if (existing) {
    return existing;
  }
  return createEmprendedor();
}
