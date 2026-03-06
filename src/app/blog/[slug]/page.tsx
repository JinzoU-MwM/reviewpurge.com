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

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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
    const reviewedBy = article.reviewedBy?.trim() || "Editorial Team";
    const reviewedAt = article.reviewedAt ?? article.updatedAt ?? null;
    const priceCheckedAt = article.priceCheckedAt ?? null;

    return (
      <article className="mx-auto max-w-4xl space-y-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Article header */}
        <header className="hero-surface overflow-hidden p-8 md:p-12">
          <div className="hero-orb hero-orb-1" />
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/blog"
                className="badge border border-white/35 bg-white/15 text-white transition hover:bg-white/25"
              >
                ← Back to Blog
              </Link>
              {article.publishedAt && (
                <span className="badge border border-white/25 bg-white/10 text-white/90">
                  {new Date(article.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <h1 className="heading-display text-3xl text-white md:text-4xl lg:text-5xl reveal-up">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="max-w-2xl text-base text-emerald-50/80 reveal-up">
                {article.excerpt}
              </p>
            )}
            <div className="grid gap-2 rounded-xl border border-white/20 bg-white/10 p-4 text-xs text-emerald-50/95 sm:grid-cols-3">
              <p>
                <span className="block uppercase tracking-wider text-white/65">Reviewed by</span>
                <span className="font-semibold">{reviewedBy}</span>
              </p>
              <p>
                <span className="block uppercase tracking-wider text-white/65">Last reviewed</span>
                <span className="font-semibold">{formatDate(reviewedAt)}</span>
              </p>
              <p>
                <span className="block uppercase tracking-wider text-white/65">Price checked</span>
                <span className="font-semibold">{formatDate(priceCheckedAt)}</span>
              </p>
            </div>
          </div>
        </header>

        {/* Article body */}
        <div className="panel p-6 md:p-8 lg:p-10">
          <div className="prose max-w-none whitespace-pre-line text-slate-800 leading-relaxed prose-headings:heading-display prose-headings:text-slate-900 prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline">
            {article.content}
          </div>
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="space-y-4">
            <h2 className="heading-display text-2xl text-slate-900">
              Related Articles
            </h2>
            <div className="stagger-children grid gap-4 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="glass-card group p-5 transition-all"
                >
                  <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-primary">
                    {related.title}
                  </h3>
                  {related.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {related.excerpt}
                    </p>
                  )}
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">
                    Read →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    );
  }

  const fallback = fallbackArticles[slug];
  if (!fallback) notFound();

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <header className="hero-surface overflow-hidden p-8 md:p-12">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10 space-y-4">
          <Link
            href="/blog"
            className="badge border border-white/35 bg-white/15 text-white transition hover:bg-white/25"
          >
            ← Back to Blog
          </Link>
          <h1 className="heading-display text-3xl text-white md:text-4xl reveal-up">
            {fallback.title}
          </h1>
        </div>
      </header>
      <div className="panel p-6 md:p-8">
        <div className="prose max-w-none whitespace-pre-line text-slate-800">
          {fallback.content}
        </div>
      </div>
    </article>
  );
}
