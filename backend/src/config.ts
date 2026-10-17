import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Raíz del paquete backend (funciona tanto desde src/ con tsx como desde dist/). */
export const BACKEND_ROOT = path.resolve(here, '..');

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function list(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET es obligatorio en producción.');
  jwtSecret = randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET no definido: se generó uno temporal (las sesiones se invalidan al reiniciar).');
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 4000),
  /** Origen público del frontend (para CORS y redirecciones OAuth). */
  frontendUrl: env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret,
  sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 8),
  cookieName: 'aig_session',

  /** HTML original del que se extraen los cierres semilla (const RAW = {...}). */
  seedHtmlPath: path.resolve(BACKEND_ROOT, env.SEED_HTML_PATH ?? '../Dashboard_Cartera_AIG.html'),
  /** Directorio donde se persisten los cierres cargados vía /api/upload. */
  dataDir: path.resolve(BACKEND_ROOT, env.DATA_DIR ?? './data'),
  maxUploadMb: Number(env.MAX_UPLOAD_MB ?? 25),

  /** Usuarios locales. Formato: email:bcryptHash:rol:Nombre;email2:... (ver README). */
  usersSpec: env.AUTH_USERS,

  google: {
    clientId: env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/api/auth/google/callback',
    /** Si se define, solo se aceptan cuentas de estos dominios (p.ej. apoyointegral.com.gt). */
    allowedDomains: list(env.GOOGLE_ALLOWED_DOMAINS),
    /** Habilita el flujo simulado cuando no hay credenciales de Google (por defecto: solo fuera de producción). */
    simulation: env.GOOGLE_SIMULATION ? env.GOOGLE_SIMULATION === 'true' : !isProd,
  },
  /** Correos con rol admin (pueden cargar cierres) al entrar con Google. */
  adminEmails: list(env.ADMIN_EMAILS),
  googleDefaultRole: (env.GOOGLE_DEFAULT_ROLE === 'admin' ? 'admin' : 'analyst') as 'admin' | 'analyst',
} as const;

export const googleOAuthEnabled = () => Boolean(config.google.clientId && config.google.clientSecret);
