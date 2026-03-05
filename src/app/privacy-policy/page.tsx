export default function PrivacyPolicyPage() {
  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">Policy</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Kami memproses data seperlunya untuk analitik, keamanan, dan peningkatan kualitas layanan.
          </p>
        </div>
      </div>

      <div className="panel space-y-3 p-5 text-sm text-slate-700">
        <p>Data yang diproses mencakup informasi yang Anda berikan dan metadata teknis yang relevan.</p>
        <p>Kami tidak menjual data personal ke pihak ketiga.</p>
        <p>Dengan menggunakan situs ini, Anda menyetujui kebijakan privasi ini.</p>
      </div>
    </section>
  );
}

