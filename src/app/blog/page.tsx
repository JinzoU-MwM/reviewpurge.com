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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Blog</h1>
      <p className="text-slate-600">
        Artikel SEO long-form untuk akuisisi organic traffic.
      </p>
      <div className="grid gap-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-lg font-semibold">{article.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{article.excerpt}</p>
            <Link
              href={`/blog/${article.slug}`}
              className="mt-3 inline-block text-sm font-medium text-sky-600"
            >
              Read article
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
