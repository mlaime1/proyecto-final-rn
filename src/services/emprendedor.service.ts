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
    throw new Error('No se pudo cargar tu perfil de emprendedor.');
  }

  return data;
}

export async function createEmprendedor(userId: string, email?: string): Promise<Emprendedor> {
  const fallbackName = email ? email.split('@')[0] : 'Emprendedor';

  const { data, error } = await supabase
    .from('Emprendedor')
    .insert({
      users_id: userId,
      nombre: fallbackName,
      activo: true,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error('No se pudo crear tu perfil de emprendedor. Intentá de nuevo.');
  }

  if (!data) {
    throw new Error('No se pudo crear tu perfil de emprendedor.');
  }

  return data;
}