import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  Platform,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Browser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { useAuth } from "../contexts/AuthContext";

import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { useColors, ThemeToggleButton } from "../components/ui";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  google: "logo-google",
  github: "logo-github",
  facebook: "logo-facebook",
  discord: "logo-discord",
};

export function AuthForm({ mode }: { mode: "login" | "register" | "recover" }) {
  const auth = useAuth();
  const c = useColors();
  const styles = makeStyles(c);

  const { width } = useWindowDimensions();
  const wide = width >= 850;

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Errors & submission
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setProviders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    session.publicApi
      .get("/auth/social/providers")
      .then((r) => setProviders(r.data.data))
      .catch(() =>
        setError(
          "No se pudo conectar con el servidor. Podés volver a intentarlo.",
        ),
      );
  }, []);

  async function accept(data: any) {
    await auth.accept(data);
    router.replace(
      data.requiresMfa
        ? "/second-factor"
        : data.user.email_verificado
          ? "/"
          : "/verify",
    );
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Ingresá tu correo electrónico";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Ingresá un correo electrónico válido";
    }

    if (mode === "register") {
      if (!nombre.trim()) {
        errs.nombre = "Ingresá tu nombre completo";
      }
      if (!password) {
        errs.password = "Ingresá una contraseña";
      } else if (
        password.length < 10 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        errs.password = "Mínimo 10 caracteres, una mayúscula, una minúscula y un número";
      }
    } else if (mode === "login") {
      if (!password) {
        errs.password = "Ingresá tu contraseña";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (busy) return;
    setError("");
    if (!validate()) return;

    setBusy(true);
    try {
      if (mode === "recover") {
        const { data } = await session.publicApi.post("/auth/forgot-password", {
          email: email.trim(),
        });
        router.push({
          pathname: "/reset-password",
          params: { challengeId: data.data.challengeId },
        });
        return;
      }

      const payload =
        mode === "register"
          ? { nombre: nombre.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const { data } = await session.publicApi.post(`/auth/${mode}`, payload);
      await accept(data.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const bytes = await Crypto.getRandomBytesAsync(32);
      const verifier = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const challenge = (
        await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          verifier,
          { encoding: Crypto.CryptoEncoding.BASE64 },
        )
      )
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const { data } = await session.publicApi.post(
        `/auth/social/${provider}/start`,
        { challenge, platform: Platform.OS === "web" ? "web" : "native" },
      );
      if (Platform.OS === "web") {
        beginWebLogin(verifier, data.data.url);
        return;
      }
      const result = await Browser.openAuthSessionAsync(
        data.data.url,
        "stockflow://oauth",
      );
      if (result.type !== "success") return;
      const url = new URL(result.url);
      if (url.searchParams.get("error"))
        throw new Error(
          "No se pudo completar el acceso social: " +
            url.searchParams.get("error"),
        );
      const ticket = url.searchParams.get("ticket");
      const response = await session.publicApi.post("/auth/social/exchange", {
        ticket,
        verifier,
      });
      await accept(response.data.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? "¡Bienvenido de nuevo!"
      : mode === "register"
        ? "Creá tu cuenta"
        : "Recuperar acceso";

  const subtitle =
    mode === "login"
      ? "Ingresá tus credenciales para acceder al inventario."
      : mode === "register"
        ? "Registrate para comenzar a gestionar tu stock y equipo."
        : "Te enviaremos las instrucciones a tu correo.";

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: c.bg }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── TOP NAV BAR WITH THEME TOGGLE ── */}
        <View style={[styles.topBar, { borderBottomColor: c.border }]}>
          <View style={styles.topBarLeft}>
            {mode === "login" ? (
              <View
                style={[
                  styles.brandPill,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                  },
                ]}
              >
                <View style={styles.brandDot} />
                <Text style={[styles.brandPillText, { color: c.dark }]}>StockFlow</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => router.replace("/login")}
                style={({ pressed }) => [
                  styles.backBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="arrow-back" size={18} color={c.green} />
                <Text style={[styles.backBtnText, { color: c.green }]}>Volver al login</Text>
              </Pressable>
            )}
          </View>

          {/* Theme Toggle Button */}
          <ThemeToggleButton />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            wide && styles.scrollContentWide,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, wide && styles.containerWide]}>

            {/* ── DESKTOP BRAND BANNER (WIDE ONLY) ── */}
            {wide && (
              <View style={styles.brandPanel}>
                <View style={styles.brandLogoRow}>
                  <View style={styles.brandIconBox}>
                    <Ionicons name="cube" size={24} color={c.onPrimary} />
                  </View>
                  <Text style={styles.brandTitle}>StockFlow</Text>
                </View>

                <View style={{ gap: 12, marginTop: 48 }}>
                  <Text style={styles.brandHeadline}>
                    El control que tu stock y tu equipo necesitan.
                  </Text>
                  <Text style={styles.brandSub}>
                    Mantené sincronizados tus productos, movimientos de entrada/salida y pedidos en tiempo real.
                  </Text>
                </View>

                {/* Value propositions */}
                <View style={{ gap: 16, marginTop: 40 }}>
                  {[
                    { icon: "cube-outline" as const, text: "Inventario centralizado y alertas de stock mínimo" },
                    { icon: "swap-horizontal-outline" as const, text: "Registro de ingresos, egresos y traslados" },
                    { icon: "people-outline" as const, text: "Gestión de roles: Admin, Encargado y Repartidores" },
                  ].map((item) => (
                    <View key={item.text} style={styles.featureItem}>
                      <View style={styles.featureCheck}>
                        <Ionicons name="checkmark" size={15} color={c.green} />
                      </View>
                      <Text style={styles.featureText}>{item.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Decorative mini metric card */}
                <View style={styles.metricCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.metricTitle}>ACTIVIDAD SEMANAL</Text>
                    <View style={styles.metricBadge}>
                      <Text style={styles.metricBadgeText}>+18.4%</Text>
                    </View>
                  </View>
                  <View style={styles.chartBars}>
                    {[38, 65, 52, 85, 60, 100, 78].map((h, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.bar,
                          {
                            height: h * 0.5,
                            backgroundColor: idx === 5 ? c.green : c.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.metricFooter}>Actualizado en tiempo real</Text>
                </View>
              </View>
            )}

            {/* ── AUTH CARD (MOBILE & RIGHT COLUMN) ── */}
            <View
              style={[
                styles.card,
                wide && styles.cardWide,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                },
              ]}
            >
              {/* Header inside card */}
              <View style={styles.headerBlock}>
                {/* Mobile icon mark */}
                {!wide && (
                  <View
                    style={[
                      styles.mobileIconBox,
                      {
                        backgroundColor: c.card,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <Ionicons name="cube" size={26} color={c.green} />
                  </View>
                )}

                <Text style={[styles.titleText, { color: c.dark }]}>{title}</Text>
                <Text style={[styles.subtitleText, { color: c.muted }]}>{subtitle}</Text>
              </View>

              {/* Segmented control for Login / Register */}
              {mode !== "recover" && (
                <View
                  style={[
                    styles.segmentContainer,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => mode !== "login" && router.replace("/login")}
                    style={[
                      styles.segmentTab,
                      mode === "login" && [
                        styles.segmentTabActive,
                        {
                          backgroundColor: c.card,
                          borderColor: c.border,
                        },
                      ],
                    ]}
                  >
                    <Ionicons
                      name="log-in-outline"
                      size={16}
                      color={mode === "login" ? c.green : c.muted}
                    />
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: mode === "login" ? (c.dark) : c.muted,
                          fontWeight: mode === "login" ? "700" : "500",
                        },
                      ]}
                    >
                      Iniciar sesión
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => mode !== "register" && router.replace("/register")}
                    style={[
                      styles.segmentTab,
                      mode === "register" && [
                        styles.segmentTabActive,
                        {
                          backgroundColor: c.card,
                          borderColor: c.border,
                        },
                      ],
                    ]}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={16}
                      color={mode === "register" ? c.green : c.muted}
                    />
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: mode === "register" ? (c.dark) : c.muted,
                          fontWeight: mode === "register" ? "700" : "500",
                        },
                      ]}
                    >
                      Crear cuenta
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Server error alert banner */}
              {!!error && (
                <View
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={c.red} />
                  <Text style={[styles.errorBannerText, { color: c.red }]}>
                    {error}
                  </Text>
                </View>
              )}

              {/* ── FORM FIELDS ── */}
              <View style={styles.fieldsContainer}>
                {/* Nombre (only on register) */}
                {mode === "register" && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: c.dark }]}>Nombre completo</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: c.inputBg,
                          borderColor: fieldErrors.nombre
                            ? c.red
                            : focusedField === "nombre"
                              ? c.green
                              : c.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={focusedField === "nombre" ? c.green : c.muted}
                        style={styles.fieldIcon}
                      />
                      <TextInput
                        accessibilityLabel="Nombre completo"
                        placeholder="Ej. Juan Pérez"
                        placeholderTextColor={c.muted}
                        value={nombre}
                        onChangeText={(t) => {
                          setNombre(t);
                          if (fieldErrors.nombre) setFieldErrors((e) => ({ ...e, nombre: "" }));
                        }}
                        onFocus={() => setFocusedField("nombre")}
                        onBlur={() => setFocusedField(null)}
                        style={[styles.textInput, { color: c.dark }]}
                        autoCapitalize="words"
                      />
                    </View>
                    {!!fieldErrors.nombre && (
                      <Text style={styles.fieldErrorText}>{fieldErrors.nombre}</Text>
                    )}
                  </View>
                )}

                {/* Email field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: c.dark }]}>Correo electrónico</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: c.inputBg,
                        borderColor: fieldErrors.email
                          ? c.red
                          : focusedField === "email"
                            ? c.green
                            : c.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={focusedField === "email" ? c.green : c.muted}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      accessibilityLabel="Correo electrónico"
                      placeholder="nombre@negocio.com"
                      placeholderTextColor={c.muted}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: "" }));
                      }}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      style={[styles.textInput, { color: c.dark }]}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                  {!!fieldErrors.email && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                  )}
                </View>

                {/* Password field (login & register) */}
                {mode !== "recover" && (
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.inputLabel, { color: c.dark }]}>Contraseña</Text>
                      {mode === "login" && (
                        <Pressable
                          onPress={() => router.push("/recover")}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={[styles.forgotLink, { color: c.green }]}>
                            ¿Olvidaste tu contraseña?
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: c.inputBg,
                          borderColor: fieldErrors.password
                            ? c.red
                            : focusedField === "password"
                              ? c.green
                              : c.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={focusedField === "password" ? c.green : c.muted}
                        style={styles.fieldIcon}
                      />
                      <TextInput
                        accessibilityLabel="Contraseña"
                        placeholder={mode === "register" ? "10+ caracteres, mayús. y núm." : "••••••••"}
                        placeholderTextColor={c.muted}
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t);
                          if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: "" }));
                        }}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        style={[styles.textInput, { color: c.dark }]}
                        autoCapitalize="none"
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                        accessibilityLabel={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={c.muted}
                        />
                      </Pressable>
                    </View>
                    {!!fieldErrors.password && (
                      <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                    )}
                  </View>
                )}

                {/* Primary Submit Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear mi cuenta" : "Enviar enlace de recuperación"}
                  disabled={busy}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: c.green,
                      opacity: busy ? 0.7 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={c.onPrimary} />
                  ) : (
                    <>
                      <Text style={[styles.primaryBtnText,{color:c.onPrimary}]}>
                        {mode === "login"
                          ? "Iniciar sesión"
                          : mode === "register"
                            ? "Crear mi cuenta"
                            : "Enviar enlace de recuperación"}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={c.onPrimary} />
                    </>
                  )}
                </Pressable>
              </View>

              {/* ── SOCIAL AUTH PROVIDERS ── */}
              {mode !== "recover" && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
                    <Text style={[styles.dividerText, { color: c.muted }]}>
                      o continuá con
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
                  </View>

                  <View style={styles.socialRow}>
                    {(["google", "github", "facebook"] as const).map((p) => (
                      <Pressable
                        key={p}
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => void social(p)}
                        style={({ pressed }) => [
                          styles.socialCard,
                          {
                            backgroundColor: c.card,
                            borderColor: c.border,
                            opacity: busy ? 0.5 : pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={SOCIAL_ICONS[p]}
                          size={20}
                          color={p === "google" ? c.red : c.dark}
                        />
                        <Text style={[styles.socialText, { color: c.dark }]}>
                          {p === "google" ? "Google" : p === "github" ? "GitHub" : "Facebook"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* ── FOOTER TOGGLE ── */}
              <View style={styles.footerRow}>
                <Text style={[styles.footerText, { color: c.muted }]}>
                  {mode === "login" ? "¿Primera vez en StockFlow?" : "¿Ya tenés una cuenta?"}
                </Text>
                <Pressable
                  onPress={() =>
                    router.replace(mode === "login" ? "/register" : "/login")
                  }
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.footerLink, { color: c.green }]}>
                    {mode === "login" ? "Registrate gratis" : "Iniciá sesión"}
                  </Text>
                </Pressable>
              </View>

            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.green,
  },
  brandPillText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "center",
  },
  scrollContentWide: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  containerWide: {
    maxWidth: 980,
    flexDirection: "row",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
  },

  // Desktop Left Banner
  brandPanel: {
    flex: 1,
    backgroundColor: c.card,
    padding: 44,
    justifyContent: "space-between",
  },
  brandLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: c.dark,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandHeadline: {
    color: c.dark,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -1,
  },
  brandSub: {
    color: c.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: c.dark,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  metricCard: {
    backgroundColor: c.bg,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  metricTitle: {
    color: c.green,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  metricBadge: {
    backgroundColor: c.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metricBadgeText: {
    color: c.green,
    fontSize: 11,
    fontWeight: "700",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 52,
    gap: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 6,
  },
  metricFooter: {
    color: c.muted,
    fontSize: 11,
  },

  // Auth Card
  card: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    gap: 20,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardWide: {
    flex: 1.1,
    padding: 44,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: "center",
  },

  headerBlock: {
    gap: 6,
    alignItems: "center",
  },
  mobileIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  // Segment Tabs
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentTabActive: {
    borderWidth: 1,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 13,
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Inputs
  fieldsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.2,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 48,
  },
  eyeBtn: {
    padding: 8,
  },
  fieldErrorText: {
    color: c.red,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },

  // Primary Action
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: {
    color: c.dark,
    fontSize: 16,
    fontWeight: "700",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Social Auth
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  socialText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});

function beginWebLogin(verifier: string, url: string) {
  sessionStorage.setItem(
    "stockflow.oauth",
    JSON.stringify({ verifier, expires: Date.now() + 5 * 60 * 1000 }),
  );
  window.location.assign(url);
}
