import React, { useState, useEffect, useRef } from 'react';
import type { PreparedModel, VintageParams } from './cosechasCore';
import { FILTERS_META } from './cosechasCore';

interface CosechasFiltersProps {
  model: PreparedModel;
  params: VintageParams;
  onParamsChange: (updater: (prev: VintageParams) => VintageParams) => void;
  onClearFilters: () => void;
}

export const CosechasFilters: React.FC<CosechasFiltersProps> = ({
  model,
  params,
  onParamsChange,
  onClearFilters,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchChange = (key: string, val: string) => {
    setSearchTerms((prev) => ({ ...prev, [key]: val }));
  };

  const toggleOption = (key: string, idx: number) => {
    onParamsChange((prev) => {
      const nextFilters = { ...prev.filters };
      const currentSet = new Set(nextFilters[key] || []);
      if (currentSet.has(idx)) {
        currentSet.delete(idx);
      } else {
        currentSet.add(idx);
      }
      nextFilters[key] = currentSet;
      return { ...prev, filters: nextFilters };
    });
  };

  const clearDimension = (key: string) => {
    onParamsChange((prev) => {
      const nextFilters = { ...prev.filters };
      delete nextFilters[key];
      return { ...prev, filters: nextFilters };
    });
  };

  return (
    <section className="card filters-card" ref={filterRef}>
      <div className="bar" style={{ marginBottom: 8 }}>
        <div>
          <h2>Filtros</h2>
          <div className="sub" style={{ margin: 0 }}>
            Todos los filtros se combinan (Y). Sin selección = todos.
          </div>
        </div>
        <button type="button" className="btn ghost" onClick={onClearFilters}>
          ✕ Limpiar filtros
        </button>
      </div>

      <div className="filters">
        {FILTERS_META.map((f) => {
          const counts = new Map<number, number>();
          model.loans.forEach((l) => {
            const idx =
              f.key === 'asesor'
                ? params.asesorMode === 'act'
                  ? l.asAct
                  : l.asOrig
                : l.d[f.key as keyof typeof l.d];
            counts.set(idx, (counts.get(idx) || 0) + 1);
          });

          const dimItems = Array.from(counts.entries())
            .map(([idx, count]) => ({
              idx,
              count,
              text: model.store.dims[f.key as keyof typeof model.store.dims]?.[idx] || '(SIN DATO)',
            }))
            .sort((a, b) => a.text.localeCompare(b.text, 'es'));

          const selectedSet = params.filters[f.key] || new Set<number>();
          const isOpen = openKey === f.key;
          const search = (searchTerms[f.key] || '').toLowerCase();
          const filteredItems = search
            ? dimItems.filter((it) => it.text.toLowerCase().includes(search))
            : dimItems;

          let labelValue = 'Todos';
          if (selectedSet.size === 1) {
            const singleIdx = Array.from(selectedSet)[0];
            labelValue =
              model.store.dims[f.key as keyof typeof model.store.dims]?.[singleIdx] || '1 selec.';
          } else if (selectedSet.size > 1) {
            labelValue = `${selectedSet.size} selec.`;
          }

          return (
            <div
              key={f.key}
              className={`ms ${selectedSet.size > 0 ? 'act' : ''} ${isOpen ? 'open' : ''}`}
            >
              <button
                type="button"
                className="ms-b"
                aria-haspopup="listbox"
                onClick={() => setOpenKey(isOpen ? null : f.key)}
              >
                <span>{f.label}</span>
                <span className="v">{labelValue}</span>
              </button>

              {isOpen && (
                <div className="ms-p">
                  <input
                    type="search"
                    placeholder="Buscar…"
                    aria-label={`Buscar en ${f.label}`}
                    value={searchTerms[f.key] || ''}
                    onChange={(e) => handleSearchChange(f.key, e.target.value)}
                    autoFocus
                  />
                  <div className="ms-l">
                    {filteredItems.map((it) => (
                      <label key={it.idx}>
                        <input
                          type="checkbox"
                          value={it.idx}
                          checked={selectedSet.has(it.idx)}
                          onChange={() => toggleOption(f.key, it.idx)}
                        />
                        <span>{it.text}</span>
                        <em>{it.count}</em>
                      </label>
                    ))}
                    {filteredItems.length === 0 && (
                      <div className="empty" style={{ padding: 12 }}>
                        No se encontraron opciones
                      </div>
                    )}
                  </div>
                  <div className="ms-f">
                    <a onClick={() => clearDimension(f.key)}>Limpiar</a>
                    <a onClick={() => setOpenKey(null)}>Cerrar</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <div className="fld">
          <span className="lb">Asesor a considerar</span>
          <div className="seg">
            <button
              type="button"
              className={params.asesorMode === 'orig' ? 'on' : ''}
              title="Primer asesor del crédito que no sea Gestor de Cobro"
              onClick={() => onParamsChange((prev) => ({ ...prev, asesorMode: 'orig' }))}
            >
              Colocación (original)
            </button>
            <button
              type="button"
              className={params.asesorMode === 'act' ? 'on' : ''}
              title="Asesor que lo tiene en el último cierre"
              onClick={() => onParamsChange((prev) => ({ ...prev, asesorMode: 'act' }))}
            >
              Actual
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
