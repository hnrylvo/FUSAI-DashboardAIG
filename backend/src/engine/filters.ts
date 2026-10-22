import { type Dataset, type Key, type Row, clientAgg, type ClientAgg, g, gv, orderCierres } from './core.js';

/** Filtros globales originales (mismo orden y etiquetas que el HTML). */
export const FILTERS = [
  ['ag', 'Agencia'],
  ['ase', 'Asesor'],
  ['ges', 'Gestor de cobro'],
  ['dep', 'Departamento'],
  ['mod', 'Modalidad'],
  ['sexo', 'Sexo'],
] as const satisfies ReadonlyArray<readonly [Key, string]>;

export type FilterKey = (typeof FILTERS)[number][0];
export const FILTER_KEYS = FILTERS.map(([k]) => k) as FilterKey[];

/** Rango de atraso: tramos MECE para el filtro general (independientes de los tramos de los TOP y de la matriz). */
export const ATRASO = [
  ['dia', 'Al día', (d: number) => d <= 0],
  ['a1', '1 a 30 días', (d: number) => d >= 1 && d <= 30],
  ['a2', '31 a 60 días', (d: number) => d >= 31 && d <= 60],
  ['a3', '61 a 90 días', (d: number) => d >= 61 && d <= 90],
  ['a4', '91 a 180 días', (d: number) => d >= 91 && d <= 180],
  ['a5', '181 a 265 días', (d: number) => d >= 181 && d <= 265],
  ['a6', '> 265 días', (d: number) => d > 265],
] as const;
export type AtrasoKey = (typeof ATRASO)[number][0];
export const ATRASO_KEYS = ATRASO.map(([k]) => k) as AtrasoKey[];

export function atrasoKey(d: unknown): AtrasoKey {
  const n = +(d as number) || 0;
  for (const [k, , f] of ATRASO) if (f(n)) return k;
  return 'dia';
}

/** Selección de filtros tal como llega de la API (listas) → Sets para evaluar. */
export interface FilterInput {
  sel?: Partial<Record<FilterKey, string[]>>;
  atraso?: string[];
}
export interface FilterState {
  sel: Record<FilterKey, Set<string>>;
  atraso: Set<string>;
}
export function toFilterState(input: FilterInput = {}): FilterState {
  const sel = {} as Record<FilterKey, Set<string>>;
  for (const k of FILTER_KEYS) sel[k] = new Set(input.sel?.[k] ?? []);
  return { sel, atraso: new Set(input.atraso ?? []) };
}

export const normalizeGender = (rawGender: string | null | undefined): 'MASCULINO' | 'FEMENINO' | 'OTRO' => {
  if (!rawGender) return 'OTRO';
  const val = String(rawGender).trim().toUpperCase();
  if (val === 'M' || val === 'MASCULINO') return 'MASCULINO';
  if (val === 'F' || val === 'FEMENINO') return 'FEMENINO';
  return 'OTRO';
};

export function matchGlobal(r: Row, f: FilterState): boolean {
  for (const k of FILTER_KEYS) {
    const s = f.sel[k];
    if (!s.size) continue;
    if (k === 'sexo') {
      const loanGenderNormalized = normalizeGender(g(r, 'sexo'));
      let match = false;
      for (const selVal of s) {
        if (normalizeGender(selVal) === loanGenderNormalized || selVal === gv(r, 'sexo')) {
          match = true;
          break;
        }
      }
      if (!match) return false;
    } else {
      if (!s.has(gv(r, k))) return false;
    }
  }
  if (f.atraso.size && !f.atraso.has(atrasoKey(g(r, 'dmora')))) return false;
  return true;
}

/** Valores posibles por filtro, a partir de TODOS los cierres (como buildFilterOptions). */
export function buildFilterOptions(ds: Dataset): Record<FilterKey, string[]> {
  const opt = {} as Record<FilterKey, Set<string>>;
  FILTER_KEYS.forEach((k) => (opt[k] = new Set()));
  for (const c of orderCierres(ds)) for (const r of ds.cierres[c]) FILTER_KEYS.forEach((k) => opt[k].add(gv(r, k)));
  const out = {} as Record<FilterKey, string[]>;
  for (const k of FILTER_KEYS) out[k] = [...opt[k]].sort((a, b) => a.localeCompare(b, 'es'));
  return out;
}

/**
 * Contexto de cálculo: dataset + filtros, con memoización de las vistas
 * filtradas por cierre y de la presencia de clientes entre cierres.
 */
export class Ctx {
  private rowsCache = new Map<string, Row[]>();
  private presenceCache: Map<string, Record<string, ClientAgg>> | null = null;
  readonly order: string[];

  constructor(
    readonly ds: Dataset,
    readonly filters: FilterState,
  ) {
    this.order = orderCierres(ds);
  }

  match = (r: Row) => matchGlobal(r, this.filters);

  /** filas del cierre con filtros globales — rowsF(cierre) */
  rowsF(cierre: string): Row[] {
    let rows = this.rowsCache.get(cierre);
    if (!rows) {
      rows = (this.ds.cierres[cierre] || []).filter(this.match);
      this.rowsCache.set(cierre, rows);
    }
    return rows;
  }

  /** cod -> {cierre -> rowAgg} — clientPresence() */
  clientPresence(): Map<string, Record<string, ClientAgg>> {
    if (this.presenceCache) return this.presenceCache;
    const map = new Map<string, Record<string, ClientAgg>>();
    for (const c of this.order) {
      for (const o of clientAgg(this.rowsF(c))) {
        if (!map.has(o.cod)) map.set(o.cod, {});
        map.get(o.cod)![c] = o;
      }
    }
    this.presenceCache = map;
    return map;
  }
}
