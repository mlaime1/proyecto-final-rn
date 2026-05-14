import { supabase } from '@/lib/supabase';

export type Emprendedor = {
  id: number;
  nombre: string;
  descripcion?: string;
  foto_url?: string;
};

export async function getEmprendedor() {
  // 1. usuario logueado
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return null;

  // 2. buscar emprendedor asociado
  const { data, error } = await supabase
    .from('Emprendedor')
    .select('*')
    .eq('users_id', userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Emprendedor;
}