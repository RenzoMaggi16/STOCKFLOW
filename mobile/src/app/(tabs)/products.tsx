import { useState } from "react";
import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design } from "../../components/WorkspaceDesign";
import { router } from "expo-router";
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
  useStyles,
  money,
} from "../../components/ui";
export default function Products() {
  const styles = useStyles();

  const { role } = useBusiness();
  const [q,setQ]=useState(''), [size,setSize]=useState(''), [type,setType]=useState(''), [page,setPage]=useState(1);
  const r=useResource(`/products?page=${page}&search=${encodeURIComponent(q)}${size?`&size=${size}`:''}${type?`&type=${type}`:''}`);
  return (
    <Page title="Cajas de cartón" subtitle="Existencias claras, decisiones simples">
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
      <Text style={styles.label}>Tamaño</Text>
      <Choices value={size} onChange={v=>{setSize(v);setPage(1);}} options={[{value:'',label:'Todos'},{value:'chica',label:'Chica'},{value:'mediana',label:'Mediana'},{value:'grande',label:'Grande'}]}/>
      <Text style={styles.label}>Tipo</Text>
      <Choices value={type} onChange={v=>{setType(v);setPage(1);}} options={[{value:'',label:'Todos'},{value:'estandar',label:'Estándar'},{value:'reforzada',label:'Reforzada'}]}/>
      {["admin","encargado"].includes(role) && (
        <Button
          title="Nueva caja"
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
            Distribución por unidad · {money(p.precio)}
          </Text>
          <Text style={styles.subtitle}>{p.size || "Tamaño pendiente"} · {p.type === "estandar" ? "Estándar" : p.type || "Tipo pendiente"}{p.dimensiones ? ` · ${p.dimensiones}` : ""}</Text>
          <Text style={styles.pill}>
            {p.stock_disponible ?? p.stock} disponibles · {p.stock} físicas{p.stock <= p.stock_minimo ? " · Stock bajo" : ""}
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
