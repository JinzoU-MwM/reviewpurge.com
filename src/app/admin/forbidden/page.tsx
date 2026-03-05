import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 pt-12 text-center">
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-red-900/90 via-rose-800/90 to-slate-900/90 p-8 text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur">
            🛡️
          </div>
          <h1 className="heading-display mt-4 text-3xl">Access Forbidden</h1>
          <p className="mt-2 text-sm text-white/70">
            Akun Anda belum punya role yang cukup untuk membuka halaman admin ini.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Hubungi owner untuk upgrade role jika memang perlu akses ke modul ini.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="btn btn-ghost btn-sm">
              Go Home
            </Link>
            <Link href="/admin" className="btn btn-primary btn-sm">
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
