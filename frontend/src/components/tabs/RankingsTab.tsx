import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, X } from 'lucide-react';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { fN, fQ2 } from '../../lib/formatters';
import type { LoanRecord, RankingBucket } from '../../types/api';

const EMPTY_ROWS: LoanRecord[] = [];

interface RankingTableCardProps {
  title: string;
  description: string;
  bucket: RankingBucket;
  isMora?: boolean;
  filterKey: string;
}

const RankingTableCard: React.FC<RankingTableCardProps> = ({
  title,
  description,
  bucket,
  isMora = false,
  filterKey,
}) => {
  const { cierre, filters } = useDashboardStore();

  const rankingQuery = useQuery({
    queryKey: ['ranking', bucket, cierre, filters],
    queryFn: () => api.portfolio.getRanking(bucket, cierre!, filters, 1, 10),
    enabled: Boolean(cierre),
  });

  const data = rankingQuery.data;
  const rows = data?.rows ?? EMPTY_ROWS;
  const total = data?.total ?? 0;

  // Strict Limit of 10 Rows:
  // Strictly derive the isolated TOP 10 items, sorted in descending order by SALDO_CAPITAL (sc).
  const top10Rows = useMemo(() => {
    return [...rows]
      .sort((a, b) => (Number(b.sc) || 0) - (Number(a.sc) || 0))
      .slice(0, 10);
  }, [rows]);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col">
      {/* Locked Header: Title, Description & Stable Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-h-[36px]">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="h-6 flex items-center">
          {rankingQuery.isLoading && !data ? (
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full animate-pulse">
              Cargando...
            </span>
          ) : total > 0 ? (
            <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
              {total} {total === 1 ? 'crédito' : 'créditos'}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              0 créditos
            </span>
          )}
        </div>
      </div>

      {/* Table Wrapper: fits the 10 rows cleanly without inner vertical scrolling */}
      <div className="overflow-x-auto rounded-lg border border-slate-100 min-h-[415px] relative">
        <table className="w-full text-left text-xs border-collapse min-w-[600px]">
          <thead className="bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Agencia</th>
              <th className="py-2.5 px-3">Cliente</th>
              <th className="py-2.5 px-3 text-right">Saldo Capital</th>
              <th className="py-2.5 px-3">Producto</th>
              {isMora && <th className="py-2.5 px-3">Garantía</th>}
              {isMora && <th className="py-2.5 px-3 text-right">Días Atraso</th>}
              <th className="py-2.5 px-3">Municipio</th>
              <th className="py-2.5 px-3">Teléfono</th>
            </tr>
          </thead>
          {/* Keyed tbody forces clean unmount/remount of table body on filter changes */}
          <tbody key={`tbody-${bucket}-${filterKey}`} className="divide-y divide-slate-100">
            {rankingQuery.isLoading && !data ? (
              // Exactly 10 in-place skeleton rows
              [...Array(10)].map((_, i) => (
                <tr key={`skeleton-${bucket}-${i}-${filterKey}`} className="animate-pulse">
                  <td className="py-2.5 px-3 text-center">
                    <div className="w-5 h-5 mx-auto bg-slate-200 rounded-full" />
                  </td>
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
                  {isMora && (
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-16" />
                    </td>
                  )}
                  {isMora && (
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-10 ml-auto" />
                    </td>
                  )}
                  <td className="py-2.5 px-3">
                    <div className="h-4 bg-slate-200/70 rounded w-20" />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="h-4 bg-slate-200/70 rounded w-16" />
                  </td>
                </tr>
              ))
            ) : top10Rows.length === 0 ? (
              <tr key={`empty-${bucket}-${filterKey}`}>
                <td
                  colSpan={isMora ? 9 : 7}
                  className="py-28 text-center text-xs text-slate-400 italic"
                >
                  Sin registros para este filtro.
                </td>
              </tr>
            ) : (
              top10Rows.slice(0, 10).map((r: LoanRecord, idx: number) => {
                const creditoId = r.ref || r.cod || 'row';
                return (
                  <tr
                    key={`${creditoId}-${idx}-${filterKey}`}
                    className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                  >
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F48437] text-white text-[10px] font-bold">
                        {idx + 1}
                      </span>
                    </td>
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
                    {isMora && (
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {r.gar || '—'}
                      </td>
                    )}
                    {isMora && (
                      <td className="py-2 px-3 text-right font-bold text-[#d9534f] tabular-nums whitespace-nowrap">
                        {fN(r.dmora)}
                      </td>
                    )}
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

        {/* In-place non-blocking spinner overlay during filter refetch */}
        {rankingQuery.isFetching && !rankingQuery.isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-opacity">
            <div className="w-5 h-5 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export const RankingsTab: React.FC = () => {
  const [showBanner, setShowBanner] = useState(true);
  const { cierre, filters } = useDashboardStore();

  // Distinct filter key to force clean reset & isolation on filter change
  const filterKey = useMemo(() => {
    return `${cierre || ''}-${JSON.stringify(filters)}`;
  }, [cierre, filters]);

  return (
    <div className="space-y-4">
      {/* Informative banner (dismissible for current visit, reappears on return) */}
      {showBanner && (
        <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 border-l-4 border-l-[#F48437] text-xs text-slate-700 flex items-start justify-between gap-3 shadow-2xs transition-all duration-200">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="text-[#F48437] shrink-0 mt-0.5" />
            <div>
              Cada tabla muestra el <b>TOP 10 de créditos</b> del cierre seleccionado, ordenado por saldo
              de capital, respetando los filtros globales. Un cliente con dos créditos puede aparecer en
              más de una fila.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-700 hover:bg-orange-100/60 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Cerrar aviso"
            aria-label="Cerrar aviso informativo"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 8 · TOP cartera sana */}
      <RankingTableCard
        key={`sana-${filterKey}`}
        filterKey={filterKey}
        title="8 · TOP cartera sana (al día)"
        description="Mayores saldos de capital sin atraso."
        bucket="sana"
        isMora={false}
      />

      {/* 9 · TOP mora 1–30 días */}
      <RankingTableCard
        key={`b1-${filterKey}`}
        filterKey={filterKey}
        title="9 · TOP mora 1–30 días"
        description="Mayores saldos con atraso temprano."
        bucket="b1"
        isMora={true}
      />

      {/* 10 · TOP mora 31–90 días */}
      <RankingTableCard
        key={`b2-${filterKey}`}
        filterKey={filterKey}
        title="10 · TOP mora 31–90 días"
        description="Mayores saldos en mora media."
        bucket="b2"
        isMora={true}
      />

      {/* 11 · TOP mora 91–120 días */}
      <RankingTableCard
        key={`b3-${filterKey}`}
        filterKey={filterKey}
        title="11 · TOP mora 91–120 días"
        description="Mayores saldos en mora avanzada."
        bucket="b3"
        isMora={true}
      />

      {/* 12 · TOP mora > 120 días */}
      <RankingTableCard
        key={`b4-${filterKey}`}
        filterKey={filterKey}
        title="12 · TOP mora > 120 días"
        description="Mayores saldos en mora crítica."
        bucket="b4"
        isMora={true}
      />
    </div>
  );
};
