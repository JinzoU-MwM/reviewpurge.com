import { PageHero } from "@/components/page-hero";

const sections = [
  {
    title: "1. Penerimaan Ketentuan",
    content:
      "Dengan mengakses dan menggunakan website ReviewPurge, Anda menyetujui dan terikat oleh syarat dan ketentuan layanan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan website ini.",
  },
  {
    title: "2. Konten Informasi",
    content:
      "Konten yang disediakan di website ini bertujuan untuk informasi dan referensi. Kami berusaha menjaga akurasi informasi, namun tidak menjamin bahwa semua konten selalu terkini atau bebas kesalahan.",
  },
  {
    title: "3. Affiliate Links",
    content:
      "Beberapa link di website ini merupakan affiliate link. Saat Anda melakukan pembelian melalui link tersebut, kami mungkin menerima komisi. Hal ini tidak mempengaruhi harga yang Anda bayar.",
  },
  {
    title: "4. Tanggung Jawab Pengguna",
    content:
      "Keputusan pembelian sepenuhnya menjadi tanggung jawab pengguna. Kami menyarankan untuk selalu melakukan riset mandiri sebelum membeli produk atau berlangganan layanan.",
  },
  {
    title: "5. Hak Kekayaan Intelektual",
    content:
      "Seluruh konten original di website ini dilindungi hak cipta. Reproduksi tanpa izin tertulis dari ReviewPurge tidak diperbolehkan.",
  },
  {
    title: "6. Perubahan Ketentuan",
    content:
      "Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan berlaku segera setelah dipublikasikan di website ini.",
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="space-y-8">
      <PageHero
        kicker="Legal"
        title="Terms of Service"
        description="Penggunaan website ini tunduk pada syarat layanan dan batas tanggung jawab informasi."
      />

      <div className="panel divide-y divide-slate-100 p-6 md:p-8">
        <p className="pb-5 text-sm leading-relaxed text-slate-600">
          Syarat dan ketentuan berikut mengatur penggunaan website ReviewPurge.
          Dengan mengakses situs ini, Anda menyetujui ketentuan yang berlaku.
        </p>
        {sections.map((section) => (
          <div key={section.title} className="py-5">
            <h2 className="text-base font-bold text-slate-900">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {section.content}
            </p>
          </div>
        ))}
        <p className="pt-5 text-xs text-slate-500">
          Terakhir diperbarui: Maret 2026
        </p>
      </div>
    </div>
  );
}
