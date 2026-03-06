import { NextRequest, NextResponse } from "next/server";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import {
  listAffiliateProgramsForHealthCheck,
  setAffiliateProgramHealth,
} from "@/lib/db/queries/affiliate-programs";
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

function isHealthyStatus(status: string | null | undefined) {
  return status === "healthy";
}

function buildCronSummaryMessage(input: {
  checked: number;
  healthy: number;
  unhealthy: number;
  recovered: number;
  degraded: number;
  dryRun: boolean;
}) {
  return `Affiliate health ${input.dryRun ? "dry-run" : "run"}: checked=${input.checked}, healthy=${input.healthy}, unhealthy=${input.unhealthy}, recovered=${input.recovered}, degraded=${input.degraded}.`;
}

async function checkAffiliateUrlHealth(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (head.ok) return "healthy";
    if (head.status === 405 || head.status === 403) {
      const fallback = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      return fallback.ok ? "healthy" : `http_${fallback.status}`;
    }
    return `http_${head.status}`;
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const max = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_CRON_RATE_LIMIT_MAX,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_MAX, 30),
  );
  const windowMs = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_CRON_RATE_LIMIT_WINDOW_MS,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_WINDOW_MS, 60000),
  );
  const rate = await checkRateLimit({
    key: `cron_affiliate_health:${requestIp}`,
    max,
    windowMs,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  const maxPrograms = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_MAX_PROGRAMS_PER_RUN,
    250,
  );
  const timeoutMs = parsePositiveNumber(
    process.env.AFFILIATE_HEALTH_CHECK_TIMEOUT_MS,
    8000,
  );
  const isDryRun =
    request.nextUrl.searchParams.get("dry_run") === "1" ||
    request.headers.get("x-dry-run")?.trim() === "1";
  const programs = await listAffiliateProgramsForHealthCheck(maxPrograms);

  let healthy = 0;
  let unhealthy = 0;
  let recovered = 0;
  let degraded = 0;

  for (const program of programs) {
    const status = await checkAffiliateUrlHealth(program.affiliateUrl, timeoutMs);
    const nowHealthy = isHealthyStatus(status);
    const wasHealthy =
      program.lastHealthStatus == null || isHealthyStatus(program.lastHealthStatus);
    if (nowHealthy) healthy += 1;
    else unhealthy += 1;
    if (nowHealthy && !wasHealthy) recovered += 1;
    if (!nowHealthy && wasHealthy) degraded += 1;

    if (isDryRun) continue;

    await setAffiliateProgramHealth({
      id: program.id,
      status,
    });

    if (!nowHealthy && wasHealthy) {
      await createActivityLog({
        actorEmail: "system",
        entityType: "product",
        entityId: program.productId,
        action: "affiliate_link_unhealthy",
        reason: status,
        message: `Affiliate link unhealthy: ${program.product?.slug ?? program.productId}/${program.programName} (${status})`,
      });
    } else if (nowHealthy && !wasHealthy) {
      await createActivityLog({
        actorEmail: "system",
        entityType: "product",
        entityId: program.productId,
        action: "affiliate_link_recovered",
        reason: status,
        message: `Affiliate link recovered: ${program.product?.slug ?? program.productId}/${program.programName}`,
      });
    }
  }

  await createActivityLog({
    actorEmail: "system",
    entityType: "system",
    action: "affiliate_link_health_cron",
    reason: isDryRun ? "dry_run" : "live",
    message: buildCronSummaryMessage({
      checked: programs.length,
      healthy,
      unhealthy,
      recovered,
      degraded,
      dryRun: isDryRun,
    }),
  });

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    checked: programs.length,
    healthy,
    unhealthy,
    recovered,
    degraded,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
