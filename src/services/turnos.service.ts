import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

<<<<<<< HEAD
export type Turno = {
  id: string;
  created_at?: string;
  duracion?: string;
  estado?: string;
  inicio?: string;
  precio?: number;
  cliente_id?: number;
  emprendedor_id?: number;
  fin?: string;
  update_at?: string;
=======
/* =========================
   Tipos base DB
========================= */
export type Turno = Database['public']['Tables']['Turno']['Row'];
export type TurnoInsert = Database['public']['Tables']['Turno']['Insert'];
export type TurnoUpdate = Database['public']['Tables']['Turno']['Update'];
export type Servicio = Database['public']['Tables']['Servicio']['Row'];

/* =========================
   Tipo UI (con JOIN)
========================= */
export type TurnoUI = {
  id: number;
  inicio: string;
  cliente_id: number;
  servicio_id: number;
  cliente_nombre: string;
  servicio_nombre: string;
  estado: string;
>>>>>>> 1237760ddf601d4eb81b09b827ec4700e814e55d
};

/* =========================
   GET TURNOS (FILTRADO + JOIN)
========================= */
export async function getTurnos(): Promise<TurnoUI[]> {
  // 1. usuario logueado
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  console.log(userId);
  

<<<<<<< HEAD
export async function getTurnos() {
  const { data, error } = await supabase.from('turnos').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as Turno[];
}

export async function getTurnoById(id: string) {
  const { data, error } = await supabase.from('turnos').select('*').eq('id', id).single();
=======
  if (!userId) return [];

  // 2. obtener emprendedor
  const { data: emprendedor, error: empError } = await supabase
    .from('Emprendedor')
    .select('id')
    .eq('users_id', userId)
    .single();

  if (empError || !emprendedor) return [];

  // 3. traer turnos del emprendedor
  const { data, error } = await supabase
    .from('Turno')
    .select(`
      id,
      inicio,
      cliente_id,
      servicio_id,
      estado,
      Cliente ( nombre ),
      Servicio ( nombre )
    `)
    .eq('emprendedor_id', emprendedor.id)
    .order('inicio', { ascending: true });

  if (error) throw new Error(error.message);

  // 4. map a UI
  return data.map((t: any) => ({
    id: t.id,
    inicio: t.inicio,
    cliente_id: t.cliente_id,
    servicio_id: t.servicio_id,
    cliente_nombre: t.Cliente?.nombre ?? 'Sin cliente',
    servicio_nombre: t.Servicio?.nombre ?? 'Sin servicio',
    estado: t.estado ?? 'pendiente',
  }));
}

/* =========================
   GET POR ID
========================= */
export async function getTurnoById(id: number) {
  const { data, error } = await supabase
    .from('Turno')
    .select('*')
    .eq('id', id)
    .single();

>>>>>>> 1237760ddf601d4eb81b09b827ec4700e814e55d
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
   CREAR TURNO
========================= */
export type CreateAppointmentData = {
  nombre: string;
  apellido: string;
  telefono: number;
  servicio_id: number;
  inicio: string;
  emprendedor_id?: number;
};

export async function createAppointment(data: CreateAppointmentData) {
  const { nombre, apellido, telefono, servicio_id, inicio } = data;

  // 1. usuario actual
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) throw new Error('Usuario no autenticado');

  // 2. obtener emprendedor
  const { data: emprendedor } = await supabase
    .from('Emprendedor')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!emprendedor) throw new Error('Emprendedor no encontrado');

  // 3. buscar o crear cliente
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

  // 4. crear turno
  const { data: createdTurno, error } = await supabase
<<<<<<< HEAD
    .from('turnos')
    .insert(data)
=======
    .from('Turno')
    .insert({
      cliente_id: clienteId,
      servicio_id,
      inicio,
      emprendedor_id: emprendedor.id,
      estado: 'confirmado',
    })
>>>>>>> 1237760ddf601d4eb81b09b827ec4700e814e55d
    .select('*')
    .single();

  if (error) throw new Error(error.message);
<<<<<<< HEAD
  return createdTurno as Turno;
}

export async function updateTurno(id: string, data: Partial<TurnoInput>) {
=======

  return createdTurno as Turno;
}

/* =========================
   UPDATE
========================= */
export async function updateTurno(id: number, data: TurnoUpdate) {
>>>>>>> 1237760ddf601d4eb81b09b827ec4700e814e55d
  const { data: updatedTurno, error } = await supabase
    .from('turnos')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
<<<<<<< HEAD
  return updatedTurno as Turno;
}

export async function deleteTurno(id: string) {
  const { error } = await supabase.from('turnos').delete().eq('id', id);
  if (error) throw new Error(error.message);
=======

  return updatedTurno as Turno;
}

/* =========================
   DELETE
========================= */
export async function deleteTurno(id: number) {
  const { error } = await supabase
    .from('Turno')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

>>>>>>> 1237760ddf601d4eb81b09b827ec4700e814e55d
  return true;
}