import { create } from 'zustand';
import type { ColocTipo, FilterKey, FilterPayload, MetaResponse } from '../types/api';

export type DashboardTab = 'resumen' | 'composicion' | 'rankings' | 'operacion' | 'retencion';

interface DashboardState {
  meta: MetaResponse | null;
  cierre: string | null;
  activeTab: DashboardTab;

  // Filtros globales (7 originales)
  filters: FilterPayload;

  // Sub-controles por pestaña
  colocTipo: ColocTipo;
  diaPago: 'all' | 'dia';
  venc: '30' | '90';
  desDe: string | null;
  desA: string | null;
  mtxDe: string | null;
  mtxA: string | null;
  mtxMode: 'cli' | 'monto';

  // Acciones
  setMeta: (meta: MetaResponse) => void;
  setCierre: (cierre: string) => void;
  setActiveTab: (tab: DashboardTab) => void;

  toggleFilterOption: (key: FilterKey, value: string) => void;
  setFilterOptions: (key: FilterKey, values: string[]) => void;
  clearFilter: (key: FilterKey) => void;

  toggleAtrasoOption: (key: string) => void;
  setAtrasoOptions: (values: string[]) => void;
  clearAtraso: () => void;

  resetAllFilters: () => void;

  setColocTipo: (tipo: ColocTipo) => void;
  setDiaPago: (mode: 'all' | 'dia') => void;
  setVenc: (window: '30' | '90') => void;
  setDesRange: (de: string, a: string) => void;
  setMtxRange: (de: string, a: string) => void;
  setMtxMode: (mode: 'cli' | 'monto') => void;
}

const initialFilters: FilterPayload = {
  sel: {
    ag: [],
    ase: [],
    ges: [],
    dep: [],
    mod: [],
    sexo: [],
  },
  atraso: [],
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  meta: null,
  cierre: null,
  activeTab: 'resumen',

  filters: initialFilters,

  colocTipo: 'ALL',
  diaPago: 'all',
  venc: '30',
  desDe: null,
  desA: null,
  mtxDe: null,
  mtxA: null,
  mtxMode: 'cli',

  setMeta: (meta) => {
    const cierres = meta.cierres.map((c) => c.cierre).sort();
    const latest = cierres[cierres.length - 1] || null;
    const penult = cierres.length >= 2 ? cierres[cierres.length - 2] : latest;

    const currentCierre = get().cierre;
    const newCierre = currentCierre && cierres.includes(currentCierre) ? currentCierre : latest;

    set({
      meta,
      cierre: newCierre,
      desDe: get().desDe || penult,
      desA: get().desA || latest,
      mtxDe: get().mtxDe || penult,
      mtxA: get().mtxA || latest,
    });
  },

  setCierre: (cierre) => set({ cierre }),
  setActiveTab: (activeTab) => set({ activeTab }),

  toggleFilterOption: (key, value) => {
    const current = get().filters.sel[key] || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    set({
      filters: {
        ...get().filters,
        sel: {
          ...get().filters.sel,
          [key]: next,
        },
      },
    });
  },

  setFilterOptions: (key, values) => {
    const finalValues =
      key === 'sexo'
        ? Array.from(
            new Set(
              values
                .map((v) => {
                  const upper = v.trim().toUpperCase();
                  if (upper === 'M' || upper === 'MASCULINO') return 'MASCULINO';
                  if (upper === 'F' || upper === 'FEMENINO') return 'FEMENINO';
                  return upper;
                })
                .filter(Boolean),
            ),
          )
        : values;

    set({
      filters: {
        ...get().filters,
        sel: {
          ...get().filters.sel,
          [key]: finalValues,
        },
      },
    });
  },

  clearFilter: (key) => {
    set({
      filters: {
        ...get().filters,
        sel: {
          ...get().filters.sel,
          [key]: [],
        },
      },
    });
  },

  toggleAtrasoOption: (key) => {
    const current = get().filters.atraso;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    set({
      filters: {
        ...get().filters,
        atraso: next,
      },
    });
  },

  setAtrasoOptions: (values) => {
    set({
      filters: {
        ...get().filters,
        atraso: values,
      },
    });
  },

  clearAtraso: () => {
    set({
      filters: {
        ...get().filters,
        atraso: [],
      },
    });
  },

  resetAllFilters: () => {
    set({
      filters: {
        sel: {
          ag: [],
          ase: [],
          ges: [],
          dep: [],
          mod: [],
          sexo: [],
        },
        atraso: [],
      },
    });
  },

  setColocTipo: (colocTipo) => set({ colocTipo }),
  setDiaPago: (diaPago) => set({ diaPago }),
  setVenc: (venc) => set({ venc }),
  setDesRange: (desDe, desA) => set({ desDe, desA }),
  setMtxRange: (mtxDe, mtxA) => set({ mtxDe, mtxA }),
  setMtxMode: (mtxMode) => set({ mtxMode }),
}));
