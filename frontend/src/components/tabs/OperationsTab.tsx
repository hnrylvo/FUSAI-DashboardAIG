import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart } from 'react-chartjs-2';
import clsx from 'clsx';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { fN, fQ, fQ2, formatIsoDate } from '../../lib/formatters';
import type { MaturityRecord, PreCollectionRecord } from '../../types/api';

const EMPTY_MATURITIES: MaturityRecord[] = [];
const EMPTY_PRE_COLLECTION: PreCollectionRecord[] = [];

export const OperationsTab: React.FC = () => {
  const { cierre, filters, diaPago, setDiaPago, venc, setVenc } = useDashboardStore();

  // Distinct filter key to force clean reset & isolation across operational charts and tables
  const filterKey = useMemo(() => {
    return `${cierre || ''}-${JSON.stringify(filters)}`;
  }, [cierre, filters]);

  // Query 13: Días de pago
  const paymentDaysQuery = useQuery({
    queryKey: ['paymentDays', cierre, diaPago, filters],
    queryFn: () => api.portfolio.getPaymentDays(cierre!, diaPago, filters),
    enabled: Boolean(cierre),
  });

  // Query 14: Vencimientos
  const maturitiesQuery = useQuery({
    queryKey: ['maturities', cierre, venc, filters],
    queryFn: () => api.portfolio.getMaturities(cierre!, venc, filters),
    enabled: Boolean(cierre),
  });

  // Query 15: Precobro
  const preCollectionQuery = useQuery({
    queryKey: ['preCollection', cierre, filters],
    queryFn: () => api.portfolio.getPreCollection(cierre!, filters),
    enabled: Boolean(cierre),
  });

  const paymentDays = paymentDaysQuery.data;
  const rawMaturities = maturitiesQuery.data?.rows ?? EMPTY_MATURITIES;
  const rawPreCollection = preCollectionQuery.data?.rows ?? EMPTY_PRE_COLLECTION;

  // Strict global filter adherence helper for operational datasets
  const matchesGlobalFilters = useMemo(() => {
    return (item: {
      dep?: string | null;
      ag?: string | null;
      ase?: string | null;
      ges?: string | null;
      mod?: string | null;
      sexo?: string | null;
    }) => {
      const { sel } = filters;
      const check = (val: string | null | undefined, allowed?: string[]) => {
        if (!allowed || allowed.length === 0) return true;
        const normalized =
          val === null || val === undefined || val === '' || val === 'None'
            ? '(Sin dato)'
            : String(val);
        return allowed.includes(normalized);
      };

      if (!check(item.dep, sel.dep)) return false;
      if (!check(item.ag, sel.ag)) return false;
      if (!check(item.ase, sel.ase)) return false;
      if (!check(item.ges, sel.ges)) return false;
      if (!check(item.mod, sel.mod)) return false;
      if (!check(item.sexo, sel.sexo)) return false;
      return true;
    };
  }, [filters]);

  // Deduplicate and filter maturities strictly by loan reference / identifier
  const uniqueMaturities = useMemo(() => {
    const seen = new Set<string>();
    return rawMaturities.filter((item) => {
      if (!matchesGlobalFilters(item)) return false;
      const id = item.ref || `${item.cod}-${item.fven}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [rawMaturities, matchesGlobalFilters]);

  // Deduplicate and filter pre-collection strictly by loan reference / identifier
  const uniquePreCollection = useMemo(() => {
    const seen = new Set<string>();
    return rawPreCollection.filter((item) => {
      if (!matchesGlobalFilters(item)) return false;
      const id = item.ref || `${item.cod}-${item.firstPay || item.dpago}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [rawPreCollection, matchesGlobalFilters]);

  const paymentDaysChartData = paymentDays
    ? {
        labels: paymentDays.days,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Monto de cartera (Q)',
            data: paymentDays.monto,
            backgroundColor: '#014F84',
            yAxisID: 'y',
            borderRadius: 4,
          },
          {
            type: 'line' as const,
            label: 'N° clientes',
            data: paymentDays.cnt,
            borderColor: '#F48437',
            backgroundColor: '#F48437',
            yAxisID: 'y1',
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 2,
          },
        ],
      }
    : null;

  const paymentDaysOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 8,
          font: { weight: 'bold' as const },
        },
      },
      tooltip: {
        callbacks: {
          label: (c: any) => {
            const isMoney = c.dataset?.yAxisID === 'y';
            const val = c.parsed?.y ?? 0;
            return `${c.dataset?.label || ''}: ${isMoney ? fQ(val) : fN(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: 'Día de pago' },
      },
      y: {
        position: 'left' as const,
        ticks: { callback: (v: number | string) => 'Q' + (Number(v) / 1e6).toFixed(1) + 'M' },
        title: { display: true, text: 'Cartera (Q)' },
      },
      y1: {
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Clientes' },
      },
    },
  };

  return (
    <div className="space-y-4">
      {/* 13 · Días de pago */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#014F84]">13 · Días de pago</h3>
            <p className="text-xs text-slate-500">
              Monto de cartera y número de clientes distribuidos por día de pago (1–31).
            </p>
          </div>
          {/* Segmented control */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={() => setDiaPago('all')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                diaPago === 'all'
                  ? 'bg-white text-[#014F84] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              Toda la cartera
            </button>
            <button
              type="button"
              onClick={() => setDiaPago('dia')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                diaPago === 'dia'
                  ? 'bg-white text-[#014F84] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              Solo al día
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          {paymentDaysChartData && (
            <Chart
              key={`chDiaPago-${diaPago}-${filterKey}`}
              type="bar"
              data={paymentDaysChartData}
              options={paymentDaysOptions}
            />
          )}
        </div>
      </div>

      {/* 14 · Vencimientos de cartera */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#014F84]">
              14 · Vencimientos de cartera (al día)
            </h3>
            <p className="text-xs text-slate-500">
              Clientes al día cuya operación vence en la ventana seleccionada.
            </p>
          </div>
          {/* Segmented control & counter badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
              {uniqueMaturities.length} {uniqueMaturities.length === 1 ? 'registro' : 'registros'}
            </span>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => setVenc('30')}
                className={clsx(
                  'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                  venc === '30'
                    ? 'bg-white text-[#014F84] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                Próximos 30 días
              </button>
              <button
                type="button"
                onClick={() => setVenc('90')}
                className={clsx(
                  'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                  venc === '90'
                    ? 'bg-white text-[#014F84] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                31 a 90 días
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-100 relative">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
              <tr>
                <th className="py-2.5 px-3">Agencia</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3 text-right">Saldo Capital</th>
                <th className="py-2.5 px-3">Producto</th>
                <th className="py-2.5 px-3">Fecha Vence</th>
                <th className="py-2.5 px-3 text-right">Días para vencer</th>
                <th className="py-2.5 px-3">Municipio</th>
                <th className="py-2.5 px-3">Teléfono</th>
              </tr>
            </thead>
            {/* Keyed tbody forces clean replacement upon filter change */}
            <tbody key={`tbody-mat-${venc}-${filterKey}`} className="divide-y divide-slate-100">
              {maturitiesQuery.isLoading && !maturitiesQuery.data ? (
                [...Array(10)].map((_, i) => (
                  <tr key={`skel-mat-${venc}-${i}-${filterKey}`} className="animate-pulse">
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-32" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-24" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-10 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-16" />
                    </td>
                  </tr>
                ))
              ) : uniqueMaturities.length === 0 ? (
                <tr key={`empty-mat-${venc}-${filterKey}`}>
                  <td colSpan={8} className="py-24 text-center text-xs text-slate-400 italic">
                    Ningún cliente al día vence en esta ventana.
                  </td>
                </tr>
              ) : (
                uniqueMaturities.map((r: MaturityRecord, idx: number) => {
                  const creditoId = r.ref || r.cod || 'mat';
                  return (
                    <tr
                      key={`mat-row-${creditoId}-${idx}-${filterKey}`}
                      className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                    >
                      <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {r.ag || '—'}
                      </td>
                      <td
                        className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 max-w-[220px] truncate"
                        title={r.cli || ''}
                      >
                        {r.cli || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {fQ2(r.sc)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {r.prod || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {formatIsoDate(r.fven)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#F48437] tabular-nums whitespace-nowrap">
                        {fN(r.daysToDue)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {r.mun || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 tabular-nums">
                        {r.tel || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {maturitiesQuery.isFetching && !maturitiesQuery.isLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-opacity">
              <div className="w-5 h-5 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* 15 · Precobro */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 min-h-[36px]">
          <div>
            <h3 className="text-sm font-bold text-[#014F84]">
              15 · Precobro (primera cuota próxima)
            </h3>
            <p className="text-xs text-slate-500">
              Clientes al día que aún no han pagado su primera cuota y cuyo primer vencimiento
              estimado cae dentro de los próximos 30 días.
            </p>
          </div>
          <div className="h-6 flex items-center">
            {preCollectionQuery.isLoading && !preCollectionQuery.data ? (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full animate-pulse">
                Cargando...
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
                {uniquePreCollection.length} {uniquePreCollection.length === 1 ? 'registro' : 'registros'}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-100 relative">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
              <tr>
                <th className="py-2.5 px-3">Agencia</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3 text-right">Saldo Capital</th>
                <th className="py-2.5 px-3 text-right">Cuota</th>
                <th className="py-2.5 px-3">1er pago (est.)</th>
                <th className="py-2.5 px-3 text-right">Día pago</th>
                <th className="py-2.5 px-3">Municipio</th>
                <th className="py-2.5 px-3">Teléfono</th>
              </tr>
            </thead>
            {/* Keyed tbody forces clean replacement upon filter change */}
            <tbody key={`tbody-pre-${filterKey}`} className="divide-y divide-slate-100">
              {preCollectionQuery.isLoading && !preCollectionQuery.data ? (
                [...Array(10)].map((_, i) => (
                  <tr key={`skel-pre-${i}-${filterKey}`} className="animate-pulse">
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-32" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-16 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-10 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-16" />
                    </td>
                  </tr>
                ))
              ) : uniquePreCollection.length === 0 ? (
                <tr key={`empty-pre-${filterKey}`}>
                  <td colSpan={8} className="py-24 text-center text-xs text-slate-400 italic">
                    Sin clientes con primera cuota en los próximos 30 días.
                  </td>
                </tr>
              ) : (
                uniquePreCollection.map((r: PreCollectionRecord, idx: number) => {
                  const creditoId = r.ref || r.cod || 'pre';
                  return (
                    <tr
                      key={`pre-row-${creditoId}-${idx}-${filterKey}`}
                      className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                    >
                      <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {r.ag || '—'}
                      </td>
                      <td
                        className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 max-w-[220px] truncate"
                        title={r.cli || ''}
                      >
                        {r.cli || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {fQ2(r.sc)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        {fQ2(r.cuota)}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#F48437] whitespace-nowrap">
                        {formatIsoDate(r.firstPay)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {fN(r.dpago)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {r.mun || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 tabular-nums">
                        {r.tel || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {preCollectionQuery.isFetching && !preCollectionQuery.isLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-opacity">
              <div className="w-5 h-5 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
