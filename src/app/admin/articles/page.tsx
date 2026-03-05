import Link from "next/link";
import {
  bulkArticleAction,
  createArticleAction,
  deleteArticleAction,
  updateArticleAction,
} from "@/app/admin/actions";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { listRecentActivityLogs } from "@/lib/db/queries/activity-logs";
import {
  listArticlesPaginated,
  publishDueScheduledArticles,
} from "@/lib/db/queries/articles";

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    published?: string;
    sort?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 5;

function toDatetimeLocal(value?: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  await publishDueScheduledArticles();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Number(params.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const published =
    params.published === "published" || params.published === "draft"
      ? params.published
      : "all";
  const status = params.status ?? "";
  const sort =
    params.sort === "oldest" || params.sort === "name" ? params.sort : "latest";

  const { items: articles, total } = await listArticlesPaginated({
    page: safePage,
    pageSize: PAGE_SIZE,
    q,
    published,
    sort,
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const logs = await listRecentActivityLogs(10);
  const prevPage = Math.max(1, safePage - 1);
  const nextPage = Math.min(pageCount, safePage + 1);
  const queryQ = q ? `&q=${encodeURIComponent(q)}` : "";
  const queryPublished =
    published !== "all" ? `&published=${encodeURIComponent(published)}` : "";
  const querySort = sort !== "latest" ? `&sort=${encodeURIComponent(sort)}` : "";
  const returnTo = `/admin/articles?page=${safePage}${queryQ}${queryPublished}${querySort}`;
  const statusLabel: Record<string, string> = {
    article_created: "Article created successfully.",
    article_updated: "Article updated successfully.",
    article_deleted: "Article deleted successfully.",
    article_bulk_done: "Bulk article action completed.",
    article_bulk_empty: "Select at least one article for bulk action.",
    unauthorized: "You do not have permission for this action.",
    rate_limited: "Rate limit exceeded. Please wait and retry.",
    article_error: "Article action failed. Please try again.",
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="hero-surface p-6 md:p-8">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10">
          <p className="section-kicker text-white/70">Content Studio</p>
          <h1 className="heading-display mt-2 text-3xl text-white">Article Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Kelola pipeline konten SEO: draft, schedule, publish, dan optimasi metadata.
          </p>
        </div>
      </div>

      {/* Create Article */}
      <form action={createArticleAction} className="panel p-5 space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <h2 className="text-lg font-bold text-slate-900">Create Article</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Article title" className="input" />
          <input name="slug" required placeholder="article-slug" className="input" />
        </div>
        <textarea name="excerpt" required placeholder="Short summary" className="input min-h-20 resize-none" />
        <textarea name="content" required placeholder="Main article content" className="input min-h-40 resize-none" />
        <div className="grid gap-3 md:grid-cols-3">
          <input name="metaTitle" placeholder="SEO meta title" className="input" />
          <input name="metaDescription" placeholder="SEO meta description" className="input" />
          <input name="ogImageUrl" type="url" placeholder="Open Graph image URL" className="input" />
        </div>
        <label className="space-y-1 text-sm text-slate-700">
          <span>Schedule publish time (optional)</span>
          <input name="publishAt" type="datetime-local" className="input" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" className="size-4 rounded" />
          Publish now (if schedule empty or already passed)
        </label>
        <button type="submit" className="btn btn-primary btn-sm">Save Article</button>
      </form>

      {/* Article List */}
      <div className="space-y-4">
        {statusLabel[status] && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${status.includes("error") || status === "unauthorized" || status === "rate_limited"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
            <span>{status.includes("error") || status === "unauthorized" ? "⚠️" : "✓"}</span>
            {statusLabel[status]}
          </div>
        )}
        <div className="panel space-y-3 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Existing Articles</h2>
            <form className="flex flex-wrap items-center gap-2" method="get">
              <input name="q" defaultValue={q} placeholder="Search article" className="input w-auto" />
              <button type="submit" className="btn btn-ghost btn-sm">Search</button>
              <select name="published" defaultValue={published} className="input w-auto">
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <select name="sort" defaultValue={sort} className="input w-auto">
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
              </select>
            </form>
          </div>
          {articles.length > 0 && (
            <form id="bulk-articles-form" action={bulkArticleAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3">
              <input type="hidden" name="returnTo" value={returnTo} />
              <BulkSelectControls formId="bulk-articles-form" />
              <button type="submit" name="bulkAction" value="publish" className="btn btn-ghost btn-sm">Publish</button>
              <button type="submit" name="bulkAction" value="unpublish" className="btn btn-ghost btn-sm">Unpublish</button>
              <button type="submit" name="bulkAction" value="delete" className="btn btn-sm bg-red-600 text-white hover:bg-red-700">Delete</button>
            </form>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <span className="text-3xl">✍️</span>
            <p className="mt-2 text-sm text-slate-600">No articles yet. Add your first article above.</p>
          </div>
        ) : (
          articles.map((article) => (
            <form key={article.id} action={updateArticleAction} className="panel space-y-3 p-5">
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="ids" value={article.id} form="bulk-articles-form" />
                  Select
                </label>
                <span className={`badge ${article.isPublished ? "badge-success" : "badge-neutral"}`}>
                  {article.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input name="title" defaultValue={article.title} required className="input" />
                <input name="slug" defaultValue={article.slug} required className="input" />
              </div>
              <textarea name="excerpt" defaultValue={article.excerpt ?? ""} required className="input min-h-20 resize-none" />
              <textarea name="content" defaultValue={article.content} required className="input min-h-40 resize-none" />
              <div className="grid gap-3 md:grid-cols-3">
                <input name="metaTitle" defaultValue={article.metaTitle ?? ""} placeholder="SEO meta title" className="input" />
                <input name="metaDescription" defaultValue={article.metaDescription ?? ""} placeholder="SEO meta description" className="input" />
                <input name="ogImageUrl" type="url" defaultValue={article.ogImageUrl ?? ""} placeholder="Open Graph image URL" className="input" />
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Schedule publish time (optional)</span>
                <input name="publishAt" type="datetime-local" defaultValue={toDatetimeLocal(article.publishAt)} className="input" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="isPublished" defaultChecked={article.isPublished} />
                Published
              </label>
              <div className="flex items-center gap-2">
                <button type="submit" className="btn btn-primary btn-sm">Update</button>
                <button type="submit" formAction={deleteArticleAction} className="btn btn-sm bg-red-600 text-white hover:bg-red-700">Delete</button>
              </div>
            </form>
          ))
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>Page {safePage} of {pageCount} ({total} items)</p>
          <div className="flex items-center gap-2">
            <Link href={`/admin/articles?page=${prevPage}${queryQ}${queryPublished}${querySort}`} className="btn btn-ghost btn-sm">Prev</Link>
            <Link href={`/admin/articles?page=${nextPage}${queryQ}${queryPublished}${querySort}`} className="btn btn-ghost btn-sm">Next</Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="panel space-y-3 p-5">
        <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">No activity logs yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="badge badge-neutral text-[10px]">{log.action}</span>
                  <span className="text-slate-700">{log.message}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {log.actorEmail ?? "unknown"} • {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
