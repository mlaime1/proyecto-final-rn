/**
 * Clave pública VAPID + helper de conversión base64.
 *
 * Lee `EXPO_PUBLIC_VAPID_PUBLIC_KEY` vía `process.env` (acceso estático, mismo
 * patrón que `supabase.ts` usa para `EXPO_PUBLIC_*`; Expo lo inyecta en build).
 * Sin `expo-*`, sin `react-native`.
 *
 * PORTABLE A Next.js: este archivo se copia tal cual; solo cambia el nombre
 * de la env var si aplica (ej. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
 */

// Falla con mensaje claro si falta la clave (mejor que un 500 críptico).
export function getVapidPublicKey(): string {
  const key = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY : undefined;
  if (!key) {
    throw new Error(
      'Falta EXPO_PUBLIC_VAPID_PUBLIC_KEY en el entorno. Agregala a tu .env (nunca la commitees).',
    );
  }
  return key;
}

// Convierte clave VAPID url-safe base64 a Uint8Array para `applicationServerKey`.
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
