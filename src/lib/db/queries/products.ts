import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";

export type ProductInput = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  affiliateUrl: string;
  categorySlug: string;
  isPublished: boolean;
  isPurged?: boolean;
  purgeReason?: string | null;
  rpScoreQuality?: number | null;
  rpScoreReputation?: number | null;
  rpScoreValue?: number | null;
};

function normalizeScore(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

function computeRpScoreTotal(parts: {
  quality: number | null;
  reputation: number | null;
  value: number | null;
}) {
  const values = [parts.quality, parts.reputation, parts.value].filter(
    (item): item is number => item != null,
  );
  if (values.length === 0) return null;
  const sum = values.reduce((acc, item) => acc + item, 0);
  return Math.round(sum / values.length);
}

function normalizePurgeReason(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

async function getOrCreateCategory(categorySlug: string) {
  const db = getDb();
  if (!db) return null;

  const existing = await db.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(categories)
    .values({
      name: categorySlug.replace(/-/g, " "),
      slug: categorySlug,
      region: categorySlug.startsWith("id-") ? "indonesia" : "global",
    })
    .returning({ id: categories.id });

  return created?.id ?? null;
}

export async function listProducts() {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.products.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        affiliateUrl: true,
        isPublished: true,
        isPurged: true,
        purgeReason: true,
        categoryId: true,
        rpScoreQuality: true,
        rpScoreReputation: true,
        rpScoreValue: true,
        rpScoreTotal: true,
      },
      orderBy: asc(products.createdAt),
      with: {
        category: {
          columns: {
            slug: true,
            name: true,
          },
        },
      },
    });
  } catch {
    return [];
  }
}

export async function listProductsPaginated(input: {
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
        ilike(products.name, `%${query}%`),
        ilike(products.slug, `%${query}%`),
        ilike(products.description, `%${query}%`),
      )
    : undefined;
  const published = input.published ?? "all";
  const publishClause =
    published === "published"
      ? eq(products.isPublished, true)
      : published === "draft"
        ? eq(products.isPublished, false)
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
      ? asc(products.createdAt)
      : sort === "name"
        ? asc(products.name)
        : desc(products.createdAt);

  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const total = Number(countRows[0]?.count ?? 0);

    const items = await db.query.products.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        affiliateUrl: true,
        isPublished: true,
        isPurged: true,
        purgeReason: true,
        categoryId: true,
        rpScoreQuality: true,
        rpScoreReputation: true,
        rpScoreValue: true,
        rpScoreTotal: true,
      },
      orderBy,
      limit: safePageSize,
      offset,
      with: {
        category: {
          columns: {
            slug: true,
            name: true,
          },
        },
      },
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  } catch {
    return { items: [], total: 0, page: safePage, pageSize: safePageSize };
  }
}

export async function createProduct(input: ProductInput) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  const categoryId = await getOrCreateCategory(input.categorySlug);
  if (!categoryId) return { ok: false as const, error: "Failed to resolve category." };
  const rpScoreQuality = normalizeScore(input.rpScoreQuality);
  const rpScoreReputation = normalizeScore(input.rpScoreReputation);
  const rpScoreValue = normalizeScore(input.rpScoreValue);
  const rpScoreTotal = computeRpScoreTotal({
    quality: rpScoreQuality,
    reputation: rpScoreReputation,
    value: rpScoreValue,
  });
  const normalizedPurgeReason = normalizePurgeReason(input.purgeReason);
  const isPurged = Boolean(input.isPurged) || normalizedPurgeReason != null;
  const isPublished = isPurged ? false : input.isPublished;

  await db.insert(products).values({
    name: input.name,
    slug: input.slug,
    description: input.description,
    affiliateUrl: input.affiliateUrl,
    categoryId,
    isPublished,
    isPurged,
    purgeReason: isPurged ? normalizedPurgeReason : null,
    rpScoreQuality,
    rpScoreReputation,
    rpScoreValue,
    rpScoreTotal,
    updatedAt: new Date(),
  });

  return { ok: true as const };
}

