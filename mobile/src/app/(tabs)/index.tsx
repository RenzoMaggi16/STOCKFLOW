import { Text, View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StockChart } from "../../components/StockChart";
import { roleLabel } from "../../components/WorkspaceDesign";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { useResource } from "../../hooks/useResource";
import { Page, Card, Button, Status, styles, money, colors } from "../../components/ui";
export default function Dashboard() { const {role}=useBusiness(); return role==="repartidor"?<DriverHome/>:<InventoryDashboard/>; }
function DriverHome(){const {active}=useBusiness(),r=useResource<any[]>("/deliveries");return <Page title="Mis entregas" subtitle={active?.nombre}><Card><Text style={styles.label}>Tu ruta de hoy</Text><Text style={styles.subtitle}>Revisá tus pedidos asignados, confirmá el retiro y registrá el resultado de cada entrega.</Text><Button title="Abrir entregas" onPress={()=>router.push("/(tabs)/orders")}/></Card><Status loading={r.loading} error={r.error} retry={r.load} empty={!r.data?.length}/>{r.data?.filter(o=>["preparado","en_reparto"].includes(o.estado)).map(o=><Card key={o.id}><Text style={styles.label}>Pedido #{o.id} · {o.nombre_comercial}</Text><Text style={styles.subtitle}>{o.direccion_entrega}</Text><Button title="Ver entrega" secondary onPress={()=>router.push(`/orders/${o.id}`)}/></Card>)}</Page>}
function InventoryDashboard() {
  const { user } = useAuth();
  const { role, active } = useBusiness();
  const compact = useWindowDimensions().width < 600;
  const r = useResource("/dashboard"), history = useResource("/movements?limit=5"), low = useResource("/products?stock=bajo&limit=4");
  const manager = role === "admin" || role === "encargado";
  const total = Number(r.data?.productos || 0), shortage = Number(r.data?.stock_bajo || 0);
  const healthy = total ? Math.round((total - shortage) / total * 100) : 0;
  const refresh = () => { void r.load(); void history.load(); void low.load(); };
  return <Page title={`Hola, ${user?.nombre.split(" ")[0]}`} subtitle={`Tu rol: ${roleLabel(role)} · ${active?.nombre} · Tu operación, de un vistazo.`}>
    <View style={styles.row}><Text style={styles.pill}>{active?.nombre}</Text><Button title="Cambiar distribuidora" secondary onPress={() => router.push("/businesses")} /><Button title="Mi distribuidora" secondary onPress={() => router.push("/business-settings")} /></View>
    <View style={[d.hero, compact && { padding: 20, gap: 16 }]}>
      <View style={{ flex: 1, gap: 10, minWidth: 200 }}><Text style={d.eyebrow}>CENTRO DE CONTROL · {role.toUpperCase()}</Text><Text style={[d.heroTitle, compact && { fontSize: 25 }]}>Cada movimiento cuenta.</Text><Text style={d.heroCopy}>Revisá tus existencias y mantené el inventario al día.</Text></View>
      <View style={{ gap: 10, flexDirection: compact ? "row" : "column", flexWrap: "wrap", ...(compact ? { width: "100%" as const } : {}) }}>{role==="encargado"&&<Button title="Registrar recepción" onPress={() => router.push("/(tabs)/movements")}/>}<Button title="Ver pedidos" secondary onPress={()=>router.push("/(tabs)/orders")}/>{manager && <Button title="Nuevo producto" secondary onPress={() => router.push("/products/create")}/>}</View>
    </View>
    <View style={[styles.row, { justifyContent: "space-between" }]}><Text style={d.section}>Resumen del inventario</Text><Button title="Actualizar" secondary disabled={r.loading || history.loading || low.loading} onPress={refresh}/></View>
    <Status loading={r.loading} error={r.error} retry={r.load}/>
    <View style={styles.row}>{([
      ["productos", "Productos activos", "cube-outline", "#E8F2FF", "#2563A6"],
      ["unidades_disponibles", "Unidades libres", "layers-outline", "#E1F3EA", "#087F5B"],
      ["unidades_reservadas", "Unidades reservadas", "bookmark-outline", "#E8F2FF", "#2563A6"],
      ["stock_bajo", "Stock bajo", "alert-circle-outline", "#FFF3DA", "#966008"],
      ["sin_stock", "Sin existencias", "remove-circle-outline", "#FDEBE8", "#B42318"],
    ] as const).map(([key,label,icon,bg,tint]) => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Consultar ${label.toLowerCase()}`} onPress={() => router.push({ pathname: "/(tabs)/products", params: { stock: key === "stock_bajo" ? "bajo" : key === "sin_stock" ? "sin" : "" } })} style={({ pressed }) => [d.metric, { opacity: pressed ? .75 : 1 }]}><View style={[d.icon,{backgroundColor:bg}]}><Ionicons name={icon} size={23} color={tint}/></View><Text style={d.number}>{r.error ? "—" : r.data?.[key] ?? "—"}</Text><Text style={styles.subtitle}>{label}</Text><Text style={{color:tint,fontWeight:"600",fontSize:12}}>Consultar →</Text></Pressable>)}</View>
    {r.data && !r.error && <StockChart total={total} low={shortage} empty={Number(r.data.sin_stock || 0)}/>}
    <View style={d.columns}><View style={d.column}><Card><Text style={d.section}>Salud del stock</Text><Text style={styles.subtitle}>Productos por encima de su mínimo</Text><Text style={styles.title}>{r.data && !r.error ? `${healthy}%` : "—"}</Text><View style={d.track}><View style={{height:10,width:`${healthy}%`,backgroundColor:colors.green,borderRadius:8}}/></View><Text style={styles.subtitle}>{total ? `${total-shortage} de ${total} productos con stock suficiente.` : "Agregá productos para empezar a ver tu inventario."}</Text></Card></View>{manager && <View style={d.column}><View style={d.value}><Text style={d.heroCopy}>VALOR ESTIMADO DEL INVENTARIO</Text><Text style={d.heroTitle}>{r.data && !r.error ? money(r.data.valor) : "—"}</Text><Text style={d.heroCopy}>Calculado con el precio y las existencias actuales.</Text><Button title="Ver reportes" secondary onPress={() => router.push("/reports")}/></View></View>}</View>
    <View style={styles.row}><Button title="Categorías" secondary onPress={() => router.push("/categories")}/><Button title="Proveedores" secondary onPress={() => router.push("/suppliers")}/>{role === "admin" && <Button title="Equipo" secondary onPress={() => router.push("/team")}/>}</View>
    <View style={d.columns}>
      <View style={[d.column,{flex:1.2}]}><Text style={d.section}>Últimos movimientos{!manager ? " propios" : ""}</Text><Status error={history.error} loading={history.loading} retry={history.load}/>{!history.loading && !history.error && !history.data?.items.length && <Card><Ionicons name="swap-horizontal-outline" size={30} color={colors.green}/><Text style={styles.label}>Tu actividad empieza acá</Text><Text style={styles.subtitle}>Registrá una entrada o salida para ver el historial de tu inventario.</Text></Card>}{history.data?.items.map((m:any) => <View key={m.id} style={d.activity}><View style={[d.icon,{backgroundColor:m.tipo === "salida" ? "#FDEBE8" : "#E1F3EA"}]}><Ionicons name={m.tipo === "entrada" ? "arrow-down-outline" : m.tipo === "salida" ? "arrow-up-outline" : "swap-horizontal-outline"} size={21} color={m.tipo === "salida" ? colors.red : colors.green}/></View><View style={{flex:1,gap:4}}><Text style={styles.label}>{m.producto}</Text><Text style={styles.subtitle}>{m.usuario} · {new Date(m.creado_en).toLocaleDateString("es-AR")}</Text></View><View style={{alignItems:"flex-end",gap:4}}><Text style={styles.label}>{m.cantidad} u.</Text><Text style={styles.subtitle}>{m.tipo}</Text></View></View>)}<Button title="Ver historial" secondary onPress={() => router.push("/(tabs)/movements")}/></View>
      <View style={d.column}><Text style={d.section}>Necesitan atención</Text><Text style={styles.subtitle}>Productos que llegaron a su stock mínimo.</Text><Status loading={low.loading} error={low.error} retry={low.load}/>{!low.loading && !low.error && !low.data?.items.length && <Card><Ionicons name="checkmark-circle-outline" size={32} color={colors.green}/><Text style={styles.label}>Sin alertas de stock</Text><Text style={styles.subtitle}>Acá aparecerán los productos que necesiten reposición.</Text></Card>}{low.data?.items.map((p:any) => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Revisar ${p.nombre}`} onPress={() => router.push(`/products/${p.id}`)} style={d.alert}><Text style={styles.label}>{p.nombre}</Text><Text style={styles.subtitle}>{p.sku} · Mínimo {p.stock_minimo}</Text><Text style={{color:Number(p.stock) === 0 ? colors.red : "#966008",fontWeight:"700"}}>{p.stock} unidades disponibles →</Text></Pressable>)}</View>
    </View>
  </Page>;
}
const d = StyleSheet.create({
  hero:{backgroundColor:"#123D32",padding:28,borderRadius:22,flexDirection:"row",flexWrap:"wrap",gap:24,alignItems:"center"},
  eyebrow:{fontSize:11,fontWeight:"700",letterSpacing:1.5,color:"#B8F36B"},heroTitle:{fontSize:30,fontWeight:"800",color:"white",letterSpacing:-.8},heroCopy:{color:"#C7DFD3",fontSize:13,lineHeight:21},
  section:{fontSize:19,fontWeight:"700",color:colors.dark},metric:{flexGrow:1,flexBasis:155,backgroundColor:"white",borderWidth:1,borderColor:colors.border,borderRadius:18,padding:20,gap:8},icon:{width:44,height:44,borderRadius:13,alignItems:"center",justifyContent:"center"},number:{fontSize:32,fontWeight:"800",color:colors.dark},columns:{flexDirection:"row",flexWrap:"wrap",gap:18,alignItems:"flex-start"},column:{flex:1,minWidth:260,gap:12},value:{backgroundColor:"#204C3E",padding:22,borderRadius:18,gap:12},track:{height:10,backgroundColor:"#E6EEE9",borderRadius:8,overflow:"hidden"},activity:{flexDirection:"row",gap:12,alignItems:"center",padding:16,backgroundColor:"white",borderRadius:14,borderWidth:1,borderColor:colors.border},alert:{backgroundColor:"#FFFBF2",borderColor:"#EFE0BE",borderWidth:1,borderRadius:14,padding:16,gap:7},
});
