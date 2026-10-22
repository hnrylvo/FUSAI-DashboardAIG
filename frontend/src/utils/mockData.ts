/**
 * Generador de datos sintéticos, deterministas y anonimizados para desarrollo y pruebas offline.
 * ---------------------------------------------------------------------------------------------
 * NO contiene datos confidenciales ni reales. Permite operar el frontend con fidelidad
 * cuando no se dispone de conexión activa con el backend de Node.js o SQL Server.
 */

import type {
  FilterMetaItem,
  LoanRecord,
  MetaResponse,
} from '../types/api';

const AGENCIAS = ['CENTRAL', 'JALAPA', 'CHIQUIMULA', 'ZACAPA', 'ESCUINTLA', 'QUETZALTENANGO', 'COBAN'];
const ASESORES = ['Carlos Pérez', 'María Gómez', 'Juan Rodríguez', 'Ana Morales', 'Luis Hernández'];
const GESTORES = ['Pedro Castillo', 'Sofía Vásquez', 'Roberto Álvarez', '(Sin dato)'];
const DEPARTAMENTOS = ['GUATEMALA', 'JALAPA', 'CHIQUIMULA', 'ZACAPA', 'ESCUINTLA', 'QUETZALTENANGO', 'ALTA VERAPAZ'];
const MUNICIPIOS = ['Guatemala', 'Jalapa', 'Chiquimula', 'Zacapa', 'Escuintla', 'Quetzaltenango', 'Cobán'];
const PRODUCTOS = ['MICROCREDITO PRODUCTIVO', 'COMERCIO Y SERVICIOS', 'AGROPECUARIO', 'VIVIENDA', 'CONSUMO'];
const MODALIDADES = ['Mensual', 'Quincenal', 'Catorcenal', 'Semanal'];
const SEXOS = ['MASCULINO', 'FEMENINO'];
const TIPOS_CREDITO = ['CREDITO NUEVO', 'RECURRENTE CON SALDO', 'RECURRENTE SIN SALDO', 'REESTRUCTURA'];
const GARANTIAS = ['FIDUCIARIA', 'PRENDARIA', 'HIPOTECARIA', 'SOLIDARIA'];

export const SYNTHETIC_CIERRES = [
  '2026-04-30',
  '2026-05-31',
  '2026-06-30',
  '2026-07-31',
  '2026-08-31',
  '2026-09-30',
];

// Generador pseudoaleatorio determinista LCG
function createRng(seed = 123456789) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Genera una colección determinista de préstamos sintéticos para un corte específico
 */
