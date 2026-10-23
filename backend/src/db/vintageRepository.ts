import { config } from '../config.js';
import { db } from './pool.js';
import { assertReadOnly } from './readonly.js';
import { VINTAGE_BASELINE } from './vintageBaseline.js';

export interface VintageDims {
  asesor: string[];
  agencia: string[];
  garantia: string[];
  sexo: string[];
  producto: string[];
  destino: string[];
  tipo: string[];
  depto: string[];
}

export type VintageLoanTuple = [
  string, // 0: ref
  string, // 1: cod
  string, // 2: name
  string, // 3: fdes (YYYY-MM-DD)
  number, // 4: monto
  number, // 5: plazo
  number, // 6: agenciaIdx
  number, // 7: garantiaIdx
  number, // 8: sexoIdx
  number, // 9: productoIdx
  number, // 10: destinoIdx
  number, // 11: tipoIdx
  number  // 12: deptoIdx
];

export type VintageSnapTuple = [
  number, // 0: loanIdx in loans array
  number, // 1: saldo
  number, // 2: dias
  number  // 3: asesorIdx in dims.asesor
];

export interface VintageStore {
  v: number;
  dims: VintageDims;
  loans: VintageLoanTuple[];
  snaps: Record<string, VintageSnapTuple[]>;
}

export class VintageRepository {
  private store: VintageStore | null = null;
  private lastSyncAt: string | null = null;
  private dataSourceOrigin: 'database' | 'fixture' = 'fixture';

  /**
   * Carga el almacén de datos baseline en memoria para enriquecimiento dinámico.
   */
  private loadFixture(): VintageStore {
    return JSON.parse(JSON.stringify(VINTAGE_BASELINE)) as VintageStore;
  }

  /**
   * Obtiene el almacén de cosechas en memoria, inicializándolo desde el fixture si aún no existe.
   */
  async getStore(): Promise<{ store: VintageStore; source: 'database' | 'fixture'; updatedAt: string }> {
    if (!this.store) {
      this.store = this.loadFixture();
      this.dataSourceOrigin = 'fixture';
      this.lastSyncAt = new Date().toISOString();

      // Si la base de datos está configurada, intentar enriquecer en segundo plano
      if (config.dataSource === 'database' || config.db.host) {
        this.syncFromDb().catch((err) => {
          console.warn('[vintage] Sincronización inicial con BD en Cosechas omitida:', (err as Error).message);
        });
      }
    }

    return {
      store: this.store,
      source: this.dataSourceOrigin,
      updatedAt: this.lastSyncAt || new Date().toISOString(),
    };
  }

