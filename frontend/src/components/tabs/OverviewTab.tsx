import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { KpiCard } from '../common/KpiCard';
import { cLabel, fN, fPct, fQ } from '../../lib/formatters';
import type { ColocTipo } from '../../types/api';

export const OverviewTab: React.FC = () => {
  const { cierre, filters, colocTipo, setColocTipo } = useDashboardStore();

  const overviewQuery = useQuery({
    queryKey: ['overview', cierre, filters],
    queryFn: () => api.portfolio.getOverview(cierre!, filters),
    enabled: Boolean(cierre),
  });

  const placementQuery = useQuery({
    queryKey: ['placement', colocTipo, filters],
    queryFn: () => api.portfolio.getPlacement(colocTipo, filters),
  });

  if (overviewQuery.isLoading || !overviewQuery.data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-slate-200/60 rounded-xl lg:col-span-2" />
          <div className="h-72 bg-slate-200/60 rounded-xl" />
          <div className="h-72 bg-slate-200/60 rounded-xl" />
          <div className="h-80 bg-slate-200/60 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const { kpis, trends } = overviewQuery.data;
  const placement = placementQuery.data;

  // Delta calculations matching original HTML
  let dCart = '';
  let dCartTrend: 'up' | 'down' | 'flat' = 'flat';
  if (kpis.prevCartera != null && kpis.prevCierre) {
    const dv = kpis.cartera - kpis.prevCartera;
    dCartTrend = dv >= 0 ? 'down' : 'up';
    dCart = `${dv >= 0 ? '▲ ' : '▼ '}${fQ(Math.abs(dv))} vs ${cLabel(kpis.prevCierre)}`;
  }

  const trendLabels = trends.cierres.map(cLabel);

  // Line Chart 1: Cartera y Clientes
  const chCarteraData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Cartera (Q)',
        data: trends.cartera,
        borderColor: '#014F84',
        backgroundColor: 'rgba(1,79,132,0.08)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        borderWidth: 3,
      },
      {
        label: 'Clientes',
        data: trends.ncli,
        borderColor: '#F48437',
        backgroundColor: '#F48437',
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 3,
        borderWidth: 3,
      },
    ],
  };

  // Line Chart 2: Mora Total (>= 1 día)
  const chMora1Data = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Cartera en mora (Q)',
        data: trends.par1m,
        borderColor: '#F48437',
        backgroundColor: 'rgba(244,132,55,0.10)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        borderWidth: 3,
        pointRadius: 3,
      },
      {
        label: 'Clientes en mora',
        data: trends.par1c,
        borderColor: '#014F84',
        tension: 0.3,
        yAxisID: 'y1',
        borderWidth: 3,
        pointRadius: 3,
      },
    ],
  };

  // Line Chart 3: PAR 30 (>= 30 días)
  const chMora30Data = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Cartera mora ≥30 (Q)',
        data: trends.par30m,
        borderColor: '#d9534f',
        backgroundColor: 'rgba(217,83,79,0.10)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        borderWidth: 3,
        pointRadius: 3,
      },
      {
        label: 'Clientes mora ≥30',
        data: trends.par30c,
        borderColor: '#014F84',
        tension: 0.3,
        yAxisID: 'y1',
        borderWidth: 3,
        pointRadius: 3,
      },
    ],
  };

  // Chart 4: Colocación mensual
  const chColocData = placement
    ? {
        labels: placement.cierres.map(cLabel),
        datasets: [
          {
            label: 'Monto colocado en el mes (Q)',
            data: placement.monto,
            borderColor: '#014F84',
            backgroundColor: 'rgba(1,79,132,0.10)',
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
            borderWidth: 3,
            pointRadius: 4,
          },
          {
            label: 'N° créditos del mes',
            data: placement.num,
            borderColor: '#F48437',
            tension: 0.3,
            yAxisID: 'y1',
            borderWidth: 3,
            pointRadius: 4,
          },
        ],
      }
    : null;

  const dualAxisOptions = {
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
          padding: 14,
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
      x: { grid: { display: false } },
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
      {/* 8 Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Cartera total"
          value={fQ(kpis.cartera)}
          detail={dCart}
          trend={dCartTrend}
          accent="navy"
          icon="💼"
        />
        <KpiCard
          label="Clientes activos"
          value={fN(kpis.nCli)}
          detail={`${kpis.nCreditos} créditos`}
          trend="flat"
          accent="orange"
          icon="👥"
        />
        <KpiCard
          label="PAR 1 (mora total)"
          value={fPct(kpis.cartera ? kpis.par1 / kpis.cartera : 0)}
          detail={`${fQ(kpis.par1)} · ${fN(kpis.cliMora)} cli`}
          trend={kpis.cartera && kpis.par1 / kpis.cartera > 0.15 ? 'up' : 'down'}
          accent="red"
          icon="⚠"
        />
        <KpiCard
          label="PAR 30"
          value={fPct(kpis.cartera ? kpis.par30 / kpis.cartera : 0)}
          detail={fQ(kpis.par30)}
          trend={kpis.cartera && kpis.par30 / kpis.cartera > 0.1 ? 'up' : 'down'}
          accent="red"
          icon="⏱"
        />
        <KpiCard
          label="Ticket promedio"
          value={fQ(kpis.ticket)}
          detail="saldo / cliente"
          trend="flat"
          accent="navy"
          icon="🎯"
        />
        <KpiCard
          label="Créditos al día"
          value={fN(kpis.alDia)}
          detail={`${fPct(kpis.nCreditos ? kpis.alDia / kpis.nCreditos : 0)} del total`}
          trend="down"
          accent="green"
          icon="✅"
        />
        <KpiCard
          label="Mora crítica >120d"
          value={fN(kpis.criticaN)}
          detail={fQ(kpis.criticaMonto)}
          trend="up"
          accent="red"
          icon="🔴"
        />
        <KpiCard
          label="Cuota mensual esperada"
          value={fQ(kpis.cuotaTotal)}
          detail="suma de cuotas"
          trend="flat"
          accent="orange"
          icon="📅"
        />
      </div>

      {/* Grid de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Cartera y clientes */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[#014F84] flex items-center gap-2">
              1 · Comportamiento de cartera y clientes
            </h3>
            <p className="text-xs text-slate-500">
              Evolución mensual del saldo de capital y número de clientes activos.
            </p>
          </div>
          <div className="h-72 w-full">
            <Line data={chCarteraData} options={dualAxisOptions} />
          </div>
        </div>

        {/* Gráfico 2: Mora total */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[#014F84]">2 · Mora total (≥ 1 día)</h3>
            <p className="text-xs text-slate-500">
              Cartera en riesgo y clientes en mora — saldo de capital de créditos con atraso.
            </p>
          </div>
          <div className="h-68 w-full">
            <Line
              data={chMora1Data}
              options={{
                ...dualAxisOptions,
                scales: {
                  ...dualAxisOptions.scales,
                  y: {
                    position: 'left' as const,
                    ticks: { callback: (v: number | string) => 'Q' + (Number(v) / 1e6).toFixed(1) + 'M' },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfico 3: Mora >= 30 días (PAR 30) */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[#014F84]">3 · Mora a partir de 30 días</h3>
            <p className="text-xs text-slate-500">
              PAR30 — cartera en riesgo y clientes con atraso ≥ 30 días.
            </p>
          </div>
          <div className="h-68 w-full">
            <Line
              data={chMora30Data}
              options={{
                ...dualAxisOptions,
                scales: {
                  ...dualAxisOptions.scales,
                  y: {
                    position: 'left' as const,
                    ticks: { callback: (v: number | string) => 'Q' + (Number(v) / 1e6).toFixed(1) + 'M' },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfico 4: Colocación mensual */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#014F84]">4 · Colocación mensual</h3>
              <p className="text-xs text-slate-500">
                Monto desembolsado y número de créditos por mes de desembolso.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="coloc-tipo-sel" className="text-xs font-semibold text-slate-500">
                Tipo de crédito:
              </label>
              <select
                id="coloc-tipo-sel"
                value={colocTipo}
                onChange={(e) => setColocTipo(e.target.value as ColocTipo)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="CREDITO NUEVO">Crédito nuevo</option>
                <option value="RECURRENTE CON SALDO">Recurrente con saldo</option>
                <option value="RECURRENTE SIN SALDO">Recurrente sin saldo</option>
                <option value="REESTRUCTURA">Reestructura</option>
              </select>
            </div>
          </div>
          <div className="h-72 w-full">
            {chColocData && <Line data={chColocData} options={dualAxisOptions} />}
          </div>
          {placement && (
            <div className="mt-3 text-center text-xs text-slate-500 italic border-t border-slate-100 pt-2">
              Colocación acumulada en los {placement.cierres.length} cierres (
              {colocTipo === 'ALL' ? 'todos los tipos' : colocTipo}):{' '}
              <span className="font-bold text-slate-700">{fQ(placement.totalMonto)}</span> en{' '}
              <span className="font-bold text-slate-700">{fN(placement.totalNum)}</span> créditos ·
              cada mes toma los desembolsos de su propio cierre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
