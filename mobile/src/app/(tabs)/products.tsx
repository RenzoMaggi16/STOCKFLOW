import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useResource } from "../../hooks/useResource";
import {
  Page,
  Card,
  Button,
  Input,
  Choices,
  Status,
  Pager,
  styles,
  money,
} from "../../components/ui";
export default function Products() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ proveedor_id?: string }>();
  const [q, setQ] = useState(""),
    [stock, setStock] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const cats = useResource("/categories?limit=100");
  const r = useResource(
    `/products?page=${page}&q=${encodeURIComponent(q)}${stock ? `&stock=${stock}` : ""}${category ? `&categoria_id=${category}` : ""}${params.proveedor_id ? `&proveedor_id=${params.proveedor_id}` : ""}`,
  );
  return (
    <Page title="Productos" subtitle="Existencias claras, decisiones simples">
      <Input
        label="Buscar por nombre o SKU"
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(1);
        }}
      />
      <Choices
        value={stock}
        onChange={(v) => {
          setStock(v);
          setPage(1);
        }}
        options={[
          { value: "", label: "Todos" },
          { value: "disponible", label: "Disponibles" },
          { value: "bajo", label: "Stock bajo" },
          { value: "sin", label: "Sin stock" },
        ]}
      />
      <Choices
        value={category}
        onChange={(v) => {
          setCategory(v);
          setPage(1);
        }}
        options={[
          { value: "", label: "Todas las categorías" },
          ...(cats.data?.items || []).map((c: any) => ({
            value: String(c.id),
            label: c.nombre,
          })),
        ]}
      />
      {!!params.proveedor_id && (
        <Button
          title="Quitar filtro de proveedor"
          secondary
          onPress={() => router.setParams({ proveedor_id: "" })}
        />
      )}
      {user?.rol !== "empleado" && (
        <Button
          title="Nuevo producto"
          onPress={() => router.push("/products/create")}
        />
      )}
      <Status
        loading={r.loading}
        error={r.error}
        retry={r.load}
        empty={!r.data?.items.length}
      />
      {r.data?.items.map((p: any) => (
        <Card key={p.id}>
          <Text style={[styles.title, { fontSize: 20 }]}>{p.nombre}</Text>
          <Text style={styles.subtitle}>
            {p.sku} · {money(p.precio)}
          </Text>
          <Text style={styles.pill}>
            {p.stock} unidades{p.stock <= p.stock_minimo ? " · Stock bajo" : ""}
          </Text>
          <Button
            title="Ver producto"
            secondary
            onPress={() => router.push(`/products/${p.id}`)}
          />
        </Card>
      ))}
      <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
    </Page>
  );
}
