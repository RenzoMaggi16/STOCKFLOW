import { useState } from "react";
import { Redirect, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Card, Button, Status } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
import { IdentityBanner } from "../components/WorkspaceDesign";
export default function Verify() {
  const auth = useAuth();
  const [id, setId] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  if (!auth.user) return <Redirect href="/login" />;
  if (auth.user.email_verificado) return <Redirect href="/" />;
  return (
    <Page
      title="Verificá tu correo"
      subtitle={`Enviaremos un código a ${auth.user.email}. Dura 10 minutos.`}
    >
      <IdentityBanner title="Un paso más para empezar." subtitle="Confirmá tu correo para crear tu negocio y trabajar con tu equipo." badge="PROTEGÉ TU CUENTA" icon="mail-outline"/>
      <Button
        title="Enviar / reenviar código"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          session.publicApi
            .post("/auth/resend-verification", { email: auth.user!.email })
            .then((r) => {
              setId(r.data.data.challengeId);
              setMessage(r.data.data.message);
            })
            .catch((e) => setMessage(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
      <Status error={message} />
      {!!id && (
        <Card>
          <EntityForm
            fields={[
              {
                name: "code",
                label: "Código de 6 dígitos",
                required: true,
                numeric: true,
              },
            ]}
            label="Verificar"
            onSubmit={async (v) => {
              await session.publicApi.post("/auth/verify-email", {
                challengeId: id,
                code: v.code,
              });
              await auth.reload();
              router.replace("/");
            }}
          />
        </Card>
      )}
      <Button
        title="Salir"
        secondary
        onPress={() =>
          void auth.logout().catch((e) => setMessage(errorMessage(e)))
        }
      />
    </Page>
  );
}
