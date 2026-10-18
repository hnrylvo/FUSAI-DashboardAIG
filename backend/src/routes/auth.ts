import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { clearSession, issueSession, readSession } from '../auth/session.js';
import { config, googleOAuthEnabled } from '../config.js';
import { demoAccounts, googleUser, verifyCredentials } from '../data/users.js';
import { HttpError, parseBody } from '../http/errors.js';

export const authRouter = Router();

const googleClient = new OAuth2Client(config.google.clientId);

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Intente de nuevo en unos minutos.' } }),
});

const LoginSchema = z.object({
  email: z.string().trim().email('Ingrese un correo válido.').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(200),
});

const GoogleVerifySchema = z.object({
  credential: z.string().min(1, 'El ID Token de Google es obligatorio.'),
});

/** Proveedores disponibles + cuentas demo (solo fuera de producción). */
authRouter.get('/providers', (_req, res) => {
  res.json({
    google: googleOAuthEnabled() ? 'oauth' : config.google.simulation ? 'simulated' : 'disabled',
    clientId: config.google.clientId || undefined,
    demoAccounts: config.isProd ? [] : demoAccounts(),
  });
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parseBody(LoginSchema, req);
  const user = await verifyCredentials(email, password);
  if (!user) throw new HttpError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
  const token = issueSession(res, user);
  res.json({ user, token });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

authRouter.get('/me', (req, res) => {
  const user = readSession(req);
  if (!user) throw new HttpError(401, 'No autenticado.', 'UNAUTHENTICATED');
  res.json({ user });
});

/* ---------------------------- Google OAuth2 ---------------------------- */
const STATE_COOKIE = 'aig_oauth_state';

function domainAllowed(email: string, hd?: string) {
  const allowed = config.google.allowedDomains;
  if (!allowed.length) return true;
  const domain = (hd || email.split('@')[1] || '').toLowerCase();
  return allowed.includes(domain);
}

/**
 * POST /api/auth/google
 * Verificación del ID Token de Google en el servidor (Sign-In with Google / One Tap).
 * Valida la firma criptográfica con google-auth-library, aud, iss, exp y dominio corporativo.
 */
authRouter.post('/google', async (req, res, next) => {
  if (!config.google.clientId) {
    throw new HttpError(503, 'Google OAuth no está configurado en el servidor.', 'GOOGLE_NOT_CONFIGURED');
  }

  const { credential } = parseBody(GoogleVerifySchema, req);

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new HttpError(401, 'No se pudo verificar el payload del token.', 'INVALID_GOOGLE_TOKEN');
    }

    // Validación estricta de emisor (issuer) y audiencia (audience)
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      throw new HttpError(401, 'Emisor del token de Google no válido.', 'INVALID_ISSUER');
    }

    if (payload.aud !== config.google.clientId) {
      throw new HttpError(401, 'La audiencia del token de Google no coincide.', 'INVALID_AUDIENCE');
    }

    if (!payload.email || !payload.email_verified) {
      throw new HttpError(401, 'El correo de Google no está verificado.', 'GOOGLE_UNVERIFIED_EMAIL');
    }

    if (!domainAllowed(payload.email, payload.hd)) {
      throw new HttpError(403, 'Dominio de correo no autorizado. Utilice una cuenta corporativa.', 'GOOGLE_DOMAIN_DENIED');
    }

    // Extracción segura de claims de identidad validados en el servidor
    const user = googleUser({
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split('@')[0],
      picture: payload.picture,
    });

    const token = issueSession(res, user);

    res.json({
      user,
      token,
      message: 'Autenticación exitosa con Google.',
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return next(err);
    }
    // Errores de verificación criptográfica (firma inválida, expiración, etc.)
    console.error('[auth] Error al verificar ID Token de Google:', err instanceof Error ? err.message : err);
    return next(new HttpError(401, 'La credencial de Google es inválida o ha expirado.', 'INVALID_GOOGLE_TOKEN'));
  }
});

/** Paso 1: redirige al consentimiento de Google (Authorization Code flow + state anti-CSRF). */
authRouter.get('/google', (_req, res) => {
  if (!googleOAuthEnabled()) throw new HttpError(404, 'Google OAuth no está configurado.', 'GOOGLE_DISABLED');
  const state = randomBytes(24).toString('base64url');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, secure: config.isProd, sameSite: 'lax', maxAge: 10 * 60_000, path: '/' });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  if (config.google.allowedDomains.length === 1) params.set('hd', config.google.allowedDomains[0]);
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/** Paso 2: callback — intercambia el code por tokens y obtiene el perfil verificado. */
authRouter.get('/google/callback', async (req, res) => {
  const fail = (reason: string) => res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(reason)}`);
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const expected = req.cookies?.[STATE_COOKIE] as string | undefined;
  res.clearCookie(STATE_COOKIE, { path: '/' });
  if (error) return fail('google_denied');
  if (!code || !state || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected))) {
    return fail('google_state');
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail('google_token');
    const tokens = (await tokenRes.json()) as { access_token: string };
    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail('google_profile');
    const p = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string; picture?: string; hd?: string };
    if (!p.email || !p.email_verified) return fail('google_unverified');
    if (!domainAllowed(p.email, p.hd)) return fail('google_domain');
    issueSession(res, googleUser({ email: p.email, name: p.name, picture: p.picture }));
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (e) {
    console.error('[auth] Google OAuth error', e);
    fail('google_error');
  }
});

/**
 * Flujo simulado (desarrollo/demo): cuando no hay credenciales de Google, el
 * frontend muestra un selector de cuenta y crea la sesión aquí.
 */
const SimSchema = z.object({
  email: z.string().trim().email('Ingrese un correo válido.'),
  name: z.string().trim().min(2).max(120).optional(),
});
authRouter.post('/google/simulate', (req, res) => {
  if (googleOAuthEnabled() || !config.google.simulation) {
    throw new HttpError(404, 'La simulación de Google no está habilitada.', 'GOOGLE_SIM_DISABLED');
  }
  const { email, name } = parseBody(SimSchema, req);
  if (!domainAllowed(email)) throw new HttpError(403, 'Dominio de correo no permitido.', 'GOOGLE_DOMAIN');
  const user = googleUser({ email, name });
  const token = issueSession(res, user);
  res.json({ user, token });
});
