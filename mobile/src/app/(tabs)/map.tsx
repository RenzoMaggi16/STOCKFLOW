import {useState} from 'react';
import {Text,Linking} from 'react-native';
import {Redirect,router} from 'expo-router';
import {useBusiness} from '../../contexts/BusinessContext';
import {useResource} from '../../hooks/useResource';
import {Page,Card,Button,Status,useColors} from '../../components/ui';
import {errorMessage} from '../../services/session';
export default function MapScreen(){const {role}=useBusiness();return role==='repartidor'?<DriverMap/>:<Redirect href="/(tabs)"/>;}
function DriverMap(){
  const r=useResource<any[]>('/deliveries'),c=useColors();
  const [message,setMessage]=useState('');
  const deliveries=(r.data||[]).filter(d=>['preparado','en_reparto','entrega_fallida'].includes(d.estado));
  async function navigate(d:any){try{const destination=d.latitud!=null&&d.longitud!=null?`${d.latitud},${d.longitud}`:[d.direccion_entrega,d.localidad,d.provincia].filter(Boolean).join(', ');await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`);}catch(e){setMessage(errorMessage(e));}}
  return <Page title="Indicaciones de entrega" subtitle="Abrí tus pedidos asignados en Google Maps">
    <Status loading={r.loading} error={r.error} retry={r.load}/><Status error={message}/>
    {!deliveries.length&&!r.loading&&<Card><Text style={{color:c.muted}}>No hay entregas pendientes asignadas.</Text></Card>}
    {deliveries.map(d=><Card key={d.id}><Text style={{color:c.dark,fontWeight:'600'}}>#{d.id} · {d.nombre_comercial}</Text><Text style={{color:c.muted}}>{[d.direccion_entrega,d.localidad,d.provincia].filter(Boolean).join(', ')} · {d.estado.replaceAll('_',' ')}</Text>{d.latitud==null&&<Text style={{color:c.warning}}>Sin coordenadas confirmadas. Navegá por dirección o pedí corregir la ubicación en Clientes.</Text>}<Button title="Indicaciones en Google Maps" secondary onPress={()=>void navigate(d)}/><Button title="Consultar y registrar entrega" secondary onPress={()=>router.push(`/orders/${d.id}`)}/></Card>)}
  </Page>;
}
