// src/lib/env.ts
// Expo automatically injects EXPO_PUBLIC_* variables into process.env.
// We read them directly and fall back to Expo Constants for standalone builds.
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

function getEnvVar(name: string, fallback?: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[name] ?? (extra as Record<string, string | undefined>)[name] ?? fallback;
}

export const ENV = {
  API_URL: getEnvVar('EXPO_PUBLIC_API_URL'),
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_KEY'),
};
