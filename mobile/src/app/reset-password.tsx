import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Card, useColors } from "../components/ui";
import { IdentityBanner } from "../components/WorkspaceDesign";

export default function ResetPasswordScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const params = useLocalSearchParams<{ challengeId?: string; email?: string }>();

  const [challengeId, setChallengeId] = useState(params.challengeId || "");
  const [email, setEmail] = useState(params.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState(
    params.challengeId ? "Revisá tu bandeja de entrada o spam para ver el código de 6 dígitos." : "",
  );

  // Validaciones en tiempo real de la contraseña
  const hasMinLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Si no hay challengeId, solicitar envío por correo
  async function handleRequestCode() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Ingresá un correo electrónico válido");
      return;
    }
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const { data } = await session.publicApi.post("/auth/forgot-password", {
        email: trimmed,
      });
      setChallengeId(data.data.challengeId);
      setInfo(data.data.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Reenviar código
  async function handleResend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("No se pudo identificar el correo para reenviar.");
      return;
    }
    setError("");
    setInfo("");
    setResending(true);
    try {
      const { data } = await session.publicApi.post("/auth/forgot-password", {
        email: trimmed,
      });
      if (data.data?.challengeId) {
        setChallengeId(data.data.challengeId);
      }
      setInfo(data.data.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  }

  // Guardar nueva contraseña
  async function handleResetPassword() {
    if (busy) return;
    setError("");
    setSuccess("");

    const cleanCode = code.trim().replace(/\D/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Ingresá el código de 6 dígitos que llegó a tu correo");
      return;
    }

    if (!isPasswordValid) {
      setError("La contraseña no cumple con los requisitos de seguridad requeridos.");
      return;
    }

    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      await session.publicApi.post("/auth/reset-password", {
        challengeId,
        code: cleanCode,
        password,
      });
      setSuccess("¡Contraseña guardada con éxito! Redirigiendo al inicio de sesión…");
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title={challengeId ? "Crear nueva contraseña" : "Recuperar contraseña"}
      subtitle={
        challengeId
          ? "Ingresá el código recibido y tu nueva contraseña."
          : "Te enviaremos un código para crear una contraseña nueva."
      }
    >
      <IdentityBanner
        title="Accedé a tu cuenta."
        subtitle="Elegí una contraseña segura para volver a ingresar con tranquilidad."
        badge="RECUPERACIÓN DE ACCESO"
        icon="key-outline"
      />

      <Card>
        {/* Banner de error */}
        {!!error && (
          <View style={[styles.banner, { backgroundColor: c.pill, borderColor: c.red }]}>
            <Ionicons name="alert-circle-outline" size={18} color={c.red} />
            <Text style={[styles.bannerText, { color: c.red }]}>{error}</Text>
          </View>
        )}

        {/* Banner de información */}
        {!!info && (
          <View style={[styles.banner, { backgroundColor: c.pill, borderColor: c.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={c.green} />
            <Text style={[styles.bannerText, { color: c.dark }]}>{info}</Text>
          </View>
        )}

        {/* Banner de éxito */}
        {!!success && (
          <View style={[styles.banner, { backgroundColor: c.pill, borderColor: c.green }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={c.green} />
            <Text style={[styles.bannerText, { color: c.green }]}>{success}</Text>
          </View>
        )}

        {!challengeId ? (
          // Paso 1: Ingreso de correo electrónico para recibir el código
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: c.dark }]}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <Ionicons name="mail-outline" size={18} color={c.muted} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: c.dark }]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={c.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: c.green }, busy && { opacity: 0.6 }]}
              onPress={handleRequestCode}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={c.dark} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: c.dark }]}>Enviar código por correo</Text>
              )}
            </Pressable>
          </View>
        ) : (
          // Paso 2: Código + Nueva contraseña + Confirmación
          <View style={styles.formGroup}>
            {/* Campo de Código */}
            <View style={styles.fieldBlock}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: c.dark }]}>Código de 6 dígitos</Text>
                {!!email && (
                  <Pressable onPress={handleResend} disabled={resending}>
                    <Text style={[styles.linkText, { color: c.green }]}>
                      {resending ? "Reenviando…" : "Reenviar código"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: c.inputBg, borderColor: c.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={c.muted} style={styles.icon} />
                <TextInput
                  style={[styles.input, { color: c.dark, letterSpacing: 4, fontWeight: "700" }]}
                  placeholder="000000"
                  placeholderTextColor={c.muted}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Campo Nueva Contraseña */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: c.dark }]}>Nueva contraseña</Text>
              <View style={[styles.inputWrapper, { backgroundColor: c.inputBg, borderColor: c.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={c.muted} style={styles.icon} />
                <TextInput
                  style={[styles.input, { color: c.dark }]}
                  placeholder="Escribí tu nueva contraseña"
                  placeholderTextColor={c.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={c.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Requisitos visuales de contraseña */}
            <View style={[styles.requirementsBox, { backgroundColor: c.bg, borderColor: c.border }]}>
              <Text style={[styles.requirementsTitle, { color: c.muted }]}>Requisitos de seguridad:</Text>
              <View style={styles.reqItem}>
                <Ionicons
                  name={hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={hasMinLength ? c.green : c.muted}
                />
                <Text style={[styles.reqText, { color: hasMinLength ? c.dark : c.muted }]}>
                  Mínimo 10 caracteres
                </Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons
                  name={hasUpper ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={hasUpper ? c.green : c.muted}
                />
                <Text style={[styles.reqText, { color: hasUpper ? c.dark : c.muted }]}>
                  Al menos una letra mayúscula (A-Z)
                </Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons
                  name={hasLower ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={hasLower ? c.green : c.muted}
                />
                <Text style={[styles.reqText, { color: hasLower ? c.dark : c.muted }]}>
                  Al menos una letra minúscula (a-z)
                </Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons
                  name={hasNumber ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={hasNumber ? c.green : c.muted}
                />
                <Text style={[styles.reqText, { color: hasNumber ? c.dark : c.muted }]}>
                  Al menos un número (0-9)
                </Text>
              </View>
            </View>

            {/* Campo Confirmar Contraseña */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: c.dark }]}>Confirmar contraseña</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: c.inputBg,
                    borderColor: confirmPassword && !passwordsMatch ? c.red : c.border,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={c.muted} style={styles.icon} />
                <TextInput
                  style={[styles.input, { color: c.dark }]}
                  placeholder="Repetí tu nueva contraseña"
                  placeholderTextColor={c.muted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={c.muted}
                  />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={[styles.fieldError, { color: c.red }]}>Las contraseñas no coinciden</Text>
              )}
            </View>

            {/* Botón Guardar */}
            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: c.green },
                (!isPasswordValid || !passwordsMatch || busy) && { opacity: 0.6 },
              ]}
              onPress={handleResetPassword}
              disabled={!isPasswordValid || !passwordsMatch || busy}
            >
              {busy ? (
                <ActivityIndicator color={c.dark} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: c.dark }]}>Guardar nueva contraseña</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Volver a inicio de sesión */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/login")}
        >
          <Ionicons name="arrow-back-outline" size={16} color={c.muted} />
          <Text style={[styles.backButtonText, { color: c.muted }]}>Volver a Iniciar sesión</Text>
        </Pressable>
      </Card>
    </Page>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    formGroup: {
      gap: 16,
    },
    fieldBlock: {
      gap: 6,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
    },
    linkText: {
      fontSize: 13,
      fontWeight: "600",
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 10,
    },
    eyeBtn: {
      padding: 6,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    bannerText: {
      fontSize: 13,
      fontWeight: "500",
      flex: 1,
    },
    requirementsBox: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 6,
    },
    requirementsTitle: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    reqItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    reqText: {
      fontSize: 12,
      fontWeight: "500",
    },
    fieldError: {
      fontSize: 12,
      fontWeight: "500",
      marginTop: 2,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      marginTop: 4,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: "500",
    },
  });
