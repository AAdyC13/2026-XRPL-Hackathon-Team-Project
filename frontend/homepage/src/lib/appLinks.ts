/**
 * Dashboard SPA lives under /app (see src/main.ts SPA fallback).
 * Production/VPS: Nest serves homepage at / and dashboard at /app/* on one origin.
 * Local dev: homepage Vite proxies /app -> dashboard dev server (vite.config.ts).
 */
const appBase = (import.meta.env.VITE_APP_BASE as string | undefined) ?? "/app";

export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBase.replace(/\/$/, "")}${normalized}`;
}
