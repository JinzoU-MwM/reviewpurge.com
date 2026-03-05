import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <div className="admin-page min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <span className="heading-display text-4xl font-bold text-[var(--admin-text)]">
              Review<span className="text-[var(--primary-light)]">Purge</span>
            </span>
          </Link>
          <p className="text-sm text-[var(--admin-text-muted)]">Admin Authentication Portal</p>
        </div>

        {/* Login Card */}
        <div className="admin-panel overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#0d7a6f] via-[#0a5550] to-[#073d39] p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(216,140,36,0.25),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(11,124,111,0.3),transparent_35%)]" />
            <div className="relative z-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur border border-white/15">
                
              </div>
              <h1 className="heading-display mt-4 text-2xl text-white">Admin Login</h1>
              <p className="mt-2 text-sm text-white/60">
                Secure authentication via magic link
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6">
            <AdminLoginForm nextPath={nextPath} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--admin-text-muted)] hover:text-[var(--primary-light)] transition-colors">
            <span></span>
            <span>Back to homepage</span>
          </Link>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-[var(--admin-text-dim)]">
             This area is restricted to authorized administrators only.
          </p>
        </div>
      </div>
    </div>
  );
}

