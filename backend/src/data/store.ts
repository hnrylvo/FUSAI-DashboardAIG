import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { type Dataset, KEYS, type Row } from '../engine/index.js';

interface RawSeed {
  generated: string;
  keys: string[];
  cierres: Record<string, Row[]>;
}

interface UploadedFile {
  cierres: Record<string, { rows: Row[]; uploadedAt: string; uploadedBy: string; source: string }>;
}

/** Reordena filas si el orden de columnas del origen difiere del canónico. */
function normalize(keys: string[], rows: Row[]): Row[] {
  if (keys.length === KEYS.length && keys.every((k, i) => k === KEYS[i])) return rows;
  const map = KEYS.map((k) => keys.indexOf(k));
  return rows.map((r) => map.map((i) => (i < 0 ? null : (r[i] ?? null))));
}

/**
 * Extrae `const RAW = {...};` del HTML original. Así el dashboard nuevo usa
 * exactamente los mismos datos sin duplicar 1.5 MB de información confidencial.
 */
export function loadSeedFromHtml(file: string): RawSeed | null {
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const marker = 'const RAW = ';
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const end = html.indexOf('\n', start);
  const json = html
    .slice(start + marker.length, end < 0 ? undefined : end)
    .trim()
    .replace(/;$/, '');
  return JSON.parse(json) as RawSeed;
}

class DataStore {
  private dataset: Dataset = { generated: '', cierres: {} };
  private uploads: UploadedFile = { cierres: {} };
  private seedCierres = new Set<string>();
  /** Se incrementa con cada cambio; útil para invalidar caches en clientes. */
  version = 1;
  updatedAt = new Date().toISOString();

  private get uploadsFile() {
    return path.join(config.dataDir, 'uploads.json');
  }

  load() {
    const seed = loadSeedFromHtml(config.seedHtmlPath);
    const cierres: Record<string, Row[]> = {};
    if (seed) {
      for (const [c, rows] of Object.entries(seed.cierres)) {
        cierres[c] = normalize(seed.keys, rows);
        this.seedCierres.add(c);
      }
      console.log(`[data] Semilla: ${Object.keys(seed.cierres).length} cierres desde ${config.seedHtmlPath}`);
    } else {
      console.warn(`[data] No se encontró semilla en ${config.seedHtmlPath}. Se inicia vacío; cargue cierres vía /api/upload.`);
    }
    if (fs.existsSync(this.uploadsFile)) {
      this.uploads = JSON.parse(fs.readFileSync(this.uploadsFile, 'utf8')) as UploadedFile;
      for (const [c, u] of Object.entries(this.uploads.cierres)) cierres[c] = u.rows;
      console.log(`[data] Persistidos: ${Object.keys(this.uploads.cierres).length} cierres cargados por usuarios`);
    }
    this.dataset = { generated: seed?.generated ?? new Date().toISOString().slice(0, 16).replace('T', ' '), cierres };
  }

  get(): Dataset {
    return this.dataset;
  }

  has(cierre: string) {
    return Object.hasOwn(this.dataset.cierres, cierre);
  }

  /** Inserta o reemplaza un cierre (CIERRES[cierre]=rows) y lo persiste en disco. */
  upsert(cierre: string, rows: Row[], meta: { uploadedBy: string; source: string }) {
    const replaced = this.has(cierre);
    this.dataset = { ...this.dataset, cierres: { ...this.dataset.cierres, [cierre]: rows } };
    this.uploads.cierres[cierre] = { rows, uploadedAt: new Date().toISOString(), ...meta };
    this.persist();
    this.version++;
    this.updatedAt = new Date().toISOString();
    return { replaced };
  }

  sources() {
    return Object.keys(this.dataset.cierres)
      .sort()
      .map((c) => {
        const u = this.uploads.cierres[c];
        return {
          cierre: c,
          rows: this.dataset.cierres[c].length,
          origin: u ? ('upload' as const) : ('seed' as const),
          uploadedAt: u?.uploadedAt ?? null,
          uploadedBy: u?.uploadedBy ?? null,
        };
      });
  }

  private persist() {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const tmp = this.uploadsFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.uploads));
    fs.renameSync(tmp, this.uploadsFile); // escritura atómica
  }
}

export const store = new DataStore();
