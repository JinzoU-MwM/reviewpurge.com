import Link from "next/link";
import { redirect } from "next/navigation";
import {
  bulkProductAction,
  checkAffiliateProgramHealthAction,
  createAffiliateProgramAction,
  createProductAction,
  deleteProductAction,
  setPrimaryAffiliateProgramAction,
  updateProductAction,
} from "@/app/admin/actions";
import { AdminNav } from "@/components/admin-nav";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import {
  getAffiliateHealthMonitoringSummary,
  getAffiliateRedirectProgramStats,
  getAffiliateRotationGuardSummary,
  getAffiliateRedirectRotationSkewSummary,
  getTrustCopyExperimentStats,
  listRecentActivityLogs,
} from "@/lib/db/queries/activity-logs";
import {
  getAffiliateLinkHealthSummary,
  listAffiliateProgramsByProduct,
} from "@/lib/db/queries/affiliate-programs";
import { getAffiliateFunnelMetrics } from "@/lib/db/queries/funnel-metrics";
import { listProductsPaginated } from "@/lib/db/queries/products";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    published?: string;
    sort?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 5;

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function formatMs(value: number | null) {
  if (value == null) return "-";
  return `${Math.round(value)} ms`;
}

function formatDeltaPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function winnerLabel(value: "control" | "verified" | "tie" | "insufficient_data") {
  if (value === "control") return "Control";
  if (value === "verified") return "Verified";
  if (value === "tie") return "Tie";
  return "Insufficient data";
}

type AbDecision = {
  key: "rollout_candidate" | "observe" | "hold";
  label: string;
  badgeClass: string;
  note: string;
};

type AbDecisionThresholds = {
  rolloutMinExposure: number;
  rolloutMinAbsDelta: number;
  observeMinExposure: number;
  observeMinAbsDelta: number;
};

function evaluateTrustCopyDecision(input: {
  winner24h: "control" | "verified" | "tie" | "insufficient_data";
  controlExposure24h: number;
  verifiedExposure24h: number;
  ctrDelta24h: number;
}, thresholds: AbDecisionThresholds): AbDecision {
  const minExposure = Math.min(input.controlExposure24h, input.verifiedExposure24h);
  const absDelta = Math.abs(input.ctrDelta24h);

  if (
    input.winner24h !== "insufficient_data" &&
    input.winner24h !== "tie" &&
    minExposure >= thresholds.rolloutMinExposure &&
    absDelta >= thresholds.rolloutMinAbsDelta
  ) {
    return {
      key: "rollout_candidate",
      label: "Rollout Candidate",
      badgeClass: "admin-badge admin-badge-success",
      note: `Exposure min ${minExposure}, delta ${formatDeltaPercent(input.ctrDelta24h)}.`,
    };
  }

  if (
    input.winner24h !== "insufficient_data" &&
    minExposure >= thresholds.observeMinExposure &&
    absDelta >= thresholds.observeMinAbsDelta
  ) {
    return {
      key: "observe",
      label: "Observe",
      badgeClass: "admin-badge admin-badge-warning",
      note: `Signal mulai terlihat. Butuh traffic tambahan sebelum rollout.`,
    };
  }

  return {
    key: "hold",
    label: "Hold",
    badgeClass: "admin-badge admin-badge-neutral",
    note: `Data belum cukup atau delta masih kecil.`,
  };
}

const statusLabel: Record<string, string> = {
  product_created: "Produk berhasil dibuat.",
  product_updated: "Produk berhasil diperbarui.",
  product_deleted: "Produk berhasil dihapus.",
  product_bulk_done: "Aksi massal produk selesai.",
  product_bulk_empty: "Pilih minimal satu produk untuk aksi massal.",
  program_created: "Program affiliate berhasil ditambahkan.",
  program_updated: "Program utama berhasil diperbarui.",
  program_duplicate: "Program untuk produk dan region ini sudah ada.",
  program_conflict: "Konflik program utama terdeteksi. Silakan coba lagi.",
  program_checked: "Pemeriksaan kesehatan program selesai.",
  affiliate_url_blocked:
    "URL affiliate diblokir policy allowlist (AFFILIATE_ALLOWED_HOSTS).",
  unauthorized: "Anda tidak memiliki izin untuk aksi ini.",
  rate_limited: "Terlalu banyak aksi dalam waktu singkat. Coba lagi sebentar.",
  product_error: "Aksi produk gagal. Silakan coba lagi.",
  program_error: "Aksi program affiliate gagal. Silakan coba lagi.",
};

