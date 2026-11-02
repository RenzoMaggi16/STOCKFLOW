import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Card, Button, Status } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
import { IdentityBanner } from "../components/WorkspaceDesign";
export default function Verify() {
  const params = useLocalSearchParams<{ challengeId?: string }>();
  return <VerifyForm key={params.challengeId || 'request'} challengeId={params.challengeId} />;
}
function VerifyForm({challengeId}:{challengeId?:string}) {
  const auth = useAuth();
  const [id, setId] = useState(challengeId || "");
  const [message, setMessage] = useState(
    challengeId ? "Te enviamos un código de verificación a tu correo." : "",
  );
  const [busy, setBusy] = useState(false);

  if (!auth.user) return <Redirect href="/login" />;
  if (auth.user.email_verificado) return <Redirect href="/" />;
  return (
    <Page
      title="Verificá tu correo"
      subtitle={id ? `Ingresá el código para ${auth.user.email}. Dura 10 minutos.` : `Solicitá un código para verificar ${auth.user.email}.`}
    >
      <IdentityBanner title="Un paso más para empezar." subtitle="Confirmá tu correo para crear tu distribuidora y trabajar con tu equipo." badge="PROTEGÉ TU CUENTA" icon="mail-outline"/>
      <Button
        title={id ? "Reenviar código" : "Enviar código"}
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
