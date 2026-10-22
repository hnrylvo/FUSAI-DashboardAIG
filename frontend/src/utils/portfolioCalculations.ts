/**
 * Motor de cálculos de cartera y riesgo crediticio
 * -----------------------------------------------
 * Implementación desacoplada y tipada en TypeScript de todas las reglas de negocio,
 * fórmulas de morosidad (PAR1, PAR30), colocación mensual, vencimientos,
 * precobro, deserción de clientes y matriz de rodamiento de mora.
 */

import type {
  AttritionRecord,
  CompositionResponse,
  FilterPayload,
  Key,
  KpiResult,
  KV,
  LoanRecord,
  MaturityRecord,
  MatrixData,
  MtxCell,
  MtxColKey,
  MtxRowKey,
  PaymentDaysResponse,
  PlacementResponse,
  PreCollectionRecord,
  RankingBucket,
  RankingResponse,
  TrendsResult,
} from '../types/api';

export const KEYS: readonly Key[] = [
  'ref', 'cod', 'cli', 'ase', 'ges', 'dep', 'mun', 'fdes', 'mod', 'mo', 'sc', 'kmora', 'cuota',
  'dpago', 'fven', 'ucp', 'sexo', 'ufp', 'dmora', 'sest', 'tc', 'gar', 'prod', 'tel', 'ag',
] as const;

export const SALDO_ORDER = [
  '1 a 50 mil',
  '50 a 100 mil',
  '100 a 200 mil',
  '200 a 300 mil',
  '300 a 400 mil',
  '400 a 500 mil',
  '> 500 mil',
] as const;

export const MTX_ROWS = ['dia', 'b1', 'b2', 'b3', 'b4'] as const;

export interface ClientAggRecord {
  cod: string;
  sc: number;
  mo: number;
  dmora: number;
  record: LoanRecord;
}

/** Comprueba si una fecha es válida y la convierte a objeto Date a medianoche UTC/local */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

/** Calcula la diferencia en días enteros entre dos fechas */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Determina el bucket de mora para rankings y matriz */
export function getMoraBucket(dmora: number): 'dia' | 'b1' | 'b2' | 'b3' | 'b4' {
  if (dmora <= 0) return 'dia';
  if (dmora <= 30) return 'b1';
  if (dmora <= 90) return 'b2';
  if (dmora <= 120) return 'b3';
  return 'b4';
}

/** Categoriza el saldo de capital por rango contable */
export function getSaldoBucket(sc: number): string {
  if (sc <= 50000) return '1 a 50 mil';
  if (sc <= 100000) return '50 a 100 mil';
  if (sc <= 200000) return '100 a 200 mil';
  if (sc <= 300000) return '200 a 300 mil';
  if (sc <= 400000) return '300 a 400 mil';
  if (sc <= 500000) return '400 a 500 mil';
  return '> 500 mil';
}

/** Agrupa registros por código de cliente único sumando saldos y calculando mora máxima */
export function aggregateByClient(records: LoanRecord[]): ClientAggRecord[] {
  const map = new Map<string, ClientAggRecord>();
  for (const r of records) {
    const cod = r.cod || 'DESCONOCIDO';
    const sc = Number(r.sc) || 0;
    const mo = Number(r.mo) || 0;
    const dmora = Number(r.dmora) || 0;

    if (!map.has(cod)) {
      map.set(cod, { cod, sc: 0, mo: 0, dmora: 0, record: r });
    }
    const agg = map.get(cod)!;
    agg.sc += sc;
    agg.mo += mo;
    agg.dmora = Math.max(agg.dmora, dmora);
  }
  return [...map.values()];
}

/**
 * Normaliza el género del cliente para mapear de forma transparente
 * tanto formatos cortos ('M', 'F') como formatos completos ('MASCULINO', 'FEMENINO').
 */
export const normalizeGender = (rawGender: string | null | undefined): 'MASCULINO' | 'FEMENINO' | 'OTRO' => {
  if (!rawGender) return 'OTRO';
  const val = String(rawGender).trim().toUpperCase();
  if (val === 'M' || val === 'MASCULINO') return 'MASCULINO';
  if (val === 'F' || val === 'FEMENINO') return 'FEMENINO';
  return 'OTRO';
};

