import { type LoanRecord, type MoraBucket, moraBucket, toRecord } from './core.js';
import type { Ctx } from './filters.js';

/* =================== RETENCIÓN (16,17) =================== */

export type RangeResult<T> = { valid: false } | ({ valid: true } & T);

export interface AttritionRow extends LoanRecord {
  /** Capital otorgado agregado del cliente en el cierre inicial. */
  moAgg: number;
}

/**
 * Deserción: clientes presentes en el cierre inicial, ausentes en el final y
 * en todos los cierres posteriores, que estaban al día en su última aparición.
 */
export function computeAttrition(ctx: Ctx, de: string, a: string): RangeResult<{ rows: AttritionRow[] }> {
  const order = ctx.order;
  const iDe = order.indexOf(de);
  const iA = order.indexOf(a);
  if (iDe < 0 || iA < 0 || iA <= iDe) return { valid: false };
  const laterCierres = order.slice(iDe + 1); // debe estar ausente en todos estos
  const pres = ctx.clientPresence();
  const out = [];
  for (const [, byC] of pres) {
    if (!byC[de]) continue; // presente en inicio
    const stillLater = laterCierres.some((cc) => byC[cc]);
    if (stillLater) continue; // reingresó o sigue → no deserción
    const o = byC[de];
    if (o.dmora > 0) continue; // debía estar al día en su última aparición
    if (!ctx.match(o.r)) continue;
    out.push(o);
  }
  out.sort((x, y) => y.mo - x.mo);
  return { valid: true, rows: out.map((o) => ({ ...toRecord(o.r), moAgg: o.mo })) };
}

export const MTX_ROWS: MoraBucket[] = ['dia', 'b1', 'b2', 'b3', 'b4'];
export type MtxRowKey = MoraBucket | 'nuevo';
export type MtxColKey = MoraBucket | 'cancel';
export interface MtxCell {
  n: number;
  m: number;
}

export interface MatrixResult {
  de: string;
  a: string;
  rowKeys: MtxRowKey[];
  colKeys: MtxColKey[];
  cells: Record<MtxRowKey, Record<MtxColKey, MtxCell>>;
}

/**
 * Matriz de rodamiento entre dos cierres. Identidad por código de cliente; una
 * renovación no es cancelación. "Cancelado" solo si no reaparece en ningún
 * cierre posterior al final.
 */
export function computeTransitionMatrix(ctx: Ctx, de: string, a: string): RangeResult<MatrixResult> {
  const order = ctx.order;
  const iDe = order.indexOf(de);
  const iA = order.indexOf(a);
  if (iDe < 0 || iA < 0 || iA <= iDe) return { valid: false };
  const laterA = order.slice(iA + 1);
  const pres = ctx.clientPresence();
  const rowKeys: MtxRowKey[] = [...MTX_ROWS, 'nuevo'];
  const colKeys: MtxColKey[] = [...MTX_ROWS, 'cancel'];
  const M = {} as Record<MtxRowKey, Record<MtxColKey, MtxCell>>;
  rowKeys.forEach((r) => {
    M[r] = {} as Record<MtxColKey, MtxCell>;
    colKeys.forEach((c) => (M[r][c] = { n: 0, m: 0 }));
  });
  for (const [, byC] of pres) {
    const oD = byC[de];
    const oA = byC[a];
    if (!oD && !oA) continue;
    const inFilterD = oD && ctx.match(oD.r);
    const inFilterA = oA && ctx.match(oA.r);
    if (oD && oA) {
      if (!inFilterD && !inFilterA) continue;
      const rb = moraBucket(oD.dmora);
      const cb = moraBucket(oA.dmora);
      M[rb][cb].n++;
      M[rb][cb].m += oA.sc;
    } else if (oD && !oA) {
      if (!inFilterD) continue;
      const reenters = laterA.some((cc) => byC[cc]);
      const rb = moraBucket(oD.dmora);
      if (!reenters) {
        M[rb].cancel.n++;
        M[rb].cancel.m += oD.sc;
      }
      // si reingresa: no es cancelación, se ignora del conteo de cancelados
    } else if (!oD && oA) {
      if (!inFilterA) continue;
      const cb = moraBucket(oA.dmora);
      M.nuevo[cb].n++;
      M.nuevo[cb].m += oA.sc;
    }
  }
  return { valid: true, de, a, rowKeys, colKeys, cells: M };
}
