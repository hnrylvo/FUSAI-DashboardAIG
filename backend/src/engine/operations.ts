import { type LoanRecord, type Row, daysBetween, g, parseD, toRecord } from './core.js';
import type { Ctx } from './filters.js';

/* =================== RANKINGS (8-12) =================== */
export const RANKING_BUCKETS = {
  sana: (r: Row) => g(r, 'dmora') <= 0,
  b1: (r: Row) => {
    const d = g(r, 'dmora');
    return d >= 1 && d <= 30;
  },
  b2: (r: Row) => {
    const d = g(r, 'dmora');
    return d >= 31 && d <= 90;
  },
  b3: (r: Row) => {
    const d = g(r, 'dmora');
    return d >= 91 && d <= 120;
  },
  b4: (r: Row) => g(r, 'dmora') > 120,
} as const;
export type RankingBucket = keyof typeof RANKING_BUCKETS;

export interface RankingResult {
  bucket: RankingBucket;
  total: number;
  page: number;
  pageSize: number;
  rows: (LoanRecord & { rank: number })[];
}

/**
 * TOP de créditos por saldo de capital. Con page=1 y pageSize=10 equivale
 * exactamente al TOP 10 del original; las páginas siguientes extienden el ranking.
 */
export function computeRanking(ctx: Ctx, cierre: string, bucket: RankingBucket, page = 1, pageSize = 10): RankingResult {
  const sorted = ctx
    .rowsF(cierre)
    .filter(RANKING_BUCKETS[bucket])
    .sort((a, b) => +g(b, 'sc') - +g(a, 'sc'));
  const start = (page - 1) * pageSize;
  return {
    bucket,
    total: sorted.length,
    page,
    pageSize,
    rows: sorted.slice(start, start + pageSize).map((r, i) => ({ ...toRecord(r), rank: start + i + 1 })),
  };
}

/* =================== OPERACIÓN (13,14,15) =================== */
export interface PaymentDayResult {
  mode: 'all' | 'dia';
  days: number[];
  monto: number[];
  cnt: number[];
}

export function computePaymentDays(ctx: Ctx, cierre: string, mode: 'all' | 'dia'): PaymentDayResult {
  let rows = ctx.rowsF(cierre);
  if (mode === 'dia') rows = rows.filter((r) => g(r, 'dmora') <= 0);
  const monto: number[] = Array(32).fill(0);
  const cnt: number[] = Array(32).fill(0);
  for (const r of rows) {
    const d = +g(r, 'dpago') || 0;
    if (d < 1 || d > 31) continue;
    monto[d] += +g(r, 'sc') || 0;
    cnt[d]++;
  }
  const days = [...Array(31)].map((_, i) => i + 1);
  return { mode, days, monto: days.map((d) => monto[d]), cnt: days.map((d) => cnt[d]) };
}

export interface MaturityResult {
  window: '30' | '90';
  rows: (LoanRecord & { daysToDue: number })[];
}

export function computeMaturities(ctx: Ctx, cierre: string, window: '30' | '90'): MaturityResult {
  const base = parseD(cierre)!;
  const [lo, hi] = window === '30' ? [0, 30] : [31, 90];
  const rows = ctx
    .rowsF(cierre)
    .filter((r) => {
      if (g(r, 'dmora') > 0) return false;
      const fv = parseD(g(r, 'fven'));
      if (!fv) return false;
      const dd = daysBetween(base, fv);
      return dd >= lo && dd <= hi;
    })
    .sort((a, b) => parseD(g(a, 'fven'))!.getTime() - parseD(g(b, 'fven'))!.getTime());
  return {
    window,
    rows: rows.map((r) => ({ ...toRecord(r), daysToDue: daysBetween(base, parseD(g(r, 'fven'))!) })),
  };
}

/** Primer vencimiento estimado: primer día de pago > fecha desembolso + 15 días. */
export function estFirstPay(r: Row): Date | null {
  const fd = parseD(g(r, 'fdes'));
  const dp = +g(r, 'dpago') || 0;
  if (!fd || dp < 1) return null;
  const y = fd.getFullYear();
  let m = fd.getMonth();
  let cand = new Date(y, m, Math.min(dp, 28));
  const minD = new Date(fd.getTime() + 15 * 86400000);
  while (cand < minD) {
    m++;
    cand = new Date(y, m, Math.min(dp, 28));
  }
  return cand;
}

export interface PreCollectionResult {
  rows: (LoanRecord & { firstPay: string })[];
}

export function computePreCollection(ctx: Ctx, cierre: string): PreCollectionResult {
  const base = parseD(cierre)!;
  const rows = ctx
    .rowsF(cierre)
    .filter((r) => {
      if ((+g(r, 'ucp') || 0) !== 0) return false;
      if (g(r, 'dmora') > 0) return false;
      const fp = estFirstPay(r);
      if (!fp) return false;
      const dd = daysBetween(base, fp);
      return dd >= -5 && dd <= 30;
    })
    .sort((a, b) => estFirstPay(a)!.getTime() - estFirstPay(b)!.getTime());
  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
  return { rows: rows.map((r) => ({ ...toRecord(r), firstPay: fmtDate(estFirstPay(r)) })) };
}
