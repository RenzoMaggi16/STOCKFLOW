import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Input,
  Sheet,
  Status,
  Pager,
  styles,
} from "../components/ui";
import { EntityForm, type Field } from "../components/EntityForm";
import { Guard } from "../components/Guard";
export function Catalog({ entity }: { entity: "categories" | "suppliers" }) {
  const { user } = useAuth();
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<any>(null);
  const r = useResource(`/${entity}?page=${page}&q=${encodeURIComponent(q)}`);
  const fields: Field[] = [
    { name: "nombre", label: "Nombre", required: true },
    ...(entity === "categories"
      ? [{ name: "descripcion", label: "Descripción" }]
      : [
          { name: "email", label: "Email" },
          { name: "telefono", label: "Teléfono" },
          { name: "direccion", label: "Dirección" },
        ]),
  ];
  return (
    <Guard>
      <Page title={entity === "categories" ? "Categorías" : "Proveedores"}>
        <Input
          label="Buscar"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        {user?.rol !== "empleado" && (
          <Button title="Crear registro" onPress={() => setEditing({})} />
        )}
        <Status
          loading={r.loading}
          error={r.error}
          retry={r.load}
          empty={!r.data?.items.length}
        />
        {r.data?.items.map((item: any) => (
          <Card key={item.id}>
            <Text style={[styles.title, { fontSize: 20 }]}>{item.nombre}</Text>
            <Text style={styles.subtitle}>
              {item.descripcion ||
                [item.email, item.telefono, item.direccion]
                  .filter(Boolean)
                  .join(" · ")}
            </Text>
            {entity === "suppliers" && (
              <Button
                title="Ver productos asociados"
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/products",
                    params: { proveedor_id: String(item.id) },
                  })
                }
              />
            )}
            {user?.rol !== "empleado" && (
              <Button
                title="Editar"
                secondary
                onPress={() => setEditing(item)}
              />
            )}
            {user?.rol === "admin" && (
              <Confirm
                title="Desactivar"
                danger
                message="Se conservará el registro. No puede tener productos activos asociados."
                onConfirm={async () => {
                  try {
                    await api.delete(`/${entity}/${item.id}`);
                    await r.load();
                  } catch (e) {
                    throw new Error(errorMessage(e));
                  }
                }}
              />
            )}
          </Card>
        ))}
        <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
        <Sheet
          visible={!!editing}
          title={editing?.id ? "Editar" : "Crear"}
          onClose={() => setEditing(null)}
        >
          {editing && (
            <EntityForm
              key={editing.id || "new"}
              fields={fields}
              initial={editing}
              onSubmit={async (v) => {
                const body = Object.fromEntries(
                  Object.entries(v).map(([k, value]) => [k, value || null]),
                );
                if (editing.id)
                  await api.patch(`/${entity}/${editing.id}`, body);
                else await api.post(`/${entity}`, body);
                setEditing(null);
                await r.load();
              }}
            />
          )}
        </Sheet>
      </Page>
    </Guard>
  );
}
