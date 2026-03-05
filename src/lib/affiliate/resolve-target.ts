import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { isAffiliateUrlAllowed } from "@/lib/security/affiliate-url";

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
    with: {
      affiliatePrograms: {
        columns: {
          affiliateUrl: true,
          isPrimary: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) return fallbackTargets[slug] ?? null;

  const primaryProgram = product.affiliatePrograms.find(
    (program) => program.isPrimary && program.isActive,
  );
  const selectedUrl = primaryProgram?.affiliateUrl ?? product.affiliateUrl;
  if (!isAffiliateUrlAllowed(selectedUrl)) return null;

  return {
    url: selectedUrl,
    productId: product.id,
  };
}
