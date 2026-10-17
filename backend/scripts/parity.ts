/**
 * TEST DE PARIDAD
 * ----------------
 * Ejecuta el <script> ORIGINAL de Dashboard_Cartera_AIG.html dentro de una VM de
 * Node (con DOM y Chart.js simulados) y compara, widget por widget, sus salidas
 * contra el motor nuevo de `src/engine`. Cualquier diferencia —un centavo, un
 * orden de filas, una celda de la matriz— hace fallar el test.
 *
 *   npm run test:parity
 */
process.env.TZ ||= 'America/Guatemala';
process.env.JWT_SECRET ||= 'parity-test';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(here, '../../Dashboard_Cartera_AIG.html');

const E = await import('../src/engine/index.js');
const { loadSeedFromHtml } = await import('../src/data/store.js');

/* ------------------------- Sandbox del original ------------------------ */
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const original = scripts[scripts.length - 1][1];

class FakeEl {
  innerHTML = '';
  textContent = '';
  value = '';
  className = '';
  checked = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {} };
  constructor(public id = '') {}
  addEventListener() {}
  appendChild() {}
  querySelector() {
    return new FakeEl();
  }
  querySelectorAll() {
    return [];
  }
  getContext() {
    return { canvasId: this.id };
  }
}
const els = new Map<string, FakeEl>();
const el = (sel: string) => {
  const id = sel.replace(/^#/, '');
  if (!els.has(id)) els.set(id, new FakeEl(id));
  return els.get(id)!;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const charts: Record<string, any> = {};
function Chart(this: unknown, ctx: { canvasId: string }, cfg: unknown) {
  charts[ctx.canvasId] = cfg;
}
Chart.prototype.destroy = () => {};
(Chart as unknown as { defaults: unknown }).defaults = { font: {}, color: '' };

const sandbox: Record<string, unknown> = {
  console,
  Chart,
  XLSX: {},
  prompt: () => null,
  setTimeout: () => 0,
  document: {
    querySelector: el,
    getElementById: el,
    querySelectorAll: () => [],
    createElement: () => new FakeEl(),
  },
};
const ctx = vm.createContext(sandbox);
vm.runInContext(original, ctx, { filename: 'Dashboard_Cartera_AIG.html' });
vm.runInContext(
  `function __setFilters(f){ for(const [k] of FILTERS){ STATE.sel[k].clear(); ((f.sel||{})[k]||[]).forEach(v=>STATE.sel[k].add(v)); }
     STATE.selAtraso.clear(); (f.atraso||[]).forEach(v=>STATE.selAtraso.add(v)); }`,
  ctx,
);
const run = <T = unknown>(code: string, arg?: unknown): T => {
  sandbox.__arg = arg;
  return vm.runInContext(code, ctx) as T;
};
const fQ = run<(n: number) => string>('fQ');
const fQ2 = run<(n: number) => string>('fQ2');
const fN = run<(n: number) => string>('fN');
const fPct = run<(n: number) => string>('fPct');

/* ------------------------------ Utilidades ----------------------------- */
const strip = (s: string) => s.replace(/<[^>]+>/g, '').trim();
function tableRows(htmlStr: string): string[][] {
  const body = htmlStr.split('<tbody>')[1] ?? '';
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => strip(c[1])),
  );
}
let checks = 0;
const failures: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  checks++;
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a !== b) failures.push(`${label}\n    original: ${b.slice(0, 400)}\n    nuevo:    ${a.slice(0, 400)}`);
}
const dsData = (id: string, i: number) => charts[id].data.datasets[i].data;

/* ------------------------------ Escenarios ----------------------------- */
const seed = loadSeedFromHtml(htmlPath)!;
const dataset = { generated: seed.generated, cierres: seed.cierres };
const order = Object.keys(dataset.cierres).sort();

const scenarios: { name: string; f: { sel?: Record<string, string[]>; atraso?: string[] } }[] = [
  { name: 'sin filtros', f: {} },
  { name: 'agencia JALAPA', f: { sel: { ag: ['JALAPA'] } } },
  { name: 'atraso 1-90', f: { atraso: ['a1', 'a2', 'a3'] } },
  { name: 'femenino + mensual', f: { sel: { sexo: ['FEMENINO'], mod: ['Mensual'] } } },
  { name: 'gestor (Sin dato)', f: { sel: { ges: ['(Sin dato)'] } } },
  { name: 'GUA+JALAPA al día', f: { sel: { dep: ['GUATEMALA', 'JALAPA'] }, atraso: ['dia'] } },
  { name: 'mora crítica', f: { atraso: ['a4', 'a5', 'a6'] } },
];

