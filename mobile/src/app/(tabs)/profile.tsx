import { useState } from "react";
import { Text, View } from "react-native";
import {
  IdentityBanner,
  SectionHeading,
  design,
  roleLabel,
} from "../../components/WorkspaceDesign";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Sheet,
  Status,
  useStyles,
  useColors,
  ThemeToggle,
} from "../../components/ui";
import { EntityForm } from "../../components/EntityForm";

export default function Profile() {
  const styles = useStyles();

  const auth = useAuth();
  const business = useBusiness();
  const c = useColors();
  const [challenge, setChallenge] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);

  return (
    <Page title="Mi perfil" subtitle="Tu cuenta y seguridad">
      <IdentityBanner
        title={auth.user?.nombre || "Tu cuenta"}
        subtitle={auth.user?.email || ""}
        badge="TU PERFIL PERSONAL"
        icon="person-outline"
      />

      <View style={styles.row}>
        <Text style={styles.pill}>Correo verificado</Text>
        <Text style={styles.pill}>
          {auth.user?.segundo_factor
            ? "Doble verificación activa"
            : "Doble verificación disponible"}
        </Text>
      </View>

      <View style={design.grid}>
        <View style={design.column}>
          <Card>
            <SectionHeading
              title="Datos personales"
              subtitle="El nombre con el que te verá tu equipo."
              icon="person-circle-outline"
            />
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
            <SectionHeading
              title={business.active?.nombre || "Tu distribuidora"}
              subtitle={`${roleLabel(business.role)} · Tu espacio actual`}
              icon="storefront-outline"
            />
            <Button
              title="Información de la distribuidora"
              secondary
              onPress={() => router.push("/business-settings")}
            />
            <Button
              title="Cambiar distribuidora"
              secondary
              onPress={() => router.push("/businesses")}
            />
          </Card>
        </View>

        <View style={design.column}>
          <Card>
            <SectionHeading
              title="Una capa extra de seguridad"
              subtitle="Segundo factor por email"
              icon="shield-checkmark-outline"
            />
            <Text style={{ fontSize: 13, color: c.muted, lineHeight: 21 }}>
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

          <Card>
            <SectionHeading
              title="Apariencia"
              subtitle="Elegí claro, oscuro o automático según el sistema."
              icon="contrast-outline"
            />
            <ThemeToggle />
          </Card>

          <Card>
            <SectionHeading
              title="Tu sesión"
              subtitle="Cerrá el acceso en este dispositivo cuando termines."
              icon="log-out-outline"
            />
            <Confirm
              title="Cerrar sesión"
              message="Se cerrará tu sesión en este dispositivo."
              danger
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
          </Card>
        </View>
      </View>

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
