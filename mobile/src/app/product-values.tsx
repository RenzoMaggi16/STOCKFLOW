import {useState} from 'react';
import {Text} from 'react-native';
import {Redirect} from 'expo-router';
import {useBusiness} from '../contexts/BusinessContext';
import {useResource} from '../hooks/useResource';
import {api} from '../services/api';
import {errorMessage} from '../services/session';
import {Page,Card,Input,Button,Status,useStyles} from '../components/ui';
export default function Values(){const {role}=useBusiness();return role==='admin'||role==='encargado'?<Editor/>:<Redirect href="/(tabs)"/>;}
function Editor(){
 const r=useResource<{campos:{id:string;nombre:string;opciones:string[]}[]}>('/product-values');
 const [draft,setDraft]=useState<{id:string;nombre:string;opciones:string}[]|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),s=useStyles();
 const fields=draft??r.data?.campos.map(c=>({...c,opciones:c.opciones.join(', ')}))??[];
 function change(index:number,key:'nombre'|'opciones',value:string){setDraft(fields.map((f,i)=>i===index?{...f,[key]:value}:f));setSaved(false);}
 async function save(){setBusy(true);setError('');try{await api.put('/product-values',{campos:fields.map(f=>({...f,opciones:f.opciones.split(',').map(v=>v.trim()).filter(Boolean)}))});setSaved(true);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <Page title="Valores de cajas" subtitle="Personalizá las características de tu distribuidora">
  <Status loading={r.loading} error={r.error} retry={r.load}/>
  <Text style={s.subtitle}>Editá los nombres y las opciones disponibles al crear o modificar cajas. Dejá las opciones vacías para permitir texto libre, por ejemplo medidas en cm. Los productos existentes conservan sus valores.</Text>
  {fields.map((f,i)=><Card key={f.id}><Input label="Característica" value={f.nombre} onChange={v=>change(i,'nombre',v)} disabled={busy}/><Input label="Opciones separadas por comas" value={f.opciones} onChange={v=>change(i,'opciones',v)} disabled={busy}/></Card>)}
  {!!r.data&&<><Button title="Agregar característica" secondary disabled={busy||fields.length>=20} onPress={()=>{setDraft([...fields,{id:`c_${Date.now().toString(36)}`,nombre:'',opciones:''}]);setSaved(false);}}/><Status error={error}/>{saved&&<Text style={s.subtitle}>Valores guardados. Se aplican al volver a abrir el formulario de una caja.</Text>}<Button title={busy?'Guardando…':'Guardar valores'} disabled={busy} onPress={()=>void save()}/></>}
 </Page>;
}