const pairs: [string, string][] = [];
for (let i = 0; i < order.length; i++) for (let j = 0; j < order.length; j++) if (i !== j && (j === i + 1 || j === i + 3 || j < i)) pairs.push([order[i], order[j]]);

const kvSplit = (kv: [string, number][]) => [kv.map((x) => x[0]), kv.map((x) => x[1])];

for (const sc of scenarios) {
  run('__setFilters(__arg)', sc.f);
  const c = new E.Ctx(dataset, E.toFilterState(sc.f as E.FilterInput));
  const P = `[${sc.name}]`;

  // Tendencias (1,2,3)
  run('renderTrends()');
  const t = E.computeTrends(c);
  eq(`${P} tendencia cartera`, t.cartera, dsData('chCartera', 0));
  eq(`${P} tendencia clientes`, t.ncli, dsData('chCartera', 1));
  eq(`${P} mora1 monto`, t.par1m, dsData('chMora1', 0));
  eq(`${P} mora1 clientes`, t.par1c, dsData('chMora1', 1));
  eq(`${P} mora30 monto`, t.par30m, dsData('chMora30', 0));
  eq(`${P} mora30 clientes`, t.par30c, dsData('chMora30', 1));

  // Colocación (4)
  for (const tipo of E.COLOC_TIPOS) {
    run('STATE.colocTipo=__arg; renderColoc()', tipo);
    const p = E.computePlacement(c, tipo);
    eq(`${P} colocación ${tipo} monto`, p.monto, dsData('chColoc', 0));
    eq(`${P} colocación ${tipo} num`, p.num, dsData('chColoc', 1));
  }

  for (const cierre of order) {
    run('STATE.cierre=__arg', cierre);
    const Q = `${P}[${cierre}]`;

    // KPIs
    run('renderKPIs()');
    const k = E.computeKpis(c, cierre);
    const kv = [...el('kpiStrip').innerHTML.matchAll(/<div class="kv">(.*?)<\/div>/g)].map((m) => m[1]);
    eq(`${Q} KPIs`, [
      fQ(k.cartera), fN(k.nCli), fPct(k.cartera ? k.par1 / k.cartera : 0), fPct(k.cartera ? k.par30 / k.cartera : 0),
      fQ(k.ticket), fN(k.alDia), fN(k.criticaN), fQ(k.cuotaTotal),
    ], kv);
    const kd = [...el('kpiStrip').innerHTML.matchAll(/<div class="kd [a-z]+">(.*?)<\/div>/g)].map((m) => m[1]);
    const dv = k.prevCartera == null ? null : k.cartera - k.prevCartera;
    eq(`${Q} KPI detalle`, [
      dv == null ? '' : (dv >= 0 ? '▲ ' : '▼ ') + fQ(Math.abs(dv)) + ' vs ' + run<string>('cLabel(__arg)', k.prevCierre),
      k.nCreditos + ' créditos',
      fQ(k.par1) + ' · ' + fN(k.cliMora) + ' cli',
      fQ(k.par30),
      'saldo / cliente',
      fPct(k.nCreditos ? k.alDia / k.nCreditos : 0) + ' del total',
      fQ(k.criticaMonto),
      'suma de cuotas',
    ], kd);

    // Composición (5,6,7)
    run('renderComposicion()');
    const comp = E.computeComposition(c, cierre);
    for (const [id, key] of [
      ['chProdCart', 'prodCart'], ['chProdCli', 'prodCli'], ['chMoraProdCart', 'moraProdCart'],
      ['chMoraProdCli', 'moraProdCli'], ['chSaldoCart', 'saldoCart'], ['chSaldoCli', 'saldoCli'],
    ] as const) {
      eq(`${Q} ${key}`, kvSplit(comp[key]), [charts[id].data.labels, dsData(id, 0)]);
    }

    // Rankings (8-12)
    run('renderRankings()');
    const sana = (r: E.LoanRecord & { rank: number }) => [String(r.rank), r.ag ?? '', r.cli ?? '', fQ2(+r.sc!), r.prod ?? '', r.mun ?? '', r.tel ?? ''].map(String);
    const mora = (r: E.LoanRecord & { rank: number }) =>
      [String(r.rank), r.ag ?? '', r.cli ?? '', fQ2(+r.sc!), r.prod ?? '', r.gar ?? '', fN(+r.dmora!), r.mun ?? '', r.tel ?? ''].map(String);
    for (const [host, bucket] of [['topSana', 'sana'], ['top1', 'b1'], ['top2', 'b2'], ['top3', 'b3'], ['top4', 'b4']] as const) {
      const rk = E.computeRanking(c, cierre, bucket, 1, 10);
      eq(`${Q} ranking ${bucket}`, rk.rows.map(bucket === 'sana' ? sana : mora), tableRows(el(host).innerHTML));
    }

    // Días de pago (13)
    for (const mode of ['all', 'dia'] as const) {
      run('STATE.diaPago=__arg; renderDiaPago()', mode);
      const dp = E.computePaymentDays(c, cierre, mode);
      eq(`${Q} díaPago ${mode} monto`, dp.monto, dsData('chDiaPago', 0));
      eq(`${Q} díaPago ${mode} clientes`, dp.cnt, dsData('chDiaPago', 1));
    }

    // Vencimientos (14)
    for (const w of ['30', '90'] as const) {
      run('STATE.venc=__arg; renderVenc()', w);
      const v = E.computeMaturities(c, cierre, w);
      eq(`${Q} vencimientos ${w}`, v.rows.map((r) => [r.ag ?? '', r.cli ?? '', fQ2(+r.sc!), r.prod ?? '', r.fven ?? '', fN(r.daysToDue), r.mun ?? '', r.tel ?? ''].map(String)), tableRows(el('vencList').innerHTML));
    }

    // Precobro (15)
    run('renderPrecobro()');
    const pc = E.computePreCollection(c, cierre);
    eq(`${Q} precobro`, pc.rows.map((r) => [r.ag ?? '', r.cli ?? '', fQ2(+r.sc!), fQ2(+r.cuota!), r.firstPay, fN(+r.dpago!), r.mun ?? '', r.tel ?? ''].map(String)), tableRows(el('precobroList').innerHTML));
  }

  // Retención (16,17)
  for (const [de, a] of pairs) {
    const Q = `${P}[${de}→${a}]`;
    run('STATE.desDe=__arg[0]; STATE.desA=__arg[1]; renderDeser()', [de, a]);
    const at = E.computeAttrition(c, de, a);
    eq(`${Q} deserción`, at.valid ? at.rows.map((r) => [r.ag ?? '', r.cli ?? '', fQ2(r.moAgg), r.prod ?? '', r.mun ?? '', r.tel ?? ''].map(String)) : 'invalid',
      el('desList').innerHTML.includes('rango válido') ? 'invalid' : tableRows(el('desList').innerHTML));

    const mx = E.computeTransitionMatrix(c, de, a);
    for (const mode of ['cli', 'monto'] as const) {
      run('STATE.mtxDe=__arg[0]; STATE.mtxA=__arg[1]; STATE.mtxMode=__arg[2]; renderMtx()', [de, a, mode]);
      const host = el('mtxHost').innerHTML;
      if (!mx.valid) {
        eq(`${Q} matriz ${mode}`, 'invalid', host.includes('rango válido') ? 'invalid' : 'table');
        continue;
      }
      const val = (cell: E.MtxCell) => String(mode === 'cli' ? cell.n || '' : cell.m ? fQ(cell.m) : '');
      const expected = mx.rowKeys.map((rk) => {
        let tn = 0, tm = 0;
        const cells = mx.colKeys.map((ck) => { const cell = mx.cells[rk][ck]; tn += cell.n; tm += cell.m; return val(cell); });
        return [E.BUCKETS[rk as E.MoraBucket] ?? 'Nuevo/Reingreso', ...cells, val({ n: tn, m: tm })];
      });
      const totals = mx.colKeys.map((ck) => { let tn = 0, tm = 0; mx.rowKeys.forEach((rk) => { tn += mx.cells[rk][ck].n; tm += mx.cells[rk][ck].m; }); return val({ n: tn, m: tm }); });
      expected.push(['Total', ...totals, '']);
      eq(`${Q} matriz ${mode}`, expected, tableRows(host));
    }
  }
}

/* ------------------------------- Opciones ------------------------------ */
const opts = E.buildFilterOptions(dataset);
const origOpts = run<Record<string, Set<string>>>('buildFilterOptions()');
for (const k of E.FILTER_KEYS) eq(`opciones filtro ${k}`, opts[k], [...origOpts[k]].sort((a, b) => a.localeCompare(b, 'es')));

console.log(`\nParidad: ${checks - failures.length}/${checks} comprobaciones idénticas al HTML original.`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} diferencias:\n` + failures.slice(0, 25).join('\n'));
  process.exit(1);
}
console.log('✓ El motor nuevo reproduce exactamente el dashboard original.');
