import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <section className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Access Forbidden</h1>
      <p className="text-slate-600">
        Akun Anda belum punya role yang cukup untuk membuka halaman admin ini.
      </p>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/" className="text-sky-600">
          Go Home
        </Link>
        <Link href="/admin" className="text-sky-600">
          Back to Admin
        </Link>
      </div>
    </section>
  );
}
