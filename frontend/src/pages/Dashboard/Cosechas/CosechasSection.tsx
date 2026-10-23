import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../../services/api';
import type { VintageDataResponse } from '../../../types/api';
import { prepare, mIndex, cierreLabel, nf0 } from './cosechasCore';
import type { VintageParams, PreparedModel } from './cosechasCore';
import { CosechasFilters } from './CosechasFilters';
import { VintageView } from './VintageView';
import { TransitionView } from './TransitionView';
import { TechnicalNotes } from './TechnicalNotes';
import { Tooltip, type TooltipInfo } from './Tooltip';
import './cosechas.css';

export const CosechasSection: React.FC = () => {
  const [mode, setMode] = useState<'vintage' | 'trans'>('vintage');
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null);

  // Fetch live or fixture data from backend
  const { data, isLoading, error, refetch, isFetching } = useQuery<VintageDataResponse>({
    queryKey: ['vintageData'],
    queryFn: () => api.vintage.getData(),
    staleTime: 5 * 60 * 1000,
  });

  // Default parameters
  const [params, setParams] = useState<VintageParams>({
    filters: {},
    asesorMode: 'orig',
    from: mIndex('2025-01-01'),
    grouping: 'M',
    axis: 'mob',
    measure: 'point',
  });

  // Prepare model
  const model: PreparedModel | null = useMemo(() => {
    if (!data?.store) return null;
    return prepare(data.store);
  }, [data]);

  const handleClearFilters = () => {
    setParams((prev) => ({ ...prev, filters: {} }));
  };

  if (isLoading) {
    return (
      <div className="cosechas-container p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col items-center justify-center space-y-3 py-12">
          <div className="w-10 h-10 border-4 border-[#014F84] border-t-transparent rounded-full animate-spin" />
          <h3 className="text-base font-semibold text-[#014F84]">
            Cargando análisis de cosechas (Vintage)...
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            Conectando con el servidor y preparando matriz histórica de cartera y créditos.
          </p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="cosechas-container p-8 bg-white rounded-xl border border-rose-200">
        <div className="flex flex-col items-center justify-center space-y-3 py-8 text-center">
          <AlertCircle size={40} className="text-rose-500" />
          <h3 className="text-base font-semibold text-rose-800">
            Error al cargar los datos de Cosechas
          </h3>
          <p className="text-xs text-slate-600 max-w-md">
            {(error as Error)?.message || 'No fue posible obtener el conjunto de datos de cosechas.'}
          </p>
          <button
            type="button"
            className="btn dark mt-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span>Reintentar conexión</span>
          </button>
        </div>
      </div>
    );
  }

  const cFirst = model.cierres[0] || '';
  const cLast = model.cierres[model.cierres.length - 1] || '';

  return (
    <div className="cosechas-container">
      {/* Contextual Sub-bar */}
      <div className="bg-white border border-[#dfe5ec] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#014F84] leading-tight">
            Análisis de Cosechas · Vintage de Cartera &amp; Matrices de Transición
          </h1>
          <p className="text-xs text-[#7b8896] mt-0.5">
            Apoyo Integral Guatemala, S.A. · {model.cierres.length} cierres ({cierreLabel(cFirst)} →{' '}
            {cierreLabel(cLast)}) · {nf0.format(model.loans.length)} créditos analizados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{
              backgroundColor: data?.source === 'database' ? '#e6eff6' : '#fff6ee',
              borderColor: data?.source === 'database' ? '#6ba3cc' : '#f9b17a',
              color: data?.source === 'database' ? '#014F84' : '#d0540c',
            }}
          >
            <Database size={12} />
            <span>
              {data?.source === 'database'
                ? 'SQL Server (on-premise) en vivo'
                : 'Cierres de Cartera cargados'}
            </span>
          </span>

          <button
            type="button"
            className="btn ghost text-xs py-1 px-2.5"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refrescar datos desde el servidor"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 1. Multi-Select Categorical Filters Card */}
      <CosechasFilters
        model={model}
        params={params}
        onParamsChange={setParams}
        onClearFilters={handleClearFilters}
      />

      {/* 2. Top View Mode Selector (Vintage vs Matrices) */}
      <section className="navbar">
        <div className="seg">
          <button
            type="button"
            className={mode === 'vintage' ? 'on' : ''}
            onClick={() => {
              setMode('vintage');
              setTooltipInfo(null);
            }}
          >
            ▦ Vintage de cosechas
          </button>
          <button
            type="button"
            className={mode === 'trans' ? 'on' : ''}
            onClick={() => {
              setMode('trans');
              setTooltipInfo(null);
            }}
          >
            ⇄ Matrices de transición
          </button>
        </div>
      </section>

      {/* 3. Main Views */}
      {mode === 'vintage' ? (
        <VintageView
          model={model}
          params={params}
          onParamsChange={setParams}
          onHoverCell={setTooltipInfo}
        />
      ) : (
        <TransitionView
          model={model}
          params={params}
          onHoverCell={setTooltipInfo}
        />
      )}

      {/* 4. Technical Criteria & Formulas Notes */}
      <TechnicalNotes mode={mode} firstCierre={cFirst} />

      {/* 5. Floating Hover Tooltip */}
      <Tooltip info={tooltipInfo} />
    </div>
  );
};

export default CosechasSection;