/** Aplica filtros globales a una colección de créditos */
export function filterRecords(records: LoanRecord[], filters: FilterPayload): LoanRecord[] {
  const { sel, atraso } = filters;

  return records.filter((r) => {
    // 1. Filtros categóricos
    if (sel.ag && sel.ag.length > 0 && !sel.ag.includes(r.ag || '(Sin dato)')) return false;
    if (sel.ase && sel.ase.length > 0 && !sel.ase.includes(r.ase || '(Sin dato)')) return false;
    if (sel.ges && sel.ges.length > 0 && !sel.ges.includes(r.ges || '(Sin dato)')) return false;
    if (sel.dep && sel.dep.length > 0 && !sel.dep.includes(r.dep || '(Sin dato)')) return false;
    if (sel.mod && sel.mod.length > 0 && !sel.mod.includes(r.mod || '(Sin dato)')) return false;
    if (sel.sexo && sel.sexo.length > 0) {
      const loanGenderNormalized = normalizeGender(r.sexo);
      const normalizedSelected = sel.sexo.map(normalizeGender);
      if (!normalizedSelected.includes(loanGenderNormalized)) {
        return false;
      }
    }

    // 2. Filtro por atraso
    if (atraso && atraso.length > 0) {
      const d = Number(r.dmora) || 0;
      const matchAtraso = atraso.some((aKey) => {
        if (aKey === 'dia') return d <= 0;
        if (aKey === 'a1') return d >= 1 && d <= 30;
        if (aKey === 'a2') return d >= 31 && d <= 60;
        if (aKey === 'a3') return d >= 61 && d <= 90;
        if (aKey === 'a4') return d >= 91 && d <= 180;
        if (aKey === 'a5') return d >= 181 && d <= 265;
        if (aKey === 'a6') return d > 265;
        return false;
      });
      if (!matchAtraso) return false;
    }

    return true;
  });
}

/** Calcula los 8 KPIs principales del cierre seleccionado */
export function computeKpis(
  currentRecords: LoanRecord[],
  previousRecords: LoanRecord[] | null,
  cierre: string,
  prevCierre: string | null,
): KpiResult {
  const cartera = currentRecords.reduce((acc, r) => acc + (Number(r.sc) || 0), 0);
  const nCli = new Set(currentRecords.map((r) => r.cod).filter(Boolean)).size;
  const par1 = currentRecords
    .filter((r) => (Number(r.dmora) || 0) >= 1)
    .reduce((acc, r) => acc + (Number(r.sc) || 0), 0);
  const par30 = currentRecords
    .filter((r) => (Number(r.dmora) || 0) >= 30)
    .reduce((acc, r) => acc + (Number(r.sc) || 0), 0);
  const cliMora = new Set(
    currentRecords
      .filter((r) => (Number(r.dmora) || 0) >= 1)
      .map((r) => r.cod)
      .filter(Boolean),
  ).size;

  const ticket = nCli > 0 ? cartera / nCli : 0;
  const alDia = currentRecords.filter((r) => (Number(r.dmora) || 0) <= 0).length;
  const critica = currentRecords.filter((r) => (Number(r.dmora) || 0) > 120);
  const cuotaTotal = currentRecords.reduce((acc, r) => acc + (Number(r.cuota) || 0), 0);
  const prevCartera = previousRecords
    ? previousRecords.reduce((acc, r) => acc + (Number(r.sc) || 0), 0)
    : null;

  return {
    cierre,
    prevCierre,
    cartera,
    prevCartera,
    nCli,
    nCreditos: currentRecords.length,
    par1,
    par30,
    cliMora,
    ticket,
    alDia,
    criticaN: critica.length,
    criticaMonto: critica.reduce((acc, r) => acc + (Number(r.sc) || 0), 0),
    cuotaTotal,
  };
}

