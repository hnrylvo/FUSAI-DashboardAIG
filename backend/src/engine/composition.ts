import { NUL, type Row, clientAgg, g } from './core.js';
import type { Ctx } from './filters.js';

/* =================== COMPOSICIÓN (5,6,7) =================== */
export type KV = [label: string, value: number];

function groupSum(rows: Row[], keyFn: (r: Row) => string, valFn: (r: Row) => number) {
  const m: Record<string, number> = {};
  for (const r of rows) {
    const k = keyFn(r);
    m[k] = (m[k] || 0) + valFn(r);
  }
  return m;
}
function groupCliCount(rows: Row[], keyFn: (r: Row) => string) {
  const m: Record<string, Set<unknown>> = {};
  for (const r of rows) {
    const k = keyFn(r);
    (m[k] = m[k] || new Set()).add(g(r, 'cod'));
  }
  const o: Record<string, number> = {};
  for (const k in m) o[k] = m[k].size;
  return o;
}
const sortedKV = (obj: Record<string, number>): KV[] => Object.entries(obj).sort((a, b) => b[1] - a[1]);

export function saldoBucket(sc: number): string {
  if (sc <= 50000) return '1 a 50 mil';
  if (sc <= 100000) return '50 a 100 mil';
  if (sc <= 200000) return '100 a 200 mil';
  if (sc <= 300000) return '200 a 300 mil';
  if (sc <= 400000) return '300 a 400 mil';
  if (sc <= 500000) return '400 a 500 mil';
  return '> 500 mil';
}
export const SALDO_ORDER = ['1 a 50 mil', '50 a 100 mil', '100 a 200 mil', '200 a 300 mil', '300 a 400 mil', '400 a 500 mil', '> 500 mil'];

export interface CompositionResult {
  prodCart: KV[];
  prodCli: KV[];
  moraProdCart: KV[];
  moraProdCli: KV[];
  saldoCart: KV[];
  saldoCli: KV[];
}

export function computeComposition(ctx: Ctx, cierre: string): CompositionResult {
  const rows = ctx.rowsF(cierre);
  const prod = (r: Row) => g(r, 'prod') || NUL;
  const sc = (r: Row) => +g(r, 'sc') || 0;
  // 6 mora por producto (dmora>=1)
  const mora = rows.filter((r) => g(r, 'dmora') >= 1);
  // 7 saldo (nivel cliente: saldo sumado por cod)
  const cartB: Record<string, number> = {};
  const cliB: Record<string, number> = {};
  SALDO_ORDER.forEach((k) => {
    cartB[k] = 0;
    cliB[k] = 0;
  });
  for (const o of clientAgg(rows)) {
    const b = saldoBucket(o.sc);
    cartB[b] += o.sc;
    cliB[b] += 1;
  }
  return {
    prodCart: sortedKV(groupSum(rows, prod, sc)),
    prodCli: sortedKV(groupCliCount(rows, prod)),
    moraProdCart: sortedKV(groupSum(mora, prod, sc)),
    moraProdCli: sortedKV(groupCliCount(mora, prod)),
    saldoCart: SALDO_ORDER.map((k) => [k, cartB[k]] as KV),
    saldoCli: SALDO_ORDER.map((k) => [k, cliB[k]] as KV),
  };
}
