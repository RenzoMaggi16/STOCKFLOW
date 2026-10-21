import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Page, Status } from "./ui";
import { useBusiness } from "../contexts/BusinessContext";
export function Guard({
  children,
  roles = ["admin", "encargado", "empleado", "repartidor"],
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();
  const business = useBusiness();
  if (loading)
    return (
      <Page title="Cargando">
        <Status loading />
      </Page>
    );
  if (!user) return <Redirect href="/login" />;
  if (!user.email_verificado) return <Redirect href="/verify" />;
  if (!business.active) return <Redirect href="/businesses" />;
  if (!roles.includes(business.role))
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
