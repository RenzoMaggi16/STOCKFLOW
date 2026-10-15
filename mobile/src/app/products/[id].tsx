import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useResource } from "../../hooks/useResource";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Sheet,
  Status,
  styles,
  money,
} from "../../components/ui";
import { ProductForm } from "../../components/ProductForm";
import { Guard } from "../../components/Guard";
export default function Detail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const r = useResource(`/products/${id}`);
  const [edit, setEdit] = useState(false);
  const p = r.data;
  return (
    <Guard>
      <Page title={p?.nombre || "Producto"}>
        <Status loading={r.loading} error={r.error} retry={r.load} />
        {p && (
          <>
            <Card>
              <Text style={styles.subtitle}>SKU {p.sku}</Text>
              <Text style={styles.title}>{money(p.precio)}</Text>
              <Text style={styles.pill}>
                {p.stock} unidades · Mínimo {p.stock_minimo}
              </Text>
              <Text style={styles.subtitle}>
                {p.descripcion || "Sin descripción"}
              </Text>
            </Card>
            <Button
              title="Registrar movimiento"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/movements",
                  params: { producto_id: String(id) },
                })
              }
            />
            {user?.rol !== "empleado" && (
              <Button
                title="Editar producto"
                secondary
                onPress={() => setEdit(true)}
              />
            )}
            {user?.rol === "admin" && (
              <Confirm
                title="Desactivar producto"
                danger
                message="El producto dejará de aparecer en el catálogo. Debe tener stock cero; su historial se conservará."
                onConfirm={async () => {
                  try {
                    await api.delete(`/products/${id}`);
                    router.replace("/(tabs)/products");
                  } catch (e) {
                    throw new Error(errorMessage(e));
                  }
                }}
              />
            )}
            <Sheet
              visible={edit}
              title="Editar producto"
              onClose={() => setEdit(false)}
            >
              <ProductForm
                initial={p}
                onSaved={() => {
                  setEdit(false);
                  void r.load();
                }}
              />
            </Sheet>
          </>
        )}
      </Page>
    </Guard>
  );
}
