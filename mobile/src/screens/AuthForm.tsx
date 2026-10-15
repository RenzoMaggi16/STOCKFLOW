import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Platform, Text } from "react-native";
import * as Browser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Card, Button, Status, styles } from "../components/ui";
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
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  useEffect(() => {
    session.publicApi
      .get("/auth/social/providers")
      .then((r) => setProviders(r.data.data))
      .catch(() => {});
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
          ? "/(tabs)"
          : "/verify",
    );
  }
  async function social(provider: string) {
    setBusy(true);
    setError("");
    try {
      if (Platform.OS === "web")
        throw new Error(
          "El retorno social requiere la development build Android. Revisá la guía OAuth.",
        );
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
        { challenge },
      );
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
    <Page title={title} subtitle="Inventario organizado. Equipo conectado.">
      <Card>
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
      </Card>
      {mode === "login" && (
        <>
          <Button
            title="Olvidé mi contraseña"
            secondary
            onPress={() => router.push("/recover")}
          />
          <Text style={styles.subtitle}>
            También podés ingresar con una cuenta vinculada. Si el proveedor no
            está configurado, se informará al intentar.
          </Text>
          {["google", "github", "facebook"].map((p) => (
            <Button
              key={p}
              title={`Continuar con ${p[0].toUpperCase() + p.slice(1)}${providers[p] ? "" : " · requiere configuración"}`}
              secondary
              disabled={busy}
              onPress={() => void social(p)}
            />
          ))}
          <Button
            title="Crear cuenta"
            secondary
            onPress={() => router.push("/register")}
          />
        </>
      )}
      <Status error={error} />
    </Page>
  );
}
