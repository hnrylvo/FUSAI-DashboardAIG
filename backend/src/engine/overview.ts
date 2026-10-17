import { g, sumSc, uniqueClients } from './core.js';
import type { Ctx } from './filters.js';

/* =================== KPIs =================== */
export interface KpiResult {
  cierre: string;
  prevCierre: string | null;
  cartera: number;
  prevCartera: number | null;
  nCli: number;
  nCreditos: number;
  par1: number;
  par30: number;
  cliMora: number;
  ticket: number;
  alDia: number;
  criticaN: number;
  criticaMonto: number;
  cuotaTotal: number;
}

export function computeKpis(ctx: Ctx, cierre: string): KpiResult {
  const order = ctx.order;
  const idx = order.indexOf(cierre);
  const prev = idx > 0 ? order[idx - 1] : null;
  const cur = ctx.rowsF(cierre);
  const cartera = sumSc(cur);
  const nCli = uniqueClients(cur);
  const par1 = sumSc(cur.filter((r) => g(r, 'dmora') >= 1));
  const par30 = sumSc(cur.filter((r) => g(r, 'dmora') >= 30));
  const cliMora = uniqueClients(cur.filter((r) => g(r, 'dmora') >= 1));
  const ticket = nCli ? cartera / nCli : 0;
  const critica = cur.filter((r) => g(r, 'dmora') > 120);
  return {
    cierre,
    prevCierre: prev,
    cartera,
    prevCartera: prev ? sumSc(ctx.rowsF(prev)) : null,
    nCli,
    nCreditos: cur.length,
    par1,
    par30,
    cliMora,
    ticket,
    alDia: cur.filter((r) => g(r, 'dmora') <= 0).length,
    criticaN: critica.length,
    criticaMonto: sumSc(critica),
    cuotaTotal: cur.reduce((a, r) => a + (+g(r, 'cuota') || 0), 0),
  };
}

/* =================== TENDENCIAS (1,2,3) =================== */
export interface TrendsResult {
  cierres: string[];
  cartera: number[];
  ncli: number[];
  par1m: number[];
  par1c: number[];
  par30m: number[];
  par30c: number[];
}

export function computeTrends(ctx: Ctx): TrendsResult {
  const out: TrendsResult = { cierres: ctx.order, cartera: [], ncli: [], par1m: [], par1c: [], par30m: [], par30c: [] };
  for (const c of ctx.order) {
    const rs = ctx.rowsF(c);
    out.cartera.push(sumSc(rs));
    out.ncli.push(uniqueClients(rs));
    const m1 = rs.filter((r) => g(r, 'dmora') >= 1);
    const m30 = rs.filter((r) => g(r, 'dmora') >= 30);
    out.par1m.push(sumSc(m1));
    out.par1c.push(uniqueClients(m1));
    out.par30m.push(sumSc(m30));
    out.par30c.push(uniqueClients(m30));
  }
  return out;
}

/* =================== COLOCACIÓN (4) =================== */
export const COLOC_TIPOS = ['ALL', 'CREDITO NUEVO', 'RECURRENTE CON SALDO', 'RECURRENTE SIN SALDO', 'REESTRUCTURA'] as const;
export type ColocTipo = (typeof COLOC_TIPOS)[number];

export interface PlacementResult {
  tipo: ColocTipo;
  cierres: string[];
  monto: number[];
  num: number[];
  totalMonto: number;
  totalNum: number;
}

/**
 * Colocación REAL del mes: en cada cierre se cuentan los créditos desembolsados
 * DENTRO de ese mismo mes. Así se evita el sesgo de cancelaciones de meses
 * anteriores (cada mes se lee de su propio cierre).
 */
export function computePlacement(ctx: Ctx, tipo: ColocTipo): PlacementResult {
  const monto: number[] = [];
  const num: number[] = [];
  for (const c of ctx.order) {
    const ym = c.slice(0, 7); // año-mes del cierre
    const rs = ctx
      .rowsF(c)
      .filter((r) => (tipo === 'ALL' ? true : g(r, 'tc') === tipo))
      .filter((r) => {
        const f = g(r, 'fdes');
        return f && f.slice(0, 7) === ym;
      });
    monto.push(rs.reduce((a, r) => a + (+g(r, 'mo') || 0), 0));
    num.push(rs.length);
  }
  return {
    tipo,
    cierres: ctx.order,
    monto,
    num,
    totalMonto: monto.reduce((a, b) => a + b, 0),
    totalNum: num.reduce((a, b) => a + b, 0),
  };
}