/** Calcula tendencias temporales entre cierres mensuales */
export function computeTrends(cierresMap: Record<string, LoanRecord[]>): TrendsResult {
  const cierres = Object.keys(cierresMap).sort();
  const cartera: number[] = [];
  const ncli: number[] = [];
  const par1m: number[] = [];
  const par1c: number[] = [];
  const par30m: number[] = [];
  const par30c: number[] = [];

  for (const c of cierres) {
    const rows = cierresMap[c] || [];
    cartera.push(rows.reduce((acc, r) => acc + (Number(r.sc) || 0), 0));
    ncli.push(new Set(rows.map((r) => r.cod).filter(Boolean)).size);

    const m1 = rows.filter((r) => (Number(r.dmora) || 0) >= 1);
    const m30 = rows.filter((r) => (Number(r.dmora) || 0) >= 30);

    par1m.push(m1.reduce((acc, r) => acc + (Number(r.sc) || 0), 0));
    par1c.push(new Set(m1.map((r) => r.cod).filter(Boolean)).size);
    par30m.push(m30.reduce((acc, r) => acc + (Number(r.sc) || 0), 0));
    par30c.push(new Set(m30.map((r) => r.cod).filter(Boolean)).size);
  }

  return { cierres, cartera, ncli, par1m, par1c, par30m, par30c };
}

/** Calcula la colocación mensual acumulada por tipo de crédito */
export function computePlacement(
  cierresMap: Record<string, LoanRecord[]>,
  tipo: string,
): PlacementResponse {
  const cierres = Object.keys(cierresMap).sort();
  const monto: number[] = [];
  const num: number[] = [];

  for (const c of cierres) {
    const ym = c.slice(0, 7);
    const rows = (cierresMap[c] || []).filter((r) => {
      if (tipo !== 'ALL' && r.tc !== tipo) return false;
      const f = r.fdes;
      return f && f.slice(0, 7) === ym;
    });

    monto.push(rows.reduce((acc, r) => acc + (Number(r.mo) || 0), 0));
    num.push(rows.length);
  }

  return {
    tipo: tipo as PlacementResponse['tipo'],
    cierres,
    monto,
    num,
    totalMonto: monto.reduce((a, b) => a + b, 0),
    totalNum: num.reduce((a, b) => a + b, 0),
  };
}

/** Calcula la composición de cartera y clientes por producto y por tramo de saldo */
export function computeComposition(records: LoanRecord[]): CompositionResponse {
  const groupSum = (
    rows: LoanRecord[],
    keyFn: (r: LoanRecord) => string,
    valFn: (r: LoanRecord) => number,
  ): KV[] => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const k = keyFn(r);
      m[k] = (m[k] || 0) + valFn(r);
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const groupCliCount = (rows: LoanRecord[], keyFn: (r: LoanRecord) => string): KV[] => {
    const m: Record<string, Set<string>> = {};
    for (const r of rows) {
      const k = keyFn(r);
      const cod = r.cod || 'NONE';
      if (!m[k]) m[k] = new Set();
      m[k].add(cod);
    }
    return Object.entries(m)
      .map(([k, s]) => [k, s.size] as KV)
      .sort((a, b) => b[1] - a[1]);
  };

  const mora = records.filter((r) => (Number(r.dmora) || 0) >= 1);
  const clientAggs = aggregateByClient(records);

  const cartSaldoMap: Record<string, number> = {};
  const cliSaldoMap: Record<string, number> = {};
  for (const k of SALDO_ORDER) {
    cartSaldoMap[k] = 0;
    cliSaldoMap[k] = 0;
  }

  for (const c of clientAggs) {
    const bucket = getSaldoBucket(c.sc);
    if (cartSaldoMap[bucket] !== undefined) {
      cartSaldoMap[bucket] += c.sc;
      cliSaldoMap[bucket] += 1;
    }
  }

  return {
    prodCart: groupSum(records, (r) => r.prod || '(Sin dato)', (r) => Number(r.sc) || 0),
    prodCli: groupCliCount(records, (r) => r.prod || '(Sin dato)'),
    moraProdCart: groupSum(mora, (r) => r.prod || '(Sin dato)', (r) => Number(r.sc) || 0),
    moraProdCli: groupCliCount(mora, (r) => r.prod || '(Sin dato)'),
    saldoCart: SALDO_ORDER.map((k) => [k, cartSaldoMap[k]] as KV),
    saldoCli: SALDO_ORDER.map((k) => [k, cliSaldoMap[k]] as KV),
  };
}

