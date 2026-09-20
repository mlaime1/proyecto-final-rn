import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info';

export type AlertOptions = {
  type?: AlertType;
  onConfirm?: () => void;
};

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm: (() => void) | null;
};

type AlertActions = {
  open: (title: string, message: string, options?: AlertOptions) => void;
  close: () => void;
};

export const useAlertStore = create<AlertState & AlertActions>((set) => ({
  visible: false,
  title: '',
  message: '',
  type: 'info',
  onConfirm: null,
  open: (title, message, options = {}) =>
    set({
      visible: true,
      title,
      message,
      type: options.type ?? 'info',
      onConfirm: options.onConfirm ?? null,
    }),
  close: () => set({ visible: false, onConfirm: null }),
}));

/**
 * Muestra un mensaje al usuario de forma cross-platform.
 *
 * En web `Alert.alert` es un no-op de react-native-web, así que el mensaje se
 * publica en un store que `AlertHost` renderiza con `AlertModal`. En nativo se
 * conserva el comportamiento original de `Alert.alert`.
 */
export function showAlert(title: string, message: string, options: AlertOptions = {}): void {
  if (Platform.OS === 'web') {
    useAlertStore.getState().open(title, message, options);
    return;
  }

  const { onConfirm } = options;
  Alert.alert(title, message, onConfirm ? [{ text: 'Entendido', onPress: onConfirm }] : undefined);
}
