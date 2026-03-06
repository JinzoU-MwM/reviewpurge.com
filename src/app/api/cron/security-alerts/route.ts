import { NextRequest, NextResponse } from "next/server";
import { setTimeout as delay } from "node:timers/promises";
import {
  createActivityLog,
  getActivityLogSecurityStats,
  getActivityLogSecurityTrend,
  getLatestActivityLogByActionAndReason,
  getRecentSecurityAlertSentReasons,
} from "@/lib/db/queries/activity-logs";
import {
  evaluateSecurityAlerts,
  type SecurityAlertItem,
  type SecurityAlertThresholds,
  resolveSecurityAlertThresholds,
} from "@/lib/security/alerts";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { signWebhookPayload } from "@/lib/security/webhook-signature";

const SECURITY_ALERT_PAYLOAD_SCHEMA_VERSION = "1.0";
type AlertSeverity = "warn" | "critical";

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

async function logSkippedIfNeeded(input: {
  reason: "no_threshold_breach" | "cooldown_active";
  message: string;
  retryAfterMs?: number;
  dedupeWindowMs: number;
}) {
  const latest = await getLatestActivityLogByActionAndReason(
    "security_alert_skipped",
    input.reason,
  );
  if (latest) {
    const elapsed = Date.now() - new Date(latest.createdAt).getTime();
    if (elapsed < input.dedupeWindowMs) return;
  }

  await createActivityLog({
    actorEmail: "system",
    entityType: "system",
    action: "security_alert_skipped",
    reason: input.reason,
    retryAfterMs: input.retryAfterMs ?? null,
    attemptCount: 0,
    message: input.message,
  });
}

async function sendWebhookWithRetry(input: {
  url: string;
  headers: HeadersInit;
  body: string;
  maxAttempts: number;
  baseBackoffMs: number;
  timeoutMs: number;
}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastStatus: number | null = null;
  let lastError: "network_error" | "non_2xx" | null = null;

  for (let attempt = 1; attempt <= input.maxAttempts; attempt += 1) {
    attempts = attempt;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(input.url, {
        method: "POST",
        headers: input.headers,
        body: input.body,
        signal: controller.signal,
      });

      if (response.ok) {
        return {
          ok: true as const,
          attempts,
          status: response.status,
          latencyMs: Date.now() - startedAt,
        };
      }

      lastStatus = response.status;
      lastError = "non_2xx";
    } catch {
      lastError = "network_error";
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < input.maxAttempts) {
      const backoffMs = Math.max(0, input.baseBackoffMs) * 2 ** (attempt - 1);
      if (backoffMs > 0) await delay(backoffMs);
    }
  }

  return {
    ok: false as const,
    attempts,
    lastStatus,
    lastError: lastError ?? "network_error",
    latencyMs: Date.now() - startedAt,
  };
}

function isCriticalCandidate(alerts: Array<{ value: number; threshold: number }>) {
  return alerts.some(
    (alert) => Number.isFinite(alert.threshold) && alert.threshold > 0 && alert.value >= alert.threshold * 2,
  );
}

type SecurityTrendRow = {
  day: string;
  denied: number;
  rateLimited: number;
  blockedUrl: number;
};

type SustainedBreachSummary = {
  active: boolean;
  triggered: boolean;
  windowDays: number;
  minBreachDays: number;
  daysEvaluated: number;
  breachedDays: number;
  breachedKeys: string[];
};

function evaluateSustainedBreach(input: {
  alerts: SecurityAlertItem[];
  thresholds: SecurityAlertThresholds;
  trend: SecurityTrendRow[];
  windowDays: number;
  minBreachDays: number;
}): SustainedBreachSummary {
  const safeWindow = Math.max(1, Math.min(30, Math.trunc(input.windowDays)));
  const safeMinDays = Math.max(1, Math.min(safeWindow, Math.trunc(input.minBreachDays)));
  const rows = input.trend.slice(0, safeWindow);
  if (rows.length === 0 || input.alerts.length === 0) {
    return {
      active: true,
      triggered: false,
      windowDays: safeWindow,
      minBreachDays: safeMinDays,
      daysEvaluated: rows.length,
      breachedDays: 0,
      breachedKeys: [],
    };
  }

  const keyThresholdPairs = input.alerts.map((alert) => ({
    key: alert.key,
    threshold:
      alert.key === "denied"
        ? input.thresholds.denied24h
        : alert.key === "rate_limited"
          ? input.thresholds.rateLimited24h
          : input.thresholds.blockedUrl24h,
  }));
  const keyBreachedDays = new Map<string, number>();
  let breachedDays = 0;
  for (const row of rows) {
    let rowBreached = false;
    for (const pair of keyThresholdPairs) {
      const value =
        pair.key === "denied"
          ? row.denied
          : pair.key === "rate_limited"
            ? row.rateLimited
            : row.blockedUrl;
      if (value >= pair.threshold) {
        rowBreached = true;
        keyBreachedDays.set(pair.key, (keyBreachedDays.get(pair.key) ?? 0) + 1);
      }
    }
    if (rowBreached) breachedDays += 1;
  }

  const breachedKeys = keyThresholdPairs
    .filter((pair) => (keyBreachedDays.get(pair.key) ?? 0) > 0)
    .map((pair) => pair.key);
  const triggered = breachedDays >= safeMinDays;
  return {
    active: true,
    triggered,
    windowDays: safeWindow,
    minBreachDays: safeMinDays,
    daysEvaluated: rows.length,
    breachedDays,
    breachedKeys,
  };
}

