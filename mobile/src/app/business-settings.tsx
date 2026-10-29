import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design, roleLabel } from "../components/WorkspaceDesign";
import { router } from "expo-router";
import { Guard } from "../components/Guard";
import { useBusiness } from "../contexts/BusinessContext";
import { api } from "../services/api";
import { Page, Card, Button, Confirm, useStyles } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
export default function BusinessSettings() {
  const styles = useStyles();

  const business=useBusiness(), current=business.active;
  return <Guard><Page title="Mi distribuidora" subtitle="La configuración y los permisos se aplican solo a esta distribuidora.">{current && <>
    <IdentityBanner title={current.nombre} subtitle={current.descripcion || "Un espacio compartido para mantener tu inventario en orden."} badge={`${roleLabel(current.rol).toUpperCase()} · DISTRIBUIDORA ACTIVA`}/>
    <View style={design.toolbar}><Text style={styles.pill}>{"Distribuidora mayorista de cajas de cartón"}</Text><Button title="Cambiar distribuidora" secondary onPress={()=>router.push("/businesses")} /></View>
    {current.rol === "admin" && <><View style={design.grid}><View style={design.column}><Card><SectionHeading title="Identidad de la distribuidora" subtitle="Así la ve tu equipo dentro de StockFlow." icon="create-outline"/><EntityForm initial={current} fields={[{name:"nombre",label:"Nombre de la distribuidora",required:true},{name:"descripcion",label:"Descripción"}]} onSubmit={async v=>{await api.patch(`/businesses/${current.id}`,v);await business.refresh();}} /></Card></View><View style={design.column}><Card><SectionHeading title="Un equipo, un inventario" subtitle="Invitá personas y organizá sus permisos." icon="people-outline"/><Button title="Equipo e invitaciones" onPress={()=>router.push("/team")} /></Card><View style={design.danger}><SectionHeading title="Desactivar esta distribuidora" subtitle="Disponible solo con stock cero y sin pedidos abiertos. El historial se conserva." icon="pause-circle-outline"/><Confirm title="Desactivar distribuidora" danger message="Debe tener stock cero y pedidos cerrados. Se cancelarán las invitaciones. El historial se conservará." onConfirm={async()=>{await api.patch(`/businesses/${current.id}`,{activo:false});business.clear();await business.refresh();router.replace("/businesses");}} /></View></View></View></>}
  </>}</Page></Guard>;
}
