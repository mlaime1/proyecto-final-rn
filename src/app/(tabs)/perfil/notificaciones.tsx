// notificaciones.tsx
//
// Preferencias y estado de Web Push del barbero (PWA, solo web).
// Usa `src/lib/push/*` (Web APIs estándar, sin expo-notifications):
// `detect.ts` para el estado, `subscription.ts` para activar/desactivar.
//
// Estados:
// - `no-instalada`: iOS sin instalar (Add to Home Screen pendiente) ->
//   guía de instalación, botón Activar desactivado con el motivo.
// - `instalada-sin-permiso`: PWA instalada (o navegador de escritorio)
//   sin suscripción -> botón Activar (el tap es el gesto que el
//   navegador exige para pedir permiso).
// - `activa`: hay suscripción vigente -> detalle + botón Desactivar.
// - `no-soportado`: navegador sin Web Push.
// - `cuenta-no-vinculada`: el usuario logueado no tiene fila en `Barbero`.
//
// Los toggles leen y guardan `notify_on_reserva` / `notify_on_cancelacion`
// en la fila `Barbero` del usuario (GRANT por columna de la migración
// phase10_push_barbero.sql). Si VAPID aún no existe (T5 la genera),
// `subscribe()` lanza y se muestra un mensaje claro sin crashear.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBarbero } from '@/services/barbero.service';
import { supabase } from '@/lib/supabase';
import { isIOS, isPushSupported, needsInstall } from '@/lib/push/detect';
import { getCurrentSubscription, subscribe, unsubscribe } from '@/lib/push/subscription';
import Screen from '@/components/ui/Screen';
import ProfileHeader from '@/components/ui/ProfileHeader';
import { showAlert } from '@/lib/alert';

type PushStatus =
  | 'cargando'
  | 'no-instalada'
  | 'instalada-sin-permiso'
  | 'activa'
  | 'no-soportado'
  | 'cuenta-no-vinculada';

const VAPID_PENDIENTE = 'Push aún no configurado por el admin (falta VAPID)';

function isVapidMissing(message: string): boolean {
  return message.includes('VAPID') || message.includes('EXPO_PUBLIC_VAPID_PUBLIC_KEY');
}

function shortEndpoint(endpoint: string): string {
  if (endpoint.length <= 56) return endpoint;
  return `${endpoint.slice(0, 44)}…${endpoint.slice(-10)}`;
}

