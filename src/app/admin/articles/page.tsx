import Link from "next/link";
import {
  bulkArticleAction,
  createArticleAction,
  deleteArticleAction,
  updateArticleAction,
} from "@/app/admin/actions";
import { AdminNav } from "@/components/admin-nav";
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

  const publishedCount = articles.filter(a => a.isPublished).length;
  const draftCount = articles.length - publishedCount;

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <AdminNav currentPath="/admin/articles" />
        
        <div className="admin-content space-y-6">
          {/* Header */}
          <div className="admin-header">
            <div className="admin-header-icon">✍️</div>
            <div className="relative z-10">
              <p className="section-kicker">Content Studio</p>
              <h1 className="heading-display mt-2">Article Management</h1>
              <p className="mt-2 max-w-2xl">
                Kelola pipeline konten SEO: draft, schedule, publish, dan optimasi metadata.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="admin-stats stagger-children">
            <div className="admin-stat-card">
              <span className="stat-icon">📝</span>
              <p className="stat-label">Total Articles</p>
              <p className="stat-value">{total}</p>
              <p className="stat-meta">{publishedCount} published · {draftCount} draft</p>
            </div>
            <div className="admin-stat-card stat-success">
              <span className="stat-icon">✅</span>
              <p className="stat-label">Published</p>
              <p className="stat-value">{publishedCount}</p>
              <p className="stat-meta">Live on blog</p>
            </div>
            <div className="admin-stat-card stat-warning">
              <span className="stat-icon">📝</span>
              <p className="stat-label">Drafts</p>
              <p className="stat-value">{draftCount}</p>
              <p className="stat-meta">Pending review</p>
            </div>
          </div>

          {/* Status Banner */}
          {statusLabel[status] && (
            <div className={`admin-banner ${status.includes("error") || status === "unauthorized" || status === "rate_limited" ? "admin-banner-danger" : "admin-banner-success"}`}>
              <span className="admin-banner-icon">{status.includes("error") || status === "unauthorized" ? "⚠️" : "✓"}</span>
              <span>{statusLabel[status]}</span>
            </div>
          )}

          {/* Create Article */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">➕</span> Create New Article</h2>
            </div>
            <div className="admin-panel-body">
              <form action={createArticleAction} className="admin-form">
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Title</label>
                    <input name="title" required placeholder="Enter article title" className="admin-input" />
                  </div>
                  <div className="admin-form-group">
                    <label>Slug</label>
                    <input name="slug" required placeholder="article-slug" className="admin-input" />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Excerpt</label>
                  <textarea name="excerpt" required placeholder="Short summary for SEO and previews" className="admin-input admin-textarea" style={{ minHeight: "80px" }} />
                </div>
                <div className="admin-form-group">
                  <label>Content</label>
                  <textarea name="content" required placeholder="Main article content (supports basic HTML)" className="admin-input admin-textarea" style={{ minHeight: "160px" }} />
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Meta Title (SEO)</label>
                    <input name="metaTitle" placeholder="SEO meta title" className="admin-input" />
                  </div>
                  <div className="admin-form-group">
                    <label>Meta Description</label>
                    <input name="metaDescription" placeholder="SEO meta description" className="admin-input" />
                  </div>
                  <div className="admin-form-group">
                    <label>OG Image URL</label>
                    <input name="ogImageUrl" type="url" placeholder="Open Graph image URL" className="admin-input" />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Schedule Publish Time (optional)</label>
                  <input name="publishAt" type="datetime-local" className="admin-input" />
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Reviewed By</label>
                    <input
                      name="reviewedBy"
                      placeholder="Editor name"
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Reviewed At</label>
                    <input name="reviewedAt" type="datetime-local" className="admin-input" />
                  </div>
                  <div className="admin-form-group">
                    <label>Price Checked At</label>
                    <input name="priceCheckedAt" type="datetime-local" className="admin-input" />
                  </div>
                </div>
                <label className="admin-checkbox-label">
                  <input type="checkbox" name="isPublished" className="admin-checkbox" />
                  Publish immediately (if schedule empty or already passed)
                </label>
                <div>
                  <button type="submit" className="admin-btn admin-btn-primary">
                    💾 Save Article
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Article List */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">📋</span> Article Library</h2>
              <form className="flex flex-wrap items-center gap-2" method="get">
                <input name="q" defaultValue={q} placeholder="Search articles..." className="admin-input w-48" />
                <select name="published" defaultValue={published} className="admin-input admin-select w-32">
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select name="sort" defaultValue={sort} className="admin-input admin-select w-28">
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
                <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">🔍 Filter</button>
              </form>
            </div>

            {articles.length > 0 && (
              <div className="px-6 pt-4 pb-2 border-b border-[var(--admin-border-subtle)]">
                <form id="bulk-articles-form" action={bulkArticleAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <BulkSelectControls formId="bulk-articles-form" />
                  <button type="submit" name="bulkAction" value="publish" className="admin-btn admin-btn-ghost admin-btn-sm">✓ Publish</button>
                  <button type="submit" name="bulkAction" value="unpublish" className="admin-btn admin-btn-ghost admin-btn-sm">○ Unpublish</button>
                  <button type="submit" name="bulkAction" value="delete" className="admin-btn admin-btn-danger admin-btn-sm">🗑️ Delete</button>
                </form>
              </div>
            )}

            <div className="admin-panel-body">
              {articles.length === 0 ? (
                <div className="admin-empty">
                  <span className="admin-empty-icon">✍️</span>
                  <p className="admin-empty-title">No articles yet</p>
                  <p className="admin-empty-description">Create your first article using the form above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div key={article.id} className="admin-list-item">
                      <div className="admin-list-item-icon" style={{ opacity: article.isPublished ? 1 : 0.5 }}>
                        {article.isPublished ? "📄" : "📝"}
                      </div>
                      <div className="admin-list-item-content">
                        <form action={updateArticleAction} className="space-y-3">
                          <input type="hidden" name="id" value={article.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          
                          <div className="admin-list-item-header">
                            <label className="admin-checkbox-label text-xs">
                              <input type="checkbox" name="ids" value={article.id} form="bulk-articles-form" className="admin-checkbox" />
                              Select
                            </label>
                            <span className={`admin-badge ${article.isPublished ? "admin-badge-success" : "admin-badge-neutral"}`}>
                              {article.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>

                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label>Title</label>
                              <input name="title" defaultValue={article.title} required className="admin-input" />
                            </div>
                            <div className="admin-form-group">
                              <label>Slug</label>
                              <input name="slug" defaultValue={article.slug} required className="admin-input" />
                            </div>
                          </div>
                          <div className="admin-form-group">
                            <label>Excerpt</label>
                            <textarea name="excerpt" defaultValue={article.excerpt ?? ""} required className="admin-input admin-textarea" style={{ minHeight: "60px" }} />
                          </div>
                          <div className="admin-form-group">
                            <label>Content</label>
                            <textarea name="content" defaultValue={article.content} required className="admin-input admin-textarea" style={{ minHeight: "120px" }} />
                          </div>
                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label>Meta Title</label>
                              <input name="metaTitle" defaultValue={article.metaTitle ?? ""} placeholder="SEO meta title" className="admin-input" />
                            </div>
                            <div className="admin-form-group">
                              <label>Meta Description</label>
                              <input name="metaDescription" defaultValue={article.metaDescription ?? ""} placeholder="SEO meta description" className="admin-input" />
                            </div>
                            <div className="admin-form-group">
                              <label>OG Image</label>
                              <input name="ogImageUrl" type="url" defaultValue={article.ogImageUrl ?? ""} placeholder="Image URL" className="admin-input" />
                            </div>
                          </div>
                          <div className="admin-form-group">
                            <label>Schedule Publish</label>
                            <input name="publishAt" type="datetime-local" defaultValue={toDatetimeLocal(article.publishAt)} className="admin-input" />
                          </div>
                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label>Reviewed By</label>
                              <input
                                name="reviewedBy"
                                defaultValue={article.reviewedBy ?? ""}
                                placeholder="Editor name"
                                className="admin-input"
                              />
                            </div>
                            <div className="admin-form-group">
                              <label>Reviewed At</label>
                              <input
                                name="reviewedAt"
                                type="datetime-local"
                                defaultValue={toDatetimeLocal(article.reviewedAt)}
                                className="admin-input"
                              />
                            </div>
                            <div className="admin-form-group">
                              <label>Price Checked At</label>
                              <input
                                name="priceCheckedAt"
                                type="datetime-local"
                                defaultValue={toDatetimeLocal(article.priceCheckedAt)}
                                className="admin-input"
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="admin-checkbox-label">
                              <input type="checkbox" name="isPublished" defaultChecked={article.isPublished} className="admin-checkbox" />
                              Published
                            </label>
                            <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">💾 Update</button>
                            <button type="submit" formAction={deleteArticleAction} className="admin-btn admin-btn-danger admin-btn-sm">🗑️ Delete</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {articles.length > 0 && (
              <div className="admin-pagination">
                <span>Page {safePage} of {pageCount} ({total} items)</span>
                <div className="admin-pagination-controls">
                  <Link href={`/admin/articles?page=${prevPage}${queryQ}${queryPublished}${querySort}`} className="admin-btn admin-btn-ghost admin-btn-sm">← Prev</Link>
                  <Link href={`/admin/articles?page=${nextPage}${queryQ}${queryPublished}${querySort}`} className="admin-btn admin-btn-ghost admin-btn-sm">Next →</Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">📋</span> Recent Activity</h2>
            </div>
            <div className="admin-panel-body">
              {logs.length === 0 ? (
                <div className="admin-empty">
                  <span className="admin-empty-icon">📋</span>
                  <p className="admin-empty-title">No activity yet</p>
                  <p className="admin-empty-description">Actions will appear here.</p>
                </div>
              ) : (
                <div className="admin-list">
                  {logs.map((log) => (
                    <div key={log.id} className="admin-log-entry">
                      <div className="admin-log-entry-header">
                        <span className="admin-badge admin-badge-neutral">{log.action}</span>
                        <span className="admin-log-entry-message">{log.message}</span>
                      </div>
                      <div className="admin-log-entry-footer">
                        <span>{log.actorEmail ?? "system"}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
