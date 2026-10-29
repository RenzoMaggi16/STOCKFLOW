import { useState } from "react";
import { Text } from "react-native";
import { useBusiness } from "../contexts/BusinessContext";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
import { Button, Card, Choices, Input, Page, Status, useStyles } from "../components/ui";
import { Guard } from "../components/Guard";

export default function Adjustments(){
  const styles = useStyles();
const {role}=useBusiness(),requests=useResource<any[]>("/stock/adjustment-requests"),products=useResource<any>("/products?limit=100");
  const [product,setProduct]=useState(""),[stock,setStock]=useState(""),[reason,setReason]=useState(""),[review,setReview]=useState<Record<number,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function create(){setBusy(true);setError("");try{await api.post("/stock/adjustment-requests",{producto_id:Number(product),stock_propuesto:Number(stock),motivo:reason});setProduct("");setStock("");setReason("");await requests.load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  async function decide(id:number,action:"approve"|"reject"){setBusy(true);setError("");try{await api.post(`/stock/adjustment-requests/${id}/${action}`,{motivo:review[id]});await requests.load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <Guard roles={["admin","encargado","empleado"]}><Page title="Ajustes extraordinarios" subtitle="Se solicitan con motivo y solo el jefe puede aprobarlos o rechazarlos.">
    {role!=="admin"&&<Card><Text style={styles.label}>Nueva solicitud</Text><Choices value={product} onChange={setProduct} options={(products.data?.items||[]).map((p:any)=>({value:String(p.id),label:p.nombre}))}/><Input label="Stock propuesto" value={stock} onChange={setStock} numeric/><Input label="Motivo" value={reason} onChange={setReason} multiline/><Button title="Enviar solicitud" disabled={busy||!product||!/^\d+$/.test(stock)||reason.trim().length<3} onPress={()=>void create()}/></Card>}
    <Status loading={requests.loading} error={requests.error} retry={requests.load} empty={!requests.data?.length}/>
    {requests.data?.map(request=><Card key={request.id}><Text style={styles.label}>#{request.id} · {request.producto}</Text><Text style={styles.subtitle}>Stock propuesto: {request.stock_propuesto} · {request.estado}</Text><Text style={styles.subtitle}>{request.solicitante}: {request.motivo}</Text>{role==="admin"&&request.estado==="pendiente"&&<><Input label="Motivo de la decisión" value={review[request.id]||""} onChange={v=>setReview({...review,[request.id]:v})}/><Button title="Aprobar" disabled={busy||(review[request.id]||"").trim().length<3} onPress={()=>void decide(request.id,"approve")}/><Button title="Rechazar" danger disabled={busy||(review[request.id]||"").trim().length<3} onPress={()=>void decide(request.id,"reject")}/></>}</Card>)}
    {!!error&&<Text style={styles.error}>{error}</Text>}
  </Page></Guard>;
}
