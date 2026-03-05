import { redirect } from "next/navigation";
import {
  setAdminUserActiveAction,
  upsertAdminUserAction,
} from "@/app/admin/actions";
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
    <section className="space-y-6">
      {/* Header */}
      <div className="hero-surface p-6 md:p-8">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10">
          <p className="section-kicker text-white/70">Access Control</p>
          <h1 className="heading-display mt-2 text-3xl text-white">Admin Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Kelola akses owner dan editor dengan kontrol yang lebih jelas, aman, dan cepat.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger-children grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activeUsers}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owners</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{ownerUsers}</p>
        </div>
      </div>

      {/* Add/Update User Form */}
      <form action={upsertAdminUserAction} className="panel p-5 space-y-4">
        <input type="hidden" name="returnTo" value="/admin/users" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Add or Update User</h2>
          <p className="text-sm text-slate-600">Gunakan email yang sama untuk update role/status.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Email</span>
            <input name="email" type="email" required placeholder="user@email.com" className="input" />
          </label>
          <label className="space-y-1.5 text-sm text-slate-700">
            <span className="font-medium">Role</span>
            <select name="role" defaultValue="editor" className="input">
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded" />
          Active
        </label>
        <button type="submit" className="btn btn-primary btn-sm">Save User</button>
      </form>

      {/* User List */}
      <div className="panel space-y-4 p-5">
        {statusLabel[status] && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${status.includes("error") || status === "unauthorized" || status === "rate_limited" || status === "user_last_owner"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
            <span>{status === "user_updated" ? "✓" : "⚠️"}</span>
            {statusLabel[status]}
          </div>
        )}
        <h2 className="text-lg font-bold text-slate-900">Existing Users</h2>
        {users.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">No admin users configured yet.</div>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-primary">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.email}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`badge text-[10px] ${user.role === "owner" ? "badge-accent" : "badge-neutral"}`}>
                          {user.role}
                        </span>
                        <span className={`badge text-[10px] ${user.isActive ? "badge-success" : "badge-danger"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <form action={setAdminUserActiveAction}>
                    <input type="hidden" name="returnTo" value="/admin/users" />
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="isActive" value={user.isActive ? "false" : "true"} />
                    <button type="submit" className={`btn btn-sm ${user.isActive ? "bg-red-600 text-white hover:bg-red-700" : "btn-primary"}`}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

