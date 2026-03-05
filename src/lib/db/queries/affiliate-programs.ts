import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { affiliatePrograms, products } from "@/lib/db/schema";

export type AffiliateProgramInput = {
  productId: number;
  programName: string;
  region: "indonesia" | "global";
  affiliateUrl: string;
  isPrimary: boolean;
  isActive: boolean;
};

function asPostgresError(error: unknown) {
  if (typeof error !== "object" || !error) return null;
  return error as { code?: string; constraint_name?: string; constraint?: string };
}

export async function listAffiliateProgramsByProduct(productId: number) {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.affiliatePrograms.findMany({
      where: eq(affiliatePrograms.productId, productId),
      columns: {
        id: true,
        productId: true,
        programName: true,
        region: true,
        affiliateUrl: true,
        isPrimary: true,
        isActive: true,
        lastCheckedAt: true,
        lastHealthStatus: true,
      },
      orderBy: asc(affiliatePrograms.id),
    });
  } catch {
    return [];
  }
}

export async function createAffiliateProgram(input: AffiliateProgramInput) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db.transaction(async (tx) => {
      if (input.isPrimary) {
        await tx
          .update(affiliatePrograms)
          .set({ isPrimary: false })
          .where(eq(affiliatePrograms.productId, input.productId));
      }

      await tx.insert(affiliatePrograms).values({
        productId: input.productId,
        programName: input.programName,
        region: input.region,
        affiliateUrl: input.affiliateUrl,
        isPrimary: input.isPrimary,
        isActive: input.isActive,
      });

      if (input.isPrimary) {
        await tx
          .update(products)
          .set({ affiliateUrl: input.affiliateUrl, updatedAt: new Date() })
          .where(eq(products.id, input.productId));
      }
    });

    return { ok: true as const };
  } catch (error) {
    const pgError = asPostgresError(error);
    if (pgError?.code === "23505") {
      return { ok: false as const, error: "DUPLICATE_PROGRAM" as const };
    }
    return { ok: false as const, error: "Failed to create affiliate program." };
  }
}

export async function setAffiliateProgramHealth(input: {
  id: number;
  status: string;
}) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    await db
      .update(affiliatePrograms)
      .set({
        lastHealthStatus: input.status,
        lastCheckedAt: new Date(),
      })
      .where(eq(affiliatePrograms.id, input.id));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update health status." };
  }
}

export async function setPrimaryAffiliateProgram(input: {
  productId: number;
  programId: number;
}) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(affiliatePrograms)
        .set({ isPrimary: false })
        .where(eq(affiliatePrograms.productId, input.productId));

      const program = await tx.query.affiliatePrograms.findFirst({
        where: and(
          eq(affiliatePrograms.id, input.programId),
          eq(affiliatePrograms.productId, input.productId),
        ),
        columns: { affiliateUrl: true },
      });

      if (!program) return { ok: false as const, error: "Program not found." as const };

      await tx
        .update(affiliatePrograms)
        .set({ isPrimary: true })
        .where(eq(affiliatePrograms.id, input.programId));

      await tx
        .update(products)
        .set({ affiliateUrl: program.affiliateUrl, updatedAt: new Date() })
        .where(eq(products.id, input.productId));

      return { ok: true as const };
    });

    if (!result.ok) return result;

    return { ok: true as const };
  } catch (error) {
    const pgError = asPostgresError(error);
    if (pgError?.code === "23505") {
      return { ok: false as const, error: "PRIMARY_CONFLICT" as const };
    }
    return { ok: false as const, error: "Failed to set primary program." };
  }
}
