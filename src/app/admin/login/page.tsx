import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/95 to-primary/85 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Secure Access</p>
          <h1 className="heading-display mt-2 text-3xl">Admin Login</h1>
          <p className="mt-2 text-sm text-white/80">
            Sign in via magic link untuk akses area admin yang terlindungi.
          </p>
          <Link href="/" className="mt-4 inline-block text-xs text-white/90 underline">
            Back to homepage
          </Link>
        </div>
      </div>

      <div className="panel p-5">
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </section>
  );
}

