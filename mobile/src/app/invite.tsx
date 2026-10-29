import { useState } from "react";
import { Platform, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useBusiness } from "../contexts/BusinessContext";
import { api } from "../services/api";
import { Page, Card, Button, Confirm, Status, useStyles } from "../components/ui";
import { IdentityBanner } from "../components/WorkspaceDesign";
export default function Invite() {
  const styles = useStyles();

  const auth=useAuth(), business=useBusiness(), params=useLocalSearchParams<{token?:string}>();
  const [token]=useState(()=>Platform.OS==='web' ? new URLSearchParams(window.location.hash.slice(1)).get('token') || '' : params.token || '');
  return <Page title="Te invitaron a un negocio" subtitle="Ingresá con la dirección que recibió el correo y verificala para incorporarte al equipo.">
    <IdentityBanner title="Tu equipo te está esperando." subtitle="Aceptá la invitación y empezá a trabajar sobre el mismo inventario." badge="TRABAJEN JUNTOS" icon="people-outline"/>
    {auth.loading ? <Status loading/> : !auth.user ? <Card><Text style={styles.subtitle}>Después de ingresar, la invitación también aparecerá en Tus negocios. No necesitás copiar el enlace.</Text><Button title="Iniciar sesión" onPress={()=>router.push('/login')}/><Button title="Crear cuenta" secondary onPress={()=>router.push('/register')}/></Card> : !auth.user.email_verificado ? <Button title="Verificar mi correo" onPress={()=>router.push('/verify')}/> : <Card><Text style={styles.subtitle}>Cuenta: {auth.user.email}</Text>{/^[a-f0-9]{64}$/.test(token) && <Confirm title="Aceptar invitación" message="Vas a incorporarte a la distribuidora con el rol asignado en la invitación." onConfirm={async()=>{const r=await api.post('/invitations/accept',{token});await business.refresh();await business.select(r.data.data.negocio_id);router.replace('/(tabs)');}}/>}<Button title="Ver mis negocios e invitaciones" secondary onPress={()=>router.replace('/businesses')}/></Card>}
  </Page>;
}
