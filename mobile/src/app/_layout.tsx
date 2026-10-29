import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useColors } from "../components/ui";
import { BusinessProvider, useBusiness } from "../contexts/BusinessContext";
import { ThemeProvider } from "../contexts/ThemeContext";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <BusinessProvider><Workspace /></BusinessProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function Workspace() {
  const auth = useAuth(), business = useBusiness();
  const c = useColors();
  return (
        <Stack
          screenOptions={{
            headerTintColor: c.headerText,
            headerStyle: { backgroundColor: c.headerBg },
            headerTitle: "StockFlow",
            headerBackTitle: "Volver",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="recover" options={{ headerShown: false }} />
          <Stack.Protected guard={!!auth.user?.email_verificado && !!business.active}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="products/create" />
            <Stack.Screen name="products/[id]" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="suppliers" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="business-settings" />
            <Stack.Screen name="users" />
            <Stack.Screen name="team" />
            <Stack.Screen name="orders/create" options={{title:"Nuevo pedido"}} />
            <Stack.Screen name="orders/[id]" options={{title:"Detalle del pedido"}} />
            <Stack.Screen name="stock-adjustments" options={{title:"Ajustes extraordinarios"}} />
          </Stack.Protected>
        </Stack>
  );
}
