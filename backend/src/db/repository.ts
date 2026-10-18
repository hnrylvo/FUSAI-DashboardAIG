import { config } from '../config.js';
import { KEYS, type Key, type Row } from '../engine/core.js';
import { db, sql } from './pool.js';

/**
 * Capa de Datos / Repositorio SQL Server.
 *
 * Cumple estrictamente con la política de SOLO LECTURA (100% SELECT).
 * Toda consulta está parametrizada, no concatena valores de usuario y
 * está protegida por la guardia de seguridad assertReadOnly().
 */

export interface DbClientRecord {
  id: number;
  codigo: string;
  nombre: string;
  sexo: string | null;
  telefono: string | null;
  direccion: string | null;
  departamentoId: number | null;
  municipioId: number | null;
  fechaNacimiento: string | null;
  dui: string | null;
  nit: string | null;
}

export interface DbBranchRecord {
  id: number;
  codigo: string;
  nombre: string;
  zona: number | null;
  region: number | null;
  estado: number;
  creditosActivos?: number;
  saldoCartera?: number;
}

export interface DbOfficerRecord {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  sucursalId: number | null;
  activo: boolean;
}

export interface DbSnapshotLog {
  cierre: string;
  creditos: number;
  clientesUnicos: number;
  saldoTotal: number;
  capitalMora: number;
  par1Monto: number;
  par30Monto: number;
  fechaExtraccion: string;
}

export class PortfolioRepository {
  /**
   * Extrae el dataset de cartera activa desde SQL Server y lo normaliza
   * al formato canónico de 25 columnas utilizado por el motor analítico del dashboard.
   */
  async getActivePortfolioRows(cierreOverride?: string): Promise<{ cierre: string; rows: Row[] }> {
    // Consulta optimizada con joins seguros a catálogos normalizados
    const query = `
      SELECT
        RTRIM(c.referencia) AS ref,
        COALESCE(RTRIM(c.codigo), RTRIM(cli.CODIGO), CAST(cr.CLIENTEID AS varchar(64))) AS cod,
        RTRIM(c.cliente) AS cli,
        COALESCE(RTRIM(ase.PRIMERNOMBRE) + ' ' + RTRIM(ase.PRIMERAPELLIDO), 'ASESOR NO ASIGNADO') AS ase,
        COALESCE(RTRIM(ges.PRIMERNOMBRE) + ' ' + RTRIM(ges.PRIMERAPELLIDO), 'SIN ASIGNAR') AS ges,
        COALESCE(RTRIM(dep.DEPARTAMENTO), RTRIM(c.departamento), 'GUATEMALA') AS dep,
        COALESCE(RTRIM(mun.MUNICIPIO), RTRIM(c.municipio), 'GUATEMALA') AS mun,
        CONVERT(varchar(10), c.fechaOtorgamiento, 120) AS fdes,
        COALESCE(RTRIM(cr.MODALIDADPAGOID), 'MEN') AS mod,
        CAST(ROUND(c.montoOtorgado, 2) AS float) AS mo,
        CAST(ROUND(c.capitalTotalAdeudado, 2) AS float) AS sc,
        CAST(ROUND(c.capitalMora, 2) AS float) AS kmora,
        CAST(ROUND(c.valorCuota, 2) AS float) AS cuota,
        COALESCE(cr.FECHAPAGO, DAY(c.fechaVencimiento), 1) AS dpago,
        CONVERT(varchar(10), c.fechaVencimiento, 120) AS fven,
        0 AS ucp,
        COALESCE(RTRIM(cli.SEXOID), 'M') AS sexo,
        CONVERT(varchar(10), c.ultimaFechaPago, 120) AS ufp,
        COALESCE(c.diasCapitalMora, 0) AS dmora,
        'ACTIVO' AS sest,
        COALESCE(RTRIM(cr.TIPOCREDITOID), 'CREDITO NUEVO') AS tc,
        COALESCE(CAST(cr.TIPOGARANTIAID AS varchar(32)), 'FIDUCIARIA') AS gar,
        COALESCE(NULLIF(RTRIM(c.lineaCredito), '--'), 'GENERAL') AS prod,
        COALESCE(RTRIM(c.telefono), RTRIM(c.tels), RTRIM(cli.TELEFONOMOVIL), 'S/T') AS tel,
        COALESCE(RTRIM(ag.agencia), 'OFICINA CENTRAL') AS ag,
        CONVERT(varchar(10), COALESCE(c.ultimaFechaPago, c.fechaOtorgamiento), 120) AS fechaCorteRef
      FROM [dbo].[CARTERA] c
      LEFT JOIN [dbo].[AGENCIAS] ag ON ag.idAgencia = c.idAgencia
      LEFT JOIN [dbo].[CREDITO] cr ON cr.REFERENCIA = c.referencia
      LEFT JOIN [dbo].[CLIENTE] cli ON cli.CLIENTEID = cr.CLIENTEID
      LEFT JOIN [dbo].[PERSONAL] ase ON ase.PERSONALID = cr.PERSONALID
      LEFT JOIN [dbo].[PERSONAL] ges ON ges.PERSONALID = c.idGestor
      LEFT JOIN [dbo].[DEPARTAMENTO] dep ON dep.DEPARTAMENTOID = cr.DEPARTAMENTOID
      LEFT JOIN [dbo].[MUNICIPIO] mun ON mun.MUNICIPIOID = cr.MUNICIPIOID
      WHERE c.capitalTotalAdeudado > 0
    `;

    const records = await db.query<Record<string, unknown>>(query);

    // Determinar la fecha de corte del cierre: si no se provee override, usar la fecha máxima de corte o hoy
    let cierre = cierreOverride;
    if (!cierre) {
      let maxDate = '';
      for (const r of records) {
        const d = String(r.fechaCorteRef || '');
        if (d > maxDate) maxDate = d;
      }
      cierre = maxDate || new Date().toISOString().slice(0, 10);
    }

    // Convertir cada registro al array posicional canónico de KEYS (25 columnas)
    const rows: Row[] = records.map((rec) => {
      return KEYS.map((k: Key) => {
        const v = rec[k];
        if (v === undefined || v === null || v === '') return null;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return v.trim();
        return String(v);
      });
    });

    return { cierre, rows };
  }

