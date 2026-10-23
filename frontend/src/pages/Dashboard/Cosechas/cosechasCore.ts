import type { VintageDims, VintageStoreData } from '../../../types/api';

export interface ParDef {
  key: 'PAR1' | 'PAR30';
  label: string;
  min: number;
  desc: string;
}

export const PAR_DEFS: ParDef[] = [
  { key: 'PAR1', label: 'PAR 1', min: 1, desc: 'créditos con mora ≥ 1 día' },
  { key: 'PAR30', label: 'PAR 30', min: 31, desc: 'créditos con mora > 30 días' },
];

export const LOAN_DIMS: { key: keyof VintageDims; col: string; label: string }[] = [
  { key: 'agencia', col: 'Agencia', label: 'Agencia' },
  { key: 'garantia', col: 'Garantía', label: 'Garantía' },
  { key: 'sexo', col: 'Sexo', label: 'Sexo' },
  { key: 'producto', col: 'Producto', label: 'Producto' },
  { key: 'destino', col: 'Destino', label: 'Destino' },
  { key: 'tipo', col: 'Tipo de Credito', label: 'Tipo de crédito' },
  { key: 'depto', col: 'Departamento', label: 'Departamento' },
];

export const FILTERS_META = [
  { key: 'agencia', label: 'Agencia' },
  { key: 'asesor', label: 'Asesor' },
  { key: 'garantia', label: 'Garantía' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'producto', label: 'Producto' },
  { key: 'destino', label: 'Destino' },
  { key: 'tipo', label: 'Tipo de crédito' },
  { key: 'depto', label: 'Departamento' },
];

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const NO_DATO = '(SIN DATO)';

export function normVal(v: unknown, key?: string): string {
  let s = String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!s || /^\[?NO (DEFINID|INDICAD)[OA]\]?$/.test(s)) s = NO_DATO;
  if (key === 'asesor') s = s.replace(/^GESTOR DE COBROS\b/, 'GESTOR DE COBRO');
  return s;
}

export const isCollector = (n: string): boolean => /COBRO/.test(n);
export const mIndex = (iso: string): number => +iso.slice(0, 4) * 12 + (+iso.slice(5, 7) - 1);
export const monthLabel = (mi: number): string => MESES[mi % 12] + '-' + String(Math.floor(mi / 12)).slice(2);
export const serialToISO = (s: number): string => new Date(Math.round((s - 25569) * 86400000)).toISOString().slice(0, 10);
export function cierreLabel(iso: string): string {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
}

export interface LoanObs {
  ci: number;
  saldo: number;
  dias: number;
  as: number;
  mx?: number;
}

export interface PreparedLoan {
  id: number;
  ref: string;
  cod: string;
  name: string;
  fdes: string;
  monto: number;
  plazo: number;
  cm: number;
  d: {
    agencia: number;
    garantia: number;
    sexo: number;
    producto: number;
    destino: number;
    tipo: number;
    depto: number;
  };
  obs: LoanObs[];
  asAct: number;
  asOrig: number;
  last: number;
  at: Map<number, LoanObs>;
}

export interface PreparedModel {
  store: VintageStoreData;
  cierres: string[];
  cm: number[];
  byMonth: Map<number, number>;
  loans: PreparedLoan[];
}

export interface VintageParams {
  filters: Record<string, Set<number>>;
  asesorMode: 'orig' | 'act';
  from: number | null;
  grouping: 'M' | 'Q' | 'S' | 'A';
  axis: 'mob' | 'cal';
  measure: 'point' | 'ever';
}

