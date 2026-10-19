import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Platform, Text, View, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import * as Browser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Button, Status, styles, colors } from "../components/ui";
import { EntityForm, type Field } from "../components/EntityForm";
const email: Field = {
  name: "email",
  label: "Correo electrónico",
  required: true,
  validate: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Ingresá un correo válido",
};
const password: Field = {
  name: "password",
  label: "Contraseña",
  required: true,
  secure: true,
};
export function AuthForm({ mode }: { mode: "login" | "register" | "recover" }) {
  const auth = useAuth();
  const wide = useWindowDimensions().width >= 850;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  useEffect(() => {
    session.publicApi
      .get("/auth/social/providers")
      .then((r) => setProviders(r.data.data))
      .catch(() => setError("No se pudo conectar con el servidor para comprobar las plataformas. Podés volver a intentarlo pulsando el botón."));
  }, []);
  const title =
    mode === "login"
      ? "Bienvenido de nuevo"
      : mode === "register"
        ? "Creá tu cuenta"
        : "Recuperá tu acceso";
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
  return (
    <Page title="StockFlow" subtitle="TU INVENTARIO, EN ORDEN">
      <View style={[authStyles.layout, wide && { flexDirection: "row" }]}>
      <View style={[authStyles.brand, wide ? { flex: 1, minHeight: 570 } : { padding: 22, gap: 8 }]}>
        <Text style={authStyles.mark}>SF /</Text>
        <Text style={[authStyles.headline, !wide && { fontSize: 28, lineHeight: 32 }]}>Menos vueltas. Más control.</Text>
        <Text style={authStyles.description}>{wide ? "Productos, movimientos y equipo. Todo en un mismo lugar, para que puedas enfocarte en lo que sigue." : "Tu inventario y tu equipo, conectados."}</Text>
        {wide && <View style={{ gap: 22, marginTop: 45 }}>
          {["01   Conocé tus existencias", "02   Registrá cada movimiento", "03   Trabajá con tu equipo"].map(t => <Text key={t} style={authStyles.feature}>{t}</Text>)}
          <View style={authStyles.preview}><Text style={authStyles.feature}>UN LUGAR PARA CADA PRODUCTO</Text><View style={{ flexDirection: "row", gap: 8 }}>{[42, 70, 55, 90, 65, 110, 85].map((h,i) => <View key={i} style={{ flex: 1, height: h, backgroundColor: i === 5 ? "#B8F36B" : "#3D7C67", borderRadius: 6, alignSelf: "flex-end" }} />)}</View><Text style={authStyles.description}>Orden que se nota, todos los días.</Text></View>
        </View>}
      </View>
      <View style={[authStyles.form, wide && { flex: 1 }]}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{mode === "register" ? "Empezá con tu correo o elegí una plataforma." : mode === "login" ? "Ingresá para continuar con tu equipo." : "Te enviamos un código para recuperar tu cuenta."}</Text>
        <EntityForm
          fields={
            mode === "recover"
              ? [email]
              : mode === "register"
                ? [
                    {
                      name: "nombre",
                      label: "Nombre completo",
                      required: true,
                    },
                    email,
                    {
                      ...password,
                      validate: (v) =>
                        (v.length >= 10 &&
                          /[A-Z]/.test(v) &&
                          /[a-z]/.test(v) &&
                          /[0-9]/.test(v)) ||
                        "Usá 10 caracteres, mayúscula, minúscula y número",
                    },
                  ]
                : [email, password]
          }
          label={
            mode === "recover"
              ? "Enviar código"
              : mode === "register"
                ? "Registrarme"
                : "Ingresar"
          }
          onSubmit={async (values) => {
            const { data } = await session.publicApi.post(
              mode === "recover" ? "/auth/forgot-password" : `/auth/${mode}`,
              values,
            );
            if (mode === "recover") {
              router.push({
                pathname: "/reset-password",
                params: { challengeId: data.data.challengeId },
              });
              return;
            }
            await accept(data.data);
          }}
        />
      {mode !== "recover" && (
        <>
          {mode === "login" && <Pressable accessibilityRole="button" onPress={() => router.push("/recover")}><Text style={authStyles.link}>Olvidé mi contraseña</Text></Pressable>}
          <View style={authStyles.divider}><View style={authStyles.line}/><Text style={styles.subtitle}>o continuá con</Text><View style={authStyles.line}/></View>
          {["google", "github", "discord"].map((p) => (
            <Button
              key={p}
              title={`Continuar con ${p[0].toUpperCase() + p.slice(1)}${providers[p] === false ? " · requiere configuración" : ""}`}
              secondary
              disabled={busy}
              onPress={() => void social(p)}
            />
          ))}
          {busy && <Text style={styles.subtitle}>Conectando con la plataforma…</Text>}
          <View style={{ marginTop: 8, gap: 8 }}><Text style={[styles.subtitle, { textAlign: "center" }]}>{mode === "login" ? "¿Primera vez en StockFlow?" : "¿Ya tenés una cuenta?"}</Text><Button title={mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"} secondary onPress={() => router.replace(mode === "login" ? "/register" : "/login")} /></View>
        </>
      )}
      <Status error={error} />
      </View></View>
    </Page>
  );
}

const authStyles = StyleSheet.create({
  layout: { gap: 0, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: "white" },
  brand: { padding: 30, backgroundColor: "#123D32", gap: 16 },
  mark: { color: "#B8F36B", fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  headline: { fontSize: 38, lineHeight: 43, fontWeight: "800", color: "white", letterSpacing: -1.5 },
  description: { color: "#C3DCD2", fontSize: 15, lineHeight: 24 },
  feature: { color: "#E3F3E9", fontSize: 14, fontWeight: "600" },
  preview: { padding: 22, borderRadius: 16, backgroundColor: "#204C3E", gap: 24, marginTop: 12 },
  form: { padding: 28, gap: 18 },
  divider: { flexDirection: "row", gap: 12, alignItems: "center" },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  link: { color: colors.green, textAlign: "right", paddingVertical: 8, fontWeight: "600" },
});

function beginWebLogin(verifier: string, url: string) {
  sessionStorage.setItem("stockflow.oauth", JSON.stringify({ verifier, expires: Date.now() + 5 * 60 * 1000 }));
  window.location.assign(url);
}
