import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useDashboardStore } from '../../store/useDashboardStore';
import { LayoutWrapper } from '../../components/layout/LayoutWrapper';
import { OverviewSection } from './Overview/OverviewSection';
import { CompositionSection } from './Composition/CompositionSection';
import { RankingsSection } from './Rankings/RankingsSection';
import { OperationsSection } from './Operations/OperationsSection';
import { RetentionSection } from './Retention/RetentionSection';
import { CosechasSection } from './Cosechas/CosechasSection';

export const DashboardPage: React.FC = () => {
  const { setMeta, activeTab } = useDashboardStore();

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
    <LayoutWrapper>
      {/* Dynamic Tab Content */}
      <section className="space-y-6">
        {activeTab === 'resumen' && <OverviewSection />}
        {activeTab === 'composicion' && <CompositionSection />}
        {activeTab === 'rankings' && <RankingsSection />}
        {activeTab === 'operacion' && <OperationsSection />}
        {activeTab === 'retencion' && <RetentionSection />}
        {activeTab === 'cosechas' && <CosechasSection />}

        {/* Technical Criteria & Assumptions Accordion (only for main dashboard tabs, Cosechas has its own dedicated notes) */}
        {activeTab !== 'cosechas' && (
          <details className="mt-8 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden group">
          <summary className="p-4 cursor-pointer text-xs font-bold text-[#014F84] flex items-center justify-between hover:bg-slate-50 select-none transition-colors">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-[#014F84]" />
              <span>Criterios de cálculo y supuestos técnicos (clic para expandir)</span>
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
              <b>Precobro:</b> Créditos con &quot;Última Cuota Pagada = 0&quot;, al día, cuyo primer
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
              no se considera cancelación. Se cataloga como &quot;Cancelado&quot; únicamente si el cliente no
              reaparece en ningún cierre posterior al final.
            </p>
          </div>
        </details>
        )}
      </section>
    </LayoutWrapper>
  );
};

export default DashboardPage;
