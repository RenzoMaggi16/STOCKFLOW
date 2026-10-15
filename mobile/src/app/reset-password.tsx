import { router, useLocalSearchParams } from "expo-router";
import { session } from "../services/api";
import { Page, Card } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
export default function Reset() {
  const { challengeId } = useLocalSearchParams();
  return (
    <Page
      title="Nueva contraseña"
      subtitle="Ingresá el código recibido por correo y una contraseña nueva."
    >
      <Card>
        <EntityForm
          fields={[
            { name: "code", label: "Código", required: true, numeric: true },
            {
              name: "password",
              label: "Nueva contraseña",
              secure: true,
              required: true,
            },
          ]}
          onSubmit={async (v) => {
            await session.publicApi.post("/auth/reset-password", {
              ...v,
              challengeId,
            });
            router.replace("/login");
          }}
        />
      </Card>
    </Page>
  );
}
