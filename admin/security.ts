import type { NextFunction, Request, Response } from "express";
import { adminEnv } from "./env.js";
import { auditAdminEvent } from "./audit.js";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function normalizeIp(ip: string | undefined) {
  return ip?.replace(/^::ffff:/, "") ?? "unknown";
}

export function adminIpAllowlist(req: Request, res: Response, next: NextFunction) {
  const allowlist = adminEnv.ADMIN_IP_ALLOWLIST?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowlist?.length) {
    next();
    return;
  }

  const ip = normalizeIp(req.ip);
  if (allowlist.includes(ip)) {
    next();
    return;
  }

  auditAdminEvent("ip_blocked", { ip, path: req.path });
  res.status(403).json({ error: "Admin IP is not allowed." });
}

export function adminRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = normalizeIp(req.ip);
  const now = Date.now();
  const bucket = requestBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  bucket.count += 1;
  if (bucket.count > adminEnv.ADMIN_RATE_LIMIT_MAX) {
    auditAdminEvent("rate_limited", { ip, path: req.path });
    res.status(429).json({ error: "Too many admin requests." });
    return;
  }

  next();
}
