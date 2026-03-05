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
const inputClass =
  "w-full rounded-xl border border-slate-300/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

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
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-white to-accent/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
            Content Studio
          </p>
          <h1 className="heading-display mt-2 text-3xl text-slate-900">Article Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Kelola pipeline konten SEO: draft, schedule, publish, dan optimasi metadata.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/admin" className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700">
              Products
            </Link>
            <Link
              href="/admin/users"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700"
            >
              Users
            </Link>
            <Link
              href="/admin/logs"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-slate-700"
            >
              Logs
            </Link>
          </div>
        </div>
      </div>

      <form action={createArticleAction} className="panel grid gap-3 p-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <h2 className="text-lg font-semibold text-slate-900">Create Article</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Article title" className={inputClass} />
          <input name="slug" required placeholder="article-slug" className={inputClass} />
        </div>
        <textarea
          name="excerpt"
          required
          placeholder="Short summary"
          className={`${inputClass} min-h-20`}
        />
        <textarea
          name="content"
          required
          placeholder="Main article content"
          className={`${inputClass} min-h-40`}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <input name="metaTitle" placeholder="SEO meta title" className={inputClass} />
          <input name="metaDescription" placeholder="SEO meta description" className={inputClass} />
          <input name="ogImageUrl" type="url" placeholder="Open Graph image URL" className={inputClass} />
        </div>
        <label className="space-y-1 text-sm text-slate-700">
          <span>Schedule publish time (optional)</span>
          <input name="publishAt" type="datetime-local" className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" className="size-4 rounded" />
          Publish now (if schedule empty or already passed)
        </label>
        <button
          type="submit"
          className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Save Article
        </button>
      </form>

      <div className="space-y-4">
        {statusLabel[status] && (
          <p className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {statusLabel[status]}
          </p>
        )}
        <div className="panel space-y-3 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Existing Articles</h2>
            <form className="flex flex-wrap items-center gap-2" method="get">
              <input name="q" defaultValue={q} placeholder="Search article" className={inputClass} />
              <button type="submit" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                Search
              </button>
              <select name="published" defaultValue={published} className={inputClass}>
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <select name="sort" defaultValue={sort} className={inputClass}>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
              </select>
            </form>
          </div>
          {articles.length > 0 && (
            <form
              id="bulk-articles-form"
              action={bulkArticleAction}
              className="rounded-xl border border-slate-200 bg-white/80 p-3"
            >
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="flex flex-wrap items-center gap-2">
                <BulkSelectControls formId="bulk-articles-form" />
                <button
                  type="submit"
                  name="bulkAction"
                  value="publish"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Publish Selected
                </button>
                <button
                  type="submit"
                  name="bulkAction"
                  value="unpublish"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Unpublish Selected
                </button>
                <button
                  type="submit"
                  name="bulkAction"
                  value="delete"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
                >
                  Delete Selected
                </button>
              </div>
            </form>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            No articles yet. Add your first article above.
          </p>
        ) : (
          articles.map((article) => (
            <form
              key={article.id}
              action={updateArticleAction}
              className="panel grid gap-3 p-5"
            >
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" name="ids" value={article.id} form="bulk-articles-form" />
                Select for bulk action
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  name="title"
                  defaultValue={article.title}
                  required
                  className={inputClass}
                />
                <input name="slug" defaultValue={article.slug} required className={inputClass} />
              </div>
              <textarea
                name="excerpt"
                defaultValue={article.excerpt ?? ""}
                required
                className={`${inputClass} min-h-20`}
              />
              <textarea
                name="content"
                defaultValue={article.content}
                required
                className={`${inputClass} min-h-40`}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  name="metaTitle"
                  defaultValue={article.metaTitle ?? ""}
                  placeholder="SEO meta title"
                  className={inputClass}
                />
                <input
                  name="metaDescription"
                  defaultValue={article.metaDescription ?? ""}
                  placeholder="SEO meta description"
                  className={inputClass}
                />
                <input
                  name="ogImageUrl"
                  type="url"
                  defaultValue={article.ogImageUrl ?? ""}
                  placeholder="Open Graph image URL"
                  className={inputClass}
                />
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Schedule publish time (optional)</span>
                <input
                  name="publishAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(article.publishAt)}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="isPublished" defaultChecked={article.isPublished} />
                Published
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Update Article
                </button>
                <button
                  type="submit"
                  formAction={deleteArticleAction}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Delete
                </button>
              </div>
            </form>
          ))
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {safePage} of {pageCount} ({total} items)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/articles?page=${prevPage}${queryQ}${queryPublished}${querySort}`}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5"
            >
              Prev
            </Link>
            <Link
              href={`/admin/articles?page=${nextPage}${queryQ}${queryPublished}${querySort}`}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5"
            >
              Next
            </Link>
          </div>
        </div>
      </div>

      <div className="panel space-y-3 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">No activity logs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p>
                  <span className="font-medium">{log.action}</span>: {log.message}
                </p>
                <p className="text-xs text-slate-500">
                  {log.actorEmail ?? "unknown"} | {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

