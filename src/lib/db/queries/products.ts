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
};

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
        categoryId: true,
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
        categoryId: true,
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

  await db.insert(products).values({
    name: input.name,
    slug: input.slug,
    description: input.description,
    affiliateUrl: input.affiliateUrl,
    categoryId,
    isPublished: input.isPublished,
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

  await db
    .update(products)
    .set({
      name: input.name,
      slug: input.slug,
      description: input.description,
      affiliateUrl: input.affiliateUrl,
      categoryId,
      isPublished: input.isPublished,
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
        },
        orderBy: asc(products.createdAt),
      });

    return rows.filter((row) => row.category?.region === region);
  } catch {
    return [];
  }
}
