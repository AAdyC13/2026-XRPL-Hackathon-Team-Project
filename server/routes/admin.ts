/**
 * server/routes/admin.ts
 * ─────────────────────────────────────────────────────
 * Admin-only user management endpoints.
 *
 * GET  /api/v1/admin/users             — list users (paginated, filterable)
 * POST /api/v1/admin/users/:id/approve — set verificationStatus = 'verified'
 * POST /api/v1/admin/users/:id/reject  — set verificationStatus = 'rejected'
 * POST /api/v1/admin/users/:id/reset   — set verificationStatus = 'pending'
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { prisma } from '../db/index.js';
import { z } from 'zod';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole('admin'));

const ListUsersQuery = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

// ── GET /users ─────────────────────────────────────────────────────────────

adminRouter.get('/users', async (req, res) => {
  const parsed = ListUsersQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { page, limit, status } = parsed.data;
  const skip = (page - 1) * limit;

  const where = status ? { verificationStatus: status } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        verificationStatus: true,
        xrpAddress: true,
        isActive: true,
        createdAt: true,
        verifiedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    total,
    page,
    limit,
  });
});

// ── POST /users/:id/approve ────────────────────────────────────────────────

adminRouter.post('/users/:id/approve', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { verificationStatus: 'verified', verifiedAt: new Date() },
    select: { id: true, username: true, email: true, role: true, verificationStatus: true, xrpAddress: true, createdAt: true },
  });

  res.json(updated);
});

// ── POST /users/:id/reject ─────────────────────────────────────────────────

adminRouter.post('/users/:id/reject', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { verificationStatus: 'rejected' },
    select: { id: true, username: true, email: true, role: true, verificationStatus: true, xrpAddress: true, createdAt: true },
  });

  res.json(updated);
});

// ── POST /users/:id/reset ──────────────────────────────────────────────────

adminRouter.post('/users/:id/reset', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { verificationStatus: 'pending', verifiedAt: null },
    select: { id: true, username: true, email: true, role: true, verificationStatus: true, xrpAddress: true, createdAt: true },
  });

  res.json(updated);
});

// ── POST /users/:id/deactivate ─────────────────────────────────────────────

adminRouter.post('/users/:id/deactivate', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ deactivated: true });
});
