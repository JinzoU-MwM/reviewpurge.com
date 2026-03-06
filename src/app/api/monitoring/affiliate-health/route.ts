import { NextRequest, NextResponse } from "next/server";
import { getAffiliateHealthMonitoringSummary } from "@/lib/db/queries/activity-logs";
import { getAffiliateLinkHealthSummary } from "@/lib/db/queries/affiliate-programs";

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

  const [current, trend] = await Promise.all([
    getAffiliateLinkHealthSummary(),
    getAffiliateHealthMonitoringSummary(),
  ]);
  const warnThreshold = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_SUCCESS_RATE_WARN_THRESHOLD,
    95,
  );
  const criticalThreshold = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_SUCCESS_RATE_CRITICAL_THRESHOLD,
    80,
  );

  const status =
    current.unhealthyCount > 0 && trend.successRate24h < criticalThreshold
      ? "critical"
      : current.unhealthyCount > 0 || trend.successRate24h < warnThreshold
        ? "warn"
        : "ok";

  return NextResponse.json({
    ok: true,
    status,
    thresholds: {
      warnSuccessRate24h: warnThreshold,
      criticalSuccessRate24h: criticalThreshold,
    },
    current,
    trend24h: {
      successRate: trend.successRate24h,
      checks: trend.checks24h,
      healthy: trend.healthy24h,
      unhealthy: trend.unhealthy24h,
      runs: trend.runs24h,
      degraded: trend.degraded24h,
      recovered: trend.recovered24h,
    },
    lastRun: {
      at: trend.lastRunAt,
      mode: trend.lastRunMode,
      snapshot: trend.lastRun,
    },
  });
}

