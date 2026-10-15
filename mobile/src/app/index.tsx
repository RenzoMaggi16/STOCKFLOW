import { Redirect, router } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { Page, Card, Button, Status, styles } from "../components/ui";
export default function Welcome() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <Page title="StockFlow">
        <Status loading />
      </Page>
    );
  if (auth.user)
    return (
      <Redirect href={auth.user.email_verificado ? "/(tabs)" : "/verify"} />
    );
  return (
    <Page
      title="Tu inventario, bajo control."
      subtitle="STOCKFLOW · GESTIÓN SIMPLE"
    >
      <Card>
        <Text style={[styles.title, { fontSize: 22 }]}>
          Más claridad para tu comercio
        </Text>
        <Text style={styles.subtitle}>
          Consultá existencias, registrá movimientos y trabajá en equipo desde
          un solo lugar.
        </Text>
        <Button title="Iniciar sesión" onPress={() => router.push("/login")} />
        <Button
          title="Crear cuenta"
          secondary
          onPress={() => router.push("/register")}
        />
      </Card>
      <Status error={auth.error} retry={auth.restore} />
    </Page>
  );
}
