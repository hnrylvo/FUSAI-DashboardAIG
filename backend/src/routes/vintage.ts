import { Router, type Request, type Response } from 'express';
import { vintageRepo } from '../db/vintageRepository.js';

export const vintageRouter = Router();

/**
 * Retorna el dataset completo de Cosechas (Vintage y Matrices de Transición).
 * Cumple con el contrato exacto esperado por el motor de cálculo en el frontend.
 */
vintageRouter.get('/data', async (_req: Request, res: Response) => {
  try {
    const result = await vintageRepo.getStore();
    res.json(result);
  } catch (error) {
    console.error('[vintage] Error al obtener datos:', error);
    res.status(500).json({ error: { code: 'VINTAGE_DATA_ERROR', message: (error as Error).message } });
  }
});

/**
 * Metadatos rápidos de las cosechas disponibles.
 */
vintageRouter.get('/meta', async (_req: Request, res: Response) => {
  try {
    const { store, source, updatedAt } = await vintageRepo.getStore();
    const cierres = Object.keys(store.snaps).sort();
    res.json({
      v: store.v,
      cierres,
      totalLoans: store.loans.length,
      dimsCount: {
        asesores: store.dims.asesor.length,
        agencias: store.dims.agencia.length,
        productos: store.dims.producto.length,
        departamentos: store.dims.depto.length,
      },
      source,
      updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'VINTAGE_META_ERROR', message: (error as Error).message } });
  }
});

/**
 * Fuerza una sincronización de solo lectura desde SQL Server.
 */
vintageRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const syncRes = await vintageRepo.syncFromDb();
    res.json({ ok: true, ...syncRes });
  } catch (error) {
    console.error('[vintage] Error en sincronización:', error);
    res.status(500).json({ error: { code: 'SYNC_ERROR', message: (error as Error).message } });
  }
});
