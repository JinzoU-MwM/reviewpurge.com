import { PageHero } from "@/components/page-hero";
import { ArticleCard } from "@/components/article-card";
import {
  listPublishedArticles,
  publishDueScheduledArticles,
} from "@/lib/db/queries/articles";

const fallbackArticles = [
  {
    id: "fallback-1",
    title: "10 Produk Viral TikTok 2026",
    slug: "10-produk-viral-tiktok-2026",
    excerpt: "Draft contoh artikel sampai konten database tersedia.",
  },
];

export default async function BlogPage() {
  await publishDueScheduledArticles();
  const dbArticles = await listPublishedArticles();
  const articles =
    dbArticles.length > 0
      ? dbArticles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt ?? "No summary yet.",
        date: article.publishedAt
          ? new Date(article.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          : undefined,
      }))
      : fallbackArticles;

  return (
    <div className="space-y-10">
      <PageHero
        kicker="Organic Engine"
        title="Editorial Command Center"
        description="Artikel long-form untuk menangkap search intent, membangun authority, dan mendorong monetisasi affiliate berkelanjutan."
        ctas={[
          { label: "Latest Articles", href: "#articles", variant: "accent" },
        ]}
      />

      <section id="articles" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-2xl text-slate-900">
            Articles
          </h2>
          <span className="badge badge-neutral">{articles.length} posts</span>
        </div>

        {articles.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <span className="text-4xl">✍️</span>
            <p className="mt-3 text-sm text-slate-600">
              Belum ada artikel. Mulai tulis dari dashboard admin!
            </p>
          </div>
        ) : (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                slug={article.slug}
                excerpt={article.excerpt}
                date={"date" in article ? (article as { date?: string }).date : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
