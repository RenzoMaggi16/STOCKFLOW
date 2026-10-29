import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {useBusiness} from '../contexts/BusinessContext';
import {useResource} from '../hooks/useResource';
import {Page,Card,Button,Status,useColors} from '../components/ui';
import {roleLabel} from '../components/WorkspaceDesign';
export default function BoxDashboard(){
  const {role,active}=useBusiness(),c=useColors(),r=useResource('/dashboard');
  const d=r.data;
  const driver=role==='repartidor',seller=role==='empleado';
  const metrics=driver?[['Entregas asignadas','pedidos_total'],['Pendientes','entregas_pendientes'],['Completadas','pedidos_entregados'],['Fallidas','entregas_fallidas']]:seller?[['Pedidos propios pendientes','pedidos_pendientes'],['Clientes activos','clientes'],['Cajas disponibles','unidades_disponibles'],['Pagos informados','pagos_informados']]:[['Productos activos','productos'],['Unidades disponibles','unidades_disponibles'],['Pedidos pendientes','pedidos_pendientes'],['Productos con stock bajo','stock_bajo']];
  const actions:Record<string,[string,string][]>={admin:[['Ver equipo','/team'],['Revisar ajustes','/stock-adjustments'],['Consultar reportes','/reports']],encargado:[['Registrar ingreso de cajas','/(tabs)/movements'],['Pedidos para preparar','/(tabs)/orders'],['Registrar ajuste ordinario','/(tabs)/movements']],empleado:[['Crear cliente','/(tabs)/clients'],['Crear pedido','/orders/create'],['Registrar aviso de pago','/(tabs)/orders']],repartidor:[['Ver mis entregas','/(tabs)/orders'],['Abrir mapa','/(tabs)/map'],['Registrar resultado de entrega','/(tabs)/orders']]};
  const text={color:c.dark,fontSize:16},muted={color:c.muted,lineHeight:22};
  return <Page title={active?.nombre||'StockFlow'} subtitle={`Distribuidora de cajas de cartón · ${roleLabel(role)}`}>
    <Status loading={r.loading} error={r.error} retry={r.load}/>
    {d&&<><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{metrics.map(([label,key])=><View key={key} style={{flexGrow:1,flexBasis:'44%'}}><Card><Text style={muted}>{label}</Text><Text style={{color:key==='stock_bajo'||key==='entregas_fallidas'?c.warning:c.dark,fontSize:30,fontWeight:'700'}}>{Number(d[key]||0).toLocaleString('es-AR')}</Text></Card></View>)}</View>
    <Card><Text style={[text,{fontWeight:'700'}]}>Acciones rápidas</Text>{(actions[role]||[]).map(([title,path])=><Button key={title} title={title} secondary onPress={()=>router.push(path as any)}/>)}</Card>
    <Card><Text style={[text,{fontWeight:'700'}]}>{driver?'Mis últimas entregas':seller?'Mis últimos pedidos':'Últimos pedidos'}</Text>{!d.ultimos_pedidos?.length&&<Text style={muted}>Todavía no hay pedidos.</Text>}{d.ultimos_pedidos?.map((o:any)=><Button key={o.id} secondary title={`#${o.id} · ${o.nombre_comercial} · ${o.estado.replaceAll('_',' ')}`} onPress={()=>router.push(`/orders/${o.id}`)}/>)}</Card>
    {!driver&&<Card><Text style={[text,{fontWeight:'700'}]}>Resumen de entregas</Text><Text style={muted}>{d.entregas_pendientes} pendientes · {d.pedidos_entregados} entregados</Text></Card>}
    {d.stock_bajo_productos&&<Card><Text style={[text,{fontWeight:'700',color:c.warning}]}>Cajas para reponer</Text>{!d.stock_bajo_productos.length&&<Text style={muted}>No hay productos con stock bajo.</Text>}{d.stock_bajo_productos.map((p:any)=><Button key={p.id} secondary title={`${p.nombre} · ${p.stock} unidades`} onPress={()=>router.push(`/products/${p.id}`)}/>)}</Card>}
    {d.movimientos_recientes&&<Card><Text style={[text,{fontWeight:'700'}]}>Movimientos recientes</Text>{!d.movimientos_recientes.length&&<Text style={muted}>Sin movimientos registrados.</Text>}{d.movimientos_recientes.map((m:any)=><Text key={m.id} style={muted}>{m.nombre} · {m.tipo} · {m.cantidad}</Text>)}</Card>}
    {!driver&&<Card><Text style={[text,{fontWeight:'700'}]}>Cajas más distribuidas</Text>{!d.mas_distribuidos?.length&&<Text style={muted}>Se calculará al completar entregas.</Text>}{d.mas_distribuidos?.map((p:any)=><Text key={p.id} style={muted}>{p.nombre} · {p.unidades} unidades</Text>)}</Card>}
    {role==='admin'&&<Card><Text style={muted}>{d.empleados} integrantes · {d.ajustes_pendientes} ajustes por revisar</Text></Card>}
    {role==='encargado'&&<Card><Text style={muted}>{d.para_preparar} pedidos para preparar</Text><Text style={muted}>Las recepciones se registran al ingresar cajas al depósito.</Text></Card>}
    </>}
  </Page>;
}