/** Calcula rankings de créditos estrictos (Top 10) ordenados por saldo de capital */
export function computeRanking(
  records: LoanRecord[],
  bucket: RankingBucket,
  page = 1,
  pageSize = 10,
): RankingResponse {
  const predicate = (r: LoanRecord) => {
    const d = Number(r.dmora) || 0;
    switch (bucket) {
      case 'sana':
        return d <= 0;
      case 'b1':
        return d >= 1 && d <= 30;
      case 'b2':
        return d >= 31 && d <= 90;
      case 'b3':
        return d >= 91 && d <= 120;
      case 'b4':
        return d > 120;
      default:
        return false;
    }
  };

  const filtered = records
    .filter(predicate)
    .sort((a, b) => (Number(b.sc) || 0) - (Number(a.sc) || 0));

  const start = (page - 1) * pageSize;
  const rows = filtered
    .slice(start, start + pageSize)
    .map((r, i) => ({ ...r, rank: start + i + 1 }));

  return {
    bucket,
    total: filtered.length,
    page,
    pageSize,
    rows,
  };
}

/** Calcula distribución de cartera y clientes por día de pago (1 a 31) */
export function computePaymentDays(records: LoanRecord[], mode: 'all' | 'dia'): PaymentDaysResponse {
  let rows = records;
  if (mode === 'dia') {
    rows = rows.filter((r) => (Number(r.dmora) || 0) <= 0);
  }

  const seen = new Set<string>();
  const monto = Array(32).fill(0);
  const cnt = Array(32).fill(0);

  for (const r of rows) {
    const ref = r.ref || `${r.cod}-${r.dpago}`;
    if (seen.has(ref)) continue;
    seen.add(ref);

    const d = Number(r.dpago) || 0;
    if (d < 1 || d > 31) continue;
    monto[d] += Number(r.sc) || 0;
    cnt[d] += 1;
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return {
    mode,
    days,
    monto: days.map((d) => monto[d]),
    cnt: days.map((d) => cnt[d]),
  };
}

/** Calcula vencimientos próximos de cartera a 30 o 90 días */
export function computeMaturities(
  records: LoanRecord[],
  cierre: string,
  window: '30' | '90',
): MaturityRecord[] {
  const base = parseDate(cierre);
  if (!base) return [];

  const [lo, hi] = window === '30' ? [0, 30] : [31, 90];
  const seen = new Set<string>();

  return records
    .filter((r) => {
      if ((Number(r.dmora) || 0) > 0) return false;
      const fv = parseDate(r.fven);
      if (!fv) return false;
      const dd = daysBetween(base, fv);
      if (dd < lo || dd > hi) return false;

      const id = r.ref || `${r.cod}-${r.fven}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => {
      const da = parseDate(a.fven)?.getTime() || 0;
      const db = parseDate(b.fven)?.getTime() || 0;
      return da - db;
    })
    .map((r) => ({
      ...r,
      daysToDue: daysBetween(base, parseDate(r.fven)!),
    }));
}

/** Estima la primera cuota para créditos con última cuota pagada = 0 */
export function estimateFirstPaymentDate(r: LoanRecord): Date | null {
  const fd = parseDate(r.fdes);
  const dp = Number(r.dpago) || 0;
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

/** Calcula créditos en precobro (primera cuota dentro de los próximos 30 días) */
export function computePreCollection(records: LoanRecord[], cierre: string): PreCollectionRecord[] {
  const base = parseDate(cierre);
  if (!base) return [];

  const seen = new Set<string>();

  return records
    .filter((r) => {
      if ((Number(r.ucp) || 0) !== 0) return false;
      if ((Number(r.dmora) || 0) > 0) return false;
      const fp = estimateFirstPaymentDate(r);
      if (!fp) return false;

      const dd = daysBetween(base, fp);
      if (dd < -5 || dd > 30) return false;

      const id = r.ref || `${r.cod}-${r.dpago}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => {
      const fa = estimateFirstPaymentDate(a)?.getTime() || 0;
      const fb = estimateFirstPaymentDate(b)?.getTime() || 0;
      return fa - fb;
    })
    .map((r) => ({
      ...r,
      firstPay: estimateFirstPaymentDate(r)?.toISOString().slice(0, 10) || '',
    }));
}

/** Calcula deserciones de clientes al día entre dos cortes */
export function computeAttrition(
  cierresMap: Record<string, LoanRecord[]>,
  de: string,
  a: string,
  filterFn: (r: LoanRecord) => boolean = () => true,
): { valid: boolean; rows: AttritionRecord[] } {
  const order = Object.keys(cierresMap).sort();
  const iDe = order.indexOf(de);
  const iA = order.indexOf(a);

  if (iDe < 0 || iA < 0 || iA <= iDe) return { valid: false, rows: [] };

  const laterCierres = order.slice(iDe + 1);

  // Mapear presencia de clientes
  const presence = new Map<string, Record<string, ClientAggRecord>>();
  for (const c of order) {
    const aggs = aggregateByClient((cierresMap[c] || []).filter(filterFn));
    for (const agg of aggs) {
      if (!presence.has(agg.cod)) presence.set(agg.cod, {});
      presence.get(agg.cod)![c] = agg;
    }
  }

  const out: AttritionRecord[] = [];
  for (const [, byC] of presence) {
    if (!byC[de]) continue;
    const stillLater = laterCierres.some((cc) => byC[cc]);
    if (stillLater) continue;

    const o = byC[de];
    if (o.dmora > 0) continue; // debía estar al día en su última aparición
    if (!filterFn(o.record)) continue;

    out.push({
      ...o.record,
      moAgg: o.mo,
    });
  }

  out.sort((x, y) => y.moAgg - x.moAgg);
  return { valid: true, rows: out };
}

/** Calcula la matriz de rodamiento de morosidad entre dos cortes */
export function computeTransitionMatrix(
  cierresMap: Record<string, LoanRecord[]>,
  de: string,
  a: string,
  filterFn: (r: LoanRecord) => boolean = () => true,
): { valid: boolean; data?: MatrixData } {
  const order = Object.keys(cierresMap).sort();
  const iDe = order.indexOf(de);
  const iA = order.indexOf(a);

  if (iDe < 0 || iA < 0 || iA <= iDe) return { valid: false };

  const laterA = order.slice(iA + 1);

  // Presencia de clientes
  const presence = new Map<string, Record<string, ClientAggRecord>>();
  for (const c of order) {
    const aggs = aggregateByClient(cierresMap[c] || []);
    for (const agg of aggs) {
      if (!presence.has(agg.cod)) presence.set(agg.cod, {});
      presence.get(agg.cod)![c] = agg;
    }
  }

  const rowKeys: MtxRowKey[] = [...MTX_ROWS, 'nuevo'];
  const colKeys: MtxColKey[] = [...MTX_ROWS, 'cancel'];

  const cells = {} as Record<MtxRowKey, Record<MtxColKey, MtxCell>>;
  for (const rk of rowKeys) {
    cells[rk] = {} as Record<MtxColKey, MtxCell>;
    for (const ck of colKeys) {
      cells[rk][ck] = { n: 0, m: 0 };
    }
  }

  for (const [, byC] of presence) {
    const oD = byC[de];
    const oA = byC[a];
    if (!oD && !oA) continue;

    const inFilterD = oD && filterFn(oD.record);
    const inFilterA = oA && filterFn(oA.record);

    if (oD && oA) {
      if (!inFilterD && !inFilterA) continue;
      const rb = getMoraBucket(oD.dmora);
      const cb = getMoraBucket(oA.dmora);
      cells[rb][cb].n += 1;
      cells[rb][cb].m += oA.sc;
    } else if (oD && !oA) {
      if (!inFilterD) continue;
      const reenters = laterA.some((cc) => byC[cc]);
      const rb = getMoraBucket(oD.dmora);
      if (!reenters) {
        cells[rb].cancel.n += 1;
        cells[rb].cancel.m += oD.sc;
      }
    } else if (!oD && oA) {
      if (!inFilterA) continue;
      const cb = getMoraBucket(oA.dmora);
      cells.nuevo[cb].n += 1;
      cells.nuevo[cb].m += oA.sc;
    }
  }

  return {
    valid: true,
    data: {
      de,
      a,
      rowKeys,
      colKeys,
      cells,
    },
  };
}
