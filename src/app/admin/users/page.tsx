import { redirect } from "next/navigation";
import {
  setAdminUserActiveAction,
  upsertAdminUserAction,
} from "@/app/admin/actions";
import { AdminNav } from "@/components/admin-nav";
import { listAdminUsers } from "@/lib/db/queries/admin-users";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { role } = await getCurrentAdminIdentity();
  if (!canAccessAdminPath(role, "/admin/users")) {
    redirect("/admin/forbidden");
  }

  const params = await searchParams;
  const status = params.status ?? "";
  const users = await listAdminUsers();
  const activeUsers = users.filter((user) => user.isActive).length;
  const ownerUsers = users.filter((user) => user.role === "owner").length;
  const statusLabel: Record<string, string> = {
    user_updated: "Admin user updated.",
    user_last_owner: "Cannot deactivate or demote the last active owner.",
    user_error: "Admin user action failed.",
    unauthorized: "Unauthorized action.",
    rate_limited: "Rate limit exceeded. Please retry.",
  };

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <AdminNav currentPath="/admin/users" />
        
        <div className="admin-content space-y-6">
          {/* Header */}
          <div className="admin-header">
            <div className="admin-header-icon"></div>
            <div className="relative z-10">
              <p className="section-kicker">Access Control</p>
              <h1 className="heading-display mt-2">Admin Users</h1>
              <p className="mt-2 max-w-2xl">
                Kelola akses owner dan editor dengan kontrol yang lebih jelas, aman, dan cepat.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="admin-stats stagger-children">
            <div className="admin-stat-card">
              <span className="stat-icon"></span>
              <p className="stat-label">Total Users</p>
              <p className="stat-value">{users.length}</p>
              <p className="stat-meta">Registered admins</p>
            </div>
            <div className="admin-stat-card stat-success">
              <span className="stat-icon"></span>
              <p className="stat-label">Active Users</p>
              <p className="stat-value">{activeUsers}</p>
              <p className="stat-meta">Can login</p>
            </div>
            <div className="admin-stat-card stat-warning">
              <span className="stat-icon"></span>
              <p className="stat-label">Owners</p>
              <p className="stat-value">{ownerUsers}</p>
              <p className="stat-meta">Full access</p>
            </div>
          </div>

          {/* Status Banner */}
          {statusLabel[status] && (
            <div className={`admin-banner ${status.includes("error") || status === "unauthorized" || status === "rate_limited" || status === "user_last_owner" ? "admin-banner-danger" : "admin-banner-success"}`}>
              <span className="admin-banner-icon">{status === "user_updated" ? "" : ""}</span>
              <span>{statusLabel[status]}</span>
            </div>
          )}

          {/* Add/Update User Form */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon"></span> Add or Update User</h2>
            </div>
            <div className="admin-panel-body">
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">
                Use an existing email to update role/status, or a new email to create a user.
              </p>
              <form action={upsertAdminUserAction} className="admin-form">
                <input type="hidden" name="returnTo" value="/admin/users" />
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Email Address</label>
                    <input name="email" type="email" required placeholder="user@email.com" className="admin-input" />
                  </div>
                  <div className="admin-form-group">
                    <label>Role</label>
                    <select name="role" defaultValue="editor" className="admin-input admin-select">
                      <option value="owner">Owner (Full Access)</option>
                      <option value="editor">Editor (Limited)</option>
                    </select>
                  </div>
                </div>
                <label className="admin-checkbox-label">
                  <input type="checkbox" name="isActive" defaultChecked className="admin-checkbox" />
                  Active (can login)
                </label>
                <div>
                  <button type="submit" className="admin-btn admin-btn-primary">
                     Save User
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon"></span> User Directory</h2>
            </div>
            <div className="admin-panel-body">
              {users.length === 0 ? (
                <div className="admin-empty">
                  <span className="admin-empty-icon"></span>
                  <p className="admin-empty-title">No admin users yet</p>
                  <p className="admin-empty-description">Add your first admin user above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="admin-user-card">
                      <div className="admin-user-avatar">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="admin-user-info">
                        <p className="admin-user-email">{user.email}</p>
                        <div className="admin-user-badges">
                          <span className={`admin-badge ${user.role === "owner" ? "admin-badge-accent" : "admin-badge-neutral"}`}>
                            {user.role === "owner" ? " Owner" : " Editor"}
                          </span>
                          <span className={`admin-badge ${user.isActive ? "admin-badge-success" : "admin-badge-danger"}`}>
                            {user.isActive ? " Active" : " Inactive"}
                          </span>
                        </div>
                      </div>
                      <form action={setAdminUserActiveAction}>
                        <input type="hidden" name="returnTo" value="/admin/users" />
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="isActive" value={user.isActive ? "false" : "true"} />
                        <button type="submit" className={`admin-btn admin-btn-sm ${user.isActive ? "admin-btn-danger" : "admin-btn-primary"}`}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

