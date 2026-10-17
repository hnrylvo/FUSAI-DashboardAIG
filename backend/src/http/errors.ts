import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'ERROR',
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Valida y tipa el cuerpo de la petición con un esquema zod. */
export function parseBody<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) throw new HttpError(400, 'Solicitud inválida.', 'VALIDATION', r.error.flatten());
  return r.data;
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.path}`, 'NOT_FOUND'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Solicitud inválida.', details: err.flatten() } });
  }
  const e = err as { type?: string; status?: number; code?: string; message?: string };
  if (e?.type === 'entity.too.large' || e?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'El archivo excede el tamaño permitido.' } });
  }
  if (e?.status && e.status < 500) {
    return res.status(e.status).json({ error: { code: 'BAD_REQUEST', message: e.message ?? 'Solicitud inválida.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor.' } });
}
