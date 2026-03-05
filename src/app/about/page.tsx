export default function AboutPage() {
  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">About</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Tentang ReviewPurge</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Kami membangun website afiliator yang fokus pada trust, clarity, dan conversion consistency.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mission</p>
          <p className="mt-2 text-sm text-slate-700">Menyederhanakan keputusan pembelian digital.</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Approach</p>
          <p className="mt-2 text-sm text-slate-700">Konten berbasis use case nyata, bukan hype.</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Commitment</p>
          <p className="mt-2 text-sm text-slate-700">Transparansi affiliate dan update berkala.</p>
        </article>
      </div>
    </section>
  );
}

