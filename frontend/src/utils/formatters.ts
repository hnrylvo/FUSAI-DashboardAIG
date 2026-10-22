export const fQ = (n?: number | null): string =>
  'Q' + Math.round(n || 0).toLocaleString('es-GT');

export const fQ2 = (n?: number | null): string =>
  'Q' + (n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fN = (n?: number | null): string =>
  (n || 0).toLocaleString('es-GT');

export const fPct = (x?: number | null): string =>
  ((x || 0) * 100).toLocaleString('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

export const cLabel = (c: string): string => {
  if (!c) return '';
  const [y, m] = c.split('-');
  const M = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${M[+m]} '${(y || '').slice(2)}`;
};

export const formatIsoDate = (d?: string | null): string => {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
};

/** Paleta de colores oficial de gráficos del dashboard original */
export const CHART_PALETTE = [
  '#014F84', // Navy principal
  '#F48437', // Naranja primario
  '#2E7DB0', // Azul acero
  '#F9A05C', // Naranja suave
  '#5B93B8', // Azul cielo medio
  '#B8531A', // Terracota / ámbar
  '#7FA8C9', // Azul grisáceo
  '#e0a500', // Ámbar dorado
  '#9AB6CC', // Azul pastel
  '#8C4A2A', // Marrón cálido
  '#2e9e6b', // Verde esmeralda
  '#6b7885', // Gris pizarra
  '#023e68', // Azul marino profundo
  '#ff9a54', // Naranja claro
];
