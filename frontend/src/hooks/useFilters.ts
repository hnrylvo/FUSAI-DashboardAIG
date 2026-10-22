import { useMemo } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import type { FilterKey } from '../types/api';

export function useFilters() {
  const {
    filters,
    toggleFilterOption,
    setFilterOptions,
    clearFilter,
    toggleAtrasoOption,
    setAtrasoOptions,
    clearAtraso,
    resetAllFilters,
  } = useDashboardStore();

  const activeCount = useMemo(() => {
    const selCount = Object.values(filters.sel).reduce(
      (acc, curr) => acc + (curr?.length || 0),
      0,
    );
    return selCount + (filters.atraso?.length || 0);
  }, [filters]);

  const hasActiveFilters = activeCount > 0;

  const getSelectedCount = (key: FilterKey) => {
    return filters.sel[key]?.length || 0;
  };

  return {
    filters,
    activeCount,
    hasActiveFilters,
    getSelectedCount,
    toggleFilterOption,
    setFilterOptions,
    clearFilter,
    toggleAtrasoOption,
    setAtrasoOptions,
    clearAtraso,
    resetAllFilters,
  };
}
