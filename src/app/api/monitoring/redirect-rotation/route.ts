import { NextRequest, NextResponse } from "next/server";
import {
  getAffiliateRedirectRotationSkewSummary,
  getAffiliateRotationGuardSummary,
} from "@/lib/db/queries/activity-logs";

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAuthorized(request: NextRequest) {
  const token = process.env.CRON_SECRET?.trim();
  if (!token) return false;

  const headerToken = request.headers.get("x-monitor-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  return headerToken === token || queryToken === token;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
  const warnFlaggedProducts = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_WARN_FLAGGED,
    1,
  );
  const criticalFlaggedProducts = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_CRITICAL_FLAGGED,
    3,
  );
  const warnStaleMinutes = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_WARN,
    120,
  );
  const criticalStaleMinutes = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_CRITICAL,
    360,
  );

  const [skew, guard] = await Promise.all([
    getAffiliateRedirectRotationSkewSummary({
      thresholdSharePct,
      minEventsPerProduct,
      maxFlaggedProducts,
    }),
    getAffiliateRotationGuardSummary(),
  ]);

  const hasMeaningfulTraffic = skew.totalRotated24h >= minEventsPerProduct;
  const lastRunAgeMs =
    guard.lastGuardRunAt == null
      ? null
      : Date.now() - new Date(guard.lastGuardRunAt).getTime();
  const staleWarn =
    hasMeaningfulTraffic &&
    (lastRunAgeMs == null || lastRunAgeMs >= warnStaleMinutes * 60 * 1000);
  const staleCritical =
    hasMeaningfulTraffic &&
    (lastRunAgeMs == null || lastRunAgeMs >= criticalStaleMinutes * 60 * 1000);

  const flagged = skew.flaggedProducts.length;
  const status =
    flagged >= criticalFlaggedProducts || staleCritical
      ? "critical"
      : flagged >= warnFlaggedProducts || staleWarn || guard.recommendations24h > 0
        ? "warn"
        : "ok";

  return NextResponse.json({
    ok: true,
    status,
    thresholds: {
      imbalanceSharePct: thresholdSharePct,
      minEventsPerProduct,
      warnFlaggedProducts,
      criticalFlaggedProducts,
      staleWarnMinutes: warnStaleMinutes,
      staleCriticalMinutes: criticalStaleMinutes,
    },
    skew: {
      totalRotated24h: skew.totalRotated24h,
      flaggedProducts: skew.flaggedProducts.map((item) => ({
        productId: item.productId,
        productSlug: item.productSlug,
        dominantProgramKey: item.dominantProgramKey,
        dominantSharePct: Number(item.dominantSharePct.toFixed(2)),
        totalRotated24h: item.totalRotated24h,
      })),
    },
    guard: {
      recommendations24h: guard.recommendations24h,
      recommendations7d: guard.recommendations7d,
      guardRuns24h: guard.guardRuns24h,
      guardRuns7d: guard.guardRuns7d,
      lastRunAt: guard.lastGuardRunAt,
      lastRunMode: guard.lastGuardRunMode,
      lastRecommendationAt: guard.lastRecommendationAt,
      runAgeMinutes:
        lastRunAgeMs == null ? null : Math.round(lastRunAgeMs / (60 * 1000)),
    },
  });
}
