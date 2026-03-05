import Link from "next/link";
import { StatCard } from "@/components/stat-card";

const pillars = [
  {
    title: "Indonesia Commerce",
    href: "/indonesia",
    description: "Kurasi produk lokal dengan demand tinggi dan jalur konversi cepat.",
    tag: "Local",
    emoji: "🇮🇩",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    title: "Global Software",
    href: "/global",
    description: "Tool AI dan SaaS global untuk audience dengan buying power lebih kuat.",
    tag: "Global",
    emoji: "🌐",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    title: "SEO Editorial",
    href: "/blog",
    description: "Mesin konten untuk menangkap intent organik dan memperpanjang funnel.",
    tag: "Organic",
    emoji: "✍️",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
];

const metrics = [
  { icon: "🔗", label: "Affiliate Programs", value: "Multi-Region", detail: "ID + Global coverage" },
  { icon: "🛡️", label: "Security", value: "RBAC + Audit", detail: "Role-based access control" },
  { icon: "🚨", label: "Alerting", value: "Warn + Critical", detail: "Real-time routing" },
  { icon: "📅", label: "Publishing", value: "Scheduled", detail: "Automated pipeline" },
];

const howItWorks = [
  { step: "01", title: "Discover", description: "Temukan produk dan tools terbaik dari database terverifikasi kami." },
  { step: "02", title: "Compare", description: "Baca review independen dan bandingkan fitur, harga, dan kualitas." },
  { step: "03", title: "Convert", description: "Klik affiliate link terverifikasi dan dapatkan produk terbaik." },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="hero-surface p-8 md:p-12 lg:p-16">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="relative z-10 max-w-4xl space-y-6">
          <p className="section-kicker text-white/70 reveal-up">
            Affiliate Growth System
          </p>
          <h1 className="heading-display text-4xl leading-[1.1] text-white md:text-5xl lg:text-[3.5rem] reveal-up">
            Website afiliator yang terlihat{" "}
            <span className="text-amber-300">premium</span>, dipercaya user,
            dan siap scale.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-emerald-50/90 md:text-lg reveal-up">
            ReviewPurge menggabungkan halaman komersial, blog SEO, redirect
            affiliate, dan observability operasional dalam satu stack yang rapi.
          </p>
          <div className="flex flex-wrap gap-3 pt-2 reveal-up">
            <Link href="/indonesia" className="btn btn-accent">
              Explore Indonesia Picks
            </Link>
            <Link href="/blog" className="btn btn-outline">
              Read Articles
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      {/* Pillar Categories */}
      <section className="space-y-6">
        <div className="text-center">
          <p className="section-kicker">Categories</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Explore Our Verticals
          </h2>
        </div>
        <div className="stagger-children grid gap-5 md:grid-cols-3">
          {pillars.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group product-card overflow-hidden"
            >
              <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${item.gradient}`}>
                <span className="text-5xl transition-transform duration-500 group-hover:scale-125">
                  {item.emoji}
                </span>
              </div>
              <div className="space-y-2 p-5">
                <span className="badge badge-neutral text-[10px]">{item.tag}</span>
                <h3 className="heading-display text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
                <p className="pt-1 text-xs font-bold uppercase tracking-wider text-primary transition-colors group-hover:text-primary-light">
                  Open section →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <div className="text-center">
          <p className="section-kicker">How It Works</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Tiga Langkah Menuju Keputusan Terbaik
          </h2>
        </div>
        <div className="stagger-children grid gap-6 md:grid-cols-3">
          {howItWorks.map((item) => (
            <div key={item.step} className="glass-card p-6 text-center">
              <span className="gradient-text heading-display text-5xl font-black">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="glass-card overflow-hidden p-8 text-center md:p-12">
        <p className="section-kicker">Stay Updated</p>
        <h2 className="heading-display mt-2 text-2xl text-slate-900 md:text-3xl">
          Dapatkan Rekomendasi Produk Terbaru
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
          Subscribe untuk mendapat update produk trending, tools terbaru, dan
          artikel SEO langsung ke inbox kamu.
        </p>
        <div className="mx-auto mt-6 flex max-w-md gap-2">
          <input
            type="email"
            placeholder="email@example.com"
            className="input flex-1"
            readOnly
          />
          <button type="button" className="btn btn-primary whitespace-nowrap">
            Subscribe
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          No spam. Unsubscribe anytime.
        </p>
      </section>
    </div>
  );
}
