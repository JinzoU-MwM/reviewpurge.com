import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles } from "@/lib/db/schema";

export type ArticleInput = {
  id?: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  isPublished: boolean;
};

export async function listArticles() {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.articles.findMany({
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: desc(articles.createdAt),
    });
  } catch {
    return [];
  }
}

export async function listPublishedArticles() {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.articles.findMany({
      where: eq(articles.isPublished, true),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: desc(articles.publishedAt),
    });
  } catch {
    return [];
  }
}

export async function getPublishedArticleBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;

  try {
    return await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        isPublished: true,
        publishedAt: true,
      },
    });
  } catch {
    return null;
  }
}

export async function createArticle(input: ArticleInput) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db.insert(articles).values({
      title: input.title,
      slug: input.slug,
      content: input.content,
      excerpt: input.excerpt,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? new Date() : null,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to create article." };
  }
}

export async function updateArticle(input: ArticleInput) {
  if (!input.id) return { ok: false as const, error: "Article id is required." };

  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db
      .update(articles)
      .set({
        title: input.title,
        slug: input.slug,
        content: input.content,
        excerpt: input.excerpt,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? new Date() : null,
      })
      .where(eq(articles.id, input.id));

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update article." };
  }
}

export async function deleteArticle(id: number) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db.delete(articles).where(eq(articles.id, id));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to delete article." };
  }
}
