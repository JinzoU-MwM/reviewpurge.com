import Link from "next/link";
import type { AdminRole } from "@/lib/security/roles";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";

type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  description: string;
  requireOwner?: boolean;
};

const navItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Produk",
    icon: "PR",
    description: "Katalog dan program affiliate",
  },
  {
    href: "/admin/articles",
    label: "Artikel",
    icon: "CT",
    description: "Konten, draft, dan publish",
  },
  {
    href: "/admin/logs",
    label: "Logs",
    icon: "LG",
    description: "Audit, security, dan webhook",
    requireOwner: false,
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    icon: "RB",
    description: "Role owner/editor",
    requireOwner: true,
  },
];

export async function AdminNav({ currentPath }: { currentPath: string }) {
  let role: AdminRole | null = null;
  try {
    const identity = await getCurrentAdminIdentity();
    role = identity.role as AdminRole;
  } catch {
    // Not logged in or identity error.
  }

  const filteredItems = navItems.filter((item) => {
    if (item.requireOwner && role !== "owner") return false;
    if (item.href === "/admin/logs" && role) return canAccessAdminPath(role, "/admin/logs");
    if (item.href === "/admin/users" && role) return canAccessAdminPath(role, "/admin/users");
    return true;
  });

  return (
    <nav className="admin-nav">
      <div className="admin-nav-header">
        <Link href="/admin" className="admin-nav-brand">
          <span className="admin-nav-brand-icon">RP</span>
          <span className="admin-nav-brand-text">ReviewPurge Admin</span>
        </Link>
      </div>
      <ul className="admin-nav-list">
        {filteredItems.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/admin" && currentPath.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link href={item.href} className={`admin-nav-link ${isActive ? "active" : ""}`}>
                <span className="admin-nav-link-icon">{item.icon}</span>
                <span className="admin-nav-link-content">
                  <span className="admin-nav-link-label">{item.label}</span>
                  <span className="admin-nav-link-desc">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="admin-nav-footer">
        <Link href="/" className="admin-nav-external">
          <span>WWW</span>
          <span>Lihat Website</span>
        </Link>
      </div>
    </nav>
  );
}