  /**
   * Ejecuta una consulta ESTRICTAMENTE DE SOLO LECTURA a SQL Server para extraer
   * la cartera viva y consolidar el snapshot correspondiente al último corte activo.
   */
  async syncFromDb(): Promise<{ cierre: string; rowsCount: number; newLoansCount: number }> {
    if (!this.store) {
      this.store = this.loadFixture();
    }

    const query = `
      SELECT
        RTRIM(c.referencia) AS ref,
        COALESCE(RTRIM(c.codigo), RTRIM(cli.CODIGO), CAST(cr.CLIENTEID AS varchar(64))) AS cod,
        RTRIM(c.cliente) AS name,
        CONVERT(varchar(10), COALESCE(c.fechaOtorgamiento, cr.FECHAOTORGAMIENTO), 120) AS fdes,
        CAST(ROUND(COALESCE(c.montoOtorgado, cr.MONTOCREDITO, 0), 2) AS float) AS monto,
        COALESCE(c.plazo, cr.PLAZO, 0) AS plazo,
        COALESCE(RTRIM(ag.agencia), 'OFICINA CENTRAL') AS agencia,
        COALESCE(CAST(cr.TIPOGARANTIAID AS varchar(32)), 'FIDUCIARIA') AS garantia,
        CASE WHEN COALESCE(RTRIM(cli.SEXOID), 'M') = 'F' THEN 'FEMENINO' ELSE 'MASCULINO' END AS sexo,
        COALESCE(NULLIF(RTRIM(c.lineaCredito), '--'), 'GENERAL') AS producto,
        COALESCE(RTRIM(c.destino), 'CAPITAL DE TRABAJO') AS destino,
        COALESCE(RTRIM(cr.TIPOCREDITOID), RTRIM(c.tipo), 'CREDITO NUEVO') AS tipo,
        COALESCE(RTRIM(dep.DEPARTAMENTO), RTRIM(c.departamento), 'GUATEMALA') AS depto,
        CONVERT(varchar(10), COALESCE(c.ultimaFechaPago, c.fechaOtorgamiento, GETDATE()), 120) AS cierre,
        CAST(ROUND(COALESCE(c.capitalTotalAdeudado, 0), 2) AS float) AS saldo,
        COALESCE(c.diasCapitalMora, 0) AS dias,
        COALESCE(RTRIM(ase.PRIMERNOMBRE) + ' ' + RTRIM(ase.PRIMERAPELLIDO), 'ASESOR NO ASIGNADO') AS asesor
      FROM [dbo].[CARTERA] c
      LEFT JOIN [dbo].[AGENCIAS] ag ON ag.idAgencia = c.idAgencia
      LEFT JOIN [dbo].[CREDITO] cr ON cr.REFERENCIA = c.referencia
      LEFT JOIN [dbo].[CLIENTE] cli ON cli.CLIENTEID = cr.CLIENTEID
      LEFT JOIN [dbo].[PERSONAL] ase ON ase.PERSONALID = cr.PERSONALID
      LEFT JOIN [dbo].[DEPARTAMENTO] dep ON dep.DEPARTAMENTOID = cr.DEPARTAMENTOID
      WHERE c.capitalTotalAdeudado > 0
    `;

    // Guardia de seguridad estricta: asegurar que es solo lectura
    assertReadOnly(query);

    const rows = await db.query<Record<string, unknown>>(query);
    if (!rows.length) {
      return { cierre: '', rowsCount: 0, newLoansCount: 0 };
    }

    // Determinar la fecha de cierre más representativa de los registros
    let cierreMax = '';
    for (const r of rows) {
      const d = String(r.cierre || '');
      if (d > cierreMax) cierreMax = d;
    }
    const cierre = cierreMax || new Date().toISOString().slice(0, 10);

    const store = this.store;
    const dims = store.dims;

    // Helpers para indexar dimensiones
    const getDimIndex = (category: keyof VintageDims, val: string): number => {
      let norm = (val || '').trim().toUpperCase();
      if (!norm) norm = '(SIN DATO)';
      let idx = dims[category].indexOf(norm);
      if (idx === -1) {
        dims[category].push(norm);
        idx = dims[category].length - 1;
      }
      return idx;
    };

    // Mapeo existente de referencias de crédito a índice en loans
    const loanMap = new Map<string, number>();
    store.loans.forEach((l, idx) => loanMap.set(l[0], idx));

    let newLoansCount = 0;
    const snapRows: VintageSnapTuple[] = [];
    const seenRefs = new Set<string>();

    for (const r of rows) {
      const ref = String(r.ref || '').trim();
      if (!ref || seenRefs.has(ref)) continue;
      seenRefs.add(ref);

      const cod = String(r.cod || '').trim();
      const name = String(r.name || '').trim();
      const fdes = String(r.fdes || '').trim() || cierre;
      const monto = Number(r.monto) || 0;
      const plazo = Number(r.plazo) || 0;

      const agIdx = getDimIndex('agencia', String(r.agencia || ''));
      const garIdx = getDimIndex('garantia', String(r.garantia || ''));
      const sexIdx = getDimIndex('sexo', String(r.sexo || ''));
      const prodIdx = getDimIndex('producto', String(r.producto || ''));
      const destIdx = getDimIndex('destino', String(r.destino || ''));
      const tipoIdx = getDimIndex('tipo', String(r.tipo || ''));
      const depIdx = getDimIndex('depto', String(r.depto || ''));
      const asIdx = getDimIndex('asesor', String(r.asesor || ''));

      let loanIdx = loanMap.get(ref);
      if (loanIdx === undefined) {
        const tuple: VintageLoanTuple = [
          ref,
          cod,
          name,
          fdes,
          monto,
          plazo,
          agIdx,
          garIdx,
          sexIdx,
          prodIdx,
          destIdx,
          tipoIdx,
          depIdx,
        ];
        store.loans.push(tuple);
        loanIdx = store.loans.length - 1;
        loanMap.set(ref, loanIdx);
        newLoansCount++;
      }

      const saldo = Math.round((Number(r.saldo) || 0) * 100) / 100;
      const dias = Math.max(0, Number(r.dias) || 0);
      snapRows.push([loanIdx, saldo, dias, asIdx]);
    }

    // Incorporar el snapshot para la fecha de corte detectada
    store.snaps[cierre] = snapRows;
    this.dataSourceOrigin = 'database';
    this.lastSyncAt = new Date().toISOString();

    console.log(
      `[vintage] Sincronización exitosa desde BD on-premise: corte ${cierre} con ${snapRows.length} créditos (${newLoansCount} nuevos).`
    );

    return { cierre, rowsCount: snapRows.length, newLoansCount };
  }
}

export const vintageRepo = new VintageRepository();
