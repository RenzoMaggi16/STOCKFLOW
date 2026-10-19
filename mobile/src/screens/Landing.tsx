import { router } from "expo-router";
import { Text } from "react-native";
import { Page, Card, Button, styles } from "../components/ui";
import { IdentityBanner } from "../components/WorkspaceDesign";
export default function Landing() {
  return <Page title="StockFlow" subtitle="TU INVENTARIO, EN ORDEN"><IdentityBanner title="Menos vueltas. Más control." subtitle="Productos, movimientos y equipo. Todo conectado en un mismo lugar." badge="GESTIÓN SIMPLE" icon="cube-outline"/><Button title="Crear cuenta" onPress={()=>router.push("/register")}/><Button title="Iniciar sesión" secondary onPress={()=>router.push("/login")}/>{[["Conocé tus existencias","Consultá productos, costos, precios y alertas de reposición."],["Trabajá en equipo","Invitá personas y asigná permisos para cada negocio."],["Cada movimiento cuenta","Registrá entradas y salidas con un historial compartido."]].map(([title,copy])=><Card key={title}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{copy}</Text></Card>)}</Page>;
}
