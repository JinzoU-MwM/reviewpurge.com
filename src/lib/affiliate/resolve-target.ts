import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { hashSeed } from "@/lib/experiments/trust-copy";
import { isAffiliateUrlAllowed } from "@/lib/security/affiliate-url";

const fallbackTargets: Record<string, { url: string; productId: number }> = {
  notion: { url: "https://www.notion.so/product", productId: 0 },
  grammarly: { url: "https://www.grammarly.com", productId: 0 },
};

type SelectionMode = "preferred" | "rotated" | "primary" | "fallback";

type ResolveTargetInput = {
  preferredProgram?: string | null;
  sessionId?: string | null;
};

function normalizeProgramKey(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized;
}

function buildStableProgramOrder<T extends { isPrimary: boolean; programName: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.programName.localeCompare(b.programName, "en");
  });
}

function selectRotatedProgram<T extends { isPrimary: boolean; programName: string }>(
  slug: string,
  sessionId: string | null | undefined,
  rows: T[],
) {
  if (rows.length < 2) return rows[0] ?? null;
  const ordered = buildStableProgramOrder(rows);
  const candidates = ordered.slice(0, 2);
  const seed = sessionId?.trim() || "anonymous";
  const bucket = hashSeed(`affiliate_rot_v1:${slug}:${seed}`) % 2;
  return candidates[bucket] ?? candidates[0] ?? null;
}

export async function resolveAffiliateTarget(slug: string, input: ResolveTargetInput = {}) {
  const db = getDb();

  if (!db) {
    const fallback = fallbackTargets[slug];
    if (!fallback) return null;
    return {
      ...fallback,
      selectedProgramName: null,
      selectedProgramKey: null,
      selectionMode: "fallback" as SelectionMode,
    };
  }

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
          programName: true,
          isPrimary: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    const fallback = fallbackTargets[slug];
    if (!fallback) return null;
    return {
      ...fallback,
      selectedProgramName: null,
      selectedProgramKey: null,
      selectionMode: "fallback" as SelectionMode,
    };
  }

  const activePrograms = product.affiliatePrograms.filter(
    (program) => program.isActive && isAffiliateUrlAllowed(program.affiliateUrl),
  );
  const preferredKey = normalizeProgramKey(input.preferredProgram);

  const matchedPreferred =
    preferredKey.length > 0
      ? activePrograms.find((program) => {
          const programKey = normalizeProgramKey(program.programName);
          return (
            programKey === preferredKey ||
            programKey.includes(preferredKey) ||
            preferredKey.includes(programKey)
          );
        })
      : null;

  const primaryProgram = buildStableProgramOrder(activePrograms).find(
    (program) => program.isPrimary,
  );
  const rotatedProgram =
    preferredKey.length === 0
      ? selectRotatedProgram(slug, input.sessionId, activePrograms)
      : null;
  const selectedProgram = matchedPreferred ?? rotatedProgram ?? primaryProgram ?? null;
  let selectionMode: SelectionMode = "primary";
  if (matchedPreferred) selectionMode = "preferred";
  else if (rotatedProgram && activePrograms.length >= 2) selectionMode = "rotated";
  else if (!selectedProgram) selectionMode = "fallback";

  const selectedUrl =
    selectedProgram?.affiliateUrl ?? product.affiliateUrl;
  if (!isAffiliateUrlAllowed(selectedUrl)) return null;

  return {
    url: selectedUrl,
    productId: product.id,
    selectedProgramName: selectedProgram?.programName ?? null,
    selectedProgramKey: selectedProgram
      ? normalizeProgramKey(selectedProgram.programName) || null
      : null,
    selectionMode,
  };
}
