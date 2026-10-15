import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { Page, Status, colors } from "../../components/ui";
export default function TabsLayout() {
  const { user, loading } = useAuth();
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
      {[
        ["index", "Inicio", "grid-outline"],
        ["products", "Productos", "cube-outline"],
        ["movements", "Movimientos", "swap-vertical-outline"],
        ["profile", "Perfil", "person-outline"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon as any} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
