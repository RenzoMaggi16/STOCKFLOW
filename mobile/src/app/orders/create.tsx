import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Guard } from "../../components/Guard";
import { Button, Card, Choices, Input, Page, Status, styles } from "../../components/ui";
import { useResource } from "../../hooks/useResource";
import { api } from "../../services/api";
import { errorMessage } from "../../services/session";

export default function CreateOrder(){
  const clients=useResource<any[]>("/clients"), products=useResource<any>("/products?limit=100");
  const [client,setClient]=useState(""),[product,setProduct]=useState(""),[quantity,setQuantity]=useState(""),[notes,setNotes]=useState(""),[items,setItems]=useState<{producto_id:number;nombre:string;cantidad:number;precio:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const add=()=>{const chosen=products.data?.items?.find((p:any)=>String(p.id)===product), amount=Number(quantity);if(!chosen||!Number.isInteger(amount)||amount<1||items.some(i=>i.producto_id===chosen.id)){setError("Elegí un producto distinto y una cantidad válida.");return;}setItems([...items,{producto_id:chosen.id,nombre:chosen.nombre,cantidad:amount,precio:String(chosen.precio)}]);setProduct("");setQuantity("");setError("");};
  async function save(){setBusy(true);setError("");try{const result=await api.post("/orders",{cliente_id:Number(client),observaciones:notes||null,items:items.map(i=>({producto_id:i.producto_id,cantidad:i.cantidad}))});router.replace(`/orders/${result.data.data.id}`);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  const total=items.reduce((sum,i)=>sum+Math.round(Number(i.precio)*100)*i.cantidad,0);
  return <Guard roles={["empleado"]}><Page title="Nuevo pedido" subtitle="Agregá varios productos; el precio quedará guardado al crear el pedido.">
    <Status loading={clients.loading||products.loading} error={clients.error||products.error} retry={()=>{void clients.load();void products.load();}}/>
    <Card><Text style={styles.label}>Cliente</Text><Choices value={client} onChange={setClient} options={(clients.data||[]).filter(c=>c.activo).map(c=>({value:String(c.id),label:c.nombre_comercial}))}/>{!clients.data?.length&&<Text style={styles.subtitle}>Primero creá un cliente desde la pestaña Clientes.</Text>}</Card>
    <Card><Text style={styles.label}>Productos del pedido</Text><Choices value={product} onChange={setProduct} options={(products.data?.items||[]).map((p:any)=>({value:String(p.id),label:`${p.nombre} · ${p.stock} u.`}))}/><Input label="Cantidad" value={quantity} onChange={setQuantity} numeric/><Button title="Agregar producto" secondary onPress={add}/></Card>
    {items.map(item=><Card key={item.producto_id}><View style={[styles.row,{justifyContent:"space-between"}]}><Text style={styles.label}>{item.nombre}</Text><Text style={styles.label}>{item.cantidad} × ${item.precio}</Text></View><Button title={`Quitar ${item.nombre}`} secondary onPress={()=>setItems(items.filter(i=>i.producto_id!==item.producto_id))}/></Card>)}
    <Card><Text style={[styles.title,{fontSize:22}]}>Total ${String(Math.floor(total/100))}.{String(total%100).padStart(2,"0")}</Text><Input label="Observaciones" value={notes} onChange={setNotes} multiline/><Text style={styles.subtitle}>Depósito confirmará la disponibilidad y reservará el stock antes de preparar.</Text><Button title={busy?"Creando…":"Crear pedido"} disabled={busy||!client||items.length===0} onPress={()=>void save()}/></Card>
    {!!error&&<Text style={styles.error}>{error}</Text>}
  </Page></Guard>;
}
