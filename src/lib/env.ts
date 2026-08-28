// src/lib/env.ts
// Expo automatically injects EXPO_PUBLIC_* variables into process.env.
// Static property access is required for Expo to inline them in production builds.
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl,
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? extra.supabaseAnonKey,
};
