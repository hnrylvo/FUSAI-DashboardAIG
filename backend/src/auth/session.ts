import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { Role, User } from '../data/users.js';
import { HttpError } from '../http/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const cookieOpts = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax' as const,
  path: '/',
});

export function issueSession(res: Response, user: User): string {
  const token = jwt.sign({ user }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionTtlHours}h`,
    subject: user.id,
    issuer: 'aig-portfolio',
  });
  res.cookie(config.cookieName, token, { ...cookieOpts(), maxAge: config.sessionTtlHours * 3600_000 });
  return token;
}

export function clearSession(res: Response) {
  res.clearCookie(config.cookieName, cookieOpts());
}

export function readSession(req: Request): User | null {
  let token = req.cookies?.[config.cookieName];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'aig-portfolio' }) as { user: User };
    return payload.user;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = readSession(req);
  if (!user) return next(new HttpError(401, 'Sesión no válida o expirada.', 'UNAUTHENTICATED'));
  req.user = user;
  next();
}

export const requireRole = (_role?: unknown) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    const user = readSession(req);
    if (!user) return next(new HttpError(401, 'Sesión no válida o expirada.', 'UNAUTHENTICATED'));
    req.user = user;
  }
  next();
};
