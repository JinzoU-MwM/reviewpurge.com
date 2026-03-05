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
      <article className="mx-auto max-w-3xl space-y-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{article.title}</h1>
          {article.excerpt && <p className="text-slate-600">{article.excerpt}</p>}
        </div>
        <div className="prose max-w-none whitespace-pre-line text-slate-800">
          {article.content}
        </div>
        {relatedArticles.length > 0 && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Related Articles</h2>
            <ul className="space-y-2">
              {relatedArticles.map((related) => (
                <li key={related.id}>
                  <Link href={`/blog/${related.slug}`} className="text-sky-600">
                    {related.title}
                  </Link>
                  {related.excerpt && (
                    <p className="text-sm text-slate-600">{related.excerpt}</p>
                  )}
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
    <article className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold">{fallback.title}</h1>
      <div className="prose max-w-none whitespace-pre-line text-slate-800">
        {fallback.content}
      </div>
    </article>
  );
}
