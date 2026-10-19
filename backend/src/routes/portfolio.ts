import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { portfolioRepo } from '../db/repository.js';
import { store } from '../data/store.js';
import {
  ATRASO,
  ATRASO_KEYS,
  COLOC_TIPOS,
  Ctx,
  FILTER_KEYS,
  FILTERS,
  RANKING_BUCKETS,
  type RankingBucket,
  buildFilterOptions,
  computeAttrition,
  computeComposition,
  computeKpis,
  computeMaturities,
  computePaymentDays,
  computePlacement,
  computePreCollection,
  computeRanking,
  computeTransitionMatrix,
  computeTrends,
  toFilterState,
} from '../engine/index.js';
import { HttpError, parseBody } from '../http/errors.js';

export const portfolioRouter = Router();

/* ------------------------------ Esquemas ------------------------------ */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato YYYY-MM-DD');
const strList = z.array(z.string().max(300)).max(1000);

const FiltersSchema = z
  .object({
    sel: z.object(Object.fromEntries(FILTER_KEYS.map((k) => [k, strList.optional()]))).partial().default({}),
    atraso: z.array(z.enum(ATRASO_KEYS as [string, ...string[]])).default([]),
  })
  .default({});

const WithFilters = z.object({ filters: FiltersSchema });
const WithCierre = WithFilters.extend({ cierre: isoDate });
const WithRange = WithFilters.extend({ de: isoDate, a: isoDate });

function ctxFor(req: Request, body: { filters: z.infer<typeof FiltersSchema>; cierre?: string }) {
  if (body.cierre && !store.has(body.cierre)) throw new HttpError(404, `El cierre ${body.cierre} no existe.`, 'CIERRE_NOT_FOUND');
  void req;
  return new Ctx(store.get(), toFilterState(body.filters));
}

/* ------------------------------ Metadatos ----------------------------- */
portfolioRouter.get('/meta', (_req, res) => {
  const ds = store.get();
  const options = buildFilterOptions(ds);
  res.json({
    generated: ds.generated,
    version: store.version,
    updatedAt: store.updatedAt,
    cierres: store.sources(),
    filters: FILTERS.map(([key, label]) => ({ key, label, options: options[key] })),
    atraso: ATRASO.map(([key, label]) => ({ key, label })),
  });
});

/* ------------------------- Resumen & Tendencias ----------------------- */
portfolioRouter.post('/overview', (req, res) => {
  const body = parseBody(WithCierre, req);
  const ctx = ctxFor(req, body);
  res.json({ kpis: computeKpis(ctx, body.cierre), trends: computeTrends(ctx) });
});

portfolioRouter.post('/placement', (req, res) => {
  const body = parseBody(WithFilters.extend({ tipo: z.enum(COLOC_TIPOS).default('ALL') }), req);
  res.json(computePlacement(ctxFor(req, body), body.tipo));
});

/* ----------------------------- Composición ---------------------------- */
portfolioRouter.post('/composition', (req, res) => {
  const body = parseBody(WithCierre, req);
  res.json(computeComposition(ctxFor(req, body), body.cierre));
});

/* ------------------------------ Rankings ------------------------------ */
portfolioRouter.post('/rankings/:bucket', (req, res) => {
  const bucket = req.params.bucket as RankingBucket;
  if (!Object.hasOwn(RANKING_BUCKETS, bucket)) throw new HttpError(404, 'Tramo de ranking inválido.', 'NOT_FOUND');
  const body = parseBody(
    WithCierre.extend({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(5).max(100).default(10),
    }),
    req,
  );
  res.json(computeRanking(ctxFor(req, body), body.cierre, bucket, body.page, body.pageSize));
});

/* -------------------------- Operación & Cobro ------------------------- */
portfolioRouter.post('/operations/payment-days', (req, res) => {
  const body = parseBody(WithCierre.extend({ mode: z.enum(['all', 'dia']).default('all') }), req);
  res.json(computePaymentDays(ctxFor(req, body), body.cierre, body.mode));
});

portfolioRouter.post('/operations/maturities', (req, res) => {
  const body = parseBody(WithCierre.extend({ window: z.enum(['30', '90']).default('30') }), req);
  res.json(computeMaturities(ctxFor(req, body), body.cierre, body.window));
});

portfolioRouter.post('/operations/pre-collection', (req, res) => {
  const body = parseBody(WithCierre, req);
  res.json(computePreCollection(ctxFor(req, body), body.cierre));
});

/* -------------------------- Retención & Riesgo ------------------------ */
portfolioRouter.post('/retention/attrition', (req, res) => {
  const body = parseBody(WithRange, req);
  res.json(computeAttrition(ctxFor(req, body), body.de, body.a));
});

portfolioRouter.post('/retention/transition', (req, res) => {
  const body = parseBody(WithRange, req);
  res.json(computeTransitionMatrix(ctxFor(req, body), body.de, body.a));
});

/* ---------------------- Base de Datos Directa (On-Premise) ------------ */
// Estado de la conexión a SQL Server y salud del pool
portfolioRouter.get('/db/status', async (_req, res) => {
  const health = db.health();
  res.json({
    ok: health.connected,
    health,
    readOnly: true,
    policy: 'STRICT_READ_ONLY_SELECT_ENFORCED',
    timestamp: new Date().toISOString(),
  });
});

// Sincronización dinámica bajo demanda desde SQL Server
const syncHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await store.refreshFromDb();
    const ds = store.get();
    res.json({
      ok: true,
      message: 'Cartera actualizada exitosamente desde SQL Server',
      cierre: result.cierre,
      rows: result.rows,
      version: store.version,
      updatedAt: store.updatedAt,
      generated: ds.generated,
      cierres: store.sources(),
    });
  } catch (err) {
    next(new HttpError(500, 'Error al sincronizar con el servidor de base de datos.', 'DB_SYNC_ERROR', (err as Error).message));
  }
};

portfolioRouter.post('/sync', syncHandler);
portfolioRouter.get('/sync', syncHandler);
portfolioRouter.post('/refresh', syncHandler);
portfolioRouter.get('/refresh', syncHandler);
portfolioRouter.post('/db/refresh', syncHandler);

// Catálogo de clientes desde la base de datos (paginado y parametrizado)
portfolioRouter.get('/db/clients', async (req, res, next) => {
  try {
    const page = req.query.page ? Number.parseInt(String(req.query.page), 10) : 1;
    const pageSize = req.query.pageSize ? Number.parseInt(String(req.query.pageSize), 10) : 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const data = await portfolioRepo.getClients({ page, pageSize, search });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Agencias / Sucursales con saldos de cartera
portfolioRouter.get('/db/branches', async (_req, res, next) => {
  try {
    const branches = await portfolioRepo.getBranches();
    res.json({ branches });
  } catch (err) {
    next(err);
  }
});

// Asesores de crédito y gestores de cobro
portfolioRouter.get('/db/officers', async (_req, res, next) => {
  try {
    const officers = await portfolioRepo.getLoanOfficers();
    res.json({ officers });
  } catch (err) {
    next(err);
  }
});

// Historial de cierres / snapshots detectados
portfolioRouter.get('/db/snapshots', async (_req, res, next) => {
  try {
    const snapshots = await portfolioRepo.getSnapshotsLog();
    res.json({ snapshots });
  } catch (err) {
    next(err);
  }
});

