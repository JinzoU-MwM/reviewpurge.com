import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles } from "@/lib/db/schema";

export type ArticleInput = {
  id?: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  publishAt?: Date | null;
  reviewedBy?: string;
  reviewedAt?: Date | null;
  priceCheckedAt?: Date | null;
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
        metaTitle: true,
        metaDescription: true,
        ogImageUrl: true,
        content: true,
        isPublished: true,
        publishedAt: true,
        publishAt: true,
        reviewedBy: true,
        reviewedAt: true,
        priceCheckedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: desc(articles.createdAt),
    });
  } catch {
    return [];
  }
}

export async function listArticlesPaginated(input: {
  page: number;
  pageSize: number;
  q?: string;
  published?: "all" | "published" | "draft";
  sort?: "latest" | "oldest" | "name";
}) {
  const db = getDb();
  if (!db) {
    return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
  }

  const query = input.q?.trim() ?? "";
  const searchClause = query
    ? or(
        ilike(articles.title, `%${query}%`),
        ilike(articles.slug, `%${query}%`),
        ilike(articles.excerpt, `%${query}%`),
      )
    : undefined;
  const published = input.published ?? "all";
  const publishClause =
    published === "published"
      ? eq(articles.isPublished, true)
      : published === "draft"
        ? eq(articles.isPublished, false)
        : undefined;
  const whereClause =
    searchClause && publishClause
      ? and(searchClause, publishClause)
      : searchClause ?? publishClause;

  const safePage = Math.max(1, input.page);
  const safePageSize = Math.max(1, input.pageSize);
  const offset = (safePage - 1) * safePageSize;
  const sort = input.sort ?? "latest";
  const orderBy =
    sort === "oldest"
      ? asc(articles.createdAt)
      : sort === "name"
        ? asc(articles.title)
        : desc(articles.createdAt);

  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(whereClause);
    const total = Number(countRows[0]?.count ?? 0);

    const items = await db.query.articles.findMany({
      where: whereClause,
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        ogImageUrl: true,
        content: true,
        isPublished: true,
        publishedAt: true,
        publishAt: true,
        reviewedBy: true,
        reviewedAt: true,
        priceCheckedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      limit: safePageSize,
      offset,
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  } catch {
    return { items: [], total: 0, page: safePage, pageSize: safePageSize };
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
        metaTitle: true,
        metaDescription: true,
        ogImageUrl: true,
        publishedAt: true,
        reviewedBy: true,
        reviewedAt: true,
        priceCheckedAt: true,
        createdAt: true,
      },
      orderBy: desc(articles.publishedAt),
    });
  } catch {
    return [];
  }
}

export async function publishDueScheduledArticles() {
  const db = getDb();
  if (!db) return 0;

  try {
    const dueRows = await db.query.articles.findMany({
      where: and(
        eq(articles.isPublished, false),
        sql`${articles.publishAt} is not null`,
        sql`${articles.publishAt} <= now()`,
      ),
      columns: { id: true },
      limit: 500,
    });

    const ids = dueRows.map((row) => row.id);
    if (ids.length === 0) return 0;

    await db
      .update(articles)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(articles.id, ids));
    return ids.length;
  } catch {
    // Keep silent to avoid blocking page rendering.
    return 0;
  }
}

export async function getPublishedArticleBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;

  try {
    return await db.query.articles.findFirst({
      where: and(eq(articles.slug, slug), eq(articles.isPublished, true)),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        ogImageUrl: true,
        content: true,
        isPublished: true,
        publishedAt: true,
        publishAt: true,
        reviewedBy: true,
        reviewedAt: true,
        priceCheckedAt: true,
        updatedAt: true,
      },
    });
  } catch {
    return null;
  }
}

export async function listRelatedPublishedArticles(slug: string, limit = 3) {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.articles.findMany({
      where: and(eq(articles.isPublished, true), sql`${articles.slug} <> ${slug}`),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
      },
      orderBy: desc(articles.publishedAt),
      limit: Math.max(1, limit),
    });
  } catch {
    return [];
  }
}

export async function createArticle(input: ArticleInput) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    const shouldPublish = input.isPublished && (!input.publishAt || input.publishAt <= new Date());
    await db.insert(articles).values({
      title: input.title,
      slug: input.slug,
      content: input.content,
      excerpt: input.excerpt,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      publishAt: input.publishAt ?? null,
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: input.reviewedAt ?? null,
      priceCheckedAt: input.priceCheckedAt ?? null,
      isPublished: shouldPublish,
      publishedAt: shouldPublish ? new Date() : null,
      updatedAt: new Date(),
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
    const shouldPublish = input.isPublished && (!input.publishAt || input.publishAt <= new Date());
    await db
      .update(articles)
      .set({
        title: input.title,
        slug: input.slug,
        content: input.content,
        excerpt: input.excerpt,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        ogImageUrl: input.ogImageUrl ?? null,
        publishAt: input.publishAt ?? null,
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt: input.reviewedAt ?? null,
        priceCheckedAt: input.priceCheckedAt ?? null,
        isPublished: shouldPublish,
        publishedAt: shouldPublish ? new Date() : null,
        updatedAt: new Date(),
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

export async function setArticlesPublished(ids: number[], isPublished: boolean) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };
  if (ids.length === 0) return { ok: false as const, error: "No article selected." };

  try {
    await db
      .update(articles)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      })
      .where(inArray(articles.id, ids));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update article status." };
  }
}

export async function deleteArticles(ids: number[]) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };
  if (ids.length === 0) return { ok: false as const, error: "No article selected." };

  try {
    await db.delete(articles).where(inArray(articles.id, ids));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to delete articles." };
  }
}
