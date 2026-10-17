import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  ChevronDown,
  HelpCircle,
  Layers,
  PieChart,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../api/client';
import { type DashboardTab, useDashboardStore } from '../store/useDashboardStore';
import { Header } from '../components/common/Header';
import { FilterBar } from '../components/common/FilterBar';
import { UploadModal } from '../components/common/UploadModal';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { CompositionTab } from '../components/tabs/CompositionTab';
import { RankingsTab } from '../components/tabs/RankingsTab';
import { OperationsTab } from '../components/tabs/OperationsTab';
import { RetentionTab } from '../components/tabs/RetentionTab';

const TABS: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen', label: 'Resumen & Tendencias', icon: <BarChart3 size={15} /> },
  { id: 'composicion', label: 'Composición', icon: <PieChart size={15} /> },
  { id: 'rankings', label: 'Rankings', icon: <Trophy size={15} /> },
  { id: 'operacion', label: 'Operación & Cobro', icon: <Layers size={15} /> },
  { id: 'retencion', label: 'Retención & Riesgo', icon: <RefreshCw size={15} /> },
];

export const DashboardPage: React.FC = () => {
  const { setMeta, activeTab, setActiveTab } = useDashboardStore();

  const metaQuery = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.portfolio.getMeta(),
  });

  useEffect(() => {
    if (metaQuery.data) {
      setMeta(metaQuery.data);
    }
  }, [metaQuery.data, setMeta]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <Header />

      {/* Global Filter Bar */}
      <FilterBar />

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 md:px-6 pt-3 sticky top-[125px] z-20 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all duration-150 cursor-pointer whitespace-nowrap relative',
                  isActive
                    ? 'bg-white text-[#014F84] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50',
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#F48437] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-5">
        {activeTab === 'resumen' && <OverviewTab />}
        {activeTab === 'composicion' && <CompositionTab />}
        {activeTab === 'rankings' && <RankingsTab />}
        {activeTab === 'operacion' && <OperationsTab />}
        {activeTab === 'retencion' && <RetentionTab />}

        {/* Criterios de cálculo y supuestos (Preserving original HTML note) */}
        <details className="mt-6 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden group">
          <summary className="p-4 cursor-pointer text-xs font-bold text-[#014F84] flex items-center justify-between hover:bg-slate-50 select-none transition-colors">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-[#014F84]" />
              <span>ℹ Criterios de cálculo y supuestos técnicos (clic para expandir)</span>
            </div>
            <ChevronDown
              size={16}
              className="text-slate-400 group-open:rotate-180 transition-transform duration-200"
            />
          </summary>
          <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed space-y-2 border-t border-slate-100">
            <p>
              <b>Cartera:</b> Suma de Saldo de Capital. <b>Clientes:</b> Códigos de cliente únicos
              (un cliente con 2 créditos cuenta una sola vez en los totales).
            </p>
            <p>
              <b>Mora total / PAR 1:</b> Saldo de capital y clientes con Días de Mora ≥ 1.{' '}
              <b>PAR 30:</b> Créditos con Días de Mora ≥ 30. (Cartera <i>en riesgo</i>: saldo
              completo del crédito con atraso, conforme al estándar bancario y de microfinanzas).
            </p>
            <p>
              <b>Colocación mensual:</b> En cada cierre se computan los créditos cuyo mes de
              desembolso coincide con el mes del corte de información. Refleja lo realmente
              colocado en ese mes (evita el sesgo por cancelaciones de meses previos).
            </p>
            <p>
              <b>Rango de atraso:</b> El filtro global utiliza tramos MECE independientes: al día,
              1–30, 31–60, 61–90, 91–180, 181–265 y &gt;265 días. (Los tramos de los rankings TOP
              y de la matriz de transición conservan sus propias definiciones de negocio).
            </p>
            <p>
              <b>Precobro:</b> Créditos con "Última Cuota Pagada = 0", al día, cuyo primer
              vencimiento estimado (según día de pago y fecha de desembolso) cae dentro de los
              próximos 30 días posteriores al cierre.
            </p>
            <p>
              <b>Deserción de clientes:</b> Clientes presentes en el cierre inicial, ausentes en el
              cierre final y en todos los cierres posteriores, que se encontraban al día en su
              última aparición registrada.
            </p>
            <p>
              <b>Transición de mora:</b> Identidad por código de cliente; una renovación de crédito
              no se considera cancelación. Se cataloga como "Cancelado" únicamente si el cliente no
              reaparece en ningún cierre posterior al final.
            </p>
          </div>
        </details>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 md:px-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <p className="max-w-3xl mx-auto">
          Apoyo Integral Guatemala, S.A. · Grupo FUSAI — Dashboard de gestión de cartera para
          Riesgos, Junta Directiva y entes de interés. Datos internos confidenciales.
        </p>
      </footer>

      {/* Dynamic XLSX Upload Modal */}
      <UploadModal />
    </div>
  );
};
