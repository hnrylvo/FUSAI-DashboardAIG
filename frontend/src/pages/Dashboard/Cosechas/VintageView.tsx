import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { PreparedModel, VintageParams, VintageComputeResult, DetailRow } from './cosechasCore';
import {
  PAR_DEFS,
  cierreLabel,
  monthLabel,
  compute,
  kpis,
  autoCap,
  colorAt,
  textOn,
  gradCSS,
  curveColor,
  cellVal,
  detail,
  fQ,
  fQ2,
  fP,
  nf0,
} from './cosechasCore';

interface VintageViewProps {
  model: PreparedModel;
  params: VintageParams;
  onParamsChange: (updater: (prev: VintageParams) => VintageParams) => void;
  onHoverCell: (info: { title: string; body: string; x: number; y: number } | null) => void;
}

export const VintageView: React.FC<VintageViewProps> = ({
  model,
  params,
  onParamsChange,
  onHoverCell,
}) => {
  const [parKey, setParKey] = useState<'PAR1' | 'PAR30'>('PAR1');
  const [viewMode, setViewMode] = useState<'matrix' | 'curves'>('matrix');
  const [colorCap, setColorCap] = useState<number | null>(null);

  // Selection for drill-down
  const [selected, setSelected] = useState<{ g: number | null; col: number | null } | null>(null);
  const [dmode, setDmode] = useState<number>(params.measure === 'ever' ? 2 : 1);
  const [sortCol, setSortCol] = useState<{ k: string; d: number }>({ k: 'sal', d: -1 });

  // Computed results
  const result: VintageComputeResult = useMemo(
    () => compute(model, params),
    [model, params]
  );

  const kpisData = useMemo(() => kpis(model, params), [model, params]);
  const lastCierreIdx = model.cierres.length - 1;
  const lastCierre = model.cierres[lastCierreIdx] || '';

  const curPar = PAR_DEFS.find((d) => d.key === parKey)!;

  // Month options for "Cosechas desde"
  const monthOptions = useMemo(() => {
    const cms = model.loans.map((l) => l.cm);
    if (!cms.length) return [];
    const minM = Math.min(...cms);
    const maxM = Math.max(...cms);
    const opts: number[] = [];
    for (let m = minM; m <= maxM; m++) opts.push(m);
    return opts;
  }, [model]);

  // Handle cell click in Matrix or Curves
  const handleSelectCell = (g: number | null, col: number | null) => {
    setSelected({ g, col });
    if (col === null) {
      setDmode(3);
    } else {
      setDmode(params.measure === 'ever' ? 2 : 1);
    }
  };

  // Detail rows calculation
  const detailRows = useMemo(() => {
    if (!selected) return [];
    return detail(model, params, selected, curPar.min, dmode);
  }, [model, params, selected, curPar.min, dmode]);

  // Detail columns definition
  const DCOLS = [
    { k: 'ref', t: 'Referencia' },
    { k: 'name', t: 'Cliente' },
    { k: 'ag', t: 'Agencia' },
    { k: 'asO', t: 'Asesor colocación' },
    { k: 'asA', t: 'Asesor actual' },
    { k: 'pr', t: 'Producto' },
    { k: 'ga', t: 'Garantía' },
    { k: 'de', t: 'Destino' },
    { k: 'dp', t: 'Departamento' },
    { k: 'fd', t: 'Desembolso' },
    { k: 'mo', t: 'Monto otorgado', n: 1 },
    { k: 'sal', t: 'Saldo al corte', n: 1 },
    { k: 'dias', t: 'Días mora al corte', n: 1 },
    { k: 'mx', t: 'Máx. días mora', n: 1 },
    { k: 'fm', t: '1.er mes en mora', n: 1 },
    { k: 'sit', t: 'Situación actual' },
  ];

  const dAcc = (r: DetailRow, k: string): string | number => {
    const l = r.l;
    const D = model.store.dims;
    switch (k) {
      case 'ref':
        return l.ref;
      case 'name':
        return l.name;
      case 'ag':
        return D.agencia[l.d.agencia] || '';
      case 'asO':
        return D.asesor[l.asOrig] || '';
      case 'asA':
        return D.asesor[l.asAct] || '';
      case 'pr':
        return D.producto[l.d.producto] || '';
      case 'ga':
        return D.garantia[l.d.garantia] || '';
      case 'de':
        return D.destino[l.d.destino] || '';
      case 'dp':
        return D.depto[l.d.depto] || '';
      case 'fd':
        return l.fdes;
      case 'mo':
        return l.monto;
      case 'sal':
        return r.at ? r.at.saldo : -1;
      case 'dias':
        return r.at ? r.at.dias : -1;
      case 'mx':
        return r.mx;
      case 'fm':
        return r.firstMob == null ? 0 : r.firstMob;
      case 'sit':
        return r.vigente ? 'Vigente' : 'Salió de cartera';
      default:
        return '';
    }
  };

  const dText = (r: DetailRow, k: string): string => {
    const v = dAcc(r, k);
    if (k === 'fd') return String(v).slice(8, 10) + '/' + String(v).slice(5, 7) + '/' + String(v).slice(0, 4);
    if (k === 'sal') return r.at ? fQ2(Number(v)) : '—';
    if (k === 'dias') return r.at ? String(v) : '—';
    if (k === 'mo') return fQ2(Number(v));
    if (k === 'fm') return r.firstMob == null ? '—' : 'M' + r.firstMob;
    if (k === 'sit')
      return r.vigente
        ? `Vigente · ${r.lo.dias} d mora`
        : `Salió tras ${monthLabel(model.cm[r.lo.ci])}`;
    return String(v);
  };

  const sortedDetailRows = useMemo(() => {
    const rows = [...detailRows];
    const { k, d } = sortCol;
    rows.sort((a, b) => {
      const x = dAcc(a, k);
      const y = dAcc(b, k);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * d;
    });
    return rows;
  }, [detailRows, sortCol]);

  // Export detail table to Excel
  const handleExportDetail = () => {
    if (!sortedDetailRows.length) return;
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [DCOLS.map((c) => c.t)];

    sortedDetailRows.forEach((r) => {
      aoa.push(
        DCOLS.map((c) => {
          switch (c.k) {
            case 'mo':
              return r.l.monto;
            case 'sal':
              return r.at ? r.at.saldo : '';
            case 'dias':
              return r.at ? r.at.dias : '';
            case 'mx':
              return r.mx;
            case 'fm':
              return r.firstMob == null ? '' : 'M' + r.firstMob;
            default:
              return dText(r, c.k);
          }
        })
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `Detalle_Vintage_${curPar.key}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export complete Vintage workbook with all sheets
  const handleExportAll = () => {
    if (!result.groups.length) return;
    const wb = XLSX.utils.book_new();

    // 1. ParamSheet
    const kv: (string | number)[][] = [
      ['Reporte', 'Análisis de cosechas (Vintage) · Apoyo Integral Guatemala, S.A.'],
      ['Generado', new Date().toLocaleString('es-GT')],
      ['Cierres incluidos', model.cierres.map(cierreLabel).join(', ')],
      ['Agrupación de cosechas', { M: 'Mensual', Q: 'Trimestral', S: 'Semestral', A: 'Anual' }[params.grouping] || 'Mensual'],
      ['Cosechas desde', params.from == null ? 'Todas' : monthLabel(params.from)],
      ['Eje horizontal', params.axis === 'mob' ? 'Antigüedad M1…Mn' : 'Mes calendario de cierre'],
      ['Medida', params.measure === 'ever' ? 'Alguna vez en mora (acumulada)' : 'PAR al corte'],
      ['Asesor', params.asesorMode === 'orig' ? 'Colocación' : 'Actual'],
      ['PAR 1', 'mora ≥ 1 día'],
      ['PAR 30', 'mora > 30 días'],
    ];
    const wsParam = XLSX.utils.aoa_to_sheet(kv);
    wsParam['!cols'] = [{ wch: 26 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsParam, 'Parámetros');

    // 2. Matrix sheets (PAR1 Saldo, PAR1 Créditos, PAR30 Saldo, PAR30 Créditos)
    const addMatrixSheet = (p: 'PAR1' | 'PAR30', basis: 'saldo' | 'n', sheetName: string) => {
      const pDef = PAR_DEFS.find((d) => d.key === p)!;
      const cap = autoCap(basis, p, result, colorCap);
      const cellsMap = result.cells[p] || new Map();
      const totMap = result.total[p] || new Map();
      const aoa: (string | number)[][] = [
        [`AIG · Vintage ${pDef.label} · ${basis === 'saldo' ? 'Saldo de cartera' : 'Número de créditos'} · ${params.measure === 'ever' ? 'alguna vez en mora' : 'al corte'}`],
        [`Eje: ${params.axis === 'mob' ? 'antigüedad' : 'mes calendario'} · Escala 0%–${(cap * 100).toFixed(1)}%`],
        [],
        ['Cosecha', 'Créditos', 'Monto desembolsado (Q)', ...result.cols.map((c) => c.label)],
      ];

      result.groups.forEach((g) => {
        const row = cellsMap.get(g.key);
        const rVals: (string | number)[] = [g.label, g.n, g.monto];
        result.cols.forEach((c) => {
          const x = row?.get(c.key);
          const v = cellVal(x, basis);
          rVals.push(v == null ? '' : `${(v * 100).toFixed(1)}%`);
        });
        aoa.push(rVals);
      });

      const nAll = result.groups.reduce((s, g) => s + g.n, 0);
      const mAll = result.groups.reduce((s, g) => s + g.monto, 0);
      const totVals: (string | number)[] = ['Total', nAll, mAll];
      result.cols.forEach((c) => {
        const x = totMap.get(c.key);
        const v = cellVal(x, basis);
        totVals.push(v == null ? '' : `${(v * 100).toFixed(1)}%`);
      });
      aoa.push(totVals);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 20 }, ...result.cols.map(() => ({ wch: 9 }))];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addMatrixSheet('PAR1', 'saldo', 'PAR1 Saldo');
    addMatrixSheet('PAR1', 'n', 'PAR1 Créditos');
    addMatrixSheet('PAR30', 'saldo', 'PAR30 Saldo');
    addMatrixSheet('PAR30', 'n', 'PAR30 Créditos');

    // 3. Base sheet
    const baseAoa: (string | number)[][] = [
      [
        'Cosecha',
        params.axis === 'mob' ? 'Antigüedad (M)' : 'Cierre',
        'Créditos en el corte',
        'Saldo capital (Q)',
        'Créditos PAR1',
        'Saldo PAR1 (Q)',
        'Créditos PAR30',
        'Saldo PAR30 (Q)',
        '% PAR1 saldo',
        '% PAR1 créditos',
        '% PAR30 saldo',
        '% PAR30 créditos',
      ],
    ];

    result.groups.forEach((g) => {
      const m1 = result.cells.PAR1.get(g.key);
      const m30 = result.cells.PAR30.get(g.key);
      result.cols.forEach((c) => {
        const a = m1?.get(c.key);
        const b = m30?.get(c.key);
        if (!a) return;
        baseAoa.push([
          g.label,
          c.label,
          a.n,
          a.s,
          a.np,
          a.sp,
          b ? b.np : 0,
          b ? b.sp : 0,
          a.s ? Number((a.sp / a.s).toFixed(4)) : 0,
          a.n ? Number((a.np / a.n).toFixed(4)) : 0,
          b && b.s ? Number((b.sp / b.s).toFixed(4)) : 0,
          b && b.n ? Number((b.np / b.n).toFixed(4)) : 0,
        ]);
      });
    });

    const wsBase = XLSX.utils.aoa_to_sheet(baseAoa);
    XLSX.utils.book_append_sheet(wb, wsBase, 'Base cosechas');

    // 4. Detalle selección if active
    if (sortedDetailRows.length > 0) {
      const dAoa: (string | number)[][] = [DCOLS.map((c) => c.t)];
      sortedDetailRows.forEach((r) => {
        dAoa.push(
          DCOLS.map((c) => {
            switch (c.k) {
              case 'mo': return r.l.monto;
              case 'sal': return r.at ? r.at.saldo : '';
              case 'dias': return r.at ? r.at.dias : '';
              case 'mx': return r.mx;
              case 'fm': return r.firstMob == null ? '' : 'M' + r.firstMob;
              default: return dText(r, c.k);
            }
          })
        );
      });
      const wsDet = XLSX.utils.aoa_to_sheet(dAoa);
      XLSX.utils.book_append_sheet(wb, wsDet, 'Detalle selección');
    }

    XLSX.writeFile(wb, `Vintage_Cosechas_AIG_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper title for drill-down
  const getSelectedTitle = () => {
    if (!selected) return '';
    const grp =
      selected.g === null
        ? 'Todas las cosechas'
        : result.groups.find((g) => g.key === selected.g)?.label || '';
    let col = '';
    if (selected.col === null) {
      col = 'todos los cortes (hasta ' + cierreLabel(lastCierre) + ')';
    } else {
      col =
        params.axis === 'mob'
          ? 'antigüedad M' + selected.col
          : 'cierre ' + cierreLabel(model.cierres[selected.col] || '');
    }
    return `${grp} · ${col}`;
  };

  // Render SVG Curves
  const renderCurves = (basis: 'saldo' | 'n') => {
    const W = 960,
      H = 360,
      ml = 50,
      mr = 14,
      mt = 12,
      mb = 34;
    const nC = result.cols.length;
    const xs = (i: number) => ml + (nC <= 1 ? 0 : (i * (W - ml - mr)) / (nC - 1));

    const cellsMap = result.cells[parKey] || new Map();
    const totMap = result.total[parKey] || new Map();

    let mx = 0;
    const series = result.groups.map((g) => ({
      k: g.key,
      label: g.label,
      row: cellsMap.get(g.key),
    }));

    series.forEach((s) =>
      result.cols.forEach((c) => {
        const x = s.row?.get(c.key);
        const v = x && x.n >= 3 ? cellVal(x, basis) : null;
        if (v != null && v > mx) mx = v;
      })
    );

    const step = mx > 0.5 ? 0.1 : mx > 0.2 ? 0.05 : mx > 0.1 ? 0.02 : 0.01;
    const ymax = Math.max(step * 2, Math.ceil(mx / step) * step);
    const ys = (v: number) => mt + (H - mt - mb) * (1 - v / ymax);

    const gridLines = [];
    for (let v = 0; v <= ymax + 1e-9; v += step) {
      gridLines.push(
        <g key={v}>
          <line x1={ml} x2={W - mr} y1={ys(v)} y2={ys(v)} stroke="#e6ebf0" />
          <text x={ml - 8} y={ys(v) + 4} textAnchor="end" fontSize="11" fill="#7b8896">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      );
    }

    const every = Math.ceil(nC / 16);
    const xLabels = result.cols.map((c, i) => {
      if (i % every === 0) {
        return (
          <text key={c.key} x={xs(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#7b8896">
            {c.label}
          </text>
        );
      }
      return null;
    });

    const all = [
      ...series.map((s, idx) => ({ ...s, isTotal: false, idx })),
      { k: -999, label: 'Total', row: totMap, isTotal: true, idx: -1 },
    ];

    const pathsAndPoints = all.map((s) => {
      const col = s.isTotal ? '#1b2733' : curveColor(s.idx, series.length);
      let d = '';
      let open = false;
      const pts: React.ReactNode[] = [];

      result.cols.forEach((c, i) => {
        const x = s.row?.get(c.key);
        const v = x && x.n >= 3 ? cellVal(x, basis) : null;
        if (v == null || !x) {
          open = false;
          return;
        }
        const curX = x;
        const px = xs(i);
        const py = ys(v);
        d += (open ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
        open = true;

        pts.push(
          <g key={`${s.k}-${c.key}`}>
            <circle cx={px.toFixed(1)} cy={py.toFixed(1)} r="2.6" fill={col} stroke="#fff" strokeWidth="1.2" />
            <circle
              cx={px.toFixed(1)}
              cy={py.toFixed(1)}
              r="8"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelectCell(s.isTotal ? null : s.k, c.key)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const med = params.measure === 'ever' ? 'alguna vez en mora' : 'en mora al corte';
                onHoverCell({
                  title: `${s.label} · ${c.label}`,
                  body: `${curPar.label} (${med})<br>Saldo: ${fQ(curX.sp)} de ${fQ(curX.s)} → <b>${curX.s ? fP(curX.sp / curX.s) : '—'}</b><br>Créditos: ${curX.np} de ${curX.n} → <b>${fP(curX.np / curX.n)}</b>`,
                  x: rect.right + 10,
                  y: rect.top,
                });
              }}
              onMouseLeave={() => onHoverCell(null)}
            />
          </g>
        );
      });

      return (
        <g key={s.k}>
          <path
            d={d}
            fill="none"
            stroke={col}
            strokeWidth={s.isTotal ? 3 : 1.7}
            strokeDasharray={s.isTotal ? '6 4' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={s.isTotal ? 1 : 0.9}
          />
          {pts}
        </g>
      );
    });

    return (
      <>
        <svg className="curves" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Curvas de ${curPar.label} por cosecha`}>
          {gridLines}
          {xLabels}
          {pathsAndPoints}
        </svg>
        <div className="cleg">
          {series.map((s, i) => (
            <span key={s.k}>
              <i style={{ background: curveColor(i, series.length) }} />
              {s.label}
            </span>
          ))}
          <span>
            <i style={{ background: '#1b2733' }} />
            Total
          </span>
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          Color: de la cosecha más antigua (azul) a la más reciente (naranja). Clic en un punto para ver los créditos. Se omiten los puntos con menos de 3 créditos para evitar picos engañosos.
        </div>
      </>
    );
  };

  // Render Matrix Table
  const renderMatrix = (basis: 'saldo' | 'n') => {
    const cap = autoCap(basis, parKey, result, colorCap);
    const cellsMap = result.cells[parKey] || new Map();
    const totMap = result.total[parKey] || new Map();

    const nAll = result.groups.reduce((s, g) => s + g.n, 0);
    const mAll = result.groups.reduce((s, g) => s + g.monto, 0);

    return (
      <>
        <div className="mxwrap">
          <table className="mx">
            <thead>
              <tr>
                <th className="rl">Cosecha</th>
                <th>Créd.</th>
                <th>Desemb.</th>
                {result.cols.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.groups.map((g) => {
                const row = cellsMap.get(g.key);
                const isRowSelected = selected && selected.g === g.key && selected.col === null;
                return (
                  <tr key={g.key}>
                    <th
                      className={`rl ${isRowSelected ? 'sel' : ''}`}
                      title="Ver todos los créditos de la cosecha que han estado en mora"
                      onClick={() => handleSelectCell(g.key, null)}
                    >
                      {g.label}
                    </th>
                    <td className="meta">{g.n}</td>
                    <td className="meta">{fQ(g.monto)}</td>
                    {result.cols.map((c) => {
                      const x = row?.get(c.key);
                      const v = cellVal(x, basis);
                      const isCellSelected = selected && selected.g === g.key && selected.col === c.key;

                      if (v == null || !x) {
                        return (
                          <td key={c.key} className="c e">
                            —
                          </td>
                        );
                      }

                      const hx = colorAt(v / cap);
                      const tc = textOn(hx);

                      return (
                        <td
                          key={c.key}
                          className={`c ${isCellSelected ? 'sel' : ''}`}
                          style={{ background: `#${hx}`, color: `#${tc}` }}
                          onClick={() => handleSelectCell(g.key, c.key)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const med = params.measure === 'ever' ? 'alguna vez en mora' : 'en mora al corte';
                            onHoverCell({
                              title: `${g.label} · ${c.label}`,
                              body: `${curPar.label} (${med})<br>Saldo: ${fQ(x.sp)} de ${fQ(x.s)} → <b>${x.s ? fP(x.sp / x.s) : '—'}</b><br>Créditos: ${x.np} de ${x.n} → <b>${fP(x.np / x.n)}</b>`,
                              x: rect.right + 10,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => onHoverCell(null)}
                        >
                          {fP(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="tot">
                <th
                  className="rl"
                  title="Todas las cosechas"
                  onClick={() => handleSelectCell(null, null)}
                >
                  Total
                </th>
                <td className="meta">{nAll}</td>
                <td className="meta">{fQ(mAll)}</td>
                {result.cols.map((c) => {
                  const x = totMap.get(c.key);
                  const v = cellVal(x, basis);
                  const isCellSelected = selected && selected.g === null && selected.col === c.key;

                  if (v == null || !x) {
                    return (
                      <td key={c.key} className="c e">
                        —
                      </td>
                    );
                  }

                  const hx = colorAt(v / cap);
                  const tc = textOn(hx);

                  return (
                    <td
                      key={c.key}
                      className={`c ${isCellSelected ? 'sel' : ''}`}
                      style={{ background: `#${hx}`, color: `#${tc}` }}
                      onClick={() => handleSelectCell(null, c.key)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const med = params.measure === 'ever' ? 'alguna vez en mora' : 'en mora al corte';
                        onHoverCell({
                          title: `Total cosechas · ${c.label}`,
                          body: `${curPar.label} (${med})<br>Saldo: ${fQ(x.sp)} de ${fQ(x.s)} → <b>${x.s ? fP(x.sp / x.s) : '—'}</b><br>Créditos: ${x.np} de ${x.n} → <b>${fP(x.np / x.n)}</b>`,
                          x: rect.right + 10,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => onHoverCell(null)}
                    >
                      {fP(v)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="legend">
          <div>
            <div className="lgbar" style={{ background: gradCSS() }} />
            <div className="lgt">
              <span>0%</span>
              <span>{fP(cap / 2)}</span>
              <span>
                {fP(cap)}
                {colorCap == null ? ' o más (auto p95)' : ' o más'}
              </span>
            </div>
          </div>
          <span>Azul = cartera sana · naranja = deterioro</span>
        </div>
      </>
    );
  };

  return (
    <div id="vView" className="stack">
      {/* 1. Vintage Controls Card */}
      <section className="card">
        <div className="row">
          <div className="fld">
            <label htmlFor="selGrp">Agrupar cosechas</label>
            <select
              id="selGrp"
              value={params.grouping}
              onChange={(e) =>
                onParamsChange((p) => ({ ...p, grouping: e.target.value as any }))
              }
            >
              <option value="M">Mensual</option>
              <option value="Q">Trimestral</option>
              <option value="S">Semestral</option>
              <option value="A">Anual</option>
            </select>
          </div>

          <div className="fld">
            <label htmlFor="selFrom">Cosechas desde</label>
            <select
              id="selFrom"
              value={params.from == null ? '' : String(params.from)}
              onChange={(e) =>
                onParamsChange((p) => ({
                  ...p,
                  from: e.target.value === '' ? null : +e.target.value,
                }))
              }
            >
              <option value="">Todas (sin agrupar anteriores)</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label htmlFor="selAxis">Eje horizontal</label>
            <select
              id="selAxis"
              value={params.axis}
              onChange={(e) =>
                onParamsChange((p) => ({ ...p, axis: e.target.value as any }))
              }
            >
              <option value="mob">Antigüedad (M1, M2…)</option>
              <option value="cal">Mes calendario de cierre</option>
            </select>
          </div>

          <div className="fld">
            <label htmlFor="selMeas">Medida</label>
            <select
              id="selMeas"
              value={params.measure}
              onChange={(e) => {
                const meas = e.target.value as any;
                onParamsChange((p) => ({ ...p, measure: meas }));
                setDmode(meas === 'ever' ? 2 : 1);
              }}
            >
              <option value="point">PAR al corte</option>
              <option value="ever">Alguna vez en mora (acumulada)</option>
            </select>
          </div>

          <div className="fld">
            <label htmlFor="inCap">Tope de escala de color (%)</label>
            <input
              type="number"
              id="inCap"
              min="1"
              max="100"
              step="1"
              placeholder="Automático"
              value={colorCap == null ? '' : colorCap}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setColorCap(isNaN(val) || val <= 0 ? null : val);
              }}
            />
          </div>
        </div>
      </section>

      {/* 2. KPIs Row */}
      <section className="kpis">
        <div className="kpi">
          <div className="t">Cartera al {cierreLabel(lastCierre)}</div>
          <div className="n">{fQ(kpisData.s)}</div>
          <div className="s">{nf0.format(kpisData.n)} créditos vigentes (con filtros)</div>
        </div>

        <div className="kpi o">
          <div className="t">PAR 1 · saldo</div>
          <div className="n">{kpisData.s ? fP(kpisData.p.PAR1.s / kpisData.s) : '—'}</div>
          <div className="s">
            {fQ(kpisData.p.PAR1.s)} · {nf0.format(kpisData.p.PAR1.n)} créditos (
            {kpisData.n ? fP(kpisData.p.PAR1.n / kpisData.n) : '—'})
          </div>
        </div>

        <div className="kpi o">
          <div className="t">PAR 30 · saldo</div>
          <div className="n">{kpisData.s ? fP(kpisData.p.PAR30.s / kpisData.s) : '—'}</div>
          <div className="s">
            {fQ(kpisData.p.PAR30.s)} · {nf0.format(kpisData.p.PAR30.n)} créditos (
            {kpisData.n ? fP(kpisData.p.PAR30.n / kpisData.n) : '—'})
          </div>
        </div>

        <div className="kpi">
          <div className="t">Cosechas mostradas</div>
          <div className="n">{result.groups.length}</div>
          <div className="s">
            {result.cols.length}{' '}
            {params.axis === 'mob' ? 'columnas de antigüedad' : 'cierres'}
          </div>
        </div>
      </section>

      {/* 3. Toggles Bar */}
      <section className="bar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg">
            <button
              type="button"
              className={parKey === 'PAR1' ? 'on' : ''}
              onClick={() => setParKey('PAR1')}
            >
              PAR 1
            </button>
            <button
              type="button"
              className={parKey === 'PAR30' ? 'on' : ''}
              onClick={() => setParKey('PAR30')}
            >
              PAR 30
            </button>
          </div>

          <div className="seg o">
            <button
              type="button"
              className={viewMode === 'matrix' ? 'on' : ''}
              onClick={() => setViewMode('matrix')}
            >
              ▦ Matriz
            </button>
            <button
              type="button"
              className={viewMode === 'curves' ? 'on' : ''}
              onClick={() => setViewMode('curves')}
            >
              ⟋ Curvas
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn dark"
          onClick={handleExportAll}
          title="Exportar reporte completo de vintage a Excel (todas las matrices y parámetros)"
        >
          ⬇ Exportar a Excel
        </button>
      </section>

      {/* 4. Panels (Matrices or Curves) */}
      <section id="panels">
        {result.groups.length === 0 ? (
          <div className="card empty">Ningún crédito coincide con los filtros seleccionados.</div>
        ) : (
          <>
            {/* Basis 1: Saldo */}
            <div className="card" data-b="saldo">
              <h2>
                {curPar.label} por saldo de cartera ·{' '}
                {params.measure === 'ever' ? 'alguna vez en mora (acumulada)' : 'al corte'}
              </h2>
              <div className="sub">
                Saldo capital de los créditos en mora ÷ saldo capital de la cosecha en ese mes.{' '}
                {curPar.desc}. Clic en una celda para ver los créditos.
              </div>
              {viewMode === 'matrix' ? renderMatrix('saldo') : renderCurves('saldo')}
            </div>

            {/* Basis 2: Número de créditos */}
            <div className="card" data-b="n" style={{ marginTop: 16 }}>
              <h2>
                {curPar.label} por número de créditos ·{' '}
                {params.measure === 'ever' ? 'alguna vez en mora (acumulada)' : 'al corte'}
              </h2>
              <div className="sub">
                Créditos en mora ÷ créditos de la cosecha en ese mes. {curPar.desc}. Clic en una
                celda para ver los créditos.
              </div>
              {viewMode === 'matrix' ? renderMatrix('n') : renderCurves('n')}
            </div>
          </>
        )}
      </section>

      {/* 5. Drill-Down Detail Card (#detail) */}
      {selected && (
        <section className="card" id="detail">
          <div className="dhead">
            <div>
              <h2>Detalle de créditos · {curPar.label}</h2>
              <div className="sub" style={{ marginBottom: 4 }}>
                <b>{getSelectedTitle()}</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn dark" onClick={handleExportDetail}>
                ⬇ Exportar tabla a Excel
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSelected(null)}
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div className="radios" role="radiogroup">
            <label>
              <input
                type="radio"
                name="dm"
                value="1"
                checked={dmode === 1}
                onChange={() => setDmode(1)}
              />
              En mora en este corte
            </label>
            <label>
              <input
                type="radio"
                name="dm"
                value="2"
                checked={dmode === 2}
                onChange={() => setDmode(2)}
              />
              Alguna vez en mora y presentes en este corte
            </label>
            <label>
              <input
                type="radio"
                name="dm"
                value="3"
                checked={dmode === 3}
                onChange={() => setDmode(3)}
              />
              Alguna vez en mora hasta este corte (incluye los que ya salieron de cartera)
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span className="pill b">{nf0.format(sortedDetailRows.length)} créditos</span>{' '}
            <span className="pill r">
              Saldo al corte{' '}
              {fQ2(sortedDetailRows.reduce((s, r) => s + (r.at ? r.at.saldo : 0), 0))}
            </span>{' '}
            {sortedDetailRows.filter((r) => !r.vigente).length > 0 && (
              <span className="pill g">
                {sortedDetailRows.filter((r) => !r.vigente).length} ya no aparecen en el último cierre
              </span>
            )}
          </div>

          {sortedDetailRows.length > 0 ? (
            <div className="tablewrap">
              <table className="dt">
                <thead>
                  <tr>
                    {DCOLS.map((c) => (
                      <th
                        key={c.k}
                        className={c.n ? 'num' : ''}
                        onClick={() =>
                          setSortCol({
                            k: c.k,
                            d: sortCol.k === c.k ? -sortCol.d : 1,
                          })
                        }
                      >
                        {c.t}
                        {sortCol.k === c.k && (
                          <span className="ar">{sortCol.d > 0 ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDetailRows.slice(0, 1500).map((r, idx) => (
                    <tr key={r.l.ref || idx}>
                      {DCOLS.map((c) => {
                        let text = dText(r, c.k);
                        if (c.k === 'dias' && r.at) {
                          return (
                            <td key={c.k} className={c.n ? 'num' : ''}>
                              <span
                                className={`pill ${r.at.dias >= curPar.min ? 'r' : 'g'}`}
                              >
                                {text}
                              </span>
                            </td>
                          );
                        }
                        if (c.k === 'sit') {
                          return (
                            <td key={c.k} className={c.n ? 'num' : ''}>
                              <span className={`pill ${r.vigente ? 'b' : 'g'}`}>{text}</span>
                            </td>
                          );
                        }
                        return (
                          <td key={c.k} className={c.n ? 'num' : ''}>
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedDetailRows.length > 1500 && (
                <div className="small">
                  Se muestran los primeros 1,500 créditos; la exportación a Excel incluye todos.
                </div>
              )}
            </div>
          ) : (
            <div className="empty">No hay créditos para esta selección.</div>
          )}

          <div className="small" style={{ marginTop: 6 }}>
            “Días mora al corte” y “Saldo al corte” corresponden al cierre de la celda; “—” indica que el crédito no aparece en ese cierre. Los cierres solo incluyen créditos vigentes: un crédito que “salió de cartera” fue cancelado o castigado (el reporte no permite distinguirlo).
          </div>
        </section>
      )}
    </div>
  );
};
