import { supabase } from '@/lib/supabase';

export type AuthCredentials = {
  email: string;
  password: string;
};

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
  },
};
