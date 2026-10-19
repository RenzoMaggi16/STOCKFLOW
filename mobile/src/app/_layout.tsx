import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { colors } from "../components/ui";
import { BusinessProvider, useBusiness } from "../contexts/BusinessContext";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BusinessProvider><Workspace /></BusinessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
function Workspace() {
  const auth = useAuth(), business = useBusiness();
  return (
        <Stack
          screenOptions={{
            headerTintColor: colors.dark,
            headerStyle: { backgroundColor: "#F3F7F5" },
            headerTitle: "StockFlow",
            headerBackTitle: "Volver",
          }}
        >
          <Stack.Screen name="index" options={{headerShown:false}} />
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
          </Stack.Protected>
        </Stack>
  );
}
