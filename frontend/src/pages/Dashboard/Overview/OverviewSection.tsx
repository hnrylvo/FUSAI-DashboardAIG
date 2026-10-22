import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Users,
} from 'lucide-react';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Card } from '../../../components/ui/Card';
import { CarteraTrendChart } from '../../../components/charts/CarteraTrendChart';
import { MoraTrendChart } from '../../../components/charts/MoraTrendChart';
import { ColocacionChart } from '../../../components/charts/ColocacionChart';
import { cLabel, fN, fPct, fQ } from '../../../utils/formatters';
import type { ColocTipo } from '../../../types/api';

export const OverviewSection: React.FC = () => {
  const { colocTipo, setColocTipo } = useDashboardStore();
  const { overviewQuery, placementQuery } = usePortfolioData();

  if (overviewQuery.isLoading || !overviewQuery.data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
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

  // Delta calculations matching original calculations
  let dCart = '';
  let dCartTrend: 'up' | 'down' | 'flat' = 'flat';
  if (kpis.prevCartera != null && kpis.prevCierre) {
    const dv = kpis.cartera - kpis.prevCartera;
    dCartTrend = dv >= 0 ? 'down' : 'up';
    dCart = `${dv >= 0 ? '▲ ' : '▼ '}${fQ(Math.abs(dv))} vs ${cLabel(kpis.prevCierre)}`;
  }

  const trendLabels = trends.cierres.map(cLabel);

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
          icon={<Briefcase size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="Clientes activos"
          value={fN(kpis.nCli)}
          detail={`${kpis.nCreditos} créditos`}
          trend="flat"
          accent="orange"
          icon={<Users size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="PAR 1 (mora total)"
          value={fPct(kpis.cartera ? kpis.par1 / kpis.cartera : 0)}
          detail={`${fQ(kpis.par1)} · ${fN(kpis.cliMora)} cli`}
          trend={kpis.cartera && kpis.par1 / kpis.cartera > 0.15 ? 'up' : 'down'}
          accent="red"
          icon={<AlertTriangle size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="PAR 30"
          value={fPct(kpis.cartera ? kpis.par30 / kpis.cartera : 0)}
          detail={fQ(kpis.par30)}
          trend={kpis.cartera && kpis.par30 / kpis.cartera > 0.1 ? 'up' : 'down'}
          accent="red"
          icon={<Clock size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="Ticket promedio"
          value={fQ(kpis.ticket)}
          detail="saldo / cliente"
          trend="flat"
          accent="navy"
          icon={<Target size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="Créditos al día"
          value={fN(kpis.alDia)}
          detail={`${fPct(kpis.nCreditos ? kpis.alDia / kpis.nCreditos : 0)} del total`}
          trend="down"
          accent="green"
          icon={<CheckCircle2 size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="Mora crítica >120d"
          value={fN(kpis.criticaN)}
          detail={fQ(kpis.criticaMonto)}
          trend="up"
          accent="red"
          icon={<AlertOctagon size={15} strokeWidth={2} />}
        />
        <KpiCard
          label="Cuota mensual esperada"
          value={fQ(kpis.cuotaTotal)}
          detail="suma de cuotas"
          trend="flat"
          accent="orange"
          icon={<Calendar size={15} strokeWidth={2} />}
        />
      </div>

      {/* Grid de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Cartera y clientes */}
        <Card
          className="lg:col-span-2"
          title="1 · Comportamiento de cartera y clientes"
          description="Evolución mensual del saldo de capital y número de clientes activos."
        >
          <div className="h-72 w-full">
            <CarteraTrendChart
              labels={trendLabels}
              cartera={trends.cartera}
              ncli={trends.ncli}
            />
          </div>
        </Card>

        {/* Gráfico 2: Mora total */}
        <Card
          title="2 · Mora total (≥ 1 día)"
          description="Cartera en riesgo y clientes en mora — saldo de capital de créditos con atraso."
        >
          <div className="h-68 w-full">
            <MoraTrendChart
              labels={trendLabels}
              monto={trends.par1m}
              clientes={trends.par1c}
              montoLabel="Cartera en mora (Q)"
              clientesLabel="Clientes en mora"
              accentColor="#F48437"
              fillColor="rgba(244,132,55,0.10)"
            />
          </div>
        </Card>

        {/* Gráfico 3: Mora >= 30 días (PAR 30) */}
        <Card
          title="3 · Mora a partir de 30 días"
          description="PAR30 — cartera en riesgo y clientes con atraso ≥ 30 días."
        >
          <div className="h-68 w-full">
            <MoraTrendChart
              labels={trendLabels}
              monto={trends.par30m}
              clientes={trends.par30c}
              montoLabel="Cartera mora ≥30 (Q)"
              clientesLabel="Clientes mora ≥30"
              accentColor="#d9534f"
              fillColor="rgba(217,83,79,0.10)"
            />
          </div>
        </Card>

        {/* Gráfico 4: Colocación mensual */}
        <Card
          className="lg:col-span-2"
          title="4 · Colocación mensual"
          description="Monto desembolsado y número de créditos por mes de desembolso."
          action={
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
          }
        >
          <div className="h-72 w-full">
            {placement && (
              <ColocacionChart
                labels={placement.cierres.map(cLabel)}
                monto={placement.monto}
                num={placement.num}
              />
            )}
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
        </Card>
      </div>
    </div>
  );
};
