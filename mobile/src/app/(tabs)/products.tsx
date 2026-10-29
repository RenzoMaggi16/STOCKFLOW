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
  const config=useResource<{campos:{id:string;nombre:string;opciones:string[]}[]}>('/product-values');
  const [q,setQ]=useState(''), [size,setSize]=useState(''), [type,setType]=useState(''), [page,setPage]=useState(1);
  const r=useResource(`/products?page=${page}&search=${encodeURIComponent(q)}${size?`&size=${encodeURIComponent(size)}`:''}${type?`&type=${encodeURIComponent(type)}`:''}`);
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
      {config.data?.campos.filter(f=>f.id==='size'||f.id==='type').map(f=><View key={f.id}><Text style={styles.label}>{f.nombre}</Text>{f.opciones.length?<Choices value={f.id==='size'?size:type} onChange={v=>{(f.id==='size'?setSize:setType)(v);setPage(1);}} options={[{value:'',label:'Todos'},...f.opciones.map(value=>({value,label:value==='estandar'?'Estándar':value.charAt(0).toUpperCase()+value.slice(1)}))]}/>:<Input label={`Filtrar ${f.nombre}`} value={f.id==='size'?size:type} onChange={v=>{(f.id==='size'?setSize:setType)(v);setPage(1);}}/>}</View>)}
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
