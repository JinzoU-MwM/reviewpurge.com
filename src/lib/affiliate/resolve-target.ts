import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";

const fallbackTargets: Record<string, { url: string; productId: number }> = {
  notion: { url: "https://www.notion.so/product", productId: 0 },
  grammarly: { url: "https://www.grammarly.com", productId: 0 },
};

export async function resolveAffiliateTarget(slug: string) {
  const db = getDb();

  if (!db) return fallbackTargets[slug] ?? null;

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.isPublished, true)),
    columns: {
      id: true,
      affiliateUrl: true,
    },
  });

  if (!product) return fallbackTargets[slug] ?? null;

  return {
    url: product.affiliateUrl,
    productId: product.id,
  };
}
