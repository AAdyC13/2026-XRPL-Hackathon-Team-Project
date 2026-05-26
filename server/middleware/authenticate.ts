/**
 * server/middleware/authenticate.ts
 * ─────────────────────────────────────────────────────
 * Unified auth middleware: accepts JWT (session) or API key (gkc_sk_...).
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { sweepStaleSessions } from '../services/settle.js';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  apiKeyId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_me';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  // ── API Key path: gkc_sk_... ─────────────────────────────────────────
  if (token.startsWith('gkc_sk_')) {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    prisma.apiKey
      .findUnique({
        where: { keyHash },
        include: { user: true },
      })
      .then(apiKey => {
        if (!apiKey) {
          res.status(401).json({ error: 'Invalid API key' });
          return;
        }
        if (apiKey.revokedAt) {
          res.status(401).json({ error: 'API key has been revoked' });
          return;
        }
        if (
          apiKey.dailyLimitGkc !== null &&
          Number(apiKey.spentTodayGkc) >= Number(apiKey.dailyLimitGkc)
        ) {
          res.status(429).json({ error: 'Daily GKC limit reached for this API key' });
          return;
        }

        // Update last_used_at (fire-and-forget)
        prisma.apiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(e => console.error('[auth] Failed to update lastUsedAt:', e));

        req.user = {
          id: apiKey.userId,
          username: apiKey.user.username,
          role: apiKey.user.role,
          apiKeyId: apiKey.id,
        };
        sweepStaleSessions(apiKey.userId);
        next();
      })
      .catch(e => {
        console.error('[auth] API key lookup error:', e);
        res.status(500).json({ error: 'Internal server error' });
      });

    return;
  }

  // ── JWT path ──────────────────────────────────────────────────────────
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; username: string; role: string };
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    sweepStaleSessions(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
