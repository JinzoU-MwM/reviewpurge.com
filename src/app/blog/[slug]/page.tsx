import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublishedArticleBySlug,
  listRelatedPublishedArticles,
  publishDueScheduledArticles,
} from "@/lib/db/queries/articles";

type Props = {
  params: Promise<{ slug: string }>;
};

const fallbackArticles: Record<string, { title: string; content: string }> = {
  "10-produk-viral-tiktok-2026": {
    title: "10 Produk Viral TikTok 2026",
    content:
      "Ini adalah konten fallback sementara. Buat artikel dari dashboard admin untuk mengganti konten ini.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return {};

  const title = article.metaTitle ?? article.title;
  const description = article.metaDescription ?? article.excerpt ?? "Blog article";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: article.ogImageUrl ? [article.ogImageUrl] : [],
    },
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  await publishDueScheduledArticles();
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (article) {
    const relatedArticles = await listRelatedPublishedArticles(article.slug, 3);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.metaTitle ?? article.title,
      description: article.metaDescription ?? article.excerpt ?? "",
      datePublished: article.publishedAt?.toISOString() ?? undefined,
      dateModified: article.publishedAt?.toISOString() ?? undefined,
      image: article.ogImageUrl ?? undefined,
      mainEntityOfPage: `https://reviewpurge.com/blog/${article.slug}`,
    };

    return (
      <article className="mx-auto max-w-4xl space-y-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <header className="panel overflow-hidden">
          <div className="bg-gradient-to-r from-primary/15 via-white to-accent/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Article</p>
            <h1 className="heading-display mt-2 text-4xl text-slate-900">{article.title}</h1>
            {article.excerpt && <p className="mt-3 max-w-3xl text-sm text-slate-700">{article.excerpt}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <Link href="/blog" className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5">
                Back to blog
              </Link>
              {article.publishedAt && (
                <span className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5">
                  Published {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="panel p-6">
          <div className="prose max-w-none whitespace-pre-line text-slate-800 prose-headings:text-slate-900 prose-a:text-primary">
            {article.content}
          </div>
        </div>

        {relatedArticles.length > 0 && (
          <section className="panel p-5">
            <h2 className="text-xl font-semibold text-slate-900">Related Articles</h2>
            <ul className="mt-3 space-y-3">
              {relatedArticles.map((related) => (
                <li key={related.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <Link href={`/blog/${related.slug}`} className="font-medium text-primary">
                    {related.title}
                  </Link>
                  {related.excerpt && <p className="mt-1 text-sm text-slate-600">{related.excerpt}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    );
  }

  const fallback = fallbackArticles[slug];
  if (!fallback) notFound();

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <header className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-white to-accent/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Fallback Article</p>
          <h1 className="heading-display mt-2 text-4xl text-slate-900">{fallback.title}</h1>
        </div>
      </header>
      <div className="panel p-6">
        <div className="prose max-w-none whitespace-pre-line text-slate-800">{fallback.content}</div>
      </div>
    </article>
  );
}

