import { useState } from "react";
import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design } from "../components/WorkspaceDesign";
import { router } from "expo-router";
import { useBusiness } from "../contexts/BusinessContext";
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
  const { role } = useBusiness();
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
        <IdentityBanner title={entity === "categories" ? "Cada producto en su lugar." : "Las personas detrás de tu stock."} subtitle={entity === "categories" ? "Organizá tu catálogo para encontrar lo que necesitás más rápido." : "Mantené los datos de contacto y sus productos siempre a mano."} badge="ORGANIZÁ TU NEGOCIO" icon={entity === "categories" ? "grid-outline" : "car-outline"}/>
        <Card><SectionHeading title="Explorá tu catálogo" icon="search-outline"/>
        <Input
          label="Buscar"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        {role !== "empleado" && (
          <Button title="Crear registro" onPress={() => setEditing({})} />
        )}
        </Card>
        <Status
          loading={r.loading}
          error={r.error}
          retry={r.load}
          empty={!r.data?.items.length}
        />
        <View style={design.grid}>{r.data?.items.map((item: any) => (
          <View key={item.id} style={design.column}><Card>
            <SectionHeading title={item.nombre} icon={entity === "categories" ? "pricetags-outline" : "business-outline"}/>
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
            {role !== "empleado" && (
              <Button
                title="Editar"
                secondary
                onPress={() => setEditing(item)}
              />
            )}
            {role === "admin" && (
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
          </Card></View>
        ))}</View>
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
