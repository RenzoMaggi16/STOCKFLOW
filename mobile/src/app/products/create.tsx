import { router } from "expo-router";
import { Page, Card } from "../../components/ui";
import { ProductForm } from "../../components/ProductForm";
import { Guard } from "../../components/Guard";
import { IdentityBanner } from "../../components/WorkspaceDesign";
export default function Create() {
  return (
    <Guard roles={["admin", "encargado"]}>
      <Page
        title="Nuevo producto"
        subtitle="Cargá sus datos y las unidades que ya tenés disponibles."
      >
        <IdentityBanner title="Dale lugar a un nuevo producto." subtitle="Definí su compra, venta y categoría. Podés cargar las existencias iniciales en este mismo formulario." badge="AMPLIÁ TU INVENTARIO" icon="cube-outline"/>
        <Card>
          <ProductForm onSaved={() => router.replace("/(tabs)/products")} />
        </Card>
      </Page>
    </Guard>
  );
}
