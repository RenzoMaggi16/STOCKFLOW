import { useState } from "react";
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
  styles,
  money,
} from "../components/ui";
export default function Reports() {
  const [desde, setDesde] = useState(""),
    [hasta, setHasta] = useState(""),
    [query, setQuery] = useState("");
  const [category, setCategory] = useState(""),
    [product, setProduct] = useState("");
  const catalogQuery = new URLSearchParams({
    ...(category && { categoria_id: category }),
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
        <ResourceSelect
          resource="/categories"
          label="Filtrar categoría"
          value={category}
          onChange={setCategory}
        />
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
        <Card>
          <Text style={styles.subtitle}>Valor actual de existencias</Text>
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
            <SvgText x={0} y={20} fill="#103B30">
              Entradas: {incoming}
            </SvgText>
            <Rect
              x={0}
              y={30}
              height={22}
              width={(330 * incoming) / max}
              fill="#087F5B"
              rx={6}
            />
            <SvgText x={0} y={83} fill="#103B30">
              Salidas: {outgoing}
            </SvgText>
            <Rect
              x={0}
              y={94}
              height={22}
              width={(330 * outgoing) / max}
              fill="#E9AA44"
              rx={6}
            />
          </Svg>
        </Card>
        <Text style={[styles.title, { fontSize: 20 }]}>Por categoría</Text>
        {totals.data?.categorias.map((c: any) => (
          <Card key={c.id}>
            <Text style={styles.label}>{c.nombre}</Text>
            <Text style={styles.subtitle}>
              {c.productos} productos · {c.unidades} unidades · {money(c.valor)}
            </Text>
          </Card>
        ))}
        <Text style={[styles.title, { fontSize: 20 }]}>Mayor movimiento</Text>
        {moves.data?.productos.map((p: any) => (
          <Card key={p.id}>
            <Text>
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
            <Text>
              Actual {p.stock} · Mínimo {p.stock_minimo}
            </Text>
          </Card>
        ))}
      </Page>
    </Guard>
  );
}
