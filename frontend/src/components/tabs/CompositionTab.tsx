import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Doughnut } from 'react-chartjs-2';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { CustomChartLegend } from '../common/CustomChartLegend';
import { CHART_PALETTE, fN, fQ } from '../../lib/formatters';
import type { KV } from '../../types/api';

export const CompositionTab: React.FC = () => {
  const { cierre, filters } = useDashboardStore();

  const compositionQuery = useQuery({
    queryKey: ['composition', cierre, filters],
    queryFn: () => api.portfolio.getComposition(cierre!, filters),
    enabled: Boolean(cierre),
  });

  if (compositionQuery.isLoading || !compositionQuery.data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
    );
  }

  const { prodCart, prodCli, moraProdCart, moraProdCli, saldoCart, saldoCli } =
    compositionQuery.data;

  const createDoughnutConfig = (items: KV[], formatter: (v: number) => string) => {
    const labels = items.map((x) => x[0]);
    const values = items.map((x) => x[1]);
    const total = values.reduce((a, b) => a + b, 0) || 1;

    return {
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '54%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: { label: string; parsed: number }) => {
                const pct = ((c.parsed / total) * 100).toFixed(1) + '%';
                return ` ${c.label}: ${formatter(c.parsed)} (${pct})`;
              },
            },
          },
        },
      },
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 5 · Cartera por producto */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">5 · Cartera por producto</h3>
          <p className="text-xs text-slate-500 mb-3">
            Participación del saldo de capital por producto.
          </p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(prodCart, fQ)} />
          </div>
        </div>
        <CustomChartLegend items={prodCart} formatter={fQ} />
      </div>

      {/* 5 · Clientes por producto */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">5 · Clientes por producto</h3>
          <p className="text-xs text-slate-500 mb-3">Participación de clientes por producto.</p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(prodCli, fN)} />
          </div>
        </div>
        <CustomChartLegend items={prodCli} formatter={fN} />
      </div>

      {/* 6 · Mora por producto — cartera */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">6 · Mora por producto — cartera</h3>
          <p className="text-xs text-slate-500 mb-3">
            Saldo en riesgo (mora ≥ 1 día) por producto.
          </p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(moraProdCart, fQ)} />
          </div>
        </div>
        <CustomChartLegend items={moraProdCart} formatter={fQ} />
      </div>

      {/* 6 · Mora por producto — clientes */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">6 · Mora por producto — clientes</h3>
          <p className="text-xs text-slate-500 mb-3">Clientes en mora (≥ 1 día) por producto.</p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(moraProdCli, fN)} />
          </div>
        </div>
        <CustomChartLegend items={moraProdCli} formatter={fN} />
      </div>

      {/* 7 · Cartera por bloque de saldo */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">7 · Cartera por bloque de saldo</h3>
          <p className="text-xs text-slate-500 mb-3">
            Distribución del saldo de capital por rangos.
          </p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(saldoCart, fQ)} />
          </div>
        </div>
        <CustomChartLegend items={saldoCart} formatter={fQ} />
      </div>

      {/* 7 · Clientes por bloque de saldo */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">7 · Clientes por bloque de saldo</h3>
          <p className="text-xs text-slate-500 mb-3">Distribución de clientes por rango de saldo.</p>
          <div className="h-56 relative">
            <Doughnut {...createDoughnutConfig(saldoCli, fN)} />
          </div>
        </div>
        <CustomChartLegend items={saldoCli} formatter={fN} />
      </div>
    </div>
  );
};
