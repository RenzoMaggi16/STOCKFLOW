import { Page, Button } from "../components/ui";
import { router } from "expo-router";
export default function OAuth() {
  return (
    <Page
      title="Volviendo a StockFlow"
      subtitle="El acceso se completa en la sesión del navegador que lo inició. Si la aplicación se cerró, iniciá el acceso otra vez."
    >
      <Button title="Volver al inicio" onPress={() => router.replace("/")} />
    </Page>
  );
}
