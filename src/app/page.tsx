import Link from "next/link";

const sections = [
  {
    title: "Indonesia Picks",
    href: "/indonesia",
    description: "Produk TikTok, Shopee, gadget, dan barang trending.",
  },
  {
    title: "Global Tools",
    href: "/global",
    description: "AI tools, software, marketing, dan dev stack pilihan.",
  },
  {
    title: "SEO Blog",
    href: "/blog",
    description: "Konten long-form untuk organic growth dan AdSense.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 p-8 text-white">
        <p className="text-sm uppercase tracking-wide text-sky-100">
          Affiliate + AdSense Ready
        </p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
          ReviewPurge Product Discovery Platform
        </h1>
        <p className="mt-4 max-w-2xl text-sky-50">
          Basis production-ready untuk review produk, direktori tools, artikel
          SEO, dan sistem redirect affiliate terukur.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-sky-400"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
