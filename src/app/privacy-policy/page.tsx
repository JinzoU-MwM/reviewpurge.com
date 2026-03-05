import { PageHero } from "@/components/page-hero";

const sections = [
  {
    title: "1. Data yang Kami Kumpulkan",
    content:
      "Kami mengumpulkan data yang Anda berikan secara langsung (seperti email saat subscribe) dan metadata teknis yang relevan (seperti IP address, browser type, dan halaman yang dikunjungi) untuk keperluan analitik dan keamanan.",
  },
  {
    title: "2. Penggunaan Data",
    content:
      "Data digunakan untuk: meningkatkan kualitas konten, analitik performa website, keamanan platform, dan komunikasi terkait layanan. Kami tidak menggunakan data Anda untuk tujuan di luar yang disebutkan.",
  },
  {
    title: "3. Perlindungan Data",
    content:
      "Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang memadai untuk melindungi data personal Anda dari akses tidak sah, perubahan, pengungkapan, atau penghancuran.",
  },
  {
    title: "4. Pihak Ketiga",
    content:
      "Kami tidak menjual data personal ke pihak ketiga. Data hanya dibagikan ke penyedia layanan yang diperlukan untuk operasional website (hosting, analytics) dengan perjanjian kerahasiaan.",
  },
  {
    title: "5. Cookie",
    content:
      "Website ini menggunakan cookie untuk analitik dan preferensi pengguna. Anda dapat mengatur penggunaan cookie melalui pengaturan browser.",
  },
  {
    title: "6. Hak Pengguna",
    content:
      "Anda berhak untuk mengakses, memperbaiki, atau menghapus data personal Anda. Hubungi kami melalui halaman Contact untuk mengajukan permintaan terkait data.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8">
      <PageHero
        kicker="Policy"
        title="Privacy Policy"
        description="Kami memproses data seperlunya untuk analitik, keamanan, dan peningkatan kualitas layanan."
      />

      <div className="panel divide-y divide-slate-100 p-6 md:p-8">
        <p className="pb-5 text-sm leading-relaxed text-slate-600">
          Kebijakan privasi ini menjelaskan bagaimana ReviewPurge mengumpulkan,
          menggunakan, dan melindungi informasi yang Anda berikan saat
          menggunakan website kami. Dengan menggunakan situs ini, Anda
          menyetujui kebijakan privasi ini.
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
