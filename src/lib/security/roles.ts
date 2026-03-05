export type AdminRole = "owner" | "editor" | "none";

export type AdminPermission =
  | "products:write"
  | "products:delete"
  | "products:bulk"
  | "articles:write"
  | "articles:delete"
  | "articles:bulk"
  | "programs:write"
  | "logs:read"
  | "users:manage";

function parseCsv(value?: string | null) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveAdminRoleFromEnv(email?: string | null): AdminRole {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return "none";

  const owners = parseCsv(process.env.ADMIN_OWNER_EMAILS);
  const editors = parseCsv(process.env.ADMIN_EDITOR_EMAILS);

  if (owners.has(normalized)) return "owner";
  if (editors.has(normalized)) return "editor";
  return "none";
}

export function resolveAdminRole(email?: string | null): AdminRole {
  return resolveAdminRoleFromEnv(email);
}

const permissionsByRole: Record<AdminRole, Set<AdminPermission>> = {
  owner: new Set<AdminPermission>([
    "products:write",
    "products:delete",
    "products:bulk",
    "articles:write",
    "articles:delete",
    "articles:bulk",
    "programs:write",
    "logs:read",
    "users:manage",
  ]),
  editor: new Set<AdminPermission>([
    "products:write",
    "articles:write",
    "programs:write",
  ]),
  none: new Set<AdminPermission>(),
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return permissionsByRole[role].has(permission);
}
