import { asc, eq } from "drizzle-orm";
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
