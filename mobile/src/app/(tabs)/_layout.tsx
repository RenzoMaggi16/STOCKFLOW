import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { Page, Status, colors } from "../../components/ui";
import { useBusiness } from "../../contexts/BusinessContext";
export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { role } = useBusiness();
  if (loading)
    return (
      <Page title="Cargando sesión">
        <Status loading />
      </Page>
    );
  if (!user) return <Redirect href="/login" />;
  if (!user.email_verificado) return <Redirect href="/verify" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.green,
        headerStyle: { backgroundColor: "#F3F7F5" },
        headerTintColor: colors.dark,
        tabBarStyle: { minHeight: 64 },
      }}
    >
      {([
        ["index", "Inicio", "grid-outline", true],
        ["products", "Productos", "cube-outline", role !== "repartidor"],
        ["clients", "Clientes", "people-outline", role !== "repartidor"],
        ["orders", role === "repartidor" ? "Entregas" : "Pedidos", "receipt-outline", true],
        ["movements", "Stock", "swap-vertical-outline", role === "encargado" || role === "admin"],
        ["profile", "Perfil", "person-outline", true],
      ] as [string,string,string,boolean][]).map(([name, title, icon, visible]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            href: visible ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon as any} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
