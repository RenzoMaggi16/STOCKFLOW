import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Sheet,
  Status,
  styles,
} from "../../components/ui";
import { EntityForm } from "../../components/EntityForm";
export default function Profile() {
  const auth = useAuth();
  const [challenge, setChallenge] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Page title="Mi perfil" subtitle="Tu cuenta y seguridad">
      <Card>
        <Text style={styles.label}>{auth.user?.email}</Text>
        <Text style={styles.pill}>{auth.user?.rol} · Email verificado</Text>
        <EntityForm
          key={auth.user?.nombre}
          initial={{ nombre: auth.user?.nombre }}
          fields={[
            { name: "nombre", label: "Nombre completo", required: true },
          ]}
          onSubmit={async (v) => {
            await api.patch("/auth/me", v);
            await auth.reload();
          }}
        />
      </Card>
      <Card>
        <Text style={styles.label}>Segundo factor por email</Text>
        <Text style={styles.subtitle}>
          {auth.user?.segundo_factor
            ? "Activado: se solicita código al iniciar sesión."
            : "Agregá un código de email a tu inicio de sesión."}
        </Text>
        <Button
          title={
            auth.user?.segundo_factor
              ? "Desactivar segundo factor"
              : "Activar segundo factor"
          }
          disabled={busy}
          onPress={() => {
            setBusy(true);
            api
              .post("/auth/mfa/request", {
                enabled: !auth.user?.segundo_factor,
              })
              .then((r) => setChallenge(r.data.data.challengeId))
              .catch((e) => setError(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      <Status error={error} />
      <Confirm
        title="Cerrar sesión"
        message="Se cerrará tu sesión en este dispositivo."
        onConfirm={async () => {
          try {
            await auth.logout();
            router.replace("/");
          } catch (e) {
            throw new Error(
              "La sesión local se cerró, pero no se pudo confirmar el cierre remoto. " +
                errorMessage(e),
            );
          }
        }}
      />
      <Sheet
        title="Confirmar seguridad"
        visible={!!challenge}
        onClose={() => setChallenge("")}
      >
        <EntityForm
          fields={[
            {
              name: "code",
              label: "Código recibido",
              required: true,
              numeric: true,
            },
          ]}
          onSubmit={async (v) => {
            await api.post("/auth/mfa/configure", {
              ...v,
              challengeId: challenge,
              enabled: !auth.user?.segundo_factor,
            });
            setChallenge("");
            await auth.logout().catch(() => {});
            router.replace("/login");
          }}
        />
      </Sheet>
    </Page>
  );
}
