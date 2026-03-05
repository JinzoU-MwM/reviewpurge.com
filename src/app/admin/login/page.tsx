import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <section className="mx-auto max-w-md space-y-6 pt-8">
      <div className="text-center space-y-2">
        <Link href="/" className="heading-display text-3xl font-bold text-slate-900 inline-block">
          Review<span className="text-primary">Purge</span>
        </Link>
        <p className="text-sm text-slate-500">Admin Panel</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary/80 p-6 text-white text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl backdrop-blur">
            🔐
          </div>
          <h1 className="heading-display mt-3 text-2xl">Admin Login</h1>
          <p className="mt-1 text-sm text-white/70">
            Sign in via magic link
          </p>
        </div>
        <div className="p-6">
          <AdminLoginForm nextPath={nextPath} />
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        <Link href="/" className="transition hover:text-primary">
          ← Back to homepage
        </Link>
      </p>
    </section>
  );
}
