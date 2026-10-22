import React from 'react';
import clsx from 'clsx';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { Card } from '../../../components/ui/Card';
import { cLabel, fQ, fQ2 } from '../../../utils/formatters';
import type { AttritionRecord, MtxCell, MtxColKey, MtxRowKey } from '../../../types/api';

const EMPTY_ATTRITION: AttritionRecord[] = [];

const BUCKET_LABELS: Record<string, string> = {
  dia: 'Al día',
  b1: '1–30',
  b2: '31–90',
  b3: '91–120',
  b4: '>120',
  nuevo: 'Nuevo/Reingreso',
  cancel: 'Cancelado',
};

export const RetentionSection: React.FC = () => {
  const {
    meta,
    desDe,
    desA,
    setDesRange,
    mtxDe,
    mtxA,
    setMtxRange,
    mtxMode,
    setMtxMode,
  } = useDashboardStore();

  const { attritionQuery, transitionQuery } = usePortfolioData();

  const cierres = meta?.cierres.map((c) => c.cierre).sort() || [];

  const attritionData = attritionQuery.data;
  const attritionRows =
    attritionData && attritionData.valid && attritionData.rows
      ? attritionData.rows
      : EMPTY_ATTRITION;
  const matrixData = transitionQuery.data;

  return (
    <div className="space-y-4">
      {/* 16 · Deserción de clientes */}
      <Card
        title="16 · Deserción de clientes"
        description="Clientes que salieron de la cartera estando al día en su último crédito (no reingresaron después)."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Salidas entre</span>
            <select
              value={desDe || ''}
              onChange={(e) => setDesRange(e.target.value, desA || '')}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
            >
              {cierres.map((c) => (
                <option key={c} value={c}>
                  {cLabel(c)}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-bold">→</span>
            <select
              value={desA || ''}
              onChange={(e) => setDesRange(desDe || '', e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
            >
              {cierres.map((c) => (
                <option key={c} value={c}>
                  {cLabel(c)}
                </option>
              ))}
            </select>
            {attritionRows.length > 0 && (
              <span className="text-[11px] font-bold text-[#014F84] bg-slate-100 px-2.5 py-0.5 rounded-full ml-1">
                {attritionRows.length} {attritionRows.length === 1 ? 'cliente' : 'clientes'}
              </span>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-100 relative">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
              <tr>
                <th className="py-2.5 px-3">Agencia</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3 text-right">Capital Otorgado</th>
                <th className="py-2.5 px-3">Producto</th>
                <th className="py-2.5 px-3">Municipio</th>
                <th className="py-2.5 px-3">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attritionQuery.isLoading && !attritionData ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-att-${i}`} className="animate-pulse">
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-32" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-24 ml-auto" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-24" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-20" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-4 bg-slate-200/70 rounded w-16" />
                    </td>
                  </tr>
                ))
              ) : !attritionData || !attritionData.valid ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center text-xs text-slate-400 italic">
                    Selecciona un rango válido (inicio anterior al final).
                  </td>
                </tr>
              ) : attritionRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center text-xs text-slate-400 italic">
                    Sin deserciones al día en el rango seleccionado.
                  </td>
                </tr>
              ) : (
                attritionRows.map((r: AttritionRecord, idx: number) => (
                  <tr
                    key={r.cod ? r.cod : idx}
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
                      {fQ2(r.moAgg)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {r.prod || '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                      {r.mun || '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600 tabular-nums">
                      {r.tel || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {attritionQuery.isFetching && !attritionQuery.isLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-opacity">
              <div className="w-5 h-5 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </Card>

      {/* 17 · Transición de mora (matriz de rodamiento) */}
      <Card
        title="17 · Transición de mora (matriz de rodamiento)"
        description="Movimiento de clientes entre tramos de mora entre dos cierres. Un crédito que salió y reingresó no se cuenta como cancelación."
        action={
          <div className="flex items-center flex-wrap gap-2">
            <select
              value={mtxDe || ''}
              onChange={(e) => setMtxRange(e.target.value, mtxA || '')}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
            >
              {cierres.map((c) => (
                <option key={c} value={c}>
                  {cLabel(c)}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-bold">→</span>
            <select
              value={mtxA || ''}
              onChange={(e) => setMtxRange(mtxDe || '', e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#014F84]"
            >
              {cierres.map((c) => (
                <option key={c} value={c}>
                  {cLabel(c)}
                </option>
              ))}
            </select>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 ml-2">
              <button
                type="button"
                onClick={() => setMtxMode('cli')}
                className={clsx(
                  'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                  mtxMode === 'cli'
                    ? 'bg-white text-[#014F84] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                Clientes
              </button>
              <button
                type="button"
                onClick={() => setMtxMode('monto')}
                className={clsx(
                  'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                  mtxMode === 'monto'
                    ? 'bg-white text-[#014F84] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                Saldo Q
              </button>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-100 min-h-[380px] relative">
          {transitionQuery.isLoading && !matrixData ? (
            <div className="min-h-[380px] flex flex-col items-center justify-center p-8 text-xs text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
              <span>Cargando matriz...</span>
            </div>
          ) : !matrixData || !matrixData.valid ? (
            <div className="min-h-[380px] flex items-center justify-center p-8 text-xs text-slate-400 italic">
              Selecciona un rango válido.
            </div>
          ) : (
            (() => {
              const { rowKeys, colKeys, cells } = matrixData;
              const formatCell = (cell: MtxCell) =>
                mtxMode === 'cli'
                  ? cell.n > 0
                    ? cell.n
                    : '—'
                  : cell.m > 0
                    ? fQ(cell.m)
                    : '—';

              return (
                <table className="w-full text-center text-xs border-collapse min-w-[700px]">
                  <thead className="sticky top-0 z-10 bg-[#014F84] text-white uppercase text-[10.5px] tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3 text-left">
                        {cLabel(mtxDe || '')} →
                        <br />
                        {cLabel(mtxA || '')} ↓
                      </th>
                      {colKeys.map((c: MtxColKey) => (
                        <th key={c} className="py-2.5 px-3 whitespace-nowrap">
                          {BUCKET_LABELS[c]}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 bg-[#023e68]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rowKeys.map((rk: MtxRowKey) => {
                      let rowN = 0;
                      let rowM = 0;

                      return (
                        <tr key={rk} className="hover:bg-slate-50 transition-colors">
                          <th className="py-2.5 px-3 text-left font-bold text-[#014F84] bg-slate-50/70 whitespace-nowrap">
                            {BUCKET_LABELS[rk]}
                          </th>
                          {colKeys.map((ck: MtxColKey) => {
                            const cell = cells[rk][ck];
                            rowN += cell.n;
                            rowM += cell.m;
                            const isDiagonal = (rk as string) === (ck as string);
                            const isCancel = ck === 'cancel';

                            return (
                              <td
                                key={ck}
                                className={clsx(
                                  'py-2 px-3 border border-slate-100 tabular-nums whitespace-nowrap',
                                  isDiagonal && 'bg-emerald-50 text-emerald-800 font-extrabold',
                                  isCancel && 'bg-rose-50 text-rose-800 font-medium',
                                )}
                              >
                                {formatCell(cell)}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 font-extrabold bg-slate-50 text-slate-800 tabular-nums whitespace-nowrap">
                            {mtxMode === 'cli'
                              ? rowN > 0
                                ? rowN
                                : '—'
                              : rowM > 0
                                ? fQ(rowM)
                                : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Column Totals Row */}
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
                      <th className="py-2.5 px-3 text-left text-[#014F84]">Total</th>
                      {colKeys.map((ck: MtxColKey) => {
                        let colN = 0;
                        let colM = 0;
                        rowKeys.forEach((rk: MtxRowKey) => {
                          colN += cells[rk][ck].n;
                          colM += cells[rk][ck].m;
                        });

                        return (
                          <td
                            key={ck}
                            className="py-2.5 px-3 text-slate-800 tabular-nums whitespace-nowrap"
                          >
                            {mtxMode === 'cli'
                              ? colN > 0
                                ? colN
                                : '—'
                              : colM > 0
                                ? fQ(colM)
                                : '—'}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 bg-slate-200/60" />
                    </tr>
                  </tbody>
                </table>
              );
            })()
          )}

          {transitionQuery.isFetching && !transitionQuery.isLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-opacity">
              <div className="w-5 h-5 border-2 border-[#014F84]/20 border-t-[#014F84] rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="mt-3 text-center text-xs text-slate-500 italic border-t border-slate-100 pt-2">
          Diagonal (verde) = permanencia en el mismo tramo. Columna "Cancelado" (rojo) = clientes que
          salieron sin reingresar. Valores en{' '}
          <span className="font-semibold text-slate-700">
            {mtxMode === 'cli' ? 'número de clientes' : 'saldo de capital al cierre final'}
          </span>
          .
        </div>
      </Card>
    </div>
  );
};
