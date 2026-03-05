import Link from "next/link";

type Props = {
  title: string;
  slug: string;
  excerpt: string;
  date?: string;
};

export function ArticleCard({ title, slug, excerpt, date }: Props) {
  return (
    <article className="article-card group">
      <div className="article-card-cover">
        <div className="relative z-10 space-y-1">
          <span className="badge border border-white/25 bg-white/15 text-[10px] text-white">
            Article
          </span>
          {date && <p className="text-xs text-white/80">{date}</p>}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="heading-display text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{excerpt}</p>
        <Link href={`/blog/${slug}`} className="btn btn-ghost btn-sm">
          Read Article {"->"}
        </Link>
      </div>
    </article>
  );
}
