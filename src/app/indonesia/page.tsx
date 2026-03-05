import Link from "next/link";
import { listProductsByRegion } from "@/lib/db/queries/products";

const fallback = [
  {
    id: "id-1",
    name: "Produk TikTok Viral",
    slug: "produk-tiktok-viral",
    description: "Contoh listing awal sampai data database tersedia.",
  },
];

export default async function IndonesiaPage() {
  const products = await listProductsByRegion("indonesia");
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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Indonesia Products</h1>
      <p className="text-slate-600">
        Rekomendasi produk marketplace dan barang trending untuk audience lokal.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            <Link href={`/go/${item.slug}`} className="mt-3 inline-block text-sm text-sky-600">
              Check offer
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
