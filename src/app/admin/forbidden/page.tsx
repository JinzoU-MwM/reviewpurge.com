import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-red-900/85 via-rose-800/85 to-slate-900/85 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Permission Check</p>
          <h1 className="heading-display mt-2 text-3xl">Access Forbidden</h1>
          <p className="mt-2 text-sm text-white/80">
            Akun Anda belum punya role yang cukup untuk membuka halaman admin ini.
          </p>
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm text-slate-700">
          Hubungi owner untuk upgrade role jika memang perlu akses ke modul ini.
        </p>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-700"
          >
            Go Home
          </Link>
          <Link
            href="/admin"
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-white"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    </section>
  );
}

