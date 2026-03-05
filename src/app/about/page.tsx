import { PageHero } from "@/components/page-hero";

const values = [
  {
    emoji: "🎯",
    title: "Mission",
    description: "Menyederhanakan keputusan pembelian digital dengan review independen dan data terverifikasi.",
  },
  {
    emoji: "🔬",
    title: "Approach",
    description: "Konten berbasis use case nyata, bukan hype. Setiap produk diuji sebelum direkomendasikan.",
  },
  {
    emoji: "🤝",
    title: "Commitment",
    description: "Transparansi penuh tentang affiliate link. Update berkala untuk akurasi informasi.",
  },
];

const stats = [
  { value: "Multi", label: "Region Coverage" },
  { value: "100%", label: "Independent Reviews" },
  { value: "Real-time", label: "Security Monitoring" },
];

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="About"
        title="Tentang ReviewPurge"
        description="Kami membangun website afiliator yang fokus pada trust, clarity, dan conversion consistency."
      />

      {/* Values */}
      <section className="space-y-6">
        <h2 className="heading-display text-center text-3xl text-slate-900">
          Our Values
        </h2>
        <div className="stagger-children grid gap-5 md:grid-cols-3">
          {values.map((item) => (
            <div key={item.title} className="glass-card group p-6 text-center">
              <span className="inline-block text-4xl transition-transform duration-300 group-hover:scale-110">
                {item.emoji}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="glass-card p-8">
        <div className="grid gap-6 text-center md:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label}>
              <p className="gradient-text heading-display text-3xl font-black">
                {item.value}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="panel p-6 md:p-8">
        <h2 className="heading-display text-2xl text-slate-900">Our Story</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            ReviewPurge lahir dari kebutuhan akan platform review produk yang
            jujur dan transparan di Indonesia. Terlalu banyak website affiliate
            yang hanya mengejar komisi tanpa memberikan value nyata.
          </p>
          <p>
            Kami berbeda. Setiap produk yang masuk database kami melewati kurasi
            mandiri. Setiap review ditulis berdasarkan pengalaman nyata, bukan
            copy-paste dari merchant.
          </p>
          <p>
            Dengan infrastruktur keamanan enterprise-grade (RBAC, audit trail,
            webhook alerting), kami memastikan platform ini berjalan dengan
            standar yang sama dengan SaaS profesional.
          </p>
        </div>
      </section>
    </div>
  );
}
