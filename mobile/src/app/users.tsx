import { Redirect } from "expo-router";
// Compatibilidad con enlaces antiguos; la administración ahora es por negocio.
export default function Users() { return <Redirect href="/team" />; }
