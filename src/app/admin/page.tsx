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
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-slate-600">Kelola produk affiliate dari satu tempat.</p>
        <Link
          href="/admin/articles"
          className="mt-3 inline-block text-sm font-medium text-sky-600"
        >
          Go to article management
        </Link>
        <Link href="/admin/users" className="mt-2 block text-sm font-medium text-sky-600">
          Go to admin users
        </Link>
        <Link href="/admin/logs" className="mt-2 block text-sm font-medium text-sky-600">
          Go to activity logs
        </Link>
      </div>

      <form
        action={createProductAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <h2 className="text-lg font-semibold">Create Product</h2>
        <input
          name="name"
          required
          placeholder="Product name"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="slug"
          required
          placeholder="product-slug"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="categorySlug"
          required
          placeholder="id-produk-tiktok or global-ai-tools"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          name="affiliateUrl"
          type="url"
          required
          placeholder="https://affiliate-link.example"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <textarea
          name="description"
          required
          placeholder="Short product description"
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" />
          Publish now
        </label>
        <button
          type="submit"
          className="w-fit rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        >
          Save Product
        </button>
      </form>

      <div className="space-y-4">
        {statusLabel[status] && (
          <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {statusLabel[status]}
          </p>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Existing Products</h2>
          <form className="flex items-center gap-2" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search product"
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
        {products.length > 0 && (
          <form
            id="bulk-products-form"
            action={bulkProductAction}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <input type="hidden" name="returnTo" value={returnTo} />
            <BulkSelectControls formId="bulk-products-form" />
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
        {products.length === 0 ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            No products yet. Add your first product above.
          </p>
        ) : (
          products.map((product) => (
            <form
              key={product.id}
              action={updateProductAction}
              className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
            >
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="ids"
                  value={product.id}
                  form="bulk-products-form"
                />
                Select for bulk action
              </label>
              <input
                name="name"
                defaultValue={product.name}
                required
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="slug"
                defaultValue={product.slug}
                required
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="categorySlug"
                defaultValue={product.category?.slug ?? ""}
                required
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                name="affiliateUrl"
                defaultValue={product.affiliateUrl}
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <textarea
                name="description"
                defaultValue={product.description}
                className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={product.isPublished ?? false}
                />
                Published
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Update Product
                </button>
                <button
                  type="submit"
                  formAction={deleteProductAction}
                  className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Delete
                </button>
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold">Affiliate Programs</h3>
                {(programsByProduct.get(product.id) ?? []).length === 0 ? (
                  <p className="text-xs text-slate-600">No program yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(programsByProduct.get(product.id) ?? []).map((program) => (
                      <li
                        key={program.id}
                        className="rounded-md border border-slate-200 bg-white p-2 text-xs"
                      >
                        <p className="font-medium">
                          {program.programName} ({program.region})
                          {program.isPrimary ? " [Primary]" : ""}
                        </p>
                        <p className="truncate text-slate-600">{program.affiliateUrl}</p>
                        <p className="text-slate-500">
                          status: {program.lastHealthStatus ?? "unchecked"}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {!program.isPrimary && (
                            <form action={setPrimaryAffiliateProgramAction}>
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="programId" value={program.id} />
                              <button
                                type="submit"
                                className="rounded border border-slate-300 px-2 py-1"
                              >
                                Set Primary
                              </button>
                            </form>
                          )}
                          <form action={checkAffiliateProgramHealthAction}>
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="programId" value={program.id} />
                            <input
                              type="hidden"
                              name="affiliateUrl"
                              value={program.affiliateUrl}
                            />
                            <button
                              type="submit"
                              className="rounded border border-slate-300 px-2 py-1"
                            >
                              Check Health
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={createAffiliateProgramAction} className="grid gap-2">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    name="programName"
                    required
                    placeholder="Program name (Shopee, TikTok, etc)"
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <select
                    name="region"
                    defaultValue="global"
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option value="global">Global</option>
                    <option value="indonesia">Indonesia</option>
                  </select>
                  <input
                    name="affiliateUrl"
                    type="url"
                    required
                    placeholder="https://affiliate-url"
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" name="isPrimary" />
                    Set as primary
                  </label>
                  <button
                    type="submit"
                    className="w-fit rounded bg-sky-600 px-2 py-1.5 text-xs text-white"
                  >
                    Add Program
                  </button>
                </form>
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
              href={`/admin?page=${prevPage}${queryQ}${queryPublished}${querySort}`}
              className="rounded-md border border-slate-300 px-3 py-1.5"
            >
              Prev
            </Link>
            <Link
              href={`/admin?page=${nextPage}${queryQ}${queryPublished}${querySort}`}
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
