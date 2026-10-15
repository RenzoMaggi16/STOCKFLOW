import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useResource } from "../../hooks/useResource";
import { Page, Card, Button, Status, styles, money } from "../../components/ui";
export default function Dashboard() {
  const { user } = useAuth();
  const r = useResource("/dashboard"),
    history = useResource("/movements?limit=5");
  return (
    <Page
      title={`Hola, ${user?.nombre.split(" ")[0]}`}
      subtitle="Una mirada a tu inventario de hoy"
    >
      <Text style={styles.pill}>{user?.rol.toUpperCase()}</Text>
      <Status loading={r.loading} error={r.error} retry={r.load} />
      <View style={styles.row}>
        {[
          ["productos", "Productos activos"],
          ["unidades", "Unidades disponibles"],
          ["stock_bajo", "Stock bajo"],
          ["sin_stock", "Sin existencias"],
        ].map(([key, label]) => (
          <View key={key} style={{ flexGrow: 1, minWidth: 140 }}>
            <Card>
              <Text style={styles.subtitle}>{label}</Text>
              <Text style={styles.title}>{r.data?.[key] ?? "—"}</Text>
            </Card>
          </View>
        ))}
      </View>
      {user?.rol !== "empleado" && (
        <Card>
          <Text style={styles.subtitle}>Valor estimado del inventario</Text>
          <Text style={styles.title}>{money(r.data?.valor)}</Text>
          <Button
            title="Ver reportes"
            onPress={() => router.push("/reports")}
          />
        </Card>
      )}
      <View style={styles.row}>
        <Button
          title="Categorías"
          secondary
          onPress={() => router.push("/categories")}
        />
        <Button
          title="Proveedores"
          secondary
          onPress={() => router.push("/suppliers")}
        />
        {user?.rol === "admin" && (
          <Button
            title="Usuarios"
            secondary
            onPress={() => router.push("/users")}
          />
        )}
      </View>
      <Text style={[styles.title, { fontSize: 20 }]}>
        Últimos movimientos{user?.rol === "empleado" ? " propios" : ""}
      </Text>
      <Status
        error={history.error}
        loading={history.loading}
        retry={history.load}
        empty={!history.data?.items.length}
      />
      {history.data?.items.map((m: any) => (
        <Card key={m.id}>
          <Text style={styles.label}>
            {m.producto} · {m.tipo}
          </Text>
          <Text style={styles.subtitle}>
            {m.cantidad} unidades · {m.usuario} ·{" "}
            {new Date(m.creado_en).toLocaleString("es-AR")}
          </Text>
        </Card>
      ))}
    </Page>
  );
}
