export type Role = 'admin' | 'analyst';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: 'password' | 'google';
  picture?: string;
}

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  name: string;
}

export interface ProvidersResponse {
  google: 'oauth' | 'simulated' | 'disabled';
  demoAccounts: DemoAccount[];
}

export type Key =
  | 'ref'
  | 'cod'
  | 'cli'
  | 'ase'
  | 'ges'
  | 'dep'
  | 'mun'
  | 'fdes'
  | 'mod'
  | 'mo'
  | 'sc'
  | 'kmora'
  | 'cuota'
  | 'dpago'
  | 'fven'
  | 'ucp'
  | 'sexo'
  | 'ufp'
  | 'dmora'
  | 'sest'
  | 'tc'
  | 'gar'
  | 'prod'
  | 'tel'
  | 'ag';

export type FilterKey = 'ag' | 'ase' | 'ges' | 'dep' | 'mod' | 'sexo';

export interface FilterMetaItem {
  key: FilterKey;
  label: string;
  options: string[];
}

export interface AtrasoMetaItem {
  key: string;
  label: string;
}

export interface CierreSourceItem {
  cierre: string;
  rows: number;
  origin: 'seed' | 'upload';
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export interface MetaResponse {
  generated: string;
  version: number;
  updatedAt: string;
  cierres: CierreSourceItem[];
  filters: FilterMetaItem[];
  atraso: AtrasoMetaItem[];
}

export interface FilterPayload {
  sel: Partial<Record<FilterKey, string[]>>;
  atraso: string[];
}

export interface KpiResult {
  cierre: string;
  prevCierre: string | null;
  cartera: number;
  prevCartera: number | null;
  nCli: number;
  nCreditos: number;
  par1: number;
  par30: number;
  cliMora: number;
  ticket: number;
  alDia: number;
  criticaN: number;
  criticaMonto: number;
  cuotaTotal: number;
}

export interface TrendsResult {
  cierres: string[];
  cartera: number[];
  ncli: number[];
  par1m: number[];
  par1c: number[];
  par30m: number[];
  par30c: number[];
}

export interface OverviewResponse {
  kpis: KpiResult;
  trends: TrendsResult;
}

export type ColocTipo = 'ALL' | 'CREDITO NUEVO' | 'RECURRENTE CON SALDO' | 'RECURRENTE SIN SALDO' | 'REESTRUCTURA';

export interface PlacementResponse {
  tipo: ColocTipo;
  cierres: string[];
  monto: number[];
  num: number[];
  totalMonto: number;
  totalNum: number;
}

export type KV = [label: string, value: number];

export interface CompositionResponse {
  prodCart: KV[];
  prodCli: KV[];
  moraProdCart: KV[];
  moraProdCli: KV[];
  saldoCart: KV[];
  saldoCli: KV[];
}

export type RankingBucket = 'sana' | 'b1' | 'b2' | 'b3' | 'b4';

export interface LoanRecord {
  ref: string | null;
  cod: string | null;
  cli: string | null;
  ase: string | null;
  ges: string | null;
  dep: string | null;
  mun: string | null;
  fdes: string | null;
  mod: string | null;
  mo: number | null;
  sc: number | null;
  kmora: number | null;
  cuota: number | null;
  dpago: number | null;
  fven: string | null;
  ucp: number | null;
  sexo: string | null;
  ufp: string | null;
  dmora: number | null;
  sest: string | null;
  tc: string | null;
  gar: string | null;
  prod: string | null;
  tel: string | null;
  ag: string | null;
  rank: number;
}

export interface RankingResponse {
  bucket: RankingBucket;
  total: number;
  page: number;
  pageSize: number;
  rows: LoanRecord[];
}

export interface PaymentDaysResponse {
  mode: 'all' | 'dia';
  days: number[];
  monto: number[];
  cnt: number[];
}

export interface MaturityRecord extends LoanRecord {
  daysToDue: number;
}

export interface MaturitiesResponse {
  window: '30' | '90';
  rows: MaturityRecord[];
}

export interface PreCollectionRecord extends LoanRecord {
  firstPay: string;
}

export interface PreCollectionResponse {
  rows: PreCollectionRecord[];
}

export interface AttritionRecord extends LoanRecord {
  moAgg: number;
}

export type RangeResult<T> = { valid: false } | ({ valid: true } & T);

export type AttritionResponse = RangeResult<{ rows: AttritionRecord[] }>;

export type MoraBucket = 'dia' | 'b1' | 'b2' | 'b3' | 'b4';
export type MtxRowKey = MoraBucket | 'nuevo';
export type MtxColKey = MoraBucket | 'cancel';

export interface MtxCell {
  n: number;
  m: number;
}

export interface MatrixData {
  de: string;
  a: string;
  rowKeys: MtxRowKey[];
  colKeys: MtxColKey[];
  cells: Record<MtxRowKey, Record<MtxColKey, MtxCell>>;
}

export type MatrixResponse = RangeResult<MatrixData>;

export interface UploadFileResult {
  file: string;
  ok: boolean;
  cierre?: string;
  rows?: number;
  replaced?: boolean;
  code?: string;
  message?: string;
}

export interface UploadResponse {
  results: UploadFileResult[];
  version: number;
}
