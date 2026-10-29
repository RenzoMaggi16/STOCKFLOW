import { z } from "zod";
import { idSchema } from "./inventory";

const note = z.string().trim().max(1000).nullable().optional();
export const clientSchema = z.object({
  nombre_comercial: z.string().trim().min(2).max(150),
  contacto: z.string().trim().max(150).nullable().optional(),
  email: z.email().max(150).nullable().optional(),
  telefono: z.string().trim().max(50).nullable().optional(),
  direccion_entrega: z.string().trim().min(3).max(300),
  localidad: z.string().trim().max(150).nullable().optional(),
  provincia: z.string().trim().max(150).nullable().optional(),
  latitud: z.number().min(-90).max(90).nullable().optional(),
  longitud: z.number().min(-180).max(180).nullable().optional(),
  observaciones: note,
}).strict();
export const orderSchema = z.object({
  cliente_id: idSchema,
  observaciones: note,
  items: z.array(z.object({ producto_id: idSchema, cantidad: z.number().int().min(1).max(1000000) }).strict()).min(1).max(100),
}).strict().refine(v => new Set(v.items.map(i => i.producto_id)).size === v.items.length, "No repitas productos en un pedido");
export const ratingSchema = z.object({
  puntualidad: z.number().int().min(1).max(5),
  acuerdos: z.number().int().min(1).max(5),
  trato: z.number().int().min(1).max(5),
  motivo: z.string().trim().min(3).max(500),
}).strict();
export const reasonSchema = z.object({ motivo: z.string().trim().min(3).max(500) }).strict();
export const adjustmentSchema = reasonSchema.extend({ producto_id: idSchema, stock_propuesto: z.number().int().min(0).max(2147483647) });
export const assignmentSchema = z.object({ repartidor_id: idSchema }).strict();
export type NewOrder = z.infer<typeof orderSchema>;
