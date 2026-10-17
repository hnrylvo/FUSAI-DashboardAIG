/**
 * Núcleo del motor de cálculo — tipos, constantes y helpers.
 *
 * Todo lo que vive en `src/engine` es una traducción 1:1 del <script> de
 * `Dashboard_Cartera_AIG.html`. Se conservaron intencionalmente las mismas
 * comparaciones de JavaScript (p.ej. `g(r,'dmora') >= 1` sin coerción previa)
 * para que los resultados sean idénticos al dashboard original, incluso con
 * datos nulos. No "corregir" estas expresiones sin actualizar el test de paridad.
 */

/** Orden canónico de columnas (idéntico a RAW.keys del HTML original). */
export const KEYS = [
  'ref', 'cod', 'cli', 'ase', 'ges', 'dep', 'mun', 'fdes', 'mod', 'mo', 'sc', 'kmora', 'cuota',
  'dpago', 'fven', 'ucp', 'sexo', 'ufp', 'dmora', 'sest', 'tc', 'gar', 'prod', 'tel', 'ag',
] as const;

export type Key = (typeof KEYS)[number];
export type Cell = string | number | null;
/** Una fila = un crédito, en formato compacto (array alineado con KEYS). */
export type Row = Cell[];

export interface Dataset {
  generated: string;
  cierres: Record<string, Row[]>;
}

export const IDX = Object.fromEntries(KEYS.map((k, i) => [k, i])) as Record<Key, number>;

/**
 * Lectura cruda de una columna. Devuelve `any` a propósito: el original
 * compara valores sin convertirlos y queremos la misma semántica de JS.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const g = (r: Row, k: Key): any => r[IDX[k]];

/** Suma de Saldo de Capital — `rows.reduce((a,r)=>a+(+g(r,'sc')||0),0)` */
export const sumSc = (rows: Row[]): number => rows.reduce((a, r) => a + (+g(r, 'sc') || 0), 0);

/** Clientes únicos por código. */
export const uniqueClients = (rows: Row[]): number => new Set(rows.map((r) => g(r, 'cod'))).size;

export const orderCierres = (ds: Dataset): string[] => Object.keys(ds.cierres).sort();

export const parseD = (s: string | null | undefined): Date | null => (s ? new Date(s + 'T00:00:00') : null);

export const daysBetween = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / 86400000);

export const NUL = '(Sin dato)';

/** Valor categórico normalizado para filtros. */
export const gv = (r: Row, k: Key): string => {
  const v = g(r, k);
  return v === null || v === undefined || v === 'None' || v === '' ? NUL : String(v);
};

/** Agrega a nivel cliente (cod): saldo suma, dmora max, mo suma; toma 1er registro para categóricos. */
export interface ClientAgg {
  cod: string;
  sc: number;
  mo: number;
  dmora: number;
  r: Row;
}
export function clientAgg(rows: Row[]): ClientAgg[] {
  const m = new Map<string, ClientAgg>();
  for (const r of rows) {
    const cod = g(r, 'cod');
    if (!m.has(cod)) m.set(cod, { cod, sc: 0, mo: 0, dmora: 0, r });
    const o = m.get(cod)!;
    o.sc += +g(r, 'sc') || 0;
    o.mo += +g(r, 'mo') || 0;
    o.dmora = Math.max(o.dmora, +g(r, 'dmora') || 0);
  }
  return [...m.values()];
}

/** Tramos de los TOP y de la matriz de transición. */
export type MoraBucket = 'dia' | 'b1' | 'b2' | 'b3' | 'b4';
export const moraBucket = (d: number): MoraBucket =>
  d <= 0 ? 'dia' : d <= 30 ? 'b1' : d <= 90 ? 'b2' : d <= 120 ? 'b3' : 'b4';
export const BUCKETS: Record<MoraBucket, string> = { dia: 'Al día', b1: '1–30', b2: '31–90', b3: '91–120', b4: '>120' };

/** Proyección de una fila compacta a objeto con nombre (para respuestas de la API). */
export type LoanRecord = Record<Key, Cell>;
export const toRecord = (r: Row): LoanRecord =>
  Object.fromEntries(KEYS.map((k, i) => [k, r[i] ?? null])) as LoanRecord;
