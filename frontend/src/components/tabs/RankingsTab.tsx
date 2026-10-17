import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import { fN, fQ2 } from '../../lib/formatters';
import type { LoanRecord, RankingBucket } from '../../types/api';

interface RankingTableCardProps {
  title: string;
  description: string;
  bucket: RankingBucket;
  isMora?: boolean;
}

const RankingTableCard: React.FC<RankingTableCardProps> = ({
  title,
  description,
  bucket,
  isMora = false,
}) => {
  const { cierre, filters } = useDashboardStore();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rankingQuery = useQuery({
    queryKey: ['ranking', bucket, cierre, filters, page],
    queryFn: () => api.portfolio.getRanking(bucket, cierre!, filters, page, pageSize),
    enabled: Boolean(cierre),
  });

  const data = rankingQuery.data;
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#014F84]">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {total > 0 && (
          <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full">
            {total} {total === 1 ? 'crédito' : 'créditos'}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100 max-h-[460px]">
        {rankingQuery.isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando créditos...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            Sin registros para este filtro.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
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
            <tbody className="divide-y divide-slate-100">
              {rows.map((r: LoanRecord) => (
                <tr
                  key={r.ref || `${r.cod}-${r.rank}`}
                  className="hover:bg-sky-50/50 transition-colors even:bg-slate-50/50 text-slate-700"
                >
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F48437] text-white text-[10px] font-bold">
                      {r.rank}
                    </span>
                  </td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const RankingsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Informative banner matching original */}
      <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 border-l-4 border-l-[#F48437] text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs">
        <Info size={16} className="text-[#F48437] shrink-0 mt-0.5" />
        <div>
          Cada tabla muestra el <b>TOP 10 de créditos</b> del cierre seleccionado, ordenado por saldo
          de capital, respetando los filtros globales. Un cliente con dos créditos puede aparecer en
          más de una fila.
        </div>
      </div>

      {/* 8 · TOP cartera sana */}
      <RankingTableCard
        title="8 · TOP cartera sana (al día)"
        description="Mayores saldos de capital sin atraso."
        bucket="sana"
        isMora={false}
      />

      {/* 9 · TOP mora 1–30 días */}
      <RankingTableCard
        title="9 · TOP mora 1–30 días"
        description="Mayores saldos con atraso temprano."
        bucket="b1"
        isMora={true}
      />

      {/* 10 · TOP mora 31–90 días */}
      <RankingTableCard
        title="10 · TOP mora 31–90 días"
        description="Mayores saldos en mora media."
        bucket="b2"
        isMora={true}
      />

      {/* 11 · TOP mora 91–120 días */}
      <RankingTableCard
        title="11 · TOP mora 91–120 días"
        description="Mayores saldos en mora avanzada."
        bucket="b3"
        isMora={true}
      />

      {/* 12 · TOP mora > 120 días */}
      <RankingTableCard
        title="12 · TOP mora > 120 días"
        description="Mayores saldos en mora crítica."
        bucket="b4"
        isMora={true}
      />
    </div>
  );
};
