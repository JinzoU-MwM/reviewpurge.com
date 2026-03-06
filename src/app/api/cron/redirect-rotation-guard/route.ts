import { NextRequest, NextResponse } from "next/server";
import {
  createActivityLog,
  getAffiliateRedirectRotationSkewSummary,
  getLatestActivityLogByActionAndEntityId,
} from "@/lib/db/queries/activity-logs";
import { checkRateLimit } from "@/lib/security/rate-limit";

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAuthorized(request: NextRequest) {
  const token = process.env.CRON_SECRET?.trim();
  if (!token) return false;

  const headerToken = request.headers.get("x-cron-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  if (!(headerToken === token || queryToken === token)) return false;

  const allowedIps = (process.env.CRON_ALLOWED_IPS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowedIps.length === 0) return true;

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim();
  return Boolean(requestIp && allowedIps.includes(requestIp));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const max = parsePositiveNumber(
    process.env.AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_MAX,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_MAX, 30),
  );
  const windowMs = parsePositiveNumber(
    process.env.AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_WINDOW_MS,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_WINDOW_MS, 60000),
  );
  const rate = await checkRateLimit({
    key: `cron_affiliate_rotation_guard:${requestIp}`,
    max,
    windowMs,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  const thresholdSharePct = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_IMBALANCE_THRESHOLD,
    65,
  );
  const minEventsPerProduct = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MIN_EVENTS,
    20,
  );
  const maxFlaggedProducts = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MAX_FLAGGED_PRODUCTS,
    5,
  );
  const rebalanceCooldownMs = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS,
    6 * 60 * 60 * 1000,
  );
  const isDryRun =
    request.nextUrl.searchParams.get("dry_run") === "1" ||
    request.headers.get("x-dry-run")?.trim() === "1";

  const skew = await getAffiliateRedirectRotationSkewSummary({
    thresholdSharePct,
    minEventsPerProduct,
    maxFlaggedProducts,
  });

  let createdRecommendations = 0;
  let skippedCooldown = 0;

  if (!isDryRun) {
    for (const product of skew.flaggedProducts) {
      const latest = await getLatestActivityLogByActionAndEntityId(
        "affiliate_rotation_rebalance_recommended",
        product.productId,
      );
      if (latest) {
        const elapsed = Date.now() - new Date(latest.createdAt).getTime();
        if (elapsed < rebalanceCooldownMs) {
          skippedCooldown += 1;
          continue;
        }
      }

      await createActivityLog({
        actorEmail: "system",
        entityType: "product",
        entityId: product.productId,
        action: "affiliate_rotation_rebalance_recommended",
        reason: product.dominantProgramKey,
        permission: `${product.dominantSharePct.toFixed(1)}%`,
        returnTo: `threshold=${thresholdSharePct.toFixed(0)}%`,
        message: `Rotation skew detected for ${product.productSlug ?? `product-${product.productId}`}: dominant=${product.dominantProgramKey} share=${product.dominantSharePct.toFixed(1)}% (${product.dominantCount}/${product.totalRotated24h}).`,
      });
      createdRecommendations += 1;
    }
  }

  await createActivityLog({
    actorEmail: "system",
    entityType: "system",
    action: "affiliate_rotation_guard_cron",
    reason: isDryRun ? "dry_run" : "live",
    message: `Rotation guard ${isDryRun ? "dry-run" : "run"}: flagged=${skew.flaggedProducts.length}, created=${createdRecommendations}, skipped_cooldown=${skippedCooldown}, threshold=${thresholdSharePct.toFixed(0)}%, min_events=${minEventsPerProduct}.`,
  });

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    flagged: skew.flaggedProducts.length,
    createdRecommendations,
    skippedCooldown,
    thresholdSharePct,
    minEventsPerProduct,
    products: skew.flaggedProducts.map((item) => ({
      productId: item.productId,
      productSlug: item.productSlug,
      dominantProgramKey: item.dominantProgramKey,
      dominantSharePct: Number(item.dominantSharePct.toFixed(2)),
      totalRotated24h: item.totalRotated24h,
    })),
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}

