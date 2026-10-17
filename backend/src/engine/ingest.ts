import * as XLSX from 'xlsx';
import { KEYS, type Key, type Row } from './core.js';

/* =================== CARGA DE NUEVOS CIERRES =================== */
const SRC_NAMES: Record<string, Key> = {
  Referencia: 'ref', 'Código de Cliente': 'cod', Cliente: 'cli', Asesor: 'ase', 'Gestor de Cobro': 'ges',
  Departamento: 'dep', Municipio: 'mun', 'Fecha de Desembolso': 'fdes', 'Modalidad de Pago': 'mod', 'Monto Otorgado': 'mo',
  'Saldo Capital': 'sc', 'K Mora': 'kmora', Cuota: 'cuota', 'Día pago': 'dpago', 'Fecha Vence': 'fven', 'Ult Cuota Pagada': 'ucp',
  Sexo: 'sexo', 'Última Fecha Pago': 'ufp', 'Días Mora': 'dmora', 'Sub-Estado': 'sest', 'Tipo de Credito': 'tc', Garantía: 'gar',
  Producto: 'prod', Teléfono: 'tel', Agencia: 'ag',
};
const DATEK = new Set<Key>(['fdes', 'fven', 'ufp']);
const NUMK = new Set<Key>(['mo', 'sc', 'kmora', 'cuota', 'dmora', 'dpago', 'ucp']);

export class IngestError extends Error {
  constructor(
    message: string,
    readonly code: 'NO_HEADER' | 'CIERRE_REQUIRED' | 'INVALID_FILE',
  ) {
    super(message);
  }
}

function toISO(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v);
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const m2 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return null;
}

/**
 * Parsea un reporte de cartera (.xls/.xlsx). Misma heurística que el original:
 * la fila de encabezados es la primera (de las 10 iniciales) cuya 2ª columna es "#".
 * La fecha de cierre se toma del nombre del archivo (dd-mm-aaaa) o de la celda B2;
 * si no se detecta, se usa `cierreOverride` (equivalente al prompt() del HTML).
 */
export function parseWorkbook(buf: Buffer, fname: string, cierreOverride?: string): { cierre: string; rows: Row[] } {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  } catch {
    throw new IngestError('El archivo no es un libro de Excel válido.', 'INVALID_FILE');
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new IngestError('El libro no contiene hojas.', 'INVALID_FILE');
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: null });
  let hr = -1;
  for (let i = 0; i < Math.min(10, arr.length); i++) {
    if (arr[i] && String(arr[i][1]).trim() === '#') {
      hr = i;
      break;
    }
  }
  if (hr < 0) throw new IngestError('No se encontró la fila de encabezados.', 'NO_HEADER');
  const header = arr[hr].map((x) => (x == null ? '' : String(x).trim()));
  const colIndex: Partial<Record<Key, number>> = {};
  header.forEach((h, i) => {
    if (SRC_NAMES[h] !== undefined) colIndex[SRC_NAMES[h]] = i;
  });
  const rows: Row[] = [];
  for (let i = hr + 1; i < arr.length; i++) {
    const raw = arr[i];
    if (!raw) continue;
    const num = raw[1];
    if (num == null || num === '') continue;
    const rec: Row = KEYS.map((k) => {
      const ci = colIndex[k];
      const v = ci == null ? null : raw[ci];
      if (DATEK.has(k)) return toISO(v);
      if (NUMK.has(k)) {
        const n = parseFloat(String(v).replace(/,/g, ''));
        return isNaN(n) ? 0 : Math.round(n * 100) / 100;
      }
      return v == null || v === '' ? null : String(v).trim();
    });
    rows.push(rec);
  }
  // fecha de cierre
  let cierre: string | null = null;
  const m = fname.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) cierre = `${m[3]}-${m[2]}-${m[1]}`;
  if (!cierre) {
    const t = String((arr[1] && arr[1][1]) || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (t) cierre = `${t[3]}-${t[2]}-${t[1]}`;
  }
  if (!cierre && cierreOverride) cierre = cierreOverride;
  if (!cierre) throw new IngestError('No se detectó la fecha de cierre. Indícala manualmente (YYYY-MM-DD).', 'CIERRE_REQUIRED');
  return { cierre, rows };
}
