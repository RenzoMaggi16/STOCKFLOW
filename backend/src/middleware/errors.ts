import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors";
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new HttpError(404, "Ruta inexistente", "NOT_FOUND"));
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req,
  res,
  _next,
) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos inválidos",
        details: err.issues,
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "BAD_JSON", message: "JSON inválido" },
    });
    return;
  }
  const code = (err as { code?: string })?.code;
  if (code === "ER_DUP_ENTRY") {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "El registro ya existe" },
    });
    return;
  }
  if (code === "ER_NO_REFERENCED_ROW_2") {
    res.status(409).json({
      success: false,
      error: {
        code: "INVALID_REFERENCE",
        message: "La referencia no existe",
      },
    });
    return;
  }
  if ((err as { type?: string })?.type === "entity.too.large") {
    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Cuerpo demasiado grande",
      },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
};