export default function NotificacionesScreen() {
  const [status, setStatus] = useState<PushStatus>('cargando');
  const [esIOS, setEsIOS] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [notifyReserva, setNotifyReserva] = useState(true);
  const [notifyCancelacion, setNotifyCancelacion] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const cargarPreferencias = useCallback(async (barberoId: number) => {
    const { data, error } = await supabase
      .from('Barbero')
      .select('notify_on_reserva, notify_on_cancelacion')
      .eq('id', barberoId)
      .maybeSingle();
    if (error || !data) return;
    setNotifyReserva(data.notify_on_reserva);
    setNotifyCancelacion(data.notify_on_cancelacion);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setEsIOS(isIOS());
        // iOS exige app instalada para Web Push: la guía va primero, aun
        // cuando el tab de Safari no expone PushManager (no-soportado).
        if (needsInstall()) {
          if (mounted) setStatus('no-instalada');
          const barbero = await getBarbero();
          if (mounted && barbero) await cargarPreferencias(barbero.id);
          return;
        }
        if (!isPushSupported()) {
          if (mounted) setStatus('no-soportado');
          const barbero = await getBarbero();
          if (mounted && barbero) await cargarPreferencias(barbero.id);
          return;
        }
        const barbero = await getBarbero();
        if (!mounted) return;
        if (!barbero) {
          setStatus('cuenta-no-vinculada');
          return;
        }
        await cargarPreferencias(barbero.id);
        if (!mounted) return;
        const current = await getCurrentSubscription();
        if (!mounted) return;
        if (current) {
          setEndpoint(shortEndpoint(current.endpoint));
          setStatus('activa');
        } else {
          setStatus('instalada-sin-permiso');
        }
      } catch {
        if (mounted) setStatus('no-soportado');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [cargarPreferencias]);

  const guardarPrefs = async (nextReserva: boolean, nextCancelacion: boolean) => {
    const anteriorReserva = notifyReserva;
    const anteriorCancelacion = notifyCancelacion;
    setNotifyReserva(nextReserva);
    setNotifyCancelacion(nextCancelacion);
    setSavingPrefs(true);
    try {
      const barbero = await getBarbero();
      if (!barbero) {
        throw new Error('Tu cuenta no está vinculada a ninguna barbería.');
      }
      const { error } = await supabase
        .from('Barbero')
        .update({ notify_on_reserva: nextReserva, notify_on_cancelacion: nextCancelacion })
        .eq('id', barbero.id);
      if (error) {
        throw new Error('No se pudieron guardar las preferencias. Intenta de nuevo.');
      }
    } catch (err) {
      setNotifyReserva(anteriorReserva);
      setNotifyCancelacion(anteriorCancelacion);
      const message = err instanceof Error ? err.message : 'No se pudieron guardar.';
      showAlert('Error', message);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Llamado desde onPress: el tap es el gesto que el navegador exige
  // para permitir `Notification.requestPermission()`.
  const handleActivar = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const sub = await subscribe();
      setEndpoint(shortEndpoint(sub.endpoint));
      setStatus('activa');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo activar. Intenta de nuevo.';
      setErrorMsg(isVapidMissing(message) ? VAPID_PENDIENTE : message);
    } finally {
      setBusy(false);
    }
  };

  const handleDesactivar = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await unsubscribe();
      setEndpoint(null);
      setStatus('instalada-sin-permiso');
      setInfoMsg(
        'Notificaciones desactivadas en este dispositivo. Las suscripciones vencidas o revocadas (410) se eliminan automáticamente.',
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo desactivar. Intenta de nuevo.';
      setErrorMsg(isVapidMissing(message) ? VAPID_PENDIENTE : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ProfileHeader title="Notificaciones" />

      {status === 'cargando' ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4C1D95" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Notificaciones</Text>
          <Text style={styles.intro}>
            Recibe un aviso push en este dispositivo cuando haya una reserva nueva o una
            cancelación. Elige qué eventos te avisan.
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Estado</Text>

            {status === 'cuenta-no-vinculada' && (
              <View style={styles.noticeBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.noticeText}>
                  Tu cuenta no está vinculada a ninguna barbería. Contacta al administrador.
                </Text>
              </View>
            )}

            {status === 'no-soportado' && (
              <View style={styles.noticeBox}>
                <Ionicons name="phone-portrait-outline" size={18} color="#64748B" />
                <Text style={styles.noticeText}>
                  Este navegador no soporta notificaciones push. Usa Chrome en Android o Safari en
                  iPhone con la app instalada.
                </Text>
              </View>
            )}

            {status === 'no-instalada' && (
              <>
                {esIOS ? (
                  <View style={styles.noticeBox}>
                    <Ionicons name="share-outline" size={18} color="#4C1D95" />
                    <Text style={styles.noticeText}>
                      En Safari toca Compartir y luego «Añadir a pantalla de inicio». Después abre
                      la app desde el icono para activar las notificaciones. Requiere iOS 16.4 o
                      superior.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noticeBox}>
                    <Ionicons name="download-outline" size={18} color="#4C1D95" />
                    <Text style={styles.noticeText}>
                      En Chrome abre el menú y toca «Instalar app» o «Añadir a pantalla de inicio».
                      Después abre la app instalada para activar las notificaciones.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.btnPrimary, styles.btnDisabled]}
                  disabled
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Activar notificaciones"
                  accessibilityState={{ disabled: true }}
                >
                  <Text style={styles.btnPrimaryText}>Activar notificaciones</Text>
                </TouchableOpacity>
                <Text style={styles.disabledHint}>
                  Instala primero la app para activar las notificaciones.
                </Text>
              </>
            )}

            {status === 'instalada-sin-permiso' && (
              <>
                <Text style={styles.statusText}>
                  Las notificaciones están desactivadas en este dispositivo.
                </Text>
                <TouchableOpacity
                  style={[styles.btnPrimary, busy && styles.btnDisabled]}
                  onPress={handleActivar}
                  disabled={busy}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Activar notificaciones"
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Activar notificaciones</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {status === 'activa' && (
              <>
                <View style={styles.activeRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                  <Text style={styles.activeText}>Notificaciones activas en este dispositivo.</Text>
                </View>
                {endpoint && (
                  <Text style={styles.endpointText} numberOfLines={2}>
                    {endpoint}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.btnDanger, busy && styles.btnDisabled]}
                  onPress={handleDesactivar}
                  disabled={busy}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Desactivar notificaciones"
                >
                  {busy ? (
                    <ActivityIndicator color="#DC2626" />
                  ) : (
                    <Text style={styles.btnDangerText}>Desactivar</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {errorMsg && (
              <View style={[styles.noticeBox, styles.errorBox]}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.noticeText, styles.errorText]}>{errorMsg}</Text>
              </View>
            )}

            {infoMsg && (
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#4C1D95" />
                <Text style={styles.noticeText}>{infoMsg}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Avisos</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Reservas nuevas</Text>
                <Text style={styles.toggleSubtitle}>Avisar cuando se cree un turno</Text>
              </View>
              <Switch
                value={notifyReserva}
                onValueChange={(v) => guardarPrefs(v, notifyCancelacion)}
                disabled={savingPrefs || status === 'cuenta-no-vinculada'}
                trackColor={{ false: '#E2E8F0', true: '#4C1D95' }}
                thumbColor="#FFFFFF"
                accessibilityRole="switch"
                accessibilityLabel="Avisar reservas nuevas"
              />
            </View>

            <View style={[styles.toggleRow, styles.toggleRowLast]}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Cancelaciones</Text>
                <Text style={styles.toggleSubtitle}>Avisar cuando se cancele un turno</Text>
              </View>
              <Switch
                value={notifyCancelacion}
                onValueChange={(v) => guardarPrefs(notifyReserva, v)}
                disabled={savingPrefs || status === 'cuenta-no-vinculada'}
                trackColor={{ false: '#E2E8F0', true: '#4C1D95' }}
                thumbColor="#FFFFFF"
                accessibilityRole="switch"
                accessibilityLabel="Avisar cancelaciones"
              />
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { paddingTop: 8, paddingBottom: 40, gap: 16 },
  h1: { color: '#0F172A', fontSize: 22, fontWeight: '700', marginBottom: 2 },
  intro: { color: '#64748B', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  statusText: { color: '#0F172A', fontSize: 14, lineHeight: 20 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  noticeText: { flex: 1, color: '#0F172A', fontSize: 13.5, lineHeight: 19 },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#991B1B' },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeText: { color: '#15803D', fontSize: 14, fontWeight: '600', flex: 1 },
  endpointText: { color: '#94A3B8', fontSize: 11.5, lineHeight: 16 },
  btnPrimary: {
    backgroundColor: '#4C1D95',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  disabledHint: { color: '#64748B', fontSize: 12.5, textAlign: 'center' },
  btnDanger: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDangerText: { color: '#DC2626', fontWeight: '700', fontSize: 14.5 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    gap: 12,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleTextWrap: { flex: 1 },
  toggleTitle: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  toggleSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
});
