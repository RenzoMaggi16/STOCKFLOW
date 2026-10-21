import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useBusiness } from "../../contexts/BusinessContext";
import { useResource } from "../../hooks/useResource";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";
import { Button, Card, Choices, Input, Page, Status, styles } from "../../components/ui";

export default function OrderDetail(){
  const {id}=useLocalSearchParams<{id:string}>(), {role}=useBusiness();
  const resource=useResource<any>(`/orders/${id}`),members=useResource<any>(role==="admin"||role==="encargado"?"/drivers":"/orders");
  const [driver,setDriver]=useState(""),[reason,setReason]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const item=resource.data;
  async function act(path:string,body?:object){setBusy(true);setError("");try{await api.post(`/orders/${id}/${path}`,body??{});setReason("");await resource.load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <Page title={`Pedido #${id}`} subtitle="Estados y responsables registrados en el historial">
    <Status loading={resource.loading} error={resource.error} retry={resource.load}/>
    {item&&<><Card><Text style={[styles.title,{fontSize:22}]}>{item.nombre_comercial}</Text><Text style={styles.subtitle}>{item.direccion_entrega} · {item.telefono||"Sin teléfono"}</Text><Text style={styles.pill}>{item.estado.replaceAll("_"," ")}</Text><Text style={styles.label}>Total ${item.total}</Text>{item.aviso_pago_en&&<Text style={styles.subtitle}>Cliente avisó pago · pendiente de verificación externa</Text>}{item.observaciones&&<Text style={styles.subtitle}>{item.observaciones}</Text>}</Card>
    <Card><Text style={styles.label}>Productos</Text>{item.items.map((p:any)=><View key={p.producto_id} style={[styles.row,{justifyContent:"space-between"}]}><Text style={styles.subtitle}>{p.nombre} · {p.cantidad} u.</Text><Text style={styles.label}>${p.subtotal}</Text></View>)}{item.reservas?.length>0&&<Text style={styles.subtitle}>Reservas: {item.reservas.map((r:any)=>`${r.cantidad} u. ${r.estado}`).join(" · ")}</Text>}</Card>
    <Card><Text style={styles.label}>Acciones disponibles</Text>
      {role==="encargado"&&item.estado==="pendiente"&&<Button title="Aprobar y reservar stock" disabled={busy} onPress={()=>void act("approve-preparation")}/>}
      {role==="encargado"&&item.estado==="en_preparacion"&&<Button title="Marcar preparado" disabled={busy} onPress={()=>void act("ready")}/>}
      {role==="encargado"&&["pendiente","en_preparacion"].includes(item.estado)&&<><Input label="Motivo del rechazo" value={reason} onChange={setReason}/><Button title="Rechazar preparación" danger disabled={busy||reason.trim().length<3} onPress={()=>void act("reject-preparation",{motivo:reason})}/></>}
      {["admin","encargado"].includes(role)&&["preparado","entrega_fallida"].includes(item.estado)&&<><Text style={styles.label}>Asignar repartidor</Text><Choices value={driver} onChange={setDriver} options={(members.data||[]).map((m:any)=>({value:String(m.id),label:m.nombre}))}/><Button title="Guardar asignación" disabled={busy||!driver} onPress={()=>void act("assign",{repartidor_id:Number(driver)})}/></>}
      {role==="repartidor"&&item.estado==="preparado"&&<Button title="Confirmar retiro" disabled={busy} onPress={()=>void act("pickup")}/>}
      {role==="repartidor"&&item.estado==="en_reparto"&&<><Button title="Confirmar entrega" disabled={busy} onPress={()=>void act("delivered")}/><Input label="Motivo si la entrega falló" value={reason} onChange={setReason}/><Button title="Registrar entrega fallida" danger disabled={busy||reason.trim().length<3} onPress={()=>void act("delivery-failed",{motivo:reason})}/></>}
      {role==="empleado"&&!item.aviso_pago_en&&! ["cancelado","devuelto"].includes(item.estado)&&<Button title="Registrar aviso de pago" secondary disabled={busy} onPress={()=>void act("payment-notice")}/>}
      {["admin","empleado"].includes(role)&&["pendiente","en_preparacion","preparado","entrega_fallida"].includes(item.estado)&&<><Input label="Motivo de cancelación" value={reason} onChange={setReason}/><Button title="Cancelar pedido" danger disabled={busy||reason.trim().length<3} onPress={()=>void act("cancel",{motivo:reason})}/></>}
      {["admin","encargado"].includes(role)&&item.estado==="entregado"&&<><Input label="Motivo de devolución completa" value={reason} onChange={setReason}/><Button title="Registrar devolución" secondary disabled={busy||reason.trim().length<3} onPress={()=>void act("return",{motivo:reason})}/></>}
      {!!error&&<Text style={styles.error}>{error}</Text>}
    </Card>
    <Card><Text style={styles.label}>Historial de estados</Text>{item.historial.map((h:any)=><Text key={h.id} style={styles.subtitle}>{new Date(h.creado_en).toLocaleString("es-AR")} · {h.estado.replaceAll("_"," ")} · {h.usuario}{h.motivo?` · ${h.motivo}`:""}</Text>)}</Card></>}
  </Page>;
}
