import { EntityForm, type Field } from "./EntityForm";
import { api } from "../services/api";
import { Text } from "react-native";
import { Card, styles, money } from "./ui";
import { useBusiness } from "../contexts/BusinessContext";
const fields: Field[] = [
  { name: "nombre", label: "Nombre", required: true, section:"Identidad del producto" },
  { name: "sku", label: "SKU único", required: true },
  { name: "descripcion", label: "Descripción" },
  {
    name:"costo_compra", label:"Costo de compra por unidad", section:"Compra y venta",
    numeric:true, hint:"Opcional. Dejalo vacío si todavía no conocés el costo. Usá la misma moneda que el precio de venta.",
    validate:v=>!v || /^\d{1,10}(\.\d{1,2})?$/.test(v) || "Usá un importe no negativo con hasta 2 decimales",
  },
  {
    name: "precio",
    label: "Precio de venta por unidad",
    required: true,
    numeric: true,
    validate: (v) =>
      /^\d{1,10}(\.\d{1,2})?$/.test(v) ||
      "Usá un precio positivo con punto decimal",
  },
  {
    name: "stock_minimo",
    section:"Inventario y organización",
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
    allowCreate: true,
  },
  {
    name: "proveedor_id",
    label: "Proveedor (opcional)",
    resource: "/suppliers",
    allowCreate: true,
  },
];
export function ProductForm({
  initial,
  onSaved,
}: {
  initial?: any;
  onSaved: () => void;
}) {
  const {role}=useBusiness();
  return (
    <EntityForm
      fields={initial || role!=="encargado" ? fields : [...fields.slice(0,5), {name:"stock_inicial",label:"Existencias iniciales",numeric:true,required:true,hint:"Se registra una entrada inicial automáticamente. Dejá 0 si todavía no tenés unidades.",validate:(v:string)=>(/^\d+$/.test(v) && Number(v)<=2147483647) || "Ingresá un entero entre 0 y 2147483647"}, ...fields.slice(5)]}
      initial={initial || { stock_minimo: 0, stock_inicial:0 }}
      preview={v=>{
        if(!v.costo_compra || !v.precio || !/^\d{1,10}(\.\d{1,2})?$/.test(v.costo_compra) || !/^\d{1,10}(\.\d{1,2})?$/.test(v.precio)) return null;
        const cost=Math.round(Number(v.costo_compra)*100), sale=Math.round(Number(v.precio)*100), difference=sale-cost;
        return <Card><Text style={styles.label}>Diferencia por unidad</Text><Text style={[styles.title,difference<0 && {color:"#B42318"}]}>{money(difference/100)}</Text><Text style={styles.subtitle}>{sale>0 ? `Margen sobre venta: ${(difference/sale*100).toFixed(1)}%. ` : "Margen porcentual no calculable con venta cero. "}Estimación antes de impuestos y otros gastos; no es ganancia realizada.</Text>{difference<0 && <Text style={styles.error}>El precio de venta está por debajo del costo de compra.</Text>}</Card>;
      }}
      onSubmit={async (v) => {
        const body = {
          ...v,
          ...(!initial ? {stock_inicial:role==="encargado"?Number(v.stock_inicial):0} : {}),
          costo_compra: v.costo_compra || null,
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
