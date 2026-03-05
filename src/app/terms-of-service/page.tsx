export default function TermsOfServicePage() {
  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">Legal</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Penggunaan website ini tunduk pada syarat layanan dan batas tanggung jawab informasi.
          </p>
        </div>
      </div>

      <div className="panel space-y-3 p-5 text-sm text-slate-700">
        <p>Konten disediakan untuk tujuan informasi dan dapat berubah sewaktu-waktu.</p>
        <p>Keputusan pembelian tetap menjadi tanggung jawab pengguna berdasarkan pertimbangan pribadi.</p>
        <p>Dengan mengakses situs ini, Anda menyetujui ketentuan yang berlaku.</p>
      </div>
    </section>
  );
}

