import Link from "next/link";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/admin/actions";
import { listProducts } from "@/lib/db/queries/products";

export default async function AdminPage() {
  const products = await listProducts();

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-slate-600">
          Kelola produk affiliate dari satu tempat.
        </p>
        <Link
          href="/admin/articles"
          className="mt-3 inline-block text-sm font-medium text-sky-600"
        >
          Go to article management
        </Link>
      </div>

      <form
        action={createProductAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
      >
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
        <h2 className="text-lg font-semibold">Existing Products</h2>
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
            </form>
          ))
        )}
      </div>
    </section>
  );
}
