import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getActivityLogSecurityStats,
  getActivityLogSecurityTrend,
  getLatestSecurityAlertStatus,
  getSecurityAlertSeveritySummary,
  getSecurityAlertSeverityTrend,
  getSecurityAlertDeliveryStats,
  getSecurityAlertDeliveryTrend,
  getSecurityAlertLatencyPercentiles,
  listActivityLogsPaginated,
} from "@/lib/db/queries/activity-logs";
import { env } from "@/lib/env";
import {
  evaluateSecurityAlerts,
  resolveSecurityAlertThresholds,
} from "@/lib/security/alerts";
import { canAccessAdminPath } from "@/lib/security/access";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { AdminNav } from "@/components/admin-nav";

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    reason?: string;
    permission?: string;
    selectionMode?: string;
    minAttemptCount?: string;
    minWebhookLatencyMs?: string;
    webhookStatusCode?: string;
  }>;
};

const PAGE_SIZE = 20;

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMs(value: number | null) {
  if (value == null) return "-";
  return `${Math.round(value)} ms`;
}

function formatMinutes(valueMs: number) {
  return `${Math.ceil(valueMs / 60000)} min`;
}

function resolveCooldownState(lastSentAt: Date | null, cooldownMs: number) {
  if (!lastSentAt) {
    return {
      active: false,
      retryAfterMs: 0,
      lastSentAtLabel: "Never",
    };
  }
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed < cooldownMs) {
    return {
      active: true,
      retryAfterMs: cooldownMs - elapsed,
      lastSentAtLabel: new Date(lastSentAt).toLocaleString(),
    };
  }
  return {
    active: false,
    retryAfterMs: 0,
    lastSentAtLabel: new Date(lastSentAt).toLocaleString(),
  };
}

