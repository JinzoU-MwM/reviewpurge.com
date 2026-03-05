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
const inputClass =
  "rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

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
      <div className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/95 to-primary/90 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Observability</p>
          <h1 className="heading-display mt-2 text-3xl">Activity Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Audit trail real-time untuk keamanan, webhook delivery, dan perilaku admin.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/admin" className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
              Products
            </Link>
            <Link
              href="/admin/articles"
              className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5"
            >
              Articles
            </Link>
            <Link href="/admin/users" className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
              Users
            </Link>
          </div>
        </div>
      </div>

      <form method="get" className="panel grid gap-2 p-4 md:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by message/email"
          className={`${inputClass} md:col-span-2`}
        />
        <select name="entityType" defaultValue={entityType} className={inputClass}>
          <option value="all">All entities</option>
          <option value="product">Product</option>
          <option value="article">Article</option>
          <option value="system">System</option>
        </select>
        <input name="action" defaultValue={action} placeholder="Action exact" className={inputClass} />
        <input name="reason" defaultValue={reason} placeholder="Reason exact" className={inputClass} />
        <input
          name="minAttemptCount"
          type="number"
          min={0}
          defaultValue={safeMinAttemptCount || ""}
          placeholder="Min attempts"
          className={inputClass}
        />
        <input
          name="minWebhookLatencyMs"
          type="number"
          min={0}
          defaultValue={safeMinWebhookLatencyMs || ""}
          placeholder="Min latency ms"
          className={inputClass}
        />
        <input
          name="webhookStatusCode"
          type="number"
          min={100}
          max={599}
          defaultValue={safeWebhookStatusCode || ""}
          placeholder="Status code"
          className={inputClass}
        />
        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Apply Filters
          </button>
          <Link
            href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_sent`}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
          >
            Sent
          </Link>
          <Link
            href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed`}
            className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            Failed
          </Link>
          <Link
            href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_skipped`}
            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            Skipped
          </Link>
          <Link
            href={`/admin/logs?page=1${queryQ}${queryEntity}&action=security_alert_failed&minAttemptCount=2`}
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800"
          >
            Failed 2+ attempts
          </Link>
          <Link
            href={`/admin/logs?page=1${queryQ}${queryEntity}&minWebhookLatencyMs=3000`}
            className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-800"
          >
            Latency 3000ms+
          </Link>
        </div>
      </form>

      {triggeredAlerts.length > 0 && (
        <div className="panel border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Security warning: threshold exceeded in last 24h
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {triggeredAlerts.map((item) => (
              <li key={item.key}>
                {item.label}: {item.value} (threshold {item.threshold}){" "}
                <Link
                  href={`/admin/logs?page=1${baseQuery}&action=${item.action}`}
                  className="font-medium text-amber-900 underline"
                >
                  view
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isDeliveryFailureRateAlert && (
        <div className="panel border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">
            Delivery warning: webhook failure rate is high in last 24h
          </p>
          <p className="mt-1 text-xs text-red-800">
            Failure rate {deliveryFailureRate24h.toFixed(1)}% (threshold {deliveryFailureRateThreshold}%);
            failed {delivery.failed24h} of {deliveryAttempted24h} attempts.
          </p>
          <Link
            href={`/admin/logs?page=1${baseQuery}&action=security_alert_failed`}
            className="mt-2 inline-block text-xs font-medium text-red-900 underline"
          >
            View failed deliveries
          </Link>
        </div>
      )}
      {isWebhookP95Alert && (
        <div className="panel border-fuchsia-300 bg-fuchsia-50 p-4">
          <p className="text-sm font-semibold text-fuchsia-900">
            Delivery warning: webhook p95 latency is high in last 24h
          </p>
          <p className="mt-1 text-xs text-fuchsia-800">
            p95 {Math.round(latency.p95_24h ?? 0)} ms (threshold {webhookP95ThresholdMs} ms); based on {deliveryAttempted24h} delivery attempts.
          </p>
          <Link
            href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP95ThresholdMs}`}
            className="mt-2 inline-block text-xs font-medium text-fuchsia-900 underline"
          >
            View high-latency deliveries
          </Link>
        </div>
      )}
      {isWebhookP99Critical && (
        <div className="panel border-red-400 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">
            Critical warning: webhook p99 latency is very high in last 24h
          </p>
          <p className="mt-1 text-xs text-red-800">
            p99 {Math.round(latency.p99_24h ?? 0)} ms (critical threshold {webhookP99ThresholdMs} ms); based on {deliveryAttempted24h} delivery attempts.
          </p>
          <Link
            href={`/admin/logs?page=1${baseQuery}&minWebhookLatencyMs=${webhookP99ThresholdMs}`}
            className="mt-2 inline-block text-xs font-medium text-red-900 underline"
          >
            View critical-latency deliveries
          </Link>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Denied Actions</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.denied24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.denied7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_denied`} className="mt-2 inline-block text-xs text-primary">
            View denied logs
          </Link>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rate Limited</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.rateLimited24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.rateLimited7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_rate_limited`} className="mt-2 inline-block text-xs text-primary">
            View rate-limited logs
          </Link>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Blocked URLs</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.blockedUrl24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {stats.blockedUrl7d}</p>
          <Link href={`/admin/logs?page=1${baseQuery}&action=admin_action_blocked_url`} className="mt-2 inline-block text-xs text-primary">
            View blocked-url logs
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold text-slate-900">Security Trend (Last 7 Days)</h2>
          {trend.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No trend data yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
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
                      <td className="py-2 pr-4">{item.day}</td>
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
          <h2 className="text-sm font-semibold text-slate-900">Webhook Delivery Trend (Last 7 Days)</h2>
          {deliveryTrend.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No delivery trend data yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
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
                      <td className="py-2 pr-4">{item.day}</td>
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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Webhook Sent</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{delivery.sent24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.sent7d}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Webhook Failed</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{delivery.failed24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.failed7d}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Webhook Skipped</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{delivery.skipped24h}</p>
          <p className="text-xs text-slate-500">24h | 7d: {delivery.skipped7d}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold text-slate-900">Webhook Alert Status</h2>
          {alertStatus.lastOutcome ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>
                Last outcome: <span className="font-medium">{alertStatus.lastOutcome.action}</span>
              </p>
              <p className="text-xs text-slate-500">{alertStatus.lastOutcome.message}</p>
              <p className="text-xs text-slate-500">
                {new Date(alertStatus.lastOutcome.createdAt).toLocaleString()}
              </p>
              {(typeof alertStatus.lastOutcome.attemptCount === "number" ||
                typeof alertStatus.lastOutcome.webhookStatusCode === "number" ||
                typeof alertStatus.lastOutcome.webhookLatencyMs === "number") && (
                <p className="text-xs text-slate-500">
                  {typeof alertStatus.lastOutcome.attemptCount === "number"
                    ? `attemptCount=${alertStatus.lastOutcome.attemptCount} `
                    : ""}
                  {typeof alertStatus.lastOutcome.webhookStatusCode === "number"
                    ? `webhookStatusCode=${alertStatus.lastOutcome.webhookStatusCode}`
                    : ""}
                  {typeof alertStatus.lastOutcome.webhookLatencyMs === "number"
                    ? ` latencyMs=${alertStatus.lastOutcome.webhookLatencyMs}`
                    : ""}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Cooldown configured: {Math.ceil(cooldownMs / 60000)} minute(s)
              </p>
              <p className="text-xs text-slate-500">
                {alertStatus.lastOutcome.action === "security_alert_sent"
                  ? "Last send succeeded; subsequent sends may be skipped during cooldown window."
                  : alertStatus.lastOutcome.action === "security_alert_skipped"
                    ? "Last cron run skipped sending (no breach or cooldown active)."
                    : "Last send attempt failed; next cron run will retry when breach remains."}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No webhook alert events yet.</p>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-semibold text-slate-900">Webhook Latency Percentiles</h2>
          <p className="mt-1 text-xs text-slate-500">
            Health:{" "}
            {isWebhookP99Critical
              ? "critical (p99 breach)"
              : isWebhookP95Alert
                ? "warn (p95 breach)"
                : "normal"}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">24h</p>
              <p className="text-sm text-slate-700">p50: {formatMs(latency.p50_24h)}</p>
              <p className="text-sm text-slate-700">p95: {formatMs(latency.p95_24h)}</p>
              <p className="text-sm text-slate-700">p99: {formatMs(latency.p99_24h)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">7d</p>
              <p className="text-sm text-slate-700">p50: {formatMs(latency.p50_7d)}</p>
              <p className="text-sm text-slate-700">p95: {formatMs(latency.p95_7d)}</p>
              <p className="text-sm text-slate-700">p99: {formatMs(latency.p99_7d)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel space-y-2 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Log Stream</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">No logs found.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {items.map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p>
                  <span className="font-medium">{log.action}</span> [{log.entityType}
                  {log.entityId ? `#${log.entityId}` : ""}] - {log.message}
                </p>
                {(log.reason ||
                  log.permission ||
                  log.returnTo ||
                  log.retryAfterMs ||
                  typeof log.attemptCount === "number" ||
                  typeof log.webhookStatusCode === "number" ||
                  typeof log.webhookLatencyMs === "number") && (
                  <p className="mt-1 text-xs text-slate-500">
                    {log.reason ? `reason=${log.reason} ` : ""}
                    {log.permission ? `permission=${log.permission} ` : ""}
                    {log.returnTo ? `returnTo=${log.returnTo} ` : ""}
                    {typeof log.retryAfterMs === "number" ? `retryAfterMs=${log.retryAfterMs}` : ""}
                    {typeof log.attemptCount === "number" ? ` attemptCount=${log.attemptCount}` : ""}
                    {typeof log.webhookStatusCode === "number"
                      ? ` webhookStatusCode=${log.webhookStatusCode}`
                      : ""}
                    {typeof log.webhookLatencyMs === "number"
                      ? ` webhookLatencyMs=${log.webhookLatencyMs}`
                      : ""}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {log.actorEmail ?? "unknown"} | {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Page {safePage} of {pageCount} ({total} items)
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/logs?page=${prevPage}${queryQ}${queryEntity}${queryAction}${queryReason}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5"
          >
            Prev
          </Link>
          <Link
            href={`/admin/logs?page=${nextPage}${queryQ}${queryEntity}${queryAction}${queryReason}${queryMinAttemptCount}${queryMinWebhookLatencyMs}${queryWebhookStatusCode}`}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5"
          >
            Next
          </Link>
        </div>
      </div>
    </section>
  );
}

