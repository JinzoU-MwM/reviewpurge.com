import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
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
    <div className="space-y-10">
      <PageHero
        kicker="Global Stack"
        title="Software & AI Winners"
        description="Kurasi tool global untuk buyer intent yang lebih jelas: productivity, growth, creator workflow, dan engineering operations."
        ctas={[
          { label: "Browse Tools", href: "#products", variant: "accent" },
          { label: "Read Reviews", href: "/blog", variant: "outline" },
        ]}
      />

      <section id="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-2xl text-slate-900">
            Tools
          </h2>
          <span className="badge badge-accent">{items.length} items</span>
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <span className="text-4xl">🔧</span>
            <p className="mt-3 text-sm text-slate-600">
              Belum ada tools global. Coming soon!
            </p>
          </div>
        ) : (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                name={item.name}
                slug={item.slug}
                description={item.description}
                region="global"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
