import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

interface OptionItem {
  key: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: (string | OptionItem)[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onClear: () => void;
  placeholder?: string;
  allLabel?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  onClear,
  placeholder = 'Todas',
  allLabel = 'Seleccionar todas',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalizedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === 'string' ? { key: opt, label: opt } : opt,
  );

  const filtered = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const isAllSelected =
    normalizedOptions.length > 0 && selected.length === normalizedOptions.length;

  const handleToggleOption = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onClear();
    } else {
      onChange(normalizedOptions.map((o) => o.key));
    }
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? normalizedOptions.find((o) => o.key === selected[0])?.label || selected[0]
        : `${selected.length} selec.`;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 px-0.5">
        {label}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150',
          'bg-slate-50 hover:bg-white text-slate-700 min-w-[130px] max-w-[210px] text-left shadow-xs',
          isOpen
            ? 'border-[#014F84] ring-2 ring-[#014F84]/15 bg-white'
            : selected.length > 0
              ? 'border-[#014F84]/40 bg-white text-[#014F84]'
              : 'border-slate-300',
        )}
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayText}</span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selected.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
              title="Limpiar"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={clsx('transition-transform duration-200 text-[#014F84]', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          {/* Input de búsqueda rápida */}
          <div className="relative mb-2 shrink-0">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2.5 text-xs focus:border-[#014F84] focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
              autoFocus
            />
          </div>

          {/* Opción Seleccionar todas */}
          <div className="border-b border-slate-100 pb-1.5 mb-1 shrink-0">
            <label className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold text-[#014F84] hover:bg-slate-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleAll}
                className="w-4 h-4 rounded text-[#014F84] accent-[#014F84] cursor-pointer"
              />
              <span>{allLabel}</span>
            </label>
          </div>

          {/* Lista de opciones filtradas con scrollbar */}
          <div className="overflow-y-auto space-y-0.5 pr-1 flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                No hay coincidencias
              </div>
            ) : (
              filtered.map((opt) => {
                const checked = selected.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors',
                      checked ? 'bg-[#014F84]/8 text-[#014F84] font-medium' : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleOption(opt.key)}
                      className="w-4 h-4 rounded text-[#014F84] accent-[#014F84] cursor-pointer"
                    />
                    <span className="truncate flex-1">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer contador */}
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-1 shrink-0">
            <span>{selected.length} de {normalizedOptions.length} seleccionados</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[#F48437] font-semibold hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
