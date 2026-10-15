import { EntityForm, type Field } from "./EntityForm";
import { api } from "../services/api";
const fields: Field[] = [
  { name: "nombre", label: "Nombre", required: true },
  { name: "sku", label: "SKU único", required: true },
  { name: "descripcion", label: "Descripción" },
  {
    name: "precio",
    label: "Precio (ej. 1500.50)",
    required: true,
    numeric: true,
    validate: (v) =>
      /^\d{1,10}(\.\d{1,2})?$/.test(v) ||
      "Usá un precio positivo con punto decimal",
  },
  {
    name: "stock_minimo",
    label: "Stock mínimo",
    required: true,
    numeric: true,
    validate: (v) => /^\d+$/.test(v) || "Ingresá un entero no negativo",
  },
  {
    name: "categoria_id",
    label: "Categoría",
    required: true,
    resource: "/categories",
  },
  {
    name: "proveedor_id",
    label: "Proveedor (opcional)",
    resource: "/suppliers",
  },
];
export function ProductForm({
  initial,
  onSaved,
}: {
  initial?: any;
  onSaved: () => void;
}) {
  return (
    <EntityForm
      fields={fields}
      initial={initial || { stock_minimo: 0 }}
      onSubmit={async (v) => {
        const body = {
          ...v,
          stock_minimo: Number(v.stock_minimo),
          categoria_id: Number(v.categoria_id),
          proveedor_id: v.proveedor_id ? Number(v.proveedor_id) : null,
        };
        if (initial) await api.patch(`/products/${initial.id}`, body);
        else await api.post("/products", body);
        onSaved();
      }}
    />
  );
}
