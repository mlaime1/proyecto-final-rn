/**
 * Registers the Web Push service worker (`/sw-push.js`).
 *
 * Framework-agnostic on purpose: plain Web APIs only (`window`, `navigator`),
 * no `expo-*`, no `react-native`. Safe to copy as-is into a Next.js app.
 *
 * The caller decides the platform gate (this repo: `Platform.OS === 'web'`
 * in the root layout). This function double-checks for a browser with
 * service-worker support and resolves `null` when registration is not
 * possible instead of throwing.
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw-push.js');
  } catch {
    return null;
  }
}
