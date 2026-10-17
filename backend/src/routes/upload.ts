import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireRole } from '../auth/session.js';
import { config } from '../config.js';
import { store } from '../data/store.js';
import { IngestError, parseWorkbook } from '../engine/index.js';
import { HttpError } from '../http/errors.js';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 24 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx?|xlsm)$/i.test(file.originalname)) cb(null, true);
    else cb(new HttpError(415, `Formato no soportado: ${file.originalname}. Use .xls o .xlsx.`, 'UNSUPPORTED_TYPE'));
  },
});

/** Fechas de cierre indicadas manualmente por archivo: { "archivo.xlsx": "2026-09-30" } */
const OverridesSchema = z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default({});

interface FileResult {
  file: string;
  ok: boolean;
  cierre?: string;
  rows?: number;
  replaced?: boolean;
  code?: string;
  message?: string;
}

/**
 * POST /api/upload  (multipart/form-data)
 *   files[]   : uno o varios reportes .xls/.xlsx
 *   overrides : JSON opcional con fecha de cierre por nombre de archivo
 */
uploadRouter.post('/', requireRole('admin'), upload.array('files', 24), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new HttpError(400, 'Adjunte al menos un archivo.', 'NO_FILES');
  let overrides: Record<string, string> = {};
  try {
    overrides = OverridesSchema.parse(req.body?.overrides ? JSON.parse(req.body.overrides) : {});
  } catch {
    throw new HttpError(400, 'El campo overrides no es válido.', 'VALIDATION');
  }

  const results: FileResult[] = [];
  for (const f of files) {
    // multer entrega el nombre en latin1; lo normalizamos a UTF-8 para acentos.
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    try {
      const { cierre, rows } = parseWorkbook(f.buffer, name, overrides[name]);
      const { replaced } = store.upsert(cierre, rows, { uploadedBy: req.user!.email, source: name });
      results.push({ file: name, ok: true, cierre, rows: rows.length, replaced });
    } catch (err) {
      if (err instanceof IngestError) results.push({ file: name, ok: false, code: err.code, message: err.message });
      else {
        console.error('[upload]', err);
        results.push({ file: name, ok: false, code: 'INTERNAL', message: 'No se pudo procesar el archivo.' });
      }
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  res.status(okCount ? 200 : 422).json({ results, version: store.version });
});
