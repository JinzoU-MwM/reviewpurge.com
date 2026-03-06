import { getDb } from "@/lib/db/client";
import { clicks } from "@/lib/db/schema";

export async function trackAffiliateClick(
  productId: number,
  ipAddress: string | null,
  userAgent?: string | null,
) {
  if (productId <= 0) return;

  const db = getDb();
  if (!db) return;

  try {
    await db.insert(clicks).values({
      productId,
      ipAddress,
      userAgent: userAgent?.slice(0, 500) ?? null,
    });
  } catch {
    // Never block redirect because of analytics failures.
  }
}
