import { useState } from "react";
import { IdentityBanner, SectionHeading } from "../components/WorkspaceDesign";
import { Text } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { ResourceSelect } from "../components/EntityForm";
import { Guard } from "../components/Guard";
import { useResource } from "../hooks/useResource";
import {
  Page,
  Card,
  Input,
  Button,
  Status,
  useStyles, useColors,
  money,
} from "../components/ui";
export default function Reports() {
  const styles = useStyles(), c=useColors();

  const [desde, setDesde] = useState(""),
    [hasta, setHasta] = useState(""),
    [query, setQuery] = useState("");
  const [product, setProduct] = useState("");
  const catalogQuery = new URLSearchParams({
    ...(product && { producto_id: product }),
  }).toString();
  const totals = useResource("/reports/stock-value?" + catalogQuery),
    moves = useResource(
      "/reports/movements" + (query || "?") + "&" + catalogQuery,
    ),
    low = useResource("/reports/low-stock?limit=100&" + catalogQuery);
  const periods = moves.data?.periodos || [];
  const incoming = periods
      .filter((m: any) => m.tipo === "entrada")
      .reduce((n: number, m: any) => n + Number(m.cantidad), 0),
    outgoing = periods
      .filter((m: any) => m.tipo === "salida")
      .reduce((n: number, m: any) => n + Number(m.cantidad), 0),
    max = Math.max(incoming, outgoing, 1);
  return (
    <Guard roles={["admin", "encargado"]}>
      <Page
        title="Reportes"
        subtitle="Métricas calculadas sobre tu inventario real"
      >
        <IdentityBanner title="Convertí tus datos en decisiones." subtitle="Revisá el valor de venta de tus existencias y la actividad de tu inventario." badge="REPORTES DE CAJAS" icon="bar-chart-outline"/>
        <Card><SectionHeading title="Elegí qué analizar" icon="options-outline"/>
        <ResourceSelect
          resource="/products"
          label="Filtrar producto"
          value={product}
          onChange={setProduct}
        />
        <Status
          loading={totals.loading}
          error={totals.error}
          retry={totals.load}
        />
        </Card>
        <Card>
          <Text style={styles.subtitle}>Valor de existencias a precio de venta</Text>
          <Text style={styles.subtitle}>Estimación: no representa ventas realizadas ni ganancia.</Text>
          <Text style={styles.title}>{money(totals.data?.summary.valor)}</Text>
          <Text style={styles.subtitle}>
            Sin stock: {totals.data?.summary.sin_stock || 0} · Bajo mínimo:{" "}
            {totals.data?.summary.stock_bajo || 0}
          </Text>
        </Card>
        <Card>
          <Text style={styles.label}>Movimientos por período (UTC)</Text>
          <Input label="Desde (AAAA-MM-DD)" value={desde} onChange={setDesde} />
          <Input label="Hasta (AAAA-MM-DD)" value={hasta} onChange={setHasta} />
          <Button
            title="Aplicar período"
            onPress={() =>
              setQuery(
                "?" +
                  new URLSearchParams({
                    ...(desde && { desde }),
                    ...(hasta && { hasta }),
                  }).toString(),
              )
            }
          />
          <Status
            error={moves.error}
            loading={moves.loading}
            retry={moves.load}
          />
          <Svg
            width="100%"
            height={130}
            viewBox="0 0 360 130"
            accessibilityLabel={`Entradas ${incoming}, salidas ${outgoing}`}
          >
            <SvgText x={0} y={20} fill={c.dark}>
              Entradas: {incoming}
            </SvgText>
            <Rect
              x={0}
              y={30}
              height={22}
              width={(330 * incoming) / max}
              fill={c.green}
              rx={6}
            />
            <SvgText x={0} y={83} fill={c.dark}>
              Salidas: {outgoing}
            </SvgText>
            <Rect
              x={0}
              y={94}
              height={22}
              width={(330 * outgoing) / max}
              fill={c.warning}
              rx={6}
            />
          </Svg>
        </Card>
        <Text style={[styles.title, { fontSize: 20 }]}>Mayor movimiento</Text>
        {moves.data?.productos.map((p: any) => (
          <Card key={p.id}>
            <Text style={styles.subtitle}>
              {p.nombre} · {p.operaciones} operaciones
            </Text>
          </Card>
        ))}
        <Text style={[styles.title, { fontSize: 20 }]}>
          Stock bajo (primeros 100)
        </Text>
        <Status
          error={low.error}
          loading={low.loading}
          empty={!low.data?.items.length}
          retry={low.load}
        />
        {low.data?.items.map((p: any) => (
          <Card key={p.id}>
            <Text style={styles.label}>{p.nombre}</Text>
            <Text style={styles.subtitle}>
              Actual {p.stock} · Mínimo {p.stock_minimo}
            </Text>
          </Card>
        ))}
      </Page>
    </Guard>
  );
}
