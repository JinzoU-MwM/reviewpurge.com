import Link from "next/link";
import { listProductsByRegion } from "@/lib/db/queries/products";

const fallback = [
  {
    id: "global-1",
    name: "Best AI Tools",
    slug: "best-ai-tools",
    description: "Contoh listing awal sampai data database tersedia.",
  },
];

export default async function GlobalPage() {
  const products = await listProductsByRegion("global");
  const items =
    products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
        }))
      : fallback;

  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">Global Stack</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Software and AI Winners</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Kurasi tool global untuk buyer intent yang lebih jelas: productivity, growth, creator workflow, dan engineering operations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="panel overflow-hidden p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">Global</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <Link
              href={`/go/${item.slug}`}
              className="mt-5 inline-flex rounded-full border border-amber-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 transition hover:bg-amber-700 hover:text-white"
            >
              Visit Tool
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

