// cambiar-password.tsx
//
// Permite al barbero logueado cambiar la contraseña con la que entra a la app.
// Pide la clave actual a propósito: la validación real ocurre en el servidor
// (`authService.changePassword` re-autentica antes de actualizar), así que la
// pantalla solo hace la validación de forma y deja los errores del proveedor
// mapeados a mensajes propios.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { authService } from '@/services/auth.service';
import { isServiceError } from '@/services/error';
import { colors, radius, spacing, type } from '@/components/horario/theme';
import Screen from '@/components/ui/Screen';
import ProfileHeader from '@/components/ui/ProfileHeader';
import { showAlert } from '@/lib/alert';

// Misma regla que aplica `login.tsx` al ingreso.
const MIN_PASSWORD_LENGTH = 6;

const GENERIC_ERROR = 'No se pudo cambiar la contraseña. Intentá de nuevo.';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  editable: boolean;
};

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  editable,
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={label}
          placeholderTextColor={colors.inkSoft}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onToggleVisibility}
          disabled={!editable}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`
          }
        >
          <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Traduce el error del servicio a un mensaje apto para la pantalla.
 * Solo se muestra texto propio: el mensaje crudo de Supabase nunca llega
 * al usuario.
 */
function mapError(error: unknown): string {
  if (isServiceError(error)) {
    if (error.code === 'CONTRASENA_ACTUAL_INVALIDA') {
      return 'La contraseña actual no es correcta.';
    }
    return error.message || GENERIC_ERROR;
  }
  return GENERIC_ERROR;
}

export default function CambiarPasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (setter: (text: string) => void) => (text: string) => {
    setter(text);
    if (localError) setLocalError(null);
  };

  const validate = (): string | null => {
    if (!currentPassword) return 'Ingresá tu contraseña actual.';
    if (!newPassword) return 'Ingresá la contraseña nueva.';
    if (!confirmPassword) return 'Repetí la contraseña nueva.';
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
    }
    if (newPassword === currentPassword) {
      return 'La contraseña nueva tiene que ser distinta de la actual.';
    }
    if (newPassword !== confirmPassword) {
      return 'Las contraseñas nuevas no coinciden.';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    setSubmitting(true);

    try {
      await authService.changePassword({ currentPassword, newPassword });
      showAlert('Listo', 'Tu contraseña fue actualizada.', {
        type: 'success',
        onConfirm: () => router.back(),
      });
      // `submitting` no se baja acá a propósito: el alert de éxito bloquea la
      // pantalla y recién en `onConfirm` se vuelve atrás, así que no hay
      // ventana para un segundo envío.
    } catch (error) {
      setLocalError(mapError(error));
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader title="Cambiar contraseña" />

        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Cambiar contraseña</Text>
          <Text style={styles.intro}>
            Necesitás confirmar tu contraseña actual para generar una nueva.
          </Text>

          <PasswordField
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={handleChange(setCurrentPassword)}
            visible={showCurrent}
            onToggleVisibility={() => setShowCurrent(!showCurrent)}
            editable={!submitting}
          />

          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={handleChange(setNewPassword)}
            visible={showNew}
            onToggleVisibility={() => setShowNew(!showNew)}
            editable={!submitting}
          />

          <PasswordField
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChangeText={handleChange(setConfirmPassword)}
            visible={showConfirm}
            onToggleVisibility={() => setShowConfirm(!showConfirm)}
            editable={!submitting}
          />

          {localError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Cambiar contraseña"
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  screen: { paddingTop: spacing(2), paddingBottom: spacing(10) },
  h1: { ...type.h1, color: colors.ink, marginBottom: spacing(2) },
  intro: { ...type.body, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing(6) },

  field: { marginBottom: spacing(4) },
  label: { ...type.label, color: colors.inkSoft, marginBottom: spacing(2) },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    paddingRight: spacing(2),
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingVertical: 12,
    fontSize: 14.5,
    color: colors.ink,
  },
  eyeButton: { padding: spacing(2) },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(3),
    paddingVertical: 12,
    marginBottom: spacing(4),
    gap: spacing(2.5),
  },
  errorText: { color: colors.danger, fontSize: 13.5, fontWeight: '500', flex: 1 },

  btnPrimary: {
    marginTop: spacing(6),
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14.5 },
});
