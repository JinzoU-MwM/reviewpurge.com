import { PageHero } from "@/components/page-hero";

const sections = [
  {
    title: "Apa Itu Affiliate Link?",
    content:
      "Affiliate link adalah link khusus yang memungkinkan kami menerima komisi kecil saat Anda melakukan pembelian melalui link tersebut. Komisi ini dibayar oleh merchant, bukan oleh Anda — sehingga tidak menambah biaya pembelian Anda.",
  },
  {
    title: "Bagaimana Kami Memilih Produk?",
    content:
      "Setiap produk yang kami rekomendasikan dipilih berdasarkan kualitas, value for money, dan relevansi untuk audience kami. Ranking dan review tidak dijual — semua penilaian tetap independen.",
  },
  {
    title: "Transparansi Pendapatan",
    content:
      "Affiliate link digunakan untuk menjaga keberlanjutan operasional konten dan riset produk. Revenue dari affiliate memungkinkan kami untuk terus memproduksi review berkualitas tanpa harus mengenakan biaya kepada pembaca.",
  },
  {
    title: "Platform Affiliate yang Kami Gunakan",
    content:
      "Kami bekerja sama dengan berbagai platform affiliate termasuk TikTok Shop, Shopee Affiliate, dan program affiliate SaaS/software global. Setiap program telah diverifikasi keamanannya.",
  },
];

export default function AffiliateDisclosurePage() {
  return (
    <div className="space-y-8">
      <PageHero
        kicker="Disclosure"
        title="Affiliate Disclosure"
        description="Beberapa link di website ini merupakan affiliate link yang dapat menghasilkan komisi."
      />

      <div className="panel divide-y divide-slate-100 p-6 md:p-8">
        <div className="flex items-start gap-3 pb-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
            💡
          </span>
          <p className="text-sm leading-relaxed text-slate-700">
            <strong className="text-slate-900">Penting:</strong> Komisi yang
            kami terima tidak menambah biaya untuk Anda. Kami berkomitmen untuk
            memberikan review yang jujur dan independen tanpa pengaruh dari
            pendapatan affiliate.
          </p>
        </div>
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