export function prepare(store: VintageStoreData): PreparedModel {
  const cierres = Object.keys(store.snaps).sort();
  const cm = cierres.map(mIndex);
  const byMonth = new Map<number, number>();
  cm.forEach((m, i) => byMonth.set(m, i));

  const L: {
    id: number;
    ref: string;
    cod: string;
    name: string;
    fdes: string;
    monto: number;
    plazo: number;
    cm: number;
    d: {
      agencia: number;
      garantia: number;
      sexo: number;
      producto: number;
      destino: number;
      tipo: number;
      depto: number;
    };
    obs: LoanObs[];
  }[] = store.loans.map((a, i) => ({
    id: i,
    ref: a[0],
    cod: a[1],
    name: a[2],
    fdes: a[3],
    monto: a[4],
    plazo: a[5],
    cm: mIndex(a[3]),
    d: {
      agencia: a[6],
      garantia: a[7],
      sexo: a[8],
      producto: a[9],
      destino: a[10],
      tipo: a[11],
      depto: a[12],
    },
    obs: [],
  }));

  cierres.forEach((c, ci) => {
    const list = store.snaps[c] || [];
    for (const o of list) {
      if (L[o[0]]) {
        L[o[0]].obs.push({ ci, saldo: o[1], dias: o[2], as: o[3] });
      }
    }
  });

  const loans: PreparedLoan[] = [];
  for (const l of L) {
    if (!l.obs.length) continue;
    let mx = 0;
    for (const o of l.obs) {
      if (o.dias > mx) mx = o.dias;
      o.mx = mx;
    }
    const asAct = l.obs[l.obs.length - 1].as;
    const first = l.obs.find((o) => !isCollector(store.dims.asesor[o.as] || ''));
    const asOrig = (first || l.obs[0]).as;
    const last = l.obs[l.obs.length - 1].ci;
    const at = new Map<number, LoanObs>(l.obs.map((o) => [o.ci, o]));
    loans.push({
      ...l,
      asAct,
      asOrig,
      last,
      at,
    });
  }

  return { store, cierres, cm, byMonth, loans };
}

export function passes(_M: PreparedModel, P: VintageParams, l: PreparedLoan): boolean {
  const f = P.filters || {};
  for (const k in l.d) {
    const s = f[k];
    if (s && s.size && !s.has(l.d[k as keyof typeof l.d])) return false;
  }
  const sa = f.asesor;
  if (sa && sa.size && !sa.has(P.asesorMode === 'act' ? l.asAct : l.asOrig)) return false;
  return true;
}

export function groupOf(l: PreparedLoan, P: VintageParams): number {
  if (P.from != null && l.cm < P.from) return -1;
  const y = Math.floor(l.cm / 12);
  const m = l.cm % 12;
  switch (P.grouping) {
    case 'Q':
      return y * 4 + Math.floor(m / 3);
    case 'S':
      return y * 2 + Math.floor(m / 6);
    case 'A':
      return y;
    default:
      return l.cm;
  }
}

export function groupLabel(g: number, P: VintageParams): string {
  if (g === -1) return 'Anteriores a ' + (P.from != null ? monthLabel(P.from) : '');
  const yy = (n: number) => String(n).slice(2);
  switch (P.grouping) {
    case 'Q':
      return 'T' + ((g % 4) + 1) + '-' + yy(Math.floor(g / 4));
    case 'S':
      return 'S' + ((g % 2) + 1) + '-' + yy(Math.floor(g / 2));
    case 'A':
      return String(g);
    default:
      return monthLabel(g);
  }
}

export const colKeyOf = (M: PreparedModel, P: VintageParams, l: PreparedLoan, o: LoanObs): number =>
  P.axis === 'cal' ? o.ci : M.cm[o.ci] - l.cm + 1;

export interface VintageCellAggregate {
  n: number;
  np: number;
  s: number;
  sp: number;
}

export interface VintageGroupItem {
  key: number;
  label: string;
  n: number;
  monto: number;
}

export interface VintageColItem {
  key: number;
  label: string;
}

export interface VintageComputeResult {
  groups: VintageGroupItem[];
  cols: VintageColItem[];
  cells: Record<string, Map<number, Map<number, VintageCellAggregate>>>;
  total: Record<string, Map<number, VintageCellAggregate>>;
}

