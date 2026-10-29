import { EntityForm, type Field } from "./EntityForm";
import { api } from "../services/api";
import { Text } from "react-native";
import { Card, Status, useStyles, money } from "./ui";
import {useResource} from '../hooks/useResource';
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
    label: "Precio de distribución por unidad",
    required: true,
    numeric: true,
    validate: (v) =>
      /^\d{1,10}(\.\d{1,2})?$/.test(v) ||
      "Usá un precio positivo con punto decimal",
  },
  {
    name: "stock_minimo",
    section:"Inventario y organización",
    label: "Alertar poco stock",
    hint: "Mostrar una alerta cuando queden estas unidades o menos. Por ejemplo: 10.",
    required: true,
    numeric: true,
    validate: (v) => /^\d+$/.test(v) || "Ingresá un entero no negativo",
  },
  {name:'size',label:'Tamaño',required:true,options:[{value:'chica',label:'Chica'},{value:'mediana',label:'Mediana'},{value:'grande',label:'Grande'}]},
  {name:'type',label:'Tipo',required:true,options:[{value:'estandar',label:'Estándar'},{value:'reforzada',label:'Reforzada'}]},
  {name:'dimensiones',label:'Dimensiones (opcional)',hint:'Información descriptiva, por ejemplo 20 × 20 × 20 cm.'},
  {name:'imagen_url',label:'Imagen HTTPS (opcional)',validate:v=>!v || /^https:\/\//.test(v) || 'Usá una URL HTTPS'},
];
export function ProductForm({
  initial,
  onSaved,
}: {
  initial?: any;
  onSaved: () => void;
}) {
  const styles = useStyles();

  const {role}=useBusiness();
  const values=useResource<{campos:{id:string;nombre:string;opciones:string[]}[]}>('/product-values');
  if(!values.data)return <Status loading={values.loading} error={values.error} retry={values.load}/>;
  const attrs=typeof initial?.atributos==='string'?JSON.parse(initial.atributos):initial?.atributos??{};
  const editableFields:Field[]=[...fields.filter(f=>!['size','type','dimensiones'].includes(f.name)),...values.data.campos.map(f=>{
    const name=f.id.startsWith('c_')?`attr_${f.id}`:f.id;
    const current=String(f.id.startsWith('c_')?attrs[f.id]??'':initial?.[f.id]??'');
    const options=[...f.opciones,...(current&&!f.opciones.includes(current)?[current]:[])];
    return {name,label:f.nombre,...(f.opciones.length?{options:[{value:'',label:'Sin especificar'},...options.map(value=>({value,label:value==='estandar'?'Estándar':value}))]}:{}),validate:(v:string)=>v.length<=(f.id==='dimensiones'?150:100)||'El valor es demasiado largo'};
  })];
  const defaults={...(initial||{stock_minimo:0,stock_inicial:0}),...Object.fromEntries(Object.entries(attrs).map(([k,v])=>[`attr_${k}`,v]))};
  return (
    <EntityForm
      fields={initial || role!=="encargado" ? editableFields : [...editableFields, {name:"stock_inicial",label:"Existencias iniciales",numeric:true,required:true,hint:"Se registra una entrada inicial automáticamente. Dejá 0 si todavía no tenés unidades.",validate:(v:string)=>(/^\d+$/.test(v) && Number(v)<=2147483647) || "Ingresá un entero entre 0 y 2147483647"}]}
      initial={defaults}
      preview={v=>{
        if(!v.costo_compra || !v.precio || !/^\d{1,10}(\.\d{1,2})?$/.test(v.costo_compra) || !/^\d{1,10}(\.\d{1,2})?$/.test(v.precio)) return null;
        const cost=Math.round(Number(v.costo_compra)*100), sale=Math.round(Number(v.precio)*100), difference=sale-cost;
        return <Card><Text style={styles.label}>Diferencia por unidad</Text><Text style={[styles.title,difference<0 && styles.error]}>{money(difference/100)}</Text><Text style={styles.subtitle}>{sale>0 ? `Margen sobre venta: ${(difference/sale*100).toFixed(1)}%. ` : "Margen porcentual no calculable con venta cero. "}Estimación antes de impuestos y otros gastos; no es ganancia realizada.</Text>{difference<0 && <Text style={styles.error}>El precio de venta está por debajo del costo de compra.</Text>}</Card>;
      }}
      onSubmit={async (v) => {
        const body = {
          ...Object.fromEntries(Object.entries(v).filter(([k])=>!k.startsWith('attr_'))),
          atributos:{...attrs,...Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('attr_')).map(([k,value])=>[k.slice(5),value]))},
          ...(!initial ? {stock_inicial:role==="encargado"?Number(v.stock_inicial):0} : {}),
          costo_compra: v.costo_compra || null,
          stock_minimo: Number(v.stock_minimo),
          imagen_url: v.imagen_url || null,
        };
        if (initial) await api.patch(`/products/${initial.id}`, body);
        else await api.post("/products", body);
        onSaved();
      }}
    />
  );
}
