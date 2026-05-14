import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

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
};

/* =========================
   GET TURNOS (FILTRADO + JOIN)
========================= */
export async function getTurnos(): Promise<TurnoUI[]> {
  // 1. usuario logueado
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  console.log(userId);
  

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

export async function getTurnosPorDia(date: Date) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return [];

  const { data: emprendedor } = await supabase
    .from('Emprendedor')
    .select('id')
    .eq('users_id', userId)
    .single();

  if (!emprendedor) return [];

  const tzOffset = date.getTimezoneOffset() * 60000;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const startString = new Date(startOfDay.getTime() - tzOffset).toISOString().slice(0, -1);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const endString = new Date(endOfDay.getTime() - tzOffset).toISOString().slice(0, -1);

  const { data, error } = await supabase
    .from('Turno')
    .select(`
      id,
      inicio,
      estado,
      Servicio ( duracion )
    `)
    .eq('emprendedor_id', emprendedor.id)
    .neq('estado', 'cancelado')
    .gte('inicio', startString)
    .lte('inicio', endString);

  if (error) throw new Error(error.message);

  return data;
}

/* =========================
   GET POR ID
========================= */
export async function getTurnoById(id: number) {
  const { data, error } = await supabase
    .from('Turno')
    .select(`
      *,
      Cliente ( nombre ),
      Servicio ( nombre, precio, duracion )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Turno & {
    Cliente: { nombre: string } | null;
    Servicio: { nombre: string | null; precio: number | null; duracion: number | null } | null;
  };
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
    .eq('users_id', userId)
    .single();

  if (!emprendedor) throw new Error('Emprendedor no encontrado');

  // 3. buscar o crear cliente
  let clienteId: number;

  const { data: existingCliente } = await supabase
    .from('Cliente')
    .select('id')
    .eq('telefono', telefono)
    .maybeSingle();

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
    .from('Turno')
    .insert({
      cliente_id: clienteId,
      servicio_id,
      inicio,
      emprendedor_id: emprendedor.id,
      estado: 'confirmado',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  return createdTurno as Turno;
}

/* =========================
   UPDATE
========================= */
export async function updateTurno(id: number, data: TurnoUpdate) {
  const { data: updatedTurno, error } = await supabase
    .from('Turno')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

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

  return true;
}