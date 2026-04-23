import { create } from 'zustand';

type AppState = {
  ready: boolean;
};

type AppActions = {
  setReady: (value: boolean) => void;
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ready: false,
  setReady: (value) => set({ ready: value }),
}));