export default async function AdminLogsPage({ searchParams }: Props) {
  try {
    const { role } = await getCurrentAdminIdentity();
    if (!canAccessAdminPath(role, "/admin/logs")) {
      redirect("/admin/forbidden");
    }
  } catch {
    redirect("/admin/forbidden");
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Number(params.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const entityType =
    params.entityType === "product" ||
      params.entityType === "article" ||
      params.entityType === "system"
      ? params.entityType
      : "all";
  const entityId = Number(params.entityId ?? "0");
  const safeEntityId =
    Number.isFinite(entityId) && entityId > 0 ? Math.trunc(entityId) : 0;
  const action = (params.action ?? "").trim();
  const reason = (params.reason ?? "").trim();
  const permission = (params.permission ?? "").trim();
  const selectionMode = (params.selectionMode ?? "").trim();
  const minAttemptCount = Number(params.minAttemptCount ?? "0");
  const minWebhookLatencyMs = Number(params.minWebhookLatencyMs ?? "0");
  const webhookStatusCode = Number(params.webhookStatusCode ?? "0");
  const safeMinAttemptCount =
    Number.isFinite(minAttemptCount) && minAttemptCount > 0 ? Math.trunc(minAttemptCount) : 0;
  const safeMinWebhookLatencyMs =
    Number.isFinite(minWebhookLatencyMs) && minWebhookLatencyMs > 0
      ? Math.trunc(minWebhookLatencyMs)
      : 0;
  const safeWebhookStatusCode =
    Number.isFinite(webhookStatusCode) && webhookStatusCode > 0
      ? Math.trunc(webhookStatusCode)
      : 0;

  const { items, total } = await listActivityLogsPaginated({
    page: safePage,
    pageSize: PAGE_SIZE,
    q,
    entityType,
    entityId: safeEntityId,
    action,
    reason,
    permission,
    returnTo: selectionMode,
    minAttemptCount: safeMinAttemptCount,
    minWebhookLatencyMs: safeMinWebhookLatencyMs,
    webhookStatusCode: safeWebhookStatusCode,
  });
  const stats = await getActivityLogSecurityStats();
  const trend = await getActivityLogSecurityTrend(7);
  const deliveryTrend = await getSecurityAlertDeliveryTrend(7);
  const severityTrend = await getSecurityAlertSeverityTrend(7);
  const alertStatus = await getLatestSecurityAlertStatus();
  const severitySummary = await getSecurityAlertSeveritySummary();
  const delivery = await getSecurityAlertDeliveryStats();
  const latency = await getSecurityAlertLatencyPercentiles();
  const thresholds = resolveSecurityAlertThresholds();
  const triggeredAlerts = evaluateSecurityAlerts(stats, thresholds);
  const cooldownMs = parsePositiveNumber(env.SECURITY_ALERT_COOLDOWN_MS, 1800000);
  const warnCooldownMs = parsePositiveNumber(env.SECURITY_ALERT_COOLDOWN_MS_WARN, cooldownMs);
  const criticalCooldownMs = parsePositiveNumber(
    env.SECURITY_ALERT_COOLDOWN_MS_CRITICAL,
    cooldownMs,
  );
  const warnCooldown = resolveCooldownState(
    severitySummary.lastWarnSentAt,
    warnCooldownMs,
  );
  const criticalCooldown = resolveCooldownState(
    severitySummary.lastCriticalSentAt,
    criticalCooldownMs,
  );
  const deliveryAttempted24h = delivery.sent24h + delivery.failed24h;
  const deliveryFailureRate24h =
    deliveryAttempted24h > 0 ? (delivery.failed24h / deliveryAttempted24h) * 100 : 0;
  const deliveryFailureRateThreshold = parsePositiveNumber(
    env.LOG_ALERT_WEBHOOK_FAILURE_RATE_24H_THRESHOLD,
    30,
  );
  const deliveryFailureRateMinAttempts = parsePositiveNumber(
    env.LOG_ALERT_WEBHOOK_FAILURE_RATE_MIN_ATTEMPTS_24H,
    5,
  );
  const isDeliveryFailureRateAlert =
    deliveryAttempted24h >= deliveryFailureRateMinAttempts &&
    deliveryFailureRate24h >= deliveryFailureRateThreshold;
  const webhookP95ThresholdMs = parsePositiveNumber(
    env.LOG_ALERT_WEBHOOK_P95_24H_THRESHOLD_MS,
    3000,
  );
  const webhookP95MinAttempts = parsePositiveNumber(env.LOG_ALERT_WEBHOOK_P95_MIN_ATTEMPTS_24H, 5);
  const isWebhookP95Alert =
    deliveryAttempted24h >= webhookP95MinAttempts &&
    typeof latency.p95_24h === "number" &&
    latency.p95_24h >= webhookP95ThresholdMs;
  const webhookP99ThresholdMs = parsePositiveNumber(
    env.LOG_ALERT_WEBHOOK_P99_24H_THRESHOLD_MS,
    6000,
  );
  const webhookP99MinAttempts = parsePositiveNumber(env.LOG_ALERT_WEBHOOK_P99_MIN_ATTEMPTS_24H, 5);
  const isWebhookP99Critical =
    deliveryAttempted24h >= webhookP99MinAttempts &&
    typeof latency.p99_24h === "number" &&
    latency.p99_24h >= webhookP99ThresholdMs;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const prevPage = Math.max(1, safePage - 1);
  const nextPage = Math.min(pageCount, safePage + 1);
  const queryQ = q ? `&q=${encodeURIComponent(q)}` : "";
  const queryEntity =
    entityType !== "all" ? `&entityType=${encodeURIComponent(entityType)}` : "";
  const queryEntityId = safeEntityId > 0 ? `&entityId=${safeEntityId}` : "";
  const queryAction = action ? `&action=${encodeURIComponent(action)}` : "";
  const queryReason = reason ? `&reason=${encodeURIComponent(reason)}` : "";
  const queryPermission = permission
    ? `&permission=${encodeURIComponent(permission)}`
    : "";
  const querySelectionMode = selectionMode
    ? `&selectionMode=${encodeURIComponent(selectionMode)}`
    : "";
  const queryMinAttemptCount =
    safeMinAttemptCount > 0 ? `&minAttemptCount=${safeMinAttemptCount}` : "";
  const queryMinWebhookLatencyMs =
    safeMinWebhookLatencyMs > 0 ? `&minWebhookLatencyMs=${safeMinWebhookLatencyMs}` : "";
  const queryWebhookStatusCode =
    safeWebhookStatusCode > 0 ? `&webhookStatusCode=${safeWebhookStatusCode}` : "";
  const baseQuery = `${queryQ}${queryEntity}${queryEntityId}${queryPermission}${querySelectionMode}`;
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (entityType !== "all") exportParams.set("entityType", entityType);
  if (safeEntityId > 0) exportParams.set("entityId", String(safeEntityId));
  if (action) exportParams.set("action", action);
  if (reason) exportParams.set("reason", reason);
  if (permission) exportParams.set("permission", permission);
  if (selectionMode) exportParams.set("selectionMode", selectionMode);
  if (safeMinAttemptCount > 0) {
    exportParams.set("minAttemptCount", String(safeMinAttemptCount));
  }
  if (safeMinWebhookLatencyMs > 0) {
    exportParams.set("minWebhookLatencyMs", String(safeMinWebhookLatencyMs));
  }
  if (safeWebhookStatusCode > 0) {
    exportParams.set("webhookStatusCode", String(safeWebhookStatusCode));
  }
  const exportQuery = exportParams.toString();
  const exportHref = exportQuery
    ? `/api/admin/logs/export?${exportQuery}`
    : "/api/admin/logs/export";

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <AdminNav currentPath="/admin/logs" />
        
        <div className="admin-content space-y-6">
          {/* Header */}
          <div className="admin-header">
            <div className="admin-header-icon"></div>
            <div className="relative z-10">
              <p className="section-kicker">Observability</p>
              <h1 className="heading-display mt-2">Activity Logs</h1>
              <p className="mt-2 max-w-2xl">
                Audit trail real-time untuk keamanan, webhook delivery, dan perilaku admin.
              </p>
            </div>
          </div>

          {/* Alert Banners */}
          {triggeredAlerts.length > 0 && (
            <div className="admin-banner admin-banner-warning">
              <span className="admin-banner-icon"></span>
              <div>
                <p className="font-bold">Security Warning: Threshold Exceeded (24h)</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {triggeredAlerts.map((item) => (
                    <li key={item.key}>
                      {item.label}: {item.value} (threshold {item.threshold}){" "}
                      <Link href={`/admin/logs?page=1${baseQuery}&action=${item.action}`} className="font-bold underline">view</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {isDeliveryFailureRateAlert && (
            <div className="admin-banner admin-banner-danger">
              <span className="admin-banner-icon"></span>
              <div>
                <p className="font-bold">Delivery Warning: High Webhook Failure Rate (24h)</p>
                <p className="mt-1 text-xs">
                  Failure rate {deliveryFailureRate24h.toFixed(1)}% (threshold {deliveryFailureRateThreshold}%); failed {delivery.failed24h} of {deliveryAttempted24h} attempts.
                </p>
                <Link href={`/admin/logs?page=1${baseQuery}&action=security_alert_failed`} className="mt-2 inline-block text-xs font-bold underline">View failed </Link>
              </div>
            </div>
          )}
          {isWebhookP95Alert && (
            <div className="admin-banner admin-banner-warning">
              <span className="admin-banner-icon"></span>
              <div>
                <p className="font-bold">P95 Latency Warning (24h)</p>
                <p className="mt-1 text-xs">
                  P95 {Math.round(latency.p95_24h ?? 0)} ms (threshold {webhookP95ThresholdMs} ms); {deliveryAttempted24h} attempts.
                </p>
                <Link href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP95ThresholdMs}`} className="mt-2 inline-block text-xs font-bold underline">View high-latency </Link>
              </div>
            </div>
          )}
          {isWebhookP99Critical && (
            <div className="admin-banner admin-banner-danger">
              <span className="admin-banner-icon"></span>
              <div>
                <p className="font-bold">Critical: P99 Latency Very High (24h)</p>
                <p className="mt-1 text-xs">
                  P99 {Math.round(latency.p99_24h ?? 0)} ms (threshold {webhookP99ThresholdMs} ms); {deliveryAttempted24h} attempts.
                </p>
                <Link href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP99ThresholdMs}`} className="mt-2 inline-block text-xs font-bold underline">View critical </Link>
              </div>
            </div>
          )}

          {/* Security Stats */}
          <div className="admin-stats stagger-children">
            <div className="admin-stat-card stat-danger">
              <span className="stat-icon"></span>
              <p className="stat-label">Denied Actions</p>
              <p className="stat-value">{stats.denied24h}</p>
              <p className="stat-meta">24h | 7d: {stats.denied7d}</p>
              <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_denied`} className="stat-link">View </Link>
            </div>
            <div className="admin-stat-card stat-warning">
              <span className="stat-icon"></span>
              <p className="stat-label">Rate Limited</p>
              <p className="stat-value">{stats.rateLimited24h}</p>
              <p className="stat-meta">24h | 7d: {stats.rateLimited7d}</p>
              <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_rate_limited`} className="stat-link">View </Link>
            </div>
            <div className="admin-stat-card stat-info">
              <span className="stat-icon"></span>
              <p className="stat-label">Blocked URLs</p>
              <p className="stat-value">{stats.blockedUrl24h}</p>
              <p className="stat-meta">24h | 7d: {stats.blockedUrl7d}</p>
              <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_blocked_url`} className="stat-link">View </Link>
            </div>
          </div>

          {/* Delivery Stats */}
          <div className="admin-stats stagger-children">
            <div className="admin-stat-card stat-success">
              <span className="stat-icon"></span>
              <p className="stat-label">Webhook Sent</p>
              <p className="stat-value">{delivery.sent24h}</p>
              <p className="stat-meta">24h | 7d: {delivery.sent7d}</p>
            </div>
            <div className="admin-stat-card stat-danger">
              <span className="stat-icon"></span>
              <p className="stat-label">Webhook Failed</p>
              <p className="stat-value">{delivery.failed24h}</p>
              <p className="stat-meta">24h | 7d: {delivery.failed7d}</p>
            </div>
            <div className="admin-stat-card stat-warning">
              <span className="stat-icon"></span>
              <p className="stat-label">Webhook Skipped</p>
              <p className="stat-value">{delivery.skipped24h}</p>
              <p className="stat-meta">24h | 7d: {delivery.skipped7d}</p>
            </div>
          </div>

          {/* Trends */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h2><span className="icon"></span> Security Trend (7 Days)</h2>
              </div>
              <div className="admin-panel-body">
                {trend.length === 0 ? (
                  <div className="admin-empty">
                    <span className="admin-empty-icon"></span>
                    <p className="admin-empty-title">No trend data yet</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Denied</th>
                          <th>Rate Limited</th>
                          <th>Blocked URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.map((item) => (
                          <tr key={item.day}>
                            <td className="font-medium">{item.day}</td>
                            <td>{item.denied}</td>
                            <td>{item.rateLimited}</td>
                            <td>{item.blockedUrl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h2><span className="icon"></span> Alert Severity Trend (7 Days)</h2>
              </div>
              <div className="admin-panel-body">
                {severityTrend.length === 0 ? (
                  <div className="admin-empty">
                    <span className="admin-empty-icon"></span>
                    <p className="admin-empty-title">No severity trend data yet</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Warn Sent</th>
                          <th>Critical Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {severityTrend.map((item) => (
                          <tr key={item.day}>
                            <td className="font-medium">{item.day}</td>
                            <td>{item.warnSent}</td>
                            <td>{item.criticalSent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h2><span className="icon"></span> Webhook Delivery Trend (7 Days)</h2>
              </div>
              <div className="admin-panel-body">
                {deliveryTrend.length === 0 ? (
                  <div className="admin-empty">
                    <span className="admin-empty-icon"></span>
                    <p className="admin-empty-title">No delivery trend data yet</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Sent</th>
                          <th>Failed</th>
                          <th>Skipped</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryTrend.map((item) => (
                          <tr key={item.day}>
                            <td className="font-medium">{item.day}</td>
                            <td>{item.sent}</td>
                            <td>{item.failed}</td>
                            <td>{item.skipped}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alert Status & Latency */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h2><span className="icon"></span> Webhook Alert Status</h2>
              </div>
              <div className="admin-panel-body">
                {alertStatus.lastOutcome ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`admin-badge ${
                        alertStatus.lastOutcome.action === "security_alert_sent" ? "admin-badge-success" :
                        alertStatus.lastOutcome.action === "security_alert_skipped" ? "admin-badge-warning" :
                        "admin-badge-danger"
                      }`}>{alertStatus.lastOutcome.action}</span>
                    </div>
                    <p className="text-sm text-[var(--admin-text-muted)]">{alertStatus.lastOutcome.message}</p>
                    <p className="text-xs text-[var(--admin-text-dim)]">{new Date(alertStatus.lastOutcome.createdAt).toLocaleString()}</p>
                    {(typeof alertStatus.lastOutcome.attemptCount === "number" ||
                      typeof alertStatus.lastOutcome.webhookStatusCode === "number" ||
                      typeof alertStatus.lastOutcome.webhookLatencyMs === "number") && (
                      <p className="admin-code">
                        {typeof alertStatus.lastOutcome.attemptCount === "number" ? `attempts=${alertStatus.lastOutcome.attemptCount} ` : ""}
                        {typeof alertStatus.lastOutcome.webhookStatusCode === "number" ? `status=${alertStatus.lastOutcome.webhookStatusCode} ` : ""}
                        {typeof alertStatus.lastOutcome.webhookLatencyMs === "number" ? `latency=${alertStatus.lastOutcome.webhookLatencyMs}ms` : ""}
                      </p>
                    )}
                    <p className="text-xs text-[var(--admin-text-dim)]">
                      Default Cooldown: {formatMinutes(cooldownMs)}
                    </p>
                    <p className="text-xs text-[var(--admin-text-dim)]">
                      {alertStatus.lastOutcome.action === "security_alert_sent"
                        ? "Last send succeeded; subsequent sends may be skipped during cooldown."
                        : alertStatus.lastOutcome.action === "security_alert_skipped"
                          ? "Last run skipped (no breach or cooldown active)."
                          : "Last send failed; next run will retry when breach remains."}
                    </p>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <span className="admin-empty-icon"></span>
                    <p className="admin-empty-title">No webhook alert events yet</p>
                  </div>
                )}
                <div className="mt-4 border-t border-[var(--admin-border-subtle)] pt-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--admin-text-dim)]">
                    Severity Cooldown
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg)] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--admin-text)]">
                          Warn Severity
                        </p>
                        <span className={`admin-badge ${warnCooldown.active ? "admin-badge-warning" : "admin-badge-success"}`}>
                          {warnCooldown.active ? "Cooldown Active" : "Ready"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                        Sent 24h/7d: {severitySummary.warnSent24h} / {severitySummary.warnSent7d}
                      </p>
                      <p className="text-xs text-[var(--admin-text-dim)]">
                        Last: {warnCooldown.lastSentAtLabel}
                      </p>
                      <p className="text-xs text-[var(--admin-text-dim)]">
                        Cooldown: {formatMinutes(warnCooldownMs)}{" "}
                        {warnCooldown.active
                          ? `(retry in ${formatMinutes(warnCooldown.retryAfterMs)})`
                          : "(ready now)"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg)] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--admin-text)]">
                          Critical Severity
                        </p>
                        <span className={`admin-badge ${criticalCooldown.active ? "admin-badge-danger" : "admin-badge-success"}`}>
                          {criticalCooldown.active ? "Cooldown Active" : "Ready"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                        Sent 24h/7d: {severitySummary.criticalSent24h} / {severitySummary.criticalSent7d}
                      </p>
                      <p className="text-xs text-[var(--admin-text-dim)]">
                        Last: {criticalCooldown.lastSentAtLabel}
                      </p>
                      <p className="text-xs text-[var(--admin-text-dim)]">
                        Cooldown: {formatMinutes(criticalCooldownMs)}{" "}
                        {criticalCooldown.active
                          ? `(retry in ${formatMinutes(criticalCooldown.retryAfterMs)})`
                          : "(ready now)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-header">
                <h2><span className="icon"></span> Webhook Latency Percentiles</h2>
              </div>
              <div className="admin-panel-body">
                <p className="text-xs text-[var(--admin-text-muted)] mb-4">
                  Health:{" "}
                  <span className={`font-semibold ${
                    isWebhookP99Critical ? "text-red-400" :
                    isWebhookP95Alert ? "text-amber-400" :
                    "text-emerald-400"
                  }`}>
                    {isWebhookP99Critical ? "Critical (P99 breach)" : isWebhookP95Alert ? "Warning (P95 breach)" : "Normal"}
                  </span>
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border-subtle)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-dim)] mb-3">24h</p>
                    <div className="space-y-1 font-mono text-sm">
                      <p className="text-[var(--admin-text-muted)]">p50: <span className="text-[var(--admin-text)]">{formatMs(latency.p50_24h)}</span></p>
                      <p className="text-[var(--admin-text-muted)]">p95: <span className="text-[var(--admin-text)]">{formatMs(latency.p95_24h)}</span></p>
                      <p className="text-[var(--admin-text-muted)]">p99: <span className="text-[var(--admin-text)]">{formatMs(latency.p99_24h)}</span></p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border-subtle)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-dim)] mb-3">7d</p>
                    <div className="space-y-1 font-mono text-sm">
                      <p className="text-[var(--admin-text-muted)]">p50: <span className="text-[var(--admin-text)]">{formatMs(latency.p50_7d)}</span></p>
                      <p className="text-[var(--admin-text-muted)]">p95: <span className="text-[var(--admin-text)]">{formatMs(latency.p95_7d)}</span></p>
                      <p className="text-[var(--admin-text-muted)]">p99: <span className="text-[var(--admin-text)]">{formatMs(latency.p99_7d)}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon"></span> Log Filters</h2>
              <Link href={exportHref} className="admin-btn admin-btn-ghost admin-btn-sm">
                Export CSV
              </Link>
            </div>
            <div className="admin-filter-bar">
              <form method="get" className="flex flex-wrap gap-3 flex-1">
                <input name="q" defaultValue={q} placeholder="Search message/email..." className="admin-input flex-1 min-w-[200px]" />
                <select name="entityType" defaultValue={entityType} className="admin-input admin-select">
                  <option value="all">All entities</option>
                  <option value="product">Product</option>
                  <option value="article">Article</option>
                  <option value="system">System</option>
                </select>
                <input
                  name="entityId"
                  type="number"
                  min={1}
                  defaultValue={safeEntityId || ""}
                  placeholder="Entity ID"
                  className="admin-input w-28"
                />
                <input name="action" defaultValue={action} placeholder="Action exact" className="admin-input w-36" />
                <input name="reason" defaultValue={reason} placeholder="Reason exact" className="admin-input w-36" />
                <input
                  name="permission"
                  defaultValue={permission}
                  placeholder="Permission exact"
                  className="admin-input w-40"
                />
                <input
                  name="selectionMode"
                  defaultValue={selectionMode}
                  placeholder="Selection mode"
                  className="admin-input w-36"
                />
                <input name="minAttemptCount" type="number" min={0} defaultValue={safeMinAttemptCount || ""} placeholder="Min attempts" className="admin-input w-28" />
                <input name="minWebhookLatencyMs" type="number" min={0} defaultValue={safeMinWebhookLatencyMs || ""} placeholder="Min latency ms" className="admin-input w-28" />
                <input name="webhookStatusCode" type="number" min={100} max={599} defaultValue={safeWebhookStatusCode || ""} placeholder="Status code" className="admin-input w-28" />
                <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm"> Apply</button>
              </form>
            </div>
            <div className="px-6 pb-4">
              <div className="admin-quick-filters">
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_sent`} className="admin-quick-filter"> Sent</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_sent&reason=threshold_breach_warn`} className="admin-quick-filter"> Sent Warn</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_sent&reason=threshold_breach_critical`} className="admin-quick-filter"> Sent Critical</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed`} className="admin-quick-filter"> Failed</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_skipped`} className="admin-quick-filter"> Skipped</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed&minAttemptCount=2`} className="admin-quick-filter"> Failed 2+</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&minWebhookLatencyMs=3000`} className="admin-quick-filter"> Latency 3s+</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_redirect`} className="admin-quick-filter"> Redirect</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_redirect&selectionMode=rotated`} className="admin-quick-filter"> Redirect Rotated</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_rotation_rebalance_recommended`} className="admin-quick-filter"> Rebalance Recommendation</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_rotation_guard_cron`} className="admin-quick-filter"> Rotation Guard Cron</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=experiment_event`} className="admin-quick-filter"> Experiment</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=experiment_event&reason=control`} className="admin-quick-filter"> Exp Control</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=experiment_event&reason=verified`} className="admin-quick-filter"> Exp Verified</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_link_health_cron`} className="admin-quick-filter"> Link Health Cron</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_link_unhealthy`} className="admin-quick-filter"> Link Unhealthy</Link>
                <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=affiliate_link_recovered`} className="admin-quick-filter"> Link Recovered</Link>
              </div>
            </div>
          </div>

          {/* Log Stream */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon"></span> Log Stream</h2>
              <span className="text-xs text-[var(--admin-text-dim)]">{total} entries</span>
            </div>
            <div className="admin-panel-body">
              {items.length === 0 ? (
                <div className="admin-empty">
                  <span className="admin-empty-icon"></span>
                  <p className="admin-empty-title">No logs found</p>
                  <p className="admin-empty-description">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="admin-list">
                  {items.map((log) => (
                    <div key={log.id} className="admin-log-entry">
                      <div className="admin-log-entry-header">
                        <span className={`admin-badge ${
                          log.action.includes("sent") ? "admin-badge-success" :
                          log.action.includes("failed") || log.action.includes("denied") || log.action.includes("blocked") ? "admin-badge-danger" :
                          log.action.includes("limited") || log.action.includes("skipped") ? "admin-badge-warning" :
                          "admin-badge-neutral"
                        }`}>{log.action}</span>
                        <span className="admin-badge admin-badge-neutral">{log.entityType}{log.entityId ? `#${log.entityId}` : ""}</span>
                        <span className="admin-log-entry-message">{log.message}</span>
                      </div>
                      {(log.reason || log.permission || log.returnTo || log.retryAfterMs ||
                        typeof log.attemptCount === "number" || typeof log.webhookStatusCode === "number" ||
                        typeof log.webhookLatencyMs === "number") && (
                        <p className="admin-log-entry-meta">
                          {log.reason ? `reason=${log.reason} ` : ""}
                          {log.permission ? `permission=${log.permission} ` : ""}
                          {log.returnTo ? `returnTo=${log.returnTo} ` : ""}
                          {typeof log.retryAfterMs === "number" ? `retryAfterMs=${log.retryAfterMs} ` : ""}
                          {typeof log.attemptCount === "number" ? `attempts=${log.attemptCount} ` : ""}
                          {typeof log.webhookStatusCode === "number" ? `status=${log.webhookStatusCode} ` : ""}
                          {typeof log.webhookLatencyMs === "number" ? `latency=${log.webhookLatencyMs}ms` : ""}
                        </p>
                      )}
                      <div className="admin-log-entry-footer">
                        <span>{log.actorEmail ?? "system"}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>Page {safePage} of {pageCount} ({total} items)</span>
            <div className="admin-pagination-controls">
              <Link href={`/admin/logs?page=${prevPage}${queryQ}${queryEntity}${queryEntityId}${queryAction}${queryReason}${queryPermission}${querySelectionMode}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`} className="admin-btn admin-btn-ghost admin-btn-sm"> Prev</Link>
              <Link href={`/admin/logs?page=${nextPage}${queryQ}${queryEntity}${queryEntityId}${queryAction}${queryReason}${queryPermission}${querySelectionMode}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`} className="admin-btn admin-btn-ghost admin-btn-sm">Next </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