export default async function AdminPage({ searchParams }: Props) {
  try {
    const { role } = await getCurrentAdminIdentity();
    if (!canAccessAdminPath(role, "/admin")) redirect("/admin/forbidden");
  } catch {
    redirect("/admin/forbidden");
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Number(params.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const published =
    params.published === "published" || params.published === "draft"
      ? params.published
      : "all";
  const sort =
    params.sort === "oldest" || params.sort === "name" ? params.sort : "latest";
  const status = params.status ?? "";

  const { items: products, total } = await listProductsPaginated({
    page: safePage,
    pageSize: PAGE_SIZE,
    q,
    published,
    sort,
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const programEntries = await Promise.all(
    products.map(async (product) => [
      product.id,
      await listAffiliateProgramsByProduct(product.id),
    ] as const),
  );
  const programsByProduct = new Map(programEntries);
  const logs = await listRecentActivityLogs(10);
  const funnel = await getAffiliateFunnelMetrics();
  const redirectPrograms = await getAffiliateRedirectProgramStats(6);
  const rotationSkewThreshold = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_IMBALANCE_THRESHOLD,
    65,
  );
  const rotationSkewMinEvents = parsePositiveNumber(
    process.env.AFFILIATE_REDIRECT_ROTATION_MIN_EVENTS,
    20,
  );
  const redirectRotationSkew = await getAffiliateRedirectRotationSkewSummary({
    thresholdSharePct: rotationSkewThreshold,
    minEventsPerProduct: rotationSkewMinEvents,
    maxFlaggedProducts: 5,
  });
  const rotationGuardSummary = await getAffiliateRotationGuardSummary();
  const experiment = await getTrustCopyExperimentStats();
  const affiliateHealth = await getAffiliateLinkHealthSummary();
  const affiliateHealthMonitoring = await getAffiliateHealthMonitoringSummary();
  const recommendedAffiliateCron =
    process.env.AFFILIATE_HEALTH_CRON_SCHEDULE?.trim() || "*/30 * * * *";
  const abThresholds: AbDecisionThresholds = {
    rolloutMinExposure: parsePositiveNumber(
      process.env.TRUST_COPY_AB_ROLLOUT_MIN_EXPOSURE,
      100,
    ),
    rolloutMinAbsDelta: parsePositiveNumber(
      process.env.TRUST_COPY_AB_ROLLOUT_MIN_ABS_DELTA,
      5,
    ),
    observeMinExposure: parsePositiveNumber(
      process.env.TRUST_COPY_AB_OBSERVE_MIN_EXPOSURE,
      40,
    ),
    observeMinAbsDelta: parsePositiveNumber(
      process.env.TRUST_COPY_AB_OBSERVE_MIN_ABS_DELTA,
      2,
    ),
  };
  const ctrDelta24h = experiment.verified.ctr24h - experiment.control.ctr24h;
  const trustCopyDecision = evaluateTrustCopyDecision({
    winner24h: experiment.winner24h,
    controlExposure24h: experiment.control.exposure24h,
    verifiedExposure24h: experiment.verified.exposure24h,
    ctrDelta24h,
  }, abThresholds);

  const queryQ = q ? `&q=${encodeURIComponent(q)}` : "";
  const queryPublished =
    published !== "all" ? `&published=${encodeURIComponent(published)}` : "";
  const querySort = sort !== "latest" ? `&sort=${encodeURIComponent(sort)}` : "";
  const returnTo = `/admin?page=${safePage}${queryQ}${queryPublished}${querySort}`;
  const prevPage = Math.max(1, safePage - 1);
  const nextPage = Math.min(pageCount, safePage + 1);
  const isErrorStatus =
    status.includes("error") ||
    status === "unauthorized" ||
    status === "rate_limited" ||
    status === "affiliate_url_blocked";
  const pagePublishedCount = products.filter((product) => product.isPublished).length;
  const pagePurgedCount = products.filter((product) => product.isPurged).length;
  const pageProgramCount = Array.from(programsByProduct.values()).reduce(
    (count, programs) => count + programs.length,
    0,
  );

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <AdminNav currentPath="/admin" />
        <div className="admin-content space-y-6">
          <div className="admin-header">
            <div className="admin-header-icon">PR</div>
            <div className="relative z-10">
              <p className="section-kicker">Commerce Operations</p>
              <h1 className="heading-display mt-2">Produk & Affiliate</h1>
              <p className="mt-2 max-w-2xl">
                Alur disederhanakan: tambah produk, kelola detail, lalu atur program affiliate
                per region.
              </p>
            </div>
          </div>

          <div className="admin-stats stagger-children">
            <div className="admin-stat-card">
              <span className="stat-icon">#</span>
              <p className="stat-label">Total Produk</p>
              <p className="stat-value">{total}</p>
            </div>
            <div className="admin-stat-card stat-success">
              <span className="stat-icon">ON</span>
              <p className="stat-label">Published (Halaman Ini)</p>
              <p className="stat-value">{pagePublishedCount}</p>
            </div>
            <div className="admin-stat-card stat-info">
              <span className="stat-icon">AP</span>
              <p className="stat-label">Program (Halaman Ini)</p>
              <p className="stat-value">{pageProgramCount}</p>
            </div>
            <div className="admin-stat-card stat-warning">
              <span className="stat-icon">PG</span>
              <p className="stat-label">Purged (Halaman Ini)</p>
              <p className="stat-value">{pagePurgedCount}</p>
              <p className="stat-meta">
                Page {safePage}/{pageCount}
              </p>
            </div>
          </div>

          {affiliateHealth.unhealthyCount > 0 && (
            <div className="admin-banner admin-banner-danger">
              <span className="admin-banner-icon">AL</span>
              <div>
                <p className="font-semibold">Affiliate Link Warning</p>
                <p className="text-xs">
                  {affiliateHealth.unhealthyCount} link unhealthy dari{" "}
                  {affiliateHealth.totalActiveOnPublished} link aktif (published products).
                </p>
                <Link
                  href="/admin/logs?action=affiliate_link_unhealthy"
                  className="mt-1 inline-block text-xs underline"
                >
                  View unhealthy logs
                </Link>
              </div>
            </div>
          )}

          {redirectRotationSkew.flaggedProducts.length > 0 && (
            <div className="admin-banner admin-banner-warning">
              <span className="admin-banner-icon">RT</span>
              <div>
                <p className="font-semibold">Redirect Rotation Imbalance</p>
                <p className="text-xs">
                  {redirectRotationSkew.flaggedProducts.length} product melewati ambang{" "}
                  {redirectRotationSkew.thresholdSharePct.toFixed(0)}% dengan minimum{" "}
                  {redirectRotationSkew.minEventsPerProduct} rotated redirects/24h.
                </p>
                <Link
                  href="/admin/logs?action=affiliate_redirect&selectionMode=rotated"
                  className="mt-1 inline-block text-xs underline"
                >
                  Investigate rotated logs
                </Link>
              </div>
            </div>
          )}

          {rotationGuardSummary.recommendations24h > 0 && (
            <div className="admin-banner admin-banner-info">
              <span className="admin-banner-icon">RB</span>
              <div>
                <p className="font-semibold">Rebalance Recommendation</p>
                <p className="text-xs">
                  {rotationGuardSummary.recommendations24h} rekomendasi rebalance dibuat dalam 24h terakhir.
                </p>
                <Link
                  href="/admin/logs?action=affiliate_rotation_rebalance_recommended"
                  className="mt-1 inline-block text-xs underline"
                >
                  Review recommendation logs
                </Link>
              </div>
            </div>
          )}

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">AH</span> Affiliate Health Monitor</h2>
              <Link href="/admin/logs?action=affiliate_link_health_cron" className="admin-btn admin-btn-ghost admin-btn-sm">
                View Cron Logs
              </Link>
            </div>
            <div className="admin-panel-body">
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <span className="stat-icon">24H</span>
                  <p className="stat-label">Health Success Rate</p>
                  <p className="stat-value">{formatPercent(affiliateHealthMonitoring.successRate24h)}</p>
                  <p className="stat-meta">
                    {affiliateHealthMonitoring.healthy24h} healthy / {affiliateHealthMonitoring.checks24h} checks
                  </p>
                </div>
                <div className="admin-stat-card stat-info">
                  <span className="stat-icon">RN</span>
                  <p className="stat-label">Cron Runs</p>
                  <p className="stat-value">{affiliateHealthMonitoring.runs24h}</p>
                  <p className="stat-meta">
                    7d: {affiliateHealthMonitoring.runs7d}
                  </p>
                </div>
                <div className="admin-stat-card stat-danger">
                  <span className="stat-icon">DG</span>
                  <p className="stat-label">Degraded Events</p>
                  <p className="stat-value">{affiliateHealthMonitoring.degraded24h}</p>
                  <p className="stat-meta">
                    7d: {affiliateHealthMonitoring.degraded7d}
                  </p>
                </div>
                <div className="admin-stat-card stat-success">
                  <span className="stat-icon">RC</span>
                  <p className="stat-label">Recovered Events</p>
                  <p className="stat-value">{affiliateHealthMonitoring.recovered24h}</p>
                  <p className="stat-meta">
                    7d: {affiliateHealthMonitoring.recovered7d}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-[var(--admin-text-muted)]">
                Recommended schedule: <code>{recommendedAffiliateCron}</code> to{" "}
                <code>/api/cron/affiliate-health</code> (with <code>x-cron-token</code>).
              </div>
              <div className="mt-1 text-xs text-[var(--admin-text-dim)]">
                Last run:{" "}
                {affiliateHealthMonitoring.lastRunAt
                  ? `${new Date(affiliateHealthMonitoring.lastRunAt).toLocaleString()} (${affiliateHealthMonitoring.lastRunMode ?? "unknown"})`
                  : "No run yet"}
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">AN</span> Baseline Funnel Metrics</h2>
              <Link href="/admin/logs?action=intent_selected" className="admin-btn admin-btn-ghost admin-btn-sm">
                View Intent Logs
              </Link>
            </div>
            <div className="admin-panel-body">
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <span className="stat-icon">ID</span>
                  <p className="stat-label">Indonesia CTR</p>
                  <p className="stat-value">{formatPercent(funnel.indonesia.ctr24h)}</p>
                  <p className="stat-meta">
                    24h: {funnel.indonesia.clicks24h} clicks / {funnel.indonesia.intent24h} intent
                  </p>
                  <p className="stat-meta">
                    7d: {formatPercent(funnel.indonesia.ctr7d)}
                  </p>
                </div>
                <div className="admin-stat-card stat-info">
                  <span className="stat-icon">GL</span>
                  <p className="stat-label">Global CTR</p>
                  <p className="stat-value">{formatPercent(funnel.global.ctr24h)}</p>
                  <p className="stat-meta">
                    24h: {funnel.global.clicks24h} clicks / {funnel.global.intent24h} intent
                  </p>
                  <p className="stat-meta">
                    7d: {formatPercent(funnel.global.ctr7d)}
                  </p>
                </div>
                <div className="admin-stat-card stat-warning">
                  <span className="stat-icon">P50</span>
                  <p className="stat-label">Go Redirect P50</p>
                  <p className="stat-value">{formatMs(funnel.redirectLatency.p50_24h)}</p>
                  <p className="stat-meta">
                    7d: {formatMs(funnel.redirectLatency.p50_7d)}
                  </p>
                </div>
                <div className="admin-stat-card stat-danger">
                  <span className="stat-icon">P95</span>
                  <p className="stat-label">Go Redirect P95</p>
                  <p className="stat-value">{formatMs(funnel.redirectLatency.p95_24h)}</p>
                  <p className="stat-meta">
                    7d: {formatMs(funnel.redirectLatency.p95_7d)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">RT</span> Redirect Rotation (24h)</h2>
              <Link href="/admin/logs?action=affiliate_redirect" className="admin-btn admin-btn-ghost admin-btn-sm">
                View Redirect Logs
              </Link>
            </div>
            <div className="admin-panel-body">
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <span className="stat-icon">ALL</span>
                  <p className="stat-label">Total Redirects</p>
                  <p className="stat-value">{redirectPrograms.selection.total24h}</p>
                </div>
                <div className="admin-stat-card stat-info">
                  <span className="stat-icon">ROT</span>
                  <p className="stat-label">Rotated Share</p>
                  <p className="stat-value">{formatPercent(redirectPrograms.selection.rotatedShare24h)}</p>
                  <p className="stat-meta">
                    {redirectPrograms.selection.rotated24h} rotated / {redirectPrograms.selection.total24h}
                  </p>
                </div>
                <div className="admin-stat-card stat-warning">
                  <span className="stat-icon">PREF</span>
                  <p className="stat-label">Preferred Program</p>
                  <p className="stat-value">{redirectPrograms.selection.preferred24h}</p>
                </div>
                <div className="admin-stat-card stat-success">
                  <span className="stat-icon">PRM</span>
                  <p className="stat-label">Primary Mode</p>
                  <p className="stat-value">{redirectPrograms.selection.primary24h}</p>
                </div>
                <div className="admin-stat-card stat-warning">
                  <span className="stat-icon">RB</span>
                  <p className="stat-label">Rebalance Reco</p>
                  <p className="stat-value">{rotationGuardSummary.recommendations24h}</p>
                  <p className="stat-meta">
                    7d: {rotationGuardSummary.recommendations7d}
                  </p>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-icon">GR</span>
                  <p className="stat-label">Guard Cron Runs</p>
                  <p className="stat-value">{rotationGuardSummary.guardRuns24h}</p>
                  <p className="stat-meta">
                    7d: {rotationGuardSummary.guardRuns7d}
                  </p>
                </div>
              </div>
              {redirectPrograms.programs.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Program</th>
                        <th>Redirect 24h</th>
                        <th>Redirect 7d</th>
                        <th>Avg Latency 24h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redirectPrograms.programs.map((row) => (
                        <tr key={row.programKey}>
                          <td className="font-medium">{row.programKey}</td>
                          <td>{row.redirects24h}</td>
                          <td>{row.redirects7d}</td>
                          <td>{formatMs(row.avgLatency24h)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {redirectRotationSkew.flaggedProducts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Total Rotated 24h</th>
                        <th>Dominant Program</th>
                        <th>Dominant Share</th>
                        <th>Distribution</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redirectRotationSkew.flaggedProducts.map((item) => {
                        const investigateHref = `/admin/logs?action=affiliate_redirect&entityType=product&entityId=${item.productId}&permission=${encodeURIComponent(item.dominantProgramKey)}&selectionMode=rotated`;
                        return (
                          <tr key={item.productId}>
                            <td className="font-medium">
                              {item.productSlug ?? `product-${item.productId}`}
                            </td>
                            <td>{item.totalRotated24h}</td>
                            <td>{item.dominantProgramKey}</td>
                            <td>{formatPercent(item.dominantSharePct)}</td>
                            <td>
                              {item.distribution
                                .slice(0, 3)
                                .map((dist) => `${dist.programKey}:${dist.count}`)
                                .join(" | ")}
                            </td>
                            <td>
                              <Link
                                href={investigateHref}
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                              >
                                Investigate
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 text-xs text-[var(--admin-text-dim)]">
                Last guard run:{" "}
                {rotationGuardSummary.lastGuardRunAt
                  ? `${new Date(rotationGuardSummary.lastGuardRunAt).toLocaleString()} (${rotationGuardSummary.lastGuardRunMode ?? "unknown"})`
                  : "No run yet"}
              </div>
              <div className="mt-1 text-xs text-[var(--admin-text-dim)]">
                Last rebalance recommendation:{" "}
                {rotationGuardSummary.lastRecommendationAt
                  ? new Date(rotationGuardSummary.lastRecommendationAt).toLocaleString()
                  : "No recommendation yet"}
              </div>
              <div className="mt-1 text-xs text-[var(--admin-text-dim)]">
                Monitoring endpoint: <code>/api/monitoring/redirect-rotation</code> with{" "}
                <code>x-monitor-token</code>.
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">AB</span> Trust Copy A/B Results</h2>
              <Link
                href="/admin/logs?action=experiment_event"
                className="admin-btn admin-btn-ghost admin-btn-sm"
              >
                View Experiment Logs
              </Link>
            </div>
            <div className="admin-panel-body">
              <div className="mb-3 text-xs text-[var(--admin-text-muted)]">
                24h winner:{" "}
                <span className="font-semibold text-[var(--admin-text)]">
                  {winnerLabel(experiment.winner24h)}
                </span>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={trustCopyDecision.badgeClass}>{trustCopyDecision.label}</span>
                <span className="text-xs text-[var(--admin-text-muted)]">{trustCopyDecision.note}</span>
              </div>
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <span className="stat-icon">C</span>
                  <p className="stat-label">Control CTR</p>
                  <p className="stat-value">{formatPercent(experiment.control.ctr24h)}</p>
                  <p className="stat-meta">
                    24h: {experiment.control.ctaClick24h} click / {experiment.control.exposure24h} exposure
                  </p>
                  <p className="stat-meta">
                    7d: {formatPercent(experiment.control.ctr7d)}
                  </p>
                </div>
                <div className="admin-stat-card stat-info">
                  <span className="stat-icon">V</span>
                  <p className="stat-label">Verified CTR</p>
                  <p className="stat-value">{formatPercent(experiment.verified.ctr24h)}</p>
                  <p className="stat-meta">
                    24h: {experiment.verified.ctaClick24h} click / {experiment.verified.exposure24h} exposure
                  </p>
                  <p className="stat-meta">
                    7d: {formatPercent(experiment.verified.ctr7d)}
                  </p>
                </div>
                <div className="admin-stat-card stat-warning">
                  <span className="stat-icon">SV</span>
                  <p className="stat-label">Score Label Views</p>
                  <p className="stat-value">
                    {experiment.control.scoreLabelView24h + experiment.verified.scoreLabelView24h}
                  </p>
                  <p className="stat-meta">
                    Control {experiment.control.scoreLabelView24h} / Verified {experiment.verified.scoreLabelView24h}
                  </p>
                  <p className="stat-meta">
                    7d total: {experiment.control.scoreLabelView7d + experiment.verified.scoreLabelView7d}
                  </p>
                </div>
                <div className="admin-stat-card stat-success">
                  <span className="stat-icon">DF</span>
                  <p className="stat-label">CTR Delta</p>
                  <p className="stat-value">
                    {formatDeltaPercent(ctrDelta24h)}
                  </p>
                  <p className="stat-meta">
                    Verified - Control (24h)
                  </p>
                  <p className="stat-meta">
                    Rule rollout: min exposure {abThresholds.rolloutMinExposure} per variant, abs delta &gt;= {abThresholds.rolloutMinAbsDelta}%.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {statusLabel[status] && (
            <div className={`admin-banner ${isErrorStatus ? "admin-banner-danger" : "admin-banner-success"}`}>
              <span className="admin-banner-icon">{isErrorStatus ? "WARN" : "OK"}</span>
              <span>{statusLabel[status]}</span>
            </div>
          )}

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">+</span> Tambah Produk</h2>
            </div>
            <div className="admin-panel-body">
              <form action={createProductAction} className="admin-form">
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="admin-form-row">
                  <div className="admin-form-group"><label>Nama</label><input name="name" required className="admin-input" /></div>
                  <div className="admin-form-group"><label>Slug</label><input name="slug" required className="admin-input" /></div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group"><label>Kategori</label><input name="categorySlug" required className="admin-input" /></div>
                  <div className="admin-form-group"><label>URL Affiliate</label><input name="affiliateUrl" type="url" required className="admin-input" /></div>
                </div>
                <div className="admin-form-group"><label>Deskripsi</label><textarea name="description" required className="admin-input admin-textarea" /></div>
                <div className="admin-form-row">
                  <div className="admin-form-group"><label>RP Quality (0-100)</label><input name="rpScoreQuality" type="number" min={0} max={100} className="admin-input" /></div>
                  <div className="admin-form-group"><label>RP Reputation (0-100)</label><input name="rpScoreReputation" type="number" min={0} max={100} className="admin-input" /></div>
                  <div className="admin-form-group"><label>RP Value (0-100)</label><input name="rpScoreValue" type="number" min={0} max={100} className="admin-input" /></div>
                </div>
                <div className="admin-form-group">
                  <label>Alasan Purge (opsional)</label>
                  <textarea
                    name="purgeReason"
                    placeholder="Contoh: kualitas build tidak stabil, support lambat, atau value di bawah kompetitor."
                    className="admin-input admin-textarea"
                  />
                </div>
                <label className="admin-checkbox-label">
                  <input type="checkbox" name="isPurged" className="admin-checkbox" />
                  Tandai sebagai The Purged (otomatis jadi draft)
                </label>
                <label className="admin-checkbox-label"><input type="checkbox" name="isPublished" className="admin-checkbox" />Publish sekarang</label>
                <div><button type="submit" className="admin-btn admin-btn-primary">Simpan Produk</button></div>
              </form>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2><span className="icon">#</span> Daftar Produk</h2>
              <Link href="/admin/logs" className="admin-btn admin-btn-ghost admin-btn-sm">Buka Logs</Link>
            </div>
            <div className="px-6 pt-4">
              <form method="get" className="admin-filter-bar">
                <input name="q" defaultValue={q} placeholder="Cari produk..." className="admin-input min-w-[220px]" />
                <select name="published" defaultValue={published} className="admin-input admin-select min-w-[140px]">
                  <option value="all">Semua status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select name="sort" defaultValue={sort} className="admin-input admin-select min-w-[140px]">
                  <option value="latest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="name">Nama</option>
                </select>
                <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">Terapkan</button>
                <Link href="/admin" className="admin-btn admin-btn-ghost admin-btn-sm">Reset</Link>
              </form>
            </div>
            {products.length > 0 && (
              <div className="px-6 pt-4 pb-2">
                <form id="bulk-products-form" action={bulkProductAction} className="admin-filter-bar">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <BulkSelectControls formId="bulk-products-form" />
                  <button type="submit" name="bulkAction" value="publish" className="admin-btn admin-btn-ghost admin-btn-sm">Publish</button>
                  <button type="submit" name="bulkAction" value="unpublish" className="admin-btn admin-btn-ghost admin-btn-sm">Unpublish</button>
                  <button type="submit" name="bulkAction" value="delete" className="admin-btn admin-btn-danger admin-btn-sm">Delete</button>
                </form>
              </div>
            )}
            <div className="admin-panel-body">
              {products.length === 0 ? (
                <div className="admin-empty"><span className="admin-empty-icon">PR</span><p className="admin-empty-title">Belum ada produk</p></div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => {
                    const programs = programsByProduct.get(product.id) ?? [];
                    return (
                      <article key={product.id} className="admin-list-item">
                        <div className="admin-list-item-content space-y-3">
                          <div className="admin-list-item-header">
                            <label className="admin-checkbox-label text-xs"><input type="checkbox" name="ids" value={product.id} form="bulk-products-form" className="admin-checkbox" />Pilih</label>
                            <span className={`admin-badge ${product.isPublished ? "admin-badge-success" : "admin-badge-neutral"}`}>{product.isPublished ? "Published" : "Draft"}</span>
                            {product.isPurged && (
                              <span className="admin-badge admin-badge-danger">Purged</span>
                            )}
                            <span className="admin-badge admin-badge-neutral">{product.slug}</span>
                            <span className={`admin-badge ${product.rpScoreTotal != null ? "admin-badge-primary" : "admin-badge-neutral"}`}>
                              RP Score: {product.rpScoreTotal ?? "-"}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-[var(--admin-text)]">{product.name}</h3>
                          <p className="text-xs text-[var(--admin-text-muted)]">Kategori: {product.category?.slug ?? "-"}</p>
                          {product.isPurged && product.purgeReason && (
                            <p className="text-xs text-[var(--admin-text-dim)]">
                              Purge reason: {product.purgeReason}
                            </p>
                          )}

                          <details className="admin-collapsible">
                            <summary className="admin-collapsible-summary">Edit Produk</summary>
                            <div className="admin-collapsible-content">
                              <form action={updateProductAction} className="admin-form">
                                <input type="hidden" name="id" value={product.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <div className="admin-form-row">
                                  <div className="admin-form-group"><label>Nama</label><input name="name" defaultValue={product.name} required className="admin-input" /></div>
                                  <div className="admin-form-group"><label>Slug</label><input name="slug" defaultValue={product.slug} required className="admin-input" /></div>
                                </div>
                                <div className="admin-form-row">
                                  <div className="admin-form-group"><label>Kategori</label><input name="categorySlug" defaultValue={product.category?.slug ?? ""} required className="admin-input" /></div>
                                  <div className="admin-form-group"><label>URL Affiliate Utama</label><input name="affiliateUrl" defaultValue={product.affiliateUrl} required className="admin-input" /></div>
                                </div>
                                <div className="admin-form-group"><label>Deskripsi</label><textarea name="description" defaultValue={product.description} className="admin-input admin-textarea" /></div>
                                <div className="admin-form-row">
                                  <div className="admin-form-group"><label>RP Quality (0-100)</label><input name="rpScoreQuality" type="number" min={0} max={100} defaultValue={product.rpScoreQuality ?? ""} className="admin-input" /></div>
                                  <div className="admin-form-group"><label>RP Reputation (0-100)</label><input name="rpScoreReputation" type="number" min={0} max={100} defaultValue={product.rpScoreReputation ?? ""} className="admin-input" /></div>
                                  <div className="admin-form-group"><label>RP Value (0-100)</label><input name="rpScoreValue" type="number" min={0} max={100} defaultValue={product.rpScoreValue ?? ""} className="admin-input" /></div>
                                </div>
                                <div className="admin-form-group">
                                  <label>Alasan Purge (opsional)</label>
                                  <textarea
                                    name="purgeReason"
                                    defaultValue={product.purgeReason ?? ""}
                                    placeholder="Contoh: kualitas build tidak stabil, support lambat, atau value di bawah kompetitor."
                                    className="admin-input admin-textarea"
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="admin-checkbox-label"><input type="checkbox" name="isPurged" defaultChecked={product.isPurged ?? false} className="admin-checkbox" />The Purged</label>
                                  <label className="admin-checkbox-label"><input type="checkbox" name="isPublished" defaultChecked={product.isPublished ?? false} className="admin-checkbox" />Published</label>
                                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">Update</button>
                                </div>
                              </form>
                              <form action={deleteProductAction}>
                                <input type="hidden" name="id" value={product.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <button type="submit" className="admin-btn admin-btn-danger admin-btn-sm">Delete Produk</button>
                              </form>
                            </div>
                          </details>

                          <details className="admin-collapsible">
                            <summary className="admin-collapsible-summary">Program Affiliate ({programs.length})</summary>
                            <div className="admin-collapsible-content space-y-3">
                              {programs.map((program) => (
                                <div key={program.id} className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg)] p-3 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-[var(--admin-text)]">{program.programName}</span>
                                    <span className="admin-badge admin-badge-neutral">{program.region}</span>
                                    {program.isPrimary && <span className="admin-badge admin-badge-primary">Primary</span>}
                                    <span className={`admin-badge ${program.lastHealthStatus === "healthy" ? "admin-badge-success" : "admin-badge-neutral"}`}>{program.lastHealthStatus ?? "unchecked"}</span>
                                  </div>
                                  <p className="mt-2 break-all text-[var(--admin-text-dim)]">{program.affiliateUrl}</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {!program.isPrimary && (
                                      <form action={setPrimaryAffiliateProgramAction}>
                                        <input type="hidden" name="returnTo" value={returnTo} />
                                        <input type="hidden" name="productId" value={product.id} />
                                        <input type="hidden" name="programId" value={program.id} />
                                        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Set Primary</button>
                                      </form>
                                    )}
                                    <form action={checkAffiliateProgramHealthAction}>
                                      <input type="hidden" name="returnTo" value={returnTo} />
                                      <input type="hidden" name="programId" value={program.id} />
                                      <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Check Health</button>
                                    </form>
                                  </div>
                                </div>
                              ))}
                              <form action={createAffiliateProgramAction} className="admin-form">
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input type="hidden" name="productId" value={product.id} />
                                <div className="admin-form-row">
                                  <div className="admin-form-group"><label>Nama Program</label><input name="programName" required className="admin-input" /></div>
                                  <div className="admin-form-group"><label>Region</label><select name="region" defaultValue="global" className="admin-input admin-select"><option value="global">Global</option><option value="indonesia">Indonesia</option></select></div>
                                </div>
                                <div className="admin-form-group"><label>URL Affiliate</label><input name="affiliateUrl" type="url" required className="admin-input" /></div>
                                <label className="admin-checkbox-label"><input type="checkbox" name="isPrimary" className="admin-checkbox" />Set sebagai primary</label>
                                <div><button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">Tambah Program</button></div>
                              </form>
                            </div>
                          </details>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
            {products.length > 0 && (
              <div className="admin-pagination">
                <span>Halaman {safePage} dari {pageCount} ({total} item)</span>
                <div className="admin-pagination-controls">
                  <Link href={`/admin?page=${prevPage}${queryQ}${queryPublished}${querySort}`} className="admin-btn admin-btn-ghost admin-btn-sm">Prev</Link>
                  <Link href={`/admin?page=${nextPage}${queryQ}${queryPublished}${querySort}`} className="admin-btn admin-btn-ghost admin-btn-sm">Next</Link>
                </div>
              </div>
            )}
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header"><h2><span className="icon">LG</span> Aktivitas Terbaru</h2></div>
            <div className="admin-panel-body">
              {logs.length === 0 ? (
                <div className="admin-empty"><p className="admin-empty-title">Belum ada aktivitas</p></div>
              ) : (
                <div className="admin-list">
                  {logs.map((log) => (
                    <div key={log.id} className="admin-log-entry">
                      <div className="admin-log-entry-header">
                        <span className={`admin-badge ${log.action.includes("denied") || log.action.includes("blocked") ? "admin-badge-danger" : log.action.includes("rate_limited") ? "admin-badge-warning" : "admin-badge-neutral"}`}>{log.action}</span>
                        <span className="admin-log-entry-message">{log.message}</span>
                      </div>
                      <div className="admin-log-entry-footer"><span>{log.actorEmail ?? "system"}</span><span>{new Date(log.createdAt).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