export function compute(M: PreparedModel, P: VintageParams): VintageComputeResult {
  const cells: Record<string, Map<number, Map<number, VintageCellAggregate>>> = {};
  const total: Record<string, Map<number, VintageCellAggregate>> = {};
  const groups = new Map<number, VintageGroupItem>();
  const colsSet = new Set<number>();

  PAR_DEFS.forEach((d) => {
    cells[d.key] = new Map();
    total[d.key] = new Map();
  });

  for (const l of M.loans) {
    if (!passes(M, P, l)) continue;
    const g = groupOf(l, P);
    let gi = groups.get(g);
    if (!gi) {
      gi = { key: g, label: groupLabel(g, P), n: 0, monto: 0 };
      groups.set(g, gi);
    }
    gi.n++;
    gi.monto += l.monto;

    for (const o of l.obs) {
      const c = colKeyOf(M, P, l, o);
      if (c < 1 && P.axis === 'mob') continue;
      colsSet.add(c);

      for (const d of PAR_DEFS) {
        const flag = (P.measure === 'ever' ? (o.mx ?? o.dias) : o.dias) >= d.min;
        let rowMap = cells[d.key].get(g);
        if (!rowMap) {
          rowMap = new Map();
          cells[d.key].set(g, rowMap);
        }
        for (const tgt of [rowMap, total[d.key]]) {
          let x = tgt.get(c);
          if (!x) {
            x = { n: 0, np: 0, s: 0, sp: 0 };
            tgt.set(c, x);
          }
          x.n++;
          x.s += o.saldo;
          if (flag) {
            x.np++;
            x.sp += o.saldo;
          }
        }
      }
    }
  }

  const gl = [...groups.values()].sort((a, b) => a.key - b.key);
  const cols = [...colsSet]
    .sort((a, b) => a - b)
    .map((k) => ({
      key: k,
      label: P.axis === 'cal' ? monthLabel(M.cm[k]) : 'M' + k,
    }));

  return { groups: gl, cols, cells, total };
}

export interface DetailRow {
  l: PreparedLoan;
  at: LoanObs | null;
  mx: number;
  firstMob: number | null;
  lo: LoanObs;
  vigente: boolean;
  cutCi: number;
}

export function detail(
  M: PreparedModel,
  P: VintageParams,
  sel: { g: number | null; col: number | null },
  min: number,
  mode: number,
): DetailRow[] {
  const last = M.cierres.length - 1;
  const out: DetailRow[] = [];
  for (const l of M.loans) {
    if (!passes(M, P, l)) continue;
    if (sel.g !== null && groupOf(l, P) !== sel.g) continue;
    let cut: number;
    if (sel.col === null) cut = last;
    else if (P.axis === 'mob') {
      const targetMonth = l.cm + sel.col - 1;
      const foundCut = M.byMonth.get(targetMonth);
      if (foundCut === undefined) continue;
      cut = foundCut;
    } else {
      cut = sel.col;
    }

    let mx = -1;
    let at: LoanObs | null = null;
    let firstMob: number | null = null;
    let any = false;

    for (const o of l.obs) {
      if (o.ci > cut) break;
      any = true;
      if (o.dias > mx) mx = o.dias;
      if (firstMob === null && o.dias >= min) firstMob = M.cm[o.ci] - l.cm + 1;
      if (o.ci === cut) at = o;
    }
    if (!any) continue;
    const ok = mode === 1 ? at && at.dias >= min : mode === 2 ? at && mx >= min : mx >= min;
    if (!ok) continue;
    const lo = l.obs[l.obs.length - 1];
    out.push({ l, at, mx, firstMob, lo, vigente: lo.ci === last, cutCi: cut });
  }
  return out;
}

export interface VintageKpisResult {
  n: number;
  s: number;
  p: Record<'PAR1' | 'PAR30', { n: number; s: number }>;
}

export function kpis(M: PreparedModel, P: VintageParams): VintageKpisResult {
  const last = M.cierres.length - 1;
  const r: VintageKpisResult = { n: 0, s: 0, p: { PAR1: { n: 0, s: 0 }, PAR30: { n: 0, s: 0 } } };
  for (const l of M.loans) {
    if (!passes(M, P, l)) continue;
    const o = l.obs[l.obs.length - 1];
    if (o.ci !== last) continue;
    r.n++;
    r.s += o.saldo;
    for (const d of PAR_DEFS) {
      if (o.dias >= d.min) {
        r.p[d.key].n++;
        r.p[d.key].s += o.saldo;
      }
    }
  }
  return r;
}

