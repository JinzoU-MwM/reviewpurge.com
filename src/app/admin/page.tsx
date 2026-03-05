import Link from "next/link";
import {
  bulkProductAction,
  checkAffiliateProgramHealthAction,
  createAffiliateProgramAction,
  createProductAction,
  deleteProductAction,
  setPrimaryAffiliateProgramAction,
  updateProductAction,
} from "@/app/admin/actions";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { listRecentActivityLogs } from "@/lib/db/queries/activity-logs";
import { listAffiliateProgramsByProduct } from "@/lib/db/queries/affiliate-programs";
import { listProductsPaginated } from "@/lib/db/queries/products";

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

export default async function AdminPage({ searchParams }: Props) {
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

  const { items: products, total } = await listProductsPaginated({
    page: safePage,
    pageSize: PAGE_SIZE,
    q,
    published,
    sort,
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const programEntries = await Promise.all(
    products.map(async (product) => [
      product.id,
      await listAffiliateProgramsByProduct(product.id),
    ] as const),
  );
  const programsByProduct = new Map(programEntries);
  const logs = await listRecentActivityLogs(10);
  const prevPage = Math.max(1, safePage - 1);
  const nextPage = Math.min(pageCount, safePage + 1);
  const queryQ = q ? `&q=${encodeURIComponent(q)}` : "";
  const queryPublished =
    published !== "all" ? `&published=${encodeURIComponent(published)}` : "";
  const querySort = sort !== "latest" ? `&sort=${encodeURIComponent(sort)}` : "";
  const returnTo = `/admin?page=${safePage}${queryQ}${queryPublished}${querySort}`;
  const statusLabel: Record<string, string> = {
    product_created: "Product created successfully.",
    product_updated: "Product updated successfully.",
    product_deleted: "Product deleted successfully.",
    product_bulk_done: "Bulk product action completed.",
    product_bulk_empty: "Select at least one product for bulk action.",
    program_created: "Affiliate program created.",
    program_updated: "Primary program updated.",
    program_duplicate: "Program already exists for this product and region.",
    program_conflict: "Primary program conflict detected. Please retry.",
    program_checked: "Program health checked.",
    affiliate_url_blocked:
      "Affiliate URL blocked by allowlist policy (AFFILIATE_ALLOWED_HOSTS).",
    unauthorized: "You do not have permission for this action.",
    rate_limited: "Rate limit exceeded. Please wait and retry.",
    product_error: "Product action failed. Please try again.",
    program_error: "Program action failed. Please try again.",
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="hero-surface p-6 md:p-8">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10">
          <p className="section-kicker text-white/70">Commerce Console</p>
          <h1 className="heading-display mt-2 text-3xl text-white">Admin Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Kelola katalog produk, affiliate program, dan quality control dari satu panel.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger-children grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Products on page</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{products.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total products</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current page</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{safePage}</p>
        </div>
      </div>

      {/* Create Product */}
      <form action={createProductAction} className="panel p-5 space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <h2 className="text-lg font-bold text-slate-900">Create Product</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Product name" className="input" />
          <input name="slug" required placeholder="product-slug" className="input" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="categorySlug" required placeholder="id-produk-tiktok or global-ai-tools" className="input" />
          <input name="affiliateUrl" type="url" required placeholder="https://affiliate-link.example" className="input" />
        </div>
        <textarea name="description" required placeholder="Short product description" className="input min-h-24 resize-none" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" className="size-4 rounded" />
          Publish now
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          Save Product
        </button>
      </form>

      {/* Product List */}
      <div className="space-y-4">
        {statusLabel[status] && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${status.includes("error") || status === "unauthorized" || status === "rate_limited" || status === "affiliate_url_blocked"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
            <span>{status.includes("error") || status === "unauthorized" ? "⚠️" : "✓"}</span>
            {statusLabel[status]}
          </div>
        )}

        <div className="panel space-y-3 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Existing Products</h2>
            <form className="flex flex-wrap items-center gap-2" method="get">
              <input name="q" defaultValue={q} placeholder="Search product" className="input w-auto" />
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

          {products.length > 0 && (
            <form id="bulk-products-form" action={bulkProductAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3">
              <input type="hidden" name="returnTo" value={returnTo} />
              <BulkSelectControls formId="bulk-products-form" />
              <button type="submit" name="bulkAction" value="publish" className="btn btn-ghost btn-sm">Publish</button>
              <button type="submit" name="bulkAction" value="unpublish" className="btn btn-ghost btn-sm">Unpublish</button>
              <button type="submit" name="bulkAction" value="delete" className="btn btn-sm bg-red-600 text-white hover:bg-red-700">Delete</button>
            </form>
          )}
        </div>

        {products.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <span className="text-3xl">📦</span>
            <p className="mt-2 text-sm text-slate-600">No products yet. Add your first product above.</p>
          </div>
        ) : (
          products.map((product) => (
            <article key={product.id} className="panel space-y-3 p-5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="ids" value={product.id} form="bulk-products-form" />
                  Select
                </label>
                <span className={`badge ${product.isPublished ? "badge-success" : "badge-neutral"}`}>
                  {product.isPublished ? "Published" : "Draft"}
                </span>
              </div>

              <form action={updateProductAction} className="space-y-3">
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="name" defaultValue={product.name} required className="input" />
                  <input name="slug" defaultValue={product.slug} required className="input" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="categorySlug" defaultValue={product.category?.slug ?? ""} required className="input" />
                  <input name="affiliateUrl" defaultValue={product.affiliateUrl} className="input" />
                </div>
                <textarea name="description" defaultValue={product.description} className="input min-h-20 resize-none" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="isPublished" defaultChecked={product.isPublished ?? false} />
                  Published
                </label>
                <button type="submit" className="btn btn-primary btn-sm">Update</button>
              </form>

              <form action={deleteProductAction}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className="btn btn-sm bg-red-600 text-white hover:bg-red-700">
                  Delete
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Affiliate Programs</h3>
                {(programsByProduct.get(product.id) ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">No program yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(programsByProduct.get(product.id) ?? []).map((program) => (
                      <li key={program.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{program.programName}</span>
                          <span className="badge badge-neutral text-[10px]">{program.region}</span>
                          {program.isPrimary && <span className="badge badge-primary text-[10px]">Primary</span>}
                        </div>
                        <p className="mt-1 truncate text-slate-500">{program.affiliateUrl}</p>
                        <p className="text-slate-500">
                          status: <span className={program.lastHealthStatus === "healthy" ? "text-emerald-600" : "text-slate-500"}>{program.lastHealthStatus ?? "unchecked"}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {!program.isPrimary && (
                            <form action={setPrimaryAffiliateProgramAction}>
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="programId" value={program.id} />
                              <button type="submit" className="btn btn-ghost btn-sm text-[11px]">Set Primary</button>
                            </form>
                          )}
                          <form action={checkAffiliateProgramHealthAction}>
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="programId" value={program.id} />
                            <input type="hidden" name="affiliateUrl" value={program.affiliateUrl} />
                            <button type="submit" className="btn btn-ghost btn-sm text-[11px]">Check Health</button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={createAffiliateProgramAction} className="grid gap-2 border-t border-slate-200 pt-3">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input name="programName" required placeholder="Program name (Shopee, TikTok, etc)" className="input text-xs" />
                  <select name="region" defaultValue="global" className="input text-xs">
                    <option value="global">Global</option>
                    <option value="indonesia">Indonesia</option>
                  </select>
                  <input name="affiliateUrl" type="url" required placeholder="https://affiliate-url" className="input text-xs" />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" name="isPrimary" />
                    Set as primary
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm w-fit text-xs">Add Program</button>
                </form>
              </div>
            </article>
          ))
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>Page {safePage} of {pageCount} ({total} items)</p>
          <div className="flex items-center gap-2">
            <Link href={`/admin?page=${prevPage}${queryQ}${queryPublished}${querySort}`} className="btn btn-ghost btn-sm">Prev</Link>
            <Link href={`/admin?page=${nextPage}${queryQ}${queryPublished}${querySort}`} className="btn btn-ghost btn-sm">Next</Link>
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
                  <span className={`badge text-[10px] ${log.action.includes("denied") || log.action.includes("blocked")
                      ? "badge-danger"
                      : log.action.includes("rate_limited")
                        ? "badge-warn"
                        : "badge-neutral"
                    }`}>
                    {log.action}
                  </span>
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
