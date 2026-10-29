import {router} from 'expo-router';
import {useBusiness} from '../../contexts/BusinessContext';
import {Page,Card,Button} from '../../components/ui';
export default function More(){
  const {role}=useBusiness();
  const links:[string,string,boolean][]=[
    ['Catálogo de cajas','/(tabs)/products',role==='empleado'],
    ['Clientes y ranking','/(tabs)/clients',role==='admin'||role==='encargado'],
    ['Movimientos de cajas','/(tabs)/movements',role==='admin'||role==='encargado'],
    ['Ajustes de inventario','/stock-adjustments',role!=='repartidor'],
    ['Equipo e invitaciones','/team',role==='admin'],
    ['Reportes','/reports',role==='admin'||role==='encargado'],
    ['Mi distribuidora','/business-settings',role==='admin'],
    ['Cambiar distribuidora','/businesses',true],
    ['Perfil y apariencia','/(tabs)/profile',true],
  ];
  return <Page title="Más" subtitle="Herramientas de tu distribuidora"><Card>{links.filter(x=>x[2]).map(([title,path])=><Button key={path} title={title} secondary onPress={()=>router.push(path as any)}/>)}</Card></Page>;
}
