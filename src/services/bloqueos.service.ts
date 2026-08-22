import { supabase } from '@/lib/supabase';
import { getBarbero } from '@/services/barbero.service';
import { Database } from '@/types/database.types';

export type BloqueoHorario = Database['public']['Tables']['BloqueoHorario']['Row'];
export type BloqueoHorarioInsert = Database['public']['Tables']['BloqueoHorario']['Insert'];

async function getCurrentBarbero() {
  const barbero = await getBarbero();
  if (!barbero) {
    throw new Error('Tu cuenta no está vinculada a ninguna barbería. Contactá al administrador.');
  }
  return barbero;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* =========================
   GET BLOQUEOS DE UN DIA
========================= */
export async function getBloqueosDelDia(date: Date): Promise<BloqueoHorario[]> {
  const barbero = await getCurrentBarbero();

  const { data, error } = await supabase
    .from('BloqueoHorario')
    .select('*')
    .eq('barbero_id', barbero.id)
    .eq('fecha', toDateString(date));

  if (error) throw new Error('No se pudieron cargar los bloqueos del día.');

  return (data ?? []) as BloqueoHorario[];
}

/* =========================
   GET TODOS LOS BLOQUEOS (futuros)
========================= */
export async function getBloqueos(): Promise<BloqueoHorario[]> {
  const barbero = await getCurrentBarbero();

  const { data, error } = await supabase
    .from('BloqueoHorario')
    .select('*')
    .eq('barbero_id', barbero.id)
    .gte('fecha', toDateString(new Date()))
    .order('fecha', { ascending: true });

  if (error) throw new Error('No se pudieron cargar los bloqueos.');

  return (data ?? []) as BloqueoHorario[];
}

/* =========================
   CREAR BLOQUEO
   hora_inicio/hora_fin null = día completo
========================= */
export type CreateBloqueoData = {
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  motivo?: string | null;
};

export async function createBloqueo(data: CreateBloqueoData): Promise<BloqueoHorario> {
  const barbero = await getCurrentBarbero();

  const { data: created, error } = await supabase
    .from('BloqueoHorario')
    .insert({
      barbero_id: barbero.id,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio ?? null,
      hora_fin: data.hora_fin ?? null,
      motivo: data.motivo ?? null,
    })
    .select('*')
    .single();

  if (error || !created) throw new Error('No se pudo crear el bloqueo.');

  return created as BloqueoHorario;
}

/* =========================
   ELIMINAR BLOQUEO
========================= */
export async function deleteBloqueo(id: number): Promise<boolean> {
  const barbero = await getCurrentBarbero();

  const { error } = await supabase
    .from('BloqueoHorario')
    .delete()
    .eq('id', id)
    .eq('barbero_id', barbero.id);

  if (error) throw new Error('No se pudo eliminar el bloqueo.');

  return true;
}
