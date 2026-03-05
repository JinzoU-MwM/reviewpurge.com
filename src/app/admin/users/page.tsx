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

export default async function AdminUsersPage({ searchParams }: Props) {
  const { role } = await getCurrentAdminIdentity();
  if (!canAccessAdminPath(role, "/admin/users")) {
    redirect("/admin/forbidden");
  }

  const params = await searchParams;
  const status = params.status ?? "";
  const users = await listAdminUsers();
  const statusLabel: Record<string, string> = {
    user_updated: "Admin user updated.",
    user_last_owner: "Cannot deactivate or demote the last active owner.",
    user_error: "Admin user action failed.",
    unauthorized: "Unauthorized action.",
    rate_limited: "Rate limit exceeded. Please retry.",
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Users</h1>
        <p className="text-slate-600">Owner-only role management.</p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <Link href="/admin" className="text-sky-600">
            Back to admin
          </Link>
          <Link href="/admin/logs" className="text-sky-600">
            Open logs
          </Link>
        </div>
      </div>

      <form
        action={upsertAdminUserAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <input type="hidden" name="returnTo" value="/admin/users" />
        <h2 className="text-lg font-semibold">Add / Update User</h2>
        <input
          name="email"
          type="email"
          required
          placeholder="user@email.com"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <select
          name="role"
          defaultValue="editor"
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="owner">Owner</option>
          <option value="editor">Editor</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <button
          type="submit"
          className="w-fit rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        >
          Save User
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        {statusLabel[status] && (
          <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {statusLabel[status]}
          </p>
        )}
        <h2 className="text-lg font-semibold">Existing Users</h2>
        {users.length === 0 ? (
          <p className="text-sm text-slate-600">No admin users configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-md border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">{user.email}</p>
                <p className="text-slate-600">
                  role: {user.role} | status: {user.isActive ? "active" : "inactive"}
                </p>
                <div className="mt-2 flex items-center gap-2">
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
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
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
