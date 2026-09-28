/**
 * Detección de soporte Web Push y estado de instalación PWA.
 *
 * Solo Web APIs estándar, SSR-safe (guards `typeof window`). Sin `expo-*`,
 * sin `react-native`.
 *
 * PORTABLE A Next.js: este archivo se copia tal cual, sin cambios.
 */

// Hay soporte Web Push cuando existen las 3 APIs a la vez.
export function isPushSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Corre como PWA instalada (standalone), Android o iOS.
export function isStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const byMediaQuery =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari expone `navigator.standalone` al abrir desde el icono.
  const byIosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return byMediaQuery || byIosStandalone;
}

// Detecta iPhone/iPad/iPod (incluye iPadOS que se reporta como MacIntel).
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

// iOS exige app instalada (Add to Home Screen) para Web Push.
export function needsInstall(): boolean {
  return isIOS() && !isStandalone();
}
