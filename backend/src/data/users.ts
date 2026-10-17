import bcrypt from 'bcryptjs';
import { config } from '../config.js';

export type Role = 'admin' | 'analyst';
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: 'password' | 'google';
  picture?: string;
}
interface LocalUser extends User {
  passwordHash: string;
}

/**
 * Cuentas demo para desarrollo. En producción defina AUTH_USERS con hashes
 * bcrypt (genérelos con `npm run hash-password`).
 */
const DEMO_USERS = [
  { email: 'riesgos@apoyointegral.com.gt', password: 'Cartera2026!', role: 'admin' as Role, name: 'Analista de Riesgos' },
  { email: 'direccion@apoyointegral.com.gt', password: 'Direccion2026!', role: 'analyst' as Role, name: 'Dirección General' },
];

const users = new Map<string, LocalUser>();
export let usingDemoUsers = false;

export function initUsers() {
  users.clear();
  if (config.usersSpec) {
    for (const entry of config.usersSpec.split(';').map((s) => s.trim()).filter(Boolean)) {
      const [email, passwordHash, role, ...name] = entry.split(':');
      if (!email || !passwordHash?.startsWith('$2')) {
        console.warn(`[auth] Entrada AUTH_USERS inválida ignorada: ${email}`);
        continue;
      }
      const e = email.toLowerCase();
      users.set(e, {
        id: `pwd:${e}`,
        email: e,
        passwordHash,
        role: role === 'admin' ? 'admin' : 'analyst',
        name: name.join(':') || e,
        provider: 'password',
      });
    }
  }
  if (!users.size) {
    if (config.isProd) throw new Error('AUTH_USERS es obligatorio en producción.');
    usingDemoUsers = true;
    for (const u of DEMO_USERS) {
      users.set(u.email, {
        id: `pwd:${u.email}`,
        email: u.email,
        name: u.name,
        role: u.role,
        provider: 'password',
        passwordHash: bcrypt.hashSync(u.password, 10),
      });
    }
    console.warn('[auth] Usando cuentas DEMO (defina AUTH_USERS para producción).');
  }
}

// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', 10);

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const u = users.get(email.toLowerCase());
  const ok = await bcrypt.compare(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !ok) return null;
  const { passwordHash: _omit, ...pub } = u;
  return pub;
}

export function googleUser(profile: { email: string; name?: string; picture?: string }): User {
  const email = profile.email.toLowerCase();
  return {
    id: `google:${email}`,
    email,
    name: profile.name || email,
    picture: profile.picture,
    role: config.adminEmails.includes(email) ? 'admin' : config.googleDefaultRole,
    provider: 'google',
  };
}

export const demoAccounts = () =>
  usingDemoUsers ? DEMO_USERS.map(({ email, password, role, name }) => ({ email, password, role, name })) : [];
