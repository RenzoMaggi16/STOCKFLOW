import { useState } from "react";
import { IdentityBanner, SectionHeading } from "../../components/WorkspaceDesign";
import { Text, Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useResource } from "../../hooks/useResource";
import { useBusiness } from "../../contexts/BusinessContext";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import {
  Page,
  Card,
  Button,
  Confirm,
  Sheet,
  Status,
  useStyles,
  money,
} from "../../components/ui";
import { ProductForm } from "../../components/ProductForm";
import { Guard } from "../../components/Guard";
export default function Detail() {
  const styles = useStyles();

  const { id } = useLocalSearchParams();
  const { role } = useBusiness();
  const r = useResource(`/products/${id}`);
  const config=useResource<{campos:{id:string;nombre:string}[]}>('/product-values');
  const [edit, setEdit] = useState(false);
  const p = r.data;
  return (
    <Guard>
      <Page title={p?.nombre || "Producto"}>
        <Status loading={r.loading} error={r.error} retry={r.load} />
        {p && (
          <>
            <IdentityBanner title={p.nombre} badge={`PRODUCTO · ${p.sku}`} subtitle={p.descripcion || "La información de tu producto, siempre a mano."} icon="cube-outline"/>
            <Card>
              {!!p.imagen_url && <Image source={{uri:p.imagen_url}} accessibilityLabel={p.nombre} style={{width:"100%",height:180}} resizeMode="contain"/>}
              <Text style={styles.subtitle}>{p.size || "Tamaño pendiente"} · {p.type || "Tipo pendiente"} · {p.dimensiones || "Sin dimensiones"}</Text>
              {config.data?.campos.filter(f=>f.id.startsWith('c_')).map(f=>{const attrs=typeof p.atributos==='string'?JSON.parse(p.atributos):p.atributos??{};return attrs[f.id]?<Text key={f.id} style={styles.subtitle}>{f.nombre}: {attrs[f.id]}</Text>:null;})}
              <SectionHeading title="Compra y venta" subtitle="Importes por unidad" icon="pricetag-outline"/>
              <Text style={styles.subtitle}>Costo de compra: {p.costo_compra == null ? "Sin especificar" : money(p.costo_compra)}</Text>
              <Text style={styles.subtitle}>Precio de venta</Text>
              <Text style={styles.title}>{money(p.precio)}</Text>
              {p.costo_compra != null && <Text style={styles.subtitle}>Diferencia por unidad: {money(Number(p.precio)-Number(p.costo_compra))} · Antes de impuestos y gastos</Text>}
              <Text style={styles.pill}>
                {p.stock_disponible ?? p.stock} disponibles · {p.stock} físicas · Alertar poco stock: {p.stock_minimo} unidades o menos
              </Text>
              <Text style={styles.subtitle}>
                {p.descripcion || "Sin descripción"}
              </Text>
            </Card>
            {role === "encargado" && <Button
              title="Registrar movimiento"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/movements",
                  params: { producto_id: String(id) },
                })
              }
            />}
            {(["admin","encargado"].includes(role)) && (
              <Button
                title="Editar producto"
                secondary
                onPress={() => setEdit(true)}
              />
            )}
            {role === "admin" && (
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
