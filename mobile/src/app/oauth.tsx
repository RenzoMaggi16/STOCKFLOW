import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Page, Button, Status } from "../components/ui";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { session } from "../services/api";
import { errorMessage } from "../services/session";
// Share the exchange during React strict-mode remounts; tickets are single use.
let exchange: { ticket: string; promise: Promise<any> } | undefined;
export default function OAuth() {
  const auth = useAuth();
  const [error, setError] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let active = true;
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const failure = params.get("error");
      if (failure) {
        sessionStorage.removeItem("stockflow.oauth");
        throw new Error(failure === "ACCOUNT_EXISTS" ? "Este correo ya tiene una cuenta. Ingresá con tu método original; las cuentas no se vinculan automáticamente." : failure === "OAUTH_CANCELLED" ? "Cancelaste el acceso. Podés volver a intentarlo." : "El proveedor no pudo completar el acceso. Revisá la configuración e intentá nuevamente.");
      }
      const ticket = params.get("ticket");
      if (!ticket) throw new Error("Falta la respuesta del proveedor. Iniciá el acceso nuevamente.");
      if (!exchange || exchange.ticket !== ticket) {
        const saved = JSON.parse(sessionStorage.getItem("stockflow.oauth") || "null");
        sessionStorage.removeItem("stockflow.oauth");
        if (!saved || saved.expires < Date.now()) throw new Error("La solicitud venció o se abrió en otro navegador. Iniciá el acceso nuevamente.");
        exchange = { ticket, promise: session.publicApi.post("/auth/social/exchange", { ticket, verifier: saved.verifier }).then(r => r.data.data) };
      }
      const data = await exchange.promise;
      if (!active) return;
      window.history.replaceState(null, "", "/oauth");
      await auth.accept(data);
      // El inicio espera los negocios antes de entrar a las pestañas protegidas.
      router.replace(data.requiresMfa ? "/second-factor" : data.user.email_verificado ? "/" : "/verify");
    }
    void finish().catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
    // The callback must be consumed once, not on changes to the auth context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Page title="Volviendo a StockFlow" subtitle="Estamos completando tu acceso de forma segura."><Status loading={Platform.OS === "web" && !error} error={error}/><Button title="Volver al ingreso" secondary onPress={() => router.replace("/login")}/></Page>;
}
