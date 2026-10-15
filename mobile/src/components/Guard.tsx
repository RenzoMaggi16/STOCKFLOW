import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Page, Status } from "./ui";
export function Guard({
  children,
  roles = ["admin", "encargado", "empleado"],
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <Page title="Cargando">
        <Status loading />
      </Page>
    );
  if (!user) return <Redirect href="/login" />;
  if (!user.email_verificado) return <Redirect href="/verify" />;
  if (!roles.includes(user.rol))
    return (
      <Page
        title="Acceso restringido"
        subtitle="Tu rol no tiene permiso para este módulo."
      >
        {null}
      </Page>
    );
  return <>{children}</>;
}
