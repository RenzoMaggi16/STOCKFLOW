import { Redirect, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { Page, Card } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
export default function MFA() {
  const auth = useAuth();
  if (!auth.pendingMfa) return <Redirect href="/login" />;
  return (
    <Page
      title="Confirmá que sos vos"
      subtitle="Ingresá el código enviado a tu email. Tenés 5 intentos; vence en 10 minutos. Para solicitar otro, volvé a iniciar sesión tras 60 segundos."
    >
      <Card>
        <EntityForm
          fields={[
            { name: "code", label: "Código", required: true, numeric: true },
          ]}
          label="Continuar"
          onSubmit={async (v) => {
            const r = await session.publicApi.post("/auth/mfa/verify", {
              challengeId: auth.pendingMfa,
              code: v.code,
            });
            await auth.accept(r.data.data);
            router.replace("/");
          }}
        />
      </Card>
    </Page>
  );
}
