import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { colors } from "../components/ui";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerTintColor: colors.dark,
            headerStyle: { backgroundColor: "#F3F7F5" },
            headerTitle: "StockFlow",
            headerBackTitle: "Volver",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
