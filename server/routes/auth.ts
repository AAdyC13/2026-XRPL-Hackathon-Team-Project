/**
 * server/routes/auth.ts
 * ─────────────────────────────────────────────────────
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * GET  /api/v1/auth/me
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { ensureTrustLine, sendGkc } from '../services/xrpl.js';
import { z } from 'zod';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';
const BCRYPT_ROUNDS = 10;

// ── Schemas ────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  xrpAddress: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── POST /register ─────────────────────────────────────────────────────────

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { username, email, password, xrpAddress } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: 'Email or username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();

  await prisma.user.create({
    data: {
      id,
      username,
      email,
      passwordHash,
      role: 'user',
      verificationStatus: 'pending',
      ...(xrpAddress ? { xrpAddress } : {}),
    },
  });

  const token = jwt.sign(
    { sub: id, username, role: 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );

  // If XRP address provided and already has TrustLine, send welcome GKC async
  if (xrpAddress) {
    ensureTrustLine(xrpAddress)
      .then(hasTrust => {
        if (!hasTrust) return;
        return sendGkc(xrpAddress, 100, 'GKC_WELCOME').then(async txHash => {
          await prisma.transaction.create({
            data: {
              id: crypto.randomUUID(),
              userId: id,
              type: 'topup',
              amountGkc: 100,
              txHash,
              description: '新用戶歡迎獎勵 GKC × 100',
            },
          });
          console.log(`[auth] Welcome bonus sent → ${xrpAddress} tx=${txHash}`);
        });
      })
      .catch(e => console.error('[auth] Welcome bonus check failed:', e));
  }

  res.status(201).json({ token, user: { id, username, email, role: 'user' } });
});

// ── POST /login ────────────────────────────────────────────────────────────

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      verificationStatus: user.verificationStatus,
      xrpAddress: user.xrpAddress,
      theme: user.theme,
    },
  });
});

// ── GET /me ────────────────────────────────────────────────────────────────

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    verificationStatus: user.verificationStatus,
    xrpAddress: user.xrpAddress,
    theme: user.theme,
  });
});

// ── PATCH /profile ─────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must be 3-64 chars with letters, numbers, underscores.',
  }),
});

authRouter.patch('/profile', authenticate, async (req, res) => {
  const parsed = ProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
    res.status(400).json({ error: msg });
    return;
  }
  const { username } = parsed.data;
  const conflict = await prisma.user.findFirst({
    where: { username, NOT: { id: req.user!.id } },
  });
  if (conflict) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { username },
    select: { id: true, username: true, email: true, role: true },
  });
  res.json({ ok: true, user: updated });
});

// ── PATCH /password ─────────────────────────────────────────────────────────

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must include uppercase, lowercase, and number with minimum 8 chars.',
  }),
});

authRouter.patch('/password', authenticate, async (req, res) => {
  const parsed = PasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
    res.status(400).json({ error: msg });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
  res.json({ ok: true });
});

// ── PATCH /preferences ─────────────────────────────────────────────────────

const PreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
});

authRouter.patch('/preferences', authenticate, async (req, res) => {
  const parsed = PreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { theme: parsed.data.theme },
  });
  res.json({ ok: true, theme: parsed.data.theme });
});
