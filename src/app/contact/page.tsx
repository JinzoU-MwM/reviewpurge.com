export default function ContactPage() {
  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">Contact</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Hubungi Tim ReviewPurge</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Untuk partnership, feedback, atau koreksi konten, tim kami siap membantu.
          </p>
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm text-slate-600">Email</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">contact@reviewpurge.com</p>
        <p className="mt-3 text-sm text-slate-700">Jam respon normal: Senin-Jumat, 09:00-18:00 WIB.</p>
      </div>
    </section>
  );
}

