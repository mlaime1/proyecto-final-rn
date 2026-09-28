/**
 * Suscripción Web Push del barbero (PushManager + tabla `push_subscriptions`).
 *
 * Solo Web APIs estándar + cliente Supabase existente + `getBarbero()` para el
 * `barbero_id`. Sin `expo-*`, sin `react-native`.
 *
 * - `getRegistration()` reutiliza la del SW `/sw-push.js`, NO registra de nuevo.
 * - `subscribe()` pide `Notification.requestPermission()`; llamarla desde un
 *   gesto de la UI (el navegador lo exige), esta función solo la ejecuta.
 * - 404/410 o suscripción expirada se tratan como no-suscrito, sin crashear.
 *
 * PORTABLE A Next.js: este archivo se copia tal cual (solo cambia de dónde
 * viene el cliente Supabase y el `getBarbero()` si aplica).
 */

import { supabase } from '@/lib/supabase';
import { getBarbero } from '@/services/barbero.service';
import { getVapidPublicKey, urlBase64ToUint8Array } from '@/lib/push/vapid';

// Nombre del SW registrado por `registerSw.ts` (scope `/`).
const SW_SCRIPT = 'sw-push.js';

// Busca el registration del SW push entre los activos, sin registrar de nuevo.
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const match = regs.find((r) =>
      [r.active?.scriptURL, r.installing?.scriptURL, r.waiting?.scriptURL].some((url) =>
        url?.includes(SW_SCRIPT),
      ),
    );
    if (match) return match;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

// Suscripción vigente del navegador, o null si no hay / expiró / 404-410.
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  if (!registration) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Convierte ArrayBuffer de `getKey()` a base64 para guardar en la DB.
export function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) {
    throw new Error('La suscripción no expone claves (p256dh/auth).');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Persiste la suscripción con el barbero logueado (upsert por endpoint único).
export async function saveToSupabase(subscription: PushSubscription): Promise<void> {
  const barbero = await getBarbero();
  if (!barbero) {
    throw new Error('Tu cuenta no está vinculada a ninguna barbería. Contactá al administrador.');
  }
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent ?? null) : null;
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      barbero_id: barbero.id,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
      user_agent: userAgent,
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    throw new Error('No se pudo guardar la suscripción push. Intentá de nuevo.');
  }
}

// Crea la suscripción y la guarda. Llamar desde un gesto (tap/click).
export async function subscribe(): Promise<PushSubscription> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Web Push no está disponible en este entorno.');
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta Web Push.');
  }
  const existing = await getCurrentSubscription();
  if (existing) {
    await saveToSupabase(existing);
    return existing;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado.');
  }
  const registration = await getRegistration();
  if (!registration) {
    throw new Error('Service worker /sw-push.js no registrado.');
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
  });
  await saveToSupabase(subscription);
  return subscription;
}

// Cancela la suscripción local y borra su fila por endpoint.
export async function unsubscribe(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    // 404/410 o ya vencida: igual se borra la fila abajo.
  }
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) {
    throw new Error('No se pudo borrar la suscripción push. Intentá de nuevo.');
  }
}

// true si hay suscripción vigente; falso ante cualquier fallo (no-suscrito).
export async function isSubscribed(): Promise<boolean> {
  try {
    return (await getCurrentSubscription()) !== null;
  } catch {
    return false;
  }
}
