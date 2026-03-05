import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getActivityLogSecurityStats,
  getActivityLogSecurityTrend,
  getLatestSecurityAlertStatus,
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

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    entityType?: string;
    action?: string;
    reason?: string;
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
  const action = (params.action ?? "").trim();
  const reason = (params.reason ?? "").trim();
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
    action,
    reason,
    minAttemptCount: safeMinAttemptCount,
    minWebhookLatencyMs: safeMinWebhookLatencyMs,
    webhookStatusCode: safeWebhookStatusCode,
  });
  const stats = await getActivityLogSecurityStats();
  const trend = await getActivityLogSecurityTrend(7);
  const deliveryTrend = await getSecurityAlertDeliveryTrend(7);
  const alertStatus = await getLatestSecurityAlertStatus();
  const delivery = await getSecurityAlertDeliveryStats();
  const latency = await getSecurityAlertLatencyPercentiles();
  const thresholds = resolveSecurityAlertThresholds();
  const triggeredAlerts = evaluateSecurityAlerts(stats, thresholds);
  const cooldownMs = parsePositiveNumber(env.SECURITY_ALERT_COOLDOWN_MS, 1800000);
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
  const queryAction = action ? `&action=${encodeURIComponent(action)}` : "";
  const queryReason = reason ? `&reason=${encodeURIComponent(reason)}` : "";
  const queryMinAttemptCount =
    safeMinAttemptCount > 0 ? `&minAttemptCount=${safeMinAttemptCount}` : "";
  const queryMinWebhookLatencyMs =
    safeMinWebhookLatencyMs > 0 ? `&minWebhookLatencyMs=${safeMinWebhookLatencyMs}` : "";
  const queryWebhookStatusCode =
    safeWebhookStatusCode > 0 ? `&webhookStatusCode=${safeWebhookStatusCode}` : "";
  const baseQuery = `${queryQ}${queryEntity}`;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="hero-surface p-6 md:p-8">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10">
          <p className="section-kicker text-white/70">Observability</p>
          <h1 className="heading-display mt-2 text-3xl text-white">Activity Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Audit trail real-time untuk keamanan, webhook delivery, dan perilaku admin.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="panel grid gap-2 p-4 md:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Search by message/email" className="input md:col-span-2" />
        <select name="entityType" defaultValue={entityType} className="input">
          <option value="all">All entities</option>
          <option value="product">Product</option>
          <option value="article">Article</option>
          <option value="system">System</option>
        </select>
        <input name="action" defaultValue={action} placeholder="Action exact" className="input" />
        <input name="reason" defaultValue={reason} placeholder="Reason exact" className="input" />
        <input name="minAttemptCount" type="number" min={0} defaultValue={safeMinAttemptCount || ""} placeholder="Min attempts" className="input" />
        <input name="minWebhookLatencyMs" type="number" min={0} defaultValue={safeMinWebhookLatencyMs || ""} placeholder="Min latency ms" className="input" />
        <input name="webhookStatusCode" type="number" min={100} max={599} defaultValue={safeWebhookStatusCode || ""} placeholder="Status code" className="input" />
        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary btn-sm">Apply Filters</button>
          <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_sent`} className="badge badge-success py-1.5 px-3">Sent</Link>
          <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed`} className="badge badge-danger py-1.5 px-3">Failed</Link>
          <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_skipped`} className="badge badge-warn py-1.5 px-3">Skipped</Link>
          <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed&minAttemptCount=2`} className="badge badge-danger py-1.5 px-3">Failed 2+</Link>
          <Link href={`/admin/logs?page=1${queryQ}${queryEntity}&minWebhookLatencyMs=3000`} className="badge badge-accent py-1.5 px-3">Latency 3s+</Link>
        </div>
      </form>

      {/* Warning Banners */}
      {triggeredAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">⚠️ Security warning: threshold exceeded (24h)</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {triggeredAlerts.map((item) => (
              <li key={item.key}>
                {item.label}: {item.value} (threshold {item.threshold}){" "}
                <Link href={`/admin/logs?page=1${baseQuery}&action=${item.action}`} className="font-bold text-amber-900 underline">view</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isDeliveryFailureRateAlert && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900">🚨 Delivery warning: high webhook failure rate (24h)</p>
          <p className="mt-1 text-xs text-red-800">
            Failure rate {deliveryFailureRate24h.toFixed(1)}% (threshold {deliveryFailureRateThreshold}%); failed {delivery.failed24h} of {deliveryAttempted24h} attempts.
          </p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=security_alert_failed`} className="mt-2 inline-block text-xs font-bold text-red-900 underline">View failed</Link>
        </div>
      )}
      {isWebhookP95Alert && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">⏱️ p95 latency warning (24h)</p>
          <p className="mt-1 text-xs text-amber-800">
            p95 {Math.round(latency.p95_24h ?? 0)} ms (threshold {webhookP95ThresholdMs} ms); {deliveryAttempted24h} attempts.
          </p>
          <Link href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP95ThresholdMs}`} className="mt-2 inline-block text-xs font-bold text-amber-900 underline">View high-latency</Link>
        </div>
      )}
      {isWebhookP99Critical && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900">🔴 Critical: p99 latency very high (24h)</p>
          <p className="mt-1 text-xs text-red-800">
            p99 {Math.round(latency.p99_24h ?? 0)} ms (threshold {webhookP99ThresholdMs} ms); {deliveryAttempted24h} attempts.
          </p>
          <Link href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP99ThresholdMs}`} className="mt-2 inline-block text-xs font-bold text-red-900 underline">View critical</Link>
        </div>
      )}

      {/* Security Stats */}
      <div className="stagger-children grid gap-3 md:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Denied Actions</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.denied24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.denied7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_denied`} className="mt-2 inline-block text-xs font-semibold text-primary">View →</Link>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rate Limited</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.rateLimited24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.rateLimited7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_rate_limited`} className="mt-2 inline-block text-xs font-semibold text-primary">View →</Link>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blocked URLs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.blockedUrl24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.blockedUrl7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_blocked_url`} className="mt-2 inline-block text-xs font-semibold text-primary">View →</Link>
        </div>
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="font-bold text-slate-900">Security Trend (7 Days)</h2>
          {trend.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No trend data yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Day</th>
                    <th className="py-2 pr-4">Denied</th>
                    <th className="py-2 pr-4">Rate Limited</th>
                    <th className="py-2">Blocked URL</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((item) => (
                    <tr key={item.day} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium">{item.day}</td>
                      <td className="py-2 pr-4">{item.denied}</td>
                      <td className="py-2 pr-4">{item.rateLimited}</td>
                      <td className="py-2">{item.blockedUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="panel p-4">
          <h2 className="font-bold text-slate-900">Webhook Delivery Trend (7 Days)</h2>
          {deliveryTrend.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No delivery trend data yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Day</th>
                    <th className="py-2 pr-4">Sent</th>
                    <th className="py-2 pr-4">Failed</th>
                    <th className="py-2">Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryTrend.map((item) => (
                    <tr key={item.day} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium">{item.day}</td>
                      <td className="py-2 pr-4">{item.sent}</td>
                      <td className="py-2 pr-4">{item.failed}</td>
                      <td className="py-2">{item.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Stats */}
      <div className="stagger-children grid gap-3 md:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Webhook Sent</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{delivery.sent24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.sent7d}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Webhook Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{delivery.failed24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.failed7d}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Webhook Skipped</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{delivery.skipped24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.skipped7d}</p>
        </div>
      </div>

      {/* Alert Status & Latency */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="font-bold text-slate-900">Webhook Alert Status</h2>
          {alertStatus.lastOutcome ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className={`badge text-[10px] ${alertStatus.lastOutcome.action === "security_alert_sent" ? "badge-success"
                    : alertStatus.lastOutcome.action === "security_alert_skipped" ? "badge-warn"
                      : "badge-danger"
                  }`}>{alertStatus.lastOutcome.action}</span>
              </div>
              <p className="text-xs text-slate-500">{alertStatus.lastOutcome.message}</p>
              <p className="text-xs text-slate-500">{new Date(alertStatus.lastOutcome.createdAt).toLocaleString()}</p>
              {(typeof alertStatus.lastOutcome.attemptCount === "number" ||
                typeof alertStatus.lastOutcome.webhookStatusCode === "number" ||
                typeof alertStatus.lastOutcome.webhookLatencyMs === "number") && (
                  <p className="font-mono text-xs text-slate-500">
                    {typeof alertStatus.lastOutcome.attemptCount === "number" ? `attempts=${alertStatus.lastOutcome.attemptCount} ` : ""}
                    {typeof alertStatus.lastOutcome.webhookStatusCode === "number" ? `status=${alertStatus.lastOutcome.webhookStatusCode} ` : ""}
                    {typeof alertStatus.lastOutcome.webhookLatencyMs === "number" ? `latency=${alertStatus.lastOutcome.webhookLatencyMs}ms` : ""}
                  </p>
                )}
              <p className="text-xs text-slate-500">
                Cooldown: {Math.ceil(cooldownMs / 60000)} min(s)
              </p>
              <p className="text-xs text-slate-500">
                {alertStatus.lastOutcome.action === "security_alert_sent"
                  ? "Last send succeeded; subsequent sends may be skipped during cooldown."
                  : alertStatus.lastOutcome.action === "security_alert_skipped"
                    ? "Last run skipped (no breach or cooldown active)."
                    : "Last send failed; next run will retry when breach remains."}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No webhook alert events yet.</p>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="font-bold text-slate-900">Webhook Latency Percentiles</h2>
          <p className="mt-1 text-xs text-slate-500">
            Health:{" "}
            <span className={`font-semibold ${isWebhookP99Critical ? "text-red-700" : isWebhookP95Alert ? "text-amber-700" : "text-emerald-700"}`}>
              {isWebhookP99Critical ? "critical (p99 breach)" : isWebhookP95Alert ? "warn (p95 breach)" : "normal"}
            </span>
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">24h</p>
              <p className="mt-1 font-mono text-sm text-slate-700">p50: {formatMs(latency.p50_24h)}</p>
              <p className="font-mono text-sm text-slate-700">p95: {formatMs(latency.p95_24h)}</p>
              <p className="font-mono text-sm text-slate-700">p99: {formatMs(latency.p99_24h)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">7d</p>
              <p className="mt-1 font-mono text-sm text-slate-700">p50: {formatMs(latency.p50_7d)}</p>
              <p className="font-mono text-sm text-slate-700">p95: {formatMs(latency.p95_7d)}</p>
              <p className="font-mono text-sm text-slate-700">p99: {formatMs(latency.p99_7d)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Log Stream */}
      <div className="panel space-y-2 p-4">
        <h2 className="font-bold text-slate-900">Log Stream</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No logs found.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
                <div className="flex flex-wrap items-start gap-2">
                  <span className={`badge text-[10px] ${log.action.includes("sent") ? "badge-success"
                      : log.action.includes("failed") || log.action.includes("denied") || log.action.includes("blocked") ? "badge-danger"
                        : log.action.includes("limited") || log.action.includes("skipped") ? "badge-warn"
                          : "badge-neutral"
                    }`}>{log.action}</span>
                  <span className="badge badge-neutral text-[10px]">{log.entityType}{log.entityId ? `#${log.entityId}` : ""}</span>
                  <span className="text-slate-700">{log.message}</span>
                </div>
                {(log.reason || log.permission || log.returnTo || log.retryAfterMs ||
                  typeof log.attemptCount === "number" || typeof log.webhookStatusCode === "number" ||
                  typeof log.webhookLatencyMs === "number") && (
                    <p className="mt-1 font-mono text-[11px] text-slate-500">
                      {log.reason ? `reason=${log.reason} ` : ""}
                      {log.permission ? `permission=${log.permission} ` : ""}
                      {log.returnTo ? `returnTo=${log.returnTo} ` : ""}
                      {typeof log.retryAfterMs === "number" ? `retryAfterMs=${log.retryAfterMs} ` : ""}
                      {typeof log.attemptCount === "number" ? `attempts=${log.attemptCount} ` : ""}
                      {typeof log.webhookStatusCode === "number" ? `status=${log.webhookStatusCode} ` : ""}
                      {typeof log.webhookLatencyMs === "number" ? `latency=${log.webhookLatencyMs}ms` : ""}
                    </p>
                  )}
                <p className="mt-1 text-xs text-slate-500">
                  {log.actorEmail ?? "unknown"} • {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>Page {safePage} of {pageCount} ({total} items)</p>
        <div className="flex items-center gap-2">
          <Link href={`/admin/logs?page=${prevPage}${queryQ}${queryEntity}${queryAction}${queryReason}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`} className="btn btn-ghost btn-sm">Prev</Link>
          <Link href={`/admin/logs?page=${nextPage}${queryQ}${queryEntity}${queryAction}${queryReason}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`} className="btn btn-ghost btn-sm">Next</Link>
        </div>
      </div>
    </section>
  );
}
