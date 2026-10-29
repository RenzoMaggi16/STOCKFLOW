import { Redirect, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useBusiness } from "../contexts/BusinessContext";
import { api } from "../services/api";
import { Page, Card, Status } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
import { IdentityBanner, SectionHeading } from "../components/WorkspaceDesign";
export default function CreateBusiness() {
  const auth=useAuth(), business=useBusiness();
  if(auth.loading) return <Page title="Cargando"><Status loading /></Page>;
  if(!auth.user) return <Redirect href="/login" />;
  if(!auth.user.email_verificado) return <Redirect href="/verify" />;
  return <Page title="Crear distribuidora" subtitle="Vas a ser su administrador. Después podés invitar a tu equipo."><IdentityBanner title="Tu idea, su propio espacio." subtitle="Empezá con los datos básicos. Podés actualizarlos cuando quieras desde Mi distribuidora." badge="UN NUEVO COMIENZO" icon="storefront-outline"/><Card><SectionHeading title="Presentá tu distribuidora" icon="create-outline"/><EntityForm label="Crear distribuidora" fields={[
    {name:"nombre",label:"Nombre de la distribuidora",required:true},  {name:"descripcion",label:"Descripción"},
  ]} onSubmit={async values=>{ const r=await api.post("/businesses",{...values,rubro:"Distribuidora mayorista de cajas de cartón"}); await business.refresh(); await business.select(r.data.data.id); router.replace("/(tabs)"); }} /></Card></Page>;
}
