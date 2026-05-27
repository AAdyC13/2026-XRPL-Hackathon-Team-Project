type AuditDetails = Record<string, unknown>;

export function auditAdminEvent(action: string, details: AuditDetails = {}) {
  console.log(
    JSON.stringify({
      scope: "admin-api",
      action,
      at: new Date().toISOString(),
      ...details
    })
  );
}
