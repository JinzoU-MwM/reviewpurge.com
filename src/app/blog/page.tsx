import Link from "next/link";
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
        }))
      : fallbackArticles;

  return (
    <section className="space-y-6">
      <div className="hero-surface p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="section-kicker text-white/70">Organic Engine</p>
          <h1 className="heading-display mt-2 text-4xl text-white md:text-5xl">Editorial Command Center</h1>
          <p className="mt-2 text-sm text-emerald-50 md:text-base">
            Artikel long-form untuk menangkap search intent, membangun authority, dan mendorong monetisasi affiliate berkelanjutan.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <article key={article.id} className="panel p-5 transition hover:-translate-y-0.5 hover:border-primary/60">
            <h2 className="heading-display text-2xl text-slate-900">{article.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
            <Link
              href={`/blog/${article.slug}`}
              className="mt-5 inline-flex rounded-full border border-slate-800 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-900 transition hover:bg-slate-900 hover:text-white"
            >
              Read Article
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

