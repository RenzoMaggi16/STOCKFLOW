import {z} from 'zod';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from '../config/db';
import {transaction} from './inventory.service';
import {lockAccess,type BusinessActor} from './business-access';
export const valuesSchema=z.object({campos:z.array(z.object({
 id:z.string().regex(/^(size|type|dimensiones|c_[a-z0-9_]{1,50})$/),
 nombre:z.string().trim().min(1).max(80),
 opciones:z.array(z.string().trim().min(1).max(100)).max(40).refine(a=>new Set(a).size===a.length,'No repitas opciones'),
}).strict()).min(3).max(20)}).strict().refine(v=>new Set(v.campos.map(c=>c.id)).size===v.campos.length && ['size','type','dimensiones'].every(id=>v.campos.some(c=>c.id===id)),'Conservá los campos base y no repitas identificadores');
export const defaultFields=[
 {id:'size',nombre:'Tamaño',opciones:['chica','mediana','grande']},
 {id:'type',nombre:'Tipo',opciones:['estandar','reforzada']},
 {id:'dimensiones',nombre:'Medidas',opciones:[]},
 {id:'c_forma',nombre:'Forma',opciones:['Cuadrada','Rectangular','Circular']},
];
export async function productValues(businessId:number){
 const [rows]=await pool.execute<RowDataPacket[]>('SELECT campos FROM valores_cajas WHERE negocio_id=?',[businessId]);
 const value=rows[0]?.campos;
 return {campos:value?(typeof value==='string'?JSON.parse(value):value):defaultFields};
}
export async function saveProductValues(actor:BusinessActor,input:z.infer<typeof valuesSchema>){
 return transaction(async conn=>{
  await lockAccess(conn,actor,['admin','encargado']);
  await conn.execute('INSERT INTO valores_cajas(negocio_id,campos) VALUES(?,?) ON DUPLICATE KEY UPDATE campos=VALUES(campos)',[actor.businessId,JSON.stringify(input.campos)]);
  return input;
 });
}
