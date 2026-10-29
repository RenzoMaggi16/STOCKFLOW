import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IdentityBanner, SectionHeading, design, roleLabel } from "../components/WorkspaceDesign";
import { useAuth } from "../contexts/AuthContext";
import { useBusiness } from "../contexts/BusinessContext";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
import { Page, Card, Button, Status, Confirm, useStyles, useColors } from "../components/ui";
export default function Businesses() {
  const styles = useStyles(),c=useColors();

  const auth = useAuth(), business = useBusiness();
  const inbox = useResource("/invitations");
  const [error,setError] = useState("");
  if (auth.loading) return <Page title="Cargando"><Status loading /></Page>;
  if (!auth.user) return <Redirect href="/login" />;
  if (!auth.user.email_verificado) return <Redirect href="/verify" />;
  async function enter(id: number) {
    try { await business.select(id); router.replace("/(tabs)"); }
    catch(e) { setError(errorMessage(e)); }
  }
  return <Page title="Tus distribuidoras" subtitle="Elegí dónde trabajar. Tu rol puede ser diferente en cada distribuidora.">
    <IdentityBanner title="Un lugar para cada distribuidora." subtitle="Organizá tu inventario, conectá a tu equipo y elegí dónde empezar hoy." badge="TU ESPACIO DE TRABAJO" />
    <View style={design.toolbar}><Text style={styles.label}>{business.businesses.length} {business.businesses.length === 1 ? "distribuidora disponible" : "distribuidoras disponibles"}</Text><Button title="Crear distribuidora" onPress={() => router.push("/business-create")} />
    <Button title="Actualizar distribuidoras e invitaciones" secondary onPress={() => { void business.refresh(); void inbox.load(); }} />
    </View><Status loading={business.loading} error={business.error || error} retry={business.refresh} />
    <View style={design.grid}><View style={[design.column,{flexGrow:1.5}]}>
    {!business.loading && !business.businesses.length && <Card><View style={design.empty}><View style={design.emblem}><Ionicons name="storefront-outline" size={34} color={c.green}/></View><Text style={[styles.title,{fontSize:23,textAlign:"center"}]}>Tu próximo proyecto empieza acá</Text><Text style={[styles.subtitle,{textAlign:"center"}]}>Creá tu distribuidora y empezá a organizar productos, clientes, pedidos y entregas.</Text></View><SectionHeading title="01 · Creá tu espacio" subtitle="Elegí el nombre de tu distribuidora de cajas." icon="add-circle-outline"/><SectionHeading title="02 · Sumá tu inventario" subtitle="Cargá productos y registrá tu primera entrada." icon="cube-outline"/><SectionHeading title="03 · Invitá a tu equipo" subtitle="Compartí el trabajo con permisos para cada persona." icon="people-outline"/></Card>}
    {business.businesses.map(b => <Card key={b.id}><SectionHeading title={b.nombre} subtitle={b.rubro || "Tu espacio de trabajo"} icon="storefront-outline"/><View style={styles.row}><Text style={styles.pill}>{roleLabel(b.rol)}</Text>{business.active?.id===b.id && <Text style={styles.subtitle}>Distribuidora actual</Text>}</View><Button title={`Entrar a ${b.nombre}`} disabled={business.loading} onPress={() => void enter(b.id)} /></Card>)}
    </View><View style={design.column}><Card><SectionHeading title="Invitaciones recibidas" subtitle={`Para ${auth.user.email}`} icon="mail-outline"/>
    <Status loading={inbox.loading} error={inbox.error} retry={inbox.load} />
    {!inbox.loading && !inbox.error && !inbox.data?.items.length && <View style={design.empty}><Ionicons name="checkmark-circle-outline" size={38} color={c.green}/><Text style={styles.label}>Estás al día</Text><Text style={[styles.subtitle,{textAlign:"center"}]}>No tenés invitaciones pendientes. Cuando un equipo te invite, lo vas a encontrar acá.</Text></View>}
    {inbox.data?.items.map((i:any) => <Card key={i.id}><Text style={styles.label}>{i.negocio}</Text><Text style={styles.subtitle}>Rol: {i.rol} · Vence {new Date(i.expira_en).toLocaleDateString("es-AR")}</Text><Confirm title={`Aceptar invitación a ${i.negocio}`} message={`Vas a incorporarte como ${i.rol}.`} onConfirm={async()=>{ await api.post("/invitations/accept",{id:i.id}); await business.refresh(); await enter(i.negocio_id); }} /></Card>)}
    </Card></View></View><View style={{alignItems:"flex-start",marginTop:8}}><Button title="Cerrar sesión" secondary onPress={() => void auth.logout().then(()=>router.replace("/login")).catch(e=>setError(errorMessage(e)))} /></View>
  </Page>;
}
