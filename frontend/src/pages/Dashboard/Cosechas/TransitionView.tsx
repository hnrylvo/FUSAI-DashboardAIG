import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { PreparedModel, VintageParams, TransDetailRow } from './cosechasCore';
import {
  TRAMOS,
  transPairs,
  transitions,
  transDetail,
  tcColor,
  textOn,
  MIX,
  HUES,
  isCk,
  fQ,
  fQ2,
  fP,
  fK,
  nf0,
  cierreLabel,
  monthLabel,
} from './cosechasCore';

interface TransitionViewProps {
  model: PreparedModel;
  params: VintageParams;
  onHoverCell: (info: { title: string; body: string; x: number; y: number } | null) => void;
}

export const TransitionView: React.FC<TransitionViewProps> = ({
  model,
  params,
  onHoverCell,
}) => {
  const [horizon, setHorizon] = useState<number>(1);
  const [toPeriod, setToPeriod] = useState<number | null>(null);
  const [measureMode, setMeasureMode] = useState<'n' | 's'>('n');

  // Selection for drill-down
  const [tSel, setTSel] = useState<{
    i: number;
    j: number | 'up';
    ti: number | null;
  } | null>(null);

  const [tSort, setTSort] = useState<{ k: string; d: number }>({ k: 's0', d: -1 });

  const pairs = useMemo(() => transPairs(model, horizon), [model, horizon]);

  // Adjust toPeriod if horizon changes
  const effectiveTo = useMemo(() => {
    if (toPeriod != null && !pairs.some((p) => p[1] === toPeriod)) {
      return null;
    }
    return toPeriod;
  }, [toPeriod, pairs]);

  const transResult = useMemo(
    () => transitions(model, params, { h: horizon, to: effectiveTo }),
    [model, params, horizon, effectiveTo]
  );

  const pairLabel = (oi: number, ti: number) =>
    monthLabel(model.cm[oi]) + ' → ' + monthLabel(model.cm[ti]);

  const periodLabelText = () =>
    effectiveTo == null
      ? `acumulado de ${transResult.selPairs.length} período(s) de ${horizon} mes(es)`
      : pairLabel(model.byMonth.get(model.cm[effectiveTo] - horizon)!, effectiveTo);

  const tv = (c: { n: number; s: number }) => (measureMode === 'n' ? c.n : c.s);
  const tfmt = (c: { n: number; s: number }) =>
    measureMode === 'n' ? nf0.format(c.n) : fK(c.s);

  // KPIs
  const kpisStats = useMemo(() => {
    const m = transResult.total;
    const rt = (i: number) => m[i].reduce((a, c) => a + tv(c), 0);
    const up = (i: number) => {
      let s = 0;
      for (let j = i + 1; j <= 5; j++) s += tv(m[i][j]);
      return s;
    };
    const p = (a: number, b: number) => (b ? fP(a / b) : '—');

    const ex = { n: 0, s: 0 };
    const ex0 = { n: 0, s: 0 };
    for (let i = 1; i <= 5; i++) {
      ex.n += m[i][6].n;
      ex.s += m[i][6].s;
    }
    ex0.n = m[0][6].n;
    ex0.s = m[0][6].s;

    let r1 = 0;
    for (let j = 2; j <= 5; j++) r1 += tv(m[1][j]);

    let tot = 0;
    let tup = 0;
    for (let i = 0; i <= 5; i++) {
      tot += rt(i);
      tup += up(i);
    }

    return {
      alDiaMoraPct: p(up(0), rt(0)),
      roll1Pct: p(r1, rt(1)),
      empeoranTotPct: p(tup, tot),
      exN: nf0.format(ex.n),
      exS: fQ(ex.s),
      ex0N: nf0.format(ex0.n),
      ex0S: fQ(ex0.s),
    };
  }, [transResult, measureMode]);

  // Detail rows
  const detailRows = useMemo(() => {
    if (!tSel) return [];
    return transDetail(model, params, { h: horizon, to: effectiveTo }, tSel);
  }, [model, params, horizon, effectiveTo, tSel]);

  const TDCOLS = [
    { k: 'ref', t: 'Referencia' },
    { k: 'name', t: 'Cliente' },
    { k: 'ag', t: 'Agencia' },
    { k: 'asO', t: 'Asesor colocación' },
    { k: 'asA', t: 'Asesor actual' },
    { k: 'pr', t: 'Producto' },
    { k: 'ga', t: 'Garantía' },
    { k: 'de', t: 'Destino' },
    { k: 'dp', t: 'Departamento' },
    { k: 'coh', t: 'Cosecha' },
    { k: 'mo', t: 'Monto otorgado', n: 1 },
    { k: 'co', t: 'Cierre inicio' },
    { k: 'd0', t: 'Días mora inicio', n: 1 },
    { k: 't0', t: 'Tramo inicio' },
    { k: 'cd', t: 'Cierre final' },
    { k: 'd1', t: 'Días mora final', n: 1 },
    { k: 't1', t: 'Tramo final' },
    { k: 's0', t: 'Saldo inicio', n: 1 },
    { k: 's1', t: 'Saldo final', n: 1 },
    { k: 'dd', t: 'Δ días mora', n: 1 },
  ];

  const tAcc = (r: TransDetailRow, k: string): string | number => {
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
      case 'coh':
        return l.fdes.slice(0, 7);
      case 'mo':
        return l.monto;
      case 'co':
        return model.cierres[r.oi] || '';
      case 'cd':
        return model.cierres[r.ti] || '';
      case 'd0':
        return r.o0.dias;
      case 't0':
        return r.i;
      case 'd1':
        return r.o1 ? r.o1.dias : -1;
      case 't1':
        return r.j;
      case 's0':
        return r.o0.saldo;
      case 's1':
        return r.o1 ? r.o1.saldo : -1;
      case 'dd':
        return r.o1 ? r.o1.dias - r.o0.dias : -99999;
      default:
        return '';
    }
  };

  const tText = (r: TransDetailRow, k: string): string => {
    const v = tAcc(r, k);
    switch (k) {
      case 'coh':
        return monthLabel(Number(v ? +String(v).slice(0, 4) * 12 + +String(v).slice(5, 7) - 1 : 0));
      case 'co':
      case 'cd':
        return cierreLabel(String(v));
      case 'mo':
        return fQ2(Number(v));
      case 't0':
        return TRAMOS[Number(v)]?.label || '';
      case 't1':
        return Number(v) === 6 ? 'Salió de cartera' : TRAMOS[Number(v)]?.label || '';
      case 'd1':
        return r.o1 ? String(v) : '—';
      case 's0':
        return fQ2(Number(v));
      case 's1':
        return r.o1 ? fQ2(Number(v)) : '—';
      case 'dd':
        return r.o1 ? (Number(v) > 0 ? '+' : '') + v : '—';
      default:
        return String(v);
    }
  };

  const sortedDetailRows = useMemo(() => {
    const rows = [...detailRows];
    const { k, d } = tSort;
    rows.sort((a, b) => {
      const x = tAcc(a, k);
      const y = tAcc(b, k);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * d;
    });
    return rows;
  }, [detailRows, tSort]);

  const handleExportTDetail = () => {
    if (!sortedDetailRows.length) return;
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [TDCOLS.map((c) => c.t)];

    sortedDetailRows.forEach((r) => {
      aoa.push(
        TDCOLS.map((c) => {
          switch (c.k) {
            case 'mo':
              return r.l.monto;
            case 'd0':
              return r.o0.dias;
            case 'd1':
              return r.o1 ? r.o1.dias : '';
            case 's0':
              return r.o0.saldo;
            case 's1':
              return r.o1 ? r.o1.saldo : '';
            case 'dd':
              return r.o1 ? r.o1.dias - r.o0.dias : '';
            default:
              return tText(r, c.k);
          }
        })
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `Detalle_Transicion_${horizon}M_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportTrans = () => {
    if (!transResult.pairs.length) return;
    const wb = XLSX.utils.book_new();
    const m = transResult.total;
    const rt = (i: number) => m[i].reduce((a, c) => a + (measureMode === 'n' ? c.n : c.s), 0);

    // 1. ParamSheet
    const kv: (string | number)[][] = [
      ['Reporte', 'Matrices de transición de mora · Apoyo Integral Guatemala, S.A.'],
      ['Generado', new Date().toLocaleString('es-GT')],
      ['Horizonte', `${horizon} mes(es)`],
      ['Período', effectiveTo == null ? `Acumulado (${transResult.selPairs.length} períodos)` : `${cierreLabel(model.cierres[transResult.selPairs[0]?.[0] ?? 0])} → ${cierreLabel(model.cierres[effectiveTo])}`],
      ['Asesor', params.asesorMode === 'orig' ? 'Colocación' : 'Actual'],
      ['Tramos', TRAMOS.map((t) => `${t.label} = ${t.rango}`).join(' · ')],
      ['Nota', 'Salió de cartera = cancelación o castigo (los cierres solo traen créditos vigentes y no permiten distinguirlos).'],
    ];
    const wsParam = XLSX.utils.aoa_to_sheet(kv);
    wsParam['!cols'] = [{ wch: 18 }, { wch: 120 }];
    XLSX.utils.book_append_sheet(wb, wsParam, 'Parámetros');

    // 2. Matrix sheets (% fila, Créditos, Saldo inicio)
    const hdr = ['Tramo al inicio', 'Total inicio', ...TRAMOS.map((t) => t.label), 'Salió de cartera'];

    const buildMatSheet = (kind: 'pct' | 'n' | 's') => {
      const aoa: (string | number)[][] = [hdr];
      for (let i = 0; i <= 6; i++) {
        const T = i === 6 ? m[6].reduce((a, c) => a + (measureMode === 'n' ? c.n : c.s), 0) : rt(i);
        const rowVals: (string | number)[] = [
          i === 6 ? 'Nuevos créditos' : TRAMOS[i]?.label || '',
          T,
        ];
        for (let j = 0; j <= 6; j++) {
          const c = m[i][j];
          if (kind === 'pct') {
            if (!T || !c.n || (i === 6 && j === 6)) {
              rowVals.push('');
            } else {
              const val = measureMode === 'n' ? c.n : c.s;
              rowVals.push(`${((val / T) * 100).toFixed(1)}%`);
            }
          } else if (kind === 'n') {
            rowVals.push(c.n);
          } else {
            rowVals.push(c.s);
          }
        }
        aoa.push(rowVals);
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 20 }, { wch: 14 }, ...Array(7).fill({ wch: 13 })];
      return ws;
    };

    XLSX.utils.book_append_sheet(wb, buildMatSheet('pct'), measureMode === 'n' ? '% fila (créditos)' : '% fila (saldo)');
    XLSX.utils.book_append_sheet(wb, buildMatSheet('n'), 'Créditos');
    XLSX.utils.book_append_sheet(wb, buildMatSheet('s'), 'Saldo inicio (Q)');

    // 3. Evolución
    const all = [...transResult.byPair.entries()].sort((a, b) => a[0] - b[0]);
    const eh = ['Tramo al inicio', ...all.map(([ti]) => {
      const oi = model.byMonth.get(model.cm[ti] - horizon);
      return `${monthLabel(model.cm[oi ?? 0])} → ${monthLabel(model.cm[ti])}`;
    })];
    const ea: (string | number)[][] = [eh];
    for (let i = 0; i <= 4; i++) {
      const rVals: (string | number)[] = [TRAMOS[i]?.label || ''];
      all.forEach(([, mm]) => {
        const T = mm[i].reduce((a, c) => a + (measureMode === 'n' ? c.n : c.s), 0);
        let u = 0;
        for (let j = i + 1; j <= 5; j++) u += (measureMode === 'n' ? mm[i][j].n : mm[i][j].s);
        rVals.push(!T ? '' : `${((u / T) * 100).toFixed(1)}%`);
      });
      ea.push(rVals);
    }
    const wsE = XLSX.utils.aoa_to_sheet(ea);
    wsE['!cols'] = [{ wch: 18 }, ...all.map(() => ({ wch: 16 }))];
    XLSX.utils.book_append_sheet(wb, wsE, 'Evolución deterioro');

    // 4. Detalle selección if active
    if (sortedDetailRows.length > 0) {
      const dAoA: (string | number)[][] = [TDCOLS.map((c) => c.t)];
      sortedDetailRows.forEach((r) => {
        dAoA.push(
          TDCOLS.map((c) => {
            switch (c.k) {
              case 'mo': return r.l.monto;
              case 'd0': return r.o0.dias;
              case 'd1': return r.o1 ? r.o1.dias : '';
              case 's0': return r.o0.saldo;
              case 's1': return r.o1 ? r.o1.saldo : '';
              case 'dd': return r.o1 ? r.o1.dias - r.o0.dias : '';
              default: return tText(r, c.k);
            }
          })
        );
      });
      const wsDet = XLSX.utils.aoa_to_sheet(dAoA);
      XLSX.utils.book_append_sheet(wb, wsDet, 'Detalle selección');
    }

    XLSX.writeFile(wb, `Transicion_Mora_AIG_${horizon}M_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const tSelTitle = () => {
    if (!tSel) return '';
    const dest =
      tSel.j === 'up'
        ? 'un tramo peor'
        : tSel.j === 6
        ? 'salida de cartera (cancelación o castigo)'
        : TRAMOS[tSel.j]?.label || '';
    const orig =
      tSel.i === -1
        ? 'cualquier tramo (excepto >180)'
        : (TRAMOS[tSel.i]?.label || '') + ' (' + (TRAMOS[tSel.i]?.rango || '') + ')';
    const per =
      tSel.ti != null
        ? pairLabel(model.byMonth.get(model.cm[tSel.ti] - horizon)!, tSel.ti)
        : periodLabelText();
    return `${orig} → ${dest} · ${per}`;
  };

  if (!pairs.length) {
    return (
      <div id="tView" className="stack">
        <section className="card">
          <div className="row">
            <div className="fld">
              <label htmlFor="tH">Horizonte de comparación</label>
              <select
                id="tH"
                value={horizon}
                onChange={(e) => {
                  setHorizon(+e.target.value);
                  setToPeriod(null);
                  setTSel(null);
                }}
              >
                <option value="1">1 mes (contra el cierre anterior)</option>
                <option value="2">2 meses</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>
          </div>
        </section>
        <div className="card empty">
          No hay pares de cierres separados por {horizon} mes(es). Elija un horizonte menor o cargue más cierres.
        </div>
      </div>
    );
  }

  const m = transResult.total;
  const rt = (i: number) => m[i].reduce((a, c) => a + tv(c), 0);
  const TN = m[6].reduce((a, c) => a + tv(c), 0);
  const colT = (j: number) => {
    let s = 0;
    for (let i = 0; i <= 6; i++) s += tv(m[i][j]);
    return s;
  };
  let gt = 0;
  for (let j = 0; j <= 6; j++) gt += colT(j);

  // Evolution table calculations
  const allPairsSorted = [...transResult.byPair.entries()].sort((a, b) => a[0] - b[0]);
  const rowV = (mm: typeof m, i: number) => {
    const T = mm[i].reduce((a, c) => a + tv(c), 0);
    let u = 0;
    for (let j = i + 1; j <= 5; j++) u += tv(mm[i][j]);
    return T ? u / T : null;
  };
  const totV = (mm: typeof m) => {
    let T = 0;
    let u = 0;
    for (let i = 0; i <= 4; i++) {
      T += mm[i].reduce((a, c) => a + tv(c), 0);
      for (let j = i + 1; j <= 5; j++) u += tv(mm[i][j]);
    }
    T += mm[5].reduce((a, c) => a + tv(c), 0);
    return T ? u / T : null;
  };

  const evoVals: number[] = [];
  allPairsSorted.forEach(([, mm]) => {
    for (let i = 0; i <= 4; i++) {
      const v = rowV(mm, i);
      if (v != null) evoVals.push(v);
    }
  });
  evoVals.sort((a, b) => a - b);
  const evoP95 = evoVals.length
    ? evoVals[Math.min(evoVals.length - 1, Math.floor(evoVals.length * 0.95))]
    : 0.1;
  const evoCap = Math.max(0.05, Math.ceil(evoP95 * 20) / 20);

  return (
    <div id="tView" className="stack">
      {/* 1. Controls Card */}
      <section className="card">
        <div className="row">
          <div className="fld">
            <label htmlFor="tH">Horizonte de comparación</label>
            <select
              id="tH"
              value={horizon}
              onChange={(e) => {
                setHorizon(+e.target.value);
                setToPeriod(null);
                setTSel(null);
              }}
            >
              <option value="1">1 mes (contra el cierre anterior)</option>
              <option value="2">2 meses</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>

          <div className="fld">
            <label htmlFor="tTo">Período</label>
            <select
              id="tTo"
              value={effectiveTo == null ? '' : String(effectiveTo)}
              onChange={(e) => {
                setToPeriod(e.target.value === '' ? null : +e.target.value);
                setTSel(null);
              }}
            >
              <option value="">Acumulado (todos los períodos: {pairs.length})</option>
              {pairs
                .slice()
                .reverse()
                .map(([o, t]) => (
                  <option key={t} value={t}>
                    {pairLabel(o, t)}
                  </option>
                ))}
            </select>
          </div>

          <div className="fld">
            <span className="lb">Valor</span>
            <div className="seg">
              <button
                type="button"
                className={measureMode === 'n' ? 'on' : ''}
                onClick={() => setMeasureMode('n')}
              >
                Créditos
              </button>
              <button
                type="button"
                className={measureMode === 's' ? 'on' : ''}
                onClick={() => setMeasureMode('s')}
              >
                Saldo
              </button>
            </div>
          </div>

          <div className="fld" style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn dark"
              onClick={handleExportTrans}
              title="Exportar matrices de transición a Excel (todos los tramos, evolución y parámetros)"
            >
              ⬇ Exportar a Excel
            </button>
          </div>
        </div>

        <div className="sub" style={{ margin: '10px 0 0' }}>
          Cada crédito se compara entre dos cierres: el tramo de mora en que estaba al inicio contra el tramo en que quedó al final (o si salió de cartera). Los filtros de arriba aplican igual que en el vintage.
        </div>
      </section>

      {/* 2. Transition KPIs */}
      <section className="kpis" id="tKpis">
        <div className="kpi o">
          <div className="t">Al día que pasa a mora</div>
          <div className="n">{kpisStats.alDiaMoraPct}</div>
          <div className="s">
            de los {measureMode === 'n' ? 'créditos' : 'saldo'} “Al día” al inicio del período
          </div>
        </div>

        <div className="kpi o">
          <div className="t">1–30 que pasa a 31 o más</div>
          <div className="n">{kpisStats.roll1Pct}</div>
          <div className="s">tasa de roll del primer tramo</div>
        </div>

        <div className="kpi o">
          <div className="t">Empeoran (todos los tramos)</div>
          <div className="n">{kpisStats.empeoranTotPct}</div>
          <div className="s">créditos que subieron de tramo, sobre los vigentes al inicio</div>
        </div>

        <div className="kpi">
          <div className="t">Salieron estando en mora</div>
          <div className="n">{kpisStats.exN}</div>
          <div className="s">{kpisStats.exS} de saldo · cancelación o castigo (no distinguible)</div>
        </div>

        <div className="kpi">
          <div className="t">Salieron estando al día</div>
          <div className="n">{kpisStats.ex0N}</div>
          <div className="s">{kpisStats.ex0S} · probable cancelación normal</div>
        </div>
      </section>

      {/* 3. Transition Matrix Card (#tPanel) */}
      <section className="card" id="tPanel">
        <h2>
          Matriz de transición · {horizon} mes(es) · {periodLabelText()}
        </h2>
        <div className="sub">
          Filas = tramo de mora al inicio · columnas = tramo al final · % sobre el total de la fila (
          {measureMode === 'n' ? 'número de créditos' : 'saldo capital al inicio'}). Clic en las celdas con borde (empeoran o salen en mora) para ver los créditos.
          {measureMode === 's' && effectiveTo == null
            ? ' En el acumulado el saldo suma cada par de cierres: úselo para proporciones, no como monto.'
            : ''}
        </div>

        <div className="mxwrap">
          <table className="mx">
            <thead>
              <tr>
                <th className="rl">
                  Tramo al inicio ↓<small>destino →</small>
                </th>
                <th>
                  Total<small>inicio</small>
                </th>
                {TRAMOS.map((t) => (
                  <th key={t.label}>{t.label}</th>
                ))}
                <th title="Cancelación o castigo: el reporte de cartera vigente no permite distinguirlos">
                  Salió de cartera*
                </th>
                <th className="sep">Mejoran</th>
                <th>Igual</th>
                <th>Empeoran</th>
              </tr>
            </thead>
            <tbody>
              {/* Tramos 0-5 */}
              {TRAMOS.map((tr, i) => {
                const T = rt(i);
                let mej = 0;
                let emp = 0;
                for (let j = 0; j < i; j++) mej += tv(m[i][j]);
                for (let j = i + 1; j <= 5; j++) emp += tv(m[i][j]);

                return (
                  <tr key={tr.label}>
                    <th
                      className="rl"
                      style={{ cursor: i <= 4 ? 'pointer' : 'default' }}
                      title={i <= 4 ? 'Ver créditos de este tramo que empeoraron' : undefined}
                      onClick={() => {
                        if (i <= 4) setTSel({ i, j: 'up', ti: null });
                      }}
                    >
                      {tr.label}
                      <small>{tr.rango}</small>
                    </th>
                    <td className="meta">{measureMode === 'n' ? nf0.format(T) : fK(T)}</td>

                    {/* Columns 0-6 */}
                    {[0, 1, 2, 3, 4, 5, 6].map((j) => {
                      const c = m[i][j];
                      if (!T || !c.n) {
                        return (
                          <td key={j} className="tc e">
                            —
                          </td>
                        );
                      }
                      const pct = tv(c) / T;
                      const hx = tcColor(i, j, pct);
                      const ck = isCk(i, j);
                      const isSelected =
                        tSel && tSel.i === i && tSel.j === j && tSel.ti === null;

                      return (
                        <td
                          key={j}
                          className={`tc ${ck ? 'ck' : ''} ${isSelected ? 'sel' : ''}`}
                          style={{
                            background: `#${hx}`,
                            color: `#${textOn(hx)}`,
                          }}
                          onClick={() => {
                            if (ck) setTSel({ i, j, ti: null });
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const from = i === 6 ? 'Crédito nuevo' : TRAMOS[i].label;
                            const to = j === 6 ? 'Salió de cartera' : TRAMOS[j].label;
                            onHoverCell({
                              title: `${from} → ${to}`,
                              body: `${nf0.format(c.n)} créditos · saldo ${fQ(c.s)}<br><b>${
                                T ? fP(tv(c) / T) : '—'
                              }</b> de la fila${ck ? '<br><i>Clic para ver los créditos</i>' : ''}`,
                              x: rect.right + 10,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => onHoverCell(null)}
                        >
                          {fP(pct)}
                          <small>{tfmt(c)}</small>
                        </td>
                      );
                    })}

                    {/* Mejoran, Igual, Empeoran */}
                    <td className="sm">{T ? fP(mej / T) : '—'}</td>
                    <td className="sm">{T ? fP(tv(m[i][i]) / T) : '—'}</td>
                    <td
                      className={`sm emp ${
                        tSel && tSel.i === i && tSel.j === 'up' && tSel.ti === null ? 'sel' : ''
                      }`}
                      style={{ cursor: i <= 4 ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (i <= 4) setTSel({ i, j: 'up', ti: null });
                      }}
                    >
                      {T ? fP(emp / T) : '—'}
                    </td>
                  </tr>
                );
              })}

              {/* Nuevos Créditos */}
              <tr>
                <th className="rl">
                  Nuevos créditos<small>no existían al inicio</small>
                </th>
                <td className="meta">{measureMode === 'n' ? nf0.format(TN) : fK(TN)}</td>
                {[0, 1, 2, 3, 4, 5].map((j) => {
                  const c = m[6][j];
                  if (!TN || !c.n) {
                    return (
                      <td key={j} className="tc e">
                        —
                      </td>
                    );
                  }
                  const pct = tv(c) / TN;
                  const hx = tcColor(6, j, pct);
                  return (
                    <td
                      key={j}
                      className="tc"
                      style={{ background: `#${hx}`, color: `#${textOn(hx)}` }}
                    >
                      {fP(pct)}
                      <small>{tfmt(c)}</small>
                    </td>
                  );
                })}
                <td className="tc e">—</td>
                <td className="sm">—</td>
                <td className="sm">—</td>
                <td className="sm">—</td>
              </tr>

              {/* Total al Final Row */}
              <tr className="tot">
                <th className="rl">Total al final</th>
                <td className="meta">{measureMode === 'n' ? nf0.format(gt) : fK(gt)}</td>
                {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                  <td
                    key={j}
                    className="meta"
                    style={{ fontWeight: 700, color: 'var(--blue-d)' }}
                  >
                    {measureMode === 'n' ? nf0.format(colT(j)) : fK(colT(j))}
                  </td>
                ))}
                <td className="meta" />
                <td className="meta" />
                <td className="meta" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="chips">
          <span>
            <i style={{ background: `#${MIX(HUES.stay, 0.8)}` }} />
            Se mantiene
          </span>
          <span>
            <i style={{ background: `#${MIX(HUES.better, 0.8)}` }} />
            Mejora (baja de tramo)
          </span>
          <span>
            <i style={{ background: `#${MIX(HUES.up, 0.85)}` }} />
            Empeora (sube de tramo)
          </span>
          <span>
            <i style={{ background: `#${MIX(HUES.exit, 0.8)}` }} />
            Salió de cartera
          </span>
          <span>Intensidad = % de la fila</span>
        </div>

        <div className="warn">
          * <b>Salió de cartera</b> agrupa cancelaciones y castigos: los cierres solo traen créditos vigentes y no permiten separarlos. Como referencia, una salida desde “Al día” suele ser cancelación normal, y una salida desde 91 días o más suele ser castigo, pero es una inferencia, no un dato.
        </div>
      </section>

      {/* 4. Evolution Table Card (#tEvo) */}
      <section className="card" id="tEvo">
        <h2>Evolución mensual del deterioro · {horizon} mes(es)</h2>
        <div className="sub">
          % de cada tramo (al inicio de cada período) que subió a un tramo peor. Cada columna es un período “inicio → fin”. Clic en una celda para ver los créditos de ese período.
        </div>

        <div className="mxwrap">
          <table className="mx">
            <thead>
              <tr>
                <th className="rl">Tramo al inicio</th>
                {allPairsSorted.map(([ti]) => {
                  const oi = model.byMonth.get(model.cm[ti] - horizon)!;
                  return (
                    <th key={ti}>
                      {monthLabel(model.cm[oi])}
                      <small>→ {monthLabel(model.cm[ti])}</small>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Tramos 0 to 4 */}
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <th className="rl">
                    {TRAMOS[i].label}
                    <small>{TRAMOS[i].rango}</small>
                  </th>
                  {allPairsSorted.map(([ti, mm]) => {
                    const v = rowV(mm, i);
                    if (v == null) {
                      return (
                        <td key={ti} className="ev e">
                          —
                        </td>
                      );
                    }
                    const ratio = v / evoCap;
                    const hx = MIX(ratio > 0.8 ? HUES.upHi : HUES.up, Math.min(1, ratio) * 0.95);
                    const isSelected = tSel && tSel.i === i && tSel.ti === ti;

                    return (
                      <td
                        key={ti}
                        className={`ev ${isSelected ? 'sel' : ''}`}
                        style={{ background: `#${hx}`, color: `#${textOn(hx)}` }}
                        onClick={() => setTSel({ i, j: 'up', ti })}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const oi = model.byMonth.get(model.cm[ti] - horizon)!;
                          const T = mm[i].reduce((a, c) => a + tv(c), 0);
                          let u = 0;
                          for (let j = i + 1; j <= 5; j++) u += tv(mm[i][j]);
                          onHoverCell({
                            title: `${TRAMOS[i].label} · ${pairLabel(oi, ti)}`,
                            body: `Empeoran: ${measureMode === 'n' ? nf0.format(u) : fQ(u)} de ${
                              measureMode === 'n' ? nf0.format(T) : fQ(T)
                            } → <b>${T ? fP(u / T) : '—'}</b>`,
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
              ))}

              {/* Total Row */}
              <tr className="tot">
                <th className="rl" title="Todos los tramos juntos">
                  Todos los tramos
                </th>
                {allPairsSorted.map(([ti, mm]) => {
                  const v = totV(mm);
                  if (v == null) {
                    return (
                      <td key={ti} className="ev e">
                        —
                      </td>
                    );
                  }
                  const ratio = v / evoCap;
                  const hx = MIX(ratio > 0.8 ? HUES.upHi : HUES.up, Math.min(1, ratio) * 0.95);
                  const isSelected = tSel && tSel.i === -1 && tSel.ti === ti;

                  return (
                    <td
                      key={ti}
                      className={`ev ${isSelected ? 'sel' : ''}`}
                      style={{ background: `#${hx}`, color: `#${textOn(hx)}` }}
                      onClick={() => setTSel({ i: -1, j: 'up', ti })}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const oi = model.byMonth.get(model.cm[ti] - horizon)!;
                        let T = 0;
                        let u = 0;
                        [0, 1, 2, 3, 4, 5].forEach((ii) => {
                          mm[ii].forEach((c, jj) => {
                            T += tv(c);
                            if (jj > ii && jj <= 5) u += tv(c);
                          });
                        });
                        onHoverCell({
                          title: `Todos los tramos · ${pairLabel(oi, ti)}`,
                          body: `Empeoran: ${measureMode === 'n' ? nf0.format(u) : fQ(u)} de ${
                            measureMode === 'n' ? nf0.format(T) : fQ(T)
                          } → <b>${T ? fP(u / T) : '—'}</b>`,
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
            <div
              className="lgbar"
              style={{
                background: `linear-gradient(90deg,#fff,#${MIX(HUES.up, 0.95)},#${MIX(
                  HUES.upHi,
                  0.95
                )})`,
              }}
            />
            <div className="lgt">
              <span>0%</span>
              <span>{fP(evoCap / 2)}</span>
              <span>{fP(evoCap)} o más (auto p95)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Detail Table Card (#tdetail) */}
      {tSel && (
        <section className="card" id="tdetail">
          <div className="dhead">
            <div>
              <h2>Detalle de créditos que cambiaron de tramo</h2>
              <div className="sub" style={{ marginBottom: 4 }}>
                <b>{tSelTitle()}</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn dark" onClick={handleExportTDetail}>
                ⬇ Exportar tabla a Excel
              </button>
              <button type="button" className="btn ghost" onClick={() => setTSel(null)}>
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div style={{ margin: '6px 0 8px' }}>
            <span className="pill b">{nf0.format(sortedDetailRows.length)} movimientos</span>{' '}
            <span className="pill r">
              Saldo al inicio {fQ2(sortedDetailRows.reduce((s, r) => s + r.o0.saldo, 0))}
            </span>{' '}
            {sortedDetailRows.filter((r) => !r.o1).length > 0 ? (
              <span className="pill g">
                {sortedDetailRows.filter((r) => !r.o1).length} salieron de cartera · saldo al inicio{' '}
                {fQ2(
                  sortedDetailRows
                    .filter((r) => !r.o1)
                    .reduce((s, r) => s + r.o0.saldo, 0)
                )}
              </span>
            ) : (
              <span className="pill g">
                Saldo al final{' '}
                {fQ2(
                  sortedDetailRows.reduce((s, r) => s + (r.o1 ? r.o1.saldo : 0), 0)
                )}
              </span>
            )}
          </div>

          {sortedDetailRows.length > 0 ? (
            <div className="tablewrap">
              <table className="dt">
                <thead>
                  <tr>
                    {TDCOLS.map((c) => (
                      <th
                        key={c.k}
                        className={c.n ? 'num' : ''}
                        onClick={() =>
                          setTSort({
                            k: c.k,
                            d: tSort.k === c.k ? -tSort.d : 1,
                          })
                        }
                      >
                        {c.t}
                        {tSort.k === c.k && (
                          <span className="ar">{tSort.d > 0 ? '▲' : '▼'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDetailRows.slice(0, 1500).map((r, idx) => (
                    <tr key={`${r.l.ref}-${r.oi}-${r.ti}-${idx}`}>
                      {TDCOLS.map((c) => {
                        let text = tText(r, c.k);
                        if (c.k === 't0') {
                          return (
                            <td key={c.k} className={c.n ? 'num' : ''}>
                              <span className={`pill ${r.i === 0 ? 'b' : 'g'}`}>{text}</span>
                            </td>
                          );
                        }
                        if (c.k === 't1') {
                          return (
                            <td key={c.k} className={c.n ? 'num' : ''}>
                              <span className={`pill ${r.j === 6 ? 'g' : 'r'}`}>{text}</span>
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
                  Se muestran los primeros 1,500; la exportación incluye todos.
                </div>
              )}
            </div>
          ) : (
            <div className="empty">No hay créditos para esta selección.</div>
          )}

          <div className="small" style={{ marginTop: 6 }}>
            En el período acumulado un mismo crédito puede aparecer varias veces (una por cada mes en que subió de tramo). Los créditos que “salieron de cartera” fueron cancelados o castigados; el reporte no permite distinguirlo.
          </div>
        </section>
      )}
    </div>
  );
};