export async function updateProduct(input: ProductInput) {
  if (!input.id) return { ok: false as const, error: "Product id is required." };

  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  const categoryId = await getOrCreateCategory(input.categorySlug);
  if (!categoryId) return { ok: false as const, error: "Failed to resolve category." };
  const rpScoreQuality = normalizeScore(input.rpScoreQuality);
  const rpScoreReputation = normalizeScore(input.rpScoreReputation);
  const rpScoreValue = normalizeScore(input.rpScoreValue);
  const rpScoreTotal = computeRpScoreTotal({
    quality: rpScoreQuality,
    reputation: rpScoreReputation,
    value: rpScoreValue,
  });
  const normalizedPurgeReason = normalizePurgeReason(input.purgeReason);
  const isPurged = Boolean(input.isPurged) || normalizedPurgeReason != null;
  const isPublished = isPurged ? false : input.isPublished;

  await db
    .update(products)
    .set({
      name: input.name,
      slug: input.slug,
      description: input.description,
      affiliateUrl: input.affiliateUrl,
      categoryId,
      isPublished,
      isPurged,
      purgeReason: isPurged ? normalizedPurgeReason : null,
      rpScoreQuality,
      rpScoreReputation,
      rpScoreValue,
      rpScoreTotal,
      updatedAt: new Date(),
    })
    .where(eq(products.id, input.id));

  return { ok: true as const };
}

export async function deleteProduct(id: number) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db.delete(products).where(eq(products.id, id));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to delete product." };
  }
}

export async function setProductsPublished(ids: number[], isPublished: boolean) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };
  if (ids.length === 0) return { ok: false as const, error: "No product selected." };

  try {
    await db
      .update(products)
      .set({ isPublished })
      .where(inArray(products.id, ids));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update product status." };
  }
}

export async function deleteProducts(ids: number[]) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };
  if (ids.length === 0) return { ok: false as const, error: "No product selected." };

  try {
    await db.delete(products).where(inArray(products.id, ids));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to delete products." };
  }
}

export async function listProductsByRegion(region: "indonesia" | "global") {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db.query.products.findMany({
        where: eq(products.isPublished, true),
        with: {
          category: {
            columns: { region: true, slug: true, name: true },
          },
          affiliatePrograms: {
            columns: {
              id: true,
              region: true,
              isActive: true,
              lastHealthStatus: true,
            },
          },
        },
        orderBy: asc(products.createdAt),
      });

    return rows.filter((row) => row.category?.region === region);
  } catch {
    return [];
  }
}

export async function getPublicTrustSnapshot(limit = 4) {
  const db = getDb();
  if (!db) {
    return {
      publishedCount: 0,
      draftCount: 0,
      purgedCount: 0,
      latestVerified: [],
      latestPurged: [],
    };
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 4, 1), 12);
  const safePurgedLimit = Math.min(Math.max(Math.trunc(limit / 2) || 2, 1), 6);

  try {
    const publishedCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isPublished, true));
    const draftCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isPublished, false));
    const purgedCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isPurged, true));

    const latestVerified = await db.query.products.findMany({
      where: eq(products.isPublished, true),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        rpScoreQuality: true,
        rpScoreReputation: true,
        rpScoreValue: true,
        rpScoreTotal: true,
      },
      with: {
        category: {
          columns: {
            region: true,
            slug: true,
          },
        },
        affiliatePrograms: {
          columns: {
            region: true,
            isActive: true,
            lastHealthStatus: true,
          },
        },
      },
      orderBy: desc(products.updatedAt),
      limit: safeLimit,
    });
    const latestPurged = await db.query.products.findMany({
      where: eq(products.isPurged, true),
      columns: {
        id: true,
        name: true,
        slug: true,
        purgeReason: true,
      },
      with: {
        category: {
          columns: {
            region: true,
            slug: true,
          },
        },
      },
      orderBy: desc(products.updatedAt),
      limit: safePurgedLimit,
    });

    return {
      publishedCount: Number(publishedCountRows[0]?.count ?? 0),
      draftCount: Number(draftCountRows[0]?.count ?? 0),
      purgedCount: Number(purgedCountRows[0]?.count ?? 0),
      latestVerified,
      latestPurged,
    };
  } catch {
    return {
      publishedCount: 0,
      draftCount: 0,
      purgedCount: 0,
      latestVerified: [],
      latestPurged: [],
    };
  }
}
