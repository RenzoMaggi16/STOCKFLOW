import { useState } from "react";
import { Text, View } from "react-native";
import { IdentityBanner, SectionHeading, design, roleLabel } from "../components/WorkspaceDesign";
import { useBusiness } from "../contexts/BusinessContext";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { Guard } from "../components/Guard";
import { EntityForm } from "../components/EntityForm";
import { Page, Card, Button, Choices, Confirm, Sheet, Status, styles } from "../components/ui";
export default function Team() {
  const business=useBusiness(), auth=useAuth();
  const base=`/businesses/${business.active?.id}`;
  const members=useResource(`${base}/members`), invitations=useResource(`${base}/invitations`);
  const [inviteOpen,setInviteOpen]=useState(false), [role,setRole]=useState("empleado"), [selected,setSelected]=useState<any>(null), [newRole,setNewRole]=useState("empleado"), [notice,setNotice]=useState("");
  const roles=[{value:"empleado",label:"Ventas"},{value:"encargado",label:"Depósito"},{value:"repartidor",label:"Repartidor"},{value:"admin",label:"Administrador"}];
  return <Guard roles={["admin"]}><Page title="Equipo de trabajo" subtitle={business.active?.nombre}>
    <IdentityBanner title="El trabajo es mejor en equipo." subtitle="Invitá personas, organizá sus roles y compartí un inventario siempre actualizado." badge="PERSONAS Y PERMISOS" icon="people-outline"/>
    <View style={design.toolbar}><SectionHeading title="Integrantes de la distribuidora" icon="people-outline"/><Button title="Invitar empleado" onPress={()=>setInviteOpen(true)} /></View>
    {!!notice && <Text style={styles.pill}>{notice}</Text>}
    <Text style={styles.subtitle}>Los roles y las bajas afectan únicamente a este negocio. Siempre debe quedar un administrador activo.</Text>
    <Status loading={members.loading} error={members.error} retry={members.load} />
    <View style={design.grid}>{members.data?.items.map((m:any)=><View key={m.id} style={design.column}><Card><SectionHeading title={`${m.nombre}${m.id===auth.user?.id ? " (vos)" : ""}`} subtitle={m.email} icon="person-circle-outline"/><View style={styles.row}><Text style={styles.pill}>{roleLabel(m.rol)}</Text><Text style={styles.subtitle}>{m.estado}</Text></View><Button title={`Administrar a ${m.nombre}`} secondary onPress={()=>{setSelected(m);setNewRole(m.rol);}} /></Card></View>)}</View>
    <Text style={[styles.title,{fontSize:22}]}>Invitaciones enviadas</Text><Status loading={invitations.loading} error={invitations.error} retry={invitations.load} empty={!invitations.data?.items.length} />
    {invitations.data?.items.map((i:any)=><Card key={i.id}><Text style={styles.label}>{i.email}</Text><Text style={styles.subtitle}>{i.rol} · {i.estado} · Vence {new Date(i.expira_en).toLocaleDateString("es-AR")}</Text>{!i.enviado_en && i.estado === "pendiente" && <Text style={styles.error}>El envío no se confirmó. Podés reenviarlo.</Text>}{["pendiente","vencida"].includes(i.estado) && <><Confirm title={`Reenviar a ${i.email}`} message="Se enviará un enlace nuevo; el anterior dejará de funcionar." onConfirm={async()=>{await api.post(`/invitations/${i.id}/resend`);await invitations.load();setNotice("Invitación reenviada");}} /><Confirm title={`Cancelar invitación a ${i.email}`} danger message="El enlace ya no permitirá incorporarse al negocio." onConfirm={async()=>{await api.delete(`/invitations/${i.id}`);await invitations.load();}} /></>}</Card>)}
    <Sheet visible={inviteOpen} title="Invitar al negocio" onClose={()=>setInviteOpen(false)}><Text style={styles.subtitle}>Elegí el rol que tendrá esta persona en {business.active?.nombre}.</Text><Choices value={role} options={roles} onChange={setRole}/><EntityForm label="Enviar invitación" fields={[{name:"email",label:"Correo del invitado",required:true,validate:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)||"Ingresá un correo válido"}]} onSubmit={async v=>{try{await api.post(`${base}/invitations`,{email:v.email,rol:role});setInviteOpen(false);setNotice("Invitación enviada por correo");}finally{await invitations.load();}}}/></Sheet>
    <Sheet visible={!!selected} title="Administrar integrante" onClose={()=>setSelected(null)}>{selected && <><Text style={styles.label}>{selected.nombre} · {selected.email}</Text><Choices value={newRole} options={roles} onChange={setNewRole}/><Confirm title="Guardar rol" message={`Asignar el rol ${newRole} en este negocio.`} onConfirm={async()=>{await api.patch(`${base}/members/${selected.id}`,{rol:newRole});setSelected(null);await members.load();await business.refresh();}}/><Confirm title={selected.estado==='activo'?'Quitar del negocio':'Restaurar acceso'} danger={selected.estado==='activo'} message="Este cambio solo afecta su membresía en este negocio." onConfirm={async()=>{if(selected.estado==='activo') await api.delete(`${base}/members/${selected.id}`); else await api.patch(`${base}/members/${selected.id}`,{estado:'activo'});setSelected(null);await members.load();await business.refresh();}}/></>}</Sheet>
  </Page></Guard>;
}
