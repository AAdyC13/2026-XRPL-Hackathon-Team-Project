const appBase = (import.meta.env.VITE_APP_BASE as string | undefined) ?? "/app";

export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBase.replace(/\/$/, "")}${normalized}`;
}
