import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design, roleLabel } from "../components/WorkspaceDesign";
import { router } from "expo-router";
import { Guard } from "../components/Guard";
import { useBusiness } from "../contexts/BusinessContext";
import { api } from "../services/api";
import { Page, Card, Button, Confirm, styles } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
export default function BusinessSettings() {
  const business=useBusiness(), current=business.active;
  return <Guard><Page title="Mi negocio" subtitle="La configuración y los permisos se aplican solo a este negocio.">{current && <>
    <IdentityBanner title={current.nombre} subtitle={current.descripcion || "Un espacio compartido para mantener tu inventario en orden."} badge={`${roleLabel(current.rol).toUpperCase()} · NEGOCIO ACTIVO`}/>
    <View style={design.toolbar}><Text style={styles.pill}>{current.rubro || "Rubro sin definir"}</Text><Button title="Cambiar negocio" secondary onPress={()=>router.push("/businesses")} /></View>
    {current.rol === "admin" && <><View style={design.grid}><View style={design.column}><Card><SectionHeading title="Identidad del negocio" subtitle="Así lo ve tu equipo dentro de StockFlow." icon="create-outline"/><EntityForm initial={current} fields={[{name:"nombre",label:"Nombre del negocio",required:true},{name:"rubro",label:"Rubro"},{name:"descripcion",label:"Descripción"}]} onSubmit={async v=>{await api.patch(`/businesses/${current.id}`,v);await business.refresh();}} /></Card></View><View style={design.column}><Card><SectionHeading title="Un equipo, un inventario" subtitle="Invitá personas y organizá sus permisos." icon="people-outline"/><Button title="Equipo e invitaciones" onPress={()=>router.push("/team")} /></Card><View style={design.danger}><SectionHeading title="Desactivar este negocio" subtitle="Disponible solo cuando el inventario tenga stock cero. El historial se conserva." icon="pause-circle-outline"/><Confirm title="Desactivar negocio" danger message="Debe tener stock cero. Se cancelarán las invitaciones y nadie podrá acceder al negocio. El inventario y el historial se conservarán." onConfirm={async()=>{await api.patch(`/businesses/${current.id}`,{activo:false});business.clear();await business.refresh();router.replace("/businesses");}} /></View></View></View></>}
  </>}</Page></Guard>;
}
