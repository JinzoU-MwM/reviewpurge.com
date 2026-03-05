import Link from "next/link";

const pillars = [
  {
    title: "Indonesia Commerce",
    href: "/indonesia",
    description: "Kurasi produk lokal dengan demand tinggi dan jalur konversi cepat.",
    tag: "Local",
  },
  {
    title: "Global Software",
    href: "/global",
    description: "Tool AI dan SaaS global untuk audience dengan buying power lebih kuat.",
    tag: "Global",
  },
  {
    title: "SEO Editorial",
    href: "/blog",
    description: "Mesin konten untuk menangkap intent organik dan memperpanjang funnel.",
    tag: "Organic",
  },
];

const metrics = [
  { label: "Affiliate Programs", value: "Multi-Region" },
  { label: "Operational Security", value: "RBAC + Audit Trail" },
  { label: "Alerting", value: "Warn + Critical Routing" },
  { label: "Publishing", value: "Scheduled + Automated" },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="hero-surface p-6 md:p-10">
        <div className="relative z-10 space-y-4">
          <p className="section-kicker text-white/75">Affiliate Growth System</p>
          <h1 className="heading-display max-w-4xl text-4xl leading-tight text-white md:text-6xl reveal-up">
            Website afiliator yang terlihat premium, dipercaya user, dan siap scale.
          </h1>
          <p className="max-w-2xl text-sm text-emerald-50 md:text-base reveal-up">
            ReviewPurge menggabungkan halaman komersial, blog SEO, redirect affiliate, dan
            observability operasional dalam satu stack yang rapi.
          </p>
          <div className="flex flex-wrap gap-3 reveal-up">
            <Link
              href="/indonesia"
              className="rounded-full bg-amber-300 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-amber-200"
            >
              Explore Indonesia Picks
            </Link>
            <Link
              href="/blog"
              className="rounded-full border border-white/40 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Read Monetization Articles
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <article key={item.label} className="panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {pillars.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group panel p-5 transition hover:-translate-y-0.5 hover:border-primary/60"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.tag}
            </p>
            <h2 className="heading-display mt-1 text-2xl text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
              Open section ?
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}