/* ---------- Matrices de Transición ---------- */

export interface TramoDef {
  label: string;
  rango: string;
}

export const TRAMOS: TramoDef[] = [
  { label: 'Al día', rango: '0 días' },
  { label: '1–30', rango: '1 a 30 días' },
  { label: '31–60', rango: '31 a 60 días' },
  { label: '61–90', rango: '61 a 90 días' },
  { label: '91–180', rango: '91 a 180 días' },
  { label: '>180', rango: 'más de 180 días' },
];

export const tramoOf = (d: number): number =>
  d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : d <= 180 ? 4 : 5;

export function transPairs(M: PreparedModel, h: number): [number, number][] {
  const out: [number, number][] = [];
  for (let ti = 0; ti < M.cierres.length; ti++) {
    const oi = M.byMonth.get(M.cm[ti] - h);
    if (oi !== undefined && oi < ti) out.push([oi, ti]);
  }
  return out;
}

export interface ClassifyResult {
  i: number;
  j: number;
  o0: LoanObs | undefined;
  o1: LoanObs | undefined;
  s: number;
}

export function classify(l: PreparedLoan, oi: number, ti: number): ClassifyResult | null {
  const o0 = l.at.get(oi);
  const o1 = l.at.get(ti);
  if (!o0 && !o1) return null;
  if (o0) return { i: tramoOf(o0.dias), j: o1 ? tramoOf(o1.dias) : 6, o0, o1, s: o0.saldo };
  return { i: 6, j: tramoOf(o1!.dias), o0, o1, s: o1!.saldo };
}

export interface TransitionCell {
  n: number;
  s: number;
}

export type TransitionMatrix = TransitionCell[][];

export interface TransitionsResult {
  pairs: [number, number][];
  selPairs: [number, number][];
  total: TransitionMatrix;
  byPair: Map<number, TransitionMatrix>;
}

export function transitions(
  M: PreparedModel,
  P: VintageParams,
  T: { h: number; to: number | null },
): TransitionsResult {
  const mk = (): TransitionMatrix =>
    Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => ({ n: 0, s: 0 })));

  const pairs = transPairs(M, T.h);
  const total = mk();
  const byPair = new Map<number, TransitionMatrix>();
  const sel = new Set(pairs.filter((p) => T.to == null || p[1] === T.to).map((p) => p[1]));

  for (const [oi, ti] of pairs) {
    const m = mk();
    byPair.set(ti, m);
    for (const l of M.loans) {
      if (!passes(M, P, l)) continue;
      const c = classify(l, oi, ti);
      if (!c) continue;
      m[c.i][c.j].n++;
      m[c.i][c.j].s += c.s;
      if (sel.has(ti)) {
        total[c.i][c.j].n++;
        total[c.i][c.j].s += c.s;
      }
    }
  }

  return { pairs, selPairs: pairs.filter((p) => sel.has(p[1])), total, byPair };
}

export interface TransDetailRow {
  l: PreparedLoan;
  oi: number;
  ti: number;
  i: number;
  j: number;
  o0: LoanObs;
  o1: LoanObs | undefined;
}

export function transDetail(
  M: PreparedModel,
  P: VintageParams,
  T: { h: number; to: number | null },
  sel: { i: number; j: number | 'up'; ti: number | null },
): TransDetailRow[] {
  const out: TransDetailRow[] = [];
  for (const [oi, ti] of transPairs(M, T.h)) {
    if (sel.ti != null ? ti !== sel.ti : T.to != null && ti !== T.to) continue;
    for (const l of M.loans) {
      if (!passes(M, P, l)) continue;
      const c = classify(l, oi, ti);
      if (!c || c.i === 6 || !c.o0) continue;
      if (sel.i >= 0 ? c.i !== sel.i : c.i > 4) continue;
      const ok = sel.j === 'up' ? c.j > c.i && c.j <= 5 : c.j === sel.j;
      if (!ok) continue;
      out.push({ l, oi, ti, i: c.i, j: c.j, o0: c.o0, o1: c.o1 });
    }
  }
  return out;
}

