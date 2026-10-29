import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { Page, Status, useColors, ThemeToggleButton } from "../../components/ui";
import { useBusiness } from "../../contexts/BusinessContext";


export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { role } = useBusiness();
  const c = useColors();


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
        tabBarActiveTintColor: c.tabBarActive,
        tabBarInactiveTintColor: c.tabBarInactive,
        headerStyle: {
          backgroundColor: c.headerBg,
          borderBottomColor: c.border,
          borderBottomWidth: 1,
          shadowColor: "transparent",
        },
        headerTintColor: c.headerText,
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          color: c.headerText,
        },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <ThemeToggleButton />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: c.tabBarBg,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {(
        [
          ["index", "Inicio", "home-outline", true],
          ["products", role === "encargado" ? "Depósito" : "Inventario", "cube-outline", role === "admin" || role === "encargado"],
          ["clients", "Clientes", "people-outline", role === "empleado"],
          ["orders", role === "repartidor" ? "Entregas" : "Pedidos", "receipt-outline", true],
          ["movements", "Movimientos", "swap-vertical-outline", false],
          ["map", "Indicaciones", "navigate-outline", role === "repartidor"],
          ["more", "Más", "menu-outline", role !== "repartidor"],
          ["profile", "Perfil", "person-outline", role === "repartidor"],
        ] as [string, string, string, boolean][]
      ).map(([name, title, icon, visible]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // SDK 58 redirects hidden href:null routes. Hide only the button so Más can navigate.
            tabBarButton: visible ? undefined : () => null,
            tabBarItemStyle: visible ? undefined : { display: "none" },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon as any} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
