import { z } from "zod";
export const idSchema = z.coerce.number().int().positive().max(2147483647);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
export const categorySchema = z
  .object({ nombre: text(100), descripcion: optionalText(500) })
  .strict();
export const supplierSchema = z
  .object({
    nombre: text(100),
    email: z.email().max(150).nullable().optional(),
    telefono: optionalText(40),
    direccion: optionalText(250),
  })
  .strict();
// Precio como texto decimal: evita errores de redondeo binario y conserva centavos.
export const productSchema = z
  .object({
    nombre: text(150),
    descripcion: optionalText(1000),
    sku: text(64),
    precio: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    stock_minimo: z.number().int().min(0).max(2147483647).optional(),
    categoria_id: idSchema,
    proveedor_id: idSchema.nullable().optional(),
  })
  .strict();
export const movementSchema = z
  .object({
    producto_id: idSchema,
    tipo: z.enum(["entrada", "salida", "ajuste"]),
    cantidad: z.number().int().min(0).max(2147483647),
    motivo: text(500),
  })
  .strict()
  .refine((v) => v.tipo === "ajuste" || v.cantidad > 0, {
    message: "Entradas y salidas requieren cantidad positiva",
    path: ["cantidad"],
  });
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(150).optional(),
    stock: z.enum(["disponible", "bajo", "sin"]).optional(),
    categoria_id: idSchema.optional(),
    proveedor_id: idSchema.optional(),
  })
  .strict();
export type Movement = z.infer<typeof movementSchema>;
