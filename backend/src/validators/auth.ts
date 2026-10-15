import { z } from "zod";
export const registerSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().pipe(z.email().max(150)),
    password: z
      .string()
      .min(10)
      .refine(
        (v) => Buffer.byteLength(v, "utf8") <= 72,
        "Máximo 72 bytes UTF-8",
      )
      .regex(/[A-Z]/, "Falta mayúscula")
      .regex(/[a-z]/, "Falta minúscula")
      .regex(/[0-9]/, "Falta número"),
  })
  .strict();
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(150)),
    password: z
      .string()
      .min(1)
      .refine(
        (v) => Buffer.byteLength(v, "utf8") <= 72,
        "Máximo 72 bytes UTF-8",
      ),
  })
  .strict();
export const refreshSchema = z
  .object({ refreshToken: z.string().min(1).max(2048) })
  .strict();
