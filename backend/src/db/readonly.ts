/**
 * Guardia de SOLO LECTURA.
 *
 * Política: el backend jamás muta la base de datos on-premise. Todo SQL que
 * llega al pool pasa por `assertReadOnly()`, que rechaza cualquier sentencia
 * que no sea un único SELECT (o CTE `WITH … SELECT`) y cualquier palabra
 * clave capaz de escribir, alterar esquema, ejecutar código o abrir
 * transacciones. Es una defensa en profundidad: el usuario de BD debe tener
 * además únicamente permisos `db_datareader` / `SELECT` (ver README).
 */

export class ReadOnlyViolation extends Error {
  constructor(reason: string) {
    super(`Consulta bloqueada por la política de solo lectura: ${reason}`);
    this.name = 'ReadOnlyViolation';
  }
}

const FORBIDDEN = [
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'TRUNCATE', 'DROP', 'ALTER', 'CREATE', 'RENAME',
  'GRANT', 'REVOKE', 'DENY', 'EXEC', 'EXECUTE', 'SP_EXECUTESQL', 'XP_CMDSHELL', 'OPENROWSET',
  'OPENQUERY', 'OPENDATASOURCE', 'BULK', 'BACKUP', 'RESTORE', 'DBCC', 'SHUTDOWN', 'KILL',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVE', 'TRANSACTION', 'TRAN', 'USE', 'DECLARE', 'SET',
  'WRITETEXT', 'UPDATETEXT', 'RECONFIGURE', 'INTO',
];
const FORBIDDEN_RE = new RegExp(`\\b(${FORBIDDEN.join('|')})\\b`, 'i');

/** Quita comentarios y literales de texto para analizar solo la estructura del SQL. */
function stripNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/N?'(?:[^']|'')*'/g, "''")
    .replace(/\[[^\]]*\]/g, '[x]'); // identificadores entre corchetes (p.ej. [Update Date])
}

export function assertReadOnly(sql: string): void {
  const s = stripNoise(sql).trim().replace(/;\s*$/, '');
  if (!s) throw new ReadOnlyViolation('consulta vacía');
  if (s.includes(';')) throw new ReadOnlyViolation('no se permiten múltiples sentencias');
  if (!/^(SELECT|WITH)\b/i.test(s)) throw new ReadOnlyViolation('solo se permiten sentencias SELECT');
  const hit = s.match(FORBIDDEN_RE);
  if (hit) throw new ReadOnlyViolation(`palabra clave no permitida "${hit[1].toUpperCase()}"`);
}

/**
 * Valida un identificador de objeto configurable (schema.tabla / [db].[schema].[vista]).
 * Los identificadores no pueden parametrizarse en T-SQL, así que se restringen a
 * un patrón estricto y se re-escapan con corchetes.
 */
export function quoteObjectName(name: string): string {
  const parts = name.split('.').map((p) => p.trim().replace(/^\[|\]$/g, ''));
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^[A-Za-z_][A-Za-z0-9_ $#@-]{0,127}$/.test(p))) {
    throw new Error(`Nombre de objeto de BD inválido: "${name}"`);
  }
  return parts.map((p) => `[${p}]`).join('.');
}
