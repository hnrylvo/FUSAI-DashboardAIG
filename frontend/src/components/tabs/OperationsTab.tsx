import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart } from 'react-chartjs-2';
import clsx from 'clsx';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { fN, fQ, fQ2, formatIsoDate } from '../../lib/formatters';
import type { MaturityRecord, PreCollectionRecord } from '../../types/api';

export const OperationsTab: React.FC = () => {
  const { cierre, filters, diaPago, setDiaPago, venc, setVenc } = useDashboardStore();

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
  const maturities = maturitiesQuery.data?.rows || [];
  const preCollection = preCollectionQuery.data?.rows || [];

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
            <Chart type="bar" data={paymentDaysChartData} options={paymentDaysOptions} />
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
          {/* Segmented control */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
              {maturities.length} {maturities.length === 1 ? 'registro' : 'registros'}
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

        <div className="overflow-x-auto rounded-lg border border-slate-100 max-h-[460px]">
          {maturitiesQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando vencimientos...</div>
          ) : maturities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              Ningún cliente al día vence en esta ventana.
            </div>
          ) : (
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
              <tbody className="divide-y divide-slate-100">
                {maturities.map((r: MaturityRecord) => (
                  <tr
                    key={r.ref || `${r.cod}-${r.fven}`}
                    className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                  >
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {r.ag || '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 max-w-[220px] truncate" title={r.cli || ''}>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 15 · Precobro */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#014F84]">
              15 · Precobro (primera cuota próxima)
            </h3>
            <p className="text-xs text-slate-500">
              Clientes al día que aún no han pagado su primera cuota y cuyo primer vencimiento
              estimado cae dentro de los próximos 30 días.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
            {preCollection.length} {preCollection.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100 max-h-[460px]">
          {preCollectionQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando precobros...</div>
          ) : preCollection.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              Sin clientes con primera cuota en los próximos 30 días.
            </div>
          ) : (
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
              <tbody className="divide-y divide-slate-100">
                {preCollection.map((r: PreCollectionRecord) => (
                  <tr
                    key={r.ref || `${r.cod}-${r.firstPay}`}
                    className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                  >
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {r.ag || '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-900 max-w-[220px] truncate" title={r.cli || ''}>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
