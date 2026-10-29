import { Redirect } from "expo-router";
// Compatibilidad con enlaces antiguos; la administración ahora es por distribuidora.
export default function Users() { return <Redirect href="/team" />; }
