import { create } from 'zustand';
import { Database } from '@/types/database.types';

export type CachedBarbero = Database['public']['Tables']['Barbero']['Row'] & {
  Barberia: Pick<
    Database['public']['Tables']['Barberia']['Row'],
    'nombre' | 'hora_apertura' | 'hora_cierre' | 'dias_habiles'
  > | null;
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
