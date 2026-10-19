import { useState } from "react";
import { IdentityBanner, SectionHeading } from "../../components/WorkspaceDesign";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useBusiness } from "../../contexts/BusinessContext";
import { useResource } from "../../hooks/useResource";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Choices,
  Sheet,
  Status,
  Pager,
  styles,
} from "../../components/ui";
import { EntityForm } from "../../components/EntityForm";
export default function Movements() {
  const { role } = useBusiness();
  const params = useLocalSearchParams();
  const [open, setOpen] = useState(false),
    [tipo, setTipo] = useState("entrada"),
    [page, setPage] = useState(1),
    [pending, setPending] = useState<any>(null),
    [message, setMessage] = useState("");
  const r = useResource(`/movements?page=${page}`);
  return (
    <Page
      title="Movimientos"
      subtitle={
        role === "empleado"
          ? "Tu historial de operaciones"
          : "Historial completo del inventario"
      }
    >
      <IdentityBanner title="Cada unidad tiene una historia." subtitle="Registrá entradas y salidas para que tu equipo trabaje con existencias actualizadas." badge="ACTIVIDAD DEL INVENTARIO" icon="swap-horizontal-outline"/>
      <Button title="Registrar movimiento" onPress={() => setOpen(true)} />
      {!!message && <Text style={styles.pill}>{message}</Text>}
      <Status
        loading={r.loading}
        error={r.error}
        retry={r.load}
        empty={!r.data?.items.length}
      />
      {r.data?.items.map((m: any) => (
        <Card key={m.id}>
          <SectionHeading title={m.producto} subtitle={m.tipo.toUpperCase()} icon={m.tipo === "salida" ? "arrow-up-outline" : "arrow-down-outline"}/>
          <Text style={styles.label}>
            {m.producto} · {m.tipo.toUpperCase()}
          </Text>
          <Text style={styles.subtitle}>
            {m.cantidad} unidades · Stock {m.stock_anterior} → {m.stock_nuevo}
          </Text>
          <Text style={styles.subtitle}>
            {m.usuario} · {new Date(m.creado_en).toLocaleString("es-AR")}
          </Text>
          <Text>{m.motivo}</Text>
        </Card>
      ))}
      <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
      <Sheet
        visible={open}
        title="Registrar movimiento"
        onClose={() => {
          setOpen(false);
          setPending(null);
        }}
      >
        <SectionHeading title="Actualizá tus existencias" subtitle="Revisá los datos antes de confirmar el movimiento." icon="swap-horizontal-outline"/>
        <Choices
          value={tipo}
          onChange={(v) => {
            setTipo(v);
            setPending(null);
          }}
          options={[
            { value: "entrada", label: "Entrada" },
            { value: "salida", label: "Salida" },
            ...(role !== "empleado"
              ? [{ value: "ajuste", label: "Ajuste" }]
              : []),
          ]}
        />
        <EntityForm
          key={tipo + String(params.producto_id || "")}
          initial={{ producto_id: params.producto_id || "" }}
          fields={[
            {
              name: "producto_id",
              label: "Producto",
              required: true,
              resource: "/products",
            },
            {
              name: "cantidad",
              label: tipo === "ajuste" ? "Stock final deseado" : "Cantidad",
              required: true,
              numeric: true,
              validate: (v) =>
                (/^\d+$/.test(v) && (tipo === "ajuste" || Number(v) > 0)) ||
                "Ingresá una cantidad entera válida",
            },
            { name: "motivo", label: "Motivo", required: true },
          ]}
          label="Revisar operación"
          onSubmit={async (v) => {
            const { data } = await api.get(`/products/${v.producto_id}`);
            if (tipo === "salida" && Number(v.cantidad) > data.data.stock)
              throw new Error("La salida supera el stock disponible.");
            setPending({
              ...v,
              producto_id: Number(v.producto_id),
              cantidad: Number(v.cantidad),
              tipo,
            });
          }}
        />
        {pending && (
          <Confirm
            title="Confirmar movimiento"
            message={`${tipo}: ${pending.cantidad} unidades. Motivo: ${pending.motivo}`}
            onConfirm={async () => {
              try {
                await api.post("/movements", pending);
                setPending(null);
                setOpen(false);
                setMessage("Movimiento registrado correctamente");
                await r.load();
              } catch (e) {
                throw new Error(errorMessage(e));
              }
            }}
          />
        )}
      </Sheet>
    </Page>
  );
}
