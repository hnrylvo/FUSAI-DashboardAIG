import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import type { FilterKey } from '../../types/api';

import { normalizeGender } from '../../utils/portfolioCalculations';

const GENDER_OPTIONS = [
  { label: 'FEMENINO', value: 'FEMENINO' },
  { label: 'MASCULINO', value: 'MASCULINO' },
];

export const FilterBar: React.FC = () => {
  const {
    meta,
    filters,
    setFilterOptions,
    clearFilter,
    setAtrasoOptions,
    clearAtraso,
    resetAllFilters,
  } = useDashboardStore();

  if (!meta) return null;

  // Calculate total active filter constraints
  const activeCount =
    Object.values(filters.sel).reduce((acc, curr) => acc + (curr?.length || 0), 0) +
    (filters.atraso?.length || 0);

  return (
    <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 md:px-6 lg:px-8 py-2.5 sticky top-[68px] z-20 shadow-xs">
      <div className="w-full max-w-7xl mx-auto flex flex-wrap items-end gap-2.5 md:gap-3">
        {/* Section title */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#014F84] uppercase tracking-wider pb-2 pr-1">
          <Filter size={14} className="text-[#014F84]" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <span className="bg-[#014F84] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {activeCount}
            </span>
          )}
        </div>

        {/* The 6 original categorical filters */}
        {meta.filters.map((f) => {
          const isGender = f.key === 'sexo';
          const options = isGender ? GENDER_OPTIONS : f.options;
          const selected = isGender
            ? Array.from(
                new Set(
                  (filters.sel.sexo || [])
                    .map(normalizeGender)
                    .filter((g): g is 'FEMENINO' | 'MASCULINO' => g === 'FEMENINO' || g === 'MASCULINO'),
                ),
              )
            : filters.sel[f.key as FilterKey] || [];

          return (
            <MultiSelectDropdown
              key={f.key}
              label={f.label}
              options={options}
              selected={selected}
              onChange={(newSelected) => setFilterOptions(f.key as FilterKey, newSelected)}
              onClear={() => clearFilter(f.key as FilterKey)}
              placeholder="Todas"
              allLabel="Seleccionar todas"
            />
          );
        })}

        {/* 7th filter: Rango de Atraso */}
        <MultiSelectDropdown
          label="Rango de atraso"
          options={meta.atraso.map((a) => ({ key: a.key, label: a.label }))}
          selected={filters.atraso || []}
          onChange={(selected) => setAtrasoOptions(selected)}
          onClear={() => clearAtraso()}
          placeholder="Todos"
          allLabel="Seleccionar todos"
        />

        {/* Clear all button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#F48437] hover:text-[#e0722a] underline pb-2 px-1 cursor-pointer transition-colors ml-auto"
          >
            <RotateCcw size={12} />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};
