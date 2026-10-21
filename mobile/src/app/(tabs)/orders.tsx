import { Text, View } from "react-native";
import { router } from "expo-router";
import { useBusiness } from "../../contexts/BusinessContext";
import { useResource } from "../../hooks/useResource";
import { Button, Card, Page, Status, styles } from "../../components/ui";

const labels:Record<string,string>={pendiente:"Pendiente",en_preparacion:"En preparación",preparado:"Preparado",en_reparto:"En reparto",entregado:"Entregado",entrega_fallida:"Entrega fallida",cancelado:"Cancelado",devuelto:"Devuelto"};
export default function Orders(){
  const {role}=useBusiness(),resource=useResource<any[]>(role==="repartidor"?"/deliveries":"/orders");
  return <Page title={role==="repartidor"?"Mis entregas":"Pedidos"} subtitle={role==="repartidor"?"Solo aparecen los pedidos asignados a vos.":"Ventas, preparación y entregas en un mismo lugar."}>
    <Card><Text style={styles.label}>Flujo de distribución</Text><Text style={styles.subtitle}>Ventas registra el pedido, depósito reserva y prepara, y el repartidor confirma la entrega.</Text><View style={styles.row}>{role==="empleado"&&<Button title="Nuevo pedido" onPress={()=>router.push("/orders/create")}/>}<Button title="Actualizar" secondary onPress={()=>void resource.load()}/></View></Card>
    <Status loading={resource.loading} error={resource.error} retry={resource.load} empty={!resource.data?.length}/>
    {resource.data?.map(o=><Card key={o.id}><View style={[styles.row,{justifyContent:"space-between"}]}><Text style={[styles.label,{fontSize:18}]}>Pedido #{o.id}</Text><Text style={styles.pill}>{labels[o.estado]||o.estado}</Text></View><Text style={styles.label}>{o.nombre_comercial}</Text><Text style={styles.subtitle}>{o.direccion_entrega}</Text><Text style={styles.subtitle}>${o.total} · {new Date(o.creado_en).toLocaleDateString("es-AR")}</Text><Button title="Ver detalle y acciones" secondary onPress={()=>router.push(`/orders/${o.id}`)}/></Card>)}
  </Page>;
}
