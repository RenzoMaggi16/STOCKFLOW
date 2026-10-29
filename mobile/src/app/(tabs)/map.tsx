import {useState} from 'react';
import {Text,Linking,Platform} from 'react-native';
import {Redirect,router} from 'expo-router';
import * as Location from 'expo-location';
import {useBusiness} from '../../contexts/BusinessContext';
import {useResource} from '../../hooks/useResource';
import {Page,Card,Button,Status,useColors} from '../../components/ui';
import DeliveryMap from '../../components/DeliveryMap';
import {errorMessage} from '../../services/session';
export default function MapScreen(){const {role}=useBusiness();return role==='repartidor'?<DriverMap/>:<Redirect href="/(tabs)"/>;}
function DriverMap(){
  const r=useResource<any[]>('/deliveries'),c=useColors();
  const [location,setLocation]=useState<{latitude:number;longitude:number}|null>(null),[selected,setSelected]=useState<number|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const deliveries=(r.data||[]).filter(d=>['preparado','en_reparto','entrega_fallida'].includes(d.estado));
  const pins=deliveries.filter(d=>d.latitud!=null&&d.longitud!=null);
  const current=deliveries.find(d=>d.id===selected);
  async function locate(){setBusy(true);setMessage('');try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted){setMessage('Ubicación no autorizada. Podés consultar las entregas y abrir indicaciones igualmente.');return;}const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setLocation(pos.coords);}catch{setMessage('No se pudo obtener tu ubicación. Revisá el GPS y volvé a intentar.');}finally{setBusy(false);}}
  async function navigate(d:any){try{const destination=d.latitud!=null&&d.longitud!=null?`${d.latitud},${d.longitud}`:[d.direccion_entrega,d.localidad,d.provincia].filter(Boolean).join(', ');await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`);}catch(e){setMessage(errorMessage(e));}}
  return <Page title="Mapa de entregas" subtitle="Solo tus pedidos asignados">
    <Status loading={r.loading} error={r.error} retry={r.load}/><Status error={message}/>
    {Platform.OS!=='web'&&<Button title={busy?'Buscando ubicación…':'Mostrar mi ubicación'} disabled={busy} onPress={()=>void locate()}/>}
    <DeliveryMap deliveries={pins} location={location} onSelect={setSelected}/>
    {!!current&&<Card><Text style={{color:c.dark,fontWeight:'700'}}>Pedido #{current.id} · {current.nombre_comercial}</Text><Text style={{color:c.muted}}>{current.direccion_entrega}</Text><Button title="Abrir indicaciones" onPress={()=>void navigate(current)}/><Button title="Retiro, resultado e historial" secondary onPress={()=>router.push(`/orders/${current.id}`)}/></Card>}
    {!deliveries.length&&!r.loading&&<Card><Text style={{color:c.muted}}>No hay entregas pendientes asignadas.</Text></Card>}
    {deliveries.map(d=><Card key={d.id}><Text style={{color:c.dark,fontWeight:'600'}}>#{d.id} · {d.nombre_comercial}</Text><Text style={{color:c.muted}}>{[d.direccion_entrega,d.localidad,d.provincia].filter(Boolean).join(', ')} · {d.estado.replaceAll('_',' ')}</Text>{d.latitud==null&&<Text style={{color:c.warning}}>Sin coordenadas confirmadas. Navegá por dirección o pedí corregir la ubicación en Clientes.</Text>}<Button title="Indicaciones en Google Maps" secondary onPress={()=>void navigate(d)}/><Button title="Consultar y registrar entrega" secondary onPress={()=>router.push(`/orders/${d.id}`)}/></Card>)}
  </Page>;
}