  /**
   * Consulta paginada y parametrizada de clientes.
   */
  async getClients(params: { search?: string; page?: number; pageSize?: number }): Promise<{
    total: number;
    page: number;
    pageSize: number;
    clients: DbClientRecord[];
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const hasSearch = Boolean(params.search && params.search.trim());
    const filterSql = hasSearch
      ? `WHERE c.CODIGO LIKE @search OR c.PRIMERNOMBRE LIKE @search OR c.PRIMERAPELLIDO LIKE @search OR c.DUI LIKE @search`
      : '';

    const queryParams: Record<string, { type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams; value: unknown }> = {};
    if (hasSearch) {
      queryParams.search = { type: sql.NVarChar(128), value: `%${params.search!.trim()}%` };
    }

    const countQuery = `SELECT COUNT(*) AS total FROM [dbo].[CLIENTE] c ${filterSql}`;
    const [countResult] = await db.query<{ total: number }>(countQuery, queryParams);
    const total = countResult?.total ?? 0;

    queryParams.offset = { type: sql.Int, value: offset };
    queryParams.pageSize = { type: sql.Int, value: pageSize };

    const dataQuery = `
      SELECT
        c.CLIENTEID AS id,
        RTRIM(c.CODIGO) AS codigo,
        RTRIM(CONCAT(c.PRIMERNOMBRE, ' ', c.SEGUNDONOMBRE, ' ', c.PRIMERAPELLIDO, ' ', c.SEGUNDOAPELLIDO)) AS nombre,
        RTRIM(c.SEXOID) AS sexo,
        COALESCE(RTRIM(c.TELEFONOMOVIL), RTRIM(c.TELEFONOCASA)) AS telefono,
        RTRIM(c.DIRECCION) AS direccion,
        c.DEPARTAMENTOID AS departamentoId,
        c.MUNICIPIOID AS municipioId,
        CONVERT(varchar(10), c.FECHANACIMIENTO, 120) AS fechaNacimiento,
        RTRIM(c.DUI) AS dui,
        RTRIM(c.NIT) AS nit
      FROM [dbo].[CLIENTE] c
      ${filterSql}
      ORDER BY c.CLIENTEID DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const rawClients = await db.query<DbClientRecord>(dataQuery, queryParams);
    return { total, page, pageSize, clients: rawClients };
  }

  /**
   * Consulta de agencias / sucursales con saldos de cartera acumulados.
   */
  async getBranches(): Promise<DbBranchRecord[]> {
    const query = `
      SELECT
        ag.idAgencia AS id,
        RTRIM(ag.idAgenciaT) AS codigo,
        RTRIM(ag.agencia) AS nombre,
        ag.idZona AS zona,
        ag.idRegion AS region,
        ag.estado AS estado,
        COUNT(c.idCredito) AS creditosActivos,
        CAST(ROUND(COALESCE(SUM(c.capitalTotalAdeudado), 0), 2) AS float) AS saldoCartera
      FROM [dbo].[AGENCIAS] ag
      LEFT JOIN [dbo].[CARTERA] c ON c.idAgencia = ag.idAgencia AND c.capitalTotalAdeudado > 0
      GROUP BY ag.idAgencia, ag.idAgenciaT, ag.agencia, ag.idZona, ag.idRegion, ag.estado
      ORDER BY ag.idAgencia ASC
    `;
    return db.query<DbBranchRecord>(query);
  }

  /**
   * Consulta de oficiales de crédito (asesores y gestores de cobro).
   */
  async getLoanOfficers(): Promise<DbOfficerRecord[]> {
    const query = `
      SELECT
        p.PERSONALID AS id,
        RTRIM(p.CODIGO) AS codigo,
        RTRIM(p.TIPOPERSONALID) AS tipo,
        RTRIM(CONCAT(p.PRIMERNOMBRE, ' ', p.SEGUNDONOMBRE, ' ', p.PRIMERAPELLIDO, ' ', p.SEGUNDOAPELLIDO)) AS nombre,
        COALESCE(RTRIM(p.TELEFONOMOVIL), RTRIM(p.TELEFONOCASA)) AS telefono,
        RTRIM(p.CORREO) AS correo,
        p.SUCURSALID AS sucursalId,
        CASE WHEN p.ESTADOPERSONALID = 'ACT' THEN 1 ELSE 0 END AS activo
      FROM [dbo].[PERSONAL] p
      WHERE p.TIPOPERSONALID IN ('ASE', 'COB', 'JEA', 'SUP')
      ORDER BY p.TIPOPERSONALID ASC, p.PRIMERNOMBRE ASC
    `;
    const res = await db.query<any>(query);
    return res.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      tipo: r.tipo,
      nombre: r.nombre.replace(/\s+/g, ' ').trim(),
      telefono: r.telefono,
      correo: r.correo,
      sucursalId: r.sucursalId,
      activo: Boolean(r.activo),
    }));
  }

  /**
   * Genera el log histórico de cortes / snapshots de análisis disponibles.
   */
  async getSnapshotsLog(): Promise<DbSnapshotLog[]> {
    const query = `
      SELECT
        CONVERT(varchar(10), COALESCE(c.ultimaFechaPago, c.fechaOtorgamiento), 120) AS cierre,
        COUNT(c.referencia) AS creditos,
        COUNT(DISTINCT COALESCE(c.codigo, cli.CODIGO, CAST(cr.CLIENTEID AS varchar(64)))) AS clientesUnicos,
        CAST(ROUND(SUM(c.capitalTotalAdeudado), 2) AS float) AS saldoTotal,
        CAST(ROUND(SUM(c.capitalMora), 2) AS float) AS capitalMora,
        CAST(ROUND(SUM(CASE WHEN c.diasCapitalMora >= 1 THEN c.capitalTotalAdeudado ELSE 0 END), 2) AS float) AS par1Monto,
        CAST(ROUND(SUM(CASE WHEN c.diasCapitalMora >= 30 THEN c.capitalTotalAdeudado ELSE 0 END), 2) AS float) AS par30Monto,
        CONVERT(varchar(19), GETDATE(), 120) AS fechaExtraccion
      FROM [dbo].[CARTERA] c
      LEFT JOIN [dbo].[CREDITO] cr ON cr.REFERENCIA = c.referencia
      LEFT JOIN [dbo].[CLIENTE] cli ON cli.CLIENTEID = cr.CLIENTEID
      WHERE c.capitalTotalAdeudado > 0
      GROUP BY CONVERT(varchar(10), COALESCE(c.ultimaFechaPago, c.fechaOtorgamiento), 120)
      ORDER BY cierre DESC
    `;
    return db.query<DbSnapshotLog>(query);
  }
}

export const portfolioRepo = new PortfolioRepository();
