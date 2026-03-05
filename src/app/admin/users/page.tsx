import Link from "next/link";
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

const inputClass =
  "w-full rounded-xl border border-slate-300/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

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
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-white to-accent/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Access Control
          </p>
          <h1 className="heading-display mt-2 text-3xl text-slate-900">Admin Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Kelola akses owner dan editor dengan kontrol yang lebih jelas, aman, dan cepat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href="/admin"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700"
            >
              Products
            </Link>
            <Link
              href="/admin/articles"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700"
            >
              Articles
            </Link>
            <Link
              href="/admin/logs"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700"
            >
              Logs
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{users.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Users</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{activeUsers}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Owners</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{ownerUsers}</p>
        </div>
      </div>

      <form action={upsertAdminUserAction} className="panel grid gap-4 p-5 md:grid-cols-2">
        <input type="hidden" name="returnTo" value="/admin/users" />
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Add or Update User</h2>
          <p className="text-sm text-slate-600">Gunakan email yang sama untuk update role/status.</p>
        </div>
        <label className="space-y-1 text-sm text-slate-700">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="user@email.com"
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span>Role</span>
          <select name="role" defaultValue="editor" className={inputClass}>
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded" />
          Active
        </label>
        <button
          type="submit"
          className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Save User
        </button>
      </form>

      <div className="panel space-y-4 p-5">
        {statusLabel[status] && (
          <p className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {statusLabel[status]}
          </p>
        )}
        <h2 className="text-lg font-semibold text-slate-900">Existing Users</h2>
        {users.length === 0 ? (
          <p className="text-sm text-slate-600">No admin users configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{user.email}</p>
                    <p className="text-slate-600">
                      role: {user.role} | status: {user.isActive ? "active" : "inactive"}
                    </p>
                  </div>
                  <form action={setAdminUserActiveAction}>
                    <input type="hidden" name="returnTo" value="/admin/users" />
                    <input type="hidden" name="id" value={user.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={user.isActive ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100"
                    >
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