function resolveWebhookTargetBySeverity(severity: AlertSeverity) {
  const fallback = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim() ?? "";
  const warn = process.env.SECURITY_ALERT_WEBHOOK_URL_WARN?.trim() ?? "";
  const critical = process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL?.trim() ?? "";
  if (severity === "critical") return critical || fallback;
  return warn || fallback;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const hasWebhookTargetConfigured = Boolean(
    process.env.SECURITY_ALERT_WEBHOOK_URL?.trim() ||
      process.env.SECURITY_ALERT_WEBHOOK_URL_WARN?.trim() ||
      process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL?.trim(),
  );
  if (!hasWebhookTargetConfigured) {
    return NextResponse.json(
      { ok: false, error: "Security alert webhook target is not configured" },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const max = parsePositiveNumber(
    process.env.SECURITY_ALERT_CRON_RATE_LIMIT_MAX,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_MAX, 30),
  );
  const windowMs = parsePositiveNumber(
    process.env.SECURITY_ALERT_CRON_RATE_LIMIT_WINDOW_MS,
    parsePositiveNumber(process.env.CRON_RATE_LIMIT_WINDOW_MS, 60000),
  );
  const rate = await checkRateLimit({
    key: `cron_security_alert:${requestIp}`,
    max,
    windowMs,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  const stats = await getActivityLogSecurityStats();
  const thresholds = resolveSecurityAlertThresholds();
  const alerts = evaluateSecurityAlerts(stats, thresholds);
  const isDryRun =
    request.nextUrl.searchParams.get("dry_run") === "1" ||
    request.headers.get("x-dry-run")?.trim() === "1";
  const skipLogWindowMs = parsePositiveNumber(
    process.env.SECURITY_ALERT_SKIP_LOG_WINDOW_MS,
    10 * 60 * 1000,
  );
  if (alerts.length === 0) {
    await logSkippedIfNeeded({
      reason: "no_threshold_breach",
      message: "Security alert skipped: no threshold breach.",
      dedupeWindowMs: skipLogWindowMs,
    });
    return NextResponse.json({ ok: true, sent: false, reason: "no_threshold_breach" });
  }

  const trend = await getActivityLogSecurityTrend(7);
  const sustainedWindowDays = parsePositiveNumber(
    process.env.SECURITY_ALERT_SUSTAINED_WINDOW_DAYS,
    3,
  );
  const sustainedMinBreachDays = parsePositiveNumber(
    process.env.SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS,
    2,
  );
  const sustainedBreach = evaluateSustainedBreach({
    alerts,
    thresholds,
    trend,
    windowDays: sustainedWindowDays,
    minBreachDays: sustainedMinBreachDays,
  });
  const criticalConsecutiveMin = parsePositiveNumber(
    process.env.SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN,
    1,
  );
  let severity: AlertSeverity = "warn";
  if (isCriticalCandidate(alerts)) {
    if (criticalConsecutiveMin <= 1) {
      severity = "critical";
    } else {
      const neededHistory = Math.max(0, criticalConsecutiveMin - 1);
      const recentReasons =
        neededHistory > 0 ? await getRecentSecurityAlertSentReasons(neededHistory) : [];
      const hasCriticalStreak =
        recentReasons.length >= neededHistory &&
        recentReasons.every((reason) => reason === "threshold_breach_critical");
      severity = hasCriticalStreak ? "critical" : "warn";
    }
  }
  if (severity === "warn" && sustainedBreach.triggered) {
    severity = "critical";
  }
  const severityReason =
    severity === "critical" ? "threshold_breach_critical" : "threshold_breach_warn";
  const cooldownDefaultMs = parsePositiveNumber(
    process.env.SECURITY_ALERT_COOLDOWN_MS,
    30 * 60 * 1000,
  );
  const cooldownMs =
    severity === "critical"
      ? parsePositiveNumber(
          process.env.SECURITY_ALERT_COOLDOWN_MS_CRITICAL,
          cooldownDefaultMs,
        )
      : parsePositiveNumber(
          process.env.SECURITY_ALERT_COOLDOWN_MS_WARN,
          cooldownDefaultMs,
        );
  const latestSent = await getLatestActivityLogByActionAndReason(
    "security_alert_sent",
    severityReason,
  );
  if (latestSent) {
    const elapsed = Date.now() - new Date(latestSent.createdAt).getTime();
    if (elapsed < cooldownMs) {
      const retryAfterMs = cooldownMs - elapsed;
      await logSkippedIfNeeded({
        reason: "cooldown_active",
        retryAfterMs,
        dedupeWindowMs: skipLogWindowMs,
        message: `Security alert skipped: ${severity} cooldown window still active.`,
      });
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: "cooldown_active",
        severity,
        retryAfterMs,
      });
    }
  }

  const webhookTargetUrl = resolveWebhookTargetBySeverity(severity);
  if (!webhookTargetUrl) {
    return NextResponse.json(
      { ok: false, error: `Webhook URL for severity "${severity}" is not configured` },
      { status: 400 },
    );
  }
  const payload = {
    schemaVersion: SECURITY_ALERT_PAYLOAD_SCHEMA_VERSION,
    event: "security_alert_threshold_breach",
    severity,
    source: "reviewpurge",
    generatedAt: new Date().toISOString(),
    stats,
    thresholds,
    breached: alerts,
    trend7d: trend,
    sustainedBreach,
  };
  const payloadBody = JSON.stringify(payload);

  if (isDryRun) {
    await createActivityLog({
      actorEmail: "system",
      entityType: "system",
      action: "security_alert_skipped",
      reason: "dry_run",
      attemptCount: 0,
      message: `Security alert dry-run executed without webhook delivery (severity=${severity}).`,
    });
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: "dry_run",
      preview: payload,
    });
  }

  const headers: HeadersInit = {
    "content-type": "application/json",
    "x-security-alert-severity": severity,
  };
  const webhookToken = process.env.SECURITY_ALERT_WEBHOOK_TOKEN?.trim();
  if (webhookToken) headers["x-security-alert-token"] = webhookToken;
  const signingSecret = process.env.SECURITY_ALERT_WEBHOOK_SIGNING_SECRET?.trim();
  if (signingSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signWebhookPayload({
      secret: signingSecret,
      timestamp,
      body: payloadBody,
    });
    headers["x-security-alert-timestamp"] = timestamp;
    headers["x-security-alert-signature"] = `v1=${signature}`;
  }
  const maxAttempts = parsePositiveNumber(
    process.env.SECURITY_ALERT_WEBHOOK_MAX_ATTEMPTS,
    3,
  );
  const baseBackoffMs = parsePositiveNumber(
    process.env.SECURITY_ALERT_WEBHOOK_BACKOFF_MS,
    1000,
  );
  const timeoutMs = parsePositiveNumber(
    process.env.SECURITY_ALERT_WEBHOOK_TIMEOUT_MS,
    8000,
  );

  try {
    const delivery = await sendWebhookWithRetry({
      url: webhookTargetUrl,
      headers,
      body: payloadBody,
      maxAttempts,
      baseBackoffMs,
      timeoutMs,
    });

    if (!delivery.ok) {
      await createActivityLog({
        actorEmail: "system",
        entityType: "system",
        action: "security_alert_failed",
        reason:
          delivery.lastError === "non_2xx" ? "webhook_error" : "webhook_request_error",
        attemptCount: delivery.attempts,
        webhookStatusCode: delivery.lastStatus ?? null,
        webhookLatencyMs: delivery.latencyMs,
        message:
          delivery.lastStatus != null
            ? `Security alert webhook failed after ${delivery.attempts} attempt(s), status ${delivery.lastStatus}, severity=${severity}.`
            : `Security alert webhook failed after ${delivery.attempts} attempt(s), network error, severity=${severity}.`,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Webhook request failed",
          status: delivery.lastStatus ?? null,
          attempts: delivery.attempts,
        },
        { status: 502 },
      );
    }

    await createActivityLog({
      actorEmail: "system",
      entityType: "system",
      action: "security_alert_sent",
      reason: severityReason,
      attemptCount: delivery.attempts,
      webhookStatusCode: delivery.status,
      webhookLatencyMs: delivery.latencyMs,
      message: `Security alert sent for ${alerts.map((item) => item.key).join(", ")} in ${delivery.attempts} attempt(s), severity=${severity}.`,
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      severity,
      breached: alerts.map((item) => ({
        key: item.key,
        value: item.value,
        threshold: item.threshold,
      })),
    });
  } catch {
    await createActivityLog({
      actorEmail: "system",
      entityType: "system",
      action: "security_alert_failed",
      reason: "webhook_request_error",
      attemptCount: 1,
      message: "Security alert webhook request failed before response.",
    });
    return NextResponse.json(
      { ok: false, error: "Webhook request failed" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
