import type { AdminRole } from "@/lib/security/roles";

export function canAccessAdminPath(role: AdminRole, pathname: string) {
  if (!pathname.startsWith("/admin")) return true;
  if (role === "none") return false;

  if (pathname.startsWith("/admin/logs")) return role === "owner";
  if (pathname.startsWith("/admin/users")) return role === "owner";
  return role === "owner" || role === "editor";
}
