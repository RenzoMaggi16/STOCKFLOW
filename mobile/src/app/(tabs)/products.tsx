import { useState } from "react";
import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design } from "../../components/WorkspaceDesign";
import { router, useLocalSearchParams } from "expo-router";
import { useBusiness } from "../../contexts/BusinessContext";
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
  const { role } = useBusiness();
  const params = useLocalSearchParams<{ proveedor_id?: string; stock?: string }>();
  const [q, setQ] = useState(""),
    [localStock, setStock] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const stock = params.stock ?? localStock;
  const cats = useResource("/categories?limit=100");
  const r = useResource(
    `/products?page=${page}&q=${encodeURIComponent(q)}${stock ? `&stock=${stock}` : ""}${category ? `&categoria_id=${category}` : ""}${params.proveedor_id ? `&proveedor_id=${params.proveedor_id}` : ""}`,
  );
  return (
    <Page title="Productos" subtitle="Existencias claras, decisiones simples">
      <IdentityBanner title="Tu catálogo, bajo control." subtitle="Consultá precios, encontrá productos y anticipá la próxima reposición." badge="INVENTARIO" icon="cube-outline"/>
      <Card><SectionHeading title="Encontrá tu producto" icon="search-outline"/>
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
          router.setParams({ stock: v });
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
      {role !== "empleado" && (
        <Button
          title="Nuevo producto"
          onPress={() => router.push("/products/create")}
        />
      )}
      </Card>
      <Status
        loading={r.loading}
        error={r.error}
        retry={r.load}
        empty={!r.data?.items.length}
      />
      <View style={design.grid}>{r.data?.items.map((p: any) => (
        <View key={p.id} style={design.column}><Card>
          <SectionHeading title={p.nombre} subtitle={`SKU ${p.sku}`} icon="cube-outline"/>
          <Text style={styles.subtitle}>
            Venta por unidad · {money(p.precio)}
          </Text>
          <Text style={styles.pill}>
            {p.stock} unidades{p.stock <= p.stock_minimo ? " · Stock bajo" : ""}
          </Text>
          <Button
            title="Ver producto"
            secondary
            onPress={() => router.push(`/products/${p.id}`)}
          />
        </Card></View>
      ))}</View>
      <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
    </Page>
  );
}
