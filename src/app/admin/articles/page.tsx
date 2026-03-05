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
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Article Management</h1>
        <p className="text-slate-600">Kelola konten SEO untuk blog.</p>
        <Link href="/admin" className="mt-3 inline-block text-sm text-sky-600">
          Back to products
        </Link>
        <Link href="/admin/users" className="mt-2 block text-sm text-sky-600">
          Open admin users
        </Link>
        <Link href="/admin/logs" className="mt-2 block text-sm text-sky-600">
          Open activity logs
        </Link>
      </div>

      <form
        action={createArticleAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <h2 className="text-lg font-semibold">Create Article</h2>
        <input
          name="title"
          required
          placeholder="Article title"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="slug"
          required
          placeholder="article-slug"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <textarea
          name="excerpt"
          required
          placeholder="Short summary"
          className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
        />
        <textarea
          name="content"
          required
          placeholder="Main article content"
          className="min-h-40 rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="metaTitle"
          placeholder="SEO meta title"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="metaDescription"
          placeholder="SEO meta description"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="ogImageUrl"
          type="url"
          placeholder="Open Graph image URL"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <label className="text-sm text-slate-700">
          Schedule publish time (optional)
          <input
            name="publishAt"
            type="datetime-local"
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" />
          Publish now (if schedule empty or already passed)
        </label>
        <button
          type="submit"
          className="w-fit rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        >
          Save Article
        </button>
      </form>

      <div className="space-y-4">
        {statusLabel[status] && (
          <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {statusLabel[status]}
          </p>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Existing Articles</h2>
          <form className="flex items-center gap-2" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search article"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              Search
            </button>
            <select
              name="published"
              defaultValue={published}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
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
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <input type="hidden" name="returnTo" value={returnTo} />
            <BulkSelectControls formId="bulk-articles-form" />
            <button
              type="submit"
              name="bulkAction"
              value="publish"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Publish Selected
            </button>
            <button
              type="submit"
              name="bulkAction"
              value="unpublish"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Unpublish Selected
            </button>
            <button
              type="submit"
              name="bulkAction"
              value="delete"
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
            >
              Delete Selected
            </button>
          </form>
        )}
        {articles.length === 0 ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            No articles yet. Add your first article above.
          </p>
        ) : (
          articles.map((article) => (
            <form
              key={article.id}
              action={updateArticleAction}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
            >
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="ids"
                  value={article.id}
                  form="bulk-articles-form"
                />
                Select for bulk action
              </label>
              <input
                name="title"
                defaultValue={article.title}
                required
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="slug"
                defaultValue={article.slug}
                required
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <textarea
                name="excerpt"
                defaultValue={article.excerpt ?? ""}
                required
                className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
              />
              <textarea
                name="content"
                defaultValue={article.content}
                required
                className="min-h-40 rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="metaTitle"
                defaultValue={article.metaTitle ?? ""}
                placeholder="SEO meta title"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="metaDescription"
                defaultValue={article.metaDescription ?? ""}
                placeholder="SEO meta description"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="ogImageUrl"
                type="url"
                defaultValue={article.ogImageUrl ?? ""}
                placeholder="Open Graph image URL"
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <label className="text-sm text-slate-700">
                Schedule publish time (optional)
                <input
                  name="publishAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(article.publishAt)}
                  className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={article.isPublished}
                />
                Published
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Update Article
                </button>
                <button
                  type="submit"
                  formAction={deleteArticleAction}
                  className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
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
              className="rounded-md border border-slate-300 px-3 py-1.5"
            >
              Prev
            </Link>
            <Link
              href={`/admin/articles?page=${nextPage}${queryQ}${queryPublished}${querySort}`}
              className="rounded-md border border-slate-300 px-3 py-1.5"
            >
              Next
            </Link>
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">No activity logs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {logs.map((log) => (
              <li key={log.id} className="rounded-md border border-slate-200 p-2">
                <p>
                  <span className="font-medium">{log.action}</span>: {log.message}
                </p>
                <p className="text-xs text-slate-500">
                  {log.actorEmail ?? "unknown"} |{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
