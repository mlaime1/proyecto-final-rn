import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app.store';
import { ServiceError } from '@/services/error';

export type AuthCredentials = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

/**
 * Cambia la contraseña de acceso del usuario logueado.
 *
 * Exige la contraseña actual: primero se re-autentica con
 * `signInWithPassword` y recién después se envía la nueva. Así el barbero
 * no puede dejar la cuenta sin clave por un error de tipeo, y un acceso
 * indebido no alcanza para bloquear al dueño de la barbería.
 *
 * Ojo: el re-login emite un evento SIGNED_IN, que en `useAuth` dispara
 * `clearSessionData()`. La caché de Barbero/Servicio se repuebla sola en el
 * próximo acceso, pero es un efecto secundario conocido de este flujo.
 *
 * Los errores se lanzan como `ServiceError` con un `code` estable para que la
 * UI distinga "la contraseña actual no es correcta" del resto, sin exponer
 * nunca el mensaje crudo de Supabase.
 */
// Accounts are provisioned manually by the operator; there is no public self-signup.
export const authService = {
  signIn: async ({ email, password }: AuthCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    useAppStore.getState().clearSessionData();
  },
  changePassword: async ({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const email = session?.user?.email;
    if (sessionError || !email) {
      throw new ServiceError('Tu sesión expiró. Volvé a iniciar sesión.', {
        code: 'SIN_SESION',
        cause: sessionError,
      });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      const invalidCredentials = signInError.code === 'invalid_credentials';
      throw new ServiceError(
        invalidCredentials
          ? 'La contraseña actual no es correcta.'
          : 'No se pudo cambiar la contraseña. Intentá de nuevo.',
        {
          code: invalidCredentials ? 'CONTRASENA_ACTUAL_INVALIDA' : 'ERROR_CAMBIAR_CONTRASENA',
          cause: signInError,
        },
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      throw new ServiceError('No se pudo cambiar la contraseña. Intentá de nuevo.', {
        code: 'ERROR_CAMBIAR_CONTRASENA',
        cause: updateError,
      });
    }
  },
};