export function generateSyntheticLoans(cierre: string, count = 250): LoanRecord[] {
  const seedNum = cierre.split('-').reduce((acc, part) => acc * 31 + parseInt(part, 10), 0);
  const rng = createRng(seedNum);

  const [cy, cm] = cierre.split('-');
  const y = parseInt(cy, 10);
  const m = parseInt(cm, 10);

  const records: LoanRecord[] = [];

  for (let i = 1; i <= count; i++) {
    const cod = `CLI-${1000 + (i % 180)}`;
    const ref = `AIG-${cierre.replace(/-/g, '')}-${10000 + i}`;
    const ag = AGENCIAS[Math.floor(rng() * AGENCIAS.length)];
    const ase = ASESORES[Math.floor(rng() * ASESORES.length)];
    const ges = rng() > 0.3 ? GESTORES[Math.floor(rng() * GESTORES.length)] : '(Sin dato)';
    const depIdx = Math.floor(rng() * DEPARTAMENTOS.length);
    const dep = DEPARTAMENTOS[depIdx];
    const mun = MUNICIPIOS[depIdx];
    const prod = PRODUCTOS[Math.floor(rng() * PRODUCTOS.length)];
    const mod = MODALIDADES[Math.floor(rng() * MODALIDADES.length)];
    const sexo = SEXOS[Math.floor(rng() * SEXOS.length)];
    const tc = TIPOS_CREDITO[Math.floor(rng() * TIPOS_CREDITO.length)];
    const gar = GARANTIAS[Math.floor(rng() * GARANTIAS.length)];

    // Monto y saldo
    const mo = Math.round(5000 + rng() * 95000);
    const amortizadoPct = 0.1 + rng() * 0.8;
    const sc = Math.round(mo * amortizadoPct);
    const cuota = Math.round(mo / 12);
    const dpago = 1 + Math.floor(rng() * 30);

    // Días de mora (75% al día, 15% mora temprana, 10% mora mayor)
    const moraRoll = rng();
    let dmora = 0;
    if (moraRoll > 0.92) {
      dmora = Math.round(121 + rng() * 150);
    } else if (moraRoll > 0.85) {
      dmora = Math.round(91 + rng() * 30);
    } else if (moraRoll > 0.78) {
      dmora = Math.round(31 + rng() * 60);
    } else if (moraRoll > 0.70) {
      dmora = Math.round(1 + rng() * 30);
    }

    const kmora = dmora > 0 ? Math.round(cuota * 0.05 * (dmora / 30)) : 0;

    // Fechas
    const desMonthOffset = Math.floor(rng() * 10);
    const desDate = new Date(y, m - 1 - desMonthOffset, Math.max(1, Math.min(dpago, 28)));
    const fdes = desDate.toISOString().slice(0, 10);

    const venDate = new Date(y, m - 1 + Math.floor(1 + rng() * 18), dpago);
    const fven = venDate.toISOString().slice(0, 10);

    const ucp = rng() > 0.1 ? Math.floor(1 + rng() * 12) : 0;
    const ufp = ucp > 0 ? new Date(y, m - 2, dpago).toISOString().slice(0, 10) : null;

    records.push({
      ref,
      cod,
      cli: `Cliente Sintético ${cod}`,
      ase,
      ges,
      dep,
      mun,
      fdes,
      mod,
      mo,
      sc,
      kmora,
      cuota,
      dpago,
      fven,
      ucp,
      sexo,
      ufp,
      dmora,
      sest: dmora > 0 ? 'MORA' : 'NORMAL',
      tc,
      gar,
      prod,
      tel: `+502 5555-${String(1000 + i).slice(-4)}`,
      ag,
      rank: i,
    });
  }

  return records;
}

/** Genera metadatos sintéticos para el mock store */
export function generateSyntheticMeta(): MetaResponse {
  const filterKeys: Array<{ key: 'ag' | 'ase' | 'ges' | 'dep' | 'mod' | 'sexo'; label: string; options: string[] }> = [
    { key: 'ag', label: 'Agencia', options: AGENCIAS },
    { key: 'ase', label: 'Asesor', options: ASESORES },
    { key: 'ges', label: 'Gestor de cobro', options: GESTORES },
    { key: 'dep', label: 'Departamento', options: DEPARTAMENTOS },
    { key: 'mod', label: 'Modalidad', options: MODALIDADES },
    { key: 'sexo', label: 'Sexo', options: SEXOS },
  ];

  return {
    generated: '2026-10-21 12:00 (Mock Sintético)',
    version: 1,
    updatedAt: new Date().toISOString(),
    cierres: SYNTHETIC_CIERRES.map((c) => ({
      cierre: c,
      rows: 250,
      origin: 'seed' as const,
      uploadedAt: null,
      uploadedBy: null,
    })),
    filters: filterKeys as FilterMetaItem[],
    atraso: [
      { key: 'dia', label: 'Al día' },
      { key: 'a1', label: '1 a 30 días' },
      { key: 'a2', label: '31 a 60 días' },
      { key: 'a3', label: '61 a 90 días' },
      { key: 'a4', label: '91 a 180 días' },
      { key: 'a5', label: '181 a 265 días' },
      { key: 'a6', label: '> 265 días' },
    ],
  };
}
