import { getDb } from "@/lib/db/client";
import { clicks } from "@/lib/db/schema";

export async function trackAffiliateClick(
  productId: number,
  ipAddress: string | null,
) {
  if (productId <= 0) return;

  const db = getDb();
  if (!db) return;

  try {
    await db.insert(clicks).values({
      productId,
      ipAddress,
    });
  } catch {
    // Never block redirect because of analytics failures.
  }
}
