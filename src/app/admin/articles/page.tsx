import Link from "next/link";
import {
  createArticleAction,
  deleteArticleAction,
  updateArticleAction,
} from "@/app/admin/actions";
import { listArticles } from "@/lib/db/queries/articles";

export default async function AdminArticlesPage() {
  const articles = await listArticles();

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Article Management</h1>
        <p className="text-slate-600">Kelola konten SEO untuk blog.</p>
        <Link href="/admin" className="mt-3 inline-block text-sm text-sky-600">
          Back to products
        </Link>
      </div>

      <form
        action={createArticleAction}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5"
      >
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isPublished" />
          Publish now
        </label>
        <button
          type="submit"
          className="w-fit rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        >
          Save Article
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Existing Articles</h2>
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
      </div>
    </section>
  );
}