/* ---------- Formatos y colores ---------- */
export const nf0 = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
export const nf2 = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fQ = (v: number): string => 'Q' + nf0.format(v);
export const fQ2 = (v: number): string => 'Q' + nf2.format(v);
export const fP = (v: number): string => (v * 100).toFixed(1) + '%';

export const STOPS: [number, string][] = [
  [0, '#014F84'],
  [0.2, '#6BA3CC'],
  [0.42, '#EFEDE8'],
  [0.7, '#F9B17A'],
  [0.88, '#F48437'],
  [1, '#D0540C'],
];

export const hex2 = (h: string): [number, number, number] => [
  parseInt(h.substr(1, 2), 16),
  parseInt(h.substr(3, 2), 16),
  parseInt(h.substr(5, 2), 16),
];

export const toHex = (a: number[]): string =>
  a
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase();

export function colorAt(t: number): string {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0 || 1);
      const a = hex2(c0);
      const b = hex2(c1);
      return toHex(a.map((v, j) => v + (b[j] - v) * k));
    }
  }
  return toHex(hex2(STOPS[STOPS.length - 1][1]));
}

export function textOn(hex: string): 'FFFFFF' | '1B2733' {
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3 ? 'FFFFFF' : '1B2733';
}

export const gradCSS = (): string =>
  'linear-gradient(90deg,' + STOPS.map((s) => s[1] + ' ' + s[0] * 100 + '%').join(',') + ')';

export const MIX = (hex: string, t: number): string => {
  const a = hex2('#' + hex);
  return toHex(a.map((v) => 255 + (v - 255) * t));
};

export const HUES = {
  stay: '4F86B0',
  up: 'F48437',
  upHi: 'D0540C',
  better: '014F84',
  exit: '5F6D7B',
};

export function tcColor(i: number, j: number, pct: number): string {
  const t = Math.min(1, Math.pow(Math.max(0, pct), 0.55)) * 0.97;
  if (i === 6) return j === 0 ? MIX(HUES.stay, t) : MIX(HUES.up, t);
  if (j === 6) return MIX(HUES.exit, t);
  if (j === i) return MIX(HUES.stay, t);
  if (j < i) return MIX(HUES.better, t);
  return MIX(pct > 0.5 ? HUES.upHi : HUES.up, t);
}

export const isCk = (i: number, j: number): boolean =>
  (i <= 4 && j > i && j <= 5) || (j === 6 && i >= 1 && i <= 5);

export const fK = (v: number): string =>
  v >= 1e6 ? 'Q' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? 'Q' + nf0.format(v / 1e3) + 'k' : 'Q' + nf0.format(v);

export const cellVal = (x: VintageCellAggregate | undefined | null, basis: 'saldo' | 'n'): number | null => {
  if (!x || !x.n) return null;
  if (basis === 'saldo') return x.s ? x.sp / x.s : 0;
  return x.np / x.n;
};

export function autoCap(
  basis: 'saldo' | 'n',
  par: string,
  RES: VintageComputeResult,
  capOverride: number | null,
): number {
  if (capOverride != null) return capOverride / 100;
  const vs: number[] = [];
  const map = RES.cells[par];
  if (map) {
    map.forEach((row) =>
      row.forEach((x) => {
        const v = cellVal(x, basis);
        if (v != null) vs.push(v);
      })
    );
  }
  if (!vs.length) return 0.05;
  vs.sort((a, b) => a - b);
  const p95 = vs[Math.min(vs.length - 1, Math.floor(vs.length * 0.95))];
  return Math.max(0.05, Math.ceil(p95 * 20) / 20);
}

export const curveColor = (i: number, n: number): string => {
  const t = n <= 1 ? 0 : i / (n - 1);
  const a = hex2('#014F84');
  const b = hex2('#F48437');
  return '#' + toHex(a.map((v, j) => v + (b[j] - v) * t));
};
