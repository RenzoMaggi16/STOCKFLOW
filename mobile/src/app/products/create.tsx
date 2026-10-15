import { router } from "expo-router";
import { Page, Card } from "../../components/ui";
import { ProductForm } from "../../components/ProductForm";
import { Guard } from "../../components/Guard";
export default function Create() {
  return (
    <Guard roles={["admin", "encargado"]}>
      <Page
        title="Nuevo producto"
        subtitle="Se crea con stock cero. Registrá una entrada para cargar existencias."
      >
        <Card>
          <ProductForm onSaved={() => router.replace("/(tabs)/products")} />
        </Card>
      </Page>
    </Guard>
  );
}
