import { create } from 'zustand';
import { Database } from '@/types/database.types';

// Horario de la barbería: se trae completo (no solo el nombre) para poder
// resolver la cascada Barbero → Barberia → default cuando al barbero le
// falta alguna parte de su propio horario.
export type CachedBarberiaHorario = Pick<
  Database['public']['Tables']['Barberia']['Row'],
  'nombre' | 'dias_habiles' | 'hora_apertura' | 'hora_cierre'
>;

export type CachedBarbero = Pick<
  Database['public']['Tables']['Barbero']['Row'],
  'id' | 'nombre' | 'dias_habiles' | 'hora_apertura' | 'hora_cierre'
> & {
  Barberia: CachedBarberiaHorario | null;
};

export type CachedServicio = Database['public']['Tables']['Servicio']['Row'];

type AppState = {
  ready: boolean;
  barbero: CachedBarbero | null;
  servicios: CachedServicio[] | null;
};

type AppActions = {
  setReady: (value: boolean) => void;
  setBarbero: (barbero: CachedBarbero | null) => void;
  setServicios: (servicios: CachedServicio[] | null) => void;
  clearSessionData: () => void;
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ready: false,
  barbero: null,
  servicios: null,
  setReady: (value) => set({ ready: value }),
  setBarbero: (barbero) => set({ barbero }),
  setServicios: (servicios) => set({ servicios }),
  clearSessionData: () => set({ barbero: null, servicios: null }),
}));
