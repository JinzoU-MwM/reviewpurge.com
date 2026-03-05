import { AdminLoginForm } from "@/components/admin-login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="text-sm text-slate-600">
        Sign in using magic link email to access `/admin`.
      </p>
      <AdminLoginForm nextPath={nextPath} />
    </section>
  );
}
